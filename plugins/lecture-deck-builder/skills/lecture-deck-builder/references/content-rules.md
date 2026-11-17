# Content rules

These rules come from many iterations with the course author. Each one answers a concrete complaint about an earlier deck, so the reason is given next to the rule. Slide text is Russian; the examples below are in Russian on purpose.

## Contents

1. Source and fidelity
2. Selection: only what matters
3. Time and slide budget
4. Lecture structure
5. Logic, slide order and connections
6. Slide titles
7. Text on a slide
8. Questions, practice, quiz
9. Course profiles
10. What was taken from academic-pptx and what was not

## 1. Source and fidelity

The deck is built from the material the user provided (a chapter link, readme.md, a file). This matters beyond politeness: the lecture must match what students will later read in the chapter, otherwise the exam produces contradictions.

- Facts, definitions, examples, code, numbers and names come only from the source. Do not add your own facts "for completeness", even correct ones.
- Allowed: shortening, rephrasing, splitting across slides, building questions and guess-tables from the source's facts, writing a slide's own lead and takeaway, trimming source code to the relevant fragment.
- The "problem" example (section 5) is also built from the source: its code, its scenario, its wording.
- Run code whose output appears on a slide when an interpreter is available (`php`, `python3`, `node`, `g++`). Answers to code questions must match the real output.
- Errors in the source (technical inaccuracy, a typo in code, a contradiction between sections) are neither copied silently nor fixed silently. Use the correct version on the slide only when the error is obvious, and in every case list all problems found in the final report.
- Images only from the source. An ASCII tree is worse than a real figure: if the source has a picture, use it.
- Bibliography: the chapter's footnote sources that the slides actually use.
- Characters of the chapter's story (by default John and Emma, plus any names from the opening story) never appear on slides. The story may be used anonymously as «учебный проект».

## 2. Selection: only what matters

A lecture is not a retelling of the chapter. Students will read the chapter; in the lecture they must understand the core.

Keep:

- Concepts and definitions the topic is built on.
- How the mechanism works, with a typical example.
- Comparisons and trade-offs that help choose a solution.
- Typical mistakes and traps, if the source has them.

The cut test: for every slide, ask what the student would lose if it disappeared. If the answer is "nothing needed to understand the topic, answer the quiz or do the practice", cut it. Asides, curiosities, repeated reassurance, course housekeeping and second examples of the same idea usually fail this test.

Shorten or drop:

- The same idea stated several times.
- Long reference tables and parameter lists (keep 3-5 key rows).
- Historical detail that does not explain how things work.
- Step-by-step console or UI instructions: they belong in hands-on.
- Long "putting it all together" examples once the main ideas are shown. The author asked to remove such an example from the OOP lecture: it took many slides and added nothing new.
- Fragmented slides: things that belong together stay together (a code example and its explanation on one slide, both versions of a comparison side by side). But one slide still has one core (slide-patterns.md): a definition and a long code example are two slides.

## 3. Time and slide budget

The lecture runs 70-80 minutes without the quiz. The budget gives room for a logical, step-by-step story, but every slide must carry something essential:

- Count everything the audience sees except the title slide, section dividers (`section`), the quiz (`quiz: true`) and the bibliography. An in-lecture question counts as one slide, although it takes two pages in both versions (question page, then answer page). A guess-table (`tablebuild`) is one slide (two pages in the teacher version).
- Target 70-90 content slides, hard maximum 100. Use the room to make the logic explicit (problem, definition, solution as separate small steps), not to add secondary material: "up to 100" is a ceiling, not a goal, and only the core of the chapter belongs in the deck.
- In-lecture questions: about one per section (6-9 total), each costs about 1.5 minutes. Previous-topic questions: 1-2.
- If the essential content does not fit in 100 slides, do not silently cut essential parts. Stop after the plan and tell the user how many slides are needed and what would have to go. Offer options: cut named sections, split into two lectures (show the boundary), raise the limit.
- If the material is thin (under ~55 slides), do not pad it: say so.

## 4. Lecture structure

Default order:

