// /views/dashboard.js
console.log("📊 dashboard.js loaded");

import { getFirebase } from "/index/js/firebase/init.js";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  updateEmail,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { boostPost } from "/index/js/boosting.js";
import * as Messaging from "/index/js/messaging.js";
import { getFollowerCount } from "/index/js/social/follow.js";

/* =====================================================
   STATE
===================================================== */
let currentEditAdId = null;

/* =====================================================
   INIT
===================================================== */
export async function init() {
  const { auth } = await getFirebase();
  if (!auth.currentUser) return;

  await initProfile();
  initDashboardNav();
  initSettings();
  initEditModal();
  initBoostModal();
  await initMessaging();

  await loadMyAds();
  await loadSaved();
  await loadBusinessListingStatus();

  showSection("myAds");
}

/* =====================================================
   PROFILE
===================================================== */
async function initProfile() {
  const user = window.currentUser;
  const userDoc = window.currentUserDoc;

  document.getElementById("dashUserName")?.textContent = userDoc?.firstName || "";
  document.getElementById("profileName")?.textContent = userDoc?.firstName || "";
  document.getElementById("profileEmail")?.textContent = user?.email || "";

  if (user?.metadata?.creationTime) {
    document.getElementById("profileSince").textContent =
      new Date(user.metadata.creationTime).toLocaleDateString("en-GB");
  }

  if (user?.uid) {
    try {
      document.getElementById("profileFollowers").textContent =
        await getFollowerCount(user.uid);
    } catch {
      document.getElementById("profileFollowers").textContent = "0";
    }
  }
}

/* =====================================================
   NAV
===================================================== */
function initDashboardNav() {
  document.querySelectorAll(".dash-card").forEach(card => {
    const section = card.dataset.section;
    if (section) card.onclick = () => showSection(section);
  });

  document.getElementById("dashMessagesCard")?.addEventListener("click", () => {
    window.loadView("messages");
  });

  document.getElementById("dashViewProfile")?.addEventListener("click", () => {
    window.selectedSellerId = window.currentUser.uid;
    window.loadView("seller-profile");
  });

  document.getElementById("dashLogout")?.addEventListener("click", () => {
    window.logoutUser?.();
  });
}

/* =====================================================
   SETTINGS
===================================================== */
function initSettings() {
  const form = document.getElementById("settingsForm");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const name = document.getElementById("settingsName").value.trim();
    const email = document.getElementById("settingsEmail").value.trim();
    const feedback = document.getElementById("settingsFeedback");

    if (!name || !email) {
      feedback.textContent = "Name and email required.";
      return;
    }

    const { auth, db } = await getFirebase();
    const user = auth.currentUser;

    if (email !== user.email) {
      await updateEmail(user, email);
    }

    await updateDoc(doc(db, "users", user.uid), {
      firstName: name,
      email
    });

    window.currentUserDoc.firstName = name;
    window.currentUserDoc.email = email;

    feedback.textContent = "Saved ✓";
  });

  document
    .getElementById("settingsResetPassword")
    ?.addEventListener("click", async () => {
      const { auth } = await getFirebase();
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      document.getElementById("settingsFeedback").textContent =
        "Password reset email sent ✓";
    });
}

