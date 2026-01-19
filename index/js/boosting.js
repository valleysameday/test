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
  global: {
    days: 7,
    price: 399, // £4.00
    description: "Boost to top of ALL feed for 7 days",
    priority: 2 // highest
  },
  category: {
    days: 7,
    price: 249, // £2.99
    description: "Boost to top of CATEGORY for 7 days",
    priority: 1
  }
};

/* ============================================================
   PUBLIC FUNCTION: boostPost(postId, type)
   Called from My Ads when user clicks "Boost"
   ============================================================ */

export async function boostPost(postId, type) {
  if (!featureFlags.boostingEnabled) {
    console.log("Boosting disabled — ignoring request");
    return false;
  }

  const option = BOOST_OPTIONS[type];
  if (!option) {
    console.error("Invalid boost type:", type);
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

  // sortScore determines feed position
  // Global boosts get a massive priority bump
  const sortScore =
    option.priority === 2
      ? boostEnd + 1_000_000_000_000 // global boost always wins
      : boostEnd;

  const updateData = {
    isBoosted: true,
    boostType: option.priority === 2 ? "global" : "category",
    boostStart: now,
    boostEnd,
    sortScore
  };

  await updateDoc(doc(db, "posts", postId), updateData);

  console.log("Boost applied:", updateData);
  return true;
}

/* ============================================================
   OPTIONAL: autoExpireBoost(postId, postData)
   Call this in your feed loader to auto‑clean expired boosts
   ============================================================ */

export async function autoExpireBoost(postId, postData) {
  if (!postData.isBoosted) return;

  const now = Date.now();
  if (postData.boostEnd > now) return; // still active

  const { db } = await getFirebase();

  await updateDoc(doc(db, "posts", postId), {
    isBoosted: false,
    boostType: null,
    sortScore: postData.createdAt || now
  });

  console.log("Boost expired for post:", postId);
}
