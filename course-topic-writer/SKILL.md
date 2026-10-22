---
name: "course-topic-writer"
description: "Write, extend, edit and review university course chapters (topics, lectures, chapter readme.md files) by the house rules and per-subject profiles kept in this skill - Cloud Computing (AWS), web development in PHP, programming foundations in C++, and any subject added later. Use whenever the user asks to write a new topic or section, rewrite, shorten, extend or proofread a chapter, or fix style or terminology in course text, even if they just say \"напиши тему про S3\", \"проверь главу 5\", \"допиши раздел\" or \"поправь стиль\". Also use when they ask to add or change a subject in this skill or to remember a lasting rule for chapters. Not for slide decks, Moodle question banks, lab assignments or CSS."
---

# Course topic writer

A topic (глава) is three things at once: a text students read on their own, the teacher's outline for a 75-minute lecture, and the source for a slide deck later. So it must stand alone, flow in order, and be technically exact. After reading a chapter on their own, without the lecture, a student must fully understand its material: what each concept is, how it works, why it is needed and where it is used. Nothing needed for that is left for "разберём на занятии".

These instructions are in English. The course material itself is written in the subject's language (Russian unless the profile says otherwise). Quoted Russian strings below (headings, captions, words) are exact literals to use as written.

The skill has general rules (this file), subject profiles and reference files. A profile refines or overrides the general rules for its course. The user's current request overrides both.

## Files of this skill

Read only what the task needs. Paths are relative to this skill's folder.

| File | Read when |
| --- | --- |
| `references/subjects/<subject>.md` | Always: the profile of the subject being written (see "Subjects") |
| `references/agents/<role>.md` | Before starting that role's subagent; pass the file to the subagent as its brief |
| `references/code-folder.md` | The topic contains program code |
| `references/illustrations.md` | Illustrating a topic (full workflow step 12, or when asked) |
| `references/comparisons-and-costs.md` | The topic compares options in detail or involves money |
| `references/humanize-ru.md` | Writing or editing any chapter text, and on "хуманизируй", "звучит как ИИ", "поправь стиль" |
| `scripts/check_topic.py` | Linting a finished file (see "Checker script") |

## Workflow

Pick the workflow by mode. A new topic or a large new section (roughly a third of a topic or more) goes through the full workflow. Edits, style fixes, proofreading, small extensions and reviews use the short workflow.

### Common first steps

1. *Identify the subject* and read its profile file. Anything a profile omits comes from the general rules. If the subject has no profile, work from the general rules and ask about audience and prerequisites only if you cannot write without them.
2. *Identify the mode and scope:* new topic, single section, edit, extension or review. Do exactly that much: a section stays a section, an edit stays an edit. If asked to change only style, do not change content.
3. *Start from the latest text.* If the topic already exists, work on its current version in the repository, not on a local copy from earlier in the conversation: the author often edits chapters between requests. When `gh` has no access, the public file is available at `https://raw.githubusercontent.com/<owner>/<repo>/main/<path>`. Keep the author's edits; if you disagree with one, say so instead of silently reverting it.
4. *Collect what students already know.* This feeds the new-term rule. Sources: the profile's prerequisites, earlier chapters of the subject, and the part of the current topic already written. With a shell: `python3 scripts/check_topic.py terms <earlier chapters> > known.txt`. If earlier chapters are unavailable, ask for them or state explicitly what you assume is known.

### Full workflow

5. *Sources.* Run 1-3 _Researchers_ in parallel by subtopic, then the _Verifier_ on the merged `sources.md` (a working file, not delivered unless asked). A claim no source backs is marked "нужен источник" in the plan and does not go into the text as a statement. Never fill the gap from memory or invent a reference.
6. *Plan and get approval.* Always show the plan before writing a new topic or a large section, and wait for the go-ahead. It contains:
   - Sections and subsections in order, each with one line on its idea and the transition from the previous one.
   - The term map: which new terms each section introduces, checked so that no term is needed before the section that defines it.
   - Which facts from `sources.md` each section uses.
   - Figures: number, caption, what the picture shows and where it comes from (own diagram, a screenshot from official documentation, or another source).
   - Profile elements (service cards, hands-on placeholders and so on) and where they go.
   - Open questions and every "нужен источник" mark.

   When the user points to a model chapter, take the skeleton from it: order of sections and devices (metaphors, rules with good and bad examples, lists of operations, comparison tables). When restructuring an existing topic, build a fresh skeleton and move material into it rather than bolting new sections onto the old structure. Keep the plan compact. If the user is not available, state that the plan was not approved and continue.
