// /postViews/render.js
console.log("📄 render.js loaded");
import { getFirebase } from "/index/js/firebase/init.js";
import { doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createGallery } from "/postViews/gallery.js";
import { showToast } from "/postViews/toast.js";
import { attachFollowBtn, isFollowing } from "/index/js/social/follow.js";

// =========================================================
// MAIN RENDER FUNCTION
// =========================================================
export async function renderPost({
  container,
  post,
  seller,
  db,
  onSendMessage,
  onContactClick
}) {
  console.log("🧩 renderPost called:", { post, seller });
  container.innerHTML = "";

  const layout = document.createElement("div");
  layout.className = "view-post-layout";

  // -------------------------------------------------------
  // TIME AGO
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  // LEFT: GALLERY
  // -------------------------------------------------------
  const images = post.imageUrls?.length
    ? post.imageUrls
    : post.imageUrl
    ? [post.imageUrl]
    : ["/index/images/webholder.svg"];

  const gallery = createGallery(images);

  // -------------------------------------------------------
  // RIGHT: DETAILS
  // -------------------------------------------------------
  const right = document.createElement("div");
  right.className = "view-post-right";

  // Seller header (await async function)
  const sellerHeader = await buildSellerHeader({
    seller,
    post,
    onFollowBlocked: () => {
      showToast("You must be logged in to follow sellers", "error");
      window.loginRedirect = "stay";
      setTimeout(() => window.openLoginModal?.(), 600);
    }
  });
  right.appendChild(sellerHeader);

  // Title
  const title = document.createElement("h1");
  title.textContent = post.title || "Untitled post";
  right.appendChild(title);

  // Posted time
  if (post.createdAt) {
    const postedTime = document.createElement("p");
    postedTime.className = "posted-time";
    const ts = post.createdAt?.toMillis
      ? post.createdAt.toMillis()
      : post.createdAt;
    postedTime.textContent = `Posted ${timeAgo(ts)}`;
    right.appendChild(postedTime);
  }

  // Price
  const priceEl = document.createElement("h2");
  priceEl.className = "post-price";

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
    priceEl.textContent =
      post.price === 0 ? "FREE" : post.price ? `£${post.price}` : "";
  }

  right.appendChild(priceEl);
const extraDetails = buildExtraDetails(post);
if (extraDetails) {
  right.appendChild(extraDetails);
}
  // Description
  if (post.description) {
    const desc = document.createElement("p");
    desc.className = "view-post-desc";
    desc.textContent = post.description;
    right.appendChild(desc);
  }

  // -------------------------------------------------------
  // POST ACTIONS (Favourite + Report)
  // -------------------------------------------------------
  const actionsWrapper = document.createElement("div");
  actionsWrapper.className = "post-actions";

  // Favourite button
  const favBtn = document.createElement("button");
  favBtn.className = "fav-btn";
  favBtn.textContent = post.isFavorited ? "★ Saved" : "☆ Save";
  actionsWrapper.appendChild(favBtn);

  // Report dropdown
  const reportWrapper = document.createElement("div");
  reportWrapper.className = "report-wrapper";

  reportWrapper.innerHTML = `
    <button class="report-btn">Report ▼</button>
    <ul class="report-menu" style="display:none;">
      <li data-reason="spam">Spam or scam</li>
      <li data-reason="offensive">Offensive content</li>
      <li data-reason="duplicate">Duplicate listing</li>
    </ul>
  `;
  actionsWrapper.appendChild(reportWrapper);

  right.appendChild(actionsWrapper);

