"use client";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { formatPrice, type Product } from "../../lib/products";
import { useCart } from "./cart-context";
export function ProductDetailClient({product}:{product:Product}){const[quantity,setQuantity]=useState(1);const{currency,add}=useCart();return <div className="product-purchase"><strong>{formatPrice(product,currency)}</strong><span className={product.stock<25?"limited":""}>{product.stock<25?"Sınırlı stok":"Stokta"} · {product.stock} adet</span><div className="quantity"><button onClick={()=>setQuantity(value=>Math.max(1,value-1))} aria-label="Azalt"><Minus size={16}/></button><b>{quantity}</b><button onClick={()=>setQuantity(value=>value+1)} aria-label="Artır"><Plus size={16}/></button></div><button className="add-product" onClick={()=>add(product,quantity)}>Sepete ekle <ShoppingBag size={18}/></button></div>}
