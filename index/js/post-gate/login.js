// /index/js/login.js
import { getFirebase } from '/index/js/firebase/init.js';
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let auth;
const $ = id => document.getElementById(id);

let idleTimer;

/* ------------------ IDLE LOGOUT ------------------ */
function setupIdleLogout(timeoutMinutes = 30) {
  const timeoutMs = timeoutMinutes * 60 * 1000;

  function resetTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (auth.currentUser) {
        signOut(auth).then(() => {
          alert("Logged out due to inactivity");
          window.location.reload();
        });
      }
    }, timeoutMs);
  }

  ["mousemove", "keydown", "click", "touchstart"].forEach(evt => window.addEventListener(evt, resetTimer));
  resetTimer();
}

/* ------------------ LOGIN ------------------ */
async function loginUser() {
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  if (!email || !password) {
    $("loginFeedback").textContent = "Please enter email and password";
    return;
  }

  $("loginFeedback").textContent = "Logging in...";

  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    $("loginFeedback").textContent = "✅ Logged in!";
    setupIdleLogout(30); // 30 min idle logout
    // Redirect to dashboard after login
    window.location.href = "/business-dashboard.html";
  } catch (err) {
    console.error("Login failed:", err);
    if (err.code === "auth/user-not-found") $("loginFeedback").textContent = "User not found";
    else if (err.code === "auth/wrong-password") $("loginFeedback").textContent = "Incorrect password";
    else $("loginFeedback").textContent = "Login failed: " + err.message;
  }
}

/* ------------------ SIGNUP ------------------ */
async function signupUser() {
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;

  if (!email || !password) {
    $("signupFeedback").textContent = "Please enter email and password";
    return;
  }

  $("signupFeedback").textContent = "Creating account...";

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    $("signupFeedback").textContent = "✅ Account created!";
    setupIdleLogout(30);
    window.location.href = "/business-dashboard.html";
  } catch (err) {
    console.error("Signup failed:", err);
    $("signupFeedback").textContent = "Signup failed: " + err.message;
  }
}

/* ------------------ FORGOT PASSWORD ------------------ */
async function resetPassword() {
  const email = $("forgotEmail").value.trim();
  if (!email) return alert("Enter your email");

  try {
    await sendPasswordResetEmail(auth, email);
    openScreen("resetConfirm"); // Show confirmation modal
  } catch (err) {
    console.error("Password reset failed:", err);
    alert("Error sending reset email: " + err.message);
  }
}

/* ------------------ INIT ------------------ */
getFirebase().then(fb => {
  auth = fb.auth;

  // Login button
  $("loginSubmit")?.addEventListener("click", loginUser);
  $("signupSubmit")?.addEventListener("click", signupUser);
  $("forgotSubmit")?.addEventListener("click", resetPassword);

  // Auto redirect if already logged in
  onAuthStateChanged(auth, user => {
    if (user) {
      setupIdleLogout(30);
      if (window.location.pathname.includes("/login.html") || window.location.pathname.includes("/index.html")) {
        window.location.href = "/business-dashboard.html";
      }
    }
  });
});
