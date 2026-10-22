# Illustrations

After a full topic is written and checked, illustrate it. In other modes, illustrate only when asked.

- _Where pictures are needed._ Take them from section C of the Читатель report and from your own reading: interfaces the student must use (debugger, console, settings dialog), flows of control, structures, processes, comparisons that are easier to see than to read.
- _Real screenshots first, for interfaces._ Prefer screenshots from official documentation over drawn mock-ups. Find the page, find the image file, download it, look at it before using it, and save it to `_images/NN/` with a short descriptive name (`vs-breakpoint-hit.png`).
- _If the documentation site is blocked from the shell,_ look for the same images in the documentation's public source repository. Microsoft Learn pages are rendered from GitHub repositories (Visual Studio: `MicrosoftDocs/visualstudio-docs`, images under `docs/<area>/media/...`); the page's markdown in the repository names each image path, and `https://raw.githubusercontent.com/<owner>/<repo>/main/<path>` downloads it. Check the repository's LICENSE before reuse.
- _Licence and attribution._ Use only images whose reuse terms allow it (for example CC BY 4.0 for the MicrosoftDocs repositories), and say so in the caption: `_Рисунок X.Y. Название. Источник: Microsoft, CC BY 4.0[^N]_`, with a footnote to the documentation page. If the terms are unclear, link the page instead of copying the image, and say so in the delivery.
- _Explain foreign content._ A screenshot from documentation shows someone else's code or data; say in the text what to look at and that the rest does not matter now. Describe in the text what the screenshot shows (which mark, which window, which columns), and refer to it by number.
- _Draw what no source shows._ Make your own SVG diagram in the course's existing visual style (look at earlier `_images/NN/` files), render it to PNG and look at it before delivery. If an image is needed but neither found nor drawable, leave a `> [!TIP]` for the teacher with the diagram's description and a recommended source.
- Renumber figures and references after inserting new ones.
