export function initTemplateLoader() {
  const categorySelect = document.getElementById("postCategory");
  const fieldsContainer = document.getElementById("categoryFields");
  const extrasContainer = document.getElementById("categoryExtras");

  if (!categorySelect) return;

  async function loadTemplate(category) {
    if (!category) {
      fieldsContainer.innerHTML = "";
      extrasContainer.innerHTML = "";
      return;
    }

    try {
      // Load main fields (Step 2)
      const fieldsRes = await fetch(`/posting/templates/${category}.html`);
      fieldsContainer.innerHTML = await fieldsRes.text();

      // Load extras (Step 3)
      const extrasRes = await fetch(`/posting/templates/${category}-extras.html`);
      extrasContainer.innerHTML = await extrasRes.text();
    } catch (err) {
      console.error("Template load failed:", err);
    }
  }

  // Load template when category changes
  categorySelect.addEventListener("change", e => {
    loadTemplate(e.target.value);
  });
}