// ---------------- Favourite toggle ----------------
favBtn.onclick = async () => {
  if (!window.currentUser) {
    showToast("Please log in to save posts", "error");
    window.loginRedirect = "stay";
    setTimeout(() => window.openLoginModal?.(), 600);
    return;
  }

  const { db } = await getFirebase();
  const uid = window.currentUser.uid;
  const postId = post.id;

  // Toggle UI state
  post.isFavorited = !post.isFavorited;
  favBtn.textContent = post.isFavorited ? "★ Saved" : "☆ Save";

  if (post.isFavorited) {
    await setDoc(doc(db, "users", uid, "saved", postId), {
      savedAt: Date.now()
    });
    showToast("Added to your favourites");
  } else {
    await deleteDoc(doc(db, "users", uid, "saved", postId));
    showToast("Removed from favourites");
  }
};

  // ---------------- Report dropdown toggle ----------------
  const reportBtn = reportWrapper.querySelector(".report-btn");
  const reportMenu = reportWrapper.querySelector(".report-menu");

  reportBtn.onclick = e => {
    e.stopPropagation();
    reportMenu.style.display = reportMenu.style.display === "none" ? "block" : "none";
  };

  // Hide menu if clicked outside
  document.addEventListener("click", () => {
    reportMenu.style.display = "none";
  });

  // Report menu selection
  reportMenu.querySelectorAll("li").forEach(item => {
    item.onclick = e => {
      const reason = e.target.dataset.reason;
      showToast(`Reported for: ${reason}`);
      reportMenu.style.display = "none";
      // TODO: Send report to Firestore / backend
    };
  });

  // -------------------------------------------------------
  // CONTACT BOX
  // -------------------------------------------------------
  const contactBox = buildContactBox({
    post,
    seller,
    images,
    onSendMessage,
    onContactClick
  });
  right.appendChild(contactBox);

  function buildExtraDetails(post) {
  const box = document.createElement("div");
  box.className = "post-extra-details";

  // ---------------- FOR SALE / FREE ----------------
  if (post.category === "forsale" || post.category === "free") {
    if (post.condition) {
      box.innerHTML += `<p><strong>Condition:</strong> ${post.condition}</p>`;
    }
  }

  // ---------------- PROPERTY ----------------
  if (post.category === "property") {
    if (post.propertyBedrooms)
      box.innerHTML += `<p><strong>Bedrooms:</strong> ${post.propertyBedrooms}</p>`;

    if (post.propertyBathrooms)
      box.innerHTML += `<p><strong>Bathrooms:</strong> ${post.propertyBathrooms}</p>`;

    if (post.propertyEPC)
      box.innerHTML += `<p><strong>EPC Rating:</strong> ${post.propertyEPC}</p>`;

    if (post.propertyListingType)
      box.innerHTML += `<p><strong>Listing type:</strong> ${post.propertyListingType}</p>`;
  }

  // ---------------- JOBS ----------------
  if (post.category === "jobs") {
    if (post.jobCompany)
      box.innerHTML += `<p><strong>Company:</strong> ${post.jobCompany}</p>`;

    if (post.jobType)
      box.innerHTML += `<p><strong>Job type:</strong> ${post.jobType}</p>`;

    if (post.jobSalary) {
      const freq = post.jobSalaryFrequency ? ` ${post.jobSalaryFrequency}` : "";
      box.innerHTML += `<p><strong>Salary:</strong> £${post.jobSalary}${freq}</p>`;
    }
  }

  // ---------------- EVENTS ----------------
  if (post.category === "events") {
    if (post.eventDate)
      box.innerHTML += `<p><strong>Date:</strong> ${post.eventDate}</p>`;

    if (post.eventTime)
      box.innerHTML += `<p><strong>Time:</strong> ${post.eventTime}</p>`;

    if (post.eventLocation)
      box.innerHTML += `<p><strong>Location:</strong> ${post.eventLocation}</p>`;
  }

  // ---------------- COMMUNITY ----------------
  if (post.category === "community") {
    if (post.communityTopic)
      box.innerHTML += `<p><strong>Topic:</strong> ${post.communityTopic}</p>`;
  }

  return box.innerHTML ? box : null;
  }

  // -------------------------------------------------------
  // SHARE BLOCK
  // -------------------------------------------------------
  const shareBlock = document.createElement("div");
  shareBlock.className = "share-box";
  shareBlock.innerHTML = `
    <div class="share-header">
      <h4>Share this ad</h4>
      <div class="share-icons">
        <button class="share-btn" data-platform="whatsapp">
          <img src="/index/icons/whatsapp.svg" alt="WhatsApp">
        </button>
        <button class="share-btn" data-platform="messenger">
          <img src="/index/icons/messenger.svg" alt="Messenger">
        </button>
        <button class="share-btn" data-platform="email">
          <img src="/index/icons/email.svg" alt="Email">
        </button>
      </div>
    </div>
  `;
  right.appendChild(shareBlock);

  // -------------------------------------------------------
  // FOOTER
  // -------------------------------------------------------
  const footer = document.createElement("div");
  footer.className = "view-post-footer";

  const backBtn = document.createElement("button");
  backBtn.className = "secondary-btn";
  backBtn.textContent = "← Back";
  backBtn.onclick = () => window.loadView("home");

  footer.appendChild(backBtn);

  // -------------------------------------------------------
  // FINAL ASSEMBLY
  // -------------------------------------------------------
  layout.append(gallery, right);
  container.append(layout, footer);
}

