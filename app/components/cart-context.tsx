"use client";

import { createContext, FormEvent, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { formatAmount, formatPrice, priceFor, products, type Currency, type Product } from "../../lib/products";
import { MAX_QTY_PER_LINE } from "../../lib/orders";

type CartLine = { product: Product; quantity: number };
type CartValue = {
  itemCount: number;
  currency: Currency;
  setCurrency: (value: Currency) => void;
  add: (product: Product, quantity?: number) => void;
  openCart: () => void;
};

const CartContext = createContext<CartValue | null>(null);
const STORAGE_KEY = "altin-dal.cart.v1";
const FIELD_MESSAGES: Record<string, string> = {
  customerName: "Ad soyad gerekli.",
  email: "Geçerli bir e-posta adresi girin.",
  phone: "Geçerli bir telefon numarası girin (örn. 0532 123 45 67).",
  address: "Teslimat adresi gerekli.",
};
const ITEM_MESSAGES: Record<string, string> = {
  unknown_product: "Bu ürün artık satışta değil.",
  invalid_quantity: "Geçersiz adet.",
  quantity_limit: `Tek siparişte en fazla ${MAX_QTY_PER_LINE} adet.`,
  insufficient_stock: "Yeterli stok yok.",
};

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}

/** Highest quantity the server will accept for this product. */
export function maxQuantity(product: Product) {
  return Math.max(0, Math.min(product.stock, MAX_QTY_PER_LINE));
}

