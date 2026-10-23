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

  toggle() {
    this.set(this.current === "dark" ? "light" : "dark");
  }
};
