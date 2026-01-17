console.log("✅ view-post.js loaded");

import { getFirebase } from "/index/js/firebase/init.js";
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
   MESSAGE CONFIRM MODAL
===================================================== */
function showMessageConfirmModal({ message, onConfirm }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal-content">
      <h3>Confirm message to seller</h3>

      <p class="modal-advice">
        ⚠️ Safety reminder:<br>
        • Never pay before seeing the item<br>
        • Meet in a public place where possible
      </p>

      <label>Your message</label>
      <textarea class="modal-message-preview">${message}</textarea>

      <div class="modal-actions">
        <button class="secondary-btn cancel-btn">Cancel</button>
        <button class="primary-btn confirm-btn">Confirm & Send</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const textarea = overlay.querySelector(".modal-message-preview");

  overlay.querySelector(".cancel-btn").onclick = () => overlay.remove();
  overlay.querySelector(".confirm-btn").onclick = () => {
    const finalText = textarea.value.trim();
    if (!finalText) return;
    overlay.remove();
    onConfirm(finalText);
  };
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
  updateDoc(doc(db, "posts", postId), { views: increment(1) }).catch(() => {});

  await renderPost(container, post);
}

/* =====================================================
   RENDER POST
===================================================== */
async function renderPost(container, post) {
  container.innerHTML = "";

  const currentUser = window.currentUser || null;

  // -------------------------------
  // Seller defaults
  // -------------------------------
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

  // -------------------------------
  // Images
  // -------------------------------
  const images = post.imageUrls?.length
    ? post.imageUrls
    : post.imageUrl
    ? [post.imageUrl]
    : [PLACEHOLDER_IMG];

  // -------------------------------
  // Layout
  // -------------------------------
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

  // -------------------------------
  // Post content + seller header + follow button
  // -------------------------------
  right.innerHTML = `
  <div id="sellerHeaderClickable" class="post-seller-header">
    <img class="seller-header-avatar" src="${sellerAvatar}">
    <div class="seller-header-info">
      <p class="posted-by"><strong>${sellerName}</strong></p>
      <p class="posted-on">RCT-X</p>
      ${sellerSince ? `<p class="posted-since">Posting since: ${sellerSince}</p>` : ""}
    </div>
  </div>

  <h1>${post.title || "Untitled post"}</h1>
`;

  // -------------------------------
  // FOLLOW BUTTON
  // -------------------------------
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
          setTimeout(() => window.openLoginModal?.(), 4000);
        };
      }
    };
    setupFollowButton();
  }

  // -------------------------------
  // SELLER HEADER CLICK
  // -------------------------------
  const sellerHeader = right.querySelector("#sellerHeaderClickable");
  sellerHeader.addEventListener("click", e => {
    if (e.target.closest(".follow-btn")) return;
    window.selectedSellerId = post.userId;
    window.loadView("seller-profile");
  });

  // -------------------------------
  // Price & Description
  // -------------------------------
  if (post.price !== undefined) {
    const price = document.createElement("h2");
    price.className = "post-price";
    price.textContent = post.price === 0 ? "FREE" : `£${post.price}`;
    right.appendChild(price);
  }

  if (post.description) {
    const desc = document.createElement("p");
    desc.className = "view-post-desc";
    desc.textContent = post.description;
    right.appendChild(desc);
  }

  // -------------------------------
  // CONTACT BOX (Message + Contact + WhatsApp)
  // -------------------------------
  const contactBox = document.createElement("div");
  contactBox.className = "contact-box";
  contactBox.innerHTML = `
    <h3>Contact Seller</h3>
    <textarea id="messageInput" class="message-input" rows="3">Hi, is this still available?</textarea>
    <div class="contact-actions">
      <button id="msgSellerBtn" class="primary-btn">Send Message</button>
      ${post.phone ? `<button id="contactSellerBtn" class="secondary-btn">Contact</button>` : ""}
      ${post.allowWhatsApp && post.phone ? `<a href="https://wa.me/44${post.phone.replace(/^0/, "")}" target="_blank" rel="noopener" class="secondary-btn whatsapp-btn">WhatsApp</a>` : ""}
    </div>
  `;
  right.appendChild(contactBox);

  const messageInput = contactBox.querySelector("#messageInput");
  const msgBtn = contactBox.querySelector("#msgSellerBtn");
  const contactBtn = contactBox.querySelector("#contactSellerBtn");

  function requireLogin() {
    if (!window.currentUser) {
      showToast("Please log in to contact the seller", "error");
      window.loginRedirect = "stay";
      setTimeout(() => window.openLoginModal?.(), 600);
      return false;
    }
    return true;
  }

  msgBtn.onclick = async () => {
    if (!requireLogin()) return;
    if (currentUser.uid === post.userId) {
      showToast("You can’t message your own post", "error");
      return;
    }

    const draftText = messageInput.value.trim();
    if (!draftText) {
      showToast("Please enter a message", "error");
      return;
    }

    showMessageConfirmModal({
      message: draftText,
      onConfirm: async finalText => {
        const buyerId = currentUser.uid;
        const sellerId = post.userId;

        const convRef = collection(db, "conversations");
        const q = query(
          convRef,
          where("participants", "array-contains", buyerId),
          where("postId", "==", post.id)
        );

        const snap = await getDocs(q);
        let conversationId;

        if (!snap.empty) {
          conversationId = snap.docs[0].id;
        } else {
          const newConv = await addDoc(convRef, {
            participants: [buyerId, sellerId],
            postId: post.id,
            postTitle: post.title || "Item",
            postImage: images[0] || null,
            lastMessage: finalText,
            lastSenderId: buyerId,
            unread: { [buyerId]: false, [sellerId]: true },
            deletedFor: { [buyerId]: false, [sellerId]: false },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          conversationId = newConv.id;
        }

        await addDoc(collection(db, "conversations", conversationId, "messages"), {
          senderId: buyerId,
          text: finalText,
          createdAt: serverTimestamp()
        });

        await updateDoc(doc(db, "conversations", conversationId), {
          lastMessage: finalText,
          lastSenderId: buyerId,
          updatedAt: serverTimestamp(),
          [`unread.${sellerId}`]: true
        });

        messageInput.value = "";
        showToast("Message sent to seller");
      }
    });
  };

  if (contactBtn) {
    contactBtn.onclick = async () => {
      if (!requireLogin()) return;
      await updateDoc(doc(db, "posts", post.id), { contactClicks: increment(1) });
      showToast("Contact clicked");
    };
  }

  // -------------------------------
  // FOOTER
  // -------------------------------
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
