// /index/js/messaging.js
import { getFirebase } from "/index/js/firebase/init.js";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let conversationsUnsub = null;
let messagesUnsub = null;

export async function getOrCreateConversation(itemId, itemType, otherUserId) {
  const { db } = await getFirebase();
  const uid = window.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");

  const convRef = collection(db, "conversations");
  const q = query(
    convRef,
    where("itemId", "==", itemId),
    where("itemType", "==", itemType),
    where("participants", "array-contains", uid)
  );

  const snap = await getDocs(q);
  let existing = null;

  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.participants.includes(otherUserId)) {
      existing = { id: docSnap.id, ...data };
    }
  });

  if (existing) return existing.id;

  const newConv = await addDoc(convRef, {
    participants: [uid, otherUserId],
    itemId,
    itemType,
    lastMessage: "",
    lastTimestamp: serverTimestamp(),
    unread: {
      [uid]: 0,
      [otherUserId]: 0
    }
  });

  return newConv.id;
}

export async function sendMessage(conversationId, text) {
  const { db } = await getFirebase();
  const uid = window.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  if (!text.trim()) return;

  const msgRef = collection(db, "conversations", conversationId, "messages");
  await addDoc(msgRef, {
    sender: uid,
    text: text.trim(),
    timestamp: serverTimestamp(),
    readBy: [uid]
  });

  const convRef = doc(db, "conversations", conversationId);
  const convSnap = await getDoc(convRef);
  if (!convSnap.exists()) return;
  const conv = convSnap.data();

  const otherUserId = conv.participants.find(p => p !== uid);
  await updateDoc(convRef, {
    lastMessage: text.trim(),
    lastTimestamp: serverTimestamp(),
    [`unread.${otherUserId}`]: (conv.unread?.[otherUserId] || 0) + 1
  });
}

export async function markConversationRead(conversationId) {
  const { db } = await getFirebase();
  const uid = window.currentUser?.uid;
  if (!uid) return;

  const convRef = doc(db, "conversations", conversationId);
  const convSnap = await getDoc(convRef);
  if (!convSnap.exists()) return;
  const conv = convSnap.data();

  await updateDoc(convRef, {
    [`unread.${uid}`]: 0
  });
}

export async function getUnreadCount() {
  const { db } = await getFirebase();
  const uid = window.currentUser?.uid;
  if (!uid) return 0;

  const convRef = collection(db, "conversations");
  const q = query(convRef, where("participants", "array-contains", uid));
  const snap = await getDocs(q);

  let total = 0;
  snap.forEach(docSnap => {
    const data = docSnap.data();
    total += data.unread?.[uid] || 0;
  });

  return total;
}

export async function subscribeToConversations(callback) {
  const { db } = await getFirebase();
  const uid = window.currentUser?.uid;
  if (!uid) return;

  if (conversationsUnsub) conversationsUnsub();

  const convRef = collection(db, "conversations");
  const q = query(
    convRef,
    where("participants", "array-contains", uid),
    orderBy("lastTimestamp", "desc")
  );

  conversationsUnsub = onSnapshot(q, async snap => {
    const convs = [];
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      convs.push({ id: docSnap.id, ...data });
    }
    callback(convs);
    window.dispatchEvent(new CustomEvent("messagesUpdated"));
  });
}

export async function subscribeToMessages(conversationId, callback) {
  const { db } = await getFirebase();
  if (messagesUnsub) messagesUnsub();

  const msgRef = collection(db, "conversations", conversationId, "messages");
  const q = query(msgRef, orderBy("timestamp", "asc"));

  messagesUnsub = onSnapshot(q, snap => {
    const msgs = [];
    snap.forEach(docSnap => {
      msgs.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(msgs);
  });
}

export function unsubscribeAllMessaging() {
  if (conversationsUnsub) conversationsUnsub();
  if (messagesUnsub) messagesUnsub();
  conversationsUnsub = null;
  messagesUnsub = null;
}

/* ========== AI HELPERS (placeholder hooks) ========== */

export async function summariseConversation(messages) {
  const text = messages.map(m => `${m.sender}: ${m.text}`).join("\n");
  // Hook for future AI call
  return `Summary coming soon.\n\n(You'd send this text to an AI model:\n${text.slice(0, 500)}...)`;
}

export async function suggestReply(messages) {
  const last = messages[messages.length - 1];
  if (!last) return "No conversation yet.";
  return `Suggested reply coming soon.\n\n(Last message was: "${last.text}")`;
                                  }