1. Title: `course` (discipline name), full topic title, `meta` «Лекция N · Информатика и прикладная информатика» (or as in the source).
2. Previous-topic warm-up: 1-2 questions with answers (`predict`, titles «Вопрос: тема», `setPart: "Повторение"` on the first; put `setPart: ""` on the plan slide so the intro slides that follow have no footer label). Material: the previous chapter of the same course (section 8). If this is the first lecture, or the previous chapter cannot be found and nobody can be asked, skip the block, set `firstLecture: true` and say so in the report.
3. Lecture plan («План лекции»): numbered list of sections, last item «Командный квиз.».
4. Self-check questions («Вопросы для самопроверки»): 5-7 questions, taken from the chapter if it has such a section.
5. Learning outcomes («Результаты обучения»): 4-6 items with verbs like «объяснить», «выбрать», «сравнить».
6. Retrospective («Ретроспектива»), if the source has one: 2-3 items linking to earlier topics.
7. Sections with `section` dividers: the main content. Continuous numbering.
8. Typical mistakes (if the source has them): each is a `predict` titled «Ошибка N: тема». No intro slide before them.
9. Practice or hands-on (section 8).
10. Team quiz (section 8).
11. Summary («Резюме»): at most 10 points on 1-2 slides, `setPart: "Итоги"`. No new information. It is the last content slide: never end with «Спасибо».
12. Bibliography.

## 5. Logic, slide order and connections

The slides must read as one story, not a stack of cards.

- Introduce every new concept as: a problem shown on a concrete example, then the definition, then the solution on an example, then limitations. This is the situation / complication / resolution spine applied to each concept. Examples from earlier decks: before exceptions, show that `new Product('Ноутбук', -100)` silently creates an object with a negative price; before visibility modifiers, show that a public property bypasses the constructor check; before `readonly`, show how the typo `=` instead of `===` changes an identifier.
- Put a problem/solution pair into `codepair` (two columns), or on two adjacent slides. Evidence on the left, interpretation on the right.
- Never open a topic with an unexplained domain example («Код товара и название не должны меняться...»): the student first has to see the problem in code.
- If an example uses a function or class, show its definition first. The author noticed `orderSummary()` used without a definition in the inheritance lecture.
- Before code for inheritance, a pattern or an architecture, describe the task in words first (for example a `compare`: ordinary vs regular customer).
- A diagram or hierarchy without context is confusing: say first what it is and why it matters, or place it right after the question that motivates it.
- Every section opens with its problem or an orienting slide that says why the section exists, never with a bare image, syntax block or table (slide-patterns.md, pattern 0). The author pointed at a loops section that started straight with a picture of three flowcharts.
- One job per slide. If a slide does two things, split it; if two slides do one thing, merge them.
- Screenshots and figures need room: on an image slide use either `intro` or `after`, not both, otherwise the picture shrinks until it is unreadable. For a wide diagram with small labels use neither: the title and caption carry it, the explanation goes on the next slide.
- Self-sufficient slide test: the student PDF is read later as a handout, so each slide must make its point without the narration and without the slide before it.
- Flow test: read only the titles in order. They must form a coherent outline where each step follows from the previous one. Where the story jumps, reorder, retitle or add the missing step.

### Slide order

The author asked for «грамотная последовательность слайдов»: the order itself should teach. Each slide comes at the moment the student needs it and can understand it.

Within a section, follow the order of understanding:

1. The problem or question, on the source's example: what goes wrong or what we cannot do yet.
2. The term that names the solution (definition card).
3. How it works: syntax or mechanism.
4. The worked example, on the same example as in step 1 where possible.
5. A check question on what was just shown.
6. Limits, traps, and how to avoid them.

Not every concept needs all six steps; the ones it uses keep this order.

