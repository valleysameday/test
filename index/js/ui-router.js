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

  /* -------------------- CATEGORY + SUBCATEGORY (HOMEPAGE) -------------------- */
  const subcategoryMap = {
    forsale: ['Appliances','Furniture','Electronics','Baby & Kids','Garden','Tools','Mobility','Misc'],
    jobs: ['Plumber','Electrician','Cleaner','Gardener','Handyman','Beauty & Hair','Mechanic','Tutor'],
    property: ['To Rent','To Buy','Rooms','Commercial'],
    events: ['Music','Charity','Sport','Classes','Markets'],
    all: null,
    community: null,
    free: null
  };

  const categories = document.querySelectorAll('#categories .category-btn');
  const subcategoriesContainer = document.getElementById('subcategories');

  function showSubcategories(category) {
    if (!subcategoriesContainer) return;
    subcategoriesContainer.innerHTML = '';
    const subs = subcategoryMap[category];
    if (!subs) {
      subcategoriesContainer.style.display = 'none';
      return;
    }
    subs.forEach(sub => {
      const btn = document.createElement('button');
      btn.className = 'subcategory-btn';
      btn.textContent = sub;
      btn.onclick = () => console.log(`Filter feed: ${category} > ${sub}`);
      subcategoriesContainer.appendChild(btn);
    });
    subcategoriesContainer.style.display = 'flex';
  }

  categories.forEach(btn => {
    btn.addEventListener('click', () => {
      categories.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showSubcategories(btn.dataset.category);
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

  /* -------------------- MY ACCOUNT BUTTON (SPA VERSION) -------------------- */
  document.getElementById('openAccountModal')?.addEventListener('click', async e => {
    e.preventDefault();

    if (!window.firebaseAuthReady) {
      openScreen('login');
      return;
    }

    const user = window.currentUser;

    if (!user) {
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
     ✅ POST MODAL CATEGORY + SUBCATEGORY + PRICE LOGIC
     --------------------------------------------------------- */
  const postCategory = document.getElementById("postCategory");
  const postSubcategory = document.getElementById("postSubcategory");
  const priceWrapper = document.querySelector(".price-wrapper");

  if (postCategory) {
    postCategory.addEventListener("change", e => {
      const category = e.target.value;

      // ✅ Load subcategories into modal dropdown
      const subs = subcategoryMap[category];
      postSubcategory.innerHTML = "<option value=''>Select subcategory</option>";

      if (subs) {
        subs.forEach(sub => {
          const opt = document.createElement("option");
          opt.value = sub.toLowerCase().replace(/\s+/g, "-");
          opt.textContent = sub;
          postSubcategory.appendChild(opt);
        });
        postSubcategory.parentElement.style.display = "block";
      } else {
        postSubcategory.parentElement.style.display = "none";
      }

      // ✅ Show price only for For Sale + Property
      if (category === "forsale" || category === "property") {
        priceWrapper.style.display = "block";
      } else {
        priceWrapper.style.display = "none";
      }

      // ✅ Auto-set FREE category price to 0
      if (category === "free") {
        document.getElementById("postPrice").value = 0;
      }
    });
  }

    }
