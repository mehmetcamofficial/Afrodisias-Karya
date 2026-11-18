import { NextResponse } from "next/server";
import { requirePostgres } from "../../../db/postgres/driver";
import { getMediaBlob } from "../../../db/postgres/product-cms-repository";
import { checkAdmin } from "../../admin-auth";

export const runtime = "nodejs";

/**
 * Serves an uploaded product image from PostgreSQL. Images of published
 * products are public (cached by content hash); a draft product's images are
 * visible only to signed-in admins.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^m-[0-9a-f-]{36}$/.test(id)) return new NextResponse(null, { status: 404 });
  let blob;
  try { blob = await getMediaBlob(requirePostgres(), id); }
  catch { return new NextResponse(null, { status: 503 }); }
  if (!blob) return new NextResponse(null, { status: 404 });
  if (!blob.isPublic && (await checkAdmin()).status !== "admin") return new NextResponse(null, { status: 404 });
  const etag = `"${blob.sha256}"`;
  const cache = blob.isPublic ? "public, max-age=3600, stale-while-revalidate=86400" : "private, no-store";
  if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { etag, "cache-control": cache } });
  return new NextResponse(new Uint8Array(blob.data), {
    headers: { "content-type": blob.mime, "content-length": String(blob.data.length), etag, "cache-control": cache,
      "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox" },
  });
}
