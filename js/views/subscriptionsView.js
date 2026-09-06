// js/views/subscriptionsView.js
import { subscriptionService } from "../services/subscriptionService.js";
import { walletService } from "../services/walletService.js";
import { categoryService } from "../services/categoryService.js";
import { transactionService } from "../services/transactionService.js";
import { attachCurrencyInput, parseCurrencyInput } from "../currencyFormatter.js";

export const subscriptionsView = {
  async render(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Cargando suscripciones...</div>`;

    try {
      const [subscriptions, wallets, categories, monthTransactions] = await Promise.all([
        subscriptionService.getSubscriptions(),
        walletService.getWallets(),
        categoryService.getCategories("expense"),
        transactionService.getTransactions()
      ]);

      const activeSubs = subscriptions.filter(s => s.is_active);
      const totalMonthly = activeSubs.reduce((sum, s) => sum + Number(s.amount), 0);

      const paidSubsCount = activeSubs.filter(sub => 
        monthTransactions.some(t => t.type === "expense" && t.title.toLowerCase().includes(sub.name.toLowerCase()))
      ).length;

      container.innerHTML = `
        <div class="subscriptions-module">
          <div class="summary-cards-grid">
            <div class="metric-card">
              <span class="metric-label"><i class="fa-solid fa-repeat text-primary"></i> Gasto Fijo Mensual</span>
              <span class="metric-value">$ ${totalMonthly.toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label"><i class="fa-solid fa-circle-check text-success"></i> Pagadas este mes</span>
              <span class="metric-value">${paidSubsCount} de ${activeSubs.length}</span>
            </div>
          </div>

          <div class="section-card">
            <div class="section-header">
              <div>
                <h3><i class="fa-solid fa-calendar-days"></i> Mis Pagos Fijos y Suscripciones</h3>
                <p>Gestiona tus mensualidades y márcalas como pagadas para sumarlas a tus gastos</p>
              </div>
              <button id="btn-new-sub" class="btn btn-primary btn-sm">
                <i class="fa-solid fa-plus"></i> Nueva Suscripción
              </button>
            </div>

            ${subscriptions.length === 0 ? `
              <div class="empty-state">
                <i class="fa-regular fa-calendar-xmark empty-icon"></i>
                <p>No tienes suscripciones registradas aún.</p>
                <small>Agrega tu plan móvil, arriendo o servicios periódicos.</small>
              </div>
            ` : `
              <div class="subs-grid">
                ${subscriptions.map(sub => {
                  const paidTx = monthTransactions.find(t => 
                    t.type === "expense" && t.title.toLowerCase().includes(sub.name.toLowerCase())
                  );
                  const isPaid = !!paidTx;

                  return `
                    <div class="sub-card ${sub.is_active ? "" : "sub-paused"} ${isPaid ? "sub-card-paid" : ""}">
                      <div class="sub-date-badge">
                        <span class="sub-day">Día ${sub.billing_day}</span>
                        <small>de cada mes</small>
                      </div>

                      <div class="sub-details">
                        <div class="sub-title-row">
                          <span class="sub-name">${sub.name}</span>
                          ${!sub.is_active ? `
                            <span class="badge-sub-status badge-paused">Pausada</span>
                          ` : isPaid ? `
                            <span class="badge-sub-status badge-paid"><i class="fa-solid fa-circle-check"></i> Pagada</span>
                          ` : `
                            <span class="badge-sub-status badge-pending"><i class="fa-solid fa-clock"></i> Pendiente</span>
                          `}
                        </div>

                        <span class="sub-amount">$ ${Number(sub.amount).toLocaleString("es-CO", { minimumFractionDigits: 0 })} / mes</span>
                        
                        <div class="sub-meta">
                          ${sub.wallet ? `<span><i class="fa-solid fa-wallet"></i> ${sub.wallet.name}</span>` : ""}
                          ${sub.category ? `<span><i class="fa-solid ${sub.category.icon}"></i> ${sub.category.name}</span>` : ""}
                        </div>
                      </div>

                      <div class="sub-actions">
                        ${sub.is_active ? (
                          isPaid ? `
                            <div class="paid-indicator" title="Pagado el ${paidTx.transaction_date}">
                              <i class="fa-solid fa-check-double"></i> Al día
                            </div>
                          ` : `
                            <button class="btn btn-primary btn-sm btn-pay-sub" data-id="${sub.id}">
                              <i class="fa-solid fa-receipt"></i> Marcar Pagada
                            </button>
                          `
                        ) : ""}

                        <div class="sub-secondary-actions">
                          <button class="btn-toggle-sub ${sub.is_active ? "active" : "paused"}" data-id="${sub.id}" data-active="${sub.is_active}" title="${sub.is_active ? "Pausar suscripción" : "Activar suscripción"}">
                            <i class="fa-solid ${sub.is_active ? "fa-toggle-on" : "fa-toggle-off"}"></i>
                          </button>
                          <button class="btn-delete-sub" data-id="${sub.id}" title="Eliminar">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            `}
          </div>
        </div>
      `;

      container.querySelector("#btn-new-sub").addEventListener("click", () => {
        showSubscriptionModal({
          wallets,
          categories,
          onSave: () => subscriptionsView.render(containerId)
        });
      });

      container.querySelectorAll(".btn-pay-sub").forEach(btn => {
        btn.addEventListener("click", () => {
          const subId = btn.dataset.id;
          const sub = subscriptions.find(s => s.id === subId);
          showPaySubscriptionModal({
            sub,
            wallets,
            categories,
            onSave: () => subscriptionsView.render(containerId)
          });
        });
      });

      container.querySelectorAll(".btn-toggle-sub").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          const currentActive = btn.dataset.active === "true";
          await subscriptionService.toggleSubscription(id, !currentActive);
          subscriptionsView.render(containerId);
        });
      });

      container.querySelectorAll(".btn-delete-sub").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (confirm("¿Deseas eliminar esta suscripción?")) {
            await subscriptionService.deleteSubscription(btn.dataset.id);
            subscriptionsView.render(containerId);
          }
        });
      });

    } catch (err) {
      container.innerHTML = `<div class="alert-error">Error al cargar suscripciones: ${err.message}</div>`;
    }
  }
};

