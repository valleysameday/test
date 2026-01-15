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
   SPA ENTRY POINT
===================================================== */
export async function init() {
  console.log("🔁 view-post init()");
  const fb = await getFirebase();
  db = fb.db;

  await waitForAuth(1500);

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
   WAIT FOR AUTH (NON-BLOCKING)
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
  if (!container) {
    console.error("❌ #viewPostContent not found");
    return;
  }

  container.innerHTML = "<p class='loading'>Loading post…</p>";

  const snap = await getDoc(doc(db, "posts", postId));
  if (!snap.exists()) {
    container.textContent = "Post not found.";
    return;
  }

  const post = {
    id: snap.id,
    ...snap.data()
  };

  updateDoc(doc(db, "posts", postId), {
    views: increment(1)
  }).catch(() => {});

  await renderPost(container, post);
}

/* =====================================================
   START CONVERSATION
===================================================== */
async function startConversation(post) {
  if (!window.currentUser) {
    if (typeof window.openLoginModal === "function") {
      window.openLoginModal();
    } else {
      alert("Please sign in to message the seller.");
    }
    return;
  }

  const { db } = await getFirebase();
  const uid = window.currentUser.uid;
  const sellerId = post.userId;

  if (!sellerId || sellerId === uid) return;

  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", uid)
  );

  const snap = await getDocs(q);

  let conversationId = null;

  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.participants?.includes(sellerId)) {
      conversationId = docSnap.id;
    }
  });

  if (!conversationId) {
    const convRef = await addDoc(collection(db, "conversations"), {
      participants: [uid, sellerId],
      lastMessage: "",
      updatedAt: Date.now(),
      postId: post.id,
      deletedFor: {}
    });

    conversationId = convRef.id;
  }

  sessionStorage.setItem("openConversationId", conversationId);
  window.loadView("dashboard", "messages");
}

/* =====================================================
   RENDER POST
===================================================== */
async function renderPost(container, post) {
  container.innerHTML = "";

  let sellerName = "Local Seller";

  if (post.userId) {
    try {
      const userSnap = await getDoc(doc(db, "users", post.userId));
      if (userSnap.exists()) {
        sellerName = userSnap.data().firstName || sellerName;
      }
    } catch {}
  }

  const currentUser = window.currentUser || null;

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

  right.innerHTML = `
    <div class="post-seller-header">
      <img class="seller-header-avatar" src="${PLACEHOLDER_IMG}">
      <div class="seller-header-info">
        <p class="posted-by"><strong>${sellerName}</strong></p>
        <p class="posted-on">Rhondda Noticeboard</p>
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

  /* ---------- MESSAGE SELLER (ALWAYS VISIBLE) ---------- */
  if (post.userId && post.userId !== currentUser?.uid) {
    const msgBtn = document.createElement("button");
    msgBtn.className = "primary-btn";
    msgBtn.textContent = "Message Seller";
    msgBtn.onclick = () => startConversation(post);
    right.appendChild(msgBtn);
  }

  const desc = document.createElement("p");
  desc.className = "view-post-desc";
  desc.textContent = post.description || "";
  right.appendChild(desc);

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
