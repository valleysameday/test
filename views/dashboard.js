// /views/dashboard.js

import { getFirebase } from "/index/js/firebase/init.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  updateEmail,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { boostPost } from "/index/js/boosting.js";
import { featureFlags } from "/index/js/featureFlags.js";
import * as Messaging from "/index/js/messaging.js";
import { getFollowerCount } from "/index/js/social/follow.js";

let currentEditAdId = null;

/* ================= INIT ================= */
export async function init() {
  const user = window.currentUser;
  const userDoc = window.currentUserDoc;

  /* PROFILE INFO */
  const dashUserName = document.getElementById("dashUserName");
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const profileSince = document.getElementById("profileSince");
  const followersEl = document.getElementById("profileFollowers");

  if (userDoc?.firstName) {
    if (dashUserName) dashUserName.textContent = userDoc.firstName;
    if (profileName) profileName.textContent = userDoc.firstName;
  }

  if (user?.email && profileEmail) {
    profileEmail.textContent = user.email;
  }

  if (user?.metadata?.creationTime && profileSince) {
    profileSince.textContent = new Date(
      user.metadata.creationTime
    ).toLocaleDateString("en-GB");
  }

  if (user?.uid && followersEl) {
    try {
      followersEl.textContent = await getFollowerCount(user.uid);
    } catch {
      followersEl.textContent = "0";
    }
  }

  /* DASHBOARD CARD NAV */
  document.querySelectorAll(".dash-card").forEach(card => {
    const section = card.dataset.section;
    if (section) {
      card.onclick = () => showSection(section);
    }
  });

  document.getElementById("dashMessagesCard")?.addEventListener("click", () => {
    window.loadView("messages");
  });

  document.getElementById("dashViewProfile")?.addEventListener("click", () => {
    if (!user?.uid) return;
    window.selectedSellerId = user.uid;
    window.loadView("seller-profile");
  });

  document.getElementById("dashLogout")?.addEventListener("click", () => {
    window.logoutUser?.();
  });

  /* SETTINGS */
  document.getElementById("settingsForm")?.addEventListener("submit", onSaveSettings);
  document
    .getElementById("settingsResetPassword")
    ?.addEventListener("click", onResetPassword);

  /* EDIT MODAL */
  document.getElementById("editCancel")?.addEventListener("click", closeEditModal);
  document.getElementById("editAdForm")?.addEventListener("submit", onSaveEditAd);

  /* BOOST MODAL */
  const boostModal = document.getElementById("boostModal");
  if (boostModal) {
    boostModal.querySelectorAll("button[data-boost-size]").forEach(btn => {
      btn.onclick = async () => {
        const postId = boostModal.dataset.postId;
        const size = btn.dataset.boostSize;
        if (!postId || !size) return;

        const success = await boostPost(postId, size);
        alert(
          success
            ? `Your post has been boosted for ${btn.dataset.boostDays} day(s)!`
            : "Boost failed or cancelled."
        );

        closeBoostModal();
        loadMyAds();
      };
    });

    boostModal
      .querySelector(".boost-cancel-btn")
      ?.addEventListener("click", closeBoostModal);
  }

  /* MESSAGING */
  await Messaging.initMessaging();
  updateMessagesDot(await Messaging.getUnreadCount());

  window.addEventListener("messagesUpdated", async () => {
    updateMessagesDot(await Messaging.getUnreadCount());
  });

  /* LOAD DATA */
  await loadMyAds();
  await loadBusinessListingStatus();

  showSection("myAds");
}

/* ================= BUSINESS LISTING ================= */
async function loadBusinessListingStatus() {
  const card = document.getElementById("dashBusinessCard");
  const statusEl = document.getElementById("dashBusinessStatus");
  if (!card || !statusEl) return;

  const { db } = await getFirebase();
  const uid = window.currentUser?.uid;
  if (!uid) return;

  const q = query(collection(db, "services"), where("ownerId", "==", uid));
  const snap = await getDocs(q);

  if (snap.empty) {
    card.classList.add("hidden");
    return;
  }

  const svc = snap.docs[0].data();
  const svcId = snap.docs[0].id;

  card.classList.remove("hidden");

  statusEl.textContent =
    svc.status === "pending"
      ? "Pending approval"
      : svc.status === "needs-update"
      ? "Needs update"
      : svc.isActive
      ? "Live"
      : "Inactive";

  card.onclick = () => {
    sessionStorage.setItem("serviceId", svcId);
    window.loadView("view-service");
  };
}

