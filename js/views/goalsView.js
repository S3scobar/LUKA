// js/views/goalsView.js
import { goalService } from "../services/goalService.js";
import { walletService } from "../services/walletService.js";

const GOAL_ICONS = [
  "fa-bullseye", "fa-car", "fa-house", "fa-plane", "fa-laptop",
  "fa-mobile-screen", "fa-gamepad", "fa-graduation-cap", "fa-gem",
  "fa-bicycle", "fa-camera", "fa-shield-heart"
];

export const goalsView = {
  async render(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Cargando metas de ahorro...</div>`;

    try {
      const [goals, wallets] = await Promise.all([
        goalService.getGoals(),
        walletService.getWallets()
      ]);

      const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount), 0);
      const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount), 0);
      const globalProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

      container.innerHTML = `
        <div class="goals-module">
          <!-- Métricas de Metas -->
          <div class="summary-cards-grid">
            <div class="metric-card">
              <span class="metric-label"><i class="fa-solid fa-piggy-bank text-primary"></i> Total Ahorrado en Metas</span>
              <span class="metric-value">$ ${totalSaved.toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label"><i class="fa-solid fa-flag-checkered text-success"></i> Progreso General</span>
              <span class="metric-value">${globalProgress}%</span>
            </div>
          </div>

          <!-- Listado de Metas -->
          <div class="section-card">
            <div class="section-header">
              <div>
                <h3><i class="fa-solid fa-bullseye"></i> Mis Metas de Ahorro</h3>
                <p>Objetivos de compra y fondos de ahorro programado</p>
              </div>
              <button id="btn-new-goal" class="btn btn-primary btn-sm">
                <i class="fa-solid fa-plus"></i> Nueva Meta
              </button>
            </div>

            ${goals.length === 0 ? `
              <div class="empty-state">
                <i class="fa-solid fa-mountain-sun empty-icon"></i>
                <p>Aún no has creado metas de ahorro.</p>
                <small>Crea tu primer objetivo (ej. "PlayStation 5", "Viaje", "Fondo de emergencia").</small>
              </div>
            ` : `
              <div class="goals-grid">
                ${goals.map(goal => {
                  const isCompleted = goal.progressPercentage >= 100;
                  return `
                    <div class="goal-card ${isCompleted ? "goal-completed" : ""}">
                      <div class="goal-card-header">
                        <div class="goal-icon-box">
                          <i class="fa-solid ${goal.icon || "fa-bullseye"}"></i>
                        </div>
                        <div class="goal-title-wrap">
                          <span class="goal-title">${goal.title}</span>
                          ${isCompleted ? `<span class="badge-success">¡Meta Cumplida!</span>` : ""}
                        </div>
                        <button class="btn-delete-goal" data-id="${goal.id}" title="Eliminar">
                          <i class="fa-solid fa-trash-can"></i>
                        </button>
                      </div>

                      <div class="goal-amounts">
                        <span class="current">$ ${Number(goal.current_amount).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
                        <span class="target">de $ ${Number(goal.target_amount).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
                      </div>

                      <!-- Barra de Progreso Visual -->
                      <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${goal.progressPercentage}%;"></div>
                      </div>
                      <div class="progress-footer">
                        <span>Progreso: <strong>${goal.progressPercentage}%</strong></span>
                        ${goal.target_date ? `<span>Objetivo: ${goal.target_date}</span>` : ""}
                      </div>

                      <div class="goal-card-actions">
                        <button class="btn btn-secondary btn-sm btn-block btn-contribute" data-id="${goal.id}" data-title="${goal.title}">
                          <i class="fa-solid fa-plus"></i> Aportar Dinero
                        </button>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            `}
          </div>
        </div>
      `;

      // Botón Nueva Meta
      container.querySelector("#btn-new-goal").addEventListener("click", () => {
        showGoalModal({
          onSave: () => goalsView.render(containerId)
        });
      });

      // Botón Aportar Dinero
      container.querySelectorAll(".btn-contribute").forEach(btn => {
        btn.addEventListener("click", () => {
          const goalId = btn.dataset.id;
          const goalTitle = btn.dataset.title;
          showContributeModal({
            goalId,
            goalTitle,
            wallets,
            onSave: () => goalsView.render(containerId)
          });
        });
      });

      // Eliminar Meta
      container.querySelectorAll(".btn-delete-goal").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (confirm("¿Estás seguro de eliminar esta meta?")) {
            await goalService.deleteGoal(btn.dataset.id);
            goalsView.render(containerId);
          }
        });
      });

    } catch (err) {
      container.innerHTML = `<div class="alert-error">Error al cargar metas: ${err.message}</div>`;
    }
  }
};

