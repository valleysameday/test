// /postViews/gallery.js
console.log("📄 gallery.js loaded");

const PLACEHOLDER_IMG = "/index/images/webholder.svg";

// ---------------------------------------------------------
// Inject gallery + preview CSS once
// ---------------------------------------------------------
let galleryStylesInjected = false;

function injectGalleryStyles() {
  if (galleryStylesInjected) return;

  console.log("🎨 Injecting gallery styles");

  const style = document.createElement("style");
  style.textContent = `
    .scrollable-gallery {
      display: flex;
      overflow-x: auto;
      gap: 8px;
      padding-bottom: 8px;
    }
    .gallery-img-wrapper {
      flex: 0 0 auto;
      width: 100%;
      max-width: 600px;
      cursor: pointer;
    }
    .gallery-img-wrapper img {
      width: 100%;
      height: auto;
      object-fit: contain;
      border-radius: 8px;
    }
    .image-preview-box {
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: 220px;
      max-width: 40vw;
      background: rgba(0,0,0,0.8);
      padding: 8px;
      border-radius: 8px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #fff;
    }
    .image-preview-box img {
      max-width: 100%;
      border-radius: 6px;
    }
    .image-preview-box .image-count {
      margin-top: 4px;
      font-size: 12px;
    }
    .image-preview-box .close-preview {
      position: absolute;
      top: 4px;
      right: 6px;
      cursor: pointer;
      font-size: 18px;
    }
  `;
  document.head.appendChild(style);

  galleryStylesInjected = true;
}

// ---------------------------------------------------------
// Create the scrollable gallery
// ---------------------------------------------------------
export function createGallery(images) {
  console.log("🖼️ createGallery called:", images);

  injectGalleryStyles();

  const gallery = document.createElement("div");
  gallery.className = "view-post-left gallery scrollable-gallery";

  images.forEach((src, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "gallery-img-wrapper";

    const img = document.createElement("img");
    img.src = src;
    img.onerror = () => {
      console.log("⚠️ Image failed to load, using placeholder:", src);
      img.src = PLACEHOLDER_IMG;
    };

    wrapper.appendChild(img);
    gallery.appendChild(wrapper);

    wrapper.onclick = () => {
      console.log("🔍 Image clicked:", { src, index });
      openPreview(src, index + 1, images.length);
    };
  });

  return gallery;
}

// ---------------------------------------------------------
// Preview box logic
// ---------------------------------------------------------
function openPreview(src, index, total) {
  console.log("🟦 openPreview called:", { src, index, total });

  const existing = document.getElementById("imagePreviewBox");
  if (existing) {
    console.log("🧹 Removing existing preview box");
    existing.remove();
  }

  const box = document.createElement("div");
  box.id = "imagePreviewBox";
  box.className = "image-preview-box";

  box.innerHTML = `
    <span class="close-preview">×</span>
    <img src="${src}" onerror="this.src='${PLACEHOLDER_IMG}'" />
    <div class="image-count">${index} / ${total}</div>
  `;

  document.body.appendChild(box);

  box.querySelector(".close-preview").onclick = () => {
    console.log("❌ Preview closed");
    box.remove();
  };
}
