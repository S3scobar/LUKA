// js/services/walletService.js
import { supabase } from "../supabaseClient.js";

export const walletService = {
  // Obtener todas las billeteras del usuario actual
  async getWallets() {
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Crear una nueva billetera
  async createWallet({ name, balance = 0, color = "#3B82F6", icon = "fa-wallet" }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { data, error } = await supabase
      .from("wallets")
      .insert([
        {
          user_id: user.id,
          name: name.trim(),
          balance: parseFloat(balance) || 0,
          color,
          icon
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar datos de billetera
  async updateWallet(id, updates) {
    const { data, error } = await supabase
      .from("wallets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar billetera
  async deleteWallet(id) {
    const { error } = await supabase
      .from("wallets")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};