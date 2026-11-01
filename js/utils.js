// js/utils.js — utilidades compartidas

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

// Escapa texto del usuario antes de insertarlo en plantillas con innerHTML
// (sirve tanto para contenido de elementos como para valores de atributos).
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

// Las vistas reciben el elemento donde se pintan. También se acepta un id por compatibilidad.
export function resolveContainer(target) {
  return typeof target === "string" ? document.getElementById(target) : target;
}

// Aviso de error para acciones sin formulario propio (eliminar, pausar, etc.)
export function notifyError(err) {
  alert(err?.message || "Ocurrió un error. Inténtalo de nuevo.");
}
