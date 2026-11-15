// js/components/biometricLock.js — pantalla de bloqueo con Face ID y oferta de activación
import { biometricService } from "../services/biometricService.js";

const GRACE_MS = 60 * 1000; // al volver a la app antes de 1 min no se vuelve a pedir
let overlay = null;
let hiddenAt = 0;

const FACE_SVG = `<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 17V12a6 6 0 0 1 6-6h5M31 6h5a6 6 0 0 1 6 6v5M42 31v5a6 6 0 0 1-6 6h-5M17 42h-5a6 6 0 0 1-6-6v-5"/><path d="M17 19v4M31 19v4M24 19v8h-2.5M17 32c3.8 3.4 10.2 3.4 14 0"/></svg>`;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function build(name) {
  const first = esc(String(name || "").split(/[\s@]/)[0] || "");
  const el = document.createElement("div");
  el.className = "bio-lock";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "LUKA bloqueado");
  el.innerHTML = `
    <div class="bio-lock-card">
      <div class="bio-lock-brand">LUKA</div>
      <h2>${first ? `Hola, ${first}` : "Hola de nuevo"}</h2>
      <p class="bio-lock-msg">Entra con tu rostro</p>
      <button type="button" class="bio-face" aria-label="Entrar con Face ID">${FACE_SVG}</button>
      <button type="button" class="btn btn-primary btn-block bio-unlock">Entrar con Face ID</button>
      <button type="button" class="btn-link bio-other">Usar otra cuenta</button>
    </div>`;
  return el;
}

export const biometricLock = {
  // Devuelve una promesa: true si se desbloqueó, false si eligió "Usar otra cuenta"
  require(userId, name) {
    if (!biometricService.isEnabled(userId)) return Promise.resolve(true);
    if (overlay) return overlay.promise;
    const el = build(name);
    document.body.appendChild(el);
    const msg = el.querySelector(".bio-lock-msg");
    let done;
    const promise = new Promise((r) => { done = r; });
    overlay = { el, promise };
    const close = (ok) => { el.classList.add("is-out"); setTimeout(() => el.remove(), 250); overlay = null; done(ok); };

    const attempt = async () => {
      msg.textContent = "Entra con tu rostro"; el.classList.add("is-scanning");
      const ok = await biometricService.verify(userId);
      el.classList.remove("is-scanning");
      if (ok) close(true);
      else msg.textContent = "No se pudo verificar. Toca para intentarlo de nuevo.";
    };
    el.querySelector(".bio-unlock").addEventListener("click", attempt);
    el.querySelector(".bio-face").addEventListener("click", attempt);
    el.querySelector(".bio-other").addEventListener("click", () => close(false));
    setTimeout(attempt, 350); // iOS puede exigir un toque; si lo exige, queda el botón
    return promise;
  },

  // Vuelve a pedir Face ID si la app estuvo oculta más de un minuto
  watchVisibility({ getUserId, getName, onOtherAccount }) {
    document.addEventListener("visibilitychange", async () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      const uid = getUserId();
      if (!uid || !hiddenAt || Date.now() - hiddenAt < GRACE_MS) return;
      hiddenAt = 0;
      if (!(await this.require(uid, getName?.()))) onOtherAccount();
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
