// Reconnaissance d'un sceau dessiné : masque d'encre → composition.
//
// Pipeline (sans dépendance, fonctionne dans le navigateur comme dans Node) :
//   1. composantes connexes du masque ;
//   2. ajustement d'un cercle (méthode de Kåsa) sur la plus grande composante → anneau ;
//   3. couverture angulaire de l'anneau → brèche éventuelle ;
//   4. cercles intérieurs (sceaux imbriqués) ;
//   5. regroupement des composantes restantes en glyphes ;
//   6. appariement de chaque glyphe avec les gabarits du dictionnaire par
//      distance de chanfrein symétrique, aux orientations plausibles ;
//   7. reconstruction d'un sceau (modèle seal.js) lisible par l'interpréteur.

import { GLYPHS, placedStrokes } from './glyphs.js';
import { inwardRotation, rasterizePolylines, makeSeal, canonicalOrientation } from './seal.js';
import { bbox as strokesBBox } from './geometry.js';

const TPL = 40;         // taille des gabarits normalisés (appariement grossier)
const TPL_FIT = 34;     // côté utile dans le gabarit
// Un grand signe conteneur (Pluie, Marionnettes, Étirement, Fenêtres) occupe tout
// le sceau : réduit à 40 px, ce qui le distingue de ses voisins disparaît. Les
// meilleurs candidats sont donc re-comparés à cette résolution.
const TPL_FINE = 76;

// ───────────────────────── Masque ─────────────────────────

// ImageData (RGBA) → masque binaire. L'encre est la couleur minoritaire sombre ;
// si le fond est sombre (sort d'effacement de mémoire, blanc sur noir), on inverse.
export function maskFromImageData(img, opts = {}) {
  const { width, height, data } = img;
  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
    const a = data[j + 3] / 255;
    const g = (0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]) * a + 255 * (1 - a);
    gray[i] = g;
  }
  const t = opts.threshold ?? otsu(gray);
  let dark = 0;
  for (let i = 0; i < gray.length; i++) if (gray[i] < t) dark++;
  const invert = opts.invert ?? dark > gray.length * 0.5;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) mask[i] = (gray[i] < t) !== invert ? 1 : 0;
  return { width, height, data: mask, inverted: invert };
}

export function otsu(gray) {
  const hist = new Float64Array(256);
  for (let i = 0; i < gray.length; i++) hist[Math.min(255, Math.max(0, gray[i] | 0))]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) ** 2;
    if (v > best) { best = v; thr = i; }
  }
  return thr + 1;
}

// Réduction par blocs (max) pour accélérer les grandes images.
export function downsample(mask, maxSide = 700) {
  const f = Math.ceil(Math.max(mask.width, mask.height) / maxSide);
  if (f <= 1) return { ...mask, factor: 1 };
  const w = Math.ceil(mask.width / f), h = Math.ceil(mask.height / f);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) {
    if (mask.data[y * mask.width + x]) out[((y / f) | 0) * w + ((x / f) | 0)] = 1;
  }
  return { width: w, height: h, data: out, factor: f };
}

// ───────────────────────── Composantes ─────────────────────────

// Dilatation carrée de rayon r (séparable).
export function dilate(mask, r) {
  const { width: W, height: H, data } = mask;
  if (r <= 0) return data;
  const tmp = new Uint8Array(W * H), out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    let run = 0;
    for (let x = 0; x < W + r; x++) {
      if (x < W && data[y * W + x]) run = 2 * r + 1; else if (run > 0) run--;
      const tx = x - r;
      if (tx >= 0 && tx < W && run > 0) tmp[y * W + tx] = 1;
    }
  }
  for (let x = 0; x < W; x++) {
    let run = 0;
    for (let y = 0; y < H + r; y++) {
      if (y < H && tmp[y * W + x]) run = 2 * r + 1; else if (run > 0) run--;
      const ty = y - r;
      if (ty >= 0 && ty < H && run > 0) out[ty * W + x] = 1;
    }
  }
  return out;
}

// Composantes connexes sur le masque dilaté (ponte les petites ruptures de
// trait), mais chaque composante ne garde que ses pixels d'origine.
export function components(mask, bridge = 0) {
  if (bridge > 0) {
    const { width: W, height: H, data } = mask;
    const wide = components({ width: W, height: H, data: dilate(mask, bridge) });
    const comps = [];
    const map = new Map();
    for (let i = 0; i < W * H; i++) {
      if (!data[i]) continue;
      const l = wide.labels[i];
      let c = map.get(l);
      if (!c) { c = { id: comps.length, pix: [], area: 0, x0: W, y0: H, x1: 0, y1: 0, sx: 0, sy: 0 }; map.set(l, c); comps.push(c); }
      const x = i % W, y = (i / W) | 0;
      c.pix.push(i); c.sx += x; c.sy += y;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
    }
    for (const c of comps) { c.area = c.pix.length; c.w = c.x1 - c.x0 + 1; c.h = c.y1 - c.y0 + 1; c.cx = c.sx / c.area; c.cy = c.sy / c.area; delete c.sx; delete c.sy; }
    const labels = new Int32Array(W * H).fill(-1);
    comps.forEach((c) => { for (const p of c.pix) labels[p] = c.id; });
    return { comps, labels };
  }
  const { width: W, height: H, data } = mask;
  const labels = new Int32Array(W * H).fill(-1);
  const comps = [];
  const stack = new Int32Array(W * H);
  for (let start = 0; start < W * H; start++) {
    if (!data[start] || labels[start] !== -1) continue;
    const id = comps.length;
    const pix = [];
    let sp = 0; stack[sp++] = start; labels[start] = id;
    let x0 = W, y0 = H, x1 = 0, y1 = 0, sx = 0, sy = 0;
    while (sp) {
      const p = stack[--sp];
      const x = p % W, y = (p / W) | 0;
      pix.push(p); sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (data[q] && labels[q] === -1) { labels[q] = id; stack[sp++] = q; }
      }
    }
    comps.push({ id, pix, area: pix.length, x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: sx / pix.length, cy: sy / pix.length });
  }
  return { comps, labels };
}

