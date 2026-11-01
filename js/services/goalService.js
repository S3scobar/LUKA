// js/services/goalService.js
import { supabase, requireUserId } from "../supabaseClient.js";
import { transactionService } from "./transactionService.js";
import { categoryService } from "./categoryService.js";

// Rendimiento pendiente de un fondo: convierte la tasa E.A. a diaria y la compone por los días completos transcurridos
function calculatePendingYield(goal) {
  const yieldRate = parseFloat(goal.yield_rate) || 0;
  const currentAmount = parseFloat(goal.current_amount) || 0;

  if (yieldRate <= 0 || currentAmount <= 0) return null;

  const lastDate = goal.last_yield_date ? new Date(goal.last_yield_date) : new Date(goal.created_at);
  const now = new Date();

  const diffMs = now.getTime() - lastDate.getTime();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysPassed = Math.floor(diffMs / msPerDay);

  // Sin un día completo transcurrido no hay nada que liquidar
  if (daysPassed < 1) return null;

  const annualRate = yieldRate / 100;
  const dailyRate = Math.pow(1 + annualRate, 1 / 365) - 1;

  const newAmount = currentAmount * Math.pow(1 + dailyRate, daysPassed);

  // La fecha avanza solo los días liquidados para no perder las horas sobrantes
  const updatedDate = new Date(lastDate.getTime() + daysPassed * msPerDay).toISOString();

  return {
    newAmount: Math.round(newAmount), // pesos enteros
    updatedDate
  };
}

export const goalService = {
  // Devuelve los fondos y liquida antes los rendimientos pendientes
  async getGoals() {
    const { data, error } = await supabase
      .from("saving_goals")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const goals = data || [];

    // Si una actualización falla no se interrumpe la carga: como last_yield_date no avanzó,
    // el rendimiento se vuelve a calcular en la siguiente consulta.
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

  // Crea un fondo de ahorro; yield_rate es la tasa E.A. en porcentaje (13 = 13 %)
  async createGoal({
    title,
    target_amount,
    current_amount = 0,
    target_date = null,
    icon = "fa-piggy-bank",
    wallet_id = null,
    yield_rate = 0
  }) {
    const userId = await requireUserId();

    const initialAmount = parseFloat(current_amount) || 0;
    const rate = parseFloat(yield_rate) || 0;
    const nowIso = new Date().toISOString();

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

    // El dinero inicial sale de la cuenta elegida y queda como gasto de ahorro
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

  // Aporte a un fondo: sale de la billetera y queda como gasto de ahorro
  async contributeToGoal(goal_id, amount, wallet_id) {
    const userId = await requireUserId();

    const contribution = parseFloat(amount);
    if (isNaN(contribution) || contribution <= 0) {
      throw new Error("El monto a aportar debe ser mayor a 0.");
    }

    if (!wallet_id) {
      throw new Error("Debes seleccionar de qué cuenta saldrá el dinero.");
    }

    const { data: goal, error: fetchErr } = await supabase
      .from("saving_goals")
      .select("*")
      .eq("id", goal_id)
      .single();

    if (fetchErr) throw fetchErr;

    // Primero se liquidan los rendimientos pendientes
    let baseAmount = Number(goal.current_amount);
    const yieldResult = calculatePendingYield(goal);
    if (yieldResult) {
      baseAmount = yieldResult.newAmount;
    }

    const newAmount = baseAmount + contribution;
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

  // Retiro de un fondo hacia una billetera, registrado como ingreso
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

  // Elimina el fondo (no devuelve el dinero a ninguna billetera)
  async deleteGoal(id) {
    const { error } = await supabase
      .from("saving_goals")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};