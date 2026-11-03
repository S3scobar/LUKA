// js/icons.js — iconos disponibles al crear categorías, billeteras y fondos de ahorro.
// Todos son de Font Awesome 6.5 (estilo solid, gratis). Los iconos ya guardados en la base de
// datos siguen funcionando aunque no aparezcan aquí.

import { escapeHtml } from "./utils.js";

export const CATEGORY_ICON_GROUPS = [
  {
    label: "Comida y bebida",
    icons: [
      "fa-utensils", "fa-burger", "fa-pizza-slice", "fa-bowl-food", "fa-drumstick-bite",
      "fa-bread-slice", "fa-apple-whole", "fa-mug-hot", "fa-mug-saucer", "fa-ice-cream",
      "fa-cookie-bite", "fa-cake-candles", "fa-candy-cane", "fa-martini-glass",
      "fa-beer-mug-empty", "fa-wine-glass", "fa-bottle-water"
    ]
  },
  {
    label: "Transporte",
    icons: [
      "fa-bus", "fa-car", "fa-taxi", "fa-motorcycle", "fa-bicycle", "fa-train", "fa-plane",
      "fa-gas-pump", "fa-charging-station", "fa-truck", "fa-ship", "fa-square-parking",
      "fa-road"
    ]
  },
  {
    label: "Hogar y servicios",
    icons: [
      "fa-house", "fa-key", "fa-couch", "fa-bed", "fa-bolt", "fa-faucet-drip",
      "fa-fire-flame-curved", "fa-wifi", "fa-tv", "fa-plug", "fa-broom", "fa-soap",
      "fa-screwdriver-wrench", "fa-shower"
    ]
  },
  {
    label: "Ocio y deporte",
    icons: [
      "fa-gamepad", "fa-film", "fa-music", "fa-headphones", "fa-ticket", "fa-guitar",
      "fa-camera", "fa-palette", "fa-dice", "fa-futbol", "fa-dumbbell", "fa-person-swimming",
      "fa-umbrella-beach", "fa-tent", "fa-masks-theater", "fa-champagne-glasses",
      "fa-smoking"
    ]
  },
  {
    label: "Compras y ropa",
    icons: [
      "fa-bag-shopping", "fa-cart-shopping", "fa-basket-shopping", "fa-shirt", "fa-socks",
      "fa-glasses", "fa-gem", "fa-ring", "fa-gift", "fa-store", "fa-tags", "fa-box-open",
      "fa-scissors"
    ]
  },
  {
    label: "Salud y bienestar",
    icons: [
      "fa-heart-pulse", "fa-hospital", "fa-pills", "fa-stethoscope", "fa-tooth",
      "fa-syringe", "fa-kit-medical", "fa-eye", "fa-brain", "fa-spa",
      "fa-hand-holding-heart", "fa-person-running"
    ]
  },
  {
    label: "Estudio y trabajo",
    icons: [
      "fa-graduation-cap", "fa-book", "fa-book-open-reader", "fa-pen", "fa-school",
      "fa-laptop", "fa-desktop", "fa-briefcase", "fa-calculator", "fa-language", "fa-print",
      "fa-chalkboard-user"
    ]
  },
  {
    label: "Familia y mascotas",
    icons: [
      "fa-paw", "fa-dog", "fa-cat", "fa-bone", "fa-baby", "fa-baby-carriage", "fa-child",
      "fa-people-roof", "fa-user-group", "fa-hands-holding-child", "fa-heart"
    ]
  },
  {
    label: "Dinero y ahorro",
    icons: [
      "fa-money-bill-wave", "fa-coins", "fa-piggy-bank", "fa-vault", "fa-sack-dollar",
      "fa-hand-holding-dollar", "fa-building-columns", "fa-landmark", "fa-chart-line",
      "fa-chart-pie", "fa-credit-card", "fa-receipt", "fa-file-invoice-dollar", "fa-percent",
      "fa-scale-balanced", "fa-wallet"
    ]
  },
  {
    label: "Otros",
    icons: [
      "fa-tag", "fa-star", "fa-bell", "fa-mobile-screen", "fa-phone", "fa-envelope",
      "fa-globe", "fa-suitcase-rolling", "fa-passport", "fa-map-location-dot",
      "fa-hands-praying", "fa-trash-can"
    ]
  }
];

export const WALLET_ICONS = [
  "fa-wallet", "fa-money-bill-wave", "fa-money-bill", "fa-building-columns",
  "fa-landmark", "fa-credit-card", "fa-piggy-bank", "fa-mobile-screen", "fa-coins",
  "fa-sack-dollar", "fa-vault", "fa-hand-holding-dollar", "fa-money-check-dollar",
  "fa-briefcase", "fa-qrcode", "fa-store"
];

export const SAVING_ICONS = [
  "fa-piggy-bank", "fa-vault", "fa-box-archive", "fa-building-columns", "fa-wallet",
  "fa-money-bill-wave", "fa-car", "fa-house", "fa-plane", "fa-laptop",
  "fa-mobile-screen", "fa-gamepad", "fa-graduation-cap", "fa-shield-heart",
  "fa-house-chimney", "fa-motorcycle", "fa-bicycle", "fa-umbrella-beach",
  "fa-suitcase-rolling", "fa-ring", "fa-baby", "fa-heart", "fa-gift", "fa-camera",
  "fa-tree", "fa-seedling", "fa-rocket", "fa-crown", "fa-star", "fa-bullseye",
  "fa-sack-dollar", "fa-coins"
];

// HTML del selector. Recibe grupos [{ label, icons }]; un grupo sin label no muestra título.
export function iconPickerHtml(groups, selected) {
  return `
    <div class="icon-picker">
      ${groups.map(group => `
        <div class="icon-group">
          ${group.label ? `<span class="icon-group-label">${escapeHtml(group.label)}</span>` : ""}
          <div class="icon-picker-grid">
            ${group.icons.map(icon => `
              <button type="button" class="icon-choice ${icon === selected ? "selected" : ""}" data-icon="${icon}" title="${icon.replace("fa-", "").replace(/-/g, " ")}" aria-label="${icon.replace("fa-", "").replace(/-/g, " ")}">
                <i class="fa-solid ${icon}"></i>
              </button>
            `).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

// Marca el icono elegido y avisa con onSelect(icono)
export function bindIconPicker(root, onSelect) {
  const buttons = root.querySelectorAll(".icon-choice");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      onSelect(btn.dataset.icon);
    });
  });
}
