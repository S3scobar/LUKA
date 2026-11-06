// js/views/dashboardView.js
import { walletService } from "../services/walletService.js";
import { categoryService } from "../services/categoryService.js";
import { transactionService } from "../services/transactionService.js";
import { creditCardService } from "../services/creditCardService.js";
import { loanService } from "../services/loanService.js";
import { creditView } from "./creditView.js";
import { quickExpenseBar } from "../components/quickExpenseBar.js";
import { escapeHtml, resolveContainer, notifyError, formatShortDate } from "../utils.js";

export const dashboardView = {
  showAllTransactions: false,

  resetState() {
    this.showAllTransactions = false;
  },

  async render(target) {
    const container = resolveContainer(target);
    container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Cargando tu información...</div>`;

    try {
      const [wallets, categories, transactions, creditCards, ccSummary, loanSummary] = await Promise.all([
        walletService.getWallets(),
        categoryService.getCategories(),
        transactionService.getTransactions(),
        creditCardService.getCreditCards(),
        creditCardService.getTotalStatementSummary(),
        loanService.getTotalLoanSummary()
      ]);

      // Las billeteras de tarjetas guardan el cupo disponible, no dinero propio
      const creditCardWalletIds = new Set((creditCards || []).map(cc => cc.wallet_id));

      const totalBalance = (wallets || [])
        .filter(w => !creditCardWalletIds.has(w.id))
        .reduce((sum, w) => sum + (parseFloat(w.balance) || 0), 0);

      const totalIncome = transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalExpense = transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const netBalance = totalIncome - totalExpense;

      container.innerHTML = `
        <div class="dashboard-module">
          <div class="summary-cards-grid">
            <div class="metric-card card-total">
              <span class="metric-label"><i class="fa-solid fa-wallet"></i> Saldo Total</span>
              <span class="metric-value text-primary">$ ${totalBalance.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
            </div>
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

          <!-- Banners de pagos pendientes (Tarjetas y Préstamos) -->
          ${(ccSummary?.hasCards || loanSummary?.hasLoans) ? `
            <div class="dashboard-banners-stack" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem;">
              ${ccSummary && ccSummary.hasCards ? `
                <div class="card-statement-banner ${ccSummary.totalDue > 0 ? 'banner-due' : 'banner-paid'}" style="margin-bottom: 0;">
                  <div class="banner-statement-left">
                    <div class="banner-statement-icon">
                      <i class="fa-solid ${ccSummary.totalDue > 0 ? 'fa-credit-card' : 'fa-circle-check'}"></i>
                    </div>
                    <div class="banner-statement-text">
                      <div class="banner-statement-title">
                        ${ccSummary.totalDue > 0 ? 'Por pagar en tarjeta este mes' : 'Tarjetas de crédito'}
                      </div>
                      <div class="banner-statement-amount">
                        $ ${ccSummary.totalDue.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                      </div>
                      <small class="banner-statement-sub">
                        ${ccSummary.totalDue > 0 
                          ? (ccSummary.earliestDueDay ? `Pagar antes del día ${ccSummary.earliestDueDay}` : 'Cuota mensual pendiente')
                          : '¡Estás al día este mes!'}
                      </small>
                    </div>
                  </div>
                  ${ccSummary.totalDue > 0 ? `
                    <button type="button" id="btn-pay-cc-from-dashboard" class="btn btn-sm btn-primary">
                      <i class="fa-solid fa-money-bill-transfer"></i> Pagar
                    </button>
                  ` : ''}
                </div>
              ` : ''}

              ${loanSummary && loanSummary.hasLoans ? `
                <div class="card-statement-banner ${loanSummary.totalDue > 0 ? 'banner-due' : 'banner-paid'}" style="margin-bottom: 0;">
                  <div class="banner-statement-left">
                    <div class="banner-statement-icon">
                      <i class="fa-solid ${loanSummary.totalDue > 0 ? 'fa-handshake-angle' : 'fa-circle-check'}"></i>
                    </div>
                    <div class="banner-statement-text">
                      <div class="banner-statement-title">
                        ${loanSummary.totalDue > 0 ? 'Por pagar en préstamos este mes' : 'Préstamos y deudas'}
                      </div>
                      <div class="banner-statement-amount">
                        $ ${loanSummary.totalDue.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                      </div>
                      <small class="banner-statement-sub">
                        ${loanSummary.totalDue > 0 
                          ? loanSummary.dueLabel 
                          : '¡Estás al día con tus préstamos!'}
                      </small>
                    </div>
                  </div>
                  ${loanSummary.totalDue > 0 ? `
                    <button type="button" id="btn-pay-loan-from-dashboard" class="btn btn-sm btn-primary">
                      <i class="fa-solid fa-money-bill-transfer"></i> Pagar
                    </button>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          ` : ''}

          <div id="quick-expense-container"></div>

          <div class="section-card history-section">
            <div class="section-header">
              <div>
                <h3><i class="fa-solid fa-clock-rotate-left"></i> Movimientos Recientes</h3>
                <p>Tus últimos registros de este mes</p>
              </div>
              <span class="badge-count">${transactions.length} en total</span>
            </div>

            <div id="transactions-container"></div>
          </div>
        </div>
      `;

      quickExpenseBar.render({
        container: container.querySelector("#quick-expense-container"),
        wallets,
        categories,
        creditCards,
        onTransactionSaved: () => {
          dashboardView.render(target);
        }
      });

      // "Pagar" tarjeta lleva a la pestaña de Tarjetas (sección tarjetas)
      const btnPayCC = container.querySelector("#btn-pay-cc-from-dashboard");
      if (btnPayCC) {
        btnPayCC.addEventListener("click", () => {
          creditView.section = "cards";
          const cardsTabBtn = document.querySelector('[data-tab="cards"]');
          if (cardsTabBtn) cardsTabBtn.click();
        });
      }

      // "Pagar" préstamo lleva a la pestaña de Tarjetas (sección préstamos)
      const btnPayLoan = container.querySelector("#btn-pay-loan-from-dashboard");
      if (btnPayLoan) {
        btnPayLoan.addEventListener("click", () => {
          creditView.section = "loans";
          const cardsTabBtn = document.querySelector('[data-tab="cards"]');
          if (cardsTabBtn) cardsTabBtn.click();
        });
      }

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
                    <span class="trans-title">${escapeHtml(t.title)}</span>
                    <div class="trans-meta">
                      <span class="trans-wallet"><i class="fa-solid fa-wallet"></i> ${escapeHtml(walletName)}</span>
                      <span class="trans-date">${formatShortDate(t.transaction_date)}</span>
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
      };

      transContainer.addEventListener("click", async (e) => {
        const btn = e.target.closest(".btn-delete-trans");
        if (!btn) return;

        const id = btn.dataset.id;
        if (confirm("¿Deseas eliminar este movimiento? Su valor volverá a tu cuenta.")) {
          try {
            await transactionService.deleteTransaction(id);
            dashboardView.render(target);
          } catch (err) {
            notifyError(err);
          }
        }
      });

      renderList();

    } catch (err) {
      container.innerHTML = `<div class="alert-error">Error al cargar dashboard: ${escapeHtml(err.message)}</div>`;
    }
  }
};