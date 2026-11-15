"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Leaf, MapPinned, UtensilsCrossed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./editorial-pages.css";

/** Self-guided editorial itinerary, not an actual tour/booking or a claim of access to private land. */
const chapters = [
  {
    id: "tarih", label: "Kültürel miras", icon: MapPinned, number: "01",
    image: "/pages/route-heritage.webp", alt: "Aphrodisias tetrapylonunun kemerleri — editoryal görsel",
    title: "Aphrodisias'ı keşfet", lead: "Antik kentin zanaat ve mermer mirasını tanı.",
    body: "Aphrodisias'ın geçmişine kültürel bir pencereden bakın. Ziyaret planlamadan önce resmî müze ve ören yeri duyurularını, çalışma saatlerini ve giriş koşullarını kontrol edin.",
    actions: [{ title: "Aphrodisias yazıları", href: "/gunluk/aphrodisias" }, { title: "Markanın hikâyesi", href: "/hikayemiz" }],
  },
  {
    id: "hasat", label: "Zeytinlik ve hasat", icon: Leaf, number: "02",
    image: "/pages/route-grove.webp", alt: "Gün doğumunda yaşlı zeytin ağaçları — sinematik canlandırma",
    title: "Toprağın ritmini izle", lead: "Meyvenin bahçeden şişeye uzanan yolunu öğren.",
    body: "Hasat zamanlaması, zeytinin taşınması ve soğuk sıkım hakkında hazırladığımız rehberi keşfedin. Buradaki görüntüler sinematik canlandırma olabilir; özel zeytinliğe ziyaret henüz sunulmuyor.",
    actions: [{ title: "Hasat sürecini incele", href: "/hasat" }, { title: "Hasat günlüğü", href: "/gunluk/hasat" }],
  },
  {
    id: "tadim", label: "Tadım ve Ege sofrası", icon: UtensilsCrossed, number: "03",
    image: "/pages/route-table.webp", alt: "Taş kâseye dökülen zeytinyağı — sinematik canlandırma",
    title: "Sofraya yaklaş", lead: "Aromaları, yemek eşleşmelerini ve Ege tariflerini keşfet.",
    body: "Kendi evinizde uygulayabileceğiniz sade bir tadım deneyimi oluşturun. Ürün tadım etkinliği veya rezervasyon hizmeti henüz açık değil.",
    actions: [{ title: "Tarifleri keşfet", href: "/gunluk/tarifler" }, { title: "Koleksiyonu incele", href: "/koleksiyon" }],
  },
] as const;

export function ExperienceExplorer() {
  const [activeId, setActiveId] = useState<(typeof chapters)[number]["id"]>("tarih");
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const index = Math.max(0, chapters.findIndex((chapter) => chapter.id === activeId));
  const current = chapters[index];
  // Deep links from the route panels (#rota-hasat …) open that route and bring the explorer into view.
  useEffect(() => {
    const open = () => {
      const id = window.location.hash.replace("#rota-", "");
      const match = chapters.find((chapter) => chapter.id === id);
      if (!match) return;
      setActiveId(match.id);
      document.getElementById("kesfet")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  // Roving tabindex: arrow keys move between routes, Home/End jump to the ends.
  const onKey = (event: React.KeyboardEvent) => {
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    const next = event.key === "Home" ? 0 : event.key === "End" ? chapters.length - 1 : step ? (index + step + chapters.length) % chapters.length : -1;
    if (next < 0) return;
    event.preventDefault();
    setActiveId(chapters[next].id);
    tabs.current[next]?.focus();
  };

  return <section className="experience-explorer" data-route={current.id} aria-labelledby="experience-explorer-heading">
    <header className="experience-explorer-intro">
      <p className="eyebrow">ETKİLEŞİMLİ KEŞİF</p>
      <h2 id="experience-explorer-heading">Kendi yolculuğunu <em>seç.</em></h2>
      <p>Üç rotadan birini seçerek ilgili hikâyelere ve rehberlere ulaş. Bu çevrimiçi keşif ücretsizdir; fiziksel ziyaret veya rezervasyon oluşturmaz.</p>
    </header>
    <div className="experience-explorer-layout">
      <div className="experience-explorer-tabs" role="tablist" aria-label="Deneyim rotaları" aria-orientation="vertical" onKeyDown={onKey}>
        {chapters.map((chapter, i) => {
          const Icon = chapter.icon;
          const selected = activeId === chapter.id;
          return <button type="button" role="tab" id={`rota-tab-${chapter.id}`} aria-controls="rota-panel" aria-selected={selected} tabIndex={selected ? 0 : -1}
            key={chapter.id} ref={(el) => { tabs.current[i] = el; }} className={selected ? "is-selected" : ""} onClick={() => setActiveId(chapter.id)}>
            <span>{chapter.number}</span><Icon size={23} aria-hidden="true"/><b>{chapter.label}</b><ArrowRight size={18} aria-hidden="true"/>
          </button>;
        })}
      </div>
      <article className="experience-explorer-panel" role="tabpanel" id="rota-panel" aria-labelledby={`rota-tab-${current.id}`}>
        <figure className="experience-explorer-media">
          {chapters.map((chapter) => <Image key={chapter.id} className={chapter.id === activeId ? "is-active" : ""} src={chapter.image}
            alt={chapter.id === activeId ? chapter.alt : ""} aria-hidden={chapter.id === activeId ? undefined : true} fill sizes="(max-width: 740px) 100vw, 60vw"/>)}
        </figure>
        <div className="experience-explorer-copy" key={current.id}>
          <span>APHRODISIAS ESTATE / {current.number}</span>
          <h3>{current.title}</h3>
          <p className="experience-explorer-lead">{current.lead}</p>
          <p>{current.body}</p>
          <div className="experience-explorer-actions">
            {current.actions.map((action) => <Link key={action.href} href={action.href}>{action.title}<ArrowRight size={17} aria-hidden="true"/></Link>)}
          </div>
        </div>
      </article>
    </div>
    <footer className="experience-explorer-footer">
      <BookOpen size={20} aria-hidden="true"/>
      <p>Bilgi notu: Önerilen içerikler dijital bir keşif rotasıdır. Rehberli tur, aile bahçesi ziyareti ve tadım organizasyonu için henüz rezervasyon alınmıyor. Hareketli ve sabit görüntülerin bir kısmı sinematik canlandırmadır.</p>
    </footer>
  </section>;
}
