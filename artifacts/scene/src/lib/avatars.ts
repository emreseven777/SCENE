export const AVATAR_BUCKET = "scene-avatars";
export const MAX_PROFILE_PHOTOS = 6;

export interface PhotoCrop {
  zoom: number;
  x: number;
  y: number;
}

export const CENTER_CROP: PhotoCrop = { zoom: 1, x: 0, y: 0 };

export function avatarCrop(image: HTMLImageElement, crop: PhotoCrop) {
  const size = Math.min(image.naturalWidth, image.naturalHeight) / crop.zoom;
  return { x: (image.naturalWidth - size) * (crop.x + 100) / 200,
    y: (image.naturalHeight - size) * (crop.y + 100) / 200, width: size, height: size };
}

export function drawAvatar(canvas: HTMLCanvasElement, image: HTMLImageElement, crop: PhotoCrop) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Fotoğraf işlenemedi.");
  const { x, y, width, height } = avatarCrop(image, crop);
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, x, y, width, height, 0, 0, canvas.width, canvas.height);
}

const HD_PHOTO_ID = /\/[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|webp|png)$/;

export function avatarThumbnail(path: string) {
  return HD_PHOTO_ID.test(path) ? `${path}.thumb.webp` : null;
}

export function newAvatarPath(userId: string, image: Blob, hasThumbnail: boolean) {
  const uuid = crypto.randomUUID();
  const id = hasThumbnail ? `${uuid.slice(0, 14)}8${uuid.slice(15)}` : uuid;
  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  return `${userId}/${id}.${extension}`;
}

export type AvatarUpload = { image: Blob; thumbnail: Blob | null; keepPrevious?: boolean };
