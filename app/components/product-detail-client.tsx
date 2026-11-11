"use client";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { formatPrice, type Product } from "../../lib/products";
import { maxQuantity, useCart } from "./cart-context";

export function ProductDetailClient({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const { currency, add } = useCart();
  const max = maxQuantity(product);
  const available = max > 0;
  return (
    <div className="product-purchase">
      <strong>{formatPrice(product, currency)}</strong>
      <span className={product.stock < 25 ? "limited" : ""}>{!available ? "Tükendi" : product.stock < 25 ? "Sınırlı stok" : "Stokta"} · {product.stock} adet</span>
      <div className="quantity" role="group" aria-label="Adet">
        <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1} aria-label="Adedi azalt"><Minus size={16} /></button>
        <b aria-live="polite">{quantity}</b>
        <button onClick={() => setQuantity((value) => Math.min(max, value + 1))} disabled={quantity >= max} aria-label="Adedi artır"><Plus size={16} /></button>
      </div>
      <button className="add-product" onClick={() => add(product, quantity)} disabled={!available}>Sepete ekle <ShoppingBag size={18} aria-hidden="true" /></button>
    </div>
  );
}
