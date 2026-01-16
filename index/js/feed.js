// /index/js/home-feed.js

import { getFirebase } from "/index/js/firebase/init.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* --------------------------------------------------
   STATE
-------------------------------------------------- */
let db;
let allPosts = [];

/* --------------------------------------------------
   PUBLIC INIT
-------------------------------------------------- */
export function init() {
  console.log("🏠 Home feed init");

  window.currentSearch = sessionStorage.getItem("homeSearch") || "";

  initFeed().then(() => {
    const scrollY = sessionStorage.getItem("homeScroll");
    if (scrollY) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(scrollY, 10));
      });
    }
  });
}

/* --------------------------------------------------
   MAIN FEED INIT
-------------------------------------------------- */
export async function initFeed() {
  const postsContainer = document.getElementById("postsContainer");
  const categoriesEl = document.getElementById("categories");

  if (!postsContainer) {
    console.warn("⚠️ postsContainer not found");
    return;
  }

  if (!db) {
    const fb = await getFirebase();
    db = fb.db;
  }

  if (!allPosts.length) {
    postsContainer.innerHTML = `<p>Loading posts…</p>`;
    await fetchPosts();
  }

  const savedCategory = sessionStorage.getItem("homeCategory") || "all";
  renderPosts(savedCategory);

  if (categoriesEl && !categoriesEl.dataset.bound) {
    categoriesEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".category-btn");
      if (!btn) return;

      categoriesEl
        .querySelectorAll(".category-btn")
        .forEach((b) => b.classList.remove("active"));

      btn.classList.add("active");
      const cat = btn.dataset.category || "all";

      sessionStorage.setItem("homeCategory", cat);
      renderPosts(cat);
    });

    categoriesEl.dataset.bound = "true";
  }
}

