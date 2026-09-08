// Modèle de sceau, placement des glyphes, rendu SVG et rastérisation (sans DOM).
//
// Coordonnées : le cercle du sceau a un rayon 1, centre (0,0), y vers le bas.
// Les angles sont en degrés, 0 = midi, sens horaire.

import { GLYPHS, placedStrokes } from './glyphs.js';

export function polar(angleDeg, dist) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: dist * Math.sin(a), y: -dist * Math.cos(a) };
}

export function angleOf(x, y) {
  // angle (0 = midi, horaire) du point (x, y)
  return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
}

// Rotation (deg, horaire) qui amène le haut du glyphe vers le centre du sceau.
export function inwardRotation(x, y) {
  const d = Math.hypot(x, y);
  if (d < 1e-6) return 0;
  return (Math.atan2(y, x) * 180) / Math.PI - 90;
}

export function resolveRotation(el) {
  if (typeof el.rot === 'number') return el.rot + (el.tilt || 0);
  const d = Math.hypot(el.x, el.y);
  const base = d < 0.12 ? 0 : inwardRotation(el.x, el.y);
  return base + (el.tilt || 0);
}

// Un signe tourné de 180° et un signe « inversé » ont la même géométrie ;
// on normalise : inversé ⇔ le haut du glyphe regarde vers l'extérieur.
// (Les glyphes à forme inversée propre — Expansion, Pluie — sont laissés tels quels.)
export function canonicalOrientation(el) {
  const g = GLYPHS[el.glyph];
  const rot = resolveRotation(el);
  const d = Math.hypot(el.x, el.y);
  if (g.kind !== 'sign' || g.invertedShape || d < 0.12 || typeof el.rot !== 'number') return { rot, inverted: !!el.inverted };
  const eff = rot + (el.inverted ? 180 : 0);
  if (g.dir === 'non' || g.dir === 'asymmetric') return { rot: eff, inverted: false };
  const diff = ((eff - inwardRotation(el.x, el.y)) % 360 + 540) % 360 - 180;
  if (Math.abs(diff) > 90) return { rot: eff - 180, inverted: true };
  return { rot: eff, inverted: false };
}

// ── Constructeurs ──
export function sigil(glyph, opts = {}) {
  return { glyph, x: opts.x ?? 0, y: opts.y ?? 0, size: opts.size ?? 0.5, rot: opts.rot ?? 0, inverted: !!opts.inverted, tilt: opts.tilt || 0 };
}

export function at(glyph, angle, dist, size, opts = {}) {
  const { x, y } = polar(angle, dist);
  const el = { glyph, x, y, size, inverted: !!opts.inverted, tilt: opts.tilt || 0 };
  if (typeof opts.rot === 'number') el.rot = opts.rot;
  return el;
}

export function ringOf(glyph, n, opts = {}) {
  const dist = opts.dist ?? 0.72, size = opts.size ?? 0.3, start = opts.start ?? 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    const angle = start + (360 * i) / n;
    const s = Array.isArray(opts.sizes) ? opts.sizes[i % opts.sizes.length] : size;
    out.push(at(glyph, angle, dist, s, { inverted: opts.inverted, tilt: opts.tilt, rot: opts.rot }));
  }
  return out;
}

export function makeSeal(elements, opts = {}) {
  return { elements, children: opts.children || [], gap: opts.gap ?? null, ringWidth: opts.ringWidth ?? 1 };
}

// ── Aplatissement (sceaux imbriqués) ──
// Retourne une liste de placements absolus : {glyph, x, y, size, rot, inverted, depth, ringIndex}
export function flatten(seal, transform = { x: 0, y: 0, scale: 1 }, depth = 0, acc = { elements: [], rings: [] }) {
  const ringIndex = acc.rings.length;
  acc.rings.push({ x: transform.x, y: transform.y, r: transform.scale, gap: seal.gap, depth, parent: transform.parent ?? null });
  for (const el of seal.elements) {
    const { rot, inverted } = canonicalOrientation(el);
    acc.elements.push({
      ...el,
      x: transform.x + el.x * transform.scale,
      y: transform.y + el.y * transform.scale,
      size: el.size * transform.scale,
      rot, inverted,
      depth,
      ringIndex,
      localX: el.x, localY: el.y, localSize: el.size,
    });
  }
  for (const child of seal.children || []) {
    flatten(child.seal, { x: transform.x + child.x * transform.scale, y: transform.y + child.y * transform.scale, scale: child.scale * transform.scale, parent: ringIndex }, depth + 1, acc);
  }
  return acc;
}

// Points d'un élément en coordonnées du sceau.
export function elementStrokes(el) {
  const { strokes, dots } = placedStrokes(el.glyph, el.rot, el.inverted);
  const k = el.size / 100;
  return {
    strokes: strokes.map((s) => s.map(([px, py]) => [el.x + (px - 50) * k, el.y + (py - 50) * k])),
    dots: dots.map(([px, py, r]) => [el.x + (px - 50) * k, el.y + (py - 50) * k, r * k]),
  };
}

function ringArcs(ring) {
  if (!ring.gap) return [[0, 360]];
  const a0 = ring.gap.angle + ring.gap.width / 2, a1 = ring.gap.angle - ring.gap.width / 2 + 360;
  return [[a0, a1]];
}

function ringPolyline(ring, [a0, a1]) {
  const pts = [];
  const n = Math.max(48, Math.round((a1 - a0) / 3));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const p = polar(a, 1);
    pts.push([ring.x + p.x * ring.r, ring.y + p.y * ring.r]);
  }
  return pts;
}