// Modal Crear Meta
function showGoalModal({ onSave }) {
  let selectedIcon = "fa-bullseye";
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 440px;">
      <div class="modal-header">
        <h4>Nueva Meta de Ahorro</h4>
        <button id="btn-close-goal-modal" class="modal-close-btn">&times;</button>
      </div>

      <form id="goal-create-form">
        <div class="form-group">
          <label>¿Qué objetivo deseas comprar o lograr?</label>
          <input type="text" id="goal-title" placeholder="Ej. PlayStation 5, Moto, Viaje" required />
        </div>

        <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label>Valor Meta ($)</label>
            <input type="number" id="goal-target" min="1" step="any" placeholder="Ej. 3000000" required />
          </div>
          <div class="form-group">
            <label>Ahorro Inicial ($)</label>
            <input type="number" id="goal-current" min="0" step="any" value="0" />
          </div>
        </div>

        <div class="form-group">
          <label>Fecha Estimada (Opcional)</label>
          <input type="date" id="goal-date" />
        </div>

        <div class="form-group">
          <label>Selecciona un Icono</label>
          <div class="icon-picker-grid">
            ${GOAL_ICONS.map(icon => `
              <button type="button" class="icon-choice ${icon === selectedIcon ? "selected" : ""}" data-icon="${icon}">
                <i class="fa-solid ${icon}"></i>
              </button>
            `).join("")}
          </div>
        </div>

        <div id="goal-modal-error" class="alert-error" style="display: none;"></div>

        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" class="btn btn-primary btn-block">Crear Meta</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#btn-close-goal-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  const iconButtons = modal.querySelectorAll(".icon-choice");
  iconButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      iconButtons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedIcon = btn.dataset.icon;
    });
  });

  modal.querySelector("#goal-create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = modal.querySelector("#goal-title").value.trim();
    const target_amount = modal.querySelector("#goal-target").value;
    const current_amount = modal.querySelector("#goal-current").value;
    const target_date = modal.querySelector("#goal-date").value || null;
    const errorDiv = modal.querySelector("#goal-modal-error");

    try {
      await goalService.createGoal({
        title,
        target_amount,
        current_amount,
        target_date,
        icon: selectedIcon
      });
      closeModal();
      if (onSave) onSave();
    } catch (err) {
      errorDiv.textContent = err.message || "Error al crear la meta";
      errorDiv.style.display = "block";
    }
  });
}

// Modal Aportar Dinero a Meta
function showContributeModal({ goalId, goalTitle, wallets, onSave }) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h4>Aportar a: ${goalTitle}</h4>
        <button id="btn-close-contrib-modal" class="modal-close-btn">&times;</button>
      </div>

      <form id="contrib-form">
        <div class="form-group">
          <label>¿Cuánto dinero deseas aportar? ($)</label>
          <input type="number" id="contrib-amount" step="any" min="1" placeholder="Ej. 50000" required autofocus />
        </div>

        <div class="form-group">
          <label>Descontar de la billetera:</label>
          <select id="contrib-wallet">
            <option value="">-- No descontar de ninguna cuenta --</option>
            ${wallets.map(w => `
              <option value="${w.id}">
                ${w.name} (Saldo: $ ${Number(w.balance).toLocaleString("es-CO")})
              </option>
            `).join("")}
          </select>
          <small style="color: var(--text-muted); font-size: 0.75rem;">
            Si eliges una cuenta, se registrará el gasto y el saldo se descontará automáticamente.
          </small>
        </div>

        <div id="contrib-error" class="alert-error" style="display: none;"></div>

        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" class="btn btn-primary btn-block">Confirmar Aporte</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#btn-close-contrib-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelector("#contrib-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const amount = modal.querySelector("#contrib-amount").value;
    const wallet_id = modal.querySelector("#contrib-wallet").value || null;
    const errorDiv = modal.querySelector("#contrib-error");

    try {
      await goalService.contributeToGoal(goalId, amount, wallet_id);
      closeModal();
      if (onSave) onSave();
    } catch (err) {
      errorDiv.textContent = err.message || "Error al realizar el aporte";
      errorDiv.style.display = "block";
    }
  });
}