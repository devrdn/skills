---
name: "lecture-deck-builder"
description: "Build university lecture decks in the author's brand from a chapter the user links or uploads (GitHub folder, readme.md, web page, file): PPTX + PDF with a teacher version, team quiz and student version, or an interactive HTML deck with live step-by-step diagrams and a SCORM package for Moodle. Use whenever the user asks for a presentation, slides or a deck for a lecture, topic or chapter (\"сделай презентацию\", \"следующую презентацию\", \"презентацию по этой главе\", \"переделай презентацию\"), for the teacher-only deck («версия для пары»), or for an interactive one («интерактивная», «динамическая», «html-презентация», «для Moodle», «SCORM»). Prefer it over pptx and academic-pptx for course lectures: it carries the brand engine, the 70-80 minute budget, source-only content, previous-topic questions, separate question and answer slides, slide order and text limits, review agents for facts, code, flow and fluency, and the interactive template."
---

# Lecture Deck Builder

This skill turns one chapter of a university course into a 70-80 minute lecture deck: a teacher version with a team quiz and a student version, both as PPTX and PDF, in the author's fixed brand style. The subject can be anything (cloud computing, PHP, C++, a new course): all content comes from the source the user provides.

The author is a university lecturer. He communicates in Russian and the slides are in Russian; these instructions are in English, but every slide text, title and the final report go in the user's language.

Complaints that shaped the current version, and where each is handled:

| Complaint | Rule | Check |
|---|---|---|
| Answer visible with the question | content-rules.md §8: question and answer on separate pages | the engine always splits `predict` |
| Slides out of order | content-rules.md §5 «Slide order» | plan reviewer (stage A), `story.js` marks, student reader |
| Slides not connected | content-rules.md §5 «Connections between slides» | student reader |
| «Поэтому», «Однако», «Начнём с» on slides | same section: a slide states facts, it does not narrate | `lint_content.js` ERROR, language editor |
| Walls of text | content-rules.md §7 «Paragraphs» | `lint_content.js` ERROR |
| Clumsy Russian | content-rules.md §7 «Language» | language editor |
| Wrong answers to code questions | content-rules.md §1 | code checker |
| Russian not smooth in the finished deck | «Stage D: final language pass» below | language editor, stage D |
| Pair deck reads as a wall of bullet points | «Pair deck» below: cards, steps, comparisons, numbers | build WARN, visual check |

## What is in the skill

| Path | Purpose | When to read |
|---|---|---|
| `references/content-rules.md` | What goes on the slides: source, selection, budget, structure, order, connections, titles, text limits, questions, course profiles | fully, before planning |
| `references/slide-patterns.md` | How one slide is built: anatomy and patterns per slide kind | before writing content.js |
| `references/slide-api.md` | The content.js format and every slide type | before writing content.js |
| `references/brand.md` | The brand; already built into the engine | skim once |
| `agents/README.md` | Review agents: roles, stages, how to launch and apply them | before stage A |
| `agents/*.md` | One instruction file per agent; the agent reads its own file | not needed by the author |
| `assets/example_content.js` | A complete lecture (C++, lecture 6) that passes lint with no warnings | before writing content.js |
| `scripts/setup.py` | Prepares a work folder: engine, scripts, fonts, dependencies | step 1 |
| `scripts/make.py` | Builds one version: PPTX, animations, PDF, layout checks | step 7 |
| `scripts/lint_content.js` | Budget, time, titles, text limits, linking words | after every change to content.js |
| `scripts/story.js` | Prints the deck as `story.md`; marks names used before they appear | before every review |
| `engine/` | Build engine (pptxgenjs), post-processing, fonts, gradients | never edit |
| Appendix of this file | Extra layouts for the pair deck and a text dump for the language pass | when building a pair deck or running stage D |
| `references/interactive.md` | Интерактивный режим: HTML и SCORM, живые схемы, иконки AWS, стрелки, слабые ПК, Moodle (на русском) | перед интерактивной презентацией |
| `assets/interactive/` | Заготовка интерактивной презентации: движок, стили бренда, шрифты, иконки AWS, `build.py`, образец слайдов | шаг 1 интерактивного режима |
| `scripts/check_fit.js` | Проверка в браузере: каждый шаг каждого слайда помещается, внешних запросов нет | после каждой сборки интерактивной презентации |

