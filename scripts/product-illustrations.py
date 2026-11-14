#!/usr/bin/env python3
"""Generate representative product packshot ILLUSTRATIONS (SVG).

These are drawings, not photographs. Every image carries an embedded
"TEMSİLİ ÇİZİM" notice so it cannot be mistaken for a verified packaging
photo even when separated from the page. Replace each with a real studio
photo when one exists (see docs/ASSET-REQUIREMENTS.md).

Usage: python3 scripts/product-illustrations.py <out_dir>
Then rasterise with scripts/render-illustrations.mjs.
"""
import math
import os
import sys

W, H = 1200, 1200
FLOOR = 930  # y of the plinth top

INK = "#1f2a1e"
GOLD = "#b49a60"
GOLD_SOFT = "#e3cf9f"
IVORY = "#f6f2e9"


def defs():
    return f"""<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f4efe5"/><stop offset=".62" stop-color="#e9e0d1"/><stop offset="1" stop-color="#d9ccb7"/>
  </linearGradient>
  <radialGradient id="light" cx=".28" cy=".18" r=".75">
    <stop offset="0" stop-color="#fffaf0" stop-opacity=".85"/><stop offset="1" stop-color="#fffaf0" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="plinth" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e2d7c4"/><stop offset=".08" stop-color="#d6c9b2"/><stop offset="1" stop-color="#c3b498"/>
  </linearGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#0f1a12"/><stop offset=".18" stop-color="#2b3d2a"/><stop offset=".32" stop-color="#162418"/>
    <stop offset=".78" stop-color="#0c150e"/><stop offset="1" stop-color="#1d2b1d"/>
  </linearGradient>
  <linearGradient id="tin" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#26331f"/><stop offset=".22" stop-color="#3f5034"/><stop offset=".42" stop-color="#33432b"/>
    <stop offset=".85" stop-color="#1f2a19"/><stop offset="1" stop-color="#2b3824"/>
  </linearGradient>
  <linearGradient id="tinTop" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4c5e40"/><stop offset="1" stop-color="#2c3a25"/>
  </linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#d9c08a"/><stop offset=".45" stop-color="#b49a60"/><stop offset="1" stop-color="#8a7240"/>
  </linearGradient>
  <linearGradient id="paper" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ebe3d3"/><stop offset=".3" stop-color="#f8f4ea"/><stop offset="1" stop-color="#e2d8c5"/>
  </linearGradient>
  <linearGradient id="jarGlass" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ffffff" stop-opacity=".35"/><stop offset=".15" stop-color="#ffffff" stop-opacity=".08"/>
    <stop offset=".85" stop-color="#ffffff" stop-opacity=".05"/><stop offset="1" stop-color="#ffffff" stop-opacity=".3"/>
  </linearGradient>
  <linearGradient id="kraft" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#e8dcc4"/><stop offset="1" stop-color="#cdbb98"/>
  </linearGradient>
  <linearGradient id="clubBox" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#23301f"/><stop offset=".5" stop-color="#34452d"/><stop offset="1" stop-color="#1f2a1b"/>
  </linearGradient>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="softer" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>"""


