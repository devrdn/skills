/* Проверка интерактивной презентации: каждый шаг каждого слайда помещается в сцену 1280×720.
   Запуск: открыть собранный HTML в браузере (окно 1280×720 или больше) и выполнить этот файл
   в консоли или через инструмент выполнения JavaScript в странице. Возвращает отчёт строкой.
   Нижняя граница 652 оставляет место под строку с номером слайда, правая 1214 - поля 66 px. */
(() => {
  const D = window.__deck;
  if (!D) return "нет window.__deck: страница собрана не из заготовки assets/interactive";
  const BOTTOM = 652, RIGHT = 1214, LEFT = 60, TOP = 30;
  const scene = document.getElementById("stage");
  const k = scene.getBoundingClientRect().width / 1280;
  const bad = [];
  const skip = (e) => e.closest(".foot,.hid,[hidden]") || getComputedStyle(e).visibility === "hidden" || getComputedStyle(e).display === "none";
  D.slides.forEach((s, i) => {
    D.show(i);
    const steps = s.maxStep || 0;
    for (let st = 0; st <= steps; st++) {
      s.step = st; D.applyStep(s);
      const box = s.getBoundingClientRect();
      s.querySelectorAll(".grow *, .dg *, .stand *, h2, .intro, .after, .figby, .caps > *").forEach((e) => {
        if (skip(e)) return;
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const b = (r.bottom - box.top) / k, rt = (r.right - box.left) / k, l = (r.left - box.left) / k, t = (r.top - box.top) / k;
        if (b > BOTTOM + 1 || rt > RIGHT + 1 || l < LEFT - 1 || t < TOP - 1) {
          const what = (e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : e.tagName.toLowerCase()) + " «" + (e.textContent || "").trim().slice(0, 40) + "»";
          bad.push(`слайд ${i + 1}, шаг ${st}: ${what} низ ${Math.round(b)} право ${Math.round(rt)}`);
        }
      });
      /* текст, обрезанный внутри своего блока */
      s.querySelectorAll(".card p, .node small, .node b, .caps span, .qopt span").forEach((e) => {
        if (skip(e)) return;
        if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== "visible") bad.push(`слайд ${i + 1}, шаг ${st}: обрезан текст «${e.textContent.trim().slice(0, 40)}»`);
      });
    }
    s.step = 0; D.applyStep(s);
  });
  D.show(0);
  const ext = performance.getEntriesByType("resource").filter((r) => !/^(data|blob):/.test(r.name)).map((r) => r.name);
  const uniq = [...new Set(bad)];
  return (uniq.length ? `НЕ ПОМЕЩАЕТСЯ (${uniq.length}):\n` + uniq.slice(0, 60).join("\n") : `все ${D.slides.length} слайдов помещаются на всех шагах`)
    + (ext.length ? `\nВНЕШНИЕ ЗАПРОСЫ (${ext.length}): ` + ext.slice(0, 5).join(", ") : "\nвнешних запросов нет");
})();
