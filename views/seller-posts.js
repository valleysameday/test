import { getFirebase } from "/index/js/firebase/init.js";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let db;
const PLACEHOLDER_POST = "/images/post-placeholder.jpg";

getFirebase().then(fb => {
  db = fb.db;
  loadSellerPosts();
});

async function loadSellerPosts() {
  const container = document.getElementById("sellerPostsContainer");

  if (!window.sellerFilterId) {
    container.innerHTML = "<p>No seller selected.</p>";
    return;
  }

  const q = query(
    collection(db, "posts"),
    where("userId", "==", window.sellerFilterId),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    container.innerHTML = "<p>This seller has no other ads.</p>";
    return;
  }

  container.innerHTML = "";

  snap.forEach(docSnap => {
    const post = { id: docSnap.id, ...docSnap.data() };

    const card = document.createElement("div");
    card.className = "post-card";

    card.addEventListener("click", () => {
      window.selectedPostId = post.id;
      loadView("view-post");
    });

    // ---------- Image ----------
    const img = document.createElement("img");
    img.src = post.imageUrl || (post.imageUrls && post.imageUrls[0]) || PLACEHOLDER_POST;
    img.alt = post.title || "Post image";
    img.loading = "lazy";
    img.onerror = () => img.src = PLACEHOLDER_POST;

    const postImageDiv = document.createElement("div");
    postImageDiv.className = "post-image";
    postImageDiv.appendChild(img);

    if (post.businessId) {
      const overlay = document.createElement("div");
      overlay.className = "business-overlay";
      overlay.textContent = "Business";
      postImageDiv.appendChild(overlay);
    }

    if (post.price !== undefined && post.price !== null) {
      const priceBadge = document.createElement("div");
      priceBadge.className = "price-badge";
      priceBadge.textContent = post.price === 0 ? "FREE" : `£${post.price}`;
      postImageDiv.appendChild(priceBadge);
    }

    // ---------- Body ----------
    const postBody = document.createElement("div");
    postBody.className = "post-body";

    const h3 = document.createElement("h3");
    h3.textContent = post.title;

    const desc = document.createElement("p");
    desc.className = "post-desc";
    desc.textContent = post.description;

    const cat = document.createElement("small");
    cat.className = "post-category";
    cat.textContent = post.category;

    postBody.appendChild(h3);
    postBody.appendChild(desc);
    postBody.appendChild(cat);

    // ---------- Append to card ----------
    card.appendChild(postImageDiv);
    card.appendChild(postBody);

    container.appendChild(card);
  });
}
