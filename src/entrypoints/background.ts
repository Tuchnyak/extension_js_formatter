const MENU_ID = "format-selected-json";

export default defineBackground(() => {
	// Toolbar icon click opens the viewer in a new tab (no popup).
	browser.action.onClicked.addListener(() => {
		browser.tabs.create({ url: browser.runtime.getURL("/viewer.html") });
	});

	// Created on install/update: the MV3 service worker is not persistent.
	browser.runtime.onInstalled.addListener(() => {
		browser.contextMenus.create({
			id: MENU_ID,
			title: "Format selected JSON",
			contexts: ["selection"],
		});
	});

	// The selection travels to the viewer through storage.session under a random key;
	// the viewer reads it and deletes it right away.
	browser.contextMenus.onClicked.addListener(async (info) => {
		if (info.menuItemId !== MENU_ID || !info.selectionText) return;
		const id = crypto.randomUUID();
		await browser.storage.session.set({ [id]: info.selectionText });
		await browser.tabs.create({
			url: browser.runtime.getURL(`/viewer.html?id=${id}`),
		});
	});
});
