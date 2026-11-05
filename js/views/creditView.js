// js/views/creditView.js — pestaña "Crédito": tarjetas de crédito y préstamos
import { creditCardsView } from "./creditCardsView.js";
import { loansView } from "./loansView.js";
import { resolveContainer } from "../utils.js";

const SECTIONS = {
  cards: { view: creditCardsView, label: "Tarjetas", icon: "fa-credit-card" },
  loans: { view: loansView, label: "Préstamos", icon: "fa-handshake-angle" }
};

export const creditView = {
  section: "cards",

  resetState() {
    this.section = "cards";
    creditCardsView.resetState?.();
  },

  render(target) {
    const container = resolveContainer(target);

    container.innerHTML = `
      <div class="credit-switch" data-active="${this.section}" role="tablist" aria-label="Tipo de crédito">
        <span class="credit-switch-pill" aria-hidden="true"></span>
        ${Object.entries(SECTIONS).map(([key, s]) => `
          <button type="button" role="tab" class="credit-switch-btn ${key === this.section ? "active" : ""}" data-section="${key}" aria-selected="${key === this.section}">
            <i class="fa-solid ${s.icon}"></i> ${s.label}
          </button>`).join("")}
      </div>
      <div class="credit-section"></div>
    `;

    const switcher = container.querySelector(".credit-switch");
    const sectionHost = container.querySelector(".credit-section");

    // Cada sección se pinta en su propio contenedor: una respuesta tardía de la sección
    // anterior escribe en un nodo que ya salió del DOM y no pisa la actual.
    const mount = () => {
      const host = document.createElement("div");
      sectionHost.replaceChildren(host);
      SECTIONS[this.section].view.render(host);
    };

    switcher.addEventListener("click", (e) => {
      const btn = e.target.closest(".credit-switch-btn");
      if (!btn || btn.dataset.section === this.section) return;
      this.section = btn.dataset.section;
      switcher.dataset.active = this.section;
      switcher.querySelectorAll(".credit-switch-btn").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", String(on));
      });
      mount();
    });

    mount();
  }
};
