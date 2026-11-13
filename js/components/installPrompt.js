// js/components/installPrompt.js
// Botón "Instalar app" del pie de página. Para la mayoría de la gente esto equivale
// a "crear el acceso directo": instala LUKA como app, con su icono en el escritorio o
// pantalla de inicio, sin tener que hacerlo a mano desde el menú del navegador.
//
// Comportamiento según el navegador:
//  - Chrome/Edge/Android: usan el evento beforeinstallprompt -> botón que lanza el diálogo nativo.
//  - iOS/Safari: no hay evento; mostramos instrucciones para "Agregar a pantalla de inicio".
//  - Ya instalada (display-mode: standalone): ocultamos el botón.

export const installPrompt = {
  init() {
    const btn = document.getElementById("btn-install");
    if (!btn) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    // Si ya está instalada, no tiene sentido ofrecer instalar.
    if (isStandalone) {
      btn.hidden = true;
      return;
    }

    let deferredPrompt = null;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

    // Navegadores con soporte nativo: capturamos el evento y revelamos el botón.
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      btn.hidden = false;
    });

    // En iOS no hay beforeinstallprompt: mostramos el botón para dar las instrucciones.
    if (isIOS && isSafari) {
      btn.hidden = false;
    }

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      btn.hidden = true;
    });

    btn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try {
          await deferredPrompt.userChoice;
        } finally {
          deferredPrompt = null;
          btn.hidden = true;
        }
        return;
      }

      if (isIOS) {
        showIosInstructions();
        return;
      }

      // Respaldo (navegador de escritorio sin soporte o ya descartado): explicamos dónde buscar.
      showManualInstructions();
    });
  }
};

function showModal(innerHtml) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h4><i class="fa-solid fa-arrow-down-to-line text-primary"></i> Instalar LUKA</h4>
        <button class="modal-close-btn" type="button" aria-label="Cerrar">&times;</button>
      </div>
      ${innerHtml}
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  return modal;
}

function showIosInstructions() {
  showModal(`
    <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">
      En iPhone o iPad, instala LUKA en 2 pasos:
    </p>
    <ol class="install-steps">
      <li>Toca el botón <strong>Compartir</strong> <i class="fa-solid fa-arrow-up-from-bracket"></i> en la barra de Safari.</li>
      <li>Elige <strong>Agregar a pantalla de inicio</strong> <i class="fa-solid fa-square-plus"></i>.</li>
    </ol>
    <p style="color: var(--text-muted); font-size: 0.8rem;">Quedará con su propio icono, como cualquier app.</p>
  `);
}

function showManualInstructions() {
  showModal(`
    <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">
      Instala LUKA desde tu navegador:
    </p>
    <ol class="install-steps">
      <li>Abre el menú del navegador <i class="fa-solid fa-ellipsis-vertical"></i>.</li>
      <li>Elige <strong>Instalar LUKA</strong> o <strong>Crear acceso directo</strong>.</li>
    </ol>
    <p style="color: var(--text-muted); font-size: 0.8rem;">Quedará con su propio icono para abrirla en un clic.</p>
  `);
}
