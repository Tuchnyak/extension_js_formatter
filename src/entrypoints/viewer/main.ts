import "../../lib/styles.css";
import "./style.css";
import { renderNotice } from "../../lib/render";
import { createThemeSwitch, renderResult } from "../../lib/toolbar";

function byId<T extends HTMLElement>(id: string): T {
	const node = document.getElementById(id);
	if (!node) throw new Error(`#${id} not found`);
	return node as T;
}

const input = byId<HTMLTextAreaElement>("input");
const result = byId<HTMLElement>("result");

byId("theme").append(createThemeSwitch(document.documentElement));

function format() {
	const text = input.value;
	result.replaceChildren(
		text.trim() === ""
			? renderNotice("Nothing to format. Paste some JSON first.")
			: renderResult(text),
	);
}

byId("format").addEventListener("click", format);
input.addEventListener("keydown", (event) => {
	if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
		event.preventDefault();
		format();
	}
});
