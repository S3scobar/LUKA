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
