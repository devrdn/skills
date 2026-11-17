# Review agents

The main session is the **author**: it reads the source, plans, writes the whole content.js, applies findings and builds. Agents only **review**: each has one job, gets only the input that job needs, reports findings and changes nothing.

Why the author writes everything himself: connections and consistent terms come from one hand. Splitting the writing across agents by section produces exactly the disconnected slides the review exists to catch.

Why separate reviewers instead of one: the author knows the chapter, so he silently fills the gaps between slides, and after hours of work his own sentences read as fine. The course author kept finding five kinds of defect that slipped through one reviewer: facts that drift from the source, wrong outputs in code questions, slides out of order or not connected, clumsy Russian, and layout. Each needs a different reader.

## Roles

| Agent file | Model | Stage | Reads | Finds |
|---|---|---|---|---|
| `plan-reviewer.md` | sonnet | A: after the plan, before content.js | `plan.md` only | order, prerequisites, threads, budget |
| `fidelity-reviewer.md` | sonnet | B: after content.js passes lint | source, previous chapter, content.js, story.md | facts, completeness, titles, quiz |
| `code-checker.md` | sonnet | B | content.js, source | code outputs and answers that a real compiler or interpreter disagrees with |
| `student-reader.md` | sonnet | B | `story.md` **only** | where a first-year student loses the thread |
| `language-editor.md` | opus | B | story.md | clumsy Russian, linking words, paragraphs |
| `visual-checker.md` | haiku | C: after the build | page images | layout defects |
| `animation-checker.md` | opus | interactive mode, after the build | slides.html, chapter, built HTML | live diagrams without enough motion, missing dots, step order, slides worth animating (Russian file) |

The student reader and the plan reviewer must not see the source: a reader who knows the chapter fills every jump the way the author does, and the student PDF is read later without the narration.

## How to launch

Use the Agent tool with `subagent_type: "general-purpose"` and the model from the table. The agent reads its own instructions, so the prompt is short and the main context stays small:

```
You are the <role> for a university lecture deck. Read <skill>/agents/<file>.md and follow it exactly.
Inputs:
- <name>: <absolute path>
...
Return only the report in the format the file asks for.
```

Fill the inputs each file lists under «Inputs». Use absolute paths. Agents of one stage go **in one message**, so they run in parallel:

- **Stage A:** plan reviewer alone. Fix the plan, then write content.js.
- **Stage B:** fidelity reviewer, code checker, student reader and language editor together.
- **Stage C:** one visual checker per batch of about 40 pages, all batches in one message.
- **Interactive mode:** the animation checker after the first build, together with the language editor; run it again after adding the animations it proposed.

## Rounds

- Stage A: one round. Run it again only if the plan changed a lot.
- Stage B: after applying round 1, run the **student reader and the language editor** again on the new story.md if either returned more than ~5 substantive findings. Stop after a round with no substantive findings or after round 2. On lecture 6, round 1 found 38 broken links and 72 wording problems; round 2 still found real ones, including a contradiction introduced by a round-1 fix. A third round rarely pays off: read the changed slides yourself.
- Fidelity reviewer and code checker: one round; after fixing, re-run the code checker only on the slides you changed.
- Stage C: after fixing, re-render only the changed pages and look at them yourself.

## Applying findings

- **Fidelity:** apply, unless the finding asks for something outside the source (source-only rule, content-rules.md section 1).
- **Code checker:** a mismatch is a fact; fix the slide's answer or code. If the source itself is wrong, use the correct output and list the error in the report.
- **Plan reviewer and student reader:** retitle, reorder, cut, or give the slide its own lead. Reject any proposed lead that starts with a linking word or narration, or points back with «это», «тот же»: rewrite it as a statement of this slide's point (content-rules.md, «Connections between slides»).
- **Language editor:** apply the rewrite when it is more fluent and keeps the meaning and the term. Keep the source's terms even if the editor suggests a synonym.
- **Animation checker:** apply. The author wants more motion, not less: add the steps, dots and movements it proposes unless they contradict the chapter. Never drop an animation because a reviewer called it excessive.
- **Visual:** confirm doubtful findings at a larger size before acting (`pdftoppm -f N -l N -r 80 -png deck.pdf out`).
- Every change must still pass `lint_content.js`: a lead added to a slide may push it over the text limit, so shorten the other text.
- Conflicts: fidelity and the code checker win on facts, the plan reviewer and student reader on order and links, the language editor on wording.

## Without the Agent tool

If subagents are unavailable (for example when this skill itself runs inside a subagent), do each review yourself, one at a time, by reading its agent file and following it. Re-read story.md from the start for each pass. For the student-reader pass, do not open the source: ask that file's questions literally for every slide. Say in the report that the review was done without separate agents.
