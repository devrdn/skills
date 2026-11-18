// Выводит content.js как читаемый сюжет: презентация слайд за слайдом, в том порядке, в каком её видит аудитория.
// Рецензенты читают story.md вместо JavaScript; автор читает его, чтобы проверить порядок слайдов.
// Запуск: node story.js content.js > story.md
//
// Пометки (каждая - повод присмотреться, а не автоматическая ошибка):
//   «⚠ впервые: `x`»  - имя в тексте слайда, которого не показал ни один предыдущий слайд и нет в коде самого
//                       слайда: возможно, слайд использует понятие до того, как его ввели (references/common/content-rules.md, §5, «Порядок слайдов»).
//   «⚠ термин «X» встречался раньше, на [N]» - карточка определения стоит после слайдов, которые уже используют термин.
//   «⚠ раздел начинается без постановки проблемы» - раздел открывается голым рисунком, таблицей или кодом.
const path = require("path");
delete process.env.STUDENT;
if (!process.argv[2]) {
  console.error("Запуск: node story.js content.js > story.md");
  process.exit(1);
}
const deck = require(path.resolve(process.argv[2]));
const slides = deck.slides;
const FRAME = /^(План лекции|Вопросы для самопроверки|Результаты обучения|Ретроспектива|Резюме|Правила квиза)/;
const out = [];
const strip = (t) => (t || "").replace(/\s+/g, " ").trim();
const itemText = (it) => (typeof it === "string" ? it : `**${it.lead || ""}** ${it.text || ""}`);
const ind = (txt, pre = "      ") => txt.split("\n").map((l) => pre + l).join("\n");

// ---- что показывает каждый слайд (код и текст) и на какие имена ссылается его текст
const IDENT = /[A-Za-z_][A-Za-z0-9_]*/g;
const codeOf = (s) => [s.code, s.code2, s.left && s.left.code, s.right && s.right.code].filter(Boolean).join("\n");
const textOf = (s) => [s.intro, s.ask, s.question, s.text, s.after, s.answer, s.term, s.definition, s.term2, s.definition2,
  ...(s.items || []).map(itemText), ...(s.answerItems || []).map(itemText),
  ...[s.left, s.right].filter(Boolean).flatMap((c) => [c.label, c.text, ...(c.items || []).map(itemText)]),
  ...(s.header || []), ...(s.rows || []).flat(), s.caption].filter(Boolean).map(String).join("\n");
const spans = (t) => (t.match(/`[^`]+`/g) || []).map((x) => x.slice(1, -1));
// имена, за которыми стоит следить: идентификаторы во встроенном коде (`score`, `enemy <= 2` -> score, enemy); короткие и числовые - шум
const namesIn = (t) => spans(t).flatMap((x) => x.match(IDENT) || []).filter((w) => w.length > 2);
const known = new Set();
const learn = (s) => {
  for (const w of codeOf(s).match(IDENT) || []) known.add(w);
  for (const w of namesIn(textOf(s))) known.add(w);
};
// термин «Неопределённое поведение (undefined behavior, UB)» -> нестрогое регулярное выражение по его русским словам
const termRe = (term) => {
  const words = term.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (!words.some((w) => /[а-яё]/i.test(w))) return null;
  const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const part = (w) => /[а-яё]/i.test(w)
    ? esc(w.toLowerCase().slice(0, Math.max(5, w.length - 2))) + "[а-яё]*"
    : "`?" + esc(w) + "`?";
  return new RegExp(words.map(part).join("\\s+"), "i");
};

out.push(`# ${deck.title || "Лекция"}: сюжет презентации`, "");
out.push("## Заголовки по порядку", "");
slides.forEach((s, i) => {
  if (s.type === "section") { out.push(`- **${String(s.part).padStart(2, "0")}. ${s.title}**${s.quiz ? " (квиз)" : ""}`); return; }
  if (s.quiz || s.type === "refs") return;
  out.push(`  - [${i + 1}] ${s.title || s.label || s.type}`);
});
out.push("", "## Слайды", "");

const firstSection = slides.findIndex((s) => s.type === "section");
let prev = null;
slides.forEach((s, i) => {
  if (s.type === "refs" || (s.quiz && s.type !== "section")) return;
  if (s.type === "section") { out.push("", `### Раздел ${String(s.part).padStart(2, "0")}. ${s.title}`, ""); prev = s; return; }
  out.push(`**[${i + 1}] ${s.type} · ${s.title || s.label || ""}**`);
  const checkable = i > firstSection && firstSection >= 0 && !FRAME.test(s.title || "") && !/^Ошибка \d+:/.test(s.title || "");
  if (checkable) {
    const own = new Set(codeOf(s).match(IDENT) || []);
    const fresh = [...new Set(namesIn(textOf(s)))].filter((w) => !known.has(w) && !own.has(w));
    if (fresh.length) out.push(`  ⚠ впервые: ${fresh.map((w) => "`" + w + "`").join(", ")} (не было раньше и нет в коде слайда)`);
    for (const term of [s.term, s.term2].filter(Boolean)) {
      const re = termRe(term);
      if (!re) continue;
      const k = slides.slice(firstSection, i).findIndex((p) => !p.quiz && p.type !== "section" && !p.term && re.test(textOf(p) + " " + (p.title || "")));
      if (k >= 0) out.push(`  ⚠ термин «${term.replace(/\s*\(.*$/, "")}» встречался раньше, на [${firstSection + k + 1}]`);
    }
  }
  if (prev && prev.type === "section" && ["image", "table", "code"].includes(s.type) && !s.intro) out.push("  ⚠ раздел начинается без постановки проблемы");
  if (s.intro) out.push(`  вводная: ${strip(s.intro)}`);
  if (s.ask) out.push(`  вопрос залу: ${strip(s.ask)}`);
  if (s.term) out.push(`  определение: ${strip(s.term)} - ${strip(s.definition)}`);
  if (s.term2) out.push(`  определение: ${strip(s.term2)} - ${strip(s.definition2)}`);
  if (s.question) out.push(`  вопрос: ${strip(s.question)}`);
  if (s.text) out.push(`  текст (${s.kind || "блок"}): ${strip(s.text)}`);
  if (s.code) out.push(`  код (${s.lang || "?"}):`, ind(s.code));
  if (s.code2) out.push(`  код 2 (${s.label2 || s.lang2 || "вывод"}):`, ind(s.code2));
  for (const side of ["left", "right"]) {
    const c = s[side];
    if (!c) continue;
    out.push(`  ${side === "left" ? "слева" : "справа"}${c.label ? ` «${c.label}»` : ""}:`);
    if (c.code) out.push(ind(c.code));
    if (c.text) out.push(`      ${strip(c.text)}`);
    (c.items || []).forEach((x) => out.push(`      • ${strip(itemText(x))}`));
  }
  if (s.header) {
    out.push(`  таблица: ${s.header.join(" | ")}`);
    (s.rows || []).forEach((r) => out.push(`      ${r.join(" | ")}`));
  }
  if (s.image) out.push(`  рисунок: ${s.caption || ""} (${s.image})`);
  (s.items || []).forEach((x, k) => out.push(`  ${s.numbered ? `${k + 1}.` : "•"} ${strip(itemText(x))}`));
  if (s.answer) out.push(`  ответ (следующая страница): ${strip(s.answer)}`);
  if (s.after) out.push(`  вывод: ${strip(s.after)}`);
  out.push("");
  learn(s);
  prev = s;
});
console.log(out.join("\n"));
