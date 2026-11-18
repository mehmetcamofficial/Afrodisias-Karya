import { describe, expect, it } from "vitest";
import { buildCatalogue, catalogueEntry, previewEntries, publishedProducts } from "../../lib/catalog-core";
import { hydrateProducts } from "../../lib/catalog-hydration";
import { knowledge } from "../../lib/ai/knowledge";
import { products, type Product } from "../../lib/products";
import { productJsonLd } from "../../lib/structured-data";
import type { ProductRow } from "../../db/postgres/repository";

const row = (over: Partial<ProductRow> = {}): ProductRow => ({
  id: "glass-500", name: "500 ml Cam Şişe", type: "glass", size: "500 ml", note: "Lokomotif ürün", priceKurus: 89000, stock: 3, active: true, ...over,
});

describe("one catalogue for every surface (Faz 13D)", () => {
  it("13 editorial products are previews when nothing is published: no price, stock or product page", () => {
    const cat = buildCatalogue([], false);
    expect(cat.entries).toHaveLength(13);
    for (const e of cat.entries) {
      expect(e.state).toBe("preview");
      expect(e.product.prices).toEqual({});
      expect(e.product.stock).toBe(0);
      expect(e.href).toBe(`/koleksiyon#seri-${e.product.category}`);
    }
    expect(publishedProducts(cat)).toEqual([]);
  });

  it("published + approved price → live (stock > 0) or soldout (stock 0), linking the product page", () => {
    const cat = buildCatalogue(hydrateProducts([row(), row({ id: "tin-3l", name: "3 Litre Mat Teneke", type: "tin", size: "3 L", priceKurus: 210000, stock: 0 })]), false);
    expect(catalogueEntry(cat, "glass-500")).toMatchObject({ state: "live", href: "/urun/glass-500", product: { prices: { TRY: 890 }, stock: 3 } });
    expect(catalogueEntry(cat, "tin-3l")).toMatchObject({ state: "soldout", href: "/urun/tin-3l" });
    expect(publishedProducts(cat).map((p) => p.id)).toEqual(["glass-500", "tin-3l"]);
    expect(previewEntries(cat)).toHaveLength(11);
  });

  it("a published row WITHOUT an approved TRY price (reads 0, migration 0008) is never sellable", () => {
    const cat = buildCatalogue(hydrateProducts([row({ priceKurus: 0 })]), false);
    expect(catalogueEntry(cat, "glass-500")).toMatchObject({ state: "preview", product: { prices: {}, stock: 0 } });
  });

  it("database unavailable → everything preview, nothing for sale", () => {
    const cat = buildCatalogue(null, false);
    expect(cat.available).toBe(false);
    expect(cat.entries.every((e) => e.state === "preview")).toBe(true);
    expect(publishedProducts(cat)).toEqual([]);
  });

  it("Production showcase: all presentation, nothing sold, product pages stay presentation-only", () => {
    const cat = buildCatalogue(hydrateProducts([row()]), true);
    expect(cat.entries.every((e) => e.state === "preview" && Object.keys(e.product.prices).length === 0)).toBe(true);
    expect(catalogueEntry(cat, "glass-500")?.href).toBe("/urun/glass-500");
  });

  it("a NEW published product needs no code change; an unknown draft is never exposed", () => {
    const cat = buildCatalogue(hydrateProducts([row({ id: "new-oil", name: "Yeni Hasat", size: "1 L" })]), false);
    expect(catalogueEntry(cat, "new-oil")).toMatchObject({ state: "live", product: { name: "Yeni Hasat", size: "1 L" } });
    // Drafts are not returned by listProducts at all (active=true only), so they cannot be appended.
    expect(hydrateProducts([row({ id: "secret-draft", active: false })])).toEqual([]);
  });

  it("an owner-approved photo outranks the editorial/concept image; content comes from the database", () => {
    const [p] = hydrateProducts([row({ id: "tin-3l", type: "tin", photo: { src: "/media/m-1", altTr: "Teneke fotoğrafı", altEn: "" },
      packaging: "tin", content: { tr: { name: "3 L", description: "DB açıklama", origin: "Ataeymir", ingredients: "", usage: "", storage: "" } } })]);
    expect(p.image).toEqual({ src: "/media/m-1", alt: "Teneke fotoğrafı", kind: "variant" });
    expect(p).toMatchObject({ packaging: "tin", content: { tr: { description: "DB açıklama" } } });
    const [concept] = hydrateProducts([row({ id: "tin-3l", type: "tin" })]);
    expect(concept.image?.kind).toBe("concept");
  });

  it("JSON-LD offers only for a real approved TRY price; previews and zero prices get none", () => {
    const live = buildCatalogue(hydrateProducts([row()]), false);
    expect(productJsonLd(catalogueEntry(live, "glass-500")!.product).offers).toMatchObject({ price: "890.00", priceCurrency: "TRY" });
    const preview = buildCatalogue([], false);
    expect(productJsonLd(catalogueEntry(preview, "glass-500")!.product)).not.toHaveProperty("offers");
    expect(productJsonLd({ ...products[0], prices: { TRY: 0 } } as Product)).not.toHaveProperty("offers");
  });

  it("the visitor assistant never links a draft product page and never states a price or stock figure", () => {
    const productDocs = knowledge.filter((k) => k.id.startsWith("product-"));
    expect(productDocs).toHaveLength(13);
    for (const doc of productDocs) {
      expect(doc.href).toMatch(/^\/koleksiyon#seri-/);
      expect(doc.text).not.toMatch(/₺|TL\b|\d+\s?adet|stok(ta)? \d/i);
    }
  });
});