/* --------------------------------------------------
   FETCH POSTS
-------------------------------------------------- */
async function fetchPosts() {
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    allPosts = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📦 Loaded ${allPosts.length} posts`);
  } catch (err) {
    console.error("🔥 Failed to fetch posts:", err);
    const postsContainer = document.getElementById("postsContainer");
    if (postsContainer) {
      postsContainer.innerHTML =
        "<p>Couldn’t load posts just now. Try again in a bit.</p>";
    }
  }
}

/* --------------------------------------------------
   RENDER POSTS
-------------------------------------------------- */
function renderPosts(category) {
  const postsContainer = document.getElementById("postsContainer");
  if (!postsContainer) return;

  const searchTerm = (window.currentSearch || "").toLowerCase().trim();

  const filtered = allPosts.filter((p) => {
    if (category !== "all" && p.category !== category) return false;

    if (!searchTerm) return true;

    const priceText =
      p.price === 0 ? "free" : p.price ? `£${p.price}`.toLowerCase() : "";

    return (
      p.title?.toLowerCase().includes(searchTerm) ||
      p.area?.toLowerCase().includes(searchTerm) ||
      priceText.includes(searchTerm)
    );
  });

  if (!filtered.length) {
    postsContainer.innerHTML =
      "<p>No posts found. Try another search or category.</p>";
    return;
  }

  postsContainer.innerHTML = "";
  const fragment = document.createDocumentFragment();

  filtered.forEach((post) => {
    const card = buildPostCard(post, category);
    fragment.appendChild(card);
  });

  postsContainer.appendChild(fragment);
}

/* --------------------------------------------------
   BUILD SINGLE CARD (Gumtree layout)
-------------------------------------------------- */
function buildPostCard(post, category) {
  const card = document.createElement("div");
  card.className = `post-card ${post.type || ""}`;

  const img =
    post.imageUrl ||
    (Array.isArray(post.imageUrls) && post.imageUrls[0]) ||
    "/index/images/webholder.svg";

  const area = post.area || "Rhondda";

  /* ------------------------------
     AUTO PROPERTY PRICE LOGIC
     Bulletproof + auto-detect
  ------------------------------ */
  let price = "";

  if (post.category === "property") {
    const listingType = post.propertyListingType || null;

    const salePrice = Number(post.propertySalePrice || 0);
    const rentAmount = Number(post.propertyRentAmount || 0);
    const rentFreq = post.propertyRentFrequency || null;

    // AUTO-DETECT SALE vs RENT
    let isSale = listingType === "sale";
    let isRent = listingType === "rent";

    if (!listingType) {
      if (rentAmount > 0) isRent = true;
      else if (salePrice > 0) isSale = true;
    }

    // SALE
    if (isSale) {
      if (salePrice > 0) {
        price = `£${salePrice.toLocaleString()}`;
      } else {
        price = "£0";
      }
    }

    // RENT
    else if (isRent) {
      if (rentAmount > 0) {
        if (rentFreq === "pcm") price = `£${rentAmount} pcm`;
        else if (rentFreq === "pw") price = `£${rentAmount} pw`;
        else price = `£${rentAmount}`;
      } else {
        price = "£0";
      }
    }

    // FALLBACK
    else {
      price = post.price ? `£${post.price}` : "";
    }

  } else {
    // NORMAL ITEMS
    price = post.price === 0 ? "FREE" : post.price ? `£${post.price}` : "";
  }

  /* ------------------------------
     PAID BADGE OVERLAY
  ------------------------------ */
  let badgeHtml = "";
  if (post.featured) {
    badgeHtml = `<div class="badge-overlay featured">Featured</div>`;
  } else if (post.spotlight) {
    badgeHtml = `<div class="badge-overlay spotlight">Spotlight</div>`;
  } else if (post.urgent) {
    badgeHtml = `<div class="badge-overlay urgent">Urgent</div>`;
  }

  /* ------------------------------
     CARD HTML
  ------------------------------ */
  card.innerHTML = `
    <div class="post-image">
      <img src="${img}" alt="${escapeHtml(post.title || "Listing image")}" loading="lazy"
           onerror="this.src='/index/images/image-webholder.webp'">

      ${badgeHtml}
    </div>

    <div class="post-body">

      <div class="post-meta">
        <span class="post-price">${price}</span>

        <button class="heart-btn" data-id="${post.id}" aria-label="Save Post">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 
                     2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
                     C13.09 3.81 14.76 3 16.5 3 
                     19.58 3 22 5.42 22 8.5
                     c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"/>
          </svg>
        </button>
      </div>

      <h3 class="post-title">${escapeHtml(post.title || "Untitled post")}</h3>

      <span class="post-area">📍 ${escapeHtml(area)}</span>

    </div>
  `;

  /* ------------------------------
     HEART BUTTON LOGIC
  ------------------------------ */
  const heartBtn = card.querySelector(".heart-btn");

  heartBtn.addEventListener("click", async (ev) => {
    ev.stopPropagation();

    if (!window.currentUser) {
      window.openLoginModal?.();
      return;
    }

    const postId = heartBtn.dataset.id;
    const { db } = await getFirebase();
    const uid = window.currentUser.uid;

    const ref = doc(db, "users", uid, "saved", postId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      await deleteDoc(ref);
      heartBtn.classList.remove("saved");
    } else {
      await setDoc(ref, {
        postId,
        savedAt: Date.now()
      });
      heartBtn.classList.add("saved");
    }
  });

  /* ------------------------------
     CARD CLICK → OPEN POST
  ------------------------------ */
  card.addEventListener("click", () => {
    sessionStorage.setItem("viewPostId", post.id);
    sessionStorage.setItem("homeScroll", window.scrollY);
    sessionStorage.setItem("homeCategory", category);
    sessionStorage.setItem("homeSearch", window.currentSearch || "");

    window.loadView?.("view-post");
  });

  return card;
}

/* --------------------------------------------------
   UTILS
-------------------------------------------------- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
