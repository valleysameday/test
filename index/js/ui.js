// /index/js/ui.js

let uiInit = false;
let loginLoaded = false;
let postGateLoaded = false;

/* ==========================
   LOAD POSTING MODAL (HTML)
========================== */
async function loadPostModal() {
  // Already loaded?
  if (document.getElementById("postModal")) return;

  const container = document.getElementById("modalContainer");
  if (!container) {
    console.error("modalContainer not found in index.html");
    return;
  }

  try {
    const res = await fetch("/posting/postingModal.html");
    const html = await res.text();
    container.insertAdjacentHTML("beforeend", html);
  } catch (err) {
    console.error("Failed to load postingModal.html", err);
  }
}

/* ==========================
   INIT UI
========================== */
export function initUI() {
  if (uiInit) return;
  uiInit = true;

  const routes = {
    post: null, // will be loaded dynamically
    login: document.getElementById("loginModal"),
    signup: document.getElementById("signupModal"),
    forgot: document.getElementById("forgotPasswordModal"),
    resetConfirm: document.getElementById("resetConfirmModal")
  };

  /* ==========================
     OPEN SCREEN
  ========================== */
  async function openScreen(name) {
    closeAll();

    /* ---- POST MODAL (dynamic) ---- */
    if (name === "post") {
      await loadPostModal(); // load HTML first

      routes.post = document.getElementById("postModal");
      if (!routes.post) {
        console.error("postModal failed to load");
        return;
      }

      document.body.classList.add("modal-open");
      routes.post.style.display = "flex";

      // Lazy-load post gate ONCE
      if (!postGateLoaded) {
        postGateLoaded = true;
        import("/index/js/post-gate/post-gate.js")
          .then(m => m?.initPostGate?.())
          .catch(err => console.error("Post gate load failed:", err));
      }

      return;
    }

    /* ---- OTHER MODALS (static) ---- */
    if (!routes[name]) return;

    document.body.classList.add("modal-open");
    routes[name].style.display = "flex";

    // Lazy-load login ONCE
    if (name === "login" && !loginLoaded) {
      loginLoaded = true;
      import("/index/js/post-gate/login.js")
        .then(m => {
          if (typeof m.initLogin === "function") {
            m.initLogin();
          } else {
            console.error("login.js loaded but initLogin not found");
          }
        })
        .catch(err => console.error("Login module load failed:", err));
    }
  }

  /* ==========================
     CLOSE ALL MODALS
  ========================== */
  function closeAll() {
    document.body.classList.remove("modal-open");

    Object.values(routes).forEach(m => {
      if (m) m.style.display = "none";
    });
  }

  // Expose globally
  window.openScreen = openScreen;
  window.closeScreens = closeAll;

  /* ==========================
     ACTION BUTTONS
  ========================== */

  document.getElementById("openPostModal")?.addEventListener("click", e => {
    e.preventDefault();
    openScreen("post");
  });

  document.getElementById("openLoginModal")?.addEventListener("click", e => {
    e.preventDefault();
    openScreen("login");
  });

  document.getElementById("openAccountModal")?.addEventListener("click", e => {
    e.preventDefault();

    if (!window.currentUser) {
      openScreen("login");
      return;
    }

    if (typeof window.navigateToDashboard === "function") {
      window.navigateToDashboard();
    }
  });

  /* ==========================
     CLOSE MODALS ON BACKDROP
  ========================== */
  document.addEventListener("click", e => {
    if (
      e.target.classList.contains("modal") ||
      e.target.classList.contains("close")
    ) {
      closeAll();
    }
  });
}
