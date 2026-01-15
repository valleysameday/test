// /index/js/firebase/init.js

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

let firebasePromise = null;

export function getFirebase() {
  if (firebasePromise) return firebasePromise;

 import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

window.logoutUser = async function () {
  try {
    const { auth } = await getFirebase();
    await signOut(auth);

    // Clear session data
    sessionStorage.clear();
    localStorage.clear();

    // Reset globals
    window.currentUser = null;
    window.currentUserDoc = null;

    // Go back to home
    window.loadView?.("home");
  } catch (err) {
    console.error("Logout failed:", err);
  }
};
  
  firebasePromise = (async () => {
    const res = await fetch('/.netlify/functions/firebaseConfig');
    if (!res.ok) throw new Error("Failed to load Firebase config");

    const firebaseConfig = await res.json();

    const app = getApps().length
      ? getApps()[0]
      : initializeApp(firebaseConfig);

    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);

    // 🔐 GLOBAL AUTH LISTENER
    onAuthStateChanged(auth, user => {
      window.currentUser = user || null;
      console.log("🔐 Auth state set:", user ? user.uid : "guest");
    });

    return { auth, db, storage };
  })();

  return firebasePromise;
}