7. *Write* by the rules below, section by section in plan order: the frame (title, contents, questions, retrospective) first, then the sections, then the summary and footnotes. Every technical claim comes from `sources.md` with a footnote or is stable textbook knowledge. If writing shows the plan was wrong, change the plan, not the term order. Write without the markers listed in `references/humanize-ru.md` from the first draft.
8. *Code folder.* If the topic has code, build it now by `references/code-folder.md`, so the checks can run it.
9. *Checks, in parallel, each in a subagent with fresh context.* Start the _Reviewer_, the _Structure checker_ and the _Student reader_. Judge every finding: fix it or note why it is a false positive. When findings conflict, follow the priority written in the role files: the Reviewer decides facts, term order, code and course rules; the Student reader decides water and what the weakest student needs; the Editor decides grammar and fluency. Apply every cut so that the sentences around it stay complete and linked: rewrite, do not just delete. If no subagent tool exists, do each check yourself as a separate pass with its role file, and say so.
10. *Humanize.* After the fixes, run the process from `references/humanize-ru.md` over the whole text in the main session: mark the markers, rewrite those paragraphs around their main point, then check that no fact, term or footnote was added or lost.
11. *Editor read.* Start the _Editor_ (fresh context) on the whole text and apply its rewrites: after all the cuts and fixes, every sentence must be grammatical, complete and linked to the previous one, and the text must read smoothly aloud.
12. *Illustrations.* After the text is settled, illustrate the topic by `references/illustrations.md`, using the Student reader's section C. Part of every topic, not only when asked.
13. *Deliver* as in the short workflow, with the code folder and new images. Run the checker first (short workflow step 7): numbering, figure-reference and footnote findings must be fixed. Do not paste the checkers' reports; mention in one line only what you could not fix, verify or illustrate.

### Agents

Each role is described in `references/agents/<file>`: model, inputs, task, output format, what it must not do, and its priority. Give the subagent the role file and the files it lists, never a summary of this conversation. With the Agent tool, set `model`; if a model is unavailable, the agent inherits the session model.

| Role | File | Model | Step |
| --- | --- | --- | --- |
| Исследователь | `researcher.md` | `sonnet` | 5, sources |
| Сверщик | `verifier.md` | `haiku` | 5, after the Researchers |
| Рецензент | `reviewer.md` | `opus` | 9 |
| Корректор структуры | `structure-checker.md` | `haiku` | 9 |
| Читатель | `student-reader.md` | `sonnet` with web search | 9 |
| Редактор | `editor.md` | `sonnet` | 11, and after any shortening |

The plan, the text, the code folder, the illustrations and the fixes stay in the main session: one chapter, one author. No subagent writes chapter text.

### Short workflow: edits, extensions, reviews

5. *Plan with a term map* in your head or in a short list. Show it only if the user asked or the change is debatable.
6. *Write or edit* by the rules below. Check added facts against an official source. If code changes, update the code folder too.
7. *Check.* Go through the checklist below and run `python3 scripts/check_topic.py check <file> --chapter N --known known.txt`. For an extension of several paragraphs or more, also run the Structure checker and the Student reader on the changed part. "Проверь главу" means the Reviewer; "нет ли воды", "понятно ли" means the Student reader; "хуманизируй", "звучит как ИИ" means the process in `references/humanize-ru.md`, keeping every fact; "коряво", "странно звучит", "нескладно" means the Editor. After any shortening, run the Editor on the changed part.
8. *Deliver.* A full topic goes out as a `readme.md` file with its code folder and images; a section or an edit can go in the reply. No preamble about what you did. If the user's source has a substantive factual error, say so in a line or two.

