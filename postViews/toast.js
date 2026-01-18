// /postViews/toast.js
console.log("📄 toast.js loaded");

export function showToast(message, type = "success") {
  console.log("🔔 showToast called:", { message, type });

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Animate out + remove
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
