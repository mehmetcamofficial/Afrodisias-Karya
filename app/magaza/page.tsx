import { BrandShell } from "../components/site-shell";
import { Storefront } from "../components/storefront";
import { getLiveProducts } from "../../lib/live-products";
export const dynamic = "force-dynamic";
export default async function StorePage(){const products=await getLiveProducts();return <BrandShell><section className="store-hero"><p>ALTIN DAL MAĞAZA</p><h1>Bahçeden<br/>sofranıza.</h1><span>Cam seri, lüks kutular, aile boyları ve Ataeymir yan lezzetleri.</span></section><div className="store-page"><Storefront products={products}/></div></BrandShell>}
