# Humanizing Russian teaching text

Adapted for Russian course chapters from two sources: Wikipedia, _Signs of AI writing_ (WikiProject AI Cleanup), via the `humanizer` and `academic-humanizer` skills (MIT). The target voice is a teacher explaining to a first-year student: plain, precise, calm. Not a research paper, not a blog post.

## Markers to remove

Look for clusters; one marker alone proves little.

- _Значимость без содержания._ "играет ключевую роль", "является важнейшим", "открывает новые возможности", "в современном мире", "неотъемлемая часть". Replace with the specific fact or delete.
- _Безымянные авторитеты._ "специалисты считают", "исследования показывают", "принято считать", "многие разработчики" without a footnote. Attach a real source from `sources.md` or delete the attribution and state the claim plainly if it is stable knowledge.
- _Пустые анонсы и связки._ "В этом разделе мы рассмотрим", "Давайте разберёмся", "Теперь перейдём к", "Соберём вместе", "Как мы увидим далее". Start with the content. A heading followed by a sentence that only repeats it: delete the sentence. A transition that says what we are about to do and with what ("Теперь попробуем применить отладчик к нашему примеру") is not a marker: keep it.
- _Канцелярит вместо простого глагола._ "является", "представляет собой", "осуществляет", "производится", "имеет возможность" → тире, "это", "делает", "может". "Для того чтобы" → "чтобы"; "в связи с тем что" → "потому что"; "на данный момент" → "сейчас".
- _"Не просто X, а Y" и ложные противопоставления._ "Это не просто цикл, а мощный инструмент". State what it is.
- _Тройки по инерции и ложные размахи._ Three adjectives or three items where the meaning has two or four; "от новичков до профессионалов", "от теории до практики".
- _Синонимы по кругу._ The same thing named three ways in a row ("цикл", "конструкция повторения", "механизм итерации"). Use one term, the one defined in the chapter.
- _Глубокомыслие._ "На самом деле", "по сути", "главное здесь", "ключевой момент в том", "важно понимать, что", "стоит отметить, что". Delete the frame, keep the claim.
- _Каскад оговорок._ "может потенциально в некоторых случаях". Keep one qualifier when the fact needs it.
- _Ответы на несуществующие возражения._ "Это не значит, что...", "Конечно, можно было бы...", followed by an option nobody raised and nothing more. Delete unless the objection is real for students.
- _Афористичные концовки и драматические фрагменты._ "Короче не значит понятнее." once per chapter is a teaching device; a row of punchlines is a tic. "И это работает." "Вот и всё." delete.
- _Мотивационные финалы._ A paragraph or section that ends with vague optimism ("теперь вы готовы к большим проектам"). End on the last useful fact.
- _Одинаковый ритм._ Every sentence the same middle length, every paragraph opening the same way ("Это...", "Здесь..."). Vary length; merge or split by meaning.
- _Телеграфный стиль._ The opposite failure, typical after cuts: "X: Y" instead of a sentence, a missing subject or verb, bare infinitives ("Исправление: возвращать счётчик"), sentences that no longer follow from the previous one. Rewrite as full sentences; this is the Editor's main target.
- _Жирный и списки ради вида._ Bold mini-headings on every list item, bold for emphasis. Bold only at a definition (see SKILL.md).

## Do not flag

- Definitions, worked-example markers ("Рассмотрим пример."), trace tables, outputs, step-by-step walkthroughs: these are the genre.
- Deliberate repetition for teaching: restating a rule right after an example that shows it, a summary at the end.
- Short simple sentences: for this audience they are a virtue, not a tell.
- Neutral, dry wording in technical parts: dryness without markers is fine.
- One fitting joke or vivid metaphor that builds the right mental model.
- Phrases inside quotes, code, compiler messages and examples where the phrase is discussed rather than used.

## Process

1. While drafting, write without the markers from the first pass; do not produce marker-heavy text and clean it later.
2. After the checks, read each section and mark the markers.
3. Rewrite the marked paragraphs around their main point, not phrase by phrase.
4. Ask two questions and fix what they find:
   - "Что здесь всё ещё звучит как сгенерированный текст?"
   - "Не добавилось и не потерялось ли ни одного факта, числа, термина или сноски?"
5. Never invent a fact, example or source to make a sentence sound more human.
