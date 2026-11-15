// js/components/biometricLock.js — pantalla de bloqueo con Face ID y oferta de activación
import { biometricService } from "../services/biometricService.js";

const GRACE_MS = 60 * 1000; // al volver a la app antes de 1 min no se vuelve a pedir
let overlay = null;
let hiddenAt = 0;

function build() {
  const el = document.createElement("div");
  el.className = "bio-lock";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "LUKA bloqueado");
  el.innerHTML = `
    <div class="bio-lock-card">
      <div class="bio-lock-icon"><i class="fa-solid fa-lock"></i></div>
      <h2>LUKA está bloqueado</h2>
      <p class="bio-lock-msg">Usa Face ID para entrar</p>
      <button type="button" class="btn btn-primary btn-block bio-unlock"><i class="fa-solid fa-face-smile"></i> Desbloquear con Face ID</button>
      <button type="button" class="btn-link bio-other">Usar otra cuenta</button>
    </div>`;
  return el;
}

export const biometricLock = {
  // Devuelve una promesa: true si se desbloqueó, false si eligió "Usar otra cuenta"
  require(userId) {
    if (!biometricService.isEnabled(userId)) return Promise.resolve(true);
    if (overlay) return overlay.promise;
    const el = build();
    document.body.appendChild(el);
    const msg = el.querySelector(".bio-lock-msg");
    let done;
    const promise = new Promise((r) => { done = r; });
    overlay = { el, promise };
    const close = (ok) => { el.classList.add("is-out"); setTimeout(() => el.remove(), 250); overlay = null; done(ok); };

    const attempt = async () => {
      msg.textContent = "Usa Face ID para entrar";
      if (await biometricService.verify(userId)) close(true);
      else msg.textContent = "No se pudo verificar. Inténtalo de nuevo.";
    };
    el.querySelector(".bio-unlock").addEventListener("click", attempt);
    el.querySelector(".bio-other").addEventListener("click", () => close(false));
    setTimeout(attempt, 350); // iOS puede exigir un toque; si lo exige, queda el botón
    return promise;
  },

  // Vuelve a pedir Face ID si la app estuvo oculta más de un minuto
  watchVisibility({ getUserId, onOtherAccount }) {
    document.addEventListener("visibilitychange", async () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      const uid = getUserId();
      if (!uid || !hiddenAt || Date.now() - hiddenAt < GRACE_MS) return;
      hiddenAt = 0;
      if (!(await this.require(uid))) onOtherAccount();
    });
  },

  // Oferta única tras iniciar sesión en un dispositivo compatible
  async offer(userId, label) {
    const asked = `luka_bio_asked_${userId}`;
    try { if (localStorage.getItem(asked)) return; } catch {}
    if (biometricService.isEnabled(userId) || !(await biometricService.isSupported())) return;
    const el = document.createElement("div");
    el.className = "bio-offer";
    el.innerHTML = `
      <i class="fa-solid fa-face-smile bio-offer-icon"></i>
      <div class="bio-offer-text"><strong>¿Entrar con Face ID?</strong><span>Protege tu app con tu rostro.</span></div>
      <button type="button" class="btn btn-primary bio-yes">Activar</button>
      <button type="button" class="bio-no" aria-label="Ahora no"><i class="fa-solid fa-xmark"></i></button>`;
    document.body.appendChild(el);
    const end = () => { try { localStorage.setItem(asked, "1"); } catch {} el.remove(); };
    el.querySelector(".bio-no").addEventListener("click", end);
    el.querySelector(".bio-yes").addEventListener("click", async () => {
      try { await biometricService.enable(userId, label); } catch {}
      end();
    });
  }
};
