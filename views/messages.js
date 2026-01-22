// /views/messages.js
import { getFirebase } from "/index/js/firebase/init.js";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function init() {
  console.log("📨 Messages inbox loaded");
  const listEl = document.getElementById("messagesList");
  if (!listEl) return;

  const { db } = await getFirebase();
  const uid = window.currentUser?.uid;
  if (!uid) return;

  // -----------------------------
  // Modular Firestore query
  // -----------------------------
  const convRef = collection(db, "conversations");
  const q = query(
    convRef,
    where("participants", "array-contains", uid),
    orderBy("updatedAt", "desc")
  );

  onSnapshot(q, snap => {
    const convs = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(conv => !conv.deletedFor?.[uid]); // hide deleted conversations

    renderConversations(convs, listEl, uid);
  });
}

/* --------------------------------------------------
   Render all conversations
-------------------------------------------------- */
function renderConversations(convs, listEl, uid) {
  if (!convs.length) {
    listEl.innerHTML = `<p class="empty-state">No messages yet.</p>`;
    return;
  }

  listEl.innerHTML = "";

  convs.forEach(conv => {
    const hasUnread = conv.unread?.[uid] === true;
    const itemLabel = conv.itemType === "service" ? "Service" : "Ad";
    const last = conv.lastMessage || "No messages yet";
    const time = conv.updatedAt?.toDate
      ? conv.updatedAt.toDate().toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })
      : "";

    const card = document.createElement("div");
    card.className = "message-thread";
    card.dataset.id = conv.id;

    card.innerHTML = `
      <div class="thread-main">
        <div class="thread-title">
          <span>${itemLabel}: ${conv.postTitle || conv.itemId}</span>
          ${hasUnread ? `<span class="thread-unread-dot"></span>` : ""}
        </div>
        <div class="thread-preview">${escapeHtml(last)}</div>
      </div>
      <div class="thread-meta">
        ${time}
        ${hasUnread ? `<span class="thread-unread-count">1</span>` : ""}
      </div>
    `;

    card.addEventListener("click", () => {
      sessionStorage.setItem("conversationId", conv.id);
      window.loadView("chat");
    });

    listEl.appendChild(card);
  });
}

/* --------------------------------------------------
   Escape HTML
-------------------------------------------------- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
