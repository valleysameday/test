// /index/js/dashboard/business.js

import { getFirebase } from "/index/js/firebase/init.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let db;
let initialised = false;

export async function initBusiness() {
  if (initialised) return;
  initialised = true;

  const fb = await getFirebase();
  db = fb.db;

  await loadBusiness();
}

async function loadBusiness() {
  const container = document.getElementById("businessOverview");
  if (!container) return;

  container.innerHTML = "Loading your business…";

  const userId = window.currentUser?.uid;
  if (!userId) {
    container.innerHTML = "<p>Please log in.</p>";
    return;
  }

  const q = query(
    collection(db, "businesses"),
    where("ownerId", "==", userId)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    renderBusinessExplainer(container);
  } else {
    renderBusinessDashboard(container, snap.docs[0].data());
  }
}

/* ================= EXPLAINER ================= */

function renderBusinessExplainer(container) {
  container.innerHTML = `
    <div class="business-explainer">
      <h4>Add your business – free</h4>

      <p>
        List your local business on Rhondda Noticeboard so people nearby
        can find and contact you easily.
      </p>

      <ul class="explainer-points">
        <li>📍 Show up in local searches</li>
        <li>💬 Get messages directly from customers</li>
        <li>📢 Promote services without posting ads</li>
        <li>⭐ Build visibility in your area</li>
      </ul>

      <p class="explainer-note">
        Creating a business listing is completely free.
        Optional boosts are available if you ever want more exposure.
      </p>

      <button id="createBusinessBtn" class="primary-btn">
        Add my business
      </button>
    </div>
  `;

  document
    .getElementById("createBusinessBtn")
    ?.addEventListener("click", () => {
      window.loadView?.("create-business");
    });
}

/* ================= DASHBOARD (TEMP PLACEHOLDER) ================= */

function renderBusinessDashboard(container, business) {
  container.innerHTML = `
    <div class="business-card">
      <h4>${business.name || "My Business"}</h4>
      <p>📍 ${business.area || "Rhondda"}</p>

      <p class="muted">
        Business dashboard coming soon.
      </p>
    </div>
  `;
}
