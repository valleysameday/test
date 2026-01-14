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

let auth, db;
let initialised = false;

const $ = id => document.getElementById(id);

/* ---------------- SESSION + IDLE LOGOUT ---------------- */
const IDLE_TIMEOUT = 30 * 60 * 1000;
let idleTimer;

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (auth?.currentUser) {
      await signOut(auth);
      window.currentUser = null;
      window.currentUserDoc = null;
      window.openScreen?.("login");
    }
  }, IDLE_TIMEOUT);
}

['mousemove','keydown','scroll','click','touchstart'].forEach(ev =>
  window.addEventListener(ev, resetIdleTimer, true)
);

/* ---------------- LOGIN ---------------- */
async function loginUser() {
  const email = $("loginEmail")?.value.trim();
  const password = $("loginPassword")?.value;

  if (!email || !password) {
    $("loginFeedback").textContent = "Please enter email & password";
    return;
  }

  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    $("loginFeedback").textContent = "Logging you in…";
  } catch (err) {
    $("loginFeedback").textContent = err.message;
  }
}

/* ---------------- SIGNUP ---------------- */
async function signupUser() {
  const firstName = $("signupFirstName")?.value.trim();
  const email = $("signupEmail")?.value.trim();
  const password = $("signupPassword")?.value;

  if (!firstName || !email || !password) {
    $("signupFeedback").textContent = "Please complete all fields";
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      firstName,
      email,
      createdAt: Date.now()
    });

    $("signupFeedback").textContent = "Account created ✅";
  } catch (err) {
    $("signupFeedback").textContent = err.message;
  }
}

/* ---------------- PASSWORD RESET ---------------- */
async function sendResetEmail() {
  const email = $("forgotEmail")?.value.trim();
  if (!email) return;

  try {
    await sendPasswordResetEmail(auth, email);
    window.openScreen?.("resetConfirm");
  } catch (err) {
    alert(err.message);
  }
}

/* ---------------- LOGOUT ---------------- */
async function logoutUser() {
  await signOut(auth);
  window.currentUser = null;
  window.currentUserDoc = null;
  window.openScreen?.("login");
}

/* ---------------- INIT ---------------- */
export async function initLogin() {
  if (initialised) return;
  initialised = true;

  const fb = await getFirebase();
  auth = fb.auth;
  db = fb.db;

  $("loginSubmit")?.addEventListener("click", loginUser);
  $("signupSubmit")?.addEventListener("click", signupUser);
  $("forgotSubmit")?.addEventListener("click", sendResetEmail);

  onAuthStateChanged(auth, async user => {
    resetIdleTimer();

    if (!user) {
      window.currentUser = null;
      window.currentUserDoc = null;
      return;
    }

    window.currentUser = user;

    // Load user profile
    const snap = await getDoc(doc(db, "users", user.uid));
    window.currentUserDoc = snap.exists() ? snap.data() : null;

    // Close modal and go to dashboard/home
    window.closeScreens?.();
    window.navigateToDashboard?.();
  });
}

/* ---------------- GLOBALS ---------------- */
window.logoutUser = logoutUser;
