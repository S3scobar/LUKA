// js/views/budgetsView.js
import { budgetService } from "../services/budgetService.js";
import { categoryService } from "../services/categoryService.js";
import { attachCurrencyInput, parseCurrencyInput } from "../currencyFormatter.js";

import { escapeHtml } from "../utils.js";
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const budgetsView = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,

  async render(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Cargando tus presupuestos...</div>`;

    try {
      const [budgetData, allCategories] = await Promise.all([
        budgetService.getBudgets(this.currentYear, this.currentMonth),
        categoryService.getCategories()
      ]);

      const { budgets, totalBudgeted, totalSpent, globalPercentage, totalRemaining } = budgetData;
      const expenseCategories = allCategories.filter(c => c.type === "expense");

      container.innerHTML = `
        <div class="budgets-module">
          <!-- Cabecera / Navegador de periodo -->
          <div class="period-navigator-card">
            <button type="button" id="btn-prev-budget-month" class="nav-arrow-btn" title="Mes anterior">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <div class="period-current-label" style="text-align: center;">
              <h3>${MONTH_NAMES[this.currentMonth - 1]} ${this.currentYear}</h3>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Control de gastos por categoría</small>
            </div>
            <button type="button" id="btn-next-budget-month" class="nav-arrow-btn" title="Mes siguiente">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          <!-- Hero Card: Resumen General de Presupuestos (Alto Contraste) -->
          <div class="budget-hero-card">
            <div class="budget-hero-top">
              <div class="budget-hero-badge">
                <i class="fa-solid fa-bullseye"></i> PRESUPUESTO GLOBAL DEL MES
              </div>
              <span class="budget-hero-pct-badge ${globalPercentage > 100 ? 'is-danger' : globalPercentage > 80 ? 'is-warn' : ''}">
                ${globalPercentage}% consumido
              </span>
            </div>

            <div class="budget-hero-amount-row">
              <span class="budget-hero-spent">$ ${totalSpent.toLocaleString("es-CO")}</span>
              <span class="budget-hero-limit">/ $ ${totalBudgeted.toLocaleString("es-CO")}</span>
            </div>

            <!-- Barra de progreso gruesa, nítida y visible -->
            <div class="budget-hero-progress-track">
              <div class="budget-hero-progress-fill" style="width: ${Math.min(100, globalPercentage)}%; background: ${globalPercentage > 100 ? '#EF4444' : globalPercentage > 80 ? '#F59E0B' : 'linear-gradient(90deg, #2563EB, #10B981)'};"></div>
            </div>

            <div class="budget-hero-footer">
              <span class="budget-hero-avail">
                <i class="fa-solid fa-circle-check text-success"></i> Disponible: <strong>$ ${totalRemaining.toLocaleString("es-CO")}</strong>
              </span>
              <span class="budget-hero-count">
                ${budgets.length} ${budgets.length === 1 ? 'categoría' : 'categorías'} con presupuesto
              </span>
            </div>
          </div>

          <!-- Sección de Tarjetas de Presupuesto -->
          <div class="section-card">
            <div class="section-header">
              <div>
                <h3><i class="fa-solid fa-layer-group"></i> Progreso de Presupuestos</h3>
                <p>Toca cualquier tarjeta para ver el desglose detallado de sus gastos.</p>
              </div>
              <button id="btn-create-budget" class="btn btn-primary btn-sm">
                <i class="fa-solid fa-plus"></i> Asignar Presupuesto
              </button>
            </div>

            ${budgets.length === 0 ? `
              <div class="empty-state">
                <i class="fa-solid fa-bullseye empty-icon"></i>
                <p>No tienes presupuestos fijados para este mes.</p>
                <small>Asigna un límite mensual a tus categorías frecuentes (ej. Alimentación, Ocio, Transporte).</small>
              </div>
            ` : `
              <div class="budgets-list-grid">
                ${budgets.map(b => {
                  const cat = b.category || { name: "Sin Categoría", icon: "fa-tag", color: "#64748B" };
                  const barColor = b.isExceeded ? "#EF4444" : cat.color;

                  return `
                    <div class="budget-card" data-id="${b.id}" style="cursor: pointer;" title="Toca para ver los gastos detallados">
                      <div class="budget-card-header">
                        <div class="budget-cat-info">
                          <div class="budget-cat-icon" style="background-color: ${cat.color}20; color: ${cat.color};">
                            <i class="fa-solid ${cat.icon}"></i>
                          </div>
                          <div class="budget-meta">
                            <span class="budget-title">${escapeHtml(cat.name)}</span>
                            <span class="budget-subtitle ${b.isExceeded ? 'text-danger font-bold' : ''}">
                              ${b.isExceeded 
                                ? `¡Excedido por $ ${Math.abs(b.remaining).toLocaleString("es-CO")}!` 
                                : `${b.percentage}% del presupuesto gastado`}
                            </span>
                          </div>
                        </div>

                        <div class="budget-numbers">
                          $ ${b.spent.toLocaleString("es-CO")} <span class="budget-limit-divider">/</span> <span class="budget-limit-val">$ ${b.limit.toLocaleString("es-CO")}</span>
                        </div>
                      </div>

                      <!-- Barra de progreso de la categoría: gruesa y con color vivo -->
                      <div class="budget-progress-track">
                        <div class="budget-progress-fill" style="width: ${Math.min(100, b.percentage)}%; background-color: ${barColor};"></div>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            `}
          </div>
        </div>
      `;

      // Eventos de cambio de mes
      container.querySelector("#btn-prev-budget-month").addEventListener("click", () => {
        if (this.currentMonth === 1) {
          this.currentMonth = 12;
          this.currentYear--;
        } else {
          this.currentMonth--;
        }
        this.render(containerId);
      });

      container.querySelector("#btn-next-budget-month").addEventListener("click", () => {
        if (this.currentMonth === 12) {
          this.currentMonth = 1;
          this.currentYear++;
        } else {
          this.currentMonth++;
        }
        this.render(containerId);
      });

      // Botón crear presupuesto
      container.querySelector("#btn-create-budget").addEventListener("click", () => {
        showBudgetModal({
          categories: expenseCategories,
          onSave: () => this.render(containerId)
        });
      });

      // Clic en tarjeta -> Abrir modal de desglose detallado
      container.querySelectorAll(".budget-card").forEach(cardEl => {
        cardEl.addEventListener("click", () => {
          const budgetId = cardEl.dataset.id;
          const targetBudget = budgets.find(b => b.id === budgetId);
          if (targetBudget) {
            showBudgetDetailModal({
              budget: targetBudget,
              categories: expenseCategories,
              onRefresh: () => this.render(containerId)
            });
          }
        });
      });

    } catch (err) {
      container.innerHTML = `<div class="alert-error">Error al cargar presupuestos: ${err.message}</div>`;
    }
  }
};

