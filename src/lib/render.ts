import type { ParseError } from "./parse";

// Max characters of the offending source line shown on each side of the error
const ERROR_CONTEXT = 60;

function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className: string,
	text?: string,
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

export function renderJson(value: unknown): HTMLElement {
	const root = el("div", "jv-root");
	root.append(renderValue(value));
	return root;
}

function renderValue(value: unknown): Node {
	if (value === null) return el("span", "jv-null", "null");
	if (typeof value === "string") {
		return el("span", "jv-string", JSON.stringify(value));
	}
	if (typeof value === "number") {
		return el("span", "jv-number", Object.is(value, -0) ? "-0" : String(value));
	}
	if (typeof value === "boolean") {
		return el("span", "jv-boolean", String(value));
	}
	if (Array.isArray(value)) {
		return renderContainer(
			"[",
			"]",
			value.map((item) => [null, item]),
		);
	}
	return renderContainer("{", "}", Object.entries(value as object));
}

function renderContainer(
	open: string,
	close: string,
	entries: [string | null, unknown][],
): Node {
	const fragment = document.createDocumentFragment();
	fragment.append(el("span", "jv-punct", open));
	if (entries.length === 0) {
		// empty containers stay inline: {} and []
		fragment.append(el("span", "jv-punct", close));
		return fragment;
	}

	const children = el("div", "jv-children");
	entries.forEach(([key, item], index) => {
		const line = el("div", "jv-line");
		if (key !== null) {
			line.append(
				el("span", "jv-key", JSON.stringify(key)),
				el("span", "jv-punct", ": "),
			);
		}
		line.append(renderValue(item));
		if (index < entries.length - 1) line.append(el("span", "jv-punct", ","));
		children.append(line);
	});
	fragment.append(children, el("span", "jv-punct", close));
	return fragment;
}

export function renderError(error: ParseError, text: string): HTMLElement {
	const box = el("div", "jv-error");
	box.append(el("div", "jv-error-message", `Invalid JSON: ${error.message}`));
	if (error.line === undefined || error.column === undefined) return box;

	box.append(
		el(
			"div",
			"jv-error-position",
			`Line ${error.line}, column ${error.column}`,
		),
	);
	const sourceLine = text.split(/\r\n|\n/)[error.line - 1] ?? "";
	box.append(el("pre", "jv-error-source", excerpt(sourceLine, error.column)));
	return box;
}

// Source line (trimmed around the error for very long lines) plus a `^` marker line
function excerpt(line: string, column: number): string {
	const index = column - 1;
	const start = Math.max(0, index - ERROR_CONTEXT);
	const end = Math.min(line.length, index + ERROR_CONTEXT);
	const head = start > 0 ? "…" : "";
	const tail = end < line.length ? "…" : "";
	// keep tabs in the padding so the caret lines up with the source above
	const padding =
		" ".repeat(head.length) + line.slice(start, index).replace(/[^\t]/g, " ");
	return `${head}${line.slice(start, end)}${tail}\n${padding}^`;
}
