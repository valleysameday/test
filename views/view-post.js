console.log("✅ view-post.js loaded");

import { getFirebase } from "/index/js/firebase/init.js";
import {
  doc,
  getDoc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  toggleFollow,
  isFollowing
} from "/index/js/social/follow.js";

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

  /* 🔢 Safe view increment */
  updateDoc(doc(db, "posts", postId), {
    views: increment(1)
  }).catch(() => {});

  await renderPost(container, post);
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

  /* =====================================================
     FOLLOW BUTTON (SHARED LOGIC)
  ===================================================== */
  if (currentUser && post.userId && post.userId !== currentUser.uid) {
    const sellerInfo = right.querySelector(".seller-header-info");
    const followBtn = document.createElement("button");
    followBtn.className = "follow-btn";

    const viewerId = currentUser.uid;
    const sellerId = post.userId;

    try {
      const following = await isFollowing(viewerId, sellerId);
      followBtn.textContent = following ? "Following" : "Follow";
    } catch {
      followBtn.textContent = "Follow";
    }

    followBtn.onclick = async () => {
      try {
        const res = await toggleFollow(viewerId, sellerId);
        followBtn.textContent = res.following ? "Following" : "Follow";
        showToast(
          res.following
            ? "You’re now following this seller"
            : "Unfollowed seller"
        );
      } catch (err) {
        console.error(err);
        showToast("Action not allowed", "error");
      }
    };

    sellerInfo.appendChild(followBtn);
  }

  if (post.price !== undefined) {
    const price = document.createElement("h2");
    price.className = "post-price";
    price.textContent =
      post.price === 0 ? "FREE" : `£${post.price}`;
    right.appendChild(price);
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
