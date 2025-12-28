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
   SPA ENTRY POINT
===================================================== */
export async function init() {
  console.log("🔁 view-post init()");

  const fb = await getFirebase();
  db = fb.db;

  const postId =
    sessionStorage.getItem("viewPostId") ||
    window.selectedPostId;

  if (!postId) {
    window.loadView("home");
    return;
  }

  window.selectedPostId = postId;
  await loadPost(postId);
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

  const post = snap.data();

  updateDoc(doc(db, "posts", postId), {
    views: increment(1)
  }).catch(() => {});

  renderPost(container, post, postId);
}

/* =====================================================
   RENDER POST
===================================================== */
function renderPost(container, post, postId) {
  container.innerHTML = "";

  const images =
    post.imageUrls?.length
      ? post.imageUrls
      : post.imageUrl
      ? [post.imageUrl]
      : [PLACEHOLDER_IMG];

  /* ---------- Layout ---------- */
  const layout = document.createElement("div");
  layout.className = "view-post-layout";

  /* ---------- Gallery ---------- */
  const gallery = document.createElement("div");
  gallery.className = "gallery";

  images.forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.onerror = () => (img.src = PLACEHOLDER_IMG);
    gallery.appendChild(img);
  });

  /* ---------- Content ---------- */
  const content = document.createElement("div");
  content.className = "view-post-right";

  content.innerHTML = `
    <h1>${post.title || "Untitled post"}</h1>

    ${post.price !== null ? `<h2 class="price">£${post.price}</h2>` : ""}

    <div class="meta">
      ${post.category ? `<span class="badge">${post.category}</span>` : ""}
      ${post.location ? `<span class="badge">${post.location}</span>` : ""}
    </div>

    <p class="description">${post.description || ""}</p>

    <div class="actions">
      ${post.phone ? `<a href="tel:${post.phone}" class="primary-btn">Call</a>` : ""}
      ${post.phone ? `<a href="https://wa.me/${post.phone}" class="secondary-btn">WhatsApp</a>` : ""}
    </div>
  `;

  /* ---------- Footer ---------- */
  const footer = document.createElement("div");
  footer.className = "view-post-footer";

  const backBtn = document.createElement("button");
  backBtn.textContent = "← Back";
  backBtn.className = "secondary-btn";
  backBtn.onclick = () => window.loadView("home");

  const reportBtn = document.createElement("button");
  reportBtn.textContent = "Report";
  reportBtn.className = "ghost-btn";

  footer.append(backBtn, reportBtn);

  layout.append(gallery, content);
  container.append(layout, footer);

  console.log("✅ Post rendered:", postId);
}
