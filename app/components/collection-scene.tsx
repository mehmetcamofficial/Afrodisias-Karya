"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import "./collection-scene.css";

export type SceneProductId = "bottle" | "tin" | "giftbox";
export type SceneProduct = {
  id: SceneProductId;
  label: string;
  title: string;
  line: string;
  formats: string[];
  href: string;
  linkLabel: string;
  note: string;
  inspect: string;
  image: { src: string; width: number; height: number; alt: string };
};

/**
 * Camera keyframes in scene units (1u ≈ 1px on a 1440×900 desktop / 600×900
 * mobile reference). The world is moved inversely: x/y pan, z dolly (toward the
 * viewer), ry a small yaw. Products are flat cut-outs, so yaw stays within a few
 * degrees; depth comes from real perspective between layers, not from fake 3D.
 */
type Cam = { x: number; y: number; z: number; ry: number };
const CAMERAS: Record<"wide" | "narrow", Cam[]> = {
  wide: [
    { x: 40, y: -40, z: -120, ry: 0 },   // overview
    { x: 100, y: -150, z: 380, ry: -3 }, // bottle
    { x: -190, y: -60, z: 460, ry: 4 },  // tin
    { x: 665, y: -110, z: 500, ry: 3 },  // gift box (framed left; copy moves right)
  ],
  narrow: [
    { x: 10, y: 60, z: -260, ry: 0 },
    { x: 40, y: 25, z: 380, ry: -2 },
    { x: -150, y: 164, z: 420, ry: 3 },
    { x: 190, y: 142, z: 520, ry: -3 },
  ],
};
/** Scroll progress ranges in which each beat holds still; between them the camera travels. */
const HOLDS: Array<[number, number]> = [[0, 0.1], [0.27, 0.41], [0.58, 0.72], [0.89, 1]];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: Cam, b: Cam, t: number): Cam => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, ry: a.ry + (b.ry - a.ry) * t });

function cameraAt(p: number, cams: Cam[]): Cam {
  for (let i = 0; i < HOLDS.length; i += 1) {
    const [from, to] = HOLDS[i];
    if (p <= to) return p >= from || i === 0 ? cams[i] : mix(cams[i - 1], cams[i], ease((p - HOLDS[i - 1][1]) / (from - HOLDS[i - 1][1])));
  }
  return cams[cams.length - 1];
}
function beatAt(p: number) {
  for (let i = 1; i < HOLDS.length; i += 1) if (p < (HOLDS[i - 1][1] + HOLDS[i][0]) / 2) return i - 1;
  return HOLDS.length - 1;
}

type Mode = "static" | "scroll";

/**
 * /koleksiyon opening: the bottle, the tin and the gift box in one lit
 * travertine set. Scrolling moves a camera through the set (sticky stage);
 * every product is a button that brings the camera to it. Reduced motion and
 * no-JS get the same set without scroll-driven movement.
 */
