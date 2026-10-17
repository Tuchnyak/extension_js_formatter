import { browser } from "wxt/browser";

export const THEMES = [
	"system",
	"light",
	"dark",
	"latte",
	"frappe",
	"macchiato",
	"mocha",
	"dracula",
	"gruvbox",
] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "jv-theme";

function isTheme(value: unknown): value is Theme {
	return (THEMES as readonly unknown[]).includes(value);
}

// Storage may be unavailable (no extension context); the theme then stays "system".
export async function loadTheme(): Promise<Theme> {
	try {
		const stored = (await browser.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
		return isTheme(stored) ? stored : "system";
	} catch {
		return "system";
	}
}

export async function saveTheme(theme: Theme): Promise<void> {
	try {
		await browser.storage.local.set({ [STORAGE_KEY]: theme });
	} catch {
		// not persisted; the choice still applies until the page is closed
	}
}

// Colors are CSS custom properties on `.jv-app`; `data-jv-theme` picks the color scheme.
export function applyTheme(root: HTMLElement, theme: Theme): void {
	root.dataset.jvTheme = theme;
}
