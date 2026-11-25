import { requireSupabase } from "./supabase";

export const CHAT_BUCKET = "scene-chat";
const audioExtensions: Record<string, string> = {
  "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/aac": "aac",
};

export async function prepareChatPhoto(file: File) {
  if (file.size > 24 * 1024 * 1024) throw new Error("En fazla 24 MB boyutunda fotoğraf seç.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Fotoğraf işlenemedi.");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((image) => image ? resolve(image) : reject(new Error("Fotoğraf işlenemedi.")), "image/jpeg", 0.85));
  } finally { URL.revokeObjectURL(url); }
}

export async function uploadChatMedia(match: string, user: string, file: Blob, kind: "photo" | "audio") {
  const mime = file.type.split(";")[0];
  const extension = kind === "photo" ? (mime === "image/jpeg" ? "jpg" : null) : audioExtensions[mime];
  if (!extension || !file.size || file.size > 8 * 1024 * 1024) throw new Error("Dosya biçimi desteklenmiyor veya 8 MB sınırı aşıldı.");
  const path = `${match}/${user}/${crypto.randomUUID()}.${extension}`;
  const { error } = await requireSupabase().storage.from(CHAT_BUCKET).upload(path, file, { contentType: mime, cacheControl: "30" });
  if (error) throw error;
  return path;
}
