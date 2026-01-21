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

function renderSellerProfile(seller, sellerId) {
  const isOwner = window.currentUser?.uid === sellerId;

  const nameEl = document.getElementById("sellerName");
  const reliabilityEl = document.getElementById("sellerReliability");
  const avatarEl = document.getElementById("sellerAvatar");
  const bioEl = document.getElementById("sellerBio");
  const contactBtn = document.getElementById("contactSellerBtn");

  nameEl.textContent = seller.name || "Unknown Seller";
  reliabilityEl.textContent = seller.reliability || "";
  avatarEl.style.backgroundImage =
    `url('${seller.avatarUrl || "/index/images/webholder.svg"}')`;
  bioEl.innerHTML = `<p>${seller.bio || "No bio provided."}</p>`;

  // -----------------------------
  // FOLLOW BUTTON
  // -----------------------------
  if (!isOwner) {
    // Create button if not already present
    let followBtn = document.getElementById("profileFollowBtn");
    if (!followBtn) {
      followBtn = document.createElement("button");
      followBtn.id = "profileFollowBtn";
      followBtn.className = "follow-btn";
      followBtn.textContent = "Follow"; // default
      nameEl.parentNode.insertBefore(followBtn, nameEl.nextSibling); // insert after name
    }

    // Update follow state for logged-in users
    if (window.currentUser?.uid) {
      window.isFollowing?.(window.currentUser.uid, sellerId)
        .then(following => {
          followBtn.textContent = following ? "Following" : "Follow";
        })
        .catch(err => console.error("Error checking follow state:", err));
    }

    // Attach toggle
    attachFollowBtn(followBtn, window.currentUser?.uid, sellerId, ({ following, error }) => {
      if (error) {
        if (error === "not-logged-in") {
          showToast("Please log in to follow sellers", "error");
          window.loginRedirect = "stay";
          setTimeout(() => window.openLoginModal?.(), 600);
        }
        console.error("Follow error:", error);
        return;
      }
      followBtn.textContent = following ? "Following" : "Follow";
      showToast(following ? "You are now following this seller" : "Unfollowed seller");
    });
  }

  // -----------------------------
  // OWNER-ONLY AVATAR UPLOAD
  // -----------------------------
  if (isOwner) {
    avatarEl.classList.add("avatar-editable");
    avatarEl.addEventListener("click", () => {
      document.getElementById("avatarUploadInput").click();
    });

    document.getElementById("avatarUploadInput").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const spinner = document.createElement("div");
      spinner.className = "upload-spinner";
      spinner.textContent = "Uploading…";
      avatarEl.appendChild(spinner);

      try {
        const { storage, db } = await getFirebase();
        const compressed = await compressImage(file);
        const fileRef = ref(storage, `avatars/${sellerId}.jpg`);
        await uploadBytes(fileRef, compressed);
        const url = await getDownloadURL(fileRef);
        await updateDoc(doc(db, "users", sellerId), { avatarUrl: url });
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

  // -----------------------------
  // OWNER-ONLY BIO EDIT
  // -----------------------------
  if (isOwner) {
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit Bio";
    editBtn.className = "edit-btn";
    bioEl.appendChild(editBtn);

    editBtn.onclick = async () => {
      const currentBio = seller.bio || "";
      bioEl.innerHTML = `
        <textarea id="bioEditArea" class="bio-textarea">${currentBio}</textarea>
        <button id="saveBioBtn" class="primary-btn">Save</button>
      `;

      const saveBtn = document.getElementById("saveBioBtn");
      const textarea = document.getElementById("bioEditArea");

      saveBtn.onclick = async () => {
        const newBio = textarea.value.trim();
        try {
          const { db } = await getFirebase();
          await updateDoc(doc(db, "users", sellerId), { bio: newBio });
          bioEl.innerHTML = `<p>${newBio || "No bio provided."}</p>`;
          bioEl.appendChild(editBtn);
          showToast("Bio updated successfully");
        } catch (err) {
          console.error("Bio update failed:", err);
          showToast("Failed to update bio", "error");
        }
      };
    };
  }

  // -----------------------------
  // CONTACT SELLER BUTTON
  // -----------------------------
  contactBtn.onclick = () => {
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
