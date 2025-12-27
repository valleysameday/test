let uiInitialised = false;

export function initUIRouter() {
  if (uiInitialised) return;
  uiInitialised = true;

  const routes = {
    login: document.getElementById("loginModal"),
    post: document.getElementById("postModal"),
    signup: document.getElementById("signupModal"),
    forgot: document.getElementById("forgotPasswordModal"),
    resetConfirm: document.getElementById("resetConfirmModal"),
    sellerprofile: document.getElementById("sellerProfilePage")
  };

  function openScreen(name) {
    closeAll();
    if (!routes[name]) return;
    document.body.classList.add("modal-open");
    routes[name].style.display = "flex";
  }

  function closeAll() {
    document.body.classList.remove("modal-open");
    Object.values(routes).forEach(m => {
      if (m) m.style.display = "none";
    });
  }

  window.openScreen = openScreen;
  window.closeScreens = closeAll;

  /* Action bar */
  document.getElementById("openPostModal")?.addEventListener("click", e => {
    e.preventDefault();
    openScreen("post");
  });

  document.getElementById("openLoginModal")?.addEventListener("click", e => {
    e.preventDefault();
    openScreen("login");
  });

  document.getElementById("opensignupModal")?.addEventListener("click", e => {
    e.preventDefault();
    openScreen("signup");
  });

  document.getElementById("openAccountModal")?.addEventListener("click", e => {
    e.preventDefault();
    if (!window.currentUser) openScreen("login");
    else window.navigateToDashboard();
  });

  /* Close handlers */
  document.addEventListener("click", e => {
    if (e.target.classList.contains("close")) closeAll();
    if (e.target.classList.contains("modal")) closeAll();
  });

  /* Post modal logic */
  const postCategory = document.getElementById("postCategory");
  const priceWrapper = document.querySelector(".price-wrapper");
  const postPrice = document.getElementById("postPrice");

  postCategory?.addEventListener("change", e => {
    const cat = e.target.value;
    priceWrapper.style.display =
      cat === "forsale" || cat === "property" ? "block" : "none";

    if (cat === "free" && postPrice) postPrice.value = 0;
  });
}
