// js/components/tutorialTour.js

export const tutorialTour = {
  currentStep: 0,
  userId: null,
  onSwitchTab: null,

  steps: [
    {
      tab: "dashboard",
      icon: "fa-bolt",
      color: "#2563EB",
      bg: "#EFF6FF",
      badge: "Bienvenida",
      title: "¡Te damos la bienvenida a LUKA! ⚡",
      description: "Tu asistente financiero inteligente. Diseñado para registrar movimientos en 1 clic, proyectar extractos de tarjetas y organizar todo tu dinero sin complicaciones."
    },
    {
      tab: "dashboard",
      icon: "fa-house",
      color: "#2563EB",
      bg: "#EFF6FF",
      badge: "Pestaña 1",
      title: "Inicio • Tu Centro de Control",
      description: "• <strong>Métricas del Mes:</strong> Tus Ingresos, Gastos y Balance neto en tiempo real.<br>• <strong>Registro Rápido:</strong> Elige con qué cuenta pagas, escribe el valor (con puntos de miles automáticos) y toca una categoría para guardarlo en 1 clic con animación.<br>• <strong>Movimientos Recientes:</strong> Consulta tus últimos 5 registros o despliégalos todos."
    },
    {
      tab: "wallets",
      icon: "fa-wallet",
      color: "#D97706",
      bg: "#FEF3C7",
      badge: "Pestaña 2",
      title: "Billeteras • Tus Cuentas",
      description: "• <strong>Cuentas Bancarias y Efectivo:</strong> Crea y gestiona tus cuentas (<em>Nequi, Bancolombia, Nu, Efectivo</em>) con su icono y color.<br>• <strong>Transferencias:</strong> Traspasa saldo entre tus cuentas sin alterar tus gastos ni ingresos del mes.<br>• <strong>Categorías:</strong> Crea categorías y fija tus 4 favoritas para el registro en 1 clic."
    },
    {
      tab: "cards",
      icon: "fa-credit-card",
      color: "#8B5CF6",
      bg: "#F3E8FF",
      badge: "Pestaña 3",
      title: "Tarjetas • Líneas de Crédito",
      description: "• <strong>Cupo Total y Disponible:</strong> Monitorea cuánto cupo te queda y tus deudas activas.<br>• <strong>Compras a Cuotas:</strong> Simulación de intereses mensuales con tu tasa % E.A.<br>• <strong>Avances en Efectivo:</strong> Retira cupo hacia tus cuentas de débito.<br>• <strong>Pagar Tarjeta:</strong> Abona a tu extracto y libera cupo automáticamente."
    },
    {
      tab: "subs",
      icon: "fa-calendar-days",
      color: "#DB2777",
      bg: "#FCE7F3",
      badge: "Pestaña 4",
      title: "Suscripciones • Pagos Fijos",
      description: "• <strong>Control de Gastos Fijos:</strong> Agenda tus pagos recurrentes (telefonía, arriendo, streaming, servicios).<br>• <strong>Marcar como Pagada:</strong> Al pagarlas, se descuentan de tu cuenta y se suman a tus gastos del mes."
    },
    {
      tab: "savings",
      icon: "fa-piggy-bank",
      color: "#059669",
      bg: "#D1FAE5",
      badge: "Pestaña 5",
      title: "Ahorros • Metas y Cajitas",
      description: "• <strong>Fondos y Alcancías:</strong> Organiza tu ahorro por objetivos con barras de progreso.<br>• <strong>Aporte Automático:</strong> Al sumar dinero a una cajita, se descuenta de tu cuenta bancaria y se registra como ahorro en tus gastos del mes."
    },
    {
      tab: "analytics",
      icon: "fa-chart-pie",
      color: "#0D9488",
      bg: "#CCFBF1",
      badge: "Pestaña 6",
      title: "Análisis • Estadísticas",
      description: "• <strong>Desglose Mensual:</strong> Alterna entre tus gastos e ingresos del mes con barras proporcionales y alertas de tus mayores movimientos.<br>• <strong>Modo Anual:</strong> Visualiza en un gráfico comparativo tus ingresos versus gastos mes a mes."
    },
    {
      tab: "dashboard",
      icon: "fa-rocket",
      color: "#2563EB",
      bg: "#EFF6FF",
      badge: "¡Todo Listo!",
      title: "¡Empieza a usar LUKA!",
      description: "Ya conoces todas las herramientas. Empieza registrando tus movimientos diarios.<br><br>Si alguna vez quieres volver a repasar esta guía, solo presiona el botón <strong>💡 Tutorial</strong> en la esquina inferior derecha."
    }
  ],

  init({ userId, onSwitchTab }) {
    this.userId = userId;
    this.onSwitchTab = onSwitchTab;

    const key = `luka_tour_seen_${userId}`;
    const alreadySeen = localStorage.getItem(key);

    if (!alreadySeen) {
      setTimeout(() => {
        this.start();
      }, 600);
    }
  },

  start() {
    this.currentStep = 0;
    this.render();
  },

  render() {
    this.cleanup();

    const step = this.steps[this.currentStep];
    const totalSteps = this.steps.length;

    // Cambiar la vista de fondo automáticamente a la pestaña que se está explicando
    if (this.onSwitchTab && step.tab) {
      this.onSwitchTab(step.tab);
    }

    // 1. Capa suave (nada opaco ni oscuro, sin desenfoque)
    const overlay = document.createElement("div");
    overlay.id = "tour-overlay";
    overlay.className = "tour-backdrop";

    // 2. Tarjeta del tutorial centrada y limpia
    const card = document.createElement("div");
    card.id = "tour-card";
    card.className = "tour-card";

    card.innerHTML = `
      <div class="tour-card-header">
        <span class="tour-badge">${step.badge} • Paso ${this.currentStep + 1} de ${totalSteps}</span>
        <button id="btn-tour-close" class="tour-close-btn" title="Cerrar">&times;</button>
      </div>

      <!-- Icono grande representativo de la pestaña -->
      <div class="tour-icon-wrap">
        <div class="tour-icon-box" style="background-color: ${step.bg}; color: ${step.color};">
          <i class="fa-solid ${step.icon}"></i>
        </div>
      </div>

      <h3 class="tour-title">${step.title}</h3>
      <div class="tour-desc">${step.description}</div>

      <!-- Puntos de progreso -->
      <div class="tour-dots">
        ${this.steps.map((_, idx) => `
          <span class="tour-dot ${idx === this.currentStep ? "active" : ""}"></span>
        `).join("")}
      </div>

      <!-- Botones -->
      <div class="tour-actions">
        ${this.currentStep > 0 ? `
          <button id="btn-tour-prev" class="btn btn-secondary btn-sm">Anterior</button>
        ` : `
          <button id="btn-tour-skip" class="btn btn-ghost btn-sm">Saltar guía</button>
        `}
        <button id="btn-tour-next" class="btn btn-primary btn-sm">
          ${this.currentStep === totalSteps - 1 ? "¡Comenzar a usar LUKA!" : "Siguiente"}
        </button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Eventos
    card.querySelector("#btn-tour-close").addEventListener("click", () => this.complete());
    const skipBtn = card.querySelector("#btn-tour-skip");
    if (skipBtn) skipBtn.addEventListener("click", () => this.complete());

    const prevBtn = card.querySelector("#btn-tour-prev");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (this.currentStep > 0) {
          this.currentStep--;
          this.render();
        }
      });
    }

    card.querySelector("#btn-tour-next").addEventListener("click", () => {
      if (this.currentStep < totalSteps - 1) {
        this.currentStep++;
        this.render();
      } else {
        this.complete();
      }
    });
  },

  complete() {
    this.cleanup();
    if (this.onSwitchTab) {
      this.onSwitchTab("dashboard");
    }
    if (this.userId) {
      localStorage.setItem(`luka_tour_seen_${this.userId}`, "true");
    }
  },

  cleanup() {
    const overlay = document.getElementById("tour-overlay");
    if (overlay) overlay.remove();
  }
};