// Pre-build check of content.js: slide budget, time estimate, title and text rules.
// Usage: node lint_content.js content.js [--forbid "John,Emma"]
// ERROR must be fixed; WARN must be reviewed and either fixed or consciously accepted.
const path = require("path");

const file = process.argv[2];
const fi = process.argv.indexOf("--forbid");
const forbid = fi > 0 ? process.argv[fi + 1].split(",").map((s) => s.trim()).filter(Boolean) : [];
delete process.env.STUDENT;
const deck = require(path.resolve(file));
const slides = deck.slides;

const BUDGET = { target: [70, 90], max: 100 };  // content slides for a 70-80 minute lecture, quiz excluded
const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);
const titleOf = (s) => s.title || s.label || s.type;

// ---- budget: everything the audience sees except title, section dividers, quiz and bibliography.
// An in-lecture question (predict) counts as ONE content slide (one idea, ~1.2 min) although the engine
// renders it as two pages (question, then answer) in both versions; a tablebuild is one slide for students
// and two pages in the teacher version.
const SERVICE = new Set(["title", "section", "refs"]);
const content = slides.filter((s) => !SERVICE.has(s.type) && !s.quiz);
const quiz = slides.filter((s) => s.quiz);
const n = content.length;
const firstSec = slides.findIndex((s) => s.type === "section");
// in-lecture questions: after the first section, excluding typical-mistake slides («Ошибка N: ...»)
const questions = slides.filter((s, i) => !s.quiz && s.type === "predict" && i > firstSec && !/^Ошибка \d+:/.test(s.title || ""));

// rough delivery time, minutes (quiz excluded)
const MIN = { bullets: 0.8, def: 0.8, code: 1.0, codepair: 1.1, predict: 1.2, table: 0.8, compare: 0.8,
  alert: 0.55, image: 0.8, statement: 0.3, handson: 0.4 };
let minutes = 0;
for (const s of content) {
  if (s.type === "tablebuild") minutes += 0.8 + 0.25 * (s.rows ? s.rows.length : 3);
  else minutes += MIN[s.type] ?? 0.8;
}
const teacherPages = slides.reduce((a, s) => a + (s.type === "tablebuild" ? (s.stepwise ? s.rows.length + 1 : 2) : s.type === "predict" ? (s.only ? 1 : 2) : 1), 0);

// ---- walk all strings
function walk(o, fn) {
  if (typeof o === "string") fn(o);
  else if (Array.isArray(o)) o.forEach((x) => walk(x, fn));
  else if (o && typeof o === "object") Object.values(o).forEach((x) => walk(x, fn));
}
slides.forEach((s, i) => {
  const where = `#${i + 1} «${titleOf(s)}»`;
  walk(s, (str) => {
    if (/[—–]/.test(str)) err(`${where}: em/en dash (— or –); use a plain hyphen "-"`);
    for (const f of forbid) if (str.includes(f)) err(`${where}: mentions «${f}»`);
  });
});

// ---- titles
const BAD_TITLE = [
  [/ в деле$/i, "colloquial «в деле»"], [/^Тот же /i, "«Тот же ...» retells the example"], [/ короче$/i, "colloquial «короче»"],
  [/^Что (изменилось|даёт|дает|не так)/i, "a question instead of a term"], [/^(Проблема|Решение|Задача):/i, "a label instead of a term"],
  [/^Сравним /i, "a verb instead of a term"], [/^(Два|Три|Четыре) [а-яё]+$/i, "a count instead of a term"],
  [/!$/, "exclamation"], [/[а-яёa-z]\?$/i, "question mark in a title"],
];
const seen = new Map();
let ponyatie = 0;
slides.forEach((s, i) => {
  if (["title", "statement"].includes(s.type) || !s.title || s.quiz) return;
  const t = s.title, where = `#${i + 1} «${t}»`;
  if (s.type === "predict" && !/^(Вопрос|Ошибка \d+):/.test(t)) err(`${where}: an in-lecture question must be titled «Вопрос: <тема>»`);
  if (s.type !== "predict") for (const [re, why] of BAD_TITLE) if (re.test(t)) warn(`${where}: ${why}; name the concept with a term`);
  if (/^Понятие /.test(t)) ponyatie++;
  if ((t.match(/(?<!\*)\*(?!\*)/g) || []).length % 2 === 1) err(`${where}: a single «*» in a title turns the rest italic`);
  if (t.length > 46 && !["section", "handson"].includes(s.type)) warn(`${where}: ${t.length} chars, may not fit on one line`);
  if (seen.has(t) && s.type !== "section") warn(`${where}: duplicate title (same as #${seen.get(t)})`);
  else seen.set(t, i + 1);
});
if (ponyatie > 4) warn(`${ponyatie} titles start with «Понятие ...»: title definition slides with the term itself, keep «Понятие X» only where it would clash with the section name`);