## Workflow

Create a task list (TaskCreate) if available: the job is long and the user follows progress there. The last task is verifying the result.

### 1. Setup

```bash
python3 <skill>/scripts/setup.py <workdir>      # e.g. /home/claude/deck; safe to re-run
```

content.js, plan.md, story.md, images (`img/`) and build outputs live in this folder.

### 2. Source

Get the full chapter text and everything it relies on.

- **GitHub.** Get the repository structure without downloading files:
  ```bash
  git clone -q --depth 1 --filter=blob:none --no-checkout https://github.com/<owner>/<repo> src_repo
  git -C src_repo ls-tree --name-only HEAD              # chapter folders
  git -C src_repo ls-tree -r --name-only HEAD <folder>  # files of one chapter
  ```
  Read a file with `git -C src_repo show HEAD:<path> > chapter.md` or `curl -sL https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>`. `gh api` and WebFetch on github.com pages are blocked in some environments.
- **Web page:** WebFetch. **User file:** read it from the uploads.
- **Images** referenced by the chapter: download into `img/` with a lecture prefix (`l6_...png`). Convert SVG: `python3 -c "import cairosvg; cairosvg.svg2png(url='a.svg', write_to='a.png', scale=2.5, background_color='white')"` (`pip install cairosvg` if missing).
- **Previous chapter**, for 1-2 warm-up questions (how to find it: content-rules.md §8). If it cannot be found, ask the user for a link.

Save the chapter and the previous chapter as files in the work folder: the reviewers read them. Read the whole chapter. Note concepts, mechanisms, examples and code, figures, footnotes, self-check questions, practice tasks, and separately errors and contradictions in the source for the final report.

### 3. Plan

Write `plan.md`: sections, and in each section one line per slide:

```
[N] title - its one point - what it needs (terms, programs, variables, figures)
```

Then check it yourself:

1. **Budget.** 70-90 content slides, hard maximum 100, for 70-80 minutes without the quiz (content-rules.md §3). Only the core of the chapter goes in; each slide answers "what must the student understand here".
2. **Order.** Everything in «what it needs» appears in an earlier line; each section follows the order of understanding (problem, term, mechanism, example, check question, limits); no topic is left and resumed later (content-rules.md §5).
3. **Flow test.** Read the titles alone: they form a coherent outline, each step following from the previous one.
4. **Problem, definition, solution** for every new concept, every new term on its own definition card (content-rules.md §7).

If the essential content does not fit in 100 slides, **stop and tell the user**: how many slides it needs, what would have to go, and options (cut named sections, split into two lectures with the boundary shown, raise the limit). If the user said to decide yourself, or nobody is there to ask, cut by the selection rules and list the cuts in the report. Otherwise do not show the plan: the user wants the finished deck.

### 4. Stage A review: plan reviewer

Launch the plan reviewer (`agents/README.md`) on plan.md and fix the plan. Moving a line now costs nothing; moving slides after content.js is written costs a rewrite of their leads.

### 5. content.js

Write `content.js` following slide-patterns.md, slide-api.md and the example. For a long chapter, write section by section. Before moving on, read every slide of the section as the student will: title, lead, one core, takeaway; clear on its own, without linking words or narration; no block longer than two lines; lists only for parallel items; new terms only on definition cards; code and figures that a back row can read. Write short from the start: choosing one idea per block is easier than trimming a paragraph afterwards.

```bash
node lint_content.js content.js --forbid "John,Emma"      # plus story character names from the chapter
node story.js content.js > story.md
```

Fix every ERROR. Fix WARNs rather than accept them: they point at the slides the author complains about. Look at every «⚠» in story.md: a name used before it appears means a slide is out of order or a step is missing.

