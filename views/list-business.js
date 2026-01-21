// ===============================
// view-list-business.js
// ===============================

import { getFirebase } from "/index/js/firebase/init.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

console.log("🔥 view-list-business.js FILE LOADED");

export async function initViewListBusiness() {
  console.log("🚀 initViewListBusiness() CALLED");

  const form = document.getElementById("listBusinessForm");
  console.log("🔍 Form lookup:", form);

  if (!form) {
    console.error("❌ Form not found — JS cannot attach submit handler");
    return;
  }

  let db;
  async function saveBusiness(data) {
    console.log("💾 saveBusiness() called with:", data);

    if (!db) {
      console.log("📡 Getting Firebase instance...");
      const fb = await getFirebase();
      db = fb.db;
      console.log("✅ Firebase DB loaded:", db);
    }

    console.log("📁 Writing to Firestore: services collection");
    const colRef = collection(db, "services");

    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: new Date(),
      isActive: false
    });

    console.log("🎉 Firestore write complete. New ID:", docRef.id);
    return docRef.id;
  }

  console.log("🧩 Attaching submit listener...");
  form.addEventListener("submit", async e => {
    console.log("🟦 FORM SUBMIT FIRED");
    e.preventDefault();

    const businessName = form.businessName.value.trim();
    const category = form.category.value;
    const phone = form.phone.value.trim();
    const website = form.website.value.trim();
    const area = form.area.value.trim();
    const description = form.description.value.trim();
    const logo = form.logo.value.trim();

    console.log("📨 Form values:", {
      businessName, category, phone, website, area, description, logo
    });

    if (!businessName || !category) {
      console.warn("⚠️ Missing required fields");
      alert("Please provide at least a business name and category");
      return;
    }

    const newBusiness = { businessName, category, phone, website, area, description, logo };
    console.log("📦 Prepared business object:", newBusiness);

    try {
      console.log("🚚 Saving business to Firestore...");
      const id = await saveBusiness(newBusiness);
      console.log("🎯 Business saved with ID:", id);

      alert("✅ Your business has been submitted! It will appear in the directory once approved.");

      console.log("🔄 Redirecting to services view...");
      window.loadView("services");

    } catch (err) {
      console.error("💥 Failed to save business:", err);
      alert("⚠️ Something went wrong, please try again later.");
    }
  });

  console.log("✅ Submit listener attached successfully");
}
