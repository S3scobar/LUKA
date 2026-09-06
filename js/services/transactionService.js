// js/services/transactionService.js
import { supabase } from "../supabaseClient.js";

export const transactionService = {
  // Registrar un gasto o ingreso
  async addTransaction({ wallet_id, category_id, type, title, amount, date = null }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const transactionDate = date || new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("transactions")
      .insert([
        {
          user_id: user.id,
          wallet_id,
          category_id,
          type,
          title: title.trim(),
          amount: parseFloat(amount),
          transaction_date: transactionDate
        }
      ])
      .select(`
        *,
        category:categories(name, icon, color),
        wallet:wallets(name, color, icon)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Obtener transacciones de un mes específico
  async getTransactions(year = null, month = null) {
    const now = new Date();
    const currentYear = year !== null ? year : now.getFullYear();
    const currentMonth = month !== null ? month : now.getMonth() + 1;

    const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        category:categories(name, icon, color),
        wallet:wallets(name, color, icon)
      `)
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate)
      .order("transaction_date", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener transacciones de todo el año (NUEVO)
  async getYearlyTransactions(year = null) {
    const targetYear = year !== null ? year : new Date().getFullYear();
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;

    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        category:categories(name, icon, color),
        wallet:wallets(name, color, icon)
      `)
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate)
      .order("transaction_date", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Eliminar transacción
  async deleteTransaction(id) {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};