When the user asks to find or show errors, list them (grouped into facts, logic, formatting, language, each with a quote and a fix) and do not change the file until they say so.

## Topic structure

Unless the user or the profile says otherwise:

```markdown
# Название темы

<i>
Opening story, only if the profile has one and the user supplied or requested it.
</i>

## Содержание
(table of contents linking every ## and ### heading)

## Вопросы для самопроверки
(5-9 numbered questions on the key ideas; some answers come only from the topic itself)

## Результаты обучения
После изучения этой главы вы сможете:
(4-11 items with checkable verbs: объяснить, сравнить, выбрать, спроектировать, настроить, рассчитать)

## Ретроспектива
(from chapter 2 on: what earlier chapters gave and which question this one opens)

## Main sections
...

## Резюме
(at most 8 one-line points, main ideas only, nothing new)

[^1]: Sources as footnotes right after the summary, with no heading.
```

Only the first chapter of a subject adds, after the learning outcomes, a short section "Как читать материалы курса" explaining bold, italic, monospace, the NOTE/IMPORTANT/WARNING/TIP blocks and `[^1]` references.

A full topic is about 5,000-7,000 words of prose when the subject allows. That is a guide, not a quota: never pad. When shortening, cut repetition, generalities and niche details, never the explanation of why something works the way it does.

## Structure and flow

A well-structured topic reads as one story: each section answers the question the previous one raised.

- *One section, one idea.* Split a section that carries two independent ideas.
- *Headings name the concept or the question.* Avoid slogan and negation headings ("Папок нет, есть префиксы"): write "Ключи и префиксы".
- *Problem-based learning.* The courses use problem-based learning wherever a concept solves a problem: open with a concrete problem the student can feel (a program that misbehaves, a game task that the known tools cannot solve or solve clumsily), let the student see why the old way falls short, and only then introduce the idea, how it works, an example, limits and trade-offs. Simple building blocks with no problem behind them can be explained directly.
- *Why and where.* For every concept, construct or tool the text says explicitly why the student needs it and where it is used: in their own programs and labs, in games, in professional practice. A student must never wonder "зачем мне это".
- *Simple to complex.* Intuition, then mechanism, then example, and only then edge cases.
- *Transitions.* A section's first sentence links it to the previous one or names the problem it solves. A transition that tells the reader what we are about to do and with what ("Теперь попробуем применить отладчик к нашему примеру "Бой до победы".") is needed; only a transition with no content ("Рассмотрим подробнее.") is water. The intro must not contradict what follows.
- *Say each thing once, in one form.* State a fact where it first matters; elsewhere refer back instead of explaining again. Give each point as text, a table or a figure, not all three. Reference lists (every command, every operator) only as far as an example needs them.
- *Mechanism on data, not narrative.* Show how something works on 2-5 rows of data, one code fragment or one trace, and explain the result. Narrative scaffolding (characters in the main text, rhetorical questions, "мы уже знаем", "вернёмся к...") adds words, not understanding.
- *Separate what is easy to confuse.* When students can carry a property or number of one concept over to a similar one (`=` and `==`, pointer and reference, data copies and read replicas), separate them in a short paragraph "Не путайте..." where the second one appears. A topic that covers several similar tools ends with one table comparing them.
- *Consequences for the student's code.* For each mechanism add one sentence on what the student's program or system must handle: retry after a dropped connection, read the next page, switch to a new address. Test: "что сломается, если этого не знать?".
- *Tools after the operations they perform.* What can be done (operations, concepts) comes before the means of doing it (console, CLI, SDK).
- *Heading hierarchy with no skipped levels:* `#` title, `##` major sections, `###` subsections, `####` when a subsection exceeds ~300 words or holds several definitions ("Определение...", the mechanism, "Основные характеристики"). Prefer many `##` sections with a few `###` each over one `##` with fifteen subsections.
- *Short paragraphs and visible structure.* Paragraphs of 2-5 sentences. Reasoning goes in prose, but enumerations do not hide inside a sentence: three or more parallel items (components, operations, steps, questions, rules, values) become a list, a sequence becomes a numbered list, a comparison becomes a table. The reverse also holds: steps the code already shows stay one sentence, not a list. Mark worked examples explicitly ("Рассмотрим пример."). No long paragraphs inside table cells; use numbered items separated by `<br>`.
- *Exact cross-references* (unless the profile forbids links to other chapters). When the text refers to another place, it names that place exactly and links to it: inside the chapter `[раздел "Ошибка: счётчик не сбрасывается"](#ошибка-счётчик-не-сбрасывается)`, in another chapter `[глава 5, раздел "Цикл do while"](../05_Name/readme.md#цикл-do-while)`, a figure as "на рисунке 6.3", an example by its name ("пример \"Бой до победы\" из пятой главы"). Never vague pointers such as "из раздела о вложенных циклах", "выше", "как мы видели раньше", "в одном из примеров": they confuse students.
- *Promises are kept.* "Разберём ниже" or "вернёмся в главе N" must come true. A pointer to a later chapter never substitutes for an explanation needed now.
- *One running example* that grows through the topic beats five unrelated ones.

