// ======================================
// SMART FINDER MODULE (MODULAR)
// ======================================

let finderDb;
let finderAuth;
let finderContainer;

console.log("[FINDER] Module loaded");

export function initFinder({ db, auth, container }) {
  finderDb = db;
  finderAuth = auth;
  finderContainer = container;

  console.log("[FINDER] init");

  bindFinderEvents();
  refreshPlacesUsage();
}

// ======================================
// EVENT BINDING
// ======================================

function bindFinderEvents() {
  const searchBtn = finderContainer.querySelector("#finderSearchBtn");

  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      findBusinesses();
    });
  }

  // Auto‑Add buttons (event delegation)
  finderContainer.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action='auto-seed']");
    if (!btn) return;

    autoSeedBusiness(
      btn.dataset.name,
      btn.dataset.town,
      btn.dataset.category,
      Number(btn.dataset.score || 0),
      btn.dataset.email || "",
      btn.dataset.phone || ""
    );
  });
}

// ======================================
// SLUGIFY
// ======================================

function slugify(str = "") {
  return str
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ======================================
// FIND BUSINESSES
// ======================================

async function findBusinesses() {
  const category = finderContainer.querySelector("#finderCategory")?.value?.trim();
  const town = finderContainer.querySelector("#finderTown")?.value?.trim();
  const resultsBox = finderContainer.querySelector("#finderResults");

  if (!resultsBox) return;

  if (!category || !town) {
    resultsBox.innerHTML = `<div class="status error">Enter category and town.</div>`;
    return;
  }

  resultsBox.innerHTML = `<div class="status loading">Searching...</div>`;

  const query = `${category} ${town}`;

  try {
    const res = await fetch(
      `/.netlify/functions/placesProxy?query=${encodeURIComponent(query)}`
    );

    const json = await res.json();

    if (!json.ok) {
      resultsBox.innerHTML = `<div class="status error">${json.error}</div>`;
      return;
    }

    const results = json.data.results;

    if (!results || results.length === 0) {
      resultsBox.innerHTML = `<div class="status error">No businesses found.</div>`;
      return;
    }

    let html = `<div class="finder-list">`;

    for (const biz of results) {
      const phone = biz.phone || "";
      const website = biz.website || "";

      // EMAIL SCRAPER
      let emailInfo = {
        emailFound: false,
        email: "",
        emailVerified: false,
        socialLinks: []
      };

      if (website) {
        try {
          emailInfo = await fetch("/.netlify/functions/emailScraper", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: website })
          }).then(r => r.json());
        } catch (err) {
          console.error("[FINDER] email scrape failed", err);
        }
      }

      // SCORE
      let score = scoreBusiness(biz);
      if (!emailInfo.emailFound) score += 20;
      else score -= 10;

      html += `
        <div class="finder-item">

          <div class="finder-info">
            <strong>${biz.name}</strong><br>
            ${biz.formatted_address || ""}

            <div class="finder-meta">
              Website: ${website ? "Yes" : "No"} |
              Reviews: ${biz.user_ratings_total || 0} |
              Phone: ${phone || "None"} |
              Email: ${emailInfo.emailFound ? emailInfo.email : "None"} |
              Verified: ${emailInfo.emailVerified ? "Yes" : "No"} |
              Social: ${emailInfo.socialLinks?.length || 0} |
              Score: <strong>${score}</strong>
            </div>
          </div>

          <button
            class="btn btn-small"
            data-action="auto-seed"
            data-name="${biz.name.replace(/"/g, "&quot;")}"
            data-town="${town}"
            data-category="${slugify(category)}"
            data-score="${score}"
            data-email="${emailInfo.email || ""}"
            data-phone="${phone || ""}"
          >
            Auto-Add
          </button>

        </div>
      `;
    }

    html += `</div>`;
    resultsBox.innerHTML = html;

    refreshPlacesUsage();

  } catch (err) {
    console.error("[FINDER] Search error", err);
    resultsBox.innerHTML = `<div class="status error">Search failed.</div>`;
  }
}

// ======================================
// SCORING ENGINE
// ======================================

function scoreBusiness(biz) {
  let score = 0;

  if (!biz.website) score += 40;
  if (!biz.user_ratings_total) score += 30;
  if (!biz.opening_hours) score += 10;
  if (!biz.photos) score += 20;

  if (biz.user_ratings_total > 10) score -= 20;
  if (biz.website) score -= 40;

  return score;
}

// ======================================
// AUTO SEED BUSINESS
// ======================================

async function autoSeedBusiness(name, town, category, score, email = "", phone = "") {
  if (score < 50) {
    alert("This business has too strong an online presence. Skipped.");
    return;
  }

  const slug = slugify(name);
  const townSlug = slugify(town);

  const description = `${name} provides ${category.replace(/-/g, " ")} services in ${town}.`;

  try {
    const res = await fetch("/.netlify/functions/adminAddBusiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        town,
        category,
        slug,
        townSlug,
        email,
        phone,
        sendEmail: true,
        source: "smart_seed",
        description
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to add business");
      return;
    }

    alert(`Added: ${name}`);

  } catch (err) {
    console.error("[FINDER] Auto seed error", err);
    alert("Failed to add business.");
  }
}

// ======================================
// USAGE WIDGET
// ======================================

async function refreshPlacesUsage() {
  const box = finderContainer.querySelector("#placesUsageBox");
  if (!box) return;

  try {
    const res = await fetch("/.netlify/functions/getPlacesUsage");
    const json = await res.json();

    if (!json.ok) {
      box.innerHTML = `<div class="status error">Error loading usage.</div>`;
      return;
    }

    const { today, total, avg7, resetTime } = json;

    box.innerHTML = `
      <div class="usage-stats">
        <p><strong>Today:</strong> ${today}</p>
        <p><strong>Total:</strong> ${total}</p>
        <p><strong>7-day avg:</strong> ${(avg7 || 0).toFixed(1)}</p>
        <p><strong>Reset:</strong> ${resetTime}</p>
      </div>
    `;

  } catch (err) {
    console.error("[FINDER] usage error", err);
    box.innerHTML = `<div class="status error">Error loading usage.</div>`;
  }
}
