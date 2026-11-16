"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type FilmstripStage = { id: string; label: string; title: string; text: string; image: string; alt: string; href: string };

/**
 * "Topraktan sofraya": a native horizontal scroll-snap rail — touch swipes, trackpads and the
 * keyboard (buttons, or Tab into a stage) all work; the page's vertical scroll is never captured.
 */
export function HomeFilmstrip({ stages }: { stages: FilmstripStage[] }) {
  const rail = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
    }, { root: el, threshold: 0.6 });
    el.querySelectorAll("li").forEach((li) => io.observe(li));
    return () => io.disconnect();
  }, []);
  const go = useCallback((delta: number) => {
    const el = rail.current;
    if (!el) return;
    const next = Math.min(stages.length - 1, Math.max(0, active + delta));
    const item = el.querySelectorAll("li")[next] as HTMLElement | undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (item) el.scrollTo({ left: item.offsetLeft - el.offsetLeft, behavior: reduced ? "auto" : "smooth" });
  }, [active, stages.length]);
  return (
    <div className="home-filmstrip">
      <div className="home-filmstrip-controls">
        <p aria-live="polite"><b>{String(active + 1).padStart(2, "0")}</b> / {String(stages.length).padStart(2, "0")} · {stages[active].label}</p>
        <button type="button" onClick={() => go(-1)} disabled={active === 0} aria-label="Önceki aşama"><ArrowLeft size={18} aria-hidden="true" /></button>
        <button type="button" onClick={() => go(1)} disabled={active === stages.length - 1} aria-label="Sonraki aşama"><ArrowRight size={18} aria-hidden="true" /></button>
      </div>
      <ol ref={rail} className="home-filmstrip-rail" aria-label="Topraktan sofraya aşamalar">
        {stages.map((s, i) => (
          <li key={s.id} data-index={i} className={i === active ? "is-active" : ""}>
            <Link href={s.href}>
              <span className="home-filmstrip-media"><Image src={s.image} alt={s.alt} fill sizes="(max-width: 700px) 82vw, 34vw" /></span>
              <span className="home-filmstrip-num">{String(i + 1).padStart(2, "0")} · {s.label}</span>
              <b>{s.title}</b>
              <span className="home-filmstrip-text">{s.text}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
