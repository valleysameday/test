// /postViews/render.js
console.log("📄 render.js loaded");

import { createGallery } from "/postViews/gallery.js";
import { showToast } from "/postViews/toast.js";

// ---------------------------------------------------------
// MAIN RENDER FUNCTION
// ---------------------------------------------------------
export function renderPost({
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

  // Seller header
  right.appendChild(
    buildSellerHeader({
      seller,
      post,
      onFollowBlocked: () => {
        showToast("You must be logged in to follow sellers", "error");
        window.loginRedirect = "stay";
        setTimeout(() => window.openLoginModal?.(), 600);
      }
    })
  );

  // Title
  const title = document.createElement("h1");
  title.textContent = post.title || "Untitled post";
  right.appendChild(title);

  // Price
  if (post.price !== undefined) {
    const price = document.createElement("h2");
    price.className = "post-price";
    price.textContent = post.price === 0 ? "FREE" : `£${post.price}`;
    right.appendChild(price);
  }

  // Description
  if (post.description) {
    const desc = document.createElement("p");
    desc.className = "view-post-desc";
    desc.textContent = post.description;
    right.appendChild(desc);
  }

  // Contact box
  right.appendChild(
    buildContactBox({
      post,
      seller,
      images,
      onSendMessage,
      onContactClick
    })
  );

  // -------------------------------------------------------
  // FOOTER
  // -------------------------------------------------------
  const footer = document.createElement("div");
  footer.className = "view-post-footer";

  const backBtn = document.createElement("button");
  backBtn.className = "secondary-btn";
  backBtn.textContent = "← Back";
  backBtn.onclick = () => {
    console.log("⬅️ Back clicked");
    window.loadView("home");
  };

  footer.appendChild(backBtn);

  // -------------------------------------------------------
  // FINAL ASSEMBLY
  // -------------------------------------------------------
  layout.append(gallery, right);
  container.append(layout, footer);
}

// ---------------------------------------------------------
// SELLER HEADER
// ---------------------------------------------------------
function buildSellerHeader({ seller, post, onFollowBlocked }) {
  console.log("👤 buildSellerHeader called:", seller);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div id="sellerHeaderClickable" class="post-seller-header">
      <img class="seller-header-avatar" src="${seller?.profileImage || "/index/images/webholder.svg"}">
      <div class="seller-header-info">
        <p class="posted-by"><strong>${seller?.firstName || "Local Seller"}</strong></p>
        <p class="posted-on">RCT-X</p>
        ${
          seller?.createdAt
            ? `<p class="posted-since">Posting since: ${new Date(
                seller.createdAt
              ).toLocaleDateString("en-GB", {
                year: "numeric",
                month: "long"
              })}</p>`
            : ""
        }
      </div>
    </div>
  `;

  const header = wrapper.querySelector("#sellerHeaderClickable");

  header.addEventListener("click", e => {
    if (e.target.closest(".follow-btn")) return;
    console.log("👤 Seller header clicked");
    window.selectedSellerId = post.userId;
    window.loadView("seller-profile");
  });

  // Follow button
  if (window.currentUser?.uid !== post.userId) {
    const followBtn = document.createElement("button");
    followBtn.className = "follow-btn";
    followBtn.textContent = "Follow";

    followBtn.onclick = () => {
      console.log("🔔 Follow clicked");

      if (!window.currentUser) {
        onFollowBlocked();
        return;
      }

      // Follow logic handled by follow.js
      window.toggleFollow?.(window.currentUser.uid, post.userId);
    };

    wrapper.querySelector(".seller-header-info").appendChild(followBtn);
  }

  return wrapper;
}

// ---------------------------------------------------------
// CONTACT BOX
// ---------------------------------------------------------
function buildContactBox({ post, seller, images, onSendMessage, onContactClick }) {
  console.log("📞 buildContactBox called");

  const box = document.createElement("div");
  box.className = "contact-box";

  box.innerHTML = `
    <h3>Contact Seller</h3>
    <textarea id="messageInput" class="message-input" rows="3">Hi, is this still available?</textarea>
    <div class="contact-actions">
      <button id="msgSellerBtn" class="primary-btn">Send Message</button>
      ${post.phone ? `<button id="contactSellerBtn" class="secondary-btn">Contact</button>` : ""}
      ${
        post.allowWhatsApp && post.phone
          ? `<a href="https://wa.me/44${post.phone.replace(/^0/, "")}" target="_blank" rel="noopener" id="whatsappBtn" class="secondary-btn whatsapp-btn">WhatsApp</a>`
          : ""
      }
    </div>
  `;

  const msgInput = box.querySelector("#messageInput");
  const msgBtn = box.querySelector("#msgSellerBtn");
  const contactBtn = box.querySelector("#contactSellerBtn");
  const whatsappBtn = box.querySelector("#whatsappBtn");

  // Send message
  msgBtn.onclick = () => {
    console.log("✉️ Send Message clicked");

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

  // Contact button
  if (contactBtn) {
    contactBtn.onclick = () => {
      console.log("📞 Contact clicked");
      onContactClick(post.id);
    };
  }

  // WhatsApp button
  if (whatsappBtn) {
    whatsappBtn.onclick = e => {
      console.log("💬 WhatsApp clicked");

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
