// /postViews/modals.js
console.log("📄 modals.js loaded");

export function showMessageConfirmModal({ message, onConfirm }) {
  console.log("🟦 showMessageConfirmModal called:", { message });

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal-content">
      <h3>Confirm message to seller</h3>

      <p class="modal-advice">
        ⚠️ Safety reminder:<br>
        • Never pay before seeing the item<br>
        • Meet in a public place where possible
      </p>

      <label>Your message</label>
      <textarea class="modal-message-preview">${message}</textarea>

      <div class="modal-actions">
        <button class="secondary-btn cancel-btn">Cancel</button>
        <button class="primary-btn confirm-btn">Confirm & Send</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const textarea = overlay.querySelector(".modal-message-preview");
  const cancelBtn = overlay.querySelector(".cancel-btn");
  const confirmBtn = overlay.querySelector(".confirm-btn");

  cancelBtn.onclick = () => {
    console.log("🟥 Modal cancelled");
    overlay.remove();
  };

  confirmBtn.onclick = () => {
    const finalMessage = textarea.value.trim();
    console.log("🟩 Modal confirmed:", finalMessage);

    if (!finalMessage) {
      console.log("⚠️ Modal confirm blocked — empty message");
      return;
    }

    overlay.remove();
    onConfirm(finalMessage);
  };
}
