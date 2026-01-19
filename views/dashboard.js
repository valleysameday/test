import { getFirebase } from "/index/js/firebase/init.js";
import {
  collection,
  query,
  getDoc,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  updateEmail,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import * as Messaging from "/views/messaging.js";
import { getFollowerCount } from "/index/js/social/follow.js";

let currentEditAdId = null;

/* ================= INIT ================= */
export async function init() {
  const nameEl = document.getElementById("dashUserName");
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const profileSince = document.getElementById("profileSince");
  const followersEl = document.getElementById("profileFollowers");

  if (window.currentUserDoc?.firstName) {
    nameEl.textContent = window.currentUserDoc.firstName;
    profileName.textContent = window.currentUserDoc.firstName;
  }

  if (window.currentUser?.email) {
    profileEmail.textContent = window.currentUser.email;
  }

  if (window.currentUser?.metadata?.creationTime) {
    const d = new Date(window.currentUser.metadata.creationTime);
    profileSince.textContent = d.toLocaleDateString("en-GB");
  }

  /* ✅ FOLLOWER COUNT (shared logic) */
  if (window.currentUser?.uid && followersEl) {
    try {
      const count = await getFollowerCount(window.currentUser.uid);
      followersEl.textContent = count;
    } catch (err) {
      console.error("Follower count failed:", err);
      followersEl.textContent = "0";
    }
  }

  document.querySelectorAll(".dash-card").forEach(card => {
    card.addEventListener("click", () => {
      showSection(card.dataset.section);
    });
  });

  document.getElementById("dashLogout")
    ?.addEventListener("click", () => window.logoutUser?.());

  document.getElementById("settingsForm")
    ?.addEventListener("submit", onSaveSettings);

  document.getElementById("settingsResetPassword")
    ?.addEventListener("click", onResetPassword);

  document.getElementById("editCancel")
    ?.addEventListener("click", closeEditModal);

  document.getElementById("editAdForm")
    ?.addEventListener("submit", onSaveEditAd);

  await loadMyAds();
  await Messaging.initMessaging();

  /* 🔁 Open conversation from session */
  const openConv = sessionStorage.getItem("openConversationId");
  if (openConv) {
    sessionStorage.removeItem("openConversationId");

    const { db } = await getFirebase();
    const convSnap = await getDoc(doc(db, "conversations", openConv));
    const data = convSnap.data();

    if (data && window.currentUser?.uid) {
      const otherUserId = data.participants.find(
        id => id !== window.currentUser.uid
      );

      const userSnap = await getDoc(doc(db, "users", otherUserId));
      const otherName = userSnap.data()?.firstName || "User";

      Messaging.openConversation(openConv, otherName, otherUserId);
    }
  }

  showSection("myAds");
}

/* ================= SECTIONS ================= */
function showSection(id) {
  document.querySelectorAll(".dash-section")
    .forEach(sec => sec.classList.add("hidden"));

  const target = document.getElementById(id);
  if (target) target.classList.remove("hidden");

  if (id === "myAds") loadMyAds();
  if (id === "saved") loadSaved();

  window.scrollTo({ top: 0, behavior: "smooth" });
}
/* ================= MY ADS ================= */
async function loadMyAds() {
  const listEl = document.getElementById("myAdsList");
  const statsEl = document.getElementById("myAdsStats");

  listEl.textContent = "Loading…";

  const { db } = await getFirebase();
  const userId = window.currentUser?.uid;

  if (!userId) {
    listEl.textContent = "Not logged in.";
    return;
  }

  const q = query(
    collection(db, "posts"),
    where("userId", "==", userId),
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

  snap.forEach(docSnap => {
    const p = docSnap.data();
    const views = p.views || 0;
    totalViews += views;

    const created = p.createdAt?.toDate
      ? p.createdAt.toDate().toLocaleDateString("en-GB")
      : "";

    const isExpired = p.isActive === false || p.status === "expired";

html += `
  <div class="my-ad-item ${isExpired ? "expired" : ""}" data-id="${docSnap.id}">
    <div class="my-ad-top">
      <span class="my-ad-title">${escapeHtml(p.title || "Untitled")}</span>
      <span class="my-ad-meta">${escapeHtml(p.category || "")}</span>
      ${isExpired ? `<span class="ad-badge expired-badge">Expired</span>` : ""}
    </div>

    <div class="my-ad-meta">
      ${escapeHtml(p.area || "Rhondda")} · ${views} view${views === 1 ? "" : "s"}
      ${created ? " · " + created : ""}
    </div>

    <div class="my-ad-actions">
      <button data-action="view">View</button>
      ${isExpired ? `<button data-action="renew">Renew</button>` : ""}
      <button data-action="edit">Edit</button>
      <button data-action="delete">Delete</button>
    </div>
  </div>
`;
  });

  listEl.innerHTML = html;
  statsEl.textContent = `Total ads: ${snap.size} · Total views: ${totalViews}`;

  listEl.querySelectorAll(".my-ad-item").forEach(item => {
    item.addEventListener("click", e => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      handleAdAction(btn.dataset.action, item.dataset.id);
    });
  });
}

/* ================= SAVED ITEMS ================= */
async function loadSaved() {
  const listEl = document.getElementById("savedList");
  const statsEl = document.getElementById("savedStats");

  listEl.textContent = "Loading…";

  const { db } = await getFirebase();
  const uid = window.currentUser?.uid;

  if (!uid) {
    listEl.textContent = "Not logged in.";
    return;
  }

  // Get saved post IDs
  const savedSnap = await getDocs(collection(db, "users", uid, "saved"));

  if (savedSnap.empty) {
    listEl.textContent = "You haven't saved anything yet.";
    statsEl.textContent = "";
    return;
  }

  let html = "";
  let count = 0;

  for (const saved of savedSnap.docs) {
    const postId = saved.id;
    const postSnap = await getDoc(doc(db, "posts", postId));

    if (!postSnap.exists()) continue;

    const p = postSnap.data();
    count++;

    const created = p.createdAt?.toDate
      ? p.createdAt.toDate().toLocaleDateString("en-GB")
      : "";

    html += `
      <div class="my-ad-item" data-id="${postId}">
        <div class="my-ad-top">
          <span class="my-ad-title">${escapeHtml(p.title || "Untitled")}</span>
          <span class="my-ad-meta">${escapeHtml(p.category || "")}</span>
        </div>

        <div class="my-ad-meta">
          ${escapeHtml(p.area || "Rhondda")} · ${p.views || 0} views
          ${created ? " · " + created : ""}
        </div>

        <div class="my-ad-actions">
          <button data-action="view">View</button>
          <button data-action="unsave">Unsave</button>
        </div>
      </div>
    `;
  }

  listEl.innerHTML = html;
  statsEl.textContent = `Saved: ${count}`;

  // Attach actions
  listEl.querySelectorAll(".my-ad-item").forEach(item => {
    item.addEventListener("click", e => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = item.dataset.id;

      if (action === "view") {
        sessionStorage.setItem("viewPostId", id);
        window.loadView?.("view-post");
      }

      if (action === "unsave") {
        unsaveItem(id);
      }
    });
  });
}

