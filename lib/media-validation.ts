/**
 * Image upload validation (pure, no I/O). The declared type is never trusted:
 * the format is read from the file's magic bytes and the pixel size from its
 * header. Stored in PostgreSQL (media_blobs, migration 0008), so uploads are
 * capped below the serverless request limit.
 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
/** A real product photo must be large enough to show the package (shorter side). */
export const MIN_PHOTO_SIDE = 800;

export const MEDIA_TRUTHS = ["photo", "editorial", "concept", "range"] as const;
export type MediaTruth = (typeof MEDIA_TRUTHS)[number];
export const TRUTH_LABELS: Record<MediaTruth, string> = {
  photo: "Gerçek ürün fotoğrafı",
  editorial: "Editoryal / atmosfer",
  concept: "AI konsept tasarım",
  range: "Seri fotoğrafı (bu ürün değil)",
};

export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/avif";
export type SniffedImage = { mime: ImageMime; width: number | null; height: number | null };

const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));

function jpegSize(b: Uint8Array): [number, number] | null {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; }
    const len = u16be(b, i + 2);
    // SOF0..SOF15 except DHT (C4), JPG (C8) and DAC (CC) carry the frame size.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [u16be(b, i + 7), u16be(b, i + 5)];
    i += 2 + len;
  }
  return null;
}

function webpSize(b: Uint8Array): [number, number] | null {
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8X" && b.length >= 30) return [u24le(b, 24) + 1, u24le(b, 27) + 1];
  if (chunk === "VP8 " && b.length >= 30) return [u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff];
  if (chunk === "VP8L" && b.length >= 25) {
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }
  return null;
}

/** Reads the real format and size, or null when the bytes are not a supported image. */
export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    const size = jpegSize(bytes);
    return { mime: "image/jpeg", width: size?.[0] ?? null, height: size?.[1] ?? null };
  }
  if (bytes.length >= 24 && u32be(bytes, 0) === 0x89504e47 && u32be(bytes, 4) === 0x0d0a1a0a && ascii(bytes, 12, 4) === "IHDR") {
    return { mime: "image/png", width: u32be(bytes, 16), height: u32be(bytes, 20) };
  }
  if (bytes.length >= 16 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    const size = webpSize(bytes);
    return { mime: "image/webp", width: size?.[0] ?? null, height: size?.[1] ?? null };
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 4))) {
    return { mime: "image/avif", width: null, height: null };
  }
  return null;
}

export type ImageCheck = { ok: true; image: SniffedImage } | { ok: false; error: string };

/** Validates an upload for the given truth. A real photo must have a readable size of at least MIN_PHOTO_SIDE. */
export function checkImageUpload(bytes: Uint8Array, declaredType: string, truth: MediaTruth): ImageCheck {
  if (bytes.length === 0) return { ok: false, error: "Dosya boş" };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: `Dosya ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB sınırını aşıyor` };
  const image = sniffImage(bytes);
  if (!image) return { ok: false, error: "Desteklenmeyen dosya: yalnızca JPEG, PNG, WebP veya AVIF görsel" };
  if (declaredType && declaredType !== image.mime) return { ok: false, error: `Dosya türü uyuşmuyor (bildirilen ${declaredType}, içerik ${image.mime})` };
  if (truth === "photo") {
    if (image.width === null || image.height === null) return { ok: false, error: "Gerçek ürün fotoğrafının boyutu okunamadı; JPEG, PNG veya WebP kullanın" };
    if (Math.min(image.width, image.height) < MIN_PHOTO_SIDE) return { ok: false, error: `Gerçek ürün fotoğrafının kısa kenarı en az ${MIN_PHOTO_SIDE} px olmalı (${image.width}×${image.height})` };
  }
  return { ok: true, image };
}

/** A public, repo-hosted image path (e.g. an owner-supplied concept in /products/concepts/). */
export const REPO_IMAGE_PATH = /^\/(?!.*\.\.)[a-z0-9][a-z0-9/_.-]{0,200}\.(webp|jpe?g|png|avif)$/;
