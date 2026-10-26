# bank.json и что из него собирается

`bank.json` - единственный источник банка. Всё остальное скрипты собирают из него. Правь банк, а не XML.

## Содержание

1. Верхний уровень
2. Общие поля вопроса
3. Пример каждого типа
4. Что собирает сборка
5. Подробности Moodle XML
6. Файлы ответов агентов

## 1. Верхний уровень

```json
{
  "lecture": 5,
  "course": "Cloud Computing",
  "title": "Виртуальные сети в облаке. Amazon VPC",
  "category_root": "$course$/Cloud Computing",
  "unit": "Лекция",
  "categories": {"": "Основные вопросы", "c": "Что выведет программа", "u": "Написание кода"},
  "questions": []
}
```

- `category_root` необязателен; по умолчанию `$course$/<course>`.
- `unit` необязателен; по умолчанию "Лекция". Он даёт имя категории Moodle ("Лекция 5") и заголовок ключа ("Вопросы к лекции 5"). Поддерживаются также "Тема" и "Глава".
- `categories` задаёт заголовок каждой категории в ключе. Свой суффикс пользователя получает свою запись.

## 2. Общие поля вопроса

| Поле | Значение |
| --- | --- |
| `cat` | Суффикс категории: `""`, `"c"`, `"u"` или суффикс пользователя |
| `set` | `"main"` или `"extra"` |
| `type` | `single`, `multi`, `gap`, `match`, `output`, `output_choice`, `code` |
| `section` | Раздел материала, который проверяет вопрос. Нужен только для покрытия, не печатается |
| `stem` | Текст вопроса. Код в строке - в обратных кавычках |
| `code`, `lang` | Код под вопросом и его язык (`json`, `bash`, `yaml`, `python3`, `php`, `cpp`, ...). Можно у любого типа, кроме `code` |
| `explanation` | Одно-два предложения, которые студент видит после ответа |

Порядок в файле почти не важен: сборка сортирует каждую группу (категория, набор) по типу и сохраняет порядок файла внутри типа. `edit_bank.py` переносит вопрос, дописывая его в конец списка, поэтому он попадает в конец блока своего типа.

## 3. Пример каждого типа

```json
{"cat": "", "set": "main", "type": "single", "section": "Подсети",
 "stem": "Что делает подсеть VPC публичной?",
 "correct": "Маршрут `0.0.0.0/0` в Internet Gateway.",
 "distractors": ["Флажок публичной подсети в её настройках.",
                 "Публичные IPv4-адреса у всех её экземпляров.",
                 "Security Group с открытыми портами 80 и 443."],
 "explanation": "Отдельного флажка у подсети нет, разницу задаёт маршрут."}
```

```json
{"cat": "", "set": "main", "type": "multi", "section": "Network ACL",
 "stem": "Выберите верные утверждения о Network ACL.",
 "correct": ["Действует на границе подсети.", "Может содержать запрещающие правила.", "Проверяет правила по порядку номеров."],
 "wrong": ["Запоминает разрешённые соединения.", "Принимает Security Group как источник."],
 "explanation": "Network ACL не запоминает соединения, а источником в его правилах может быть только диапазон адресов."}
```

```json
{"cat": "", "set": "main", "type": "gap", "section": "NAT",
 "stem": "Технология, которая позволяет нескольким устройствам локальной сети выходить в интернет через один публичный IP-адрес, обозначается аббревиатурой ________.",
 "answers": ["NAT", "Network Address Translation"],
 "explanation": "Маршрутизатор запоминает, какое устройство отправило запрос, чтобы вернуть ему ответ."}
```

```json
{"cat": "", "set": "main", "type": "match", "section": "Порты",
 "stem": "Соедините сетевую программу с портом, на котором она работает по умолчанию.",
 "pairs": [["SSH", "22"], ["HTTP", "80"], ["HTTPS", "443"], ["PostgreSQL", "5432"], ["DNS", "53"]],
 "extras": ["8080"],
 "explanation": "Порт 8080 не закреплён ни за одной из перечисленных программ."}
```

```json
{"cat": "c", "set": "main", "type": "output", "section": "Строки",
 "lang": "php",
 "stem": "Что выведет программа?",
 "code": "<?php\n$a = \"5\";\n$b = 3;\necho $a . $b;",
 "answers": ["53"],
 "explanation": "Оператор `.` склеивает строки, поэтому число 3 приводится к строке."}
```

```json
{"cat": "c", "set": "main", "type": "output_choice", "section": "Массивы",
 "lang": "python3",
 "stem": "Каким будет результат выполнения программы?",
 "code": "items = [1, 2, 3]\nprint(items[3])",
 "run_result": "Error",
 "correct": "Программа завершится ошибкой выполнения.",
 "distractors": ["Программа выведет 3.", "Программа выведет None.", "Программа выведет пустую строку."],
 "explanation": "Индексы списка из трёх элементов идут от 0 до 2, обращение к индексу 3 вызывает `IndexError`."}
```

