// js/views/loansView.js — préstamos: apps de crédito, bancos y deudas con personas
import { loanService, LENDER_TYPES, isMissingLoansTable } from "../services/loanService.js";
import { walletService } from "../services/walletService.js";
import { attachCurrencyInput, parseCurrencyInput } from "../currencyFormatter.js";
import { escapeHtml, resolveContainer, notifyError, formatShortDate } from "../utils.js";

const money = (value) => `$ ${Number(value).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const loansView = {
  async render(target) {
    const container = resolveContainer(target);
    container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Cargando tus préstamos...</div>`;

    try {
      const [loans, wallets] = await Promise.all([loanService.getLoans(), walletService.getWallets()]);
      const reload = () => this.render(container);

      if (loans.length === 0) {
        this.renderEmptyState(container, wallets, reload);
        return;
      }

      const rows = loans.map((loan) => ({ loan, summary: loanService.calculateSummary(loan) }));
      const active = rows.filter((r) => !r.summary.isPaid);
      const totalRemaining = active.reduce((sum, r) => sum + r.summary.remaining, 0);
      const totalPaid = rows.reduce((sum, r) => sum + r.summary.paid, 0);
      const nextDue = active
        .filter((r) => r.summary.nextDueDate)
        .sort((a, b) => a.summary.nextDueDate.localeCompare(b.summary.nextDueDate))[0];

      container.innerHTML = `
        <div class="loans-module">
          <div class="summary-cards-grid">
            <div class="metric-card card-expense">
              <span class="metric-label"><i class="fa-solid fa-hand-holding-dollar"></i> Debes en total</span>
              <span class="metric-value text-danger">${money(totalRemaining)}</span>
              <small class="loan-hint">${active.length} ${active.length === 1 ? "préstamo activo" : "préstamos activos"}</small>
            </div>
            <div class="metric-card card-income">
              <span class="metric-label"><i class="fa-solid fa-circle-check"></i> Ya pagaste</span>
              <span class="metric-value text-success">${money(totalPaid)}</span>
              <small class="loan-hint">Suma de todos tus abonos</small>
            </div>
            <div class="metric-card">
              <span class="metric-label"><i class="fa-regular fa-calendar"></i> Próximo pago</span>
              <span class="metric-value">${nextDue ? formatShortDate(nextDue.summary.nextDueDate) : "—"}</span>
              <small class="loan-hint">${nextDue ? `${escapeHtml(nextDue.loan.name)} · ${money(nextDue.summary.nextPaymentAmount)}` : "Sin fechas programadas"}</small>
            </div>
          </div>

          <div class="section-header" style="margin: 1.25rem 0 0.75rem;">
            <div>
              <h3><i class="fa-solid fa-handshake-angle"></i> Mis préstamos</h3>
              <p>Apps de crédito, bancos y personas a quienes les debes</p>
            </div>
            <button id="btn-new-loan" class="btn btn-primary btn-sm"><i class="fa-solid fa-plus"></i> Nuevo</button>
          </div>

          <div class="loans-list">${rows.map(({ loan, summary }) => this.renderLoan(loan, summary)).join("")}</div>
        </div>
      `;

      container.querySelector("#btn-new-loan").addEventListener("click", () => {
        showLoanModal({ loan: null, wallets, onSave: reload });
      });
      this.attachEvents(container, rows, wallets, reload);
    } catch (err) {
      if (isMissingLoansTable(err)) {
        container.innerHTML = `
          <div class="section-card" style="text-align: center; padding: 2.5rem 1.5rem;">
            <i class="fa-solid fa-database" style="font-size: 2.5rem; color: var(--warning); margin-bottom: 0.75rem;"></i>
            <h3>Falta activar los préstamos</h3>
            <p style="color: var(--text-muted); max-width: 420px; margin: 0.5rem auto 0;">
              Las tablas de préstamos todavía no existen en tu base de datos. Ejecuta el SQL de préstamos en el editor de Supabase y vuelve a entrar a esta sección.
            </p>
          </div>`;
        return;
      }
      container.innerHTML = `<div class="alert-error">Error al cargar préstamos: ${escapeHtml(err.message)}</div>`;
    }
  },

  renderLoan(loan, s) {
    const type = LENDER_TYPES[loan.lender_type] || LENDER_TYPES.person;
    const installments = Number(loan.installments) || 0;
    const rate = Number(loan.interest_rate_ea) || 0;
    const meta = [
      type.label,
      installments ? `${installments} cuotas de ${money(s.installmentAmount)}` : "Pago libre",
      rate > 0 ? `${rate}% E.A.` : null
    ].filter(Boolean).join(" · ");

    let dueLine = "";
    if (s.isPaid) {
      dueLine = `<div class="loan-due loan-due-ok"><i class="fa-solid fa-circle-check"></i> Préstamo pagado por completo</div>`;
    } else if (s.nextDueDate) {
      dueLine = `
        <div class="loan-due ${s.isOverdue ? "loan-due-late" : ""}">
          <i class="fa-regular fa-calendar"></i>
          ${installments ? "Próxima cuota" : "Fecha límite"}: <strong>${money(s.nextPaymentAmount)}</strong> · ${formatShortDate(s.nextDueDate)}
          ${s.isOverdue ? `<span class="loan-late-tag">Vencida hace ${s.daysLate} ${s.daysLate === 1 ? "día" : "días"}</span>` : ""}
        </div>`;
    }

    const progressText = installments
      ? `${s.installmentsPaid} de ${installments} cuotas pagadas`
      : `Pagado ${money(s.paid)} de ${money(s.totalToPay)}`;

    return `
      <article class="loan-card ${s.isPaid ? "loan-paid" : ""}" style="--loan-color: ${escapeHtml(loan.color || type.color)};">
        <div class="loan-head">
          <span class="loan-icon"><i class="fa-solid ${type.icon}"></i></span>
          <div class="loan-title">
            <strong>${escapeHtml(loan.name)}</strong>
            <small>${escapeHtml(meta)}</small>
          </div>
          <button class="loan-icon-btn btn-edit-loan" data-id="${loan.id}" title="Editar préstamo" aria-label="Editar préstamo"><i class="fa-solid fa-pencil"></i></button>
          <button class="loan-icon-btn loan-icon-danger btn-delete-loan" data-id="${loan.id}" title="Eliminar préstamo" aria-label="Eliminar préstamo"><i class="fa-solid fa-trash-can"></i></button>
        </div>

        <div class="loan-amounts">
          <div><small>Saldo pendiente</small><strong class="${s.isPaid ? "text-success" : "text-danger"}">${money(s.remaining)}</strong></div>
          <div style="text-align: right;"><small>Prestado</small><strong>${money(loan.principal)}</strong></div>
        </div>

        <div class="progress-bar-container" style="height: 8px;">
          <div class="progress-bar-fill" style="width: ${s.progress}%; background: ${s.isPaid ? "#10B981" : "linear-gradient(90deg, var(--loan-color), #10B981)"};"></div>
        </div>
        <div class="purchase-installment-text"><span>${progressText}</span><strong>${s.progress}%</strong></div>

        ${dueLine}
        ${loan.notes ? `<p class="loan-notes"><i class="fa-regular fa-note-sticky"></i> ${escapeHtml(loan.notes)}</p>` : ""}

        ${s.isPaid ? "" : `
          <button class="btn btn-primary btn-block btn-pay-loan" data-id="${loan.id}" style="margin-top: 0.85rem;">
            <i class="fa-solid fa-money-bill-transfer"></i> Registrar pago
          </button>`}

        ${loan.payments.length ? `
          <details class="loan-history">
            <summary>Historial de pagos (${loan.payments.length})</summary>
            ${loan.payments.map((p) => `
              <div class="loan-payment-row">
                <span>${formatShortDate(p.payment_date)}</span>
                <strong>${money(p.amount)}</strong>
                <button class="loan-icon-btn loan-icon-danger btn-delete-payment" data-loan="${loan.id}" data-id="${p.id}" title="Eliminar este pago" aria-label="Eliminar este pago"><i class="fa-solid fa-xmark"></i></button>
              </div>`).join("")}
          </details>` : ""}
      </article>
    `;
  },

  attachEvents(container, rows, wallets, reload) {
    const byId = (id) => rows.find((r) => r.loan.id === id);

    container.querySelectorAll(".btn-edit-loan").forEach((btn) => {
      btn.addEventListener("click", () => showLoanModal({ loan: byId(btn.dataset.id).loan, wallets, onSave: reload }));
    });

    container.querySelectorAll(".btn-pay-loan").forEach((btn) => {
      btn.addEventListener("click", () => {
        const { loan, summary } = byId(btn.dataset.id);
        showPayModal({ loan, summary, wallets, onSave: reload });
      });
    });

    container.querySelectorAll(".btn-delete-loan").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { loan } = byId(btn.dataset.id);
        if (!confirm(`¿Eliminar el préstamo "${loan.name}"? Los pagos ya hechos seguirán en tu historial de gastos.`)) return;
        try {
          await loanService.deleteLoan(loan.id);
          reload();
        } catch (err) {
          notifyError(err);
        }
      });
    });

    container.querySelectorAll(".btn-delete-payment").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { loan } = byId(btn.dataset.loan);
        const payment = loan.payments.find((p) => p.id === btn.dataset.id);
        if (!confirm("¿Eliminar este pago? El dinero volverá a tu cuenta y el gasto se borrará del historial.")) return;
        try {
          await loanService.deletePayment(payment);
          reload();
        } catch (err) {
          notifyError(err);
        }
      });
    });
  },

  renderEmptyState(container, wallets, reload) {
    container.innerHTML = `
      <div class="section-card" style="padding: 3rem 1.5rem; text-align: center;">
        <i class="fa-solid fa-handshake-angle" style="font-size: 3.5rem; color: #F59E0B; margin-bottom: 1rem;"></i>
        <h2>Lleva el control de tus préstamos</h2>
        <p style="color: var(--text-muted); max-width: 460px; margin: 0.5rem auto 1.5rem auto;">
          Anota lo que debes a apps como Addi, a un banco o a un amigo: verás cuánto falta, cuándo toca pagar y el avance de cada deuda.
        </p>
        <button id="btn-create-first-loan" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Agregar mi primer préstamo</button>
      </div>`;
    container.querySelector("#btn-create-first-loan").addEventListener("click", () => {
      showLoanModal({ loan: null, wallets, onSave: reload });
    });
  }
};

