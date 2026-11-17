/* Интерактивные стенды, общие для обеих презентаций.
   Стенд монтируется на элемент с data-stand="имя"; данные лежат в DATA (data.js).
   У каждого стенда есть короткая инструкция: что сделать и на что смотреть. */
(function () {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (x, d = 2) => x.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
const hex7 = () => [...Array(7)].map(() => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
const md = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
const task = (todo) => h("p", { class: "task", html: md(todo) });
let uid = 0; const nid = (p) => `${p}-${++uid}`;

/* ---------- score (используется в версии для студентов) ---------- */
const Score = {
  items: new Map(),
  reg(id) { if (!this.items.has(id)) this.items.set(id, { ok: null }); this.emit(); },
  set(id, ok) { const it = this.items.get(id); if (!it || it.ok !== null) return false; it.ok = ok; this.emit(); return true; },
  stats(filter) { let all = 0, done = 0, ok = 0; for (const [k, v] of this.items) { if (filter && !filter(k)) continue; all++; if (v.ok !== null) done++; if (v.ok) ok++; } return { all, done, ok }; },
  emit() { document.dispatchEvent(new CustomEvent("score")); },
};
window.Score = Score;

/* ---------- generic: classify items into buckets ---------- */
function classify(el, d, id) {
  const wrap = h("div");
  if (d.intro) wrap.append(h("p", { class: "lbl", style: "margin:0 0 6px", html: md(d.intro) }));
  const res = h("span", { class: "pill" }, "");
  const upd = () => { const s = Score.stats((k) => k.startsWith(id + ":")); res.textContent = `разобрано ${s.done} из ${s.all}, верно ${s.ok}`; };
  wrap.append(h("div", { style: "margin-bottom:4px" }, res));
  d.items.forEach((it, n) => {
    const [text, right, why] = it;
    const qid = `${id}:${n}`;
    Score.reg(qid);
    const row = h("div", { class: "cls-item" });
    const btns = h("div", { class: "cls-btns" });
    const whyEl = h("div", { class: "why", hidden: true, html: md(why || "") });
    d.buckets.forEach((b, j) => {
      btns.append(h("button", { class: "btn", type: "button", onclick: () => {
        if (row.dataset.done) return;
        row.dataset.done = 1;
        const ok = j === right;
        Score.set(qid, ok);
        row.classList.add(ok ? "ok" : "no");
        $$("button", btns).forEach((x, k) => { x.disabled = true; if (k === right) x.classList.add("ok"); else if (k === j) x.classList.add("no"); });
        whyEl.hidden = !why;
        upd();
      } }, b));
    });
    row.append(h("div", { class: "txt", html: md(text) }), btns, whyEl);
    wrap.append(row);
  });
  upd();
  el.append(wrap);
}

/* ---------- generic: code with clickable lines ---------- */
function hl(code) {
  let s = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/("[^"]*")/g, '<span class="s">$1</span>');
  s = s.replace(/^(\s*)(FROM|WORKDIR|COPY|RUN|ENV|EXPOSE|CMD|resource|provider|aws|docker|process\.on|const|if)\b/, '$1<span class="k">$2</span>');
  return s || " ";
}
function codeNotes(el, d) {
  const pre = h("pre", { class: "code clickable" });
  const note = h("div", { class: "note", style: "margin-top:10px" });
  const lines = d.lines.map(([code, txt]) => {
    const ln = h("span", { class: "ln", tabindex: txt ? "0" : null, html: hl(code) });
    if (txt) {
      const pick = () => { lines.forEach((x) => x.classList.remove("sel")); ln.classList.add("sel"); note.innerHTML = md(txt); };
      ln.addEventListener("click", pick);
      ln.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); pick(); } });
    } else ln.classList.add("dim");
    pre.append(ln);
    return ln;
  });
  note.innerHTML = md(d.hint || "Нажмите на строку, чтобы увидеть пояснение.");
  el.append(pre, note);
}

/* ---------- generic: command token explainer ---------- */
function cmdNotes(el, d) {
  const line = h("div", { class: "cmd" });
  const note = h("div", { class: "note", style: "margin-top:8px" });
  const toks = [];
  d.tokens.forEach((t) => {
    if (typeof t === "string") { line.append(t); return; }
    const sp = h("span", { class: "tok", tabindex: "0" }, t[0]);
    const pick = () => { toks.forEach((x) => x.classList.remove("sel")); sp.classList.add("sel"); note.innerHTML = md(t[1]); };
    sp.addEventListener("click", pick);
    sp.addEventListener("keydown", (e) => { if (e.key === "Enter") pick(); });
    toks.push(sp);
    line.append(sp);
  });
  note.innerHTML = md(d.hint || "Нажмите на часть команды.");
  el.append(line, note);
}

/* ======================================================================
   Custom stands
   ====================================================================== */
const S = {};

/* Пример стенда темы. Инструкция одной строкой через task(), текста минимум.
   Таймеры и циклы запускаются только на активном слайде: onActive(el, start, stop). */
S.counter = (el) => {
  let n = 2;
  const out = h("span", { class: "pill r" }, "задач: 2");
  const set = (d) => { n = Math.max(0, Math.min(6, n + d)); out.textContent = "задач: " + n; };
  el.append(task("Нажмите «+» и «−» и посмотрите на число задач."),
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => set(-1) }, "−"), out, h("button", { class: "btn", type: "button", onclick: () => set(1) }, "+")));
};

/* ---------- таймеры только на активном слайде ---------- */
function onActive(el, start, stop) {
  const sl = el.closest(".slide");
  const io = new MutationObserver(() => (sl.classList.contains("active") ? start() : stop()));
  io.observe(sl, { attributes: true, attributeFilter: ["class"] });
  if (sl.classList.contains("active")) start();
}

/* ---------- mount ---------- */
function mountAll(root = document) {
  $$("[data-stand]", root).forEach((el) => {
    if (el.dataset.mounted) return; el.dataset.mounted = 1;
    const name = el.dataset.stand, id = el.dataset.id;
    try {
      if (name === "classify") classify(el, DATA.cls[id], id);
      else if (name === "code") codeNotes(el, DATA.code[id]);
      else if (name === "cmd") cmdNotes(el, DATA.cmd[id]);
      else S[name](el);
    } catch (e) { console.error("stand", name, id, e); el.append(h("div", { class: "note" }, "Стенд не загрузился: " + e.message)); }
  });
}
window.Stands = { mountAll, h, md, $, $$, sleep, onActive };
})();
