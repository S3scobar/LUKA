// js/icons.js — Sistema moderno de iconos Liquid Glass para LUKA (Phosphor Duotone + fallback FA).
import { escapeHtml } from "./utils.js";

// Mapeo exhaustivo para transformar iconos existentes en la BD a Phosphor Duotone
export const FA_TO_PHOSPHOR = {
  // Navegación y Finanzas
  "fa-house": "ph-bold ph-house-line",
  "fa-wallet": "ph-bold ph-wallet",
  "fa-credit-card": "ph-bold ph-credit-card",
  "fa-bullseye": "ph-bold ph-target",
  "fa-calendar-days": "ph-bold ph-calendar-check",
  "fa-calendar-day": "ph-bold ph-calendar-blank",
  "fa-piggy-bank": "ph-bold ph-piggy-bank",
  "fa-chart-pie": "ph-bold ph-chart-pie-slice",
  "fa-chart-column": "ph-bold ph-chart-bar",
  "fa-chart-line": "ph-bold ph-trend-up",
  "fa-chart-simple": "ph-bold ph-chart-line-up",
  "fa-scale-balanced": "ph-bold ph-scales",
  "fa-clock-rotate-left": "ph-bold ph-clock-counter-clockwise",
  "fa-money-bill-wave": "ph-bold ph-money",
  "fa-money-bill": "ph-bold ph-money",
  "fa-money-bills": "ph-bold ph-money",
  "fa-coins": "ph-bold ph-coins",
  "fa-sack-dollar": "ph-bold ph-currency-dollar-simple",
  "fa-hand-holding-dollar": "ph-bold ph-hand-coins",
  "fa-building-columns": "ph-bold ph-bank",
  "fa-landmark": "ph-bold ph-bank",
  "fa-vault": "ph-bold ph-vault",
  "fa-receipt": "ph-bold ph-receipt",
  "fa-file-invoice-dollar": "ph-bold ph-receipt",
  "fa-percent": "ph-bold ph-percent",
  "fa-arrow-down": "ph-bold ph-arrow-down-left",
  "fa-arrow-up": "ph-bold ph-arrow-up-right",
  "fa-arrow-trend-down": "ph-bold ph-trend-down",
  "fa-arrow-trend-up": "ph-bold ph-trend-up",
  "fa-arrow-right": "ph-bold ph-arrow-right",
  "fa-arrow-left": "ph-bold ph-arrow-left",
  "fa-chevron-right": "ph-bold ph-caret-right",
  "fa-chevron-left": "ph-bold ph-caret-left",
  "fa-chevron-down": "ph-bold ph-caret-down",
  "fa-chevron-up": "ph-bold ph-caret-up",
  "fa-plus": "ph-bold ph-plus",
  "fa-minus": "ph-bold ph-minus",
  "fa-pencil": "ph-bold ph-pencil-simple",
  "fa-pencil-simple": "ph-bold ph-pencil-simple",
  "fa-trash": "ph-bold ph-trash",
  "fa-trash-can": "ph-bold ph-trash",
  "fa-circle-check": "ph-bold ph-check-circle",
  "fa-circle-info": "ph-bold ph-info",
  "fa-triangle-exclamation": "ph-bold ph-warning",
  "fa-shield-halved": "ph-bold ph-shield-check",
  "fa-handshake-angle": "ph-bold ph-handshake",
  "fa-handshake": "ph-bold ph-handshake",
  "fa-moon": "ph-bold ph-moon-stars",
  "fa-sun": "ph-bold ph-sun",
  "fa-lightbulb": "ph-bold ph-sparkle",
  "fa-sparkles": "ph-bold ph-sparkle",
  "fa-arrow-right-from-bracket": "ph-bold ph-sign-out",
  "fa-user": "ph-bold ph-user",
  "fa-mobile-screen-button": "ph-bold ph-device-mobile",
  "fa-mobile-screen": "ph-bold ph-device-mobile",
  "fa-lock": "ph-bold ph-lock",

  // Comida y Bebida
  "fa-utensils": "ph-bold ph-fork-knife",
  "fa-burger": "ph-bold ph-hamburger",
  "fa-hamburger": "ph-bold ph-hamburger",
  "fa-pizza-slice": "ph-bold ph-pizza",
  "fa-bowl-food": "ph-bold ph-bowl-food",
  "fa-drumstick-bite": "ph-bold ph-cooking-pot",
  "fa-bread-slice": "ph-bold ph-bread",
  "fa-apple-whole": "ph-bold ph-apple-logo",
  "fa-mug-hot": "ph-bold ph-coffee",
  "fa-mug-saucer": "ph-bold ph-coffee",
  "fa-ice-cream": "ph-bold ph-ice-cream",
  "fa-cookie-bite": "ph-bold ph-cookie",
  "fa-cake-candles": "ph-bold ph-cake",
  "fa-candy-cane": "ph-bold ph-cookie",
  "fa-martini-glass": "ph-bold ph-martini",
  "fa-beer-mug-empty": "ph-bold ph-beer-bottle",
  "fa-wine-glass": "ph-bold ph-wine",
  "fa-bottle-water": "ph-bold ph-brandy",

  // Transporte
  "fa-bus": "ph-bold ph-bus",
  "fa-car": "ph-bold ph-car-profile",
  "fa-taxi": "ph-bold ph-taxi",
  "fa-motorcycle": "ph-bold ph-motorcycle",
  "fa-bicycle": "ph-bold ph-bicycle",
  "fa-train": "ph-bold ph-train-simple",
  "fa-plane": "ph-bold ph-airplane-tilt",
  "fa-gas-pump": "ph-bold ph-gas-pump",
  "fa-charging-station": "ph-bold ph-charging-station",
  "fa-truck": "ph-bold ph-truck",
  "fa-ship": "ph-bold ph-boat",
  "fa-square-parking": "ph-bold ph-car",
  "fa-road": "ph-bold ph-path",

  // Hogar y Servicios
  "fa-key": "ph-bold ph-key",
  "fa-couch": "ph-bold ph-armchair",
  "fa-bed": "ph-bold ph-bed",
  "fa-bolt": "ph-bold ph-lightning",
  "fa-faucet-drip": "ph-bold ph-drop",
  "fa-droplet": "ph-bold ph-drop",
  "fa-water": "ph-bold ph-drop",
  "fa-tint": "ph-bold ph-drop",
  "fa-fire-flame-curved": "ph-bold ph-flame",
  "fa-wifi": "ph-bold ph-wifi-high",
  "fa-tv": "ph-bold ph-television",
  "fa-plug": "ph-bold ph-plug",
  "fa-broom": "ph-bold ph-broom",
  "fa-soap": "ph-bold ph-drop-half-bottom",
  "fa-screwdriver-wrench": "ph-bold ph-wrench",
  "fa-shower": "ph-bold ph-drop",

  // Ocio y Entretenimiento
  "fa-gamepad": "ph-bold ph-game-controller",
  "fa-film": "ph-bold ph-film-strip",
  "fa-music": "ph-bold ph-music-notes",
  "fa-headphones": "ph-bold ph-headphones",
  "fa-ticket": "ph-bold ph-ticket",
  "fa-guitar": "ph-bold ph-guitar",
  "fa-camera": "ph-bold ph-camera",
  "fa-palette": "ph-bold ph-palette",
  "fa-dice": "ph-bold ph-dice-five",
  "fa-futbol": "ph-bold ph-soccer-ball",
  "fa-dumbbell": "ph-bold ph-barbell",
  "fa-person-swimming": "ph-bold ph-swimming-pool",
  "fa-umbrella-beach": "ph-bold ph-umbrella",
  "fa-tent": "ph-bold ph-tent",
  "fa-masks-theater": "ph-bold ph-mask-happy",
  "fa-champagne-glasses": "ph-bold ph-wine",
  "fa-smoking": "ph-bold ph-warning",

  // Compras y Moda
  "fa-bag-shopping": "ph-bold ph-shopping-bag-open",
  "fa-shopping-bag": "ph-bold ph-shopping-bag-open",
  "fa-cart-shopping": "ph-bold ph-shopping-cart-simple",
  "fa-shopping-cart": "ph-bold ph-shopping-cart-simple",
  "fa-basket-shopping": "ph-bold ph-basket",
  "fa-shirt": "ph-bold ph-t-shirt",
  "fa-socks": "ph-bold ph-footprints",
  "fa-glasses": "ph-bold ph-eyeglasses",
  "fa-gem": "ph-bold ph-sketch-logo",
  "fa-ring": "ph-bold ph-circle-notch",
  "fa-gift": "ph-bold ph-gift",
  "fa-store": "ph-bold ph-storefront",
  "fa-tags": "ph-bold ph-tags",
  "fa-box-open": "ph-bold ph-package",
  "fa-scissors": "ph-bold ph-scissors",

  // Salud y Bienestar
  "fa-heart-pulse": "ph-bold ph-heartbeat",
  "fa-hospital": "ph-bold ph-first-aid",
  "fa-pills": "ph-bold ph-pill",
  "fa-stethoscope": "ph-bold ph-stethoscope",
  "fa-tooth": "ph-bold ph-tooth",
  "fa-syringe": "ph-bold ph-syringe",
  "fa-kit-medical": "ph-bold ph-first-aid-kit",
  "fa-eye": "ph-bold ph-eye",
  "fa-brain": "ph-bold ph-brain",
  "fa-spa": "ph-bold ph-flower-lotus",
  "fa-hand-holding-heart": "ph-bold ph-hand-heart",
  "fa-person-running": "ph-bold ph-sneaker",

  // Estudio y Trabajo
  "fa-graduation-cap": "ph-bold ph-graduation-cap",
  "fa-book": "ph-bold ph-book-open-text",
  "fa-book-open-reader": "ph-bold ph-book-open-text",
  "fa-pen": "ph-bold ph-pen-nib",
  "fa-school": "ph-bold ph-buildings",
  "fa-laptop": "ph-bold ph-laptop",
  "fa-desktop": "ph-bold ph-desktop",
  "fa-briefcase": "ph-bold ph-briefcase",
  "fa-calculator": "ph-bold ph-calculator",
  "fa-language": "ph-bold ph-translate",
  "fa-print": "ph-bold ph-printer",
  "fa-chalkboard-user": "ph-bold ph-presentation-chart",

  // Familia y Mascotas
  "fa-paw": "ph-bold ph-paw-print",
  "fa-dog": "ph-bold ph-dog",
  "fa-cat": "ph-bold ph-cat",
  "fa-bone": "ph-bold ph-bone",
  "fa-baby": "ph-bold ph-baby",
  "fa-baby-carriage": "ph-bold ph-baby-carriage",
  "fa-child": "ph-bold ph-smiley",
  "fa-people-roof": "ph-bold ph-users-three",
  "fa-user-group": "ph-bold ph-users",
  "fa-hands-holding-child": "ph-bold ph-hands-clapping",
  "fa-heart": "ph-bold ph-heart",

  // Otros
  "fa-tag": "ph-bold ph-tag-chevron",
  "fa-star": "ph-bold ph-star",
  "fa-bell": "ph-bold ph-bell-ringing",
  "fa-phone": "ph-bold ph-phone",
  "fa-envelope": "ph-bold ph-envelope-simple",
  "fa-globe": "ph-bold ph-globe-hemisphere-west",
  "fa-suitcase-rolling": "ph-bold ph-suitcase",
  "fa-passport": "ph-bold ph-identification-card",
  "fa-map-location-dot": "ph-bold ph-map-pin",
  "fa-hands-praying": "ph-bold ph-hands-praying"
};

