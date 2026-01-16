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
     HEADER ICON LOGIC
========================== */

  const postAdBtn = document.getElementById("post-ad-btn");
  const loginBtn = document.getElementById("auth-logged-out");
  const logoutBtn = document.getElementById("auth-logged-in");
  const menuBtn = document.getElementById("menu-btn");

  /* ---- POST AD ---- */
  postAdBtn?.addEventListener("click", () => {
    if (!window.currentUser) {
      window.loginRedirect = "post";
      window.openLoginModal();
      return;
    }
    openScreen("post");
  });

  /* ---- LOGIN ---- */
  loginBtn?.addEventListener("click", () => {
    window.loginRedirect = "stay";
    window.openLoginModal();
  });

  /* ---- LOGOUT ---- */
  logoutBtn?.addEventListener("click", async () => {
    const { auth } = await getFirebase();
    await auth.signOut();
    window.currentUser = null;
    updateHeaderAuthState();
  });

  /* ---- MENU BUTTON ---- */
  menuBtn?.addEventListener("click", () => {
    window.loadView("menu"); // or open a dropdown later
  });

  /* ==========================
     LOGIN STATE HANDLING
  ========================== */
  function updateHeaderAuthState() {
    const loggedIn = !!window.currentUser;

    loginBtn.style.display = loggedIn ? "none" : "flex";
    logoutBtn.style.display = loggedIn ? "flex" : "none";
  }

  updateHeaderAuthState();

  if (window.onAuthStateChanged) {
    window.onAuthStateChanged(user => {
      window.currentUser = user || null;
      updateHeaderAuthState();
    });
  }

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
