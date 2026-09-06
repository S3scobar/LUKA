// js/services/transactionService.js
import { supabase } from "../supabaseClient.js";
import { walletService } from "./walletService.js";

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

  // Obtener transacciones del mes
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

  // Obtener transacciones del año
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

  // Eliminar transacción (SINCRONIZACIÓN: si es de tarjeta de crédito, borra la compra y restaura cupo)
  async deleteTransaction(id) {
    // 1. Verificar si está vinculada a una compra en credit_card_purchases
    const { data: linkedPurchase } = await supabase
      .from("credit_card_purchases")
      .select("*, card:credit_cards(id, wallet_id, credit_limit)")
      .eq("transaction_id", id)
      .maybeSingle();

    if (linkedPurchase) {
      // Eliminar la compra en credit_card_purchases
      await supabase.from("credit_card_purchases").delete().eq("id", linkedPurchase.id);

      // Restaurar el cupo disponible
      const totalImpact = Number(linkedPurchase.total_amount) + Number(linkedPurchase.advance_fee || 0);
      if (linkedPurchase.card?.wallet_id) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("id", linkedPurchase.card.wallet_id)
          .single();

        if (wallet) {
          const restoredBalance = Math.min(
            Number(linkedPurchase.card.credit_limit),
            Number(wallet.balance) + totalImpact
          );
          await walletService.updateWallet(linkedPurchase.card.wallet_id, { balance: restoredBalance });
        }
      }
    }

    // 2. Eliminar de transactions
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};