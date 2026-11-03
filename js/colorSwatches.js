// js/colorSwatches.js — colores rápidos para categorías y billeteras

export const QUICK_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#10B981", "#14B8A6", "#06B6D4",
  "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#64748B", "#78716C"
];

export function colorSwatchesHtml(selected) {
  const current = String(selected || "").toLowerCase();
  return `
    <div class="color-swatches" role="group" aria-label="Colores rápidos">
      ${QUICK_COLORS.map(color => `
        <button type="button" class="color-swatch ${color.toLowerCase() === current ? "selected" : ""}"
                data-color="${color}" style="background-color: ${color};" aria-label="Color ${color}"></button>
      `).join("")}
    </div>
  `;
}

// Al tocar un color se escribe en el input de color (y se dispara "input" para que otros se enteren)
export function bindColorSwatches(root, colorInput) {
  const swatches = root.querySelectorAll(".color-swatch");

  const mark = () => {
    const current = colorInput.value.toLowerCase();
    swatches.forEach(s => s.classList.toggle("selected", s.dataset.color.toLowerCase() === current));
  };

  swatches.forEach(swatch => {
    swatch.addEventListener("click", () => {
      colorInput.value = swatch.dataset.color;
      colorInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
  colorInput.addEventListener("input", mark);
}
