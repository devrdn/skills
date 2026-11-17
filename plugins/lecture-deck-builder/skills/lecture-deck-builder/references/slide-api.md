# content.js: format and slide types

A lecture is described by one file, `content.js`, which the engine `build_modern.js` turns into a PPTX. A complete working example is `assets/example_content.js` (OOP in PHP: 9 sections, quiz, student filter). Skim it before writing your own file to see how the slide types combine in a real lecture; note that it is longer than the current budget allows.

## Contents

1. File skeleton
2. Inline text markup
3. Common fields
4. Slide types
5. Quiz
6. Student version
7. Code highlighting
8. Limits and pitfalls

## 1. File skeleton

```js
const quiz = [ /* quiz questions, see section 5 */ ];
const quizQ = quiz.map((q) => ({ type: "predict", only: "q", ...q }));
const quizA = quiz.map((q, i) => ({ type: "predict", only: "a", answerLabel: `Ответ на вопрос ${i + 1}`, ...q }));

const deck = {
  lecture: 6,                       // lecture number: figures become 6.1, 6.2 ...
  title: "ООП в PHP. Часть I",      // file metadata
  keywords: ["fmt", "Println"],     // optional: extra words to highlight in code
  firstLecture: false,              // true when there are no previous-topic questions
  slides: [ /* slides in order */ ],
};

if (process.env.STUDENT) { /* student filter, see section 6 */ }
module.exports = deck;
```

## 2. Inline text markup

Works in every text field except code:

- `**bold**`: key words. Mark what the student must remember on every slide, never whole paragraphs.
- `` `mono` ``: function, type, operator, keyword, command and file names in running text.
- `*italic*`: rarely. A single `*` in a slide title breaks the layout (the rest turns italic), so never use asterisks in titles.

List items (`items`) are a string or `{ lead: "Термин.", text: "пояснение" }`; `lead` is rendered bold.

## 3. Common fields

Available on most types:

| Field | Purpose |
|---|---|
| `title` | Slide title (title rules: content-rules.md, section 6) |
| `intro` | Paragraph under the title, before the main block |
| `after` | One sentence after the main block: the slide's conclusion |
| `source` | Small grey line at the bottom: «PHP Documentation (2026). Exceptions.» |
| `fs` | Manual font size of the main block. Rarely needed; the engine fits sizes itself |
| `setPart` | Footer text from this slide on («Повторение», «Итоги») |
| `quiz: true` | Quiz slide: dropped from the student version |
| `lineNumbers: false` | Turn off line numbers in this slide's code blocks (for program output, console dialogs) |

The footer «NN. Section name» is set automatically after each `section` slide.

## 4. Slide types

### title

```js
{ type: "title", course: "Веб-разработка", title: "Объектно-ориентированное программирование в PHP. Часть I",
  meta: "Лекция 6  ·  Информатика и прикладная информатика" }
```

`course` and `meta` per course: see content-rules.md, section 9.

`author` defaults to «Nartea N.». `course` is shown as a pill above the title.

### section

```js
{ type: "section", part: 2, title: "Исключения" }
```

Gradient divider with the number «02». Sets the footer of the following slides.

### bullets

```js
{ type: "bullets", title: "План лекции", numbered: true, gap: 2, items: ["...", "..."],
  intro: "...", after: "...", start: 0 }
```

`numbered`: numbered list; `start`: numbering offset; `gap`: space between items in pt (default 9, `0` allowed).

### def

```js
{ type: "def", title: "Понятие исключения", term: "Исключение (exception)", definition: "объект, описывающий ...",
  term2: "...", definition2: "...", items: ["..."], intro: "...", after: "...", source: "..." }
```

Definition card: the term in brand color, then a hyphen and the definition starting lowercase. `numbered: true` numbers the items (for ordered parts). A second definition (`term2`) gets a second card. This is the only way to introduce a new term. Keep it light: the card plus either up to three short items or one `after` sentence, not both.

### code

```js
{ type: "code", title: "Объявление конструктора", lang: "php", code: "class Product\n{\n...}",
  label: "PHP 8.4", code2: "program output", lang2: "text", label2: "вывод",   // labels: up to ~14 characters
  items: ["..."], columns: [["item", "item"], ["item"]], intro: "...", after: "..." }
```

Dark code block with line numbers (added automatically for any `lang` except `text`, from two lines up). Font size is fitted automatically from 14 down to 10 pt by width and height. `code2` is a second block below the first (e.g. program output); without `lang2` it renders as `text`. `columns`: two columns of items under the code, only as an array of arrays.

