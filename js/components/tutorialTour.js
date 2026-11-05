// js/components/tutorialTour.js

export const tutorialTour = {
  currentStep: 0,
  userId: null,
  onSwitchTab: null,
  shownTab: null,

  steps: [
    {
      tab: "dashboard",
      icon: "fa-bolt",
      color: "#2563EB",
      badge: "Bienvenida",
      title: "Te damos la bienvenida a LUKA",
      description: "Registra tus movimientos en un toque, controla tus presupuestos, proyecta el extracto de tus tarjetas y organiza todo tu dinero en un solo lugar."
    },
    {
      tab: "dashboard",
      icon: "fa-house",
      color: "#2563EB",
      badge: "Pestaña 1",
      title: "Inicio • Tu Centro de Control",
      description: "• <strong>Métricas del Mes:</strong> Tus Ingresos, Gastos y Balance neto en tiempo real.<br>• <strong>Registro Rápido:</strong> Elige con qué cuenta pagas, escribe el valor (con puntos de miles automáticos) y toca una categoría para guardarlo en 1 clic.<br>• <strong>Movimientos Recientes:</strong> Consulta tus últimos 5 registros o despliégalos todos."
    },
    {
      tab: "wallets",
      icon: "fa-wallet",
      color: "#D97706",
      badge: "Pestaña 2",
      title: "Billeteras • Tus Cuentas",
      description: "• <strong>Cuentas Bancarias y Efectivo:</strong> Crea y gestiona tus cuentas (<em>Nequi, Bancolombia, Nu, Efectivo</em>) con su icono y color.<br>• <strong>Transferencias:</strong> Traspasa saldo entre tus cuentas sin alterar tus gastos ni ingresos del mes.<br>• <strong>Categorías:</strong> Crea categorías y fija tus 4 favoritas para el registro en 1 clic."
    },
    {
      tab: "budgets",
      icon: "fa-bullseye",
      color: "#EA580C",
      badge: "Pestaña 3",
      title: "Presupuesto • Límites por Categoría",
      description: "• <strong>Límite Mensual:</strong> Asigna un tope de gasto a cada categoría (alimentación, transporte, ocio...) con el botón <em>Asignar Presupuesto</em>.<br>• <strong>Avance Real:</strong> Se cruza con tus gastos del mes y te muestra lo gastado, lo disponible y el porcentaje consumido. El resumen global cambia de color al pasar del 80 % y del 100 %, y cada categoría se marca en rojo cuando se excede.<br>• <strong>Detalle:</strong> Toca una tarjeta para ver los gastos de esa categoría, modificar su límite o eliminarlo.<br>• <strong>Otros Meses:</strong> Usa las flechas para revisar cómo te fue en meses anteriores."
    },
    {
      tab: "cards",
      icon: "fa-credit-card",
      color: "#8B5CF6",
      badge: "Pestaña 4",
      title: "Crédito • Tarjetas y Préstamos",
      description: "• <strong>Dos secciones:</strong> arriba eliges <em>Tarjetas</em> (tu tarjeta de crédito de siempre) o <em>Préstamos</em> (apps como Addi, bancos o deudas con amigos).<br>• <strong>Tarjetas:</strong> cupo total y disponible, compras a cuotas con tu tasa % E.A., avances en efectivo y pago del extracto para liberar cupo.<br>• <strong>Préstamos:</strong> anota quién te prestó y cuánto; con cuotas fijas (y su interés) o con pago libre. Verás el saldo pendiente, el avance y la próxima fecha de pago.<br>• <strong>Registrar pago:</strong> elige la cuenta de la que sale el dinero; queda como gasto y baja tu deuda."
    },
    {
      tab: "subs",
      icon: "fa-calendar-days",
      color: "#DB2777",
      badge: "Pestaña 5",
      title: "Suscripciones • Pagos Fijos",
      description: "• <strong>Control de Gastos Fijos:</strong> Agenda tus pagos recurrentes (telefonía, arriendo, streaming, servicios).<br>• <strong>Marcar como Pagada:</strong> Al pagarlas, se descuentan de tu cuenta y se suman a tus gastos del mes."
    },
    {
      tab: "savings",
      icon: "fa-piggy-bank",
      color: "#059669",
      badge: "Pestaña 6",
      title: "Ahorros • Metas y Cajitas",
      description: "• <strong>Fondos y Alcancías:</strong> Organiza tu ahorro por objetivos con barras de progreso.<br>• <strong>Rendimiento:</strong> Si tu cajita paga intereses, indica la tasa E.A. y el dinero crecerá cada día.<br>• <strong>Aportes y Retiros:</strong> Al sumar dinero a una cajita se descuenta de tu cuenta y se registra como ahorro en tus gastos del mes; al retirar, vuelve a tu cuenta como ingreso."
    },
    {
      tab: "analytics",
      icon: "fa-chart-pie",
      color: "#0D9488",
      badge: "Pestaña 7",
      title: "Análisis • Estadísticas",
      description: "• <strong>Desglose Mensual:</strong> Alterna entre tus gastos e ingresos del mes con barras proporcionales y alertas de tus mayores movimientos.<br>• <strong>Ritmo de Gasto:</strong> Compara cuánto llevas gastado con el mismo día del mes anterior.<br>• <strong>Modo Anual:</strong> Visualiza en un gráfico comparativo tus ingresos versus gastos mes a mes."
    },
    {
      tab: "dashboard",
      icon: "fa-rocket",
      color: "#2563EB",
      badge: "¡Todo Listo!",
      title: "Empieza a usar LUKA",
      description: "Ya conoces todas las herramientas. Empieza registrando tus movimientos diarios.<br><br>Con el botón de luna o sol del encabezado cambias entre el tema claro y el oscuro. Si quieres repasar esta guía, presiona el botón <strong><i class=\"fa-solid fa-lightbulb\"></i> Tutorial</strong> en la esquina inferior derecha."
    }
  ],

  init({ userId, onSwitchTab }) {
    this.userId = userId;
    this.onSwitchTab = onSwitchTab;

    if (!this.wasSeen()) {
      setTimeout(() => this.start(), 600);
    }
  },

  // El almacenamiento puede no estar disponible (modo privado): en ese caso la guía se muestra cada vez
  wasSeen() {
    try {
      return Boolean(localStorage.getItem(`luka_tour_seen_${this.userId}`));
    } catch {
      return false;
    }
  },

  markSeen() {
    if (!this.userId) return;
    try {
      localStorage.setItem(`luka_tour_seen_${this.userId}`, "true");
    } catch {
      // sin almacenamiento: no se puede recordar que ya se vio
    }
  },

  start() {
    this.currentStep = 0;
    this.shownTab = null;
    this.render();
  },

  // Solo se cambia de pestaña cuando el paso la necesita (cada cambio vuelve a consultar los datos)
  showTab(tab) {
    if (!this.onSwitchTab || !tab || tab === this.shownTab) return;
    this.shownTab = tab;
    this.onSwitchTab(tab);
  },

  render() {
    this.cleanup();

    const step = this.steps[this.currentStep];
    const totalSteps = this.steps.length;

    this.showTab(step.tab);

    const overlay = document.createElement("div");
    overlay.id = "tour-overlay";
    overlay.className = "tour-backdrop";

    const card = document.createElement("div");
    card.id = "tour-card";
    card.className = "tour-card";

    card.innerHTML = `
      <div class="tour-card-header">
        <span class="tour-badge">${step.badge} • Paso ${this.currentStep + 1} de ${totalSteps}</span>
        <button id="btn-tour-close" class="tour-close-btn" title="Cerrar">&times;</button>
      </div>

      <div class="tour-icon-wrap">
        <div class="tour-icon-box" style="background-color: ${step.color}26; color: ${step.color};">
          <i class="fa-solid ${step.icon}"></i>
        </div>
      </div>

      <h3 class="tour-title">${step.title}</h3>
      <div class="tour-desc">${step.description}</div>

      <div class="tour-dots">
        ${this.steps.map((_, idx) => `
          <span class="tour-dot ${idx === this.currentStep ? "active" : ""}"></span>
        `).join("")}
      </div>

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
    this.showTab("dashboard");
    this.markSeen();
  },

  cleanup() {
    const overlay = document.getElementById("tour-overlay");
    if (overlay) overlay.remove();
  }
};