import { parseJson } from "./parse";
import {
	el,
	MAX_RENDER_BYTES,
	renderError,
	renderJson,
	renderNotice,
	renderRaw,
} from "./render";
import { applyTheme, loadTheme, saveTheme, THEMES, type Theme } from "./theme";

const THEME_LABELS: Record<Theme, string> = {
	system: "System",
	light: "Light",
	dark: "Dark",
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

// System / Light / Dark switch. Applies the theme to `root` and persists the choice.
export function createThemeSwitch(root: HTMLElement): HTMLElement {
	const node = group("Theme");
	const buttons = new Map<Theme, HTMLButtonElement>();
	const select = (theme: Theme) => {
		applyTheme(root, theme);
		for (const [name, btn] of buttons) {
			btn.setAttribute("aria-pressed", String(name === theme));
		}
	};
	for (const theme of THEMES) {
		const btn = button(THEME_LABELS[theme], () => {
			select(theme);
			void saveTheme(theme);
		});
		buttons.set(theme, btn);
		node.append(btn);
	}
	select("system");
	void loadTheme().then(select);
	return node;
}

// Full result for `text`: size check, parsing, then tree + toolbar, an error, or raw text.
export function renderResult(text: string): HTMLElement {
	const result = el("div", "jv-result");

	const bytes = new Blob([text]).size;
	if (bytes > MAX_RENDER_BYTES) {
		const mb = (bytes / 1024 / 1024).toFixed(1);
		result.append(
			renderNotice(`Too large to format (${mb} MB). Showing raw.`),
			renderRaw(text),
		);
		return result;
	}

	const parsed = parseJson(text);
	if (!parsed.ok) {
		result.append(renderError(parsed, text));
		return result;
	}

	let tree: HTMLElement;
	try {
		tree = renderJson(parsed.value);
	} catch (error) {
		if (!(error instanceof RangeError)) throw error;
		// recursion limit hit on extremely deep nesting
		result.append(
			renderNotice("Too deeply nested to format. Showing raw."),
			renderRaw(text),
		);
		return result;
	}
	const raw = renderRaw(text);

	// Rebuilds the tree: toggling many existing <details> is far slower than building them closed.
	const setAll = (expanded: boolean) => {
		const rebuilt = renderJson(parsed.value, expanded);
		rebuilt.hidden = tree.hidden;
		tree.replaceWith(rebuilt);
		tree = rebuilt;
	};
	const expandAll = button("Expand all", () => setAll(true));
	const collapseAll = button("Collapse all", () => setAll(false));
	const treeControls = group("Tree");
	treeControls.append(expandAll, collapseAll);

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
	result.append(toolbar, tree, raw);
	return result;
}