/* =====================================================
   MY ADS
===================================================== */
async function loadMyAds() {
  const container = document.getElementById("myAdsList");
  if (!container) return;

  container.innerHTML = "Loading…";

  const { db } = await getFirebase();
  const q = query(
    collection(db, "posts"),
    where("sellerId", "==", window.currentUser.uid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  if (snap.empty) {
    container.innerHTML = "<p>No ads yet.</p>";
    return;
  }

  container.innerHTML = "";
  snap.forEach(docSnap => {
    const post = docSnap.data();
    const el = document.createElement("div");
    el.className = "dash-ad";

    el.innerHTML = `
      <h4>${escapeHtml(post.title)}</h4>
      <p>${escapeHtml(post.description || "")}</p>

      <div class="dash-ad-actions">
        <button data-edit>✏️ Edit</button>
        <button data-delete>🗑 Delete</button>
        <button data-boost>🚀 Boost</button>
      </div>
    `;

    el.querySelector("[data-edit]").onclick = () =>
      openEditModal(docSnap.id, post);

    el.querySelector("[data-delete]").onclick = async () => {
      if (!confirm("Delete this ad?")) return;
      await deleteDoc(doc(db, "posts", docSnap.id));
      loadMyAds();
    };

    el.querySelector("[data-boost]").onclick = () =>
      openBoostModal(docSnap.id);

    container.appendChild(el);
  });
}

/* =====================================================
   SAVED ADS
===================================================== */
async function loadSaved() {
  const container = document.getElementById("savedAdsList");
  if (!container) return;

  container.innerHTML = "Loading…";

  const { db } = await getFirebase();
  const q = query(
    collection(db, "saved"),
    where("userId", "==", window.currentUser.uid)
  );

  const snap = await getDocs(q);
  if (snap.empty) {
    container.innerHTML = "<p>No saved ads.</p>";
    return;
  }

  container.innerHTML = "";
  for (const s of snap.docs) {
    const postRef = doc(db, "posts", s.data().postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) continue;

    const post = postSnap.data();
    const el = document.createElement("div");
    el.className = "dash-ad";
    el.innerHTML = `<h4>${escapeHtml(post.title)}</h4>`;
    container.appendChild(el);
  }
}

/* =====================================================
   BUSINESS LISTING
===================================================== */
async function loadBusinessListingStatus() {
  const badge = document.getElementById("businessStatus");
  if (!badge) return;

  const { db } = await getFirebase();
  const ref = doc(db, "businesses", window.currentUser.uid);
  const snap = await getDoc(ref);

  badge.textContent = snap.exists() ? "Active" : "Not listed";
}

/* =====================================================
   EDIT MODAL
===================================================== */
function initEditModal() {
  document.getElementById("editCancel")?.addEventListener("click", closeEditModal);

  document
    .getElementById("editAdForm")
    ?.addEventListener("submit", async e => {
      e.preventDefault();
      if (!currentEditAdId) return;

      const { db } = await getFirebase();

      await updateDoc(doc(db, "posts", currentEditAdId), {
        title: document.getElementById("editTitle").value.trim(),
        description: document.getElementById("editDescription").value.trim(),
        price: Number(document.getElementById("editPrice").value) || null,
        area: document.getElementById("editArea").value.trim() || null
      });

      closeEditModal();
      loadMyAds();
    });
}

function openEditModal(id, post) {
  currentEditAdId = id;
  document.getElementById("editTitle").value = post.title || "";
  document.getElementById("editDescription").value = post.description || "";
  document.getElementById("editPrice").value = post.price || "";
  document.getElementById("editArea").value = post.area || "";
  document.getElementById("editAdModal").classList.remove("hidden");
}

function closeEditModal() {
  currentEditAdId = null;
  document.getElementById("editAdModal")?.classList.add("hidden");
}

/* =====================================================
   BOOST MODAL
===================================================== */
function initBoostModal() {
  const modal = document.getElementById("boostModal");
  if (!modal) return;

  modal.querySelectorAll("[data-boost-size]").forEach(btn => {
    btn.onclick = async () => {
      await boostPost(modal.dataset.postId, btn.dataset.boostSize);
      modal.classList.add("hidden");
      loadMyAds();
    };
  });

  modal
    .querySelector(".boost-cancel-btn")
    ?.addEventListener("click", () => modal.classList.add("hidden"));
}

function openBoostModal(postId) {
  const modal = document.getElementById("boostModal");
  modal.dataset.postId = postId;
  modal.classList.remove("hidden");
}

/* =====================================================
   MESSAGING
===================================================== */
async function initMessaging() {
  await Messaging.initMessaging();
  updateMessageDot(await Messaging.getUnreadCount());

  window.addEventListener("messagesUpdated", async () => {
    updateMessageDot(await Messaging.getUnreadCount());
  });
}

function updateMessageDot(count) {
  document
    .getElementById("messagesNotifDot")
    ?.classList.toggle("hidden", count === 0);
}

/* =====================================================
   UTIL
===================================================== */
function showSection(id) {
  document.querySelectorAll(".dash-section").forEach(s =>
    s.classList.add("hidden")
  );
  document.getElementById(id)?.classList.remove("hidden");
  window.scrollTo({ top: 0 });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
