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
window.navigateToDashboard = (forcedType = null) => {
  if (!window.currentUser) {
    window.loadView("home");
    return;
  }

  const type = forcedType || window.currentAccountType;

  if (type === "business") {
    window.loadView("business-dashboard");
  } else {
    window.loadView("customer-dashboard");
  }
};
