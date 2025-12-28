import { getFirebase } from "/index/js/firebase/init.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let auth, db;

export function initLogin() {
  const form = document.getElementById("loginForm");
  const feedback = document.getElementById("loginFeedback");
  if (!form) return;

  getFirebase().then(fb => {
    auth = fb.auth;
    db = fb.db;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;

    feedback.textContent = "Logging in…";

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // Fetch user doc
      const userSnap = await getDoc(doc(db, "users", cred.user.uid));
      const userDoc = userSnap.exists() ? userSnap.data() : {};

      window.currentUser = cred.user;
      window.firebaseUserDoc = userDoc;

      feedback.textContent = "✅ Logged in!";
      window.closeScreens?.();

      // Automatically go to dashboard
      window.navigateToDashboard?.();
    } catch (err) {
      console.error(err);
      feedback.textContent = "❌ Invalid login credentials";
    }
  });
}
