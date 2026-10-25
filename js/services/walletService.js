// js/services/walletService.js
import { supabase, requireUserId } from "../supabaseClient.js";

export const walletService = {
  // Obtener todas las billeteras
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
    const userId = await requireUserId();

    const { data, error } = await supabase
      .from("wallets")
      .insert([
        {
          user_id: userId,
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

  // Actualizar datos o saldo de billetera
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

  // Transferir dinero entre cuentas (NUEVO)
  async transfer({ from_wallet_id, to_wallet_id, amount }) {
    if (from_wallet_id === to_wallet_id) {
      throw new Error("La cuenta de origen y de destino no pueden ser la misma.");
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      throw new Error("El monto a transferir debe ser mayor a 0.");
    }

    // 1. Obtener los saldos actuales de ambas cuentas (en paralelo)
    const [fromRes, toRes] = await Promise.all([
      supabase.from("wallets").select("balance, name").eq("id", from_wallet_id).single(),
      supabase.from("wallets").select("balance, name").eq("id", to_wallet_id).single()
    ]);
    if (fromRes.error) throw fromRes.error;
    if (toRes.error) throw toRes.error;

    const fromWallet = fromRes.data;
    const toWallet = toRes.data;

    // 2. Calcular nuevos saldos
    const newFromBalance = Number(fromWallet.balance) - transferAmount;
    const newToBalance = Number(toWallet.balance) + transferAmount;

    // 3. Actualizar la cuenta de origen
    const { error: updateFromErr } = await supabase
      .from("wallets")
      .update({ balance: newFromBalance })
      .eq("id", from_wallet_id);
    if (updateFromErr) throw updateFromErr;

    // 4. Actualizar la cuenta de destino; si falla, revertir el origen para no perder dinero
    const { error: updateToErr } = await supabase
      .from("wallets")
      .update({ balance: newToBalance })
      .eq("id", to_wallet_id);

    if (updateToErr) {
      await supabase
        .from("wallets")
        .update({ balance: Number(fromWallet.balance) })
        .eq("id", from_wallet_id);
      throw updateToErr;
    }

    return { fromWallet, toWallet, amount: transferAmount };
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