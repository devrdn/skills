---
name: course-topic-writer
description: Write, extend, edit and review university course chapters (topics, lectures, chapter readme.md files) by the house rules and per-subject profiles kept in this skill - Cloud Computing (AWS), web development in PHP, programming foundations in C++, and any subject added later. Use whenever the user asks to write a new topic or section, rewrite, shorten, extend or proofread a chapter, or fix style or terminology in course text, even if they just say "напиши тему про S3", "проверь главу 5", "допиши раздел" or "поправь стиль". Also use when they ask to add or change a subject in this skill or to remember a lasting rule for chapters. Not for slide decks, Moodle question banks, lab assignments or CSS.
---

# Course topic writer

A topic (глава) is three things at once: a text students read on their own, the teacher's outline for a 75-minute lecture, and the source for a slide deck later. So it must stand alone, flow in order, and be technically exact.

These instructions are in English. The course material itself is written in the subject's language (Russian unless the profile says otherwise). Quoted Russian strings below (headings, captions, words) are exact literals to use as written.

The skill has general rules (all subjects) and subject profiles at the end. A profile refines or overrides the general rules for its course. The user's current request overrides both.

## Workflow

1. *Identify the subject* and read its profile under "Subjects". A profile may be as short as two lines; anything it omits comes from the general rules. If the subject is missing, work from the general rules and ask about audience and prerequisites only if you cannot write without them.
2. *Identify the mode and scope:* new topic, single section, edit, extension or review. Do exactly that much: a section stays a section, an edit stays an edit. If asked to change only style, do not change content.
3. *Collect what students already know.* This feeds the new-term rule below. Sources: the profile's prerequisites, earlier chapters of the subject (repository from the profile, attached files or project knowledge), and the part of the current topic already written. With a shell, extract the terms defined in earlier chapters: `python3 scripts/check_topic.py terms <earlier chapters> > known.txt`. If earlier chapters are unavailable, ask for them or state explicitly what you assume is known.
4. *Plan with a term map.* Before writing, list the sections and the new terms each one introduces. Check the order: a term introduced in section 4 must not be needed in section 2. Show the plan only if the user asked for one or the structure is debatable; otherwise write straight away.
5. *Write* by the rules below.
6. *Check.* Go through the checklist at the end. With a shell, run `python3 scripts/check_topic.py check <file> --chapter N --known known.txt` and resolve every finding: fix it or confirm it is a false positive.
7. *Deliver.* A full topic goes out as a `readme.md` file (with the file-sending tool if there is one). A section or an edit can go in the reply. No preamble about what you did. If the user's source has a substantive factual error, say so in a line or two.

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
(at most 10 short points, main ideas only, nothing new)

[^1]: Sources as footnotes right after the summary, with no heading.
```

Only the first chapter of a subject adds, after the learning outcomes, a short section "Как читать материалы курса" explaining bold, italic, monospace, the NOTE/IMPORTANT/WARNING/TIP blocks and `[^1]` references.

A full topic is about 5,000-7,000 words when the subject allows. That is a guide, not a quota: never pad with repetition or generalities.

## Structure and flow

A well-structured topic reads as one story: each section answers the question the previous one raised.

- *One section, one idea.* Split a section that carries two independent ideas. Let a heading state the idea rather than just name a term when that helps ("Подсеть становится публичной из-за маршрута" rather than "Публичные подсети").
- *Problem first, when it helps.* For a new technology or approach: the problem, why the old way falls short, the idea, how it works, an example, limits and trade-offs, where it is used. Simple building blocks can be explained directly.
- *Simple to complex.* Intuition, then mechanism, then example, and only then edge cases. For example: why a load balancer is needed, then the request path, then health checks and algorithms.
- *Transitions.* A section's first sentence links it to the previous one or names the problem it solves.
- *Heading hierarchy with no skipped levels:* `#` title, `##` major sections, `###` subsections, `####` rarely. Major sections should map naturally onto future slide blocks.
- *Paragraphs of 3-6 sentences.* Connected prose is the default. Lists are for parallel items, numbered lists for sequences, tables for comparisons; no long paragraphs inside table cells.
- *Promises are kept.* "Разберём ниже" or "вернёмся в главе N" must come true. A pointer to a later chapter is fine as an explicit promise, never as a substitute for an explanation needed now.
- *One running example* that grows through the topic beats five unrelated ones.