## New-term rule

A new term never appears before the student has been told what it means. A student reading front to back must never meet a word they do not know and that has not yet been explained. For instance, "API" was removed from the first Cloud Computing chapter because students had not met it yet.

*Known* means listed in the subject's prerequisites, defined in an earlier chapter of the same subject, or defined earlier in the current topic. Everything else is new: concepts, acronyms, service and technology names, language constructs, commands, keywords.

- *Correct professional terms.* Use the established IT term, the one used in professional Russian, in official documentation and in earlier chapters, with the English term in parentheses at first use: "итерация (iteration)", "точка останова (breakpoint)", "неопределённое поведение (undefined behavior)". No homemade descriptions, slang or vague everyday words in place of a term ("прогон", "штука", "кусок кода"). Interface names (windows, commands, settings) are given exactly as the tool shows them.
- *One term, used consistently.* Once a term is introduced, keep using it; do not switch to an informal synonym ("проход" after "итерация" was defined) or rename the same thing in the next paragraph. An everyday word may help explain a term once ("итерация, то есть один проход по телу цикла"), but the text then continues with the term.
- *Terms students know.* Every term is either known (prerequisites, earlier chapters, earlier in this topic) or defined at first use; when a known term returns after a long gap, a short reminder in the same sentence is welcome.
- *Define at first appearance:* `**Подсеть (subnet)** - часть сети, в которой...`. Defining it in the next sentence of the same paragraph is fine.
- *Sound definitions.* A definition does not use the defined word ("реплика - это реплика, которая...") and does not reduce the concept to one implementation ("шард - сервер", "хранилище - том EBS"); it stays true in the general case. A new term must not collide with a term the course already uses for something else.
- *It applies everywhere:* prose, examples, code, tables, captions, NOTE/TIP/WARNING blocks, analogies, footnotes. Code uses only constructs students have seen.
- *If a term is needed before the topic reaches it,* give a one-sentence explanation on the spot (not bold, saying where it is covered in depth) or rephrase without it. Rephrasing is usually better.
- *Expand acronyms at first use* unless they are prerequisites.
- *One or two new terms per paragraph,* then an example, then the next.
- *No concepts from the future in overviews* and early summary tables.
- *Stay inside the prerequisites:* do not lean on details the audience may not know even if they belong to a prerequisite course; say it in plain words.
- *Exceptions:* "Содержание", "Вопросы для самопроверки" and "Результаты обучения" deliberately name what the topic will teach. The opening story uses plain language.

Example. Bad: "Экземпляр в приватной подсети выходит в интернет через NAT Gateway" where NAT has not been explained. Good: first why a private server cannot download updates, then the definition of NAT, then the sentence about NAT Gateway. When editing, recheck the term order: moving a section can break it.

## Formatting

