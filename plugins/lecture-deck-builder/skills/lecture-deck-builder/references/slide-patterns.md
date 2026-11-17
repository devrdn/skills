# Slide patterns: how one slide is built

The author wants every slide «грамотно расписан»: the reader sees at once what the slide is about, reads it top to bottom in one pass, and leaves with one clear point. This file gives the anatomy of a slide and ready patterns for the slide kinds a lecture needs. Pick the pattern first, then fill it; do not start from a blank slide and pile up blocks.

## Anatomy of any content slide

Read top to bottom, a slide has at most four layers, each with one job:

1. **Title** - names the concept (content-rules.md, section 6).
2. **Lead** (`intro`, optional) - one sentence of context: this slide's problem or condition, with the shared thing named explicitly. Not a second title, not a definition, not a continuation of the previous slide.
3. **Core** - exactly one main element: a definition card, a code block, a code pair, a table, a list, an image, a question.
4. **Takeaway** (`after`, optional) - one sentence: the conclusion or the "so what" of this slide.

Rules that follow from this:

- One core per slide. A card and a code block together, or a table and a list together, are two cores: split the slide.
- Lead and takeaway are full sentences, at most two lines each (22 words, content-rules.md section 7, enforced by lint). If they need more, the slide is doing two jobs.
- The slide reads on its own: its place in the story comes from the order of slides and from content, not from linking words («Поэтому», «Однако», «Начнём с»; content-rules.md, «Connections between slides»).
- Lead + core + takeaway is the maximum. A card with items already uses the core and its explanation, so it gets no takeaway paragraph.
- The bold words on the slide, read alone, should give its point.
- The slide does not repeat its title in the lead, and the takeaway does not repeat the lead.

## Bullets: when to use them and when not

A list is the right form only when the content really is a set of separate, parallel items.

Use a list when:

- there are 2-5 independent items of the same kind: properties of a concept, rules, criteria, consequences;
- the items are steps whose order matters: then a numbered list (`numbered: true`), for example an algorithm, a procedure, the lecture plan;
- every item can be written in the same grammatical form and holds one idea.

Do not use a list when:

- the content is a chain of reasoning (cause, then effect, then conclusion): write one or two connected sentences in `after` or `intro`;
- there is only one point: a list of one is a sentence;
- you explain code: refer to lines in a takeaway sentence («в строке 3 условие проверяется до тела цикла»);
- you introduce a term: that is a definition card;
- you compare options: that is a table or a `compare`;
- you state a conclusion: that is the takeaway sentence;
- the items would need sub-items or long explanations: split into slides.

Never mix a list with another list, a long paragraph and a source line on the same slide. More than five items means the slide is doing two jobs.

## Patterns

### 0. Section opening

Purpose: the first slide after a section divider tells the student why this section exists and how it connects to what came before.

- Use the Problem pattern (1) or a short orienting slide: «В псевдокоде был один вид повторения, а в C++ их три. Чем они различаются?».
- Never open a section with a bare image, a syntax block or a table: the student does not yet know what to look for.
- The orienting slide asks the section's question and names what the student already knows; it does not pre-tell what the figure or the next slides will show. One or two sentences, or a `compare` of «уже знаем / сейчас узнаем», is enough.

### 1. Problem

Purpose: show why the next concept is needed, on the source's own example.

- Title: what goes wrong, as a term («Некорректные данные в конструкторе», «Обход проверки через открытое свойство»).
- Core: short code (5-12 lines) with the bad result in a comment, or a `compare` of the two situations.
- Takeaway: the question the next slide answers («Нужен механизм, который прервёт создание объекта»).

### 2. Definition

Purpose: introduce exactly one new term (or two related ones).

- Title: the term itself («Зона доступности»), «Понятие X» only to avoid repeating the section title.
- Core: `def` card «Термин (english) - определение».
- Then either up to three short items (properties, consequences) or one takeaway sentence linking back to the problem. Not both.

### 3. Syntax

Purpose: show the general form before the concrete example.

