console.log("✅ view-post.js loaded");

import { getFirebase } from "/index/js/firebase/init.js";
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  query,
  collection,
  where,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PLACEHOLDER_IMG = "/index/images/webholder.svg";
let db;

/* =====================================================
   ⭐ TOAST NOTIFICATION
===================================================== */
function showToast(msg, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/* =====================================================
   UTIL: TEMP BUTTON LOCK
===================================================== */
function lockTemporarily(el, ms = 1200) {
  if (!el) return;
  el.disabled = true;
  setTimeout(() => (el.disabled = false), ms);
}

/* =====================================================
   CLICK TRACKING
===================================================== */
function trackClick(type, postId) {
  console.log(`📊 TRACK: ${type}`, postId);
}

/* =====================================================
   SPA ENTRY POINT
===================================================== */
export async function init() {
  console.log("🔁 view-post init()");
  const fb = await getFirebase();
  db = fb.db;

  await waitForAuth();

  let postId = null;

  await new Promise(resolve => {
    const check = setInterval(() => {
      postId =
        sessionStorage.getItem("viewPostId") ||
        window.selectedPostId;

      if (postId) {
        clearInterval(check);
        resolve();
      }
    }, 30);
  });

  window.selectedPostId = postId;
  await loadPost(postId);
}

/* =====================================================
   WAIT FOR AUTH
===================================================== */
function waitForAuth(timeout = 1500) {
  return new Promise(resolve => {
    if (window.currentUser !== undefined) return resolve();

    const start = Date.now();
    const check = setInterval(() => {
      if (window.currentUser !== undefined) {
        clearInterval(check);
        resolve();
      }
      if (Date.now() - start > timeout) {
        clearInterval(check);
        console.warn("⚠️ Auth timeout – continuing as guest");
        resolve();
      }
    }, 50);
  });
}

/* =====================================================
   LOAD POST
===================================================== */
async function loadPost(postId) {
  const container = document.getElementById("viewPostContent");
  if (!container) return;

  container.innerHTML = "<p class='loading'>Loading post…</p>";

  const snap = await getDoc(doc(db, "posts", postId));
  if (!snap.exists()) {
    container.textContent = "Post not found.";
    return;
  }

  const post = { id: snap.id, ...snap.data() };

  updateDoc(doc(db, "posts", postId), {
    views: increment(1)
  }).catch(() => {});

  await renderPost(container, post);
}

/* =====================================================
   ⭐ INLINE MESSAGE SENDER (NO DASHBOARD)
===================================================== */
async function sendInlineMessage(post, text) {
  if (!window.currentUser) {
    window.openLoginModal?.();
    return { ok: false, error: "not_logged_in" };
  }

  const { db } = await getFirebase();
  const uid = window.currentUser.uid;
  const sellerId = post.userId;

  if (!sellerId || sellerId === uid) {
    return { ok: false, error: "invalid_seller" };
  }

  // Find existing conversation
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", uid)
  );

  const snap = await getDocs(q);

  let conversationId = null;

  snap.forEach(docSnap => {
    if (docSnap.data().participants?.includes(sellerId)) {
      conversationId = docSnap.id;
    }
  });

  // Create conversation if needed
  if (!conversationId) {
    const convRef = await addDoc(collection(db, "conversations"), {
      participants: [uid, sellerId],
      lastMessage: "",
      updatedAt: Date.now(),
      postId: post.id,
      unread: {}
    });
    conversationId = convRef.id;
  }

  // Send first message
  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId: uid,
    text,
    createdAt: Date.now()
  });

  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: text,
    updatedAt: Date.now(),
    [`unread.${sellerId}`]: true
  });

  return { ok: true };
}

/* =====================================================
   RENDER POST
===================================================== */
async function renderPost(container, post) {
  container.innerHTML = "";

  const currentUser = window.currentUser || null;
  let sellerName = "Local Seller";


  const images = post.imageUrls?.length
    ? post.imageUrls
    : post.imageUrl
    ? [post.imageUrl]
    : [PLACEHOLDER_IMG];

  const layout = document.createElement("div");
  layout.className = "view-post-layout";

  const left = document.createElement("div");
  left.className = "view-post-left gallery";

  images.forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.onerror = () => (img.src = PLACEHOLDER_IMG);
    left.appendChild(img);
  });

  const right = document.createElement("div");
  right.className = "view-post-right";

  let sellerAvatar = PLACEHOLDER_IMG;