- *Dashes.* Never `—` or `–` in topic text; only a plain hyphen `-`, also in definitions: `**Термин** - определение`.
- *Bold* only for a term at its definition, and only for key concepts students will be tested on; secondary terms are defined in italic.
- *Italic* `_like this_` for emphasis, list theses, figure captions and the one-sentence conclusion of a paragraph; never asterisks.
- *Quotes* straight `"так"`, unless the profile says otherwise.
- *"Глава", not "лекция"* when the text refers to itself or other topics.
- *Lists:* hyphen bullets, each item capitalised and ending with a period. Exception: when short items complete the lead-in sentence, they start lowercase, end with a comma and the last with a period ("описывает сразу четыре разных момента:" / "- в первый раз `enemyHealth` равно `100`," / "- во второй `70`," ...). Thesis plus explanation: `- _Масштабируемость_. Система может...`. The lead-in agrees with the items grammatically. Numbered lists only where order matters.
- *Monospace* for commands, parameters, variables, file names, APIs, functions, types and keywords. Code blocks always name the language.
- *Bilingual terms:* at first appearance, the Russian term with the English one in parentheses. Do not translate service, technology or command names.
- *Blocks* in GitHub syntax: `> [!NOTE]` extra explanation, `> [!IMPORTANT]` must-understand point or a risk of data loss, a crash or undefined behaviour, `> [!WARNING]` typical mistake or dangerous setting, `> [!TIP]` practical advice. Sparingly.
- *Figures:* caption on the line under the image, `_Рисунок X.Y. Название_` (X chapter, Y figure number from 1); referred to as "на рисунке 5.2", never "на картинке выше". A borrowed image names its source and licence in the caption.
- *Footnotes* numeric `[^1]`, numbered in order of first use, defined right after the summary, no "Библиография" heading. Harvard style: `[^1]: Author (year). _Title_. Publisher or site. Available at: URL`. Every source cited in the text and real.
- *Tables* in standard Markdown, with an empty line before and after.
- *Russian spelling:* "ё", no "т.д.", no slang ("снапшот", "бэкап"), no dramatic overstatements.

## Language and style

Academic yet natural: an experienced teacher and engineer explaining to a student, not API documentation and not a generated textbook. The list of markers of generated text and what not to flag is in `references/humanize-ru.md`.

- Idea first, then the term and details. Tie new material to what students know.
- Short clear sentences, but complete ones: every sentence has its subject and verb, is grammatical, and follows from the previous one. Read the text aloud: it must sound like a careful teacher speaking, not like notes. Shortening never leaves telegraphic fragments ("Исправление: возвращать счётчик", "Главное отличие: собирается") or sentences that lost their link to the previous one.
- No marketing tone, pathos, empty phrases ("играет ключевую роль", "давайте погрузимся") or motivational filler.
- Do not repeat one thought in different words without a teaching reason.
- An occasional fitting joke is fine if it helps memory.
- Opening-story characters never appear in the main text; in technical parts do not invent named people.
- Click-by-click console steps go into hands-on materials when the profile says so.

## Examples, accuracy and sources

- *Everyday analogy* only if it builds the right mental model, and always return to the technical model.
- *Teaching scenario* (online shop, booking service, game mechanic): present it as a teaching scenario, not a real case. A *real company* only with a reliable source.
- *Code* is minimal, correct, readable for this level, and explained when its purpose is not obvious.
- *Claims carry their conditions.* Say for which version, mode, configuration or case a behaviour holds ("до 15 реплик для PostgreSQL и MySQL", "неинициализированная локальная переменная - неопределённое поведение"). "Всегда", "никогда", "не даст", "без ограничений" only where the standard or documentation guarantees it. Marketing and SLA figures that teach nothing stay out.
- Technical correctness beats elegant wording. Never invent services, features, APIs, flags, quotas, prices, cases, studies or links. Avoid exact numbers for fast-changing details unless they matter, and then take them from a current official source with the date. Verify anything that describes the world as it is now (features, limits, defaults, UI names) on a current official page when web access exists.
- Source priority: standards and RFCs, NIST, official vendor documentation, project documentation (cppreference, php.net, Kubernetes and so on), papers and recognised books, company engineering blogs about their own systems. Medium, Stack Overflow, Reddit and SEO articles are not a basis for a definition. A full topic usually needs 5-12 sources. Reused text from an old course is checked like any other claim.
- Never imply there is one right answer: show problem, requirement, decision, trade-off, and say when an option fits, when it does not, and what the alternative is.

