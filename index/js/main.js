import { getFirebase } from '/index/js/firebase/init.js';
import { initUIRouter } from '/index/js/ui-router.js';
import '/index/js/post-gate.js';

/* =====================================================
   VIEW SCRIPT REGISTRY
===================================================== */
const viewModules = {};

/* =====================================================
   LOAD VIEW SCRIPT ONCE
===================================================== */
async function ensureViewScript(view) {
  if (viewModules[view]) return viewModules[view];

  const mod = await import(`/views/${view}.js`);
  viewModules[view] = mod;
  return mod;
}

/* =====================================================
   SPA VIEW LOADER
===================================================== */
export async function loadView(view) {
  const app = document.getElementById('app');
  if (!app) return;

  // Load HTML
  const res = await fetch(`/views/${view}.html`);
  app.innerHTML = await res.text();

  // Load JS module (once)
  const mod = await ensureViewScript(view);

  // 🔑 Run init EVERY time DOM is injected
  if (typeof mod.init === 'function') {
    mod.init();
  }
}

window.loadView = loadView;

/* =====================================================
   APP START
===================================================== */
function startApp() {
  initUIRouter();
  loadView('home');
}

getFirebase().then(() => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp, { once: true });
  } else {
    startApp();
  }
});

/* =====================================================
   GLOBAL NAV
===================================================== */
window.navigateToHome = () => {
  window.closeScreens?.();
  loadView('home');
};