// ---- structure
const firstSection = slides.findIndex((s) => s.type === "section");
const head = slides.slice(0, firstSection < 0 ? slides.length : firstSection);
const prevQ = head.filter((s) => s.type === "predict").length;
if (!deck.firstLecture && prevQ === 0) warn("no previous-topic questions before the first section (set firstLecture: true if this is the first lecture)");
if (prevQ > 2) warn(`${prevQ} previous-topic questions: keep 1-2`);
if (questions.length > 10) warn(`${questions.length} in-lecture questions: keep about one per section (6-9), each one costs ~1.5 min`);
if (!slides.some((s) => s.title === "План лекции")) warn("no «План лекции» slide");
if (!slides.some((s) => /^Резюме/.test(s.title || ""))) warn("no summary (Резюме)");
if (!slides.some((s) => s.type === "refs")) warn("no bibliography");
slides.forEach((s, i) => { if (s.type === "refs" && s.items.length > 11) warn(`#${i + 1} bibliography: ${s.items.length} entries; with long URLs only ~10-11 fit, split with start:`); });
// code inside a question sentence is unreadable on the projector: it belongs in the code field
slides.forEach((s, i) => {
  if (s.type !== "predict" || !s.question) return;
  const spans = s.question.match(/`[^`]+`/g) || [];
  if (spans.some((c) => c.length > 40 || /;\s*\S/.test(c.slice(1, -1)))) warn(`#${i + 1} «${titleOf(s)}»${s.quiz ? " (quiz)" : ""}: code written inline in the question; put it in the code field as separate lines`);
  if (s.options && s.options.some((o) => (o.match(/`[^`]+`/g) || []).some((c) => c.length > 40))) warn(`#${i + 1} «${titleOf(s)}»: an option holds long code; shorten the options and move shared code into the code field`);
});
if (quiz.length && !slides.some((s) => s.quiz && s.type === "statement")) warn("quiz has no «Время вышло» slide between questions and answers");
slides.forEach((s, i) => {
  const where = `#${i + 1} «${titleOf(s)}»`;
  if (s.type === "image" && !s.caption) warn(`${where}: image without caption`);
  if (s.type === "code" && s.columns && !Array.isArray(s.columns)) err(`${where}: columns must be an array of item arrays`);
  if (s.type === "code" && s.code2 && !s.lang2) warn(`${where}: code2 without lang2 renders as plain text`);
  if (s.type === "tablebuild" && s.intro && /угадыва/i.test(s.intro)) warn(`${where}: move the «guess» prompt from intro to ask (intro stays in the student version)`);
  if (["tablebuild", "predict"].includes(s.type) && s.source) warn(`${where}: source is not rendered for this slide type`);
});

// ---- text density and definitions
const words = (t) => (t || "").replace(/`[^`]*`/g, "X").replace(/\*/g, "").split(/\s+/).filter(Boolean).length;
// sentences: split after . ! ? … followed by a capital, a digit, a quote or inline code
const sentences = (t) => (t || "").replace(/`[^`]*`/g, "X").split(/(?<=[.!?…])\s+(?=[«"(A-ZА-ЯЁ0-9])/).filter((x) => x.trim()).length;
const itemText = (it) => (typeof it === "string" ? it : `${it.lead ? `**${it.lead}**` : ""} ${it.text || ""}`);
const INLINE_DEF = [/\*\*[^*]{2,40}\*\*\s+-\s/, /\([A-Za-z][A-Za-z -]{2,40}\)\s*-\s/, /\s-\sэто\s/i];
slides.forEach((s, i) => {
  if (s.quiz || ["title", "section", "refs", "statement", "handson"].includes(s.type)) return;
  if (/^(Резюме|План лекции|Вопросы для самопроверки|Результаты обучения|Ретроспектива)/.test(s.title || "")) return;
  const where = `#${i + 1} «${titleOf(s)}»`;
  const blocks = [s.intro, s.term, s.term2, s.items && s.items.length ? "items" : null, s.code, s.after].filter(Boolean).length;
  if (s.type === "def" && s.items && s.after) warn(`${where}: definition card + items + after paragraph mixes three text styles; keep the definition and either items or one after sentence`);
  if (["def", "code", "bullets", "alert"].includes(s.type) && s.intro && s.items && s.after) warn(`${where}: intro + items + after on one slide reads as a jumble; drop one block or split the slide`);
  if (blocks >= 5) warn(`${where}: ${blocks} text blocks on one slide; split it`);
  if (s.type === "def" && s.intro && s.items) warn(`${where}: intro + definition card + items is crowded; keep intro + card + one after sentence, or card + items`);
  for (const c of [s.code, s.left && s.left.code, s.right && s.right.code].filter(Boolean)) {
    const n = c.split("\n").length;
    if (n > 15) warn(`${where}: ${n} lines of code; more than ~15 lines becomes unreadable, trim to the lines that matter or split`);
  }
  for (const k of ["label", "label2"]) if (s[k] && s[k].length > 14) warn(`${where}: ${k} «${s[k]}» is longer than the code-block corner label allows (~14 chars)`);
  const body = [s.intro, s.after, s.text, ...(s.items || []).map(itemText)].join(" ");
  if (words(body) > 70 && !["table", "tablebuild"].includes(s.type)) warn(`${where}: ~${words(body)} words of body text (aim for 40-50)`);
  if (s.type !== "def") {
    const texts = [s.intro, s.after, s.text, ...(s.items || []).map(itemText), ...(s.left && s.left.items ? s.left.items : []), ...(s.right && s.right.items ? s.right.items : [])].filter(Boolean);
    for (const t of texts) if (INLINE_DEF.some((re) => re.test(t))) { warn(`${where}: looks like a term defined inline («${t.slice(0, 50)}...»); introduce new terms with a def card in the standard format`); break; }
  }
});

// ---- answers, lists, images, section openings
slides.forEach((s, i) => {
  const where = `#${i + 1} «${titleOf(s)}»`;
  for (const [c, l] of [[s.code, s.lang], [s.left && s.left.code, s.left && (s.left.lang || s.lang)], [s.right && s.right.code, s.right && (s.right.lang || s.lang)]]) {
    if (c && l === "text" && /^\s*(IF|WHILE|FOR|OUTPUT|INPUT|SET|ELSE|END)\b/m.test(c)) warn(`${where}: pseudocode marked lang "text"; use lang "pseudo" so it gets line numbers`);
  }
  if (s.items && s.type !== "refs" && !s.quiz && !/^(Резюме|План лекции|Вопросы для самопроверки|Результаты обучения)/.test(s.title || "")) {
    if (s.items.length === 1) warn(`${where}: a list with one item; write it as a sentence instead`);
    if (s.items.length > 5) warn(`${where}: ${s.items.length} list items; keep 2-5 or split`);
  }
  const prev = slides[i - 1];
  if (s.type === "image" && prev && prev.type === "section") warn(`${where}: the section opens with an image; open it with the problem or an orienting slide, then show the figure`);
  if (s.type === "image" && prev && prev.type === "image" && !prev.after && !s.intro) warn(`${where}: two image slides in a row with no words between them; give the first an after or the second an intro`);
  if (s.type === "image" && !s.intro && !s.after && prev && !["def", "code", "codepair", "bullets", "compare", "predict"].includes(prev.type)) warn(`${where}: image without any words around it; say on this or the previous slide what the figure shows`);
});

// ---- paragraph limits: no walls of text.
// At 16 pt a full-width line holds ~12 words, so 22 words is two lines: anything longer reads as a paragraph
// that the audience will not read while the lecturer speaks. These are ERRORs: shorten, turn the content into
// items, or move the second idea to its own slide. Numbers below are words (inline code counts as one word).
const LIMIT = { intro: 22, after: 22, text: 26, question: 24, answer: 28, definition: 25, definition2: 25, item: 20 };
const SLIDE_PROSE = 36;   // intro + after + text together
const FILLER = /^(Рассмотрим (задачу|пример|случай)|Давайте разберём|Посмотрим)[^.]{0,20}\.$/i;
const LEADIN = /^(Рядом|Проверка|Итог|Вывод|Важно|Пример|Примечание|Суть|Идея):\s/;
const SKIP_TITLES = /^(Резюме|План лекции|Вопросы для самопроверки|Результаты обучения|Правила квиза)/;
// A slide must read on its own (content-rules.md, «Connections between slides»): no linking words that continue
// the lecturer's speech, no narration of the lecture. This is the single source of the list.
// JS \b does not work with Cyrillic, hence the lookaheads.
const CONNECTOR = /(^|[\s,(«])(поэтому|однако|таким образом|следовательно|итак|кроме того|значит,)(?=[\s,.:])/i;
const OPENER = /^(Также|Тоже|Ещё|Еще|Иначе|Зато|При этом|А|Но|И|Теперь|Начнём|Перейдём|Вернёмся|Рассмотрим|Посмотрим|Проверим|Сведём|Повторим|Решим|Запишем|Применим|Остался|Осталось|Остаётся|Представьте|Как мы видели|Дальше|Далее|Следующий|Соберём|Разберём|Давайте|Воспроизведём|Вспомним)(?=[\s,.:!?]|$)/;
const ANAPHOR = /^(Это|Эта|Этот|Эти|Такой|Такая|Такое|Такие|Тот же|Та же|То же|Те же|Ту же|Того же|Той же|Тех же)(?=[\s,.:!?]|$)/;
slides.forEach((s, i) => {
  if (["title", "section", "refs", "statement", "handson"].includes(s.type) || SKIP_TITLES.test(s.title || "")) return;
  const where = `#${i + 1} «${titleOf(s)}»${s.quiz ? " (quiz)" : ""}`;
  const blocks = [["intro", s.intro], ["after", s.after], ["text", s.text], ["question", s.question], ["answer", s.answer],
    ["definition", s.definition], ["definition2", s.definition2],
    ...(s.items || []).map((x) => ["item", itemText(x)]),
    ...[s.left, s.right].filter(Boolean).flatMap((c) => [["text", c.text], ...(c.items || []).map((x) => ["item", itemText(x)])])]
    // a quiz entry exists twice (question page and answer page): check the question once and the answer once
    .filter(([k]) => !(s.only === "q" && k === "answer") && !(s.only === "a" && k === "question"));
  for (const [k, t] of blocks) {
    if (!t) continue;
    // a bold lead («**B. 9999.**», «**Ограничение.**») is a label, not a sentence of the paragraph
    const w = words(t), n = sentences(t.replace(/^\s*\*\*[^*]+\*\*\s*/, "")), short = t.replace(/\s+/g, " ").slice(0, 60);
    if (w > LIMIT[k]) err(`${where}: ${k} has ${w} words (limit ${LIMIT[k]}) - «${short}...»; cut it to one idea, turn it into items or move part to the next slide`);
    else if (n >= 3) err(`${where}: ${k} has ${n} sentences - «${short}...»; one block holds one or two short sentences`);
    else if (n === 2 && w > 18 && ["intro", "after", "item"].includes(k)) warn(`${where}: ${k} packs two sentences into ${w} words - «${short}...»; keep one idea, the other goes to items or the next slide`);
    if (FILLER.test(t.trim())) warn(`${where}: filler sentence «${t.trim()}»; say what the example shows instead`);
    if (LEADIN.test(t.trim())) warn(`${where}: telegraphic lead-in «${t.trim().slice(0, 20)}...»; write a full sentence`);
    if (!k.startsWith("definition") && /;/.test(t.replace(/`[^`]*`/g, ""))) warn(`${where}: semicolon in ${k}; split into sentences or items`);
    const plain = t.replace(/`[^`]*`/g, "X");
    if (CONNECTOR.test(plain)) err(`${where}: ${k} uses the linking word «${plain.match(CONNECTOR)[2]}» - «${short}...»; state the fact: a colon, «и», or two short sentences`);
    for (const sent of plain.split(/(?<=[.!?])\s+/)) {
      const first = sent.trim().replace(/^\*\*/, "");
      if (OPENER.test(first)) err(`${where}: ${k} sentence opens with «${first.match(OPENER)[1]}» - «${first.slice(0, 50)}...»; the slide must read on its own, state this slide's point`);
      else if (ANAPHOR.test(first) && ["intro", "question"].includes(k)) warn(`${where}: ${k} opens with «${first.match(ANAPHOR)[1]}», pointing outside the slide; name the thing instead`);
    }
    if ((t.match(/\(/g) || []).length > 2) warn(`${where}: ${k} has ${(t.match(/\(/g) || []).length} parentheses; too many asides for a slide`);
  }
  if (["def", "code", "bullets", "alert"].includes(s.type) && s.intro && s.items && s.items.length && s.after) warn(`${where}: lead + list + takeaway is a jumble; drop one block or split the slide`);
  if (!s.quiz) {
    const prose = words(s.intro) + words(s.after) + words(s.text);
    if (prose > SLIDE_PROSE) err(`${where}: ${prose} words of running prose (intro + after + text, limit ${SLIDE_PROSE}); the slide reads as a paragraph, keep one of them short or split the slide`);
  }
});

// quiz must check ideas with new examples, not repeat lecture code
const norm = (c) => (c || "").replace(/\s+/g, "");
const lectureCode = new Set(slides.filter((s) => !s.quiz && s.code).map((s) => norm(s.code)));
quiz.filter((s) => s.only === "q" && s.code && lectureCode.has(norm(s.code))).forEach((s) => warn(`quiz «${s.title}»: same code as a lecture slide; use a new example`));

// ---- report
console.log(`Content slides (no title, sections, quiz, bibliography): ${n}  [target ${BUDGET.target[0]}-${BUDGET.target[1]}, max ${BUDGET.max}]`);
console.log(`Estimated delivery: ~${Math.round(minutes)} min (rough; target 70-80 min without quiz)`);
if (minutes > 95) warn(`estimated ~${Math.round(minutes)} min: too long for one lecture, cut non-essential slides`);
console.log(`In-lecture questions: ${questions.length}; quiz entries: ${quiz.length}; teacher-version pages ≈ ${teacherPages}`);
if (n > BUDGET.max) err(`budget exceeded: ${n} > ${BUDGET.max}. Cut by the selection rules or stop and offer the user options (cut list / split the lecture / raise the limit)`);
else if (n > BUDGET.target[1]) warn(`${n} content slides: above the ${BUDGET.target[0]}-${BUDGET.target[1]} target, check that every slide is essential`);
else if (n < 55) warn(`${n} content slides: thin for 70-80 minutes; are important parts of the source missing?`);
warns.forEach((w) => console.log("WARN ", w));
errors.forEach((e) => console.log("ERROR", e));
console.log(`Total: ${errors.length} errors, ${warns.length} warnings`);
process.exit(errors.length ? 1 : 0);
