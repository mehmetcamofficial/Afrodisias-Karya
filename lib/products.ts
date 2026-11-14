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
 * - "concept":   an AI-generated packaging DESIGN supplied by the brand owner
 *                (public/products/concepts/). It looks photographic but does
 *                not show a manufactured package; always disclosed.
 * Products without any image render a neutral placeholder.
 */
export type ProductImage = { src: string; alt: string; kind: "variant" | "range" | "editorial" | "concept"; note?: string };

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
/** Owner-supplied AI packaging concept (1122×1402 WebP). Never a product photo. */
const concept = (id: string, alt: string, note?: string): ProductImage => ({ src: `/products/concepts/${id}.webp`, alt: `${alt} — yapay zekâyla oluşturulmuş temsili ambalaj tasarımı`, kind: "concept", ...(note ? { note } : {}) });

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
  { id: "aromatic-set", name: "Tadım & Aromatik Set", category: "luxury", size: "3 x 100 ml", note: "Limon, biberiye ve acı biber çeşnili set", prices: { TRY: 780, EUR: 28 }, stock: 42, lot: "AD-26-AROMA" , image: concept("aromatic-set", "Üç adet 100 ml koyu cam şişeden oluşan limon, biberiye ve acı biber aromalı tadım seti") },
  { id: "tin-3l", name: "3 Litre Mat Teneke", category: "tin", size: "3 L", note: "Aile kullanımı için ekonomik premium boy", prices: { TRY: 2100, EUR: 75 }, stock: 36, lot: "AD-26-T3" , image: concept("tin-3l", "3 litrelik mat zeytin yeşili teneke, sapı ve altın kapaklı ağzı ile") },
  { id: "tin-5l", name: "5 Litre Mat Teneke", category: "tin", size: "5 L", note: "Yoğun tüketim ve mutfak stoğu için", prices: { TRY: 3200, EUR: 110 }, stock: 19, lot: "AD-26-T5", badge: "Stok dikkat" , image: concept("tin-5l", "5 litrelik mat zeytin yeşili teneke, sapı ve altın kapaklı ağzı ile") },
  { id: "green-olive", name: "Ataeymir Kırma Yeşil Zeytin", category: "pantry", size: "500 g", note: "Köy usulü salamura", prices: { TRY: 240 }, stock: 75 , image: concept("green-olive", "Cam kavanozda 500 g kırma yeşil zeytin") },
  { id: "black-olive", name: "Siyah Sele Zeytin", category: "pantry", size: "500 g", note: "Az tuzlu, doğal sele karakteri", prices: { TRY: 260 }, stock: 61 , image: concept("black-olive", "Cam kavanozda 500 g siyah sele zeytin") },
  { id: "olive-paste", name: "Zeytin Ezmesi", category: "pantry", size: "200 g cam kavanoz", note: "Kahvaltı ve meze tabağı için", prices: { TRY: 180 }, stock: 88 , image: concept("olive-paste", "200 g cam kavanozda zeytin ezmesi") },
  { id: "soap-box", name: "El Yapımı Zeytinyağlı Sabun", category: "pantry", size: "2'li kutu", note: "Soğuk proses zeytinyağlı sabun", prices: { TRY: 290 }, stock: 52 , image: concept("soap-box", "İki kalıp el yapımı zeytinyağlı sabun içeren açık kutu") },
  { id: "olive-club", name: "Olive Club", category: "subscription", size: "2 x 500 ml / 2 ay", note: "%20 avantajlı iki ayda bir gönderim", prices: { TRY: 1450 }, stock: 999, badge: "Abonelik" , image: concept("olive-club", "İki adet 500 ml teneke içeren Olive Club üyelik kutusu tasarımı", "Görseldeki tasarımda 2 × 500 ml teneke yer alır; katalog açıklaması 2 × 500 ml gönderimdir ve nihai ambalaj (şişe veya teneke) henüz onaylanmadı.") },
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

export const isCategory = (value: unknown): value is ProductCategory => typeof value === "string" && Object.hasOwn(categoryLabels, value);

/**
 * Packaging as stated by the catalogue. `undefined` means not yet verified —
 * the UI then says so instead of guessing (e.g. olives: jar vs pouch).
 */
export const packagingLabels: Partial<Record<string, string>> = {
  "glass-250": "Koyu renkli cam şişe",
  "glass-500": "Koyu renkli cam şişe",
  "glass-750": "Koyu renkli cam şişe",
  "reserve-500": "Ahşap/mermer dokulu kutu + 500 ml şişe",
  "aromatic-set": "3 × 100 ml şişe, set",
  "tin-3l": "Mat teneke",
  "tin-5l": "Mat teneke",
  "olive-paste": "Cam kavanoz",
  "soap-box": "2'li kutu",
  "olive-club": "Üyelik gönderimi (2 × 500 ml)",
  "adopt-tree": "Deneyim programı",
};

/** General, non-product-specific storage guidance by category. */
export function storageGuidance(product: Product): string | null {
  if (product.id === "green-olive" || product.id === "black-olive") return "Açıldıktan sonra kapağı kapalı olarak buzdolabında saklayın; zeytinleri temiz ve kuru bir kaşıkla alın.";
  if (product.id === "olive-paste") return "Açıldıktan sonra buzdolabında saklayın ve her kullanımda temiz bir kaşık kullanın.";
  if (product.id === "soap-box") return "Kullanımlar arasında kuru tutun; su birikmeyen bir sabunluk tercih edin.";
  if (product.category === "tin") return "Serin ve karanlık bir yerde, kapağı kapalı saklayın. Günlük kullanım için küçük, koyu renkli bir şişeye aktarmak tenekedeki yağın havayla temasını azaltır.";
  if (["glass", "luxury"].includes(product.category)) return "Serin ve karanlık bir yerde, kapağı kapalı saklayın; doğrudan güneş ışığından ve ısı kaynaklarından uzak tutun.";
  return null;
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