// Resuelve la clase CSS adecuada (Phosphor Duotone con fallback seguro)
export function resolveIconClass(name) {
  if (!name) return "ph-bold ph-tag-chevron";
  const trimmed = name.trim();

  // Si existe en el mapa de traducción de FA a Phosphor
  if (FA_TO_PHOSPHOR[trimmed]) {
    return FA_TO_PHOSPHOR[trimmed];
  }

  // Si ya es una clase directa de Phosphor
  if (trimmed.startsWith("ph-") || trimmed.startsWith("ph ")) {
    if (trimmed.includes("ph-bold") || trimmed.includes("ph-bold") || trimmed.includes("ph-fill") || trimmed.includes("ph-regular")) {
      return trimmed;
    }
    return `ph-bold ${trimmed}`;
  }

  // Fallback para FontAwesome
  if (trimmed.startsWith("fa-")) {
    return `fa-solid ${trimmed}`;
  }

  return trimmed;
}

// Devuelve el HTML listo para renderizar el icono
export function iconHtml(name, extraClass = "") {
  const cls = resolveIconClass(name);
  const extra = extraClass ? ` ${extraClass}` : "";
  return `<i class="${cls}${extra}"></i>`;
}

// Grupos de iconos para el selector de categorías (Phosphor Duotone de alta calidad)
export const CATEGORY_ICON_GROUPS = [
  {
    label: "Comida y bebida",
    icons: [
      "ph-fork-knife", "ph-hamburger", "ph-pizza", "ph-bowl-food", "ph-cooking-pot",
      "ph-bread", "ph-apple-logo", "ph-coffee", "ph-ice-cream", "ph-cookie",
      "ph-cake", "ph-beer-bottle", "ph-wine", "ph-martini", "ph-brandy"
    ]
  },
  {
    label: "Transporte",
    icons: [
      "ph-bus", "ph-car-profile", "ph-taxi", "ph-motorcycle", "ph-bicycle", "ph-train-simple",
      "ph-airplane-tilt", "ph-gas-pump", "ph-charging-station", "ph-truck", "ph-boat",
      "ph-path", "ph-traffic-cone"
    ]
  },
  {
    label: "Hogar y servicios",
    icons: [
      "ph-house-line", "ph-key", "ph-armchair", "ph-bed", "ph-lightning", "ph-drop",
      "ph-flame", "ph-wifi-high", "ph-television", "ph-plug", "ph-broom", "ph-wrench",
      "ph-paint-roller"
    ]
  },
  {
    label: "Ocio y entretenimiento",
    icons: [
      "ph-game-controller", "ph-film-strip", "ph-music-notes", "ph-headphones", "ph-ticket",
      "ph-guitar", "ph-camera", "ph-palette", "ph-dice-five", "ph-soccer-ball", "ph-barbell",
      "ph-swimming-pool", "ph-umbrella", "ph-tent"
    ]
  },
  {
    label: "Compras y moda",
    icons: [
      "ph-shopping-bag-open", "ph-shopping-cart-simple", "ph-basket", "ph-t-shirt", "ph-eyeglasses",
      "ph-sketch-logo", "ph-gift", "ph-storefront", "ph-tags", "ph-package", "ph-scissors"
    ]
  },
  {
    label: "Salud y bienestar",
    icons: [
      "ph-heartbeat", "ph-first-aid", "ph-pill", "ph-stethoscope", "ph-tooth", "ph-syringe",
      "ph-first-aid-kit", "ph-eye", "ph-brain", "ph-flower-lotus", "ph-hand-heart", "ph-sneaker"
    ]
  },
  {
    label: "Estudio y trabajo",
    icons: [
      "ph-graduation-cap", "ph-book-open-text", "ph-pen-nib", "ph-buildings", "ph-laptop",
      "ph-desktop", "ph-briefcase", "ph-calculator", "ph-translate", "ph-printer", "ph-presentation-chart"
    ]
  },
  {
    label: "Familia y mascotas",
    icons: [
      "ph-paw-print", "ph-dog", "ph-cat", "ph-bone", "ph-baby", "ph-baby-carriage", "ph-smiley",
      "ph-users", "ph-users-three", "ph-heart"
    ]
  },
  {
    label: "Finanzas y ahorro",
    icons: [
      "ph-money", "ph-coins", "ph-piggy-bank", "ph-vault", "ph-currency-dollar-simple",
      "ph-hand-coins", "ph-bank", "ph-trend-up", "ph-trend-down", "ph-chart-pie-slice",
      "ph-credit-card", "ph-receipt", "ph-scales", "ph-wallet"
    ]
  },
  {
    label: "Otros",
    icons: [
      "ph-tag-chevron", "ph-star", "ph-bell-ringing", "ph-device-mobile", "ph-phone",
      "ph-envelope-simple", "ph-globe-hemisphere-west", "ph-suitcase", "ph-map-pin", "ph-shield-check"
    ]
  }
];

