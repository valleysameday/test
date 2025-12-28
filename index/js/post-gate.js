// /index/js/post-gate.js

import { getFirebase } from "/index/js/firebase/init.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

/* --------------------------------------------------
   FIREBASE HANDLES
-------------------------------------------------- */
let auth, db, storage;

/* --------------------------------------------------
   IMAGE COMPRESSION
-------------------------------------------------- */
function compressImage(file, maxWidth = 1200, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob || file),
        "image/jpeg",
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

/* --------------------------------------------------
   BADGE KEYS
-------------------------------------------------- */
const BADGE_KEYS = [
  "delivery",
  "collection",
  "assembly",
  "heavy",
  "trusted",
  "boxed",
  "new"
];

/* --------------------------------------------------
   RHONDDA POSTCODES
-------------------------------------------------- */
const RCT_POSTCODES = [
  "CF15","CF35","CF37","CF38","CF39","CF40","CF41",
  "CF42","CF43","CF44","CF45","CF72"
];

function hidePostcodeSection() {
  const step0 = document.querySelector('.post-step[data-step="0"]');
  if (step0) step0.style.display = "none";
}

function showPostcodeSection() {
  const step0 = document.querySelector('.post-step[data-step="0"]');
  if (step0) step0.style.display = "block";
}

/* --------------------------------------------------
   STARTUP
-------------------------------------------------- */
getFirebase().then((fb) => {
  auth = fb.auth;
  db = fb.db;
  storage = fb.storage;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPostGate);
  } else {
    startPostGate();
  }
});

