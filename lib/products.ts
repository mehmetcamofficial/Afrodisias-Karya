export type Currency = "TRY" | "EUR" | "USD";
export type Language = "TR" | "EN";

export type ProductCategory =
  | "glass"
  | "luxury"
  | "tin"
  | "pantry"
  | "subscription";

/**
 * What a product photo actually shows. Never use a photo of a different
 * package to represent a product (e.g. a glass bottle for a 5 L tin):
 * - "variant":   this exact SKU/package (none verified yet)
 * - "range":     the product family/packaging line, not this exact variant
 * - "editorial": non-packaging imagery (e.g. the grove for a tree adoption)
 * - "illustration": a representative drawing of the declared package type
 *   (tin, jar, box…). Not a photograph; always disclosed as "temsili".
 *   Source: scripts/product-illustrations.py → public/products/illustrations/.
 * Products without any image render a neutral placeholder.
 */
export type ProductImage = { src: string; alt: string; kind: "variant" | "range" | "editorial" | "illustration" };

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  size: string;
  note: string;
  prices: Partial<Record<Currency, number>>;
  stock: number;
  lot?: string;
  badge?: string;
  image?: ProductImage;
};

const GLASS_RANGE: ProductImage = { src: "/altin-dal-bottle-collection.webp", alt: "Altın Dal koyu cam şişe serisi mermer kaide üzerinde", kind: "range" };
const GIFT_BOX: ProductImage = { src: "/altin-dal-gift-box.webp", alt: "Altın Dal hediye kutusu", kind: "range" };
const GROVE: ProductImage = { src: "/hero-tetrapylon-grove.webp", alt: "Ataeymir yakınlarında zeytinlik", kind: "editorial" };
const illustration = (id: string, alt: string): ProductImage => ({ src: `/products/illustrations/${id}.webp`, alt: `${alt} — temsili çizim`, kind: "illustration" });

export const currencies: Array<{ code: Currency; symbol: string; label: string }> = [
  { code: "TRY", symbol: "₺", label: "TL" },
  { code: "EUR", symbol: "€", label: "EUR" },
  { code: "USD", symbol: "$", label: "USD" },
];

export const categoryLabels: Record<ProductCategory, string> = {
  glass: "Erken Hasat Soğuk Sıkım",
  luxury: "Özel Seri & Lüks Kutular",
  tin: "Aile / Teneke Boyu",
  pantry: "Yan Ürünler & Yan Lezzetler",
  subscription: "Abonelik & Deneyim",
};

