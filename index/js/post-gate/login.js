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

  const postcodeArea = $("signupPostcodeArea")?.value
    ?.toUpperCase()
    .replace(/\s+/g, "");

  const ALLOWED_AREAS = [
    "CF14","CF15","CF32","CF34","CF35","CF37","CF38","CF39",
    "CF40","CF41","CF42","CF43","CF44","CF45","CF46","CF47",
    "CF48","CF71","CF72","CF82","CF83","SA11"
  ];

  if (!firstName || !email || !password) {
    $("signupFeedback").textContent = "Please complete all fields";
    return;
  }

  if (!postcodeArea) {
    $("signupFeedback").textContent =
      "Please enter the first part of your postcode (e.g. CF39)";
    return;
  }

  if (!ALLOWED_AREAS.includes(postcodeArea)) {
    $("signupFeedback").textContent =
      "Sorry — we're  only a local site available within ~10 miles of the Rhondda.";
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

    const snap = await getDoc(doc(db, "users", user.uid));
    window.currentUserDoc = snap.exists() ? snap.data() : null;

    window.closeScreens?.();

    if (window.loginRedirect === "dashboard") {
      window.navigateToDashboard();
      window.initDashboard?.();
    } else if (window.loginRedirect === "post") {
      openScreen("post");
    }
  });
}

/* ---------------- GLOBALS ---------------- */
window.logoutUser = logoutUser;