### 6. Stage B review: facts, code, flow, language

Launch the fidelity reviewer, the code checker, the student reader and the language editor **in one message** (`agents/README.md`). Add the «Language focus» block (below) to the language editor's prompt. Apply the findings as that file says, re-run lint and story.js, and run round 2 of the student reader and the language editor when round 1 found more than a handful of problems.

### 7. Build the teacher version

```bash
python3 make.py content.js <Name>        # -> <Name>.pptx, <Name>.pdf; prints WARN, check_all, footer_scan
```

The number in `WARN [слайд N]` equals the PDF page number. Iterate until there is no `WARN`, `check_all.py` reports only the title page ("стр 1: край" is expected) and `footer_scan.py` reports 0 overlaps. To fix overflow: shorten text first, then split the slide or move to `codepair`/`columns`; never shrink body text.

### 8. Stage C review: visual

```bash
mkdir -p pages && pdftoppm -r 60 -png <Name>.pdf pages/pg
```

Launch one visual checker per ~40 pages, all in one message. Meanwhile look at the pages yourself. Fix, rebuild, re-run lint; if the fixes changed text, regenerate story.md and re-read the changed slides.

### 8a. Stage D: final language pass

The author's main recurring complaint after delivery is Russian that is technically correct but not «складно». Stage B reads the deck before the build fixes, visual fixes and late cuts change the wording, so after stage C run one more read of the **final** text:

```bash
node story.js content.js > story.md
```

Launch the language editor (opus) once on the new story.md, with the «Language focus» block in its prompt. Apply the findings, rebuild, and look at the changed pages. If it returns more than ~10 substantive findings, apply them and run it a second time.

#### Language focus

Append this to the language editor's prompt (stage B, stage D and the pair deck):

```
Дополнительный фокус: текст должен звучать как живая речь грамотного преподавателя, складно и естественно.
Прочитай каждый блок вслух про себя. Отмечай всё, что носитель русского языка сказал бы иначе:
- согласование рода, числа и падежа, особенно между заголовком карточки и её текстом, и в списках однородных членов;
- неверные предлоги и управление («влияет на», «зависит от», «отвечает за»);
- неестественный порядок слов, кальки с английского («делает репликацию», «имеет место», «в случае если»);
- телеграфный стиль: цепочки существительных без глагола там, где нужна фраза;
- разные грамматические формы в параллельных блоках одного слайда (все с глагола или все с существительного);
- тяжёлые конструкции с несколькими родительными подряд («изменение параметров настройки репликации базы»);
- одно и то же слово в соседних блоках.
Предлагай вариант не длиннее исходного, сохраняй термины и факты.
```

### 9. Student version and delivery

```bash
STUDENT=1 python3 make.py content.js <Name>s
python3 /mnt/skills/public/pptx/scripts/office/validate.py <Name>.pptx    # if the pptx skill is present
```

The result is always **four files**. Copy all four by name (not `cp <Name>*`, which would also pick up the `.noanim` and `.anim.json` side files) into the delivery folder (`/mnt/user-data/outputs/` when it exists), check that they arrived, and send all four (SendUserFile, if available):

- `<Course>_<NN>_<Тема>.pptx` and `.pdf`: teacher version;
- `<Course>_<NN>_<Тема>_студенты.pptx` and `.pdf`.

`<Course>`: `Cloud`, `Веб`, `Программирование`, or a short name for a new course. The topic is 2-4 words from the chapter title, joined by underscores (`Введение_в_AWS`, `ООП_в_PHP_часть_1`).

### 10. Report

Short, in the user's language:

- content slides and pages in each version, estimated time;
- what was cut from the source, if anything, and any change to the chapter's order of sections;
- errors and inaccuracies found in the source (a list, with the place in the chapter);
- 3-5 slides that can be skipped if time runs short;
- which reviewers ran and how many rounds, or that the checks were done without separate agents;
- if the lecture hit the limit or the material is thin, say so and offer an option.

Do not recount the steps of the work.

## Revisions after feedback

