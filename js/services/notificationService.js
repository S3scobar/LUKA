// js/services/notificationService.js
// Sistema inteligente de notificaciones financieras para LUKA.
// Cubre:
// 1. Suscripción o pago fijo que vence mañana (o hoy).
// 2. Fecha límite de pago de tarjeta o cuota de préstamo.
// 3. Presupuesto al 80% o excedido.
// 4. Recordatorio diario opcional: "¿Registraste tus gastos de hoy?"
//
// Entrega:
// - Notificaciones In-App (Campana con badge y Centro de Notificaciones desplegable + banner contextual).
// - Notificaciones Web Push (Navegador) con permiso explícito no invasivo.

import { subscriptionService } from "./subscriptionService.js";
import { creditCardService } from "./creditCardService.js";
import { loanService } from "./loanService.js";
import { budgetService } from "./budgetService.js";
import { transactionService } from "./transactionService.js";

const STORAGE_KEY_SETTINGS = "luka_notification_settings";
const STORAGE_KEY_DISMISSED = "luka_dismissed_notifications";

export const notificationService = {
  // Ajustes de usuario
  getSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      dailyReminder: true,
      dailyReminderHour: 20, // 8:00 PM
      subsAlert: true,
      debtAlert: true,
      budgetAlert: true,
      webPushEnabled: false
    };
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch {}
  },

  // Notificaciones descartadas hoy para no ser invasivos
  getDismissedKeys() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DISMISSED);
      if (saved) {
        const parsed = JSON.parse(saved);
        const todayStr = new Date().toISOString().slice(0, 10);
        if (parsed.date === todayStr) {
          return new Set(parsed.keys || []);
        }
      }
    } catch {}
    return new Set();
  },

  dismiss(key) {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const dismissed = this.getDismissedKeys();
      dismissed.add(key);
      localStorage.setItem(
        STORAGE_KEY_DISMISSED,
        JSON.stringify({ date: todayStr, keys: Array.from(dismissed) })
      );
    } catch {}
  },

  // Recolecta y analiza el estado financiero actual para generar las alertas activas
  async checkAll() {
    const settings = this.getSettings();
    const dismissed = this.getDismissedKeys();
    const notifications = [];

    const now = new Date();
    const today = now.getDate();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 1. Suscripciones o pagos fijos que vencen mañana o hoy
    if (settings.subsAlert) {
      try {
        const [subs, monthTransactions] = await Promise.all([
          subscriptionService.getSubscriptions(),
          transactionService.getTransactions(currentYear, currentMonth)
        ]);

        const activeSubs = (subs || []).filter(s => s.is_active);
        for (const sub of activeSubs) {
          const billingDay = parseInt(sub.billing_day, 10);
          if (!billingDay) continue;

          // Verificar si ya fue pagada este mes
          const isPaid = (monthTransactions || []).some(
            t => t.type === "expense" && t.title?.toLowerCase().includes(sub.name.toLowerCase())
          );
          if (isPaid) continue;

          // ¿Vence mañana?
          const daysDiff = billingDay - today;
          if (daysDiff === 1) {
            const key = `sub-tomorrow-${sub.id}-${billingDay}`;
            if (!dismissed.has(key)) {
              notifications.push({
                id: key,
                type: "subscription",
                severity: "warning",
                icon: "ph-bold ph-calendar-check",
                title: "Suscripción vence mañana",
                message: `Mañana vence el pago de "${sub.name}" por $ ${Number(sub.amount).toLocaleString("es-CO")}.`,
                actionTab: "subs",
                actionLabel: "Ver suscripción"
              });
            }
          } else if (daysDiff === 0) {
            const key = `sub-today-${sub.id}-${billingDay}`;
            if (!dismissed.has(key)) {
              notifications.push({
                id: key,
                type: "subscription",
                severity: "danger",
                icon: "ph-bold ph-calendar-check",
                title: "Suscripción vence hoy",
                message: `Hoy vence el pago de "${sub.name}" por $ ${Number(sub.amount).toLocaleString("es-CO")}.`,
                actionTab: "subs",
                actionLabel: "Pagar ahora"
              });
            }
          }
        }
      } catch (e) {
        console.warn("Error evaluando suscripciones:", e);
      }
    }

    // 2. Fecha límite de pago de tarjeta de crédito o cuota de préstamo
    if (settings.debtAlert) {
      try {
        const [ccSummary, loanSummary] = await Promise.all([
          creditCardService.getTotalStatementSummary(),
          loanService.getTotalLoanSummary()
        ]);

        // Tarjetas de crédito
        if (ccSummary && ccSummary.totalDue > 0 && ccSummary.earliestDueDay) {
          const daysToCC = ccSummary.earliestDueDay - today;
          if (daysToCC >= 0 && daysToCC <= 3) {
            const key = `cc-due-${ccSummary.earliestDueDay}-${currentMonth}`;
            if (!dismissed.has(key)) {
              const label = daysToCC === 0 ? "vence hoy" : daysToCC === 1 ? "vence mañana" : `vence en ${daysToCC} días`;
              notifications.push({
                id: key,
                type: "credit",
                severity: daysToCC <= 1 ? "danger" : "warning",
                icon: "ph-bold ph-credit-card",
                title: `Pago de tarjeta ${label}`,
                message: `Tienes $ ${ccSummary.totalDue.toLocaleString("es-CO")} por pagar en tarjeta de crédito (Día ${ccSummary.earliestDueDay}).`,
                actionTab: "cards",
                actionLabel: "Ir a pagar"
              });
            }
          }
        }

        // Préstamos
        if (loanSummary && loanSummary.totalDue > 0 && loanSummary.earliestDueDate) {
          const [, , dueDayStr] = loanSummary.earliestDueDate.split("-");
          const loanDueDay = parseInt(dueDayStr, 10);
          if (loanDueDay) {
            const daysToLoan = loanDueDay - today;
            if (daysToLoan >= 0 && daysToLoan <= 3) {
              const key = `loan-due-${loanDueDay}-${currentMonth}`;
              if (!dismissed.has(key)) {
                const label = daysToLoan === 0 ? "vence hoy" : daysToLoan === 1 ? "vence mañana" : `vence en ${daysToLoan} días`;
                notifications.push({
                  id: key,
                  type: "loan",
                  severity: daysToLoan <= 1 ? "danger" : "warning",
                  icon: "ph-bold ph-handshake",
                  title: `Cuota de préstamo ${label}`,
                  message: `Tienes una cuota de préstamo pendiente de pago ($ ${loanSummary.totalDue.toLocaleString("es-CO")}).`,
                  actionTab: "cards",
                  actionLabel: "Ver cuotas"
                });
              }
            } else if (daysToLoan < 0) {
              const key = `loan-overdue-${loanDueDay}-${currentMonth}`;
              if (!dismissed.has(key)) {
                notifications.push({
                  id: key,
                  type: "loan",
                  severity: "danger",
                  icon: "ph-bold ph-warning",
                  title: "Cuota de préstamo vencida",
                  message: loanSummary.dueLabel || "Tienes un pago de préstamo pendiente con retraso.",
                  actionTab: "cards",
                  actionLabel: "Regularizar"
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn("Error evaluando deudas:", e);
      }
    }

    // 3. Presupuesto al 80% o excedido
    if (settings.budgetAlert) {
      try {
        const budgetData = await budgetService.getBudgets(currentYear, currentMonth);
        if (budgetData && budgetData.budgets) {
          // Alerta por categoría
          for (const b of budgetData.budgets) {
            if (b.isExceeded) {
              const key = `budget-exceeded-${b.id}-${currentMonth}`;
              if (!dismissed.has(key)) {
                notifications.push({
                  id: key,
                  type: "budget",
                  severity: "danger",
                  icon: "ph-bold ph-chart-pie-slice",
                  title: `Presupuesto excedido: ${b.category?.name || "Categoría"}`,
                  message: `Has superado tu límite de $ ${b.limit.toLocaleString("es-CO")} en un ${b.percentage}%.`,
                  actionTab: "budgets",
                  actionLabel: "Revisar"
                });
              }
            } else if (b.percentage >= 80) {
              const key = `budget-80-${b.id}-${currentMonth}`;
              if (!dismissed.has(key)) {
                notifications.push({
                  id: key,
                  type: "budget",
                  severity: "warning",
                  icon: "ph-bold ph-chart-pie-slice",
                  title: `Presupuesto al ${b.percentage}%: ${b.category?.name || "Categoría"}`,
                  message: `Has consumido $ ${b.spent.toLocaleString("es-CO")} de $ ${b.limit.toLocaleString("es-CO")}. Te quedan $ ${b.remaining.toLocaleString("es-CO")}.`,
                  actionTab: "budgets",
                  actionLabel: "Ver presupuesto"
                });
              }
            }
          }

          // Alerta global si no hay categorías excedidas pero el total superó 80%
          if (budgetData.globalPercentage >= 80 && !budgetData.budgets.some(b => b.isExceeded)) {
            const key = `budget-global-${currentMonth}`;
            if (!dismissed.has(key)) {
              notifications.push({
                id: key,
                type: "budget",
                severity: budgetData.globalPercentage > 100 ? "danger" : "warning",
                icon: "ph-bold ph-target",
                title: `Presupuesto global al ${budgetData.globalPercentage}%`,
                message: `Has consumido el ${budgetData.globalPercentage}% de tu presupuesto total de este mes.`,
                actionTab: "budgets",
                actionLabel: "Ver presupuesto"
              });
            }
          }
        }
      } catch (e) {
        console.warn("Error evaluando presupuestos:", e);
      }
    }

    // 4. Recordatorio diario opcional: "¿Registraste tus gastos de hoy?"
    if (settings.dailyReminder) {
      try {
        const hour = now.getHours();
        // Se activa a partir de la hora configurada (por defecto 8 PM / 20:00)
        if (hour >= (settings.dailyReminderHour || 20)) {
          const todayStr = now.toISOString().slice(0, 10);
          const key = `daily-expense-reminder-${todayStr}`;
          if (!dismissed.has(key)) {
            const monthTxs = await transactionService.getTransactions(currentYear, currentMonth);
            const hasTxToday = (monthTxs || []).some(
              t => t.transaction_date && t.transaction_date.slice(0, 10) === todayStr
            );

            if (!hasTxToday) {
              notifications.push({
                id: key,
                type: "reminder",
                severity: "info",
                icon: "ph-bold ph-pencil-simple-line",
                title: "¿Registraste tus gastos de hoy?",
                message: "Mantener tu registro al día te ayuda a no perder el control de tus finanzas.",
                actionTab: "dashboard",
                actionLabel: "Anotar gasto"
              });
            }
          }
        }
      } catch (e) {
        console.warn("Error evaluando recordatorio diario:", e);
      }
    }

    return notifications;
  },

  // Disparar notificación push del navegador (si está permitido)
  async triggerWebNotification(n) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      const reg = await navigator.serviceWorker?.ready;
      if (reg && reg.showNotification) {
        reg.showNotification(n.title, {
          body: n.message,
          icon: "/icon-192.png",
          badge: "/favicon.svg",
          tag: n.id,
          data: { actionTab: n.actionTab }
        });
      } else {
        new Notification(n.title, {
          body: n.message,
          icon: "/icon-192.png",
          tag: n.id
        });
      }
    } catch {}
  },

  // Solicitar permiso de notificaciones push de forma amigable
  async requestPushPermission() {
    if (!("Notification" in window)) return false;
    try {
      const res = await Notification.requestPermission();
      const granted = res === "granted";
      const settings = this.getSettings();
      settings.webPushEnabled = granted;
      this.saveSettings(settings);
      return granted;
    } catch {
      return false;
    }
  }
};