/* ================= ACTIONS ================= */
function handleAdAction(action, id) {
  if (action === "view") {
    sessionStorage.setItem("viewPostId", id);
    window.loadView?.("view-post");
    return;
  }
  if (action === "renew") return renewAd(id);
  if (action === "edit") return openEditModal(id);
  if (action === "delete" && confirm("Delete this ad? This can’t be undone.")) {
    deleteAd(id);
  }
}

async function renewAd(id) {
  const { db } = await getFirebase();

  const newExpiry = Date.now() + (21 * 24 * 60 * 60 * 1000); // 21 days

  await updateDoc(doc(db, "posts", id), {
    expiresAt: newExpiry,
    isActive: true,
    status: "active"
  });

  loadMyAds();
}

async function deleteAd(id) {
  const { db } = await getFirebase();
  await deleteDoc(doc(db, "posts", id));
  loadMyAds();
}
async function unsaveItem(postId) {
  const { db } = await getFirebase();
  const uid = window.currentUser.uid;

  await deleteDoc(doc(db, "users", uid, "saved", postId));
  loadSaved();
}
/* ================= EDIT ================= */
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

  const title = editTitle.value.trim();
  const description = editDescription.value.trim();
  const area = editArea.value.trim();
  const priceRaw = editPrice.value;
  const price = priceRaw ? Number(priceRaw) : null;

  if (!title || !description) {
    editFeedback.textContent = "Title and description required.";
    return;
  }

  const { db } = await getFirebase();
  await updateDoc(doc(db, "posts", currentEditAdId), {
    title, description, area: area || null, price
  });

  editFeedback.textContent = "Saved ✅";
  setTimeout(() => {
    closeEditModal();
    loadMyAds();
  }, 400);
}

/* ================= SETTINGS ================= */
async function onSaveSettings(e) {
  e.preventDefault();

  const name = settingsName.value.trim();
  const email = settingsEmail.value.trim();

  if (!name || !email) {
    settingsFeedback.textContent = "Name and email required.";
    return;
  }

  const { db, auth } = await getFirebase();
  const user = auth.currentUser;
  if (!user) return;

  if (email !== user.email) await updateEmail(user, email);

  await updateDoc(doc(db, "users", user.uid), {
    firstName: name,
    email
  });

  window.currentUserDoc.firstName = name;
  window.currentUserDoc.email = email;

  settingsFeedback.textContent = "Updated ✅";
}

async function onResetPassword() {
  const { auth } = await getFirebase();
  if (!auth.currentUser?.email) return;
  await sendPasswordResetEmail(auth, auth.currentUser.email);
  settingsFeedback.textContent = "Reset email sent ✅";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
