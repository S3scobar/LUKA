// js/views/walletsView.js
import { walletService } from "../services/walletService.js";
import { categoryService } from "../services/categoryService.js";

const AVAILABLE_ICONS = [
  "fa-utensils", "fa-burger", "fa-pizza-slice", "fa-mug-hot", "fa-apple-whole",
  "fa-bus", "fa-car", "fa-gas-pump", "fa-train", "fa-plane",
  "fa-house", "fa-bolt", "fa-faucet-drip", "fa-wifi", "fa-couch",
  "fa-gamepad", "fa-film", "fa-music", "fa-ticket", "fa-dumbbell",
  "fa-bag-shopping", "fa-cart-shopping", "fa-shirt", "fa-gift", "fa-tag",
  "fa-heart-pulse", "fa-hospital", "fa-pills", "fa-paw",
  "fa-graduation-cap", "fa-book", "fa-laptop",
  "fa-briefcase", "fa-money-bill-wave", "fa-building-columns", "fa-chart-line", "fa-piggy-bank", "fa-wallet"
];

export const walletsView = {
  async render(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Cargando billeteras y categorías...</div>`;

    try {
      const [wallets, allCategories] = await Promise.all([
        walletService.getWallets(),
        categoryService.getCategories()
      ]);

      let activeCategoryTab = "expense"; // 'expense' | 'income'

      const renderContent = () => {
        const filteredCategories = allCategories.filter(c => c.type === activeCategoryTab);
        let selectedFavoriteIds = allCategories
          .filter(c => c.type === "expense" && c.is_favorite)
          .sort((a, b) => a.favorite_order - b.favorite_order)
          .map(c => c.id);

        container.innerHTML = `
          <div class="wallets-module">
            <!-- SECCIÓN 1: BILLETERAS -->
            <div class="section-card">
              <div class="section-header">
                <div>
                  <h3><i class="fa-solid fa-wallet"></i> Mis Billeteras</h3>
                  <p>Cuentas de donde saldrá y entrará tu dinero</p>
                </div>
                <div class="section-actions" style="display: flex; gap: 0.5rem; align-items: center;">
                  ${wallets.length >= 2 ? `
                    <button id="btn-transfer-money" class="btn btn-primary btn-sm">
                      <i class="fa-solid fa-arrow-right-arrow-left"></i> Transferir Dinero
                    </button>
                  ` : ""}
                  <button id="btn-show-wallet-form" class="btn btn-secondary btn-sm">
                    <i class="fa-solid fa-plus"></i> Nueva Billetera
                  </button>
                </div>
              </div>

              <!-- Lista de Billeteras -->
              <div class="wallets-grid">
                ${wallets.map(w => `
                  <div class="wallet-item" style="border-left: 5px solid ${w.color};">
                    <div class="wallet-item-icon" style="background-color: ${w.color}20; color: ${w.color};">
                      <i class="fa-solid ${w.icon}"></i>
                    </div>
                    <div class="wallet-item-info">
                      <span class="wallet-name">${w.name}</span>
                      <span class="wallet-balance">$ ${Number(w.balance).toLocaleString("es-CO", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="wallet-actions">
                      <button class="btn-edit-wallet" data-id="${w.id}" title="Editar saldo o datos">
                        <i class="fa-solid fa-pencil"></i>
                      </button>
                      <button class="btn-delete-wallet" data-id="${w.id}" title="Eliminar cuenta">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- SECCIÓN 2: CATEGORÍAS -->
            <div class="section-card">
              <div class="section-header">
                <div>
                  <h3><i class="fa-solid fa-tags"></i> Categorías</h3>
                  <p>Crea, edita o elimina categorías. En Gastos, toca una tarjeta para fijarla como favorita.</p>
                </div>
                <div class="section-actions">
                  <button id="btn-new-category" class="btn btn-secondary btn-sm">
                    <i class="fa-solid fa-plus"></i> Nueva Categoría
                  </button>
                  ${activeCategoryTab === "expense" ? `
                    <button id="btn-save-favorites" class="btn btn-primary btn-sm">
                      <i class="fa-solid fa-check"></i> Guardar Favoritas (<span id="fav-count">${selectedFavoriteIds.length}</span>/4)
                    </button>
                  ` : ""}
                </div>
              </div>

              <!-- Pestañas Gasto / Ingreso -->
              <div class="cat-tabs-row">
                <button type="button" id="tab-cat-expense" class="cat-tab-btn ${activeCategoryTab === "expense" ? "active" : ""}">
                  Gastos (${allCategories.filter(c => c.type === "expense").length})
                </button>
                <button type="button" id="tab-cat-income" class="cat-tab-btn ${activeCategoryTab === "income" ? "active" : ""}">
                  Ingresos (${allCategories.filter(c => c.type === "income").length})
                </button>
              </div>

              <div id="fav-feedback" class="alert-info" style="display: none;"></div>

              <!-- Grilla de Categorías -->
              <div class="categories-selection-grid">
                ${filteredCategories.map(cat => {
                  const isFav = cat.type === "expense" && selectedFavoriteIds.includes(cat.id);
                  const orderIndex = selectedFavoriteIds.indexOf(cat.id) + 1;
                  return `
                    <div class="category-manage-card ${isFav ? "is-selected" : ""}" data-id="${cat.id}">
                      ${cat.type === "expense" ? `
                        <span class="fav-badge" title="Favorita">${isFav ? `#${orderIndex}` : "+"}</span>
                      ` : ""}
                      
                      <div class="cat-icon-box" style="background-color: ${cat.color}25; color: ${cat.color};">
                        <i class="fa-solid ${cat.icon}"></i>
                      </div>
                      <span class="cat-name">${cat.name}</span>

                      <div class="cat-card-actions">
                        <button type="button" class="btn-edit-cat" data-id="${cat.id}" title="Editar">
                          <i class="fa-solid fa-pencil"></i>
                        </button>
                        <button type="button" class="btn-delete-cat" data-id="${cat.id}" title="Eliminar">
                          <i class="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          </div>
        `;

        // 1. Evento para abrir modal de transferencia
        const btnTransfer = container.querySelector("#btn-transfer-money");
        if (btnTransfer) {
          btnTransfer.addEventListener("click", () => {
            showTransferModal({
              wallets,
              onSave: () => walletsView.render(containerId)
            });
          });
        }

        // 2. Crear nueva billetera
        container.querySelector("#btn-show-wallet-form").addEventListener("click", () => {
          showWalletModal({
            wallet: null,
            onSave: () => walletsView.render(containerId)
          });
        });

        // 3. Editar billetera / saldo
        container.querySelectorAll(".btn-edit-wallet").forEach(btn => {
          btn.addEventListener("click", () => {
            const walletId = btn.dataset.id;
            const wallet = wallets.find(w => w.id === walletId);
            showWalletModal({
              wallet,
              onSave: () => walletsView.render(containerId)
            });
          });
        });

        // 4. Eliminar billetera
        container.querySelectorAll(".btn-delete-wallet").forEach(btn => {
          btn.addEventListener("click", async () => {
            const walletId = btn.dataset.id;
            const wallet = wallets.find(w => w.id === walletId);
            if (confirm(`¿Eliminar la cuenta "${wallet.name}"?`)) {
              await walletService.deleteWallet(walletId);
              walletsView.render(containerId);
            }
          });
        });

        // Tabs de Categorías
        container.querySelector("#tab-cat-expense").addEventListener("click", () => {
          activeCategoryTab = "expense";
          renderContent();
        });
        container.querySelector("#tab-cat-income").addEventListener("click", () => {
          activeCategoryTab = "income";
          renderContent();
        });

        // Nueva Categoría
        container.querySelector("#btn-new-category").addEventListener("click", () => {
          showCategoryModal({
            type: activeCategoryTab,
            onSave: () => walletsView.render(containerId)
          });
        });

        // Editar Categoría
        container.querySelectorAll(".btn-edit-cat").forEach(btn => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const catId = btn.dataset.id;
            const category = allCategories.find(c => c.id === catId);
            showCategoryModal({
              category,
              onSave: () => walletsView.render(containerId)
            });
          });
        });

        // Eliminar Categoría
        container.querySelectorAll(".btn-delete-cat").forEach(btn => {
          btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const catId = btn.dataset.id;
            const category = allCategories.find(c => c.id === catId);
            if (confirm(`¿Eliminar la categoría "${category.name}"?`)) {
              try {
                await categoryService.deleteCategory(catId);
                walletsView.render(containerId);
              } catch (err) {
                alert(err.message);
              }
            }
          });
        });

        // Selección de Favoritas
        if (activeCategoryTab === "expense") {
          const cards = container.querySelectorAll(".category-manage-card");
          const countLabel = container.querySelector("#fav-count");
          const saveBtn = container.querySelector("#btn-save-favorites");
          const feedback = container.querySelector("#fav-feedback");

          cards.forEach(card => {
            card.addEventListener("click", (e) => {
              if (e.target.closest(".cat-card-actions")) return;

              const catId = card.dataset.id;
              const index = selectedFavoriteIds.indexOf(catId);

              if (index !== -1) {
                selectedFavoriteIds.splice(index, 1);
              } else {
                if (selectedFavoriteIds.length >= 4) {
                  alert("Solo puedes tener hasta 4 categorías favoritas.");
                  return;
                }
                selectedFavoriteIds.push(catId);
              }

              cards.forEach(c => {
                const id = c.dataset.id;
                const favIndex = selectedFavoriteIds.indexOf(id);
                const badge = c.querySelector(".fav-badge");
                if (favIndex !== -1) {
                  c.classList.add("is-selected");
                  if (badge) badge.textContent = `#${favIndex + 1}`;
                } else {
                  c.classList.remove("is-selected");
                  if (badge) badge.textContent = "+";
                }
              });
              if (countLabel) countLabel.textContent = selectedFavoriteIds.length;
            });
          });

          if (saveBtn) {
            saveBtn.addEventListener("click", async () => {
              saveBtn.disabled = true;
              saveBtn.textContent = "Guardando...";
              try {
                await categoryService.setFavoriteCategories(selectedFavoriteIds);
                feedback.textContent = "¡Favoritas actualizadas con éxito!";
                feedback.style.display = "block";
                setTimeout(() => { feedback.style.display = "none"; }, 3000);
              } catch (err) {
                alert(err.message);
              } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> Guardar Favoritas (<span id="fav-count">${selectedFavoriteIds.length}</span>/4)`;
              }
            });
          }
        }
      };

      renderContent();

    } catch (error) {
      container.innerHTML = `<div class="alert-error">Error al cargar datos: ${error.message}</div>`;
    }
  }
};

// ==========================================
// MODAL: TRANSFERIR DINERO ENTRE BILLETERAS
// ==========================================
function showTransferModal({ wallets, onSave }) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";

  const defaultFrom = wallets[0]?.id;
  const defaultTo = wallets?.id || wallets[0]?.id;

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 420px;">
      <div class="modal-header">
        <h4><i class="fa-solid fa-arrow-right-arrow-left text-primary"></i> Transferir entre Cuentas</h4>
        <button id="btn-close-transfer-modal" class="modal-close-btn">&times;</button>
      </div>

      <form id="transfer-modal-form">
        <div class="form-group">
          <label>Cuenta de Origen (De dónde sale el dinero)</label>
          <select id="transfer-from-wallet" required>
            ${wallets.map(w => `
              <option value="${w.id}" ${w.id === defaultFrom ? "selected" : ""}>
                ${w.name} ($ ${Number(w.balance).toLocaleString("es-CO")})
              </option>
            `).join("")}
          </select>
        </div>

        <div class="form-group">
          <label>Cuenta de Destino (Hacia dónde entra el dinero)</label>
          <select id="transfer-to-wallet" required>
            ${wallets.map(w => `
              <option value="${w.id}" ${w.id === defaultTo ? "selected" : ""}>
                ${w.name} ($ ${Number(w.balance).toLocaleString("es-CO")})
              </option>
            `).join("")}
          </select>
        </div>

        <div class="form-group">
          <label>Monto a Transferir ($)</label>
          <input type="number" id="transfer-amount" step="any" min="1" placeholder="Ej. 150000" required autofocus />
          <small style="color: var(--text-muted); font-size: 0.75rem; margin-top: 2px;">
            Este movimiento traspasa el saldo de forma directa sin alterar tus gastos ni ingresos del mes.
          </small>
        </div>

        <div id="transfer-modal-error" class="alert-error" style="display: none; margin-top: 0.5rem;"></div>

        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" class="btn btn-primary btn-block">
            <i class="fa-solid fa-check"></i> Confirmar Transferencia
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#btn-close-transfer-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelector("#transfer-modal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const from_wallet_id = modal.querySelector("#transfer-from-wallet").value;
    const to_wallet_id = modal.querySelector("#transfer-to-wallet").value;
    const amount = modal.querySelector("#transfer-amount").value;
    const errorDiv = modal.querySelector("#transfer-modal-error");

    try {
      await walletService.transfer({
        from_wallet_id,
        to_wallet_id,
        amount
      });
      closeModal();
      if (onSave) onSave();
    } catch (err) {
      errorDiv.textContent = err.message || "Error al realizar la transferencia";
      errorDiv.style.display = "block";
    }
  });
}

// MODAL PARA CREAR / EDITAR BILLETERA
function showWalletModal({ wallet = null, onSave }) {
  const isEditing = !!wallet;

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 420px;">
      <div class="modal-header">
        <h4>${isEditing ? "Editar Billetera y Saldo" : "Nueva Billetera"}</h4>
        <button id="btn-close-wallet-modal" class="modal-close-btn">&times;</button>
      </div>

      <form id="wallet-modal-form">
        <div class="form-group">
          <label>Nombre de la Cuenta</label>
          <input type="text" id="modal-wallet-name" value="${isEditing ? wallet.name : ""}" placeholder="Ej. Bancolombia, Nequi, Efectivo" required />
        </div>

        <div class="form-group">
          <label>${isEditing ? "Saldo Actual Disponible ($)" : "Saldo Inicial ($)"}</label>
          <input type="number" id="modal-wallet-balance" step="0.01" value="${isEditing ? wallet.balance : "0.00"}" required />
        </div>

        <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label>Color</label>
            <input type="color" id="modal-wallet-color" value="${isEditing ? wallet.color : "#3B82F6"}" />
          </div>
          <div class="form-group">
            <label>Icono</label>
            <select id="modal-wallet-icon">
              <option value="fa-wallet" ${isEditing && wallet.icon === "fa-wallet" ? "selected" : ""}>Billetera</option>
              <option value="fa-money-bill-wave" ${isEditing && wallet.icon === "fa-money-bill-wave" ? "selected" : ""}>Efectivo</option>
              <option value="fa-building-columns" ${isEditing && wallet.icon === "fa-building-columns" ? "selected" : ""}>Banco</option>
              <option value="fa-credit-card" ${isEditing && wallet.icon === "fa-credit-card" ? "selected" : ""}>Tarjeta</option>
              <option value="fa-piggy-bank" ${isEditing && wallet.icon === "fa-piggy-bank" ? "selected" : ""}>Ahorros</option>
            </select>
          </div>
        </div>

        <div id="wallet-modal-error" class="alert-error" style="display: none; margin-top: 0.5rem;"></div>

        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" class="btn btn-primary btn-block">
            ${isEditing ? "Actualizar Billetera" : "Crear Billetera"}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#btn-close-wallet-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelector("#wallet-modal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = modal.querySelector("#modal-wallet-name").value.trim();
    const balance = parseFloat(modal.querySelector("#modal-wallet-balance").value);
    const color = modal.querySelector("#modal-wallet-color").value;
    const icon = modal.querySelector("#modal-wallet-icon").value;
    const errorDiv = modal.querySelector("#wallet-modal-error");

    try {
      if (isEditing) {
        await walletService.updateWallet(wallet.id, { name, balance, color, icon });
      } else {
        await walletService.createWallet({ name, balance, color, icon });
      }
      closeModal();
      if (onSave) onSave();
    } catch (err) {
      errorDiv.textContent = err.message || "Error al guardar la billetera";
      errorDiv.style.display = "block";
    }
  });
}

// MODAL PARA CREAR / EDITAR CATEGORÍA
function showCategoryModal({ category = null, type = "expense", onSave }) {
  const isEditing = !!category;
  let selectedIcon = isEditing ? category.icon : "fa-tag";
  let selectedColor = isEditing ? category.color : "#3B82F6";

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 440px;">
      <div class="modal-header">
        <h4>${isEditing ? "Editar Categoría" : "Nueva Categoría"}</h4>
        <button id="btn-close-cat-form" class="modal-close-btn">&times;</button>
      </div>

      <form id="category-modal-form">
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="cat-form-name" value="${isEditing ? category.name : ""}" placeholder="Ej. Cine, Ropa, Gimnasio" required />
        </div>

        <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label>Tipo</label>
            <select id="cat-form-type" ${isEditing ? "disabled" : ""}>
              <option value="expense" ${(!isEditing && type === "expense") || (isEditing && category.type === "expense") ? "selected" : ""}>Gasto</option>
              <option value="income" ${(!isEditing && type === "income") || (isEditing && category.type === "income") ? "selected" : ""}>Ingreso</option>
            </select>
          </div>
          <div class="form-group">
            <label>Color</label>
            <input type="color" id="cat-form-color" value="${selectedColor}" />
          </div>
        </div>

        <div class="form-group">
          <label>Selecciona un Icono</label>
          <div class="icon-picker-grid">
            ${AVAILABLE_ICONS.map(icon => `
              <button type="button" class="icon-choice ${icon === selectedIcon ? "selected" : ""}" data-icon="${icon}">
                <i class="fa-solid ${icon}"></i>
              </button>
            `).join("")}
          </div>
        </div>

        <div id="cat-modal-error" class="alert-error" style="display: none;"></div>

        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" class="btn btn-primary btn-block">
            ${isEditing ? "Guardar Cambios" : "Crear Categoría"}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#btn-close-cat-form").addEventListener("click", closeModal);
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

  modal.querySelector("#category-modal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = modal.querySelector("#cat-form-name").value.trim();
    const color = modal.querySelector("#cat-form-color").value;
    const catType = modal.querySelector("#cat-form-type").value;
    const errorDiv = modal.querySelector("#cat-modal-error");

    try {
      if (isEditing) {
        await categoryService.updateCategory(category.id, { name, icon: selectedIcon, color });
      } else {
        await categoryService.createCategory({ name, type: catType, icon: selectedIcon, color });
      }
      closeModal();
      if (onSave) onSave();
    } catch (err) {
      errorDiv.textContent = err.message || "Error al procesar la categoría";
      errorDiv.style.display = "block";
    }
  });
}