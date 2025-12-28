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

  // Load HTML
  try {
    const res = await fetch(`/views/${view}.html`);
    if (!res.ok) throw new Error("View not found");
    app.innerHTML = await res.text();
  } catch (err) {
    console.error(`❌ Failed to load view: ${view}`, err);
    app.innerHTML = `<p>View not found: ${view}</p>`;
    return;
  }

  // Load JS module
  const mod = await ensureViewScript(view);
  if (typeof mod.init === "function") mod.init();
}

window.loadView = loadView;

/* ==========================
   APP START
========================== */
function startApp() {
  initUI();           // Initialize modals & UI
  loadView("home");   // Load homepage by default
}

getFirebase().then(() => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp, { once: true });
  } else {
    startApp();
  }
});

/* ==========================
   DASHBOARD NAVIGATION
========================== */
window.navigateToDashboard = () => {
  if (!window.currentUser) {
    // If not logged in, fallback to home
    window.loadView("home");
    return;
  }

  // Decide which dashboard to load
  const view = window.firebaseUserDoc?.isBusiness
    ? "business-dashboard"
    : "customer-dashboard";

  window.loadView(view);
};
