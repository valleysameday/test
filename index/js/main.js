import { getFirebase } from '/index/js/firebase/init.js';
import { initUIRouter } from '/index/js/ui-router.js';
import '/index/js/post-gate.js';

let auth, db, storage;

/* ---------------- SPA VIEW LOADER ---------------- */
export async function loadView(view) {
  const app = document.getElementById("app");

  // Load HTML fragment
  const html = await fetch(`/views/${view}.html`).then(r => r.text());
  app.innerHTML = html;

  // ✅ Attach search listener ONLY on home view
  if (view === "home") {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", e => {
        window.currentSearch = e.target.value;
        initFeed(); // reload feed with search applied
      });
    }
  }

  // ✅ Force re-run of view JS every time
  import(`/views/${view}.js?cache=${Date.now()}`)
    .catch(err => console.error("View JS error:", err));
}

// ✅ Make loadView available globally
window.loadView = loadView;

/* ---------------- INITIALISE APP ---------------- */
getFirebase().then(fb => {
  auth = fb.auth;
  db = fb.db;
  storage = fb.storage;

  console.log("✅ Firebase ready in main.js");

  const start = () => {
    initUIRouter();      // ✅ global modals + action bar
    loadView("home");    // ✅ load homepage view
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
});

/* ---------------- GLOBAL NAVIGATION HOOKS ---------------- */

// ✅ Load correct dashboard based on account type
window.navigateToDashboard = function () {
  if (!window.currentUser) {
    openScreen("login");
    return;
  }

  if (window.firebaseUserDoc?.isBusiness) {
    loadView("business-dashboard");
  } else {
    loadView("customer-dashboard");
  }
};

// ✅ Proper SPA home navigation (used after logout)
window.navigateToHome = function () {
  loadView("home").then(() => {
    // ✅ Re-run homepage logic
    import(`/views/home.js?cache=${Date.now()}`).then(() => {
      initUIRouter();        // ✅ rebind modals + action bar
      window.closeScreens?.();
    });
  });
};