The user usually sends targeted remarks ("remove this slide", "rename", "problem first, then solution"). Keep the previous version (`cp content.js content.v1.js`), edit only content.js, rebuild both versions, run all checks and send the four files again. After a revision, regenerate story.md and check the edited slides for order and text limits; when a remark is about order, connections or wording across the deck, run the student reader or the language editor again. Apply a general remark (for example "titles must be terms") to the whole deck, not only to the slide it was raised on. Do not change things the author already approved and did not mention (title wording, course label, structure he accepted), unless they break a rule; if a rule and an approved choice conflict, keep the approved choice and mention it.

A remark that is a new lasting rule for all lectures belongs in this skill: tell the user it can be added.

## Pair deck (версия для пары)

A second, teacher-only deck the author presents at the lecture himself. He narrates, so the slides carry the structure and the facts, not prose. Make it when he asks for a short deck, a deck «для пары» or «для препода», usually after the main deck is done.

### What goes in

- **The whole chapter, in its order, by sections**: a section divider for every chapter section, nothing skipped. Short does not mean partial: every concept, term and comparison of the chapter appears, compressed.
- **At most 60 pages** (preferably), counting dividers and both pages of every question. When the chapter does not fit, merge related slides into one card or comparison slide, drop duplicate examples, and keep every concept. If it still needs more than 60, build it and say how many pages and why in the report.
- **Every figure of the chapter and only those**: figures the chapter text refers to by number, with the chapter's numbers set explicitly (`num: "7.3"`). Repository images the chapter does not reference stay out.
- **The in-lecture questions** of the main deck (`predict`, question and answer on separate pages) and one warm-up question on the previous topic. No team quiz, no learning outcomes, no self-check list.
- **A plan** slide and a **summary** at the end, both as cards.
- The title is the lecture title. Never write «кратко», «краткий обзор» or «короткая версия» on a slide.

### How it looks: no plain bullet lists

Plain bullet points read badly from the back row and all look alike. Pick the layout by the shape of the content:

| Content | Type | Example |
|---|---|---|
| Parallel concepts, terms, properties, pros and cons | `cards` | Свойства ACID (2×2), шесть моделей NoSQL |
| Two things compared by the same criteria | `versus` | ACID или BASE, Multi-AZ и реплика для чтения |
| A process or sequence | `steps` | транзакция, запись в WAL, восстановление на момент времени |
| A few key numbers | `stats` | Aurora: 6 копий, до 15 реплик |
| Data with three or more columns | `table` | составной ключ таблицы |
| A chapter figure | `image` | |
| Code that is the point of the slide | `code` | запрос через AWS CLI |
| A question to the audience | `predict` | |

Writing the blocks:

- Card: `label` is the category in 1-3 words («Термин», «Проблема», «Плюс»), `title` is the term or a short claim, `text` is one complete sentence of about 6-14 words. A card is not a telegram: it reads as a phrase.
- Parallel cards on one slide share a grammatical form.
- Color carries meaning only when set on purpose (`color` for good/bad, last step `lastAccent`); otherwise the engine alternates the two brand colors.
- 2-6 cards per slide; 4 go as 2×2. Long texts get fewer columns (`cols`).
- Reuse the main deck: take the questions, tables, code and figure slides from content.js with a `pick` helper, so the texts match the approved main deck.

### Slide types for the pair deck

All take `title` and optional `intro`, `after`, `setPart`, like the main types.

```js
{ type: "cards", title, cols?, mono?, cards: [{ label?, title?, text?, color? }] }
{ type: "steps", title, lastAccent?, steps: [{ title, text?, color? }] }          // 3-5 steps
{ type: "stats", title, cols?, stats: [{ value, label?, text?, color? }] }       // 2-4 tiles
{ type: "versus", title, left, right, labelW?, rows: [[criterion, leftText, rightText]] }
```

### Build and checks

In the work folder of the main deck, after the main deck is built:

1. Write `pair_layouts.js` with the code from Appendix A, then create the pair engine and build script. The main engine stays untouched:
   ```bash
   python3 - <<'EOF'
   src = open("build_modern.js").read()
   lay = open("pair_layouts.js").read()
   assert src.count("const RENDER = {") == 1
   src = src.replace("const RENDER = {", lay + "\nconst RENDER = {\n  cards: cardsSlide, steps: stepsSlide, stats: statsSlide, versus: versusSlide,", 1)
   open("build_pair.js", "w").write(src)
   EOF
   sed 's/"build_modern.js"/"build_pair.js"/' make.py > make_pair.py
   ```
2. Write `content_pair.js`: it starts with `delete process.env.STUDENT; const full = require("./content.js");` and a `pick(type, title, over)` helper.
3. Build: `python3 make_pair.py content_pair.js <Name>_пара`. Fix every WARN (a word that does not fit a card, overflow) by shortening or splitting; aim for 0 WARN and 0 footer overlaps. `lint_content.js` and `story.js` do not know the new types.
4. Language pass: write `deck_text.js` from Appendix B, run `node deck_text.js content_pair.js > deck_text.md`, and launch the language editor on deck_text.md (numbers there are slide indices, not pages) with the «Language focus» block. Apply, rebuild.
5. Visual check: render the pages (`pdftoppm -r 60`) and look at all of them, or launch visual checkers for a long deck.
6. Validate the PPTX, deliver **two files**: `<Course>_<NN>_<Тема>_пара.pptx` and `.pdf`. Report pages, the layouts used, and anything that did not fit.

## Options on request

- **Bilingual quiz** (English under Russian): `questionEn`, `optionsEn`, `answerEn` (slide-api.md §5).
- **No quiz:** omit the quiz section and its plan item.
- **Different length:** recompute the budget at roughly 0.8-1 minute per content slide.
- **Pair deck:** see «Pair deck» above.
- **Interactive deck:** see «Интерактивная презентация» below.

## Интерактивная презентация (HTML и SCORM)

Этот режим включается, когда автор просит интерактивную или динамическую презентацию, HTML-версию или пакет для Moodle. Обычные PPTX и PDF в этом режиме не собираются, если автор не попросил их отдельно; если попросил, сдаются оба набора файлов. Всё о режиме написано в `references/interactive.md`: прочитать файл целиком до начала работы.

Коротко:

- Источник, план, бюджет и правила содержания те же, что выше: `content-rules.md`, этапы A-D и рецензенты.
- Работа идёт в копии `assets/interactive/`. Слайды пишутся в `src/slides.html`, данные вопросов и стендов в `src/data.js`. Сборка: `python3 build.py`.
- Из одного источника получаются версия для пары и версия для студентов: HTML без внешних ресурсов и SCORM-пакет для Moodle.
- Только в этом режиме каждый рисунок главы становится живой схемой по шагам. В облачном курсе узлы схем рисуются официальными иконками AWS Architecture Icons.
- Анимацию не ограничивают: это главное, ради чего делается интерактивная версия. Отдельный агент `agents/animation-checker.md` ищет схемы и слайды, где движения не хватает. Точка бежит по каждой стрелке, по которой что-то идёт (код в сборку, образ, коммит по конвейеру, запрос, журнал); без точки только чистые связи вроде «содержит».
- Презентация должна плавно работать на слабом компьютере в аудитории и в Chrome 109. Поэтому заготовку не утяжеляют: правила в разделе 9 `interactive.md`.
- Перед сдачей нужно, чтобы `scripts/check_fit.js` прошёл на обеих версиях и каждая схема была просмотрена на всех шагах.

## Appendix A: pair_layouts.js

Write this file verbatim into the work folder (step 1 of «Build and checks»). It uses the engine's own helpers (`newSlide`, `addTitle`, `para`, `card`, `inline`, `textHeight`, `segWidth`, `parseInline`, `checkBottom`, `footer`, `warn`).

