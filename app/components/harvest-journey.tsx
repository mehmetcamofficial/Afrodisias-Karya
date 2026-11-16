"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./editorial-pages.css";

/**
 * Background loop for the Hasat hero: muted, pauses off-screen and in hidden tabs; the poster stays for
 * reduced motion, Save-Data/2G and load errors. Native playback only — no scrubbing.
 */
export function HarvestLoop({ webm, mp4, poster, alt }: { webm: string; mp4: string; poster: string; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [motion, setMotion] = useState(false);
  const [playing, setPlaying] = useState(false);
  // Decide on the client (and again if the motion preference changes) whether the loop may play.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const decide = () => setMotion(!reduced.matches && !c?.saveData && !/(^|-)2g$/.test(c?.effectiveType ?? ""));
    decide();
    reduced.addEventListener("change", decide);
    return () => reduced.removeEventListener("change", decide);
  }, []);
  useEffect(() => {
    const video = ref.current;
    if (!motion || !video) return;
    const sync = (visible: boolean) => { if (visible && !document.hidden) void video.play().catch(() => undefined); else video.pause(); };
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(visible); });
    const onVis = () => sync(visible);
    io.observe(video);
    document.addEventListener("visibilitychange", onVis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [motion]);
  return (
    <div className={`harvest-loop${playing ? " is-playing" : ""}`}>
      <Image src={poster} alt={alt} fill priority sizes="100vw" />
      {motion && (
        <video ref={ref} muted loop playsInline autoPlay preload="metadata" poster={poster} aria-hidden="true" tabIndex={-1}
          onPlaying={() => setPlaying(true)} onError={() => setMotion(false)}>
          <source src={webm} type="video/webm" />
          <source src={mp4} type="video/mp4" onError={() => setMotion(false)} />
        </video>
      )}
    </div>
  );
}

export type HarvestStage = { id: string; label: string; title: string; text: string; image: string; alt: string; links?: Array<{ href: string; label: string }> };

/** Six-stage editorial timeline; the rail follows reading position and jumps to a stage on click. */
export function HarvestTimeline({ stages }: { stages: HarvestStage[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLElement | null>>([]);
  useEffect(() => {
    // The active stage is the last one whose top has passed the reading line. The line sits just below
    // the stages' scroll-margin-top (110px), capped at 35% of the viewport: a rail jump lands the target
    // stage's top at 110px, and a following SHORT stage can never already be above the line (at 45% of a
    // 900px viewport it could — the rail then highlighted the next stage).
    const pick = () => {
      const line = Math.min(window.innerHeight * 0.35, 180);
      let current = 0;
      refs.current.forEach((el, i) => { if (el && el.getBoundingClientRect().top <= line) current = i; });
      setActive(current);
    };
    // Recomputed on every (rAF-coalesced) scroll and on hash jumps, so the result always reflects the
    // FINAL scroll position. A thin IntersectionObserver band could miss the resting position after a
    // fast anchor jump under load and leave aria-current on the previous stage.
    let frame = 0;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(pick); };
    pick();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
    };
  }, []);
  return (
    <section className="harvest-timeline" aria-labelledby="harvest-timeline-title">
      <header className="harvest-timeline-head">
        <p className="story-eyebrow">ALTI AŞAMADA HASAT</p>
        <h2 id="harvest-timeline-title">Ağaçtan sofraya<br /><em>bir yolculuk.</em></h2>
      </header>
      <div className="harvest-timeline-body">
        <nav className="harvest-rail" aria-label="Hasat aşamaları">
          <ol>
            {stages.map((s, i) => (
              <li key={s.id} className={i === active ? "is-active" : i < active ? "is-done" : ""}>
                <a href={`#asama-${i + 1}`} aria-current={i === active ? "step" : undefined}><span>{String(i + 1).padStart(2, "0")}</span>{s.label}</a>
              </li>
            ))}
          </ol>
          <i className="harvest-rail-progress" style={{ "--progress": (active + 1) / stages.length } as React.CSSProperties} aria-hidden="true" />
        </nav>
        <div className="harvest-stages">
          {stages.map((s, i) => (
            <article key={s.id} id={`asama-${i + 1}`} ref={(el) => { refs.current[i] = el; }} data-index={i} className={i === active ? "is-active" : ""} aria-labelledby={`stage-${s.id}`}>
              <figure><Image src={s.image} alt={s.alt} fill sizes="(max-width: 900px) 100vw, 55vw" /></figure>
              <div>
                <span className="harvest-stage-number">{String(i + 1).padStart(2, "0")} · {s.label}</span>
                <h3 id={`stage-${s.id}`}>{s.title}</h3>
                <p>{s.text}</p>
                {s.links && <p className="harvest-stage-links">{s.links.map((l) => <Link key={l.href} href={l.href}>{l.label} <ArrowRight size={15} aria-hidden="true" /></Link>)}</p>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