export const WALLET_ICONS = [
  "ph-wallet", "ph-money", "ph-bank", "ph-credit-card", "ph-piggy-bank",
  "ph-device-mobile", "ph-coins", "ph-vault", "ph-hand-coins", "ph-briefcase",
  "ph-storefront", "ph-qr-code"
];

export const SAVING_ICONS = [
  "ph-vault", "ph-piggy-bank", "ph-bank", "ph-wallet", "ph-money", "ph-car-profile",
  "ph-house-line", "ph-airplane-tilt", "ph-laptop", "ph-device-mobile", "ph-game-controller",
  "ph-graduation-cap", "ph-shield-check", "ph-motorcycle", "ph-bicycle", "ph-umbrella",
  "ph-suitcase", "ph-gift", "ph-camera", "ph-plant", "ph-rocket-launch", "ph-crown",
  "ph-star", "ph-target", "ph-coins"
];

// HTML del selector de iconos en modal
export function iconPickerHtml(groups, selected) {
  const normSelected = resolveIconClass(selected);
  return `
    <div class="icon-picker">
      ${groups.map(group => `
        <div class="icon-group">
          ${group.label ? `<span class="icon-group-label">${escapeHtml(group.label)}</span>` : ""}
          <div class="icon-picker-grid">
            ${group.icons.map(icon => {
              const normIcon = resolveIconClass(icon);
              const isSelected = icon === selected || normIcon === normSelected;
              const title = icon.replace("ph-", "").replace("fa-", "").replace(/-/g, " ");
              return `
                <button type="button" class="icon-choice ${isSelected ? "selected" : ""}" data-icon="${icon}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
                  ${iconHtml(icon)}
                </button>
              `;
            }).join("")}
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
