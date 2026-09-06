// js/services/goalService.js
import { supabase } from "../supabaseClient.js";
import { transactionService } from "./transactionService.js";

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
      progressPercentage: Math.min(100, Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100))
    }));
  },

  // Crear fondo de ahorro (AHORA REGISTRA EN GASTOS SI HAY DINERO INICIAL)
  async createGoal({ title, target_amount, current_amount = 0, target_date = null, icon = "fa-piggy-bank", wallet_id = null }) {
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

    // 2. Si se puso dinero inicial y se eligió cuenta, registrar el gasto de inmediato
    if (initialAmount > 0 && wallet_id) {
      let categoryId = null;
      const { data: ahorroCat } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .ilike("name", "%ahorro%")
        .limit(1)
        .maybeSingle();

      if (ahorroCat) {
        categoryId = ahorroCat.id;
      } else {
        const { data: fallbackCat } = await supabase
          .from("categories")
          .select("id")
          .eq("user_id", user.id)
          .eq("type", "expense")
          .limit(1)
          .maybeSingle();
        if (fallbackCat) categoryId = fallbackCat.id;
      }

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

    // 1. Obtener el fondo de ahorro
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

    // 3. Buscar categoría de 'Ahorro'
    let categoryId = null;
    const { data: ahorroCat } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .ilike("name", "%ahorro%")
      .limit(1)
      .maybeSingle();

    if (ahorroCat) {
      categoryId = ahorroCat.id;
    } else {
      const { data: fallbackCat } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .limit(1)
        .maybeSingle();
      if (fallbackCat) categoryId = fallbackCat.id;
    }

    // 4. Registrar en transacciones como gasto
    await transactionService.addTransaction({
      wallet_id,
      category_id: categoryId,
      type: "expense",
      title: `Ahorro: ${goal.title}`,
      amount: contribution
    });

    return updatedGoal;
  },

  // Eliminar fondo
  async deleteGoal(id) {
    const { error } = await supabase
      .from("saving_goals")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};