// /views/messages.js
import { getFirebase } from "/index/js/firebase/init.js";
import {
  subscribeToConversations,
  getUnreadCount
} from "/views/messaging.js";

export async function init() {
  console.log("📨 Messages inbox loaded");
  const listEl = document.getElementById("messagesList");
  if (!listEl) return;

  subscribeToConversations(convs => {
    if (!convs.length) {
      listEl.innerHTML = `<p class="empty-state">No messages yet.</p>`;
      return;
    }

    listEl.innerHTML = "";
    convs.forEach(conv => {
      const uid = window.currentUser?.uid;
      const unread = conv.unread?.[uid] || 0;

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
            <span>${itemLabel}: ${conv.itemId}</span>
            ${unread > 0 ? `<span class="thread-unread-dot"></span>` : ""}
          </div>
          <div class="thread-preview">${escapeHtml(last)}</div>
        </div>
        <div class="thread-meta">
          ${time}
          ${unread > 0 ? `<span class="thread-unread-count">${unread}</span>` : ""}
        </div>
      `;

      card.addEventListener("click", () => {
        sessionStorage.setItem("conversationId", conv.id);
        window.loadView("chat");
      });

      listEl.appendChild(card);
    });
  });

  // Update global unread dots
  const unread = await getUnreadCount();
  window.dispatchEvent(new CustomEvent("messagesUpdated", { detail: { unread } }));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