### codepair

```js
{ type: "codepair", title: "Способы сообщить об ошибке", lang: "php",
  left:  { label: "Возврат false", code: "...", text: "caption under the code" },
  right: { label: "Остановка скрипта", code: "...", text: "..." },
  after: "shared conclusion, full width", textFs: 14, capFs: 14 }
```

Two columns, each with code or text. The main tool for problem/solution, before/after and declaration/usage pairs. A column without `code` becomes a light card with `text` and/or `items` (e.g. code on the left, explanation on the right). A column holds about 44 characters of code at 10 pt: wrap long lines by hand or trim the example.

### table

```js
{ type: "table", title: "Модификаторы видимости", header: ["Модификатор", "Где доступен"],
  rows: [["`public`", "Везде"], ["`private`", "Только в классе"]], colW: [2, 5], dense: true, after: "..." }
```

`colW`: relative column widths. `dense`: tight rows. The first column is bold (`firstBold: false` turns that off).

### tablebuild

```js
{ type: "tablebuild", title: "Сравнение объектов: == и ===", intro: "`$a = ...; $b = clone $a;`",
  ask: "Что дадут сравнения?", header: [...], rows: [...], reveal: [1, 2], dense: true, after: "..." }
```

Guess-table for the teacher version: page 1 shows the columns listed in `reveal` as «?», page 2 shows them filled. `stepwise: true` reveals one row per page instead (rows + 1 pages; use rarely, it inflates the deck). Counts as one slide in the budget; in the student version it becomes a plain filled table.

`ask` is the "guess" prompt («Угадываем построчно.»): shown in accent color under `intro` and dropped from the student version. Keep only the conditions in `intro` (scenario, code, ARN), since students need them too. `source` is not rendered for this type.

### compare

```js
{ type: "compare", title: "Обычные и постоянные покупатели", intro: "...",
  left: { label: "Обычный", items: ["..."] }, right: { label: "Постоянный", items: ["..."] }, after: "..." }
```

Two light cards with pills. For comparing concepts without code.

### alert

```js
{ type: "alert", kind: "WARNING", title: "Пустой блок catch", text: "...", after: "...", items: ["..."] }
```

`kind`: `NOTE`, `IMPORTANT`, `WARNING`, `TIP`. Bold the part that carries the recommendation.

### image

```js
{ type: "image", title: "Модели хранения данных", image: "img/l6_storage_models.png",
  caption: "Модели хранения данных", source: "...", intro: "...", after: "...", maxw: 7.5 }
```

Image in a light card with the caption «Рис. 6.N.» (numbered automatically in order of appearance in the deck; `num: "3.5"` overrides the number if it must match the chapter). `after` goes under the caption at 14 pt and the image shrinks to make room. The picture area is about 8.2 x 3.4 in, so a tall diagram is limited by height: drop `intro`/`after` to give it the most room, and set `maxw` only to make a wide image narrower. Put the file into `img/` of the working folder. Source images only. Convert SVG to PNG first (cairosvg, scale 2.5-3, white background).

### predict

An audience question. It always renders as **two pages**, in the teacher and the student version alike: the question page (title, question, code), then the answer page. The answer page is titled «Ответ: ...» (the engine replaces a leading «Вопрос:»; `answerTitle` overrides it), repeats the code when it still fits at 10.5 pt or more, and shows the answer card and `after`.

```js
{ type: "predict", title: "Вопрос: выполнение после throw", noPill: true,
  question: "Что увидит пользователь?", lang: "php", code: "...",
  answer: "**Короткий жирный ответ.** Пояснение в одно-два предложения.",
  answerItems: ["...", "..."], answerNumbered: true, after: "..." }
```

Outside the quiz always use `noPill: true` and the title «Вопрос: тема». `showCodeInAnswer: false` never repeats the code on the answer page, `true` always repeats it (even if small). The old `split`, `side` and `stacked` fields are ignored. `options` (A-D) are for the quiz, which always uses separate question and answer pages via `only: "q"` / `only: "a"`. Quiz code goes in `code` (rendered at 11 pt or larger, with line numbers); if it does not fit at that size the slide overflows and the engine reports it, so shorten the code or the options.

### statement

```js
{ type: "statement", label: "Время вышло", text: "Сдаём листки с ответами. Теперь разбираем правильные ответы." }
```

Gradient slide with one large sentence. Use rarely in the lecture: for a key claim or the quiz pause.

