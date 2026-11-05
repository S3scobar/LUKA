// js/services/loanService.js — préstamos recibidos (apps de crédito, bancos, personas)
import { supabase, requireUserId } from "../supabaseClient.js";
import { walletService } from "./walletService.js";
import { transactionService } from "./transactionService.js";
import { categoryService } from "./categoryService.js";

const LOAN_COLUMNS = "*, payments:loan_payments(id, amount, payment_date, transaction_id)";

export const LENDER_TYPES = {
  app:    { label: "App de crédito", icon: "fa-mobile-screen-button", color: "#8B5CF6" },
  person: { label: "Persona",        icon: "fa-user-group",           color: "#F59E0B" },
  bank:   { label: "Banco",          icon: "fa-building-columns",     color: "#3B82F6" }
};

const toIso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// Suma meses a una fecha "YYYY-MM-DD" respetando fin de mes (31 ene + 1 mes = 28 feb)
function addMonths(isoDate, months) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const lastDay = new Date(year, month - 1 + months + 1, 0).getDate();
  return toIso(new Date(year, month - 1 + months, Math.min(day, lastDay)));
}

// La tabla no existe si todavía no se corrió el SQL de préstamos en Supabase
export function isMissingLoansTable(error) {
  const text = `${error?.code || ""} ${error?.message || ""}`;
  return /PGRST205|42P01/.test(text) || (/loan/i.test(text) && /schema cache|does not exist/i.test(text));
}

