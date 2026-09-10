// L'atelier : apprendre à tracer, pas à cocher.
//
// Chaque exercice demande un tracé et le mesure. Il n'y a pas de bonne réponse
// à choisir : il y a un cercle plus ou moins rond, un signe plus ou moins bien
// placé, une couronne plus ou moins régulière — et on le dit en chiffres.
//
// Logique pure, testable sous node. L'interface se contente d'afficher les
// critères que `gradeExercise` renvoie.

import { GLYPHS } from './glyphs.js';
import { SPELL_BY_ID } from './spells.js';
import { recognize } from './recognizer.js';
import { readImage } from './hypothesis.js';

// ───────────────────────── Mesures du cercle ─────────────────────────

// Écart d'un anneau au cercle parfait. On ajuste r(φ) ≈ r0 + c·cos2φ + s·sin2φ
// sur l'encre de l'anneau seul : la bande est étroite pour qu'une couronne de
// signes en tombe dehors, sinon elle se compterait comme des bosses du cercle.
// Le terme en 2φ est l'ovalisation, le reste est le tremblement. On les sépare
// parce qu'ils se corrigent différemment : l'un vient du bras, l'autre de la main.
export function ringShape(mask, ring) {
  const { width: W, height: H, data } = mask;
  let a00 = 0, a01 = 0, a02 = 0, a11 = 0, a12 = 0, a22 = 0, b0 = 0, b1 = 0, b2 = 0, n = 0;
  const pts = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!data[y * W + x]) continue;
      const dx = x - ring.cx, dy = y - ring.cy;
      const r = Math.hypot(dx, dy);
      if (r < ring.r * 0.9 || r > ring.r * 1.1) continue;
      const phi = Math.atan2(dy, dx), c = Math.cos(2 * phi), s = Math.sin(2 * phi);
      a00 += 1; a01 += c; a02 += s; a11 += c * c; a12 += c * s; a22 += s * s;
      b0 += r; b1 += r * c; b2 += r * s;
      pts.push([r, c, s]);
      n += 1;
    }
  }
  if (n < 30) return null;
  // Système normal 3×3, résolu par élimination.
  const A = [[a00, a01, a02], [a01, a11, a12], [a02, a12, a22]];
  const B = [b0, b1, b2];
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let k = i + 1; k < 3; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k;
    if (Math.abs(A[p][i]) < 1e-9) return null;
    [A[i], A[p]] = [A[p], A[i]]; [B[i], B[p]] = [B[p], B[i]];
    for (let k = i + 1; k < 3; k++) {
      const f = A[k][i] / A[i][i];
      for (let j = i; j < 3; j++) A[k][j] -= f * A[i][j];
      B[k] -= f * B[i];
    }
  }
  const sol = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let acc = B[i];
    for (let j = i + 1; j < 3; j++) acc -= A[i][j] * sol[j];
    sol[i] = acc / A[i][i];
  }
  const [r0, c1, s1] = sol;
  if (!(r0 > 0)) return null;

  let resid = 0;
  for (const [r, c, s] of pts) { const d = r - (r0 + c1 * c + s1 * s); resid += d * d; }
  const amp = Math.hypot(c1, s1);
  return {
    r0,
    // Grand axe / petit axe − 1 : « ovale de 12 % ».
    ovality: (2 * amp) / r0,
    // Direction du grand axe, 0 = horizontal.
    axis: ((Math.atan2(s1, c1) / 2) * 180) / Math.PI,
    // Tremblement : ce que l'ellipse n'explique pas.
    wobble: Math.sqrt(resid / pts.length) / r0,
  };
}

// ───────────────────────── Critères ─────────────────────────

const crit = (id, label, ok, detail, essential = true) => ({ id, label, ok, detail, essential });
const pct = (x) => `${Math.round(x * 100)} %`;
const deg = (x) => `${Math.round(x)}°`;

// Écart angulaire signé, ramené dans (−180, 180].
export function angleDiff(a, b) {
  return ((a - b) % 360 + 540) % 360 - 180;
}

