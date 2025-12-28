// /index/js/login.js
import { getFirebase } from "/index/js/firebase/init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const loginBtn = document.getElementById("loginBtn");
const feedback = document.getElementById("loginFeedback");
const emailInput = document.getElementById("loginEmail");
const passwordInput = document.getElementById("loginPassword");

// Helper to show inline feedback
function showFeedback(message, type = "info") {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `login-feedback ${type}`;
}

// Clear feedback when user starts typing
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

    // Sign in with Firebase Auth
    const cred = await auth.signInWithEmailAndPassword(email, password);
    window.currentUser = cred.user;

    // Fetch user document from Firestore
    const userDocSnap = await getDoc(doc(db, "users", cred.user.uid));
    if (!userDocSnap.exists()) {
      showFeedback("❌ User record not found. Contact support.", "error");
      return;
    }

    window.firebaseUserDoc = userDocSnap.data();

    // Show success and redirect
    showFeedback(`✅ Welcome back, ${window.firebaseUserDoc.name || "there"}! Redirecting…`, "success");

    setTimeout(() => {
      window.closeScreens?.(); // Close login modal
      if (typeof window.navigateToDashboard === "function") {
        window.navigateToDashboard(); // Load the correct dashboard
      }
    }, 800);

  } catch (err) {
    console.error("Login failed:", err);

    let message = "❌ Login failed. Please try again.";

    switch (err.code) {
      case "auth/wrong-password":
        message = "❌ Wrong password. Check and try again.";
        break;
      case "auth/user-not-found":
        message = "❌ No account found with this email.";
        break;
      case "auth/too-many-requests":
        message = "⚠️ Too many attempts. Try again later.";
        break;
      case "auth/invalid-email":
        message = "❌ That doesn't look like a valid email.";
        break;
    }

    showFeedback(message, "error");
  }
});