- **Nothing before its prerequisites.** A slide uses only terms, programs, variables and figures that appeared earlier. A question asks only about what was already shown. A table of commands comes after the commands are defined.
- **Simple before complex.** A schematic figure before the real screenshot, a minimal example before the full program, one loop before nested loops.
- **One thread at a time.** Finish a topic before starting the next and keep all slides about one thing together. Generalize after the concrete case is finished, not in the middle of it.
- **One running example per section.** Keep the source's example through the section. When the example changes, show the new program in full before asking anything about it.
- **One new idea per step.** Adjacent slides differ by one idea. Two new terms on one slide, or a jump over a step, means a missing slide; two slides with the same idea mean a merge.
- **Questions at the point of understanding.** An in-lecture question comes right after the concept it checks and before the next topic. Typical mistakes and the quiz come after all the material.
- **Section order.** Follow the chapter's order of sections unless it uses something before introducing it; then reorder and say so in the report.

| Confusing order | Better order |
|---|---|
| schematic of a stop ... table of keys ... real IDE screenshot of the same stop | breakpoint -> schematic -> real screenshot -> stepping commands -> table of keys |
| question about `score` without a value -> definition of undefined behavior -> warning -> back to the variable without a value -> its fix | question about `score` -> the variable without a value: compiler warning and fix -> undefined behavior as the general name for such cases |

The plan is checked for order before content.js is written (SKILL.md, step 3), and `scripts/story.js` marks names that a slide uses before any earlier slide showed them («⚠ впервые»).

### Connections between slides

Two complaints set this rule. First, slides «не связаны»: a slide appears and the student cannot tell why it is here. Second, when linking sentences were added to fix that, the author found them strange: «Поэтому, кроме строки, нужны ещё значения переменных», «Однако не каждое сообщение компилятора означает ошибку», and «Начнём с ошибок, которые находит компилятор» on a slide that lists all three kinds of errors. Such sentences continue the lecturer's speech instead of stating anything, make no sense when the slide is opened alone, and the last one is not even about its own slide.

Rule: **the connection is carried by content and order, not by linking words.** Each slide states its own point in its own words, so it reads alone, and the order of the points makes the story.

- The title names the concept. The lead, if any, states this slide's problem or condition and names the shared thing explicitly (the term, the program, the variable) instead of pointing back with «это», «такой», «тот же».
- A takeaway concludes this slide. It may name the problem the next slide solves as a fact («Объект с отрицательной ценой создаётся без ошибки.»), never as an announcement («Дальше посмотрим, как это исправить»).
- No sentence starts with a linking word or narration: «Поэтому», «Однако», «Также», «Ещё», «Иначе», «Итак», «А», «Но», «Теперь», «Начнём с», «Перейдём к», «Вернёмся к», «Рассмотрим», «Посмотрим», «Проверим», «Остался ...». Inside sentences avoid «поэтому», «однако», «значит», «таким образом», «следовательно», «кроме того»: express cause with a colon, with «и», or with two short sentences. `lint_content.js` rejects these as ERRORs; the exact list lives there.
- If a slide is still unclear without the previous one, the fix is its title, its place, or a lead naming its own problem, not an extra sentence on a neighbour. If no honest lead can be written, the slide is in the wrong place or not needed.

| Continues the speech (bad) | States this slide's point (good) |
|---|---|
| «Поэтому, кроме строки, нужны ещё значения переменных.» | «Момент выполнения в цикле задают строка и значения переменных.» |
| «Однако не каждое сообщение компилятора означает ошибку.» | «Не каждое сообщение компилятора означает ошибку.» |
| «Состояние нужно отслеживать, когда программа ошибается. Начнём с ошибок, которые находит компилятор.» (on «Три вида ошибок») | «Ошибки делятся на три вида по тому, когда они проявляются.» |
| «Вернёмся к бесконечному бою: не будем пускать в программу урон, меньший или равный нулю.» | «Бесконечного боя не будет, если не пускать в программу урон, меньший или равный нулю.» |
| «Условие проверяется после тела, поэтому тело выполняется хотя бы раз.» | «Условие проверяется после тела, и тело выполняется хотя бы раз.» |

A lead counts toward the slide's text limits (section 7).

## 6. Slide titles

The author explicitly asked for «грамотные названия с соответствующей терминологией». A title names the concept or mechanism; it does not retell the example.

- A noun phrase with the source's term: «Объявление конструктора», «Продвижение параметров конструктора», «Иерархия классов исключений», «Сравнение объектов: == и ===», «Подстановка наследника вместо родителя».
- Use the source's term, not a synonym that the chapter never uses.
- No colloquial or retelling titles. Titles the author rejected, with their replacements:

