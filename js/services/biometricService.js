// js/services/biometricService.js — Face ID / Touch ID (WebAuthn con autenticador de la plataforma)
// Es un candado local: la sesión de Supabase sigue guardada en el dispositivo y, si el desbloqueo
// biométrico está activo, la app exige Face ID antes de mostrarla. No guarda ni envía datos biométricos:
// el iPhone solo confirma "es el dueño". Requiere HTTPS e iOS/iPadOS 16+ (también funciona en Android y Mac).
const key = (userId) => `luka_bio_${userId}`;
const toBytes = (s) => new TextEncoder().encode(s);
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const rand = (n = 32) => crypto.getRandomValues(new Uint8Array(n));

const read = (userId) => { try { return localStorage.getItem(key(userId)); } catch { return null; } };

export const biometricService = {
  async isSupported() {
    try {
      return !!(window.PublicKeyCredential && window.isSecureContext
        && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
    } catch { return false; }
  },

  isEnabled(userId) { return !!read(userId); },

  // Registra la credencial (aquí iOS pide Face ID por primera vez)
  async enable(userId, label) {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: rand(),
        rp: { name: "LUKA" },
        user: { id: toBytes(userId).slice(0, 64), name: label || "usuario", displayName: label || "usuario" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
        timeout: 60000
      }
    });
    if (!cred) throw new Error("No se pudo activar Face ID");
    try { localStorage.setItem(key(userId), b64(cred.rawId)); } catch {}
  },

  disable(userId) { try { localStorage.removeItem(key(userId)); } catch {} },

  // Pide Face ID. Devuelve true si el dueño se verificó
  async verify(userId) {
    const id = read(userId);
    if (!id) return true;
    try {
      const res = await navigator.credentials.get({
        publicKey: {
          challenge: rand(),
          allowCredentials: [{ type: "public-key", id: fromB64(id), transports: ["internal"] }],
          userVerification: "required",
          timeout: 60000
        }
      });
      return !!res;
    } catch { return false; }
  }
};