function ringCriteria(mask, ring, { size = true, closed = true } = {}) {
  const out = [];
  const shape = ringShape(mask, ring);
  const side = Math.min(mask.width, mask.height);

  if (shape) {
    out.push(crit('rond', 'Le cercle est rond',
      shape.ovality < 0.08,
      shape.ovality < 0.08
        ? `ovalisation de ${pct(shape.ovality)}, on ne la voit pas`
        : `ovale de ${pct(shape.ovality)}, allongé ${Math.abs(shape.axis) < 45 ? 'en largeur' : 'en hauteur'} — faites tourner le bras depuis l'épaule, pas le poignet`));
    out.push(crit('regulier', 'Le trait ne tremble pas',
      shape.wobble < 0.035,
      shape.wobble < 0.035 ? `écart moyen de ${pct(shape.wobble)}` : `le trait ondule de ${pct(shape.wobble)} — un geste continu vaut mieux que dix petits`));
  }

  if (closed) {
    out.push(crit('ferme', 'Le cercle est refermé',
      ring.coverage > 0.97,
      ring.coverage > 0.97 ? 'fermé sur tout le tour' : `il manque ${deg((1 - ring.coverage) * 360)} de tracé — un sceau ouvert ne s'allume pas`));
  }

  if (size) {
    const rel = ring.r / (side / 2);
    out.push(crit('taille', 'Le cercle occupe la feuille',
      rel > 0.5 && rel < 0.97,
      rel <= 0.5 ? `il n'occupe que ${pct(rel)} de la place : trop petit pour y loger des signes`
        : rel >= 0.97 ? 'il touche le bord, vous n\'aurez pas la place de finir'
          : `il occupe ${pct(rel)} de la feuille`, false));
  }
  return out;
}

// ───────────────────────── Exercices ─────────────────────────

export const EXERCISES = [
  {
    id: 'cercle',
    kind: 'circle',
    title: 'Le cercle',
    brief: 'Tracez un cercle, aussi rond que vous le pouvez, qui occupe la feuille.',
    tip: 'C\'est le premier geste, et le plus ingrat. Faites tourner le bras depuis l\'épaule : le poignet seul dessine des œufs.',
    why: 'Le cercle contient le sort. S\'il est faux, tout ce qu\'on met dedans est faux : les distances au centre et les angles se mesurent par rapport à lui.',
  },
  {
    id: 'breche',
    kind: 'gap',
    title: 'La brèche',
    brief: 'Tracez un cercle ouvert : laissez une brèche nette vers le bas.',
    tip: 'Une brèche franche, pas un trait mal refermé. Le lecteur mesure l\'angle qui manque.',
    why: 'Un cercle ouvert prépare le sort sans le déclencher. C\'est ainsi qu\'on transporte un sceau sans qu\'il s\'allume.',
    target: { gap: 180, tol: 35 },
  },
  {
    id: 'sigil',
    kind: 'sigil',
    title: 'Le sigil au centre',
    brief: 'Tracez le cercle, puis le Sigil de Feu bien au centre, à peu près à la moitié du rayon.',
    tip: 'Un triangle au sommet ouvert, deux ailerons sortant des flancs, une courte tige sous la base.',
    why: 'Le sigil décide de quoi le sort est fait. Sa taille en règle l\'intensité — trop gros et le feu vous échappe.',
    target: { glyph: 'fire', size: 0.5, tol: { dist: 0.2, size: 0.22 } },
  },
  {
    id: 'signe',
    kind: 'sign',
    title: 'Placer un signe',
    brief: 'Un cercle, et un Signe des Colonnes à midi — le haut du signe tourné vers le centre.',
    tip: 'La barre se place côté cercle, la tige pointe vers le centre. C\'est l\'orientation qui compte, pas la beauté.',
    why: 'Un signe retourné inverse son effet. À midi, tourné vers le centre, la colonne jaillit droit vers le haut.',
    target: { glyph: 'columns', angle: 0, dist: 0.74, tol: { angle: 22, dist: 0.16 } },
  },
  {
    id: 'couronne',
    kind: 'crown',
    title: 'La couronne',
    brief: 'Un cercle et quatre Signes de Lévitation régulièrement espacés, tous de la même longueur.',
    tip: 'Repérez d\'abord les quatre places — midi, trois heures, six heures, neuf heures — puis tracez.',
    why: 'Quatre signes égaux s\'équilibrent et le sort monte droit. Un signe plus long que les autres, et il part de son côté.',
    target: { glyph: 'levitation', count: 4, dist: 0.72, tol: { spacing: 18, size: 0.3 } },
  },
  {
    id: 'sceau',
    kind: 'seal',
    title: 'Un sceau entier',
    brief: 'Tracez le Sceau de Boule de feu : le Sigil de Feu au centre, quatre Signes de Lévitation autour, et la brèche du cercle.',
    tip: 'Prenez votre temps. À la fin, le lecteur vous dira ce que votre sceau ferait vraiment.',
    why: 'C\'est le premier sort des apprentis. S\'il est lisible, vous savez écrire de la magie.',
    target: { spell: 'pyreball' },
  },
];

