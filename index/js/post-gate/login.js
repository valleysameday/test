// index/js/post-gate/login.js
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
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
    if (auth?.currentUser) {
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
    await setPersistence(auth, browserLocalPersistence);
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userData = { email, createdAt: Date.now() };
    await setDoc(doc(db, isBusiness ? "businesses" : "users", user.uid), userData);

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
    openScreen('resetConfirm');
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
export async function initLogin() {
  const fb = await getFirebase();
  auth = fb.auth;
  db = fb.db;
  storage = fb.storage;

  // bind buttons
  $("loginSubmit")?.addEventListener("click", loginUser);
  $("signupSubmit")?.addEventListener("click", signupUser);
  $("forgotSubmit")?.addEventListener("click", sendResetEmail);

  // auto redirect if logged in
  onAuthStateChanged(auth, async user => {
    resetIdleTimer();
    if (!user) return;

    const businessSnap = await getDoc(doc(db, "businesses", user.uid));
    if (businessSnap.exists()) location.href = "/business-dashboard.html";
    else location.href = "/customer-dashboard.html"; // regular user dashboard
  });
}

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
