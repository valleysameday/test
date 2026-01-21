console.log("📄 render.js loaded");

import { createGallery } from "/postViews/gallery.js";
import { showToast } from "/postViews/toast.js";
import { attachFollowBtn, isFollowing } from "/index/js/social/follow.js";

// =========================================================
// MAIN RENDER FUNCTION
// =========================================================
export async function renderPost({ post, seller, onSendMessage, onContactClick }) {
  console.log("🧩 renderPost called:", { post, seller });

  // ------------------- GALLERY -------------------
  const galleryContainer = document.getElementById("postGallery");
  if (galleryContainer) {
    galleryContainer.innerHTML = "";
    const images = post.imageUrls?.length
      ? post.imageUrls
      : post.imageUrl
      ? [post.imageUrl]
      : ["/index/images/webholder.svg"];
    galleryContainer.appendChild(createGallery(images));
  }

  // ------------------- DETAILS -------------------
  const titleEl = document.getElementById("postTitle");
  if (titleEl) titleEl.textContent = post.title || "Untitled post";

  const ts = post.createdAt?.toMillis ? post.createdAt.toMillis() : post.createdAt;
  const postedTimeEl = document.getElementById("postedTime");
  if (postedTimeEl) postedTimeEl.textContent = `Posted ${timeAgo(ts)}`;

  const priceEl = document.getElementById("postPrice");
  if (priceEl) {
    if (post.category === "property") {
      const sale = Number(post.propertySalePrice || 0);
      const rent = Number(post.propertyRentAmount || 0);
      const freq = (post.propertyRentFrequency || "").toLowerCase();
      priceEl.textContent = rent
        ? `£${rent} ${["pw", "weekly"].includes(freq) ? "pw" : "pcm"}`
        : sale
        ? `£${sale.toLocaleString()}`
        : "£—";
    } else {
      priceEl.textContent = post.price === 0 ? "FREE" : post.price ? `£${post.price}` : "";
    }
  }

  const descEl = document.getElementById("postDescription");
  if (descEl) descEl.textContent = post.description || "";

  // ------------------- SELLER -------------------
  const sellerAvatar = document.getElementById("sellerAvatar");
  if (sellerAvatar) sellerAvatar.src = seller?.avatarUrl || "/index/images/webholder.svg";

  const sellerName = document.getElementById("sellerName");
  if (sellerName) sellerName.innerHTML = `<strong>${seller?.firstName || "Local Seller"}</strong>`;

  const sellerSince = document.getElementById("sellerSince");
  if (sellerSince) sellerSince.textContent = seller?.createdAt
    ? `Posting since: ${new Date(seller.createdAt).toLocaleDateString("en-GB", { year: "numeric", month: "long" })}`
    : "";

  // Follow button
  const followBtn = document.getElementById("followBtn");
  if (followBtn) {
    if (!window.currentUser || window.currentUser.uid === post.userId) {
      followBtn.style.display = "none";
    } else {
      followBtn.style.display = "inline-block";

      if (window.currentUser?.uid) {
        isFollowing(window.currentUser.uid, post.userId)
          .then(following => followBtn.textContent = following ? "Following" : "Follow")
          .catch(err => console.error("Error checking follow state:", err));

        attachFollowBtn(followBtn, window.currentUser.uid, post.userId, ({ following, error }) => {
          if (error) {
            if (error === "not-logged-in") {
              showToast("You must be logged in to follow sellers", "error");
              window.loginRedirect = "stay";
              setTimeout(() => window.openLoginModal?.(), 600);
            }
            console.error("Follow error:", error);
            return;
          }
          followBtn.textContent = following ? "Following" : "Follow";
          showToast(following
            ? "✴️ You are now following this seller"
            : "✅️ Successful, you've unfollowed this seller"
          );
        });
      }
    }
  }

  // ------------------- FAVOURITE -------------------
  const favBtn = document.getElementById("favBtn");
  if (favBtn) {
    favBtn.textContent = post.isFavorited ? "★ Saved" : "☆ Save";
    favBtn.onclick = () => {
      if (!window.currentUser) {
        showToast("Please log in to save posts", "error");
        window.loginRedirect = "stay";
        setTimeout(() => window.openLoginModal?.(), 600);
        return;
      }

      post.isFavorited = !post.isFavorited;
      favBtn.textContent = post.isFavorited ? "★ Saved" : "☆ Save";
      showToast(post.isFavorited ? "Added to your favourites" : "Removed from favourites");
      // TODO: Save favourite to Firestore
    };
  }

  // ------------------- REPORT -------------------
  const reportBtn = document.getElementById("reportBtn");
  const reportMenu = document.getElementById("reportMenu");

  if (reportBtn && reportMenu) {
    reportBtn.onclick = e => {
      e.stopPropagation();
      reportMenu.style.display = reportMenu.style.display === "none" ? "block" : "none";
    };

    document.addEventListener("click", () => {
      reportMenu.style.display = "none";
    });

    reportMenu.querySelectorAll("li").forEach(item => {
      item.onclick = e => {
        const reason = e.target.dataset.reason;
        showToast(`Reported for: ${reason}`);
        reportMenu.style.display = "none";
        // TODO: Send report to Firestore / backend
      };
    });
  }

  // ------------------- CONTACT -------------------
  const msgBtn = document.getElementById("msgSellerBtn");
  const msgInput = document.getElementById("messageInput");
  const contactBtn = document.getElementById("contactSellerBtn");
  const whatsappBtn = document.getElementById("whatsappBtn");

  if (msgBtn && msgInput) {
    msgBtn.onclick = () => {
      if (!window.currentUser) {
        showToast("Please log in to contact the seller", "error");
        window.loginRedirect = "stay";
        setTimeout(() => window.openLoginModal?.(), 600);
        return;
      }

      onSendMessage({
        post,
        sellerId: post.userId,
        messageText: msgInput.value,
        imageUrl: post.imageUrls?.[0] || post.imageUrl
      });
    };
  }

  if (contactBtn) {
    contactBtn.onclick = () => {
      if (!window.currentUser) {
        showToast("Please log in to contact the seller", "error");
        window.loginRedirect = "stay";
        setTimeout(() => window.openLoginModal?.(), 600);
        return;
      }

      onContactClick(post.id);
      contactBtn.textContent = post.phone;
      contactBtn.disabled = true;
    };
  }

  if (whatsappBtn) {
    whatsappBtn.onclick = e => {
      if (!window.currentUser) {
        e.preventDefault();
        showToast("Please log in to contact the seller", "error");
        window.loginRedirect = "stay";
        setTimeout(() => window.openLoginModal?.(), 600);
      }
    };
  }

  // ------------------- SHARE -------------------
  document.querySelectorAll(".share-btn").forEach(btn => {
    btn.onclick = () => {
      const platform = btn.dataset.platform;
      const url = location.href;
      const title = document.getElementById("postTitle")?.textContent || "Check this out on RCT-X";

      if (platform === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(title + " " + url)}`);
      } else if (platform === "messenger") {
        window.open(`https://www.facebook.com/share.php?u=${encodeURIComponent(url)}`);
      } else if (platform === "email") {
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
      }
    };
  });

  // ------------------- BACK -------------------
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.onclick = () => window.loadView("home");
}

// =========================================================
// HELPER: TIME AGO
// =========================================================
function timeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const s = Math.floor(diff / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w} week${w === 1 ? "" : "s"} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const y = Math.floor(d / 365);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}
