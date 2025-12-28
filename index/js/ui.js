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

  function openScreen(name) {
    closeAll();
    if (!routes[name]) return;
    document.body.classList.add("modal-open");
    routes[name].style.display = "flex";

    if (name === "post") {
      import("/index/js/post-gate/post-gate.js").then(m => m.initPostGate());
    }
  }

  function closeAll() {
    document.body.classList.remove("modal-open");
    Object.values(routes).forEach(m => m && (m.style.display = "none"));
  }

  window.openScreen = openScreen;
  window.closeScreens = closeAll;

  document.getElementById("openPostModal")?.addEventListener("click", e => {
    e.preventDefault();
    openScreen("post");
  });

  document.getElementById("openLoginModal")?.addEventListener("click", e => {
    e.preventDefault();
    openScreen("login");
  });

  document.addEventListener("click", e => {
    if (e.target.classList.contains("modal") ||
        e.target.classList.contains("close")) {
      closeAll();
    }
  });
}
