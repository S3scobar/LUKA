// js/views/dashboardView.js
import { walletService } from "../services/walletService.js";
import { categoryService } from "../services/categoryService.js";
import { transactionService } from "../services/transactionService.js";
import { creditCardService } from "../services/creditCardService.js";
import { quickExpenseBar } from "../components/quickExpenseBar.js";

export const dashboardView = {
  showAllTransactions: false,

  async render(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Cargando tu información...</div>`;

    try {
      const [wallets, categories, transactions, creditCards] = await Promise.all([
        walletService.getWallets(),
        categoryService.getCategories(),
        transactionService.getTransactions(),
        creditCardService.getCreditCards()
      ]);

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
              <span class="metric-label"><i class="fa-solid fa-arrow-down"></i> Ingresos</span>
              <span class="metric-value text-success">$ ${totalIncome.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
            </div>
            <div class="metric-card card-expense">
              <span class="metric-label"><i class="fa-solid fa-arrow-up"></i> Gastos</span>
              <span class="metric-value text-danger">$ ${totalExpense.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
            </div>
            <div class="metric-card card-balance">
              <span class="metric-label"><i class="fa-solid fa-scale-balanced"></i> Balance</span>
              <span class="metric-value ${netBalance < 0 ? "text-danger" : "text-success"}">
                $ ${netBalance.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <!-- 2. Barra de Registro Rápido -->
          <div id="quick-expense-container"></div>

          <!-- 3. Historial de Transacciones -->
          <div class="section-card history-section">
            <div class="section-header">
              <div>
                <h3><i class="fa-solid fa-clock-rotate-left"></i> Movimientos Recientes</h3>
                <p>Tus últimos registros de este mes</p>
              </div>
              <span class="badge-count">${transactions.length} en total</span>
            </div>

            <div id="transactions-container">
              <!-- Renderizado dinámico -->
            </div>
          </div>
        </div>
      `;

      // Montar la barra de gasto rápido
      quickExpenseBar.render({
        containerId: "quick-expense-container",
        wallets,
        categories,
        creditCards,
        onTransactionSaved: () => {
          dashboardView.render(containerId);
        }
      });

      // Renderizar lista de movimientos con opción Ver todos
      const transContainer = container.querySelector("#transactions-container");

      const renderList = () => {
        if (transactions.length === 0) {
          transContainer.innerHTML = `
            <div class="empty-state">
              <i class="fa-regular fa-folder-open empty-icon"></i>
              <p>No tienes movimientos registrados en este mes.</p>
              <small>Escribe un gasto arriba y presiona un icono para comenzar.</small>
            </div>
          `;
          return;
        }

        const visibleList = this.showAllTransactions ? transactions : transactions.slice(0, 5);

        transContainer.innerHTML = `
          <div class="transactions-list">
            ${visibleList.map(t => {
              const isExpense = t.type === "expense";
              const catColor = t.category?.color || "#94A3B8";
              const catIcon = t.category?.icon || (isExpense ? "fa-tag" : "fa-money-bill-wave");
              const walletName = t.wallet?.name || "Cuenta";

              return `
                <div class="transaction-item">
                  <div class="trans-cat-icon" style="background-color: ${catColor}20; color:${catColor};">
                    <i class="fa-solid ${catIcon}"></i>
                  </div>
                  <div class="trans-info">
                    <span class="trans-title">${t.title}</span>
                    <div class="trans-meta">
                      <span class="trans-wallet"><i class="fa-solid fa-wallet"></i> ${walletName}</span>
                      <span class="trans-date">${t.transaction_date}</span>
                    </div>
                  </div>
                  <div class="trans-amount ${isExpense ? "amount-expense" : "amount-income"}">
                    ${isExpense ? "-" : "+"} $ ${Number(t.amount).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                  </div>
                  <button class="btn-delete-trans" data-id="${t.id}" title="Eliminar movimiento">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              `;
            }).join("")}
          </div>

          ${transactions.length > 5 ? `
            <div style="margin-top: 0.85rem;">
              <button type="button" id="btn-toggle-all-trans" class="btn btn-secondary btn-block btn-sm" style="font-weight: 700; gap: 0.4rem;">
                <i class="fa-solid ${this.showAllTransactions ? "fa-chevron-up" : "fa-chevron-down"}"></i>
                ${this.showAllTransactions ? "Mostrar menos (solo los últimos 5)" : `Ver todos los movimientos (${transactions.length})`}
              </button>
            </div>
          ` : ""}
        `;

        const toggleBtn = transContainer.querySelector("#btn-toggle-all-trans");
        if (toggleBtn) {
          toggleBtn.addEventListener("click", () => {
            this.showAllTransactions = !this.showAllTransactions;
            renderList();
          });
        }

        transContainer.querySelectorAll(".btn-delete-trans").forEach(btn => {
          btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            if (confirm("¿Deseas eliminar este movimiento? Su valor volverá a tu cuenta.")) {
              await transactionService.deleteTransaction(id);
              dashboardView.render(containerId);
            }
          });
        });
      };

      renderList();

    } catch (err) {
      container.innerHTML = `<div class="alert-error">Error al cargar dashboard: ${err.message}</div>`;
    }
  }
};