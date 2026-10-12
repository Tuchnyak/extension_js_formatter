export type ParseError = {
	ok: false;
	message: string;
	line?: number;
	column?: number;
};

export type ParseResult = { ok: true; value: unknown } | ParseError;

const POSITION_IN_MESSAGE = /at position (\d+)/;
const LINE_COLUMN_SUFFIX = / \(line \d+ column \d+\)$/;

/**
 * Parses JSON with the native parser. On failure, computes line/column itself:
 * from `position N` in the V8 message when present, otherwise by scanning the text.
 * (V8 messages like `Unexpected token ']', ... is not valid JSON` carry no position.)
 */
export function parseJson(text: string): ParseResult {
	try {
		return { ok: true, value: JSON.parse(text) };
	} catch (error) {
		const raw = error instanceof Error ? error.message : String(error);
		const message = raw.replace(LINE_COLUMN_SUFFIX, "");
		const offset = findErrorOffset(raw, text);
		if (offset === undefined) return { ok: false, message };
		return { ok: false, message, ...toLineColumn(text, offset) };
	}
}

function findErrorOffset(message: string, text: string): number | undefined {
	const match = POSITION_IN_MESSAGE.exec(message);
	if (match) return Math.min(Number(match[1]), text.length);
	try {
		return scanErrorOffset(text);
	} catch {
		// e.g. RangeError on extremely deep nesting: report the message only
		return undefined;
	}
}

// 1-based; column counts UTF-16 code units
function toLineColumn(text: string, offset: number) {
	const before = text.slice(0, offset);
	const lastNewline = before.lastIndexOf("\n");
	return {
		line: before.split("\n").length,
		column: offset - lastNewline,
	};
}

const LITERALS: Record<string, string> = { t: "true", f: "false", n: "null" };
const NUMBER = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y;

/**
 * Minimal strict-JSON scanner used only to locate the first syntax error.
 * Returns the offset of the offending character, or undefined if the text is valid.
 */
function scanErrorOffset(text: string): number | undefined {
	let i = 0;

	class Failure {}
	const fail = (at = i): never => {
		i = at;
		throw new Failure();
	};
	const skipWhitespace = () => {
		while (
			text[i] === " " ||
			text[i] === "\t" ||
			text[i] === "\n" ||
			text[i] === "\r"
		) {
			i++;
		}
	};

	const scanString = () => {
		i++; // opening quote
		for (;;) {
			const ch = text[i];
			if (ch === undefined) fail();
			if (ch === '"') {
				i++;
				return;
			}
			if (ch < " ") fail(); // raw control characters are not allowed
			if (ch !== "\\") {
				i++;
				continue;
			}
			i++;
			const next = text[i];
			if (next !== undefined && '"\\/bfnrt'.includes(next)) {
				i++;
			} else if (next === "u") {
				for (let k = 1; k <= 4; k++) {
					if (!/[0-9a-fA-F]/.test(text[i + k] ?? "")) fail(i + k);
				}
				i += 5;
			} else {
				fail();
			}
		}
	};

	const scanValue = (): void => {
		const ch = text[i];
		if (ch === "{") {
			i++;
			skipWhitespace();
			if (text[i] === "}") {
				i++;
				return;
			}
			for (;;) {
				skipWhitespace();
				if (text[i] !== '"') fail();
				scanString();
				skipWhitespace();
				if (text[i] !== ":") fail();
				i++;
				skipWhitespace();
				scanValue();
				skipWhitespace();
				if (text[i] === ",") {
					i++;
					continue;
				}
				if (text[i] === "}") {
					i++;
					return;
				}
				fail();
			}
		} else if (ch === "[") {
			i++;
			skipWhitespace();
			if (text[i] === "]") {
				i++;
				return;
			}
			for (;;) {
				skipWhitespace();
				scanValue();
				skipWhitespace();
				if (text[i] === ",") {
					i++;
					continue;
				}
				if (text[i] === "]") {
					i++;
					return;
				}
				fail();
			}
		} else if (ch === '"') {
			scanString();
		} else if (ch !== undefined && ch in LITERALS) {
			for (const expected of LITERALS[ch] ?? "") {
				if (text[i] !== expected) fail();
				i++;
			}
		} else if (ch === "-" || (ch !== undefined && ch >= "0" && ch <= "9")) {
			NUMBER.lastIndex = i;
			const match = NUMBER.exec(text);
			if (!match) fail();
			i += match?.[0].length ?? 0;
		} else {
			fail();
		}
	};

	try {
		skipWhitespace();
		scanValue();
		skipWhitespace();
		if (i < text.length) fail();
		return undefined;
	} catch (error) {
		if (error instanceof Failure) return i;
		throw error;
	}
}