/** Only ids and quantities are stored; prices always come from the catalogue. */
function loadLines(): CartLine[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as Array<{ id?: unknown; qty?: unknown }>;
    return raw.flatMap((entry) => {
      const product = products.find((item) => item.id === entry.id);
      if (!product || typeof entry.qty !== "number" || !Number.isInteger(entry.qty)) return [];
      const quantity = Math.min(entry.qty, maxQuantity(product));
      return quantity > 0 ? [{ product, quantity }] : [];
    });
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [currency, setCurrency] = useState<Currency>("TRY");
  const [open, setOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const idempotencyKey = useRef<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  // Restore the saved cart after mount (reading localStorage during render would
  // cause an SSR hydration mismatch on the cart badge).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setLines(loadLines()); setHydrated(true); }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines.map((line) => ({ id: line.product.id, qty: line.quantity }))));
    } catch { /* storage unavailable (private mode): cart still works for this visit */ }
  }, [lines, hydrated]);

  const itemCount = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const total = useMemo(() => lines.reduce((sum, line) => sum + priceFor(line.product, currency) * line.quantity, 0), [lines, currency]);
  const totalTry = useMemo(() => lines.reduce((sum, line) => sum + (line.product.prices.TRY ?? 0) * line.quantity, 0), [lines]);

  const openCart = useCallback(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);
  const closeCart = useCallback(() => {
    setOpen(false);
    returnFocus.current?.focus?.();
  }, []);

  // Focus management: move focus into the dialog, trap Tab, close on Escape.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeCart(); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input, textarea, select, a[href]");
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previousOverflow; };
  }, [open, closeCart]);

  const add = (product: Product, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      const next = Math.min((existing?.quantity ?? 0) + quantity, maxQuantity(product));
      if (next < 1) return current;
      return existing
        ? current.map((line) => line.product.id === product.id ? { ...line, quantity: next } : line)
        : [...current, { product, quantity: next }];
    });
    setResult(null);
    openCart();
  };

  const setQuantity = (id: string, quantity: number) => {
    setLines((current) => quantity < 1
      ? current.filter((line) => line.product.id !== id)
      : current.map((line) => line.product.id === id ? { ...line, quantity: Math.min(quantity, maxQuantity(line.product)) } : line));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ordering) return;
    const form = event.currentTarget;
    setOrdering(true);
    setResult(null);
    setFieldErrors({});
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const data = Object.fromEntries(new FormData(form));
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey.current },
        // Only ids and quantities are sent: the server prices the order.
        body: JSON.stringify({ ...data, items: lines.map((line) => ({ id: line.product.id, qty: line.quantity })) }),
      });
      const json = await response.json().catch(() => ({})) as { id?: string; totalKurus?: number; error?: string; errors?: Array<{ field: string; code: string }> };
      if (!response.ok) {
        const fields: Record<string, string> = {};
        const itemProblems: string[] = [];
        for (const { field, code } of json.errors ?? []) {
          if (FIELD_MESSAGES[field]) fields[field] = FIELD_MESSAGES[field];
          else if (field.startsWith("items.")) {
            const name = products.find((item) => item.id === field.slice(6))?.name ?? "Ürün";
            itemProblems.push(`${name}: ${ITEM_MESSAGES[code] ?? "doğrulanamadı."}`);
          }
        }
        setFieldErrors(fields);
        setResult({ tone: "error", text: [json.error ?? "Sipariş kaydedilemedi.", ...itemProblems].join(" ") });
        return;
      }
      const charged = typeof json.totalKurus === "number" ? ` Tutar: ${formatAmount(json.totalKurus / 100, "TRY")}.` : "";
      setResult({ tone: "success", text: `Sipariş ${json.id} kaydedildi.${charged} Ödeme adımı etkinleştiğinde sizinle iletişime geçeceğiz.` });
      setLines([]);
      setCheckout(false);
      idempotencyKey.current = null;
      form.reset();
    } catch {
      // Keep the idempotency key: retrying the same attempt cannot create a duplicate order.
      setResult({ tone: "error", text: "Bağlantı sorunu nedeniyle sipariş gönderilemedi. Lütfen tekrar deneyin." });
    } finally {
      setOrdering(false);
    }
  };

  const field = (name: keyof typeof FIELD_MESSAGES) => ({
    name,
    "aria-invalid": fieldErrors[name] ? true : undefined,
    "aria-describedby": fieldErrors[name] ? `${name}-error` : undefined,
  });
  const errorFor = (name: string) => fieldErrors[name] && <span className="field-error" id={`${name}-error`}>{fieldErrors[name]}</span>;

  return (
    <CartContext.Provider value={{ itemCount, currency, setCurrency, add, openCart }}>
      {children}
      {open && (
        <div className="cart-backdrop" onClick={closeCart}>
          <aside ref={panelRef} className="cart-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cart-title">
            <div className="cart-head">
              <div><small>ALTIN DAL · GÜVENLİ SİPARİŞ</small><h2 id="cart-title">Sepetiniz</h2><p>{itemCount} ürün</p></div>
              <button ref={closeRef} onClick={closeCart} aria-label="Sepeti kapat"><X/></button>
            </div>
            {lines.length === 0 ? (
              <div className="empty-cart"><ShoppingBag aria-hidden="true"/><h3>Sepetiniz şu an boş</h3><p>Hasadın seçili ürünlerini mağazada keşfedebilirsiniz.</p>{result && <div className={`order-result ${result.tone}`} role="status"><Check size={18} aria-hidden="true"/>{result.text}</div>}</div>
            ) : (
              <>
                <div className="cart-lines">
                  {lines.map(({ product, quantity }) => (
                    <article className="cart-row" key={product.id}>
                      <div className="cart-row-copy"><small>{product.size}</small><b>{product.name}</b><span>{formatPrice(product, currency)}</span></div>
                      <div className="cart-quantity" role="group" aria-label={`${product.name} adedi`}>
                        <button onClick={() => setQuantity(product.id, quantity - 1)} aria-label="Adedi azalt"><Minus size={14}/></button>
                        <b aria-live="polite">{quantity}</b>
                        <button onClick={() => setQuantity(product.id, quantity + 1)} disabled={quantity >= maxQuantity(product)} aria-label="Adedi artır"><Plus size={14}/></button>
                      </div>
                      <strong>{formatAmount(priceFor(product, currency) * quantity, currency)}</strong>
                      <button className="cart-remove" onClick={() => setQuantity(product.id, 0)} aria-label={`${product.name} ürününü kaldır`}><Trash2 size={15}/></button>
                    </article>
                  ))}
                </div>
                <div className="cart-assurance"><span><Check size={15} aria-hidden="true"/> Hasat lotu izlenebilirliği</span><span><Check size={15} aria-hidden="true"/> Güvenli paketleme</span></div>
                <div className="cart-total"><span>Ara toplam<small>Kargo ödeme adımında hesaplanır</small></span><strong>{formatAmount(total, currency)}</strong></div>
                {currency !== "TRY" && (
                  <p className="cart-currency-note">Siparişler Türk lirası ile kaydedilir ve tahsil edilir: <b>{formatAmount(totalTry, "TRY")}</b>. {currency} tutarları bilgilendirme amaçlıdır.</p>
                )}
                {!checkout ? (
                  <button className="checkout-btn" onClick={() => setCheckout(true)}>Teslimat bilgilerine geç</button>
                ) : (
                  <form className="checkout-form" onSubmit={submit} noValidate>
                    <div className="checkout-steps"><b>1</b><span>Teslimat</span><i/><b>2</b><span>Ödeme</span></div>
                    <label>Ad soyad<input {...field("customerName")} autoComplete="name" required maxLength={120}/>{errorFor("customerName")}</label>
                    <label>E-posta<input {...field("email")} type="email" autoComplete="email" required maxLength={254}/>{errorFor("email")}</label>
                    <label>Telefon<input {...field("phone")} type="tel" autoComplete="tel" required maxLength={32}/>{errorFor("phone")}</label>
                    <label>Teslimat adresi<textarea {...field("address")} autoComplete="street-address" required maxLength={600}/>{errorFor("address")}</label>
                    <button disabled={ordering}>{ordering ? "Kaydediliyor..." : "Siparişi güvenle oluştur"}</button>
                    <small>Bu aşamada para çekilmez. Ödeme sağlayıcısı aktif olduğunda güvenli ödeme adımına yönlendirilirsiniz.</small>
                  </form>
                )}
                {result && <p className={`order-result ${result.tone}`} role={result.tone === "error" ? "alert" : "status"}>{result.text}</p>}
              </>
            )}
          </aside>
        </div>
      )}
    </CartContext.Provider>
  );
}
