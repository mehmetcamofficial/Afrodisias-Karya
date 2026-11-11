import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { media, videoFor, type MediaSlot } from "../../lib/media";
import { products } from "../../lib/products";

describe("product catalogue integrity", () => {
  it("has unique ids", () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
  });

  it("every referenced image exists in /public", () => {
    for (const product of products) if (product.image) expect(existsSync(`public${product.image.src}`), product.id).toBe(true);
  });

  it("never shows a bottle/gift-box photo for tins, pantry goods or the club", () => {
    const packagingPhotos = new Set(["/altin-dal-bottle-collection.webp", "/altin-dal-gift-box.webp"]);
    for (const product of products.filter((p) => ["tin", "pantry"].includes(p.category) || p.id === "olive-club")) {
      expect(product.image && packagingPhotos.has(product.image.src), product.id).toBeFalsy();
    }
  });

  it("only glass products use the glass range photo", () => {
    for (const product of products.filter((p) => p.image?.src === "/altin-dal-bottle-collection.webp")) expect(product.category).toBe("glass");
  });

  it("every orderable product has a positive TRY price and non-negative stock", () => {
    for (const product of products) {
      expect(product.prices.TRY, product.id).toBeGreaterThan(0);
      expect(product.stock, product.id).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("media manifest", () => {
  it("only registers video files that exist", () => {
    for (const slot of Object.values(media) as MediaSlot[]) {
      expect(existsSync(`public${slot.poster}`)).toBe(true);
      for (const source of Object.values(slot.video)) for (const src of [source?.mp4, source?.webm]) if (src) expect(existsSync(`public${src}`), src).toBe(true);
    }
  });
  it("prefers a locale-specific video and falls back to default", () => {
    const slot = { poster: "/p.webp", alt: "", video: { default: { mp4: "/d.mp4" }, tr: { mp4: "/tr.mp4" } } };
    expect(videoFor(slot, "tr")?.mp4).toBe("/tr.mp4");
    expect(videoFor(slot, "en")?.mp4).toBe("/d.mp4");
    expect(videoFor({ poster: "/p.webp", alt: "", video: {} }, "tr")).toBeUndefined();
  });
});