// ==========================================
// MODAL DE DETALLE DE GASTOS DE LA CATEGORÍA
// ==========================================
function showBudgetDetailModal({ budget, categories, onRefresh }) {
  const cat = budget.category || { name: "Categoría", icon: "fa-tag", color: "#64748B" };
  const txList = budget.transactions || [];

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <div class="budget-cat-icon" style="background-color: ${cat.color}20; color: ${cat.color}; width: 38px; height: 38px; font-size: 1.1rem;">
            <i class="fa-solid ${cat.icon}"></i>
          </div>
          <div>
            <h4 style="margin: 0;">${escapeHtml(cat.name)}</h4>
            <small style="color: var(--text-muted);">${budget.percentage}% del presupuesto consumido</small>
          </div>
        </div>
        <button id="btn-close-detail-modal" class="modal-close-btn">&times;</button>
      </div>

      <!-- Resumen del Presupuesto en el Modal -->
      <div style="background: var(--bg-subtle); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.9rem; margin-bottom: 1.25rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; text-align: center;">
          <div>
            <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">Presupuesto</span>
            <strong style="font-size: 0.95rem;">$ ${budget.limit.toLocaleString("es-CO")}</strong>
          </div>
          <div>
            <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">Gastado</span>
            <strong style="font-size: 0.95rem; color: var(--danger);">$ ${budget.spent.toLocaleString("es-CO")}</strong>
          </div>
          <div>
            <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">Disponible</span>
            <strong style="font-size: 0.95rem; color: ${budget.isExceeded ? 'var(--danger)' : 'var(--success)'};">
              $ ${budget.remaining.toLocaleString("es-CO")}
            </strong>
          </div>
        </div>

        <div class="budget-progress-track" style="margin-top: 10px;">
          <div class="budget-progress-fill" style="width: ${Math.min(100, budget.percentage)}%; background-color: ${budget.isExceeded ? '#EF4444' : cat.color};"></div>
        </div>
      </div>

      <!-- Listado de Movimientos de esta categoría -->
      <div style="margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
          <strong style="font-size: 0.9rem;"><i class="fa-solid fa-list-check"></i> Gastos de este mes</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${txList.length} movimientos</span>
        </div>

        ${txList.length === 0 ? `
          <div class="empty-state" style="padding: 1.5rem 0.5rem;">
            <i class="fa-regular fa-folder-open empty-icon" style="font-size: 1.8rem;"></i>
            <p style="font-size: 0.85rem;">No tienes compras registradas en esta categoría este mes.</p>
          </div>
        ` : `
          <div class="transactions-list" style="max-height: 240px; overflow-y: auto;">
            ${txList.map(t => {
              const walletName = t.wallet?.name || "Cuenta";
              return `
                <div class="transaction-item" style="padding: 0.65rem 0.85rem;">
                  <div class="trans-cat-icon" style="background-color: ${cat.color}20; color: ${cat.color}; width: 34px; height: 34px;">
                    <i class="fa-solid ${cat.icon}"></i>
                  </div>
                  <div class="trans-info">
                    <span class="trans-title" style="font-size: 0.85rem;">${escapeHtml(t.title)}</span>
                    <div class="trans-meta">
                      <span class="trans-wallet"><i class="fa-solid fa-wallet"></i> ${walletName}</span>
                      <span class="trans-date">${t.transaction_date}</span>
                    </div>
                  </div>
                  <div class="trans-amount amount-expense" style="font-size: 0.9rem;">
                    - $ ${Number(t.amount).toLocaleString("es-CO")}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `}
      </div>

      <!-- Acciones de edición y eliminación -->
      <div style="display: flex; gap: 0.5rem; border-top: 1px solid var(--border); padding-top: 0.85rem;">
        <button type="button" id="btn-edit-this-budget" class="btn btn-secondary btn-sm" style="flex: 1;">
          <i class="fa-solid fa-pen-to-square"></i> Modificar Límite
        </button>
        <button type="button" id="btn-delete-this-budget" class="btn btn-secondary btn-sm text-danger" style="flex: 1;">
          <i class="fa-solid fa-trash-can"></i> Eliminar Presupuesto
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#btn-close-detail-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Editar límite
  modal.querySelector("#btn-edit-this-budget").addEventListener("click", () => {
    closeModal();
    showBudgetModal({
      categories,
      initialBudget: budget,
      onSave: onRefresh
    });
  });

  // Eliminar presupuesto
  modal.querySelector("#btn-delete-this-budget").addEventListener("click", async () => {
    if (confirm(`¿Deseas eliminar el presupuesto para ${cat.name}? Los gastos seguirán existiendo normalmente.`)) {
      await budgetService.deleteBudget(budget.id);
      closeModal();
      onRefresh();
    }
  });
}

// ==========================================
// MODAL PARA CREAR O EDITAR PRESUPUESTO
// ==========================================
function showBudgetModal({ categories, initialBudget = null, onSave }) {
  const isEditing = !!initialBudget;

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 420px;">
      <div class="modal-header">
        <h4><i class="fa-solid fa-bullseye text-primary"></i> ${isEditing ? "Modificar Presupuesto" : "Nuevo Presupuesto"}</h4>
        <button id="btn-close-budget-modal" class="modal-close-btn">&times;</button>
      </div>

      <form id="budget-form">
        <div class="form-group">
          <label>Categoría</label>
          <select id="budget-cat-id" ${isEditing ? "disabled" : ""} required>
            ${categories.map(c => `
              <option value="${c.id}" ${initialBudget && initialBudget.category_id === c.id ? "selected" : ""}>
                ${escapeHtml(c.name)}
              </option>
            `).join("")}
          </select>
        </div>

        <div class="form-group">
          <label>Límite Mensual de Gasto ($)</label>
          <input type="text" id="budget-limit-input" placeholder="Ej. 500.000" value="${initialBudget ? Number(initialBudget.monthly_limit).toLocaleString("es-CO") : ""}" required autofocus />
          <small style="color: var(--text-muted); font-size: 0.75rem; margin-top: 4px; display: block;">
            Monto máximo que planeas gastar en esta categoría cada mes.
          </small>
        </div>

        <div id="budget-modal-error" class="alert-error" style="display: none;"></div>

        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" id="btn-submit-budget" class="btn btn-primary btn-block">
            ${isEditing ? "Actualizar Presupuesto" : "Guardar Presupuesto"}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#btn-close-budget-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  const limitInput = modal.querySelector("#budget-limit-input");
  attachCurrencyInput(limitInput);

  modal.querySelector("#budget-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = modal.querySelector("#btn-submit-budget");
    const errorDiv = modal.querySelector("#budget-modal-error");

    const category_id = modal.querySelector("#budget-cat-id").value;
    const monthly_limit = parseCurrencyInput(limitInput.value);

    if (isNaN(monthly_limit) || monthly_limit <= 0) {
      errorDiv.textContent = "Ingresa un límite válido mayor a 0.";
      errorDiv.style.display = "block";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;

    try {
      await budgetService.setBudget({ category_id, monthly_limit });
      closeModal();
      if (onSave) onSave();
    } catch (err) {
      errorDiv.textContent = err.message || "Error al guardar presupuesto";
      errorDiv.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.innerHTML = isEditing ? "Actualizar Presupuesto" : "Guardar Presupuesto";
    }
  });
}