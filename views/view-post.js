console.log("✅ view-post.js loaded");

import { getFirebase } from "/index/js/firebase/init.js";
import { doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { toggleFollow, isFollowing } from "/index/js/social/follow.js";

const PLACEHOLDER_IMG = "/index/images/webholder.svg";
let db;

/* =====================================================
   TOAST
===================================================== */
function showToast(msg, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/* =====================================================
   SPA ENTRY
===================================================== */
export async function init() {
  const fb = await getFirebase();
  db = fb.db;

  await waitForAuth();

  let postId = null;
  await new Promise(resolve => {
    const check = setInterval(() => {
      postId = sessionStorage.getItem("viewPostId") || window.selectedPostId;
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
function waitForAuth(timeout = 1500) {
  return new Promise(resolve => {
    if (window.currentUser !== undefined) return resolve();

    const start = Date.now();
    const check = setInterval(() => {
      if (window.currentUser !== undefined) {
        clearInterval(check);
        resolve();
      }
      if (Date.now() - start > timeout) {
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

  const post = { id: snap.id, ...snap.data() };

  /* 🔢 Safe view increment */
  updateDoc(doc(db, "posts", postId), {
    views: increment(1)
  }).catch(() => {});

  await renderPost(container, post);
}

/* =====================================================
   RENDER POST
===================================================== */
async function renderPost(container, post) {
  container.innerHTML = "";

  const currentUser = window.currentUser || null;

  // Seller defaults
  let sellerName = "Local Seller";
  let sellerAvatar = PLACEHOLDER_IMG;
  let sellerSince = null;

  if (post.userId) {
    const u = await getDoc(doc(db, "users", post.userId));
    if (u.exists()) {
      const data = u.data();
      sellerName = data.firstName || sellerName;
      sellerAvatar = data.profileImage || PLACEHOLDER_IMG;
      sellerSince = data.createdAt
        ? new Date(data.createdAt).toLocaleDateString("en-GB", {
            year: "numeric",
            month: "long"
          })
        : null;
    }
  }

  // Images
  const images = post.imageUrls?.length
    ? post.imageUrls
    : post.imageUrl
    ? [post.imageUrl]
    : [PLACEHOLDER_IMG];

  // Layout
  const layout = document.createElement("div");
  layout.className = "view-post-layout";

  const left = document.createElement("div");
  left.className = "view-post-left gallery";
  images.forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.onerror = () => (img.src = PLACEHOLDER_IMG);
    left.appendChild(img);
  });

  const right = document.createElement("div");
  right.className = "view-post-right";

  right.innerHTML = `
  <div id="sellerHeaderClickable" class="post-seller-header">
    <img class="seller-header-avatar" src="${sellerAvatar}">
    <div class="seller-header-info">
      <p class="posted-by"><strong>${sellerName}</strong></p>
      <p class="posted-on">RCT-X</p>
      ${
        sellerSince
          ? `<p class="posted-since">Posting since: ${sellerSince}</p>`
          : ""
      }
    </div>
  </div>

  <h1>${post.title || "Untitled post"}</h1>
`;

  /* =====================================================
     FOLLOW BUTTON (ALWAYS VISIBLE)
  ===================================================== */
  const sellerInfo = right.querySelector(".seller-header-info");
  const followBtn = document.createElement("button");
  followBtn.className = "follow-btn";
  followBtn.textContent = "Follow";

  if (currentUser?.uid === post.userId) {
    followBtn.style.display = "none";
  } else {
    sellerInfo.appendChild(followBtn);

    const setupFollowButton = async () => {
      if (currentUser?.uid) {
        const viewerId = currentUser.uid;
        const sellerId = post.userId;

        try {
          const following = await isFollowing(viewerId, sellerId);
          followBtn.textContent = following ? "Following" : "Follow";
        } catch {
          followBtn.textContent = "Follow";
        }

        followBtn.onclick = async () => {
          try {
            const res = await toggleFollow(viewerId, sellerId);
            followBtn.textContent = res.following ? "Following" : "Follow";
            showToast(
              res.following
                ? "You’re now following this seller"
                : "Unfollowed seller"
            );
          } catch (err) {
            console.error(err);
            showToast("Action not allowed", "error");
          }
        };
      } else {
        followBtn.onclick = () => {
          showToast("You must be logged in to follow sellers", "error");
          window.loginRedirect = "stay";
          setTimeout(() => window.openLoginModal(), 600);
        };
      }
    };

    setupFollowButton();
  }

  const sellerHeader = right.querySelector("#sellerHeaderClickable");

  sellerHeader.addEventListener("click", (e) => {
    if (e.target.closest(".follow-btn")) return;
    window.selectedSellerId = post.userId;
    window.loadView("seller-profile");
  });

  // Price
  if (post.price !== undefined) {
    const price = document.createElement("h2");
    price.className = "post-price";
    price.textContent = post.price === 0 ? "FREE" : `£${post.price}`;
    right.appendChild(price);
  }

  // Description
  const desc = document.createElement("p");
  desc.className = "view-post-desc";
  desc.textContent = post.description || "";
  right.appendChild(desc);

  /* =====================================================
     CONTACT BOX (ALWAYS VISIBLE)
  ===================================================== */
  const contactBox = document.createElement("div");
  contactBox.className = "contact-box";

  contactBox.innerHTML = `
    <h3>Contact Seller</h3>

    <button id="msgSellerBtn" class="primary-btn">Message Seller</button>

    ${
      post.allowWhatsApp && post.phone
        ? `<button id="whatsappBtn" class="whatsapp-btn">WhatsApp</button>`
        : ""
    }

    ${
      post.phone
        ? `<button id="callBtn" class="secondary-btn">Call Seller</button>`
        : ""
    }
  `;

  right.appendChild(contactBox);

  /* =====================================================
     CONTACT BUTTON LOGIC (AFTER DOM INSERT)
  ===================================================== */
  const msgBtn = right.querySelector("#msgSellerBtn");
  const whatsappBtn = right.querySelector("#whatsappBtn");
  const callBtn = right.querySelector("#callBtn");

  function requireLogin() {
    if (!window.currentUser) {
      window.loginRedirect = "stay";
      showToast("Please log in to contact the seller", "error");
      setTimeout(() => window.openLoginModal(), 600);
      return false;
    }
    return true;
  }

  msgBtn.onclick = () => {
    if (!requireLogin()) return;
    window.selectedChatSeller = post.userId;
    window.selectedChatPost = post.id;
    window.loadView("messages");
  };

  if (whatsappBtn) {
    whatsappBtn.onclick = () => {
      if (!requireLogin()) return;
      const number = post.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${number}`, "_blank");
    };
  }

  if (callBtn) {
    callBtn.onclick = () => {
      if (!requireLogin()) return;
      const number = post.phone.replace(/\D/g, "");
      window.location.href = `tel:${number}`;
    };
  }

  /* =====================================================
     FOOTER
  ===================================================== */
  const footer = document.createElement("div");
  footer.className = "view-post-footer";

  const backBtn = document.createElement("button");
  backBtn.className = "secondary-btn";
  backBtn.textContent = "← Back";
  backBtn.onclick = () => window.loadView("home");

  footer.appendChild(backBtn);

  layout.append(left, right);
  container.append(layout, footer);
}