```json
{"cat": "u", "set": "main", "type": "code", "section": "Повторные попытки",
 "coderunnertype": "python3",
 "format": "write",
 "stem": "Напишите функцию `retry_delay(attempt, base, cap)`, которая возвращает задержку перед повторной попыткой: `base * 2 ** attempt`, но не больше `cap`. Нумерация попыток начинается с нуля.",
 "preload": "",
 "solution": "def retry_delay(attempt, base, cap):\n    return min(base * 2 ** attempt, cap)",
 "tests": [
   {"code": "print(retry_delay(0, 1, 30))", "stdin": "", "expected": "1", "show": true, "example": true},
   {"code": "print(retry_delay(3, 1, 30))", "stdin": "", "expected": "8", "show": true, "example": true},
   {"code": "print(retry_delay(10, 1, 30))", "stdin": "", "expected": "30", "show": false, "example": false},
   {"code": "print(retry_delay(0, 0, 30))", "stdin": "", "expected": "0", "show": false, "example": false}
 ],
 "explanation": "Ограничение сверху не даёт интервалу между попытками расти бесконечно."}
```

Про вопросы с кодом:

- `lang` для `output` и `output_choice`: `python3`, `php`, `nodejs`, `cpp`, `c`. Код PHP начинается с `<?php`. Код C и C++ - целая программа с `main`.
- `coderunnertype` для `code`: `python3`, `python3_w_input`, `php`, `nodejs`, `cpp_function`, `cpp_program`, `c_function`, `c_program`. Для `*_program` и `python3_w_input` поле `code` у теста пустое, а данные идут через `stdin`.
- Необязательные `allornothing` (по умолчанию `true`) и `answerboxlines` (по умолчанию 12).

## 4. Что собирает сборка

`python3 scripts/build_bank.py bank.json --out DIR` пишет для каждой непустой группы:

| Группа | Основной файл | Файл extra |
| --- | --- | --- |
| `single`, `multi` | `L05_choice.xml` | `L05Q_choice.xml` |
| `gap` | `L05_gapfill.xml` | `L05Q_gapfill.xml` |
| `match` | `L05_matching.xml` | `L05Q_matching.xml` |
| `output`, `output_choice` в `c` | `L05c_output.xml` | `L05cQ_output.xml` |
| `code` в `u` | `L05u_code.xml` | `L05uQ_code.xml` |
| Всё | `L05_questions.md` | `L05Q_questions.md` |

Категория пользователя `a` даёт `L05a_<группа>.xml` и `L05aQ_<группа>.xml`.

Ключ в Markdown содержит только вопросы и ответы: номер заголовком, вопрос, код, варианты с буквами и буква ответа, допустимые формы пропуска, таблица соответствия, эталонное решение и тесты CodeRunner. Буква ответа меняется от вопроса к вопросу, чтобы не всегда была A.

`--student FILE --key FILE` пишет версию без ответов с перемешанными вариантами и списками соответствия с буквами для агентов, а ключ - в JSON.

## 5. Подробности Moodle XML

Это делает скрипт; раздел нужен, когда что-то надо проверить вручную.

- Первая строка `<?xml version="1.0" encoding="UTF-8"?>`, корень `<quiz>`, первый вопрос типа `category`.
- Текст вопроса `format="html"` в CDATA с `<p>`; код в `<pre><code>`.
- Варианты выбора `format="markdown"`, простой текст в CDATA, верный первым, `<shuffleanswers>1</shuffleanswers>`, `<answernumbering>none</answernumbering>`.
- `<penalty>0.3333333</penalty>`, `<hidden>0</hidden>`, `<defaultgrade>1.0000000</defaultgrade>`.
- Доли для multi из фиксированного набора Moodle: 50, 33.33333, 25 для верных; -100, -50, -33.33333, -25 для неверных.
- `shortanswer` с `<usecase>0</usecase>`; каждая допустимая форма - свой `<answer fraction="100">`. Звёздочка в ответе shortanswer в Moodle - шаблон, поэтому скрипт пишет её как `\*`.
- `matching`: по `<subquestion>` на пару, лишний вариант - `<subquestion>` с пустым текстом.
- `coderunner`: `<coderunnertype>`, `<prototypetype>0</prototypetype>`, `<allornothing>1</allornothing>`, `<penaltyregime>0, 10, 20, ...</penaltyregime>`, `<validateonsave>1</validateonsave>`, эталонное решение в `<answer>`, заготовка в `<answerpreload>`, пустые унаследованные теги сохраняются, тесты в `<testcases>`.

## 6. Файлы ответов агентов

`student_answers.json` и `leak_answers.json` сопоставляют номеру вопроса ответ:

```json
{
  "05_01": {"answer": "C", "confidence": "high", "note": ""},
  "05_45": {"answer": ["A", "D", "E"], "confidence": "medium", "note": "B спорно"},
  "05_51": {"answer": "NAT", "confidence": "high", "note": ""},
  "05_66": {"answer": {"1": "C", "2": "A", "3": "F", "4": "B", "5": "D"}, "confidence": "high", "note": ""},
  "05c_01": {"answer": "53", "confidence": "high", "note": ""}
}
```

Буквы относятся к `student.md`, а не к ключу в Markdown. Детектор подсказок добавляет поле `cue`: что в форме вопроса указало ему на ответ.