export function CollectionScene({ products, children }: { products: SceneProduct[]; children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const unitRef = useRef<HTMLSpanElement>(null);
  const [mode, setMode] = useState<Mode>("static");
  const [beat, setBeat] = useState(0);
  const layout = useRef<"wide" | "narrow">("wide");
  const unit = useRef(1);

  const place = useCallback((cam: Cam) => {
    const world = worldRef.current;
    if (!world) return;
    const u = unit.current;
    world.style.transform = `translate3d(${(-cam.x * u).toFixed(2)}px, ${(-cam.y * u).toFixed(2)}px, ${(cam.z * u).toFixed(2)}px) rotateY(${cam.ry.toFixed(3)}deg)`;
  }, []);

  const measure = useCallback(() => {
    layout.current = window.matchMedia("(max-width: 700px)").matches ? "narrow" : "wide";
    unit.current = (unitRef.current?.offsetWidth ?? 1000) / 1000;
  }, []);

  // Motion is opt-in on the client: reduced-motion visitors (and no-JS) keep the static set.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setMode(reduced.matches ? "static" : "scroll");
    decide();
    reduced.addEventListener("change", decide);
    return () => reduced.removeEventListener("change", decide);
  }, []);

  // Static mode: the camera jumps to the chosen beat.
  useEffect(() => {
    if (mode !== "static") return;
    measure();
    place(CAMERAS[layout.current][beat]);
    const onResize = () => { measure(); place(CAMERAS[layout.current][beat]); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mode, beat, measure, place]);

  // Scroll mode: one rAF per scroll/resize while the set is on screen; React only re-renders on beat change.
  useEffect(() => {
    if (mode !== "scroll") return;
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 0;
      place(cameraAt(p, CAMERAS[layout.current]));
      const next = beatAt(p);
      setBeat((current) => (current === next ? current : next));
    };
    const schedule = () => { if (visible && !frame) frame = requestAnimationFrame(update); };
    const onResize = () => { measure(); schedule(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); });
    measure();
    visible = true;
    update();
    observer.observe(track);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
    };
  }, [mode, measure, place]);

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (mode !== "scroll" || !track) { setBeat(index); return; }
    const [from, to] = HOLDS[index];
    const span = track.offsetHeight - window.innerHeight;
    const top = track.getBoundingClientRect().top + window.scrollY + span * ((from + to) / 2);
    window.scrollTo({ top, behavior: "smooth" });
  }, [mode]);

  const active = beat === 0 ? null : products[beat - 1];
  const steps = ["Koleksiyon", ...products.map((p) => p.label)];
  return (
    <section className={`cscene is-${mode}`} data-beat={beat} aria-label="Koleksiyon sahnesi">
      <div className="cscene-track" ref={trackRef}>
        <div className="cscene-stage">
          <span className="cscene-unit" ref={unitRef} aria-hidden="true" />
          <div className="cscene-set">
            <div className="cscene-world" ref={worldRef}>
              <div className="cscene-wall" aria-hidden="true"><i /></div>
              <div className="cscene-floor" aria-hidden="true" />
              {products.map((product, index) => (
                <div key={product.id} className={`cscene-station cscene-${product.id}${beat === index + 1 ? " is-focus" : ""}`}>
                  <div className="cscene-plinth" aria-hidden="true">
                    <div className="cscene-plinth-top"><i /></div>
                    <div className="cscene-plinth-front" />
                    <div className="cscene-plinth-left" />
                    <div className="cscene-plinth-right" />
                  </div>
                  <button type="button" className="cscene-product" onClick={() => goTo(index + 1)} aria-label={product.inspect} aria-pressed={beat === index + 1}>
                    <Image src={product.image.src} alt={product.image.alt} width={product.image.width} height={product.image.height}
                      sizes="(max-width: 700px) 50vw, 30vw" priority draggable={false} />
                    <span className="cscene-hit" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="cscene-light" aria-hidden="true" />

          <div className="cscene-copy">
            <div className={`cscene-intro${beat === 0 ? " is-shown" : ""}`} aria-hidden={beat !== 0}>
              {children}
              <p className="cscene-hint"><ArrowDown size={14} aria-hidden="true" /> Kaydırın ya da bir ürüne dokunun</p>
            </div>
            {active && (
              <article className="cscene-detail is-shown" key={active.id} aria-labelledby={`cscene-${active.id}-title`}>
                <p className="cscene-kicker">{String(beat).padStart(2, "0")} · {active.label}</p>
                <h2 id={`cscene-${active.id}-title`}>{active.title}</h2>
                <p className="cscene-line">{active.line}</p>
                <ul aria-label="Formatlar">{active.formats.map((format) => <li key={format}>{format}</li>)}</ul>
                <Link className="cscene-cta" href={active.href}>{active.linkLabel} <ArrowRight size={16} aria-hidden="true" /></Link>
                <p className="cscene-note">{active.note}</p>
              </article>
            )}
          </div>

          <nav className="cscene-nav" aria-label="Sahne bölümleri">
            <ol>
              {steps.map((label, index) => (
                <li key={label} className={index === beat ? "is-active" : ""}>
                  <button type="button" onClick={() => goTo(index)} aria-current={index === beat ? "step" : undefined}>
                    <span aria-hidden="true">{String(index).padStart(2, "0")}</span> {label}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
    </section>
  );
}
