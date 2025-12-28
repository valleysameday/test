import { getFirebase } from "/index/js/firebase/init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export function initLogin() {
  const loginBtn = document.getElementById("loginSubmit");
  const feedback = document.getElementById("loginFeedback");
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");

  function showFeedback(message, type = "info") {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `feedback-text ${type}`;
  }

  loginBtn?.addEventListener("click", async () => {
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
      showFeedback("⚠️ Please enter both email and password.", "error");
      return;
    }

    loginBtn.disabled = true;
    showFeedback("⏳ Logging in…", "loading");

    try {
      const { auth, db } = await getFirebase();

      // Log out previous user first
      if (auth.currentUser) {
        await signOut(auth);
        window.currentUser = null;
        window.firebaseUserDoc = null;
      }

      // ✅ Modular API usage
      const cred = await signInWithEmailAndPassword(auth, email, password);
      window.currentUser = cred.user;

      const userDocSnap = await getDoc(doc(db, "users", cred.user.uid));
      if (!userDocSnap.exists()) {
        showFeedback("❌ User record not found. Contact support.", "error");
        loginBtn.disabled = false;
        return;
      }

      window.firebaseUserDoc = userDocSnap.data();

      showFeedback(
        `✅ Welcome back, ${window.firebaseUserDoc.name || "there"}! Redirecting…`,
        "success"
      );

      setTimeout(() => {
        window.closeScreens?.();
        if (typeof window.navigateToDashboard === "function") {
          window.navigateToDashboard();
        }
        loginBtn.disabled = false;
        emailInput.value = "";
        passwordInput.value = "";
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
      loginBtn.disabled = false;
    }
  });
}
