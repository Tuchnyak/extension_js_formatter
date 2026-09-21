// Generates fixtures/large.json (~5 MB) for manual performance testing.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TARGET_BYTES = 5 * 1024 * 1024;
const items = [];
let size = 2;

for (let id = 0; size < TARGET_BYTES; id++) {
	const item = {
		id,
		name: `user-${id}`,
		active: id % 2 === 0,
		score: id * 1.5,
		tags: ["a", "b", "c"],
		address: { city: "Berlin", zip: String(10000 + (id % 90000)) },
		note: null,
	};
	const json = JSON.stringify(item);
	size += json.length + 1;
	items.push(item);
}

const out = fileURLToPath(new URL("./large.json", import.meta.url));
writeFileSync(out, JSON.stringify(items));
console.log(
	`Wrote ${out}: ${(size / 1024 / 1024).toFixed(2)} MB, ${items.length} items`,
);
