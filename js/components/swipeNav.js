// js/components/swipeNav.js — cambia de pestaña deslizando el dedo por la pantalla
// Deslizar a la derecha avanza a la pestaña siguiente; a la izquierda vuelve a la anterior.
const MIN_DISTANCE = 70;      // px horizontales necesarios
const DIRECTION_RATIO = 1.6;  // el gesto debe ser claramente más horizontal que vertical
const MAX_DURATION = 700;     // ms: un arrastre lento suele ser otra intención (seleccionar, desplazar)

// Zonas donde un gesto horizontal ya tiene otro significado
const IGNORED = "input, textarea, select, .modal-backdrop, .modal-content, #tour-overlay, #tour-card, .slide-track, canvas";

function insideHorizontalScroll(el) {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    if (node.scrollWidth <= node.clientWidth + 1) continue;
    const overflowX = getComputedStyle(node).overflowX;
    if (overflowX === "auto" || overflowX === "scroll") return true;
  }
  return false;
}

export const swipeNav = {
  init({ getTabs, getCurrent, onChange, isEnabled }) {
    let start = null;

    document.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1 || !isEnabled()) { start = null; return; }
      const t = e.touches[0];
      const target = e.target;
      if (target.closest(IGNORED) || insideHorizontalScroll(target)) { start = null; return; }
      start = { x: t.clientX, y: t.clientY, time: Date.now() };
    }, { passive: true });

    document.addEventListener("touchend", (e) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const elapsed = Date.now() - start.time;
      start = null;

      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO || elapsed > MAX_DURATION) return;
      if (document.querySelector(".modal-backdrop, #tour-overlay")) return;

      const tabs = getTabs();
      const index = tabs.indexOf(getCurrent());
      const next = tabs[index + (dx > 0 ? 1 : -1)];
      if (next) onChange(next);
    }, { passive: true });

    document.addEventListener("touchcancel", () => { start = null; }, { passive: true });
  }
};
