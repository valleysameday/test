import { getFirebase } from "/index/js/firebase/init.js";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let unsubscribeMessages = null;
let currentConversationId = null;
let currentOtherUserId = null;

/* ==========================
   INIT MESSAGING
========================== */
export async function initMessaging() {
  setupUIListeners();
  await loadConversations();
  await checkUnreadMessages();
}

/* ==========================
   UI LISTENERS
========================== */
function setupUIListeners() {
  const backBtn = document.getElementById("convBack");
  const sendBtn = document.getElementById("convSend");
  const input = document.getElementById("convInput");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      closeConversation();
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }

  if (input) {
    input.addEventListener("keypress", e => {
      if (e.key === "Enter") sendMessage();
    });
  }
}

/* ==========================
   LOAD CONVERSATIONS
========================== */
export async function loadConversations() {
  const listEl = document.getElementById("messagesList");
  if (!listEl) return;

  listEl.textContent = "Loading…";

  const { db } = await getFirebase();
  const uid = window.currentUser.uid;

  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", uid),
    orderBy("updatedAt", "desc")
  );

  const snap = await getDocs(q);

  let html = "";

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const unread = data.unread?.[uid];
    const otherUserName = data.otherUserName || "User";

    html += `
      <div class="conversation-item ${unread ? "unread" : ""}"
           data-id="${docSnap.id}"
           data-name="${escapeHtml(otherUserName)}"
           data-other="${data.otherUserId}">
        <strong>${escapeHtml(otherUserName)}</strong>
        ${unread ? '<span class="unread-dot"></span>' : ""}
        <div>${escapeHtml(data.lastMessage || "")}</div>
      </div>
    `;
  });

  listEl.innerHTML = html;

  listEl.querySelectorAll(".conversation-item").forEach(item => {
    item.addEventListener("click", () => {
      openConversation(
        item.dataset.id,
        item.dataset.name,
        item.dataset.other
      );
    });
  });
}

/* ==========================
   OPEN CONVERSATION
========================== */
export async function openConversation(id, name, otherUserId) {
  currentConversationId = id;
  currentOtherUserId = otherUserId;

  showSection("conversationView");

  document.getElementById("convName").textContent = name;

  const { db } = await getFirebase();
  const uid = window.currentUser.uid;

  // Mark unread as read
  await updateDoc(doc(db, "conversations", id), {
    [`unread.${uid}`]: false
  });

  await loadConversations();
  await checkUnreadMessages();

  listenForMessages(id);
}

/* ==========================
   CLOSE CONVERSATION
========================== */
function closeConversation() {
  if (unsubscribeMessages) unsubscribeMessages();
  currentConversationId = null;
  currentOtherUserId = null;

  showSection("messages");
}

/* ==========================
   REAL-TIME MESSAGE LISTENER
========================== */
function listenForMessages(conversationId) {
  const { db } = getFirebase();

  if (unsubscribeMessages) unsubscribeMessages();

  const messagesRef = collection(db, "conversations", conversationId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  unsubscribeMessages = onSnapshot(q, snap => {
    const container = document.getElementById("convMessages");
    if (!container) return;

    container.innerHTML = "";

    snap.forEach(docSnap => {
      const m = docSnap.data();
      const mine = m.senderId === window.currentUser.uid;

      container.innerHTML += `
        <div class="msg ${mine ? "me" : "them"}">
          ${escapeHtml(m.text)}
        </div>
      `;
    });

    container.scrollTop = container.scrollHeight;
  });
}

/* ==========================
   SEND MESSAGE
========================== */
async function sendMessage() {
  const input = document.getElementById("convInput");
  const text = input.value.trim();
  if (!text || !currentConversationId) return;

  const { db } = await getFirebase();
  const uid = window.currentUser.uid;

  const msgRef = collection(
    db,
    "conversations",
    currentConversationId,
    "messages"
  );

  await addDoc(msgRef, {
    senderId: uid,
    text,
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, "conversations", currentConversationId), {
    lastMessage: text,
    updatedAt: serverTimestamp(),
    [`unread.${uid}`]: false,
    [`unread.${currentOtherUserId}`]: true
  });

  input.value = "";
}

/* ==========================
   UNREAD BADGE ON DASHBOARD
========================== */
export async function checkUnreadMessages() {
  const dot = document.getElementById("messagesNotifDot");
  if (!dot) return;

  const { db } = await getFirebase();
  const uid = window.currentUser.uid;

  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", uid)
  );

  const snap = await getDocs(q);

  let unread = false;

  snap.forEach(docSnap => {
    if (docSnap.data().unread?.[uid]) unread = true;
  });

  dot.classList.toggle("hidden", !unread);
}

/* ==========================
   UTIL
========================== */
function showSection(id) {
  document.querySelectorAll(".dash-section").forEach(sec => {
    sec.classList.add("hidden");
  });

  const target = document.getElementById(id);
  if (target) target.classList.remove("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
