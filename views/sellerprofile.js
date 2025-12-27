/* ---------------------------------------------------
   ✅ LOAD SELLER'S OTHER ADS (LAZY + FALLBACK)
--------------------------------------------------- */
async function loadSellerAds(sellerId) {
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
      loadView("view-post");
    });

    // ---------- Image ----------
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

    // ---------- Body ----------
    const postBody = document.createElement("div");
    postBody.className = "post-body";

    const h3 = document.createElement("h3");
    h3.textContent = post.title || "Untitled";

    const desc = document.createElement("p");
    desc.className = "post-desc";
    desc.textContent = post.description || "";

    postBody.appendChild(h3);
    postBody.appendChild(desc);

    // ---------- Append to card ----------
    card.appendChild(postImageDiv);
    card.appendChild(postBody);

    container.appendChild(card);
  });
}