### handson

```js
{ type: "handson", label: "Hands-on 6.1", title: "Создание бакета" }                 // Cloud: label and title only, rendered large
{ type: "handson", label: "Практика 6.1", title: "...", items: ["..."], note: "Парами, 20 минут" }
```

### refs

```js
{ type: "refs", title: "Библиография", fs: 10, items: ["Author (year). *Title*. Available at: URL"] }
```

About 9 sources with long URLs fit on one slide at `fs: 10`. Split a longer list into «Библиография (1 из 2)» and «Библиография (2 из 2)» with `start: 12` on the second so numbering continues.

## 5. Quiz

Team quiz: 8 questions, the last worth 2 points. Order: section divider, rules, all questions, «Время вышло», all answers.

```js
const quiz = [
  { voteLabel: "Вопрос 1 из 8", title: "Обращение к свойству", question: "Что означает `$product->$name`?",
    options: ["...", "...", "...", "..."],
    answer: "**C.** Пояснение." },            // the letter at the start of answer highlights the correct option
  { voteLabel: "Вопрос 3 из 8", title: "Присваивание объекта", question: "Что выведет код?", lang: "php",
    code: "$a = new Product('Ноутбук', 14999);\n$b = $a;\n$b->price = 9999;\necho $a->price;",   // code as lines, not inline
    options: ["14999", "9999", "Ошибку", "0"], answer: "**B. 9999.** Пояснение." },
];
// in slides:
{ type: "section", part: 9, title: "Командный квиз", quiz: true },
{ type: "bullets", title: "Правила квиза", quiz: true, items: [
  "Команды по 4-5 человек, у каждой **название** и листок для ответов.",
  "На вопрос **30 секунд**, ответ пишем буквой.",
  "Верный ответ - **1 балл**, последний вопрос - **2 балла**.",
  "Сначала все 8 вопросов, затем **сдаём листки** и вместе разбираем ответы." ] },
...quizQ.map((q) => ({ ...q, quiz: true })),
{ type: "statement", quiz: true, label: "Время вышло", text: "Сдаём листки с ответами. Теперь разбираем правильные ответы." },
...quizA.map((q) => ({ ...q, quiz: true })),
```

Bilingual quiz (on request): fields `questionEn`, `optionsEn`, `answerEn`; `voteLabel: "Вопрос 1 из 8 · Question 1 of 8"`, `answerLabel: "Ответ на вопрос 1 · Answer 1"`. On the answer page English is shown only for the correct option.

## 6. Student version

At the end of content.js (built with `STUDENT=1`):

```js
if (process.env.STUDENT) {
  deck.slides = deck.slides
    .filter((sp) => !sp.quiz)
    .map((sp) => {
      if (sp.type === "tablebuild") { const { ask, reveal, ...rest } = sp; return { ...rest, type: "table" }; }
      if (sp.title === "План лекции") return { ...sp, items: sp.items.filter((i) => i !== "Командный квиз.") };
      return sp;
    });
}
```

## 7. Code highlighting

`lang`: `php`, `cpp`, `js`, `bash`, `json`, `pseudo` (pseudocode: numbered, generic highlighting), `text` (program output, trees, console dialogs: no numbers, no highlighting). Comments (`//`, `#`, `/* */`), strings, `$variables`, numbers and keywords from the built-in list are highlighted. For other languages (Python, Go, SQL, YAML) pick the closest (`bash` for `#` comments, `cpp` for `//`) and add the language's words to `deck.keywords`. Trees and program output: `lang: "text"`.

## 8. Limits and pitfalls

- The content area ends at 5.02 in; anything lower hits the footer. The engine prints `WARN [слайд N] переполнение (type): низ X > 5.02`; the slide number equals the PDF page number.
- A `source` line sits at the bottom of the slide. If content reaches it, the engine prints `наложение на строку источника`: shorten the text or drop `source`.
- Body text is 16 pt, tables 14 pt. For `bullets` and `def` the engine itself lowers items to 14 pt when space is short and never goes lower, so shortening text sometimes "changes nothing" until the line count drops. To fix overflow, shorten first, then split the slide or move part into `codepair`/`columns`. Manually lowering a code block's `fs` to 9 pt is a last resort.
- Code wider than about 80 characters does not fit across the full width at 10 pt, or 40 characters in a `codepair` column (line numbers take 3-4 characters).
- `columns: true` and `code2` without `lang2` are common mistakes; `lint_content.js` catches them.
