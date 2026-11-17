// build_modern.js - генератор презентаций в стиле "modern"
// Использование: node build_modern.js content_xxx.js out.pptx
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const sizeOf = require("image-size").default || require("image-size");

const WID = JSON.parse(fs.readFileSync(path.join(__dirname, "widths.json"), "utf8"));
const FONT = "Manrope", MONO = "IBM Plex Mono";
const C = {
  ink: "0B0B12", body: "3A3F4A", accent: "4F46E5", accent2: "0EA5E9", surface: "F4F5F8",
  surface2: "F7F8FA", muted: "9AA0AA", codeBg: "0F1626", codeInk: "1F2430",
  warnBg: "FFF6EC", warn: "F59E0B", warnInk: "B45309", tipBg: "EEF8FD", tipInk: "0B5E86",
  unknown: "B8BDC7", rowNew: "EEF0FF", stripe: "F7F8FA",
};
const S = { title: 25, section: 40, cover: 36, text: 16, table: 14, caption: 13, foot: 9.5 };
const M = 0.66, W = 8.68, SW = 10, SH = 5.625, FOOT_Y = 5.3, BOTTOM = FOOT_Y - 0.28;
const LH = 1.12;            // эмпирика LibreOffice: строка = 1.12*кегль*межстрочный
const LH_MONO = 1.26;
const SYN = { lineNo: "4F5B7A", plain: "E4E9F2", comment: "6E7C9E", string: "9DD69B", keyword: "C79BF0", variable: "7FB0FF", number: "F2A16B", tag: "FFCB6B", html: "F0768B" };
const KEYWORDS = new Set(["aws", "configure", "sts", "ec2", "ssh", "curl", "chmod", "dnf", "systemctl", "sudo", "echo", "export", "if", "then", "fi", "for", "do", "done", "true", "false", "null", "exit", "hostname", "cat", "ls", "cd", "mkdir", "run-instances", "stop-instances", "terminate-instances", "install", "enable",
  "echo", "print_r", "var_dump", "foreach", "endforeach", "as", "function", "return", "unset", "isset", "array", "count", "sort", "rsort", "asort", "arsort", "ksort", "krsort", "usort", "implode", "explode", "in_array", "array_search", "array_merge", "array_push", "array_pop", "array_shift", "array_unshift", "array_values", "array_column", "array_sum", "array_key_exists", "htmlspecialchars",
  "int", "double", "bool", "char", "float", "long", "short", "unsigned", "void", "return", "include", "std", "cout", "cin", "endl", "main", "static_cast", "const", "using", "namespace", "if", "else", "while", "for", "break", "continue", "struct", "class", "auto", "abs"]);

let pptx, counter = 0, currentPart = "", warnings = [], figNo = 0, LECTURE = 0;

// ---------- измерение текста ----------
function cw(ch, kind) {
  const t = WID[kind];
  const v = t[ch.codePointAt(0)];
  if (v !== undefined) return v;
  return kind === "m" ? 0.6 : 0.6;
}
// разбор inline-разметки: **жирный** и `моно` (моно может быть внутри жирного)
function parseInline(text) {
  const segs = [];
  let bold = false, mono = false, ital = false, buf = "";
  const push = () => { if (buf) segs.push({ t: buf, b: bold, m: mono, i: ital }); buf = ""; };
  for (let i = 0; i < text.length; i++) {
    if (!mono && text[i] === "*" && text[i + 1] === "*") { push(); bold = !bold; i++; continue; }
    if (!mono && text[i] === "*") { push(); ital = !ital; continue; }
    if (text[i] === "`") { push(); mono = !mono; continue; }
    buf += text[i];
  }
  push();
  return segs;
}
const mplain = (t) => parseInline(t).map((s) => s.t).join("");
function segWidth(str, s, fs) {
  let w = 0;
  for (const ch of str) w += s.m ? 0.6 * 0.92 : cw(ch, s.b ? "b" : "r");
  return (w * fs) / 72;
}
// число строк при переносе по словам
function countLines(segs, fs, width) {
  width = width / 1.02; // запас на отличия рендера
  let lines = 1, x = 0;
  const words = [];
  for (const s of segs) {
    const parts = s.t.split(/(\s+)/);
    for (const p of parts) { if (p === "") continue; words.push({ t: p, s }); }
  }
  // склеиваем соседние куски без пробела (напр. `код`, запятая)
  const tokens = [];
  for (const w of words) {
    const isSpace = /^\s+$/.test(w.t);
    if (!isSpace && tokens.length && !tokens[tokens.length - 1].space) tokens[tokens.length - 1].w += segWidth(w.t, w.s, 16) * fs / 16;
    else tokens.push({ space: isSpace, w: segWidth(w.t, w.s, fs), nl: w.t.includes("\n") });
  }
  for (const tk of tokens) {
    if (tk.space) { if (tk.nl) { lines++; x = 0; } else x += tk.w; continue; }
    if (x + tk.w > width && x > 0) { lines++; x = tk.w; }
    else x += tk.w;
  }
  return lines;
}
function textHeight(text, fs, width, spacing = 1.3) {
  const segs = typeof text === "string" ? parseInline(text) : text;
  // эмпирика LibreOffice + Manrope: шаг строки около 1.38 кегля и при 100%, и при 130%
  const n = countLines(segs, fs, width);
  if (spacing >= 1.25) return (n * 1.38 + 0.17) * fs / 72;
  return n * 1.36 * fs / 72;
}

