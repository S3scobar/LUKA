// js/views/creditCardsView.js
import { creditCardService } from "../services/creditCardService.js";
import { walletService } from "../services/walletService.js";
import { categoryService } from "../services/categoryService.js";
import { transactionService } from "../services/transactionService.js";

export const creditCardsView = {
  selectedCardId: null,

  async render(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Cargando tus tarjetas de crédito...</div>`;

    try {
      const [cards, wallets, categories, monthTransactions] = await Promise.all([
        creditCardService.getCreditCards(),
        walletService.getWallets(),
        categoryService.getCategories("expense"),
        transactionService.getTransactions()
      ]);

      if (cards.length === 0) {
        this.renderEmptyState(container);
        return;
      }

      if (!this.selectedCardId || !cards.some(c => c.id === this.selectedCardId)) {
        this.selectedCardId = cards[0].id;
      }

      const currentCard = cards.find(c => c.id === this.selectedCardId);
      const purchases = await creditCardService.getPurchases(currentCard.id);
      const statement = creditCardService.calculateStatement(currentCard, purchases);
      const debitWallets = wallets.filter(w => w.id !== currentCard.wallet_id);

      // VERIFICAR SI YA SE HIZO EL PAGO DE ESTA TARJETA EN EL MES ACTUAL
      const cardPaymentsThisMonth = monthTransactions.filter(t => 
        t.type === "expense" && t.title.toLowerCase().includes(`pago tarjeta: ${currentCard.name.toLowerCase()}`)
      );
      const totalPaidThisMonth = cardPaymentsThisMonth.reduce((sum, t) => sum + Number(t.amount), 0);
      const isPaidThisMonth = totalPaidThisMonth > 0 && statement.totalDebt > 0;

      // El monto a pagar este mes: si ya pagó, es $0. Si no ha pagado, es la cuota estimada
      const amountDueThisMonth = isPaidThisMonth ? 0 : statement.estimatedStatement;

      container.innerHTML = `
        <div class="credit-cards-module">
          <!-- Selector de Tarjetas -->
          <div class="cards-tabs-row">
            ${cards.map(c => `
              <button class="card-tab-btn ${c.id === this.selectedCardId ? "active" : ""}" data-id="${c.id}">
                <i class="fa-solid fa-credit-card"></i> ${c.name}
              </button>
            `).join("")}
            <button id="btn-add-card" class="btn btn-secondary btn-sm" title="Agregar otra tarjeta">
              <i class="fa-solid fa-plus"></i> Nueva Tarjeta
            </button>
          </div>

          <!-- TARJETA VISUAL -->
          <div class="credit-card-visual" style="background: linear-gradient(135deg, ${currentCard.color}, #1E1B4B);">
            <div class="card-visual-header">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <span class="card-chip"><i class="fa-solid fa-microchip"></i></span>
                <span class="card-brand-name">${currentCard.name}</span>
              </div>
              <button id="btn-edit-current-card" class="btn-card-edit" title="Modificar datos, tasa E.A., fechas y cupo">
                <i class="fa-solid fa-pencil"></i>
              </button>
            </div>
            <div class="card-visual-numbers">
              <span>••••</span> <span>••••</span> <span>••••</span> <span>CREDIT</span>
            </div>
            <div class="card-visual-footer">
              <div>
                <small>CUPO TOTAL</small>
                <strong>$ ${statement.creditLimit.toLocaleString("es-CO")}</strong>
              </div>
              <div style="text-align: right;">
                <small>CUPO DISPONIBLE</small>
                <strong class="text-avail">$ ${statement.availableCredit.toLocaleString("es-CO")}</strong>
              </div>
            </div>
          </div>

          <!-- FECHAS CLAVE -->
          <div class="summary-cards-grid" style="margin-top: 1.25rem;">
            <div class="metric-card">
              <span class="metric-label"><i class="fa-regular fa-calendar-check"></i> Día de Corte</span>
              <span class="metric-value">Día ${currentCard.cutoff_day}</span>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Cierre de facturación</small>
            </div>
            <div class="metric-card">
              <span class="metric-label"><i class="fa-solid fa-clock-rotate-left"></i> Pagar Antes Del</span>
              <span class="metric-value text-danger">Día ${currentCard.payment_due_day}</span>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Fecha límite de pago</small>
            </div>
            <div class="metric-card">
              <span class="metric-label"><i class="fa-solid fa-percent"></i> Tasa de Interés</span>
              <span class="metric-value">${currentCard.interest_rate_ea}% <small style="font-size: 0.75rem;">E.A.</small></span>
              <small style="color: var(--text-muted); font-size: 0.75rem;">(${statement.monthlyRatePercentage}% mensual)</small>
            </div>
          </div>

          <!-- EXTRACTO DEL MES (DISTINGUE SI YA PAGÓ LA CUOTA O SI ESTÁ PENDIENTE) -->
          <div class="statement-card">
            <div class="statement-header">
              <div>
                <span class="statement-title"><i class="fa-solid fa-file-invoice-dollar"></i> Extracto a Pagar este Mes</span>
                <p>${isPaidThisMonth ? "¡Ya pagaste tu cuota de este periodo!" : "Cuota vigente, intereses y cuota de manejo"}</p>
              </div>
              <h2 class="statement-total ${isPaidThisMonth ? "text-success" : ""} style="color: ${isPaidThisMonth ? "#10B981" : "#DC2626"};">
                $ ${amountDueThisMonth.toLocaleString("es-CO")}
              </h2>
            </div>

            ${isPaidThisMonth ? `
              <!-- AVISO DE AL DÍA -->
              <div class="statement-paid-banner">
                <i class="fa-solid fa-circle-check text-success" style="font-size: 1.3rem;"></i>
                <div>
                  <strong>¡Estás al día este mes!</strong>
                  <p>Abonaste <strong>$ ${totalPaidThisMonth.toLocaleString("es-CO")}</strong>. Tu siguiente cuota se facturará en el próximo corte del Día ${currentCard.cutoff_day}.</p>
                </div>
              </div>
            ` : ""}

            <div class="statement-breakdown">
              <div class="breakdown-item">
                <span>${isPaidThisMonth ? "Próxima cuota de capital (próximo mes):" : "Capital a pagar este mes:"}</span>
                <strong>$ ${statement.totalPrincipalToPayThisMonth.toLocaleString("es-CO")}</strong>
              </div>
              <div class="breakdown-item">
                <span>${isPaidThisMonth ? "Intereses proyectados próximo mes:" : "Intereses liquidados:"}</span>
                <strong>$ ${statement.totalInterestThisMonth.toLocaleString("es-CO")}</strong>
              </div>
              ${statement.managementFee > 0 ? `
                <div class="breakdown-item">
                  <span>Cuota de manejo:</span>
                  <strong>$ ${statement.managementFee.toLocaleString("es-CO")}</strong>
                </div>
              ` : ""}
              <div class="breakdown-item total-debt-row">
                <span>Deuda total restante (meses futuros):</span>
                <strong class="text-danger">$ ${statement.totalDebt.toLocaleString("es-CO")}</strong>
              </div>
            </div>

            <div class="statement-actions">
              <button id="btn-pay-statement" class="btn ${isPaidThisMonth ? "btn-secondary" : "btn-primary"} btn-block">
                <i class="fa-solid ${isPaidThisMonth ? "fa-plus" : "fa-money-bill-check"}"></i> 
                ${isPaidThisMonth ? "Hacer Abono Voluntario a Capital" : "Pagar Tarjeta (Abonar y Liberar Cupo)"}
              </button>
            </div>
          </div>

          <!-- BOTÓN AVANCE -->
          <div class="card-action-buttons">
            <button id="btn-new-advance" class="btn btn-secondary btn-block">
              <i class="fa-solid fa-hand-holding-dollar"></i> Registrar Avance en Efectivo
            </button>
          </div>

          <!-- LISTA DE COMPRAS DIFERIDAS -->
          <div class="section-card" style="margin-top: 1.5rem;">
            <div class="section-header">
              <div>
                <h3><i class="fa-solid fa-list-check"></i> Compras Diferidas y Avances</h3>
                <p>Progreso de cuotas pagadas vs pendientes</p>
              </div>
              <span class="badge-count">${purchases.length} registradas</span>
            </div>

            ${purchases.length === 0 ? `
              <div class="empty-state">
                <i class="fa-solid fa-thumbs-up empty-icon text-success"></i>
                <p>No tienes compras ni avances registrados en esta tarjeta.</p>
              </div>
            ` : `
              <div class="purchases-list">
                ${purchases.map(p => {
                  const remaining = Math.max(0, p.installments - p.installments_paid);
                  const isCompleted = p.installments_paid >= p.installments;
                  const progress = Math.min(100, Math.round((p.installments_paid / p.installments) * 100));
                  const installmentVal = Math.round(Number(p.total_amount) / p.installments);

                  return `
                    <div class="purchase-item ${isCompleted ? "purchase-completed" : ""}">
                      <div class="purchase-icon" style="background-color: ${p.is_advance ? "#FEF3C7" : "#EFF6FF"}; color: ${p.is_advance ? "#D97706" : "#2563EB"};">
                        <i class="fa-solid ${p.is_advance ? "fa-hand-holding-dollar" : (p.category?.icon || "fa-bag-shopping")}"></i>
                      </div>

                      <div class="purchase-info">
                        <div class="purchase-title-wrap">
                          <span class="purchase-title">${p.title}</span>
                          ${p.is_advance ? `<span class="badge-advance">Avance</span>` : ""}
                          ${isCompleted ? `<span class="badge-paid"><i class="fa-solid fa-check"></i> Pagada</span>` : ""}
                        </div>
                        <div class="purchase-meta">
                          <span>Total: $ ${Number(p.total_amount).toLocaleString("es-CO")}</span>
                          <span>•</span>
                          <span>Fecha: ${p.purchase_date}</span>
                        </div>
                        <!-- Barra de progreso -->
                        <div class="progress-bar-container" style="height: 7px; margin-top: 6px;">
                          <div class="progress-bar-fill" style="width: ${progress}%; background: ${isCompleted ? "#10B981" : "linear-gradient(90deg, #3B82F6, #10B981)"};"></div>
                        </div>
                        <div class="purchase-installment-text">
                          <span>${isCompleted ? "Completamente pagada (3 de 3)" : `Cuota ${p.installments_paid} pagada de ${p.installments} ($ ${installmentVal.toLocaleString("es-CO")}/mes)`}</span>
                          <strong>${isCompleted ? "100%" : `${remaining} pendientes`}</strong>
                        </div>
                      </div>

                      <button class="btn-delete-purchase" data-id="${p.id}" title="Eliminar compra y restaurar cupo">
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

      this.attachEvents(container, currentCard, statement, debitWallets, categories, amountDueThisMonth);

    } catch (err) {
      container.innerHTML = `<div class="alert-error">Error al cargar tarjetas de crédito: ${err.message}</div>`;
    }
  },

  attachEvents(container, card, statement, debitWallets, categories, amountDueThisMonth) {
    container.querySelectorAll(".card-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.selectedCardId = btn.dataset.id;
        this.render("app");
      });
    });

    container.querySelector("#btn-add-card").addEventListener("click", () => {
      showCardModal({ card: null, onSave: () => this.render("app") });
    });

    container.querySelector("#btn-edit-current-card").addEventListener("click", () => {
      showCardModal({ card, onSave: () => this.render("app") });
    });

    container.querySelector("#btn-new-advance").addEventListener("click", () => {
      showPurchaseModal({
        card,
        debitWallets,
        categories,
        isAdvance: true,
        onSave: () => this.render("app")
      });
    });

    container.querySelector("#btn-pay-statement").addEventListener("click", () => {
      showPayCardModal({
        card,
        statement,
        suggestedAmount: amountDueThisMonth > 0 ? amountDueThisMonth : statement.estimatedStatement,
        debitWallets,
        onSave: () => this.render("app")
      });
    });

    container.querySelectorAll(".btn-delete-purchase").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const purId = btn.dataset.id;
        if (confirm("¿Deseas eliminar este registro? El cupo se restaurará y desaparecerá también del historial de gastos.")) {
          try {
            await creditCardService.deletePurchase(purId);
            this.render("app");
          } catch (err) {
            alert("Error al eliminar: " + err.message);
          }
        }
      });
    });
  },

  renderEmptyState(container) {
    container.innerHTML = `
      <div class="section-card text-center" style="padding: 3rem 1.5rem; text-align: center;">
        <i class="fa-solid fa-credit-card" style="font-size: 3.5rem; color: #8B5CF6; margin-bottom: 1rem;"></i>
        <h2>Gestiona tus Tarjetas de Crédito</h2>
        <p style="color: var(--text-muted); max-width: 460px; margin: 0.5rem auto 1.5rem auto;">
          Controla tu cupo disponible, calcula los intereses según tu tasa E.A., simula cuotas y registra avances en efectivo.
        </p>
        <button id="btn-create-first-card" class="btn btn-primary">
          <i class="fa-solid fa-plus"></i> Agregar Mi Primera Tarjeta
        </button>
      </div>
    `;

    container.querySelector("#btn-create-first-card").addEventListener("click", () => {
      showCardModal({ card: null, onSave: () => this.render("app") });
    });
  }
};

