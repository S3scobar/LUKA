// js/services/authService.js
import { supabase } from "../supabaseClient.js";

export const authService = {
  // Registro con correo, contraseña y nombre. Si el proyecto exige confirmar el correo, data.session viene vacío.
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

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Valida la sesión contra el servidor de Supabase
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  },

  onAuthStateChanged(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null, event);
    });
  }
};