import { defineConfig } from "wxt";

export default defineConfig({
	srcDir: "src",
	publicDir: "src/public",
	manifest: {
		name: "<EXTENSION_NAME>",
		description: "<EXTENSION_DESCRIPTION>",
		action: {},
		permissions: ["contextMenus", "storage"],
	},
});
