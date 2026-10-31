// js/services/goalService.js
import { supabase, requireUserId } from "../supabaseClient.js";
import { transactionService } from "./transactionService.js";
import { categoryService } from "./categoryService.js";

// Función matemática para liquidar rendimientos diarios (Tasa Efectiva Anual -> Diaria)
function calculatePendingYield(goal) {
  const yieldRate = parseFloat(goal.yield_rate) || 0;
  const currentAmount = parseFloat(goal.current_amount) || 0;

  if (yieldRate <= 0 || currentAmount <= 0) return null;

  const lastDate = goal.last_yield_date ? new Date(goal.last_yield_date) : new Date(goal.created_at);
  const now = new Date();

  const diffMs = now.getTime() - lastDate.getTime();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysPassed = Math.floor(diffMs / msPerDay);

  // Si no ha pasado al menos un día completo (24h), no liquida aún
  if (daysPassed < 1) return null;

  // Fórmula E.A. a Tasa Diaria
  const annualRate = yieldRate / 100;
  const dailyRate = Math.pow(1 + annualRate, 1 / 365) - 1;

  // Interés compuesto por los días transcurridos
  const newAmount = currentAmount * Math.pow(1 + dailyRate, daysPassed);
  
  // Avanzar la fecha exactamente los días liquidados para no perder horas residuales
  const updatedDate = new Date(lastDate.getTime() + daysPassed * msPerDay).toISOString();

  return {
    newAmount: Math.round(newAmount), // Redondeado al entero más cercano (COP)
    updatedDate
  };
}

export const goalService = {
  // Obtener metas y liquidar rendimientos pendientes automáticamente
  async getGoals() {
    const { data, error } = await supabase
      .from("saving_goals")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const goals = data || [];

    // Liquidar rendimientos pendientes: las actualizaciones son independientes, se envían en paralelo.
    // Si alguna falla no se interrumpe la carga: el rendimiento se recalcula en la siguiente consulta
    // porque last_yield_date no avanzó.
    const pendingUpdates = [];
    for (const goal of goals) {
      const yieldResult = calculatePendingYield(goal);
      if (!yieldResult) continue;

      goal.current_amount = yieldResult.newAmount;
      goal.last_yield_date = yieldResult.updatedDate;

      pendingUpdates.push(
        supabase
          .from("saving_goals")
          .update({
            current_amount: yieldResult.newAmount,
            last_yield_date: yieldResult.updatedDate
          })
          .eq("id", goal.id)
      );
    }
    if (pendingUpdates.length > 0) await Promise.all(pendingUpdates);

    return goals.map(goal => ({
      ...goal,
      yield_rate: parseFloat(goal.yield_rate) || 0,
      progressPercentage: Math.min(
        100,
        Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100)
      )
    }));
  },

  // Crear fondo o cajita de ahorro con rendimiento opcional
  async createGoal({
    title,
    target_amount,
    current_amount = 0,
    target_date = null,
    icon = "fa-piggy-bank",
    wallet_id = null,
    yield_rate = 0 // Tasa anual en porcentaje (ej: 13 para 13% E.A.)
  }) {
    const userId = await requireUserId();

    const initialAmount = parseFloat(current_amount) || 0;
    const rate = parseFloat(yield_rate) || 0;
    const nowIso = new Date().toISOString();

    // 1. Guardar en saving_goals
    const { data, error } = await supabase
      .from("saving_goals")
      .insert([
        {
          user_id: userId,
          title: title.trim(),
          target_amount: parseFloat(target_amount),
          current_amount: initialAmount,
          target_date: target_date || null,
          icon,
          yield_rate: rate,
          last_yield_date: nowIso
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // 2. Si hay dinero inicial y se eligió cuenta, registrar el gasto
    if (initialAmount > 0 && wallet_id) {
      const categoryId = await categoryService.resolveCategoryId(userId, "expense", "%ahorro%");

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

  // Aportar dinero a la meta
  async contributeToGoal(goal_id, amount, wallet_id) {
    const userId = await requireUserId();

    const contribution = parseFloat(amount);
    if (isNaN(contribution) || contribution <= 0) {
      throw new Error("El monto a aportar debe ser mayor a 0.");
    }

    if (!wallet_id) {
      throw new Error("Debes seleccionar de qué cuenta saldrá el dinero.");
    }

    // 1. Obtener la meta actual
    const { data: goal, error: fetchErr } = await supabase
      .from("saving_goals")
      .select("*")
      .eq("id", goal_id)
      .single();

    if (fetchErr) throw fetchErr;

    // Si había rendimientos pendientes antes del aporte, liquidarlos primero
    let baseAmount = Number(goal.current_amount);
    const yieldResult = calculatePendingYield(goal);
    if (yieldResult) {
      baseAmount = yieldResult.newAmount;
    }

    const newAmount = baseAmount + contribution;
    const nowIso = new Date().toISOString();

    // 2. Actualizar monto y resetear fecha de corte al momento del nuevo aporte
    const { data: updatedGoal, error: updateErr } = await supabase
      .from("saving_goals")
      .update({
        current_amount: newAmount,
        last_yield_date: nowIso
      })
      .eq("id", goal_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 3. Registrar como gasto de ahorro en la billetera
    const categoryId = await categoryService.resolveCategoryId(userId, "expense", "%ahorro%");

    await transactionService.addTransaction({
      wallet_id,
      category_id: categoryId,
      type: "expense",
      title: `Ahorro: ${goal.title}`,
      amount: contribution
    });

    return updatedGoal;
  },

  // Retirar dinero de la cajita hacia una billetera
  async withdrawFromGoal(goal_id, amount, wallet_id) {
    const userId = await requireUserId();

    const withdrawal = parseFloat(amount);
    if (isNaN(withdrawal) || withdrawal <= 0) {
      throw new Error("El monto a retirar debe ser mayor a 0.");
    }

    if (!wallet_id) {
      throw new Error("Debes seleccionar a qué cuenta entrará el dinero.");
    }

    const { data: goal, error: fetchErr } = await supabase
      .from("saving_goals")
      .select("*")
      .eq("id", goal_id)
      .single();

    if (fetchErr) throw fetchErr;

    let currentTotal = Number(goal.current_amount);
    const yieldResult = calculatePendingYield(goal);
    if (yieldResult) {
      currentTotal = yieldResult.newAmount;
    }

    if (withdrawal > currentTotal) {
      throw new Error(
        `No puedes retirar más de lo que tienes ahorrado ($ ${currentTotal.toLocaleString("es-CO")}).`
      );
    }

    const newAmount = Math.max(0, currentTotal - withdrawal);
    const nowIso = new Date().toISOString();

    const { data: updatedGoal, error: updateErr } = await supabase
      .from("saving_goals")
      .update({
        current_amount: newAmount,
        last_yield_date: nowIso
      })
      .eq("id", goal_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Registrar como ingreso en la billetera seleccionada
    const categoryId = await categoryService.resolveCategoryId(userId, "income", "%ahorro%");

    await transactionService.addTransaction({
      wallet_id,
      category_id: categoryId,
      type: "income",
      title: `Retiro de Ahorro: ${goal.title}`,
      amount: withdrawal
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