export const products: Product[] = [
  { id: "glass-250", name: "250 ml Cam Şişe", category: "glass", size: "250 ml", note: "Tadım ve hediye boyu", prices: { TRY: 550, EUR: 25 }, stock: 84, lot: "AD-26-G250", image: GLASS_RANGE },
  { id: "glass-500", name: "500 ml Cam Şişe", category: "glass", size: "500 ml", note: "Lokomotif ürün", prices: { TRY: 890, EUR: 32 }, stock: 126, lot: "AD-26-G500", badge: "Lokomotif", image: GLASS_RANGE },
  { id: "glass-750", name: "750 ml Cam Şişe", category: "glass", size: "750 ml", note: "Sofra ve premium hediye için", prices: { TRY: 1250, EUR: 42 }, stock: 58, lot: "AD-26-G750", image: GLASS_RANGE },
  { id: "reserve-500", name: "Aphrodisias Special Reserve", category: "luxury", size: "500 ml", note: "Özel ahşap/mermer kutu + 500 ml", prices: { TRY: 1450, EUR: 48 }, stock: 24, lot: "AD-26-SR", badge: "Reserve", image: GIFT_BOX },
  { id: "aromatic-set", name: "Tadım & Aromatik Set", category: "luxury", size: "3 x 100 ml", note: "Limon, biberiye ve acı biber çeşnili set", prices: { TRY: 780, EUR: 28 }, stock: 42, lot: "AD-26-AROMA" , image: illustration("aromatic-set", "Üç adet 100 ml koyu cam şişeden oluşan limon, biberiye ve acı biber aromalı tadım seti") },
  { id: "tin-3l", name: "3 Litre Mat Teneke", category: "tin", size: "3 L", note: "Aile kullanımı için ekonomik premium boy", prices: { TRY: 2100, EUR: 75 }, stock: 36, lot: "AD-26-T3" , image: illustration("tin-3l", "3 litrelik mat zeytin yeşili teneke, sapı ve altın kapaklı ağzı ile") },
  { id: "tin-5l", name: "5 Litre Mat Teneke", category: "tin", size: "5 L", note: "Yoğun tüketim ve mutfak stoğu için", prices: { TRY: 3200, EUR: 110 }, stock: 19, lot: "AD-26-T5", badge: "Stok dikkat" , image: illustration("tin-5l", "5 litrelik mat zeytin yeşili teneke, sapı ve altın kapaklı ağzı ile") },
  { id: "green-olive", name: "Ataeymir Kırma Yeşil Zeytin", category: "pantry", size: "500 g", note: "Köy usulü salamura", prices: { TRY: 240 }, stock: 75 , image: illustration("green-olive", "Cam kavanozda 500 g kırma yeşil zeytin") },
  { id: "black-olive", name: "Siyah Sele Zeytin", category: "pantry", size: "500 g", note: "Az tuzlu, doğal sele karakteri", prices: { TRY: 260 }, stock: 61 , image: illustration("black-olive", "Cam kavanozda 500 g siyah sele zeytin") },
  { id: "olive-paste", name: "Zeytin Ezmesi", category: "pantry", size: "200 g cam kavanoz", note: "Kahvaltı ve meze tabağı için", prices: { TRY: 180 }, stock: 88 , image: illustration("olive-paste", "200 g cam kavanozda zeytin ezmesi") },
  { id: "soap-box", name: "El Yapımı Zeytinyağlı Sabun", category: "pantry", size: "2'li kutu", note: "Soğuk proses zeytinyağlı sabun", prices: { TRY: 290 }, stock: 52 , image: illustration("soap-box", "İki kalıp el yapımı zeytinyağlı sabun içeren açık kutu") },
  { id: "olive-club", name: "Olive Club", category: "subscription", size: "2 x 500 ml / 2 ay", note: "%20 avantajlı iki ayda bir gönderim", prices: { TRY: 1450 }, stock: 999, badge: "Abonelik" , image: illustration("olive-club", "İki adet 500 ml şişe içeren Olive Club üyelik kutusu") },
  { id: "adopt-tree", name: "Adopt an Olive Tree", category: "subscription", size: "Yıllık", note: "İsme özel sertifika, ağaçtan 3L yağ, özel etiket", prices: { TRY: 4500 }, stock: 40, badge: "Deneyim", image: GROVE },
];

const eurToUsd = 1.09;
const tryToUsd = 0.031;

export function priceFor(product: Product, currency: Currency) {
  if (product.prices[currency]) return product.prices[currency]!;
  if (currency === "USD" && product.prices.EUR) return Math.round(product.prices.EUR * eurToUsd);
  if (currency === "USD" && product.prices.TRY) return Math.round(product.prices.TRY * tryToUsd);
  if (currency === "EUR" && product.prices.TRY) return Math.round(product.prices.TRY / 35);
  return product.prices.TRY ?? 0;
}

export function formatAmount(value: number, currency: Currency) {
  const symbol = currencies.find((item) => item.code === currency)?.symbol ?? "";
  return currency === "TRY" ? `${symbol}${value.toLocaleString("tr-TR")}` : `${symbol}${value.toLocaleString("en-US")}`;
}

export function formatPrice(product: Product, currency: Currency) {
  return formatAmount(priceFor(product, currency), currency);
}

/** Price is set in this currency by the business (not derived by conversion). */
export function hasListedPrice(product: Product, currency: Currency) {
  return typeof product.prices[currency] === "number";
}

export function productsByCategory() {
  return Object.entries(categoryLabels).map(([category, label]) => ({
    category: category as ProductCategory,
    label,
    items: products.filter((product) => product.category === category),
  }));
}
