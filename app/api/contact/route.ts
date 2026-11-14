import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requirePostgres } from "../../../db/postgres/driver";
import { readJsonBody } from "../../../lib/cms-http";
import { inquirySchema } from "../../../lib/cms-validation";

export const runtime = "nodejs";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;

function clientHash(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  // Only a salted hash is stored, never the IP itself.
  return createHash("sha256").update(`${process.env.CONTACT_IP_SALT ?? "altin-dal"}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Stores a visitor message (explicit consent required) in contact_inquiries.
 * One statement enforces the rate limit and inserts atomically.
 */
export async function POST(request: Request) {
  const parsed = inquirySchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ error: "Lütfen formu eksiksiz doldurun ve izni onaylayın." }, { status: 400 });
  const { name, email, topic, message } = parsed.data;
  const ipHash = clientHash(request);
  const now = Date.now();
  try {
    const result = await requirePostgres().query<{ id: string }>(
      `INSERT INTO contact_inquiries(id, name, email, topic, message, consent, status, ip_hash, created_at)
       SELECT $1, $2, $3, $4, $5, true, 'new', $6, $7
        WHERE (SELECT count(*) FROM contact_inquiries WHERE ip_hash = $6 AND created_at > $8) < $9
       RETURNING id`,
      [crypto.randomUUID(), name, email.toLowerCase(), topic, message, ipHash, now, now - WINDOW_MS, MAX_PER_WINDOW],
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Çok fazla mesaj gönderildi; lütfen biraz sonra tekrar deneyin." }, { status: 429 });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    // No database (e.g. Production showcase): never pretend the message was received.
    return NextResponse.json({ error: "Mesaj formu şu anda kullanılamıyor; mesajınız kaydedilmedi. Lütfen WhatsApp veya e-posta ile ulaşın." }, { status: 503 });
  }
}
