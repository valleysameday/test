const admin = require("firebase-admin");

exports.handler = async () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    });
  }

  const db = admin.firestore();
  const now = Date.now();

  // Get all active posts
  const activeSnap = await db
    .collection("posts")
    .where("isActive", "==", true)
    .get();

  const batch = db.batch();
  let expiredCount = 0;

  activeSnap.forEach(doc => {
    const data = doc.data();
    let expiresAt = data.expiresAt;
    const isBoosted = data.isBoosted;
    const boostEnd = data.boostEnd?.toMillis ? data.boostEnd.toMillis() : data.boostEnd;

    // If boosted and boostEnd is after current expiresAt, extend expiresAt
    if (isBoosted && boostEnd && boostEnd > expiresAt) {
      expiresAt = boostEnd;
    }

    // Expire only if current time > expiresAt
    if (expiresAt && now > expiresAt) {
      batch.update(doc.ref, {
        isActive: false,
        status: "expired"
      });
      expiredCount++;
    }
  });

  if (expiredCount > 0) await batch.commit();

  return {
    statusCode: 200,
    body: `Expired ${expiredCount} ads`
  };
};
