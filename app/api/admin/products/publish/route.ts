import { NextResponse } from "next/server";
import { checkAdmin } from "../../../../admin-auth";
import { requirePostgres } from "../../../../../db/postgres/driver";
import { publishReviewedProduct } from "../../../../../db/postgres/repository";

export const runtime = "nodejs";

/** Explicit feature gate. Not configured in Preview or Production by default.
 * Publishes only an APPROVED product (never draft/in_review) — see publishReviewedProduct. */
export async function POST(request: Request) {
  const access = await checkAdmin();
  if (access.status !== "admin" || access.role !== "owner") {
    return NextResponse.json(
      { error: access.status === "anonymous" ? "Yetkisiz" : "Yönetici yetkisi gerekli" },
      { status: access.status === "anonymous" ? 401 : 403 },
    );
  }
  if (process.env.VERCEL_ENV !== "preview" || process.env.PREVIEW_CATALOG_PUBLISH_ENABLED !== "true") {
    return NextResponse.json({ error: "Ürün yayımlama kapalı" }, { status: 403 });
  }
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 }); }
  if (!raw || typeof raw !== "object") return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  const body = raw as Record<string, unknown>;
  if (
    typeof body.id !== "string" || !/^[a-z0-9-]{1,64}$/.test(body.id) ||
    typeof body.expectedPriceKurus !== "number" || !Number.isSafeInteger(body.expectedPriceKurus) || body.expectedPriceKurus < 1 ||
    typeof body.approvedStock !== "number" || !Number.isSafeInteger(body.approvedStock) || body.approvedStock < 1 || body.approvedStock > 100000 ||
    body.confirmation !== `YAYINLA:${body.id}`
  ) return NextResponse.json({ error: "Ürün, stok veya açık yayımlama onayı geçersiz" }, { status: 400 });
  try {
    const published = await publishReviewedProduct(requirePostgres(), {
      id: body.id, expectedPriceKurus: body.expectedPriceKurus, approvedStock: body.approvedStock,
      actorUserId: access.user.userId, actorEmail: access.user.email,
    }, Date.now());
    // Same policy as the CMS workflow: approved only, exact reviewed price + stock, no publish blockers.
    if (!published) return NextResponse.json({ error: "Ürün onaylı (approved) değil, değişti, eksik bilgi içeriyor veya bulunamadı; incelemeyi yenileyin" }, { status: 409 });
    return NextResponse.json({ ok: true, id: body.id });
  } catch (error) {
    console.error("catalog publish database unavailable", error);
    return NextResponse.json({ error: "Veritabanı kullanılamıyor" }, { status: 503 });
  }
}
