import { featureFlags } from "/index/js/featureFlags.js";

let stripe; // cache instance

export async function startPaymentFlow(amount, description) {
  if (!featureFlags.paymentsEnabled) {
    console.log("Payments disabled — simulating success");
    return true;
  }

  // Initialise Stripe ONCE
  if (!stripe) {
    const cfg = await fetch("/.netlify/functions/public-config")
      .then(r => r.json());

    if (!cfg.stripeLive) {
      console.error("Stripe publishable key missing");
      return false;
    }

    stripe = Stripe(cfg.stripeLive);
  }

  const session = await fetch("/.netlify/functions/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, description })
  }).then(r => r.json());

  const result = await stripe.redirectToCheckout({
    sessionId: session.id
  });

  return !result.error;
}