// ---------- run-ы ----------
function inline(text, fs, baseColor = C.body, opts = {}) {
  return parseInline(text).map((s) => ({
    text: s.t,
    options: {
      fontFace: s.m ? MONO : FONT, fontSize: s.m ? +(fs * 0.92).toFixed(1) : fs,
      bold: s.b || !!opts.bold, italic: !!s.i, color: s.m ? (opts.monoColor || (baseColor === C.body ? C.codeInk : baseColor)) : (s.b && baseColor === C.body ? C.ink : baseColor),
    },
  }));
}
function itemText(it) { return typeof it === "string" ? it : (it.lead ? "**" + it.lead + "** " : "") + (it.text || ""); }
function runsFor(items, fs, { numbered = false, color = C.body, bullet = true, startAt = 0, gap = 9 } = {}) {
  const out = [];
  items.forEach((it, idx) => {
    const r = inline(itemText(it), fs, color);
    const po = {};
    if (bullet) po.bullet = numbered ? Object.assign({ type: "number", indent: 27 }, startAt ? { startAt } : {}) : { code: "2022", indent: 27 };
    po.paraSpaceAfter = gap;
    r.forEach((x, i) => { if (i === 0) Object.assign(x.options, po); });
    r[r.length - 1].options.breakLine = true;
    out.push(...r);
  });
  return out;
}
function itemsHeight(items, fs, width, bullet = true, gap = 9) {
  let h = 0;
  for (const it of items) h += textHeight(itemText(it), fs, width - (bullet ? 0.375 : 0)) + gap / 72;
  return h;
}

// ---------- базовые элементы ----------
let curType = "", kinds = [];
function newSlide() { kinds.push(curType); return pptx.addSlide(); }
function addTitle(s, title) {
  let fs = S.title;
  while (countLines(parseInline(title), fs, W) > 1 && fs > 20) fs -= 1;
  if (countLines(parseInline(title), fs, W) > 1) warn("длинный заголовок: " + title);
  s.addText(inline(title, fs, C.ink, { bold: true }), { x: M, y: 0.4, w: W, h: 0.521, margin: 0, valign: "top", charSpacing: -0.3, lineSpacingMultiple: 1.16, fontFace: FONT });
  return 1.241;
}
function pillWidth(text) { return segWidth(text.toUpperCase(), { b: true }, 10) + text.length * 1 / 72 + 0.36; }
function pill(s, text, x, y, { bg = C.accent, color = "FFFFFF" } = {}) {
  const w = pillWidth(text);
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.28, fill: { color: bg }, line: { color: bg, width: 0 }, rectRadius: 0.14 });
  s.addText(text.toUpperCase(), { x, y, w, h: 0.28, margin: 0, align: "center", valign: "middle", fontFace: FONT, fontSize: 10, bold: true, color, charSpacing: 1 });
  return w;
}
function card(s, x, y, w, h, fill = C.surface) {
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 }, rectRadius: 0.06 });
}
function footer(s) {
  counter++;
  if (currentPart) s.addText(currentPart, { x: M, y: FOOT_Y, w: 7.3, h: 0.28, margin: 0, valign: "middle", fontFace: FONT, fontSize: S.foot + 0.5, bold: true, color: C.muted, charSpacing: 0.2 });
  s.addText(String(counter), { x: 8.9, y: 5.27, w: 0.48, h: 0.34, margin: 0, align: "right", valign: "middle", fontFace: FONT, fontSize: 10.5, bold: true, color: C.accent });
}
function warn(m) { warnings.push(`[слайд ${counter + 1}] ${m}`); }
function para(s, text, y, { fs = S.text, color = C.body, x = M, w = W } = {}) {
  const h = textHeight(text, fs, w);
  s.addText(inline(text, fs, color), { x, y, w, h: h + 0.02, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT });
  return y + h;
}
let srcTop = null;   // верх строки источника на текущем слайде: контент не должен на неё заходить
function noteLine(s, text) {
  // мелкий комментарий/источник внизу
  const h = textHeight(text, 11, W, 1.2);
  srcTop = BOTTOM + 0.12 - h;
  s.addText(inline(text, 11, C.muted), { x: M, y: BOTTOM + 0.12 - h, w: W, h, margin: 0, valign: "bottom", lineSpacingMultiple: 1.2, fontFace: FONT });
  return h;
}
function checkBottom(y, what) {
  if (y > BOTTOM + 0.02) warn(`переполнение (${what}): низ ${y.toFixed(2)} > ${BOTTOM.toFixed(2)}`);
  else if (srcTop !== null && y > srcTop - 0.06) warn(`наложение на строку источника (${what}): низ ${y.toFixed(2)} > ${(srcTop - 0.06).toFixed(2)}`);
  srcTop = null;
}

