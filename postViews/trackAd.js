import { getFirebase } from "/index/js/firebase/init.js";
import {
  doc,
  updateDoc,
  increment,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function trackAdView(adId) {
  const { db } = await getFirebase();
  const ref = doc(db, "adAnalytics", adId);

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { views: 1, clicks: 0 });
  } else {
    await updateDoc(ref, { views: increment(1) });
  }
}

export async function trackAdClick(adId) {
  const { db } = await getFirebase();
  const ref = doc(db, "adAnalytics", adId);

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { views: 0, clicks: 1 });
  } else {
    await updateDoc(ref, { clicks: increment(1) });
  }
}