if (post.userId) {
  const u = await getDoc(doc(db, "users", post.userId));
  if (u.exists()) {
    sellerName = u.data().firstName || sellerName;
    sellerAvatar = u.data().profileImage || PLACEHOLDER_IMG;
  }
}

right.innerHTML = `
  <div class="post-seller-header">
    <img class="seller-header-avatar" src="${sellerAvatar}">
    <div class="seller-header-info">
      <p class="posted-by"><strong>${sellerName}</strong></p>
      <p class="posted-on">RCT‑X</p>
      ${sellerSince ? `<p class="posted-since">Posting since: ${sellerSince}</p>` : ""}
    </div>
  </div>
  <h1>${post.title || "Untitled post"}</h1>
`;

  if (post.price !== undefined) {
    const price = document.createElement("h2");
    price.className = "post-price";
    price.textContent = post.price === 0 ? "FREE" : `£${post.price}`;
    right.appendChild(price);
  }

/* =====================================================
   ⭐ INLINE MESSAGE BOX ( STYLE)
===================================================== */
if (post.userId && post.userId !== currentUser?.uid) {
  const quickBox = document.createElement("div");
  quickBox.className = "quick-message-box";

  // IMPORTANT: no indentation inside template string
  quickBox.innerHTML = `
<textarea id="quickMessageInput" class="quick-message-input" rows="2">Hi, is this still available?</textarea>
<button id="quickMessageSend" class="primary-btn">Send Message</button>
  `;

  right.appendChild(quickBox);

  // SAFER: query inside quickBox, not document
  const sendBtn = quickBox.querySelector("#quickMessageSend");
  const input = quickBox.querySelector("#quickMessageInput");

  sendBtn.onclick = async () => {
    const text = input.value.trim();
    if (!text) return;

    const result = await sendInlineMessage(post, text);

    if (result.ok) {
      showToast("Message sent to seller");
    } else {
      showToast("Failed to send message", "error");
    }
  };
}

  /* ---------- DESCRIPTION ---------- */
  const desc = document.createElement("p");
  desc.className = "view-post-desc";
  desc.textContent = post.description || "";
  right.appendChild(desc);

/* ---------- CONTACT ACTIONS ---------- */
if (post.phone) {
  const actions = document.createElement("div");
  actions.className = "view-post-actions";

  const callBtn = document.createElement("a");
  callBtn.className = "engage-btn";
  callBtn.textContent = "Call";

  let waBtn = null;
  const cleaned = post.phone.replace(/\D/g, "");
  const isMobile = /^07\d{8,9}$/.test(cleaned);

  // WhatsApp only appears if allowed AND number is mobile
  if (post.allowWhatsApp && isMobile) {
    waBtn = document.createElement("a");
    waBtn.className = "secondary-btn";
    waBtn.textContent = "WhatsApp";
    actions.appendChild(waBtn);
  }

  actions.appendChild(callBtn);

  if (window.currentUser) {
    // Logged in → unlock immediately
    callBtn.href = `tel:${post.phone}`;

    if (waBtn) {
      waBtn.href = `https://wa.me/44${cleaned.slice(1)}`;
    }
  } else {
    // Not logged in → clicking opens login modal
    callBtn.onclick = () => window.openLoginModal?.();
    if (waBtn) waBtn.onclick = () => window.openLoginModal?.();
  }

  right.appendChild(actions);
}
  /* ---------- FOOTER ---------- */
  const footer = document.createElement("div");
  footer.className = "view-post-footer";

  const backBtn = document.createElement("button");
  backBtn.className = "secondary-btn";
  backBtn.textContent = "← Back";
  backBtn.onclick = () => window.loadView("home");

  footer.appendChild(backBtn);

  layout.append(left, right);
  container.append(layout, footer);

  console.log("✅ Post rendered correctly");
    }