// ---------- типы слайдов ----------
function titleSlide(sp) {
  const s = newSlide();
  s.background = { color: "FFFFFF" };
  s.addImage({ path: path.join(__dirname, "img/grad_soft.png"), x: 2.4, y: -1.6, w: 8.6, h: 5.9 });
  pill(s, sp.course || "Cloud Computing", M, 1.26);
  let cfs = S.cover;
  while (countLines(parseInline(sp.title), cfs, 7.4) > 2 && cfs > 28) cfs -= 2;
  s.addText(inline(sp.title, cfs, C.ink, { bold: true }), { x: M, y: 1.78, w: 7.4, h: 1.95, margin: 0, valign: "top", charSpacing: -0.9, lineSpacingMultiple: 1.12, fontFace: FONT });
  s.addShape(pptx.shapes.RECTANGLE, { x: M, y: 3.86, w: 0.86, h: 0.045, fill: { color: C.accent }, line: { color: C.accent, width: 0 } });
  s.addText(sp.author || "Nartea N.", { x: M, y: 4.06, w: 5, h: 0.36, margin: 0, valign: "middle", fontFace: FONT, fontSize: 17, bold: true, color: C.ink });
  s.addText(sp.meta || "", { x: M, y: 4.44, w: 6, h: 0.3, margin: 0, valign: "middle", fontFace: FONT, fontSize: 12.5, color: C.muted });
  counter++;
}
function sectionSlide(sp) {
  const s = newSlide();
  s.addImage({ path: path.join(__dirname, "img/grad_full.png"), x: 0, y: 0, w: SW, h: SH });
  const nn = String(sp.part).padStart(2, "0");
  currentPart = nn + ". " + mplain(sp.title);
  s.addText(nn, { x: M, y: 1.16, w: 3, h: 1.0, margin: 0, valign: "top", fontFace: FONT, fontSize: 62, bold: true, color: "FFFFFF", charSpacing: -2 });
  s.addText(sp.title, { x: M, y: 2.42, w: 8, h: 1.9, margin: 0, valign: "top", fontFace: FONT, fontSize: S.section, bold: true, color: "FFFFFF", charSpacing: -0.9, lineSpacingMultiple: 1.12 });
  footer(s);
}
function statementSlide(sp) {
  const s = newSlide();
  s.addImage({ path: path.join(__dirname, "img/grad_full.png"), x: 0, y: 0, w: SW, h: SH });
  s.addText((sp.label || "Главная мысль раздела").toUpperCase(), { x: M, y: 1.5, w: W, h: 0.3, margin: 0, valign: "middle", fontFace: FONT, fontSize: 11, bold: true, color: "C9D2FF", charSpacing: 1.8 });
  const fs = sp.fs || 26;
  s.addText(inline(sp.text, fs, "FFFFFF", { bold: true, monoColor: "FFFFFF" }), { x: M, y: 1.92, w: 7.986, h: 2.5, margin: 0, valign: "top", charSpacing: -0.6, lineSpacingMultiple: 1.2, fontFace: FONT });
  if (textHeight(sp.text, fs, 7.986, 1.2) > 3.1) warn("statement длинный");
  footer(s);
}
function handsonSlide(sp) {
  const s = newSlide();
  s.addImage({ path: path.join(__dirname, "img/grad_full.png"), x: 0, y: 0, w: SW, h: SH });
  const bare = !sp.items && !sp.note;
  const py = bare ? 1.75 : 0.85;
  // larger label pill and title than other slides: the hands-on slide is a visible pause in the lecture
  const label = (sp.label || "Hands-on").toUpperCase();
  const lw = segWidth(label, { b: true }, 15) + label.length * 1.5 / 72 + 0.6;
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: M, y: py, w: lw, h: 0.46, fill: { color: "FFFFFF" }, line: { color: "FFFFFF", width: 0 }, rectRadius: 0.23 });
  s.addText(label, { x: M, y: py, w: lw, h: 0.46, margin: 0, align: "center", valign: "middle", fontFace: FONT, fontSize: 15, bold: true, color: C.accent, charSpacing: 1.5 });
  const tfs = bare ? 44 : 38;
  s.addText(sp.title, { x: M, y: py + 0.66, w: 8.5, h: 1.6, margin: 0, valign: "top", fontFace: FONT, fontSize: tfs, bold: true, color: "FFFFFF", charSpacing: -0.9, lineSpacingMultiple: 1.08 });
  let y = py + 0.66 + textHeight(sp.title, tfs, 8.5, 1.08) + 0.3;
  if (sp.items) {
    const r = runsFor(sp.items, 16, { numbered: true, color: "FFFFFF" });
    r.forEach((x) => { if (x.options.fontFace === MONO) x.options.color = "FFFFFF"; if (x.options.bold) x.options.color = "FFFFFF"; });
    const h = itemsHeight(sp.items, 16, 8.0);
    s.addText(r, { x: M, y, w: 8.0, h, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT });
    y += h;
  }
  if (sp.note) s.addText(inline(sp.note, 12.5, "DDE3FF"), { x: M, y: 4.62, w: W, h: 0.4, margin: 0, valign: "bottom", fontFace: FONT });
  checkBottom(y, "handson");
  footer(s);
}
function bulletsSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.2;
  let fs = sp.fs || S.text;
  const avail = BOTTOM - y - (sp.after ? textHeight(sp.after, fs, W) + 0.2 : 0) - (sp.source ? 0.3 : 0);
  const gap = sp.gap ?? 9;
  while (itemsHeight(sp.items, fs, W, true, gap) > avail && fs > 14) fs -= 1;
  const h = itemsHeight(sp.items, fs, W, true, gap);
  s.addText(runsFor(sp.items, fs, { numbered: sp.numbered, startAt: sp.start || 0, gap }), { x: M, y, w: W, h, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT });
  y += h;
  if (sp.after) y = para(s, sp.after, y + 0.1, { fs }) ;
  if (sp.source) noteLine(s, sp.source);
  checkBottom(y, "bullets");
  footer(s);
}
function defSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.24;
  const iw = W - 0.72;
  const th = textHeight(sp.term + " -", 16, iw), dh = textHeight(sp.definition, 16, iw);
  const ch = 0.22 + th + dh + 0.3;
  card(s, M, y, W, ch);
  s.addText(inline(sp.term + " -", 16, C.accent, { bold: true }), { x: M + 0.36, y: y + 0.22, w: iw, h: th, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT });
  s.addText(inline(sp.definition, 16, C.body), { x: M + 0.36, y: y + 0.22 + th, w: iw, h: dh, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT });
  y += ch + 0.24;
  if (sp.term2) {
    const th2 = textHeight(sp.term2 + " -", 16, iw), dh2 = textHeight(sp.definition2, 16, iw);
    const ch2 = 0.22 + th2 + dh2 + 0.3;
    card(s, M, y, W, ch2, C.surface2);
    s.addText(inline(sp.term2 + " -", 16, C.accent2, { bold: true }), { x: M + 0.36, y: y + 0.22, w: iw, h: th2, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT });
    s.addText(inline(sp.definition2, 16, C.body), { x: M + 0.36, y: y + 0.22 + th2, w: iw, h: dh2, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT });
    y += ch2 + 0.24;
  }
  if (sp.items) {
    let fs = S.text;
    const avail = BOTTOM - y - (sp.source ? 0.3 : 0);
    while (itemsHeight(sp.items, fs, W) > avail && fs > 14) fs -= 1;
    const h = itemsHeight(sp.items, fs, W);
    s.addText(runsFor(sp.items, fs, { numbered: !!sp.numbered }), { x: M, y, w: W, h, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT });
    y += h;
  }
  if (sp.after) y = para(s, sp.after, y + (sp.items ? 0.14 : 0));
  if (sp.source) noteLine(s, sp.source);
  checkBottom(y, "def");
  footer(s);
}
const ALERT = {
  NOTE: { label: "Примечание", bg: C.surface, pill: C.accent, ink: C.body },
  IMPORTANT: { label: "Важно", bg: C.surface, pill: C.accent, ink: C.body },
  WARNING: { label: "Предупреждение", bg: C.warnBg, pill: C.warn, ink: C.warnInk },
  TIP: { label: "Совет", bg: C.tipBg, pill: C.accent2, ink: C.tipInk },
};
function drawAlert(s, kind, text, y, label) {
  const a = ALERT[kind];
  const iw = W - 0.72;
  const th = textHeight(text, 16, iw);
  const ch = 0.26 + 0.28 + 0.14 + th + 0.26;
  card(s, M, y, W, ch, a.bg);
  pill(s, label || a.label, M + 0.36, y + 0.26, { bg: a.pill });
  s.addText(inline(text, 16, a.ink, { monoColor: a.ink === C.body ? C.codeInk : a.ink }), { x: M + 0.36, y: y + 0.68, w: iw, h: th, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT });
  return y + ch;
}
function alertSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.24;
  if (sp.itemsFirst) {
    const h = itemsHeight(sp.itemsFirst, S.text, W);
    s.addText(runsFor(sp.itemsFirst, S.text), { x: M, y, w: W, h, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT });
    y += h + 0.12;
  }
  y = drawAlert(s, sp.kind || "NOTE", sp.text, y, sp.label);
  if (sp.after) y = para(s, sp.after, y + 0.24);
  if (sp.items) {
    y += 0.24;
    const h = itemsHeight(sp.items, S.text, W);
    s.addText(runsFor(sp.items, S.text), { x: M, y, w: W, h, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT });
    y += h;
  }
  if (sp.source) noteLine(s, sp.source);
  checkBottom(y, "alert");
  footer(s);
}
function imageSlide(sp) {
  const s = newSlide();
  let top = addTitle(s, sp.title) - 0.2;
  if (sp.intro) top = para(s, sp.intro, top + 0.2) + 0.16;
  const file = path.join(__dirname, sp.image);
  const dim = sizeOf(fs.readFileSync(file));
  const ratio = dim.width / dim.height;
  const capH = 0.305, srcH = sp.source ? 0.3 : 0;
  const aftH = sp.after ? textHeight(sp.after, 14, W) + 0.12 : 0;
  const pad = 0.14;
  const maxH = BOTTOM + 0.1 - top - capH - srcH - aftH - (sp.after ? 0.22 : 0.14) - 2 * pad;
  const maxW = (sp.maxw || (ratio > 1.6 ? 8.55 : 8.2)) - 2 * pad;
  let w = maxW, h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  const cx = (SW - w - 2 * pad) / 2;
  card(s, cx, top, w + 2 * pad, h + 2 * pad, sp.cardColor || C.surface2);
  s.addImage({ path: file, x: cx + pad, y: top + pad, w, h });
  let y = top + h + 2 * pad + 0.14;
  if (sp.caption) {
    figNo++;
    const kind = sp.kind || "Рис.";
    const num = sp.num || `${LECTURE}.${figNo}`;
    s.addText([{ text: `${kind} ${num}.  `, options: { bold: true, color: C.accent } }, ...inline(sp.caption, S.caption, C.body)], { x: M, y, w: W, h: capH, margin: 0, align: "center", valign: "middle", fontFace: FONT, fontSize: S.caption });
    y += capH;
  }
  if (sp.source) { s.addText(inline(sp.source, 11, C.muted), { x: M, y: y + 0.04, w: W, h: 0.26, margin: 0, align: "center", valign: "middle", fontFace: FONT }); y += 0.3; }
  if (sp.after) y = para(s, sp.after, y + 0.08, { fs: 14 }) + 0.1;
  checkBottom(y - 0.1, "image");
  footer(s);
}
// ---- таблицы ----
function cellRuns(text, fs, color, bold) {
  const r = inline(String(text), fs, color, { bold });
  return r;
}
function tableHeight(header, rows, colW, fs, marPt = 7) {
  const mar = marPt / 72 * 2;
  const rh = (cells, bold) => Math.max(...cells.map((c, i) => textHeight(String(c), fs, colW[i] - mar, 1.0) + mar));
  let h = header ? rh(header, true) : 0;
  for (const r of rows) h += rh(r);
  return h;
}
function drawTable(s, sp, y, { rowsOverride, highlightRow = -1 } = {}) {
  const fs = sp.fs || S.table;
  const cols = sp.header.length;
  let colW = sp.colW ? sp.colW.map((v) => v * W / sp.colW.reduce((a, b) => a + b, 0)) : null;
  if (!colW) {
    // пропорционально длине самого длинного текста
    const lens = sp.header.map((h, i) => Math.max(mplain(h).length, ...sp.rows.map((r) => Math.min(mplain(String(r[i])).length, 60))) + 4);
    const tot = lens.reduce((a, b) => a + b, 0);
    colW = lens.map((l) => (l / tot) * W);
  }
  const rows = rowsOverride || sp.rows;
  const data = [];
  data.push(sp.header.map((h) => ({ text: cellRuns(h, fs, "FFFFFF", true), options: { fill: { color: C.accent }, valign: "middle" } })));
  rows.forEach((r, ri) => {
    data.push(r.map((c, ci) => {
      const unknown = c === "?";
      const color = unknown ? C.unknown : ci === 0 && sp.firstBold !== false ? C.ink : C.body;
      const fill = ri === highlightRow ? C.rowNew : ri % 2 === 1 ? C.stripe : "FFFFFF";
      return { text: cellRuns(c, fs, color, (ci === 0 && sp.firstBold !== false) || unknown), options: { fill: { color: fill }, valign: "middle" } };
    }));
  });
  const marPt = sp.dense ? 4 : 7;
  const h = tableHeight(sp.header, rows, colW, fs, marPt);
  s.addTable(data, { x: M, y, w: W, colW, fontFace: FONT, fontSize: fs, margin: marPt, border: { type: "none" }, autoPage: false });
  return y + h;
}
function tableSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.2;
  y = drawTable(s, sp, y);
  if (sp.after) y = para(s, sp.after, y + 0.2, { fs: 14 });
  if (sp.source) noteLine(s, sp.source);
  checkBottom(y, "table");
  footer(s);
}
function tableBuildSlide(sp) {
  // пошаговое раскрытие колонок reveal (индексы) построчно
  const n = sp.rows.length;
  const steps = sp.stepwise ? [...Array(n + 1).keys()] : sp.questionOnly ? [0] : [0, n];
  for (const k of steps) {
    const s = newSlide();
    let y = addTitle(s, sp.title);
    if (sp.intro) y = para(s, sp.intro, y) + 0.2;
    if (sp.ask) y = para(s, sp.ask, y, { color: C.accent }) + 0.2;   // призыв угадать: только в версии преподавателя
    const rows = sp.rows.map((r, ri) => r.map((c, ci) => (ri >= k && sp.reveal.includes(ci) ? "?" : c)));
    y = drawTable(s, sp, y, { rowsOverride: rows, highlightRow: sp.stepwise ? k - 1 : -1 });
    if (sp.after && k === n) y = para(s, sp.after, y + 0.2, { fs: 14 });
    checkBottom(y, "tablebuild");
    footer(s);
  }
}
function compareSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.24;
  const cw2 = 4.12, iw = cw2 - 0.56;
  let fs = sp.fs || S.text;
  const colH = (col, f) => 0.26 + 0.28 + 0.16 + (col.items ? itemsHeight(col.items, f, iw, col.bullet !== false) : 0) + (col.text ? textHeight(col.text, f, iw) : 0) + 0.12;
  const avail = BOTTOM - y - (sp.after ? textHeight(sp.after, 16, W) + 0.24 : 0);
  while (Math.max(colH(sp.left, fs), colH(sp.right, fs)) > avail && fs > 14) fs--;
  const h = Math.max(colH(sp.left, fs), colH(sp.right, fs));
  [[sp.left, M, C.surface, C.accent], [sp.right, M + cw2 + 0.44, C.surface2, C.accent2]].forEach(([col, x, bg, pc]) => {
    card(s, x, y, cw2, h, bg);
    pill(s, col.label, x + 0.28, y + 0.26, { bg: col.pillColor || pc });
    let yy = y + 0.7;
    if (col.text) { const th = textHeight(col.text, fs, iw); s.addText(inline(col.text, fs), { x: x + 0.28, y: yy, w: iw, h: th, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT }); yy += th + 0.08; }
    if (col.items) s.addText(runsFor(col.items, fs, { bullet: col.bullet !== false }), { x: x + 0.28, y: yy, w: iw, h: itemsHeight(col.items, fs, iw, col.bullet !== false), margin: 0, valign: "top", lineSpacingMultiple: 1.28, fontFace: FONT });
  });
  y += h;
  if (sp.after) y = para(s, sp.after, y + 0.24);
  if (sp.source) noteLine(s, sp.source);
  checkBottom(y, "compare");
  footer(s);
}
function refsSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title || "Библиография");
  const fs = sp.fs || 11;
  let h = 0;
  const runs = [];
  sp.items.forEach((it, i) => {
    const r = inline(it, fs, C.body);
    r[0].options.bullet = { type: "number", indent: 20, startAt: (sp.start || 1) };
    r[0].options.paraSpaceAfter = 5;
    r[r.length - 1].options.breakLine = true;
    runs.push(...r);
    h += textHeight(it, fs, W - 0.28, 1.2) + 5 / 72;
  });
  s.addText(runs, { x: M, y, w: W, h, margin: 0, valign: "top", lineSpacingMultiple: 1.2, fontFace: FONT });
  checkBottom(y + h, "refs");
  footer(s);
}
// ---- код ----
const TOKEN_RE = /(\/\*[\s\S]*?\*\/)|(<!--[\s\S]*?-->)|(\/\/[^\n]*|(?:^|(?<=\s))#[^\n]*)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")|(<\?php|<\?=|\?>)|(<\/?[a-zA-Z][^>\n]*>)|(\$[A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_\-]*)|(\d+(?:\.\d+)?)/g;
// Line numbers: shown for real code (not lang "text") with 2+ lines, unless the slide sets lineNumbers: false.
let LN_ON = true;
function gutter(code, lang) {
  const n = code.split("\n").length;
  return LN_ON && lang !== "text" && n >= 2 ? String(n).length + 2 : 0;
}
function highlight(code, fs, lang) {
  const runs = [];
  const add = (t, color) => { if (!t) return; runs.push({ text: t, options: { fontFace: MONO, fontSize: fs, color } }); };
  const lines = code.split("\n");
  const g = gutter(code, lang);
  lines.forEach((line, li) => {
    if (g) add(String(li + 1).padStart(g - 2) + "  ", SYN.lineNo);
    if (lang === "text") add(line || " ", SYN.plain);
    else {
      let last = 0, m;
      TOKEN_RE.lastIndex = 0;
      while ((m = TOKEN_RE.exec(line))) {
        add(line.slice(last, m.index), SYN.plain);
        let color = SYN.plain;
        if (m[1] || m[2] || m[3]) {
          const isSlash = m[0].startsWith("//");
          color = (lang === "json") || (isSlash && lang === "bash") || (!isSlash && (lang === "js" || lang === "javascript")) ? SYN.plain : SYN.comment;
        }
        else if (m[4]) color = lang === "json" && /^\s*:/.test(line.slice(m.index + m[0].length)) ? SYN.variable : SYN.string;
        else if (m[5]) color = SYN.tag;
        else if (m[6]) color = SYN.html;
        else if (m[7]) color = SYN.variable;
        else if (m[8]) color = KEYWORDS.has(m[8]) && lang !== "json" ? SYN.keyword : SYN.plain;
        else if (m[9]) color = SYN.number;
        if (lang === "json" && m[3]) { add(m[0], SYN.plain); last = m.index + m[0].length; continue; }
        add(m[0], color);
        last = m.index + m[0].length;
      }
      add(line.slice(last), SYN.plain);
      if (!line.length) add(" ", SYN.plain);
    }
    if (runs.length) runs[runs.length - 1].options.breakLine = li < lines.length - 1;
  });
  return runs;
}
function codeMetrics(code, fs, lang = "code") {
  const lines = code.split("\n");
  const maxc = Math.max(...lines.map((l) => [...l].length)) + gutter(code, lang);
  return { w: (maxc * 0.6 * fs) / 72, h: (lines.length * fs * LH_MONO * 1.1) / 72 };
}
function fitCode(code, availH, minFs = 10, maxFs = 14, lang = "code") {
  let fs = maxFs;
  while (fs > minFs) {
    const m = codeMetrics(code, fs, lang);
    if (m.w <= W - 0.68 && m.h + 0.48 <= availH) break;
    fs -= 0.5;
  }
  return fs;
}
function drawCodeBlock(s, code, lang, y, fs, label) {
  const m = codeMetrics(code, fs, lang);
  const h = m.h + 0.48;
  card(s, M, y, W, h, C.codeBg);
  s.addText(highlight(code, fs, lang), { x: M + 0.34, y: y + 0.24, w: W - 0.68, h: m.h, margin: 0, valign: "top", lineSpacingMultiple: 1.1, fontFace: MONO });
  if (m.w > W - 0.68) warn("код шире карточки");
  if (label) s.addText(label, { x: M + W - 1.6, y: y + 0.06, w: 1.5, h: 0.22, margin: 0, align: "right", fontFace: MONO, fontSize: 9, color: SYN.comment });
  return y + h;
}
function codeSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.24;
  let below = 0;
  if (sp.after) below += textHeight(sp.after, 16, W) + 0.24;
  if (sp.items) below += itemsHeight(sp.items, 15, W) + 0.24;
  if (sp.columns) below += Math.max(...sp.columns.map((c) => itemsHeight(c, 14, W / 2 - 0.2))) + 0.24;
  if (sp.code2) below += codeMetrics(sp.code2, 12, sp.lang2 || "text").h + 0.48 + 0.2;
  const fsz = sp.fs || fitCode(sp.code, BOTTOM - y - below, 10, 14, sp.lang || "bash");
  y = drawCodeBlock(s, sp.code, sp.lang || "bash", y, fsz, sp.label);
  if (sp.code2) y = drawCodeBlock(s, sp.code2, sp.lang2 || "text", y + 0.16, Math.min(fsz, 12), sp.label2);
  if (sp.items) {
    y += 0.24;
    const h = itemsHeight(sp.items, 15, W);
    s.addText(runsFor(sp.items, 15), { x: M, y, w: W, h, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT });
    y += h;
  }
  if (sp.columns) {
    y += 0.24;
    const cwid = W / 2 - 0.2;
    let mh = 0;
    sp.columns.forEach((c, i) => {
      const h = itemsHeight(c, 14, cwid);
      mh = Math.max(mh, h);
      s.addText(runsFor(c, 14), { x: M + i * (cwid + 0.4), y, w: cwid, h, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT });
    });
    y += mh;
  }
  if (sp.after) y = para(s, sp.after, y + 0.24);
  if (sp.source) noteLine(s, sp.source);
  checkBottom(y, "code");
  footer(s);
}
// ---- predict: вопрос + ответ ----
function optionsLayout(opts, en = null) {
  const lim = en && en.some((e) => e) ? 42 : 26;   // с английскими строками две колонки экономят высоту
  return opts.length >= 3 && opts.every((o) => mplain(o).length <= lim) ? 2 : 1;
}
// en: необязательный массив английских вариантов (строка под русской, мельче и приглушённо)
const EN_DFS = 2;
function enOf(en, i, o) { return en && en[i] && en[i] !== o ? en[i] : null; }
function optH(o, e, fs, w) { return textHeight("A. " + o, fs, w) + (e ? textHeight(e, fs - EN_DFS, w) + 2 / 72 : 0) + 7 / 72; }
function optRuns(o, e, idx, fs, hi) {
  const L = "ABCDEF";
  const col = idx === hi ? C.accent : C.body;
  const r = [{ text: L[idx] + ". ", options: { bold: true, color: idx === hi ? C.accent : C.ink, fontFace: FONT, fontSize: fs } }, ...inline(o, fs, col)];
  r[0].options.paraSpaceAfter = e ? 2 : 7;
  r[r.length - 1].options.breakLine = true;
  if (e) {
    const er = inline(e, fs - EN_DFS, idx === hi ? C.accent : C.muted);
    er[0].options.paraSpaceAfter = 7;
    er[er.length - 1].options.breakLine = true;
    r.push(...er);
  }
  return r;
}
function drawOptions(s, opts, y, fs, hi = -1, en = null) {
  const cols = optionsLayout(opts, en);
  if (cols === 2) {
    const half = Math.ceil(opts.length / 2), cwid = W / 2 - 0.1;
    let mh = 0;
    [opts.slice(0, half), opts.slice(half)].forEach((grp, gi) => {
      const runs = [];
      let h = 0;
      grp.forEach((o, i) => {
        const idx = gi * half + i, e = enOf(en, idx, o);
        runs.push(...optRuns(o, e, idx, fs, hi));
        h += optH(o, e, fs, cwid);
      });
      s.addText(runs, { x: M + gi * (cwid + 0.2), y, w: cwid, h, margin: 0, valign: "top", lineSpacingMultiple: 1.28, fontFace: FONT });
      mh = Math.max(mh, h);
    });
    return y + mh;
  }
  const runs = [];
  let h = 0;
  opts.forEach((o, i) => {
    const e = enOf(en, i, o);
    runs.push(...optRuns(o, e, i, fs, hi));
    h += optH(o, e, fs, W);
  });
  s.addText(runs, { x: M, y, w: W, h, margin: 0, valign: "top", lineSpacingMultiple: 1.28, fontFace: FONT });
  return y + h;
}
function optionsHeight(opts, fs, en = null) {
  const cols = optionsLayout(opts, en);
  if (cols === 2) { const half = Math.ceil(opts.length / 2); return Math.max(...[opts.slice(0, half), opts.slice(half)].map((g, gi) => g.reduce((a, o, i) => a + optH(o, enOf(en, gi * half + i, o), fs, W / 2 - 0.1), 0))); }
  return opts.reduce((a, o, i) => a + optH(o, enOf(en, i, o), fs, W), 0);
}
// Steps of click animation for slides that reveal content in several clicks:
// ANIM[slideNo] = [[from, to], ...] - object index ranges (0 = title) shown on successive clicks.
const ANIM = {};
function predictSlide(sp) {
  if (sp.only === "q") return predictQuestion(sp);
  if (sp.only === "a") return predictAnswer(sp);
  // In-lecture question: always two pages, in both versions. The question page comes first,
  // the answer page follows («Вопрос: X» -> «Ответ: X»), so the answer is never visible
  // while the audience is still thinking.
  predictQuestion(sp);
  predictAnswer({ ...sp, answerTitle: sp.answerTitle || (sp.title || "").replace(/^Вопрос:/, "Ответ:") });
}
function predictQuestion(sp) {
  const s1 = newSlide();
  let y = addTitle(s1, sp.title);
  if (!sp.noPill) { y -= 0.06; pill(s1, sp.voteLabel || "Вопрос", M, y, { bg: C.accent2 }); y += 0.46; }
  if (sp.question) y = para(s1, sp.question, y) + (sp.questionEn ? 0.06 : 0.2);
  if (sp.questionEn) y = para(s1, sp.questionEn, y, { fs: 14, color: C.muted }) + 0.2;
  let fsOpt = 16;
  if (sp.code) {
    const below = sp.options ? optionsHeight(sp.options, 16, sp.optionsEn) + 0.24 : 0;
    // quiz code is read from the back row in 30 seconds: never below 11 pt
    const minCode = sp.quiz ? 11 : 9;
    const fsz = sp.fs || fitCode(sp.code, BOTTOM - y - below, minCode, 14, sp.lang || "bash");
    y = drawCodeBlock(s1, sp.code, sp.lang || "bash", y, fsz) + 0.24;
  }
  if (sp.options) { while (y + optionsHeight(sp.options, fsOpt, sp.optionsEn) > BOTTOM && fsOpt > 14) fsOpt--; y = drawOptions(s1, sp.options, y, fsOpt, -1, sp.optionsEn); }
  if (sp.hint) y = para(s1, sp.hint, Math.max(y + 0.1, y), { fs: 13, color: C.muted });
  checkBottom(y, "predict-q");
  footer(s1);
}
function predictAnswer(sp) {
  const s2 = newSlide();
  let y = addTitle(s2, sp.answerTitle || sp.title);
  if (sp.options) {
    // повтор вариантов, верный выделен
    const m = sp.answer.match(/^\*\*([A-F])\./);
    const k = m ? "ABCDEF".indexOf(m[1]) : -1;
    const opts = sp.options.map((o, i) => (i === k ? "**" + o.replace(/\*\*/g, "") + "**" : o));
    // на слайде ответа английский показываем только у верного варианта
    const enA = sp.optionsEn ? sp.optionsEn.map((e, i) => (i === k && e !== sp.options[i] ? e : null)) : null;
    y = drawOptions(s2, opts, y, 15, k, enA) + 0.16;
  }
  const iw = W - 0.72;
  let afs = 16;
  const ansH = (f) => 0.26 + 0.28 + 0.14 + textHeight(sp.answer, f, iw) + (sp.answerEn ? textHeight(sp.answerEn, f - EN_DFS, iw) + 0.08 : 0) + (sp.answerItems ? itemsHeight(sp.answerItems, f, iw) + 0.06 : 0) + 0.24;
  let codeH = 0, fsz = 0;
  if (sp.code && sp.showCodeInAnswer !== false && !sp.options) {
    fsz = sp.fs || fitCode(sp.code, BOTTOM - y - ansH(16) - 0.24, 9, 14, sp.lang || "bash");
    codeH = codeMetrics(sp.code, fsz, sp.lang || "bash").h + 0.48 + 0.24;
    // code repeated below 10.5 pt is unreadable: the answer page then shows only the answer
    // (the code is on the question page right before it); showCodeInAnswer: true forces it
    if (fsz < 10.5 && sp.showCodeInAnswer !== true && !sp.fs) { codeH = 0; fsz = 0; }
  }
  while (y + codeH + ansH(afs) > BOTTOM && afs > 14) afs--;
  if (codeH) y = drawCodeBlock(s2, sp.code, sp.lang || "bash", y, fsz) + 0.24;
  const ch = ansH(afs);
  card(s2, M, y, W, ch);
  pill(s2, sp.answerLabel || "Ответ", M + 0.36, y + 0.26);
  let yy = y + 0.68;
  const th = textHeight(sp.answer, afs, iw);
  s2.addText(inline(sp.answer, afs), { x: M + 0.36, y: yy, w: iw, h: th, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT });
  yy += th;
  if (sp.answerEn) { const eh = textHeight(sp.answerEn, afs - EN_DFS, iw); s2.addText(inline(sp.answerEn, afs - EN_DFS, C.muted), { x: M + 0.36, y: yy + 0.08, w: iw, h: eh, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT }); yy += eh + 0.08; }
  if (sp.answerItems) { const h = itemsHeight(sp.answerItems, afs, iw); s2.addText(runsFor(sp.answerItems, afs, { numbered: !!sp.answerNumbered }), { x: M + 0.36, y: yy + 0.06, w: iw, h, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT }); }
  y += ch;
  if (sp.after) y = para(s2, sp.after, y + 0.2, { fs: 14 });
  checkBottom(y, "predict-a");
  footer(s2);
}


function codePairSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.2;
  const gap = 0.36, cw = (W - gap) / 2, pad = 0.22, iw = cw - 2 * pad;
  const cols = [sp.left, sp.right];
  const capFs = sp.capFs || 14;
  const afterH = sp.after ? textHeight(sp.after, 16, W) + 0.24 : 0;
  const capH = (c) => (c.text && c.code ? textHeight(c.text, capFs, cw) + 0.14 : 0);
  const pillH = cols.some((c) => c.label) ? 0.4 : 0;
  const availCode = BOTTOM - y - afterH - pillH - Math.max(...cols.map(capH));
  let fs = sp.fs || 12;
  const langOf = (c) => c.lang || sp.lang || "php";
  const fitsC = (c, f) => { if (!c.code) return true; const m = codeMetrics(c.code, f, langOf(c)); return m.w <= iw && m.h + 2 * pad <= availCode; };
  if (!sp.fs) while (fs > 8 && !cols.every((c) => fitsC(c, fs))) fs -= 0.5;
  // text-only column height
  const tfs = sp.textFs || 15;
  const txtH = (c) => (c.items ? itemsHeight(c.items, tfs, cw - 0.5, c.bullet !== false) : 0) + (c.text && !c.code ? textHeight(c.text, tfs, cw - 0.5) : 0) + 0.4;
  const boxH = Math.max(...cols.map((c) => (c.code ? codeMetrics(c.code, fs, langOf(c)).h + 2 * pad : txtH(c))));
  let yEnd = y;
  cols.forEach((c, i) => {
    const x = M + i * (cw + gap);
    let yy = y;
    if (c.label) { pill(s, c.label, x, yy, { bg: c.pillColor || (i === 0 ? (sp.leftColor || C.accent) : (sp.rightColor || C.accent2)) }); yy += 0.4; }
    if (c.code) {
      const m = codeMetrics(c.code, fs, langOf(c));
      card(s, x, yy, cw, boxH, C.codeBg);
      s.addText(highlight(c.code, fs, c.lang || sp.lang || "php"), { x: x + pad, y: yy + pad, w: iw + 0.1, h: m.h, margin: 0, valign: "top", lineSpacingMultiple: 1.1, fontFace: MONO });
      if (m.w > iw) warn("код шире колонки");
      yy += boxH;
      if (c.text) { yy += 0.14; yy = para(s, c.text, yy, { fs: capFs, x, w: cw }); }
    } else {
      card(s, x, yy, cw, boxH, i === 0 ? C.surface : C.surface2);
      let ty = yy + 0.2;
      if (c.text) { const th = textHeight(c.text, tfs, cw - 0.5); s.addText(inline(c.text, tfs), { x: x + 0.25, y: ty, w: cw - 0.5, h: th, margin: 0, valign: "top", lineSpacingMultiple: 1.3, fontFace: FONT }); ty += th + 0.08; }
      if (c.items) s.addText(runsFor(c.items, tfs, { bullet: c.bullet !== false }), { x: x + 0.25, y: ty, w: cw - 0.5, h: itemsHeight(c.items, tfs, cw - 0.5, c.bullet !== false), margin: 0, valign: "top", lineSpacingMultiple: 1.28, fontFace: FONT });
      yy += boxH;
    }
    yEnd = Math.max(yEnd, yy);
  });
  y = yEnd;
  if (sp.after) y = para(s, sp.after, y + 0.24);
  if (sp.source) noteLine(s, sp.source);
  checkBottom(y, "codepair");
  footer(s);
}

