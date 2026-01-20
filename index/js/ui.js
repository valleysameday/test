import { getFirebase } from "/index/js/firebase/init.js";
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

    if (name === "post") {
  await loadPostModal();

  routes.post = document.getElementById("postModal");
  if (!routes.post) {
    console.error("postModal failed to load");
    return;
  }

  document.body.classList.add("modal-open");
  routes.post.style.display = "flex";

  // ⭐ Wait for DOM to fully render the modal
  await new Promise(r => setTimeout(r, 30));

  // ⭐ Now load post gate (media + submit)
  import("/index/js/post-gate/post-gate.js")
    .then(m => m?.initPostGate?.())
    .catch(err => console.error("Post gate load failed:", err));

  return;
    }

    if (!routes[name]) return;

    document.body.classList.add("modal-open");
    routes[name].style.display = "flex";

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
    const fb = await getFirebase();
    const auth = fb.auth || fb.firebase?.auth;

    if (!auth) {
      console.error("Auth not found in getFirebase()");
      return;
    }

    await auth.signOut();
window.currentUser = null;
updateHeaderAuthState();

// Load logout confirmation page
window.loadView("logout");
  });

  /* ==========================
     FULLSCREEN MENU LOGIC
  ========================== */

  const fullscreenMenu = document.getElementById("fullscreenMenu");
  const closeMenuBtn = fullscreenMenu?.querySelector(".close-menu");

  const menuLogin = document.getElementById("menu-login");
  const menuDashboard = document.getElementById("menu-dashboard");
  const menuLogout = document.getElementById("menu-logout");
   const menuPost = document.getElementById("menu-post");
   const menuListBusiness = document.getElementById("menu-list-business");

menuListBusiness?.addEventListener("click", () => {
  fullscreenMenu.style.display = "none";

  if (!window.currentUser) {
    window.loginRedirect = "list-business";
    openLoginModal();
    return;
  }

  // Load the SPA view for listing a business
  window.loadView("list-business");
});
   // Close menu whenever any menu item is clicked
fullscreenMenu.querySelectorAll(".menu-item").forEach(item => {
  item.addEventListener("click", () => {
    fullscreenMenu.style.display = "none";
  });
});

  menuBtn?.addEventListener("click", () => {
    fullscreenMenu.style.display = "flex";
  });

  closeMenuBtn?.addEventListener("click", () => {
    fullscreenMenu.style.display = "none";
  });

  /* ---- MENU: DASHBOARD ---- */
  menuDashboard?.addEventListener("click", () => {
    fullscreenMenu.style.display = "none";
    window.loadView("dashboard");
  });

   menuPost?.addEventListener("click", () => {
  fullscreenMenu.style.display = "none";

  if (!window.currentUser) {
    window.loginRedirect = "post";
    openLoginModal();
    return;
  }

  openScreen("post");
});

  /* ---- MENU: LOGOUT ---- */
  menuLogout?.addEventListener("click", async () => {
    const fb = await getFirebase();
    const auth = fb.auth || fb.firebase?.auth;

    if (!auth) {
      console.error("Auth not found in getFirebase()");
      return;
    }

    await auth.signOut();
window.currentUser = null;
updateHeaderAuthState();

// Close menu + load logout confirmation page
fullscreenMenu.style.display = "none";
window.loadView("logout");
  });

  /* ==========================
     LOGIN STATE HANDLING
  ========================== */
  function updateHeaderAuthState() {
    const loggedIn = !!window.currentUser;

    // Header buttons
    loginBtn.style.display = loggedIn ? "none" : "flex";
    logoutBtn.style.display = loggedIn ? "flex" : "none";

    // Menu items
    if (loggedIn) {
      menuLogin.style.display = "none";
      menuLogout.style.display = "block";
      menuDashboard.style.display = "block";
    } else {
      menuLogin.style.display = "block";
      menuLogout.style.display = "none";
      menuDashboard.style.display = "none";
    }
  }

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
