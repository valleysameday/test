exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      stripeLive: process.env.STRIPE_PUBLISHABLE_KEY
    })
  };
};
