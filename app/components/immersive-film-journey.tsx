import Link from "next/link";
import { CinematicMedia } from "./cinematic-media";
import { media } from "../../lib/media";
import "./immersive-film-journey.css";

/**
 * Four separate 10-second films. Video paths are registered centrally in
 * lib/media.ts; CinematicMedia keeps its poster when an asset is unavailable.
 * Each film only plays when visible and respects reduced-motion settings.
 */
const chapters = [
  { id: "land", number: "01", eyebrow: "THE LAND", title: "Toprağın hafızası.", description: "Ataeymir'de, her hasadın ardında bir coğrafya var.", href: "/hikayemiz", action: "Hikâyemiz", slot: media.filmLand },
  { id: "harvest", number: "02", eyebrow: "THE HARVEST", title: "Emeğin zamanı.", description: "Daldan sofraya uzanan yolculuğun başlangıcı.", href: "/deneyim", action: "Hasadı keşfet", slot: media.filmHarvest },
  { id: "gold", number: "03", eyebrow: "LIQUID GOLD", title: "Sıvı altın.", description: "Bir damlada toprak, mevsim ve sabır.", href: "/koleksiyon", action: "Koleksiyonu keşfet", slot: media.filmGold },
  { id: "product", number: "04", eyebrow: "THE PRODUCT", title: "Bu topraktan. Sofranıza.", description: "Altın Dal — Aphrodisias Estate.", href: "/magaza", action: "Ürünleri incele", slot: media.filmProduct },
] as const;

export function ImmersiveFilmJourney() {
  return <section className="immersive-film-journey" aria-label="Altın Dal sinematik marka yolculuğu">
    {chapters.map((chapter) => <article className="immersive-film-chapter" key={chapter.id} id={`film-${chapter.id}`}>
      <div className="immersive-film-sticky">
        <CinematicMedia slot={chapter.slot} playWhenVisible />
        <div className="immersive-film-shade" aria-hidden="true" />
        <div className="immersive-film-content">
          <p className="immersive-film-kicker">{chapter.number} / 04 · {chapter.eyebrow}</p>
          <h2>{chapter.title}</h2>
          <p>{chapter.description}</p>
          <Link href={chapter.href} className="immersive-film-link">{chapter.action} <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </article>)}
  </section>;
}