// Largeur de trait : médiane des longueurs de runs horizontaux d'encre (≥ 1).
export function estimateStrokeWidth(mask) {
  const { width: W, height: H, data } = mask;
  const hist = new Uint32Array(64);
  let n = 0;
  for (let y = 0; y < H; y += 2) {
    let run = 0;
    for (let x = 0; x <= W; x++) {
      if (x < W && data[y * W + x]) run++;
      else if (run) { hist[Math.min(63, run)]++; n++; run = 0; }
    }
  }
  // 30e centile : les runs tangents aux courbes (longs) ne comptent pas
  let acc = 0;
  for (let i = 1; i < 64; i++) { acc += hist[i]; if (acc >= n * 0.3) return i; }
  return 1;
}

// Ellipse de l'anneau, robuste à une brèche : ajuste r(φ) ≈ r0 + c·cos 2φ + s·sin 2φ
// sur les pixels de l'anneau (moindres carrés), d'où l'orientation et le rapport d'axes.
export function ringEllipse(pix, W, circle) {
  let a00 = 0, a01 = 0, a02 = 0, a11 = 0, a12 = 0, a22 = 0, b0 = 0, b1 = 0, b2 = 0;
  for (const p of pix) {
    const x = (p % W) - circle.cx, y = ((p / W) | 0) - circle.cy;
    const r = Math.hypot(x, y), phi = Math.atan2(y, x);
    const c = Math.cos(2 * phi), s = Math.sin(2 * phi);
    a00 += 1; a01 += c; a02 += s; a11 += c * c; a12 += c * s; a22 += s * s;
    b0 += r; b1 += r * c; b2 += r * s;
  }
  const sol = solve3([[a00, a01, a02], [a01, a11, a12], [a02, a12, a22]], [b0, b1, b2]);
  if (!sol) return { cx: circle.cx, cy: circle.cy, theta: 0, ratio: 1 };
  const [r0, c2, s2] = sol;
  const amp = Math.hypot(c2, s2);
  return { cx: circle.cx, cy: circle.cy, theta: Math.atan2(s2, c2) / 2, ratio: Math.max(0.3, (r0 - amp) / (r0 + amp)) };
}

// Ellipse d'inertie d'un nuage de pixels (anneau vu de biais) : orientation du
// grand axe et rapport petit/grand axe.
export function inertiaEllipse(pix, W) {
  let n = pix.length, sx = 0, sy = 0;
  for (const p of pix) { sx += p % W; sy += (p / W) | 0; }
  const cx = sx / n, cy = sy / n;
  let m20 = 0, m02 = 0, m11 = 0;
  for (const p of pix) { const dx = (p % W) - cx, dy = ((p / W) | 0) - cy; m20 += dx * dx; m02 += dy * dy; m11 += dx * dy; }
  m20 /= n; m02 /= n; m11 /= n;
  const theta = 0.5 * Math.atan2(2 * m11, m20 - m02);
  const d = Math.sqrt(((m20 - m02) / 2) ** 2 + m11 * m11);
  const l1 = (m20 + m02) / 2 + d, l2 = (m20 + m02) / 2 - d;
  return { cx, cy, theta, ratio: l1 > 0 ? Math.sqrt(Math.max(l2, 0) / l1) : 1 };
}

// Redresse une ellipse en cercle : compression le long du grand axe (angle theta)
// par `ratio`, autour de (cx, cy). Renvoie le masque redressé et la transformation.
export function rectifyMask(mask, el) {
  const { width: W, height: H, data } = mask;
  const out = new Uint8Array(W * H);
  const c = Math.cos(el.theta), s = Math.sin(el.theta);
  // avant : (x, y) → coordonnées propres (u, v) ; u' = u * ratio ; retour au repère image
  const fwd = ([x, y]) => { const dx = x - el.cx, dy = y - el.cy; const u = (dx * c + dy * s) * el.ratio, v = -dx * s + dy * c; return [el.cx + u * c - v * s, el.cy + u * s + v * c]; };
  const inv = ([x, y]) => { const dx = x - el.cx, dy = y - el.cy; const u = (dx * c + dy * s) / el.ratio, v = -dx * s + dy * c; return [el.cx + u * c - v * s, el.cy + u * s + v * c]; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [sx, sy] = inv([x + 0.5, y + 0.5]);
    const ix = Math.floor(sx), iy = Math.floor(sy);
    if (ix >= 0 && iy >= 0 && ix < W && iy < H && data[iy * W + ix]) out[y * W + x] = 1;
  }
  return { mask: { width: W, height: H, data: out, factor: mask.factor }, fwd, inv };
}