export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

// ───────────────────────── Correction ─────────────────────────

function placedGlyphs(rec) {
  return rec.elements.filter((e) => !e.ignored);
}

function gradeSigil(ex, rec) {
  const t = ex.target;
  const out = [];
  const els = placedGlyphs(rec);
  const want = GLYPHS[t.glyph].fr;
  if (!els.length) return [crit('present', `Le ${want} est là`, false, 'aucun glyphe trouvé dans le cercle')];

  // Le plus central : c'est la place du sigil.
  const el = els.slice().sort((a, b) => a.dist - b.dist)[0];
  out.push(crit('bon-glyphe', `C'est bien le ${want}`,
    el.glyph === t.glyph,
    el.glyph === t.glyph ? 'reconnu sans hésiter' : `lu comme ${GLYPHS[el.glyph]?.fr ?? 'rien de connu'}`));
  out.push(crit('centre', 'Il est au centre',
    el.dist <= t.tol.dist,
    el.dist <= t.tol.dist ? `décalé de ${pct(el.dist)} du rayon, c'est bon` : `décalé de ${pct(el.dist)} du rayon vers le bord`));
  out.push(crit('taille', 'Sa taille est juste',
    Math.abs(el.size - t.size) <= t.tol.size,
    `il occupe ${pct(el.size)} du rayon, on en attendait ${pct(t.size)}`, false));
  out.push(crit('seul', 'Rien d\'autre dans le cercle', els.length === 1,
    els.length === 1 ? 'le cercle ne contient que lui' : `${els.length} tracés trouvés au lieu d'un`, false));
  return out;
}

function gradeSign(ex, rec) {
  const t = ex.target;
  const els = placedGlyphs(rec);
  const want = GLYPHS[t.glyph].fr;
  if (!els.length) return [crit('present', `Le ${want} est là`, false, 'aucun signe trouvé')];

  const el = els.slice().sort((a, b) => Math.abs(angleDiff(a.angle, t.angle)) - Math.abs(angleDiff(b.angle, t.angle)))[0];
  const da = angleDiff(el.angle, t.angle);
  return [
    crit('bon-glyphe', `C'est bien le ${want}`, el.glyph === t.glyph,
      el.glyph === t.glyph ? 'reconnu' : `lu comme ${GLYPHS[el.glyph]?.fr ?? 'rien de connu'}`),
    crit('angle', 'Il est à la bonne place', Math.abs(da) <= t.tol.angle,
      Math.abs(da) <= t.tol.angle ? `à ${deg(Math.abs(da))} de la place visée` : `décalé de ${deg(Math.abs(da))} vers ${da > 0 ? 'la droite' : 'la gauche'}`),
    crit('distance', 'Il est à la bonne distance du centre', Math.abs(el.dist - t.dist) <= t.tol.dist,
      `posé à ${pct(el.dist)} du rayon, on l'attendait à ${pct(t.dist)}`),
    crit('sens', 'Le haut regarde le centre', !el.inverted,
      el.inverted ? 'le signe est retourné : son effet s\'inverse' : 'orienté vers le centre, comme il faut'),
  ];
}

