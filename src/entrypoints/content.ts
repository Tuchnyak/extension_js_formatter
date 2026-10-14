import "../lib/styles.css";
import { el, renderNotice } from "../lib/render";
import { loadAutoFormat } from "../lib/settings";
import {
	afterPaint,
	createThemeSwitch,
	type Formatted,
	formatText,
	renderOutcome,
} from "../lib/toolbar";

function isJsonType(type: string): boolean {
	return (
		type === "application/json" ||
		type === "text/json" ||
		type.endsWith("+json")
	);
}

export default defineContentScript({
	matches: ["<all_urls>"],
	runAt: "document_end",
	main() {
		// Anything that is not a JSON document is left completely alone.
		if (!isJsonType(document.contentType)) return;
		void formatPage();
	},
});

let banner: HTMLElement | undefined;

async function formatPage() {
	if (!(await loadAutoFormat()) || !document.body) return;
	// Chrome shows a JSON response as plain text inside a <pre>
	const source = (document.querySelector("pre") ?? document.body).textContent;
	present(source ?? "", formatText(source ?? ""));
}

function present(source: string, outcome: Formatted) {
	banner?.remove();
	banner = undefined;

	if (outcome.kind === "view") {
		const root = document.documentElement;
		root.classList.add("jv-app");
		const header = el("div", "jv-page-header");
		header.append(createThemeSwitch(root));
		const page = el("main", "jv-page");
		page.append(header, outcome.element);
		document.body.replaceChildren(page);
		return;
	}

	// The original text stays untouched; the message goes above it.
	const current = el("div", "jv-app jv-banner");
	banner = current;
	current.append(
		renderOutcome(outcome, source, () => {
			current.replaceChildren(renderNotice("Formatting…"));
			afterPaint(() => present(source, formatText(source, true)));
		}),
	);
	document.body.prepend(current);
}
