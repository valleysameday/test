// /index/js/ui.js

let uiInit = false;
let loginLoaded = false;
let postGateLoaded = false;

export function initUI() {
  if (uiInit) return;
  uiInit = true;

  const routes = {
    post: document.getElementById("postModal"),
    login: document.getElementById("loginModal"),
    signup: document.getElementById("signupModal"),
    forgot: document.getElementById("forgotPasswordModal"),
    resetConfirm: document.getElementById("resetConfirmModal")
  };

  async function openScreen(name) {
    closeAll();
    if (!routes[name]) return;

    document.body.classList.add("modal-open");
    routes[name].style.display = "flex";

    // Lazy-load post gate ONCE
    if (name === "post" && !postGateLoaded) {
      postGateLoaded = true;
      import("/index/js/post-gate/post-gate.js")
        .then(m => m?.initPostGate?.())
        .catch(err => console.error("Post gate load failed:", err));
    }

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

  function closeAll() {
    document.body.classList.remove("modal-open");
    Object.values(routes).forEach(m => {
      if (m) m.style.display = "none";
    });
  }

  // Expose globally for other modules
  window.openScreen = openScreen;
  window.closeScreens = closeAll;

  /* ---------------- ACTION BUTTONS ---------------- */

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

    // SPA dashboard navigation
    if (typeof window.navigateToDashboard === "function") {
      window.navigateToDashboard();
    }
  });

  /* ---------------- CLOSE MODALS ---------------- */

  document.addEventListener("click", e => {
    if (
      e.target.classList.contains("modal") ||
      e.target.classList.contains("close")
    ) {
      closeAll();
    }
  });
}
