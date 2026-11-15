// js/services/authService.js
import { supabase } from "../supabaseClient.js";

// Limpia y normaliza el número a solo dígitos (elimina prefijo +57 si viene con él)
function sanitizePhone(raw) {
  let clean = String(raw || "").replace(/\D/g, "");
  if (clean.length === 12 && clean.startsWith("57")) {
    clean = clean.slice(2);
  }
  return clean;
}

export const authService = {
  sanitizePhone,

  // Convierte un número de teléfono a correo sintético para Supabase Auth
  phoneToEmail(phone) {
    const clean = sanitizePhone(phone);
    if (clean.length < 10) {
      throw new Error("El número de celular debe tener al menos 10 dígitos.");
    }
    return `${clean}@phone.luka.app`;
  },

  // Iniciar sesión con Google OAuth
  async signInWithGoogle() {
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo
      }
    });
    if (error) throw error;
    return data;
  },

  // Registro con correo o teléfono sintético
  async signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    if (error) throw error;
    return data;
  },

  // Registro con número de celular
  async signUpWithPhone(phone, password, fullName) {
    const cleanPhone = sanitizePhone(phone);
    if (cleanPhone.length < 10) {
      throw new Error("El número de celular debe tener al menos 10 dígitos.");
    }

    // Verificar tope de 2 cuentas antes de registrar
    const avail = await this.checkPhoneAvailability(cleanPhone);
    if (!avail.available) {
      throw new Error("Este número de celular ya alcanzó el límite máximo permitido (2 cuentas).");
    }

    const email = `${cleanPhone}@phone.luka.app`;
    const res = await this.signUp(email, password, fullName);

    if (res?.session?.user) {
      try {
        await this.linkPhone(cleanPhone, "phone");
      } catch (e) {
        console.warn("No se pudo auto-vincular teléfono:", e);
      }
    }
    return res;
  },

  // Login tradicional
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  // Login con celular (o correo para cuentas existentes)
  async signInWithPhone(phoneOrEmail, password) {
    let identifier = String(phoneOrEmail || "").trim();
    if (!identifier.includes("@")) {
      identifier = this.phoneToEmail(identifier);
    }
    return this.signIn(identifier, password);
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  },

  onAuthStateChanged(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null, event);
    });
  },

  // Consulta si el usuario actual tiene teléfono vinculado en user_phones
  async getPhoneStatus() {
    try {
      const { data, error } = await supabase.rpc("get_my_phone_status");
      if (error) {
        // Si el SQL aún no se ha ejecutado en Supabase, no bloquea al usuario
        console.warn("RPC get_my_phone_status no disponible:", error.message);
        return { has_phone: true, unconfigured: true };
      }
      return data || { has_phone: false, phone: null };
    } catch {
      return { has_phone: true, unconfigured: true };
    }
  },

  // Consulta disponibilidad (< 2 cuentas)
  async checkPhoneAvailability(phone) {
    try {
      const cleanPhone = sanitizePhone(phone);
      const { data, error } = await supabase.rpc("check_phone_availability", {
        p_phone: cleanPhone
      });
      if (error) return { available: true };
      return data || { available: true };
    } catch {
      return { available: true };
    }
  },

  // Vincula el teléfono al usuario actual respetando el límite de 2 cuentas
  async linkPhone(phone, provider = "google") {
    const cleanPhone = sanitizePhone(phone);
    if (cleanPhone.length < 10) {
      throw new Error("El número de celular debe tener al menos 10 dígitos.");
    }
    const { data, error } = await supabase.rpc("link_phone_number", {
      p_phone: cleanPhone,
      p_provider: provider
    });
    if (error) throw error;
    if (!data.success) {
      throw new Error(data.error || "No se pudo vincular el celular.");
    }
    return data;
  },

  // Registra actividad del usuario para mantener la cuenta viva (evita purga por inactividad de 2 meses)
  async recordActivity() {
    try {
      await supabase.rpc("record_user_activity");
    } catch {
      // Silencioso: no interrumpe el flujo si la función aún no se ha creado
    }
  }
};