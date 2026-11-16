// js/components/notificationCenter.js
// Componente de Notificaciones UI (Campana en header + Panel desplegable + Banner contextual)
// Estilo Apple Liquid Glass: sutil, no invasivo, con respuesta táctil y cierre limpio.

import { notificationService } from "../services/notificationService.js";
import { escapeHtml } from "../utils.js";

export const notificationCenter = {
  notifications: [],
  onNavigateTab: null,
  isPanelOpen: false,

  init({ onNavigateTab }) {
    this.onNavigateTab = onNavigateTab;
    this.setupHeaderBell();
    this.refresh();
    this.checkPermissionModal();

    // Re-evaluar cada 5 minutos o cuando la ventana vuelve al primer plano
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.refresh();
        this.checkPermissionModal();
      }
    });

    setInterval(() => {
      this.refresh();
    }, 5 * 60 * 1000);
  },

  setupHeaderBell() {
    const navActions = document.querySelector(".nav-actions");
    if (!navActions) return;

    let bellBtn = document.getElementById("btn-notifications");
    if (!bellBtn) {
      bellBtn = document.createElement("button");
      bellBtn.id = "btn-notifications";
      bellBtn.className = "btn-theme-icon btn-notification-bell";
      bellBtn.type = "button";
      bellBtn.title = "Notificaciones";
      bellBtn.setAttribute("aria-label", "Notificaciones");
      bellBtn.innerHTML = `
        <i class="ph-bold ph-bell"></i>
        <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
      `;

      // Insertar antes del botón de cambio de tema
      const themeBtn = document.getElementById("btn-theme");
      if (themeBtn) {
        navActions.insertBefore(bellBtn, themeBtn);
      } else {
        navActions.prepend(bellBtn);
      }

      bellBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.togglePanel();
      });
    }

    // Cerrar panel al hacer click fuera
    document.addEventListener("click", (e) => {
      if (this.isPanelOpen && !e.target.closest("#notification-panel") && !e.target.closest("#btn-notifications")) {
        this.closePanel();
      }
    });
  },

  async refresh() {
    try {
      this.notifications = await notificationService.checkAll();
      this.updateBadge();
      this.renderBannerIfEligible();
      if (this.isPanelOpen) {
        this.renderPanelContent();
      }
    } catch (e) {
      console.warn("Error refreshing notifications:", e);
    }
  },

  updateBadge() {
    const badge = document.getElementById("notification-badge");
    const bellBtn = document.getElementById("btn-notifications");
    if (!badge || !bellBtn) return;

    const count = this.notifications.length;
    if (count > 0) {
      badge.textContent = count > 9 ? "9+" : count;
      badge.style.display = "inline-flex";
      bellBtn.classList.add("has-unread");
    } else {
      badge.style.display = "none";
      bellBtn.classList.remove("has-unread");
    }
  },

  // Banner llamativo pero no invasivo en Inicio (solo si hay alertas prioritarias)
  renderBannerIfEligible() {
    const existing = document.getElementById("luka-inapp-alert-banner");
    
    // Solo mostrar el banner si hay al menos una notificación de tipo warning o danger
    const priorityItem = this.notifications.find(n => n.severity === "danger") || this.notifications[0];
    if (!priorityItem) {
      if (existing) existing.remove();
      return;
    }

    // Insertar en la vista de Inicio si el usuario está ahí
    const targetParent = document.querySelector(".dashboard-module") || document.getElementById("app");
    if (!targetParent) return;

    if (!existing) {
      const banner = document.createElement("div");
      banner.id = "luka-inapp-alert-banner";
      banner.className = `luka-alert-banner alert-${priorityItem.severity}`;
      this.populateBanner(banner, priorityItem);
      targetParent.prepend(banner);
    } else {
      existing.className = `luka-alert-banner alert-${priorityItem.severity}`;
      this.populateBanner(existing, priorityItem);
    }
  },

  populateBanner(el, item) {
    el.innerHTML = `
      <div class="alert-banner-icon">
        <i class="${escapeHtml(item.icon)}"></i>
      </div>
      <div class="alert-banner-body">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.message)}</p>
      </div>
      <div class="alert-banner-actions">
        ${item.actionTab ? `
          <button type="button" class="btn btn-sm btn-alert-action" data-tab="${escapeHtml(item.actionTab)}">
            ${escapeHtml(item.actionLabel || "Ver")}
          </button>
        ` : ""}
        <button type="button" class="btn-alert-dismiss" title="Descartar por hoy" aria-label="Descartar">
          <i class="ph-bold ph-x"></i>
        </button>
      </div>
    `;

    const actionBtn = el.querySelector(".btn-alert-action");
    if (actionBtn) {
      actionBtn.addEventListener("click", () => {
        if (this.onNavigateTab && item.actionTab) {
          this.onNavigateTab(item.actionTab);
        }
      });
    }

    const dismissBtn = el.querySelector(".btn-alert-dismiss");
    if (dismissBtn) {
      dismissBtn.addEventListener("click", () => {
        notificationService.dismiss(item.id);
        el.style.opacity = "0";
        el.style.transform = "translateY(-6px)";
        setTimeout(() => {
          el.remove();
          this.refresh();
        }, 200);
      });
    }
  },

  togglePanel() {
    if (this.isPanelOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  },

  openPanel() {
    this.isPanelOpen = true;
    let panel = document.getElementById("notification-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "notification-panel";
      panel.className = "notification-panel";
      document.body.appendChild(panel);
    }

    this.renderPanelContent();
    panel.classList.add("is-open");
  },

  closePanel() {
    this.isPanelOpen = false;
    const panel = document.getElementById("notification-panel");
    if (panel) {
      panel.classList.remove("is-open");
    }
  },

  renderPanelContent() {
    const panel = document.getElementById("notification-panel");
    if (!panel) return;

    const items = this.notifications;
    const settings = notificationService.getSettings();
    const canPush = "Notification" in window && Notification.permission !== "denied";

    panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-header-title">
          <i class="ph-bold ph-bell-ringing"></i>
          <h4>Avisos y Recordatorios</h4>
        </div>
        <button type="button" class="panel-close-btn" id="btn-close-notif-panel">&times;</button>
      </div>

      <div class="panel-body">
        ${items.length === 0 ? `
          <div class="panel-empty-state">
            <div class="empty-icon-capsule">
              <i class="ph-bold ph-check-circle"></i>
            </div>
            <strong>¡Todo al día!</strong>
            <p>No tienes pagos pendientes de vencer ni presupuestos en alerta.</p>
          </div>
        ` : `
          <div class="notification-items-list">
            ${items.map(item => `
              <div class="notif-card notif-${escapeHtml(item.severity)}" data-id="${escapeHtml(item.id)}">
                <div class="notif-card-icon">
                  <i class="${escapeHtml(item.icon)}"></i>
                </div>
                <div class="notif-card-content">
                  <div class="notif-card-title">${escapeHtml(item.title)}</div>
                  <div class="notif-card-text">${escapeHtml(item.message)}</div>
                  ${item.actionTab ? `
                    <button type="button" class="notif-card-btn" data-tab="${escapeHtml(item.actionTab)}">
                      ${escapeHtml(item.actionLabel || "Ir ahora")} <i class="ph-bold ph-arrow-right"></i>
                    </button>
                  ` : ""}
                </div>
                <button type="button" class="notif-item-dismiss" data-id="${escapeHtml(item.id)}" title="Descartar por hoy">
                  <i class="ph-bold ph-x"></i>
                </button>
              </div>
            `).join("")}
          </div>
        `}
      </div>

      <div class="panel-footer">
        ${canPush && Notification.permission !== "granted" ? `
          <div class="panel-push-optin">
            <span>¿Recibir avisos en el celular?</span>
            <button type="button" id="btn-enable-push" class="btn btn-sm btn-secondary">Activar</button>
          </div>
        ` : ""}
        <div class="panel-footer-note">
          <i class="ph-bold ph-shield-check"></i> Avisos inteligentes calculados en tu dispositivo
        </div>
      </div>
    `;

    // Botón cerrar
    panel.querySelector("#btn-close-notif-panel")?.addEventListener("click", () => this.closePanel());

    // Botones de acción hacia pestañas
    panel.querySelectorAll(".notif-card-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        this.closePanel();
        if (this.onNavigateTab && tab) {
          this.onNavigateTab(tab);
        }
      });
    });

    // Botones descartar individual
    panel.querySelectorAll(".notif-item-dismiss").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        notificationService.dismiss(id);
        const card = btn.closest(".notif-card");
        if (card) {
          card.style.opacity = "0";
          card.style.transform = "translateX(20px)";
          setTimeout(() => {
            this.refresh();
          }, 200);
        }
      });
    });

    // Activar push web
    panel.querySelector("#btn-enable-push")?.addEventListener("click", async () => {
      const granted = await notificationService.requestPushPermission();
      if (granted) {
        this.refresh();
      }
    });
  },

  // Modal grande al entrar a la app para solicitar permiso de notificaciones
  checkPermissionModal() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    if (document.getElementById("notif-permission-modal")) return;

    // Se muestra si aún está en default o no concedido
    // Para no ser invasivo en el mismo instante, usamos un flag de sesión
    const alreadyShownSession = sessionStorage.getItem("luka_notif_modal_shown");
    if (alreadyShownSession) return;
    sessionStorage.setItem("luka_notif_modal_shown", "1");

    setTimeout(() => {
      this.showPermissionModal();
    }, 600);
  },

  showPermissionModal() {
    if (document.getElementById("notif-permission-modal")) return;

    const modal = document.createElement("div");
    modal.id = "notif-permission-modal";
    modal.className = "notif-permission-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    modal.innerHTML = `
      <div class="notif-permission-card">
        <div class="notif-modal-glow"></div>
        <div class="notif-modal-icon-wrap">
          <div class="notif-modal-icon-pulse"></div>
          <i class="ph-duotone ph-bell-ringing"></i>
        </div>
        
        <h3 class="notif-modal-title">Activa las notificaciones</h3>
        <p class="notif-modal-desc">
          Entérate al instante de suscripciones por vencer, cuotas de tarjetas, préstamos pendientes y límites de presupuesto para que nada se te pase.
        </p>

        <div class="notif-modal-features">
          <div class="notif-feature-row">
            <i class="ph-bold ph-calendar-check"></i>
            <span>Vencimiento de suscripciones y servicios</span>
          </div>
          <div class="notif-feature-row">
            <i class="ph-bold ph-credit-card"></i>
            <span>Fechas de corte y pago de tarjetas</span>
          </div>
          <div class="notif-feature-row">
            <i class="ph-bold ph-chart-pie-slice"></i>
            <span>Alertas de presupuesto al 80% o excedido</span>
          </div>
        </div>

        <div class="notif-modal-actions">
          <button type="button" class="btn btn-primary btn-block notif-btn-allow" id="btn-allow-notif">
            <i class="ph-bold ph-bell"></i> Permitir notificaciones
          </button>
          <button type="button" class="btn-link notif-btn-later" id="btn-later-notif">
            Ahora no
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Animación de entrada
    requestAnimationFrame(() => {
      modal.classList.add("is-visible");
    });

    const close = () => {
      modal.classList.remove("is-visible");
      setTimeout(() => modal.remove(), 280);
    };

    modal.querySelector("#btn-allow-notif")?.addEventListener("click", async () => {
      try {
        const granted = await notificationService.requestPushPermission();
        if (granted) {
          this.refresh();
        }
      } finally {
        close();
      }
    });

    modal.querySelector("#btn-later-notif")?.addEventListener("click", () => {
      close();
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
  }
};
