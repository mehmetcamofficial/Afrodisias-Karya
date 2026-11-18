/** What still prevents publication (DB function product_publish_blockers, migration 0007). */
export type PublishBlocker = "sku" | "packaging" | "price_try" | "price_try_approval" | "price_eur_approval" | "price_usd_approval"
  | "stock" | "content_tr" | "photo";

export const BLOCKER_LABELS: Record<PublishBlocker, string> = {
  sku: "SKU", packaging: "ambalaj tipi", price_try: "TL fiyatı",
  price_try_approval: "TL fiyatının ticari onayı", price_eur_approval: "EUR fiyatının ticari onayı", price_usd_approval: "USD fiyatının ticari onayı",
  stock: "stok", content_tr: "Türkçe ad ve açıklama", photo: "onaylı gerçek ürün fotoğrafı (konsept görsel sayılmaz)",
};
