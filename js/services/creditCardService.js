// js/services/creditCardService.js
import { supabase, requireUserId } from "../supabaseClient.js";
import { walletService } from "./walletService.js";
import { transactionService } from "./transactionService.js";
import { categoryService } from "./categoryService.js";

export const creditCardService = {
  // Obtener todas las tarjetas
  async getCreditCards() {
    const { data, error } = await supabase
      .from("credit_cards")
      .select(`
        *,
        wallet:wallets(id, name, balance, color, icon)
      `)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Crear tarjeta
  async createCreditCard({ name, credit_limit, interest_rate_ea, cutoff_day, payment_due_day, management_fee = 0, color = "#8B5CF6" }) {
    const userId = await requireUserId();

    const linkedWallet = await walletService.createWallet({
      name: `${name.trim()} (Crédito)`,
      balance: parseFloat(credit_limit),
      color,
      icon: "fa-credit-card"
    });

    const { data, error } = await supabase
      .from("credit_cards")
      .insert([
        {
          user_id: userId,
          wallet_id: linkedWallet.id,
          name: name.trim(),
          credit_limit: parseFloat(credit_limit),
          interest_rate_ea: parseFloat(interest_rate_ea),
          cutoff_day: parseInt(cutoff_day),
          payment_due_day: parseInt(payment_due_day),
          management_fee: parseFloat(management_fee) || 0,
          color
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Modificar datos de la tarjeta
  async updateCreditCard(id, { name, credit_limit, interest_rate_ea, cutoff_day, payment_due_day, management_fee, color }) {
    const { data: currentCard, error: fetchErr } = await supabase
      .from("credit_cards")
      .select("*, wallet:wallets(id, balance)")
      .eq("id", id)
      .single();
    if (fetchErr) throw fetchErr;

    const newLimit = parseFloat(credit_limit);
    const oldLimit = Number(currentCard.credit_limit);
    const oldBalance = Number(currentCard.wallet?.balance || 0);
    const currentDebt = Math.max(0, oldLimit - oldBalance);
    const newAvailable = Math.max(0, newLimit - currentDebt);

    const { data, error } = await supabase
      .from("credit_cards")
      .update({
        name: name.trim(),
        credit_limit: newLimit,
        interest_rate_ea: parseFloat(interest_rate_ea),
        cutoff_day: parseInt(cutoff_day),
        payment_due_day: parseInt(payment_due_day),
        management_fee: parseFloat(management_fee) || 0,
        color
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    if (currentCard.wallet_id) {
      await walletService.updateWallet(currentCard.wallet_id, {
        name: `${name.trim()} (Crédito)`,
        balance: newAvailable,
        color
      });
    }

    return data;
  },

  // Eliminar tarjeta completa
  async deleteCreditCard(id) {
    const { data: card } = await supabase
      .from("credit_cards")
      .select("wallet_id")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("credit_cards")
      .delete()
      .eq("id", id);
    if (error) throw error;

    if (card?.wallet_id) {
      await walletService.deleteWallet(card.wallet_id);
    }
    return true;
  },

  // Obtener compras y avances
  async getPurchases(card_id) {
    const { data, error } = await supabase
      .from("credit_card_purchases")
      .select(`
        *,
        category:categories(name, icon, color)
      `)
      .eq("card_id", card_id)
      .order("purchase_date", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtiene las compras de varias tarjetas en UNA sola consulta, agrupadas por tarjeta
  async getPurchasesForCards(cardIds) {
    const grouped = new Map(cardIds.map(id => [id, []]));
    if (cardIds.length === 0) return grouped;

    const { data, error } = await supabase
      .from("credit_card_purchases")
      .select("*")
      .in("card_id", cardIds)
      .order("purchase_date", { ascending: false });

    if (error) throw error;
    for (const purchase of data || []) {
      grouped.get(purchase.card_id)?.push(purchase);
    }
    return grouped;
  },

  // Registra una compra o un avance: descuenta cupo sin crear un gasto duplicado en transactions
  async addPurchase({ card_id, category_id, title, total_amount, installments = 1, is_advance = false, advance_fee = 0, target_wallet_id = null, is_zero_interest = false }) {
    const userId = await requireUserId();

    const amount = parseFloat(total_amount);
    const fee = parseFloat(advance_fee) || 0;
    const totalImpact = amount + fee;

    const { data: card, error: cardErr } = await supabase
      .from("credit_cards")
      .select("id, wallet_id")
      .eq("id", card_id)
      .single();
    if (cardErr) throw cardErr;

    // Si no viene categoría, usar la primera categoría de gasto del usuario
    const finalCategoryId = category_id || await categoryService.resolveCategoryId(userId, "expense");

    const { data: purchase, error: purErr } = await supabase
      .from("credit_card_purchases")
      .insert([
        {
          user_id: userId,
          card_id,
          category_id: finalCategoryId,
          title: title.trim(),
          total_amount: amount,
          installments: parseInt(installments) || 1,
          installments_paid: 0,
          is_advance,
          advance_fee: fee,
          is_zero_interest: Boolean(is_zero_interest),
          purchase_date: new Date().toISOString().split("T")[0],
          transaction_id: null
        }
      ])
      .select()
      .single();
    if (purErr) throw purErr;

    if (card.wallet_id) {
      await walletService.adjustBalance(card.wallet_id, -totalImpact);
    }

    // En un avance el dinero entra a la cuenta destino. El saldo sube solo: el trigger
    // tr_transaction_balance suma el ingreso, así que aquí no se ajusta a mano.
    if (is_advance && target_wallet_id) {
      await transactionService.addTransaction({
        wallet_id: target_wallet_id,
        category_id: null,
        type: "income",
        title: "Avance de Tarjeta de Crédito",
        amount: amount
      });
    }

    return purchase;
  },

  // Eliminar compra/avance (restaura cupo)
  async deletePurchase(purchase_id) {
    const { data: purchase, error: fetchErr } = await supabase
      .from("credit_card_purchases")
      .select("*, card:credit_cards(id, wallet_id, credit_limit)")
      .eq("id", purchase_id)
      .single();

    if (fetchErr) throw fetchErr;

    const totalImpact = Number(purchase.total_amount) + Number(purchase.advance_fee || 0);

    if (purchase.transaction_id) {
      await supabase.from("transactions").delete().eq("id", purchase.transaction_id);
    }

    const { error: delErr } = await supabase
      .from("credit_card_purchases")
      .delete()
      .eq("id", purchase_id);
    if (delErr) throw delErr;

    // Devolver el cupo sin pasarse del límite de la tarjeta
    if (purchase.card?.wallet_id) {
      await walletService.adjustBalance(purchase.card.wallet_id, totalImpact, {
        max: Number(purchase.card.credit_limit)
      });
    }

    return true;
  },

  // Pago de tarjeta: registra el gasto en la cuenta de débito (el trigger tr_transaction_balance
  // descuenta el saldo), libera cupo y avanza una cuota en cada compra pendiente
  async payCard({ card_id, payment_amount, from_wallet_id }) {
    const userId = await requireUserId();
    const payVal = parseFloat(payment_amount);
    if (isNaN(payVal) || payVal <= 0) throw new Error("Monto inválido");

    const [cardRes, purchasesRes, fallbackCategoryId] = await Promise.all([
      supabase.from("credit_cards").select("id, name, wallet_id, credit_limit").eq("id", card_id).single(),
      supabase.from("credit_card_purchases").select("id, installments, installments_paid").eq("card_id", card_id),
      categoryService.resolveCategoryId(userId, "expense")
    ]);

    if (cardRes.error) throw cardRes.error;
    if (purchasesRes.error) throw purchasesRes.error;
    const card = cardRes.data;
    const activePurchases = purchasesRes.data || [];

    // Primero el gasto: si falla (cuenta inexistente, por ejemplo) todavía no se ha tocado nada más
    await transactionService.addTransaction({
      wallet_id: from_wallet_id,
      category_id: fallbackCategoryId,
      type: "expense",
      title: `Pago Tarjeta: ${card.name}`,
      amount: payVal
    });

    const updates = [];

    if (card.wallet_id) {
      updates.push(walletService.adjustBalance(card.wallet_id, payVal, { max: Number(card.credit_limit) }));
    }

    for (const p of activePurchases) {
      if (p.installments_paid < p.installments) {
        updates.push(
          supabase
            .from("credit_card_purchases")
            .update({ installments_paid: p.installments_paid + 1 })
            .eq("id", p.id)
        );
      }
    }

    await Promise.all(updates);

    return true;
  },

  // Proyección del extracto del próximo corte, calculada al momento con las compras pendientes
  calculateStatement(card, purchases = []) {
    const list = Array.isArray(purchases) ? purchases : [];
    const creditLimit = Number(card?.credit_limit || 0);
    const availableCredit = Number(card?.wallet?.balance ?? creditLimit);
    const totalDebt = Math.max(0, creditLimit - availableCredit);

    const cutoffDay = parseInt(card?.cutoff_day) || 1;
    const paymentDueDay = parseInt(card?.payment_due_day) || 15;

    const rateEA = Number(card?.interest_rate_ea || 0) / 100;
    const monthlyRate = Math.pow(1 + rateEA, 1 / 12) - 1;

    // Corte que se está acumulando
    const now = new Date();
    let targetCutoffYear = now.getFullYear();
    let targetCutoffMonth = now.getMonth();
    if (now.getDate() > cutoffDay) {
      // Si hoy ya pasó el corte, las compras entran al corte del mes siguiente
      targetCutoffMonth += 1;
      if (targetCutoffMonth > 11) {
        targetCutoffMonth = 0;
        targetCutoffYear += 1;
      }
    }
    const targetCutoff = new Date(targetCutoffYear, targetCutoffMonth, cutoffDay, 23, 59, 59);

    // Fecha límite de pago de ese corte
    let dueMonth = targetCutoff.getMonth();
    let dueYear = targetCutoff.getFullYear();
    if (paymentDueDay <= cutoffDay) {
      dueMonth += 1;
      if (dueMonth > 11) {
        dueMonth = 0;
        dueYear += 1;
      }
    }

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const dueDateLabel = `${paymentDueDay} de ${monthNames[dueMonth]}`;

    let totalPrincipalToPayThisMonth = 0;
    let totalInterestThisMonth = 0;

    // Solo considerar las compras que tengan cuotas pendientes
    const pendingPurchases = list.filter(p => p.installments_paid < p.installments);

    pendingPurchases.forEach(p => {
      const remainingInstallments = p.installments - p.installments_paid;
      const principalPerInstallment = Number(p.total_amount) / p.installments;
      const remainingDebt = principalPerInstallment * remainingInstallments;

      // Si la compra se realizó antes o el día del corte objetivo, entra en la cuota
      const pDate = new Date((p.purchase_date || "") + "T23:59:59");
      if (!isNaN(pDate.getTime()) && pDate.getTime() > targetCutoff.getTime()) {
        return; // Pertenece a un corte aún más futuro
      }

      totalPrincipalToPayThisMonth += principalPerInstallment;

      // Una sola cuota (que no sea avance) y los convenios al 0 % no generan interés
      const hasInterest = !((p.installments === 1 && !p.is_advance) || p.is_zero_interest);
      if (hasInterest) {
        totalInterestThisMonth += remainingDebt * monthlyRate;
      }
    });

    const managementFee = Number(card?.management_fee || 0);
    const hasCurrentCharges = (totalPrincipalToPayThisMonth > 0 || totalInterestThisMonth > 0);
    const feeToCharge = hasCurrentCharges ? managementFee : 0;
    const estimatedStatement = totalPrincipalToPayThisMonth + totalInterestThisMonth + feeToCharge;

    return {
      creditLimit,
      availableCredit,
      totalDebt,
      monthlyRatePercentage: (monthlyRate * 100).toFixed(2),
      totalPrincipalToPayThisMonth: Math.round(totalPrincipalToPayThisMonth),
      totalInterestThisMonth: Math.round(totalInterestThisMonth),
      managementFee: feeToCharge,
      estimatedStatement: Math.round(estimatedStatement),
      dueDateLabel,
      activePurchases: list
    };
  },

  // Total a pagar de todas las tarjetas, para el banner de Inicio
  async getTotalStatementSummary() {
    const empty = { totalDue: 0, earliestDueDay: null, dueDateLabel: null, hasCards: false };

    try {
      const cards = await this.getCreditCards();
      if (!cards || cards.length === 0) return empty;

      const now = new Date();
      const [purchasesByCard, monthTransactions] = await Promise.all([
        this.getPurchasesForCards(cards.map(c => c.id)),
        transactionService.getTransactions(now.getFullYear(), now.getMonth() + 1)
      ]);

      // Títulos de pagos de tarjeta ya registrados este mes (en minúsculas, calculado una sola vez)
      const paidTitles = (monthTransactions || [])
        .filter(t => t.type === "expense" && t.title)
        .map(t => t.title.toLowerCase())
        .filter(title => title.includes("pago tarjeta"));

      let totalDue = 0;
      let earliestDueDay = null;
      let dueDateLabel = null;

      for (const card of cards) {
        const statement = this.calculateStatement(card, purchasesByCard.get(card.id) || []);
        if (statement.estimatedStatement <= 0) continue;

        const cardName = card.name.toLowerCase();
        if (paidTitles.some(title => title.includes(cardName))) continue;

        totalDue += statement.estimatedStatement;
        const dueDay = parseInt(card.payment_due_day);
        if (dueDay && (!earliestDueDay || dueDay < earliestDueDay)) {
          earliestDueDay = dueDay;
          dueDateLabel = statement.dueDateLabel;
        }
      }

      return {
        totalDue: Math.round(totalDue),
        earliestDueDay,
        dueDateLabel,
        hasCards: true
      };
    } catch {
      return empty;
    }
  }
};
