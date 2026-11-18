// Проверка content.js перед сборкой: бюджет слайдов, оценка времени, правила для заголовков и текста.
// Запуск: node lint_content.js content.js [--forbid "John,Emma"]
// ERROR нужно исправить; каждый WARN нужно просмотреть и либо исправить, либо осознанно оставить.
const path = require("path");

const file = process.argv[2];
const fi = process.argv.indexOf("--forbid");
if (!file || file.startsWith("--") || (fi > 0 && !process.argv[fi + 1])) {
  console.error('Запуск: node lint_content.js content.js [--forbid "John,Emma"]');
  process.exit(1);
}
const forbid = fi > 0 ? process.argv[fi + 1].split(",").map((s) => s.trim()).filter(Boolean) : [];
delete process.env.STUDENT;
const deck = require(path.resolve(file));
const slides = deck.slides;

const BUDGET = { target: [70, 90], max: 100 };  // содержательные слайды на лекцию в 70-80 минут, без квиза
const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);
const titleOf = (s) => s.title || s.label || s.type;

// ---- бюджет: всё, что видит аудитория, кроме титула, разделителей разделов, квиза и списка литературы.
// Вопрос по ходу лекции (predict) считается ОДНИМ содержательным слайдом (одна мысль, около 1,2 мин), хотя движок
// выводит его на двух страницах (вопрос, затем ответ) в обеих версиях; tablebuild - один слайд в студенческой
// версии и две страницы в версии преподавателя.
const SERVICE = new Set(["title", "section", "refs"]);
const content = slides.filter((s) => !SERVICE.has(s.type) && !s.quiz);
const quiz = slides.filter((s) => s.quiz);
const n = content.length;
const firstSec = slides.findIndex((s) => s.type === "section");
// вопросы по ходу лекции: после первого раздела, кроме слайдов о типичных ошибках («Ошибка N: ...»)
const questions = slides.filter((s, i) => !s.quiz && s.type === "predict" && i > firstSec && !/^Ошибка \d+:/.test(s.title || ""));

// примерное время лекции в минутах (без квиза)
const MIN = { bullets: 0.8, def: 0.8, code: 1.0, codepair: 1.1, predict: 1.2, table: 0.8, compare: 0.8,
  alert: 0.55, image: 0.8, statement: 0.3, handson: 0.4 };
let minutes = 0;
for (const s of content) {
  if (s.type === "tablebuild") minutes += 0.8 + 0.25 * (s.rows ? s.rows.length : 3);
  else minutes += MIN[s.type] ?? 0.8;
}
const teacherPages = slides.reduce((a, s) => a + (s.type === "tablebuild" ? (s.stepwise ? s.rows.length + 1 : 2) : s.type === "predict" ? (s.only ? 1 : 2) : 1), 0);

// ---- обход всех строк
function walk(o, fn) {
  if (typeof o === "string") fn(o);
  else if (Array.isArray(o)) o.forEach((x) => walk(x, fn));
  else if (o && typeof o === "object") Object.values(o).forEach((x) => walk(x, fn));
}
slides.forEach((s, i) => {
  const where = `#${i + 1} «${titleOf(s)}»`;
  walk(s, (str) => {
    if (/[—–]/.test(str)) err(`${where}: длинное или короткое тире (— или –); пиши обычный дефис "-"`);
    for (const f of forbid) if (str.includes(f)) err(`${where}: упоминается «${f}»`);
  });
});

