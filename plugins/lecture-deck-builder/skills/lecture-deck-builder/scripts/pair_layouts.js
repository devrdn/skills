// Макеты версии для пары: cards, steps, stats, versus. Вставляются в build_modern.js перед RENDER.
const lvAccent = (i) => (i % 2 ? C.accent2 : C.accent);
function longestWord(text, fs, bold) {
  let mx = 0;
  for (const seg of parseInline(text)) for (const wd of seg.t.split(/\s+/)) mx = Math.max(mx, segWidth(wd, { b: bold || seg.b, m: seg.m }, fs));
  return mx;
}
function cardsSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.18;
  const n = sp.cards.length;
  const afterH = sp.after ? textHeight(sp.after, 15, W) + 0.3 : 0;
  const cols = sp.cols || (n <= 3 ? n : n === 4 ? 2 : 3);
  const rows = Math.ceil(n / cols);
  const gx = 0.26, gy = 0.22;
  const avail = BOTTOM - y - afterH;
  const rowsCells = [];
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, n - r * cols);
    const cw = (W - gx * (inRow - 1)) / inRow;
    rowsCells.push({ inRow, cw, idx: [...Array(inRow).keys()].map((c) => r * cols + c) });
  }
  const need = (cd, w, f) => {
    const iw = w - 0.75;
    return 0.22 + (cd.label ? 0.34 : 0) + (cd.title ? textHeight(cd.title, f + 1, iw, 1.3) + 0.04 : 0) + (cd.text ? textHeight(cd.text, f - 1, iw, 1.3) : 0) + 0.2;
  };
  const wordsFit = (f) => rowsCells.every((R) => R.idx.every((i) => { const cd = sp.cards[i]; const iw = R.cw - 0.5;
    return (!cd.title || longestWord(cd.title, f + 1, true) <= iw) && (!cd.text || longestWord(cd.text, f - 1, false) <= iw); }));
  const rowH = (f) => rowsCells.map((R) => Math.max(sp.minH || 0, ...R.idx.map((i) => need(sp.cards[i], R.cw, f))));
  let fs = sp.fs || 17;
  while (fs > 12 && (!wordsFit(fs) || rowH(fs).reduce((a, b) => a + b, 0) + gy * (rows - 1) > avail)) fs -= 0.5;
  const hs = rowH(fs);
  let yy0 = y;
  rowsCells.forEach((R, r) => {
    R.idx.forEach((i, c) => {
      const cd = sp.cards[i];
      const L = { x: M + c * (R.cw + gx), y: yy0, w: R.cw, h: hs[r] };
      const col = cd.color || (sp.mono ? C.accent : lvAccent(i));
      card(s, L.x, L.y, L.w, L.h, i % 2 ? C.surface2 : C.surface);
      s.addShape(pptx.shapes.RECTANGLE, { x: L.x, y: L.y + 0.16, w: 0.06, h: L.h - 0.32, fill: { color: col }, line: { color: col, width: 0 } });
      const iw = L.w - 0.5;
      let yy = L.y + 0.22;
      if (cd.label) {
        s.addText(cd.label.toUpperCase(), { x: L.x + 0.28, y: yy, w: iw, h: 0.26, margin: 0, valign: "middle", fontFace: FONT, fontSize: 10.5, bold: true, color: col, charSpacing: 1.2 });
        yy += 0.34;
      }
      if (cd.title) {
        const th = textHeight(cd.title, fs + 1, iw - 0.25, 1.3);
        s.addText(inline(cd.title, fs + 1, C.ink, { bold: true }), { x: L.x + 0.28, y: yy, w: iw, h: th, margin: 0, valign: "top", lineSpacingMultiple: 1.2, fontFace: FONT });
        yy += th + 0.04;
      }
      if (cd.text) {
        const th = textHeight(cd.text, fs - 1, iw - 0.25, 1.3);
        s.addText(inline(cd.text, fs - 1, C.body), { x: L.x + 0.28, y: yy, w: iw, h: th, margin: 0, valign: "top", lineSpacingMultiple: 1.25, fontFace: FONT });
      }
    });
    yy0 += hs[r] + gy;
  });
  y = yy0 - gy;
  if (!wordsFit(fs)) warn("слово не помещается в карточку");
  if (sp.after) y = para(s, sp.after, y + 0.22, { fs: 15 });
  checkBottom(y, "cards");
  footer(s);
}
// шаги процесса: [{ title, text }]
function stepsSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.22;
  const n = sp.steps.length;
  const sw = W / n, d = 0.56;
  const cy = y + d / 2;
  s.addShape(pptx.shapes.LINE, { x: M + sw / 2, y: cy, w: W - sw, h: 0, line: { color: "C7CAD6", width: 2, dashType: "dash" } });
  let maxY = y;
  const afterH = sp.after ? textHeight(sp.after, 15, W) + 0.24 : 0;
  let fs = 15;
  const iw = sw - 0.22;
  const colH = (st, f) => (st.title ? textHeight(st.title, f, iw, 1.15) + 0.06 : 0) + (st.text ? textHeight(st.text, f - 1.5, iw, 1.25) : 0);
  while (fs > 12 && y + d + 0.2 + Math.max(...sp.steps.map((st) => colH(st, fs))) + 0.36 > BOTTOM - afterH) fs -= 0.5;
  const boxH = Math.max(...sp.steps.map((st) => colH(st, fs))) + 0.36;
  sp.steps.forEach((st, i) => {
    const cx = M + i * sw + sw / 2;
    const col = st.color || (i === n - 1 && sp.lastAccent ? C.accent2 : C.accent);
    s.addShape(pptx.shapes.OVAL, { x: cx - d / 2, y, w: d, h: d, fill: { color: col }, line: { color: "FFFFFF", width: 3 } });
    s.addText(String(st.n || i + 1), { x: cx - d / 2, y, w: d, h: d, margin: 0, align: "center", valign: "middle", fontFace: FONT, fontSize: 17, bold: true, color: "FFFFFF" });
    const bx = M + i * sw + 0.06, by = y + d + 0.2;
    card(s, bx, by, sw - 0.12, boxH, i % 2 ? C.surface2 : C.surface);
    let yy = by + 0.18;
    if (st.title) { const th = textHeight(st.title, fs, iw, 1.15); s.addText(inline(st.title, fs, C.ink, { bold: true }), { x: bx + 0.1, y: yy, w: iw, h: th, margin: 0, align: "center", valign: "top", lineSpacingMultiple: 1.15, fontFace: FONT }); yy += th + 0.06; }
    if (st.text) { const th = textHeight(st.text, fs - 1.5, iw, 1.25); s.addText(inline(st.text, fs - 1.5, C.body), { x: bx + 0.1, y: yy, w: iw, h: th, margin: 0, align: "center", valign: "top", lineSpacingMultiple: 1.25, fontFace: FONT }); }
    maxY = Math.max(maxY, by + boxH);
  });
  y = maxY;
  if (sp.after) y = para(s, sp.after, y + 0.24, { fs: 15 });
  checkBottom(y, "steps");
  footer(s);
}
// крупные цифры: [{ value, label, text }]
function statsSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.22;
  const n = sp.stats.length;
  const cols = sp.cols || (n <= 4 ? n : 3);
  const rows = Math.ceil(n / cols);
  const gx = 0.24, gy = 0.22;
  const afterH = sp.after ? textHeight(sp.after, 15, W) + 0.24 : 0;
  const maxH = (BOTTOM - y - afterH - gy * (rows - 1)) / rows;
  const tw = (W - gx * (cols - 1)) / cols;
  const iw = tw - 0.4;
  const vfs = sp.valueFs || (cols >= 4 ? 28 : 32);
  const need = Math.max(...sp.stats.map((st) => 0.22 + vfs * 1.25 / 72 + 0.08 + (st.label ? textHeight(st.label, 14, iw, 1.15) + 0.04 : 0) + (st.text ? textHeight(st.text, 12.5, iw, 1.25) : 0) + 0.2));
  const th = Math.min(maxH, Math.max(need, sp.minH || 1.5));
  if (need > maxH) warn("цифры не помещаются");
  sp.stats.forEach((st, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const inRow = Math.min(cols, n - r * cols);
    const w = (W - gx * (inRow - 1)) / inRow;
    const x = M + c * (w + gx), yy0 = y + r * (th + gy);
    const col = st.color || lvAccent(i);
    card(s, x, yy0, w, th, i % 2 ? C.surface2 : C.surface);
    let yy = yy0 + 0.2;
    s.addText(inline(st.value, vfs, col, { bold: true, monoColor: col }), { x: x + 0.22, y: yy, w: w - 0.4, h: vfs * 1.25 / 72, margin: 0, valign: "middle", fontFace: FONT, charSpacing: -0.5 });
    yy += vfs * 1.25 / 72 + 0.08;
    if (st.label) { const h = textHeight(st.label, 14, w - 0.4, 1.15); s.addText(inline(st.label, 14, C.ink, { bold: true }), { x: x + 0.22, y: yy, w: w - 0.4, h, margin: 0, valign: "top", lineSpacingMultiple: 1.15, fontFace: FONT }); yy += h + 0.04; }
    if (st.text) { const h = textHeight(st.text, 12.5, w - 0.4, 1.25); s.addText(inline(st.text, 12.5, C.body), { x: x + 0.22, y: yy, w: w - 0.4, h, margin: 0, valign: "top", lineSpacingMultiple: 1.25, fontFace: FONT }); }
  });
  y = y + rows * th + (rows - 1) * gy;
  if (sp.after) y = para(s, sp.after, y + 0.24, { fs: 15 });
  checkBottom(y, "stats");
  footer(s);
}
// две колонки с заголовками-плашками и выровненными строками: rows [[label, left, right]]
function versusSlide(sp) {
  const s = newSlide();
  let y = addTitle(s, sp.title);
  if (sp.intro) y = para(s, sp.intro, y) + 0.2;
  const lw = sp.labelW || 1.9, gap = 0.18;
  const cw = (W - lw - 2 * gap) / 2;
  const xL = M + lw + gap, xR = xL + cw + gap;
  const hh = 0.5;
  [[sp.left, xL, C.accent], [sp.right, xR, C.accent2]].forEach(([t, x, col]) => {
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: hh, fill: { color: col }, line: { color: col, width: 0 }, rectRadius: 0.08 });
    s.addText(inline(t, 16, "FFFFFF", { bold: true, monoColor: "FFFFFF" }), { x, y, w: cw, h: hh, margin: 0, align: "center", valign: "middle", fontFace: FONT });
  });
  y += hh + 0.1;
  const afterH = sp.after ? textHeight(sp.after, 15, W) + 0.22 : 0;
  let fs = 14.5;
  const rowH = (r, f) => Math.max(textHeight(r[0], f - 1, lw - 0.1, 1.15), textHeight(r[1], f, cw - 0.3, 1.2), textHeight(r[2], f, cw - 0.3, 1.2)) + 0.2;
  while (fs > 12 && sp.rows.reduce((a, r) => a + rowH(r, fs) + 0.06, 0) > BOTTOM - y - afterH - 0.08) fs -= 0.5;
  sp.rows.forEach((r, i) => {
    const h = rowH(r, fs);
    s.addText(inline(r[0], fs - 1, C.muted, { bold: true }), { x: M, y, w: lw, h, margin: 0, valign: "middle", fontFace: FONT, lineSpacingMultiple: 1.15 });
    [[r[1], xL, C.surface], [r[2], xR, C.surface2]].forEach(([t, x, bg]) => {
      card(s, x, y, cw, h, bg);
      s.addText(inline(t, fs, C.body), { x: x + 0.15, y, w: cw - 0.3, h, margin: 0, align: "center", valign: "middle", fontFace: FONT, lineSpacingMultiple: 1.2 });
    });
    y += h + 0.06;
  });
  if (sp.after) y = para(s, sp.after, y + 0.16, { fs: 15 });
  checkBottom(y, "versus");
  footer(s);
}
