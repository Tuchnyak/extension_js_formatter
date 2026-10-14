import type { ParseError } from "./parse";

export const MAX_RENDER_BYTES = 10 * 1024 * 1024;
// Above this size the tree is built only after the user agrees (rendering takes seconds per MB).
export const CONSENT_BYTES = 2 * 1024 * 1024;
// Rough rendering speed measured on the owner's machine, used only for the time estimate.
export const SECONDS_PER_MB = 5;

// Max characters of the offending source line shown on each side of the error
const ERROR_CONTEXT = 60;

const URL_PATTERN = /^https?:\/\/\S+$/;

export function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className: string,
	text?: string,
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

// `expanded: false` builds every node closed except the root, so the top level stays visible.
// (Closing thousands of existing <details> one by one is quadratic in Chrome; building them closed is not.)
export function renderJson(value: unknown, expanded = true): HTMLElement {
	const root = el("div", "jv-root");
	const entry = renderEntry(null, value, false, expanded);
	if (entry instanceof HTMLDetailsElement) entry.open = true;
	root.append(entry);
	return root;
}

function punct(text: string): HTMLElement {
	return el("span", "jv-punct", text);
}

// One `key: value` entry. Objects and arrays become <details>, everything else a plain line.
function renderEntry(
	key: string | null,
	value: unknown,
	comma: boolean,
	expanded: boolean,
): HTMLElement {
	const prefix: HTMLElement[] =
		key === null
			? []
			: [el("span", "jv-key", JSON.stringify(key)), punct(": ")];
	const suffix = comma ? "," : "";

	if (typeof value !== "object" || value === null) {
		const line = el("div", "jv-line");
		line.append(
			...prefix,
			renderPrimitive(value),
			...(comma ? [punct(",")] : []),
		);
		return line;
	}

	const isArray = Array.isArray(value);
	const [open, close] = isArray ? ["[", "]"] : ["{", "}"];
	const entries: [string | null, unknown][] = isArray
		? value.map((item) => [null, item])
		: Object.entries(value);

	if (entries.length === 0) {
		// empty containers stay inline: {} and []
		const line = el("div", "jv-line");
		line.append(...prefix, punct(open + close + suffix));
		return line;
	}

	const summary = el("summary", "jv-summary");
	summary.append(
		...prefix,
		punct(open),
		el("span", "jv-punct jv-collapsed", `…${close}${suffix}`),
		el(
			"span",
			"jv-count jv-collapsed",
			`${entries.length} ${entries.length === 1 ? "item" : "items"}`,
		),
	);
	const children = el("div", "jv-children");
	entries.forEach(([childKey, child], index) => {
		children.append(
			renderEntry(childKey, child, index < entries.length - 1, expanded),
		);
	});
	const node = el("details", "jv-node");
	node.open = expanded;
	node.append(
		summary,
		children,
		el("div", "jv-close jv-punct", close + suffix),
	);
	return node;
}

function renderPrimitive(value: unknown): HTMLElement {
	if (value === null) return el("span", "jv-null", "null");
	if (typeof value === "string") return renderString(value);
	if (typeof value === "boolean")
		return el("span", "jv-boolean", String(value));
	return el("span", "jv-number", Object.is(value, -0) ? "-0" : String(value));
}

function renderString(value: string): HTMLElement {
	const span = el("span", "jv-string");
	const escaped = JSON.stringify(value).slice(1, -1);
	if (!isHttpUrl(value)) {
		span.textContent = `"${escaped}"`;
		return span;
	}
	const link = el("a", "jv-link", escaped);
	link.href = value;
	link.target = "_blank";
	link.rel = "noopener noreferrer";
	span.append('"', link, '"');
	return span;
}

function isHttpUrl(value: string): boolean {
	if (!URL_PATTERN.test(value)) return false;
	try {
		const { protocol } = new URL(value);
		return protocol === "http:" || protocol === "https:";
	} catch {
		return false;
	}
}

export function renderRaw(text: string): HTMLElement {
	return el("pre", "jv-raw", text);
}

export function renderNotice(message: string): HTMLElement {
	return el("p", "jv-notice", message);
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
