(function () {
"use strict";
const { $, $$, h, md, mountAll } = window.Stands;
const Score = window.Score;
const CFG = window.DECK || { mode: "pair", design: "brand", id: "deck" };
const STUDENT = CFG.mode === "student";
const L = "АБВГ";
const root = document.documentElement;
document.querySelector(".app")?.classList.add("design-" + CFG.design);

/* ---------- генерация ----------
   <div class="stack" data-gen="series" data-key="factors"></div>: длинный список по одному пункту на шаг.
   DATA.series.factors = { title, hint, note, items: [{ k, name, rule, text, ex }] }. */
$$('[data-gen="series"]').forEach((box) => {
  const d = DATA.series[box.dataset.key], n = d.items.length;
  /* пустой <div class="list"> рядом заполняется оглавлением: пройденные пункты отмечены, текущий выделен */
  const list = box.parentElement.querySelector(".list");
  if (list && !list.children.length) d.items.forEach((it, i) => list.append(h("div", { class: "it", "data-on": String(i + 1), "data-cur": String(i + 1) }, h("span", { class: "k" }, it.k || String(i + 1)), it.name || it.rule)));
  box.append(h("div", { class: "pf", "data-out": "1" }, h("div", { class: "rule" }, d.title), h("p", null, d.hint || "Нажимайте →, чтобы пройти пункты по одному."), d.note ? h("p", { class: "ex" }, d.note) : null));
  d.items.forEach((it, i) => {
    const attrs = { class: "pf", "data-in": String(i + 1) };
    if (i < n - 1) attrs["data-out"] = String(i + 2);
    box.append(h("div", attrs, h("div", null, h("span", { class: "k" }, it.k || String(i + 1)), " ", it.name ? h("span", { class: "en" }, it.name) : null), h("div", { class: "rule" }, it.rule), it.text ? h("p", { html: md(it.text) }) : null, it.ex ? h("p", { class: "ex", html: "Пример: " + md(it.ex) }) : null));
  });
});
const qSlide = (id, t, sec, kick) => h("section", { class: "slide s-q", "data-sec": sec, "data-q": id, "data-t": t, "data-kick": kick });
$$('[data-gen="mistakes"]').forEach((m) => {
  const frag = DATA.mistakes.map((d, i) => {
    const s = h("section", { class: "slide", "data-sec": m.dataset.sec || "0" });
    s.append(h("h2", null, `Ошибка ${i + 1}: ${d.t}`), h("p", { class: "intro", html: md(d.q) }));
    const g = h("div", { class: "grow" });
    if (d.code) g.append(h("pre", { class: "code" }, ...d.code.split("\n").map((l, j) => h("span", { class: "ln" + (j + 1 === d.bad ? " bad" : "") }, l))));
    g.append(h("p", { class: "qhint", "data-out": "1" }, "Найдите ошибку и нажмите →, чтобы увидеть ответ."), h("p", { class: "qexp", "data-in": "1", html: md(d.a) }));
    s.append(g);
    return s;
  });
  m.replaceWith(...frag);
});
$$('[data-gen="final"]').forEach((m) => {
  const n = Object.keys(DATA.q).filter((k) => /^f\d+$/.test(k)).length;
  m.replaceWith(...Array.from({ length: n }, (_, i) => qSlide("f" + (i + 1), "", m.dataset.sec || "0", `Проверьте себя · вопрос ${i + 1} из ${n}`)));
});

/* ---------- вопросы: клик по варианту показывает ответ ---------- */
const buildQ = (s) => {
  const id = s.dataset.q, d = DATA.q[id];
  s.innerHTML = "";
  s.classList.remove("done");
  s.classList.add("qs");
  if (STUDENT) Score.reg(id);
  s.append(h("div", { class: "qkick" }, s.dataset.kick || "Вопрос"));
  if (s.dataset.t) s.append(h("h2", null, "Вопрос: " + s.dataset.t));
  const g = h("div", { class: "grow", style: "justify-content:flex-start;gap:14px" });
  g.append(h("p", { class: "qtext", html: md(d.q) }));
  if (d.code) g.append(h("pre", { class: "code" }, ...d.code.split("\n").map((l) => h("span", { class: "ln" }, l))));
  const opts = h("div", { class: "qopts" });
  const reveal = (picked) => {
    if (s.classList.contains("done")) return;
    s.classList.add("done");
    $$(".qopt", opts).forEach((b, i) => { if (i === d.a) b.classList.add("ok"); else if (i === picked) b.classList.add("no"); });
    if (STUDENT && picked != null) Score.set(id, picked === d.a);
    s.step = 1; applyStep(s);
  };
  s.reveal = reveal;
  d.opts.forEach((o, i) => opts.append(h("button", { class: "qopt", type: "button", onclick: () => reveal(i) }, h("span", { class: "lt" }, L[i]), h("span", { html: md(o) }))));
  g.append(opts, h("div", { class: "stack" }, h("p", { class: "qhint", "data-out": "1" }, "Нажмите на вариант, чтобы увидеть ответ."), h("p", { class: "qexp", "data-in": "1", html: md(d.exp) })));
  s.append(g);
};
$$(".slide.s-q").forEach(buildQ);

/* ---------- волна по стрелкам: точки в цепочке стартуют по очереди ---------- */
$$(".slide").forEach((sl) => $$(".link.flow > i", sl).forEach((pk, i) => { pk.style.animationDelay = `${(i * 0.32) % 1.9}s`; }));

/* ---------- шаги ---------- */
const slides = $$(".slide");
const nums = (el, a) => (el.getAttribute(a) || "").split(/\s+/).filter(Boolean).map(Number);
const stepEls = (s) => $$("[data-in],[data-out],[data-on],[data-cur]", s);
slides.forEach((s) => {
  s.step = 0;
  s.maxStep = Math.max(0, ...stepEls(s).flatMap((e) => [...nums(e, "data-in"), ...nums(e, "data-out").map((x) => x), ...nums(e, "data-on"), ...nums(e, "data-cur")]));
  if (s.classList.contains("s-q")) s.maxStep = 1;
});
function applyStep(s) {
  const k = s.step;
  stepEls(s).forEach((e) => {
    const i = e.dataset.in != null ? +e.dataset.in : null, o = e.dataset.out != null ? +e.dataset.out : null;
    const vis = (i == null || k >= i) && (o == null || k < o);
    if (e.dataset.in != null || e.dataset.out != null) e.classList.toggle("hid", !vis);
    /* data-on="1" - включён с шага 1; data-on="1 3" - включён на шагах 1 и 2, с шага 3 снова выключен */
    if (e.dataset.on != null) { const [a, b] = nums(e, "data-on"); e.classList.toggle("on", k >= a && (b == null || k < b)); }
    if (e.dataset.cur != null) e.classList.toggle("cur", k === +e.dataset.cur);
  });
  if (s.classList.contains("s-q") && k >= 1 && !s.classList.contains("done")) s.reveal(null);
  const st = s.querySelector(".stepper");
  if (st) { st.querySelector(".k").textContent = k; $$(".dots i", st).forEach((d, j) => d.classList.toggle("on", j < k)); }
}

/* ---------- нижняя строка ---------- */
let secName = "", secNo = 0;
const SECS = $$(".slide.s-div").length;
slides.forEach((s, i) => {
  if (s.classList.contains("s-div")) { secNo = +s.dataset.sec; secName = s.dataset.name || ""; }
  if (+s.dataset.sec === 0) { secName = ""; secNo = 0; }
  const f = h("div", { class: "foot" });
  if (s.matches(".s-div,.s-key,.s-hands")) f.classList.add("on-dark");
  f.append(h("span", { class: "sec" }, secName && !s.classList.contains("s-div") ? `${String(secNo).padStart(2, "0")}. ${secName}` : ""));
  const tr = h("div", { class: "track" }); for (let k = 1; k <= SECS; k++) tr.append(h("i", { class: k < (+s.dataset.sec || 0) ? "done" : k === +s.dataset.sec ? "cur" : "" })); f.append(tr);
  if (s.maxStep > 0 && !s.classList.contains("s-q")) {
    const dots = h("span", { class: "dots" }, ...Array.from({ length: s.maxStep }, () => h("i")));
    f.append(h("span", { class: "stepper" }, h("button", { type: "button", "aria-label": "Шаг назад", onclick: () => { if (s.step > 0) { s.step--; applyStep(s); } } }, "‹"), dots, h("span", null, "шаг ", h("span", { class: "k" }, "0"), " из " + s.maxStep), h("button", { type: "button", "aria-label": "Шаг вперёд", onclick: () => { if (s.step < s.maxStep) { s.step++; applyStep(s); } } }, "›")));
  }
  if (STUDENT) f.append(h("span", { class: "score" }, "верно ", h("b", { class: "sOk" }, "0"), " из ", h("span", { class: "sAll" }, "0")));
  f.append(h("span", { class: "num" }, String(i + 1)));
  if (!s.classList.contains("s-title")) s.append(f);
  applyStep(s);
});
const refreshScore = () => {
  const t = Score.stats();
  $$(".sOk").forEach((e) => (e.textContent = t.ok)); $$(".sAll").forEach((e) => (e.textContent = t.all));
  const f = Score.stats((k) => /^f\d+$/.test(k));
  const big = $("#resBig"), txt = $("#resText");
  if (big) {
    big.textContent = `${f.ok} из ${f.all}`;
    txt.textContent = f.done < f.all ? `Отвечено ${f.done} из ${f.all}. Вернитесь к пропущенным вопросам через список слайдов.` : f.ok >= Math.ceil(f.all * 0.8) ? "Хороший результат: основные идеи лекции усвоены." : "Перечитайте разделы, где были ошибки, и пройдите контрольную ещё раз.";
  }
};
document.addEventListener("score", refreshScore);
$("#resReset")?.addEventListener("click", () => {
  for (const [k, v] of Score.items) if (/^f\d+$/.test(k)) v.ok = null;
  slides.filter((s) => /^f\d+$/.test(s.dataset.q || "")).forEach((s) => { buildQ(s); s.step = 0; applyStep(s); });
  Score.emit();
  const first = slides.findIndex((s) => s.dataset.q === "f1"); if (first >= 0) show(first);
});

/* ---------- лента на телефоне ---------- */
const narrow = () => false; /* всегда режим презентации: слайд масштабируется под окно и фрейм Moodle */
let reflow = narrow();
const setReflow = () => { root.classList.toggle("reflow", reflow); if (reflow) { slides.forEach((s) => { mountAll(s); s.classList.add("active"); }); } };

/* ---------- навигация ---------- */
let cur = 0;
function show(n) {
  n = Math.max(0, Math.min(slides.length - 1, n));
  if (reflow) { slides[n].scrollIntoView({ behavior: "smooth" }); return; }
  slides[cur].classList.remove("active");
  cur = n;
  const s = slides[cur];
  void s.offsetWidth;
  s.classList.add("active");
  mountAll(s);
  if (s.classList.contains("result")) refreshScore();
  try { history.replaceState(null, "", "#s" + (cur + 1)); } catch (e) {}
  updNav();
  if (typeof lmsSlide === "function") lmsSlide();
}
const next = () => { const s = slides[cur]; if (s.step < s.maxStep) { s.step++; applyStep(s); return; } if (cur < slides.length - 1) { show(cur + 1); } };
const prev = () => { const s = slides[cur]; if (s.step > 0 && !s.classList.contains("s-q")) { s.step--; applyStep(s); return; } if (cur > 0) { show(cur - 1); const p = slides[cur]; if (!p.classList.contains("s-q")) { p.step = p.maxStep; applyStep(p); } } };
const typing = (el) => el && el.matches && el.matches("input,select,textarea");
document.addEventListener("keydown", (e) => {
  if (reflow || e.metaKey || e.ctrlKey || e.altKey) return;
  const a = document.activeElement;
  if (typing(a) && !["PageDown", "PageUp", "Escape"].includes(e.key)) return;
  const k = e.key;
  if (k === "ArrowRight" || k === "PageDown" || (k === " " && !(a && a.matches("button")))) { e.preventDefault(); a && a.blur && a.blur(); next(); }
  else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); prev(); }
  else if (k === "Home") show(0);
  else if (k === "End") show(slides.length - 1);
  else if ("oOщЩ".includes(k)) toggleOv();
  else if ("fFаА".includes(k)) fs();
  else if ("tTеЕ".includes(k)) theme();
  else if ("lLдД".includes(k)) setLite(!lite, true);
  else if (k === "Escape" && !$("#overview").hidden) toggleOv();
  updNav();
});
$("#bNext").onclick = next; $("#bPrev").onclick = prev;
function updNav() {
  const n = $("#navNum"); if (!n) return;
  n.textContent = cur + 1; $("#navAll").textContent = slides.length;
  $("#bPrev").disabled = cur === 0 && slides[cur].step === 0;
  $("#bNext").disabled = cur === slides.length - 1 && slides[cur].step >= slides[cur].maxStep;
}
["#bNext", "#bPrev"].forEach((id) => $(id).addEventListener("click", () => setTimeout(updNav)));
/* свайп на сенсорном экране */
let tx = null, ty = null;
$(".viewport").addEventListener("touchstart", (e) => { if (e.target.closest(".stand,button,input,select,a,.code,.cmd")) { tx = null; return; } tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
$(".viewport").addEventListener("touchend", (e) => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { dx < 0 ? next() : prev(); updNav(); } tx = null; }, { passive: true });
$("#rotateClose")?.addEventListener("click", () => $("#rotateHint").classList.add("closed"));

const ov = $("#overview"), ovg = $("#ovGrid");
function toggleOv() {
  if (ov.hidden) {
    ovg.innerHTML = "";
    slides.forEach((s, i) => {
      const t = (s.querySelector("h2,h1,blockquote,.qkick")?.textContent || "").trim();
      ovg.append(h("button", { type: "button", class: (s.classList.contains("s-div") ? "div " : "") + (i === cur ? "cur" : ""), onclick: () => { ov.hidden = true; show(i); } }, h("span", { class: "n" }, String(i + 1)), h("span", null, t.slice(0, 70))));
    });
    ov.hidden = false;
  } else ov.hidden = true;
}
$("#bOv").onclick = toggleOv;
function fs() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {} }
$("#bFs").onclick = fs;
let th = null;
try { th = localStorage.getItem(CFG.id + "-theme"); } catch (e) {}
const applyTheme = () => { if (CFG.design === "mine" && th) root.setAttribute("data-theme", th); };
function theme() { if (CFG.design !== "mine") return; const dark = th ? th === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; th = dark ? "light" : "dark"; try { localStorage.setItem(CFG.id + "-theme", th); } catch (e) {} applyTheme(); }
const tb = $("#bTheme"); if (tb) { if (CFG.design === "mine") tb.onclick = theme; else tb.remove(); }
applyTheme();

