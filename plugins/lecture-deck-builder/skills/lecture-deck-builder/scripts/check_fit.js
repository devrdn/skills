/* Проверка динамической презентации на каждом шаге каждого слайда (references/dynamic/workflow.md, «Проверки перед сдачей»):
   - всё помещается в сцену 1280×720;
   - текст и код не обрезаны (код - и по ширине, и по высоте);
   - текст узла схемы не выходит за его рамку (по прямоугольникам самого текста, а не блока);
   - у видимой стрелки с обеих сторон видимые узлы, наконечник не заходит на рамку узла;
   - иконки встроены;
   - нет внешних запросов.
   Запуск: открыть собранный HTML в браузере (окно 1280×720 или больше) и выполнить этот файл
   в консоли или через инструмент выполнения JavaScript в странице. Возвращает отчёт строкой.
   Нижняя граница 652 оставляет место под строку с номером слайда, правая 1214 - поля 66 px. */
(() => {
  const D = window.__deck;
  if (!D) return "нет window.__deck: страница собрана не из заготовки assets/interactive";
  const BOTTOM = 652, RIGHT = 1214, LEFT = 60, TOP = 30;
  const HEAD = 10, GAP = 2; // наконечник выступает на 10 px за линию; между ним и рамкой нужен зазор
  const scene = document.getElementById("stage");
  const k = scene.getBoundingClientRect().width / 1280;
  const bad = [];
  const hidden = (e) => !e || !!e.closest(".foot,.hid,[hidden]") || getComputedStyle(e).visibility === "hidden" || getComputedStyle(e).display === "none";
  const name = (e) => (e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : e.tagName.toLowerCase()) + " «" + (e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40) + "»";
  const FRAMES = ".dg .node, .dg .fnode, .dg .part, .dg .chip, .dg .slot, .dg .buf, .dg .page, .fn, .card";

  /* соседний узел стрелки в ряду; у стрелки на краю строки веера - элемент рядом с самим веером */
  const neighbour = (link, dir) => {
    /* в ряду column-reverse или row-reverse следующий в разметке элемент стоит перед стрелкой */
    if (getComputedStyle(link.parentElement).flexDirection.endsWith("reverse")) dir = -dir;
    let e = link;
    for (let up = 0; e && up < 3; up++) {
      let n = dir > 0 ? e.nextElementSibling : e.previousElementSibling;
      while (n && n.matches(".caps, script, style, span.lbl:empty")) n = dir > 0 ? n.nextElementSibling : n.previousElementSibling;
      if (n) return n;
      e = e.parentElement;
      if (!e || !e.matches(".fr, .fan")) return null;
    }
    return null;
  };

  D.slides.forEach((s, i) => {
    D.show(i);
    const steps = s.maxStep || 0;
    for (let st = 0; st <= steps; st++) {
      s.step = st; D.applyStep(s);
      const at = `слайд ${i + 1}, шаг ${st}`;
      const box = s.getBoundingClientRect();

      /* 1. сцена */
      s.querySelectorAll(".grow *, .dg *, .stand *, h2, .intro, .after, .figby, .caps > *").forEach((e) => {
        if (hidden(e)) return;
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const b = (r.bottom - box.top) / k, rt = (r.right - box.left) / k, l = (r.left - box.left) / k, t = (r.top - box.top) / k;
        if (b > BOTTOM + 1 || rt > RIGHT + 1 || l < LEFT - 1 || t < TOP - 1) bad.push(`${at}: не помещается ${name(e)} низ ${Math.round(b)} право ${Math.round(rt)}`);
      });

      /* 2. обрезанный текст и код */
      s.querySelectorAll(".card p, .node small, .node b, .caps span, .qopt span, .fn .sig").forEach((e) => {
        if (hidden(e)) return;
        if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== "visible") bad.push(`${at}: обрезан текст «${e.textContent.trim().slice(0, 40)}»`);
      });
      s.querySelectorAll("pre.code").forEach((e) => {
        if (hidden(e)) return;
        if (e.scrollHeight > e.clientHeight + 2) bad.push(`${at}: код обрезан по высоте ${name(e)}`);
        if (e.scrollWidth > e.clientWidth + 2) bad.push(`${at}: код обрезан по ширине ${name(e)}`);
      });

      /* 3. текст за рамкой узла: прямоугольники текстовых узлов против рамки ближайшего узла */
      s.querySelectorAll(FRAMES).forEach((f) => {
        if (hidden(f)) return;
        const fr = f.getBoundingClientRect();
        const tw = document.createTreeWalker(f, NodeFilter.SHOW_TEXT);
        let tn;
        while ((tn = tw.nextNode())) {
          const pe = tn.parentElement;
          if (!tn.textContent.trim() || hidden(pe) || pe.closest(FRAMES) !== f || pe.closest(".link, pre.code")) continue;
          const rg = document.createRange(); rg.selectNodeContents(tn);
          for (const r of rg.getClientRects()) {
            if (r.right > fr.right + 1 || r.left < fr.left - 1 || r.bottom > fr.bottom + 1 || r.top < fr.top - 1) {
              bad.push(`${at}: текст «${tn.textContent.trim().slice(0, 30)}» выходит за рамку ${name(f)}`);
              break;
            }
          }
        }
      });

      /* 4. стрелки: видимые узлы с обеих сторон, наконечник не на рамке */
      s.querySelectorAll(".dg .link").forEach((l) => {
        if (hidden(l)) return;
        const lr = l.getBoundingClientRect();
        if (!lr.width && !lr.height) return;
        const label = (l.textContent || "").trim().slice(0, 20);
        if (l.classList.contains("v")) {
          const n = neighbour(l, 1);
          if (!n || hidden(n)) bad.push(`${at}: вертикальная стрелка «${label}» ведёт к невидимому узлу или в пустоту`);
          else if (n.getBoundingClientRect().top < lr.bottom + (HEAD + GAP) * k) bad.push(`${at}: наконечник вертикальной стрелки заходит на ${name(n)}`);
          return;
        }
        const a = neighbour(l, -1), b = neighbour(l, 1);
        if (!a || hidden(a)) bad.push(`${at}: у стрелки «${label}» нет видимого узла слева`);
        if (!b || hidden(b)) bad.push(`${at}: стрелка «${label}» ведёт к невидимому узлу или в пустоту`);
        else if (b.getBoundingClientRect().left < lr.right + (HEAD + GAP) * k) bad.push(`${at}: наконечник стрелки заходит на рамку ${name(b)}`);
      });

      /* 5. иконки */
      s.querySelectorAll(".ic").forEach((e) => {
        if (hidden(e)) return;
        const cs = getComputedStyle(e);
        if (cs.backgroundImage === "none" && (cs.maskImage || cs.webkitMaskImage || "none") === "none") bad.push(`${at}: иконка ${e.className} не встроена`);
      });
    }
    s.step = 0; D.applyStep(s);
  });
  D.show(0);
  const ext = performance.getEntriesByType("resource").filter((r) => !/^(data|blob):/.test(r.name) && !/check_fit\.js(\?|$)/.test(r.name)).map((r) => r.name);
  const uniq = [...new Set(bad)];
  return (uniq.length ? `ЕСТЬ ПРОБЛЕМЫ (${uniq.length}):\n` + uniq.slice(0, 80).join("\n") : `все ${D.slides.length} слайдов в порядке на всех шагах`)
    + (ext.length ? `\nВНЕШНИЕ ЗАПРОСЫ (${ext.length}): ` + ext.slice(0, 5).join(", ") : "\nвнешних запросов нет");
})();
