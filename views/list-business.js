// ===============================
// view-list-business.js
// ===============================

import { getFirebase } from "/index/js/firebase/init.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function initViewListBusiness() {
  console.log("📝 List a business page loaded");

  const form = document.getElementById("listBusinessForm");
  if (!form) return console.error("Form not found");

  let db;
  async function saveBusiness(data) {
    if (!db) {
      const fb = await getFirebase();
      db = fb.db;
    }

    const colRef = collection(db, "services");
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: new Date(),
      isActive: false
    });

    return docRef.id;
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const businessName = form.businessName.value.trim();
    const category = form.category.value;
    const phone = form.phone.value.trim();
    const website = form.website.value.trim();
    const area = form.area.value.trim();
    const description = form.description.value.trim();
    const logo = form.logo.value.trim();

    if (!businessName || !category) {
      alert("Please provide at least a business name and category");
      return;
    }

    const newBusiness = { businessName, category, phone, website, area, description, logo };

    try {
      const id = await saveBusiness(newBusiness);
      alert("✅ Your business has been submitted! It will appear in the directory once approved.");
      window.loadView("services");
    } catch (err) {
      console.error("Failed to save business:", err);
      alert("⚠️ Something went wrong, please try again later.");
    }
  });
}
