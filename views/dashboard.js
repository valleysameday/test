import { getFirebase } from "/index/js/firebase/init.js";
import {
  collection,
  query,
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
let currentEditAdId = null;

export async function init() {
  const nameEl = document.getElementById("dashUserName");
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const profileSince = document.getElementById("profileSince");

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

  document.querySelectorAll(".dash-card").forEach(card => {
    card.addEventListener("click", () => {
      const section = card.dataset.section;
      showSection(section);
    });
  });

  document.getElementById("dashLogout")?.addEventListener("click", () => {
    window.logoutUser?.();
  });

  document.getElementById("settingsForm")?.addEventListener("submit", onSaveSettings);
  document.getElementById("settingsResetPassword")?.addEventListener("click", onResetPassword);

  document.getElementById("editCancel")?.addEventListener("click", closeEditModal);
  document.getElementById("editAdForm")?.addEventListener("submit", onSaveEditAd);

  await loadMyAds();
  await Messaging.initMessaging();
  const openConv = sessionStorage.getItem("openConversationId");
if (openConv) {
  sessionStorage.removeItem("openConversationId");

  // Load conversation details
  const { db } = await getFirebase();
  const convSnap = await getDoc(doc(db, "conversations", openConv));
  const data = convSnap.data();

  const uid = window.currentUser.uid;
  const otherUserId = data.participants.find(id => id !== uid);

  // Load other user's name
  const userSnap = await getDoc(doc(db, "users", otherUserId));
  const otherName = userSnap.data()?.firstName || "User";

  // Open conversation
  Messaging.openConversation(openConv, otherName, otherUserId);
}
  showSection("myAds");
}

function showSection(id) {
  document.querySelectorAll(".dash-section").forEach(sec => {
    sec.classList.add("hidden");
  });
  const target = document.getElementById(id);
  if (target) target.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

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

    html += `
      <div class="my-ad-item" data-id="${docSnap.id}">
        <div class="my-ad-top">
          <span class="my-ad-title">${escapeHtml(p.title || "Untitled")}</span>
          <span class="my-ad-meta">${escapeHtml(p.category || "")}</span>
        </div>
        <div class="my-ad-meta">
          ${escapeHtml(p.area || "Rhondda")} · ${views} view${views === 1 ? "" : "s"}${created ? " · " + created : ""}
        </div>
        <div class="my-ad-actions">
          <button class="secondary-btn" data-action="view">View</button>
          <button class="secondary-btn" data-action="renew">Renew</button>
          <button class="secondary-btn" data-action="edit">Edit</button>
          <button class="secondary-btn" data-action="delete">Delete</button>
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
  statsEl.textContent = `Total ads: ${snap.size} · Total views: ${totalViews}`;

  listEl.querySelectorAll(".my-ad-item").forEach(item => {
    item.addEventListener("click", e => {
      const actionBtn = e.target.closest("button[data-action]");
      if (!actionBtn) return;
      const action = actionBtn.dataset.action;
      const id = item.dataset.id;
      handleAdAction(action, id);
    });
  });
}

function handleAdAction(action, id) {
  if (action === "view") {
    sessionStorage.setItem("viewPostId", id);
    if (typeof window.loadView === "function") {
      window.loadView("view-post");
    }
    return;
  }

  if (action === "renew") {
    renewAd(id);
    return;
  }

  if (action === "edit") {
    openEditModal(id);
    return;
  }

  if (action === "delete") {
    if (confirm("Delete this ad? This can’t be undone.")) {
      deleteAd(id);
    }
  }
}

async function renewAd(id) {
  const { db } = await getFirebase();
  await updateDoc(doc(db, "posts", id), {
    createdAt: serverTimestamp()
  });
  await loadMyAds();
}

async function deleteAd(id) {
  const { db } = await getFirebase();
  await deleteDoc(doc(db, "posts", id));
  await loadMyAds();
}

async function openEditModal(id) {
  currentEditAdId = id;
  const { db } = await getFirebase();
  const snap = await getDocs(
    query(collection(db, "posts"), where("__name__", "==", id))
  );
  if (snap.empty) return;

  const docSnap = snap.docs[0];
  const p = docSnap.data();

  document.getElementById("editTitle").value = p.title || "";
  document.getElementById("editDescription").value = p.description || "";
  document.getElementById("editPrice").value = p.price ?? "";
  document.getElementById("editArea").value = p.area || "";

  document.getElementById("editFeedback").textContent = "";
  document.getElementById("editAdModal").classList.remove("hidden");
}

function closeEditModal() {
  currentEditAdId = null;
  document.getElementById("editAdModal").classList.add("hidden");
}

async function onSaveEditAd(e) {
  e.preventDefault();
  if (!currentEditAdId) return;

  const title = document.getElementById("editTitle").value.trim();
  const description = document.getElementById("editDescription").value.trim();
  const priceRaw = document.getElementById("editPrice").value;
  const area = document.getElementById("editArea").value.trim();
  const feedback = document.getElementById("editFeedback");

  if (!title || !description) {
    feedback.textContent = "Title and description are required.";
    return;
  }

  const price = priceRaw ? Number(priceRaw) : null;

  const { db } = await getFirebase();
  await updateDoc(doc(db, "posts", currentEditAdId), {
    title,
    description,
    area: area || null,
    price
  });

  feedback.textContent = "Saved ✅";
  setTimeout(() => {
    closeEditModal();
    loadMyAds();
  }, 400);
}

async function onSaveSettings(e) {
  e.preventDefault();
  const nameInput = document.getElementById("settingsName");
  const emailInput = document.getElementById("settingsEmail");
  const feedback = document.getElementById("settingsFeedback");

  const newName = nameInput.value.trim();
  const newEmail = emailInput.value.trim();

  if (!newName || !newEmail) {
    feedback.textContent = "Name and email are required.";
    return;
  }

  const { db, auth } = await getFirebase();
  const user = auth.currentUser;
  if (!user) {
    feedback.textContent = "Not logged in.";
    return;
  }

  try {
    if (newEmail !== user.email) {
      await updateEmail(user, newEmail);
    }

    await updateDoc(doc(db, "users", user.uid), {
      firstName: newName,
      email: newEmail
    });

    window.currentUserDoc = {
      ...(window.currentUserDoc || {}),
      firstName: newName,
      email: newEmail
    };

    feedback.textContent = "Settings updated ✅";
  } catch (err) {
    console.error(err);
    feedback.textContent = err.message || "Failed to update settings.";
  }
}

async function onResetPassword() {
  const feedback = document.getElementById("settingsFeedback");
  const { auth } = await getFirebase();
  const user = auth.currentUser;
  if (!user?.email) {
    feedback.textContent = "No email found for this account.";
    return;
  }

  try {
    await sendPasswordResetEmail(auth, user.email);
    feedback.textContent = "Password reset email sent ✅";
  } catch (err) {
    console.error(err);
    feedback.textContent = err.message || "Failed to send reset email.";
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
    }