// MODAL CREAR / EDITAR TARJETA
function showCardModal({ card = null, onSave }) {
  const isEditing = !!card;

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 440px;">
      <div class="modal-header">
        <h4><i class="fa-solid fa-credit-card text-primary"></i> ${isEditing ? "Modificar Datos de la Tarjeta" : "Nueva Tarjeta de Crédito"}</h4>
        <button id="btn-close-card-modal" class="modal-close-btn">&times;</button>
      </div>

      <form id="card-form">
        <div class="form-group">
          <label>Nombre de la Tarjeta</label>
          <input type="text" id="card-name" value="${isEditing ? card.name : ""}" placeholder="Ej. Nu Mastercard, Bancolombia Visa" required />
        </div>

        <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label>Cupo Total ($)</label>
            <input type="number" id="card-limit" min="1" step="any" value="${isEditing ? card.credit_limit : ""}" placeholder="Ej. 3500000" required />
          </div>
          <div class="form-group">
            <label>Tasa (% E.A.)</label>
            <input type="number" id="card-rate" step="0.01" min="0" value="${isEditing ? card.interest_rate_ea : "25.00"}" placeholder="Ej. 25.5" required />
          </div>
        </div>

        <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label>Día de Corte (1 - 31)</label>
            <input type="number" id="card-cutoff" min="1" max="31" value="${isEditing ? card.cutoff_day : ""}" placeholder="Ej. 15" required />
          </div>
          <div class="form-group">
            <label>Día Límite de Pago</label>
            <input type="number" id="card-due" min="1" max="31" value="${isEditing ? card.payment_due_day : ""}" placeholder="Ej. 2" required />
          </div>
        </div>

        <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label>Cuota de manejo ($)</label>
            <input type="number" id="card-fee" min="0" step="any" value="${isEditing ? card.management_fee : "0"}" placeholder="Ej. 30000" />
          </div>
          <div class="form-group">
            <label>Color</label>
            <input type="color" id="card-color" value="${isEditing ? card.color : "#8B5CF6"}" />
          </div>
        </div>

        <div id="card-modal-error" class="alert-error" style="display: none;"></div>

        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" id="btn-submit-card" class="btn btn-primary btn-block">
            ${isEditing ? "Guardar Cambios" : "Crear Tarjeta"}
          </button>
        </div>

        ${isEditing ? `
          <div style="text-align: center; margin-top: 1rem;">
            <button type="button" id="btn-delete-card-entirely" class="btn-link" style="color: var(--danger); font-size: 0.8rem;">
              <i class="fa-solid fa-trash-can"></i> Eliminar esta tarjeta por completo
            </button>
          </div>
        ` : ""}
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#btn-close-card-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  const form = modal.querySelector("#card-form");
  const submitBtn = modal.querySelector("#btn-submit-card");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;

    const name = modal.querySelector("#card-name").value;
    const credit_limit = modal.querySelector("#card-limit").value;
    const interest_rate_ea = modal.querySelector("#card-rate").value;
    const cutoff_day = modal.querySelector("#card-cutoff").value;
    const payment_due_day = modal.querySelector("#card-due").value;
    const management_fee = modal.querySelector("#card-fee").value;
    const color = modal.querySelector("#card-color").value;
    const errorDiv = modal.querySelector("#card-modal-error");

    try {
      if (isEditing) {
        await creditCardService.updateCreditCard(card.id, {
          name,
          credit_limit,
          interest_rate_ea,
          cutoff_day,
          payment_due_day,
          management_fee,
          color
        });
      } else {
        await creditCardService.createCreditCard({
          name,
          credit_limit,
          interest_rate_ea,
          cutoff_day,
          payment_due_day,
          management_fee,
          color
        });
      }
      closeModal();
      if (onSave) onSave();
    } catch (err) {
      errorDiv.textContent = err.message || "Error al procesar la tarjeta";
      errorDiv.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.innerHTML = isEditing ? "Guardar Cambios" : "Crear Tarjeta";
    }
  });

  if (isEditing) {
    const deleteBtn = modal.querySelector("#btn-delete-card-entirely");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (confirm(`¿Eliminar la tarjeta "${card.name}"?`)) {
          try {
            await creditCardService.deleteCreditCard(card.id);
            closeModal();
            if (onSave) onSave();
          } catch (err) {
            alert("Error: " + err.message);
          }
        }
      });
    }
  }
}

