// js/views/walletsView.js
import { walletService } from "../services/walletService.js";
import { categoryService } from "../services/categoryService.js";
import { attachCurrencyInput, parseCurrencyInput } from "../currencyFormatter.js";
import { escapeHtml, resolveContainer, notifyError } from "../utils.js";
import { CATEGORY_ICON_GROUPS, WALLET_ICONS, iconPickerHtml, bindIconPicker } from "../icons.js";
import { colorSwatchesHtml, bindColorSwatches } from "../colorSwatches.js";

export const walletsView = {
  async render(target) {
    const container = resolveContainer(target);
    container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Cargando billeteras y categorías...</div>`;

    try {
      const [wallets, allCategories] = await Promise.all([
        walletService.getWallets(),
        categoryService.getCategories()
      ]);

      let activeCategoryTab = "expense";

      const renderContent = () => {
        const filteredCategories = allCategories.filter(c => c.type === activeCategoryTab);
        let selectedFavoriteIds = allCategories
          .filter(c => c.type === "expense" && c.is_favorite)
          .sort((a, b) => a.favorite_order - b.favorite_order)
          .map(c => c.id);

        const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);
        const fmt = (n) => Number(n).toLocaleString("es-CO", { maximumFractionDigits: 0 });

        container.innerHTML = `
          <div class="wallets-module">
            <div class="section-card wallets-card">
              <div class="section-header">
                <div>
                  <h3><i class="fa-solid fa-wallet"></i> Mis Billeteras</h3>
                  <p>Cuentas de donde saldrá y entrará tu dinero</p>
                </div>
                <div class="section-actions" style="display: flex; gap: 0.5rem; align-items: center;">
                  ${wallets.length >= 2 ? `
                    <button id="btn-transfer-money" class="btn btn-secondary btn-sm">
                      <i class="fa-solid fa-arrow-right-arrow-left"></i> Transferir
                    </button>
                  ` : ""}
                  <button id="btn-show-wallet-form" class="btn btn-primary btn-sm">
                    <i class="fa-solid fa-plus"></i> Nueva
                  </button>
                </div>
              </div>

              <div class="wallets-total">
                <span class="wallets-total-label">Saldo total disponible</span>
                <span class="wallets-total-value wallet-balance">$ ${fmt(totalBalance)}</span>
                <span class="wallets-total-meta">${wallets.length} ${wallets.length === 1 ? "cuenta" : "cuentas"}</span>
              </div>

              ${wallets.length === 0 ? `
                <div class="wallets-empty">
                  <i class="fa-solid fa-wallet"></i>
                  <p>Aún no tienes billeteras. Crea la primera para empezar a registrar tu dinero.</p>
                </div>
              ` : `
                <div class="wallets-grid">
                  ${wallets.map(w => {
                    const share = totalBalance > 0 ? Math.round((Number(w.balance || 0) / totalBalance) * 100) : 0;
                    return `
                    <div class="wallet-item" style="--wallet-accent: ${w.color};">
                      <div class="wallet-item-icon" style="background-color: ${w.color}1F; color: ${w.color};">
                        <i class="fa-solid ${w.icon}"></i>
                      </div>
                      <div class="wallet-item-info">
                        <span class="wallet-name">${escapeHtml(w.name)}</span>
                        <span class="wallet-balance">$ ${fmt(w.balance)}</span>
                        <span class="wallet-share">${share}% del total</span>
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
                  `;
                  }).join("")}
                </div>
              `}
            </div>

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
                      <i class="fa-solid fa-check"></i> <span>Guardar Favoritas (<span id="fav-count">${selectedFavoriteIds.length}</span>/4)</span>
                    </button>
                  ` : ""}
                </div>
              </div>

              <div class="cat-tabs-row">
                <button type="button" id="tab-cat-expense" class="cat-tab-btn ${activeCategoryTab === "expense" ? "active" : ""}">
                  Gastos (${allCategories.filter(c => c.type === "expense").length})
                </button>
                <button type="button" id="tab-cat-income" class="cat-tab-btn ${activeCategoryTab === "income" ? "active" : ""}">
                  Ingresos (${allCategories.filter(c => c.type === "income").length})
                </button>
              </div>

              <div id="fav-feedback" class="alert-info" style="display: none;"></div>

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
                      <span class="cat-name">${escapeHtml(cat.name)}</span>

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

        const btnTransfer = container.querySelector("#btn-transfer-money");
        if (btnTransfer) {
          btnTransfer.addEventListener("click", () => {
            showTransferModal({
              wallets,
              onSave: () => walletsView.render(target)
            });
          });
        }

        container.querySelector("#btn-show-wallet-form").addEventListener("click", () => {
          showWalletModal({
            wallet: null,
            onSave: () => walletsView.render(target)
          });
        });

        container.querySelectorAll(".btn-edit-wallet").forEach(btn => {
          btn.addEventListener("click", () => {
            const walletId = btn.dataset.id;
            const wallet = wallets.find(w => w.id === walletId);
            showWalletModal({
              wallet,
              onSave: () => walletsView.render(target)
            });
          });
        });

        container.querySelectorAll(".btn-delete-wallet").forEach(btn => {
          btn.addEventListener("click", async () => {
            const walletId = btn.dataset.id;
            const wallet = wallets.find(w => w.id === walletId);
            if (confirm(`¿Eliminar la cuenta "${wallet.name}"?`)) {
              try {
                await walletService.deleteWallet(walletId);
                walletsView.render(target);
              } catch (err) {
                notifyError(err);
              }
            }
          });
        });

        container.querySelector("#tab-cat-expense").addEventListener("click", () => {
          activeCategoryTab = "expense";
          renderContent();
        });
        container.querySelector("#tab-cat-income").addEventListener("click", () => {
          activeCategoryTab = "income";
          renderContent();
        });

        container.querySelector("#btn-new-category").addEventListener("click", () => {
          showCategoryModal({
            type: activeCategoryTab,
            onSave: () => walletsView.render(target)
          });
        });

        container.querySelectorAll(".btn-edit-cat").forEach(btn => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const catId = btn.dataset.id;
            const category = allCategories.find(c => c.id === catId);
            showCategoryModal({
              category,
              onSave: () => walletsView.render(target)
            });
          });
        });

        container.querySelectorAll(".btn-delete-cat").forEach(btn => {
          btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const catId = btn.dataset.id;
            const category = allCategories.find(c => c.id === catId);
            if (confirm(`¿Eliminar la categoría "${category.name}"?`)) {
              try {
                await categoryService.deleteCategory(catId);
                walletsView.render(target);
              } catch (err) {
                notifyError(err);
              }
            }
          });
        });

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
                notifyError(err);
              } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Guardar Favoritas (<span id="fav-count">${selectedFavoriteIds.length}</span>/4)</span>`;
              }
            });
          }
        }
      };

      renderContent();

    } catch (error) {
      container.innerHTML = `<div class="alert-error">Error al cargar datos: ${escapeHtml(error.message)}</div>`;
    }
  }
};