def scene(content, notice="TEMSİLİ ÇİZİM · GERÇEK ÜRÜN FOTOĞRAFI DEĞİLDİR"):
    veins = "".join(
        f'<path d="M0 {FLOOR + 40 + i * 52} C 300 {FLOOR + 25 + i * 52}, 700 {FLOOR + 70 + i * 52}, 1200 {FLOOR + 38 + i * 52}" '
        f'stroke="#b9a988" stroke-opacity=".28" stroke-width="2" fill="none"/>'
        for i in range(6)
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
{defs()}
<rect width="{W}" height="{H}" fill="url(#bg)"/>
<rect width="{W}" height="{H}" fill="url(#light)"/>
<rect y="{FLOOR}" width="{W}" height="{H - FLOOR}" fill="url(#plinth)"/>
<rect y="{FLOOR}" width="{W}" height="3" fill="#f3ead9" opacity=".8"/>
{veins}
{content}
<text x="600" y="{H - 62}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="22" letter-spacing="5" fill="#5b5040" opacity=".85">{notice}</text>
</svg>"""


def shadow(cx, w, depth=46, opacity=0.42):
    return f'<ellipse cx="{cx}" cy="{FLOOR + 6}" rx="{w / 2}" ry="{depth / 2}" fill="#3a3122" opacity="{opacity}" filter="url(#soft)"/>'


def text(x, y, s, size, fill=INK, weight="400", family="Georgia, 'Times New Roman', serif", spacing=0, anchor="middle", style=""):
    return (f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{family}" font-size="{size}" font-weight="{weight}" '
            f'letter-spacing="{spacing}" fill="{fill}" {style}>{s}</text>')


def sans(x, y, s, size, fill=INK, spacing=3, weight="600"):
    return text(x, y, s, size, fill, weight, "Helvetica, Arial, sans-serif", spacing)


def leaf(x, y, angle, length=70, fill="#5f7048"):
    return (f'<g transform="translate({x} {y}) rotate({angle})"><path d="M0 0 C {length * .35} -{length * .22}, {length * .75} -{length * .18}, {length} 0 '
            f'C {length * .75} {length * .18}, {length * .35} {length * .22}, 0 0Z" fill="{fill}"/>'
            f'<path d="M4 0 L {length - 6} 0" stroke="#3f4b2f" stroke-width="2" opacity=".6"/></g>')


def sprig(x, y, angle=0, n=5, scale=1.0):
    parts = [f'<g transform="translate({x} {y}) rotate({angle}) scale({scale})">',
             f'<path d="M0 0 C 60 -20, 140 -30, 230 -20" stroke="#4d5a38" stroke-width="5" fill="none"/>']
    for i in range(n):
        t = 30 + i * 42
        parts.append(leaf(t, -8 - i * 2, -35 - (i % 2) * 18, 74))
        parts.append(leaf(t + 16, -6 - i * 2, 28 + (i % 2) * 14, 66, "#6b7c52"))
    parts.append("</g>")
    return "".join(parts)


def olive(cx, cy, rx, ry, color, hi, angle=0):
    return (f'<g transform="rotate({angle} {cx} {cy})"><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{color}"/>'
            f'<ellipse cx="{cx - rx * .35}" cy="{cy - ry * .4}" rx="{rx * .32}" ry="{ry * .2}" fill="{hi}" opacity=".55"/></g>')


def layout(lines, top, cx):
    """Stack label lines without overlap. lines: (text, size, kind, color)."""
    out, y, prev = [], top, None
    for s, size, kind, color in lines:
        y += size * (0.95 if prev is None else 1.0) + (prev * 0.38 if prev else 0)
        out.append(text(cx, y, s, size, color) if kind == "serif" else sans(cx, y, s, size, color, 2.5))
        prev = size
    return "".join(out), y


# ---------------------------------------------------------------- bottles
def bottle(cx, base, w, h, label_lines, cap="#1a1a17", cap_band=GOLD, label_h_ratio=.34):
    """Dark glass bottle (front view). base = y of bottom."""
    top = base - h
    neck_w = w * .28
    shoulder = top + h * .30
    neck_top = top + h * .06
    body = (f'M{cx - w / 2} {base - 14} Q{cx - w / 2} {base} {cx - w / 2 + 14} {base} L{cx + w / 2 - 14} {base} '
            f'Q{cx + w / 2} {base} {cx + w / 2} {base - 14} L{cx + w / 2} {shoulder + w * .12} '
            f'C{cx + w / 2} {shoulder - w * .05} {cx + neck_w / 2} {shoulder - h * .06} {cx + neck_w / 2} {shoulder - h * .14} '
            f'L{cx + neck_w / 2} {neck_top} L{cx - neck_w / 2} {neck_top} L{cx - neck_w / 2} {shoulder - h * .14} '
            f'C{cx - neck_w / 2} {shoulder - h * .06} {cx - w / 2} {shoulder - w * .05} {cx - w / 2} {shoulder + w * .12} Z')
    lh = h * label_h_ratio
    ly = base - h * .12 - lh
    lw = w * .82
    out = [shadow(cx, w * 1.5),
           f'<path d="{body}" fill="url(#glass)"/>',
           f'<rect x="{cx - w * .36}" y="{shoulder + w * .1}" width="{w * .06}" height="{h * .5}" rx="{w * .03}" fill="#fff" opacity=".13"/>',
           f'<rect x="{cx - neck_w / 2 - 3}" y="{top}" width="{neck_w + 6}" height="{h * .085}" rx="6" fill="{cap}"/>',
           f'<rect x="{cx - neck_w / 2 - 3}" y="{top + h * .07}" width="{neck_w + 6}" height="{max(5, h * .012)}" fill="{cap_band}"/>',
           f'<rect x="{cx - lw / 2}" y="{ly}" width="{lw}" height="{lh}" rx="4" fill="url(#paper)"/>',
           f'<rect x="{cx - lw / 2 + 8}" y="{ly + 8}" width="{lw - 16}" height="{lh - 16}" rx="2" fill="none" stroke="{GOLD}" stroke-width="2"/>']
    lines = [(s, size, kind, INK if kind == "serif" else "#5c5442") for s, size, kind in label_lines]
    block_h = sum(size for _, size, _, _ in lines) * 1.38
    svg, _ = layout(lines, ly + (lh - block_h) / 2, cx)
    out.append(svg)
    return "".join(out)


# ---------------------------------------------------------------- tins
def tin(cx, base, w, h, depth, volume, handle_w):
    """Rectangular matte olive tin in 3/4 view."""
    top = base - h
    d = depth
    front = f'M{cx - w / 2} {top} L{cx + w / 2} {top} L{cx + w / 2} {base} L{cx - w / 2} {base} Z'
    side = f'M{cx + w / 2} {top} L{cx + w / 2 + d} {top - d * .55} L{cx + w / 2 + d} {base - d * .55} L{cx + w / 2} {base} Z'
    lid = f'M{cx - w / 2} {top} L{cx - w / 2 + d} {top - d * .55} L{cx + w / 2 + d} {top - d * .55} L{cx + w / 2} {top} Z'
    sx, sy = cx + w * .22 + d * .5, top - d * .3
    hx0, hx1 = cx - handle_w / 2 + d * .35, cx + handle_w / 2 + d * .35
    hy = top - d * .3
    lab_h = h * .46
    lab_y = top + h * .2
    out = [shadow(cx + d * .4, w * 1.45 + d, 60, .5),
           f'<path d="{side}" fill="#1b2416"/>',
           f'<path d="{front}" fill="url(#tin)"/>',
           f'<path d="{lid}" fill="url(#tinTop)"/>',
           # seams / rims
           f'<path d="M{cx - w / 2} {top + 10} L{cx + w / 2} {top + 10}" stroke="#56684a" stroke-width="3" opacity=".7"/>',
           f'<path d="M{cx - w / 2} {base - 10} L{cx + w / 2} {base - 10}" stroke="#141c11" stroke-width="3" opacity=".8"/>',
           f'<rect x="{cx - w / 2 + 18}" y="{top + 24}" width="10" height="{h - 48}" fill="#fff" opacity=".06"/>',
           # handle (folded wire)
           f'<path d="M{hx0} {hy} C{hx0} {hy - 70}, {hx1} {hy - 70}, {hx1} {hy}" stroke="#1d241a" stroke-width="10" fill="none" stroke-linecap="round"/>',
           f'<path d="M{hx0} {hy} C{hx0} {hy - 70}, {hx1} {hy - 70}, {hx1} {hy}" stroke="#56684a" stroke-width="3" fill="none" opacity=".6"/>',
           # spout cap
           f'<ellipse cx="{sx}" cy="{sy + 6}" rx="34" ry="14" fill="#141a10"/>',
           f'<rect x="{sx - 30}" y="{sy - 26}" width="60" height="32" fill="url(#gold)"/>',
           f'<ellipse cx="{sx}" cy="{sy - 26}" rx="30" ry="11" fill="{GOLD_SOFT}"/>',
           # gold band label
           f'<rect x="{cx - w / 2}" y="{lab_y}" width="{w}" height="{lab_h}" fill="#e9dfcb"/>',
           f'<rect x="{cx - w / 2}" y="{lab_y}" width="{w}" height="8" fill="url(#gold)"/>',
           f'<rect x="{cx - w / 2}" y="{lab_y + lab_h - 8}" width="{w}" height="8" fill="url(#gold)"/>',
           f'<path d="M{cx + w / 2} {lab_y} L{cx + w / 2 + d} {lab_y - d * .55} L{cx + w / 2 + d} {lab_y + lab_h - d * .55} L{cx + w / 2} {lab_y + lab_h} Z" fill="#b8ab90"/>']
    ly = lab_y + lab_h * .24
    out.append(sans(cx, ly, "ATAEYMİR · KARACASU", w * .045, "#6b5c3c", 4))
    out.append(text(cx, ly + lab_h * .22, "ALTIN DAL", w * .12, INK, spacing=6))
    out.append(sans(cx, ly + lab_h * .36, "NATÜREL SIZMA ZEYTİNYAĞI", w * .042, "#4f4a3c", 3))
    out.append(text(cx, ly + lab_h * .66, volume, w * .17, "#7a6331", style='font-style="italic"'))
    return "".join(out)


# ---------------------------------------------------------------- jars
def jar(cx, base, w, h, fill_svg, label_lines, lid=GOLD, label_fill="url(#paper)"):
    top = base - h
    lid_h = h * .14
    body_top = top + lid_h
    r = 26
    out = [shadow(cx, w * 1.35),
           f'<clipPath id="jc{int(cx)}{int(base)}"><rect x="{cx - w / 2}" y="{body_top}" width="{w}" height="{base - body_top}" rx="{r}"/></clipPath>',
           f'<rect x="{cx - w / 2}" y="{body_top}" width="{w}" height="{base - body_top}" rx="{r}" fill="#c9c1ac" opacity=".35"/>',
           f'<g clip-path="url(#jc{int(cx)}{int(base)})">{fill_svg}</g>',
           f'<rect x="{cx - w / 2}" y="{body_top}" width="{w}" height="{base - body_top}" rx="{r}" fill="url(#jarGlass)"/>',
           f'<rect x="{cx - w / 2}" y="{body_top}" width="{w}" height="{base - body_top}" rx="{r}" fill="none" stroke="#ffffff" stroke-opacity=".5" stroke-width="3"/>',
           f'<rect x="{cx - w * .43}" y="{body_top + 22}" width="{w * .05}" height="{(base - body_top) * .7}" rx="8" fill="#fff" opacity=".35"/>',
           # lid
           f'<rect x="{cx - w / 2 - 6}" y="{top}" width="{w + 12}" height="{lid_h}" rx="10" fill="{lid}"/>',
           "".join(f'<rect x="{cx - w / 2 + 6 + i * (w / 24)}" y="{top + 6}" width="3" height="{lid_h - 12}" fill="#000" opacity=".12"/>' for i in range(24)),
           f'<rect x="{cx - w / 2 - 6}" y="{top}" width="{w + 12}" height="8" rx="4" fill="#fff" opacity=".25"/>']
    lh = h * .40
    ly = base - h * .12 - lh
    lw = w * .86
    out.append(f'<rect x="{cx - lw / 2}" y="{ly}" width="{lw}" height="{lh}" rx="6" fill="{label_fill}"/>')
    out.append(f'<rect x="{cx - lw / 2 + 8}" y="{ly + 8}" width="{lw - 16}" height="{lh - 16}" rx="3" fill="none" stroke="{GOLD}" stroke-width="2"/>')
    block_h = sum(line[1] for line in label_lines) * 1.38
    svg, _ = layout(label_lines, ly + (lh - block_h) / 2, cx)
    out.append(svg)
    return "".join(out)


def olives_fill(cx, top, base, w, color, hi, brine, seed):
    import random
    rnd = random.Random(seed)
    parts = [f'<rect x="{cx - w / 2}" y="{top}" width="{w}" height="{base - top}" fill="{brine}"/>']
    y = base - 30
    while y > top + 10:
        x = cx - w / 2 + 20 + rnd.random() * 20
        while x < cx + w / 2 - 10:
            rx = 30 + rnd.random() * 8
            parts.append(olive(x, y, rx, rx * .78, color, hi, rnd.randint(-40, 40)))
            x += rx * 1.7
        y -= 46
    return "".join(parts)


# ================================================================ products
def aromatic_set():
    tray_y = FLOOR + 6
    content = [shadow(600, 900, 70, .45),
               # wooden tray
               f'<path d="M200 {tray_y - 90} L1000 {tray_y - 90} L1040 {tray_y - 20} L160 {tray_y - 20} Z" fill="#8f6b43"/>',
               f'<path d="M160 {tray_y - 20} L1040 {tray_y - 20} L1040 {tray_y + 14} L160 {tray_y + 14} Z" fill="#6f5233"/>',
               "".join(f'<path d="M{220 + i * 56} {tray_y - 86} L{196 + i * 59} {tray_y - 24}" stroke="#7a5b38" stroke-width="2" opacity=".5"/>' for i in range(14))]
    specs = [(350, "Limon", "#e8d27a"), (600, "Biberiye", "#8c9a6b"), (850, "Acı Biber", "#b5523a")]
    for cx, name, accent in specs:
        content.append(bottle(cx, tray_y - 55, 180, 560, [("100 ml", 20, "sans"), (name, 25, "serif"), ("ZEYTİNYAĞI", 14, "sans")],
                              cap="#1b1b18", cap_band=accent, label_h_ratio=.30))
    # garnish
    content.append(f'<g transform="translate(205 {FLOOR + 100})"><circle r="58" fill="#f1dc72"/><circle r="48" fill="#f7eaa4"/>'
                   + "".join(f'<path d="M0 0 L{48 * math.cos(a * math.pi / 4):.1f} {48 * math.sin(a * math.pi / 4):.1f}" stroke="#e6cf5e" stroke-width="4"/>' for a in range(8)) + "</g>")
    content.append(sprig(520, FLOOR + 120, 6, 4, .85))
    content.append(f'<path d="M930 {FLOOR + 90} C 980 {FLOOR + 70}, 1040 {FLOOR + 100}, 1060 {FLOOR + 150} C 1010 {FLOOR + 140}, 960 {FLOOR + 126}, 930 {FLOOR + 90}Z" fill="#b2402c"/>'
                   f'<path d="M930 {FLOOR + 90} l-22 -14" stroke="#4d5a38" stroke-width="7" stroke-linecap="round"/>')
    content.append(text(600, 150, "Tadım &amp; Aromatik Set", 64, INK))
    content.append(sans(600, 198, "3 × 100 ML · LİMON · BİBERİYE · ACI BİBER", 22, "#6b5c3c", 5))
    return scene("".join(content))


def tin_scene(volume, w, h, d, title):
    content = [tin(560, FLOOR + 10, w, h, d, volume, w * .62)]
    content.append(sprig(840, FLOOR + 60, -12, 4, .85))
    content.append(text(600, 150, title, 64, INK))
    content.append(sans(600, 198, f"MAT TENEKE · {volume} · NATÜREL SIZMA", 22, "#6b5c3c", 5))
    return scene("".join(content))


def tin_3l():
    return tin_scene("3 L", 400, 480, 110, "3 Litre Mat Teneke")


def tin_5l():
    return tin_scene("5 L", 480, 580, 140, "5 Litre Mat Teneke")


def olive_jar(kind):
    w, h, base, cx = 440, 600, FLOOR + 12, 600
    top = base - h + h * .14
    if kind == "green":
        fill = olives_fill(cx, top + 40, base, w, "#7d8a3c", "#c9d48a", "#b9b77a", 7)
        lines = [("ATAEYMİR", 17, "sans", "#5c5442"), ("Kırma Yeşil", 40, "serif", INK), ("Zeytin", 40, "serif", INK), ("SALAMURA · 500 g", 16, "sans", "#5c5442")]
        title, sub = "Ataeymir Kırma Yeşil Zeytin", "500 G · KÖY USULÜ SALAMURA"
        garnish = "".join(olive(x, FLOOR + 100, 32, 25, "#7d8a3c", "#c9d48a", a) for x, a in [(250, -20), (318, 15), (900, 30)])
    else:
        fill = olives_fill(cx, top + 40, base, w, "#2a1d24", "#6c5560", "#3b2f2c", 11)
        lines = [("ATAEYMİR", 17, "sans", "#d9c08a"), ("Siyah Sele", 40, "serif", IVORY), ("Zeytin", 40, "serif", IVORY), ("AZ TUZLU · 500 g", 16, "sans", "#d9c08a")]
        title, sub = "Siyah Sele Zeytin", "500 G · AZ TUZLU · DOĞAL SELE"
        garnish = "".join(olive(x, FLOOR + 100, 30, 24, "#2a1d24", "#6c5560", a) for x, a in [(260, -10), (325, 25), (905, -30)])
    label_fill = "url(#paper)" if kind == "green" else "#22261f"
    content = [jar(cx, base, w, h, fill, lines, label_fill=label_fill), garnish, sprig(760, FLOOR + 118, 0, 3, .7),
               text(600, 150, title, 60, INK), sans(600, 198, sub, 22, "#6b5c3c", 5)]
    return scene("".join(content))


def green_olive():
    return olive_jar("green")


def black_olive():
    return olive_jar("black")


def olive_paste():
    w, h, base, cx = 380, 420, FLOOR + 12, 560
    top = base - h + h * .14
    fill = (f'<rect x="{cx - w / 2}" y="{top + 30}" width="{w}" height="{base - top}" fill="#3a2f28"/>'
            + "".join(f'<circle cx="{cx - w / 2 + 25 + (i * 37) % w}" cy="{top + 50 + (i * 53) % (base - top - 60)}" r="{4 + i % 5}" fill="#5a4a3c" opacity=".7"/>' for i in range(40)))
    lines = [("ATAEYMİR", 15, "sans", "#5c5442"), ("Zeytin", 34, "serif", INK), ("Ezmesi", 34, "serif", INK), ("CAM KAVANOZ · 200 g", 13, "sans", "#5c5442")]
    content = [jar(cx, base, w, h, fill, lines, label_fill="url(#paper)"),
               # bread slice + spoon
               f'<path d="M790 {FLOOR + 110} C 780 {FLOOR + 30}, 840 {FLOOR - 10}, 900 {FLOOR + 10} C 960 {FLOOR - 10}, 1010 {FLOOR + 40}, 1000 {FLOOR + 110} Z" fill="#c99a5c"/>',
               f'<path d="M802 {FLOOR + 104} C 796 {FLOOR + 40}, 846 {FLOOR + 10}, 900 {FLOOR + 26} C 950 {FLOOR + 10}, 992 {FLOOR + 46}, 988 {FLOOR + 104} Z" fill="#ead2a4"/>',
               f'<path d="M820 {FLOOR + 78} C 860 {FLOOR + 56}, 940 {FLOOR + 60}, 972 {FLOOR + 84}" stroke="#3a2f28" stroke-width="22" stroke-linecap="round" fill="none"/>',
               f'<path d="M180 {FLOOR + 120} L 400 {FLOOR + 40}" stroke="#a37b4f" stroke-width="14" stroke-linecap="round"/>'
               f'<ellipse cx="420" cy="{FLOOR + 32}" rx="40" ry="22" fill="#a37b4f" transform="rotate(-20 420 {FLOOR + 32})"/>',
               text(600, 150, "Zeytin Ezmesi", 64, INK), sans(600, 198, "200 G CAM KAVANOZ · KAHVALTI &amp; MEZE", 22, "#6b5c3c", 5)]
    return scene("".join(content))


def soap_box():
    bx, by, bw, bh, d = 300, FLOOR - 230, 600, 230, 90
    content = [shadow(620, 860, 70, .45),
               # open box: back flap
               f'<path d="M{bx} {by} L{bx + d} {by - d * .55} L{bx + bw + d} {by - d * .55} L{bx + bw} {by} Z" fill="#b9a67f"/>',
               f'<path d="M{bx + d} {by - d * .55} L{bx + d + 40} {by - 360} L{bx + bw + d + 40} {by - 360} L{bx + bw + d} {by - d * .55} Z" fill="url(#kraft)"/>',
               text(bx + bw / 2 + d + 20, by - 230, "ALTIN DAL", 52, INK, spacing=8),
               sans(bx + bw / 2 + d + 20, by - 180, "EL YAPIMI ZEYTİNYAĞLI SABUN", 20, "#5c5442", 4),
               sans(bx + bw / 2 + d + 20, by - 146, "SOĞUK PROSES · 2'Lİ KUTU", 18, "#7a6331", 4),
               # bars
               ]
    for i, x in enumerate([bx + 70, bx + 330]):
        content.append(f'<rect x="{x}" y="{by - 120}" width="220" height="150" rx="24" fill="#d6d4b0"/>')
        content.append(f'<rect x="{x}" y="{by - 120}" width="220" height="30" rx="14" fill="#e6e4c4"/>')
        content.append(f'<rect x="{x + 40}" y="{by - 84}" width="140" height="80" rx="16" fill="none" stroke="#b2b08a" stroke-width="4"/>')
        content.append(text(x + 110, by - 30, "AD", 40, "#9d9b72", spacing=6))
    content += [
        # front + side of box
        f'<path d="M{bx + bw} {by} L{bx + bw + d} {by - d * .55} L{bx + bw + d} {by + bh - d * .55} L{bx + bw} {by + bh} Z" fill="#a8946c"/>',
        f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" fill="url(#kraft)"/>',
        f'<rect x="{bx}" y="{by + 60}" width="{bw}" height="80" fill="#2a3824"/>',
        sans(bx + bw / 2, by + 110, "OLIVE OIL SOAP · 2 BARS", 22, GOLD_SOFT, 6),
        sprig(160, FLOOR + 120, -8, 4, .85),
        text(600, 150, "El Yapımı Zeytinyağlı Sabun", 60, INK),
        sans(600, 198, "2'Lİ KUTU · SOĞUK PROSES", 22, "#6b5c3c", 5)]
    return scene("".join(content))


def olive_club():
    bx, by, bw, bh, d = 250, FLOOR - 260, 640, 260, 110
    content = [shadow(620, 920, 80, .5),
               f'<path d="M{bx} {by} L{bx + d} {by - d * .55} L{bx + bw + d} {by - d * .55} L{bx + bw} {by} Z" fill="#141c11"/>',
               bottle(bx + 230, by + 60, 160, 470, [("500 ml", 17, "sans"), ("ALTIN DAL", 15, "sans")], label_h_ratio=.22),
               bottle(bx + 450, by + 60, 160, 470, [("500 ml", 17, "sans"), ("ALTIN DAL", 15, "sans")], label_h_ratio=.22),
               f'<path d="M{bx + bw} {by} L{bx + bw + d} {by - d * .55} L{bx + bw + d} {by + bh - d * .55} L{bx + bw} {by + bh} Z" fill="#17200f"/>',
               f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" fill="url(#clubBox)"/>',
               f'<rect x="{bx}" y="{by + 26}" width="{bw}" height="6" fill="url(#gold)"/>',
               text(bx + bw / 2, by + 140, "OLIVE CLUB", 66, GOLD_SOFT, spacing=10),
               sans(bx + bw / 2, by + 190, "ALTIN DAL · APHRODISIAS ESTATE", 20, "#cbbd9a", 6),
               # member card
               f'<g transform="rotate(-8 990 {FLOOR + 70})"><rect x="890" y="{FLOOR + 10}" width="200" height="120" rx="8" fill="{IVORY}"/>'
               f'<rect x="902" y="{FLOOR + 22}" width="176" height="96" rx="4" fill="none" stroke="{GOLD}" stroke-width="2"/>'
               + sans(990, FLOOR + 62, "ÜYELİK", 18, "#7a6331", 5) + text(990, FLOOR + 98, "2 × 500 ml", 28, INK) + "</g>",
               text(600, 150, "Olive Club", 64, INK),
               sans(600, 198, "ÜYELİK GÖNDERİMİ · 2 × 500 ML", 22, "#6b5c3c", 5)]
    return scene("".join(content))


PRODUCTS = {
    "aromatic-set": aromatic_set,
    "tin-3l": tin_3l,
    "tin-5l": tin_5l,
    "green-olive": green_olive,
    "black-olive": black_olive,
    "olive-paste": olive_paste,
    "soap-box": soap_box,
    "olive-club": olive_club,
}

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "assets/product-illustrations"
    os.makedirs(out, exist_ok=True)
    for name, fn in PRODUCTS.items():
        with open(os.path.join(out, f"{name}.svg"), "w", encoding="utf-8") as fh:
            fh.write(fn())
        print("wrote", name)