/* ================= UNREAD DOT ================= */
function updateMessagesDot(unread) {
  const dot = document.getElementById("messagesNotifDot");
  if (!dot) return;
  dot.classList.toggle("hidden", unread === 0);
}

/* ================= SECTIONS ================= */
function showSection(id) {
  document.querySelectorAll(".dash-section").forEach(sec => {
    sec.classList.add("hidden");
  });
  document.getElementById(id)?.classList.remove("hidden");

  if (id === "saved") loadSaved();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ================= MY ADS ================= */
async function loadMyAds() {
  const listEl = document.getElementById("myAdsList");
  const statsEl = document.getElementById("myAdsStats");
  if (!listEl || !statsEl) return;

  listEl.textContent = "Loading…";

  const { db } = await getFirebase();
  const uid = window.currentUser?.uid;
  if (!uid) {
    listEl.textContent = "Not logged in.";
    return;
  }

  const q = query(
    collection(db, "posts"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  if (snap.empty) {
    listEl.textContent = "You haven't posted anything yet.";
    statsEl.textContent = "";
    return;
  }

  let totalViews = 0;
  let html = "";
  const now = Date.now();

  snap.forEach(docSnap => {
    const p = docSnap.data();
    const views = p.views || 0;
    totalViews += views;

    const created = p.createdAt?.toDate
      ? p.createdAt.toDate().toLocaleDateString("en-GB")
      : "";

    const isExpired = !p.isActive || p.status === "expired";
    const boostEndMs = p.boostEnd?.toMillis?.() ?? p.boostEnd;
    const isBoosted = p.isBoosted && boostEndMs && boostEndMs > now;

    html += `
      <div class="my-ad-item ${isExpired ? "expired" : ""}" data-id="${docSnap.id}">
        <div class="my-ad-top">
          <span class="my-ad-title">${escapeHtml(p.title || "Untitled")}</span>
          ${isExpired ? `<span class="ad-badge expired-badge">Expired</span>` : ""}
          ${isBoosted ? `<span class="ad-badge boosted-badge">Boosted</span>` : ""}
        </div>
        <div class="my-ad-meta">
          ${escapeHtml(p.area || "Rhondda")} · ${views} views ${created ? "· " + created : ""}
        </div>
        <div class="my-ad-actions">
          <button data-action="view">View</button>
          ${isExpired ? `<button data-action="renew">Renew</button>` : ""}
          <button data-action="edit">Edit</button>
          <button data-action="delete">Delete</button>
          ${featureFlags.boostingEnabled ? `<button data-action="boost">Boost</button>` : ""}
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
  statsEl.textContent = `Total ads: ${snap.size} · Total views: ${totalViews}`;

  listEl.querySelectorAll(".my-ad-item").forEach(item => {
    item.onclick = e => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      handleAdAction(btn.dataset.action, item.dataset.id);
    };
  });
}

/* ================= SAVED ================= */
async function loadSaved() {
  const listEl = document.getElementById("savedList");
  if (!listEl) return;

  listEl.textContent = "Loading…";

  const { db } = await getFirebase();
  const uid = window.currentUser?.uid;
  if (!uid) return;

  const snap = await getDocs(collection(db, "users", uid, "saved"));
  if (snap.empty) {
    listEl.textContent = "You haven't saved anything yet.";
    return;
  }

  let html = "";
  for (const s of snap.docs) {
    const postSnap = await getDoc(doc(db, "posts", s.id));
    if (!postSnap.exists()) continue;
    const p = postSnap.data();

    html += `
      <div class="my-ad-item" data-id="${s.id}">
        <div class="my-ad-title">${escapeHtml(p.title)}</div>
        <div class="my-ad-actions">
          <button data-action="view">View</button>
          <button data-action="unsave">Unsave</button>
        </div>
      </div>
    `;
  }

  listEl.innerHTML = html;

  listEl.querySelectorAll(".my-ad-item").forEach(item => {
    item.onclick = e => {
      const btn = e.target.closest("button");
      if (!btn) return;

      if (btn.dataset.action === "view") {
        sessionStorage.setItem("viewPostId", item.dataset.id);
        window.loadView("view-post");
      }
      if (btn.dataset.action === "unsave") unsaveItem(item.dataset.id);
    };
  });
}

/* ================= ACTIONS ================= */
function handleAdAction(action, id) {
  if (action === "view") {
    sessionStorage.setItem("viewPostId", id);
    window.loadView("view-post");
  }
  if (action === "renew") renewAd(id);
  if (action === "edit") openEditModal(id);
  if (action === "delete" && confirm("Delete this ad?")) deleteAd(id);
  if (action === "boost") openBoostModal(id);
}

/* ================= CRUD ================= */
async function renewAd(id) {
  const { db } = await getFirebase();
  await updateDoc(doc(db, "posts", id), {
    isActive: true,
    status: "active",
    expiresAt: Date.now() + 21 * 86400000
  });
  loadMyAds();
}

async function deleteAd(id) {
  const { db } = await getFirebase();
  await deleteDoc(doc(db, "posts", id));
  loadMyAds();
}

async function unsaveItem(id) {
  const { db } = await getFirebase();
  await deleteDoc(doc(db, "users", window.currentUser.uid, "saved", id));
  loadSaved();
}

/* ================= BOOST ================= */
function openBoostModal(id) {
  if (!featureFlags.boostingEnabled) return;
  const modal = document.getElementById("boostModal");
  if (!modal) return;
  modal.dataset.postId = id;
  modal.classList.remove("hidden");
}

function closeBoostModal() {
  const modal = document.getElementById("boostModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.dataset.postId = "";
}

/* ================= EDIT ================= */
const editTitle = document.getElementById("editTitle");
const editDescription = document.getElementById("editDescription");
const editPrice = document.getElementById("editPrice");
const editArea = document.getElementById("editArea");
const editFeedback = document.getElementById("editFeedback");
const editAdModal = document.getElementById("editAdModal");

async function openEditModal(id) {
  currentEditAdId = id;
  const { db } = await getFirebase();
  const snap = await getDoc(doc(db, "posts", id));
  if (!snap.exists()) return;
  const p = snap.data();

  editTitle.value = p.title || "";
  editDescription.value = p.description || "";
  editPrice.value = p.price ?? "";
  editArea.value = p.area || "";
  editFeedback.textContent = "";
  editAdModal.classList.remove("hidden");
}

function closeEditModal() {
  currentEditAdId = null;
  editAdModal.classList.add("hidden");
}

async function onSaveEditAd(e) {
  e.preventDefault();
  if (!currentEditAdId) return;

  const { db } = await getFirebase();
  await updateDoc(doc(db, "posts", currentEditAdId), {
    title: editTitle.value.trim(),
    description: editDescription.value.trim(),
    price: editPrice.value ? Number(editPrice.value) : null,
    area: editArea.value.trim() || null
  });

  editFeedback.textContent = "Saved ✓";
  setTimeout(() => {
    closeEditModal();
    loadMyAds();
  }, 400);
}

/* ================= SETTINGS ================= */
const settingsName = document.getElementById("settingsName");
const settingsEmail = document.getElementById("settingsEmail");
const settingsFeedback = document.getElementById("settingsFeedback");

async function onSaveSettings(e) {
  e.preventDefault();
  const { db, auth } = await getFirebase();
  const user = auth.currentUser;
  if (!user) return;

  if (settingsEmail.value !== user.email) {
    await updateEmail(user, settingsEmail.value);
  }

  await updateDoc(doc(db, "users", user.uid), {
    firstName: settingsName.value.trim(),
    email: settingsEmail.value.trim()
  });

  settingsFeedback.textContent = "Updated ✓";
}

async function onResetPassword() {
  const { auth } = await getFirebase();
  if (!auth.currentUser?.email) return;
  await sendPasswordResetEmail(auth, auth.currentUser.email);
  settingsFeedback.textContent = "Reset email sent ✓";
}

/* ================= HELPERS ================= */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
                             }