// ---- заголовки
const BAD_TITLE = [
  [/ в деле$/i, "разговорное «в деле»"], [/^Тот же /i, "«Тот же ...» пересказывает пример"], [/ короче$/i, "разговорное «короче»"],
  [/^Что (изменилось|даёт|дает|не так)/i, "вопрос вместо термина"], [/^(Проблема|Решение|Задача):/i, "метка вместо термина"],
  [/^Сравним /i, "глагол вместо термина"], [/^(Два|Три|Четыре) [а-яё]+$/i, "число вместо термина"],
  [/!$/, "восклицательный знак"], [/[а-яёa-z]\?$/i, "вопросительный знак в заголовке"],
];
const seen = new Map();
let ponyatie = 0;
slides.forEach((s, i) => {
  if (["title", "statement"].includes(s.type) || !s.title || s.quiz) return;
  const t = s.title, where = `#${i + 1} «${t}»`;
  if (s.type === "predict" && !/^(Вопрос|Ошибка \d+):/.test(t)) err(`${where}: вопрос по ходу лекции озаглавливается «Вопрос: <тема>»`);
  if (s.type !== "predict") for (const [re, why] of BAD_TITLE) if (re.test(t)) warn(`${where}: ${why}; назови понятие термином`);
  if (/^Понятие /.test(t)) ponyatie++;
  if ((t.match(/(?<!\*)\*(?!\*)/g) || []).length % 2 === 1) err(`${where}: одиночная «*» в заголовке делает курсивом весь остаток`);
  if (t.length > 46 && !["section", "handson"].includes(s.type)) warn(`${where}: символов: ${t.length}, может не поместиться в одну строку`);
  if (seen.has(t) && s.type !== "section") warn(`${where}: заголовок повторяется (такой же на #${seen.get(t)})`);
  else seen.set(t, i + 1);
});
if (ponyatie > 4) warn(`заголовков, начинающихся с «Понятие ...»: ${ponyatie}; называй слайд с определением самим термином, а «Понятие X» оставляй только там, где иначе заголовок совпадёт с названием раздела`);

