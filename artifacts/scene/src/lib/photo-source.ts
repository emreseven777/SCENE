export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif";
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const LOW_RESOLUTION = 640;

export function isLowResolution(width: number, height: number) {
  return Math.min(width, height) < LOW_RESOLUTION;
}

export async function openPhoto(file: File) {
  if (!file.size || file.size > 25 * 1024 * 1024) {
    throw new Error("25 MB veya daha küçük bir fotoğraf seç.");
  }
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const signature = String.fromCharCode(...header);
  const jpeg = header[0] === 0xff && header[1] === 0xd8;
  const png = signature.startsWith("\x89PNG\r\n\x1a\n");
  const webp = signature.startsWith("RIFF") && signature.slice(8, 12) === "WEBP";
  const heif = signature.slice(4, 8) === "ftyp";
  const gif = signature.startsWith("GIF87a") || signature.startsWith("GIF89a");
  if (!jpeg && !png && !webp && !heif && !gif) {
    throw new Error("JPEG, PNG, WebP veya HEIC biçiminde bir fotoğraf seç.");
  }
  const image = new Image();
  const decode = async (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    try {
      image.src = url;
      await image.decode();
    } finally { URL.revokeObjectURL(url); }
  };
  try {
    await decode(file);
  } catch {
    try {
      if (!heif) throw new Error();
      const { heicTo, isHeic } = await import("heic-to/csp");
      if (!await isHeic(file)) throw new Error();
      await decode(await heicTo({ blob: file, type: "image/png" }));
    } catch {
      throw new Error("Fotoğraf açılamadı. JPEG, PNG, WebP veya HEIC biçiminde bir fotoğraf seç.");
    }
  }
  if (!image.naturalWidth || !image.naturalHeight) throw new Error("Fotoğraf açılamadı.");
  return image;
}

function readExifOrientation(bytes: Uint8Array, start: number, end: number) {
  if (end - start < 14 || String.fromCharCode(...bytes.subarray(start, start + 6)) !== "Exif\0\0") return null;
  const tiff = new DataView(bytes.buffer, bytes.byteOffset + start + 6, end - start - 6);
  const order = tiff.getUint16(0);
  const little = order === 0x4949;
  if ((!little && order !== 0x4d4d) || tiff.getUint16(2, little) !== 42) return null;
  const ifd = tiff.getUint32(4, little);
  if (ifd > tiff.byteLength - 2) return null;
  const count = tiff.getUint16(ifd, little);
  if (ifd + 2 + 12 * count > tiff.byteLength) return null;
  for (let index = 0; index < count; index++) {
    const entry = ifd + 2 + 12 * index;
    if (tiff.getUint16(entry, little) !== 0x0112) continue;
    if (tiff.getUint16(entry + 2, little) !== 3 || tiff.getUint32(entry + 4, little) !== 1) return null;
    const orientation = tiff.getUint16(entry + 8, little);
    return orientation >= 1 && orientation <= 8 ? orientation : null;
  }
  return 1;
}

function jpegOrientationSegment(orientation: number) {
  // APP1 with one big-endian TIFF entry and no linked IFD, thumbnail, or GPS.
  return new Uint8Array([
    0xff, 0xe1, 0, 34, 69, 120, 105, 102, 0, 0,
    77, 77, 0, 42, 0, 0, 0, 8,
    0, 1, 1, 18, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0,
    0, 0, 0, 0,
  ]);
}

