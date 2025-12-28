// login.js
import { getFirebase } from '/index/js/firebase/init.js';
import { 
  browserLocalPersistence, 
  setPersistence, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let auth, db, storage;

const $ = id => document.getElementById(id);
const show = el => el && (el.style.display = "block");
const hide = el => el && (el.style.display = "none");

// ---------------- SESSION + IDLE LOGOUT ----------------
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
let idleTimer;

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (auth.currentUser) {
      alert("You have been logged out due to inactivity.");
      await signOut(auth);
      location.href = "/";
    }
  }, IDLE_TIMEOUT);
}

['mousemove','keydown','scroll','click','touchstart'].forEach(ev => {
  window.addEventListener(ev, resetIdleTimer, true);
});

// ---------------- LOGIN ----------------
async function loginUser() {
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  if (!email || !password) return $("loginFeedback").textContent = "Please enter email & password";

  try {
    await setPersistence(auth, browserLocalPersistence); // persist across tabs
    await signInWithEmailAndPassword(auth, email, password);
    $("loginFeedback").textContent = "";
  } catch(err) {
    console.error("Login failed:", err);
    $("loginFeedback").textContent = "Login failed: "+err.message;
  }
}

// ---------------- SIGNUP ----------------
async function signupUser() {
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;
  const isBusiness = $("isBusinessAccount").checked;

  if (!email || !password) return $("signupFeedback").textContent = "Please enter email & password";

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    // Optional: create default Firestore user doc
    const user = auth.currentUser;
    await db.collection(isBusiness ? "businesses" : "users").doc(user.uid).set({ email, createdAt: Date.now() });
    $("signupFeedback").textContent = "Account created ✅";
  } catch(err) {
    console.error("Signup failed:", err);
    $("signupFeedback").textContent = "Signup failed: "+err.message;
  }
}

// ---------------- PASSWORD RESET ----------------
async function sendResetEmail() {
  const email = $("forgotEmail").value.trim();
  if (!email) return;

  try {
    await sendPasswordResetEmail(auth, email);
    openScreen('resetConfirm'); // show confirmation modal
  } catch(err) {
    console.error("Reset failed:", err);
    alert("Password reset failed: " + err.message);
  }
}

// ---------------- LOGOUT ----------------
async function logoutUser() {
  await signOut(auth);
  location.href = "/";
}

// ---------------- INIT ----------------
getFirebase().then(fb => {
  auth = fb.auth;
  db = fb.db;
  storage = fb.storage;

  // bind buttons
  $("loginSubmit")?.addEventListener("click", loginUser);
  $("signupSubmit")?.addEventListener("click", signupUser);
  $("forgotSubmit")?.addEventListener("click", sendResetEmail);

  // auto redirect if logged in
  onAuthStateChanged(auth, user => {
    resetIdleTimer(); // start idle timer
    if (!user) return;

    // redirect logic
    if (window.location.pathname.includes("login") || window.location.pathname === "/" || window.location.pathname.includes("signup")) {
      // For business accounts, redirect to dashboard
      db.collection("businesses").doc(user.uid).get().then(docSnap => {
        if (docSnap.exists()) location.href = "/business-dashboard.html";
        else location.href = "/account"; // regular user account
      });
    }
  });
});

// ---------------- UTILITY ----------------
function openScreen(screen) {
  hide($("loginModal"));
  hide($("signupModal"));
  hide($("forgotPasswordModal"));
  hide($("resetConfirmModal"));
  show($(screen+"Modal"));
}

window.openScreen = openScreen;
window.logoutUser = logoutUser;
