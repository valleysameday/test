// /postViews/utils.js
console.log("📄 utils.js loaded");

// ---------------------------------------------------------
// PLACEHOLDER IMAGE (shared constant)
// ---------------------------------------------------------
export const PLACEHOLDER_IMG = "/index/images/webholder.svg";

// ---------------------------------------------------------
// SAFE DATE FORMATTER
// ---------------------------------------------------------
export function formatDate(dateValue) {
  console.log("🗓️ formatDate called:", dateValue);

  if (!dateValue) return "";

  try {
    const date = new Date(dateValue);
    return date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long"
    });
  } catch (err) {
    console.error("🔥 Error formatting date:", err);
    return "";
  }
}

// ---------------------------------------------------------
// CHECK AUTH (shared helper)
// ---------------------------------------------------------
export function requireAuth(onFail) {
  console.log("🔐 requireAuth called");

  if (!window.currentUser) {
    console.log("❌ Auth required but user not logged in");

    if (onFail) onFail();

    return false;
  }

  return true;
}

// ---------------------------------------------------------
// CLEAN TEXT (trim + prevent accidental blank messages)
// ---------------------------------------------------------
export function cleanText(text) {
  console.log("✏️ cleanText called:", text);

  if (!text) return "";
  return text.trim();
}
