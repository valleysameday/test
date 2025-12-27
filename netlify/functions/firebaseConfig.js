export async function handler() {
  return {
    statusCode: 200,
    body: JSON.stringify({
      apiKey: process.env.RN_FIREBASE_API_KEY,
      authDomain: process.env.RN_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.RN_FIREBASE_PROJECT_ID,
      storageBucket: process.env.RN_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.RN_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.RN_FIREBASE_APP_ID
    })
  };
}