| Rejected | Replacement |
|---|---|
| Два товара | Создание объектов |
| Метод со скидкой | Вызов метода для разных объектов |
| Конструктор в деле | Объявление конструктора |
| Тот же класс короче | Класс с продвинутыми параметрами |
| Каждое свойство трижды | Дублирование в конструкторе |
| Проблема: бессмысленная цена | Некорректные данные в конструкторе |
| Решение: исключение в конструкторе | Выбрасывание и перехват исключения |
| Не глушите исключения | Пустой блок catch |
| Сравним три переменные | Сравнение объектов: == и === |
| Что изменилось | Отличия наследника от копии |
| final в деле | Запрет наследования |
| Вопрос: убрали одну строку | Вопрос: конструктор без parent::__construct() |

- No labels like «Проблема:», «Решение:», «Задача:»: the title itself shows what the slide is.
- Title definition slides with the term itself: «Регион AWS», «Зона доступности», «Ключ доступа». Use «Понятие X» only when the title would otherwise repeat the section name («Понятие исключения» inside the «Исключения» section). A long run of «Понятие ...» reads like a dictionary index.
- In-lecture questions: «Вопрос: тема», where the topic is a term, not a retelling («Вопрос: перехват TypeError», not «Вопрос: почему не сработал catch»).
- Quiz questions: a short topic («Перехват TypeError») without «Вопрос:».
- One line: roughly up to 46 characters.
- Column labels in `codepair` and `compare` are terms too: «Возврат false», «Остановка скрипта», «Объявление», «Попытка записи».
- Topic labels, not sentences: see section 10 for why the academic-pptx action-title rule is not used.

## 7. Text on a slide

How a single slide is laid out (title, lead, one core, takeaway) and the patterns for each slide kind are in `slide-patterns.md`. The rules below apply to all of them.

### Definitions: always explicit, always one format

Every new term is introduced on a `def` card in the same format: «Термин (english term) - определение со строчной буквы». Students copy definitions into notes, so they must be easy to spot and look the same throughout the course.

- Do not define a term inside a bullet, a `compare` column, an `intro` or an `after` («**AWS Free Tier** - программа ...», «CLI - это ...»). If a term is new, it gets a card; the rest of the slide then uses it.
- One card per term; two related terms may share a slide via `term2`.
- A definition slide holds the card plus either up to three short items or one `after` sentence, not both.
- Terms already defined earlier are not re-defined; refer to them by name.

### Composition: no jumble

The author pointed at a slide with a definition card, two bullets, a loose «Рядом: AWS Cost Explorer (...) и AWS Cost anomaly detection (...)» paragraph and a source line squeezed together. Such slides read as noise.

- At most three text blocks on a slide (for example intro + code + after, or card + items). Four or more means split the slide.
- Every block has one role: the card defines, the items explain, the `after` concludes. Do not tack loose facts onto the bottom of a slide; a fact that deserves mention gets its own place in the story, otherwise it is cut.
- No shorthand lead-ins with a colon used instead of a sentence («Рядом: ...», «Проверка: ...», «Итог: ...»).
- Leave visual air: if the slide is full to the footer, it is overloaded even when nothing overflows.

### Language: coherent and fluent

The text must read «грамотно и складно»: like a careful lecturer explaining, not like notes.

- `intro`, `after`, answers and explanations are complete, grammatical Russian sentences that state facts. They do not continue the lecturer's speech (section 5, «Connections between slides»).
- List items within one list share the same grammatical form (all noun phrases, or all full sentences) and each holds one idea.
- No chains of clauses glued with semicolons, no piles of parentheses, no telegraphic fragments mixed with full sentences on the same slide.
- The same thing is always called by the same term, the one used in the source.
- Read each slide aloud: if it sounds stilted or you stumble, rewrite it.

What «складно» means in practice; these are the defects the author keeps finding and the language editor (`agents/language-editor.md`) checks for:

