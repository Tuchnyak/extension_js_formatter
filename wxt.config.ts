import { defineConfig } from "wxt";

export default defineConfig({
	srcDir: "src",
	publicDir: "src/public",
	// Vite's modulepreload polyfill contains a fetch() call; Chrome supports modulepreload natively.
	vite: () => ({ build: { modulePreload: { polyfill: false } } }),
	manifest: {
		name: "Curly - JSON Formatter & Tree Viewer",
		short_name: "Curly",
		description:
			"Read API responses as a collapsible tree: this JSON formatter works offline, makes no network requests and is open source.",
		// CSS light-dark() (themes) needs Chrome 123
		minimum_chrome_version: "123",
		action: {},
		permissions: ["contextMenus", "storage"],
	},
});
