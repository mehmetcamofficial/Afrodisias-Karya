import type { CmsProduct } from "../db/postgres/cms-repository";

/**
 * E2E-ONLY admin fixtures (rendered solely when the Vite test build defines
 * __ALTINDAL_E2E_FIXTURE__). Every name says "Test" and every SKU starts with
 * TEST- so nothing here can be mistaken for real catalogue data.
 */
const text = (name: string, description = "") => ({ name, description, seoTitle: "", seoDescription: "", origin: "", ingredients: "", usage: "", storage: "" });
const base = {
  category: "glass", size: "500 ml", currency: "TRY", tags: [] as string[], active: false, archivedAt: null, updatedAt: 0,
  priceUsdCents: null, netWeightG: null, sizeFamily: null, shipsTo: ["TR"],
};

export const e2eAdminProducts: CmsProduct[] = [
  {
    ...base, id: "e2e-taslak", sku: null, priceKurus: 100000, priceEurCents: 3000, packaging: null, netVolumeMl: null, stock: 0,
    status: "draft", version: 3, tr: text("Test Taslak Ürün"), en: text(""),
    publishBlockers: ["sku", "packaging", "price_try_approval", "price_eur_approval", "stock", "content_tr", "photo"],
    priceApprovals: [],
    media: [
      { id: "m-e2e-concept", url: "/products/concepts/tin-3l.webp", truth: "concept", kind: "image", mime: "image/webp", bytes: 1, width: null, height: null, altTr: "Test konsept", altEn: "", credit: "", license: "", approvedBy: null, approvedAt: null, position: 0 },
      { id: "m-e2e-photo", url: "/altin-dal-gift-box.webp", truth: "photo", kind: "image", mime: "image/webp", bytes: 170000, width: 1448, height: 1086, altTr: "Test fotoğraf", altEn: "", credit: "Test", license: "", approvedBy: null, approvedAt: null, position: 1 },
    ],
  },
  {
    ...base, id: "e2e-hazir", sku: "TEST-HAZIR-1", priceKurus: 120000, priceEurCents: null, packaging: "glass_bottle", netVolumeMl: 500, stock: 4,
    status: "approved", version: 7, tr: text("Test Hazır Ürün", "Test açıklama"), en: text("Test Ready Product", "Test description"),
    publishBlockers: [],
    priceApprovals: [{ currency: "TRY", amountMinor: 120000, approvedBy: "owner@example.test", approvedAt: 1_700_000_000_000 }],
    media: [{ id: "m-e2e-ok", url: "/altin-dal-gift-box.webp", truth: "photo", kind: "image", mime: "image/webp", bytes: 170000, width: 1448, height: 1086, altTr: "Test onaylı fotoğraf", altEn: "", credit: "Test", license: "", approvedBy: "owner@example.test", approvedAt: 1_700_000_000_000, position: 0 }],
  },
];

export const e2eAdminCollections = [
  { id: "e2e-koleksiyon", status: "draft", version: 2, tr: { title: "Test Koleksiyonu" }, productIds: ["e2e-hazir"] },
];