// MODAL AVANCE
function showPurchaseModal({ card, categories = [], debitWallets = [], isAdvance = true, onSave }) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 440px;">
      <div class="modal-header">
        <h4><i class="fa-solid fa-hand-holding-dollar text-warning"></i> Registrar Avance en Efectivo</h4>
        <button id="btn-close-pur-modal" class="modal-close-btn">&times;</button>
      </div>

      <form id="purchase-card-form">
        <div class="form-group">
          <label>Motivo del Avance</label>
          <input type="text" id="pur-title" placeholder="Ej. Universidad, Pago urgente, Imprevisto" required />
        </div>

        <div class="form-grid" style="grid-template-columns: 1.2fr 1fr;">
          <div class="form-group">
            <label>Monto a Retirar ($)</label>
            <input type="number" id="pur-amount" step="any" min="1" placeholder="Ej. 300000" required autofocus />
          </div>

          <div class="form-group">
            <label>Cuotas</label>
            <select id="pur-installments" required>
              <option value="6">6 cuotas</option>
              <option value="12" selected>12 cuotas</option>
              <option value="24">24 cuotas</option>
              <option value="36">36 cuotas</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Categoría</label>
          <select id="pur-category" required>
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
          </select>
        </div>

        <div class="form-group">
          <label>¿A qué cuenta entra el dinero del avance?</label>
          <select id="pur-target-wallet" required>
            ${debitWallets.map(w => `
              <option value="${w.id}">${w.name} (Saldo: $ ${Number(w.balance).toLocaleString("es-CO")})</option>
            `).join("")}
          </select>
        </div>

        <div class="form-group">
          <label>Comisión por avance ($)</label>
          <input type="number" id="pur-fee" min="0" step="any" value="6800" placeholder="Ej. 6800" />
        </div>

        <div id="purchase-simulation" class="alert-info" style="font-size: 0.8rem; margin-top: 0.5rem;"></div>
        <div id="pur-modal-error" class="alert-error" style="display: none; margin-top: 0.5rem;"></div>

        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" id="btn-submit-advance" class="btn btn-primary btn-block">Confirmar y Transferir Avance</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#btn-close-pur-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  const amountInput = modal.querySelector("#pur-amount");
  const installmentsSelect = modal.querySelector("#pur-installments");
  const simBox = modal.querySelector("#purchase-simulation");
  const submitBtn = modal.querySelector("#btn-submit-advance");

  const updateSim = () => {
    const val = parseFloat(amountInput.value);
    const installments = parseInt(installmentsSelect.value);
    if (!val || val <= 0) {
      simBox.style.display = "none";
      return;
    }

    simBox.style.display = "block";
    const rateEA = Number(card.interest_rate_ea) / 100;
    const monthlyRate = Math.pow(1 + rateEA, 1 / 12) - 1;
    const principalPart = val / installments;
    const firstMonthInterest = val * monthlyRate;
    const firstPayment = Math.round(principalPart + firstMonthInterest);

    simBox.innerHTML = `
      Pagarás aprox. <strong>$ ${firstPayment.toLocaleString("es-CO")}</strong> en la primera cuota.<br>
      <small style="opacity: 0.85;">(Capital: $ ${Math.round(principalPart).toLocaleString("es-CO")} + Interés mes 1: $ ${Math.round(firstMonthInterest).toLocaleString("es-CO")})</small>
    `;
  };

  amountInput.addEventListener("input", updateSim);
  installmentsSelect.addEventListener("change", updateSim);

  modal.querySelector("#purchase-card-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Transfiriendo avance...`;

    const title = modal.querySelector("#pur-title").value;
    const total_amount = modal.querySelector("#pur-amount").value;
    const installments = modal.querySelector("#pur-installments").value;
    const category_id = modal.querySelector("#pur-category").value;
    const target_wallet_id = modal.querySelector("#pur-target-wallet").value;
    const advance_fee = modal.querySelector("#pur-fee").value || 0;
    const errorDiv = modal.querySelector("#pur-modal-error");

    try {
      await creditCardService.addPurchase({
        card_id: card.id,
        category_id,
        title,
        total_amount,
        installments,
        is_advance: true,
        advance_fee,
        target_wallet_id
      });
      closeModal();
      if (onSave) onSave();
    } catch (err) {
      errorDiv.textContent = err.message || "Error al registrar avance";
      errorDiv.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Confirmar y Transferir Avance`;
    }
  });
}

// MODAL PAGAR TARJETA
function showPayCardModal({ card, statement, suggestedAmount, debitWallets, onSave }) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 420px;">
      <div class="modal-header">
        <h4><i class="fa-solid fa-money-bill-check text-success"></i> Pagar Tarjeta: ${card.name}</h4>
        <button id="btn-close-paycard-modal" class="modal-close-btn">&times;</button>
      </div>

      <form id="pay-card-form">
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
          Al pagar, se descontará el dinero de tu cuenta de débito, se <strong>saldará la cuota del mes</strong> y se liberará cupo en tu tarjeta.
        </p>

        <div class="form-group">
          <label>¿Cuánto vas a pagar? ($)</label>
          <input type="number" id="pay-card-val" min="1" step="any" value="${suggestedAmount || statement.totalDebt}" required autofocus />
          <small style="color: var(--text-muted); font-size: 0.75rem;">
            Monto sugerido para quedar al día: $ ${(suggestedAmount || statement.totalDebt).toLocaleString("es-CO")}.
          </small>
        </div>

        <div class="form-group">
          <label>¿De qué cuenta sale el dinero?</label>
          <select id="pay-card-from" required>
            ${debitWallets.map(w => `
              <option value="${w.id}">
                ${w.name} (Saldo: $ ${Number(w.balance).toLocaleString("es-CO")})
              </option>
            `).join("")}
          </select>
        </div>

        <div id="paycard-modal-error" class="alert-error" style="display: none;"></div>

        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" id="btn-submit-paycard" class="btn btn-primary btn-block">Confirmar Pago</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#btn-close-paycard-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  const submitBtn = modal.querySelector("#btn-submit-paycard");

  modal.querySelector("#pay-card-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Aplicando pago...`;

    const payment_amount = modal.querySelector("#pay-card-val").value;
    const from_wallet_id = modal.querySelector("#pay-card-from").value;
    const errorDiv = modal.querySelector("#paycard-modal-error");

    try {
      await creditCardService.payCard({
        card_id: card.id,
        payment_amount,
        from_wallet_id
      });
      closeModal();
      if (onSave) onSave();
    } catch (err) {
      errorDiv.textContent = err.message || "Error al realizar el pago";
      errorDiv.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Confirmar Pago`;
    }
  });
}