import { featureFlags } from "/index/js/featureFlags.js";
import { startPaymentFlow } from "/index/js/payments.js";
import { getFirebase } from "/index/js/firebase/init.js";
import { doc, updateDoc } from "firebase/firestore";

export async function boostPost(postId, days, price) {
  if (!featureFlags.boostingEnabled) return;

  const paid = await startPaymentFlow(price, `Boost for ${days} days`);
  if (!paid) return false;

  const { db } = await getFirebase();
  const now = Date.now();
  const boostEnd = now + (days * 24 * 60 * 60 * 1000);

  await updateDoc(doc(db, "posts", postId), {
    isBoosted: true,
    boostStart: now,
    boostEnd,
    sortScore: boostEnd
  });

  return true;
}
