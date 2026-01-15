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
let weatherLoaded = false;

/* --------------------------------------------------
   BADGE ICON MAP (for cards)
   - post.badges is array like ["delivery", "collection"]
-------------------------------------------------- */
const BADGE_ICONS = {
  delivery: "🚚",     // delivery available
  collection: "📦",   // collection only
  assembly: "🛠️",    // assembly / setup help
  heavy: "🏋️",       // heavy item
  trusted: "⭐",      // trusted seller
  boxed: "🎁",        // boxed / sealed
  new: "🆕"           // new condition
};

/* --------------------------------------------------
   PUBLIC INIT
-------------------------------------------------- */
export function init() {
  console.log("🏠 Home feed init");

  // Restore search state
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

  // Lazy init Firebase
  if (!db) {
    const fb = await getFirebase();
    db = fb.db;
  }

  // First-time load
  if (!allPosts.length) {
    postsContainer.innerHTML = `<p>Loading posts…</p>`;
    await fetchPosts();
  }

  // Initial render
  const savedCategory = sessionStorage.getItem("homeCategory") || "all";
  renderPosts(savedCategory);

  // Category click binding
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

  // Weather
  if (!weatherLoaded) {
    loadWeather();
    weatherLoaded = true;
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
    // Category filter
    if (category !== "all" && p.category !== category) return false;

    // Search filter
    if (!searchTerm) return true;

    const priceText =
      p.price === 0 ? "free" : p.price ? `£${p.price}`.toLowerCase() : "";

    return (
      p.title?.toLowerCase().includes(searchTerm) ||
      p.description?.toLowerCase().includes(searchTerm) ||
      p.area?.toLowerCase().includes(searchTerm) ||
      priceText.includes(searchTerm)
    );
  });

  if (!filtered.length) {
    postsContainer.innerHTML = "<p>No posts found. Try another search or category.</p>";
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
   BUILD SINGLE CARD
-------------------------------------------------- */
function buildPostCard(post, category) {
  const card = document.createElement("div");
  card.className = `post-card ${post.type || ""}`;

  const img = post.imageUrl ||
              (Array.isArray(post.imageUrls) && post.imageUrls[0]) ||
              "/index/images/webholder.svg";

  const area = post.area || "Rhondda";
  const price = post.price === 0 ? "FREE" : post.price ? `£${post.price}` : "";

  card.innerHTML = `
    <div class="post-image">
      <img src="${img}" alt="${escapeHtml(post.title || "Listing image")}" loading="lazy"
           onerror="this.src='/index/images/image-webholder.webp'">
      ${price ? `<div class="price-badge">${price}</div>` : ""}
    </div>

    <div class="post-body">
      <h3 class="post-title">${escapeHtml(post.title || "Untitled post")}</h3>

      <p class="post-teaser">${escapeHtml(post.description || "")}</p>

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

        <span class="post-area">📍 ${escapeHtml(area)}</span>
      </div>
    </div>
  `;

  // ⭐ HEART BUTTON LOGIC (INSIDE buildPostCard)
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

  // ⭐ CARD CLICK (open post)
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
   WEATHER WIDGET
-------------------------------------------------- */
async function loadWeather() {
  const emojiEl = document.querySelector(".weather-emoji");
  const textEl = document.querySelector(".weather-text");
  if (!emojiEl || !textEl) return;

  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast" +
        "?latitude=51.65&longitude=-3.45" +
        "&current_weather=true" +
        "&hourly=apparent_temperature,precipitation_probability" +
        "&daily=sunrise,sunset" +
        "&timezone=auto"
    );

    const data = await res.json();
    const temp = Math.round(data.current_weather.temperature);
    const feels = Math.round(data.hourly.apparent_temperature[0]);
    const code = data.current_weather.weathercode;
    const precipProb = data.hourly.precipitation_probability?.[0] ?? null;

    const { emoji, message } = buildWeatherMessage({
      temp,
      feels,
      code,
      precipProb
    });

    emojiEl.textContent = emoji;
    textEl.textContent = message;
  } catch (err) {
    console.error("🌧️ Weather load failed:", err);
    textEl.textContent = "Weather’s having a moment — butt. Try again in a bit.";
  }
}

/* --------------------------------------------------
   WEATHER MESSAGE BUILDER
-------------------------------------------------- */
function buildWeatherMessage({ temp, feels, code, precipProb }) {
  let emoji = "🌤️";
  let mood = "Another tidy day in the Rhondda";

  // Basic code groups (Open-Meteo uses WMO codes)
  if ([0].includes(code)) {
    emoji = "☀️";
    mood = "Sun’s out over the Rhondda";
  } else if ([1, 2].includes(code)) {
    emoji = "🌤️";
    mood = "Bit of cloud, still tidy out";
  } else if ([3].includes(code)) {
    emoji = "☁️";
    mood = "Clouds over the valley, still alright";
  } else if ([45, 48].includes(code)) {
    emoji = "🌫️";
    mood = "Bit murky in the Rhondda today";
  } else if ([51, 53, 55, 61, 63].includes(code)) {
    emoji = "🌦️";
    mood = "Patchy rain about the place";
  } else if ([65, 80, 81, 82].includes(code)) {
    emoji = "🌧️";
    mood = "Proper Rhondda rain, grab a coat";
  } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
    emoji = "❄️";
    mood = "Snowy vibes in the Rhondda";
  } else if ([95, 96, 99].includes(code)) {
    emoji = "⛈️";
    mood = "Thunder about — bit lively out there";
  }

  let precipText = "";
  if (precipProb !== null) {
    if (precipProb >= 70) {
      precipText = " High chance of rain, mind.";
    } else if (precipProb >= 40) {
      precipText = " Might get a shower or two.";
    } else if (precipProb >= 20) {
      precipText = " Small chance of a shower.";
    } else {
      precipText = " Nice chance it stays dry.";
    }
  }

  const message = `${mood} · ${temp}°C (feels ${feels}°C).${precipText}`;

  return { emoji, message };
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
