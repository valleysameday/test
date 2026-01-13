import { getFirebase } from "/index/js/firebase/init.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

export function initPostSubmit() {
  const btn = document.getElementById("postSubmitBtn");
  const feedback = document.getElementById("postFeedback");

  btn?.addEventListener("click", async () => {
    const { auth, db, storage } = await getFirebase();

    if (!auth.currentUser) {
      feedback.textContent = "❌ Please log in.";
      return;
    }

    const title = document.getElementById("postTitle")?.value.trim();
    const description = document.getElementById("postDescription")?.value.trim();
    const category = document.getElementById("postCategory")?.value;
    const area = document.getElementById("postArea")?.value.trim() || null;

    if (!title || !description || !category) {
      feedback.textContent = "❌ Complete required fields.";
      return;
    }

    feedback.textContent = "Uploading…";

    /* ============================
       IMAGES
    ============================ */
    const files = [...(document.getElementById("postImage")?.files || [])];
    const imageUrls = [];

    for (const file of files) {
      const blob = await window.compressPostImage(file);
      const storageRef = ref(
        storage,
        `posts/${auth.currentUser.uid}/${Date.now()}.jpg`
      );
      await uploadBytes(storageRef, blob);
      imageUrls.push(await getDownloadURL(storageRef));
    }

    /* ============================
       BADGES
    ============================ */
    const badges = [
      ...document.querySelectorAll("input[name='postBadge']:checked")
    ].map(b => b.value);

    /* ============================
       CATEGORY-SPECIFIC FIELDS
    ============================ */
    const data = {
      title,
      description,
      category,
      area,
      badges,
      imageUrl: imageUrls[0] || null,
      imageUrls,
      createdAt: serverTimestamp(),
      userId: auth.currentUser.uid,
      businessId: window.firebaseUserDoc?.isBusiness
        ? auth.currentUser.uid
        : null
    };

    /* ----- FOR SALE / FREE ----- */
    if (category === "forsale" || category === "free") {
      const condition = document.querySelector("input[name='postCondition']:checked")?.value || null;
      const price = document.getElementById("postPrice")?.value || null;

      data.condition = condition;
      data.price = price ? Number(price) : null;
    }

    /* ----- PROPERTY ----- */
    if (category === "property") {
      data.propertyListingType =
        document.querySelector("input[name='propertyListingType']:checked")?.value || null;

      data.propertySalePrice =
        document.getElementById("postPropertySalePrice")?.value || null;

      data.propertyRentAmount =
        document.getElementById("postPropertyRentAmount")?.value || null;

      data.propertyRentFrequency =
        document.getElementById("postPropertyRentFrequency")?.value || null;

      data.propertyBedrooms =
        document.getElementById("propertyBedrooms")?.value || null;

      data.propertyBathrooms =
        document.getElementById("propertyBathrooms")?.value || null;

      data.propertyEPC =
        document.getElementById("propertyEPC")?.value || null;
    }

    /* ----- JOBS ----- */
    if (category === "jobs") {
      data.jobType = document.getElementById("jobType")?.value || null;
      data.jobSalary = document.getElementById("jobSalary")?.value || null;
      data.jobSalaryFrequency = document.getElementById("jobSalaryFrequency")?.value || null;
      data.jobCompany = document.getElementById("jobCompany")?.value || null;
    }

    /* ----- EVENTS ----- */
    if (category === "events") {
      data.eventDate = document.getElementById("eventDate")?.value || null;
      data.eventTime = document.getElementById("eventTime")?.value || null;
      data.eventLocation = document.getElementById("eventLocation")?.value || null;
    }

    /* ----- COMMUNITY ----- */
    if (category === "community") {
      data.communityTopic = document.getElementById("communityTopic")?.value || null;
    }

    /* ============================
       SAVE TO FIRESTORE
    ============================ */
    await addDoc(collection(db, "posts"), data);

    feedback.textContent = "✅ Your ad is live!";
    setTimeout(() => window.closeScreens(), 800);
  });
}