- **Calques and bureaucratese.** «производит вычитание» -> «вычитает», «является переменной» -> «это переменная», «осуществляет проверку» -> «проверяет», «данный» -> «этот». English word order («В строке 5 есть ошибка, которую компилятор находит» instead of «Компилятор находит ошибку в строке 5»).
- **Linking words.** No «поэтому», «однако», «значит», «таким образом», no sentence opening with «Также», «Иначе», «А», «Но»: on a slide they read as speech. Cause and effect go into one sentence with a colon or «и», or into two plain sentences; two unrelated ideas in one block mean the block holds two ideas.
- **Agreement and case errors**, wrong aspect, dangling participles («Исправив ошибку, программа ...»).
- **Repetition** of the same word in adjacent sentences, and the same idea repeated by the lead and the takeaway.
- **Fragments.** «Три раза: при 50, 30 и 10.» is fine as a bold short answer; a fragment as a lead or takeaway is not.
- **Vague references.** «это», «такой случай», «здесь» must point to something visible on the same slide.
- **Register.** A lecturer explaining to first-year students: plain, precise, no chatty asides and no textbook dryness.

### Paragraphs: short blocks only

The author complained about slides «написанные большими абзацами». An audience does not read a paragraph while the lecturer speaks; it reads a line or two. At 16 pt a full-width line holds about 12 words, so the limits are set in lines and enforced by `lint_content.js` as ERRORs:

| Block | Limit (words) | Shape |
|---|---|---|
| `intro` (lead) | 22 | one sentence, two at most |
| `after` (takeaway) | 22 | one sentence, two at most |
| `text` (alert, compare/codepair caption) | 26 | one or two sentences |
| `question` | 24 | one sentence |
| `answer` | 28 | bold short answer + one sentence |
| `definition` | 25 | one sentence |
| list item | 20 | one idea |
| intro + after + text on one slide | 36 | |

Any block with three or more sentences is an ERROR. Two sentences in one block above 18 words are a WARN: usually the second sentence is a separate idea that belongs in a list or on the next slide. Inline code counts as one word.

When a block is over the limit, do not just delete words until it passes: decide which idea the slide is about, keep that, and move the rest to items, to the next slide, or out of the deck.

### Code

- Code blocks get line numbers automatically (any language except `lang: "text"`, from two lines up). When the text explains code, refer to lines by number («в строке 5 конструктор выбрасывает исключение»). Pseudocode is code too: give it `lang: "pseudo"` so it is numbered. Use `lang: "text"` or `lineNumbers: false` only for program output, trees or console dialogs.
- Keep code short enough to read from the back row: about 15 lines at most per block, trimmed to the lines that matter (lint warns above 15).
- In questions and quiz questions, code goes into the `code` field as real lines, never written inline inside the question sentence. The engine keeps quiz code at 11 pt or larger; if it does not fit, shorten the code or the options.

### General

- The slide supports the lecturer's speech: about 40-50 words of body text unless it is code, and no single paragraph longer than two lines (see «Paragraphs» above).
- Everything fits without touching the footer or the source line. Shorten first, then split the slide or use two columns. Never shrink body text by hand (the engine itself lowers list items to 14 pt, which is the floor).
- Bold the key words on every slide (the "so what" of the slide), never whole sentences.
- Function, type, operator and command names in running text go in monospace (`` `name` ``).
- Plain hyphen «-» only. Em and en dashes (— and –) are banned everywhere.
- Do not write «как мы видели в главе 5» without the content: if a link to an earlier topic is needed, restate the point in one phrase.
- A definition starts lowercase after «Термин (term) -».

## 8. Questions, practice, quiz

**Previous-topic warm-up.** How to find the previous chapter:

- If the link points to a numbered chapter folder or file (`06_oop/readme.md`, `lecture-06`), the previous chapter is the sibling folder numbered one lower. List the repository folders and open its readme.
- Without numbering, look in the course table of contents (the repository README) for the item before the current one.
- Not found: ask the user for a link. If nobody is available (unattended run), skip the block and say so.

Warm-up questions check the main point of the previous topic, not trivia. The answer comes from the previous chapter.

