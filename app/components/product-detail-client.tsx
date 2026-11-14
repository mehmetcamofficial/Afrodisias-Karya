"use client";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatPrice, type Product } from "../../lib/products";
import { maxQuantity, useCart } from "./cart-context";

export function ProductDetailClient({ product, showcase = false }: { product: Product; showcase?: boolean }) {
  const [quantity, setQuantity] = useState(1);
  const [stickyVisible, setStickyVisible] = useState(false);
  const purchaseRef = useRef<HTMLDivElement>(null);
  const { currency, add } = useCart();
  const max = maxQuantity(product);
  const available = max > 0;

  // Mobile sticky bar appears only once the main purchase block scrolls away.
  useEffect(() => {
    const target = purchaseRef.current;
    if (!target || showcase) return;
    const observer = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(target);
    return () => observer.disconnect();
  }, [showcase]);

  if (showcase) {
    return (
      <div className="product-purchase is-showcase">
        <strong>Yakında</strong>
        <p>Bu ürün tanıtım amaçlıdır. Fiyat, stok ve sipariş henüz açık değildir.</p>
      </div>
    );
  }
  return (
    <>
      <div className="product-purchase" ref={purchaseRef}>
        <strong>{formatPrice(product, currency)}</strong>
        <span className={product.stock < 25 ? "limited" : ""}>{!available ? "Tükendi" : product.stock < 25 ? "Sınırlı stok" : "Stokta"} · {product.stock} adet</span>
        <div className="quantity" role="group" aria-label="Adet">
          <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1} aria-label="Adedi azalt"><Minus size={16} /></button>
          <b aria-live="polite">{quantity}</b>
          <button onClick={() => setQuantity((value) => Math.min(max, value + 1))} disabled={quantity >= max} aria-label="Adedi artır"><Plus size={16} /></button>
        </div>
        <button className="add-product" onClick={() => add(product, quantity)} disabled={!available}>Sepete ekle <ShoppingBag size={18} aria-hidden="true" /></button>
      </div>
      <div className={`sticky-purchase${stickyVisible ? " is-visible" : ""}`} aria-hidden={!stickyVisible}>
        <div><b>{product.name}</b><span>{formatPrice(product, currency)}</span></div>
        <button onClick={() => add(product, quantity)} disabled={!available} tabIndex={stickyVisible ? 0 : -1}>
          {available ? "Sepete ekle" : "Tükendi"}
        </button>
      </div>
    </>
  );
}
