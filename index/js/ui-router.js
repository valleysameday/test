// ui-router.js
export function initUIRouter() {

  const routes = {
    login: document.getElementById('loginModal'),
    post: document.getElementById('postModal'),
    signup: document.getElementById('signupModal'),
    forgot: document.getElementById('forgotPasswordModal'),
    resetConfirm: document.getElementById('resetConfirmModal'),
    sellerprofile: document.getElementById('sellerProfilePage')
  };

  function openScreen(name) {
    closeAll();
    if (!routes[name]) return;
    document.body.classList.add('modal-open');
    routes[name].style.display = 'flex';
  }

  function closeAll() {
    document.body.classList.remove('modal-open');
    Object.values(routes).forEach(m => {
      if (m) m.style.display = 'none';
    });
  }

  window.openScreen = openScreen;
  window.closeScreens = closeAll;

  /* -------------------- CATEGORY FILTER (HOMEPAGE ONLY) -------------------- */
  const categories = document.querySelectorAll('#categories .category-btn');

  categories.forEach(btn => {
    btn.addEventListener('click', () => {
      categories.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const category = btn.dataset.category;
      console.log(`Filter feed by category: ${category}`);
      // hook feed filtering here
    });
  });

  /* -------------------- FORGOT PASSWORD LINK -------------------- */
  const forgotLink = document.getElementById('forgotPasswordLink');
  if (forgotLink) {
    forgotLink.addEventListener('click', e => {
      e.preventDefault();
      openScreen('forgot');
    });
  }

  /* -------------------- FORGOT PASSWORD SUBMIT -------------------- */
  const forgotSubmit = document.getElementById('forgotSubmit');
  const forgotEmail = document.getElementById('forgotEmail');

  if (forgotSubmit && forgotEmail) {
    forgotSubmit.addEventListener('click', () => {
      const email = forgotEmail.value.trim();
      if (!email) {
        alert("Please enter your email");
        return;
      }
      window.resetPassword(email);
    });
  }

  /* -------------------- ACTION BAR BUTTONS -------------------- */
  document.getElementById('openPostModal')?.addEventListener('click', e => {
    e.preventDefault();
    openScreen('post');
  });

  document.getElementById('openLoginModal')?.addEventListener('click', e => {
    e.preventDefault();
    openScreen('login');
  });

  document.getElementById('opensignupModal')?.addEventListener('click', e => {
    e.preventDefault();
    openScreen('signup');
  });

  /* -------------------- MY ACCOUNT BUTTON (SPA) -------------------- */
  document.getElementById('openAccountModal')?.addEventListener('click', async e => {
    e.preventDefault();

    if (!window.firebaseAuthReady || !window.currentUser) {
      openScreen('login');
      return;
    }

    navigateToDashboard();
  });

  /* -------------------- CLOSE MODALS -------------------- */
  document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', closeAll);
  });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeAll();
    });
  });

  /* ---------------------------------------------------------
     ✅ POST MODAL CATEGORY + PRICE LOGIC (NO SUBCATEGORIES)
     --------------------------------------------------------- */
  const postCategory = document.getElementById("postCategory");
  const priceWrapper = document.querySelector(".price-wrapper");
  const postPrice = document.getElementById("postPrice");

  if (postCategory) {
    postCategory.addEventListener("change", e => {
      const category = e.target.value;

      // Show price only where relevant
      if (category === "forsale" || category === "property") {
        priceWrapper.style.display = "block";
      } else {
        priceWrapper.style.display = "none";
      }

      // Auto-set FREE price
      if (category === "free" && postPrice) {
        postPrice.value = 0;
      }
    });
  }
}
