// /postViews/firestore.js
console.log("📄 firestore.js loaded");

// Firebase Firestore imports
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ---------------------------------------------------------
// GET POST BY ID
// ---------------------------------------------------------
export async function getPostById(db, postId) {
  console.log("📥 getPostById:", postId);

  try {
    const snap = await getDoc(doc(db, "posts", postId));
    if (!snap.exists()) {
      console.log("❌ Post not found:", postId);
      return null;
    }

    const data = { id: snap.id, ...snap.data() };
    console.log("📄 Post loaded:", data);
    return data;
  } catch (err) {
    console.error("🔥 Error loading post:", err);
    return null;
  }
}

// ---------------------------------------------------------
// GET USER BY ID
// ---------------------------------------------------------
export async function getUserById(db, userId) {
  console.log("📥 getUserById:", userId);

  try {
    const snap = await getDoc(doc(db, "users", userId));
    if (!snap.exists()) {
      console.log("❌ User not found:", userId);
      return null;
    }

    const data = { id: snap.id, ...snap.data() };
    console.log("👤 Seller loaded:", data);
    return data;
  } catch (err) {
    console.error("🔥 Error loading user:", err);
    return null;
  }
}

// ---------------------------------------------------------
// INCREMENT POST VIEWS
// ---------------------------------------------------------
export async function incrementPostViews(db, postId) {
  console.log("👁️ incrementPostViews:", postId);

  try {
    await updateDoc(doc(db, "posts", postId), {
      views: increment(1)
    });
    console.log("👁️ View incremented");
  } catch (err) {
    console.error("🔥 Error incrementing views:", err);
  }
}

// ---------------------------------------------------------
// INCREMENT CONTACT CLICKS
// ---------------------------------------------------------
export async function incrementContactClicks(db, postId) {
  console.log("📞 incrementContactClicks:", postId);

  try {
    await updateDoc(doc(db, "posts", postId), {
      contactClicks: increment(1)
    });
    console.log("📞 Contact click incremented");
  } catch (err) {
    console.error("🔥 Error incrementing contact clicks:", err);
  }
}

// ---------------------------------------------------------
// FIND OR CREATE CONVERSATION
// ---------------------------------------------------------
export async function findOrCreateConversation(db, { buyerId, sellerId, post }) {
  console.log("💬 findOrCreateConversation:", { buyerId, sellerId, post });

  try {
    const convoRef = collection(db, "conversations");

    const q = query(
      convoRef,
      where("participants", "array-contains", buyerId),
      where("postId", "==", post.id)
    );

    const results = await getDocs(q);

    // Existing conversation
    if (!results.empty) {
      const existingId = results.docs[0].id;
      console.log("🔄 Existing conversation found:", existingId);
      return existingId;
    }

    // Create new conversation
    const newConvo = await addDoc(convoRef, {
      participants: [buyerId, sellerId],
      postId: post.id,
      postTitle: post.title || "Item",
      postImage: post.imageUrls?.[0] || post.imageUrl || null,
      lastMessage: "",
      lastSenderId: "",
      unread: {
        [buyerId]: false,
        [sellerId]: true
      },
      deletedFor: {
        [buyerId]: false,
        [sellerId]: false
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log("🆕 New conversation created:", newConvo.id);
    return newConvo.id;
  } catch (err) {
    console.error("🔥 Error finding/creating conversation:", err);
    return null;
  }
}

// ---------------------------------------------------------
// SEND MESSAGE TO SELLER
// ---------------------------------------------------------
export async function sendMessageToSeller(db, convoId, { senderId, text }) {
  console.log("✉️ sendMessageToSeller:", { convoId, senderId, text });

  try {
    const messagesRef = collection(db, "conversations", convoId, "messages");

    await addDoc(messagesRef, {
      senderId,
      text,
      createdAt: serverTimestamp()
    });

    console.log("📨 Message added to conversation");

    // Update conversation metadata
    await updateDoc(doc(db, "conversations", convoId), {
      lastMessage: text,
      lastSenderId: senderId,
      updatedAt: serverTimestamp(),
      [`unread.${senderId}`]: false,
      // Mark the other participant as unread
      // (We don't know which is which, so we flip it)
    });

    console.log("📨 Conversation metadata updated");
  } catch (err) {
    console.error("🔥 Error sending message:", err);
  }
}