// Toutes les polylignes du sceau (cercles + glyphes), coordonnées unitaires.
export function sealGeometry(seal) {
  const flat = flatten(seal);
  const strokes = [], dots = [];
  for (const ring of flat.rings) for (const arcSpan of ringArcs(ring)) strokes.push({ pts: ringPolyline(ring, arcSpan), width: (seal.ringWidth ?? 1) * 2.2, ring: true });
  for (const el of flat.elements) {
    const g = elementStrokes(el);
    for (const s of g.strokes) strokes.push({ pts: s, width: 1, el });
    for (const d of g.dots) dots.push({ x: d[0], y: d[1], r: d[2], el });
  }
  return { strokes, dots, flat };
}

// ── SVG ──
function fmt(v) { return Math.round(v * 100) / 100; }

export function glyphSVG(id, opts = {}) {
  const size = opts.size ?? 96, color = opts.color ?? 'currentColor', inverted = !!opts.inverted, rot = opts.rot ?? 0;
  const { strokes, dots } = placedStrokes(id, rot, inverted);
  const sw = opts.strokeWidth ?? 3.2;
  const paths = strokes.map((s) => `<path d="M${s.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L')}"/>`).join('');
  const circles = dots.map(([x, y, r]) => `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" fill="${color}" stroke="none"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}${circles}</svg>`;
}

export function sealSVG(seal, opts = {}) {
  const size = opts.size ?? 420, color = opts.color ?? 'currentColor', pad = 1.08;
  const geo = sealGeometry(seal);
  const k = size / (2 * pad), cx = size / 2, cy = size / 2;
  const P = ([x, y]) => `${fmt(cx + x * k)} ${fmt(cy + y * k)}`;
  const base = opts.strokeWidth ?? size / 130;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">`;
  if (opts.background) out += `<rect width="${size}" height="${size}" fill="${opts.background}" stroke="none"/>`;
  for (const s of geo.strokes) {
    const attrs = s.el && opts.highlight === s.el ? ` stroke="${opts.highlightColor || '#c8102e'}"` : '';
    const cls = s.el ? ` data-glyph="${s.el.glyph}"` : ' data-ring="1"';
    out += `<path${cls}${attrs} stroke-width="${fmt(base * s.width)}" d="M${s.pts.map(P).join('L')}"/>`;
  }
  for (const d of geo.dots) out += `<circle data-glyph="${d.el.glyph}" cx="${fmt(cx + d.x * k)}" cy="${fmt(cy + d.y * k)}" r="${fmt(Math.max(1, d.r * k))}" fill="${color}" stroke="none"/>`;
  if (opts.guides) {
    for (const el of geo.flat.elements) {
      const h = (el.size * k) / 2;
      out += `<rect x="${fmt(cx + el.x * k - h)}" y="${fmt(cy + el.y * k - h)}" width="${fmt(2 * h)}" height="${fmt(2 * h)}" stroke="#4aa3ff" stroke-width="1" stroke-dasharray="3 3"/>`;
    }
  }
  return out + '</svg>';
}

// ── Rastérisation (pour les tests et les gabarits de reconnaissance) ──
// Retourne un masque {width, height, data: Uint8Array} (1 = encre).
export function rasterizePolylines(strokes, dots, opts) {
  const { width, height, map, thickness } = opts;
  const data = new Uint8Array(width * height);
  const stamp = (x, y, r) => {
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(width - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(height - 1, Math.ceil(y + r));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r) data[yy * width + xx] = 1;
    }
  };
  for (const s of strokes) {
    const pts = s.pts.map(map);
    const r = ((s.width || 1) * thickness) / 2;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      if (i === 0) stamp(ax, ay, r);
      else {
        const [bx, by] = pts[i - 1];
        const len = Math.hypot(ax - bx, ay - by), n = Math.max(1, Math.ceil(len / (r * 0.6)));
        for (let j = 1; j <= n; j++) stamp(bx + ((ax - bx) * j) / n, by + ((ay - by) * j) / n, r);
      }
    }
  }
  for (const d of dots) {
    const [x, y] = map([d.x, d.y]);
    stamp(x, y, Math.max(thickness / 2, d.r * (opts.scale ?? 1)));
  }
  return { width, height, data };
}

export function rasterizeSeal(seal, opts = {}) {
  const size = opts.size ?? 400, pad = 1.1;
  const k = size / (2 * pad), cx = size / 2 + (opts.offsetX || 0), cy = size / 2 + (opts.offsetY || 0);
  const rot = ((opts.rotate || 0) * Math.PI) / 180, c = Math.cos(rot), s = Math.sin(rot);
  const geo = sealGeometry(seal);
  const map = ([x, y]) => [cx + (x * c - y * s) * k, cy + (x * s + y * c) * k];
  return rasterizePolylines(geo.strokes, geo.dots, { width: size, height: size, map, thickness: opts.thickness ?? size / 130, scale: k });
}

export function rasterizeGlyph(id, opts = {}) {
  const size = opts.size ?? 48, inverted = !!opts.inverted, rot = opts.rot ?? 0;
  const { strokes, dots } = placedStrokes(id, rot, inverted);
  const k = size / 100;
  return rasterizePolylines(
    strokes.map((pts) => ({ pts, width: 1 })),
    dots.map(([x, y, r]) => ({ x, y, r })),
    { width: size, height: size, map: ([x, y]) => [x * k, y * k], thickness: opts.thickness ?? Math.max(1.5, size / 22), scale: k },
  );
}

export function describeElement(el) {
  const g = GLYPHS[el.glyph];
  return `${g.fr}${el.inverted ? ' (inversé)' : ''}`;
}