// Ajustement algébrique d'un cercle (Kåsa).
export function fitCircle(pix, W) {
  const n = pix.length;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
  for (const p of pix) {
    const x = p % W, y = (p / W) | 0, z = x * x + y * y;
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z;
  }
  // Résout [sxx sxy sx; sxy syy sy; sx sy n] · [a b c] = [sxz syz sz] avec x²+y²+ax+by+c=0 (signes ajustés)
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]];
  const B = [-sxz, -syz, -sz];
  const sol = solve3(A, B);
  if (!sol) return null;
  const [a, b, c] = sol;
  const cx = -a / 2, cy = -b / 2;
  const r2 = cx * cx + cy * cy - c;
  if (!(r2 > 0)) return null;
  const r = Math.sqrt(r2);
  let res = 0;
  for (const p of pix) { const x = p % W, y = (p / W) | 0; const d = Math.hypot(x - cx, y - cy) - r; res += d * d; }
  return { cx, cy, r, rms: Math.sqrt(res / n) };
}

function solve3(A, B) {
  const M = A.map((row, i) => [...row, B[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-9) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k];
    }
  }
  return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
}

function angularCoverage(pix, W, circle, bins = 360) {
  const hist = new Uint16Array(bins);
  for (const p of pix) {
    const x = p % W, y = (p / W) | 0;
    const a = ((Math.atan2(x - circle.cx, -(y - circle.cy)) * 180) / Math.PI + 360) % 360; // 0 = midi, horaire
    hist[Math.min(bins - 1, (a * bins) / 360) | 0]++;
  }
  let covered = 0;
  for (let i = 0; i < bins; i++) if (hist[i]) covered++;
  // plus longue plage vide (circulaire)
  let best = 0, bestStart = 0, run = 0, runStart = 0;
  for (let i = 0; i < bins * 2; i++) {
    if (!hist[i % bins]) { if (!run) runStart = i; run++; if (run > best) { best = run; bestStart = runStart; } }
    else run = 0;
  }
  best = Math.min(best, bins);
  const gap = best >= 4 ? { angle: ((bestStart + best / 2) * 360 / bins) % 360, width: (best * 360) / bins } : null;
  return { coverage: covered / bins, gap };
}

// Cercle intérieur ? Un premier ajustement sur toute la composante, puis un
// second sur les seuls pixels de la bande circulaire : les signes qui touchent
// ou traversent l'anneau (Collecte de la Bulle de vapeur) sont détachés.
function innerRingOf(c, W, H, ring) {
  const R = ring.r;
  let fit = fitCircle(c.pix, W);
  if (!fit || fit.r < 0.09 * R || fit.r > 0.92 * R) return null;
  for (let pass = 0; pass < 2; pass++) {
    const band = [], off = [];
    for (const p of c.pix) { const x = p % W, y = (p / W) | 0; (Math.abs(Math.hypot(x - fit.cx, y - fit.cy) - fit.r) < 0.07 * fit.r ? band : off).push(p); }
    if (band.length < 0.55 * c.area) return null;
    const f2 = fitCircle(band, W);
    if (!f2 || f2.rms > 0.05 * f2.r) return null;
    fit = f2;
    if (pass === 1) {
      // un sceau satellite peut déborder du cercle principal (sort-miroir)
      if (fit.r < 0.09 * R || fit.r > 0.92 * R || Math.hypot(fit.cx - ring.cx, fit.cy - ring.cy) - fit.r > 1.15 * R) return null;
      const cv = angularCoverage(band, W, fit);
      if (cv.coverage < 0.8) return null;
      const detached = [];
      if (off.length > 8) {
        const sub = new Uint8Array(W * H);
        for (const p of off) sub[p] = 1;
        for (const d of components({ width: W, height: H, data: sub }).comps) if (d.area >= 6) detached.push(d);
      }
      return { ...fit, gap: cv.gap, comp: c, detached };
    }
  }
  return null;
}

// ───────────────────────── Gabarits ─────────────────────────

const tplCache = new Map();

function normalizeBitmap(points, w, h, res = TPL) {
  // points : liste de [x, y] (pixels) ; bitmap res×res centré, échelle max(w,h) → 85 % du côté
  const bmp = new Uint8Array(res * res);
  const fit = res * (TPL_FIT / TPL);
  const scale = fit / Math.max(w, h, 1);
  const ox = (res - w * scale) / 2, oy = (res - h * scale) / 2;
  for (const [x, y] of points) {
    const px = Math.min(res - 1, Math.max(0, (x * scale + ox) | 0));
    const py = Math.min(res - 1, Math.max(0, (y * scale + oy) | 0));
    bmp[py * res + px] = 1;
  }
  return bmp;
}

// Transformée de distance (chanfrein 3-4), en unités de pixel.
function distanceTransform(bmp, N = TPL) {
  const INF = 1e6;
  const d = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) d[i] = bmp[i] ? 0 : INF;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    if (x > 0) d[i] = Math.min(d[i], d[i - 1] + 1);
    if (y > 0) { d[i] = Math.min(d[i], d[i - N] + 1); if (x > 0) d[i] = Math.min(d[i], d[i - N - 1] + 1.414); if (x < N - 1) d[i] = Math.min(d[i], d[i - N + 1] + 1.414); }
  }
  for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) {
    const i = y * N + x;
    if (x < N - 1) d[i] = Math.min(d[i], d[i + 1] + 1);
    if (y < N - 1) { d[i] = Math.min(d[i], d[i + N] + 1); if (x < N - 1) d[i] = Math.min(d[i], d[i + N + 1] + 1.414); if (x > 0) d[i] = Math.min(d[i], d[i + N - 1] + 1.414); }
  }
  return d;
}

