// js/components/modalCategoryPicker.js
export const modalCategoryPicker = {
  render({ categories, onSelect }) {
    // Eliminar modal previo si existe
    const existing = document.getElementById("modal-category-picker");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "modal-category-picker";
    modal.className = "modal-backdrop";

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h4>Selecciona una categoría</h4>
          <button id="btn-close-cat-modal" class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-categories-grid">
          ${categories.map(cat => `
            <button class="cat-modal-btn" data-id="${cat.id}">
              <div class="cat-icon-circle" style="background-color: ${cat.color}20; color: ${cat.color};">
                <i class="fa-solid ${cat.icon}"></i>
              </div>
              <span class="cat-modal-label">${cat.name}</span>
            </button>
          `).join("")}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector("#btn-close-cat-modal");
    const closeModal = () => modal.remove();

    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelectorAll(".cat-modal-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const catId = btn.dataset.id;
        const selected = categories.find(c => c.id === catId);
        closeModal();
        if (onSelect) onSelect(selected);
      });
    });
  }
};