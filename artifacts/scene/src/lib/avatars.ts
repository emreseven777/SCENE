export const AVATAR_BUCKET = "scene-avatars";
export const MAX_PROFILE_PHOTOS = 6;

export interface PhotoCrop {
  zoom: number;
  x: number;
  y: number;
}

export const CENTER_CROP: PhotoCrop = { zoom: 1, x: 0, y: 0 };

export function drawAvatar(canvas: HTMLCanvasElement, image: HTMLImageElement, crop: PhotoCrop) {
  const context = canvas.getContext("2d");
  const size = Math.min(image.naturalWidth, image.naturalHeight) / crop.zoom;
  if (!context || !size) throw new Error("Fotoğraf işlenemedi.");
  const left = (image.naturalWidth - size) * (crop.x + 100) / 200;
  const top = (image.naturalHeight - size) * (crop.y + 100) / 200;
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, left, top, size, size, 0, 0, canvas.width, canvas.height);
}

export function encodeAvatar(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob && blob.type === "image/jpeg"
      ? resolve(blob)
      : reject(new Error("Fotoğraf işlenemedi.")), "image/jpeg", 0.85);
  });
}
