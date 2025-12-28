let uiInit = false;

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

    // Lazy load post-gate only for post modal
    if (name === "post") {
      import("/index/js/post-gate/post-gate.js").then(m => m.initPostGate());
    }

    // Lazy load login logic only for login modal
    if (name === "login") {
      import("/index/js/post-gate/login.js").then(m => m.initLogin());
    }
  }

  function closeAll() {
    document.body.classList.remove("modal-open");
    Object.values(routes).forEach(m => m && (m.style.display = "none"));
  }

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

  document.getElementById("openAccountModal")?.addEventListener("click", async e => {
    e.preventDefault();

    if (!window.currentUser) {
      // Not logged in → show login modal
      openScreen("login");
      return;
    }

    // Logged in → navigate to dashboard
    if (typeof window.navigateToDashboard === "function") {
      window.navigateToDashboard();
    }
  });

  /* ---------------- CLOSE MODALS ---------------- */
  document.addEventListener("click", e => {
    if (e.target.classList.contains("modal") ||
        e.target.classList.contains("close")) {
      closeAll();
    }
  });
}
