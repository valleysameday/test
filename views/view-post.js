console.log("✅ view-post.js loaded");

import { getFirebase } from "/index/js/firebase/init.js";
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  query,
  collection,
  where,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PLACEHOLDER_IMG = "/index/images/webholder.svg";
let db;

/* =====================================================
   SPA ENTRY POINT
===================================================== */
export async function init() {
  console.log("🔁 view-post init()");
  const fb = await getFirebase();
  db = fb.db;

  // Wait for Firebase Auth
  await waitForAuth();

  // Wait for postId to be set by feed.js
  let postId = null;

  await new Promise(resolve => {
    const check = setInterval(() => {
      postId =
        sessionStorage.getItem("viewPostId") ||
        window.selectedPostId;

      if (postId) {
        clearInterval(check);
        resolve();
      }
    }, 30);
  });

  window.selectedPostId = postId;
  await loadPost(postId);
}

/* =====================================================
   WAIT FOR AUTH
===================================================== */
function waitForAuth() {
  return new Promise(resolve => {
    const check = setInterval(() => {
      if (window.currentUser) {
        clearInterval(check);
        resolve();
      }
    }, 50);
  });
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

  // Increment views
  updateDoc(doc(db, "posts", postId), { views: increment(1) }).catch(() => {});

  await renderPost(container, post);
}

/* =====================================================
   START CONVERSATION
===================================================== */
async function startConversation(post) {
  const { db } = await getFirebase();
  const uid = window.currentUser.uid;
  const sellerId = post.userId;

  if (!uid) {
    alert("Please sign in to message the seller.");
    return;
  }

  // Check if conversation already exists
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", uid)
  );

  const snap = await getDocs(q);

  let existingConv = null;

  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.participants.includes(sellerId)) {
      existingConv = docSnap.id;
    }
  });

  let conversationId = existingConv;

  // Create new conversation if none exists
  if (!conversationId) {
    const convRef = await addDoc(collection(db, "conversations"), {
      participants: [uid, sellerId],
      lastMessage: "",
      updatedAt: Date.now(),
      postId: post.id || window.selectedPostId,
      deletedFor: {}
    });

    conversationId = convRef.id;
  }

  // Store for dashboard.js
  sessionStorage.setItem("openConversationId", conversationId);

  // Load dashboard messaging view
  window.loadView("dashboard", "messages");
}

/* =====================================================
   RENDER POST
===================================================== */
async function renderPost(container, post) {
  container.innerHTML = "";

  /* ---------- FETCH SELLER NAME ---------- */
  let sellerName = "Local Seller";

  if (post.userId) {
    try {
      const userSnap = await getDoc(doc(db, "users", post.userId));
      if (userSnap.exists()) {
        sellerName = userSnap.data().firstName || "Local Seller";
      }
    } catch (err) {
      console.error("Failed to load seller name:", err);
    }
  }

  const currentUser = window.currentUser || null;

  /* ---------- IMAGES ---------- */
  const images = post.imageUrls?.length
    ? post.imageUrls
    : post.imageUrl
    ? [post.imageUrl]
    : [PLACEHOLDER_IMG];

  const layout = document.createElement("div");
  layout.className = "view-post-layout";

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

  /* ---------- RIGHT SIDE ---------- */
  const right = document.createElement("div");
  right.className = "view-post-right";

  /* ---------- SELLER HEADER ---------- */
  const sellerHeader = document.createElement("div");
  sellerHeader.className = "post-seller-header";
  sellerHeader.innerHTML = `
    <img class="seller-header-avatar" src="${PLACEHOLDER_IMG}">
    <div class="seller-header-info">
      <p class="posted-by"><strong>${sellerName}</strong></p>
      <p class="posted-on">Rhondda Noticeboard</p>
    </div>
  `;
  right.appendChild(sellerHeader);

  /* ---------- TITLE ---------- */
  const h1 = document.createElement("h1");
  h1.textContent = post.title || "Untitled post";
  right.appendChild(h1);

  /* ---------- PRICE ---------- */
  if (post.price !== undefined) {
    const price = document.createElement("h2");
    price.className = "post-price";
    price.textContent = post.price === 0 ? "FREE" : `£${post.price}`;
    right.appendChild(price);
  }

  /* ---------- META ---------- */
  const meta = document.createElement("div");
  meta.className = "view-post-meta";
  meta.innerHTML = `
    ${post.category ? `<p><strong>Category</strong>${post.category}</p>` : ""}
    ${post.area ? `<p><strong>Area</strong>${post.area}</p>` : ""}
  `;
  right.appendChild(meta);

  /* ---------- MESSAGE SELLER BUTTON ---------- */
  if (post.userId && currentUser && post.userId !== currentUser.uid) {
    const msgBtn = document.createElement("button");
    msgBtn.className = "primary-btn";
    msgBtn.textContent = "Message Seller";
    msgBtn.onclick = () => startConversation(post);
    right.appendChild(msgBtn);
  }

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

  /* ---------- CATEGORY DETAILS ---------- */
  const details = document.createElement("div");
  details.className = "view-post-details";

  switch (post.category) {
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

    case "jobs":
      details.innerHTML = `
        ${post.jobType ? `<p><strong>Job Type:</strong> ${post.jobType}</p>` : ""}
        ${post.jobSalary ? `<p><strong>Salary:</strong> £${post.jobSalary} ${post.jobSalaryFrequency || ""}</p>` : ""}
        ${post.jobCompany ? `<p><strong>Company:</strong> ${post.jobCompany}</p>` : ""}
      `;
      break;

    case "events":
      details.innerHTML = `
        ${post.eventDate ? `<p><strong>Date:</strong> ${post.eventDate}</p>` : ""}
        ${post.eventTime ? `<p><strong>Time:</strong> ${post.eventTime}</p>` : ""}
        ${post.eventLocation ? `<p><strong>Location:</strong> ${post.eventLocation}</p>` : ""}
      `;
      break;

    case "community":
      details.innerHTML = `
        ${post.communityTopic ? `<p><strong>Topic:</strong> ${post.communityTopic}</p>` : ""}
      `;
      break;

    case "forsale":
    case "free":
      details.innerHTML = `
        ${post.condition ? `<p><strong>Condition:</strong> ${post.condition}</p>` : ""}
      `;
      break;
  }

  right.appendChild(details);

  /* ---------- DESCRIPTION ---------- */
  const desc = document.createElement("p");
  desc.className = "view-post-desc";
  desc.textContent = post.description || "";
  right.appendChild(desc);

  /* ---------- ACTION BUTTONS ---------- */
  if (post.phone) {
    const callBtn = document.createElement("a");
    callBtn.href = `tel:${post.phone}`;
    callBtn.className = "engage-btn";
    callBtn.textContent = "Call";
    right.appendChild(callBtn);

    const cleaned = post.phone.replace(/\D/g, "");
    const isMobile = /^07\d{8,9}$/.test(cleaned);

    if (post.allowWhatsApp && isMobile) {
      const waBtn = document.createElement("a");
      waBtn.href = `https://wa.me/44${cleaned.slice(1)}`;
      waBtn.className = "secondary-btn";
      waBtn.textContent = "WhatsApp";
      right.appendChild(waBtn);
    }
  }

  /* ---------- FOOTER ---------- */
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
