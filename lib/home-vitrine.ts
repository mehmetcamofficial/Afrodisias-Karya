import { products as editorialCatalogue, type Product } from "./products";

/** The three packaging families of the homepage vitrine; each is one catalogue product, so name, size and price always match it. */
export const vitrineFamilies = [
  { id: "glass-500", family: "Cam şişe", series: "glass", image: "/collection/scene/scene-bottle.webp", w: 488, h: 1532,
    note: "Temsili görsel; ürün fotoğrafı olarak doğrulanmadı." },
  { id: "tin-3l", family: "Mat teneke", series: "tin", image: "/collection/scene/scene-tin.webp", w: 640, h: 785,
    note: "Yapay zekâyla hazırlanmış temsili ambalaj tasarımı." },
  { id: "reserve-500", family: "Hediye kutusu", series: "luxury", image: "/collection/scene/scene-giftbox.webp", w: 820, h: 979,
    note: "Temsili görsel; nihai kutu tasarımı onay bekliyor." },
] as const;

export type VitrineEntry = (typeof vitrineFamilies)[number] & {
  product: Product;
  /** The product exists in the authoritative catalogue (Neon) and this is not the Production showcase, so its detail page is offered. */
  published: boolean;
  /** Published, priced and in stock: the only state that offers a purchase. */
  live: boolean;
  href: string;
};

/**
 * Resolves the vitrine against the live catalogue. A family missing from the database still renders from the
 * checked-in editorial catalogue (same rule as /koleksiyon) — with no price, no purchase action and a link to its series.
 */
export function resolveVitrine(catalogue: Product[], showcase: boolean): VitrineEntry[] {
  const live = new Map(catalogue.map((p) => [p.id, p]));
  return vitrineFamilies.flatMap((f) => {
    const row = live.get(f.id);
    const editorial = editorialCatalogue.find((p) => p.id === f.id);
    const base = row ?? (editorial && { ...editorial, prices: {}, stock: 0, badge: undefined });
    if (!base) return [];
    const published = !showcase && Boolean(row);
    const product: Product = published ? base : { ...base, prices: {}, stock: 0 };
    const isLive = published && product.stock > 0 && typeof product.prices.TRY === "number";
    return [{ ...f, product, published, live: isLive, href: published ? `/urun/${f.id}` : `/koleksiyon#seri-${f.series}` }];
  });
}
