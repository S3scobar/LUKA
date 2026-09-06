// js/views/dashboardView.js
import { walletService } from "../services/walletService.js";
import { categoryService } from "../services/categoryService.js";
import { transactionService } from "../services/transactionService.js";
import { creditCardService } from "../services/creditCardService.js";
import { quickExpenseBar } from "../components/quickExpenseBar.js";

export const dashboardView = {
  async render(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Cargando tu información...</div>`;

    try {
      // 1. Añadido creditCards a la consulta
      const [wallets, categories, transactions, creditCards] = await Promise.all([
        walletService.getWallets(),
        categoryService.getCategories(),
        transactionService.getTransactions(),
        creditCardService.getCreditCards()
      ]);

      // Cálculos del mes
      const totalIncome = transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalExpense = transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const netBalance = totalIncome - totalExpense;

      container.innerHTML = `
        <div class="dashboard-module">
          <!-- 1. Tarjetas de Resumen Mensual -->
          <div class="summary-cards-grid">
            <div class="metric-card card-income">
              <span class="metric-label"><i class="fa-solid fa-arrow-down"></i> Ingresos del Mes</span>
              <span class="metric-value">$ ${totalIncome.toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
            </div>
            <div class="metric-card card-expense">
              <span class="metric-label"><i class="fa-solid fa-arrow-up"></i> Gastos del Mes</span>
              <span class="metric-value">$ ${totalExpense.toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
            </div>
            <div class="metric-card card-balance">
              <span class="metric-label"><i class="fa-solid fa-scale-balanced"></i> BALANCE</span>
              <span class="metric-value ${netBalance < 0 ? "text-danger" : "text-success"}">
                $ ${netBalance.toLocaleString("es-CO", { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <!-- 2. Barra de Registro Rápido (Componente Estrella) -->
          <div id="quick-expense-container"></div>

          <!-- 3. Historial de Transacciones del Mes -->
          <div class="section-card history-section">
            <div class="section-header">
              <h3><i class="fa-solid fa-clock-rotate-left"></i> Movimientos del Mes</h3>
              <span class="badge-count">${transactions.length} registrados</span>
            </div>

            ${transactions.length === 0 ? `
              <div class="empty-state">
                <i class="fa-regular fa-folder-open empty-icon"></i>
                <p>No tienes movimientos registrados en este mes.</p>
                <small>Escribe un gasto arriba y presiona un icono para comenzar.</small>
              </div>
            ` : `
              <div class="transactions-list">
                ${transactions.map(t => {
                  const isExpense = t.type === "expense";
                  return `
                    <div class="transaction-item">
                      <div class="trans-cat-icon" style="background-color: ${t.category?.color || "#94A3B8"}20; color: ${t.category?.color || "#64748B"};">
                        <i class="fa-solid ${t.category?.icon || "fa-tag"}"></i>
                      </div>
                      <div class="trans-info">
                        <span class="trans-title">${t.title}</span>
                        <div class="trans-meta">
                          <span class="trans-wallet"><i class="fa-solid fa-wallet"></i> ${t.wallet?.name || "Cuenta"}</span>
                          <span class="trans-date">${t.transaction_date}</span>
                        </div>
                      </div>
                      <div class="trans-amount ${isExpense ? "amount-expense" : "amount-income"}">
                        ${isExpense ? "-" : "+"} $ ${Number(t.amount).toLocaleString("es-CO", { minimumFractionDigits: 0 })}
                      </div>
                      <button class="btn-delete-trans" data-id="${t.id}" title="Eliminar">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  `;
                }).join("")}
              </div>
            `}
          </div>
        </div>
      `;

      // 2. Pasamos creditCards a la barra rápida
      quickExpenseBar.render({
        containerId: "quick-expense-container",
        wallets,
        categories,
        creditCards,
        onTransactionSaved: () => {
          dashboardView.render(containerId);
        }
      });

      // Listeners para eliminar transacción
      container.querySelectorAll(".btn-delete-trans").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          if (confirm("¿Deseas eliminar este movimiento? Su valor volverá a tu billetera.")) {
            await transactionService.deleteTransaction(id);
            dashboardView.render(containerId);
          }
        });
      });

    } catch (err) {
      container.innerHTML = `<div class="alert-error">Error al cargar dashboard: ${err.message}</div>`;
    }
  }
};