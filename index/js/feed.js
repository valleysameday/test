import { getFirebase } from "/index/js/firebase/init.js";
import {
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let db;
let allPosts = [];
let weatherLoaded = false;

/* =====================================================
   INIT FEED (called once per view)
===================================================== */
export async function initFeed() {
  const postsContainer = document.getElementById("postsContainer");
  const categoriesEl = document.getElementById("categories");

  if (!postsContainer) return;

  /* Init Firebase once */
  if (!db) {
    const fb = await getFirebase();
    db = fb.db;
  }

  /* Load data once */
  if (!allPosts.length) {
    postsContainer.innerHTML = "<p>Loading…</p>";
    await fetchPosts();
  }

  /* Initial render */
  renderPosts("all");

  /* Category filter (delegated) */
  if (categoriesEl && !categoriesEl.dataset.bound) {
    categoriesEl.addEventListener("click", e => {
      const btn = e.target.closest(".category-btn");
      if (!btn) return;

      categoriesEl
        .querySelectorAll(".category-btn")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
      renderPosts(btn.dataset.category);
    });

    categoriesEl.dataset.bound = "true";
  }

  /* Weather (once per session) */
  if (!weatherLoaded) {
    loadWeather();
    weatherLoaded = true;
  }
}

/* =====================================================
   FETCH POSTS (ONCE)
===================================================== */
async function fetchPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  allPosts = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/* =====================================================
   RENDER POSTS (FAST, LOCAL FILTER)
===================================================== */
function renderPosts(category) {
  const postsContainer = document.getElementById("postsContainer");
  const searchTerm = (window.currentSearch || "").toLowerCase();

  const filtered = allPosts.filter(p => {
    if (category !== "all" && p.category !== category) return false;

    if (!searchTerm) return true;

    const priceText =
      p.price === 0 ? "free" : p.price ? `£${p.price}` : "";

    return (
      p.title?.toLowerCase().includes(searchTerm) ||
      p.description?.toLowerCase().includes(searchTerm) ||
      p.area?.toLowerCase().includes(searchTerm) ||
      priceText.includes(searchTerm)
    );
  });

  if (!filtered.length) {
    postsContainer.innerHTML = "<p>No posts found.</p>";
    return;
  }

  postsContainer.innerHTML = "";

  const fragment = document.createDocumentFragment();

  filtered.forEach(post => {
    const card = document.createElement("div");
    card.className = "post-card";

    card.onclick = () => {
      window.selectedPostId = post.id;
      window.loadView("view-post");
    };

    const imgSrc = post.imageUrl || "/images/post-placeholder.jpg";
    const priceText =
      post.price === 0 ? "FREE" : post.price ? `£${post.price}` : "";

    card.innerHTML = `
      <div class="post-image">
        <img src="${imgSrc}" loading="lazy"
             onerror="this.src='/images/post-placeholder.jpg'">
        ${post.businessId ? `<div class="business-overlay">Business</div>` : ""}
        ${priceText ? `<div class="price-badge">${priceText}</div>` : ""}
      </div>
      <div class="post-body">
        <h3>${post.title}</h3>
        <p class="post-desc">${post.description}</p>
        <small class="post-category">${post.category}</small>
      </div>
    `;

    fragment.appendChild(card);
  });

  postsContainer.appendChild(fragment);
}

/* =====================================================
   WEATHER (SESSION-CACHED)
===================================================== */
async function loadWeather() {
  const emojiEl = document.querySelector(".weather-emoji");
  const textEl = document.querySelector(".weather-text");
  if (!emojiEl || !textEl) return;

  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=51.65&longitude=-3.45&current_weather=true&hourly=apparent_temperature,precipitation_probability&daily=sunrise,sunset&timezone=auto"
    );

    const data = await res.json();

    const temp = Math.round(data.current_weather.temperature);
    const feels = Math.round(data.hourly.apparent_temperature[0]);

    emojiEl.textContent = "🌤️";
    textEl.textContent = `Another tidy day in the Rhondda · ${temp}°C (feels ${feels}°C)`;
  } catch {
    textEl.textContent = "Weather’s having a moment — butt.";
  }
}

window.initFeed = initFeed;
