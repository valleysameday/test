import { getFirebase } from "/index/js/firebase/init.js";
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let db;

export function initFeed() {
  const postsContainer = document.getElementById("postsContainer");
  const categoryBtns = document.querySelectorAll(".category-btn");

  getFirebase().then(fb => {
    db = fb.db;
    loadPosts("all");
    loadWeather();
  });

  async function loadPosts(category = "all") {
    postsContainer.innerHTML = "<p>Loading…</p>";

    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    const posts = [];
    snap.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));

    const filtered = category === "all"
      ? posts
      : posts.filter(p => p.category === category);

    const searchTerm = (window.currentSearch || "").toLowerCase();
    const searched = filtered.filter(p => {
      const priceText = p.price === 0 ? "free" : p.price ? `£${p.price}` : "";
      return (
        p.title.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        (p.area && p.area.toLowerCase().includes(searchTerm)) ||
        priceText.includes(searchTerm)
      );
    });

    if (!searched.length) {
      postsContainer.innerHTML = "<p>No posts found.</p>";
      return;
    }

    postsContainer.innerHTML = "";

    searched.forEach(post => {
      const card = document.createElement("div");
      card.className = "post-card";

      card.addEventListener("click", () => {
        window.selectedPostId = post.id;
        loadView("view-post");
      });

      const imgSrc = post.imageUrl || "/images/post-placeholder.jpg";
      const isBusiness = !!post.businessId;
      const priceText = post.price === 0 ? "FREE" : post.price ? `£${post.price}` : "";

      card.innerHTML = `
        <div class="post-image">
          <img src="${imgSrc}" alt="${post.title}" loading="lazy"
               onerror="this.onerror=null;this.src='/images/post-placeholder.jpg';">
          ${isBusiness ? `<div class="business-overlay">Business</div>` : ""}
          ${priceText ? `<div class="price-badge">${priceText}</div>` : ""}
        </div>

        <div class="post-body">
          <h3>${post.title}</h3>
          <p class="post-desc">${post.description}</p>
          <small class="post-category">${post.category}</small>
        </div>
      `;

      postsContainer.appendChild(card);
    });
  }

  categoryBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      categoryBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadPosts(btn.dataset.category);
    });
  });

  async function loadWeather() {
    const emojiEl = document.querySelector(".weather-emoji");
    const textEl = document.querySelector(".weather-text");
    if (!emojiEl || !textEl) return;

    try {
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=51.65&longitude=-3.45&current_weather=true&hourly=apparent_temperature,precipitation_probability&daily=sunrise,sunset&timezone=auto"
      );
      const data = await res.json();

      const code = data.current_weather.weathercode;
      const temp = Math.round(data.current_weather.temperature);
      const feels = Math.round(data.hourly.apparent_temperature[0]);
      const rainChance = data.hourly.precipitation_probability[0];

      const sunrise = new Date(data.daily.sunrise[0]);
      const sunset = new Date(data.daily.sunset[0]);
      const now = new Date(data.current_weather.time);
      const isDay = now >= sunrise && now <= sunset;

      let emoji = isDay ? "🌞" : "🌙";
      if ([51, 61, 63, 65, 80, 81, 82].includes(code)) emoji = "🌧️";
      if ([71, 73, 75].includes(code)) emoji = "❄️";
      if ([45, 48].includes(code)) emoji = "🌫️";
      if ([95, 96, 99].includes(code)) emoji = "⛈️";

      let message = "";
      if (!isDay) message = "Evening in the valley — cosy vibes.";
      else if (temp <= 3) message = "Cold enough to freeze your nan’s washing.";
      else if (rainChance > 60) message = "Rain’s on — grab your brolly, butt.";
      else if (temp >= 20) message = "Warm one in the Rhondda — tidy!";
      else message = "Another tidy day in the Rhondda.";

      emojiEl.textContent = emoji;
      textEl.textContent = `${message} · ${temp}°C (feels like ${feels}°C)`;

    } catch (err) {
      textEl.textContent = "Weather’s having a moment — try again soon, butt.";
    }
  }
}

window.initFeed = initFeed;
