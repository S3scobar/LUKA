// js/components/liquidNav.js — píldora de vidrio que se desliza entre pestañas
// Al cambiar de pestaña la píldora se estira hasta cubrir ambas y se recoge en la nueva,
// como una gota que se desplaza. Sin animaciones si el sistema pide reducir movimiento.
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const liquidNav = {
  init(nav) {
    this.nav = nav;
    this.pill = document.createElement("span");
    this.pill.className = "nav-liquid";
    this.pill.setAttribute("aria-hidden", "true");
    nav.prepend(this.pill);
    nav.classList.add("has-liquid");

    this.rect = null;
    this.anim = null;

    // Cambios de tamaño (fuentes que cargan, girar el celular) recolocan la píldora sin animar
    const observer = new ResizeObserver(() => this.update({ animate: false }));
    observer.observe(nav);
    nav.querySelectorAll(".nav-item-btn").forEach((btn) => observer.observe(btn));
  },

  update({ animate = true } = {}) {
    const btn = this.nav?.querySelector(".nav-item-btn.active");
    // Con la barra oculta (pantalla de login) no hay medidas válidas
    if (!btn || !btn.offsetWidth) { this.rect = null; return; }

    const next = { left: btn.offsetLeft, top: btn.offsetTop, width: btn.offsetWidth, height: btn.offsetHeight };
    const prev = this.rect;
    this.rect = next;

    this.anim?.cancel();
    this.anim = null;

    const apply = (r) => {
      Object.assign(this.pill.style, {
        left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`
      });
    };

    const moved = prev && (prev.left !== next.left || prev.width !== next.width);
    if (!animate || !moved || prefersReducedMotion() || !this.pill.animate) {
      apply(next);
      return;
    }

    const stretch = {
      left: Math.min(prev.left, next.left),
      width: Math.max(prev.left + prev.width, next.left + next.width) - Math.min(prev.left, next.left)
    };

    apply(next);
    this.anim = this.pill.animate(
      [
        { left: `${prev.left}px`, width: `${prev.width}px`, transform: "scaleY(1)" },
        { left: `${stretch.left}px`, width: `${stretch.width}px`, transform: "scaleY(0.86)", offset: 0.45 },
        { left: `${next.left}px`, width: `${next.width}px`, transform: "scaleY(1)" }
      ],
      { duration: 520, easing: "cubic-bezier(0.34, 1.3, 0.5, 1)" }
    );
  }
};
