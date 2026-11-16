import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { publishedPosts } from "../lib/blog";
import { formatPrice, type Product } from "../lib/products";
import { getLiveProducts } from "../lib/live-products";
import { isProductionShowcase } from "../lib/showcase-mode";
import { BrandFooter, BrandHeader } from "./components/site-shell";
import { HeroFilm } from "./components/hero-film";
import { JournalCard } from "./components/journal-card";
import { HomeFilmstrip, type FilmstripStage } from "./components/home-filmstrip";
import { GroveJourney, type JourneyStep } from "./components/story-scroller";
import { Reveal } from "./components/reveal";
import { jsonLdScript, organizationJsonLd } from "../lib/structured-data";
import "./components/home-sections.css";

export const metadata = { alternates: { canonical: "/" } };
// Prices and live status come from the catalogue at request time (never baked into the build).
export const dynamic = "force-dynamic";

/** The three packaging families of the vitrine. Each maps to one catalogue product so name, size and price always match. */
const vitrine = [
  { id: "glass-500", family: "Cam şişe", image: "/collection/scene/scene-bottle.webp", w: 488, h: 1532, series: "glass",
    note: "Temsili görsel; ürün fotoğrafı olarak doğrulanmadı." },
  { id: "tin-3l", family: "Mat teneke", image: "/collection/scene/scene-tin.webp", w: 640, h: 785, series: "tin",
    note: "Yapay zekâyla hazırlanmış temsili ambalaj tasarımı." },
  { id: "reserve-500", family: "Hediye kutusu", image: "/collection/scene/scene-giftbox.webp", w: 820, h: 979, series: "luxury",
    note: "Temsili görsel; nihai kutu tasarımı onay bekliyor." },
] as const;

const filmstrip: FilmstripStage[] = [
  { id: "toprak", label: "Toprak", title: "Taşlı vadide yaşlı ağaçlar", text: "Her ağaç ve her parsel kayıt altına alınır.", image: "/pages/harvest-tree.webp", alt: "Gün ışığında yaşlı zeytin ağaçları — sinematik canlandırma", href: "/hasat#asama-1" },
  { id: "hasat", label: "Hasat", title: "Meyveyi dinlemek", text: "Renk, sertlik ve aroma parsel bazında izlenir.", image: "/pages/harvest-season.webp", alt: "Dalda olgunlaşan yeşil zeytinler — sinematik canlandırma", href: "/hasat#asama-2" },
  { id: "toplama", label: "Toplama", title: "Elle, zedelemeden", text: "Kasalar bekletilmeden sıkım noktasına taşınır.", image: "/pages/harvest-picking.webp", alt: "Daldan elle toplanan zeytinler — sinematik canlandırma", href: "/hasat#asama-3" },
  { id: "sikim", label: "Sıkım", title: "Soğuk sıkım", text: "Düşük sıcaklık ve kontrollü oksijen teması.", image: "/pages/harvest-pressing.webp", alt: "İnce bir akışla dökülen zeytinyağı — sinematik canlandırma", href: "/hasat#asama-4" },
  { id: "sofra", label: "Sofra", title: "Sofrada üç ifade", text: "Cam şişe, mat teneke ve hediye kutusu.", image: "/pages/harvest-table.webp", alt: "Taş kâsede zeytinyağı — sinematik canlandırma", href: "/hasat#asama-6" },
];

const routes: JourneyStep[] = [
  { id: "tarih", label: "Kültürel miras", title: "Aphrodisias’ı keşfet", text: "Antik kentin zanaat ve mermer mirasına kültürel bir pencereden bakın.", image: "/pages/route-heritage.webp", alt: "Aphrodisias tetrapylonunun kemerleri — editoryal görsel", href: "/deneyim#rota-tarih", cta: "Kültürel miras rotası" },
  { id: "hasat", label: "Zeytinlik", title: "Toprağın ritmini izle", text: "Meyvenin bahçeden şişeye uzanan yolunu öğrenin.", image: "/pages/route-grove.webp", alt: "Gün doğumunda yaşlı zeytin ağaçları — sinematik canlandırma", href: "/deneyim#rota-hasat", cta: "Zeytinlik rotası" },
  { id: "tadim", label: "Tadım", title: "Sofraya yaklaş", text: "Aromaları, yemek eşleşmelerini ve Ege tariflerini keşfedin.", image: "/pages/route-table.webp", alt: "Taş kâseye dökülen zeytinyağı — sinematik canlandırma", href: "/deneyim#rota-tadim", cta: "Tadım rotası" },
];

