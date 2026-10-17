import { type ParseError, parseJson } from "./parse";
import {
	CONSENT_BYTES,
	el,
	MAX_RENDER_BYTES,
	renderError,
	renderJson,
	renderNotice,
	renderRaw,
	SECONDS_PER_MB,
} from "./render";
import { loadAutoFormat, saveAutoFormat } from "./settings";
import { applyTheme, loadTheme, saveTheme, THEMES, type Theme } from "./theme";

const THEME_LABELS: Record<Theme, string> = {
	system: "System",
	light: "Light",
	dark: "Dark",
	latte: "Catppuccin Latte",
	frappe: "Catppuccin Frappé",
	macchiato: "Catppuccin Macchiato",
	mocha: "Catppuccin Mocha",
	dracula: "Dracula",
	"gruvbox-dark": "Gruvbox Dark",
	"gruvbox-light": "Gruvbox Light",
};

function button(label: string, onClick: () => void): HTMLButtonElement {
	const node = el("button", "jv-btn", label);
	node.type = "button";
	node.addEventListener("click", onClick);
	return node;
}

function group(label: string): HTMLElement {
	const node = el("div", "jv-group");
	node.setAttribute("role", "group");
	node.setAttribute("aria-label", label);
	return node;
}

// Theme drop-down. Applies the theme to `root` and persists the choice.
export function createThemeSwitch(root: HTMLElement): HTMLElement {
	const node = el("select", "jv-select");
	node.setAttribute("aria-label", "Theme");
	for (const theme of THEMES) {
		node.append(new Option(THEME_LABELS[theme], theme));
	}
	const select = (theme: Theme) => {
		applyTheme(root, theme);
		node.value = theme;
	};
	node.addEventListener("change", () => {
		const theme = node.value as Theme;
		select(theme);
		void saveTheme(theme);
	});
	select("system");
	void loadTheme().then(select);
	return node;
}

// "Auto-format JSON pages" on/off switch (the flag the content script reads).
export function createAutoFormatSwitch(): HTMLElement {
	const label = el("label", "jv-check");
	label.title =
		"Format JSON pages automatically when you open them. This viewer and the context menu are not affected.";
	const box = document.createElement("input");
	box.type = "checkbox";
	box.checked = true;
	box.addEventListener("change", () => void saveAutoFormat(box.checked));
	label.append(box, " Auto-format JSON pages");
	void loadAutoFormat().then((enabled) => {
		box.checked = enabled;
	});
	return label;
}

export type Formatted =
	| { kind: "view"; element: HTMLElement }
	| { kind: "invalid"; error: ParseError }
	| { kind: "too-large"; bytes: number }
	| { kind: "needs-consent"; bytes: number }
	| { kind: "too-deep" };

export type NotFormatted = Exclude<Formatted, { kind: "view" }>;

// Size check, parsing, then the formatted view (toolbar + tree + raw), or the reason why not.
// `consented`: the user agreed to wait for an input above CONSENT_BYTES.
export function formatText(text: string, consented = false): Formatted {
	const bytes = new Blob([text]).size;
	if (bytes > MAX_RENDER_BYTES) return { kind: "too-large", bytes };
	if (bytes > CONSENT_BYTES && !consented)
		return { kind: "needs-consent", bytes };

	const parsed = parseJson(text);
	if (!parsed.ok) return { kind: "invalid", error: parsed };

	let tree: HTMLElement;
	try {
		tree = renderJson(parsed.value);
	} catch (error) {
		if (!(error instanceof RangeError)) throw error;
		// recursion limit hit on extremely deep nesting
		return { kind: "too-deep" };
	}
	return { kind: "view", element: buildView(parsed.value, tree, text) };
}

function megabytes(bytes: number): string {
	return (bytes / 1024 / 1024).toFixed(1);
}

// Message for every outcome except "view". `onFormat` runs when the user agrees to wait.
export function renderOutcome(
	outcome: NotFormatted,
	text: string,
	onFormat: () => void,
): HTMLElement {
	switch (outcome.kind) {
		case "invalid":
			return renderError(outcome.error, text);
		case "too-large":
			return renderNotice(
				`Too large to format (${megabytes(outcome.bytes)} MB). Showing raw.`,
			);
		case "too-deep":
			return renderNotice("Too deeply nested to format. Showing raw.");
		case "needs-consent": {
			const seconds = Math.max(
				5,
				Math.round(((outcome.bytes / 1024 / 1024) * SECONDS_PER_MB) / 5) * 5,
			);
			const box = el("div", "jv-consent");
			box.append(
				renderNotice(
					`Large JSON (${megabytes(outcome.bytes)} MB). Formatting may take about ${seconds} s, and the tab will not respond meanwhile.`,
				),
				button("Format anyway", onFormat),
			);
			return box;
		}
	}
}

// Runs `task` after the browser has painted, so a "Formatting…" message is visible first.
export function afterPaint(task: () => void): void {
	requestAnimationFrame(() => setTimeout(task, 0));
}

function buildView(value: unknown, initialTree: HTMLElement, text: string) {
	let tree = initialTree;
	const raw = renderRaw(text);

	// Rebuilds the tree: toggling many existing <details> is far slower than building them closed.
	const setAll = (expanded: boolean) => {
		const rebuilt = renderJson(value, expanded);
		rebuilt.hidden = tree.hidden;
		tree.replaceWith(rebuilt);
		tree = rebuilt;
	};
	const treeControls = group("Tree");
	treeControls.append(
		button("Expand all", () => setAll(true)),
		button("Collapse all", () => setAll(false)),
	);

	const parsedBtn = button("Parsed", () => showParsed(true));
	const rawBtn = button("Raw", () => showParsed(false));
	const showParsed = (isParsed: boolean) => {
		tree.hidden = !isParsed;
		raw.hidden = isParsed;
		treeControls.hidden = !isParsed;
		parsedBtn.setAttribute("aria-pressed", String(isParsed));
		rawBtn.setAttribute("aria-pressed", String(!isParsed));
	};
	const views = group("View");
	views.append(parsedBtn, rawBtn);
	showParsed(true);

	const toolbar = el("div", "jv-toolbar");
	toolbar.append(views, treeControls);
	const view = el("div", "jv-result");
	view.append(toolbar, tree, raw);
	return view;
}
