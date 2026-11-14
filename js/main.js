// js/main.js — punto de entrada de la SPA
import { authService } from "./services/authService.js";
import { authView } from "./views/authView.js";
import { walletsView } from "./views/walletsView.js";
import { dashboardView } from "./views/dashboardView.js";
import { creditView } from "./views/creditView.js";
import { subscriptionsView } from "./views/subscriptionsView.js";
import { savingsView } from "./views/savingsView.js";
import { analyticsView } from "./views/analyticsView.js";
import { budgetsView } from "./views/budgetsView.js";
import { tutorialTour } from "./components/tutorialTour.js";
import { themeManager } from "./themeManager.js";
import { swipeNav } from "./components/swipeNav.js";
import { liquidNav } from "./components/liquidNav.js";
import { installPrompt } from "./components/installPrompt.js";
import { initSplash } from "./components/splash.js";

const app = document.getElementById("app");
const navTabs = document.getElementById("nav-tabs");
const userMenu = document.getElementById("user-menu");
const userName = document.getElementById("user-name");
const logoutBtn = document.getElementById("btn-logout");
const tutorialBtn = document.getElementById("btn-start-tutorial");
const themeBtn = document.getElementById("btn-theme");

const VIEWS = {
  dashboard: dashboardView,
  wallets: walletsView,
  budgets: budgetsView,
  cards: creditView,
  subs: subscriptionsView,
  savings: savingsView,
  analytics: analyticsView
};

let currentTab = "dashboard";
let activeUserId = null;
let initPromise = null;

initSplash();
themeManager.init(themeBtn);
liquidNav.init(navTabs);
installPrompt.init();

// Los modales brotan desde el punto donde se tocó (css/glass.css define la animación)
let lastPointer = null;
document.addEventListener("pointerdown", (e) => {
  lastPointer = { x: e.clientX, y: e.clientY, time: Date.now() };
}, { capture: true, passive: true });

new MutationObserver((mutations) => {
  if (!lastPointer || Date.now() - lastPointer.time > 1500) return;
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      const panel = node.nodeType === 1 && node.classList.contains("modal-backdrop") && node.querySelector(".modal-content");
      if (!panel) continue;
      const box = panel.getBoundingClientRect();
      const x = Math.max(0, Math.min(box.width, lastPointer.x - box.left));
      const y = Math.max(0, Math.min(box.height, lastPointer.y - box.top));
      panel.style.transformOrigin = `${x}px ${y}px`;
    }
  }
}).observe(document.body, { childList: true });

// Cada pantalla se pinta en su propio contenedor. Si el usuario cambia de pestaña
// mientras otra sigue cargando, esa respuesta tardía escribe en un contenedor que
// ya salió del DOM y no pisa la pestaña actual.
function mountHost() {
  const host = document.createElement("div");
  app.replaceChildren(host);
  return host;
}

function switchView(tab) {
  const view = VIEWS[tab];
  if (!view) return;
  // Dirección del cambio: las pantallas entran desde el lado hacia el que se avanza
  const order = Object.keys(VIEWS);
  const step = order.indexOf(tab) - order.indexOf(currentTab);
  app.dataset.dir = step > 0 ? "next" : step < 0 ? "prev" : "";
  currentTab = tab;

  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  liquidNav.update();
  // En móvil la barra se desplaza: el botón activo debe quedar a la vista al cambiar deslizando
  navTabs.querySelector(".active")?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });

  view.render(mountHost());
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetViews() {
  Object.values(VIEWS).forEach(view => view.resetState?.());
}

function setLoggedInUi(isLoggedIn) {
  const display = isLoggedIn ? "flex" : "none";
  userMenu.style.display = display;
  navTabs.style.display = display;
  tutorialBtn.style.display = display;
}

function showAuth() {
  activeUserId = null;
  currentTab = "dashboard";
  resetViews();
  setLoggedInUi(false);
  authView.render(mountHost(), () => initApp());
}

document.addEventListener("click", (e) => {
  const navBtn = e.target.closest("[data-tab]");
  if (navBtn) switchView(navBtn.dataset.tab);
});

async function bootstrap() {
  try {
    const user = await authService.getCurrentUser();
    if (!user) {
      showAuth();
      return;
    }

    // Esta sesión ya está en pantalla (por ejemplo, el evento de login llegó junto con el callback del formulario)
    if (user.id === activeUserId) return;

    // Otro usuario en el mismo navegador no hereda filtros, pestaña ni selecciones del anterior
    resetViews();
    currentTab = "dashboard";
    activeUserId = user.id;

    setLoggedInUi(true);
    userName.textContent = user.user_metadata?.full_name || user.email;

    switchView(currentTab);

    tutorialTour.init({
      userId: user.id,
      onSwitchTab: (tab) => switchView(tab)
    });
  } catch {
    showAuth();
  }
}

// Evita arrancar dos veces a la vez
function initApp() {
  if (!initPromise) {
    initPromise = bootstrap().finally(() => { initPromise = null; });
  }
  return initPromise;
}

initApp();

// Deslizar el dedo entre pestañas (solo con sesión iniciada)
swipeNav.init({
  getTabs: () => Object.keys(VIEWS),
  getCurrent: () => currentTab,
  onChange: switchView,
  isEnabled: () => activeUserId !== null
});

// La sesión de Supabase se comparte entre pestañas del navegador: si en otra pestaña se cierra
// la sesión o entra otro usuario, esta pestaña debe reflejarlo y no seguir mostrando datos del anterior.
authService.onAuthStateChanged((user) => {
  if (!user) {
    if (activeUserId !== null) showAuth();
  } else if (user.id !== activeUserId) {
    // Fuera del callback: supabase-js no admite llamadas a su API dentro de este listener
    setTimeout(initApp, 0);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await authService.signOut();
  } finally {
    showAuth();
  }
});

tutorialBtn.addEventListener("click", () => {
  tutorialTour.start();
});
