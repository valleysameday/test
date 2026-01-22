// /views/chat.js
import {
  subscribeToMessages,
  sendMessage,
  markConversationRead,
  summariseConversation,
  suggestReply
} from "/views/messaging.js";

import { getFirebase } from "/index/js/firebase/init.js";

export async function init() {
  console.log("💬 Chat view loaded");

  const conversationId = sessionStorage.getItem("conversationId");
  if (!conversationId) {
    document.getElementById("chatMessages").innerHTML =
      `<p class="empty-state">No conversation selected.</p>`;
    return;
  }

  const { db } = await getFirebase();
  const convRef = db.collection("conversations").doc(conversationId);
  const convSnap = await convRef.get();

  if (!convSnap.exists) {
    document.getElementById("chatMessages").innerHTML =
      `<p class="empty-state">Conversation not found.</p>`;
    return;
  }

  const conv = convSnap.data();
  const uid = window.currentUser?.uid;

  // Header info
  document.getElementById("chatUserName").textContent =
    conv.participants.find(p => p !== uid) || "User";

  document.getElementById("chatItemTitle").textContent =
    conv.itemId || "Item";

  // Subscribe to messages
  subscribeToMessages(conversationId, msgs => {
    renderMessages(msgs, uid);
    markConversationRead(conversationId);
  });

  // Send button
  document.getElementById("chatSendBtn").addEventListener("click", () => {
    sendCurrentMessage(conversationId);
  });

  // Enter key to send
  document.getElementById("chatInput").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendCurrentMessage(conversationId);
    }
  });

  // AI buttons
  document.getElementById("chatSummariseBtn").addEventListener("click", async () => {
    const msgs = await fetchMessages(conversationId);
    const summary = await summariseConversation(msgs);
    alert(summary);
  });

  document.getElementById("chatSuggestReplyBtn").addEventListener("click", async () => {
    const msgs = await fetchMessages(conversationId);
    const suggestion = await suggestReply(msgs);
    alert(suggestion);
  });
}

async function fetchMessages(conversationId) {
  const { db } = await getFirebase();
  const snap = await db
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("timestamp", "asc")
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderMessages(msgs, uid) {
  const container = document.getElementById("chatMessages");
  container.innerHTML = "";

  msgs.forEach(m => {
    const div = document.createElement("div");
    div.className = m.sender === uid ? "chat-msg chat-msg-self" : "chat-msg";

    const time = m.timestamp?.toDate
      ? m.timestamp.toDate().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit"
        })
      : "";

    div.innerHTML = `
      <div class="chat-bubble">${escapeHtml(m.text)}</div>
      <div class="chat-time">${time}</div>
    `;

    container.appendChild(div);
  });

  container.scrollTop = container.scrollHeight;
}

async function sendCurrentMessage(conversationId) {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  await sendMessage(conversationId, text);
  input.value = "";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  }
