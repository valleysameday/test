import { getFirebase } from "/index/js/firebase/init.js";
import { initUI } from "/index/js/ui.js";

/* ==========================
   SPA VIEW LOADER
========================== */
const viewModules = {};

async function ensureViewScript(view) {
  if (viewModules[view]) return viewModules[view];
  const mod = await import(`/views/${view}.js`);
  viewModules[view] = mod;
  return mod;
}

export async function loadView(view) {
  const app = document.getElementById("app");
  if (!app) return;

  const res = await fetch(`/views/${view}.html`);
  app.innerHTML = await res.text();

  const mod = await ensureViewScript(view);
  if (typeof mod.init === "function") mod.init();
}

window.loadView = loadView;

/* ==========================
   APP START
========================== */
function startApp() {
  initUI();
  loadView("home");
}

getFirebase().then(() => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp, { once: true });
  } else {
    startApp();
  }
});

/* ==========================
   GLOBAL NAV
========================== */
window.navigateToDashboard = () => {
  if (!window.currentUser) {
    loadView("home");
    return;
  }

  loadView(
    window.firebaseUserDoc?.isBusiness
      ? "business-dashboard"
      : "customer-dashboard"
  );
};
