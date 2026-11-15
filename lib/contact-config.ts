/**
 * Public contact channels come ONLY from deployment configuration. Nothing is
 * invented: an unset or malformed value hides that channel.
 *   NEXT_PUBLIC_WHATSAPP_NUMBER  E.164 digits, e.g. 905xxxxxxxxx (no +, no spaces)
 *   NEXT_PUBLIC_CONTACT_EMAIL    e.g. info@example.com
 */
export type ContactConfig = { whatsapp: string | null; email: string | null };

export function contactConfig(env: Record<string, string | undefined> = {
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
}): ContactConfig {
  const digits = (env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").trim();
  const email = (env.NEXT_PUBLIC_CONTACT_EMAIL ?? "").trim();
  return {
    whatsapp: /^[1-9]\d{7,14}$/.test(digits) ? digits : null,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
  };
}

/** User-initiated WhatsApp chat link (no automated messaging). */
export function whatsappLink(number: string, text: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
