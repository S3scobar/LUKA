// js/components/quickExpenseBar.js
import { transactionService } from "../services/transactionService.js";
import { creditCardService } from "../services/creditCardService.js";
import { modalCategoryPicker } from "./modalCategoryPicker.js";

export const quickExpenseBar = {
  render({ containerId, wallets, categories, creditCards = [], onTransactionSaved }) {
    const container = document.getElementById(containerId);
    let activeType = "expense"; // 'expense' | 'income'
    let selectedWalletId = wallets.length > 0 ? wallets[0].id : null;
    let savedTitle = "";
    let savedAmount = "";

    const renderBar = () => {
      // 1. Guardar lo que el usuario ya escribió para que NUNCA se borre al cambiar de cuenta
      const currentTitleInput = container.querySelector("#quick-title");
      const currentAmountInput = container.querySelector("#quick-amount");
      if (currentTitleInput) savedTitle = currentTitleInput.value;
      if (currentAmountInput) savedAmount = currentAmountInput.value;

      const expenseFavorites = categories
        .filter(c => c.type === "expense" && c.is_favorite)
        .sort((a, b) => a.favorite_order - b.favorite_order)
        .slice(0, 4);

      const allTypeCategories = categories.filter(c => c.type === activeType);
      const linkedCard = creditCards.find(c => c.wallet_id === selectedWalletId);

      container.innerHTML = `
        <div class="quick-expense-card">
          <!-- 1. Toggle Gasto / Ingreso -->
          <div class="type-toggle-pill">
            <button type="button" id="tab-expense" class="toggle-btn ${activeType === "expense" ? "active expense" : ""}">
              <i class="fa-solid fa-arrow-trend-down"></i> Gasto
            </button>
            <button type="button" id="tab-income" class="toggle-btn ${activeType === "income" ? "active income" : ""}">
              <i class="fa-solid fa-arrow-trend-up"></i> Ingreso
            </button>
          </div>

          <!-- 2. SELECTOR DE CUENTA AL INICIO (ANTES DE LOS CAMPOS) -->
          <div class="wallet-chips-section">
            <span class="action-hint">
              <i class="fa-solid fa-wallet"></i> ${activeType === "expense" ? "¿Con qué cuenta pagas?" : "¿A qué cuenta entra el dinero?"}
            </span>
            <div class="wallet-chips-row">
              ${wallets.map(w => {
                const isSelected = w.id === selectedWalletId;
                return `
                  <button type="button" class="wallet-chip-btn ${isSelected ? "selected" : ""}" data-id="${w.id}" style="${isSelected ? `border-color: ${w.color}; background-color: ${w.color}15; color: ${w.color};` : ""}">
                    <i class="fa-solid ${w.icon}"></i>
                    <span class="chip-name">${w.name}</span>
                    <span class="chip-balance">$ ${Number(w.balance).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                  </button>
                `;
              }).join("")}
            </div>
          </div>

          <!-- 3. CUOTAS (Solo si es Tarjeta de Crédito) -->
          ${linkedCard && activeType === "expense" ? `
            <div class="credit-cuotas-bar">
              <div class="cuotas-row">
                <label for="quick-installments"><i class="fa-solid fa-layer-group text-primary"></i> Cuotas de la compra:</label>
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

          <!-- 4. CAMPOS DE TEXTO: CONCEPTO Y MONTO (Conserva siempre lo escrito) -->
          <div class="quick-inputs-row">
            <div class="input-field input-title">
              <input type="text" id="quick-title" value="${savedTitle}" placeholder="${activeType === "expense" ? "¿En qué gastaste? (Ej. Almuerzo)" : "¿Concepto del ingreso? (Ej. Sueldo)"}" required autocomplete="off" />
            </div>
            <div class="input-field input-amount">
              <span class="currency-symbol">$</span>
              <input type="text" id="quick-amount" value="${savedAmount}" inputmode="numeric" placeholder="0" required autocomplete="off" />
            </div>
          </div>

          <div id="quick-error" class="alert-error" style="display: none; margin-top: 0.5rem;"></div>

          <!-- 5. CATEGORÍAS (1 CLIC) -->
          <div class="categories-action-section">
            <span class="action-hint">
              ${activeType === "expense" ? "Toca una categoría para guardar el gasto:" : "Toca una categoría para guardar el ingreso:"}
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

      // Eventos
      const tabExpense = container.querySelector("#tab-expense");
      const tabIncome = container.querySelector("#tab-income");
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

      // Clic en chips de cuenta: cambia de cuenta conservando lo que ya se escribió
      container.querySelectorAll(".wallet-chip-btn").forEach(chip => {
        chip.addEventListener("click", () => {
          selectedWalletId = chip.dataset.id;
          renderBar();
        });
      });

      // Formateo de miles en vivo
      amountInput.addEventListener("input", (e) => {
        const rawNumbers = e.target.value.replace(/\D/g, "");
        if (!rawNumbers) {
          e.target.value = "";
          updateCreditSim();
          return;
        }
        e.target.value = Number(rawNumbers).toLocaleString("es-CO");
        updateCreditSim();
      });

      const updateCreditSim = () => {
        if (!linkedCard || !installmentsSelect || !creditInfoBox) return;
        const rawNumbers = amountInput.value.replace(/\D/g, "");
        const val = parseFloat(rawNumbers);
        const installments = parseInt(installmentsSelect.value);

        if (installments === 1) {
          creditInfoBox.innerHTML = `<i class="fa-solid fa-shield-halved text-success"></i> 1 cuota: Pagas al corte sin intereses corrientes.`;
        } else if (val && val > 0) {
          const rateEA = Number(linkedCard.interest_rate_ea) / 100;
          const monthlyRate = Math.pow(1 + rateEA, 1 / 12) - 1;
          const principalPart = val / installments;
          const firstInterest = val * monthlyRate;
          const firstCuota = Math.round(principalPart + firstInterest);

          creditInfoBox.innerHTML = `<i class="fa-solid fa-calculator text-primary"></i> Pagarás aprox. <strong>$ ${firstCuota.toLocaleString("es-CO")}</strong> en la cuota 1 (Capital: $ ${Math.round(principalPart).toLocaleString("es-CO")} + Int: $ ${Math.round(firstInterest).toLocaleString("es-CO")}).`;
        } else {
          creditInfoBox.innerHTML = `Diferido a ${installments} cuotas (${linkedCard.interest_rate_ea}% E.A.).`;
        }
      };

      if (installmentsSelect) installmentsSelect.addEventListener("change", updateCreditSim);

      // Guardar transacción
      const executeSave = async (categoryId) => {
        errorDiv.style.display = "none";
        const title = titleInput.value.trim();
        const rawNumbers = amountInput.value.replace(/\D/g, "");
        const amount = parseFloat(rawNumbers);

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
            await transactionService.addTransaction({
              wallet_id: selectedWalletId,
              category_id: categoryId,
              type: activeType,
              title,
              amount
            });
          }

          // Limpiar memoria y campos tras guardar con éxito
          savedTitle = "";
          savedAmount = "";
          titleInput.value = "";
          amountInput.value = "";

          if (onTransactionSaved) onTransactionSaved();
        } catch (err) {
          errorDiv.textContent = err.message || "Error al registrar.";
          errorDiv.style.display = "block";
        }
      };

      container.querySelectorAll(".btn-fav-category:not(.btn-more)").forEach(btn => {
        btn.addEventListener("click", () => executeSave(btn.dataset.id));
      });

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