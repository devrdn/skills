// Все тексты слайдов по порядку, для языковой проверки любых типов (cards, steps, versus...).
// Запуск: node deck_text.js content_pair.js > deck_text.md
if (!process.argv[2]) {
  console.error("Запуск: node deck_text.js content_pair.js > deck_text.md");
  process.exit(1);
}
const deck = require(require("path").resolve(process.argv[2]));
const SKIP = new Set(["type", "image", "num", "setPart", "part", "cols", "fs", "color", "mono", "lastAccent",
  "labelW", "minH", "valueFs", "colW", "code", "lang", "source", "file"]);
const lines = [];
const walk = (v, key) => {
  if (v == null || SKIP.has(key)) return;
  if (typeof v === "string") { if (v.trim()) lines.push(`  ${key}: ${v}`); return; }
  if (Array.isArray(v)) return v.forEach((x) => walk(x, key));
  if (typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
};
deck.slides.forEach((s, i) => {
  lines.push(`[${i + 1}] ${s.type}${s.title ? ": " + s.title : ""}`);
  for (const [k, x] of Object.entries(s)) if (k !== "title") walk(x, k);
});
console.log(lines.join("\n"));