## New-term rule

A new term never appears before the student has been told what it means. A student reading front to back must never meet a word they do not know and that has not yet been explained. This is a core rule: for instance, "API" was removed from the first Cloud Computing chapter because students had not met it yet.

*Known* means:

- Listed in the subject's prerequisites.
- Defined in an earlier chapter of the same subject.
- Defined earlier in the current topic.

Everything else is new: concepts, acronyms, service and technology names, language constructs, commands, keywords.

How to comply:

- *Define at first appearance.* The first mention is the definition: `**Подсеть (subnet)** - часть сети, в которой...`. Naming the term and defining it in the next sentence of the same paragraph is fine.
- *It applies everywhere:* prose, examples, code, tables, figure captions, NOTE/TIP/WARNING blocks, analogies, footnotes. Code uses only constructs students have seen (no loops in the chapter on conditionals, no `aws s3` in the EC2 chapter).
- *If a term is needed before the topic reaches it,* either give a one-sentence explanation on the spot (not bold, saying where it is covered in depth) or rephrase without it. Rephrasing is usually better.
- *Expand acronyms at first use* unless they are prerequisites.
- *Do not introduce several new terms in one paragraph.* One or two terms, an example, then the next.
- *Exceptions:* "Содержание", "Вопросы для самопроверки" and "Результаты обучения" deliberately name what the topic will teach. The opening story uses plain language and is not loaded with terms.

Example. Bad: "Экземпляр в приватной подсети выходит в интернет через NAT Gateway" in a section where NAT has not been explained. Good: first why a private server cannot download updates, then the definition of NAT, then the sentence about NAT Gateway.

When editing, recheck this rule too: moving a section up or down can break the term order.

## Formatting

- *Dashes.* Never use `—` or `–` in topic text. Only a plain hyphen `-`, including in definitions: `**Термин** - определение`.
- *Bold* only for a term at its definition. Never for emphasis, whole sentences or section names in running text.
- *Italic* `_like this_` for emphasis, list theses and figure captions. Never asterisks for italic.
- *Quotes* straight `"так"`, unless the profile says otherwise.
- *"Глава", not "лекция".* Inside a topic, the text refers to itself and other topics as "глава" ("в четвёртой главе мы запустили...").
- *Lists:* hyphen bullets, each item capitalised and ending with a period. Thesis plus explanation: `- _Масштабируемость_. Система может...`. Numbered lists only where order matters.
- *Monospace* for commands, parameters, variables, file names, APIs, functions, types and keywords in prose. Code blocks always name the language: ` ```bash `, ` ```cpp `, ` ```php `.
- *Bilingual terms.* At first appearance of an important term: the Russian term with the English one in parentheses. Do not translate service, technology or command names (Amazon EC2, Docker, Availability Zone).
- *Blocks* in GitHub syntax: `> [!NOTE]` extra explanation, `> [!IMPORTANT]` must-understand point, `> [!WARNING]` typical mistake or dangerous setting, `> [!TIP]` practical advice. Use sparingly; they do not replace prose.
- *Figures.* Caption on the line under the image: `_Рисунок X.Y. Название_`, X the chapter number, Y the figure number within the chapter starting at 1. Refer to it as "на рисунке 5.2", never "на картинке выше". If no image from a reliable source exists, leave a `> [!TIP]` block for the teacher describing the diagram, its caption and a recommended source.
- *Footnotes* numeric `[^1]`, numbered in order of first use, definitions at the end of the file right after the summary. No `## Библиография` heading and no word "библиография". Harvard style: `[^1]: Author (year). _Title_. Publisher or site. Available at: URL`. Every source must be cited in the text and must really exist.
- *Tables* in standard Markdown, mainly for comparisons.

## Language and style

Academic yet natural: an experienced teacher and engineer explaining to a student, not API documentation and not a generated textbook.

- Idea first, then the term and details. Tie new material to what students know from prerequisites.
- Short clear sentences beat complex constructions.
- No marketing tone, pathos or empty phrases ("в современном быстро меняющемся мире", "играет ключевую роль", "давайте погрузимся").
- Do not repeat one thought in different words without a teaching reason.
- An occasional fitting joke is fine if it helps memory.
- Opening-story characters (if the profile has them) never appear in the main text. In technical parts do not invent named people: write "учебный проект", "пользователь", "администратор".
- Click-by-click console steps go into hands-on materials when the profile says so; the topic keeps only a note that the steps are in the hands-on.

