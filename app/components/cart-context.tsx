"use client";

import { createContext, FormEvent, useContext, useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { formatPrice, priceFor, type Currency, type Product } from "../../lib/products";

type CartLine = { product: Product; quantity: number };
type CartValue = {
  itemCount: number;
  currency: Currency;
  setCurrency: (value: Currency) => void;
  add: (product: Product, quantity?: number) => void;
  openCart: () => void;
};

const CartContext = createContext<CartValue | null>(null);

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}

function money(value: number, currency: Currency) {
  const symbol = currency === "TRY" ? "₺" : currency === "EUR" ? "€" : "$";
  return `${symbol}${value.toLocaleString(currency === "TRY" ? "tr-TR" : "en-US")}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [currency, setCurrency] = useState<Currency>("TRY");
  const [open, setOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [result, setResult] = useState("");

  const itemCount = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const total = useMemo(() => lines.reduce((sum, line) => sum + priceFor(line.product, currency) * line.quantity, 0), [lines, currency]);

  const add = (product: Product, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      return existing
        ? current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + quantity } : line)
        : [...current, { product, quantity }];
    });
    setResult("");
    setOpen(true);
  };

  const setQuantity = (id: string, quantity: number) => {
    setLines((current) => quantity < 1 ? current.filter((line) => line.product.id !== id) : current.map((line) => line.product.id === id ? { ...line, quantity } : line));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ordering) return;
    setOrdering(true);
    setResult("");
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...data,
          items: lines.map((line) => ({
            id: line.product.id,
            name: line.product.name,
            qty: line.quantity,
            priceKurus: (line.product.prices.TRY ?? 0) * 100,
          })),
        }),
      });
      const json = await response.json() as { id?: string; error?: string };
      if (!response.ok) {
        setResult(json.error ?? "Sipariş kaydedilemedi.");
        return;
      }
      setResult(`Sipariş ${json.id} güvenle kaydedildi.`);
      setLines([]);
      setCheckout(false);
      event.currentTarget.reset();
    } catch {
      setResult("Sipariş kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setOrdering(false);
    }
  };

  return (
    <CartContext.Provider value={{ itemCount, currency, setCurrency, add, openCart: () => setOpen(true) }}>
      {children}
      {open && (
        <div className="cart-backdrop" onClick={() => setOpen(false)}>
          <aside className="cart-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Sepet">
            <div className="cart-head">
              <div><small>ALTIN DAL · GÜVENLİ SİPARİŞ</small><h2>Sepetiniz</h2><p>{itemCount} ürün</p></div>
              <button onClick={() => setOpen(false)} aria-label="Sepeti kapat"><X/></button>
            </div>
            {lines.length === 0 ? (
              <div className="empty-cart"><ShoppingBag/><h3>Sepetiniz şu an boş</h3><p>Hasadın seçili ürünlerini mağazada keşfedebilirsiniz.</p>{result && <div className="order-result success"><Check size={18}/>{result}</div>}</div>
            ) : (
              <>
                <div className="cart-lines">
                  {lines.map(({ product, quantity }) => (
                    <article className="cart-row" key={product.id}>
                      <div className="cart-row-copy"><small>{product.size}</small><b>{product.name}</b><span>{formatPrice(product, currency)}</span></div>
                      <div className="cart-quantity" aria-label={`${product.name} adedi`}>
                        <button onClick={() => setQuantity(product.id, quantity - 1)} aria-label="Adedi azalt"><Minus size={14}/></button>
                        <b>{quantity}</b>
                        <button onClick={() => setQuantity(product.id, quantity + 1)} aria-label="Adedi artır"><Plus size={14}/></button>
                      </div>
                      <strong>{money(priceFor(product, currency) * quantity, currency)}</strong>
                      <button className="cart-remove" onClick={() => setQuantity(product.id, 0)} aria-label={`${product.name} ürününü kaldır`}><Trash2 size={15}/></button>
                    </article>
                  ))}
                </div>
                <div className="cart-assurance"><span><Check size={15}/> Hasat lotu izlenebilirliği</span><span><Check size={15}/> Güvenli paketleme</span></div>
                <div className="cart-total"><span>Ara toplam<small>Kargo ödeme adımında hesaplanır</small></span><strong>{money(total, currency)}</strong></div>
                {!checkout ? (
                  <button className="checkout-btn" onClick={() => setCheckout(true)}>Teslimat bilgilerine geç</button>
                ) : (
                  <form className="checkout-form" onSubmit={submit}>
                    <div className="checkout-steps"><b>1</b><span>Teslimat</span><i/><b>2</b><span>Ödeme</span></div>
                    <label>Ad soyad<input name="customerName" autoComplete="name" required/></label>
                    <label>E-posta<input name="email" type="email" autoComplete="email" required/></label>
                    <label>Telefon<input name="phone" type="tel" autoComplete="tel" required/></label>
                    <label>Teslimat adresi<textarea name="address" autoComplete="street-address" required/></label>
                    <button disabled={ordering}>{ordering ? "Kaydediliyor..." : "Siparişi güvenle oluştur"}</button>
                    <small>Bu aşamada para çekilmez. Ödeme sağlayıcısı aktif olduğunda güvenli ödeme adımına yönlendirilirsiniz.</small>
                  </form>
                )}
                {result && <p className="order-result">{result}</p>}
              </>
            )}
          </aside>
        </div>
      )}
    </CartContext.Provider>
  );
}
