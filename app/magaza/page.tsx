import { BrandShell } from "../components/site-shell";
import { Storefront } from "../components/storefront";
import { isCategory } from "../../lib/products";
import { getLiveProducts } from "../../lib/live-products";
import { isProductionShowcase } from "../../lib/showcase-mode";
export const dynamic = "force-dynamic";
export const metadata = { title: "Mağaza", description: "Altın Dal cam seri zeytinyağları, özel seri kutular, mat teneke aile boyları ve Ataeymir lezzetleri.", alternates: { canonical: "/magaza" } };
export default async function StorePage({ searchParams }: { searchParams: Promise<{ kategori?: string }> }){const { kategori } = await searchParams;const products=await getLiveProducts();return <BrandShell><section className="store-hero"><p>ALTIN DAL MAĞAZA</p><h1>Bahçeden<br/>sofranıza.</h1><span>Cam seri, lüks kutular, aile boyları ve Ataeymir yan lezzetleri.</span></section><div className="store-page"><Storefront products={products} showcase={isProductionShowcase()} initialCategory={isCategory(kategori) ? kategori : "all"}/></div></BrandShell>}
