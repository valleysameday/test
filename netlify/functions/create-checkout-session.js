const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { amount, description } = JSON.parse(event.body || "{}");

    if (!amount || amount < 50) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid amount" }),
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: amount, // pence
            product_data: {
              name: description || "Boost",
            },
          },
          quantity: 1,
        },
      ],

      success_url: "https://rctx.co.uk/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://rctx.co.uk/cancel",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id }),
    };
  } catch (err) {
    console.error("Stripe error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