function openModal(html) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = html;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  modal.querySelector(".modal-close-btn").addEventListener("click", close);
  return { modal, close };
}

function showError(modal, message) {
  const box = modal.querySelector(".alert-error");
  box.textContent = message;
  box.style.display = "block";
}

// Modal: crear / editar préstamo
function showLoanModal({ loan = null, wallets, onSave }) {
  const isEditing = !!loan;
  const hasInstallments = isEditing && Number(loan.installments) > 0;
  let lenderType = isEditing ? loan.lender_type : "app";

  const { modal, close } = openModal(`
    <div class="modal-content" style="max-width: 440px;">
      <div class="modal-header">
        <h4><i class="fa-solid fa-handshake-angle text-primary"></i> ${isEditing ? "Editar préstamo" : "Nuevo préstamo"}</h4>
        <button type="button" class="modal-close-btn">&times;</button>
      </div>

      <form id="loan-form">
        <div class="form-group">
          <label>¿Quién te prestó?</label>
          <div class="loan-type-pills">
            ${Object.entries(LENDER_TYPES).map(([key, t]) => `
              <button type="button" class="loan-type-btn ${key === lenderType ? "active" : ""}" data-type="${key}">
                <i class="fa-solid ${t.icon}"></i> ${t.label}
              </button>`).join("")}
          </div>
        </div>

        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="loan-name" value="${escapeHtml(isEditing ? loan.name : "")}" placeholder="Ej. Addi, Juan, Bancolombia" required />
        </div>

        <div class="form-group">
          <label>Monto prestado ($)</label>
          <input type="text" id="loan-principal" value="${isEditing ? loan.principal : ""}" placeholder="Ej. 500.000" required />
        </div>

        <label class="loan-check">
          <input type="checkbox" id="loan-has-installments" ${hasInstallments ? "checked" : ""} />
          <span>Se paga en cuotas fijas</span>
        </label>

        <div id="loan-installment-fields" style="display: ${hasInstallments ? "block" : "none"};">
          <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="form-group">
              <label>Número de cuotas</label>
              <input type="number" id="loan-installments" min="1" max="360" value="${hasInstallments ? loan.installments : "3"}" />
            </div>
            <div class="form-group">
              <label>Interés (% E.A.)</label>
              <input type="number" id="loan-rate" step="0.01" min="0" value="${isEditing ? loan.interest_rate_ea : "0"}" />
            </div>
          </div>
          <small class="loan-hint" style="display: block; margin: -0.4rem 0 0.75rem;">Déjalo en 0 si no cobran intereses.</small>
        </div>

        <div class="form-group">
          <label id="loan-date-label">${hasInstallments ? "Fecha del primer pago" : "Fecha límite (opcional)"}</label>
          <input type="date" id="loan-date" value="${isEditing && loan.first_due_date ? loan.first_due_date : ""}" />
        </div>

        ${isEditing ? "" : `
          <div class="form-group">
            <label>¿Recibiste el dinero en una de tus cuentas?</label>
            <select id="loan-wallet">
              <option value="">No sumar a ninguna cuenta</option>
              ${wallets.map((w) => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join("")}
            </select>
            <small class="loan-hint">Se suma al saldo sin contarlo como ingreso.</small>
          </div>`}

        <div class="form-group">
          <label>Nota (opcional)</label>
          <input type="text" id="loan-notes" value="${escapeHtml(isEditing ? loan.notes || "" : "")}" placeholder="Ej. Para la matrícula" maxlength="140" />
        </div>

        <div class="alert-error" style="display: none;"></div>
        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" class="btn btn-primary btn-block">${isEditing ? "Guardar cambios" : "Crear préstamo"}</button>
        </div>
      </form>
    </div>`);

  attachCurrencyInput(modal.querySelector("#loan-principal"));

  modal.querySelectorAll(".loan-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      lenderType = btn.dataset.type;
      modal.querySelectorAll(".loan-type-btn").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  const checkbox = modal.querySelector("#loan-has-installments");
  checkbox.addEventListener("change", () => {
    modal.querySelector("#loan-installment-fields").style.display = checkbox.checked ? "block" : "none";
    modal.querySelector("#loan-date-label").textContent = checkbox.checked ? "Fecha del primer pago" : "Fecha límite (opcional)";
  });

  const submitBtn = modal.querySelector("button[type=submit]");
  modal.querySelector("#loan-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const principal = parseCurrencyInput(modal.querySelector("#loan-principal").value);
    if (principal <= 0) return showError(modal, "El monto prestado debe ser mayor a 0.");

    const withInstallments = checkbox.checked;
    const date = modal.querySelector("#loan-date").value;
    if (withInstallments && !date) return showError(modal, "Indica la fecha del primer pago para calcular las cuotas.");

    const payload = {
      name: modal.querySelector("#loan-name").value,
      lender_type: lenderType,
      principal,
      installments: withInstallments ? modal.querySelector("#loan-installments").value : null,
      interest_rate_ea: withInstallments ? modal.querySelector("#loan-rate").value : 0,
      first_due_date: date,
      notes: modal.querySelector("#loan-notes").value
    };

    submitBtn.disabled = true;
    try {
      if (isEditing) await loanService.updateLoan(loan.id, payload);
      else await loanService.createLoan({ ...payload, receive_wallet_id: modal.querySelector("#loan-wallet").value || null });
      close();
      onSave?.();
    } catch (err) {
      showError(modal, err.message || "No se pudo guardar el préstamo");
      submitBtn.disabled = false;
    }
  });
}

// Modal: registrar un pago
function showPayModal({ loan, summary, wallets, onSave }) {
  const { modal, close } = openModal(`
    <div class="modal-content" style="max-width: 420px;">
      <div class="modal-header">
        <h4><i class="fa-solid fa-money-bill-transfer text-success"></i> Pagar: ${escapeHtml(loan.name)}</h4>
        <button type="button" class="modal-close-btn">&times;</button>
      </div>

      <form id="loan-pay-form">
        <p class="loan-hint" style="margin-bottom: 1rem;">
          Saldo pendiente: <strong>${money(summary.remaining)}</strong>. El pago se descuenta de la cuenta que elijas y queda como gasto.
        </p>

        <div class="form-group">
          <label>¿Cuánto vas a pagar? ($)</label>
          <input type="text" id="loan-pay-amount" value="${summary.nextPaymentAmount || summary.remaining}" required />
        </div>

        <div class="form-group">
          <label>¿De qué cuenta sale el dinero?</label>
          <select id="loan-pay-wallet" required>
            ${wallets.map((w) => `<option value="${w.id}">${escapeHtml(w.name)} (Saldo: ${money(w.balance)})</option>`).join("")}
          </select>
        </div>

        <div class="form-group">
          <label>Fecha del pago</label>
          <input type="date" id="loan-pay-date" value="${todayIso()}" max="${todayIso()}" required />
        </div>

        <div class="alert-error" style="display: none;"></div>
        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" class="btn btn-primary btn-block">Confirmar pago</button>
        </div>
      </form>
    </div>`);

  attachCurrencyInput(modal.querySelector("#loan-pay-amount"));
  const submitBtn = modal.querySelector("button[type=submit]");

  modal.querySelector("#loan-pay-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    try {
      await loanService.addPayment({
        loan,
        amount: parseCurrencyInput(modal.querySelector("#loan-pay-amount").value),
        from_wallet_id: modal.querySelector("#loan-pay-wallet").value,
        date: modal.querySelector("#loan-pay-date").value
      });
      close();
      onSave?.();
    } catch (err) {
      showError(modal, err.message || "No se pudo registrar el pago");
      submitBtn.disabled = false;
    }
  });
}