function pixelsOf(bmp) {
  const out = [];
  for (let i = 0; i < bmp.length; i++) if (bmp[i]) out.push(i);
  return out;
}

function template(glyph, rot, inverted, res = TPL) {
  const r = Math.round(rot / 5) * 5;
  const key = `${glyph}|${inverted ? 1 : 0}|${((r % 360) + 360) % 360}|${res}`;
  let t = tplCache.get(key);
  if (t) return t;
  const { strokes, dots } = placedStrokes(glyph, r, inverted);
  const bb = strokesBBox(strokes, dots);
  const fit = res * (TPL_FIT / TPL);
  const scale = fit / Math.max(bb.w, bb.h, 1);
  const ox = (res - bb.w * scale) / 2, oy = (res - bb.h * scale) / 2;
  const ras = rasterizePolylines(
    strokes.map((pts) => ({ pts, width: 1 })),
    dots.map(([x, y, rr]) => ({ x, y, r: rr })),
    { width: res, height: res, map: ([x, y]) => [(x - bb.x0) * scale + ox, (y - bb.y0) * scale + oy], thickness: 1.6 * (res / TPL), scale },
  );
  const bmp = ras.data;
  t = { bmp, dt: distanceTransform(bmp, res), pix: pixelsOf(bmp), aspect: bb.w / Math.max(bb.h, 1e-6), extent: Math.max(bb.w, bb.h) / 100, res };
  tplCache.set(key, t);
  return t;
}

const DT_CAP = 7;
// Le score est ramené à l'échelle du gabarit 40 px pour rester comparable
// quelle que soit la résolution de comparaison.
function chamfer(cand, tpl) {
  const k = TPL / (tpl.res || TPL), cap = DT_CAP / k;
  let a = 0;
  for (const i of tpl.pix) a += Math.min(cap, cand.dt[i]);
  let b = 0;
  for (const i of cand.pix) b += Math.min(cap, tpl.dt[i]);
  const s = k * (0.5 * (a / tpl.pix.length) + 0.5 * (b / cand.pix.length));
  const aspectPen = Math.abs(Math.log(Math.max(cand.aspect, 0.05) / Math.max(tpl.aspect, 0.05))) * 1.2;
  return s + aspectPen;
}

// Bitmap normalisé + transformée de distance d'un groupe de pixels.
function candidateOf(pts, w, h, res = TPL) {
  const bmp = normalizeBitmap(pts, w, h, res);
  return { bmp, dt: distanceTransform(bmp, res), pix: pixelsOf(bmp), aspect: w / Math.max(h, 1), res, pts, w, h };
}

export function scoreToConfidence(score) {
  return Math.max(0, Math.min(1, 1 - (score - 0.9) / 3.2));
}

// ───────────────────────── Regroupement ─────────────────────────

function bboxGap(a, b) {
  const dx = Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1));
  const dy = Math.max(0, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1));
  return Math.hypot(dx, dy);
}

function samplePixels(c, W, n = 160) {
  if (c.sample) return c.sample;
  const step = Math.max(1, Math.floor(c.pix.length / n));
  const out = [];
  for (let i = 0; i < c.pix.length; i += step) { const p = c.pix[i]; out.push([p % W, (p / W) | 0]); }
  c.sample = out;
  return out;
}