/** Values stated only as far as the site can show them; each links to its evidence. No certificates, awards or lab values. */
const values = [
  { title: "Tek köken", text: "Ataeymir · Karacasu’daki aile zeytinliği; Aphrodisias ile aynı vadi.", proof: { href: "/hikayemiz", label: "Hikâyemiz" } },
  { title: "Lot bazında izlenebilirlik", text: "Her şişe hasat tarihi, parsel ve analiz bilgisiyle bir lota bağlanır. Lot sayfası şu an örnek bir kayıtla gösterilir.", proof: { href: "/traceability/26-004", label: "Örnek lot kaydı" } },
  { title: "Soğuk sıkım", text: "Mevsiminde elle toplama, bekletmeden taşıma ve düşük sıcaklıkta sıkım.", proof: { href: "/hasat", label: "Hasat protokolü" } },
  { title: "Açık bilgi", text: "Görsellerin türü yazılır; fiyat ve stok yalnızca doğrulanmış ürünlerde gösterilir.", proof: { href: "/magaza", label: "Mağaza" } },
];

export default async function Home() {
  const journal = publishedPosts.slice(0, 3);
  const catalogue = await getLiveProducts().catch(() => [] as Product[]);
  const showcase = isProductionShowcase();
  const byId = new Map(catalogue.map((p) => [p.id, p]));
  // Typographic covers on the homepage: no third-party (Wikimedia) image requests on the landing page.
  const journalCards = journal.map((post) => ({ post, graphic: true }));
  return (
    <div className="brand-site landing-site home-editorial">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(organizationJsonLd())} />
      <BrandHeader />
      <main id="main">
        {/* 1 · Hero film: one continuous film (grove → harvest → oil → bottle) with chapter navigation */}
        <HeroFilm labelledBy="hero-title">
          <article>
            <div className="hero-content">
              <p>ATAEYMİR · KARACASU<br />APHRODISIAS ESTATE</p>
              <h1 id="hero-title">Taşın hafızası.<br /><em>Toprağın armağanı.</em></h1>
              <span>Ataeymir’deki aile zeytinliğimizden sınırlı hasat natürel sızma zeytinyağı.</span>
              <nav className="hero-ctas" aria-label="Öne çıkan bağlantılar">
                <Link className="cta cta-primary" href="/koleksiyon">Koleksiyonu Keşfedin <ArrowRight size={17} aria-hidden="true" /></Link>
                <Link className="cta cta-ghost" href="/deneyim">Toprağı Yürüyün <ArrowRight size={17} aria-hidden="true" /></Link>
                <Link className="cta cta-text" href="/hikayemiz">Hikâyemizi Keşfedin <ArrowRight size={17} aria-hidden="true" /></Link>
              </nav>
            </div>
          </article>
        </HeroFilm>

        {/* A · Origin: two-photograph editorial composition */}
        <section className="home-origin" aria-labelledby="origin-title">
          <figure className="home-origin-main"><Image src="/pages/story-valley.webp" alt="Ataeymir yakınlarında vadi ve zeytinlik — sinematik canlandırma" fill sizes="(max-width: 900px) 100vw, 58vw" /></figure>
          <figure className="home-origin-inset"><Image src="/pages/story-aphrodisias.webp" alt="Aphrodisias tetrapylonunun sütunları — editoryal görsel" fill sizes="(max-width: 900px) 60vw, 24vw" /></figure>
          <Reveal className="home-origin-copy">
            <p className="eyebrow">Köken</p>
            <h2 id="origin-title">Aynı vadide,<br /><em>antik bir kentle.</em></h2>
            <p>Altın Dal, Aydın’ın Karacasu ilçesine bağlı Ataeymir’deki aile zeytinliğinden doğdu. Bahçe, Aphrodisias antik kentiyle aynı vadiyi paylaşır.</p>
            <p>Antik kentin zanaat ve ölçü fikrini dekor olarak değil, üretim yaklaşımı olarak yorumluyoruz: az mesafe, açık köken, izlenebilir lot.</p>
            <Link className="text-link" href="/hikayemiz">Hikâyemizi okuyun <ArrowRight size={16} aria-hidden="true" /></Link>
          </Reveal>
        </section>

        {/* B · Collection vitrine: three families on one travertine stage, names/sizes/prices from the catalogue */}
        <section className="home-vitrine" aria-labelledby="vitrine-title">
          <header>
            <p className="eyebrow">Koleksiyon</p>
            <h2 id="vitrine-title">Bir toprak, <em>üç ifade.</em></h2>
            <Link className="text-link" href="/koleksiyon">Koleksiyon sahnesine girin <ArrowRight size={16} aria-hidden="true" /></Link>
          </header>
          <ul className="home-vitrine-stage">
            {vitrine.map((item) => {
              const product = byId.get(item.id);
              if (!product) return null;
              const live = !showcase && product.stock > 0 && Object.keys(product.prices).length > 0;
              const href = live ? `/urun/${product.id}` : `/koleksiyon#seri-${item.series}`;
              return <li key={item.id} className={`home-vitrine-item home-vitrine-${item.series}`}>
                <Link href={href}>
                  <span className="home-vitrine-media"><Image src={item.image} alt={`${product.name} — ${item.note}`} width={item.w} height={item.h} sizes="(max-width: 700px) 60vw, 22vw" /></span>
                  <span className="home-vitrine-plinth" aria-hidden="true" />
                  <small>{item.family} · {product.size}</small>
                  <b>{product.name}</b>
                  <span className="home-vitrine-price">{live ? formatPrice(product, "TRY") : "Satış henüz açık değil"}</span>
                  <i>{live ? "Ürünü incele" : "Seriyi incele"} <ArrowRight size={14} aria-hidden="true" /></i>
                </Link>
                <p className="home-vitrine-note">{item.note}</p>
              </li>;
            })}
          </ul>
          <nav className="home-vitrine-more" aria-label="Diğer seriler">
            <Link href="/magaza?kategori=pantry#urunler">Ataeymir lezzetleri</Link>
            <Link href="/magaza?kategori=subscription#urunler">Olive Club ve deneyim</Link>
            <Link href="/magaza#urunler">Tüm ürünler <ArrowRight size={14} aria-hidden="true" /></Link>
          </nav>
        </section>

        {/* C · Grove to table: native horizontal rail */}
        <section className="home-journey" aria-labelledby="journey-home-title">
          <header>
            <p className="eyebrow">Topraktan sofraya</p>
            <h2 id="journey-home-title">Beş adım, <em>tek özen.</em></h2>
            <p>Hasattan şişeye her aşama bir sonrakinin kalitesini belirler. Bir aşamayı seçin, Hasat sayfasında ayrıntısını okuyun.</p>
          </header>
          <HomeFilmstrip stages={filmstrip} />
        </section>

        {/* D · Experience: three routes into /deneyim */}
        <GroveJourney steps={routes} eyebrow="DENEYİM" heading="Üç rotadan, bir coğrafya." label="Deneyim rotaları" />

        {/* E · Values, each with its evidence */}
        <section className="home-values" aria-labelledby="values-title">
          <header>
            <p className="eyebrow">Yaklaşımımız</p>
            <h2 id="values-title">Söylediğimizi <em>gösterebildiğimiz kadar.</em></h2>
          </header>
          <ol>
            {values.map((v, i) => <li key={v.title}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{v.title}</h3>
              <p>{v.text}</p>
              <Link href={v.proof.href}>{v.proof.label} <ArrowRight size={14} aria-hidden="true" /></Link>
            </li>)}
          </ol>
        </section>

        {/* Journal */}
        <section className="home-journal" aria-labelledby="journal-title">
          <header className="home-section-head">
            <p className="eyebrow">Altın Dal Günlüğü</p>
            <h2 id="journal-title">Bahçeden ve <em>Ege sofrasından.</em></h2>
            <Link className="text-link" href="/gunluk">Tüm yazılar <ArrowRight size={16} aria-hidden="true" /></Link>
          </header>
          <div className="home-journal-grid">{journalCards.map(({ post, graphic }) => <JournalCard key={post.slug} post={post} graphic={graphic} />)}</div>
        </section>

        {/* F · Closing */}
        <section className="home-finale" aria-labelledby="closing-title">
          <Image className="home-finale-image" src="/pages/finale-bottle.webp" alt="" fill sizes="100vw" />
          <div className="home-finale-copy">
            <p className="eyebrow">Altın Dal · Aphrodisias Estate</p>
            <h2 id="closing-title">Bu topraktan.<br /><em>Sofranıza.</em></h2>
            <nav aria-label="Son adım">
              <Link className="cta cta-primary" href="/koleksiyon">Koleksiyonu keşfedin <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link className="cta cta-ghost" href="/magaza">Mağazaya gidin <ArrowRight size={16} aria-hidden="true" /></Link>
            </nav>
            <p className="home-finale-club"><Link href="/olive-club">Olive Club</Link> hazırlık aşamasında; henüz başvuru alınmıyor ve ödeme yapılmıyor.</p>
          </div>
          <p className="home-finale-note">Hareketli ve sabit görüntülerin bir kısmı sinematik canlandırmadır.</p>
        </section>
      </main>
      <BrandFooter />
    </div>
  );
}