- Title: «Синтаксис X».
- Core: a short generic code block (placeholders like `ClassName`, `arguments`).
- Items: 2-3 rules a beginner gets wrong. No takeaway paragraph.

### 4. Worked example

Purpose: the concept applied to the source's case.

- Title: what the example demonstrates («Объявление конструктора», «Выбрасывание и перехват исключения»).
- Lead (optional): the condition in one sentence.
- Core: code up to ~12-15 lines with line numbers, or a `codepair` (declaration / usage, problem / solution).
- Takeaway: what to notice, referring to lines by number («В строке 7 конструктор прерывается, и объект не создаётся»).

### 4a. Image or diagram

Purpose: show a figure from the source that explains something better than words.

- Before the figure, the student must know what it shows. Default for wide, tall or multi-panel figures: the previous slide sets it up in its `after` («Ниже: как каждый цикл выглядит на блок-схеме»), and the image slide is bare (title, figure, caption) so the figure gets the full size. A lead sentence on the image slide is only for small, simple figures.
- The figure must be readable at slide size. If its labels are too small (several diagrams packed into one picture, a full console screenshot), either give it the whole slide with no lead or takeaway, or leave it out and explain in words; a figure nobody can read is noise.
- Never two image slides in a row without words between them.

### 5. Mechanism

Purpose: explain how something works step by step.

- Title: the process as a term («Иерархия классов исключений», «Доставка содержимого через edge-локации»).
- Core: an image from the source, a numbered list of 3-5 steps, or a code block with the tree.
- Takeaway: the consequence that matters for the student.

### 6. Comparison

Purpose: help choose between two or more options.

- Title: «Сравнение X и Y» or «X или Y».
- Core: a table (3-5 rows, the criteria the source names) or a `compare` with two cards, or a `tablebuild` to let the audience guess.
- Takeaway: the decision rule in one sentence («`private(set)` для изменяемых данных, `readonly` для неизменяемых»).

### 7. Warning or tip

Purpose: one rule the student must not miss.

- Core: one `alert` with the recommendation in bold. Optional takeaway sentence. Never a list of five warnings.

### 8. Question to the audience

Purpose: check understanding where students are likely to slip.

- Title: «Вопрос: тема».
- Two pages, always: the question page, then the answer page «Ответ: тема».
- Question page: the question as one sentence (`question`), and the code it is about (`code`) if any.
- Answer page: the code again when it still reads at 10.5 pt or larger (otherwise only the answer), then the answer card: a short bold answer and one explanatory sentence, 28 words at most.
- Optional `after` (shown on the answer page): the conclusion from the answer.

### 9. Quiz question

- Title: short topic. Question as one sentence.
- Code the question depends on goes into the `code` field as real lines, never inside the question sentence: on a projector a line like `$a = new Product('Ноутбук', 14999); $b = $a; $b->price = 9999;` is unreadable in 30 seconds. The engine keeps quiz code at 11 pt or larger and warns if it does not fit.
- Options: four short, parallel answers of similar length; long code in options means the question is badly built.

### 10. Summary

- Up to 10 points over 1-2 slides, each a full sentence restating one idea of the lecture in the order of the lecture.

## Good and bad

Bad (four blocks, inline definitions, loose tail):

```
Zero-Spend Budget
[card] Zero-Spend Budget (бюджет нулевых затрат) - готовый шаблон бюджета ...
• Угадывать сумму не нужно: пока всё в бесплатных объёмах, писем нет.
• Наблюдение и уведомления бесплатны; платят за автоматические действия и регулярные отчёты.
Рядом: AWS Cost Explorer (графики расходов) и AWS Cost anomaly detection (всплески трат).
```

Good (definition pattern):

```
Бюджет нулевых затрат
[card] Zero-Spend Budget (бюджет нулевых затрат) - готовый шаблон бюджета, который присылает
       письмо, когда расходы выходят за пределы бесплатных объёмов AWS Free Tier.
Порог задавать не нужно: письмо означает, что вы вышли за бесплатный объём, даже если расход
ещё покрывают кредиты.
```

The cost-tool remark either gets its own slide (if the source treats it as important) or is cut.