// =========================================================
// SELLER HEADER
// =========================================================
function buildSellerHeader({ seller, post, onFollowBlocked }) {
  const wrapper = document.createElement("div");

  wrapper.innerHTML = `
  <div id="sellerHeaderClickable" class="post-seller-header">
    <img
      class="seller-header-avatar"
      src="${seller?.avatarUrl || "/index/images/webholder.svg"}"
      alt="Seller avatar"
    >
    <div class="seller-header-info">
      <p class="posted-by">
        <strong>${seller?.firstName || "Local Seller"}</strong>
      </p>
      <p class="posted-on">RCT-X</p>
      ${
        seller?.createdAt
          ? `<p class="posted-since">
              Posting since: ${new Date(seller.createdAt).toLocaleDateString(
                "en-GB",
                { year: "numeric", month: "long" }
              )}
            </p>`
          : ""
      }
    </div>
  </div>
`;

  const header = wrapper.querySelector("#sellerHeaderClickable");

  header.onclick = e => {
    if (e.target.closest(".follow-btn")) return;
    window.selectedSellerId = post.userId;
    window.loadView("seller-profile");
  };

  // Don't show follow button on your own post
  if (!window.currentUser || window.currentUser.uid !== post.userId) {
    const followBtn = document.createElement("button");
    followBtn.className = "follow-btn";
    followBtn.textContent = "Follow"; // default text

    wrapper.querySelector(".seller-header-info").appendChild(followBtn);

    // Update text for logged-in users
    if (window.currentUser?.uid) {
      isFollowing(window.currentUser.uid, post.userId)
        .then(following => {
          followBtn.textContent = following ? "Following" : "Follow";
        })
        .catch(err => console.error("Error checking follow state:", err));

      // Attach toggle
      attachFollowBtn(followBtn, window.currentUser?.uid, post.userId, ({ following, error }) => {
        if (error) {
          if (error === "not-logged-in") onFollowBlocked();
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

  return wrapper;
}

// =========================================================
// CONTACT BOX
// =========================================================
function buildContactBox({ post, seller, images, onSendMessage, onContactClick }) {
  const box = document.createElement("div");
  box.className = "contact-box";

  box.innerHTML = `
    <h3>Contact Seller</h3>
    <textarea id="messageInput">Hi, is this still available?</textarea>
    <div class="contact-actions">
      <button id="msgSellerBtn" class="primary-btn">Send Message</button>
      ${post.phone ? `<button id="contactSellerBtn" class="secondary-btn">Contact</button>` : ""}
      ${
        post.allowWhatsApp && post.phone
          ? `<a href="https://wa.me/44${post.phone.replace(/^0/, "")}" target="_blank" class="secondary-btn whatsapp-btn">WhatsApp</a>`
          : ""
      }
    </div>
  `;

  const msgBtn = box.querySelector("#msgSellerBtn");
  const msgInput = box.querySelector("#messageInput");
  const contactBtn = box.querySelector("#contactSellerBtn");
  const whatsappBtn = box.querySelector(".whatsapp-btn");

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
      imageUrl: images[0]
    });
  };

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

  return box;
}

// =========================================================
// SHARE HANDLER (GLOBAL)
// =========================================================
document.addEventListener("click", e => {
  const btn = e.target.closest(".share-btn");
  if (!btn) return;

  const platform = btn.dataset.platform;
  const url = location.href;
  const title =
    document.querySelector("h1")?.textContent || "Check this out on RCT-X";

  if (platform === "whatsapp") {
    window.open(`https://wa.me/?text=${encodeURIComponent(title + " " + url)}`);
  } else if (platform === "messenger") {
    window.open(`https://www.facebook.com/share.php?u=${encodeURIComponent(url)}`);
  } else if (platform === "email") {
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
  }
});
