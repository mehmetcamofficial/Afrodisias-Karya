import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePostgres } from "../../../../../../../db/postgres/driver";
import { addProductMedia } from "../../../../../../../db/postgres/product-cms-repository";
import { cmsErrorResponse, readJsonBody } from "../../../../../../../lib/cms-http";
import { checkImageUpload, MAX_IMAGE_BYTES, MEDIA_TRUTHS, REPO_IMAGE_PATH, type MediaTruth } from "../../../../../../../lib/media-validation";
import { requirePermission } from "../../../../../../admin-auth";

export const runtime = "nodejs";

const meta = z.object({
  truth: z.enum(MEDIA_TRUTHS),
  altTr: z.string().trim().min(3, "Türkçe alternatif metin zorunlu").max(240),
  altEn: z.string().trim().max(240).default(""),
  credit: z.string().trim().max(160).default(""),
  license: z.string().trim().max(160).default(""),
});
const linkSchema = meta.extend({ url: z.string().regex(REPO_IMAGE_PATH, "Yalnızca sitedeki bir görsel yolu (ör. /products/concepts/tin-3l.webp)") });

/**
 * Adds an image to a product. multipart/form-data uploads the file (validated by
 * its bytes, stored in PostgreSQL); JSON links an existing repo image. Images are
 * never approved here: a real photo needs an owner's separate approval.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("media.write");
  if (!access.ok) return access.response;
  try {
    const { id: productId } = await params;
    const db = requirePostgres();
    const now = Date.now();
    const mediaId = `m-${randomUUID()}`;
    if ((request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
      const declared = Number(request.headers.get("content-length") ?? 0);
      if (declared > MAX_IMAGE_BYTES + 64 * 1024) return NextResponse.json({ error: "Dosya 4 MB sınırını aşıyor" }, { status: 413 });
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Dosya seçilmedi" }, { status: 400 });
      const info = meta.parse(Object.fromEntries(["truth", "altTr", "altEn", "credit", "license"].map((k) => [k, form.get(k) ?? undefined])));
      const bytes = new Uint8Array(await file.arrayBuffer());
      const check = checkImageUpload(bytes, file.type, info.truth as MediaTruth);
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 422 });
      const data = Buffer.from(bytes);
      return NextResponse.json(await addProductMedia(db, {
        id: mediaId, productId, ...info, mime: check.image.mime, bytes: bytes.length, width: check.image.width, height: check.image.height,
        data, sha256: createHash("sha256").update(data).digest("hex"),
      }, access.email, now), { status: 201 });
    }
    const link = linkSchema.parse(await readJsonBody(request));
    if (link.truth === "photo") return NextResponse.json({ error: "Gerçek ürün fotoğrafı dosya olarak yüklenmeli (boyut ve içerik doğrulaması için)" }, { status: 422 });
    const mime = link.url.endsWith(".png") ? "image/png" : link.url.endsWith(".avif") ? "image/avif" : /\.jpe?g$/.test(link.url) ? "image/jpeg" : "image/webp";
    return NextResponse.json(await addProductMedia(db, {
      id: mediaId, productId, truth: link.truth, altTr: link.altTr, altEn: link.altEn, credit: link.credit, license: link.license,
      mime, bytes: 1, width: null, height: null, url: link.url,
    }, access.email, now), { status: 201 });
  } catch (error) { return cmsErrorResponse(error); }
}