**In-lecture questions** (`predict`): about one per section, where students are likely to get it wrong: predict code output, choose a solution, spot a mistake. A short bold answer plus one sentence of explanation. The question and the answer are on **separate pages in both versions**: first the question page (question and code), then the answer page titled «Ответ: тема» (the engine renames «Вопрос:» automatically). The author asked for this because an answer on the same slide is visible before the audience has thought, and in the student PDF it is read together with the question. The question's `after`, if any, appears on the answer page.

**Practice.** If the source has a practice task or hands-on:

- Cloud Computing: a `handson` slide with only the «Hands-on N.M» label and the title, no text. Place it where the chapter refers to hands-on or contains a step-by-step console walkthrough: the steps move to the hands-on and the slide is a pointer. This is moving the chapter's steps, not inventing practice.
- Numbering: use the chapter's own hands-on numbers; if it has none, number them «Hands-on L.1», «L.2» ... in order of appearance (L = lecture number).
- Other courses: «Практика N.M» with 3-4 short items taken from the source's task.
- If the source has no practice, do not invent one.

**Team quiz.** 8 questions on the lecture's main ideas (not trivia), each answerable from the lecture. The last question is worth 2 points. All questions first, then the «Время вышло» slide, then the answers. Options A-D of similar length and plausible; correct answers spread across letters; the correct option is not systematically the longest. Code that a question depends on is shown as a readable code block (`code` field, 3-8 lines), never squeezed into the question sentence. Quiz questions do not repeat in-lecture questions or typical-mistake slides: the quiz checks the same ideas with new examples.

**Student version** is always built together with the teacher version: no quiz, guess-tables already filled, quiz item removed from the plan. Future cohorts must not see the quiz questions.

## 9. Course profiles

Detect the course from the source (repository, chapter title). An unknown course uses the general rules.

Title slide per course (`course` pill / `meta`):

| Course | `course` | `meta` |
|---|---|---|
| Cloud Computing | «Cloud Computing» | «Лекция N · Информатика и прикладная информатика» |
| Web development (PHP) | «Веб-разработка» | «Лекция N · Информатика и прикладная информатика» |
| Programming (C++) | «Программирование» | «Лекция N · Дизайн игр» |
| New course | course name from the source | «Лекция N · <specialty from the source>» |

- **Cloud Computing (AWS).** Hands-on slides are bare. When a service is introduced for the first time, the source usually has a "service card" (category, what it does, why, IaaS/PaaS/SaaS, launch year): carry it over as a table. Architecture diagrams only from the source.
- **Web development (PHP).** `lang: "php"`. Check code with `php` when installed. PHP version as stated in the chapter (e.g. 8.4).
- **Programming (C++).** `lang: "cpp"`. Check code with `g++` when installed. Audience: Game Design students, so keep the wording simple. The quiz may be bilingual if the author asks.
- **New course.** Take the course name for the title pill from the source; everything else follows the general rules.

File name prefix: `Cloud`, `Веб`, `Программирование`, or a short name of the new course.

## 10. What was taken from academic-pptx and what was not

Taken:

- Plan before building, and the flow (ghost deck) test: titles in order tell a coherent story.
- One job per slide, limited body text, slides support the speech instead of replacing it.
- Budget derived from time: roughly one slide per minute, so 70-80 minutes allow up to about 90-100 small, logically ordered slides.
- A narrative spine: situation / complication / resolution, applied per concept as problem / definition / solution.
- Self-sufficient slides, because the PDF circulates as a handout.
- Evidence left, interpretation right in two-column layouts.
- Citation: borrowed figures and facts with their source, references at the end.
- The last content slide is the summary, not «Спасибо»; section dividers for a long deck.
- "Know what to cut": the report names slides to skip if time runs short.

Not taken, and why:

- Action titles (full sentences) instead of terms. The author asked for terminology titles: a lecture is teaching material where the name of the concept matters more than a claim. The claim goes into `after` or a `statement` slide.
- Navy/blue palette, Arial/Calibri, 20 pt body text: the course has its own brand (brand.md).
- No gradients: the course brand uses gradients on dividers, and that is part of its recognizable style.
- Appendix slides and Q&A backup slides: a lecture has no Q&A session, and the chapter itself serves as the appendix.
