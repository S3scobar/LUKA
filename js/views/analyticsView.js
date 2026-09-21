// js/views/analyticsView.js
import { transactionService } from "../services/transactionService.js";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const analyticsView = {
  currentMode: "monthly", // 'monthly' | 'annual'
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  currentBreakdownType: "expense", // 'expense' | 'income'

  async render(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Analizando tus finanzas...</div>`;

    try {
      if (this.currentMode === "monthly") {
        await this.renderMonthly(container, containerId);
      } else {
        await this.renderAnnual(container, containerId);
      }
    } catch (err) {
      container.innerHTML = `<div class="alert-error">Error al cargar análisis: ${err.message}</div>`;
    }
  },

  // ==========================================
  // VISTA MENSUAL (DESGLOSE REAL POR CATEGORÍA)
  // ==========================================
  async renderMonthly(container, containerId) {
    const transactions = await transactionService.getTransactions(this.currentYear, this.currentMonth);

    const incomeTx = transactions.filter(t => t.type === "income");
    const expenseTx = transactions.filter(t => t.type === "expense");

    const totalIncome = incomeTx.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = expenseTx.reduce((sum, t) => sum + Number(t.amount), 0);
    const netBalance = totalIncome - totalExpense;

    // Agrupación corregida: usa el category_id real o el nombre de la categoría para no unificar todo
    const groupByCategory = (txList, total) => {
      const map = {};

      txList.forEach(t => {
        // Clave única por categoría: usa category_id o el nombre propio de la categoría
        const catKey = t.category_id || t.category?.id || (t.category?.name ? `name-${t.category.name}` : `sin-cat-${t.type}`);
        const catName = t.category?.name || (t.type === "income" ? "Otros Ingresos" : "Sin Categoría");
        const catIcon = t.category?.icon || (t.type === "income" ? "fa-money-bill-wave" : "fa-tag");
        const catColor = t.category?.color || (t.type === "income" ? "#10B981" : "#64748B");

        if (!map[catKey]) {
          map[catKey] = {
            name: catName,
            icon: catIcon,
            color: catColor,
            amount: 0
          };
        }
        map[catKey].amount += Number(t.amount);
      });

      return Object.values(map)
        .map(item => ({
          ...item,
          percentage: total > 0 ? Math.round((item.amount / total) * 100) : 0,
          exactPercentage: total > 0 ? (item.amount / total) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount);
    };

    const expenseBreakdown = groupByCategory(expenseTx, totalExpense);
    const incomeBreakdown = groupByCategory(incomeTx, totalIncome);

    const isExpenseActive = this.currentBreakdownType === "expense";
    const activeList = isExpenseActive ? expenseBreakdown : incomeBreakdown;
    const activeTotal = isExpenseActive ? totalExpense : totalIncome;
    const topItem = activeList.length > 0 ? activeList[0] : null;

    container.innerHTML = `
      <div class="analytics-module">
        <!-- Selector de Modo: Mensual vs Anual -->
        <div class="analytics-mode-pills">
          <button type="button" class="mode-pill ${this.currentMode === "monthly" ? "active" : ""}" data-mode="monthly">
            <i class="fa-solid fa-calendar-day"></i> Mensual
          </button>
          <button type="button" class="mode-pill ${this.currentMode === "annual" ? "active" : ""}" data-mode="annual">
            <i class="fa-solid fa-chart-column"></i> Anual
          </button>
        </div>

        <!-- Navegador de Meses -->
        <div class="period-navigator-card">
          <button type="button" id="btn-prev-period" class="nav-arrow-btn" title="Mes anterior">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="period-current-label" style="text-align: center;">
            <h3>${MONTH_NAMES[this.currentMonth - 1]} ${this.currentYear}</h3>
            <small style="color: var(--text-muted); font-size: 0.75rem;">${transactions.length} movimientos registrados</small>
          </div>
          <button type="button" id="btn-next-period" class="nav-arrow-btn" title="Mes siguiente">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <!-- 3 Métricas del Mes -->
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

        <!-- SECCIÓN PRINCIPAL: DESGLOSE POR CATEGORÍA -->
        <div class="section-card">
          <!-- Toggle para elegir Gastos o Ingresos -->
          <div class="breakdown-toggle-pills">
            <button type="button" id="toggle-breakdown-expense" class="breakdown-toggle-btn ${isExpenseActive ? "active expense" : ""}">
              <i class="fa-solid fa-arrow-trend-down"></i> Gastos ($ ${totalExpense.toLocaleString("es-CO", { maximumFractionDigits: 0 })})
            </button>
            <button type="button" id="toggle-breakdown-income" class="breakdown-toggle-btn ${!isExpenseActive ? "active income" : ""}">
              <i class="fa-solid fa-arrow-trend-up"></i> Ingresos ($ ${totalIncome.toLocaleString("es-CO", { maximumFractionDigits: 0 })})
            </button>
          </div>

          ${activeTotal === 0 ? `
            <div class="empty-state">
              <i class="fa-solid ${isExpenseActive ? "fa-wallet" : "fa-hand-holding-dollar"} empty-icon"></i>
              <p>No tienes ${isExpenseActive ? "gastos" : "ingresos"} registrados en ${MONTH_NAMES[this.currentMonth - 1]}.</p>
            </div>
          ` : `
            <!-- Alerta de Mayor Gasto o Mayor Ingreso -->
            ${topItem ? `
              <div class="${isExpenseActive ? "top-expense-alert" : "top-income-alert"}">
                <i class="fa-solid ${isExpenseActive ? "fa-fire text-danger" : "fa-trophy text-success"}"></i>
                <span>
                  Mayor ${isExpenseActive ? "gasto" : "ingreso"}: <strong>${topItem.name}</strong> con 
                  <strong>$ ${topItem.amount.toLocaleString("es-CO")}</strong> 
                  (${topItem.percentage}% del total de ${isExpenseActive ? "gastos" : "ingresos"}).
                </span>
              </div>
            ` : ""}

            <!-- Barra Segmentada con todos los colores de categorías -->
            <div class="segmented-bar-container">
              ${activeList.map(item => `
                <div class="bar-segment" style="width: ${item.exactPercentage}%; background-color: ${item.color};" title="${item.name}: ${item.percentage}%"></div>
              `).join("")}
            </div>

            <!-- Lista de Categorías Desglosadas -->
            <div class="category-breakdown-list">
              ${activeList.map(item => `
                <div class="cat-breakdown-item">
                  <div class="cat-breakdown-icon" style="background-color: ${item.color}20; color: ${item.color};">
                    <i class="fa-solid ${item.icon}"></i>
                  </div>
                  <div class="cat-breakdown-info">
                    <div class="cat-breakdown-header">
                      <span class="cat-breakdown-name">${item.name}</span>
                      <span class="cat-breakdown-amount">$ ${item.amount.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div class="cat-progress-track">
                      <div class="cat-progress-fill" style="width: ${item.percentage}%; background-color: ${item.color};"></div>
                    </div>
                  </div>
                  <div class="cat-percentage-badge">
                    ${item.percentage}%
                  </div>
                </div>
              `).join("")}
            </div>
          `}
        </div>
      </div>
    `;

    this.attachEvents(container, containerId);
  },

  // ==========================================
  // VISTA ANUAL (COMPARATIVA MES A MES)
  // ==========================================
  async renderAnnual(container, containerId) {
    const yearlyTransactions = await transactionService.getYearlyTransactions(this.currentYear);

    const monthsData = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));

    yearlyTransactions.forEach(t => {
      const date = new Date(t.transaction_date + "T00:00:00");
      const monthIndex = date.getMonth();
      if (t.type === "income") monthsData[monthIndex].income += Number(t.amount);
      else if (t.type === "expense") monthsData[monthIndex].expense += Number(t.amount);
    });

    const totalYearIncome = monthsData.reduce((sum, m) => sum + m.income, 0);
    const totalYearExpense = monthsData.reduce((sum, m) => sum + m.expense, 0);
    const totalYearBalance = totalYearIncome - totalYearExpense;

    const maxVal = Math.max(1, ...monthsData.map(m => Math.max(m.income, m.expense)));

    container.innerHTML = `
      <div class="analytics-module">
        <div class="analytics-mode-pills">
          <button type="button" class="mode-pill ${this.currentMode === "monthly" ? "active" : ""}" data-mode="monthly">
            <i class="fa-solid fa-calendar-day"></i> Mensual
          </button>
          <button type="button" class="mode-pill ${this.currentMode === "annual" ? "active" : ""}" data-mode="annual">
            <i class="fa-solid fa-chart-column"></i> Anual
          </button>
        </div>

        <div class="period-navigator-card">
          <button type="button" id="btn-prev-period" class="nav-arrow-btn" title="Año anterior">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="period-current-label" style="text-align: center;">
            <h3>Año ${this.currentYear}</h3>
            <small style="color: var(--text-muted); font-size: 0.75rem;">Resumen consolidado de 12 meses</small>
          </div>
          <button type="button" id="btn-next-period" class="nav-arrow-btn" title="Año siguiente">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <div class="summary-cards-grid">
          <div class="metric-card card-income">
            <span class="metric-label"><i class="fa-solid fa-arrow-down"></i> Ingresos Año</span>
            <span class="metric-value text-success">$ ${totalYearIncome.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
          </div>
          <div class="metric-card card-expense">
            <span class="metric-label"><i class="fa-solid fa-arrow-up"></i> Gastos Año</span>
            <span class="metric-value text-danger">$ ${totalYearExpense.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
          </div>
          <div class="metric-card card-balance">
            <span class="metric-label"><i class="fa-solid fa-piggy-bank"></i> Ahorro Neto</span>
            <span class="metric-value ${totalYearBalance < 0 ? "text-danger" : "text-success"}">
              $ ${totalYearBalance.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <div class="section-card">
          <div class="section-header">
            <div>
              <h3><i class="fa-solid fa-chart-column"></i> Comparativa Mes a Mes</h3>
              <p>Comportamiento de entradas vs salidas de dinero</p>
            </div>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-box income-box"></span> Ingreso</span>
              <span class="legend-item"><span class="legend-box expense-box"></span> Gasto</span>
            </div>
          </div>

          <div class="annual-chart-container">
            ${monthsData.map((m, idx) => {
              const incHeight = Math.max(3, Math.round((m.income / maxVal) * 115));
              const expHeight = Math.max(3, Math.round((m.expense / maxVal) * 115));
              const shortMonth = MONTH_NAMES[idx].slice(0, 3);

              return `
                <div class="chart-month-col">
                  <div class="bars-pair">
                    <div class="bar-income" style="height: ${m.income > 0 ? incHeight : 0}px;" title="${MONTH_NAMES[idx]}: Ingreso$ ${m.income.toLocaleString("es-CO")}"></div>
                    <div class="bar-expense" style="height: ${m.expense > 0 ? expHeight : 0}px;" title="${MONTH_NAMES[idx]}: Gasto$ ${m.expense.toLocaleString("es-CO")}"></div>
                  </div>
                  <span class="month-col-label">${shortMonth}</span>
                </div>
              `;
            }).join("")}
          </div>

          <div class="annual-table-wrapper">
            <table class="annual-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Ingresos</th>
                  <th>Gastos</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                ${monthsData.map((m, idx) => {
                  const net = m.income - m.expense;
                  return `
                    <tr>
                      <td><strong>${MONTH_NAMES[idx]}</strong></td>
                      <td class="text-success">$ ${m.income.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</td>                       <td class="text-danger">$ ${m.expense.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</td>
                      <td class="${net < 0 ? "text-danger" : "text-success"}" style="font-weight: 700;">
                        ${net < 0 ? "-" : "+"}$ ${Math.abs(net).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.attachEvents(container, containerId);
  },

  // ==========================================
  // EVENTOS
  // ==========================================
  attachEvents(container, containerId) {
    container.querySelectorAll(".mode-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        this.currentMode = btn.dataset.mode;
        this.render(containerId);
      });
    });

    container.querySelector("#btn-prev-period").addEventListener("click", () => {
      if (this.currentMode === "monthly") {
        if (this.currentMonth === 1) {
          this.currentMonth = 12;
          this.currentYear--;
        } else {
          this.currentMonth--;
        }
      } else {
        this.currentYear--;
      }
      this.render(containerId);
    });

    container.querySelector("#btn-next-period").addEventListener("click", () => {
      if (this.currentMode === "monthly") {
        if (this.currentMonth === 12) {
          this.currentMonth = 1;
          this.currentYear++;
        } else {
          this.currentMonth++;
        }
      } else {
        this.currentYear++;
      }
      this.render(containerId);
    });

    const toggleExpense = container.querySelector("#toggle-breakdown-expense");
    const toggleIncome = container.querySelector("#toggle-breakdown-income");

    if (toggleExpense && toggleIncome) {
      toggleExpense.addEventListener("click", () => {
        if (this.currentBreakdownType !== "expense") {
          this.currentBreakdownType = "expense";
          this.render(containerId);
        }
      });

      toggleIncome.addEventListener("click", () => {
        if (this.currentBreakdownType !== "income") {
          this.currentBreakdownType = "income";
          this.render(containerId);
        }
      });
    }
  }
};