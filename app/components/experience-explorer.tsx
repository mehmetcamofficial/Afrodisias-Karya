"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Leaf, MapPinned, UtensilsCrossed } from "lucide-react";
import { useState } from "react";

/** Self-guided editorial itinerary, not an actual tour/booking or a claim of access to private land. */
const chapters = [
  {
    id: "tarih", label: "Kültürel miras", icon: MapPinned, number: "01",
    title: "Aphrodisias'ı keşfet", lead: "Antik kentin zanaat ve mermer mirasını tanı.",
    body: "Aphrodisias'ın geçmişine kültürel bir pencereden bakın. Ziyaret planlamadan önce resmî müze ve ören yeri duyurularını, çalışma saatlerini ve giriş koşullarını kontrol edin.",
    actions: [{ title: "Aphrodisias yazıları", href: "/gunluk/aphrodisias" }, { title: "Markanın hikâyesi", href: "/hikayemiz" }],
  },
  {
    id: "hasat", label: "Zeytinlik ve hasat", icon: Leaf, number: "02",
    title: "Toprağın ritmini izle", lead: "Meyvenin bahçeden şişeye uzanan yolunu öğren.",
    body: "Hasat zamanlaması, zeytinin taşınması ve soğuk sıkım hakkında hazırladığımız rehberi keşfedin. Buradaki görüntüler sinematik canlandırma olabilir; özel zeytinliğe ziyaret henüz sunulmuyor.",
    actions: [{ title: "Hasat sürecini incele", href: "/hasat" }, { title: "Hasat günlüğü", href: "/gunluk/hasat" }],
  },
  {
    id: "tadim", label: "Tadım ve Ege sofrası", icon: UtensilsCrossed, number: "03",
    title: "Sofraya yaklaş", lead: "Aromaları, yemek eşleşmelerini ve Ege tariflerini keşfet.",
    body: "Kendi evinizde uygulayabileceğiniz sade bir tadım deneyimi oluşturun. Ürün tadım etkinliği veya rezervasyon hizmeti henüz açık değil.",
    actions: [{ title: "Tarifleri keşfet", href: "/gunluk/tarifler" }, { title: "Koleksiyonu incele", href: "/koleksiyon" }],
  },
] as const;

export function ExperienceExplorer() {
  const [activeId, setActiveId] = useState<(typeof chapters)[number]["id"]>("tarih");
  const current = chapters.find((chapter) => chapter.id === activeId) ?? chapters[0];

  return <section className="experience-explorer" aria-labelledby="experience-explorer-heading">
    <header className="experience-explorer-intro">
      <p className="eyebrow">ETKİLEŞİMLİ KEŞİF</p>
      <h2 id="experience-explorer-heading">Kendi yolculuğunu <em>seç.</em></h2>
      <p>Üç bölümden birini seçerek ilgili hikâyelere ve rehberlere ulaş. Bu çevrimiçi keşif ücretsizdir; fiziksel ziyaret veya rezervasyon oluşturmaz.</p>
    </header>
    <div className="experience-explorer-layout">
      <div className="experience-explorer-tabs" role="group" aria-label="Deneyim bölümleri">
        {chapters.map((chapter) => {
          const Icon = chapter.icon;
          return <button type="button" key={chapter.id} className={activeId === chapter.id ? "is-selected" : ""}
            aria-pressed={activeId === chapter.id} onClick={() => setActiveId(chapter.id)}>
            <span>{chapter.number}</span><Icon size={23} aria-hidden="true"/><b>{chapter.label}</b><ArrowRight size={18} aria-hidden="true"/>
          </button>;
        })}
      </div>
      <article className="experience-explorer-panel" aria-live="polite">
        <span>APHRODISIAS ESTATE / {current.number}</span>
        <h3>{current.title}</h3>
        <p className="experience-explorer-lead">{current.lead}</p>
        <p>{current.body}</p>
        <div className="experience-explorer-actions">
          {current.actions.map((action) => <Link key={action.href} href={action.href}>{action.title}<ArrowRight size={17} aria-hidden="true"/></Link>)}
        </div>
      </article>
    </div>
    <footer className="experience-explorer-footer">
      <BookOpen size={20} aria-hidden="true"/>
      <p>Bilgi notu: Önerilen içerikler dijital bir keşif rotasıdır. Rehberli tur, aile bahçesi ziyareti ve tadım organizasyonu için henüz rezervasyon alınmıyor.</p>
    </footer>
  </section>;
}
