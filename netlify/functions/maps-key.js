// netlify/functions/maps-key.js
export async function handler() {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: process.env.GOOGLE_MAPS_API_KEY })
  };
}
