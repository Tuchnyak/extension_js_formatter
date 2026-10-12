export default defineBackground(() => {
	// Toolbar icon click opens the viewer in a new tab (no popup).
	browser.action.onClicked.addListener(() => {
		browser.tabs.create({ url: browser.runtime.getURL("/viewer.html") });
	});
});
