// js/services/goalService.js
import { supabase } from "../supabaseClient.js";
import { transactionService } from "./transactionService.js";

export const goalService = {
  // Obtener todas las metas de ahorro
  async getGoals() {
    const { data, error } = await supabase
      .from("saving_goals")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Calcular porcentaje de progreso
    return (data || []).map(goal => ({
      ...goal,
      progressPercentage: Math.min(100, Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100))
    }));
  },

  // Crear meta de ahorro
  async createGoal({ title, target_amount, current_amount = 0, target_date = null, icon = "fa-bullseye" }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { data, error } = await supabase
      .from("saving_goals")
      .insert([
        {
          user_id: user.id,
          title: title.trim(),
          target_amount: parseFloat(target_amount),
          current_amount: parseFloat(current_amount) || 0,
          target_date: target_date || null,
          icon
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Aportar dinero a una meta (suma a la meta y descuenta de la billetera registrando un gasto de ahorro)
  async contributeToGoal(goal_id, amount, wallet_id = null) {
    const contribution = parseFloat(amount);
    if (isNaN(contribution) || contribution <= 0) {
      throw new Error("El monto a aportar debe ser mayor a 0.");
    }

    // 1. Obtener la meta actual
    const { data: goal, error: fetchErr } = await supabase
      .from("saving_goals")
      .select("*")
      .eq("id", goal_id)
      .single();

    if (fetchErr) throw fetchErr;

    const newAmount = Number(goal.current_amount) + contribution;

    // 2. Actualizar monto en la meta
    const { data: updatedGoal, error: updateErr } = await supabase
      .from("saving_goals")
      .update({ current_amount: newAmount })
      .eq("id", goal_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 3. Si se seleccionó billetera, registrar el gasto para descontar el saldo automáticamente
    if (wallet_id) {
      // Buscar si existe categoría 'Ahorro' o tomar la primera de gastos disponible
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("type", "expense")
        .limit(1)
        .single();

      if (cat) {
        await transactionService.addTransaction({
          wallet_id,
          category_id: cat.id,
          type: "expense",
          title: `Aporte a meta: ${goal.title}`,
          amount: contribution
        });
      }
    }

    return updatedGoal;
  },

  // Eliminar meta
  async deleteGoal(id) {
    const { error } = await supabase
      .from("saving_goals")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};