const RENDER = {
  codepair: codePairSlide,
  title: titleSlide, section: sectionSlide, bullets: bulletsSlide, def: defSlide, alert: alertSlide, image: imageSlide,
  table: tableSlide, tablebuild: tableBuildSlide, compare: compareSlide,
  statement: statementSlide, refs: refsSlide, code: codeSlide, predict: predictSlide, handson: handsonSlide,
};

function build(contentFile, out) {
  const content = require(path.resolve(contentFile));
  LECTURE = content.lecture || 0;
  (content.keywords || []).forEach((k) => KEYWORDS.add(k));   // доп. ключевые слова подсветки
  pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";
  pptx.title = content.title || "";
  pptx.author = "Nartea N.";
  for (const sp of content.slides) {
    const fn = RENDER[sp.type];
    if (!fn) throw new Error("unknown type " + sp.type);
    curType = sp.type;
    LN_ON = sp.lineNumbers !== false;
    if (sp.setPart !== undefined) currentPart = sp.setPart;
    fn(sp);
  }
  warnings.forEach((w) => console.log("WARN", w));
  console.log("slides:", counter);
  const noAnim = kinds.map((k, i) => (["title", "section", "statement", "handson"].includes(k) ? i + 1 : 0)).filter(Boolean);
  fs.writeFileSync(out + ".noanim", noAnim.join(","));
  fs.writeFileSync(out + ".anim.json", JSON.stringify(ANIM));
  return pptx.writeFile({ fileName: out });
}
if (require.main === module) build(process.argv[2], process.argv[3]);
