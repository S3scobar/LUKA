// js/services/creditCardService.js
import { supabase } from "../supabaseClient.js";
import { walletService } from "./walletService.js";
import { transactionService } from "./transactionService.js";

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

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
          user_id: user.id,
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

  // Registrar compra o avance (DESCUENTA CUPO SIN DUPLICAR GASTO EN TRANSACTIONS)
  async addPurchase({ card_id, category_id, title, total_amount, installments = 1, is_advance = false, advance_fee = 0, target_wallet_id = null, is_zero_interest = false }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const amount = parseFloat(total_amount);
    const fee = parseFloat(advance_fee) || 0;
    const totalImpact = amount + fee;

    const { data: card, error: cardErr } = await supabase
      .from("credit_cards")
      .select("*, wallet:wallets(id, balance)")
      .eq("id", card_id)
      .single();
    if (cardErr) throw cardErr;

    // Buscar categoría de respaldo si viene vacía
    let finalCategoryId = category_id;
    if (!finalCategoryId) {
      const { data: fallbackCat } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .limit(1)
        .maybeSingle();
      if (fallbackCat) finalCategoryId = fallbackCat.id;
    }

    // 1. Registrar la compra diferida en credit_card_purchases
    const { data: purchase, error: purErr } = await supabase
      .from("credit_card_purchases")
      .insert([
        {
          user_id: user.id,
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

    // 2. Descontar cupo disponible de la tarjeta
    if (card.wallet_id) {
      const newAvailable = Number(card.wallet?.balance || card.credit_limit) - totalImpact;
      await walletService.updateWallet(card.wallet_id, { balance: newAvailable });
    }

    // 3. Si fue avance en efectivo, sumar a la cuenta destino y registrar ingreso
    if (is_advance && target_wallet_id) {
      const { data: targetWallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("id", target_wallet_id)
        .single();

      if (targetWallet) {
        await walletService.updateWallet(target_wallet_id, {
          balance: Number(targetWallet.balance) + amount
        });
      }

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

    // 1. Borrar la transacción vinculada si existía
    if (purchase.transaction_id) {
      await supabase.from("transactions").delete().eq("id", purchase.transaction_id);
    }

    // 2. Eliminar el registro de compra diferida
    const { error: delErr } = await supabase
      .from("credit_card_purchases")
      .delete()
      .eq("id", purchase_id);
    if (delErr) throw delErr;

    // 3. Restaurar cupo disponible en la tarjeta
    if (purchase.card?.wallet_id) {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("id", purchase.card.wallet_id)
        .single();

      if (wallet) {
        const restoredBalance = Math.min(
          Number(purchase.card.credit_limit),
          Number(wallet.balance) + totalImpact
        );
        await walletService.updateWallet(purchase.card.wallet_id, { balance: restoredBalance });
      }
    }

    return true;
  },

  // Pagar tarjeta (ACTUALIZA CUOTAS PAGADAS Y REGISTRA EL GASTO EN LA CUENTA DÉBITO)
  async payCard({ card_id, payment_amount, from_wallet_id }) {
    const { data: { user } } = await supabase.auth.getUser();
    const payVal = parseFloat(payment_amount);
    if (isNaN(payVal) || payVal <= 0) throw new Error("Monto inválido");

    const { data: card } = await supabase
      .from("credit_cards")
      .select("*, wallet:wallets(id, balance)")
      .eq("id", card_id)
      .single();

    // 1. Descontar dinero de la cuenta de ahorros/débito (ej. Bancolombia)
    const { data: fromWallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("id", from_wallet_id)
      .single();

    if (fromWallet) {
      await walletService.updateWallet(from_wallet_id, {
        balance: Number(fromWallet.balance) - payVal
      });
    }

    // 2. Liberar cupo disponible en la tarjeta
    if (card.wallet_id) {
      const restored = Math.min(Number(card.credit_limit), Number(card.wallet?.balance || 0) + payVal);
      await walletService.updateWallet(card.wallet_id, { balance: restored });
    }

    // 3. ACTUALIZAR CUOTAS: Avanzar las compras pendientes
    const { data: activePurchases } = await supabase
      .from("credit_card_purchases")
      .select("*")
      .eq("card_id", card_id)
      .order("purchase_date", { ascending: true });

    if (activePurchases) {
      for (const p of activePurchases) {
        if (p.installments_paid < p.installments) {
          const newPaid = p.installments_paid + 1;
          await supabase
            .from("credit_card_purchases")
            .update({ installments_paid: newPaid })
            .eq("id", p.id);
        }
      }
    }

    // 4. Registrar el pago en transacciones de la cuenta de débito
    let fallbackCategoryId = null;
    const { data: fallbackCat } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .limit(1)
      .maybeSingle();
    if (fallbackCat) fallbackCategoryId = fallbackCat.id;

    await transactionService.addTransaction({
      wallet_id: from_wallet_id,
      category_id: fallbackCategoryId,
      type: "expense",
      title: `Pago Tarjeta: ${card.name}`,
      amount: payVal
    });

    return true;
  },

  // Cálculo del extracto mensual en tiempo real (Opción A: Proyección del próximo corte)
  calculateStatement(card, purchases = []) {
    const list = Array.isArray(purchases) ? purchases : [];
    const creditLimit = Number(card?.credit_limit || 0);
    const availableCredit = Number(card?.wallet?.balance ?? creditLimit);
    const totalDebt = Math.max(0, creditLimit - availableCredit);

    const cutoffDay = parseInt(card?.cutoff_day) || 1;
    const paymentDueDay = parseInt(card?.payment_due_day) || 15;

    const rateEA = Number(card?.interest_rate_ea || 0) / 100;
    const monthlyRate = Math.pow(1 + rateEA, 1 / 12) - 1;

    // 1. Determinar el corte que se está acumulando / por liquidar (targetCutoff)
    const now = new Date();
    let targetCutoffYear = now.getFullYear();
    let targetCutoffMonth = now.getMonth();
    if (now.getDate() > cutoffDay) {
      // Si el día de hoy ya superó el corte, acumulamos hacia el corte del mes siguiente
      targetCutoffMonth += 1;
      if (targetCutoffMonth > 11) {
        targetCutoffMonth = 0;
        targetCutoffYear += 1;
      }
    }
    const targetCutoff = new Date(targetCutoffYear, targetCutoffMonth, cutoffDay, 23, 59, 59);

    // 2. Determinar la fecha límite de pago para ese corte
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

      if ((p.installments === 1 && !p.is_advance) || p.is_zero_interest) {
        // 1 cuota sin interés o convenio comercial 0%
      } else {
        const interest = remainingDebt * monthlyRate;
        totalInterestThisMonth += interest;
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

  // Resumen sincronizado para el banner de Inicio (Dashboard)
  async getTotalStatementSummary() {
    try {
      const cards = await this.getCreditCards();
      if (!cards || cards.length === 0) {
        return { totalDue: 0, earliestDueDay: null, dueDateLabel: null, hasCards: false };
      }

      // Obtener transacciones del mes actual para verificar si ya se pagó la tarjeta este mes
      const now = new Date();
      const currentMonthTransactions = await transactionService.getTransactions(
        now.getFullYear(),
        now.getMonth() + 1
      );

      let totalDue = 0;
      let earliestDueDay = null;
      let dueDateLabel = null;

      for (const card of cards) {
        const purchases = await this.getPurchases(card.id);
        const statement = this.calculateStatement(card, purchases);

        if (statement.estimatedStatement <= 0) {
          continue;
        }

        // Si ya se registró un pago de esta tarjeta en este mes
        const isPaidThisMonth = (currentMonthTransactions || []).some(t =>
          t.type === "expense" &&
          t.title &&
          t.title.toLowerCase().includes("pago tarjeta") &&
          t.title.toLowerCase().includes(card.name.toLowerCase())
        );

        if (isPaidThisMonth) {
          continue;
        }

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
    } catch (e) {
      return { totalDue: 0, earliestDueDay: null, dueDateLabel: null, hasCards: false };
    }
  }
};