/* ============================================================
   TEMPLATE LOADER — Loads category-specific HTML templates
============================================================ */
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
      /* ============================
         LOAD MAIN FIELDS (STEP 2)
      ============================ */
      const fieldsRes = await fetch(`/posting/templates/${category}.html`);
      fieldsContainer.innerHTML = await fieldsRes.text();

      /* ============================
         LOAD EXTRAS (STEP 3)
      ============================ */
      const extrasRes = await fetch(`/posting/templates/${category}-extras.html`);
      extrasContainer.innerHTML = await extrasRes.text();

      /* ============================
         CATEGORY-SPECIFIC LOGIC
      ============================ */
      if (category === "property") {
        initPropertyFields();
      }

      // Add more category-specific initializers here:
      // if (category === "jobs") initJobFields();
      // if (category === "events") initEventFields();

    } catch (err) {
      console.error("Template load failed:", err);
    }
  }

  // Load template when category changes
  categorySelect.addEventListener("change", e => {
    loadTemplate(e.target.value);
  });
}

/* ============================================================
   PROPERTY LOGIC — Show/hide Sale vs Rent fields dynamically
============================================================ */
function initPropertyFields() {
  const saleGroup = document.getElementById("propertySaleGroup");
  const rentGroup = document.getElementById("propertyRentGroup");
  const radios = document.querySelectorAll("input[name='propertyListingType']");

  if (!saleGroup || !rentGroup || radios.length === 0) {
    console.warn("Property fields missing");
    return;
  }

  // Hide both by default
  saleGroup.style.display = "none";
  rentGroup.style.display = "none";

  radios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "sale") {
        saleGroup.style.display = "block";
        rentGroup.style.display = "none";
      } else {
        saleGroup.style.display = "none";
        rentGroup.style.display = "block";
      }
    });
  });
}

/* ============================================================
   (OPTIONAL) JOBS LOGIC — Example placeholder
============================================================ */
// function initJobFields() {
//   console.log("Jobs template loaded");
// }

/* ============================================================
   (OPTIONAL) EVENTS LOGIC — Example placeholder
============================================================ */
// function initEventFields() {
//   console.log("Events template loaded");
// }
