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
   IMAGE COMPRESSION (MULTI-IMAGE SAFE)
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
   BADGES CONFIG
   (Checkboxes in form with name="postBadge" value="delivery", etc.)
-------------------------------------------------- */
const BADGE_KEYS = [
  "delivery",   // 🚚 Delivery available
  "collection", // 📦 Collection only
  "assembly",   // 🛠️ Assembly help
  "heavy",      // 🏋️ Heavy item
  "trusted",    // ⭐ Trusted seller
  "boxed",      // 🎁 Boxed / sealed
  "new"         // 🆕 New condition
];

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

  setupPostcodeGuard();
});

/* --------------------------------------------------
   MAIN POST GATE FLOW
-------------------------------------------------- */
function startPostGate() {
  let currentStep = 1;

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

  /* ---------- Step Navigation ---------- */
  function showStep(step) {
    steps.forEach((s) => {
      s.style.display = s.dataset.step == step ? "block" : "none";
    });
    currentStep = step;
  }

  nextBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      showStep(currentStep + 1);
    });
  });

  prevBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      showStep(currentStep - 1);
    });
  });

  showStep(1);

  /* ---------- Image Picker (Multiple) ---------- */
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

  /* ---------- Submit Post ---------- */
  postSubmitBtn?.addEventListener("click", async () => {
    if (!postFeedback) return;

    const title = document.getElementById("postTitle")?.value.trim() || "";
    const description =
      document.getElementById("postDescription")?.value.trim() || "";
    const category = document.getElementById("postCategory")?.value || "";
    const area = document.getElementById("postArea")?.value.trim() || "";
    const priceInput =
      document.getElementById("postPrice")?.value.trim() || "";
    const price =
      priceInput === "" ? null : Number.isNaN(Number(priceInput)) ? null : Number(priceInput);

    // Badges from checkboxes
    const badgeEls = document.querySelectorAll('input[name="postBadge"]:checked');
    const badges = Array.from(badgeEls)
      .map((el) => el.value)
      .filter((v) => BADGE_KEYS.includes(v));

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
        price,
        imageUrl,
        imageUrls,
        badges, // <-- NEW: array of badge keys for cards
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
    const password = document.getElementById("loginPassword")?.value || "";

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
      signupFeedback.textContent = "❌ " + (err.message || "Signup failed.");
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

/* --------------------------------------------------
   RHONDDA POSTCODE GATE
   (Lock non-RCT users unless logged in or valid postcode)
-------------------------------------------------- */
function setupPostcodeGuard() {
  const postcodeInput = document.getElementById("postPostcode");
  const rhonddaWarning = document.getElementById("rhondda-warning");
  const rhonddaThanks = document.getElementById("rhondda-thanks");
  const rhonddaInfo = document.getElementById("rhondda-info");

  // RCT / Rhondda outer codes
  const rctPostcodes = [
    "CF15",
    "CF35",
    "CF37",
    "CF38",
    "CF39",
    "CF40",
    "CF41",
    "CF42",
    "CF43",
    "CF44",
    "CF45",
    "CF72"
  ];

  // Restore "thanks" if already shown
  if (sessionStorage.getItem("rhonddaThanksShown")) {
    rhonddaThanks?.classList.remove("hidden");
    rhonddaWarning?.classList.add("hidden");
    rhonddaInfo?.classList.add("hidden");
  }

  postcodeInput?.addEventListener("input", (e) => {
    const raw = e.target.value.toUpperCase().trim();
    const outward = raw.slice(0, 4); // CF40, CF39, etc.

    const isRct = rctPostcodes.includes(outward);

    if (!window.currentUser && !isRct) {
      rhonddaWarning?.classList.remove("hidden");
      rhonddaThanks?.classList.add("hidden");
      rhonddaInfo?.classList.remove("hidden");
    } else if (isRct || window.currentUser) {
      rhonddaWarning?.classList.add("hidden");
      rhonddaThanks?.classList.remove("hidden");
      rhonddaInfo?.classList.add("hidden");
      sessionStorage.setItem("rhonddaThanksShown", "true");
    }
  });
}
