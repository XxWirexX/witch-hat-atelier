// Stroke primitives used by the glyph dictionary. Every helper returns a
// polyline (array of [x, y] points) in the 100×100 glyph box, y pointing down.

export function line(...coords) {
  const pts = [];
  for (let i = 0; i < coords.length; i += 2) pts.push([coords[i], coords[i + 1]]);
  return pts;
}

// Angles in degrees, 0 = +x (right), 90 = +y (down). Sweep from a0 to a1.
export function arc(cx, cy, r, a0, a1, n) {
  const steps = n ?? Math.max(6, Math.round(Math.abs(a1 - a0) / 6));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

export function circle(cx, cy, r) {
  return arc(cx, cy, r, 0, 360, Math.max(16, Math.round(r * 1.2)));
}

// Cubic Bézier flattened to a polyline.
export function bezier(p0, p1, p2, p3, n = 16) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}

// Chain several polylines into one continuous stroke.
export function join(...polys) {
  const out = [];
  for (const p of polys) for (const pt of p) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last[0] - pt[0], last[1] - pt[1]) > 1e-6) out.push(pt);
  }
  return out;
}

// Vertical "S" curve centred on (cx, cy) spanning height h and width w.
export function sCurve(cx, cy, h, w, flip = false) {
  const s = flip ? -1 : 1;
  return join(
    bezier([cx + s * w * 0.6, cy - h / 2], [cx - s * w * 1.2, cy - h / 2], [cx + s * w * 1.2, cy], [cx, cy], 12),
    bezier([cx, cy], [cx - s * w * 1.2, cy], [cx + s * w * 1.2, cy + h / 2], [cx - s * w * 0.6, cy + h / 2], 12),
  );
}

// Teardrop with the point at the top.
export function drop(cx, cy, r) {
  return join(
    [[cx, cy - r * 1.9]],
    arc(cx, cy, r, 250, 250 + 340, 14),
    [[cx, cy - r * 1.9]],
  );
}

// Archimedean spiral from angle a0 to a1 with radius growing r0 → r1.
export function spiral(cx, cy, r0, r1, a0, a1, n = 24) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = ((a0 + (a1 - a0) * t) * Math.PI) / 180, r = r0 + (r1 - r0) * t;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

export function rotatePoint([x, y], deg, cx = 50, cy = 50) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const dx = x - cx, dy = y - cy;
  return [cx + dx * c - dy * s, cy + dx * s + dy * c];
}

export function rotateStrokes(strokes, deg, cx = 50, cy = 50) {
  return strokes.map((s) => s.map((p) => rotatePoint(p, deg, cx, cy)));
}

export function mirrorX(strokes, cx = 50) {
  return strokes.map((s) => s.map(([x, y]) => [2 * cx - x, y]));
}

export function mirrorY(strokes, cy = 50) {
  return strokes.map((s) => s.map(([x, y]) => [x, 2 * cy - y]));
}

// Repeat a set of strokes n times around (cx, cy).
export function radial(strokes, n, cx = 50, cy = 50, offset = 0) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(...rotateStrokes(strokes, offset + (360 * i) / n, cx, cy));
  return out;
}

export function bbox(strokes, dots = []) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) for (const [x, y] of s) {
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  for (const [x, y, r] of dots) {
    if (x - r < x0) x0 = x - r; if (y - r < y0) y0 = y - r; if (x + r > x1) x1 = x + r; if (y + r > y1) y1 = y + r;
  }
  if (x0 === Infinity) return { x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0 };
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}
