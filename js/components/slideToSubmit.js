// js/components/slideToSubmit.js — control "desliza para continuar"
// Se arrastra la perilla hasta el final para confirmar. También funciona con teclado
// (Enter, espacio o flecha derecha sobre la perilla) y se puede pulsar en lectores de pantalla.
const COMPLETE_AT = 0.92; // fracción del recorrido a partir de la cual se confirma
const BUSY_LOADER_HTML = '<span class="slide-busy-loader" role="status" aria-label="Cargando..."><span class="slide-dot"></span><span class="slide-dot"></span><span class="slide-dot"></span></span>';

export const slideToSubmit = {
  mount(host, { label = "Desliza para continuar", busyLabel = BUSY_LOADER_HTML, onComplete }) {
    host.classList.add("slide-track");
    host.innerHTML = `
      <div class="slide-fill"></div>
      <span class="slide-label">${label}</span>
      <button type="button" class="slide-thumb" aria-label="${label}">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;

    const fill = host.querySelector(".slide-fill");
    const labelEl = host.querySelector(".slide-label");
    const thumb = host.querySelector(".slide-thumb");

    let dragging = false;
    let startX = 0;
    let offset = 0;
    let busy = false;

    const maxOffset = () => host.clientWidth - thumb.offsetWidth - 8;

    const setOffset = (value) => {
      offset = Math.max(0, Math.min(value, maxOffset()));
      thumb.style.transform = `translateX(${offset}px)`;
      fill.style.width = `${offset + thumb.offsetWidth + 4}px`;
      labelEl.style.opacity = String(Math.max(0, 1 - (offset / (maxOffset() || 1)) * 1.6));
    };

    const springBack = () => {
      host.classList.remove("is-dragging");
      setOffset(0);
    };

    const complete = () => {
      if (busy) return;
      host.classList.remove("is-dragging");
      setOffset(maxOffset());
      host.classList.add("is-done");
      onComplete?.();
    };

    thumb.addEventListener("pointerdown", (e) => {
      if (busy) return;
      dragging = true;
      startX = e.clientX - offset;
      thumb.setPointerCapture(e.pointerId);
      host.classList.add("is-dragging");
    });

    thumb.addEventListener("pointermove", (e) => {
      if (dragging) setOffset(e.clientX - startX);
    });

    const release = () => {
      if (!dragging) return;
      dragging = false;
      if (offset >= maxOffset() * COMPLETE_AT) complete();
      else springBack();
    };
    thumb.addEventListener("pointerup", release);
    thumb.addEventListener("pointercancel", release);

    thumb.addEventListener("keydown", (e) => {
      if (["Enter", " ", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        complete();
      }
    });

    return {
      // Deja el control en espera mientras se procesa la petición
      setBusy(customBusy) {
        busy = true;
        thumb.disabled = true;
        host.classList.add("is-done", "is-busy");
        const val = customBusy !== undefined ? customBusy : busyLabel;
        if (typeof val === "string" && val.includes("<")) {
          labelEl.innerHTML = val;
        } else {
          labelEl.textContent = val;
        }
        labelEl.style.opacity = "1";
      },
      // Vuelve al inicio (por ejemplo tras un error o un formulario incompleto)
      reset() {
        busy = false;
        thumb.disabled = false;
        host.classList.remove("is-done", "is-busy");
        labelEl.textContent = label;
        springBack();
      }
    };
  }
};
