console.log("✅ view-post.js loaded");

import { getFirebase } from "/index/js/firebase/init.js";
import {
  doc,
  getDoc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ---------------- CONSTANTS ---------------- */
const PLACEHOLDER_IMG = "images/post-placeholder.jpg";

let auth, db;

/* ---------------- INIT ---------------- */
getFirebase().then(fb => {
  auth = fb.auth;
  db = fb.db;
  console.log("🔥 Firebase ready in view-post");

  // Use window.selectedPostId or fallback to sessionStorage
  const postId = window.selectedPostId || sessionStorage.getItem("viewPostId");

  if (postId) {
    console.log("▶ Auto-loading post:", postId);
    window.selectedPostId = postId; // ensure global is set
    loadPost();
  } else {
    console.warn("⚠ No selectedPostId set when view-post loaded, redirecting home");
    window.navigateToHome(); // redirect or load home view
  }
});

/* ---------------- MAIN ---------------- */
async function loadPost() {
  console.log("🟢 loadPost() called");

  const container = document.getElementById("viewPostContent");
  if (!container) {
    console.error("❌ viewPostContent not found");
    return;
  }

  container.innerHTML = "";

  if (!window.selectedPostId) {
    console.warn("❌ No selectedPostId");
    container.textContent = "Post not found.";
    return;
  }

  console.log("📌 Loading post ID:", window.selectedPostId);

  let snap;
  try {
    const ref = doc(db, "posts", window.selectedPostId);
    snap = await getDoc(ref);
  } catch (e) {
    console.error("🔥 Firestore read failed:", e);
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

  /* Increment views */
  try {
    await updateDoc(doc(db, "posts", window.selectedPostId), {
      views: increment(1)
    });
    console.log("👁️ View count incremented");
  } catch (e) {
    console.warn("⚠️ Failed to increment views:", e);
  }

  /* Images */
  const images = post.imageUrls?.length
    ? post.imageUrls
    : post.imageUrl
      ? [post.imageUrl]
      : [PLACEHOLDER_IMG];

  console.log("🖼 Images:", images);

  /* Seller */
  let seller = null;
  if (post.userId) {
    try {
      const userSnap = await getDoc(doc(db, "users", post.userId));
      if (userSnap.exists()) {
        seller = userSnap.data();
        console.log("👤 Seller loaded:", seller);
      }
    } catch (e) {
      console.warn("⚠️ Seller load failed:", e);
    }
  }

  /* ---------------- BUILD UI ---------------- */
  const layout = document.createElement("div");
  layout.className = "view-post-layout";

  /* LEFT — GALLERY */
  const left = document.createElement("div");
  left.className = "view-post-left";

  const gallery = document.createElement("div");
  gallery.className = "gallery";

  images.forEach((url, i) => {
    const slide = document.createElement("div");
    slide.className = "gallery-slide";

    const img = document.createElement("img");
    img.src = url || PLACEHOLDER_IMG;
    img.onerror = () => img.src = PLACEHOLDER_IMG;
    img.alt = `${post.title || "Post"} image ${i + 1}`;
    img.loading = "lazy";

    slide.appendChild(img);
    gallery.appendChild(slide);
  });

  left.appendChild(gallery);
  layout.appendChild(left);

  /* RIGHT — CONTENT */
  const right = document.createElement("div");
  right.className = "view-post-right";

  /* Seller header */
  const header = document.createElement("div");
  header.className = "post-seller-header";

  const avatar = document.createElement("img");
  avatar.className = "seller-header-avatar";
  avatar.src = seller?.photoURL || PLACEHOLDER_IMG;
  avatar.onerror = () => avatar.src = PLACEHOLDER_IMG;

  const info = document.createElement("div");
  info.className = "seller-header-info";

  info.innerHTML = `
    <p class="posted-by">Posted by <strong>${seller?.name || "Local Seller"}</strong></p>
    <p class="posted-on">Posted on Rhondda Noticeboard</p>
  `;

  header.append(avatar, info);
  right.appendChild(header);

  /* Title */
  const h1 = document.createElement("h1");
  h1.textContent = post.title || "Untitled post";
  right.appendChild(h1);

  /* Price */
  if (post.price !== undefined) {
    const price = document.createElement("h2");
    price.className = "post-price";
    price.textContent = post.price === 0 ? "FREE" : `£${post.price}`;
    right.appendChild(price);
  }

  /* Description */
  const desc = document.createElement("p");
  desc.className = "view-post-desc";
  desc.textContent = post.description || "No description provided.";
  right.appendChild(desc);

  /* Back button */
  const backBtn = document.createElement("button");
  backBtn.className = "secondary-btn";
  backBtn.textContent = "← Back to home";
  backBtn.onclick = () => {
    console.log("↩ Back clicked");
    window.navigateToHome();
  };

  right.appendChild(backBtn);

  layout.appendChild(right);
  container.appendChild(layout);

  console.log("✅ Post rendered successfully");
}
