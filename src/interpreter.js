// Lecture d'un sceau : analyse structurelle puis rédaction en français.
//
// Entrée : un sceau (modèle de seal.js) — dessiné à la main dans le
// compositeur, choisi dans le grimoire ou reconstruit par la reconnaissance
// d'image (dans ce cas les éléments portent une `confidence`).

import { GLYPHS, ELEMENT_LABEL, DIR_LABEL } from './glyphs.js';
import { flatten, angleOf } from './seal.js';
import { SPELLS, TYPE_LABEL } from './spells.js';

const DIRECTIONAL = new Set(['columns', 'levitation', 'pulling', 'regions', 'launch', 'sights_set', 'crosshair', 'partition', 'refuse', 'dispersion']);
const NEAR_CENTER = 0.18;

const COMPASS = [
  [0, 'le haut'], [45, 'le haut à droite'], [90, 'la droite'], [135, 'le bas à droite'], [180, 'le bas'], [225, 'le bas à gauche'], [270, 'la gauche'], [315, 'le haut à gauche'],
];
export function compass(angle) {
  const a = ((angle % 360) + 360) % 360;
  let best = COMPASS[0];
  for (const c of COMPASS) if (Math.abs(((a - c[0] + 540) % 360) - 180) < Math.abs(((a - best[0] + 540) % 360) - 180)) best = c;
  return best[1];
}

