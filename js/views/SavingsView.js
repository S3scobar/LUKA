// js/views/savingsView.js
import { goalService } from "../services/goalService.js";
import { walletService } from "../services/walletService.js";

const SAVING_ICONS = [
  "fa-piggy-bank", "fa-vault", "fa-box-archive", "fa-building-columns", 
  "fa-wallet", "fa-money-bill-wave", "fa-car", "fa-house", "fa-plane", 
  "fa-laptop", "fa-mobile-screen", "fa-gamepad", "fa-graduation-cap", "fa-shield-heart"
];

export const savingsView = {
  async render(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Cargando tus fondos de ahorro...</div>`;

    try {
      const [savingsFunds, wallets] = await Promise.all([
        goalService.getGoals(),
        walletService.getWallets()
      ]);

      const totalSaved = savingsFunds.reduce((sum, f) => sum + Number(f.current_amount), 0);

      container.innerHTML = `
        <div class="savings-module">
          <!-- Tarjeta Principal: TOTAL AHORRADO -->
          <div class="total-savings-hero">
            <div class="hero-icon-box">
              <i class="fa-solid fa-piggy-bank"></i>
            </div>
            <div class="hero-info">
              <span class="hero-label">Total Dinero Ahorrado</span>
              <h2 class="hero-amount">$ ${totalSaved.toLocaleString("es-CO", { minimumFractionDigits: 0 })}</h2>
              <span class="hero-subtext">Distribuido en <strong>${savingsFunds.length}</strong> fondos y alcancías</span>
            </div>
          </div>

          <!-- Listado de Fondos: DÓNDE ESTÁ EL DINERO -->
          <div class="section-card">
            <div class="section-header">
              <div>
                <h3><i class="fa-solid fa-vault"></i> ¿Dónde tienes guardado tu dinero?</h3>
                <p>Tus fondos, cajitas y lugares de ahorro. Toca "+ Añadir Ahorro" para sumar más dinero a cualquiera.</p>
              </div>
              <button id="btn-new-fund" class="btn btn-primary btn-sm">
                <i class="fa-solid fa-plus"></i> Nuevo Fondo / Lugar
              </button>
            </div>

            ${savingsFunds.length === 0 ? `
              <div class="empty-state">
                <i class="fa-solid fa-box-open empty-icon"></i>
                <p>No tienes fondos o lugares de ahorro registrados.</p>
                <small>Crea tu primer fondo (ej. "Fondo de Emergencia", "Cajita Nequi", "Ahorro Vacaciones").</small>
              </div>
            ` : `
              <div class="savings-funds-grid">
                ${savingsFunds.map(fund => {
                  const hasTarget = Number(fund.target_amount) > 0;
                  const isCompleted = hasTarget && fund.progressPercentage >= 100;

                  return `
                    <div class="fund-card">
                      <div class="fund-card-top">
                        <div class="fund-icon">
                          <i class="fa-solid ${fund.icon || "fa-piggy-bank"}"></i>
                        </div>
                        <div class="fund-title-wrap">
                          <span class="fund-name">${fund.title}</span>
                          ${isCompleted ? `<span class="badge-success">¡Objetivo Cumplido!</span>` : ""}
                        </div>
                        <button class="btn-delete-fund" data-id="${fund.id}" title="Eliminar fondo">
                          <i class="fa-solid fa-trash-can"></i>
                        </button>
                      </div>

                      <div class="fund-balance-row">
                        <span class="fund-balance-label">Dinero ahorrado aquí:</span>
                        <span class="fund-balance-val">$ ${Number(fund.current_amount).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
                      </div>

                      ${hasTarget ? `
                        <!-- Progreso si tiene meta fijada -->
                        <div class="fund-progress-wrap">
                          <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${fund.progressPercentage}%;"></div>
                          </div>
                          <div class="fund-target-meta">
                            <span>Objetivo: $ ${Number(fund.target_amount).toLocaleString("es-CO")}</span>
                            <strong>${fund.progressPercentage}%</strong>
                          </div>
                        </div>
                      ` : ""}

                      <!-- Botón para añadir cada vez más -->
                      <div class="fund-actions-bar">
                        <button class="btn btn-primary btn-sm btn-block btn-add-savings" data-id="${fund.id}" data-title="${fund.title}">
                          <i class="fa-solid fa-circle-plus"></i> Añadir Ahorro
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

      // 1. Crear nuevo fondo
      container.querySelector("#btn-new-fund").addEventListener("click", () => {
        showNewFundModal({
          onSave: () => savingsView.render(containerId)
        });
      });

      // 2. Añadir dinero al ahorro
      container.querySelectorAll(".btn-add-savings").forEach(btn => {
        btn.addEventListener("click", () => {
          const fundId = btn.dataset.id;
          const fundTitle = btn.dataset.title;
          showAddSavingsModal({
            fundId,
            fundTitle,
            wallets,
            onSave: () => savingsView.render(containerId)
          });
        });
      });

      // 3. Eliminar fondo
      container.querySelectorAll(".btn-delete-fund").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (confirm("¿Estás seguro de eliminar este fondo de ahorro?")) {
            await goalService.deleteGoal(btn.dataset.id);
            savingsView.render(containerId);
          }
        });
      });

    } catch (err) {
      container.innerHTML = `<div class="alert-error">Error al cargar ahorros: ${err.message}</div>`;
    }
  }
};

