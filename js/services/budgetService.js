// js/services/budgetService.js
import { supabase } from "../supabaseClient.js";
import { transactionService } from "./transactionService.js";

export const budgetService = {
  // Obtener todos los presupuestos con su gasto acumulado del mes y transacciones asociadas
  async getBudgets(year, month) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const now = new Date();
    const curYear = year || now.getFullYear();
    const curMonth = month || now.getMonth() + 1;

    // 1. Consultar presupuestos con su categoría vinculada
    const { data: budgets, error: bErr } = await supabase
      .from("budgets")
      .select(`
        *,
        category:categories(id, name, icon, color, type)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (bErr) throw bErr;

    // 2. Consultar las transacciones del mes
    const transactions = await transactionService.getTransactions(curYear, curMonth);

    // 3. Cruzar cada presupuesto con sus gastos reales de este mes
    const processed = (budgets || []).map(b => {
      const catId = b.category_id;
      const catTransactions = (transactions || []).filter(t => 
        t.type === "expense" && (t.category_id === catId || t.category?.id === catId)
      );

      const spent = catTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const limit = Number(b.monthly_limit || 0);
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      const remaining = limit - spent;
      const isExceeded = spent > limit;

      return {
        ...b,
        spent: Math.round(spent),
        limit: Math.round(limit),
        percentage,
        remaining: Math.round(remaining),
        isExceeded,
        transactions: catTransactions // Transacciones del mes para el modal de detalle
      };
    });

    const totalBudgeted = processed.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = processed.reduce((sum, b) => sum + b.spent, 0);
    const globalPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

    return {
      budgets: processed,
      totalBudgeted,
      totalSpent,
      globalPercentage,
      totalRemaining: Math.max(0, totalBudgeted - totalSpent)
    };
  },

  // Crear o actualizar límite de presupuesto por categoría
  async setBudget({ category_id, monthly_limit }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const limit = parseFloat(monthly_limit);
    if (isNaN(limit) || limit <= 0) throw new Error("Ingresa un monto válido mayor a 0");

    const { data, error } = await supabase
      .from("budgets")
      .upsert(
        {
          user_id: user.id,
          category_id,
          monthly_limit: limit
        },
        { onConflict: "user_id, category_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar un presupuesto
  async deleteBudget(id) {
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};