import { getFirebase } from "/index/js/firebase/init.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

export function initPostSubmit() {
  const btn = document.getElementById("postSubmitBtn");
  const feedback = document.getElementById("postFeedback");

  btn?.addEventListener("click", async () => {
    const { auth, db, storage } = await getFirebase();

    if (!auth.currentUser) {
      feedback.textContent = "❌ Please log in.";
      return;
    }

    const title = document.getElementById("postTitle")?.value.trim();
    const description = document.getElementById("postDescription")?.value.trim();
    const category = document.getElementById("postCategory")?.value;

    if (!title || !description || !category) {
      feedback.textContent = "❌ Complete required fields.";
      return;
    }

    feedback.textContent = "Uploading…";

    const files = [...(document.getElementById("postImage")?.files || [])];
    const imageUrls = [];

    for (const file of files) {
      const blob = await window.compressPostImage(file);
      const storageRef = ref(
        storage,
        `posts/${auth.currentUser.uid}/${Date.now()}.jpg`
      );
      await uploadBytes(storageRef, blob);
      imageUrls.push(await getDownloadURL(storageRef));
    }

    await addDoc(collection(db,"posts"),{
      title,
      description,
      category,
      imageUrl: imageUrls[0] || null,
      imageUrls,
      createdAt: serverTimestamp(),
      userId: auth.currentUser.uid,
      businessId: window.firebaseUserDoc?.isBusiness
        ? auth.currentUser.uid
        : null
    });

    feedback.textContent = "✅ Your ad is live!";
    setTimeout(() => window.closeScreens(), 800);
  });
}
