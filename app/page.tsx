import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { publishedPosts } from "../lib/blog";
import { media } from "../lib/media";
import { groveZones } from "../lib/site-content";
import { BrandFooter, BrandHeader } from "./components/site-shell";
import { CinematicMedia } from "./components/cinematic-media";
import { JournalCard } from "./components/journal-card";
import { Reveal } from "./components/reveal";
import { jsonLdScript, organizationJsonLd } from "../lib/structured-data";

export const metadata = { alternates: { canonical: "/" } };

/**
 * Every photograph appears once on this page. Product drawings are labelled
 * as representative illustrations wherever they appear.
 */
const collections = [
  { href: "/magaza?kategori=glass", kicker: "01 · Cam seri", title: "Erken Hasat", copy: "250, 500 ve 750 ml koyu cam şişeler.", image: { src: "/altin-dal-bottle-collection.webp", alt: "Altın Dal koyu cam şişe serisi mermer kaide üzerinde", w: 1448, h: 1086 } },
  { href: "/magaza?kategori=luxury", kicker: "02 · Özel seri", title: "Hediye & Reserve", copy: "Kutulu Special Reserve ve tadım seti.", image: { src: "/altin-dal-gift-box.webp", alt: "Açık Altın Dal hediye kutusunda şişe ve tadım fincanı", w: 1448, h: 1086 } },
  { href: "/magaza?kategori=tin", kicker: "03 · Aile boyu", title: "Mat Teneke", copy: "3 ve 5 litrelik mutfak boyları.", image: { src: "/products/illustrations/tin-5l.webp", alt: "5 litrelik mat zeytin yeşili teneke — temsili çizim", w: 1200, h: 1200 }, illustration: true },
  { href: "/magaza?kategori=pantry", kicker: "04 · Kiler", title: "Ataeymir Lezzetleri", copy: "Zeytin, zeytin ezmesi ve zeytinyağlı sabun.", image: { src: "/products/illustrations/green-olive.webp", alt: "Cam kavanozda kırma yeşil zeytin — temsili çizim", w: 1200, h: 1200 }, illustration: true },
];

const process = [
  ["01", "Mevsim", "Meyvenin rengi, sertliği ve aromatik gelişimi parsel bazında izlenir."],
  ["02", "Elle toplama", "Zeytinler mevsiminde, zedelenmeyi azaltan yöntemlerle toplanır."],
  ["03", "Sıkım", "Düşük sıcaklık ve kontrollü oksijen temasıyla soğuk sıkım yapılır."],
  ["04", "Şişeleme", "Her şişe hasat tarihi, parsel ve analiz bilgisiyle bir lota bağlanır."],
] as const;

