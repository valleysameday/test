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
const show = el => el && (el.style.display = "block");
const hide = el => el && (el.style.display = "none");

/* ---------------- SESSION + IDLE LOGOUT ---------------- */
const IDLE_TIMEOUT = 30 * 60 * 1000;
let idleTimer;

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (auth?.currentUser) {
      await signOut(auth);
      clearSession();
      window.openScreen?.("login");
    }
  }, IDLE_TIMEOUT);
}

['mousemove','keydown','scroll','click','touchstart'].forEach(ev =>
  window.addEventListener(ev, resetIdleTimer, true)
);

/* ---------------- SESSION STATE ---------------- */
function setSession(user, type) {
  window.currentUser = user;
  window.currentAccountType = type;
}

function clearSession() {
  window.currentUser = null;
  window.currentAccountType = null;
}

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
    console.error(err);
    $("loginFeedback").textContent = err.message;
  }
}

/* ---------------- SIGNUP ---------------- */
async function signupUser() {
  const email = $("signupEmail")?.value.trim();
  const password = $("signupPassword")?.value;
  const isBusiness = $("isBusinessAccount")?.checked;

  if (!email || !password) {
    $("signupFeedback").textContent = "Missing details";
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, isBusiness ? "businesses" : "users", cred.user.uid), {
      email,
      createdAt: Date.now()
    });

    $("signupFeedback").textContent = "Account created ✅";
  } catch (err) {
    console.error(err);
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
  clearSession();
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
      clearSession();
      return;
    }

    // Detect account type
    const bizSnap = await getDoc(doc(db, "businesses", user.uid));
    const type = bizSnap.exists() ? "business" : "customer";

    setSession(user, type);

    // SPA navigation ONLY
    window.closeScreens?.();
    window.navigateToDashboard?.(type);
  });
}

/* ---------------- GLOBALS ---------------- */
window.logoutUser = logoutUser;
