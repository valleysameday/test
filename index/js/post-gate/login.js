import { getFirebase } from "/index/js/firebase/init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export function initLogin() {
  const loginBtn = document.getElementById("loginBtn");
  const feedback = document.getElementById("loginFeedback");
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");

  function showFeedback(message, type = "info") {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `login-feedback ${type}`;
  }

  // Clear feedback when typing
  [emailInput, passwordInput].forEach(input => {
    input?.addEventListener("input", () => showFeedback("", "info"));
  });

  loginBtn?.addEventListener("click", async () => {
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
      showFeedback("⚠️ Please enter both email and password.", "error");
      return;
    }

    showFeedback("⏳ Logging in…", "loading");

    try {
      const { auth, db } = await getFirebase();

      // Log out previous user first to avoid wrong dashboard
      if (auth.currentUser) {
        await auth.signOut();
        window.currentUser = null;
        window.firebaseUserDoc = null;
      }

      // Sign in
      const cred = await auth.signInWithEmailAndPassword(email, password);
      window.currentUser = cred.user;

      // Get user document
      const userDocSnap = await getDoc(doc(db, "users", cred.user.uid));
      if (!userDocSnap.exists()) {
        showFeedback("❌ User record not found. Contact support.", "error");
        return;
      }

      window.firebaseUserDoc = userDocSnap.data();

      showFeedback(
        `✅ Welcome back, ${window.firebaseUserDoc.name || "there"}! Redirecting…`,
        "success"
      );

      // Close modal and navigate to dashboard
      setTimeout(() => {
        window.closeScreens?.();

        // Ensure correct dashboard is loaded
        if (typeof window.navigateToDashboard === "function") {
          window.navigateToDashboard();
        }
      }, 800);

    } catch (err) {
      console.error("Login failed:", err);
      let message = "❌ Login failed. Please try again.";

      switch (err.code) {
        case "auth/wrong-password": message = "❌ Wrong password. Try again."; break;
        case "auth/user-not-found": message = "❌ No account found with this email."; break;
        case "auth/too-many-requests": message = "⚠️ Too many attempts. Try later."; break;
        case "auth/invalid-email": message = "❌ Invalid email format."; break;
      }

      showFeedback(message, "error");
    }
  });
}
