console.log("✅ view-post.js loaded");

import { getFirebase } from "/index/js/firebase/init.js";
import {
  doc,
  getDoc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PLACEHOLDER_IMG = "/index/images/image-webholder.webp";

let db;

/* =====================================================
   SPA ENTRY POINT (CALLED EVERY TIME VIEW LOADS)
===================================================== */
export async function init() {
  console.log("🔁 view-post init()");

  const fb = await getFirebase();
  db = fb.db;

  const postId =
    sessionStorage.getItem("viewPostId") ||
    window.selectedPostId;

  if (!postId) {
    console.warn("⚠ No post ID — returning home");
    window.loadView("home");
    return;
  }

  window.selectedPostId = postId; // keep in sync
  await loadPost(postId);
}

/* =====================================================
   LOAD & RENDER POST
===================================================== */
async function loadPost(postId) {
  const container = document.getElementById("viewPostContent");
  if (!container) return;

  container.innerHTML = "<p>Loading post…</p>";

  let snap;
  try {
    snap = await getDoc(doc(db, "posts", postId));
  } catch (e) {
    container.textContent = "Failed to load post.";
    return;
  }

  if (!snap.exists()) {
    container.textContent = "This post no longer exists.";
    return;
  }

  const post = snap.data();

  // Increment views (fire and forget)
  updateDoc(doc(db, "posts", postId), {
    views: increment(1)
  }).catch(() => {});

  const images =
    post.imageUrls?.length
      ? post.imageUrls
      : post.imageUrl
      ? [post.imageUrl]
      : [PLACEHOLDER_IMG];

  /* ---------- Build UI ---------- */
  container.innerHTML = "";

  const layout = document.createElement("div");
  layout.className = "view-post-layout";

  const gallery = document.createElement("div");
  gallery.className = "gallery";

  images.forEach((src) => {
    const img = document.createElement("img");
    img.src = src;
    img.onerror = () => (img.src = PLACEHOLDER_IMG);
    gallery.appendChild(img);
  });

  const content = document.createElement("div");
  content.className = "view-post-right";

  content.innerHTML = `
    <h1>${post.title || "Untitled post"}</h1>
    ${post.price !== null ? `<h2>£${post.price}</h2>` : ""}
    <p>${post.description || ""}</p>
  `;

  const backBtn = document.createElement("button");
  backBtn.textContent = "← Back";
  backBtn.className = "secondary-btn";
  backBtn.onclick = () => window.loadView("home");

  content.appendChild(backBtn);

  layout.append(gallery, content);
  container.appendChild(layout);

  console.log("✅ Post rendered:", postId);
}
