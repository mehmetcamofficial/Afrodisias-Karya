import Link from "next/link";
import { publishedCollections } from "../../../lib/showcase-db";
import { BrandShell } from "../../components/site-shell";
import { CollectionCards } from "../../components/showcase";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Collections — Altın Dal",
  description: "Curated collections from the Altın Dal family grove near Aphrodisias. Products are not yet on sale.",
  alternates: { canonical: "/en/collection", languages: { "tr-TR": "/koleksiyon", en: "/en/collection" } },
};

/** English index: only collections with an approved English title and slug are listed — nothing is machine-translated. */
export default async function Page() {
  const collections = (await publishedCollections()).filter((c) => c.slugEn && c.en.title);
  return (
    <BrandShell>
      <div lang="en">
        <section className="collection-route-hero">
          <p>ALTIN DAL · COLLECTIONS</p>
          <h1>Collections</h1>
          <span>Curated selections from our family grove in Ataeymir, near Aphrodisias.</span>
          <nav className="store-hero-actions" aria-label="Language"><Link href="/koleksiyon" hrefLang="tr" lang="tr">Türkçe</Link></nav>
        </section>
        <section className="cms-collections">
          {collections.length ? <CollectionCards collections={collections} locale="en" /> : <p className="cms-collection-empty" role="status">English collection pages are being prepared. Please see the <Link href="/koleksiyon" lang="tr">Turkish collection</Link> for now.</p>}
        </section>
      </div>
    </BrandShell>
  );
}