## Checklist before delivery

- [ ] Scope and mode match the request; on "style only", content is unchanged.
- [ ] Topic structure in place, no skipped heading levels, transitions carry content.
- [ ] Every new term defined at first appearance, including in code, tables, captions and blocks; correct professional terms used consistently, no informal substitutes.
- [ ] No intro contradicts what follows, no explanation repeated, no tool before its operations.
- [ ] Enumerations are lists, tables have empty lines around them.
- [ ] Bold only in definitions, italic `_..._`, quotes per profile, no `—` or `–`.
- [ ] Figures numbered and referenced, text matches figures, borrowed images carry source and licence.
- [ ] Footnotes in order, each defined, cited and real.
- [ ] Summary of at most 8 one-line points with nothing new.
- [ ] Code folder present when the topic has code; outputs and line numbers match the text.
- [ ] Humanize pass done; no markers from `references/humanize-ru.md` left.
- [ ] Editor read done: every sentence grammatical, complete and linked; the text reads smoothly aloud.
- [ ] Illustrations added.
- [ ] Claims carry their conditions; confusable concepts are separated; each mechanism says what the student's code must handle.
- [ ] Every concept says why it is needed and where it is used; problems come before solutions where a concept solves a problem.
- [ ] Every reference to another place names it exactly and links to it.
- [ ] A student reading alone gets a full understanding of the material.
- [ ] Subject profile specifics applied.
- [ ] Full workflow only: plan approved, facts trace to `sources.md`, findings of all three checks resolved.

## Lasting corrections

When the user gives a correction meant to last ("всегда так делай", "запомни", "в этом курсе не используем ..."), apply it right away and offer to add it to this skill: to this file if it concerns every subject, to the subject's profile file if it concerns one, to a role file if it concerns one agent. Do not add one-off edits of a particular text.

This skill is distributed inside the plugin `course-topic-writer`. The skill-saving card cannot update it: repackage the whole plugin folder (this skill with `references/` and `scripts/`, plus `.claude-plugin/plugin.json` with the version raised) as a `.plugin` file, and also deliver the skill folder as a zip for manual upload.

## Subjects

Each subject has a profile file in `references/subjects/`. Pick it by the course named in the request:

| Subject | Keywords | File |
| --- | --- | --- |
| Cloud Computing | облачные вычисления, Cloud Computing, облако, AWS | `cloud-computing.md` |
| Web development (PHP) | веб-разработка, PHP, MiniShop | `web-php.md` |
| Programming foundations (C++) | основы программирования, Programming Foundations, C++, программирование для геймдизайнеров | `programming-foundations-cpp.md` |

To add a subject, the user either fills the template below by hand or describes the course in a message ("добавь предмет ..."). Map what they said onto the template without inventing or interrogating, save it as a new file in `references/subjects/`, add a row to the table above and repackage the plugin. Changing a subject changes only its file. If something important is missing while writing a topic, ask then and offer to add it to the profile.

```markdown
# Subject name

- _Keywords_: how the course is referred to in requests.
- _Audience_: university, programme, year, level.
- _Prerequisites_: what students already know and needs no explanation, including acronyms.
- _Language and platform_: language of the text, main technology, what to compare with.
- _Repository and files_: where chapters live, folder naming, images.
- _Course plan_: topics in order and which are already written.
- _Running project and story_: teaching project, opening-story characters.
- _Special elements_: required tables, blocks, code walkthrough formats.
- _Overrides_: quotes, structure, length, anything forbidden.
```

## Checker script

`scripts/check_topic.py` lints a finished file: dashes, «» quotes, asterisk italics, bold outside definitions, the word "лекция", skipped heading levels, figure caption format and numbering, footnote order and orphans, terms used before their definition, unexplained acronyms. It also checks that every "рисунок X.Y" reference has a caption and that the summary has at most 8 points. It does not replace reading: term and acronym findings are candidates. With a profile caption format without "Рисунок", pass `--plain-captions`; numbering, figure-reference and footnote findings still block delivery. Prerequisite terms can be appended to `known.txt`, one per line.
