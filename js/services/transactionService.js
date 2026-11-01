// js/services/transactionService.js
import { supabase, requireUserId } from "../supabaseClient.js";
import { walletService } from "./walletService.js";

const TRANSACTION_COLUMNS = `
  *,
  category:categories(name, icon, color),
  wallet:wallets(name, color, icon)
`;

// Supabase devuelve como máximo 1000 filas por petición: se pide por páginas
// para que un mes o un año con muchos movimientos no se corte en silencio.
const PAGE_SIZE = 1000;

async function fetchAllPages(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

export const transactionService = {
  async addTransaction({ wallet_id, category_id, type, title, amount, date = null }) {
    const userId = await requireUserId();

    const transactionDate = date || new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("transactions")
      .insert([
        {
          user_id: userId,
          wallet_id,
          category_id,
          type,
          title: title.trim(),
          amount: parseFloat(amount),
          transaction_date: transactionDate
        }
      ])
      .select(TRANSACTION_COLUMNS)
      .single();

    if (error) throw error;
    return data;
  },

  // Transacciones de un mes (por defecto el actual), de la más reciente a la más antigua
  async getTransactions(year = null, month = null) {
    const now = new Date();
    const currentYear = year !== null ? year : now.getFullYear();
    const currentMonth = month !== null ? month : now.getMonth() + 1;

    const monthText = String(currentMonth).padStart(2, "0");
    const startDate = `${currentYear}-${monthText}-01`;
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const endDate = `${currentYear}-${monthText}-${String(lastDay).padStart(2, "0")}`;

    return fetchAllPages(() =>
      supabase
        .from("transactions")
        .select(TRANSACTION_COLUMNS)
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate)
        .order("transaction_date", { ascending: false })
        .order("id", { ascending: false })
    );
  },

  // Transacciones de un año (por defecto el actual), de la más antigua a la más reciente
  async getYearlyTransactions(year = null) {
    const targetYear = year !== null ? year : new Date().getFullYear();

    return fetchAllPages(() =>
      supabase
        .from("transactions")
        .select(TRANSACTION_COLUMNS)
        .gte("transaction_date", `${targetYear}-01-01`)
        .lte("transaction_date", `${targetYear}-12-31`)
        .order("transaction_date", { ascending: true })
        .order("id", { ascending: true })
    );
  },

  // Si el movimiento viene de una compra con tarjeta, también se borra la compra y se devuelve el cupo
  async deleteTransaction(id) {
    const { data: linkedPurchase } = await supabase
      .from("credit_card_purchases")
      .select("*, card:credit_cards(id, wallet_id, credit_limit)")
      .eq("transaction_id", id)
      .maybeSingle();

    if (linkedPurchase) {
      await supabase.from("credit_card_purchases").delete().eq("id", linkedPurchase.id);

      if (linkedPurchase.card?.wallet_id) {
        const totalImpact = Number(linkedPurchase.total_amount) + Number(linkedPurchase.advance_fee || 0);
        await walletService.adjustBalance(linkedPurchase.card.wallet_id, totalImpact, {
          max: Number(linkedPurchase.card.credit_limit)
        });
      }
    }

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};
