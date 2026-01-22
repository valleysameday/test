// /views/messages.js
import { getFirebase } from "/index/js/firebase/init.js";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  doc
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
    orderBy("lastTimestamp", "desc")
  );

  onSnapshot(q, async snap => {
    const convs = [];

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (data.deletedFor?.[uid]) continue;

      // Fetch other user info for display
      const otherUserId = data.participants.find(p => p !== uid);
      let otherUserName = "User";
      if (otherUserId) {
        const userSnap = await getDoc(doc(db, "users", otherUserId));
        if (userSnap.exists()) otherUserName = userSnap.data().displayName || otherUserName;
      }

      convs.push({
        id: docSnap.id,
        ...data,
        otherUserName
      });
    }

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
    const unreadCount = conv.unread?.[uid] || 0;
    const itemLabel = conv.itemType === "service" ? "Service" : "Ad";
    const last = conv.lastMessage || "No messages yet";
    const time = conv.lastTimestamp?.toDate
      ? conv.lastTimestamp.toDate().toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })
      : "";

    const card = document.createElement("div");
    card.className = "message-thread";
    card.dataset.id = conv.id;

    card.innerHTML = `
      <div class="thread-main">
        <div class="thread-title">
          <span>${conv.otherUserName} — ${itemLabel}: ${conv.postTitle || conv.itemId}</span>
          ${unreadCount > 0 ? `<span class="thread-unread-dot"></span>` : ""}
        </div>
        <div class="thread-preview">${escapeHtml(last)}</div>
      </div>
      <div class="thread-meta">
        ${time}
        ${unreadCount > 0 ? `<span class="thread-unread-count">${unreadCount}</span>` : ""}
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
