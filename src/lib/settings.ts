import { browser } from "wxt/browser";

const AUTO_FORMAT_KEY = "jv-auto-format";

// On unless explicitly switched off; also on when storage is unavailable.
export async function loadAutoFormat(): Promise<boolean> {
	try {
		const stored = (await browser.storage.local.get(AUTO_FORMAT_KEY))[
			AUTO_FORMAT_KEY
		];
		return stored !== false;
	} catch {
		return true;
	}
}

export async function saveAutoFormat(enabled: boolean): Promise<void> {
	try {
		await browser.storage.local.set({ [AUTO_FORMAT_KEY]: enabled });
	} catch {
		// not persisted
	}
}
