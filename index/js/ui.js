// /index/js/ui.js

let uiInit = false;
let loginLoaded = false;
let postGateLoaded = false;

/* ==========================
   LOAD POSTING MODAL + CSS
========================== */
async function loadPostModal() {
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

    if (!document.getElementById("postModalCSS")) {
      const css = document.createElement("link");
      css.id = "postModalCSS";
      css.rel = "stylesheet";
      css.href = "/posting/post.css";
      document.head.appendChild(css);
    }

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
    post: null,
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

    // POST MODAL
    if (name === "post") {
      await loadPostModal();

      routes.post = document.getElementById("postModal");
      if (!routes.post) {
        console.error("postModal failed to load");
        return;
      }

      document.body.classList.add("modal-open");
      routes.post.style.display = "flex";

      if (!postGateLoaded) {
        postGateLoaded = true;
        import("/index/js/post-gate/post-gate.js")
          .then(m => m?.initPostGate?.())
          .catch(err => console.error("Post gate load failed:", err));
      }

      return;
    }

    // OTHER STATIC MODALS
    if (!routes[name]) return;

    document.body.classList.add("modal-open");
    routes[name].style.display = "flex";

    // Lazy-load login
    if (name === "login" && !loginLoaded) {
      loginLoaded = true;
      import("/index/js/post-gate/login.js")
        .then(m => m?.initLogin?.())
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
  window.openLoginModal = () => openScreen("login");

  /* ==========================
     HAMBURGER MENU
  ========================== */
  const sideMenu = document.getElementById("sideMenu");
  const hamburger = document.getElementById("hamburger");

  hamburger?.addEventListener("click", () => {
    sideMenu.classList.toggle("open");
  });

  // Close menu when clicking a link
  sideMenu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      sideMenu.classList.remove("open");
    });
  });

  /* ==========================
     MENU ACTIONS
  ========================== */

  // HOME
  document.getElementById("menu-home").onclick = () => {
    window.loadView("home");
  };

  // POST AD
  document.getElementById("menu-post").onclick = () => {
    if (!window.currentUser) {
      window.loginRedirect = "post";
      window.openLoginModal();
      return;
    }
    openScreen("post");
  };

  // DASHBOARD
  document.getElementById("menu-dashboard").onclick = () => {
    window.navigateToDashboard?.();
  };

  // LOGIN
  document.getElementById("menu-login").onclick = () => {
    window.loginRedirect = "stay";
    window.openLoginModal();
  };

  // LOGOUT
  document.getElementById("menu-logout").onclick = async () => {
    const { auth } = await getFirebase();
    await auth.signOut();
    window.currentUser = null;
    updateMenuAuthState();
  };

  /* ==========================
     LOGIN STATE HANDLING
  ========================== */
  function updateMenuAuthState() {
    const loggedIn = !!window.currentUser;

    document.getElementById("menu-login").classList.toggle("hidden", loggedIn);
    document.getElementById("menu-logout").classList.toggle("hidden", !loggedIn);
    document.getElementById("menu-dashboard").classList.toggle("hidden", !loggedIn);
  }

  updateMenuAuthState();

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
