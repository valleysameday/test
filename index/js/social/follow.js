import { getFirebase } from "/index/js/firebase/init.js";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* =========================
   FOLLOW / UNFOLLOW
========================= */
export async function toggleFollow(viewerId, sellerId) {
  const { db } = await getFirebase();

  const followingRef = doc(db, "users", viewerId, "following", sellerId);
  const followerRef = doc(db, "users", sellerId, "followers", viewerId);

  const snap = await getDoc(followingRef);

  if (snap.exists()) {
    await deleteDoc(followingRef);
    await deleteDoc(followerRef);
    return { following: false };
  } else {
    await setDoc(followingRef, {
      userId: sellerId,
      followedAt: Date.now()
    });
    await setDoc(followerRef, {
      userId: viewerId,
      followedAt: Date.now()
    });
    return { following: true };
  }
}

/* =========================
   CHECK FOLLOW STATE
========================= */
export async function isFollowing(viewerId, sellerId) {
  const { db } = await getFirebase();
  const ref = doc(db, "users", viewerId, "following", sellerId);
  const snap = await getDoc(ref);
  return snap.exists();
}

/* =========================
   FOLLOWER COUNT
========================= */
export async function getFollowerCount(uid) {
  const { db } = await getFirebase();
  const snap = await getDocs(collection(db, "users", uid, "followers"));
  return snap.size;
}
