// Rendu « maladroit » d'un sceau : simule un tracé à main levée pour mettre la
// reconnaissance à l'épreuve (traits tremblés, épaisseur variable, ruptures,
// cercle ovale, glyphes décalés / tournés / redimensionnés, taches).

import { sealGeometry, rasterizePolylines } from './seal.js';

// Générateur pseudo-aléatoire déterministe (mulberry32).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deux niveaux de maladresse. « moderate » imite une main hésitante : le
// décalage d'un glyphe reste proportionnel à sa propre taille, comme quand on
// trace de travers un petit signe entre deux autres. « severe » décale en
// proportion du rayon du sceau — sur un sceau dense, cela revient à mélanger
// les glyphes, bien au-delà d'un mauvais tracé.
export const PROFILES = {
  moderate: {
    size: 700,
    rotate: 25,          // rotation globale max (°)
    wobble: 0.018,       // amplitude du tremblement (en rayons)
    jitterPos: 0.03,     // décalage max de chaque glyphe (en fraction de SA taille)
    jitterRelative: true,
    jitterRot: 12,       // rotation max de chaque glyphe (°)
    jitterScale: 0.18,   // variation max d'échelle de chaque glyphe
    thickness: [2.2, 6], // épaisseur du trait (px), tirée par trait
    breaks: 0.18,        // probabilité de rupture par trait
    ellipse: 0.08,       // aplatissement max du cercle
    speckles: 0.00015,   // densité de taches
    ringWobble: 0.02,
  },
  severe: { jitterPos: 0.035, jitterRelative: false, jitterRot: 18, jitterScale: 0.25, breaks: 0.25, ellipse: 0.12, speckles: 0.0003 },
};
const DEFAULTS = PROFILES.moderate;

export function sloppyMask(seal, seed = 1, opts = {}) {
  const o = { ...DEFAULTS, ...(PROFILES[opts.profile] || {}), ...opts };
  const rand = rng(seed);
  const R = (a, b) => a + (b - a) * rand();
  const size = o.size, pad = 1.15, k = size / (2 * pad), cx = size / 2 + R(-0.05, 0.05) * k, cy = size / 2 + R(-0.05, 0.05) * k;
  const rot = (R(-o.rotate, o.rotate) * Math.PI) / 180;
  const ell = 1 - R(0, o.ellipse), ellAngle = R(0, Math.PI);
  const geo = sealGeometry(seal);

  // perturbation par élément : mémorise décalage / rotation / échelle
  const perEl = new Map();
  const elJitter = (el) => {
    if (!perEl.has(el)) {
      // une main hésitante décale un glyphe d'une fraction de sa propre taille :
      // un petit signe glisse un peu, un grand signe conteneur reste à sa place
      const amp = o.jitterRelative ? o.jitterPos * (0.5 + Math.max(el.size, 0.05)) : o.jitterPos;
      perEl.set(el, { dx: R(-amp, amp), dy: R(-amp, amp), rot: (R(-o.jitterRot, o.jitterRot) * Math.PI) / 180, s: 1 + R(-o.jitterScale, o.jitterScale) });
    }
    return perEl.get(el);
  };

  // tremblement basse fréquence (deux sinusoïdes de phase aléatoire par trait)
  const wobbler = (maxAmp) => {
    const f1 = R(0.5, 1.5), f2 = R(2, 4), p1 = R(0, 6.28), p2 = R(0, 6.28), a1 = R(0.4, 1) * maxAmp, a2 = R(0.15, 0.4) * maxAmp;
    return (t) => a1 * Math.sin(f1 * t + p1) + a2 * Math.sin(f2 * t + p2);
  };

  const strokes = [];
  for (const s of geo.strokes) {
    let pts = s.pts;
    if (s.el) {
      const j = elJitter(s.el);
      const c = Math.cos(j.rot), sn = Math.sin(j.rot);
      pts = pts.map(([x, y]) => {
        const dx = (x - s.el.x) * j.s, dy = (y - s.el.y) * j.s;
        return [s.el.x + j.dx + dx * c - dy * sn, s.el.y + j.dy + dx * sn + dy * c];
      });
    }
    // rééchantillonne pour un tremblement lisse
    const dense = [];
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) { dense.push(pts[0]); continue; }
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.02));
      for (let q = 1; q <= n; q++) dense.push([ax + ((bx - ax) * q) / n, ay + ((by - ay) * q) / n]);
    }
    let length = 0;
    for (let i = 1; i < dense.length; i++) length += Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]);
    // l'amplitude du tremblement reste une fraction de la longueur du trait
    const amp = s.ring ? o.ringWobble : Math.min(o.wobble, 0.06 * length);
    const wx = wobbler(amp), wy = wobbler(amp);
    const wob = dense.map(([x, y], i) => { const t = (i / Math.max(1, dense.length - 1)) * 6.28 * (s.ring ? 3 : 1); return [x + wx(t), y + wy(t)]; });
    // ruptures
    const pieces = [];
    if (!s.ring && wob.length > 12 && rand() < o.breaks) {
      const at = Math.floor(R(0.25, 0.75) * wob.length), len = Math.floor(R(1, 3.5));
      pieces.push(wob.slice(0, at), wob.slice(at + len));
    } else if (s.ring && rand() < o.breaks * 0.5) {
      const at = Math.floor(R(0.2, 0.8) * wob.length), len = Math.floor(R(1, 3.5));
      pieces.push(wob.slice(0, at), wob.slice(at + len));
    } else pieces.push(wob);
    const thick = R(o.thickness[0], o.thickness[1]) * (s.ring ? 1.4 : 1);
    for (const p of pieces) if (p.length > 1) strokes.push({ pts: p, width: 1, thick });
  }

  const c = Math.cos(rot), sn = Math.sin(rot), ce = Math.cos(ellAngle), se = Math.sin(ellAngle);
  const map = ([x, y]) => {
    // aplatissement le long d'un axe aléatoire, puis rotation globale
    let ex = x * ce + y * se, ey = -x * se + y * ce;
    ey *= ell;
    const x2 = ex * ce - ey * se, y2 = ex * se + ey * ce;
    return [cx + (x2 * c - y2 * sn) * k, cy + (x2 * sn + y2 * c) * k];
  };
  // rastérise trait par trait avec son épaisseur
  const mask = { width: size, height: size, data: new Uint8Array(size * size) };
  for (const s of strokes) {
    const r = rasterizePolylines([{ pts: s.pts, width: 1 }], [], { width: size, height: size, map, thickness: s.thick, scale: k });
    for (let i = 0; i < r.data.length; i++) if (r.data[i]) mask.data[i] = 1;
  }
  const dots = geo.dots.map((d) => { const j = d.el ? elJitter(d.el) : { dx: 0, dy: 0, s: 1 }; return { x: d.x + j.dx, y: d.y + j.dy, r: d.r * j.s }; });
  const rd = rasterizePolylines([], dots, { width: size, height: size, map, thickness: 3, scale: k });
  for (let i = 0; i < rd.data.length; i++) if (rd.data[i]) mask.data[i] = 1;
  // taches
  const n = Math.floor(o.speckles * size * size);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rand() * size), y = Math.floor(rand() * size), rr = rand() < 0.7 ? 1 : 2;
    for (let yy = -rr; yy <= rr; yy++) for (let xx = -rr; xx <= rr; xx++) {
      const px = x + xx, py = y + yy;
      if (px >= 0 && py >= 0 && px < size && py < size) mask.data[py * size + px] = 1;
    }
  }
  return mask;
}
