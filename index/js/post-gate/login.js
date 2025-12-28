console.log("✅ login.js loaded");

import { getFirebase } from "/index/js/firebase/init.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let auth, db;

async function init() {
  const fb = await getFirebase();
  auth = fb.auth;
  db = fb.db;

  bindLoginForm();
  monitorAuth();
}

/* --------------------------
   Bind login form submit
-------------------------- */
function bindLoginForm() {
  const form = document.getElementById("loginForm");
  const feedback = document.getElementById("loginFeedback");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    feedback.textContent = "Logging in…";

    const email = form.email?.value.trim();
    const password = form.password?.value;

    if (!email || !password) {
      feedback.textContent = "❌ Enter email and password.";
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Fetch the user document
      const userSnap = await getDoc(doc(db, "users", uid));

      if (!userSnap.exists()) {
        feedback.textContent = "❌ User doc not found.";
        console.warn("User doc missing:", uid);
        return;
      }

      const userData = userSnap.data();

      // Store globally for SPA
      window.currentUser = auth.currentUser;
      window.firebaseUserDoc = userData;

      feedback.textContent = "✅ Logged in! Redirecting…";

      setTimeout(() => {
        window.closeScreens?.();
        window.navigateToDashboard?.();
      }, 500);

    } catch (err) {
      console.error("Login failed:", err);
      feedback.textContent = "❌ Invalid email or password.";
    }
  });
}

/* --------------------------
   Monitor auth state changes
-------------------------- */
function monitorAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      window.currentUser = user;

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) window.firebaseUserDoc = snap.data();
      } catch (err) {
        console.warn("Failed to load user doc:", err);
      }
    } else {
      window.currentUser = null;
      window.firebaseUserDoc = null;
    }
  });
}

init();
