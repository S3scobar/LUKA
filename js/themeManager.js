// js/themeManager.js
// Gestiona el tema claro/oscuro: preferencia guardada > preferencia del sistema.

const STORAGE_KEY = "luka_theme";
const THEME_COLORS = { light: "#F8FAFC", dark: "#0B1220" };

function readStoredTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function writeStoredTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Almacenamiento no disponible (modo privado): el tema solo dura la sesión
  }
}

const systemQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function systemTheme() {
  return systemQuery && systemQuery.matches ? "dark" : "light";
}

let toggleButton = null;

function paint(theme) {
  document.documentElement.setAttribute("data-theme", theme);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLORS[theme]);

  if (toggleButton) {
    const isDark = theme === "dark";
    const icon = toggleButton.querySelector("i");
    if (icon) icon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
    toggleButton.setAttribute("aria-pressed", String(isDark));
    toggleButton.title = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
    toggleButton.setAttribute("aria-label", toggleButton.title);
  }
}

export const themeManager = {
  get current() {
    return document.documentElement.getAttribute("data-theme") || systemTheme();
  },

  // Aplica el tema inicial y conecta el botón de alternar
  init(button) {
    toggleButton = button || null;
    paint(readStoredTheme() || systemTheme());

    if (toggleButton) {
      toggleButton.addEventListener("click", () => this.toggle());
    }

    // Si el usuario nunca eligió manualmente, seguir los cambios del sistema
    if (systemQuery) {
      systemQuery.addEventListener("change", () => {
        if (!readStoredTheme()) paint(systemTheme());
      });
    }
  },

  set(theme) {
    writeStoredTheme(theme);
    paint(theme);
  },

  // El nuevo tema se riega en círculo desde el botón hasta cubrir toda la pantalla
  toggle() {
    const next = this.current === "dark" ? "light" : "dark";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      this.set(next);
      return;
    }

    if (!document.startViewTransition || !toggleButton) {
      // Navegadores sin View Transitions: los colores se funden suavemente
      const root = document.documentElement;
      root.classList.add("theme-fading");
      this.set(next);
      setTimeout(() => root.classList.remove("theme-fading"), 500);
      return;
    }

    const box = toggleButton.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = document.startViewTransition(() => this.set(next));
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 800, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(() => {});

    // El icono gira al cambiar (sol <-> luna)
    toggleButton.classList.remove("theme-icon-spin");
    void toggleButton.offsetWidth;
    toggleButton.classList.add("theme-icon-spin");
  }
};
