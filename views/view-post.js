console.log("✅ view-post.js loaded");

import { getFirebase } from "/index/js/firebase/init.js";
import {
  doc,
  getDoc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PLACEHOLDER_IMG = "/index/images/image-webholder.webp";
let db;

/* =====================================================
   SPA ENTRY POINT
===================================================== */
export async function init() {
  console.log("🔁 view-post init()");
  const fb = await getFirebase();
  db = fb.db;

  const postId =
    sessionStorage.getItem("viewPostId") ||
    window.selectedPostId;

  if (!postId) {
    window.loadView("home");
    return;
  }

  window.selectedPostId = postId;
  await loadPost(postId);
}

/* =====================================================
   LOAD POST
===================================================== */
async function loadPost(postId) {
  const container = document.getElementById("viewPostContent");
  if (!container) return;

  container.innerHTML = "<p class='loading'>Loading post…</p>";

  const snap = await getDoc(doc(db, "posts", postId));
  if (!snap.exists()) {
    container.textContent = "Post not found.";
    return;
  }

  const post = snap.data();
  updateDoc(doc(db, "posts", postId), { views: increment(1) }).catch(() => {});

  renderPost(container, post);
}

/* =====================================================
   RENDER POST
===================================================== */
function renderPost(container, post) {
  container.innerHTML = "";

  const images = post.imageUrls?.length
    ? post.imageUrls
    : post.imageUrl
    ? [post.imageUrl]
    : [PLACEHOLDER_IMG];

  const layout = document.createElement("div");
  layout.className = "view-post-layout";

  /* ---------- LEFT (Gallery) ---------- */
  const left = document.createElement("div");
  left.className = "view-post-left gallery";

  images.forEach((src) => {
    const slide = document.createElement("div");
    slide.className = "gallery-slide";
    const img = document.createElement("img");
    img.src = src;
    img.onerror = () => (img.src = PLACEHOLDER_IMG);
    slide.appendChild(img);
    left.appendChild(slide);
  });

  /* ---------- RIGHT (Content) ---------- */
  const right = document.createElement("div");
  right.className = "view-post-right";

  // Seller header (fake seller for now, can fetch later)
  const sellerHeader = document.createElement("div");
  sellerHeader.className = "post-seller-header";
  sellerHeader.innerHTML = `
    <img class="seller-header-avatar" src="${PLACEHOLDER_IMG}">
    <div class="seller-header-info">
      <p class="posted-by"><strong>Local Seller</strong></p>
      <p class="posted-on">Rhondda Noticeboard</p>
    </div>
  `;
  right.appendChild(sellerHeader);

  // Title
  const h1 = document.createElement("h1");
  h1.textContent = post.title || "Untitled post";
  right.appendChild(h1);

  // Price
  if (post.price !== undefined) {
    const price = document.createElement("h2");
    price.className = "post-price";
    price.textContent = post.price === 0 ? "FREE" : `£${post.price}`;
    right.appendChild(price);
  }

  // Meta / badges
  const meta = document.createElement("div");
  meta.className = "view-post-meta";
  meta.innerHTML = `
    ${post.category ? `<p><strong>Category</strong>${post.category}</p>` : ""}
    ${post.location ? `<p><strong>Location</strong>${post.location}</p>` : ""}
  `;
  right.appendChild(meta);
  /* ---------- BADGES ---------- */
if (post.badges?.length) {
  const badgeWrap = document.createElement("div");
  badgeWrap.className = "view-post-badges";

  const icons = {
    garden: "🌿 Garden",
    parking: "🚗 Parking",
    pets: "🐾 Pets Allowed",
    urgent: "⚡ Urgent",
    remote: "🏠 Remote Work",
    tickets: "🎟️ Tickets Required",
    freeevent: "🎉 Free Event",
    delivery: "🚚 Delivery",
    collection: "📦 Collection Only",
    assembly: "🛠️ Assembly",
    heavy: "🏋️ Heavy Item",
    boxed: "🎁 Boxed",
    new: "🆕 New"
  };

  post.badges.forEach(b => {
    const badge = document.createElement("span");
    badge.className = "post-badge";
    badge.textContent = icons[b] || b;
    badgeWrap.appendChild(badge);
  });

  right.appendChild(badgeWrap);
}

  /* ---------- CATEGORY SPECIFIC FIELDS ---------- */
const details = document.createElement("div");
details.className = "view-post-details";

switch (post.category) {

  /* ----- PROPERTY ----- */
  case "property":
    details.innerHTML = `
      ${post.propertyListingType ? `<p><strong>Listing:</strong> ${post.propertyListingType}</p>` : ""}
      ${post.propertySalePrice ? `<p><strong>Sale Price:</strong> £${post.propertySalePrice}</p>` : ""}
      ${post.propertyRentAmount ? `<p><strong>Rent:</strong> £${post.propertyRentAmount} ${post.propertyRentFrequency || ""}</p>` : ""}
      ${post.propertyBedrooms ? `<p><strong>Bedrooms:</strong> ${post.propertyBedrooms}</p>` : ""}
      ${post.propertyBathrooms ? `<p><strong>Bathrooms:</strong> ${post.propertyBathrooms}</p>` : ""}
      ${post.propertyEPC ? `<p><strong>EPC Rating:</strong> ${post.propertyEPC}</p>` : ""}
    `;
    break;

  /* ----- JOBS ----- */
  case "jobs":
    details.innerHTML = `
      ${post.jobType ? `<p><strong>Job Type:</strong> ${post.jobType}</p>` : ""}
      ${post.jobSalary ? `<p><strong>Salary:</strong> £${post.jobSalary} ${post.jobSalaryFrequency || ""}</p>` : ""}
      ${post.jobCompany ? `<p><strong>Company:</strong> ${post.jobCompany}</p>` : ""}
    `;
    break;

  /* ----- EVENTS ----- */
  case "events":
    details.innerHTML = `
      ${post.eventDate ? `<p><strong>Date:</strong> ${post.eventDate}</p>` : ""}
      ${post.eventTime ? `<p><strong>Time:</strong> ${post.eventTime}</p>` : ""}
      ${post.eventLocation ? `<p><strong>Location:</strong> ${post.eventLocation}</p>` : ""}
    `;
    break;

  /* ----- COMMUNITY ----- */
  case "community":
    details.innerHTML = `
      ${post.communityTopic ? `<p><strong>Topic:</strong> ${post.communityTopic}</p>` : ""}
    `;
    break;

  /* ----- FOR SALE / FREE ----- */
  case "forsale":
  case "free":
    details.innerHTML = `
      ${post.condition ? `<p><strong>Condition:</strong> ${post.condition}</p>` : ""}
    `;
    break;
}

right.appendChild(details);

  // Description
  const desc = document.createElement("p");
  desc.className = "view-post-desc";
  desc.textContent = post.description || "";
  right.appendChild(desc);

  // Actions
  if (post.phone) {
    const callBtn = document.createElement("a");
    callBtn.href = `tel:${post.phone}`;
    callBtn.className = "engage-btn";
    callBtn.textContent = "Call";
    right.appendChild(callBtn);

    const waBtn = document.createElement("a");
    waBtn.href = `https://wa.me/${post.phone}`;
    waBtn.className = "secondary-btn";
    waBtn.textContent = "WhatsApp";
    right.appendChild(waBtn);
  }

  // Footer buttons
  const footer = document.createElement("div");
  footer.className = "view-post-footer";

  const backBtn = document.createElement("button");
  backBtn.className = "secondary-btn";
  backBtn.textContent = "← Back";
  backBtn.onclick = () => window.loadView("home");

  const reportBtn = document.createElement("button");
  reportBtn.className = "ghost-btn";
  reportBtn.textContent = "Report";

  footer.append(backBtn, reportBtn);

  layout.append(left, right);
  container.append(layout, footer);

  console.log("✅ Post rendered correctly");
}
