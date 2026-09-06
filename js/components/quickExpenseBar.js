// js/components/quickExpenseBar.js
import { transactionService } from "../services/transactionService.js";
import { creditCardService } from "../services/creditCardService.js";
import { modalCategoryPicker } from "./modalCategoryPicker.js";

export const quickExpenseBar = {
  render({ containerId, wallets, categories, creditCards = [], onTransactionSaved }) {
    const container = document.getElementById(containerId);
    let activeType = "expense"; // 'expense' | 'income'
    let selectedWalletId = wallets.length > 0 ? wallets[0].id : null;

    const renderBar = () => {
      const expenseFavorites = categories
        .filter(c => c.type === "expense" && c.is_favorite)
        .sort((a, b) => a.favorite_order - b.favorite_order)
        .slice(0, 4);

      const allTypeCategories = categories.filter(c => c.type === activeType);

      // Verificar si la billetera seleccionada corresponde a una tarjeta de crédito
      const linkedCard = creditCards.find(c => c.wallet_id === selectedWalletId);

      container.innerHTML = `
        <div class="quick-expense-card">
          <!-- Toggle Gasto / Ingreso -->
          <div class="type-toggle-pill">
            <button type="button" id="tab-expense" class="toggle-btn ${activeType === "expense" ? "active expense" : ""}">
              <i class="fa-solid fa-arrow-trend-down"></i> Gasto
            </button>
            <button type="button" id="tab-income" class="toggle-btn ${activeType === "income" ? "active income" : ""}">
              <i class="fa-solid fa-arrow-trend-up"></i> Ingreso
            </button>
          </div>

          <!-- Selector de Cuenta / Tarjeta -->
          <div class="wallet-select-wrapper">
            <label for="quick-wallet-select">
              <i class="fa-solid fa-wallet"></i> Cuenta origen/destino:
            </label>
            <select id="quick-wallet-select" class="wallet-dropdown">
              ${wallets.map(w => `
                <option value="${w.id}" ${w.id === selectedWalletId ? "selected" : ""}>
                  ${w.name} ($ ${Number(w.balance).toLocaleString("es-CO")})
                </option>
              `).join("")}
            </select>
          </div>

          <!-- Fila de Inputs: Concepto + Monto -->
          <div class="quick-inputs-row">
            <div class="input-field input-title">
              <input type="text" id="quick-title" placeholder="${activeType === "expense" ? "¿En qué gastaste? (Ej. Almuerzo)" : "¿Concepto del ingreso? (Ej. Sueldo)"}" required autocomplete="off" />
            </div>
            <div class="input-field input-amount">
              <span class="currency-symbol">$</span>
              <input type="number" id="quick-amount" placeholder="0" min="1" step="any" required />
            </div>
          </div>

          <!-- SELECTOR DINÁMICO DE CUOTAS (Solo si es Tarjeta de Crédito en modo Gasto) -->
          ${linkedCard && activeType === "expense" ? `
            <div class="credit-cuotas-bar">
              <div class="cuotas-row">
                <label for="quick-installments"><i class="fa-solid fa-layer-group text-primary"></i> Diferir compra a:</label>
                <select id="quick-installments" class="cuotas-select">
                  <option value="1">1 cuota (Sin interés)</option>
                  <option value="2">2 cuotas</option>
                  <option value="3">3 cuotas</option>
                  <option value="6">6 cuotas</option>
                  <option value="12">12 cuotas</option>
                  <option value="24">24 cuotas</option>
                  <option value="36">36 cuotas</option>
                </select>
              </div>
              <div id="quick-credit-info" class="credit-info-box">
                <i class="fa-solid fa-shield-halved text-success"></i> 1 cuota: Pagas al corte sin intereses corrientes.
              </div>
            </div>
          ` : ""}

          <div id="quick-error" class="alert-error" style="display: none; margin-top: 0.5rem;"></div>

          <!-- Botones de Categorías (1 Clic) -->
          <div class="categories-action-section">
            <span class="action-hint">
              ${activeType === "expense" ? "Toca una categoría para registrar el gasto en 1 clic:" : "Selecciona la categoría del ingreso:"}
            </span>

            <div class="quick-icons-row">
              ${activeType === "expense" ? `
                ${expenseFavorites.map(cat => `
                  <button type="button" class="btn-fav-category" data-id="${cat.id}" title="${cat.name}">
                    <div class="fav-icon-box" style="background-color: ${cat.color}20; color: ${cat.color};">
                      <i class="fa-solid ${cat.icon}"></i>
                    </div>
                    <span class="fav-label">${cat.name}</span>
                  </button>
                `).join("")}

                <button type="button" id="btn-more-categories" class="btn-fav-category btn-more" title="Otras categorías">
                  <div class="fav-icon-box">
                    <i class="fa-solid fa-plus"></i>
                  </div>
                  <span class="fav-label">Más</span>
                </button>
              ` : `
                ${allTypeCategories.map(cat => `
                  <button type="button" class="btn-fav-category" data-id="${cat.id}">
                    <div class="fav-icon-box" style="background-color: ${cat.color}20; color: ${cat.color};">
                      <i class="fa-solid ${cat.icon}"></i>
                    </div>
                    <span class="fav-label">${cat.name}</span>
                  </button>
                `).join("")}
              `}
            </div>
          </div>
        </div>
      `;

      // Eventos de interacción
      const tabExpense = container.querySelector("#tab-expense");
      const tabIncome = container.querySelector("#tab-income");
      const walletSelect = container.querySelector("#quick-wallet-select");
      const titleInput = container.querySelector("#quick-title");
      const amountInput = container.querySelector("#quick-amount");
      const errorDiv = container.querySelector("#quick-error");
      const installmentsSelect = container.querySelector("#quick-installments");
      const creditInfoBox = container.querySelector("#quick-credit-info");

      tabExpense.addEventListener("click", () => {
        activeType = "expense";
        renderBar();
      });

      tabIncome.addEventListener("click", () => {
        activeType = "income";
        renderBar();
      });

      walletSelect.addEventListener("change", (e) => {
        selectedWalletId = e.target.value;
        renderBar();
      });

      // Cálculo de cuota en vivo para tarjeta de crédito
      const updateCreditSim = () => {
        if (!linkedCard || !installmentsSelect || !creditInfoBox) return;
        const val = parseFloat(amountInput.value);
        const installments = parseInt(installmentsSelect.value);

        if (installments === 1) {
          creditInfoBox.innerHTML = `<i class="fa-solid fa-shield-halved text-success"></i> 1 cuota: Pagas al corte sin intereses corrientes.`;
        } else if (val && val > 0) {
          const rateEA = Number(linkedCard.interest_rate_ea) / 100;
          const monthlyRate = Math.pow(1 + rateEA, 1 / 12) - 1;
          const principalPart = val / installments;
          const firstInterest = val * monthlyRate;
          const firstCuota = Math.round(principalPart + firstInterest);

          creditInfoBox.innerHTML = `<i class="fa-solid fa-calculator text-primary"></i> Pagarás aprox. <strong>$ ${firstCuota.toLocaleString("es-CO")}</strong> en la primera cuota (Capital: $ ${Math.round(principalPart).toLocaleString("es-CO")} + Int: $ ${Math.round(firstInterest).toLocaleString("es-CO")}).`;
        } else {
          creditInfoBox.innerHTML = `Diferido a ${installments} cuotas con tasa de ${linkedCard.interest_rate_ea}% E.A.`;
        }
      };

      if (amountInput) amountInput.addEventListener("input", updateCreditSim);
      if (installmentsSelect) installmentsSelect.addEventListener("change", updateCreditSim);

      // Guardar transacción
      const executeSave = async (categoryId) => {
        errorDiv.style.display = "none";
        const title = titleInput.value.trim();
        const amount = parseFloat(amountInput.value);

        if (!title) {
          errorDiv.textContent = "Por favor escribe un nombre para el gasto.";
          errorDiv.style.display = "block";
          titleInput.focus();
          return;
        }

        if (isNaN(amount) || amount <= 0) {
          errorDiv.textContent = "Ingresa un valor válido mayor a 0.";
          errorDiv.style.display = "block";
          amountInput.focus();
          return;
        }

        try {
          // Si es tarjeta de crédito en modo gasto
          if (linkedCard && activeType === "expense") {
            const installments = installmentsSelect ? parseInt(installmentsSelect.value) : 1;
            await creditCardService.addPurchase({
              card_id: linkedCard.id,
              category_id: categoryId,
              title,
              total_amount: amount,
              installments,
              is_advance: false
            });
          } else {
            // Gasto o ingreso normal en cuenta de débito/efectivo
            await transactionService.addTransaction({
              wallet_id: selectedWalletId,
              category_id: categoryId,
              type: activeType,
              title,
              amount
            });
          }

          titleInput.value = "";
          amountInput.value = "";

          if (onTransactionSaved) onTransactionSaved();
        } catch (err) {
          errorDiv.textContent = err.message || "Error al registrar.";
          errorDiv.style.display = "block";
        }
      };

      // Clic en los 4 iconos favoritos
      container.querySelectorAll(".btn-fav-category:not(.btn-more)").forEach(btn => {
        btn.addEventListener("click", () => {
          executeSave(btn.dataset.id);
        });
      });

      // Botón '+'
      const btnMore = container.querySelector("#btn-more-categories");
      if (btnMore) {
        btnMore.addEventListener("click", () => {
          modalCategoryPicker.render({
            categories: allTypeCategories,
            onSelect: (chosenCategory) => executeSave(chosenCategory.id)
          });
        });
      }
    };

    renderBar();
  }
};