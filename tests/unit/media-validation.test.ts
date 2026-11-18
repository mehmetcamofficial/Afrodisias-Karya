import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { can } from "../../lib/cms-permissions";
import { checkImageUpload, MAX_IMAGE_BYTES, REPO_IMAGE_PATH, sniffImage } from "../../lib/media-validation";

describe("image sniffing reads the real format and size", () => {
  it("reads repo WebP images (VP8/VP8L/VP8X) with their true dimensions", () => {
    expect(sniffImage(readFileSync("public/collection/scene/scene-tin.webp"))).toEqual({ mime: "image/webp", width: 640, height: 785 });
    expect(sniffImage(readFileSync("public/altin-dal-gift-box.webp"))).toEqual({ mime: "image/webp", width: 1448, height: 1086 });
  });
  it("reads JPEG SOF dimensions", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x04, 0xb0, 0x06, 0x40, 0x03, 0, 0, 0, 0, 0, 0]);
    expect(sniffImage(jpeg)).toEqual({ mime: "image/jpeg", width: 1600, height: 1200 });
  });
  it("rejects non-images (SVG, HTML, empty)", () => {
    expect(sniffImage(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<html>"))).toBeNull();
    expect(checkImageUpload(new Uint8Array(), "", "concept")).toMatchObject({ ok: false });
  });
  it("enforces size cap, declared type and minimum photo side", () => {
    const webp = readFileSync("public/collection/scene/scene-tin.webp");
    expect(checkImageUpload(webp, "image/webp", "concept").ok).toBe(true);
    expect(checkImageUpload(webp, "image/png", "concept")).toMatchObject({ ok: false, error: expect.stringContaining("uyuşmuyor") });
    expect(checkImageUpload(webp, "image/webp", "photo")).toMatchObject({ ok: false, error: expect.stringContaining("800") }); // 640 px short side
    expect(checkImageUpload(readFileSync("public/altin-dal-gift-box.webp"), "image/webp", "photo").ok).toBe(true);
    expect(checkImageUpload(new Uint8Array(MAX_IMAGE_BYTES + 1), "image/png", "concept")).toMatchObject({ ok: false });
  });
  it("only allows plain public repo image paths to be linked", () => {
    for (const ok of ["/products/concepts/tin-3l.webp", "/altin-dal-gift-box.webp"]) expect(REPO_IMAGE_PATH.test(ok), ok).toBe(true);
    for (const bad of ["/../x.webp", "https://x.test/a.webp", "/a.svg", "//cdn/x.png", "/A.webp"]) expect(REPO_IMAGE_PATH.test(bad), bad).toBe(false);
  });
});

describe("Faz 13C permission matrix", () => {
  it("only owners approve prices and photos; editors manage media; viewers read", () => {
    expect(can("owner", "price.approve")).toBe(true);
    expect(can("owner", "media.approve")).toBe(true);
    expect(can("editor", "media.write")).toBe(true);
    expect(can("editor", "price.approve")).toBe(false);
    expect(can("editor", "media.approve")).toBe(false);
    expect(can("viewer", "media.write")).toBe(false);
  });
});
