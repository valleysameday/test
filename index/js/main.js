// /index/js/main.js

import { getFirebase } from "/index/js/firebase/init.js";
import { initUI } from "/index/js/ui.js";

/* ==========================
   SPA VIEW LOADER
========================== */
const viewModules = {};
let currentView = null;

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show your custom install button
  document.getElementById('install-btn').style.display = 'block';
});

async function ensureViewScript(view) {
  if (viewModules[view]) return viewModules[view];
  const mod = await import(`/views/${view}.js`);
  viewModules[view] = mod;
  return mod;
}

export async function loadView(view, addToHistory = true) {
  const app = document.getElementById("app");
  if (!app) return;

  // 🔁 Push browser history (required for mobile back button)
  if (addToHistory && currentView !== view) {
    history.pushState({ view }, "", `#${view}`);
  }

  currentView = view;

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

  // Load JS
  const mod = await ensureViewScript(view);
  if (typeof mod.init === "function") mod.init();
}

// Make available globally
window.loadView = loadView;

/* ==========================
   BROWSER / MOBILE BACK BUTTON
========================== */
window.addEventListener("popstate", (e) => {
  const view = e.state?.view || "home";
  loadView(view, false); // ❗ do NOT add history again
});

/* ==========================
   APP START
========================== */
function startApp() {
  initUI();

  // Load view from URL hash or default to home
  const initialView = location.hash.replace("#", "") || "home";

  loadView(initialView, false);
}

getFirebase().then(() => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp, { once: true });
  } else {
    startApp();
  }
});

window.addEventListener('load', () => {
  document.getElementById('loading-screen').style.display = 'none';
});
document.getElementById('install-btn').addEventListener('click', () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();

    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      deferredPrompt = null;
    });
  }
});
/* ==========================
   HELPERS
========================== */
window.navigateToDashboard = () => {
  if (!window.currentUser) {
    loadView("home");
    return;
  }
  loadView("dashboard");
};
