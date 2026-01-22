console.log("✅ view-post.js loaded");

// Firebase init
import { getFirebase } from "/index/js/firebase/init.js";

// Firestore helpers
import {
  getPostById,
  getUserById,
  incrementPostViews,
  incrementContactClicks,
  findOrCreateConversation,
  sendMessageToSeller
} from "/postViews/firestore.js";

// UI + DOM modules
import { renderPost } from "/postViews/render.js";
import { showToast } from "/postViews/toast.js";
import { showMessageConfirmModal } from "/postViews/modals.js";
import { attachFollowBtn, isFollowing, getFollowerCount } from "/index/js/social/follow.js";

let db = null;

// ---------------------------------------------------------
// INIT
// ---------------------------------------------------------
export async function init() {
  const fb = await getFirebase();
  db = fb.db;

  await waitForAuth();

  // Add browser history entry so mobile back works
  history.pushState({ view: "post" }, "", location.href);

  let postId = null;

  // Wait for post ID from session or SPA
  await new Promise(resolve => {
    const timer = setInterval(() => {
      postId = sessionStorage.getItem("viewPostId") || window.selectedPostId;
      if (postId) {
        clearInterval(timer);
        resolve();
      }
    }, 30);
  });

  window.selectedPostId = postId;
  await loadPost(postId);
}

// ---------------------------------------------------------
// WAIT FOR AUTH
// ---------------------------------------------------------
function waitForAuth(timeout = 1500) {
  return new Promise(resolve => {
    if (window.currentUser !== undefined) return resolve();

    const start = Date.now();
    const timer = setInterval(() => {
      if (window.currentUser !== undefined) {
        clearInterval(timer);
        resolve();
      }
      if (Date.now() - start > timeout) {
        clearInterval(timer);
        resolve();
      }
    }, 50);
  });
}

window.addEventListener("popstate", () => {
  // Return to previous SPA view
  window.loadView?.("home");
});

// ---------------------------------------------------------
// LOAD POST
// ---------------------------------------------------------
async function loadPost(postId) {
  const container = document.getElementById("viewPostContent");
  if (!container) return;

  container.innerHTML = "<p class='loading'>Loading post…</p>";

  const post = await getPostById(db, postId);

  if (!post) {
    container.textContent = "Post not found.";
    return;
  }

  // Increment views (non-blocking)
  incrementPostViews(db, postId).catch(() => {});

  // Fetch seller
  let seller = null;
  if (post.userId) {
    seller = await getUserById(db, post.userId);
  }

  // Render UI
  renderPost({
    container,
    post,
    seller,
    db,
    onSendMessage: handleSendMessage,
    onContactClick: handleContactClick
  });
}

// ---------------------------------------------------------
// MESSAGE HANDLER
// ---------------------------------------------------------
async function handleSendMessage({ post, sellerId, messageText }) {
  const user = window.currentUser;

  if (!user) {
    showToast("Please log in to contact the seller", "error");
    window.loginRedirect = "stay";
    setTimeout(() => window.openLoginModal?.(), 600);
    return;
  }

  if (user.uid === sellerId) {
    showToast("You can’t message your own post", "error");
    return;
  }

  if (!messageText.trim()) {
    showToast("Please enter a message", "error");
    return;
  }

  showMessageConfirmModal({
    message: messageText,
    async onConfirm(finalMessage) {
      try {
        // 1️⃣ Get or create conversation
        const convoId = await findOrCreateConversation(db, {
          buyerId: user.uid,
          sellerId,
          post
        });

        // 2️⃣ Send the message to messages subcollection AND update conversation doc
        await sendMessageToSeller(db, convoId, {
          senderId: user.uid,
          text: finalMessage
        });

        showToast("Message sent to seller");
      } catch (err) {
        console.error("Failed to send message:", err);
        showToast("Failed to send message", "error");
      }
    }
  });
}

// ---------------------------------------------------------
// CONTACT BUTTON HANDLER
// ---------------------------------------------------------
async function handleContactClick(postId) {
  await incrementContactClicks(db, postId);
  showToast("Contact clicked");
}