// Distance minimale approchée entre deux composantes (pixels échantillonnés).
function pixelGap(a, b, W) {
  const A = samplePixels(a, W), B = samplePixels(b, W);
  let best = Infinity;
  for (const [ax, ay] of A) for (const [bx, by] of B) {
    const d = (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

function gapBetween(a, b, W) {
  const g = bboxGap(a, b);
  // boîtes qui se chevauchent (signe conteneur autour d'un sigil) : distance réelle
  return g > 0 ? g : pixelGap(a, b, W);
}

function groupComponents(comps, ring, W, mergeScale = 1) {
  const R = ring.r;
  const parent = comps.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const ext = (c) => Math.max(c.w, c.h) / R;
  for (let i = 0; i < comps.length; i++) for (let j = i + 1; j < comps.length; j++) {
    const a = comps[i], b = comps[j];
    const dCentre = Math.max(Math.hypot(a.cx - ring.cx, a.cy - ring.cy), Math.hypot(b.cx - ring.cx, b.cy - ring.cy)) / R;
    const ea = ext(a), eb = ext(b);
    const [big, small] = ea >= eb ? [a, b] : [b, a];
    const contained = small.cx >= big.x0 && small.cx <= big.x1 && small.cy >= big.y0 && small.cy <= big.y1;
    let thr;
    if (Math.max(ea, eb) >= 0.6 && contained) {
      // un signe conteneur n'absorbe que de petits fragments très proches (ses propres traits)
      thr = Math.min(ea, eb) < 0.2 ? 0.06 : 0.02;
    } else {
      // les sigils en plusieurs morceaux (Eau, Terre, Appel…) sont au centre : fusion plus généreuse
      thr = dCentre < 0.27 ? 0.12 : 0.05;
      if (Math.min(ea, eb) < 0.05) thr += 0.02;
    }
    thr *= mergeScale;
    if (bboxGap(a, b) < thr * R && gapBetween(a, b, W) < thr * R) parent[find(i)] = find(j);
  }
  const groups = new Map();
  comps.forEach((c, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(c); });
  // Une couronne de petits signes identiques près du centre a été fusionnée à tort : on la sépare.
  const lists = [];
  for (const list of groups.values()) {
    if (list.length >= 4 && list.every((c) => ext(c) < 0.13)) {
      const gx = list.reduce((s, c) => s + c.cx, 0) / list.length, gy = list.reduce((s, c) => s + c.cy, 0) / list.length;
      const ds = list.map((c) => Math.hypot(c.cx - gx, c.cy - gy) / R);
      const mean = ds.reduce((a, b) => a + b, 0) / ds.length;
      if (mean > 0.08 && ds.every((d) => Math.abs(d - mean) < 0.25 * mean)) { for (const c of list) lists.push([c]); continue; }
    }
    lists.push(list);
  }
  return lists.map((list) => {
    const x0 = Math.min(...list.map((c) => c.x0)), y0 = Math.min(...list.map((c) => c.y0));
    const x1 = Math.max(...list.map((c) => c.x1)), y1 = Math.max(...list.map((c) => c.y1));
    const pix = list.flatMap((c) => c.pix);
    let sx = 0, sy = 0;
    for (const c of list) { sx += c.cx * c.area; sy += c.cy * c.area; }
    return { comps: list, pix, x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, area: pix.length, cx: sx / pix.length, cy: sy / pix.length };
  });
}

// ───────────────────────── Reconnaissance ─────────────────────────

function candidateRotations(glyph, dist, inward) {
  const g = GLYPHS[glyph];
  const set = [];
  const push = (rot, inv) => set.push({ rot: ((rot % 360) + 360) % 360, inverted: inv });
  if (dist < 0.22 || g.container || g.kind !== 'sign') {
    for (let r = 0; r < 360; r += 15) push(r, false);
    if (g.invertedShape) for (let r = 0; r < 360; r += 45) push(r, true);
    return set;
  }
  // placedStrokes ajoute lui-même 180° pour un signe inversé
  for (const d of [0, -15, 15, -30, 30, -45, 45]) { push(inward + d, false); push(inward + d, true); }
  for (const r of [0, 90, 180, 270]) push(r, false);
  if (g.dir === 'non' || g.dir === 'asymmetric') for (const d of [60, 75, 90, 105, 120, 135]) push(inward + d, false);
  return set;
}

export function recognize(inputMask, opts = {}) {
  const t0 = Date.now();
  const mask = opts._rectified ? inputMask : downsample(inputMask, opts.maxSide ?? 1000);
  const W = mask.width;
  // largeur de trait estimée (médiane des runs horizontaux d'encre) → pont des petites ruptures
  const strokeW = estimateStrokeWidth(mask);
  const bridge = Math.max(1, Math.min(2, Math.round(strokeW * 0.4)));
  const { comps } = components(mask, bridge);
  const debug = { factor: mask.factor, width: W, height: mask.height, strokeW, bridge };
  if (!comps.length) return { ok: false, reason: 'Aucune encre détectée.', debug };

  // 1. anneau
  const bySize = [...comps].sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
  let ring = null, ringComps = [];
  for (const c of bySize.slice(0, 4)) {
    const fit = fitCircle(c.pix, W);
    if (!fit) continue;
    const ext = Math.max(c.w, c.h);
    if (fit.rms < 0.1 * fit.r && ext > 0.35 * Math.min(W, mask.height) && ext > 1.2 * fit.r) { ring = fit; ringComps = [c]; break; }
  }
  // cercle vu de biais (ellipse) : on redresse l'image et on recommence
  if (ring && !opts._rectified) {
    const el = ringEllipse(ringComps[0].pix, W, ring);
    if (el.ratio < 0.975 && el.ratio > 0.6) {
      const { mask: rect, fwd, inv } = rectifyMask(mask, el);
      const res = recognize(rect, { ...opts, _rectified: true });
      if (res.ok) {
        const f = mask.factor;
        const back = ([x, y]) => { const [u, v] = inv([x / f, y / f]); return [u * f, v * f]; };
        for (const e of [...res.elements, ...res.unknown]) {
          const corners = [[e.box.x0, e.box.y0], [e.box.x1, e.box.y0], [e.box.x0, e.box.y1], [e.box.x1, e.box.y1]].map(back);
          e.box = { x0: Math.min(...corners.map((p) => p[0])), y0: Math.min(...corners.map((p) => p[1])), x1: Math.max(...corners.map((p) => p[0])), y1: Math.max(...corners.map((p) => p[1])) };
        }
        const [rcx, rcy] = back([res.ring.cx, res.ring.cy]);
        res.ring = { ...res.ring, cx: rcx, cy: rcy, r: res.ring.r / el.ratio, ellipse: { ratio: el.ratio, theta: el.theta } };
        res.innerRings = res.innerRings.map((ir) => { const [x, y] = back([ir.cx, ir.cy]); return { ...ir, cx: x, cy: y, r: ir.r / el.ratio }; });
        res.debug.rectified = el;
        void fwd;
      }
      return res;
    }
  }
  const bandTol = Math.min(0.12 * ring?.r || 0, Math.max(0.045 * (ring?.r || 0), 2.5 * (ring?.rms || 0)));
  if (!ring) {
    // repli : cercle englobant de toute l'encre
    const all = comps.flatMap((c) => c.pix);
    let x0 = W, y0 = mask.height, x1 = 0, y1 = 0;
    for (const p of all) { const x = p % W, y = (p / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    ring = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, r: Math.max(x1 - x0, y1 - y0) / 2 * 1.05, rms: 0 };
    debug.ringFallback = true;
  }
  // absorbe les morceaux d'anneau (brèche + levers de plume)
  const rest = [];
  const tol = debug.ringFallback ? 0.05 * ring.r : Math.max(bandTol, 0.05 * ring.r);
  for (const c of comps) {
    if (ringComps.includes(c)) continue;
    let inBand = 0;
    for (const p of c.pix) { const x = p % W, y = (p / W) | 0; if (Math.abs(Math.hypot(x - ring.cx, y - ring.cy) - ring.r) < tol) inBand++; }
    const ext = Math.max(c.w, c.h);
    if ((inBand > 0.8 * c.area && ext > 0.12 * ring.r) || (inBand > 0.92 * c.area && ext > 0.03 * ring.r && Math.hypot(c.cx - ring.cx, c.cy - ring.cy) > 0.9 * ring.r)) ringComps.push(c); else rest.push(c);
  }
  // pixels de l'anneau hors de la bande circulaire = symboles accrochés au cercle (Griffes, signes qui touchent)
  const bandPix = [], offPix = [];
  for (const c of ringComps) for (const p of c.pix) {
    const x = p % W, y = (p / W) | 0;
    (Math.abs(Math.hypot(x - ring.cx, y - ring.cy) - ring.r) < tol ? bandPix : offPix).push(p);
  }
  if (bandPix.length > 50) { const f = fitCircle(bandPix, W); if (f && f.rms < 0.08 * f.r) ring = f; }
  if (offPix.length > 8) {
    const sub = new Uint8Array(W * mask.height);
    for (const p of offPix) sub[p] = 1;
    // le trait du cercle coupe en deux les signes qui le traversent (Griffes) :
    // on ponte la largeur de la bande retirée pour les recoller
    const acrossRing = Math.max(bridge, Math.ceil(tol) + 1);
    for (const c of components({ width: W, height: mask.height, data: sub }, acrossRing).comps) if (c.area >= 6) { c.attached = true; rest.push(c); }
  }
  const cov = bandPix.length ? angularCoverage(bandPix, W, ring) : { coverage: 0, gap: null };
  const R = ring.r;
  // taches : composantes minuscules par rapport au trait
  // poussière : moins d'encre que n'en demanderait le plus petit glyphe lisible
  const speckLimit = Math.max(10, 0.5 * strokeW * 0.06 * ring.r);
  const cleaned = rest.filter((c) => !(c.area < speckLimit && Math.max(c.w, c.h) < Math.max(5, 3 * strokeW)));
  rest.length = 0; rest.push(...cleaned);

  // 2. cercles intérieurs
  let innerRings = [];
  let glyphComps = [];
  const detached = [];
  for (const c of rest) {
    const ext = Math.max(c.w, c.h);
    if (ext > 0.19 * R) {
      const ir = innerRingOf(c, W, mask.height, ring);
      if (ir) { innerRings.push(ir); detached.push(...ir.detached); continue; }
    }
    if (c.area >= 2) glyphComps.push(c);
  }
  glyphComps.push(...detached);
  // deux cercles concentriques ne sont pas des anneaux mais un sigil (Oubli, Orbe…)
  const concentric = innerRings.filter((a) => innerRings.some((b) => b !== a && Math.hypot(a.cx - b.cx, a.cy - b.cy) < 0.05 * R));
  if (concentric.length) {
    glyphComps = glyphComps.concat(concentric.map((c) => c.comp));
    innerRings = innerRings.filter((c) => !concentric.includes(c));
  }

  // 3. appariement d'un groupe de pixels (utilisé par le regroupement et pour le résultat)
  const wanted = opts.glyphs || Object.keys(GLYPHS);
  const probes = [];   // de quoi ré-apparier un tracé à n'importe quel glyphe, après coup
  const matchGroup = (gr) => {
    const ext = Math.max(gr.w, gr.h) / R;
    if (ext < 0.035) return null; // poussière
    const dx = (gr.cx - ring.cx) / R, dy = (gr.cy - ring.cy) / R;
    let parent = null;
    for (const ir of innerRings) if (Math.hypot(gr.cx - ir.cx, gr.cy - ir.cy) < ir.r * 0.95) parent = ir;
    const px = parent ? (gr.cx - parent.cx) / parent.r : dx, py = parent ? (gr.cy - parent.cy) / parent.r : dy;
    const dist = Math.hypot(px, py);
    const inward = inwardRotation(px, py);
    const pts = gr.pix.map((p) => [(p % W) - gr.x0, ((p / W) | 0) - gr.y0]);
    const cand = candidateOf(pts, gr.w, gr.h);
    if (!cand.pix.length) return null;
    let best = null;
    const ranked = [];
    for (const glyph of wanted) {
      for (const { rot, inverted } of candidateRotations(glyph, dist, inward)) {
        const tpl = template(glyph, rot, inverted);
        if (Math.abs(Math.log(Math.max(cand.aspect, 0.05) / Math.max(tpl.aspect, 0.05))) > 1.1) continue;
        const s = chamfer(cand, tpl);
        ranked.push({ glyph, rot, inverted, score: s, extent: tpl.extent });
        if (!best || s < best.score) best = { glyph, rot, inverted, score: s, extent: tpl.extent };
      }
    }
    if (!best) return null;
    ranked.sort((a, b) => a.score - b.score);
    const seen = new Set();
    for (const r of ranked) {
      if (seen.has(r.glyph)) continue;
      seen.add(r.glyph);
      if (seen.size > 4) break;
      for (const d of [-10, -5, 5, 10]) {
        const tpl = template(r.glyph, r.rot + d, r.inverted);
        const s = chamfer(cand, tpl);
        ranked.push({ glyph: r.glyph, rot: r.rot + d, inverted: r.inverted, score: s, extent: tpl.extent });
        if (s < best.score) best = { glyph: r.glyph, rot: r.rot + d, inverted: r.inverted, score: s, extent: tpl.extent };
      }
    }
    ranked.sort((a, b) => a.score - b.score);
    const alternatives = [];
    for (const r of ranked) { if (!alternatives.some((a) => a.glyph === r.glyph)) alternatives.push(r); if (alternatives.length >= 12) break; }
    // seconde passe fine sur les meilleurs candidats : à 40 px, deux grands
    // signes conteneurs se ressemblent ; à 76 px, leur détail les sépare
    const fine = candidateOf(cand.pts, cand.w, cand.h, TPL_FINE);
    for (const a of alternatives.slice(0, 5)) {
      let bestFine = null;
      for (const d of [-10, -5, 0, 5, 10]) {
        const tpl = template(a.glyph, a.rot + d, a.inverted, TPL_FINE);
        const sc = chamfer(fine, tpl);
        if (!bestFine || sc < bestFine.score) bestFine = { score: sc, rot: a.rot + d, extent: tpl.extent };
      }
      if (bestFine) { a.score = bestFine.score; a.rot = bestFine.rot; a.extent = bestFine.extent; }
    }
    alternatives.sort((a, b) => a.score - b.score);
    best = alternatives[0] ?? best;
    const confidence = scoreToConfidence(best.score);
    const scaleR = parent ? parent.r : R;
    const size = (Math.max(gr.w, gr.h) / scaleR) / Math.max(best.extent, 0.2);
    const angle = ((Math.atan2(px, -py) * 180) / Math.PI + 360) % 360;
    const relExtent = Math.max(gr.w, gr.h) / scaleR;
    const probe = probes.length;
    probes.push({ cand, dist, inward, relExtent, pix: gr.pix });
    return {
      probe,
      glyph: best.glyph, x: px, y: py, size, rot: best.rot, inverted: best.inverted, confidence, score: best.score, angle, dist,
      // chaque candidat garde son orientation et sa taille mesurées : une
      // ré-identification (manuelle ou par hypothèse) restitue sa géométrie
      alternatives: alternatives.map((a) => ({ glyph: a.glyph, confidence: scoreToConfidence(a.score), inverted: a.inverted, rot: a.rot, size: relExtent / Math.max(a.extent, 0.2) })),
      box: { x0: gr.x0, y0: gr.y0, x1: gr.x1, y1: gr.y1 }, parent,
    };
  };

  // 4. regroupement guidé par l'appariement
  const groups = groupComponents(glyphComps, ring, W, opts.mergeScale ?? 1);
  const elements = [], unknown = [];
  for (const gr of groups) {
    const rec = matchGroup(gr);
    if (!rec) continue;
    const dx = (gr.cx - ring.cx) / R, dy = (gr.cy - ring.cy) / R;
    if (Math.hypot(dx, dy) > 1.12 && !gr.comps.some((c) => c.attached)) continue; // hors du sceau
    if (rec.confidence < (opts.minConfidence ?? 0.28)) unknown.push(rec); else elements.push(rec);
  }

  // 5. reconstruction du sceau
  const f = mask.factor;
  for (const e of [...elements, ...unknown]) {
    e.box = { x0: e.box.x0 * f, y0: e.box.y0 * f, x1: (e.box.x1 + 1) * f, y1: (e.box.y1 + 1) * f };
    e.ignored = false;
  }
  innerRings.forEach((ir, i) => { ir.index = i; });
  for (const e of elements) if (e.parent) e.parentIndex = e.parent.index;
  for (const e of unknown) if (e.parent) e.parentIndex = e.parent.index;
  // Apparie après coup un tracé déjà repéré à un glyphe précis : la lecture par
  // hypothèses peut ainsi tester un glyphe absent des candidats retenus.
  const rescore = (el, glyph) => {
    const p = probes[el.probe];
    if (!p || !GLYPHS[glyph]) return null;
    let best = null;
    for (const { rot, inverted } of candidateRotations(glyph, p.dist, p.inward)) {
      const tpl = template(glyph, rot, inverted);
      const s = chamfer(p.cand, tpl);
      if (!best || s < best.score) best = { glyph, rot, inverted, score: s, extent: tpl.extent };
    }
    if (!best) return null;
    for (const d of [-10, -5, 5, 10]) {
      const tpl = template(glyph, best.rot + d, best.inverted);
      const s = chamfer(p.cand, tpl);
      if (s < best.score) best = { glyph, rot: best.rot + d, inverted: best.inverted, score: s, extent: tpl.extent };
    }
    return { glyph, confidence: scoreToConfidence(best.score), inverted: best.inverted, rot: best.rot, size: p.relExtent / Math.max(best.extent, 0.2) };
  };

  // Cherche un glyphe précis à un endroit précis du sceau (coordonnées en rayons
  // de l'anneau) : c'est ainsi qu'on vérifie l'hypothèse d'un sort connu là où le
  // découpage automatique n'a rien isolé — sans jamais inventer d'encre.
  const probeAt = (x, y, size, glyph, expectRot = null, claimed = null) => {
    if (!GLYPHS[glyph]) return null;
    const px = ring.cx + x * R, py = ring.cy + y * R;
    const half = Math.max(3, size * R * 0.6);
    const x0 = Math.max(0, Math.round(px - half)), x1 = Math.min(W - 1, Math.round(px + half));
    const y0 = Math.max(0, Math.round(py - half)), y1 = Math.min(mask.height - 1, Math.round(py + half));
    if (x1 <= x0 || y1 <= y0) return null;
    const pts = [], used = [];
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const p = yy * W + xx;
      if (!mask.data[p] || (claimed && claimed.has(p))) continue;
      if (Math.abs(Math.hypot(xx - ring.cx, yy - ring.cy) - R) < tol) continue; // trait du cercle
      pts.push([xx, yy]); used.push(p);
      if (xx < bx0) bx0 = xx; if (xx > bx1) bx1 = xx; if (yy < by0) by0 = yy; if (yy > by1) by1 = yy;
    }
    if (pts.length < 8) return null;
    const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
    if (Math.max(bw, bh) < 0.3 * size * R) return null; // trop peu d'encre pour ce glyphe
    const cand = candidateOf(pts.map(([xx, yy]) => [xx - bx0, yy - by0]), bw, bh);
    if (!cand.pix.length) return null;
    const dist = Math.hypot(x, y), inward = inwardRotation(x, y);
    const rots = expectRot === null ? candidateRotations(glyph, dist, inward)
      : [-30, -20, -10, 0, 10, 20, 30].flatMap((d) => [{ rot: expectRot + d, inverted: false }, { rot: expectRot + d, inverted: true }]);
    let best = null;
    for (const { rot, inverted } of rots) {
      const tpl = template(glyph, rot, inverted);
      const s = chamfer(cand, tpl);
      if (!best || s < best.score) best = { rot, inverted, score: s, extent: tpl.extent };
    }
    if (!best) return null;
    return {
      glyph, confidence: scoreToConfidence(best.score), inverted: best.inverted, rot: best.rot,
      size: (Math.max(bw, bh) / R) / Math.max(best.extent, 0.2),
      pix: used,
      x: ((bx0 + bx1) / 2 - ring.cx) / R, y: ((by0 + by1) / 2 - ring.cy) / R,
    };
  };

  const result = {
    ok: true, elements, unknown, rescore, probeAt, pixelsOf: (el) => probes[el.probe]?.pix ?? [],
    ring: { cx: ring.cx * f, cy: ring.cy * f, r: R * f, rms: ring.rms * f, coverage: cov.coverage, gap: cov.gap, fallback: !!debug.ringFallback },
    innerRings: innerRings.map((ir) => ({ cx: ir.cx * f, cy: ir.cy * f, r: ir.r * f, gap: ir.gap, rx: (ir.cx - ring.cx) / R, ry: (ir.cy - ring.cy) / R, scale: ir.r / R })),
    ms: Date.now() - t0, debug,
  };
  result.seal = assembleSeal(result);
  return result;
}

// (Re)construit le sceau à partir des éléments reconnus — utilisé aussi après correction manuelle.
export function assembleSeal(rec) {
  const use = rec.elements.filter((e) => !e.ignored);
  const rootEls = use.filter((e) => e.parentIndex == null).map(toElement);
  const children = rec.innerRings.map((ir, i) => ({
    seal: makeSeal(use.filter((e) => e.parentIndex === i).map(toElement), { gap: ir.gap }),
    x: ir.rx, y: ir.ry, scale: ir.scale,
  }));
  return makeSeal(rootEls, { gap: rec.ring.gap, children });
}

// Change l'identification d'un élément (correction manuelle) en gardant sa géométrie.
export function relabel(rec, el, glyph, inverted = false) {
  const alt = el.alternatives?.find((a) => a.glyph === glyph);
  el.glyph = glyph;
  el.inverted = inverted;
  if (alt) { el.rot = alt.rot; el.size = alt.size; }
  el.confidence = 1;
  el.ignored = false;
  rec.seal = assembleSeal(rec);
  return rec.seal;
}

function toElement(e) {
  const raw = { glyph: e.glyph, x: e.x, y: e.y, size: e.size, rot: e.rot, inverted: e.inverted, tilt: 0, confidence: e.confidence };
  const { rot, inverted } = canonicalOrientation(raw);
  e.rot = rot; e.inverted = inverted;
  return { ...raw, rot, inverted };
}

export function clearTemplateCache() { tplCache.clear(); }
