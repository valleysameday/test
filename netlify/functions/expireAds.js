const admin = require("firebase-admin");

exports.handler = async () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    });
  }

  const db = admin.firestore();
  const now = Date.now();

  const expiredSnap = await db
    .collection("posts")
    .where("expiresAt", "<", now)
    .where("isActive", "==", true)
    .get();

  const batch = db.batch();

  expiredSnap.forEach(doc => {
    batch.update(doc.ref, {
      isActive: false,
      status: "expired"
    });
  });

  await batch.commit();

  return {
    statusCode: 200,
    body: `Expired ${expiredSnap.size} ads`
  };
};
