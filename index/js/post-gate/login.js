import { getFirebase } from "/index/js/firebase/init.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let auth;

export function initLogin() {
  console.log("🔑 Login module init");

  if (auth) return; // already initialized

  getFirebase().then(fb => {
    auth = fb.auth;

    // Monitor auth state
    onAuthStateChanged(auth, async user => {
      window.currentUser = user || null;

      if (user) {
        // Load user doc from Firestore if needed
        try {
          const db = fb.db;
          const docSnap = await db.collection("users").doc(user.uid).get();
          window.firebaseUserDoc = docSnap.exists ? docSnap.data() : null;
        } catch (e) {
          console.warn("Failed to load user doc", e);
        }
      } else {
        window.firebaseUserDoc = null;
      }
    });
  });

  const loginForm = document.getElementById("loginForm");
  const feedback = document.getElementById("loginFeedback");

  loginForm?.addEventListener("submit", async e => {
    e.preventDefault();

    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;

    if (!email || !password) {
      feedback.textContent = "❌ Fill in email and password.";
      return;
    }

    feedback.textContent = "Logging in…";

    try {
      await signInWithEmailAndPassword(auth, email, password);
      feedback.textContent = "✅ Logged in!";
      setTimeout(() => {
        window.closeScreens(); // close login modal
        if (typeof window.navigateToDashboard === "function") {
          window.navigateToDashboard();
        }
      }, 500);
    } catch (err) {
      console.error(err);
      feedback.textContent = "❌ Login failed. Check credentials.";
    }
  });
}
