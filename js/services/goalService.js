// js/services/goalService.js
import { supabase } from "../supabaseClient.js";
import { transactionService } from "./transactionService.js";

// Función auxiliar para buscar la categoría de ahorro (o fallback) según el tipo
async function resolveCategoryId(userId, type) {
  const { data: ahorroCat } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .ilike("name", "%ahorro%")
    .limit(1)
    .maybeSingle();

  if (ahorroCat) return ahorroCat.id;

  const { data: fallbackCat } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .limit(1)
    .maybeSingle();

  return fallbackCat ? fallbackCat.id : null;
}

export const goalService = {
  // Obtener todos los fondos de ahorro
  async getGoals() {
    const { data, error } = await supabase
      .from("saving_goals")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data || []).map(goal => ({
      ...goal,
      progressPercentage: Math.min(
        100,
        Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100)
      )
    }));
  },

  // Crear fondo de ahorro (registra en gastos si hay dinero inicial y se seleccionó billetera)
  async createGoal({
    title,
    target_amount,
    current_amount = 0,
    target_date = null,
    icon = "fa-piggy-bank",
    wallet_id = null
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const initialAmount = parseFloat(current_amount) || 0;

    // 1. Crear el fondo de ahorro en saving_goals
    const { data, error } = await supabase
      .from("saving_goals")
      .insert([
        {
          user_id: user.id,
          title: title.trim(),
          target_amount: parseFloat(target_amount),
          current_amount: initialAmount,
          target_date: target_date || null,
          icon
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // 2. Si se ingresó dinero inicial y se eligió cuenta, registrar el gasto de inmediato
    if (initialAmount > 0 && wallet_id) {
      const categoryId = await resolveCategoryId(user.id, "expense");

      await transactionService.addTransaction({
        wallet_id,
        category_id: categoryId,
        type: "expense",
        title: `Ahorro Inicial: ${title.trim()}`,
        amount: initialAmount
      });
    }

    return data;
  },

  // Aportar dinero posteriormente
  async contributeToGoal(goal_id, amount, wallet_id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const contribution = parseFloat(amount);
    if (isNaN(contribution) || contribution <= 0) {
      throw new Error("El monto a aportar debe ser mayor a 0.");
    }

    if (!wallet_id) {
      throw new Error("Debes seleccionar de qué cuenta saldrá el dinero.");
    }

    // 1. Obtener el fondo de ahorro actual
    const { data: goal, error: fetchErr } = await supabase
      .from("saving_goals")
      .select("*")
      .eq("id", goal_id)
      .single();

    if (fetchErr) throw fetchErr;

    const newAmount = Number(goal.current_amount) + contribution;

    // 2. Actualizar monto en saving_goals
    const { data: updatedGoal, error: updateErr } = await supabase
      .from("saving_goals")
      .update({ current_amount: newAmount })
      .eq("id", goal_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 3. Registrar en transacciones como gasto
    const categoryId = await resolveCategoryId(user.id, "expense");

    await transactionService.addTransaction({
      wallet_id,
      category_id: categoryId,
      type: "expense",
      title: `Ahorro: ${goal.title}`,
      amount: contribution
    });

    return updatedGoal;
  },

  // Retirar dinero de un fondo de ahorro y enviarlo a una billetera
  async withdrawFromGoal(goal_id, amount, wallet_id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const withdrawal = parseFloat(amount);
    if (isNaN(withdrawal) || withdrawal <= 0) {
      throw new Error("El monto a retirar debe ser mayor a 0.");
    }

    if (!wallet_id) {
      throw new Error("Debes seleccionar a qué cuenta entrará el dinero.");
    }

    // 1. Obtener el fondo de ahorro
    const { data: goal, error: fetchErr } = await supabase
      .from("saving_goals")
      .select("*")
      .eq("id", goal_id)
      .single();

    if (fetchErr) throw fetchErr;

    const currentTotal = Number(goal.current_amount);
    if (withdrawal > currentTotal) {
      throw new Error(
        `No puedes retirar más de lo que tienes ahorrado ($ ${currentTotal.toLocaleString("es-CO")}).`
      );
    }

    const newAmount = Math.max(0, currentTotal - withdrawal);

    // 2. Descontar del fondo de ahorro
    const { data: updatedGoal, error: updateErr } = await supabase
      .from("saving_goals")
      .update({ current_amount: newAmount })
      .eq("id", goal_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 3. Registrar como ingreso en la billetera seleccionada
    const categoryId = await resolveCategoryId(user.id, "income");

    await transactionService.addTransaction({
      wallet_id,
      category_id: categoryId,
      type: "income",
      title: `Retiro de Ahorro: ${goal.title}`,
      amount: withdrawal
    });

    return updatedGoal;
  },

  // Eliminar fondo de ahorro
  async deleteGoal(id) {
    const { error } = await supabase
      .from("saving_goals")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};
