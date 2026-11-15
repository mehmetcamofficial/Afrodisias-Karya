import type { Product } from "./products";
import type { SceneProduct } from "../app/components/collection-scene";

/**
 * The three products of the /koleksiyon scene, built from the catalogue.
 * Links go to a product page only when that product is live; otherwise to its
 * series on the same page — never to a page that would 404 or imply a sale.
 *
 * Image honesty: none of these cut-outs is a verified product photograph.
 * The tin is an owner-supplied AI packaging concept; the bottle and the gift
 * box are brand visuals whose provenance is not verified (see
 * docs/ASSET-REQUIREMENTS.md). The notes below say so on the page.
 */
export function collectionSceneProducts(catalogue: Product[], live: Map<string, Product>): SceneProduct[] {
  const sizes = (category: string) => catalogue.filter((p) => p.category === category).map((p) => p.size);
  const link = (id: string, series: string, seriesLabel: string) =>
    live.has(id) ? { href: `/urun/${id}`, linkLabel: "Ürün detayını incele" } : { href: `#seri-${series}`, linkLabel: seriesLabel };
  return [
    {
      id: "bottle", label: "Cam şişe", title: "Premium cam şişe", inspect: "Cam şişeyi incele",
      line: "Koyu cam, ışığı ve oksijeni uzak tutar; sofrada ve hediyede seçkin bir form.",
      formats: sizes("glass"), ...link("glass-500", "glass", "Cam seriyi incele"),
      note: "Temsili görsel; ürün fotoğrafı olarak doğrulanmadı. Etiketteki “Caria” adı katalog adı değildir.",
      image: { src: "/collection/scene/scene-bottle.webp", width: 488, height: 1532, alt: "Altın Dal koyu cam zeytinyağı şişesi, krem etiketli — temsili görsel" },
    },
    {
      id: "tin", label: "Mat teneke", title: "Mat teneke", inspect: "Mat tenekeyi incele",
      line: "Işık geçirmeyen mat zeytin yeşili teneke; mutfakta düzenli kullanım için aile boyları.",
      formats: sizes("tin"), ...link("tin-3l", "tin", "Aile boylarını incele"),
      note: "Yapay zekâyla hazırlanmış temsili ambalaj tasarımı; gerçek ürün fotoğrafı değildir.",
      image: { src: "/collection/scene/scene-tin.webp", width: 640, height: 785, alt: "Altın Dal mat zeytin yeşili teneke, altın kenarlı — yapay zekâyla hazırlanmış temsili tasarım" },
    },
    {
      id: "giftbox", label: "Hediye kutusu", title: "Premium hediye kutusu", inspect: "Hediye kutusunu incele",
      line: "Mantar yuvada bir şişe, hasat kartı ve tadım kâsesi; Aphrodisias çizimli kapak.",
      formats: catalogue.filter((p) => p.id === "reserve-500").map((p) => `${p.name} · ${p.size}`), ...link("reserve-500", "luxury", "Özel seriyi incele"),
      note: "Temsili görsel; ürün fotoğrafı olarak doğrulanmadı. Nihai kutu tasarımı onay bekliyor.",
      image: { src: "/collection/scene/scene-giftbox.webp", width: 820, height: 979, alt: "Açık Altın Dal hediye kutusu: şişe, hasat kartı ve tadım kâsesi — temsili görsel" },
    },
  ];
}
