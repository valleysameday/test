import { getFirebase } from "/index/js/firebase/init.js";
import { 
  doc, getDoc, collection, query, where, orderBy, getDocs, updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { 
  ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

/* ============================================================
   IMAGE COMPRESSION HELPER
============================================================ */
function compressImage(file, maxSize = 600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("Compression failed"));
      }, "image/jpeg", 0.8);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

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
    window.loadView("view-post");
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

    avatarEl.addEventListener("click", () => {
      document.getElementById("avatarUploadInput").click();
    });

    document.getElementById("avatarUploadInput").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Spinner
      const spinner = document.createElement("div");
      spinner.className = "upload-spinner";
      spinner.textContent = "Uploading…";
      avatarEl.appendChild(spinner);

      try {
        const { storage, db } = await getFirebase();

        // Compress image
        const compressed = await compressImage(file);

        // Upload
        const fileRef = ref(storage, `avatars/${sellerId}.jpg`);
        await uploadBytes(fileRef, compressed);

        // Get URL
        const url = await getDownloadURL(fileRef);

        // Save to Firestore
        await updateDoc(doc(db, "users", sellerId), {
          avatarUrl: url
        });

        // Update UI
        avatarEl.style.backgroundImage = `url('${url}')`;
        showToast("Avatar updated successfully");

      } catch (err) {
        console.error("Avatar upload failed:", err);
        showToast("Upload failed. Try again", "error");
      } finally {
        spinner.remove();
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
  const PLACEHOLDER = "/index/images/webholder.svg";

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
   SPA ENTRY POINT
============================================================ */
export async function init() {
  return initSellerProfile();
}
