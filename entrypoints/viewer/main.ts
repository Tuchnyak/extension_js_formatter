import "../../lib/styles.css";
import "./style.css";
import { parseJson } from "../../lib/parse";
import { renderError, renderJson } from "../../lib/render";

function byId<T extends HTMLElement>(id: string): T {
	const node = document.getElementById(id);
	if (!node) throw new Error(`#${id} not found`);
	return node as T;
}

const input = byId<HTMLTextAreaElement>("input");
const result = byId<HTMLElement>("result");

function format() {
	const text = input.value;
	if (text.trim() === "") {
		const notice = document.createElement("p");
		notice.className = "notice";
		notice.textContent = "Nothing to format. Paste some JSON first.";
		result.replaceChildren(notice);
		return;
	}
	const parsed = parseJson(text);
	result.replaceChildren(
		parsed.ok ? renderJson(parsed.value) : renderError(parsed, text),
	);
}

byId("format").addEventListener("click", format);
input.addEventListener("keydown", (event) => {
	if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
		event.preventDefault();
		format();
	}
});
