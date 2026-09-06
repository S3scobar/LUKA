// js/components/quickExpenseBar.js
import { transactionService } from "../services/transactionService.js";
import { modalCategoryPicker } from "./modalCategoryPicker.js";

export const quickExpenseBar = {
  render({ containerId, wallets, categories, onTransactionSaved }) {
    const container = document.getElementById(containerId);
    let activeType = "expense"; // 'expense' | 'income'
    let selectedWalletId = wallets.length > 0 ? wallets[0].id : null;

    const renderBar = () => {
      const expenseFavorites = categories
        .filter(c => c.type === "expense" && c.is_favorite)
        .sort((a, b) => a.favorite_order - b.favorite_order)
        .slice(0, 4);

      const allTypeCategories = categories.filter(c => c.type === activeType);

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

          <!-- Selector de Billetera -->
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

          <!-- Inputs: Nombre al lado del Valor -->
          <div class="quick-inputs-row">
            <div class="input-field input-title">
              <input type="text" id="quick-title" placeholder="${activeType === "expense" ? "¿En qué gastaste? (Ej. Almuerzo)" : "¿Concepto del ingreso? (Ej. Sueldo)"}" required autocomplete="off" />
            </div>
            <div class="input-field input-amount">
              <span class="currency-symbol">$</span>
              <input type="number" id="quick-amount" placeholder="0" min="1" step="any" required />
            </div>
          </div>

          <div id="quick-error" class="alert-error" style="display: none; margin-top: 0.5rem;"></div>

          <!-- Botones de Categorías -->
          <div class="categories-action-section">
            <span class="action-hint">
              ${activeType === "expense" ? "Toca una categoría para registrar el gasto en 1 clic:" : "Selecciona la categoría del ingreso:"}
            </span>

            <div class="quick-icons-row">
              ${activeType === "expense" ? `
                <!-- 4 Categorías Favoritas -->
                ${expenseFavorites.map(cat => `
                  <button type="button" class="btn-fav-category" data-id="${cat.id}" title="${cat.name}">
                    <div class="fav-icon-box" style="background-color: ${cat.color}20; color: ${cat.color};">
                      <i class="fa-solid ${cat.icon}"></i>
                    </div>
                    <span class="fav-label">${cat.name}</span>
                  </button>
                `).join("")}

                <!-- Botón '+' para ver otras categorías -->
                <button type="button" id="btn-more-categories" class="btn-fav-category btn-more" title="Otras categorías">
                  <div class="fav-icon-box">
                    <i class="fa-solid fa-plus"></i>
                  </div>
                  <span class="fav-label">Más</span>
                </button>
              ` : `
                <!-- Para Ingresos: lista directa -->
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

      // Event Listeners
      const tabExpense = container.querySelector("#tab-expense");
      const tabIncome = container.querySelector("#tab-income");
      const walletSelect = container.querySelector("#quick-wallet-select");
      const titleInput = container.querySelector("#quick-title");
      const amountInput = container.querySelector("#quick-amount");
      const errorDiv = container.querySelector("#quick-error");

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
      });

      // Función de guardado inmediato
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

        if (!selectedWalletId) {
          errorDiv.textContent = "Por favor selecciona una billetera.";
          errorDiv.style.display = "block";
          return;
        }

        try {
          await transactionService.addTransaction({
            wallet_id: selectedWalletId,
            category_id: categoryId,
            type: activeType,
            title,
            amount
          });

          // Limpiar inputs para el siguiente gasto
          titleInput.value = "";
          amountInput.value = "";

          // Notificar actualización al dashboard
          if (onTransactionSaved) onTransactionSaved();
        } catch (err) {
          errorDiv.textContent = err.message || "Error al registrar la transacción.";
          errorDiv.style.display = "block";
        }
      };

      // Clic en los iconos de categorías (1 CLIC REGISTRA DIRECTO)
      container.querySelectorAll(".btn-fav-category:not(.btn-more)").forEach(btn => {
        btn.addEventListener("click", () => {
          const categoryId = btn.dataset.id;
          executeSave(categoryId);
        });
      });

      // Clic en botón '+' para abrir modal
      const btnMore = container.querySelector("#btn-more-categories");
      if (btnMore) {
        btnMore.addEventListener("click", () => {
          modalCategoryPicker.render({
            categories: allTypeCategories,
            onSelect: (chosenCategory) => {
              executeSave(chosenCategory.id);
            }
          });
        });
      }
    };

    renderBar();
  }
};