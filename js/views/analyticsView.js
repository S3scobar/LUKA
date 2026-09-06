// js/views/analyticsView.js
import { transactionService } from "../services/transactionService.js";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const analyticsView = {
  // Estado interno de la vista
  currentMode: "month", // 'month' | 'year'
  selectedDate: new Date(),

  async render(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Cargando análisis financiero...</div>`;

    const year = this.selectedDate.getFullYear();
    const monthIndex = this.selectedDate.getMonth(); // 0 a 11
    const monthNum = monthIndex + 1; // 1 a 12

    try {
      if (this.currentMode === "month") {
        await this.renderMonthlyView(container, year, monthNum, monthIndex);
      } else {
        await this.renderYearlyView(container, year);
      }
    } catch (err) {
      container.innerHTML = `<div class="alert-error">Error al generar análisis: ${err.message}</div>`;
    }
  },

  // VISTA 1: ANÁLISIS MENSUAL POR CATEGORÍAS
  async renderMonthlyView(container, year, monthNum, monthIndex) {
    const transactions = await transactionService.getTransactions(year, monthNum);

    const totalIncome = transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenseTransactions = transactions.filter(t => t.type === "expense");
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const netBalance = totalIncome - totalExpense;

    // Agrupar gastos por categoría
    const categoryTotals = {};
    expenseTransactions.forEach(t => {
      const catName = t.category?.name || "Sin categoría";
      const catIcon = t.category?.icon || "fa-tag";
      const catColor = t.category?.color || "#64748B";

      if (!categoryTotals[catName]) {
        categoryTotals[catName] = {
          name: catName,
          icon: catIcon,
          color: catColor,
          amount: 0,
          percentage: 0
        };
      }
      categoryTotals[catName].amount += Number(t.amount);
    });

    // Calcular porcentaje de cada categoría
    const categoriesArray = Object.values(categoryTotals).map(cat => {
      cat.percentage = totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0;
      return cat;
    }).sort((a, b) => b.amount - a.amount);

    const topCategory = categoriesArray.length > 0 ? categoriesArray[0] : null;

    container.innerHTML = `
      <div class="analytics-module">
        <!-- Selector de Modo (Mes vs Año) -->
        <div class="analytics-mode-pills">
          <button type="button" id="btn-mode-month" class="mode-pill active">Resumen del Mes</button>
          <button type="button" id="btn-mode-year" class="mode-pill">Resumen del Año</button>
        </div>

        <!-- Selector Temporal de Mes -->
        <div class="period-navigator-card">
          <button type="button" id="btn-prev-period" class="nav-arrow-btn" title="Mes anterior">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="period-current-label">
            <h3><i class="fa-regular fa-calendar"></i> ${MONTH_NAMES[monthIndex]} ${year}</h3>
          </div>
          <button type="button" id="btn-next-period" class="nav-arrow-btn" title="Mes siguiente">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <!-- Tarjetas Métricas del Mes -->
        <div class="summary-cards-grid">
          <div class="metric-card card-income">
            <span class="metric-label"><i class="fa-solid fa-arrow-down"></i> Ingresos</span>
            <span class="metric-value">$ ${totalIncome.toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
          </div>
          <div class="metric-card card-expense">
            <span class="metric-label"><i class="fa-solid fa-arrow-up"></i> Gastos</span>
            <span class="metric-value">$ ${totalExpense.toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
          </div>
          <div class="metric-card card-balance">
            <span class="metric-label"><i class="fa-solid fa-scale-balanced"></i> BALANCE </span>
            <span class="metric-value ${netBalance < 0 ? "text-danger" : "text-success"}">
              $ ${netBalance.toLocaleString("es-CO", { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <!-- Desglose por Categoría -->
        <div class="section-card">
          <div class="section-header">
            <div>
              <h3><i class="fa-solid fa-chart-pie"></i> Gastos por Categoría</h3>
              <p>Cuánto dinero gastaste y el porcentaje que representa cada rubro</p>
            </div>
          </div>

          ${totalExpense === 0 ? `
            <div class="empty-state">
              <i class="fa-solid fa-receipt empty-icon"></i>
              <p>No hay gastos registrados en ${MONTH_NAMES[monthIndex]} de ${year}.</p>
            </div>
          ` : `
            <!-- Destacado de Mayor Gasto -->
            ${topCategory ? `
              <div class="top-expense-alert">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Tu mayor gasto este mes fue en <strong>${topCategory.name}</strong> con 
                <strong>$ ${topCategory.amount.toLocaleString("es-CO")}</strong> (${topCategory.percentage}% del total).</span>
              </div>
            ` : ""}

            <!-- Barra Segmentada de Distribución -->
            <div class="segmented-bar-container">
              ${categoriesArray.map(cat => `
                <div class="bar-segment" style="width: ${cat.percentage}%; background-color: ${cat.color};" title="${cat.name}: ${cat.percentage}%"></div>
              `).join("")}
            </div>

            <!-- Lista de Categorías con porcentaje -->
            <div class="category-breakdown-list">
              ${categoriesArray.map(cat => `
                <div class="cat-breakdown-item">
                  <div class="cat-breakdown-icon" style="background-color: ${cat.color}20; color: ${cat.color};">
                    <i class="fa-solid ${cat.icon}"></i>
                  </div>
                  
                  <div class="cat-breakdown-info">
                    <div class="cat-breakdown-header">
                      <span class="cat-breakdown-name">${cat.name}</span>
                      <span class="cat-breakdown-amount">$ ${cat.amount.toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
                    </div>
                    
                    <div class="cat-progress-track">
                      <div class="cat-progress-fill" style="width: ${cat.percentage}%; background-color: ${cat.color};"></div>
                    </div>
                  </div>

                  <span class="cat-percentage-badge">${cat.percentage}%</span>
                </div>
              `).join("")}
            </div>
          `}
        </div>
      </div>
    `;

    this.attachEventListeners(container);
  },

  // VISTA 2: RESUMEN ANUAL (12 MESES COMPARATIVOS)
  async renderYearlyView(container, year) {
    const yearlyTransactions = await transactionService.getYearlyTransactions(year);

    // Inicializar 12 meses
    const monthsData = Array.from({ length: 12 }, (_, i) => ({
      name: MONTH_NAMES[i].substring(0, 3), // Ene, Feb...
      monthNum: i + 1,
      income: 0,
      expense: 0,
      net: 0
    }));

    let totalYearIncome = 0;
    let totalYearExpense = 0;

    yearlyTransactions.forEach(t => {
      const date = new Date(t.transaction_date);
      const mIndex = date.getUTCMonth();
      const amount = Number(t.amount);

      if (t.type === "income") {
        monthsData[mIndex].income += amount;
        totalYearIncome += amount;
      } else {
        monthsData[mIndex].expense += amount;
        totalYearExpense += amount;
      }
      monthsData[mIndex].net = monthsData[mIndex].income - monthsData[mIndex].expense;
    });

    const totalYearSavings = totalYearIncome - totalYearExpense;

    // Obtener el valor máximo para escalar visualmente las barras
    const maxVal = Math.max(...monthsData.map(m => Math.max(m.income, m.expense)), 1);

    container.innerHTML = `
      <div class="analytics-module">
        <!-- Selector de Modo (Mes vs Año) -->
        <div class="analytics-mode-pills">
          <button type="button" id="btn-mode-month" class="mode-pill">Resumen del Mes</button>
          <button type="button" id="btn-mode-year" class="mode-pill active">Resumen del Año</button>
        </div>

        <!-- Selector de Año -->
        <div class="period-navigator-card">
          <button type="button" id="btn-prev-period" class="nav-arrow-btn" title="Año anterior">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="period-current-label">
            <h3><i class="fa-regular fa-calendar-days"></i> Año ${year}</h3>
          </div>
          <button type="button" id="btn-next-period" class="nav-arrow-btn" title="Año siguiente">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <!-- Métricas Anuales -->
        <div class="summary-cards-grid">
          <div class="metric-card card-income">
            <span class="metric-label"><i class="fa-solid fa-arrow-down"></i> Ingresos del Año</span>
            <span class="metric-value">$ ${totalYearIncome.toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
          </div>
          <div class="metric-card card-expense">
            <span class="metric-label"><i class="fa-solid fa-arrow-up"></i> Gastos del Año</span>
            <span class="metric-value">$ ${totalYearExpense.toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
          </div>
          <div class="metric-card card-balance">
            <span class="metric-label"><i class="fa-solid fa-scale-balanced"></i> BALANCE Anual</span>
            <span class="metric-value ${totalYearSavings < 0 ? "text-danger" : "text-success"}">
              $ ${totalYearSavings.toLocaleString("es-CO", { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <!-- Gráfico Comparativo 12 Meses -->
        <div class="section-card">
          <div class="section-header">
            <div>
              <h3><i class="fa-solid fa-chart-column"></i> Evolución Mes a Mes</h3>
              <p>Comparación de ingresos (verde) vs gastos (rojo) durante el año ${year}</p>
            </div>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-box income-box"></span> Ingresos</span>
              <span class="legend-item"><span class="legend-box expense-box"></span> Gastos</span>
            </div>
          </div>

          <div class="annual-chart-container">
            ${monthsData.map(m => {
              const incomeHeight = Math.round((m.income / maxVal) * 100);
              const expenseHeight = Math.round((m.expense / maxVal) * 100);

              return `
                <div class="chart-month-col">
                  <div class="bars-pair">
                    <div class="bar-income" style="height: ${incomeHeight}%;" title="Ingresos: $ ${m.income.toLocaleString("es-CO")}"></div>
                    <div class="bar-expense" style="height: ${expenseHeight}%;" title="Gastos: $ ${m.expense.toLocaleString("es-CO")}"></div>
                  </div>
                  <span class="month-col-label">${m.name}</span>
                </div>
              `;
            }).join("")}
          </div>

          <!-- Tabla Resumen Mes a Mes -->
          <div class="annual-table-wrapper" style="margin-top: 2rem;">
            <table class="annual-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Ingresos</th>
                  <th>Gastos</th>
                  <th>Ahorro Neto</th>
                </tr>
              </thead>
              <tbody>
                ${monthsData.map(m => `
                  <tr>
                    <td><strong>${m.name}</strong></td>
                    <td class="text-success">$ ${m.income.toLocaleString("es-CO")}</td>
                    <td class="text-danger">$ ${m.expense.toLocaleString("es-CO")}</td>
                    <td class="${m.net < 0 ? "text-danger" : "text-success"}">
                      <strong>$ ${m.net.toLocaleString("es-CO")}</strong>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners(container);
  },

  // Listeners de navegación temporal y pestañas de modo
  attachEventListeners(container) {
    const btnMonthMode = container.querySelector("#btn-mode-month");
    const btnYearMode = container.querySelector("#btn-mode-year");
    const btnPrev = container.querySelector("#btn-prev-period");
    const btnNext = container.querySelector("#btn-next-period");

    btnMonthMode.addEventListener("click", () => {
      this.currentMode = "month";
      this.render("app");
    });

    btnYearMode.addEventListener("click", () => {
      this.currentMode = "year";
      this.render("app");
    });

    btnPrev.addEventListener("click", () => {
      if (this.currentMode === "month") {
        this.selectedDate.setMonth(this.selectedDate.getMonth() - 1);
      } else {
        this.selectedDate.setFullYear(this.selectedDate.getFullYear() - 1);
      }
      this.render("app");
    });

    btnNext.addEventListener("click", () => {
      if (this.currentMode === "month") {
        this.selectedDate.setMonth(this.selectedDate.getMonth() + 1);
      } else {
        this.selectedDate.setFullYear(this.selectedDate.getFullYear() + 1);
      }
      this.render("app");
    });
  }
};