// /index/js/main.js

import { getFirebase } from "/index/js/firebase/init.js";
import { initUI } from "/index/js/ui.js";

/* ==========================
   SPA VIEW LOADER
========================== */
const viewModules = {};
let currentView = null;

/* ==========================
   PWA INSTALL PROMPT
========================== */
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const btn = document.getElementById("install-btn");
  if (btn) btn.style.display = "block";
});

/* ==========================
   LOAD VIEW MODULES
========================== */
async function ensureViewScript(view) {
  if (viewModules[view]) return viewModules[view];
  const mod = await import(`/views/${view}.js`);
  viewModules[view] = mod;
  return mod;
}

export async function loadView(view, addToHistory = true) {
  const app = document.getElementById("app");
  if (!app) return;

  if (addToHistory && currentView !== view) {
    history.pushState({ view }, "", `#${view}`);
  }

  currentView = view;

  try {
    const res = await fetch(`/views/${view}.html`);
    if (!res.ok) throw new Error("View not found");
    app.innerHTML = await res.text();
  } catch (err) {
    console.error(`❌ Failed to load view: ${view}`, err);
    app.innerHTML = `<p>View not found: ${view}</p>`;
    return;
  }

  const mod = await ensureViewScript(view);
  if (typeof mod.init === "function") mod.init();
}

window.loadView = loadView;

/* ==========================
   BROWSER BACK BUTTON
========================== */
window.addEventListener("popstate", (e) => {
  const view = e.state?.view || "home";
  loadView(view, false);
});

/* ==========================
   APP START
========================== */
function startApp() {
  initUI();

  const initialView = location.hash.replace("#", "") || "home";
  loadView(initialView, false);

  // Hide loading screen
  const loader = document.getElementById("loading-screen");
  if (loader) loader.style.display = "none";

  // Install button click handler
  const installBtn = document.getElementById("install-btn");
  if (installBtn) {
    installBtn.addEventListener("click", () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();

      deferredPrompt.userChoice.then((choiceResult) => {
        console.log(
          choiceResult.outcome === "accepted"
            ? "User accepted the install prompt"
            : "User dismissed the install prompt"
        );
        deferredPrompt = null;
      });
    });
  }
}

getFirebase().then(() => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp, { once: true });
  } else {
    startApp();
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
