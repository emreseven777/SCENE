import { isLowResolution, openPhoto, preparePhoto, stripGifMetadata } from "./photo-source";
import { requireSupabase } from "./supabase";

export const CHAT_BUCKET = "scene-chat";
const imageExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/gif": "gif" };
const audioExtensions: Record<string, string> = {
  "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/aac": "aac",
};

export async function prepareChatPhoto(file: File) {
  if (file.type === "image/gif" || /\.gif$/i.test(file.name)) {
    if (file.size > 8 * 1024 * 1024) throw new Error("En fazla 8 MB boyutunda GIF seç.");
    return { file: await stripGifMetadata(file), lowResolution: false };
  }
  const image = await openPhoto(file);
  return {
    file: await preparePhoto(file, image, undefined, true),
    lowResolution: isLowResolution(image.naturalWidth, image.naturalHeight),
  };
}

export async function uploadChatMedia(match: string, user: string, file: Blob, kind: "photo" | "audio") {
  const mime = file.type.split(";")[0];
  const extension = kind === "photo" ? imageExtensions[mime] : audioExtensions[mime];
  if (!extension || !file.size || file.size > 8 * 1024 * 1024) throw new Error("Dosya biçimi desteklenmiyor veya 8 MB sınırı aşıldı.");
  const path = `${match}/${user}/${crypto.randomUUID()}.${extension}`;
  const { error } = await requireSupabase().storage.from(CHAT_BUCKET).upload(path, file, { contentType: mime, cacheControl: "0" });
  if (error) throw error;
  return path;
}