// Modal Pagar Suscripción
function showPaySubscriptionModal({ sub, wallets, categories, onSave }) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  
  const defaultCategoryId = sub.category_id || (categories.length > 0 ? categories[0].id : null);
  const defaultWalletId = sub.wallet_id || (wallets.length > 0 ? wallets[0].id : null);

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 420px;">
      <div class="modal-header">
        <h4><i class="fa-solid fa-receipt text-primary"></i> Confirmar Pago de ${sub.name}</h4>
        <button id="btn-close-pay-modal" class="modal-close-btn">&times;</button>
      </div>

      <form id="pay-sub-form">
        <div class="form-group">
          <label>Valor exacto a pagar este mes ($)</label>
          <input type="text" id="pay-amount" value="${sub.amount}" required autofocus />
          <small style="color: var(--text-muted); font-size: 0.75rem;">
            Si es tarjeta de crédito o servicio público, digita el monto real de tu extracto/factura.
          </small>
        </div>

        <div class="form-group">
          <label>¿De qué cuenta se debitó / pagó?</label>
          <select id="pay-wallet-id" required>
            ${wallets.map(w => `
              <option value="${w.id}" ${w.id === defaultWalletId ? "selected" : ""}>
                ${w.name} ($ ${Number(w.balance).toLocaleString("es-CO")})
              </option>
            `).join("")}
          </select>
        </div>

        <div class="form-group">
          <label>Fecha del pago</label>
          <input type="date" id="pay-date" value="${new Date().toISOString().split("T")[0]}" required />
        </div>

        <div id="pay-modal-error" class="alert-error" style="display: none;"></div>

        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" class="btn btn-primary btn-block">
            <i class="fa-solid fa-check"></i> Registrar Gasto y Marcar Pagada
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#btn-close-pay-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  attachCurrencyInput(modal.querySelector("#pay-amount"));

  modal.querySelector("#pay-sub-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const finalAmount = parseCurrencyInput(modal.querySelector("#pay-amount").value);
    const wallet_id = modal.querySelector("#pay-wallet-id").value;
    const date = modal.querySelector("#pay-date").value;
    const errorDiv = modal.querySelector("#pay-modal-error");

    if (isNaN(finalAmount) || finalAmount <= 0) {
      errorDiv.textContent = "Ingresa un monto válido mayor a 0.";
      errorDiv.style.display = "block";
      return;
    }

    try {
      await transactionService.addTransaction({
        wallet_id,
        category_id: defaultCategoryId,
        type: "expense",
        title: `Pago: ${sub.name}`,
        amount: finalAmount,
        date
      });

      closeModal();
      if (onSave) onSave();
    } catch (err) {
      errorDiv.textContent = err.message || "Error al registrar el pago";
      errorDiv.style.display = "block";
    }
  });
}

// Modal Crear Suscripción
function showSubscriptionModal({ wallets, categories, onSave }) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 440px;">
      <div class="modal-header">
        <h4>Nueva Suscripción / Pago Fijo</h4>
        <button id="btn-close-sub-modal" class="modal-close-btn">&times;</button>
      </div>

      <form id="sub-create-form">
        <div class="form-group">
          <label>Nombre del Servicio</label>
          <input type="text" id="sub-name" placeholder="Ej. Claro, Spotify, Arriendo" required />
        </div>

        <div class="form-grid" style="grid-template-columns: 1.2fr 1fr;">
          <div class="form-group">
            <label>Monto Mensual ($)</label>
            <input type="text" id="sub-amount" placeholder="Ej. 34.000" required />
          </div>
          <div class="form-group">
            <label>Día de Pago (1 - 31)</label>
            <input type="number" id="sub-day" min="1" max="31" placeholder="Ej. 8" required />
          </div>
        </div>

        <div class="form-group">
          <label>Billetera habitual de cobro</label>
          <select id="sub-wallet">
            <option value="">-- Sin cuenta fija --</option>
            ${wallets.map(w => `<option value="${w.id}">${w.name}</option>`).join("")}
          </select>
        </div>

        <div class="form-group">
          <label>Categoría</label>
          <select id="sub-category">
            <option value="">-- Sin categoría --</option>
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
          </select>
        </div>

        <div id="sub-modal-error" class="alert-error" style="display: none;"></div>

        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" class="btn btn-primary btn-block">Guardar Suscripción</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#btn-close-sub-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  attachCurrencyInput(modal.querySelector("#sub-amount"));

  modal.querySelector("#sub-create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = modal.querySelector("#sub-name").value.trim();
    const amount = parseCurrencyInput(modal.querySelector("#sub-amount").value);
    const billing_day = modal.querySelector("#sub-day").value;
    const wallet_id = modal.querySelector("#sub-wallet").value || null;
    const category_id = modal.querySelector("#sub-category").value || null;
    const errorDiv = modal.querySelector("#sub-modal-error");

    try {
      await subscriptionService.createSubscription({
        name,
        amount,
        billing_day,
        wallet_id,
        category_id
      });
      closeModal();
      if (onSave) onSave();
    } catch (err) {
      errorDiv.textContent = err.message || "Error al crear suscripción";
      errorDiv.style.display = "block";
    }
  });
}