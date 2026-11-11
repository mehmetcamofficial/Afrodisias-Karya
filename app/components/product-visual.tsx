import Image from "next/image";
import type { Product } from "../../lib/products";

/**
 * Renders a product's image, or an honest placeholder when no truthful photo
 * exists. Must be placed inside a positioned container (uses `fill`).
 */
export function ProductVisual({ product, sizes, priority = false }: { product: Product; sizes: string; priority?: boolean }) {
  if (!product.image) {
    return (
      <div className="product-visual-placeholder" role="img" aria-label={`${product.name} — ürün fotoğrafı hazırlanıyor`}>
        <small>Altın Dal</small>
        <b>{product.size}</b>
        <small>Fotoğraf hazırlanıyor</small>
      </div>
    );
  }
  return <Image src={product.image.src} alt={product.image.alt} fill sizes={sizes} priority={priority} />;
}

/** Disclosure shown under images that do not depict the exact variant. */
export function productImageNote(product: Product): string | null {
  if (!product.image) return null;
  if (product.image.kind === "range") return "Görsel ürün serisini gösterir; bu boyun kendi fotoğrafı hazırlanıyor.";
  if (product.image.kind === "editorial") return "Atmosfer görseli; ürün ambalajını göstermez.";
  return null;
}