// Modal: Crear nuevo fondo o lugar de ahorro
function showNewFundModal({ onSave }) {
  let selectedIcon = "fa-piggy-bank";

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 440px;">
      <div class="modal-header">
        <h4><i class="fa-solid fa-vault text-primary"></i> Nuevo Lugar de Ahorro</h4>
        <button id="btn-close-fund-modal" class="modal-close-btn">&times;</button>
      </div>

      <form id="fund-create-form">
        <div class="form-group">
          <label>¿Dónde guardas este dinero? (Nombre del Fondo o Cuenta)</label>
          <input type="text" id="fund-name" placeholder="Ej. Cajita Nequi, Fondo de Emergencia, Alcancía" required />
        </div>

        <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label>Dinero Ahorrado Actual ($)</label>
            <input type="number" id="fund-current" min="0" step="any" value="0" required />
          </div>
          <div class="form-group">
            <label>Meta Objetivo ($ Opcional)</label>
            <input type="number" id="fund-target" min="0" step="any" placeholder="Ej. 1000000" />
          </div>
        </div>

        <div class="form-group">
          <label>Selecciona un Icono</label>
          <div class="icon-picker-grid">
            ${SAVING_ICONS.map(icon => `
              <button type="button" class="icon-choice ${icon === selectedIcon ? "selected" : ""}" data-icon="${icon}">
                <i class="fa-solid ${icon}"></i>
              </button>
            `).join("")}
          </div>
        </div>

        <div id="fund-modal-error" class="alert-error" style="display: none;"></div>

        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" class="btn btn-primary btn-block">Guardar Fondo de Ahorro</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#btn-close-fund-modal").addEventListener("click", closeModal);
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

  modal.querySelector("#fund-create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = modal.querySelector("#fund-name").value.trim();
    const current_amount = modal.querySelector("#fund-current").value;
    const target_amount = modal.querySelector("#fund-target").value || (Number(current_amount) > 0 ? Number(current_amount) * 2 : 1000000);
    const errorDiv = modal.querySelector("#fund-modal-error");

    try {
      await goalService.createGoal({
        title,
        target_amount,
        current_amount,
        icon: selectedIcon
      });
      closeModal();
      if (onSave) onSave();
    } catch (err) {
      errorDiv.textContent = err.message || "Error al crear fondo";
      errorDiv.style.display = "block";
    }
  });
}

// Modal: Añadir más dinero al ahorro
function showAddSavingsModal({ fundId, fundTitle, wallets, onSave }) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h4><i class="fa-solid fa-circle-plus text-success"></i> Añadir Ahorro</h4>
        <button id="btn-close-add-modal" class="modal-close-btn">&times;</button>
      </div>

      <form id="add-savings-form">
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">
          Sumar dinero a: <strong>${fundTitle}</strong>
        </p>

        <div class="form-group">
          <label>¿Cuánto dinero vas a añadir? ($)</label>
          <input type="number" id="add-amount" step="any" min="1" placeholder="Ej. 50000" required autofocus />
        </div>

        <div class="form-group">
          <label>Descontar de la cuenta:</label>
          <select id="add-wallet-id">
            <option value="">-- No descontar de ninguna cuenta --</option>
            ${wallets.map(w => `
              <option value="${w.id}">
                ${w.name} (Saldo: $ ${Number(w.balance).toLocaleString("es-CO")})
              </option>
            `).join("")}
          </select>
          <small style="color: var(--text-muted); font-size: 0.75rem;">
            Si seleccionas una cuenta, el dinero se descontará de ella y se sumará a este fondo de ahorro.
          </small>
        </div>

        <div id="add-modal-error" class="alert-error" style="display: none;"></div>

        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" class="btn btn-primary btn-block">Confirmar y Añadir Ahorro</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#btn-close-add-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelector("#add-savings-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const amount = modal.querySelector("#add-amount").value;
    const wallet_id = modal.querySelector("#add-wallet-id").value || null;
    const errorDiv = modal.querySelector("#add-modal-error");

    try {
      await goalService.contributeToGoal(fundId, amount, wallet_id);
      closeModal();
      if (onSave) onSave();
    } catch (err) {
      errorDiv.textContent = err.message || "Error al añadir ahorro";
      errorDiv.style.display = "block";
    }
  });
}