export default function Home() {
  const journal = publishedPosts.slice(0, 3);
  return (
    <div className="brand-site landing-site home-editorial">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(organizationJsonLd())} />
      <BrandHeader />
      <main id="main">
        {/* 1 · Hero */}
        <section className="landing-hero" aria-labelledby="hero-title">
          <CinematicMedia slot={media.hero} priority />
          <div />
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
          <ArrowDown className="landing-scroll" size={18} aria-hidden="true" />
        </section>

        {/* 2 · Brand story */}
        <section className="home-story" aria-labelledby="story-title">
          <Reveal className="home-story-lead">
            <p className="eyebrow">Marka hikâyesi</p>
            <h2 id="story-title">Bir aile bahçesinden, <em>kökeni görünür</em> bir markaya.</h2>
          </Reveal>
          <Reveal className="home-story-body">
            <svg className="home-arch" viewBox="0 0 240 200" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M20 196V92a100 100 0 0 1 200 0v104" /><path d="M48 196V96a72 72 0 0 1 144 0v100" />
              <path d="M8 196h224M20 92h200" /><path d="M70 92v104M170 92v104" />
            </svg>
            <p>Altın Dal, Aydın’ın Karacasu ilçesine bağlı Ataeymir’deki aile zeytinliğinden doğdu. Bahçe, Aphrodisias antik kentiyle aynı vadiyi paylaşır.</p>
            <p>Antik kentin zanaat ve ölçü fikrini bir dekor olarak değil, üretim yaklaşımı olarak yorumluyoruz: az mesafe, açık köken ve her şişede izlenebilir bir lot.</p>
            <dl className="home-facts">
              <div><dt>Köken</dt><dd>Ataeymir · Karacasu</dd></div>
              <div><dt>Coğrafya</dt><dd>Aphrodisias vadisi</dd></div>
              <div><dt>Yaklaşım</dt><dd>Tek köken · lot takibi</dd></div>
            </dl>
            <Link className="text-link" href="/hikayemiz">Hikâyemizi okuyun <ArrowRight size={16} aria-hidden="true" /></Link>
          </Reveal>
        </section>

        {/* 3 · Collections */}
        <section className="home-collections" aria-labelledby="collections-title">
          <header className="home-section-head">
            <p className="eyebrow">Koleksiyonlar</p>
            <h2 id="collections-title">Tek toprak, <em>dört ifade.</em></h2>
            <Link className="text-link" href="/magaza">Tüm ürünler <ArrowRight size={16} aria-hidden="true" /></Link>
          </header>
          <div className="collection-tiles">
            {collections.map((item) => (
              <Link key={item.href} href={item.href} className={`collection-tile${item.illustration ? " is-illustration" : ""}`}>
                <span className="collection-tile-media">
                  <Image src={item.image.src} alt={item.image.alt} width={item.image.w} height={item.image.h} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" />
                  {item.illustration && <i className="illustration-badge">Temsili çizim</i>}
                </span>
                <small>{item.kicker}</small>
                <b>{item.title}</b>
                <span>{item.copy}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* 4 · The grove */}
        <section className="home-grove" aria-labelledby="grove-title">
          <header className="home-section-head">
            <p className="eyebrow">Zeytinlik</p>
            <h2 id="grove-title">Üç parsel, <em>üç karakter.</em></h2>
            <p className="home-section-lead">Aynı bahçede bile yamaç, rüzgâr ve toprak meyveyi farklı olgunlaştırır. Hasat kararları bu yüzden parsel parsel verilir.</p>
          </header>
          <ol className="grove-parcels">
            {groveZones.map((zone, index) => (
              <li key={zone.id}>
                <span className="parcel-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{zone.name}</h3>
                <p>{zone.aspect}</p>
                <small>{zone.character}</small>
              </li>
            ))}
          </ol>
          <Link className="cta cta-ghost" href="/deneyim">Toprağı yürüyün <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>

        {/* 5 · Production */}
        <section className="home-process" aria-labelledby="process-title">
          <header className="home-section-head">
            <p className="eyebrow">Üretim</p>
            <h2 id="process-title">Meyveden şişeye, <em>aynı özenle.</em></h2>
          </header>
          <ol className="process-steps">
            {process.map(([number, title, copy]) => (
              <li key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></li>
            ))}
          </ol>
          <div className="home-process-links">
            <Link className="text-link" href="/hasat">Hasat yaklaşımımız <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link className="text-link" href="/traceability/26-004">Örnek lot kaydı <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </section>

        {/* 6 · Olive Club */}
        <section className="home-club" aria-labelledby="club-title">
          <div className="home-club-media">
            <Image src="/products/illustrations/olive-club.webp" alt="İki adet 500 ml şişe içeren Olive Club üyelik kutusu — temsili çizim" width={1200} height={1200} sizes="(max-width: 900px) 100vw, 45vw" />
            <i className="illustration-badge">Temsili çizim</i>
          </div>
          <div className="home-club-copy">
            <p className="eyebrow">Olive Club</p>
            <h2 id="club-title">Hasada <em>daha yakın</em> olun.</h2>
            <p>Düzenli gönderimler, üyelere özel hasat notları ve sahiplenebileceğiniz bir zeytin ağacı üzerine çalışıyoruz.</p>
            <p className="home-club-status"><b>Durum:</b> Üyelik programı hazırlık aşamasında; henüz başvuru alınmıyor ve ödeme yapılmıyor.</p>
            <Link className="cta cta-primary" href="/olive-club">Programı inceleyin <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </section>

        {/* 7 · Journal */}
        <section className="home-journal" aria-labelledby="journal-title">
          <header className="home-section-head">
            <p className="eyebrow">Altın Dal Günlüğü</p>
            <h2 id="journal-title">Bahçeden ve <em>Ege sofrasından.</em></h2>
            <Link className="text-link" href="/gunluk">Tüm yazılar <ArrowRight size={16} aria-hidden="true" /></Link>
          </header>
          <div className="home-journal-grid">{journal.map((post) => <JournalCard key={post.slug} post={post} />)}</div>
        </section>

        <section className="home-closing" aria-labelledby="closing-title">
          <p className="eyebrow">Altın Dal · Aphrodisias Estate</p>
          <h2 id="closing-title">Bu topraktan. <em>Sofranıza.</em></h2>
          <Link className="cta cta-primary" href="/koleksiyon">Koleksiyonu keşfedin <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
      </main>
      <BrandFooter />
    </div>
  );
}
