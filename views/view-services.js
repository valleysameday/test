// ===============================
// view-services.js
// ===============================

import { getFirebase } from "/index/js/firebase/init.js";
import { loadView } from "/index/js/main.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function initViewServices() {
  console.log("📘 Services directory loaded");

  const listEl = document.getElementById("servicesList");
  const searchInput = document.getElementById("servicesSearchInput");
  const filterChips = document.querySelectorAll(".filter-chip");

  // Firestore helper functions
  let db;
  async function fsGetAllServices() {
    if (!db) {
      const fb = await getFirebase();
      db = fb.db;
    }
    const snap = await getDocs(collection(db, "services"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function fsSearchServices(term) {
    const all = await fsGetAllServices();
    term = term.toLowerCase();
    return all.filter(svc =>
      svc.businessName?.toLowerCase().includes(term) ||
      svc.category?.toLowerCase().includes(term) ||
      svc.area?.toLowerCase().includes(term)
    );
  }

  async function fsFilterServices(category) {
    if (!db) {
      const fb = await getFirebase();
      db = fb.db;
    }
    const q = query(collection(db, "services"), where("category", "==", category));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Load all services on first load
  let allServices = await fsGetAllServices();
  renderServices(allServices);

  // ===============================
  // SEARCH BAR
  // ===============================
  searchInput.addEventListener("input", async e => {
    const term = e.target.value.trim().toLowerCase();

    if (term.length === 0) {
      renderServices(allServices);
      return;
    }

    const results = await fsSearchServices(term);
    renderServices(results);
  });

  // ===============================
  // FILTER CHIPS
  // ===============================
  filterChips.forEach(chip => {
    chip.addEventListener("click", async () => {
      filterChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");

      const filter = chip.dataset.filter;

      if (filter === "all") {
        renderServices(allServices);
        return;
      }

      const filtered = await fsFilterServices(filter);
      renderServices(filtered);
    });
  });

  // ===============================
  // RENDER SERVICE CARDS
  // ===============================
  function renderServices(services) {
    listEl.innerHTML = "";

    if (!services.length) {
      listEl.innerHTML = `<p class="empty-feed">No services found</p>`;
      return;
    }

    services.forEach(svc => {
      const card = document.createElement("div");
      card.className = "service-card";
      card.dataset.id = svc.id;

      const img = svc.logo || (svc.photos?.length ? svc.photos[0] : "/assets/default-thumb.jpg");

      card.innerHTML = `
        <img class="service-card__image" src="${img}" alt="${svc.businessName}">
        <div class="service-card__info">
          <div class="service-card__title">${svc.businessName}</div>
          <div class="service-card__category">${svc.category}</div>
          <div class="service-card__meta">
            ${svc.phone ? `<span>📞 ${svc.phone}</span>` : ""}
            ${svc.website ? `<span>🌐 ${svc.website}</span>` : ""}
          </div>
          <div class="service-card__cta">View details →</div>
        </div>
      `;

      card.addEventListener("click", () => {
        sessionStorage.setItem("serviceId", svc.id);
        loadView("view-service", { forceInit: true });
      });

      listEl.appendChild(card);
    });
  }
}