// ---- структура
const firstSection = slides.findIndex((s) => s.type === "section");
const head = slides.slice(0, firstSection < 0 ? slides.length : firstSection);
const prevQ = head.filter((s) => s.type === "predict").length;
if (!deck.firstLecture && prevQ === 0) warn("перед первым разделом нет вопросов по прошлой теме (если это первая лекция, задай firstLecture: true)");
if (prevQ > 2) warn(`вопросов по прошлой теме: ${prevQ}; оставь 1-2`);
if (questions.length > 10) warn(`вопросов по ходу лекции: ${questions.length}; оставь примерно по одному на раздел (6-9), каждый занимает около 1,5 мин`);
if (!slides.some((s) => s.title === "План лекции")) warn("нет слайда «План лекции»");
if (!slides.some((s) => /^Резюме/.test(s.title || ""))) warn("нет слайда «Резюме»");
if (!slides.some((s) => s.type === "refs")) warn("нет списка литературы (слайд «Библиография»)");
slides.forEach((s, i) => { if (s.type === "refs" && s.items.length > 11) warn(`#${i + 1} список литературы: записей ${s.items.length}; с длинными URL помещается только 10-11, раздели список через start:`); });
// код внутри фразы вопроса на проекторе не читается: ему место в поле code
slides.forEach((s, i) => {
  if (s.type !== "predict" || !s.question) return;
  const spans = s.question.match(/`[^`]+`/g) || [];
  if (spans.some((c) => c.length > 40 || /;\s*\S/.test(c.slice(1, -1)))) warn(`#${i + 1} «${titleOf(s)}»${s.quiz ? " (квиз)" : ""}: код написан прямо в тексте вопроса; вынеси его в поле code отдельными строками`);
  if (s.options && s.options.some((o) => (o.match(/`[^`]+`/g) || []).some((c) => c.length > 40))) warn(`#${i + 1} «${titleOf(s)}»: в варианте ответа длинный код; сократи варианты, а общий код вынеси в поле code`);
});
if (quiz.length && !slides.some((s) => s.quiz && s.type === "statement")) warn("в квизе нет слайда «Время вышло» между вопросами и ответами");
slides.forEach((s, i) => {
  const where = `#${i + 1} «${titleOf(s)}»`;
  if (s.type === "image" && !s.caption) warn(`${where}: рисунок без подписи`);
  if (s.type === "code" && s.columns && !Array.isArray(s.columns)) err(`${where}: columns должен быть массивом массивов пунктов`);
  if (s.type === "code" && s.code2 && !s.lang2) warn(`${where}: code2 без lang2 выводится простым текстом`);
  if (s.type === "tablebuild" && s.intro && /угадыва/i.test(s.intro)) warn(`${where}: перенеси просьбу «угадать» из intro в ask (intro остаётся в студенческой версии)`);
  if (["tablebuild", "predict"].includes(s.type) && s.source) warn(`${where}: на слайде этого типа source не выводится`);
});

// ---- плотность текста и определения
const words = (t) => (t || "").replace(/`[^`]*`/g, "X").replace(/\*/g, "").split(/\s+/).filter(Boolean).length;
// предложения: граница после . ! ? …, за которыми идёт заглавная буква, цифра, кавычка или встроенный код
const sentences = (t) => (t || "").replace(/`[^`]*`/g, "X").split(/(?<=[.!?…])\s+(?=[«"(A-ZА-ЯЁ0-9])/).filter((x) => x.trim()).length;
const itemText = (it) => (typeof it === "string" ? it : `${it.lead ? `**${it.lead}**` : ""} ${it.text || ""}`);
const INLINE_DEF = [/\*\*[^*]{2,40}\*\*\s+-\s/, /\([A-Za-z][A-Za-z -]{2,40}\)\s*-\s/, /\s-\sэто\s/i];
slides.forEach((s, i) => {
  if (s.quiz || ["title", "section", "refs", "statement", "handson"].includes(s.type)) return;
  if (/^(Резюме|План лекции|Вопросы для самопроверки|Результаты обучения|Ретроспектива)/.test(s.title || "")) return;
  const where = `#${i + 1} «${titleOf(s)}»`;
  const blocks = [s.intro, s.term, s.term2, s.items && s.items.length ? "items" : null, s.code, s.after].filter(Boolean).length;
  if (s.type === "def" && s.items && s.after) warn(`${where}: карточка определения + items + абзац after смешивают три стиля текста; оставь определение и либо items, либо одно предложение в after`);
  if (["def", "code", "bullets", "alert"].includes(s.type) && s.intro && s.items && s.after) warn(`${where}: intro + items + after на одном слайде читаются как каша; убери один блок или раздели слайд`);
  if (blocks >= 5) warn(`${where}: текстовых блоков на слайде: ${blocks}; раздели его`);
  if (s.type === "def" && s.intro && s.items) warn(`${where}: intro + карточка определения + items - слишком тесно; оставь intro + карточку + одно предложение в after или карточку + items`);
  for (const c of [s.code, s.left && s.left.code, s.right && s.right.code].filter(Boolean)) {
    const n = c.split("\n").length;
    if (n > 15) warn(`${where}: строк кода: ${n}; больше 15 строк уже не читается, оставь только важные строки или раздели слайд`);
  }
  for (const k of ["label", "label2"]) if (s[k] && s[k].length > 14) warn(`${where}: ${k} «${s[k]}» длиннее, чем вмещает плашка в углу блока кода (около 14 символов)`);
  const body = [s.intro, s.after, s.text, ...(s.items || []).map(itemText)].join(" ");
  if (words(body) > 70 && !["table", "tablebuild"].includes(s.type)) warn(`${where}: слов основного текста: ~${words(body)} (цель - 40-50)`);
  if (s.type !== "def") {
    const texts = [s.intro, s.after, s.text, ...(s.items || []).map(itemText), ...(s.left && s.left.items ? s.left.items : []), ...(s.right && s.right.items ? s.right.items : [])].filter(Boolean);
    for (const t of texts) if (INLINE_DEF.some((re) => re.test(t))) { warn(`${where}: похоже, термин определён прямо в тексте («${t.slice(0, 50)}...»); новые термины вводи карточкой определения (def) в стандартном формате`); break; }
  }
});

// ---- ответы, списки, рисунки, начала разделов
slides.forEach((s, i) => {
  const where = `#${i + 1} «${titleOf(s)}»`;
  for (const [c, l] of [[s.code, s.lang], [s.left && s.left.code, s.left && (s.left.lang || s.lang)], [s.right && s.right.code, s.right && (s.right.lang || s.lang)]]) {
    if (c && l === "text" && /^\s*(IF|WHILE|FOR|OUTPUT|INPUT|SET|ELSE|END)\b/m.test(c)) warn(`${where}: псевдокод помечен lang "text"; ставь lang "pseudo", тогда у строк появятся номера`);
  }
  if (s.items && s.type !== "refs" && !s.quiz && !/^(Резюме|План лекции|Вопросы для самопроверки|Результаты обучения)/.test(s.title || "")) {
    if (s.items.length === 1) warn(`${where}: список из одного пункта; запиши его предложением`);
    if (s.items.length > 5) warn(`${where}: пунктов в списке: ${s.items.length}; оставь 2-5 или раздели слайд`);
  }
  const prev = slides[i - 1];
  if (s.type === "image" && prev && prev.type === "section") warn(`${where}: раздел открывается рисунком; начни с постановки проблемы или вводного слайда, а рисунок покажи потом`);
  if (s.type === "image" && prev && prev.type === "image" && !prev.after && !s.intro) warn(`${where}: два слайда с рисунками подряд без слов между ними; дай первому after или второму intro`);
  if (s.type === "image" && !s.intro && !s.after && prev && !["def", "code", "codepair", "bullets", "compare", "predict"].includes(prev.type)) warn(`${where}: рисунок без единого слова вокруг; на этом или предыдущем слайде скажи, что он показывает`);
});

// ---- пределы для абзацев: никаких стен текста.
// При 16 pt строка во всю ширину вмещает около 12 слов, значит 22 слова - это две строки. Всё, что длиннее, читается
// как абзац, а абзац аудитория не читает, пока говорит преподаватель. Это ERROR: сократи текст, разбей его на
// items или перенеси вторую мысль на отдельный слайд. Числа ниже - это слова (встроенный код считается одним словом).
const LIMIT = { intro: 22, after: 22, text: 26, question: 24, answer: 28, definition: 25, definition2: 25, item: 20 };
const SLIDE_PROSE = 36;   // intro + after + text вместе
const FILLER = /^(Рассмотрим (задачу|пример|случай)|Давайте разберём|Посмотрим)[^.]{0,20}\.$/i;
const LEADIN = /^(Рядом|Проверка|Итог|Вывод|Важно|Пример|Примечание|Суть|Идея):\s/;
const SKIP_TITLES = /^(Резюме|План лекции|Вопросы для самопроверки|Результаты обучения|Правила квиза)/;
// Слайд должен читаться сам по себе (references/common/content-rules.md, §5, «Связи между слайдами»): никаких слов-связок,
// которые продолжают речь преподавателя, никакого пересказа хода лекции. Список хранится только здесь.
// В JS \b не работает с кириллицей, поэтому границы слов заданы опережающими проверками (lookahead).
const CONNECTOR = /(^|[\s,(«])(поэтому|однако|таким образом|следовательно|итак|кроме того|значит,)(?=[\s,.:])/i;
const OPENER = /^(Также|Тоже|Ещё|Еще|Иначе|Зато|При этом|А|Но|И|Теперь|Начнём|Перейдём|Вернёмся|Рассмотрим|Посмотрим|Проверим|Сведём|Повторим|Решим|Запишем|Применим|Остался|Осталось|Остаётся|Представьте|Как мы видели|Дальше|Далее|Следующий|Соберём|Разберём|Давайте|Воспроизведём|Вспомним)(?=[\s,.:!?]|$)/;
const ANAPHOR = /^(Это|Эта|Этот|Эти|Такой|Такая|Такое|Такие|Тот же|Та же|То же|Те же|Ту же|Того же|Той же|Тех же)(?=[\s,.:!?]|$)/;
slides.forEach((s, i) => {
  if (["title", "section", "refs", "statement", "handson"].includes(s.type) || SKIP_TITLES.test(s.title || "")) return;
  const where = `#${i + 1} «${titleOf(s)}»${s.quiz ? " (квиз)" : ""}`;
  const blocks = [["intro", s.intro], ["after", s.after], ["text", s.text], ["question", s.question], ["answer", s.answer],
    ["definition", s.definition], ["definition2", s.definition2],
    ...(s.items || []).map((x) => ["item", itemText(x)]),
    ...[s.left, s.right].filter(Boolean).flatMap((c) => [["text", c.text], ...(c.items || []).map((x) => ["item", itemText(x)])])]
    // запись квиза есть дважды (страница вопроса и страница ответа): вопрос проверяется один раз и ответ один раз
    .filter(([k]) => !(s.only === "q" && k === "answer") && !(s.only === "a" && k === "question"));
  for (const [k, t] of blocks) {
    if (!t) continue;
    // жирное начало («**B. 9999.**», «**Ограничение.**») - это метка, а не предложение абзаца
    const w = words(t), n = sentences(t.replace(/^\s*\*\*[^*]+\*\*\s*/, "")), short = t.replace(/\s+/g, " ").slice(0, 60);
    if (w > LIMIT[k]) err(`${where}: в ${k} слов: ${w} (предел ${LIMIT[k]}) - «${short}...»; оставь одну мысль, разбей текст на items или перенеси часть на следующий слайд`);
    else if (n >= 3) err(`${where}: в ${k} предложений: ${n} - «${short}...»; в одном блоке - одно-два коротких предложения`);
    else if (n === 2 && w > 18 && ["intro", "after", "item"].includes(k)) warn(`${where}: в ${k} два предложения, слов: ${w} - «${short}...»; оставь одну мысль, вторую перенеси в items или на следующий слайд`);
    if (FILLER.test(t.trim())) warn(`${where}: пустая фраза «${t.trim()}»; вместо неё скажи, что показывает пример`);
    if (LEADIN.test(t.trim())) warn(`${where}: телеграфное начало «${t.trim().slice(0, 20)}...»; напиши полное предложение`);
    if (!k.startsWith("definition") && /;/.test(t.replace(/`[^`]*`/g, ""))) warn(`${where}: точка с запятой в ${k}; раздели на предложения или пункты`);
    const plain = t.replace(/`[^`]*`/g, "X");
    if (CONNECTOR.test(plain)) err(`${where}: в ${k} слово-связка «${plain.match(CONNECTOR)[2]}» - «${short}...»; сообщи факт: двоеточие, «и» или два коротких предложения`);
    for (const sent of plain.split(/(?<=[.!?])\s+/)) {
      const first = sent.trim().replace(/^\*\*/, "");
      if (OPENER.test(first)) err(`${where}: предложение в ${k} начинается с «${first.match(OPENER)[1]}» - «${first.slice(0, 50)}...»; слайд должен читаться сам по себе, скажи, о чём именно этот слайд`);
      else if (ANAPHOR.test(first) && ["intro", "question"].includes(k)) warn(`${where}: ${k} начинается с «${first.match(ANAPHOR)[1]}» - это отсылка за пределы слайда; назови предмет прямо`);
    }
    if ((t.match(/\(/g) || []).length > 2) warn(`${where}: скобок в ${k}: ${(t.match(/\(/g) || []).length}; для слайда слишком много отступлений`);
  }
  if (["def", "code", "bullets", "alert"].includes(s.type) && s.intro && s.items && s.items.length && s.after) warn(`${where}: вводная строка + список + вывод - это каша; убери один блок или раздели слайд`);
  if (!s.quiz) {
    const prose = words(s.intro) + words(s.after) + words(s.text);
    if (prose > SLIDE_PROSE) err(`${where}: слов сплошного текста: ${prose} (intro + after + text, предел ${SLIDE_PROSE}); слайд читается как абзац, сократи один из блоков или раздели слайд`);
  }
});

// квиз проверяет идеи на новых примерах, а не повторяет код лекции
const norm = (c) => (c || "").replace(/\s+/g, "");
const lectureCode = new Set(slides.filter((s) => !s.quiz && s.code).map((s) => norm(s.code)));
quiz.filter((s) => s.only === "q" && s.code && lectureCode.has(norm(s.code))).forEach((s) => warn(`квиз «${s.title}»: тот же код, что на слайде лекции; возьми новый пример`));

// ---- отчёт
console.log(`Содержательных слайдов (без титула, разделов, квиза и литературы): ${n}  [цель ${BUDGET.target[0]}-${BUDGET.target[1]}, максимум ${BUDGET.max}]`);
console.log(`Примерное время лекции: ~${Math.round(minutes)} мин (грубая оценка; цель - 70-80 мин без квиза)`);
if (minutes > 95) warn(`по оценке ~${Math.round(minutes)} мин: слишком долго для одной лекции, убери необязательные слайды`);
console.log(`Вопросов по ходу лекции: ${questions.length}; записей квиза: ${quiz.length}; страниц в версии преподавателя ≈ ${teacherPages}`);
if (n > BUDGET.max) err(`бюджет превышен: ${n} > ${BUDGET.max}. Сократи слайды по правилам отбора или остановись и предложи пользователю варианты (список сокращений / разделить лекцию / поднять предел)`);
else if (n > BUDGET.target[1]) warn(`содержательных слайдов: ${n}, больше цели ${BUDGET.target[0]}-${BUDGET.target[1]}; проверь, что каждый слайд необходим`);
else if (n < 55) warn(`содержательных слайдов: ${n}, мало для 70-80 минут; не пропущены ли важные части источника?`);
warns.forEach((w) => console.log("WARN ", w));
errors.forEach((e) => console.log("ERROR", e));
console.log(`Итого: ERROR - ${errors.length}, WARN - ${warns.length}`);
process.exit(errors.length ? 1 : 0);