function gradeCrown(ex, rec) {
  const t = ex.target;
  const els = placedGlyphs(rec);
  const want = GLYPHS[t.glyph].fr;
  const out = [crit('nombre', `${t.count} signes tracés`, els.length === t.count,
    els.length === t.count ? `${t.count} signes trouvés` : `${els.length} tracés trouvés au lieu de ${t.count}`)];
  if (els.length < 2) return out;

  const good = els.filter((e) => e.glyph === t.glyph).length;
  out.push(crit('bon-glyphe', `Chacun est un ${want}`, good === els.length,
    good === els.length ? 'tous reconnus' : `${good} sur ${els.length} reconnus comme ${want}`));

  // Régularité : le pire écart entre deux voisins et le pas idéal.
  const angles = els.map((e) => ((e.angle % 360) + 360) % 360).sort((a, b) => a - b);
  const step = 360 / angles.length;
  const gaps = angles.map((a, i) => {
    const next = i + 1 < angles.length ? angles[i + 1] : angles[0] + 360;
    return next - a;
  });
  const worst = Math.max(...gaps.map((g) => Math.abs(g - step)));
  out.push(crit('espacement', 'Ils sont régulièrement espacés', worst <= t.tol.spacing,
    `écarts mesurés : ${gaps.map((g) => deg(g)).join(', ')} — l'idéal est ${deg(step)}`));

  const sizes = els.map((e) => e.size);
  const spread = (Math.max(...sizes) - Math.min(...sizes)) / Math.max(...sizes);
  out.push(crit('longueur', 'Ils ont tous la même longueur', spread <= t.tol.size,
    spread <= t.tol.size ? `${pct(spread)} d'écart entre le plus grand et le plus petit`
      : `${pct(spread)} d'écart : le plus long l'emporte et le sort partira de son côté`));
  return out;
}

// L'exercice final se corrige comme n'importe quelle image donnée au lecteur :
// c'est le même chemin que l'onglet « Lire ».
function gradeSeal(ex, mask) {
  const want = SPELL_BY_ID[ex.target.spell];
  const out = readImage(mask);
  const m = out?.reading?.match;
  const ok = m && m.spell.id === want.id;
  const crits = [
    crit('reconnu', `Le lecteur y reconnaît le ${want.fr}`, !!ok,
      ok ? `identifié à ${pct(m.score)} de concordance`
        : m ? `lu comme « ${m.spell.fr} » à ${pct(m.score)} — ce n'est pas le bon sort`
          : 'aucun sort du grimoire ne correspond'),
    crit('franc', 'La lecture est franche', !!m && m.score >= 0.75,
      m ? `concordance ${pct(m.score)}` : '—', false),
  ];
  return { criteria: crits, reading: out?.reading ?? null, rec: out?.rec ?? null };
}

// mask : masque d'encre (comme celui que produit maskFromImageData).
export function gradeExercise(ex, mask) {
  if (ex.kind === 'seal') {
    const { criteria, reading, rec } = gradeSeal(ex, mask);
    return finish(ex, criteria, rec, reading);
  }

  const rec = recognize(mask);
  if (!rec.ok) {
    return finish(ex, [crit('cercle', 'Un cercle est reconnaissable', false,
      rec.reason || 'aucun cercle trouvé : commencez par en tracer un')], null, null);
  }

  const criteria = ringCriteria(mask, rec.ring, { size: ex.kind === 'circle', closed: ex.kind !== 'gap' });

  if (ex.kind === 'gap') {
    const g = rec.ring.gap;
    const t = ex.target;
    criteria.push(crit('breche', 'La brèche est là', !!g,
      g ? `brèche de ${deg(g.width)} ouverte` : 'le cercle est fermé : aucune brèche trouvée'));
    if (g) {
      const d = Math.abs(angleDiff(g.angle, t.gap));
      criteria.push(crit('breche-place', 'Elle est au bon endroit', d <= t.tol,
        d <= t.tol ? `à ${deg(d)} de l'endroit visé` : `décalée de ${deg(d)} : elle est à ${deg(g.angle)}, on la voulait à ${deg(t.gap)}`));
    }
  }
  if (ex.kind === 'sigil') criteria.push(...gradeSigil(ex, rec));
  if (ex.kind === 'sign') criteria.push(...gradeSign(ex, rec));
  if (ex.kind === 'crown') criteria.push(...gradeCrown(ex, rec));

  return finish(ex, criteria, rec, null);
}

function finish(ex, criteria, rec, reading) {
  const essential = criteria.filter((c) => c.essential);
  const passed = essential.length > 0 && essential.every((c) => c.ok);
  const score = criteria.length ? criteria.filter((c) => c.ok).length / criteria.length : 0;
  return { exercise: ex, criteria, passed, score, rec, reading };
}
