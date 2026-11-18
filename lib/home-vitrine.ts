import type { Product } from "./products";
import { buildCatalogue, catalogueEntry } from "./catalog-core";

/** The three packaging families of the homepage vitrine; each is one catalogue product, so name, size and price always match it. */
export const vitrineFamilies = [
  { id: "glass-500", family: "Cam şişe", series: "glass", image: "/collection/scene/scene-bottle.webp", w: 488, h: 1532,
    note: "Temsili görsel; ürün fotoğrafı olarak doğrulanmadı." },
  { id: "tin-3l", family: "Mat teneke", series: "tin", image: "/collection/scene/scene-tin.webp", w: 640, h: 785,
    note: "Yapay zekâyla hazırlanmış temsili ambalaj tasarımı." },
  { id: "reserve-500", family: "Hediye kutusu", series: "luxury", image: "/collection/scene/scene-giftbox.webp", w: 820, h: 979,
    note: "Temsili görsel; nihai kutu tasarımı onay bekliyor." },
] as const;

type Family = (typeof vitrineFamilies)[number];
export type VitrineEntry = Omit<Family, "image" | "note"> & { image: string; note: string } & {
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
  // Same rules as every other surface (lib/catalog-core): published + approved price → live/soldout, else preview.
  const cat = buildCatalogue(catalogue, showcase);
  return vitrineFamilies.flatMap((f) => {
    const e = catalogueEntry(cat, f.id);
    if (!e) return [];
    const published = e.state !== "preview";
    // An owner-approved photo of THIS product replaces the representative cut-out.
    const photo = published && e.product.image?.kind === "variant" ? e.product.image : null;
    return [{ ...f, product: e.product, published, live: e.state === "live",
      href: published ? e.href : `/koleksiyon#seri-${f.series}`,
      ...(photo ? { image: photo.src, note: "Onaylı ürün fotoğrafı." } : {}) }];
  });
}
