import { getFirebase } from '/index/js/firebase/init.js';
import { initUIRouter } from '/index/js/ui-router.js';
import '/index/js/post-gate.js';

let auth, db, storage;

/* =====================================================
   VIEW SCRIPT CACHE (prevents re-importing)
===================================================== */
const loadedViews = new Set();

async function loadViewScript(view) {
  if (loadedViews.has(view)) return;
  loadedViews.add(view);
  await import(`/views/${view}.js`);
}

/* =====================================================
   SPA VIEW LOADER
===================================================== */
export async function loadView(view) {
  const app = document.getElementById('app');
  if (!app) return;

  /* Load HTML fragment */
  const res = await fetch(`/views/${view}.html`);
  app.innerHTML = await res.text();

  /* Home-only search (debounced) */
  if (view === 'home') {
    const searchInput = document.getElementById('searchInput');
    if (searchInput && !searchInput.dataset.bound) {
      let searchTimer;

      searchInput.addEventListener('input', e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          window.currentSearch = e.target.value;
          window.initFeed?.();
        }, 300);
      });

      searchInput.dataset.bound = 'true';
    }
  }

  /* Load view JS ONCE */
  loadViewScript(view).catch(err =>
    console.error(`View JS error (${view}):`, err)
  );
}

/* Expose SPA loader globally */
window.loadView = loadView;

/* =====================================================
   APP INITIALISATION
===================================================== */
function startApp() {
  initUIRouter();     // guarded internally
  loadView('home');
}

getFirebase().then(fb => {
  auth = fb.auth;
  db = fb.db;
  storage = fb.storage;

  if (location.hostname === 'localhost') {
    console.log('✅ Firebase ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp, { once: true });
  } else {
    startApp();
  }
});

/* =====================================================
   GLOBAL NAVIGATION HELPERS
===================================================== */
window.navigateToDashboard = () => {
  if (!window.currentUser) {
    window.openScreen?.('login');
    return;
  }

  loadView(
    window.firebaseUserDoc?.isBusiness
      ? 'business-dashboard'
      : 'customer-dashboard'
  );
};

window.navigateToHome = () => {
  window.closeScreens?.();
  loadView('home');
};
