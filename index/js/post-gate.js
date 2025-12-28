// post-gate.js
import { getFirebase } from '/index/js/firebase/init.js';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

let auth, db, storage;

/* ---------------------------------------------------
   ✅ IMAGE COMPRESSION
--------------------------------------------------- */
function compressImage(file, maxWidth = 1200, quality = 0.7) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        blob => resolve(blob || file),
        "image/jpeg",
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

/* ---------------------------------------------------
   ✅ LOAD FIREBASE
--------------------------------------------------- */
getFirebase().then(fb => {
  auth = fb.auth;
  db = fb.db;
  storage = fb.storage;

  function startPostGate() {

    /* ---------------------------------------------------
       ✅ STEP CONTROLLER
    --------------------------------------------------- */
    let currentStep = 1;

    function showStep(step) {
      document.querySelectorAll(".post-step").forEach(s => {
        s.style.display = s.dataset.step == step ? "block" : "none";
      });
      currentStep = step;
    }

    // Next buttons
    document.querySelectorAll(".post-next").forEach(btn => {
      btn.addEventListener("click", () => {
        showStep(currentStep + 1);
      });
    });

    // Back buttons
    document.querySelectorAll(".post-prev").forEach(btn => {
      btn.addEventListener("click", () => {
        showStep(currentStep - 1);
      });
    });

    showStep(1);

    /* ---------------------------------------------------
       ✅ IMAGE PICKER
    --------------------------------------------------- */
    const chooseImageBtn = document.getElementById("chooseImageBtn");
    const postImageInput = document.getElementById("postImage");
    const previewBox = document.getElementById("imagePreview");

    chooseImageBtn?.addEventListener("click", () => {
      postImageInput.click();
    });

    postImageInput?.addEventListener("change", () => {
      const file = postImageInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = e => {
        previewBox.innerHTML = `<img src="${e.target.result}" class="preview-img">`;
      };
      reader.readAsDataURL(file);
    });

    /* ---------------------------------------------------
       ✅ SUBMIT AD
    --------------------------------------------------- */
    document.getElementById("postSubmitBtn")?.addEventListener("click", async () => {

      const title = document.getElementById("postTitle").value.trim();
      const description = document.getElementById("postDescription").value.trim();
      const category = document.getElementById("postCategory").value;
      const area = document.getElementById("postArea").value.trim();

      const priceInput = document.getElementById("postPrice").value.trim();
      const price = priceInput === "" ? null : Number(priceInput);

      const postFeedback = document.getElementById("postFeedback");

      if (!title || !description || !category || !subcategory) {
        postFeedback.textContent = "❌ Please complete all required fields.";
        postFeedback.classList.add("feedback-error");
        return;
      }

      if (!auth.currentUser) {
        postFeedback.textContent = "❌ Please log in first.";
        return;
      }

      postFeedback.textContent = "Uploading your ad…";

      // ✅ Upload images
      const files = Array.from(postImageInput.files || []);
      const imageUrls = [];

      for (const file of files) {
        try {
          const compressedBlob = await compressImage(file, 1200, 0.7);
          const slimFileName = file.name.replace(/\.(png|jpg|jpeg|webp|gif)$/i, "") + "_slim.jpg";
          const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${slimFileName}`);

          await uploadBytes(storageRef, compressedBlob);
          const url = await getDownloadURL(storageRef);
          imageUrls.push(url);
        } catch (err) {
          console.error("Image upload failed:", err);
        }
      }

      const imageUrl = imageUrls[0] || null;

      await addDoc(collection(db, "posts"), {
        title,
        description,
        category,
        area,
        price,
        imageUrl,
        imageUrls,
        createdAt: serverTimestamp(),
        userId: auth.currentUser.uid,
        businessId: window.firebaseUserDoc?.isBusiness ? auth.currentUser.uid : null
      });

      postFeedback.textContent = "✅ Your ad is live!";
      postFeedback.classList.add("feedback-success");

      setTimeout(() => window.closeScreens(), 800);
    });

    /* ---------------------------------------------------
       ✅ LOGIN / SIGNUP / RESET (unchanged)
    --------------------------------------------------- */
    const loginSubmitBtn = document.getElementById('loginSubmit');
    const signupSubmitBtn = document.getElementById('signupSubmit');
    const forgotSubmit = document.getElementById('forgotSubmit');
    const forgotEmail = document.getElementById('forgotEmail');

    const loginFeedback = document.getElementById("loginFeedback");
    const signupFeedback = document.getElementById("signupFeedback");

    loginSubmitBtn?.addEventListener('click', async e => {
      e.preventDefault();

      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      loginFeedback.textContent = "Checking details…";

      try {
        await signInWithEmailAndPassword(auth, email, password);

        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        window.firebaseUserDoc = userDoc.exists() ? userDoc.data() : null;

        loginFeedback.textContent = "✅ Correct — loading your dashboard…";
        loginFeedback.classList.add("feedback-success");

        setTimeout(() => {
          window.closeScreens();
          navigateToDashboard();
        }, 600);

      } catch (err) {
        loginFeedback.textContent = "❌ Incorrect email or password.";
        loginFeedback.classList.add("feedback-error");
      }
    });

    signupSubmitBtn?.addEventListener('click', async e => {
      e.preventDefault();

      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      const isBusiness = document.getElementById('isBusinessAccount').checked;

      signupFeedback.textContent = "Creating your account…";

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
          window.closeScreens();
          navigateToDashboard();
        }, 600);

      } catch (err) {
        signupFeedback.textContent = "❌ " + err.message;
        signupFeedback.classList.add("feedback-error");
      }
    });

    forgotSubmit?.addEventListener('click', () => {
      const email = forgotEmail.value.trim();
      if (!email) {
        loginFeedback.textContent = "❌ Please enter your email.";
        return;
      }
      sendPasswordResetEmail(auth, email);
      openScreen('resetConfirm');
    });

    onAuthStateChanged(auth, async user => {
      window.currentUser = user;

      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        window.firebaseUserDoc = snap.exists() ? snap.data() : null;
      } else {
        window.firebaseUserDoc = null;
      }

      window.firebaseAuthReady = true;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPostGate);
  } else {
    startPostGate();
  }

const postcodeInput = document.getElementById('postPostcode');
const rhonddaWarning = document.getElementById('rhondda-warning');
const rhonddaThanks = document.getElementById('rhondda-thanks');

const rctPostcodes = [
  'CF15', 'CF35', 'CF37', 'CF38', 'CF39',
  'CF40', 'CF41', 'CF42', 'CF43', 'CF44',
  'CF45', 'CF72'
];

// Don't show info again if user has been thanked this session
if (sessionStorage.getItem('rhonddaThanksShown')) {
  rhonddaThanks.classList.remove('hidden');
  rhonddaWarning.classList.add('hidden');
  document.getElementById('rhondda-info').classList.add('hidden');
}

postcodeInput?.addEventListener('input', (e) => {
  const value = e.target.value.toUpperCase().trim().slice(0, 4); // first part

  if (!window.currentUser && !rhonddaAreas.includes(value)) {
    rhonddaWarning.classList.remove('hidden');
    rhonddaThanks.classList.add('hidden');
  } else if (rhonddaAreas.includes(value) || window.currentUser) {
    rhonddaWarning.classList.add('hidden');
    rhonddaThanks.classList.remove('hidden');
    document.getElementById('rhondda-info').classList.add('hidden');

    // Set flag so user won't be asked again this session
    sessionStorage.setItem('rhonddaThanksShown', 'true');
  }
});
});
