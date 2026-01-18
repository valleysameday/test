import { getFirebase } from "/index/js/firebase/init.js";
import { 
  doc, getDoc, collection, query, where, orderBy, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ============================================================
   AUTO‑LOAD CSS (only once)
============================================================ */
(function loadSellerProfileCSS() {
  if (document.getElementById("sellerProfileCSS")) return;

  const link = document.createElement("link");
  link.id = "sellerProfileCSS";
  link.rel = "stylesheet";
  link.href = "/index/css/seller-profile.css";
  document.head.appendChild(link);
})();

/* ============================================================
   MAIN ENTRY POINT
============================================================ */
async function initSellerProfile() {
  const { db } = await getFirebase();

  const sellerId = window.selectedSellerId;
  if (!sellerId) {
    console.error("❌ No sellerId provided to seller-profile view");
    return;
  }

  const sellerRef = doc(db, "users", sellerId);
  const snap = await getDoc(sellerRef);

  if (!snap.exists()) {
    document.getElementById("sellerProfilePage").innerHTML =
      "<p>Seller not found.</p>";
    return;
  }

  const seller = snap.data();

  document.getElementById("sellerBackBtn").onclick = () => {
  console.log("⬅️ Seller Profile Back clicked");
window.history.back();
};

  renderSellerProfile(seller, sellerId);
  loadSellerAds(sellerId, db);
}

/* ============================================================
   RENDER PROFILE
============================================================ */
function renderSellerProfile(seller, sellerId) {
  const isOwner = window.currentUser?.uid === sellerId;

  document.getElementById("sellerName").textContent =
    seller.name || "Unknown Seller";

  document.getElementById("sellerReliability").textContent =
    seller.reliability || "";

  const avatarEl = document.getElementById("sellerAvatar");
  avatarEl.style.backgroundImage =
    `url('${seller.avatarUrl || "/index/images/webholder.svg"}')`;

  document.getElementById("sellerBio").innerHTML =
    `<p>${seller.bio || "No bio provided."}</p>`;

  /* ============================================================
     OWNER‑ONLY AVATAR UPLOAD
  ============================================================ */
  if (isOwner) {
    avatarEl.classList.add("avatar-editable");

    // Clicking avatar opens file picker
    avatarEl.addEventListener("click", () => {
      document.getElementById("avatarUploadInput").click();
    });

    // Handle file upload
    document.getElementById("avatarUploadInput").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { storage, db } = await getFirebase();

        // Upload to Firebase Storage
        const fileRef = window.storageRef(storage, `avatars/${sellerId}.jpg`);
        await window.uploadBytes(fileRef, file);

        // Get URL
        const url = await window.getDownloadURL(fileRef);

        // Save to Firestore
        await updateDoc(doc(db, "users", sellerId), {
          avatarUrl: url
        });

        // Update UI instantly
        avatarEl.style.backgroundImage = `url('${url}')`;

      } catch (err) {
        console.error("Avatar upload failed:", err);
      }
    });
  }

  /* ============================================================
     OWNER‑ONLY BIO EDIT BUTTON
  ============================================================ */
  if (isOwner) {
    const bioEl = document.getElementById("sellerBio");
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit Bio";
    editBtn.className = "edit-btn";
    bioEl.appendChild(editBtn);
  }

  /* Contact Seller */
  document.getElementById("contactSellerBtn").onclick = () => {
    window.selectedChatUserId = sellerId;
    window.loadView("chat");
  };
}

/* ============================================================
   LOAD SELLER'S OTHER ADS
============================================================ */
async function loadSellerAds(sellerId, db) {
  const container = document.getElementById("sellerAdsContainer");
  const PLACEHOLDER = "/images/post-placeholder.jpg";

  const q = query(
    collection(db, "posts"),
    where("userId", "==", sellerId),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  container.innerHTML = "";

  if (snap.empty) {
    container.innerHTML = "<p>This seller has no other ads.</p>";
    return;
  }

  snap.forEach(docSnap => {
    const post = { id: docSnap.id, ...docSnap.data() };

    const card = document.createElement("div");
    card.className = "post-card";
    card.addEventListener("click", () => {
      window.selectedPostId = post.id;
      window.loadView("view-post");
    });

    const imgSrc =
      post.imageUrl ||
      (Array.isArray(post.imageUrls) && post.imageUrls[0]) ||
      PLACEHOLDER;

    const img = document.createElement("img");
    img.src = imgSrc;
    img.alt = post.title || "Ad image";
    img.loading = "lazy";
    img.onerror = () => img.src = PLACEHOLDER;

    const postImageDiv = document.createElement("div");
    postImageDiv.className = "post-image";
    postImageDiv.appendChild(img);

    const postBody = document.createElement("div");
    postBody.className = "post-body";

    const h3 = document.createElement("h3");
    h3.textContent = post.title || "Untitled";

    const desc = document.createElement("p");
    desc.className = "post-desc";
    desc.textContent = post.description || "";

    postBody.appendChild(h3);
    postBody.appendChild(desc);

    card.appendChild(postImageDiv);
    card.appendChild(postBody);

    container.appendChild(card);
  });
}

/* ============================================================
   SPA ENTRY POINT (must be top-level)
============================================================ */
export async function init() {
  return initSellerProfile();
}
