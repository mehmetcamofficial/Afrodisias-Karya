"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./editorial-pages.css";

export type StoryChapter = { id: string; eyebrow: string; title: string; text: string; image: string; alt: string; link?: { href: string; label: string } };

/**
 * Scrollytelling without scroll hijacking: chapters scroll normally; a sticky media panel crossfades to the
 * chapter that is in the reading zone. On narrow screens each chapter shows its own image inline.
 */
export function StoryScroller({ chapters }: { chapters: StoryChapter[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLElement | null>>([]);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
    }, { rootMargin: "-45% 0px -45% 0px" });
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return (
    <section className="story-scroller" id="hikaye" aria-label="Altın Dal'ın hikâyesi">
      <div className="story-scroller-media" aria-hidden="true">
        {chapters.map((c, i) => (
          <Image key={c.id} className={i === active ? "is-active" : ""} src={c.image} alt="" fill sizes="(max-width: 900px) 0px, 50vw" />
        ))}
        <ol>{chapters.map((c, i) => <li key={c.id} className={i === active ? "is-active" : ""}>{String(i + 1).padStart(2, "0")}</li>)}</ol>
      </div>
      <div className="story-scroller-copy">
        {chapters.map((c, i) => (
          <article key={c.id} ref={(el) => { refs.current[i] = el; }} data-index={i} className={i === active ? "is-active" : ""} aria-labelledby={`story-${c.id}`}>
            <figure className="story-inline-media"><Image src={c.image} alt={c.alt} fill sizes="(max-width: 900px) 100vw, 1px" /></figure>
            <span className="story-number">{String(i + 1).padStart(2, "0")}</span>
            <p className="story-eyebrow">{c.eyebrow}</p>
            <h2 id={`story-${c.id}`}>{c.title}</h2>
            <p>{c.text}</p>
            {c.link && <Link className="story-link" href={c.link.href}>{c.link.label} <ArrowRight size={16} aria-hidden="true" /></Link>}
          </article>
        ))}
      </div>
    </section>
  );
}

export type JourneyStep = { id: string; label: string; title: string; text: string; image: string; alt: string; href: string; cta: string };

/** "Zeytinlikten sofraya": a keyboard-operable tablist (arrow keys) whose panel crossfades image and copy. */
export function GroveJourney({ steps, heading, eyebrow = "ZEYTİNLİKTEN SOFRAYA", label = "Yolculuğun aşamaları" }: { steps: JourneyStep[]; heading: string; eyebrow?: string; label?: string }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKey = (event: React.KeyboardEvent) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    const next = event.key === "Home" ? 0 : event.key === "End" ? steps.length - 1 : delta ? (active + delta + steps.length) % steps.length : -1;
    if (next < 0) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };
  const step = steps[active];
  return (
    <section className="grove-journey" aria-labelledby="journey-title">
      <header><p className="story-eyebrow">{eyebrow}</p><h2 id="journey-title">{heading}</h2></header>
      <div className="grove-journey-rail" role="tablist" aria-label={label} onKeyDown={onKey} style={{ "--n": steps.length } as React.CSSProperties}>
        {steps.map((s, i) => (
          <button key={s.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`journey-tab-${s.id}`} aria-selected={i === active} aria-controls="journey-panel"
            tabIndex={i === active ? 0 : -1} className={i === active ? "is-active" : i < active ? "is-done" : ""} onClick={() => setActive(i)}>
            <i aria-hidden="true" /><span>{String(i + 1).padStart(2, "0")}</span>{s.label}
          </button>
        ))}
      </div>
      <div className="grove-journey-panel" role="tabpanel" id="journey-panel" aria-labelledby={`journey-tab-${step.id}`}>
        <figure>{steps.map((s, i) => <Image key={s.id} className={i === active ? "is-active" : ""} src={s.image} alt={i === active ? s.alt : ""} aria-hidden={i === active ? undefined : true} fill sizes="(max-width: 800px) 100vw, 50vw" />)}</figure>
        <div key={step.id} className="grove-journey-copy">
          <h3>{step.title}</h3>
          <p>{step.text}</p>
          <Link href={step.href}>{step.cta} <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}
