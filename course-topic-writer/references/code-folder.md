# Code folder

When a topic contains program code, the teacher needs every example as a ready file to open and show in class.

- Put the files in `NN_Name/code/` next to the topic's `readme.md`, one complete program per file, named with a two-digit order prefix and a short English name (`08_nested_while_bug.cpp`, `09_nested_while_fixed.cpp`). Fragments from the text become complete programs: add the includes, the `main` and the input the text assumes.
- Every intentionally broken example gets its fixed version next to it. The mark "ОШИБКА НАМЕРЕННО" goes only into the `code/README.md` table; in the chapter text a broken example is introduced in a normal sentence ("Эта программа содержит ошибку.").
- Compile and run every file with the course's language tools. Check that each output stated in the text is the real output, and that line numbers quoted in compiler messages in the text match the file. Do not add comments inside the files when they would shift those line numbers; descriptions go in the README.
- Add `code/README.md` in the topic's language: one paragraph on what the folder is, how to open an example in the course's IDE, a note on programs that may not terminate and how to stop them, and a table `| Файл | Раздел главы | Что показывает |` with each file linked.
- In the topic, a short NOTE near the start points to the folder with a relative link (`[code](code/)`).
