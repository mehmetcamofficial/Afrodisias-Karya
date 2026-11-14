import Image from "next/image";
import type { Product } from "../../lib/products";

/**
 * Editorial photos and family imagery must never impersonate an exact SKU.
 * For unphotographed variants we render an explicitly illustrative package
 * silhouette; it is NOT a generated packshot or a product photograph.
 */
export function ProductVisual({ product, sizes, priority = false }: { product: Product; sizes: string; priority?: boolean }) {
  if (!product.image) {
    const isTin = product.category === "tin";
    const isPantry = product.category === "pantry";
    const shape = isTin ? "tin" : isPantry ? "jar" : product.category === "subscription" ? "membership" : "gift";
    return (
      <div className={`product-visual-placeholder product-visual-${shape}`} role="img" aria-label={`${product.name} — temsili ambalaj çizimi, gerçek ürün fotoğrafı değil`}>
        <span className="visual-illustration" aria-hidden="true">
          <i className="illustration-handle"/>
          <i className="illustration-label">AD<span>ALTIN DAL</span></i>
        </span>
        <div className="visual-caption">
          <small>ALTIN DAL · KOLEKSİYON</small>
          <b>{product.size}</b>
          <span>Temsili ambalaj çizimi</span>
        </div>
      </div>
    );
  }
  return <Image className={`product-img product-img-${product.image.kind}`} src={product.image.src} alt={product.image.alt} fill sizes={sizes} priority={priority} />;
}

/** Disclosure always accompanies illustrative, editorial and range visuals. */
export function productImageNote(product: Product): string | null {
  if (!product.image || product.image.kind === "illustration") return "Temsili ambalaj çizimi; gerçek ürün fotoğrafı henüz eklenmedi.";
  if (product.image.kind === "range") return "Görsel ürün serisini gösterir; bu boyun kendi fotoğrafı hazırlanıyor.";
  if (product.image.kind === "editorial") return "Atmosfer görseli; ürün ambalajını göstermez.";
  return null;
}
