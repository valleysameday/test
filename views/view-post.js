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
  addDoc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PLACEHOLDER_IMG = "/index/images/webholder.svg";
let db;

/* =====================================================
   TOAST
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
   SPA ENTRY
===================================================== */
export async function init() {
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
   SEND INLINE MESSAGE
===================================================== */
async function sendInlineMessage(post, text) {
  if (!window.currentUser) {
    window.openLoginModal?.();
    return { ok: false };
  }

  const uid = window.currentUser.uid;
  const sellerId = post.userId;
  if (!sellerId || sellerId === uid) return { ok: false };

  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", uid)
  );

  const snap = await getDocs(q);
  let conversationId = null;

  snap.forEach(d => {
    if (d.data().participants?.includes(sellerId)) {
      conversationId = d.id;
    }
  });

  if (!conversationId) {
    const conv = await addDoc(collection(db, "conversations"), {
      participants: [uid, sellerId],
      lastMessage: "",
      updatedAt: Date.now(),
      postId: post.id,
      unread: {}
    });
    conversationId = conv.id;
  }

  await addDoc(
    collection(db, "conversations", conversationId, "messages"),
    {
      senderId: uid,
      text,
      createdAt: Date.now()
    }
  );

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
  let sellerAvatar = PLACEHOLDER_IMG;
  let sellerSince = null;

  if (post.userId) {
    const u = await getDoc(doc(db, "users", post.userId));
    if (u.exists()) {
      const data = u.data();
      sellerName = data.firstName || sellerName;
      sellerAvatar = data.profileImage || PLACEHOLDER_IMG;
      sellerSince = data.createdAt
        ? new Date(data.createdAt).toLocaleDateString("en-GB", {
            year: "numeric",
            month: "long"
          })
        : null;
    }
  }

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
      <img class="seller-header-avatar" src="${sellerAvatar}">
      <div class="seller-header-info">
        <p class="posted-by"><strong>${sellerName}</strong></p>
        <p class="posted-on">RCT-X</p>
        ${
          sellerSince
            ? `<p class="posted-since">Posting since: ${sellerSince}</p>`
            : ""
        }
      </div>
    </div>
    <h1>${post.title || "Untitled post"}</h1>
  `;


  const sellerInfo = right.querySelector(".seller-header-info");

const followBtn = document.createElement("button");
followBtn.className = "follow-btn";
followBtn.textContent = "Follow";

followBtn.onclick = async () => {
  if (!window.currentUser) {
    window.openLoginModal?.();
    return;
  }

  const uid = window.currentUser.uid;
  const ref = doc(db, "users", uid, "following", post.userId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await deleteDoc(ref);
    followBtn.textContent = "Follow";
    showToast("Unfollowed seller");
  } else {
    await setDoc(ref, {
      userId: post.userId,
      followedAt: Date.now()
    });
    followBtn.textContent = "Following";
    showToast("You’re now following this seller");
  }
};

  if (window.currentUser) {
  const uid = window.currentUser.uid;
  const ref = doc(db, "users", uid, "following", post.userId);
  const snap = await getDoc(ref);
  if (snap.exists()) followBtn.textContent = "Following";
  }

sellerInfo.appendChild(followBtn);
  
  if (post.price !== undefined) {
    const price = document.createElement("h2");
    price.className = "post-price";
    price.textContent =
      post.price === 0 ? "FREE" : `£${post.price}`;
    right.appendChild(price);
  }

  if (post.userId && post.userId !== currentUser?.uid) {
    const box = document.createElement("div");
    box.className = "quick-message-box";
    box.innerHTML = `
      <textarea id="quickMessageInput" rows="2">Hi, is this still available?</textarea>
      <button id="quickMessageSend" class="primary-btn">Send Message</button>
    `;
    right.appendChild(box);

    box.querySelector("#quickMessageSend").onclick = async () => {
      const text = box.querySelector("#quickMessageInput").value.trim();
      if (!text) return;
      const res = await sendInlineMessage(post, text);
      showToast(res.ok ? "Message sent" : "Failed", res.ok ? "success" : "error");
    };
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
                                                        }
