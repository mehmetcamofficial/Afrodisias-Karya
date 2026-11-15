"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { media } from "../../lib/media";
import "./immersive-film-journey.css";

const chapters = [
  { id: "land", eyebrow: "THE LAND", title: "Toprağın hafızası.", description: "Ataeymir'de, her hasadın ardında bir coğrafya var.", href: "/hikayemiz", action: "Hikâyemiz", src: "/video/altin-dal-film-01.mp4", poster: media.filmLand.poster },
  { id: "harvest", eyebrow: "THE HARVEST", title: "Emeğin zamanı.", description: "Daldan sofraya uzanan yolculuğun başlangıcı.", href: "/deneyim", action: "Hasadı keşfet", src: "/video/altin-dal-film-02.mp4", poster: media.filmHarvest.poster },
  { id: "gold", eyebrow: "LIQUID GOLD", title: "Sıvı altın.", description: "Bir damlada toprak, mevsim ve sabır.", href: "/koleksiyon", action: "Koleksiyonu keşfet", src: "/video/altin-dal-film-03.mp4", poster: media.filmGold.poster },
  { id: "product", eyebrow: "THE PRODUCT", title: "Bu topraktan. Sofranıza.", description: "Altın Dal — Aphrodisias Estate.", href: "/magaza", action: "Ürünleri incele", src: "/video/altin-dal-film-04.mp4", poster: media.filmProduct.poster },
] as const;

export function ImmersiveFilmJourney() {
  const root = useRef<HTMLElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = root.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const travel = Math.max(1, el.offsetHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, -rect.top / travel));
      setProgress((old) => Math.abs(old - p) > 0.0005 ? p : old);
      const segment = Math.min(3, Math.floor(p * 4));
      const within = p === 1 ? 1 : p * 4 - segment;
      const video = videos.current[segment];
      if (video && video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) {
        const time = Math.min(video.duration - 0.04, Math.max(0, within * video.duration));
        if (Math.abs(video.currentTime - time) > 0.08) video.currentTime = time;
      }
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    videos.current.forEach((video) => video?.addEventListener("loadedmetadata", schedule));
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      videos.current.forEach((video) => video?.removeEventListener("loadedmetadata", schedule));
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  const chapterIndex = Math.min(3, Math.floor(progress * 4));
  const localProgress = progress === 1 ? 1 : progress * 4 - chapterIndex;
  const nextIndex = Math.min(3, chapterIndex + 1);
  const blend = nextIndex !== chapterIndex ? Math.max(0, Math.min(1, (localProgress - 0.88) / 0.12)) : 0;

  return <section ref={root} className={`immersive-film-journey${reducedMotion ? " immersive-film-static" : ""}`} aria-label="Altın Dal sinematik marka yolculuğu">
    <div className="immersive-film-stage">
      {chapters.map((chapter, index) => <div key={chapter.id} className="immersive-film-layer" style={{ opacity: reducedMotion ? (index === 0 ? 1 : 0) : index === chapterIndex ? 1 - blend : index === nextIndex ? blend : 0 }} aria-hidden="true">
        {/* A poster remains visible if video decoding is unavailable. */}
        <div className="immersive-film-poster" style={{ backgroundImage: `url("${chapter.poster}")` }} />
        {!reducedMotion && <video ref={(node) => { videos.current[index] = node; }} src={chapter.src} preload="metadata" muted playsInline tabIndex={-1} aria-hidden="true" />}
      </div>)}
      <div className="immersive-film-shade" aria-hidden="true" />
      <div className="immersive-film-copy">
        {chapters.map((chapter, index) => <div key={chapter.id} className={`immersive-film-panel${index === chapterIndex || (reducedMotion && index === 0) ? " is-active" : ""}`} aria-hidden={reducedMotion ? index !== 0 : index !== chapterIndex}>
          <p className="immersive-film-kicker">{String(index + 1).padStart(2, "0")} / 04 · {chapter.eyebrow}</p>
          <h2>{chapter.title}</h2>
          <p>{chapter.description}</p>
          {(index === chapterIndex || (reducedMotion && index === 0)) && <Link href={chapter.href} className="immersive-film-link">{chapter.action} <span aria-hidden="true">↗</span></Link>}
        </div>)}
      </div>
      <div className="immersive-film-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
      <p className="immersive-film-scroll-hint" aria-hidden="true">KAYDIRARAK KEŞFET ↓</p>
    </div>
  </section>;
}
