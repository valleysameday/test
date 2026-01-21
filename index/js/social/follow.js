import { getFirebase } from "/index/js/firebase/init.js";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* =========================
   FOLLOW / UNFOLLOW
========================= */
export async function toggleFollow(viewerId, sellerId) {
  if (!viewerId || !sellerId || viewerId === sellerId) {
    throw new Error("Invalid viewerId or sellerId");
  }

  const { db } = await getFirebase();

  const followingRef = doc(db, "users", viewerId, "following", sellerId);
  const followerRef = doc(db, "users", sellerId, "followers", viewerId);

  const snap = await getDoc(followingRef);

  try {
    if (snap.exists()) {
      // Unfollow
      await deleteDoc(followingRef);
      await deleteDoc(followerRef);
      return { following: false };
    } else {
      // Follow
      await setDoc(followingRef, {
        userId: sellerId,
        followedAt: serverTimestamp()
      });
      await setDoc(followerRef, {
        userId: viewerId,
        followedAt: serverTimestamp()
      });
      return { following: true };
    }
  } catch (err) {
    console.error("Error toggling follow:", err);
    throw err;
  }
}

/* =========================
   CHECK FOLLOW STATE
========================= */
export async function isFollowing(viewerId, sellerId) {
  if (!viewerId || !sellerId) return false;

  const { db } = await getFirebase();
  const ref = doc(db, "users", viewerId, "following", sellerId);
  const snap = await getDoc(ref);
  return snap.exists();
}

/* =========================
   FOLLOWER COUNT
========================= */
export async function getFollowerCount(uid) {
  if (!uid) return 0;

  const { db } = await getFirebase();
  const snap = await getDocs(collection(db, "users", uid, "followers"));
  return snap.size;
}

/* =========================
   HELPER: Follow button for View Post
========================= */
export function attachFollowBtn(btnEl, viewerId, sellerId, onChange) {
  if (!btnEl) return;

  btnEl.addEventListener("click", async () => {
    if (!viewerId) {
      console.warn("User not logged in");
      onChange?.({ error: "not-logged-in" });
      return;
    }

    try {
      const result = await toggleFollow(viewerId, sellerId);
      onChange?.(result);
    } catch (err) {
      console.error("Follow button error:", err);
      onChange?.({ error: err.message });
    }
  });
}