export const loanService = {
  async getLoans() {
    const { data, error } = await supabase
      .from("loans")
      .select(LOAN_COLUMNS)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || []).map((loan) => ({
      ...loan,
      payments: (loan.payments || []).sort((a, b) => b.payment_date.localeCompare(a.payment_date))
    }));
  },

  // receive_wallet_id: si se indica, el dinero prestado se suma a esa cuenta (sin contarlo como ingreso)
  async createLoan({ name, lender_type, principal, installments, interest_rate_ea, first_due_date, notes, receive_wallet_id }) {
    const userId = await requireUserId();
    const hasInstallments = Number(installments) > 0;

    const { data, error } = await supabase
      .from("loans")
      .insert([{
        user_id: userId,
        name: name.trim(),
        lender_type,
        principal: Number(principal),
        installments: hasInstallments ? parseInt(installments) : null,
        interest_rate_ea: hasInstallments ? Number(interest_rate_ea) || 0 : 0,
        first_due_date: first_due_date || null,
        notes: notes?.trim() || null,
        color: LENDER_TYPES[lender_type]?.color
      }])
      .select(LOAN_COLUMNS)
      .single();

    if (error) throw error;

    if (receive_wallet_id) {
      try {
        await walletService.adjustBalance(receive_wallet_id, Number(principal));
      } catch (err) {
        // Sin el saldo en la cuenta el préstamo quedaría a medias: se deshace
        await supabase.from("loans").delete().eq("id", data.id);
        throw err;
      }
    }
    return data;
  },

  async updateLoan(id, { name, lender_type, principal, installments, interest_rate_ea, first_due_date, notes }) {
    const hasInstallments = Number(installments) > 0;
    const { data, error } = await supabase
      .from("loans")
      .update({
        name: name.trim(),
        lender_type,
        principal: Number(principal),
        installments: hasInstallments ? parseInt(installments) : null,
        interest_rate_ea: hasInstallments ? Number(interest_rate_ea) || 0 : 0,
        first_due_date: first_due_date || null,
        notes: notes?.trim() || null,
        color: LENDER_TYPES[lender_type]?.color
      })
      .eq("id", id)
      .select(LOAN_COLUMNS)
      .single();

    if (error) throw error;
    return data;
  },

  // Los pagos se borran con el préstamo; los gastos que generaron se conservan en el historial
  async deleteLoan(id) {
    const { error } = await supabase.from("loans").delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  // Registra el pago como gasto (el trigger descuenta la cuenta) y lo anota en el préstamo
  async addPayment({ loan, amount, from_wallet_id, date = null }) {
    const userId = await requireUserId();
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) throw new Error("Monto inválido");

    const summary = this.calculateSummary(loan);
    if (value > summary.remaining) {
      throw new Error(`El pago supera el saldo pendiente ($ ${summary.remaining.toLocaleString("es-CO")}).`);
    }

    const categoryId = await categoryService.resolveCategoryId(userId, "expense");
    const transaction = await transactionService.addTransaction({
      wallet_id: from_wallet_id,
      category_id: categoryId,
      type: "expense",
      title: `Pago préstamo: ${loan.name}`,
      amount: value,
      date
    });

    const { error } = await supabase.from("loan_payments").insert([{
      user_id: userId,
      loan_id: loan.id,
      transaction_id: transaction.id,
      amount: value,
      payment_date: date || toIso(new Date())
    }]);

    if (error) {
      // Sin el registro en el préstamo, el gasto quedaría huérfano: se devuelve el dinero a la cuenta
      await supabase.from("transactions").delete().eq("id", transaction.id);
      throw error;
    }
    return true;
  },

  // Al borrar un pago también se borra su gasto, y el trigger devuelve el dinero a la cuenta
  async deletePayment(payment) {
    const { error } = await supabase.from("loan_payments").delete().eq("id", payment.id);
    if (error) throw error;

    if (payment.transaction_id) {
      const { error: txError } = await supabase.from("transactions").delete().eq("id", payment.transaction_id);
      if (txError) throw txError;
    }
    return true;
  },

  // Cifras del préstamo calculadas al momento: cuota, saldo, progreso y próxima fecha
  calculateSummary(loan) {
    const principal = Number(loan.principal) || 0;
    const installments = Number(loan.installments) || 0;
    const rateEA = (Number(loan.interest_rate_ea) || 0) / 100;
    const monthlyRate = Math.pow(1 + rateEA, 1 / 12) - 1;

    // Con cuotas: cuota fija (sistema francés). Sin cuotas: se paga lo prestado cuando se pueda.
    let installmentAmount = 0;
    if (installments > 0) {
      installmentAmount = monthlyRate > 0
        ? (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -installments))
        : principal / installments;
      installmentAmount = Math.round(installmentAmount);
    }

    const totalToPay = installments > 0 ? installmentAmount * installments : principal;
    const paid = (loan.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Math.max(0, totalToPay - paid);
    const isPaid = totalToPay > 0 && remaining === 0;
    const progress = totalToPay > 0 ? Math.min(100, Math.round((paid / totalToPay) * 100)) : 0;
    const installmentsPaid = installmentAmount > 0 ? Math.min(installments, Math.floor(paid / installmentAmount)) : 0;

    let nextDueDate = null;
    if (!isPaid && loan.first_due_date) {
      nextDueDate = installments > 0 ? addMonths(loan.first_due_date, installmentsPaid) : loan.first_due_date;
    }

    let nextPaymentAmount = remaining;
    if (installments > 0) {
      // Lo que falta para completar la cuota en curso (si ya se abonó una parte) o la cuota entera
      const intoCurrent = paid - installmentsPaid * installmentAmount;
      nextPaymentAmount = Math.min(remaining, Math.max(0, installmentAmount - intoCurrent));
    }

    let daysLate = 0;
    if (nextDueDate) {
      const [y, m, d] = nextDueDate.split("-").map(Number);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      daysLate = Math.floor((today - new Date(y, m - 1, d)) / 86400000);
    }

    return {
      installmentAmount, totalToPay, paid, remaining, isPaid, progress,
      installmentsPaid, nextDueDate, nextPaymentAmount,
      isOverdue: daysLate > 0, daysLate: Math.max(0, daysLate),
      monthlyRatePercentage: (monthlyRate * 100).toFixed(2)
    };
  }
};