## Examples

- *Everyday analogy* only if it builds the right mental model, and always return to the technical model afterwards.
- *Teaching scenario* (online shop, booking service, mobile app API, image processing and so on): present it explicitly as a teaching scenario, not a real case.
- *Real company* only with a reliable source on its architecture or the event. Never invent how Netflix, Uber and others work inside.
- Code is minimal, correct, readable for this level, and explained when its purpose is not obvious.

## Accuracy and sources

Technical correctness beats elegant wording. Never invent services, features, APIs, CLI flags, quotas, prices, SLAs, cases, studies or links. Separate stable concepts from fast-changing details (prices, quotas, limits, availability): avoid exact numbers for the latter unless they matter, and then take them from a current official source. When web search is available, verify anything describing the world as it is now.

Source priority: standards and RFCs, NIST, official vendor documentation and architecture guides, project documentation (Kubernetes, Docker, cppreference, php.net, etc.), papers and recognised books, company engineering blogs about their own systems. Medium, Stack Overflow, Reddit and SEO articles are not a basis for a definition. A full topic usually needs 5-12 sources.

## Architectural thinking

Never imply there is one right answer. Show the chain: problem, requirement, decision, trade-off. Where relevant, name the effect on reliability, availability, scalability, performance, security, operational complexity and cost, but only the criteria that matter for the example. Instead of "для этого нужна X", say when X fits, when it does not, and what the alternative is.

## Checklist before delivery

- [ ] Scope and mode match the request; on "style only", content is unchanged.
- [ ] Topic structure in place, no skipped heading levels, sections linked by transitions.
- [ ] Every new term defined at first appearance, including in code, tables, captions and blocks; acronyms expanded or known.
- [ ] Bold only in definitions, italic `_..._`, quotes per profile, no `—` or `–`.
- [ ] Captions `_Рисунок X.Y. ..._`, consecutive numbering, every figure referenced in the text.
- [ ] Footnotes in order, each defined, each source cited and real, no "Библиография" heading.
- [ ] Summary of at most 10 points with nothing new.
- [ ] Subject profile specifics applied.

## Lasting corrections

When the user gives a correction meant to last ("всегда так делай", "запомни", "в этом курсе не используем ..."), apply it right away and offer to add it to this skill: to the general rules if it concerns every subject, to the profile if it concerns one. Save the change as the complete updated skill (with the skill-saving tool if there is one, otherwise as a file). Do not add one-off edits of a particular text.

## Adding a subject

The user adds subjects themselves, and it should be effortless. Two ways:

- _By hand._ Copy the template below to the end of "Subjects" and fill in what is known. Any field can be skipped; order and wording are free.
- _By message._ The user writes "добавь предмет ..." and describes the course in free form, or attaches its chapters. Map what they said onto the template fields without inventing or interrogating: what is missing stays missing. Append the profile to "Subjects" and deliver the complete updated skill. Change nothing else.

Changing a subject works the same way: only its profile changes. If something important turns out to be missing while writing a topic (for example, what students have already covered), ask at that moment and offer to add it to the profile.

Template:

