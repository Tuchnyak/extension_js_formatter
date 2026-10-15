import { defineConfig } from "wxt";

export default defineConfig({
	srcDir: "src",
	publicDir: "src/public",
	manifest: {
		name: "Curly - JSON Formatter & Tree Viewer",
		short_name: "Curly",
		description:
			"Read API responses as a collapsible tree: this JSON formatter works offline, makes no network requests and is open source.",
		action: {},
		permissions: ["contextMenus", "storage"],
	},
});
