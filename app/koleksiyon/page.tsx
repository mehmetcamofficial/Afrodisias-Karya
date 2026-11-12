import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getLiveProducts } from "../../lib/live-products";
export const dynamic = "force-dynamic";
import { BrandShell } from "../components/site-shell";
import { ProductVisual } from "../components/product-visual";
export default async function CollectionPage(){const products=await getLiveProducts();const oils=products.filter(product=>["glass","luxury","tin"].includes(product.category));return <BrandShell><section className="collection-route-hero"><p>THE COLLECTION</p><h1>Bir toprağın<br/><em>farklı ifadeleri.</em></h1><span>Erken hasat cam seri, sınırlı reserve ve aile boyları.</span></section><section className="collection-editorial">{oils.map((product,index)=><article key={product.id}><div><span>0{index+1}</span><div className="product-visual-frame"><ProductVisual product={product} sizes="(max-width: 900px) 100vw, 50vw"/></div></div><div><small>{product.size} · HASAT 2026</small><h2>{product.name}</h2><p>{product.note}</p><Link href={`/urun/${product.id}`}>Ürünü keşfedin <ArrowRight size={16}/></Link></div></article>)}</section></BrandShell>}