/* ---------- лёгкий режим для слабых компьютеров ---------- */
let lite = false, liteSaved = null;
try { liteSaved = localStorage.getItem(CFG.id + "-lite"); } catch (e) {}
function setLite(v, save) {
  lite = v; root.classList.toggle("lite", v);
  if (save) try { localStorage.setItem(CFG.id + "-lite", v ? "1" : "0"); } catch (e) {}
}
if (liteSaved != null) setLite(liteSaved === "1");
else {
  const weak = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 4) <= 2 || matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (weak) setLite(true);
  else if (window.requestAnimationFrame) {
    /* замер частоты кадров в первые секунды: меньше 30 кадров в секунду - лёгкий режим */
    let n = 0, t0 = 0;
    const tick = (t) => { if (document.hidden) return; if (!t0) t0 = t; if (++n < 90) requestAnimationFrame(tick); else if (89000 / (t - t0) < 30) setLite(true); };
    setTimeout(() => requestAnimationFrame(tick), 800);
  }
}
document.addEventListener("visibilitychange", () => root.classList.toggle("paused", document.hidden));

const stage = $("#stage");
const fit = () => {
  const nr = narrow();
  if (nr !== reflow) { reflow = nr; if (!reflow) { slides.forEach((s, i) => s.classList.toggle("active", i === cur)); } setReflow(); }
  if (reflow) return;
  const vp = stage.parentElement; const k = Math.min(vp.clientWidth / 1280, vp.clientHeight / 720);
  stage.style.transform = `translate(-50%,-50%) scale(${k})`;
};
addEventListener("resize", fit);
setReflow();
/* ---------- Moodle: SCORM 1.2 ---------- */
let api = null;
try { for (let w = window, n = 0; w && n < 12; n++) { if (w.API) { api = w.API; break; } if (w.parent === w) break; w = w.parent; } if (!api && window.opener) for (let w = window.opener, n = 0; w && n < 12; n++) { if (w.API) { api = w.API; break; } if (w.parent === w) break; w = w.parent; } } catch (e) { api = null; }
const lms = { ok: false, set(k, v) { try { api.LMSSetValue(k, String(v)); } catch (e) {} }, commit() { try { api.LMSCommit(""); } catch (e) {} } };
if (api) {
  try { lms.ok = String(api.LMSInitialize("")) === "true"; } catch (e) {}
  if (lms.ok) {
    try { if (String(api.LMSGetValue("cmi.core.lesson_status")) === "not attempted") lms.set("cmi.core.lesson_status", "incomplete"); } catch (e) {}
    addEventListener("pagehide", () => { lms.commit(); try { api.LMSFinish(""); } catch (e) {} });
  }
}
const lmsSlide = () => {
  if (!lms.ok) return;
  lms.set("cmi.core.lesson_location", cur + 1);
  if (cur === slides.length - 1 && !STUDENT) lms.set("cmi.core.lesson_status", "completed");
  lms.commit();
};
const lmsScore = () => {
  if (!lms.ok || !STUDENT) return;
  const f = Score.stats((k) => /^f\d+$/.test(k));
  if (!f.all) return;
  lms.set("cmi.core.score.min", 0); lms.set("cmi.core.score.max", 100);
  lms.set("cmi.core.score.raw", Math.round((f.ok / f.all) * 100));
  if (f.done === f.all) lms.set("cmi.core.lesson_status", "completed");
  lms.commit();
};
document.addEventListener("score", lmsScore);
let resume = null;
if (lms.ok) { try { resume = parseInt(api.LMSGetValue("cmi.core.lesson_location"), 10) || null; } catch (e) {} }

const m = /^#s(\d+)$/.exec(location.hash) || (resume ? [null, String(resume)] : null);
if (!reflow) { slides.forEach((s) => s.classList.remove("active")); cur = m ? Math.max(0, Math.min(slides.length - 1, +m[1] - 1)) : 0; slides[cur].classList.add("active"); mountAll(slides[cur]); }
fit();
refreshScore();
updNav();
lmsSlide();
lmsScore();
addEventListener("hashchange", () => { const k = /^#s(\d+)$/.exec(location.hash); if (k && +k[1] - 1 !== cur) show(+k[1] - 1); });
window.__deck = { slides, applyStep, show, setLite };
})();
