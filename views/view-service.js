// ===============================
// view-service.js
// ===============================

import { getFirebase } from "/index/js/firebase/init.js";

export async function init() {
  console.log("📘 Service profile loaded");

  const serviceId = sessionStorage.getItem("serviceId");
  if (!serviceId) return console.error("No service ID found");

  // Firestore helper functions
  let db;
  async function fsGetServiceById(id) {
    if (!db) {
      const fb = await getFirebase();
      db = fb.db;
    }
    const docRef = doc(db, "services", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() };
  }

  async function fsReportService(id, reason) {
    if (!db) {
      const fb = await getFirebase();
      db = fb.db;
    }
    await setDoc(doc(collection(db, "serviceReports")), {
      serviceId: id,
      reason,
      reportedAt: new Date()
    });
  }

  const svc = await fsGetServiceById(serviceId);
  if (!svc) return console.error("Service not found");

  // ===============================
  // Populate UI
  // ===============================
  document.getElementById("serviceName").textContent = svc.businessName;
  document.getElementById("serviceCategory").textContent = svc.category;
  document.getElementById("serviceDescription").textContent = svc.description;
  document.getElementById("servicePhone").textContent = svc.phone || "Not provided";
  document.getElementById("serviceWebsite").textContent = svc.website || "";
  document.getElementById("serviceWebsite").href = svc.website || "#";
  document.getElementById("serviceArea").textContent = svc.area || "Rhondda Valleys";

  // ===============================
  // Gallery
  // ===============================
  const gallery = document.getElementById("serviceGallery");
  gallery.innerHTML = "";

  if (svc.photos?.length) {
    svc.photos.forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.className = "service-gallery-img";
      gallery.appendChild(img);
    });
  }

  // ===============================
  // Message Business
  // ===============================
  document.getElementById("messageBusinessBtn").addEventListener("click", () => {
    alert("Messaging system coming soon");
  });

  // ===============================
  // Report Listing
  // ===============================
  document.getElementById("reportServiceBtn").addEventListener("click", async () => {
    const reason = prompt("Why are you reporting this listing?");
    if (!reason) return;

    await fsReportService(serviceId, reason);
    alert("Thank you — your report has been submitted.");
  });
}