/* --------------------------------------------------
   MAIN POST GATE FLOW
-------------------------------------------------- */
function startPostGate() {
  let currentStep = 0;
  let firstStep = 0;

  const steps = document.querySelectorAll(".post-step");
  const nextBtns = document.querySelectorAll(".post-next");
  const prevBtns = document.querySelectorAll(".post-prev");

  const chooseImageBtn = document.getElementById("chooseImageBtn");
  const postImageInput = document.getElementById("postImage");
  const previewBox = document.getElementById("imagePreview");
  const postSubmitBtn = document.getElementById("postSubmitBtn");
  const postFeedback = document.getElementById("postFeedback");

  const loginSubmitBtn = document.getElementById("loginSubmit");
  const signupSubmitBtn = document.getElementById("signupSubmit");
  const forgotSubmit = document.getElementById("forgotSubmit");
  const forgotEmail = document.getElementById("forgotEmail");
  const loginFeedback = document.getElementById("loginFeedback");
  const signupFeedback = document.getElementById("signupFeedback");

  const postcodeInput = document.getElementById("postPostcode");
  const rhonddaWarning = document.getElementById("rhondda-warning");
  const rhonddaThanks = document.getElementById("rhondda-thanks");
  const rhonddaInfo = document.getElementById("rhondda-info");

  const categorySelect = document.getElementById("postCategory");

  /* ---------- Decide if Step 0 is needed ---------- */
  const postcodeAlreadyOk = sessionStorage.getItem("rhonddaThanksShown") === "true";
  const needsPostcodeStep = !window.currentUser && !postcodeAlreadyOk;

  if (!needsPostcodeStep) {
    hidePostcodeSection();
    firstStep = 1;
  } else {
    showPostcodeSection();
    firstStep = 0;
  }

  currentStep = firstStep;

  /* ---------- Step helpers depending on category ---------- */
  function getCategory() {
    return (categorySelect?.value || "").toLowerCase();
  }

  function getNextStep(step) {
    const cat = getCategory();

    if (step === 0) return 1;

    if (step === 1) {
      // For Sale / Free / Property → go to step 2
      if (cat === "forsale" || cat === "free" || cat === "property") {
        return 2;
      }
      // Jobs, Events, Community → jump straight to Ad Details
      return 4;
    }

    if (step === 2) {
      // Step 2 meaning:
      // - For Sale / Free: Condition
      // - Property: property-specific options (sale / rent)
      if (cat === "property") {
        // Property: after property options, go straight to Ad Details
        return 4;
      }
      // For Sale / Free: go to Badges step
      return 3;
    }

    if (step === 3) return 4; // Badges → Ad Details

    return step;
  }

  function getPrevStep(step) {
    const cat = getCategory();

    if (step === 4) {
      if (cat === "property") return 2;
      if (cat === "forsale" || cat === "free") return 3;
      return 1;
    }

    if (step === 3) {
      // Coming back from Badges
      return 2;
    }

    if (step === 2) {
      // From Condition/Property → Category
      return 1;
    }

    if (step === 1) {
      // Back from Category → either Step 0 or stay
      return firstStep;
    }

    return firstStep;
  }

  function showStep(step) {
    steps.forEach((s) => {
      const stepNum = Number(s.dataset.step);
      s.style.display = stepNum === step ? "block" : "none";
    });

    // Optional: hide condition section inside Step 2 for non-ForSale categories
    const cat = getCategory();
    const conditionBlock = document.getElementById("conditionBlock");
    const propertyBlock = document.getElementById("propertyBlock");
    const badgesStep = document.querySelector('.post-step[data-step="3"]');

    if (conditionBlock) {
      conditionBlock.style.display =
        (cat === "forsale" || cat === "free") ? "block" : "none";
    }

    if (propertyBlock) {
      propertyBlock.style.display =
        cat === "property" ? "block" : "none";
    }

    if (badgesStep) {
      // Only show Badges step for For Sale / Free
      badgesStep.style.display =
        (cat === "forsale" || cat === "free") && step === 3 ? "block" : "none";
    }

    currentStep = step;
  }

  /* ---------- Bind Next / Prev buttons ---------- */
  nextBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Special validation for postcode on Step 0
      if (currentStep === 0 && needsPostcodeStep) {
        const raw = (postcodeInput?.value || "").toUpperCase().trim();
        const outward = raw.slice(0, 4);
        const isRct = RCT_POSTCODES.includes(outward);

        if (!isRct) {
          rhonddaWarning?.classList.remove("hidden");
          rhonddaThanks?.classList.add("hidden");
          rhonddaInfo?.classList.remove("hidden");
          return; // Stay on Step 0
        } else {
          rhonddaWarning?.classList.add("hidden");
          rhonddaThanks?.classList.remove("hidden");
          rhonddaInfo?.classList.add("hidden");
          sessionStorage.setItem("rhonddaThanksShown", "true");
          setTimeout(() => hidePostcodeSection(), 800);
        }
      }

      const next = getNextStep(currentStep);
      showStep(next);
    });
  });

  prevBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const prev = getPrevStep(currentStep);
      showStep(prev);
    });
  });

  // When category changes, re-evaluate step layout if user navigates back/forward
  categorySelect?.addEventListener("change", () => {
    // If user changes category mid-flow, send them back to Step 1
    showStep(1);
  });

  showStep(firstStep);

  /* ---------- Image picker (multiple) ---------- */
  chooseImageBtn?.addEventListener("click", () => {
    postImageInput?.click();
  });

  postImageInput?.addEventListener("change", () => {
    const files = Array.from(postImageInput.files || []);
    previewBox.innerHTML = "";
    if (!files.length) return;

    const info = document.createElement("p");
    info.textContent = `${files.length} photo${files.length > 1 ? "s" : ""} selected`;
    info.className = "preview-info";
    previewBox.appendChild(info);

    const list = document.createElement("div");
    list.className = "preview-list";

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.className = "preview-img";
        list.appendChild(img);
      };
      reader.readAsDataURL(file);
    });

    previewBox.appendChild(list);
  });

  /* ---------- Submit post ---------- */
  postSubmitBtn?.addEventListener("click", async () => {
    if (!postFeedback) return;

    const category = getCategory();
    const title = document.getElementById("postTitle")?.value.trim() || "";
    const description =
      document.getElementById("postDescription")?.value.trim() || "";
    const area = document.getElementById("postArea")?.value.trim() || "";

    // Standard price (for non-property)
    const priceInput =
      document.getElementById("postPrice")?.value.trim() || "";

    // Property-specific fields (if present in HTML)
    const propertyListingType =
      document.querySelector('input[name="propertyListingType"]:checked')
        ?.value || null;
    const salePriceInput =
      document.getElementById("postPropertySalePrice")?.value.trim() || "";
    const rentAmountInput =
      document.getElementById("postPropertyRentAmount")?.value.trim() || "";
    const rentFrequency =
      document.getElementById("postPropertyRentFrequency")?.value || "";

    // Condition only for For Sale / Free
    const condition =
      (category === "forsale" || category === "free")
        ? (document.querySelector('input[name="postCondition"]:checked')?.value || null)
        : null;

    // Badges only for For Sale / Free
    let badges = [];
    if (category === "forsale" || category === "free") {
      const badgeEls = document.querySelectorAll('input[name="postBadge"]:checked');
      badges = Array.from(badgeEls)
        .map((el) => el.value)
        .filter((v) => BADGE_KEYS.includes(v));
    }

    // WORK OUT PRICE LOGIC
    let price = null;
    let rentAmount = null;

    if (category === "property") {
      if (propertyListingType === "sale") {
        price = salePriceInput === "" ? null : Number(salePriceInput) || null;
      } else if (propertyListingType === "rent") {
        rentAmount = rentAmountInput === "" ? null : Number(rentAmountInput) || null;
        price = rentAmount; // used for cards
      }
    } else {
      // For normal categories
      price =
        priceInput === ""
          ? null
          : Number.isNaN(Number(priceInput))
          ? null
          : Number(priceInput);
    }

    // Basic validation
    if (!title || !description || !category) {
      postFeedback.textContent = "❌ Please complete all required fields.";
      postFeedback.classList.remove("feedback-success");
      postFeedback.classList.add("feedback-error");
      return;
    }

    if (!auth.currentUser) {
      postFeedback.textContent = "❌ Please log in first.";
      postFeedback.classList.remove("feedback-success");
      postFeedback.classList.add("feedback-error");
      return;
    }

    // For property, make sure listing type is chosen
    if (category === "property" && !propertyListingType) {
      postFeedback.textContent = "❌ Please choose if the property is for sale or for rent.";
      postFeedback.classList.remove("feedback-success");
      postFeedback.classList.add("feedback-error");
      return;
    }

    if (category === "property" && propertyListingType === "rent" && (!rentAmount || !rentFrequency)) {
      postFeedback.textContent = "❌ Please enter the rent amount and whether it's weekly or monthly.";
      postFeedback.classList.remove("feedback-success");
      postFeedback.classList.add("feedback-error");
      return;
    }

    postFeedback.textContent = "📤 Uploading your ad…";
    postFeedback.classList.remove("feedback-error", "feedback-success");

    // Upload images
    const files = Array.from(postImageInput?.files || []);
    const imageUrls = [];

    for (const file of files) {
      try {
        const compressedBlob = await compressImage(file, 1200, 0.7);
        const baseName = file.name.replace(/\.(png|jpg|jpeg|webp|gif)$/i, "");
        const slimFileName = baseName + "_slim.jpg";
        const storageRef = ref(
          storage,
          `posts/${auth.currentUser.uid}/${Date.now()}_${slimFileName}`
        );
        await uploadBytes(storageRef, compressedBlob);
        const url = await getDownloadURL(storageRef);
        imageUrls.push(url);
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }

    const imageUrl = imageUrls[0] || null;

    try {
      await addDoc(collection(db, "posts"), {
        title,
        description,
        category,
        area,
        price,                 // unified price field for cards
        condition,             // only for sale/free
        badges,                // only for sale/free
        propertyListingType: category === "property" ? propertyListingType : null,
        rentAmount: category === "property" ? rentAmount : null,
        rentFrequency: category === "property" ? rentFrequency || null : null,
        imageUrl,
        imageUrls,
        createdAt: serverTimestamp(),
        userId: auth.currentUser.uid,
        businessId: window.firebaseUserDoc?.isBusiness
          ? auth.currentUser.uid
          : null
      });

      postFeedback.textContent = "✅ Your ad is live!";
      postFeedback.classList.remove("feedback-error");
      postFeedback.classList.add("feedback-success");

      setTimeout(() => window.closeScreens?.(), 800);
    } catch (err) {
      console.error("🔥 Failed to create post:", err);
      postFeedback.textContent = "❌ Something went wrong. Please try again.";
      postFeedback.classList.remove("feedback-success");
      postFeedback.classList.add("feedback-error");
    }
  });

  /* ---------- LOGIN ---------- */
  loginSubmitBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!loginFeedback) return;

    const email = document.getElementById("loginEmail")?.value.trim() || "";
    const password =
      document.getElementById("loginPassword")?.value || "";

    loginFeedback.textContent = "Checking details…";
    loginFeedback.classList.remove("feedback-success", "feedback-error");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      window.firebaseUserDoc = userDoc.exists() ? userDoc.data() : null;

      loginFeedback.textContent = "✅ Correct — loading your dashboard…";
      loginFeedback.classList.add("feedback-success");

      setTimeout(() => {
        window.closeScreens?.();
        window.navigateToDashboard?.();
      }, 600);
    } catch (err) {
      console.error("Login failed:", err);
      loginFeedback.textContent = "❌ Incorrect email or password.";
      loginFeedback.classList.add("feedback-error");
    }
  });

  /* ---------- SIGNUP ---------- */
  signupSubmitBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!signupFeedback) return;

    const email = document.getElementById("signupEmail")?.value.trim() || "";
    const password =
      document.getElementById("signupPassword")?.value || "";
    const isBusiness =
      document.getElementById("isBusinessAccount")?.checked || false;

    signupFeedback.textContent = "Creating your account…";
    signupFeedback.classList.remove("feedback-success", "feedback-error");

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        email,
        isBusiness,
        createdAt: serverTimestamp()
      });

      window.firebaseUserDoc = { email, isBusiness };

      signupFeedback.textContent = "✅ Account created!";
      signupFeedback.classList.add("feedback-success");

      setTimeout(() => {
        window.closeScreens?.();
        window.navigateToDashboard?.();
      }, 600);
    } catch (err) {
      console.error("Signup failed:", err);
      signupFeedback.textContent =
        "❌ " + (err.message || "Signup failed.");
      signupFeedback.classList.add("feedback-error");
    }
  });

  /* ---------- FORGOT PASSWORD ---------- */
  forgotSubmit?.addEventListener("click", () => {
    if (!forgotEmail) return;
    const email = forgotEmail.value.trim();

    if (!email) {
      if (loginFeedback) {
        loginFeedback.textContent = "❌ Please enter your email.";
        loginFeedback.classList.add("feedback-error");
      }
      return;
    }

    sendPasswordResetEmail(auth, email)
      .then(() => {
        window.openScreen?.("resetConfirm");
      })
      .catch((err) => {
        console.error("Reset email failed:", err);
        if (loginFeedback) {
          loginFeedback.textContent =
            "❌ Could not send reset email. Please try again.";
          loginFeedback.classList.add("feedback-error");
        }
      });
  });

  /* ---------- AUTH STATE ---------- */
  onAuthStateChanged(auth, async (user) => {
    window.currentUser = user || null;

    if (user) {
      hidePostcodeSection(); // logged in → never show postcode step again
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        window.firebaseUserDoc = snap.exists() ? snap.data() : null;
      } catch (err) {
        console.error("Failed to load user doc:", err);
        window.firebaseUserDoc = null;
      }
    } else {
      window.firebaseUserDoc = null;
    }

    window.firebaseAuthReady = true;
  });
        }
