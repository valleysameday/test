// /index/js/home-feed.js

import { getFirebase } from "/index/js/firebase/init.js";
import {
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* --------------------------------------------------
   STATE
-------------------------------------------------- */
let db;
let allPosts = [];

/* --------------------------------------------------
   SAFE TIMESTAMP HANDLER
-------------------------------------------------- */
function getMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts === "number") return ts;
  return 0;
}

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

  // ===============================
  // CATEGORY BUTTONS
  // ===============================
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

      // ✅ INTERCEPT SERVICES CATEGORY
      if (cat === "services") {
        sessionStorage.removeItem("homeSearch"); // optional: clear home search
        window.loadView("view-services");        // load the business directory SPA
        return;
      }

      renderPosts(cat);
    });

    categoriesEl.dataset.bound = "true";
  }

  /* --------------------------------------------------
     SEARCH BAR
  -------------------------------------------------- */
  const searchInput = document.getElementById("searchInput");

  if (searchInput && !searchInput.dataset.bound) {
    searchInput.value = window.currentSearch || "";

    searchInput.addEventListener("input", () => {
      window.currentSearch = searchInput.value.trim().toLowerCase();
      sessionStorage.setItem("homeSearch", window.currentSearch);

      const cat = sessionStorage.getItem("homeCategory") || "all";
      renderPosts(cat);
    });

    searchInput.dataset.bound = "true";
  }
}

/* --------------------------------------------------
   FETCH POSTS
-------------------------------------------------- */
async function fetchPosts() {
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    allPosts = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
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
  const now = Date.now();

  const filtered = allPosts.filter((p) => {
    if (p.isActive === false || p.status === "expired") return false;
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

  const boosted = filtered.filter(
    (p) => p.isBoosted === true && getMillis(p.boostEnd) > now
  );

  const normal = filtered.filter(
    (p) => !p.isBoosted || getMillis(p.boostEnd) <= now
  );

  boosted.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
  normal.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));

  const finalList = [...boosted, ...normal];

  if (!finalList.length) {
    postsContainer.innerHTML =
      "<p>No posts found. Try another search or category.</p>";
    return;
  }

  postsContainer.innerHTML = "";
  const fragment = document.createDocumentFragment();

  finalList.forEach((post) => {
    fragment.appendChild(buildPostCard(post, category));
  });

  postsContainer.appendChild(fragment);
  // END OF FEED MESSAGE
const end = document.createElement("div");
end.className = "end-of-feed";
end.innerHTML = `
  <p>— You’ve reached the end —</p>
`;
postsContainer.appendChild(end);
}

/* --------------------------------------------------
   BUILD SINGLE CARD
-------------------------------------------------- */
function buildPostCard(post, category) {
  const card = document.createElement("div");
  card.className = `post-card ${post.type || ""}`;

  const img =
    post.imageUrl ||
    (Array.isArray(post.imageUrls) && post.imageUrls[0]) ||
    "/index/images/webholder.svg";

  const area = post.area || "Rhondda";

  let price = "";
  if (post.category === "property") {
    const sale = Number(post.propertySalePrice || 0);
    const rent = Number(post.propertyRentAmount || 0);
    const freq = (post.propertyRentFrequency || "").toLowerCase();

    if (rent > 0) {
      price = ["pw", "weekly"].includes(freq)
        ? `£${rent} pw`
        : `£${rent} pcm`;
    } else if (sale > 0) {
      price = `£${sale.toLocaleString()}`;
    } else {
      price = "£—";
    }
  } else {
    price = post.price === 0 ? "FREE" : post.price ? `£${post.price}` : "";
  }

  let badgeHtml = "";
  if (post.isBoosted && getMillis(post.boostEnd) > Date.now()) {
    badgeHtml = `<div class="badge-overlay boosted">Boosted</div>`;
  } else if (post.featured) {
    badgeHtml = `<div class="badge-overlay featured">Featured</div>`;
  } else if (post.spotlight) {
    badgeHtml = `<div class="badge-overlay spotlight">Spotlight</div>`;
  } else if (post.urgent) {
    badgeHtml = `<div class="badge-overlay urgent">Urgent</div>`;
  }

  card.innerHTML = `
    <div class="post-image">
      <img src="${img}" loading="lazy"
           onerror="this.src='/index/images/image-webholder.webp'">
      ${badgeHtml}
    </div>

    <div class="post-body">
      <span class="post-price">${price}</span>
      <h3>${escapeHtml(post.title || "Untitled post")}</h3>
      <span>📍 ${escapeHtml(area)}</span>
    </div>
  `;

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
