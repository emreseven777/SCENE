export const AVATAR_BUCKET = "scene-avatars";

export async function prepareAvatar(file: File): Promise<Blob> {
  if (file.size > 25 * 1024 * 1024) throw new Error("25 MB veya daha küçük bir fotoğraf seç.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => {
      throw new Error("Fotoğraf açılamadı. JPEG veya PNG biçiminde bir fotoğraf seç.");
    });
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const context = canvas.getContext("2d");
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    if (!context || !size) throw new Error("Fotoğraf işlenemedi.");
    context.fillStyle = "#000";
    context.fillRect(0, 0, 512, 512);
    context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 512, 512);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob && blob.type === "image/jpeg"
        ? resolve(blob)
        : reject(new Error("Fotoğraf işlenemedi.")), "image/jpeg", 0.85);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
