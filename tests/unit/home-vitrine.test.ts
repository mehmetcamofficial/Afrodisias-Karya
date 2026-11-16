import { describe, expect, it } from "vitest";
import { resolveVitrine } from "../../lib/home-vitrine";
import { products, type Product } from "../../lib/products";

const pick = (...ids: string[]) => products.filter((p) => ids.includes(p.id));

describe("homepage vitrine", () => {
  it("matches each family to its catalogue product and offers a purchase only when live", () => {
    const entries = resolveVitrine(pick("glass-500", "tin-3l", "reserve-500"), false);
    expect(entries.map((e) => [e.product.name, e.product.size, e.href, e.live])).toEqual([
      ["500 ml Cam Şişe", "500 ml", "/urun/glass-500", true],
      ["3 Litre Mat Teneke", "3 L", "/urun/tin-3l", true],
      ["Aphrodisias Special Reserve", "500 ml", "/urun/reserve-500", true],
    ]);
    expect(entries.map((e) => e.image)).toEqual(["/collection/scene/scene-bottle.webp", "/collection/scene/scene-tin.webp", "/collection/scene/scene-giftbox.webp"]);
  });
  it("never renders an empty vitrine: missing products fall back to the editorial catalogue without price or purchase", () => {
    const entries = resolveVitrine([], false);
    expect(entries).toHaveLength(3);
    for (const e of entries) {
      expect(e.published).toBe(false);
      expect(e.live).toBe(false);
      expect(e.product.prices).toEqual({});
      expect(e.href).toMatch(/^\/koleksiyon#seri-(glass|tin|luxury)$/);
    }
  });
  it("uses the database row as the source of truth for name, size and price", () => {
    const row: Product = { ...products.find((p) => p.id === "tin-3l")!, name: "3 L Teneke (DB)", prices: { TRY: 1999 }, stock: 5 };
    const [, tin] = resolveVitrine([row], false);
    expect(tin.product.name).toBe("3 L Teneke (DB)");
    expect(tin.product.prices.TRY).toBe(1999);
    expect(tin.live).toBe(true);
  });
  it("out of stock: product page, no purchase", () => {
    const [glass] = resolveVitrine([{ ...products.find((p) => p.id === "glass-500")!, stock: 0 }], false);
    expect(glass).toMatchObject({ published: true, live: false, href: "/urun/glass-500" });
  });
  it("Production showcase never offers prices, purchase or product pages", () => {
    for (const e of resolveVitrine(pick("glass-500", "tin-3l", "reserve-500"), true)) {
      expect(e).toMatchObject({ published: false, live: false });
      expect(e.product.prices).toEqual({});
      expect(e.href).toMatch(/^\/koleksiyon#/);
    }
  });
});