// Keep the JPEG's compressed image and ICC profile byte-for-byte. The only
// EXIF value kept is the standard display orientation.
async function stripJpegMetadata(file: File): Promise<Blob | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const parts: BlobPart[] = [file.slice(0, 2)];
  let offset = 2;
  let scan = false;
  let orientation = 1;
  while (offset < bytes.length) {
    if (scan) {
      const start = offset;
      while (offset + 1 < bytes.length) {
        if (bytes[offset] !== 0xff) { offset++; continue; }
        const next = bytes[offset + 1];
        if (next === 0 || (next >= 0xd0 && next <= 0xd7)) { offset += 2; continue; }
        break;
      }
      parts.push(file.slice(start, offset));
      scan = false;
    }
    const start = offset;
    if (bytes[offset++] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9) return new Blob([...parts, file.slice(start, offset)], { type: "image/jpeg" });
    if (offset + 2 > bytes.length) return null;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    const end = offset + length;
    if (length < 2 || end > bytes.length) return null;
    const signature = String.fromCharCode(...bytes.subarray(offset + 2, Math.min(end, offset + 14)));
    const app = marker >= 0xe0 && marker <= 0xef;
    if (marker === 0xe1 && signature.startsWith("Exif\0\0")) {
      const next = readExifOrientation(bytes, offset + 2, end);
      if (next === null) return null;
      if (next !== 1) {
        if (orientation !== 1 && orientation !== next) return null;
        if (orientation === 1) parts.push(jpegOrientationSegment(next));
        orientation = next;
      }
    }
    if ((!app && marker !== 0xfe)
      || (marker === 0xe0 && signature.startsWith("JFIF\0"))
      || (marker === 0xe2 && signature.startsWith("ICC_PROFILE\0"))
      || (marker === 0xee && signature.startsWith("Adobe"))) {
      parts.push(file.slice(start, end));
    }
    offset = end;
    scan = marker === 0xda;
  }
  return null;
}

const pngImageChunks = new Set([
  "IHDR", "PLTE", "IDAT", "IEND", "tRNS", "iCCP", "sRGB", "gAMA", "cHRM", "cICP", "sBIT", "mDCv", "cLLi",
]);

async function stripPngMetadata(file: File): Promise<Blob | null> {
  const bytes = new DataView(await file.arrayBuffer());
  if (bytes.byteLength < 8 || bytes.getUint32(0) !== 0x89504e47 || bytes.getUint32(4) !== 0x0d0a1a0a) return null;
  const parts = [file.slice(0, 8)];
  for (let offset = 8; offset + 12 <= bytes.byteLength;) {
    const end = offset + 12 + bytes.getUint32(offset);
    if (end > bytes.byteLength) return null;
    const kind = String.fromCharCode(...new Uint8Array(bytes.buffer, offset + 4, 4));
    if (kind === "eXIf") return null;
    if (pngImageChunks.has(kind)) parts.push(file.slice(offset, end));
    if (kind === "IEND") return new Blob(parts, { type: "image/png" });
    offset = end;
  }
  return null;
}

const webpImageChunks = new Set(["VP8X", "VP8 ", "VP8L", "ALPH", "ICCP"]);

async function stripWebpMetadata(file: File): Promise<Blob | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length < 12 || String.fromCharCode(...bytes.subarray(0, 4)) !== "RIFF"
    || String.fromCharCode(...bytes.subarray(8, 12)) !== "WEBP") return null;
  const view = new DataView(bytes.buffer);
  const limit = view.getUint32(4, true) + 8;
  if (limit > bytes.length) return null;
  const chunks: Blob[] = [];
  for (let offset = 12; offset < limit;) {
    if (offset + 8 > limit) return null;
    const kind = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const length = view.getUint32(offset + 4, true);
    const end = offset + 8 + length + length % 2;
    if (end > limit || kind === "EXIF" || kind === "ANIM") return null;
    if (webpImageChunks.has(kind)) {
      if (kind === "VP8X" && length === 10) {
        const chunk = bytes.slice(offset, end);
        chunk[8] &= ~0x0c;
        chunks.push(new Blob([chunk]));
      } else chunks.push(file.slice(offset, end));
    }
    offset = end;
  }
  const header = bytes.slice(0, 12);
  new DataView(header.buffer).setUint32(4, 4 + chunks.reduce((total, chunk) => total + chunk.size, 0), true);
  return new Blob([header, ...chunks], { type: "image/webp" });
}

