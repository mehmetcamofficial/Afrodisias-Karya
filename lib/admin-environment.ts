/** What the current deployment allows — pure, so it can be unit-tested. */
export type AdminEnvironment = { label: string; commerce: string; publishing: boolean; tone: "production" | "preview" | "local" };

export function adminEnvironment(source: Record<string, string | undefined> = process.env): AdminEnvironment {
  const env = source.VERCEL_ENV;
  const publishing = env === "preview" && source.PREVIEW_CATALOG_PUBLISH_ENABLED === "true";
  if (env === "production") return { label: "Production", commerce: "Satış, sepet ve sipariş kapalı (tanıtım modu)", publishing: false, tone: "production" };
  if (env === "preview") return { label: "Preview", commerce: "Sipariş kaydı açık, ödeme altyapısı kapalı", publishing, tone: "preview" };
  return { label: "Yerel geliştirme", commerce: "Sipariş kaydı açık, ödeme altyapısı kapalı", publishing: false, tone: "local" };
}
