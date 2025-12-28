function compressImage(file, maxWidth = 1200, quality = 0.7) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => resolve(b || file), "image/jpeg", quality);
    };
    img.src = URL.createObjectURL(file);
  });
}

window.compressPostImage = compressImage;

export function initPostMedia() {
  const input = document.getElementById("postImage");
  const preview = document.getElementById("imagePreview");

  input?.addEventListener("change", () => {
    preview.innerHTML = "";
    [...input.files].forEach(file => {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.className = "preview-img";
      preview.appendChild(img);
    });
  });
}
