// Esqueleto genérico que se muestra mientras cada pestaña carga sus datos
export const skeletonHtml = () => `
  <div class="sk-wrap" aria-busy="true" aria-label="Cargando">
    <div class="sk-grid"><div class="sk sk-card"></div><div class="sk sk-card"></div></div>
    <div class="sk-panel">
      <div class="sk sk-line sk-title"></div>
      <div class="sk sk-line sk-sub"></div>
      <div class="sk sk-row"></div><div class="sk sk-row"></div><div class="sk sk-row"></div>
    </div>
  </div>`;
