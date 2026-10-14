import "../../lib/styles.css";
import "./style.css";
import { browser } from "wxt/browser";
import { renderNotice, renderRaw } from "../../lib/render";
import {
	afterPaint,
	createAutoFormatSwitch,
	createThemeSwitch,
	formatText,
	renderOutcome,
} from "../../lib/toolbar";

function byId<T extends HTMLElement>(id: string): T {
	const node = document.getElementById(id);
	if (!node) throw new Error(`#${id} not found`);
	return node as T;
}

const input = byId<HTMLTextAreaElement>("input");
const result = byId<HTMLElement>("result");

byId("controls").append(
	createThemeSwitch(document.documentElement),
	createAutoFormatSwitch(),
);

function show(text: string, consented = false) {
	const outcome = formatText(text, consented);
	if (outcome.kind === "view") {
		result.replaceChildren(outcome.element);
		return;
	}
	const message = renderOutcome(outcome, text, () => {
		result.replaceChildren(renderNotice("Formatting…"));
		afterPaint(() => show(text, true));
	});
	// an invalid input is explained by the error alone; otherwise show the text itself
	result.replaceChildren(
		message,
		...(outcome.kind === "invalid" ? [] : [renderRaw(text)]),
	);
}

function format() {
	const text = input.value;
	if (text.trim() === "") {
		result.replaceChildren(
			renderNotice("Nothing to format. Paste some JSON first."),
		);
		return;
	}
	show(text);
}

byId("format").addEventListener("click", format);
input.addEventListener("keydown", (event) => {
	if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
		event.preventDefault();
		format();
	}
});

// Opened from the context menu: the selection waits in storage.session under `?id=`.
// It is deleted on read, so a reloaded tab simply shows an empty viewer.
async function loadSelection() {
	const id = new URLSearchParams(location.search).get("id");
	if (!id) return;
	try {
		const text = (await browser.storage.session.get(id))[id];
		await browser.storage.session.remove(id);
		if (typeof text !== "string") return;
		input.value = text;
		format();
	} catch {
		// storage unavailable: leave the viewer empty
	}
}

void loadSelection();
