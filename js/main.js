// js/main.js — punto de entrada de la SPA
import { authService } from "./services/authService.js";
import { authView } from "./views/authView.js";
import { walletsView } from "./views/walletsView.js";
import { dashboardView } from "./views/dashboardView.js";
import { creditCardsView } from "./views/creditCardsView.js";
import { subscriptionsView } from "./views/subscriptionsView.js";
import { savingsView } from "./views/savingsView.js";
import { analyticsView } from "./views/analyticsView.js";
import { budgetsView } from "./views/budgetsView.js";
import { tutorialTour } from "./components/tutorialTour.js";
import { themeManager } from "./themeManager.js";

const navTabs = document.getElementById("nav-tabs");
const userMenu = document.getElementById("user-menu");
const userName = document.getElementById("user-name");
const logoutBtn = document.getElementById("btn-logout");
const tutorialBtn = document.getElementById("btn-start-tutorial");
const themeBtn = document.getElementById("btn-theme");

// Tab -> vista que la renderiza
const VIEWS = {
  dashboard: dashboardView,
  wallets: walletsView,
  budgets: budgetsView,
  cards: creditCardsView,
  subs: subscriptionsView,
  savings: savingsView,
  analytics: analyticsView
};

let currentTab = "dashboard";

themeManager.init(themeBtn);

function switchView(tab) {
  const view = VIEWS[tab];
  if (!view) return;
  currentTab = tab;

  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  view.render("app");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Muestra u oculta la interfaz de usuario autenticado
function setLoggedInUi(isLoggedIn) {
  const display = isLoggedIn ? "flex" : "none";
  userMenu.style.display = display;
  navTabs.style.display = display;
  tutorialBtn.style.display = display;
}

function showAuth() {
  setLoggedInUi(false);
  authView.render("app", () => initApp());
}

document.addEventListener("click", (e) => {
  const navBtn = e.target.closest("[data-tab]");
  if (navBtn) switchView(navBtn.dataset.tab);
});

async function initApp() {
  try {
    const user = await authService.getCurrentUser();
    if (!user) {
      showAuth();
      return;
    }

    setLoggedInUi(true);
    if (userName) userName.textContent = user.user_metadata?.full_name || user.email;

    switchView(currentTab);

    tutorialTour.init({
      userId: user.id,
      onSwitchTab: (tab) => switchView(tab)
    });
  } catch {
    showAuth();
  }
}

initApp();

authService.onAuthStateChanged((user) => {
  if (!user) showAuth();
});

logoutBtn.addEventListener("click", async () => {
  await authService.signOut();
  initApp();
});

tutorialBtn.addEventListener("click", () => {
  tutorialTour.start();
});
