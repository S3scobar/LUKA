// js/services/subscriptionService.js
import { supabase } from "../supabaseClient.js";

export const subscriptionService = {
  // Obtener todas las suscripciones ordenadas por el día de cobro
  async getSubscriptions() {
    const { data, error } = await supabase
      .from("subscriptions")
      .select(`
        *,
        wallet:wallets(name, color, icon),
        category:categories(name, color, icon)
      `)
      .order("billing_day", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Crear suscripción
  async createSubscription({ name, amount, billing_day, wallet_id = null, category_id = null }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { data, error } = await supabase
      .from("subscriptions")
      .insert([
        {
          user_id: user.id,
          name: name.trim(),
          amount: parseFloat(amount),
          billing_day: parseInt(billing_day),
          wallet_id: wallet_id || null,
          category_id: category_id || null,
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Pausar o reanudar suscripción
  async toggleSubscription(id, is_active) {
    const { data, error } = await supabase
      .from("subscriptions")
      .update({ is_active })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar suscripción
  async deleteSubscription(id) {
    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};