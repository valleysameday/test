// /postViews/gallery.js
console.log("📄 NEW gallery.js loaded");

const PLACEHOLDER_IMG = "/index/images/webholder.svg";

let stylesInjected = false;

// ---------------------------------------------------------
// Inject CSS once
// ---------------------------------------------------------
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  console.log("🎨 Injecting gallery + lightbox styles");

  const style = document.createElement("style");
  style.textContent = `
    /* Scrollable gallery */
    .scrollable-gallery {
      display: flex;
      overflow-x: auto;
      gap: 8px;
      padding: 8px 0;
      scroll-snap-type: x mandatory;
    }
    .scrollable-gallery::-webkit-scrollbar {
      height: 6px;
    }
    .scrollable-gallery::-webkit-scrollbar-thumb {
      background: #ccc;
      border-radius: 4px;
    }
    .gallery-img-wrapper {
      flex: 0 0 auto;
      width: 100%;
      max-width: 600px;
      scroll-snap-align: start;
      cursor: pointer;
    }
.gallery-img-wrapper img {
  width: 100%;
  height: 300px; /* or 250px, 280px, whatever fits your design */
  border-radius: 8px;
  object-fit: cover;
}
    /* Fullscreen lightbox */
    .lightbox-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 99999;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .lightbox-img {
      max-width: 90%;
      max-height: 85%;
      border-radius: 8px;
      object-fit: contain;
    }

    .lightbox-close {
      position: absolute;
      top: 20px;
      right: 30px;
      font-size: 32px;
      color: #fff;
      cursor: pointer;
    }

    .lightbox-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      font-size: 48px;
      color: #fff;
      cursor: pointer;
      user-select: none;
      padding: 10px;
    }
    .lightbox-arrow.left { left: 20px; }
    .lightbox-arrow.right { right: 20px; }

    .lightbox-count {
      position: absolute;
      bottom: 20px;
      color: #fff;
      font-size: 16px;
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------
// Create scrollable gallery
// ---------------------------------------------------------
export function createGallery(images) {
  console.log("🖼️ createGallery:", images);

  injectStyles();

  const gallery = document.createElement("div");
  gallery.className = "scrollable-gallery";

  images.forEach((src, index) => {
    const wrap = document.createElement("div");
    wrap.className = "gallery-img-wrapper";

    const img = document.createElement("img");
    img.src = src;
    img.onerror = () => (img.src = PLACEHOLDER_IMG);

    wrap.appendChild(img);
    gallery.appendChild(wrap);

    wrap.onclick = () => {
      console.log("🔍 Opening lightbox at index:", index);
      openLightbox(images, index);
    };
  });

  return gallery;
}

// ---------------------------------------------------------
// Fullscreen lightbox
// ---------------------------------------------------------
function openLightbox(images, startIndex) {
  let index = startIndex;

  console.log("🟦 Lightbox opened:", { index, images });

  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";

  const img = document.createElement("img");
  img.className = "lightbox-img";
  img.src = images[index];

  const closeBtn = document.createElement("div");
  closeBtn.className = "lightbox-close";
  closeBtn.textContent = "×";

  const leftArrow = document.createElement("div");
  leftArrow.className = "lightbox-arrow left";
  leftArrow.textContent = "‹";

  const rightArrow = document.createElement("div");
  rightArrow.className = "lightbox-arrow right";
  rightArrow.textContent = "›";

  const count = document.createElement("div");
  count.className = "lightbox-count";
  count.textContent = `${index + 1} / ${images.length}`;

  overlay.append(img, closeBtn, leftArrow, rightArrow, count);
  document.body.appendChild(overlay);

  // Navigation logic
  function updateImage() {
    img.src = images[index];
    count.textContent = `${index + 1} / ${images.length}`;
  }

  leftArrow.onclick = () => {
    index = (index - 1 + images.length) % images.length;
    console.log("⬅️ Lightbox prev:", index);
    updateImage();
  };

  rightArrow.onclick = () => {
    index = (index + 1) % images.length;
    console.log("➡️ Lightbox next:", index);
    updateImage();
  };

  closeBtn.onclick = () => {
    console.log("❌ Lightbox closed");
    overlay.remove();
  };

  overlay.onclick = e => {
    if (e.target === overlay) {
      console.log("❌ Lightbox closed (background click)");
      overlay.remove();
    }
  };

  // ESC to close
  document.addEventListener(
    "keydown",
    function escHandler(e) {
      if (e.key === "Escape") {
        console.log("❌ Lightbox closed (ESC)");
        overlay.remove();
        document.removeEventListener("keydown", escHandler);
      }
    },
    { once: true }
  );

  // Swipe support (mobile)
  let startX = 0;

  overlay.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });

  overlay.addEventListener("touchend", e => {
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        index = (index - 1 + images.length) % images.length;
        console.log("📱 Swipe right → prev:", index);
      } else {
        index = (index + 1) % images.length;
        console.log("📱 Swipe left → next:", index);
      }
      updateImage();
    }
  });
}