```js
// Макеты версии для пары: cards, steps, stats, versus. Вставляются в build_modern.js перед RENDER.
const lvAccent = (i) => (i % 2 ? C.accent2 : C.accent);
function longestWord(text, fs, bold) {
  let mx = 0;
  for (const seg of parseInline(text)) for (const wd of seg.t.split(/\s+/)) mx = Math.max(mx, segWidth(wd, { b: bold || seg.b, m: seg.m }, fs));
  return mx;
}
function cardsSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.18;
  const n = sp.cards.length;
  const afterH = sp.after ? textHeight(sp.after, 15, W) + 0.3 : 0;
  const cols = sp.cols || (n <= 3 ? n : n === 4 ? 2 : 3);
  const rows = Math.ceil(n / cols);
  const gx = 0.26, gy = 0.22;
  const avail = BOTTOM - y - afterH;
  const rowsCells = [];
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, n - r * cols);
    const cw = (W - gx * (inRow - 1)) / inRow;
    rowsCells.push({ inRow, cw, idx: [...Array(inRow).keys()].map((c) => r * cols + c) });
  }
  const need = (cd, w, f) => {
    const iw = w - 0.75;
    return 0.22 + (cd.label ? 0.34 : 0) + (cd.title ? textHeight(cd.title, f + 1, iw, 1.3) + 0.04 : 0) + (cd.text ? textHeight(cd.text, f - 1, iw, 1.3) : 0) + 0.2;
  };
  const wordsFit = (f) => rowsCells.every((R) => R.idx.every((i) => { const cd = sp.cards[i]; const iw = R.cw - 0.5;
    return (!cd.title || longestWord(cd.title, f + 1, true) <= iw) && (!cd.text || longestWord(cd.text, f - 1, false) <= iw); }));
  const rowH = (f) => rowsCells.map((R) => Math.max(sp.minH || 0, ...R.idx.map((i) => need(sp.cards[i], R.cw, f))));
  let fs = sp.fs || 17;
  while (fs > 12 && (!wordsFit(fs) || rowH(fs).reduce((a, b) => a + b, 0) + gy * (rows - 1) > avail)) fs -= 0.5;
  const hs = rowH(fs);
  let yy0 = y;
  rowsCells.forEach((R, r) => {
    R.idx.forEach((i, c) => {
      const cd = sp.cards[i];
      const L = { x: M + c * (R.cw + gx), y: yy0, w: R.cw, h: hs[r] };
      const col = cd.color || (sp.mono ? C.accent : lvAccent(i));
      card(s, L.x, L.y, L.w, L.h, i % 2 ? C.surface2 : C.surface);
      s.addShape(pptx.shapes.RECTANGLE, { x: L.x, y: L.y + 0.16, w: 0.06, h: L.h - 0.32, fill: { color: col }, line: { color: col, width: 0 } });
      const iw = L.w - 0.5;
      let yy = L.y + 0.22;
      if (cd.label) {
        s.addText(cd.label.toUpperCase(), { x: L.x + 0.28, y: yy, w: iw, h: 0.26, margin: 0, valign: "middle", fontFace: FONT, fontSize: 10.5, bold: true, color: col, charSpacing: 1.2 });
        yy += 0.34;
      }
      if (cd.title) {
        const th = textHeight(cd.title, fs + 1, iw - 0.25, 1.3);
        s.addText(inline(cd.title, fs + 1, C.ink, { bold: true }), { x: L.x + 0.28, y: yy, w: iw, h: th, margin: 0, valign: "top", lineSpacingMultiple: 1.2, fontFace: FONT });
        yy += th + 0.04;
      }
      if (cd.text) {
        const th = textHeight(cd.text, fs - 1, iw - 0.25, 1.3);
        s.addText(inline(cd.text, fs - 1, C.body), { x: L.x + 0.28, y: yy, w: iw, h: th, margin: 0, valign: "top", lineSpacingMultiple: 1.25, fontFace: FONT });
      }
    });
    yy0 += hs[r] + gy;
  });
  y = yy0 - gy;
  if (!wordsFit(fs)) warn("слово не помещается в карточку");
  if (sp.after) y = para(s, sp.after, y + 0.22, { fs: 15 });
  checkBottom(y, "cards");
  footer(s);
}
// шаги процесса: [{ title, text }]
function stepsSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.22;
  const n = sp.steps.length;
  const sw = W / n, d = 0.56;
  const cy = y + d / 2;
  s.addShape(pptx.shapes.LINE, { x: M + sw / 2, y: cy, w: W - sw, h: 0, line: { color: "C7CAD6", width: 2, dashType: "dash" } });
  let maxY = y;
  const afterH = sp.after ? textHeight(sp.after, 15, W) + 0.24 : 0;
  let fs = 15;
  const iw = sw - 0.22;
  const colH = (st, f) => (st.title ? textHeight(st.title, f, iw, 1.15) + 0.06 : 0) + (st.text ? textHeight(st.text, f - 1.5, iw, 1.25) : 0);
  while (fs > 12 && y + d + 0.2 + Math.max(...sp.steps.map((st) => colH(st, fs))) + 0.36 > BOTTOM - afterH) fs -= 0.5;
  const boxH = Math.max(...sp.steps.map((st) => colH(st, fs))) + 0.36;
  sp.steps.forEach((st, i) => {
    const cx = M + i * sw + sw / 2;
    const col = st.color || (i === n - 1 && sp.lastAccent ? C.accent2 : C.accent);
    s.addShape(pptx.shapes.OVAL, { x: cx - d / 2, y, w: d, h: d, fill: { color: col }, line: { color: "FFFFFF", width: 3 } });
    s.addText(String(st.n || i + 1), { x: cx - d / 2, y, w: d, h: d, margin: 0, align: "center", valign: "middle", fontFace: FONT, fontSize: 17, bold: true, color: "FFFFFF" });
    const bx = M + i * sw + 0.06, by = y + d + 0.2;
    card(s, bx, by, sw - 0.12, boxH, i % 2 ? C.surface2 : C.surface);
    let yy = by + 0.18;
    if (st.title) { const th = textHeight(st.title, fs, iw, 1.15); s.addText(inline(st.title, fs, C.ink, { bold: true }), { x: bx + 0.1, y: yy, w: iw, h: th, margin: 0, align: "center", valign: "top", lineSpacingMultiple: 1.15, fontFace: FONT }); yy += th + 0.06; }
    if (st.text) { const th = textHeight(st.text, fs - 1.5, iw, 1.25); s.addText(inline(st.text, fs - 1.5, C.body), { x: bx + 0.1, y: yy, w: iw, h: th, margin: 0, align: "center", valign: "top", lineSpacingMultiple: 1.25, fontFace: FONT }); }
    maxY = Math.max(maxY, by + boxH);
  });
  y = maxY;
  if (sp.after) y = para(s, sp.after, y + 0.24, { fs: 15 });
  checkBottom(y, "steps");
  footer(s);
}
// крупные цифры: [{ value, label, text }]
function statsSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.22;
  const n = sp.stats.length;
  const cols = sp.cols || (n <= 4 ? n : 3);
  const rows = Math.ceil(n / cols);
  const gx = 0.24, gy = 0.22;
  const afterH = sp.after ? textHeight(sp.after, 15, W) + 0.24 : 0;
  const maxH = (BOTTOM - y - afterH - gy * (rows - 1)) / rows;
  const tw = (W - gx * (cols - 1)) / cols;
  const iw = tw - 0.4;
  const vfs = sp.valueFs || (cols >= 4 ? 28 : 32);
  const need = Math.max(...sp.stats.map((st) => 0.22 + vfs * 1.25 / 72 + 0.08 + (st.label ? textHeight(st.label, 14, iw, 1.15) + 0.04 : 0) + (st.text ? textHeight(st.text, 12.5, iw, 1.25) : 0) + 0.2));
  const th = Math.min(maxH, Math.max(need, sp.minH || 1.5));
  if (need > maxH) warn("цифры не помещаются");
  sp.stats.forEach((st, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const inRow = Math.min(cols, n - r * cols);
    const w = (W - gx * (inRow - 1)) / inRow;
    const x = M + c * (w + gx), yy0 = y + r * (th + gy);
    const col = st.color || lvAccent(i);
    card(s, x, yy0, w, th, i % 2 ? C.surface2 : C.surface);
    let yy = yy0 + 0.2;
    s.addText(inline(st.value, vfs, col, { bold: true, monoColor: col }), { x: x + 0.22, y: yy, w: w - 0.4, h: vfs * 1.25 / 72, margin: 0, valign: "middle", fontFace: FONT, charSpacing: -0.5 });
    yy += vfs * 1.25 / 72 + 0.08;
    if (st.label) { const h = textHeight(st.label, 14, w - 0.4, 1.15); s.addText(inline(st.label, 14, C.ink, { bold: true }), { x: x + 0.22, y: yy, w: w - 0.4, h, margin: 0, valign: "top", lineSpacingMultiple: 1.15, fontFace: FONT }); yy += h + 0.04; }
    if (st.text) { const h = textHeight(st.text, 12.5, w - 0.4, 1.25); s.addText(inline(st.text, 12.5, C.body), { x: x + 0.22, y: yy, w: w - 0.4, h, margin: 0, valign: "top", lineSpacingMultiple: 1.25, fontFace: FONT }); }
  });
  y = y + rows * th + (rows - 1) * gy;
  if (sp.after) y = para(s, sp.after, y + 0.24, { fs: 15 });
  checkBottom(y, "stats");
  footer(s);
}
// две колонки с заголовками-плашками и выровненными строками: rows [[label, left, right]]
function versusSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.2;
  const lw = sp.labelW || 1.9, gap = 0.18;
  const cw = (W - lw - 2 * gap) / 2;
  const xL = M + lw + gap, xR = xL + cw + gap;
  const hh = 0.5;
  [[sp.left, xL, C.accent], [sp.right, xR, C.accent2]].forEach(([t, x, col]) => {
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: hh, fill: { color: col }, line: { color: col, width: 0 }, rectRadius: 0.08 });
    s.addText(inline(t, 16, "FFFFFF", { bold: true, monoColor: "FFFFFF" }), { x, y, w: cw, h: hh, margin: 0, align: "center", valign: "middle", fontFace: FONT });
  });
  y += hh + 0.1;
  const afterH = sp.after ? textHeight(sp.after, 15, W) + 0.22 : 0;
  let fs = 14.5;
  const rowH = (r, f) => Math.max(textHeight(r[0], f - 1, lw - 0.1, 1.15), textHeight(r[1], f, cw - 0.3, 1.2), textHeight(r[2], f, cw - 0.3, 1.2)) + 0.2;
  while (fs > 12 && sp.rows.reduce((a, r) => a + rowH(r, fs) + 0.06, 0) > BOTTOM - y - afterH - 0.08) fs -= 0.5;
  sp.rows.forEach((r, i) => {
    const h = rowH(r, fs);
    s.addText(inline(r[0], fs - 1, C.muted, { bold: true }), { x: M, y, w: lw, h, margin: 0, valign: "middle", fontFace: FONT, lineSpacingMultiple: 1.15 });
    [[r[1], xL, C.surface], [r[2], xR, C.surface2]].forEach(([t, x, bg]) => {
      card(s, x, y, cw, h, bg);
      s.addText(inline(t, fs, C.body), { x: x + 0.15, y, w: cw - 0.3, h, margin: 0, align: "center", valign: "middle", fontFace: FONT, lineSpacingMultiple: 1.2 });
    });
    y += h + 0.06;
  });
  if (sp.after) y = para(s, sp.after, y + 0.16, { fs: 15 });
  checkBottom(y, "versus");
  footer(s);
}
```

## Appendix B: deck_text.js

```js
// Все тексты слайдов по порядку, для языковой проверки любых типов (cards, steps, versus...).
// Usage: node deck_text.js content_pair.js > deck_text.md
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
```