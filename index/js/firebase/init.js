// /index/js/firebase/init.js

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

let firebasePromise = null;

export function getFirebase() {
  if (firebasePromise) return firebasePromise;

  firebasePromise = (async () => {
    // Load config from Netlify function
    const res = await fetch("/.netlify/functions/firebaseConfig");
    if (!res.ok) throw new Error("Failed to load Firebase config");

    const firebaseConfig = await res.json();

    // Initialise app
    const app = getApps().length
      ? getApps()[0]
      : initializeApp(firebaseConfig);

    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);

window.onAuthStateChanged = (callback) => onAuthStateChanged(auth, callback);
    // 🔐 GLOBAL AUTH LISTENER
    onAuthStateChanged(auth, async user => {
      window.currentUser = user || null;

      if (user) {
        // Load user document
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          window.currentUserDoc = snap.exists() ? snap.data() : null;
        } catch (err) {
          console.error("Failed to load user doc:", err);
          window.currentUserDoc = null;
        }
      } else {
        window.currentUserDoc = null;
      }

      console.log("🔐 Auth state:", user ? user.uid : "guest");
    });

    return { auth, db, storage };
  })();

  return firebasePromise;
}

/* =====================================================
   ⭐ GLOBAL LOGOUT FUNCTION
===================================================== */
window.logoutUser = async function () {
  try {
    const { auth } = await getFirebase();
    await signOut(auth);

    // Clear session + globals
    sessionStorage.clear();
    localStorage.clear();
    window.currentUser = null;
    window.currentUserDoc = null;

    console.log("🚪 Logged out");

    // Return to home
    window.loadView?.("home");
  } catch (err) {
    console.error("Logout failed:", err);
  }
};
