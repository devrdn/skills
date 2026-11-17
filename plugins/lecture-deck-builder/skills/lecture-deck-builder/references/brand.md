# Brand

All of the author's lectures share one visual style so the course looks coherent. The style is built into `engine/build_modern.js`, so the job is simply not to fight it: do not change colors, fonts, sizes or the grid in the engine, and do not build slides around it. If someone asks for a "different design" for one lecture, first ask whether the whole course brand should change.

## Palette

| Role | Color | Where |
|---|---|---|
| Title ink | `#0B0B12` | Slide titles |
| Body | `#3A3F4A` | Paragraphs, list items |
| Accent 1 (indigo) | `#4F46E5` | Terms, pills, page number, table headers |
| Accent 2 (sky) | `#0EA5E9` | Second term, second column, question pills |
| Surfaces | `#F4F5F8`, `#F7F8FA` | Definition, answer and image cards |
| Muted | `#9AA0AA` | Footer, sources |
| Code background | `#0F1626` | Code blocks (dark highlighting theme) |
| Warning | `#FFF6EC` / `#F59E0B` | WARNING |
| Tip | `#EEF8FD` | TIP |

The indigo-sky gradient (`img/grad_full.png`) is used only on section dividers, statement slides, hands-on and «Время вышло». The soft gradient (`img/grad_soft.png`) only on the title slide. Content slides are white.

## Typography

- Manrope (Regular/Bold) for all text; IBM Plex Mono for code and inline monospace.
- Fixed sizes: title 25 pt, body 16 pt, tables 14 pt, captions 13 pt, footer 9.5-10.5 pt, section divider 40 pt, section number 62 pt. Hands-on: label pill 15 pt, title 44 pt (38 pt when the slide has items).
- Code: line numbers in a dim grey-blue (`#4F5B7A`) in front of every line.
- Hierarchy by size and weight only, no extra fonts or colors.

## Grid

- 16:9, 10 x 5.625 in. Margins 0.66 in, content width 8.68 in.
- Footer: «NN. Section» on the left, page number in indigo on the right. The word «Часть» is never written.
- Content ends at 5.02 in; the footer starts at 5.27 in.

## Animation

`post.py` adds a fade transition to every slide, and the body of content slides appears on click. In-lecture questions are two pages (question, then answer), each with the usual body-on-click. Title, dividers, statements and hands-on have no animation. Do not add other animations.

## Do not

- Icons, clip art, stock photos, decorative lines under titles.
- New colors to "liven up" a slide.
- Images not from the source, generated pictures.
- Shrinking text so it fits: shorten or split the slide instead.
