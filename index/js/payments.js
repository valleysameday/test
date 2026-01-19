import { featureFlags } from "/index/js/featureFlags.js";

export async function startPaymentFlow(amount, description) {
  if (!featureFlags.paymentsEnabled) {
    console.log("Payments disabled — simulating success");
    return true;
  }

  const publishableKey = featureFlags.stripeLiveMode
    ? window.STRIPE_PUBLISHABLE_KEY_LIVE
    : window.STRIPE_PUBLISHABLE_KEY_TEST;

  const stripe = Stripe(publishableKey);

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
