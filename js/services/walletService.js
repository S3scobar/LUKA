// js/services/walletService.js
import { supabase, requireUserId, isMissingRpc } from "../supabaseClient.js";

// Las funciones RPC de supabase/functions.sql hacen los ajustes de saldo en una sola
// sentencia SQL. Si no están desplegadas se usa leer + escribir, que no es atómico.
let balanceRpcAvailable = true;
let transferRpcAvailable = true;

export const walletService = {
  async getWallets() {
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

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

  // Suma (o resta, si delta es negativo) al saldo sin depender del saldo que la pantalla tenía cargado.
  // max limita el resultado, por ejemplo al cupo total de una tarjeta.
  async adjustBalance(id, delta, { max = null } = {}) {
    if (balanceRpcAvailable) {
      const params = { p_wallet_id: id, p_delta: delta };
      if (max !== null) params.p_max = max;

      const { data, error } = await supabase.rpc("adjust_wallet_balance", params);
      if (!error) return Number(data);
      if (!isMissingRpc(error)) throw error;
      balanceRpcAvailable = false;
    }

    const { data: wallet, error: readError } = await supabase
      .from("wallets")
      .select("balance")
      .eq("id", id)
      .single();
    if (readError) throw readError;

    let next = Number(wallet.balance) + delta;
    if (max !== null) next = Math.min(max, next);

    const updated = await this.updateWallet(id, { balance: next });
    return Number(updated.balance);
  },

  // Mueve dinero entre cuentas sin crear ingresos ni gastos
  async transfer({ from_wallet_id, to_wallet_id, amount }) {
    if (from_wallet_id === to_wallet_id) {
      throw new Error("La cuenta de origen y de destino no pueden ser la misma.");
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      throw new Error("El monto a transferir debe ser mayor a 0.");
    }

    if (transferRpcAvailable) {
      const { error } = await supabase.rpc("transfer_between_wallets", {
        p_from: from_wallet_id,
        p_to: to_wallet_id,
        p_amount: transferAmount
      });
      if (!error) return { amount: transferAmount };
      if (!isMissingRpc(error)) throw error;
      transferRpcAvailable = false;
    }

    await this.adjustBalance(from_wallet_id, -transferAmount);
    try {
      await this.adjustBalance(to_wallet_id, transferAmount);
    } catch (err) {
      // Si falla el destino se devuelve el dinero al origen para no perderlo
      await this.adjustBalance(from_wallet_id, transferAmount);
      throw err;
    }

    return { amount: transferAmount };
  },

  async deleteWallet(id) {
    const { error } = await supabase
      .from("wallets")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};
