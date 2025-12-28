console.log("✅ view-post.js loaded");

import { getFirebase } from "/index/js/firebase/init.js";
import {
  doc,
  getDoc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ============================
   CONSTANTS
============================ */
const PLACEHOLDER_IMG = "/index/images/image-webholder.webp";

let auth;
let db;

/* ============================
   INIT
============================ */
getFirebase().then(fb => {
  auth = fb.auth;
  db = fb.db;

  console.log("🔥 Firebase ready in view-post");

  // Prefer global, fallback to sessionStorage
  const postId =
    window.selectedPostId ||
    sessionStorage.getItem("viewPostId");

  if (!postId) {
    console.warn("⚠ No post ID found → returning home");
    window.loadView("home");
    return;
  }

  // Lock ID globally for safety
  window.selectedPostId = postId;

  loadPost(postId);
});

/* ============================
   MAIN LOADER
============================ */
async function loadPost(postId) {
  console.log("🟢 Loading post:", postId);

  const container = document.getElementById("viewPostContent");
  if (!container) {
    console.error("❌ #viewPostContent not found");
    return;
  }

  container.innerHTML = "";

  let snap;
  try {
    snap = await getDoc(doc(db, "posts", postId));
  } catch (err) {
    console.error("🔥 Firestore error:", err);
    container.textContent = "Failed to load post.";
    return;
  }

  if (!snap.exists()) {
    console.warn("❌ Post does not exist");
    container.textContent = "This post no longer exists.";
    return;
  }

  const post = snap.data();
  console.log("📦 Post data:", post);

  /* ============================
     INCREMENT VIEWS (non-blocking)
  ============================ */
  updateDoc(doc(db, "posts", postId), {
    views: increment(1)
  }).catch(() => {
    console.warn("⚠ View count update failed");
  });

  /* ============================
     IMAGES
  ============================ */
  const images =
    post.imageUrls?.length
      ? post.imageUrls
      : post.imageUrl
        ? [post.imageUrl]
        : [PLACEHOLDER_IMG];

  /* ============================
     SELLER
  ============================ */
  let seller = null;

  if (post.userId) {
    try {
      const userSnap = await getDoc(doc(db, "users", post.userId));
      if (userSnap.exists()) {
        seller = userSnap.data();
      }
    } catch {
      console.warn("⚠ Seller lookup failed");
    }
  }

  /* ============================
     BUILD UI
  ============================ */
  const layout = document.createElement("div");
  layout.className = "view-post-layout";

  /* ---------- LEFT: GALLERY ---------- */
  const left = document.createElement("div");
  left.className = "view-post-left";

  const gallery = document.createElement("div");
  gallery.className = "gallery";

  images.forEach((url, i) => {
    const slide = document.createElement("div");
    slide.className = "gallery-slide";

    const img = document.createElement("img");
    img.src = url || PLACEHOLDER_IMG;
    img.alt = `${post.title || "Post"} image ${i + 1}`;
    img.loading = "lazy";
    img.onerror = () => (img.src = PLACEHOLDER_IMG);

    slide.appendChild(img);
    gallery.appendChild(slide);
  });

  left.appendChild(gallery);
  layout.appendChild(left);

  /* ---------- RIGHT: CONTENT ---------- */
  const right = document.createElement("div");
  right.className = "view-post-right";

  /* Seller header */
  const header = document.createElement("div");
  header.className = "post-seller-header";

  const avatar = document.createElement("img");
  avatar.className = "seller-header-avatar";
  avatar.src = seller?.photoURL || PLACEHOLDER_IMG;
  avatar.onerror = () => (avatar.src = PLACEHOLDER_IMG);

  const info = document.createElement("div");
  info.className = "seller-header-info";
  info.innerHTML = `
    <p class="posted-by">
      Posted by <strong>${seller?.name || "Local member"}</strong>
    </p>
    <p class="posted-on">Rhondda Noticeboard</p>
  `;

  header.append(avatar, info);
  right.appendChild(header);

  /* Title */
  const title = document.createElement("h1");
  title.textContent = post.title || "Untitled post";
  right.appendChild(title);

  /* Price */
  if (post.price !== undefined) {
    const price = document.createElement("h2");
    price.className = "post-price";
    price.textContent =
      post.price === 0 ? "FREE" : `£${post.price}`;
    right.appendChild(price);
  }

  /* Description */
  const desc = document.createElement("p");
  desc.className = "view-post-desc";
  desc.textContent =
    post.description || "No description provided.";
  right.appendChild(desc);

  /* Back button */
  const backBtn = document.createElement("button");
  backBtn.className = "secondary-btn";
  backBtn.textContent = "← Back to home";
  backBtn.onclick = () => {
    console.log("↩ Back to home");
    window.loadView("home");
  };

  right.appendChild(backBtn);

  layout.appendChild(right);
  container.appendChild(layout);

  console.log("✅ View post rendered");
}
