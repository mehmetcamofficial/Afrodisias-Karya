/** What still prevents publication (DB function product_publish_blockers, migration 0007). */
export type PublishBlocker = "sku" | "packaging" | "price_try" | "stock" | "content_tr" | "photo";

export const BLOCKER_LABELS: Record<PublishBlocker, string> = {
  sku: "SKU", packaging: "ambalaj tipi", price_try: "TL fiyatı", stock: "stok",
  content_tr: "Türkçe ad ve açıklama", photo: "onaylı ürün fotoğrafı (konsept görsel sayılmaz)",
};
