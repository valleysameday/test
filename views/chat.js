// /views/chat.js
import {
  subscribeToMessages,
  sendMessage,
  markConversationRead,
  summariseConversation,
  suggestReply
} from "/views/messaging.js";

import { getFirebase } from "/index/js/firebase/init.js";
import { doc, getDoc, collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function init() {
  console.log("💬 Chat view loaded");

  const conversationId = sessionStorage.getItem("conversationId");
  const chatMessagesEl = document.getElementById("chatMessages");

  if (!conversationId) {
    if (chatMessagesEl) chatMessagesEl.innerHTML = `<p class="empty-state">No conversation selected.</p>`;
    return;
  }

  const { db } = await getFirebase();
  const convRef = doc(db, "conversations", conversationId);
  const convSnap = await getDoc(convRef);

  if (!convSnap.exists()) {
    if (chatMessagesEl) chatMessagesEl.innerHTML = `<p class="empty-state">Conversation not found.</p>`;
    return;
  }

  const conv = convSnap.data();
  const uid = window.currentUser?.uid;

  // --------------------------
  // Header: Other user name
  // --------------------------
  const otherUserId = conv.participants.find(p => p !== uid);
  const chatUserNameEl = document.getElementById("chatUserName");
  if (chatUserNameEl) {
    if (otherUserId) {
      const otherUserSnap = await getDoc(doc(db, "users", otherUserId));
      const otherUser = otherUserSnap.exists() ? otherUserSnap.data() : null;
      chatUserNameEl.textContent = otherUser?.displayName || "User";
    } else {
      chatUserNameEl.textContent = "User";
    }
  }

  const chatItemTitleEl = document.getElementById("chatItemTitle");
  if (chatItemTitleEl) chatItemTitleEl.textContent = conv.itemTitle || "Item";

  // --------------------------
  // Subscribe to messages
  // --------------------------
  subscribeToMessages(conversationId, msgs => {
    renderMessages(msgs, uid);
    markConversationRead(conversationId);
  });

  // --------------------------
  // Send button
  // --------------------------
  const chatSendBtn = document.getElementById("chatSendBtn");
  if (chatSendBtn)
    chatSendBtn.addEventListener("click", () => sendCurrentMessage(conversationId));

  // Enter key to send
  const chatInput = document.getElementById("chatInput");
  if (chatInput)
    chatInput.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendCurrentMessage(conversationId);
      }
    });

  // --------------------------
  // AI helpers
  // --------------------------
  const summariseBtn = document.getElementById("chatSummariseBtn");
  if (summariseBtn)
    summariseBtn.addEventListener("click", async () => {
      const msgs = await fetchMessages(conversationId);
      const summary = await summariseConversation(msgs);
      alert(summary);
    });

  const suggestReplyBtn = document.getElementById("chatSuggestReplyBtn");
  if (suggestReplyBtn)
    suggestReplyBtn.addEventListener("click", async () => {
      const msgs = await fetchMessages(conversationId);
      const suggestion = await suggestReply(msgs);
      alert(suggestion);
    });
}

// --------------------------
// Fetch messages once (for AI helpers)
// --------------------------
async function fetchMessages(conversationId) {
  const { db } = await getFirebase();
  const messagesCol = collection(db, "conversations", conversationId, "messages");
  const q = query(messagesCol, orderBy("timestamp", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --------------------------
// Render messages
// --------------------------
function renderMessages(msgs, uid) {
  const container = document.getElementById("chatMessages");
  if (!container) return;
  container.innerHTML = "";

  msgs.forEach(m => {
    const div = document.createElement("div");
    div.className = m.sender === uid ? "chat-msg chat-msg-self" : "chat-msg";

    const time = m.timestamp?.toDate
      ? m.timestamp.toDate().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : "";

    div.innerHTML = `
      <div class="chat-bubble">${escapeHtml(m.text)}</div>
      <div class="chat-time">${time}</div>
    `;

    container.appendChild(div);
  });

  container.scrollTop = container.scrollHeight;
}

// --------------------------
// Send current message
// --------------------------
async function sendCurrentMessage(conversationId) {
  const input = document.getElementById("chatInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  // Disable input while sending
  input.disabled = true;
  try {
    await sendMessage(conversationId, text);
    input.value = "";
  } catch (err) {
    console.error("Error sending message:", err);
    alert("Failed to send message");
  } finally {
    input.disabled = false;
    input.focus();
  }
}

// --------------------------
// Escape HTML
// --------------------------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
