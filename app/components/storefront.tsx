"use client";

import Link from "next/link";
import { ArrowUpRight, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { categoryLabels, currencies, formatPrice, priceFor, products, type Currency, type ProductCategory } from "../../lib/products";
import { useCart } from "./cart-context";
import { ProductVisual } from "./product-visual";

type Sort = "featured" | "price-asc" | "price-desc";

export function Storefront() {
  const { currency, setCurrency, add } = useCart();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ProductCategory | "all">("all");
  const [sort, setSort] = useState<Sort>("featured");

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    const filtered = products.filter((product) => {
      const matchesCategory = activeCategory === "all" || product.category === activeCategory;
      const haystack = `${product.name} ${product.size} ${product.note}`.toLocaleLowerCase("tr-TR");
      return matchesCategory && (!normalized || haystack.includes(normalized));
    });
    if (sort === "price-asc") return [...filtered].sort((a, b) => priceFor(a, currency) - priceFor(b, currency));
    if (sort === "price-desc") return [...filtered].sort((a, b) => priceFor(b, currency) - priceFor(a, currency));
    return filtered;
  }, [activeCategory, currency, query, sort]);

  return (
    <>
      <section className="shop-toolbar" aria-label="Mağaza filtreleri">
        <div className="shop-search"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ürün, boy veya seri ara" aria-label="Ürün ara"/></div>
        <div className="shop-selects">
          <label><SlidersHorizontal size={16}/><span className="sr-only">Sıralama</span><select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="featured">Öne çıkanlar</option><option value="price-asc">Fiyat: artan</option><option value="price-desc">Fiyat: azalan</option></select></label>
          <label><span className="sr-only">Para birimi</span><select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>{currencies.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
        </div>
      </section>
      <nav className="category-pills" aria-label="Ürün kategorileri">
        <button className={activeCategory === "all" ? "active" : ""} onClick={() => setActiveCategory("all")}>Tümü <span>{products.length}</span></button>
        {(Object.keys(categoryLabels) as ProductCategory[]).map((category) => (
          <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{categoryLabels[category]} <span>{products.filter((product) => product.category === category).length}</span></button>
        ))}
      </nav>
      <div className="shop-results-head"><p><b>{visibleProducts.length}</b> ürün gösteriliyor</p><span>Seçili hasat · Sınırlı üretim</span></div>
      {visibleProducts.length === 0 ? (
        <section className="shop-empty"><Search/><h2>Aradığınız ürün bulunamadı</h2><p>Arama terimini veya kategori filtresini değiştirmeyi deneyin.</p><button onClick={() => { setQuery(""); setActiveCategory("all"); }}>Filtreleri temizle</button></section>
      ) : (
        <section className="product-grid" aria-label="Ürünler">
          {visibleProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <Link className="product-card-media" href={`/urun/${product.id}`} aria-label={`${product.name} detaylarını gör`}>
                <ProductVisual product={product} sizes="(max-width: 700px) 100vw, (max-width: 1050px) 50vw, 33vw"/>
                {product.badge && <span>{product.badge}</span>}
                <i><ArrowUpRight size={17}/></i>
              </Link>
              <div className="product-card-body">
                <small>{categoryLabels[product.category]} · {product.size}</small>
                <h2><Link href={`/urun/${product.id}`}>{product.name}</Link></h2>
                <p>{product.note}</p>
                <div className="product-card-meta"><span className={product.stock < 25 ? "limited" : ""}>{product.stock < 25 ? "Sınırlı stok" : "Stokta"}</span><span>{product.lot ?? "Tek köken"}</span></div>
                <footer><strong>{formatPrice(product, currency)}</strong><button onClick={() => add(product)}>Sepete ekle <Plus size={17}/></button></footer>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