```markdown
### Subject name

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

## Subjects

### Cloud Computing

- _Keywords_: облачные вычисления, Cloud Computing, облако, cloud, AWS.
- _Audience_: USM, 3rd year, programmes Informatică and Informatică aplicată (lab requirements differ between them). Mixed level; aim at the average student: not a school intro, not DevOps experience either.
- _Prerequisites_: programming basics, algorithms and data structures, computer networks basics (IP, TCP, UDP, HTTP, HTTPS, DNS as a concept, ports), operating systems basics (process, file system, basic Linux terminal), C++, Node.js, PHP, web development. Network concepts a chapter builds on still get a short reminder.
- _Language and platform_: Russian. AWS is the main platform and the default source of service examples. Google Cloud only where the comparison shows a concept is wider than one vendor (EC2 and Compute Engine, S3 and Cloud Storage, RDS and Cloud SQL, Lambda and Cloud Run functions, EKS and GKE). The course is not an AWS catalogue: the subject is cloud computing principles, AWS is the playground.
- _Repository and files_: `MSU-Courses/cloud-computing`, each chapter in `NN_Name/readme.md`, images in `_images/NN/`, labs in `Lab/`. Last year's course `MSU-Courses/cloud-computing-old` is reference only: structure and ideas may be reused, claims must be verified, text is never copied. If the user says not to use it, don't.
- _Course plan_: 15 chapters in five parts (foundations, building blocks, distributed applications, security and operations, architecture). Written so far: 01 Введение в облачные вычисления; 02 Архитектура облачных систем и основы виртуализации; 03 AWS и глобальная архитектура (regions, AZs, account, budgets, tags, IAM users, groups, roles, policies, console, CLI, SDK); 04 Вычислительные сервисы и идентификация машин, Amazon EC2; 05 Облачные сети, Amazon VPC. Terraform, Kubernetes, Docker and CI/CD are not covered in depth (separate courses). Reliability topics (RTO, RPO, SLA, SLO, blast radius, DR) are spread across chapters and tied to concrete services. The six AWS Well-Architected pillars run through the course and are covered in depth in the last chapter. Check the repository for the current chapter list.
- _Running project and story_: each chapter opens with a story in `<i>...</i>` about the students Эмма and Джон. The author writes the story: never write one unasked and never touch its text during style edits. Story dialogue lines start with a dash; that is the author's choice and the dash rule does not apply there. Эмма and Джон never appear in the main text. The course application grows from lab to lab (TimeCapsule in labs 2-3).
- _Special elements_:
  - When a service is covered for the first time, the topic has a service card: table `| Характеристика | Amazon X |` with rows Категория, Что делает, Для чего нужен, Где используют, Модель обслуживания, Область действия, Как оплачивается, Как работать, Появился, Аналоги.
  - From chapter 4 on, step-by-step console work lives in separate hands-on files (`hands_on_NN.md`); the topic keeps a short note that it is in the hands-on.
  - Architecture diagrams in AWS style with the official AWS Architecture Icons, showing only components students have already studied.
- _Overrides_: straight quotes `"..."`. The `#` title has no chapter number.

### Web development (PHP)

- _Keywords_: веб-разработка, PHP, Web Development Fundamentals, MiniShop.
- _Audience_: USM, beginners and students who want to put their knowledge in order. The course sits between a surface overview and a deep dive. 15 lectures and 15 lab sessions, 6 lab assignments.
- _Prerequisites_: HTML, CSS, a little JavaScript (students can build a static page). Server side, HTTP mechanics and PHP are new.
- _Language and platform_: Russian, PHP 8. Three parts: the PHP language, web fundamentals, advanced chapters and an intro to frameworks.
- _Running project and story_: MiniShop, a teaching online shop (prices in lei, Moldovan context). The practical example at the end of a chapter usually extends MiniShop with the new topic.
- _Special elements_: a built-in function or a language construct (`foreach`, `match` and so on) is walked through as: a line `_Синтаксис_`, a `php` block with the signature, a parameter list with descriptions and the return value, a line `_Пример_`, a block with the example and its output in a comment. The text cross-references earlier chapters and sections ("глава 4, раздел 4.6.1").
- _To clarify with the user_: repository, quote style, whether there is an opening story.

### Programming foundations (C++)

- _Keywords_: основы программирования, Programming Foundations, C++, программирование для геймдизайнеров.
- _Audience_: USM, Game Design students, beginners; aim slightly below average. Explain especially simply and step by step, without academic heaviness.
- _Prerequisites_: school-level computer use. Programming, compilation, data types and so on are new until covered.
- _Language and platform_: Russian, C++. Bilingual terms are mandatory: compiler messages and documentation are in English.
- _Repository and files_: `MSU-Courses/programming-foundations`, folders `NN_Name/readme.md`, images in `_images/`. Chapters so far: 01 Введение, 02 Как "думает" программа, 03 Данные и введение в C++, 04 Выражения и операции, 05 Структурное программирование.
- _Running project and story_: examples from game logic (an enemy attacks the player when they get close, and so on).
- _Special elements_: diagrams instead of ASCII art in code blocks.
- _To clarify with the user_: quote style, whether there is an opening story.

## Checker script

`scripts/check_topic.py` lints a finished file: dashes, «» quotes, asterisk italics, bold outside definitions, the word "лекция", skipped heading levels, figure caption format and numbering, footnote order and orphans, terms used before their definition, unexplained acronyms. It does not replace reading: term and acronym findings are candidates to review. Prerequisite terms can be appended to `known.txt`, one per line.