function showTransferModal({ wallets, onSave }) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";

  // Por defecto el destino es una cuenta distinta del origen
  const defaultFrom = wallets[0]?.id;
  const defaultTo = wallets[1]?.id || wallets[0]?.id;

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
                ${escapeHtml(w.name)} ($ ${Number(w.balance).toLocaleString("es-CO")})
              </option>
            `).join("")}
          </select>
        </div>

        <div class="form-group">
          <label>Cuenta de Destino (Hacia dónde entra el dinero)</label>
          <select id="transfer-to-wallet" required>
            ${wallets.map(w => `
              <option value="${w.id}" ${w.id === defaultTo ? "selected" : ""}>
                ${escapeHtml(w.name)} ($ ${Number(w.balance).toLocaleString("es-CO")})
              </option>
            `).join("")}
          </select>
        </div>

        <div class="form-group">
          <label>Monto a Transferir ($)</label>
          <input type="text" id="transfer-amount" placeholder="Ej. 150.000" required autofocus />
          <small style="color: var(--text-muted); font-size: 0.75rem; margin-top: 2px;">
            Este movimiento traspasa el saldo sin alterar tus gastos ni ingresos del mes.
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

  attachCurrencyInput(modal.querySelector("#transfer-amount"));

  modal.querySelector("#transfer-modal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const from_wallet_id = modal.querySelector("#transfer-from-wallet").value;
    const to_wallet_id = modal.querySelector("#transfer-to-wallet").value;
    const amount = parseCurrencyInput(modal.querySelector("#transfer-amount").value);
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

function showWalletModal({ wallet = null, onSave }) {
  const isEditing = !!wallet;
  const walletColor = isEditing ? wallet.color : "#3B82F6";
  let selectedWalletIcon = isEditing ? wallet.icon : "fa-wallet";

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
          <input type="text" id="modal-wallet-name" value="${escapeHtml(isEditing ? wallet.name : "")}" placeholder="Ej. Bancolombia, Nequi, Efectivo" required />
        </div>

        <div class="form-group">
          <label>${isEditing ? "Saldo Actual Disponible ($)" : "Saldo Inicial ($)"}</label>
          <input type="text" id="modal-wallet-balance" value="${isEditing ? wallet.balance : "0"}" placeholder="0" required />
        </div>

        <div class="form-group">
          <label>Color</label>
          <div class="color-row">
            <input type="color" id="modal-wallet-color" value="${walletColor}" />
            ${colorSwatchesHtml(walletColor)}
          </div>
        </div>

        <div class="form-group">
          <label>Icono</label>
          ${iconPickerHtml([{ icons: WALLET_ICONS }], selectedWalletIcon)}
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

  attachCurrencyInput(modal.querySelector("#modal-wallet-balance"));
  bindIconPicker(modal, (icon) => { selectedWalletIcon = icon; });
  bindColorSwatches(modal, modal.querySelector("#modal-wallet-color"));

  modal.querySelector("#wallet-modal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = modal.querySelector("#modal-wallet-name").value.trim();
    const balance = parseCurrencyInput(modal.querySelector("#modal-wallet-balance").value);
    const color = modal.querySelector("#modal-wallet-color").value;
    const icon = selectedWalletIcon;
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
        <div class="cat-preview" aria-hidden="true">
          <div class="cat-preview-icon" id="cat-preview-icon" style="background-color: ${selectedColor}25; color: ${selectedColor};">
            <i class="fa-solid ${selectedIcon}"></i>
          </div>
          <span class="cat-preview-name" id="cat-preview-name">${escapeHtml(isEditing ? category.name : "Nombre de la categoría")}</span>
        </div>

        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="cat-form-name" value="${escapeHtml(isEditing ? category.name : "")}" placeholder="Ej. Cine, Ropa, Gimnasio" required />
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

        ${colorSwatchesHtml(selectedColor)}

        <div class="form-group">
          <label>Selecciona un Icono</label>
          ${iconPickerHtml(CATEGORY_ICON_GROUPS, selectedIcon)}
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

  const nameInput = modal.querySelector("#cat-form-name");
  const colorInput = modal.querySelector("#cat-form-color");
  const previewIcon = modal.querySelector("#cat-preview-icon");
  const previewName = modal.querySelector("#cat-preview-name");

  const updatePreview = () => {
    const color = colorInput.value;
    previewIcon.style.backgroundColor = `${color}25`;
    previewIcon.style.color = color;
    previewIcon.innerHTML = `<i class="fa-solid ${selectedIcon}"></i>`;
    previewName.textContent = nameInput.value.trim() || "Nombre de la categoría";
  };

  bindIconPicker(modal, (icon) => {
    selectedIcon = icon;
    updatePreview();
  });
  bindColorSwatches(modal, colorInput);
  nameInput.addEventListener("input", updatePreview);
  colorInput.addEventListener("input", updatePreview);

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