function plural(n, s, p) { return n > 1 ? p || s + 's' : s; }
function num(n) { return ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze'][n] ?? String(n); }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function fmt1(x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); }

// Direction (angle 0 = midi, horaire) vers laquelle pointe le haut local du glyphe.
function pointingAngle(rot) { return ((rot % 360) + 360) % 360; }

// Classement d'un signe par rapport au centre du sceau.
function facingOf(el, ring) {
  const dx = el.x - ring.x, dy = el.y - ring.y, d = Math.hypot(dx, dy) / ring.r;
  if (d < NEAR_CENTER) return { facing: 'centre', dist: d, tilt: 0 };
  const toCenter = angleOf(-dx, -dy);
  const shapeInverted = el.inverted && GLYPHS[el.glyph].invertedShape;
  const p = pointingAngle(el.rot + (el.inverted && !shapeInverted ? 180 : 0));
  let diff = ((p - toCenter + 540) % 360) - 180; // -180..180, 0 = vers le centre
  const abs = Math.abs(diff);
  const g = GLYPHS[el.glyph];
  if (g.dir === 'non' || g.dir === 'asymmetric') return { facing: 'neutre', dist: d, tilt: 0 };
  if (abs <= 30) return { facing: 'inward', dist: d, tilt: diff };
  if (abs >= 150) return { facing: 'outward', dist: d, tilt: diff > 0 ? diff - 180 : diff + 180 };
  return { facing: 'sideways', dist: d, tilt: diff };
}

// Symétrie d'un ensemble d'angles (degrés).
function symmetryOf(angles, tol = 12) {
  const n = angles.length;
  if (n < 2) return { radial: n, bilateral: n >= 1 };
  const sorted = [...angles].map((a) => ((a % 360) + 360) % 360).sort((a, b) => a - b);
  const step = 360 / n;
  let radial = true;
  for (let i = 0; i < n; i++) {
    const expected = sorted[0] + i * step;
    if (Math.abs(((sorted[i] - expected + 540) % 360) - 180) > tol) { radial = false; break; }
  }
  let bilateral = false;
  const axes = new Set();
  for (const a of sorted) { axes.add(a); for (const b of sorted) { axes.add((a + b) / 2); axes.add((a + b) / 2 + 180); } }
  for (const axis of axes) {
    const ok = sorted.every((a) => sorted.some((b) => Math.abs(((2 * axis - a - b + 540) % 360) - 180) <= tol));
    if (ok) { bilateral = true; break; }
  }
  return { radial: radial ? n : 0, bilateral };
}

function sigilSizeWord(size) {
  if (size >= 0.55) return { word: 'grand', note: 'effet intense' };
  if (size <= 0.3) return { word: 'petit', note: 'effet modéré' };
  return { word: 'de taille moyenne', note: null };
}

// ── Analyse ──
export function analyzeSeal(seal, opts = {}) {
  const flat = flatten(seal);
  const outer = flat.rings[0];
  const elements = flat.elements.map((el) => ({ ...el, ...facingOf(el, flat.rings[el.ringIndex]) }));

  const sigils = elements.filter((e) => GLYPHS[e.glyph].kind !== 'sign');
  const signs = elements.filter((e) => GLYPHS[e.glyph].kind === 'sign');

  // Regroupement des signes par (glyphe, inversion)
  const groups = new Map();
  for (const s of signs) {
    // les Régions n'ont pas d'« endroit » : seule leur direction compte, on ne les sépare pas
    const inv = s.glyph === 'regions' ? false : s.inverted;
    const key = `${s.glyph}|${inv ? 1 : 0}|${s.depth}`;
    if (!groups.has(key)) groups.set(key, { glyph: s.glyph, inverted: inv, ringIndex: s.ringIndex, depth: s.depth, items: [] });
    groups.get(key).items.push(s);
  }
  const signGroups = [...groups.values()].map((g) => {
    const ringFor = (e) => flat.rings[e.ringIndex];
    const angles = g.items.map((e) => angleOf(e.x - ringFor(e).x, e.y - ringFor(e).y));
    const sizes = g.items.map((e) => e.size / ringFor(e).r);
    const facings = g.items.map((e) => e.facing);
    const count = (f) => facings.filter((x) => x === f).length;
    const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const maxS = Math.max(...sizes), minS = Math.min(...sizes);
    const tilts = g.items.map((e) => e.tilt);
    const meanTilt = tilts.reduce((a, b) => a + b, 0) / tilts.length;
    const conf = g.items.every((e) => typeof e.confidence === 'number') ? g.items.reduce((a, e) => a + e.confidence, 0) / g.items.length : null;
    return {
      ...g, n: g.items.length, angles, sizes, meanSize: mean, maxSize: maxS, minSize: minS,
      facing: { inward: count('inward'), outward: count('outward'), sideways: count('sideways'), centre: count('centre'), neutre: count('neutre') },
      meanTilt, symmetry: symmetryOf(angles), confidence: conf,
      pointing: g.items.map((e) => pointingAngle(e.rot + (e.inverted && !GLYPHS[e.glyph].invertedShape ? 180 : 0))),
    };
  }).sort((a, b) => b.n - a.n);

  // Vecteur de déséquilibre : signes directionnels de l'anneau principal, poussée = taille × direction du signe
  let px = 0, py = 0, total = 0;
  const dirSigns = signs.filter((s) => DIRECTIONAL.has(s.glyph) && s.ringIndex === 0 && s.facing !== 'centre');
  for (const s of dirSigns) {
    const dx = s.x - outer.x, dy = s.y - outer.y, d = Math.hypot(dx, dy) || 1;
    px += (dx / d) * s.size; py += (dy / d) * s.size; total += s.size;
  }
  const imbalance = total > 0 ? { magnitude: Math.hypot(px, py) / total, angle: angleOf(px, py) } : { magnitude: 0, angle: 0 };

  // Symétrie globale (tous les signes de l'anneau principal)
  const mainAngles = signs.filter((s) => s.ringIndex === 0 && s.facing !== 'centre').map((s) => angleOf(s.x - outer.x, s.y - outer.y));
  const globalSym = symmetryOf(mainAngles);

  // Rotation (signes directionnels inclinés dans le même sens)
  const tilted = dirSigns.filter((s) => s.facing === 'sideways' || Math.abs(s.tilt) >= 15);
  let rotation = null;
  if (tilted.length >= 2 && tilted.length >= dirSigns.length / 2) {
    const meanTilt = tilted.reduce((a, s) => a + s.tilt, 0) / tilted.length;
    if (Math.abs(meanTilt) >= 15) rotation = { sense: meanTilt > 0 ? 'antihoraire' : 'horaire', tilt: Math.abs(meanTilt), strength: Math.abs(meanTilt) > 50 ? 'forte' : 'modérée' };
  }

  // Éléments
  const elementSet = new Map();
  for (const s of sigils) {
    const g = GLYPHS[s.glyph];
    const key = g.decorative ? 'forme' : g.element || 'inconnu';
    elementSet.set(key, (elementSet.get(key) || 0) + 1);
  }
  const elements_ = [...elementSet.keys()];

  const match = matchSpell(seal);

  return {
    ring: { closed: !outer.gap, gap: outer.gap, count: flat.rings.length, nested: flat.rings.length > 1 },
    elements: elements_,
    sigils: sigils.map((s) => ({ glyph: s.glyph, size: s.size / flat.rings[s.ringIndex].r, ringIndex: s.ringIndex, depth: s.depth, atCenter: s.dist < 0.3, confidence: s.confidence ?? null, inverted: s.inverted })),
    dirCount: dirSigns.length,
    signGroups, imbalance, globalSym, rotation, match,
    unknown: (opts.unknown || []),
    all: elements,
  };
}

// ── Correspondance avec le grimoire ──
export function signature(seal) {
  const flat = flatten(seal);
  const sig = new Map();
  for (const el of flat.elements) {
    const key = `${el.glyph}|${el.inverted && el.glyph !== 'regions' ? 1 : 0}`;
    sig.set(key, (sig.get(key) || 0) + 1);
  }
  return sig;
}

// Similarité de Dice pondérée entre deux compositions : un sceau dont il manque
// un signe reste proche de son modèle, un sceau qui en ajoute s'en éloigne.
export function matchSpell(seal, exclude = null) {
  const a = signature(seal);
  const results = [];
  const w = (k) => (GLYPHS[k.split('|')[0]]?.kind === 'sign' ? 1 : 2.5);
  for (const sp of SPELLS) {
    if (exclude && sp.id === exclude) continue;
    const b = signature(sp.seal);
    if (a.size === 0 && b.size === 0) { results.push({ spell: sp, score: 1 }); continue; }
    let inter = 0, total = 0;
    for (const k of new Set([...a.keys(), ...b.keys()])) {
      const x = a.get(k) || 0, y = b.get(k) || 0;
      inter += w(k) * Math.min(x, y);
      total += w(k) * (x + y);
    }
    results.push({ spell: sp, score: total ? (2 * inter) / total : 0 });
  }
  results.sort((x, y) => y.score - x.score);
  return { best: results[0] || null, candidates: results.slice(0, 4) };
}

// ── Rédaction ──
export function readSeal(seal, opts = {}) {
  const A = analyzeSeal(seal, opts);
  const parts = [];
  const warnings = [];
  const sigilNames = A.sigils.map((s) => GLYPHS[s.glyph].fr);

  // Titre
  let type;
  if (A.elements.length === 0) type = 'Sort sans sigil';
  else if (A.elements.length === 1) type = `Sort de type ${ELEMENT_LABEL[A.elements[0]] || (A.elements[0] === 'forme' ? 'Sculpture' : cap(A.elements[0]))}`;
  else type = `Sort mixte (${A.elements.map((e) => ELEMENT_LABEL[e] || (e === 'forme' ? 'sculpture' : e)).join(' + ')})`;

  const m = A.match.best;
  let title = type, matchLine = null;
  if (opts.match) {
    // identification fournie par la lecture par hypothèses : elle fait autorité
    matchLine = { ...opts.match };
    if (matchLine.kind !== 'related') title = matchLine.spell.fr;
  } else if (m && m.score >= 0.999 && !(opts.excludeMatch && m.spell.id === opts.excludeMatch)) {
    title = `${m.spell.fr}`; matchLine = { kind: 'exact', spell: m.spell, score: m.score };
  } else if (m && m.score >= 0.6) {
    matchLine = { kind: 'close', spell: m.spell, score: m.score };
  } else if (m && m.score >= 0.35) {
    matchLine = { kind: 'related', spell: m.spell, score: m.score };
  }

  // Cercle
  if (!A.ring.closed) {
    parts.push(`Le cercle est ouvert (brèche vers ${compass(A.ring.gap.angle)}) : le sort est préparé mais inactif. Il suffira d'un trait pour le fermer et le déclencher sur-le-champ.`);
  } else {
    parts.push('Le cercle est complet : le sort est actif dès le dernier trait.');
  }
  if (A.ring.nested) parts.push(`Le sceau compte ${num(A.ring.count)} cercles : les sceaux intérieurs ne s'activent que lorsque l'anneau qui les entoure est fermé, et leurs effets se combinent.`);

  // Sigils
  if (A.sigils.length === 0) {
    if (A.signGroups.length === 0) parts.push('Aucun sigil ni signe : un cercle nu ne produit qu\'une décharge brute d\'énergie — une explosion (chapitre 46).');
    else parts.push('Aucun sigil : les signes agissent seuls sur la matière déjà présente (un signe comme la Nuée ou la Répétition peut tenir lieu de sigil).');
  } else {
    const seen = new Map();
    for (const s of A.sigils) seen.set(s.glyph, [...(seen.get(s.glyph) || []), s]);
    for (const [glyph, list] of seen) {
      const g = GLYPHS[glyph];
      const size = sigilSizeWord(Math.max(...list.map((s) => s.size)));
      const inner = list.every((s) => s.depth > 0);
      const where = list.some((s) => s.atCenter) ? (inner ? 'au centre des sceaux intérieurs' : 'au centre') : 'excentré (la position d\'un sigil ne change pas son effet)';
      const n = list.length > 1 ? `${cap(num(list.length))} ${g.fr.replace(/^Sigil/, 'sigils').replace(/^Sigil décoratif/, 'sigils décoratifs')}` : `${g.fr}`;
      let s = `${n}, ${size.word}${size.note ? ` (${size.note})` : ''}, ${where} : ${g.effect}.`;
      if (g.forbidden) s += ' Magie interdite par le Pacte.';
      if (g.decorative) s += ' Les sigils décoratifs prennent beaucoup de place et sculptent l\'effet à l\'image de la créature.';
      if (list.some((x) => x.confidence !== null && x.confidence < 0.55)) s += ' (identification incertaine)';
      parts.push(s);
    }
  }

  // Signes
  for (const gr of A.signGroups) {
    const g = GLYPHS[gr.glyph];
    const n = gr.n;
    let head = n > 1 ? `${cap(num(n))} ${g.fr.replace(/^Signe/, 'signes')}` : g.fr;
    if (gr.depth > 0) head += n > 1 ? ' (sceaux intérieurs)' : ' (sceau intérieur)';
    const orient = [];
    const qty = (k) => (k === n ? (n > 1 ? 'tous ' : '') : num(k) + ' ');
    const pl = (k, w) => (k > 1 ? w + 's' : w);
    if (gr.facing.centre === n) orient.push('au centre du sceau');
    else if (gr.facing.neutre === n) orient.push(`${DIR_LABEL[g.dir]}, l'orientation est sans importance`);
    else {
      if (gr.facing.inward) orient.push(`${qty(gr.facing.inward)}${pl(gr.facing.inward, 'tourné')} vers le centre`);
      if (gr.facing.outward) orient.push(`${qty(gr.facing.outward)}${pl(gr.facing.outward, 'tourné')} vers l'extérieur`);
      if (gr.facing.sideways) orient.push(`${qty(gr.facing.sideways)}${pl(gr.facing.sideways, 'incliné')} (${Math.round(Math.abs(gr.meanTilt))}°)`);
    }
    if (n >= 2 && gr.facing.centre < n) {
      if (gr.symmetry.radial >= 2) orient.push(`symétrie radiale d'ordre ${gr.symmetry.radial}`);
      else if (gr.symmetry.bilateral) orient.push('symétrie bilatérale');
      else orient.push('disposition asymétrique');
    }
    let s = `${head}${orient.length ? ' — ' + orient.join(', ') : ''} : `;
    const invText = g.inverted ? g.inverted.replace(/^(inversés?|retournés?)( \([^)]*\))?, /i, '') : null;
    if (gr.glyph === 'regions') s += `${g.effect}.`;
    else if (gr.inverted && invText) s += `inversé${n > 1 ? 's' : ''} — ${invText}.`;
    else if (gr.inverted) s += `inversé${n > 1 ? 's' : ''} (effet inversé inconnu ; à l'endroit, ${g.effect}).`;
    else s += `${g.effect}.`;
    if (gr.glyph === 'regions') s += ' ' + regionsReading(gr);
    if (n > 1 && gr.maxSize > gr.minSize * 1.25 && DIRECTIONAL.has(gr.glyph)) {
      const i = gr.sizes.indexOf(gr.maxSize);
      s += ` Le signe vers ${compass(gr.angles[i])} est ${fmt1(gr.maxSize / gr.minSize)}× plus long que le plus court : ${g.size || 'sa poussée domine'}.`;
    } else if (g.size && n === 1 && gr.maxSize > 0.6) {
      s += ` Signe très long : ${g.size}.`;
    }
    if (g.count && n > 1) s += ` ${cap(g.count)}.`;
    if (gr.confidence !== null && gr.confidence < 0.55) s += ' (identification incertaine)';
    parts.push(s);
  }

  // Équilibre
  const balance = [];
  const unbalanced = A.dirCount >= 2 && A.imbalance.magnitude > 0.1;
  if (A.signGroups.length && A.globalSym.radial >= 2) balance.push(`Les signes forment une symétrie radiale d'ordre ${A.globalSym.radial}${unbalanced ? '' : ' : sort équilibré et stable'}.`);
  else if (A.signGroups.length && A.globalSym.bilateral) balance.push(`Les signes respectent une symétrie bilatérale${unbalanced ? '' : ' : le sort reste stable'}.`);
  else if (A.signGroups.some((g) => g.facing.centre < g.n)) { balance.push('Disposition asymétrique : sort valide mais potentiellement instable.'); warnings.push('asymétrie'); }
  if (unbalanced) {
    balance.push(`Poussées inégales (${Math.round(A.imbalance.magnitude * 100)} % de déséquilibre) : l'effet part de biais vers ${compass(A.imbalance.angle)} au lieu de rester vertical.`);
    warnings.push('déséquilibre');
  } else if (A.dirCount === 1) {
    balance.push(`Un seul signe directionnel : toute la poussée va vers ${compass(A.imbalance.angle)}.`);
  }
  if (A.rotation) balance.push(`Signes inclinés en sens ${A.rotation.sense} (${Math.round(A.rotation.tilt)}°) : l'effet tourne en vrille (rotation ${A.rotation.strength}, portée réduite d'autant).`);
  if (balance.length) parts.push(balance.join(' '));

  // Synthèse
  const synth = synthesis(A);
  if (synth) parts.push(synth);

  // Correspondance
  if (matchLine) {
    const sp = matchLine.spell;
    const label = `${sp.fr}${sp.en ? ` (${sp.en}` + (sp.jp ? `, ${sp.jp}` : '') + ')' : ''}`;
    const corrected = opts.match?.corrections?.length;
    if (matchLine.kind === 'exact') parts.push(`Sceau connu du grimoire : ${label} — ${sp.effect}`);
    else if (matchLine.kind === 'close') parts.push(`Lu comme « ${sp.fr} » (${Math.round(matchLine.score * 100)} % de concordance) — ${sp.effect}`);
    else parts.push(`Apparenté à « ${sp.fr} » (${Math.round(matchLine.score * 100)} % de composition commune).`);
    if (opts.match?.rival) parts.push(`Lecture incertaine : « ${opts.match.rival.fr} » explique le dessin presque aussi bien.`);
    const relus = opts.match?.corrections?.filter((c) => c.from) ?? [];
    const retrouves = opts.match?.corrections?.filter((c) => !c.from) ?? [];
    if (relus.length) parts.push(`${cap(num(relus.length))} tracé${relus.length > 1 ? 's' : ''} ${relus.length > 1 ? 'ont' : 'a'} été relu${relus.length > 1 ? 's' : ''} d'après ce sceau (le dessin était ambigu) : ${relus.map((c) => `vers ${compass(c.angle)}, ${GLYPHS[c.from].fr} → ${GLYPHS[c.to].fr}`).join(' ; ')}.`);
    if (retrouves.length) parts.push(`${cap(num(retrouves.length))} glyphe${retrouves.length > 1 ? 's' : ''} attendu${retrouves.length > 1 ? 's' : ''} par ce sceau ${retrouves.length > 1 ? 'ont' : 'a'} été retrouvé${retrouves.length > 1 ? 's' : ''} à l'endroit prévu, là où le découpage automatique n'avait rien isolé : ${retrouves.map((c) => `${GLYPHS[c.to].fr} vers ${compass(c.angle)}`).join(' ; ')}.`);
  } else if (A.sigils.length || A.signGroups.length) {
    parts.push('Composition inédite : aucun sceau connu du grimoire ne partage cette structure.');
  }

  const strays = A.unknown.filter((u) => u.stray), orphans = A.unknown.filter((u) => !u.stray);
  if (orphans.length) {
    parts.push(`${cap(num(orphans.length))} ${plural(orphans.length, 'symbole')} non identifié${orphans.length > 1 ? 's' : ''} (${orphans.map((u) => `vers ${compass(u.angle)}`).join(', ')}).`);
    warnings.push('symboles inconnus');
  }
  if (strays.length) {
    parts.push(`${cap(num(strays.length))} ${plural(strays.length, 'tracé')} ne trouve${strays.length > 1 ? 'nt' : ''} pas ${strays.length > 1 ? 'leur' : 'sa'} place dans ce sceau (${strays.map((u) => `vers ${compass(u.angle)}`).join(', ')}) : bavure, rature, ou symbole qui n'a pas encore été identifié.`);
    warnings.push('tracés écartés');
  }

  return { title, type, analysis: A, paragraphs: parts, warnings, match: matchLine };
}

function regionsReading(gr) {
  const n = gr.n;
  if (gr.facing.inward === n) return 'Toutes vers le centre : la magie ne se manifeste qu\'à l\'intérieur du cercle.';
  if (gr.facing.outward === n) return 'Toutes vers l\'extérieur : la magie se manifeste hors du cercle, jamais dedans.';
  // même direction absolue ?
  let vx = 0, vy = 0;
  for (const p of gr.pointing) { vx += Math.sin((p * Math.PI) / 180); vy += -Math.cos((p * Math.PI) / 180); }
  const len = Math.hypot(vx, vy) / n;
  if (len > 0.8) return `Toutes pointées vers ${compass(angleOf(vx, vy))} : la magie est projetée de ce côté.`;
  if (gr.facing.inward && gr.facing.outward) return 'Paires opposées face à face : la magie ne se manifeste que sur le cercle lui-même.';
  return 'Orientation mixte : la zone de manifestation est composite.';
}

function synthesis(A) {
  const el = A.elements.filter((e) => e !== 'forme');
  const elem = el.length ? (ELEMENT_LABEL[el[0]] || el[0]).toLowerCase() : null;
  const has = (id, inv = null) => A.signGroups.find((g) => g.glyph === id && (inv === null || g.inverted === inv));
  const bits = [];
  const subject = elem ? `l'élément ${elem}` : 'la matière ciblée';
  const shapeSig = A.sigils.find((s) => GLYPHS[s.glyph].decorative);
  const shape = shapeSig ? `, sculpté${elem ? '' : 'e'} en ${GLYPHS[shapeSig.glyph].fr.replace('Sigil décoratif : ', '').toLowerCase()}` : '';

  const lev = has('levitation', false), col = has('columns', false), colInv = has('columns', true), disp = has('dispersion');
  if (lev && lev.facing.inward === lev.n && lev.symmetry.radial >= 2) bits.push(`une sphère de ${subject}${shape} flotte au-dessus du sceau`);
  else if (lev && lev.n === 1) bits.push(`${subject} est poussé${elem ? '' : 'e'} vers ${compass(lev.angles[0])}, portée réglée par la longueur du signe`);
  else if (lev && lev.facing.outward) bits.push(`${subject} est soulevé${elem ? '' : 'e'} vers l'extérieur`);
  const unbalanced = A.dirCount >= 2 && A.imbalance.magnitude > 0.1;
  if (col && col.facing.inward === col.n && col.symmetry.radial >= 2 && !unbalanced) bits.push(`une colonne de ${subject}${shape} jaillit droit du sceau`);
  else if (col && col.n === 1 && col.maxSize > 0.6) bits.push(`${subject} est projeté${elem ? '' : 'e'} en colonne vers ${compass(col.angles[0])}`);
  else if (col && unbalanced) bits.push(`la colonne de ${subject} part de biais vers ${compass(A.imbalance.angle)}`);
  else if (col && col.n === 1) bits.push(`un flux léger de ${subject} circule au-dessus du sceau`);
  if (colInv) bits.push(`${subject} se répand horizontalement autour du sceau`);
  if (disp) bits.push(`${subject} déborde tout autour du cercle`);
  if (has('pulling', false)) bits.push(`${subject} est aspiré${elem ? '' : 'e'} vers le sceau${A.rotation ? ' en tourbillon' : ''}`);
  if (has('crushing', false)) bits.push('la matière touchée est broyée jusqu\'à l\'état de sable');
  if (has('crushing', true)) bits.push('la poudre présente se recompose temporairement en son objet d\'origine');
  if (has('rain', false)) bits.push(`${subject} tombe du ciel au-dessus du sceau`);
  if (has('rain', true)) bits.push(`une zone d'exclusion repousse ${subject}`);
  if (has('convergence')) bits.push('l\'effet se concentre en un point ou une surface rigide');
  if (has('orb')) bits.push('une sphère invisible retient ce qu\'on y verse');
  if (has('stretch')) bits.push('le solide touché devient un ruban souple');
  if (has('expansion', false)) bits.push('l\'objet porteur grandit');
  if (has('expansion', true)) bits.push('ce qui entre dans la zone rétrécit');
  if (has('dancing_puppets')) bits.push('l\'objet se pilote par la pensée, même de loin');
  if (has('concealment')) bits.push('la cible se fond dans l\'ombre');
  if (has('windows')) bits.push('le sceau ouvre un passage vers un autre lieu');
  if (has('piercing')) bits.push(`${subject} fuse en ${num(has('piercing').n)} projectile${has('piercing').n > 1 ? 's' : ''}`);
  if (has('sights_set')) bits.push('le lanceur vise par la pensée');
  if (has('glaives')) bits.push('la magie s\'enfonce dans le corps — sort interdit');
  if (has('stability') && !lev) bits.push('l\'ensemble reste d\'aplomb sur un plan horizontal');
  if (A.sigils.some((s) => s.glyph === 'repetition')) bits.push('tout ce que le sceau enferme revient sans cesse à son état d\'origine');
  if (!bits.length) return null;
  return `Effet attendu : ${bits.join(' ; ')}.`;
}

export { DIRECTIONAL };
