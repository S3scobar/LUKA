// js/components/glassLight.js — el brillo especular del vidrio sigue al dedo o al cursor
// Guarda la posición en --mx / --my de la tarjeta bajo el puntero; css/liquid.css dibuja el destello ahí.
const SURFACES = ".metric-card, .quick-expense-card, .card-statement-banner, .section-card, .loan-card";

let frame = 0;
let pending = null;

function paint() {
  frame = 0;
  const { el, x, y } = pending;
  const box = el.getBoundingClientRect();
  if (!box.width || !box.height) return;
  el.style.setProperty("--mx", `${(((x - box.left) / box.width) * 100).toFixed(1)}%`);
  el.style.setProperty("--my", `${(((y - box.top) / box.height) * 100).toFixed(1)}%`);
}

function track(e) {
  if (!e.isPrimary) return;
  const el = e.target.closest?.(SURFACES);
  if (!el) return;
  pending = { el, x: e.clientX, y: e.clientY };
  if (!frame) frame = requestAnimationFrame(paint);
}

export const glassLight = {
  init() {
    document.addEventListener("pointermove", track, { passive: true });
    document.addEventListener("pointerdown", track, { passive: true });
  }
};