export async function stripGifMetadata(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = String.fromCharCode(...bytes.subarray(0, 6));
  if (header !== "GIF87a" && header !== "GIF89a") throw new Error("Geçerli bir GIF seç.");
  const tableSize = (packed: number) => packed & 0x80 ? 3 * 2 ** ((packed & 7) + 1) : 0;
  let offset = 13 + tableSize(bytes[10]);
  const parts = [file.slice(0, offset)];
  while (offset < bytes.length) {
    const start = offset;
    const tag = bytes[offset++];
    if (tag === 0x3b) return new Blob([...parts, file.slice(start, offset)], { type: "image/gif" });
    let keep = tag === 0x2c;
    if (tag === 0x2c) {
      offset += 10 + tableSize(bytes[offset + 8]);
    } else if (tag === 0x21) {
      const label = bytes[offset++];
      const application = String.fromCharCode(...bytes.subarray(offset + 1, offset + 12));
      keep = label === 0xf9 || (label === 0xff && (application === "NETSCAPE2.0" || application === "ANIMEXTS1.0"));
    } else break;
    while (offset < bytes.length && bytes[offset]) offset += bytes[offset] + 1;
    if (offset >= bytes.length) break;
    offset++;
    if (keep) parts.push(file.slice(start, offset));
  }
  throw new Error("Geçerli bir GIF seç.");
}

type Region = { x: number; y: number; width: number; height: number };

function render(image: HTMLImageElement, region: Region, scale: number, type: string) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(region.width * scale));
  canvas.height = Math.max(1, Math.floor(region.height * scale));
  try {
    const context = canvas.getContext("2d", { colorSpace: "display-p3" });
    if (!context) throw new Error("Fotoğraf işlenemedi.");
    context.imageSmoothingQuality = "high";
    if (type === "image/jpeg") {
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, region.x, region.y, region.width, region.height, 0, 0, canvas.width, canvas.height);
    return canvas;
  } catch (error) {
    canvas.width = canvas.height = 1;
    throw error;
  }
}

async function encode(image: HTMLImageElement, region: Region, scale: number, type: string, qualities: number[]) {
  const canvas = render(image, region, scale, type);
  try {
    for (const quality of qualities) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
      if (blob?.type === type && blob.size <= MAX_PHOTO_BYTES) return blob;
    }
    return null;
  } finally { canvas.width = canvas.height = 1; }
}

export async function preparePhoto(file: File, image: HTMLImageElement, crop?: Region, jpegOnly = false) {
  if (!crop) {
    const kind = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    let original: Blob | null = null;
    if (kind[0] === 0xff && kind[1] === 0xd8) original = await stripJpegMetadata(file);
    else if (!jpegOnly && kind[0] === 0x89) original = await stripPngMetadata(file);
    else if (!jpegOnly && String.fromCharCode(...kind.subarray(8, 12)) === "WEBP") original = await stripWebpMetadata(file);
    if (original && original.size <= MAX_PHOTO_BYTES) return original;
  }
  const region = crop ?? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  // Try full dimensions first. Limit a single canvas allocation on mobile.
  let scale = Math.min(1, 8192 / Math.max(region.width, region.height), Math.sqrt(40_000_000 / (region.width * region.height)));
  const formats = jpegOnly ? ["image/jpeg"] : ["image/webp", "image/jpeg"];
  for (let attempt = 0; attempt < 5; attempt++, scale *= 0.8) {
    for (const type of formats) {
      const photo = await encode(image, region, scale, type, [0.97, 0.92, 0.85]).catch(() => null);
      if (photo) return photo;
    }
  }
  throw new Error("Fotoğraf 8 MB sınırına sığdırılamadı.");
}

export async function makePhotoThumbnail(image: HTMLImageElement, region: Region) {
  const size = Math.min(region.width, region.height);
  return encode(image, {
    x: region.x + (region.width - size) / 2,
    y: region.y + (region.height - size) / 2,
    width: size, height: size,
  }, Math.min(1, 320 / size), "image/webp", [0.9]).catch(() => null);
}
