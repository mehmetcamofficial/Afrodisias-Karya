import Link from "next/link";
import { getLiveProducts } from "../../../lib/live-products";
import { publishedCollections, publishedExperience } from "../../../lib/showcase-db";
import { BrandShell } from "../../components/site-shell";
import { ExperienceSections } from "../../components/showcase";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "The Aphrodisias Experience — Altın Dal",
  description: "Stories of the Aphrodisias region, our family groves, harvest and tasting. No tours or bookings are offered yet.",
  alternates: { canonical: "/en/experience", languages: { "tr-TR": "/deneyim", en: "/en/experience" } },
};

export default async function Page() {
  const [sections, collections, live] = await Promise.all([publishedExperience(), publishedCollections(), getLiveProducts()]);
  const english = sections.filter((s) => s.en.title);
  return (
    <BrandShell>
      <div lang="en">
        <section className="collection-route-hero">
          <p>THE APHRODISIAS EXPERIENCE</p>
          <h1>Beyond the bottle.</h1>
          <span>The region, the grove and the table. This is an online journey: no tours, visits or bookings are offered yet.</span>
          <nav className="store-hero-actions" aria-label="Language"><Link href="/deneyim" hrefLang="tr" lang="tr">Türkçe</Link></nav>
        </section>
        {english.length
          ? <section className="cms-experience-wrap" aria-label="Stories"><ExperienceSections sections={english} locale="en" collections={collections} live={live} /></section>
          : <section className="cms-experience-wrap"><p className="cms-collection-empty" role="status">English stories are being prepared. Please see the <Link href="/deneyim" lang="tr">Turkish experience page</Link> for now.</p></section>}
      </div>
    </BrandShell>
  );
}
