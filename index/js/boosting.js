// boosting.js
// Handles boost logic, pricing, Firestore updates, and Stripe payments.

import { featureFlags } from "/index/js/featureFlags.js";
import { startPaymentFlow } from "/index/js/payments.js";
import { getFirebase } from "/index/js/firebase/init.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ============================================================
   BOOST OPTIONS (prices in pence)
   ============================================================ */

const BOOST_OPTIONS = {
  small: {
    days: 1,
    price: 200,
    description: "Boost to top of category for 24 hours"
  },
  medium: {
    days: 3,
    price: 350,
    description: "Boost to top of category for 3 days"
  },
  large: {
    days: 7,
    price: 550,
    description: "Boost to top of category for 7 days"
  }
};

/* ============================================================
   PUBLIC FUNCTION: boostPost(postId, size)
   Called from My Ads when user clicks "Boost"
   ============================================================ */

export async function boostPost(postId, size) {
  if (!featureFlags.boostingEnabled) {
    console.log("Boosting disabled — ignoring request");
    return false;
  }

  const option = BOOST_OPTIONS[size];
  if (!option) {
    console.error("Invalid boost size:", size);
    return false;
  }

  // Start payment flow
  const paid = await startPaymentFlow(option.price, option.description);

  if (!paid) {
    console.log("Payment failed or cancelled");
    return false;
  }

  // Apply boost to Firestore
  return await applyBoostToPost(postId, option);
}

/* ============================================================
   INTERNAL: applyBoostToPost()
   Writes boost data to Firestore
   ============================================================ */

async function applyBoostToPost(postId, option) {
  const { db } = await getFirebase();

  const now = Date.now();
  const boostEnd = now + (option.days * 24 * 60 * 60 * 1000);

  const updateData = {
    isBoosted: true,
    boostStart: now,
    boostEnd
  };

  await updateDoc(doc(db, "posts", postId), updateData);

  console.log("Boost applied:", updateData);
  return true;
}

/* ============================================================
   OPTIONAL: autoExpireBoost(postId, postData)
   Automatically removes boost when expired
   ============================================================ */

export async function autoExpireBoost(postId, postData) {
  if (!postData.isBoosted) return;

  const now = Date.now();
  if (postData.boostEnd > now) return; // still active

  const { db } = await getFirebase();

  await updateDoc(doc(db, "posts", postId), {
    isBoosted: false,
    boostStart: null,
    boostEnd: null
  });

  console.log("Boost expired for post:", postId);
}
