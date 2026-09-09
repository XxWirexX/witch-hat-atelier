// Lecture par hypothèses.
//
// Un tracé maladroit ne donne pas toujours le bon glyphe en tête de liste, mais
// le bon glyphe reste presque toujours dans les candidats classés. Plutôt que de
// figer une identification par tracé puis de chercher le sceau correspondant, on
// confronte l'ensemble des candidats aux sceaux du grimoire : chaque sceau
// « réclame » les tracés qu'il explique, et le mieux-disant l'emporte.
//
// Une hypothèse retenue ré-identifie les tracés qu'elle explique — en gardant
// l'orientation et la taille mesurées, jamais celles attendues, pour que la
// lecture (équilibre, inversion, brèche) reste celle du dessin.

import { GLYPHS } from './glyphs.js';
import { flatten } from './seal.js';
import { SPELLS } from './spells.js';
import { assembleSeal, recognize } from './recognizer.js';
import { readSeal } from './interpreter.js';

const UNASSIGNED_W = 1.5;
// Un sceau dense mal dessiné perd forcément des glyphes (traits fondus, signes
// minuscules) : un emplacement introuvable coûte moins qu'un tracé inexpliqué.
const MISSING_DISCOUNT = 0.55;
const weightOf = (glyph) => (GLYPHS[glyph]?.kind === 'sign' ? 1 : 2.5);

// Confiance de chaque tracé pour chaque glyphe envisageable. `rescore` permet
// d'interroger un glyphe absent des candidats retenus (le calcul est mis en cache).
function candidatesOf(el, rescore) {
  const m = new Map();
  for (const a of el.alternatives || []) if (!m.has(a.glyph)) m.set(a.glyph, a);
  if (!m.has(el.glyph)) m.set(el.glyph, { glyph: el.glyph, confidence: el.confidence, rot: el.rot, inverted: el.inverted, size: el.size });
  if (!rescore) return m;
  return {
    get(glyph) {
      if (m.has(glyph)) return m.get(glyph);
      const a = rescore(el, glyph);
      m.set(glyph, a);
      return a;
    },
  };
}

const gauss = (x, s) => Math.exp(-((x / s) ** 2));
const wrap180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;

// Un sceau peut être dessiné dans n'importe quelle orientation, mais tous ses
// glyphes tournent ensemble : l'écart angulaire entre un tracé et l'emplacement
// qu'il occupe doit être le même partout. On estime cette rotation globale sur
// les meilleures paires, puis on s'en sert comme contrainte.
function estimateRotation(pairs, groups, slots) {
  let sx = 0, sy = 0;
  for (const p of pairs) {
    const d = ((groups[p.i].angle - slots[p.s].angle) * Math.PI) / 180;
    sx += p.base * Math.cos(d); sy += p.base * Math.sin(d);
  }
  const strength = Math.hypot(sx, sy) / Math.max(1e-6, pairs.reduce((a, p) => a + p.base, 0));
  return { theta: (Math.atan2(sy, sx) * 180) / Math.PI, strength };
}

// Affectation gloutonne des tracés aux emplacements d'un sceau, puis score de
// Dice pondéré : pénalise autant les glyphes manquants que les tracés en trop.
// Une paire ne vaut que si le glyphe, la distance au centre, la taille et
// l'orientation concordent — la géométrie sépare des sorts de composition voisine.
export function scoreSpell(groups, cands, spell) {
  const flat = flatten(spell.seal);
  const slots = flat.elements.map((el) => ({
    glyph: el.glyph, inverted: el.inverted, w: weightOf(el.glyph),
    // local : comparable à un tracé situé dans le même cercle ;
    // absolu : où aller chercher l'encre dans l'image
    dist: Math.hypot(el.localX, el.localY), size: el.localSize,
    angle: ((Math.atan2(el.localX, -el.localY) * 180) / Math.PI + 360) % 360,
    x: el.x, y: el.y, absSize: el.size,
    absAngle: ((Math.atan2(el.x, -el.y) * 180) / Math.PI + 360) % 360,
  }));
  const pairs = [];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    for (let s = 0; s < slots.length; s++) {
      const a = cands[i].get(slots[s].glyph);
      if (!a || a.confidence <= 0.05) continue;
      const geo = gauss(g.dist - slots[s].dist, 0.3) * gauss(Math.log(Math.max(g.size, 0.02) / Math.max(slots[s].size, 0.02)), 0.75);
      const base = a.confidence * (0.35 + 0.65 * geo);
      if (base > 0.05) pairs.push({ base, i, s, alt: a });
    }
  }
  const rot = estimateRotation(pairs, groups, slots);
  for (const p of pairs) {
    const near = slots[p.s].dist < 0.15 ? 1 : gauss(wrap180(groups[p.i].angle - slots[p.s].angle - rot.theta), 45);
    p.cost = p.base * (1 - 0.5 * rot.strength + 0.5 * rot.strength * near);
  }
  pairs.sort((p, q) => q.cost - p.cost);
  const takenG = new Set(), takenS = new Set(), assign = [];
  let overlap = 0, groupW = 0, slotW = 0;
  for (const p of pairs) {
    if (takenG.has(p.i) || takenS.has(p.s)) continue;
    takenG.add(p.i); takenS.add(p.s);
    assign.push({ group: p.i, slot: slots[p.s], confidence: p.alt.confidence, quality: p.cost, alt: p.alt });
    overlap += slots[p.s].w * p.cost;
    groupW += slots[p.s].w;
    slotW += slots[p.s].w;
  }
  // un tracé inexpliqué pèse d'autant plus qu'il est net : une tache n'est pas un glyphe
  for (let i = 0; i < groups.length; i++) if (!takenG.has(i)) groupW += UNASSIGNED_W * Math.max(0.25, groups[i].confidence);
  for (let s = 0; s < slots.length; s++) if (!takenS.has(s)) slotW += slots[s].w * MISSING_DISCOUNT;
  const denom = groupW + slotW;
  const score = denom ? (2 * overlap) / denom : (groups.length ? 0 : 1);
  const unmatched = slots.filter((_, s) => !takenS.has(s));
  return { spell, score, assign, slots, unmatched, overlap, groupW, matchedW: slotW - unmatched.reduce((a, sl) => a + sl.w * MISSING_DISCOUNT, 0), slotCount: slots.length, missing: unmatched.length, rotation: rot };
}

// Vérification d'une hypothèse : pour chaque glyphe attendu qu'aucun tracé
// n'explique, on regarde s'il y a de l'encre à l'endroit prévu (le sceau étant
// tourné d'un angle estimé). Rien n'est inventé : sans encre, rien n'est ajouté.
export function verifyHypothesis(rec, hyp, groups, opts = {}) {
  if (!rec.probeAt || !hyp.unmatched.length) return { found: [], score: hyp.score };
  const minConf = opts.probeConfidence ?? 0.45;
  const theta = hyp.rotation.theta, c = Math.cos((theta * Math.PI) / 180), s = Math.sin((theta * Math.PI) / 180);
  const claimed = new Set();
  for (const a of hyp.assign) for (const p of rec.pixelsOf(groups[a.group])) claimed.add(p);
  const found = [];
  let overlap = hyp.overlap, slotW = hyp.matchedW;
  for (const slot of hyp.unmatched) {
    const r = rec.probeAt(slot.x * c - slot.y * s, slot.x * s + slot.y * c, slot.absSize, slot.glyph, slot.absAngle + theta, claimed);
    if (r && r.confidence >= minConf) {
      for (const p of r.pix) claimed.add(p);
      found.push({ slot, ...r });
      overlap += slot.w * r.confidence;
      slotW += slot.w;
    } else slotW += slot.w * MISSING_DISCOUNT;
  }
  const denom = hyp.groupW + slotW;
  return { found, score: denom ? (2 * overlap) / denom : hyp.score };
}

export function spellHypotheses(elements, rescore = null) {
  const groups = elements.filter((e) => !e.ignored);
  const cands = groups.map((e) => candidatesOf(e, rescore));
  const out = SPELLS.map((sp) => scoreSpell(groups, cands, sp));
  out.sort((a, b) => b.score - a.score);
  return { groups, ranked: out };
}

// Applique une hypothèse : ré-identifie les tracés qu'elle explique et
// reconstruit le sceau. Renvoie la liste des corrections apportées.
export function applyHypothesis(rec, hyp, groups, opts = {}) {
  const minConf = opts.minConfidence ?? 0.25;
  const keepStray = opts.keepStray ?? 0.75;
  const corrections = [];
  // Un tracé qu'aucun emplacement du sceau ne réclame n'est pas un glyphe de ce
  // sort : sauf s'il est franchement net (le dessinateur a pu en ajouter un), on
  // l'écarte au lieu de le faire figurer dans la lecture.
  const claimedGroups = new Set(hyp.assign.map((a) => a.group));
  const strays = [];
  for (let i = 0; i < groups.length; i++) {
    if (claimedGroups.has(i) || groups[i].confidence >= keepStray) continue;
    groups[i].ignored = true;
    groups[i].stray = true;
    strays.push(groups[i]);
  }
  rec.strays = strays;
  for (const a of hyp.assign) {
    const el = groups[a.group];
    if (!el || a.confidence < minConf) continue;
    if (el.glyph === a.slot.glyph) continue;
    const alt = a.alt;
    corrections.push({ from: el.glyph, to: a.slot.glyph, confidence: a.confidence, angle: el.angle });
    el.glyph = a.slot.glyph;
    if (alt) { el.rot = alt.rot; el.inverted = alt.inverted; el.size = alt.size; }
    el.confidence = Math.max(el.confidence, a.confidence);
    el.hypothesized = true;
  }
  // glyphes retrouvés à l'endroit prévu : ils entrent dans le sceau, signalés
  for (const f of hyp.found || []) {
    rec.elements.push({
      glyph: f.glyph, x: f.x, y: f.y, size: f.size, rot: f.rot, inverted: f.inverted, tilt: 0,
      confidence: f.confidence, score: 0, dist: Math.hypot(f.x, f.y),
      angle: ((Math.atan2(f.x, -f.y) * 180) / Math.PI + 360) % 360,
      alternatives: [{ glyph: f.glyph, confidence: f.confidence, inverted: f.inverted, rot: f.rot, size: f.size }],
      box: null, parent: null, probe: -1, recovered: true,
    });
    corrections.push({ from: null, to: f.glyph, confidence: f.confidence, angle: ((Math.atan2(f.x, -f.y) * 180) / Math.PI + 360) % 360 });
  }
  rec.seal = assembleSeal(rec);
  return corrections;
}

// Lecture complète d'une reconnaissance : hypothèses, ré-identification si le
// grimoire explique nettement mieux le dessin, puis lecture du sceau.
export function readRecognition(rec, opts = {}) {
  const accept = opts.accept ?? 0.55;
  const margin = opts.margin ?? 0.03;
  const base = { unknown: rec.unknown.map((u) => ({ angle: u.angle })) };
  if (!rec.ok) return null;
  const { groups, ranked } = spellHypotheses(rec.elements, rec.rescore);
  // vérification des meilleures pistes : un sceau dense dont le découpage a
  // fondu la moitié des signes ne se distingue qu'en allant les chercher
  for (const h of ranked.slice(0, opts.verify ?? 6)) {
    const v = verifyHypothesis(rec, h, groups, opts);
    h.found = v.found;
    h.score = Math.max(h.score, v.score);
  }
  ranked.sort((a, b) => b.score - a.score);
  const best = ranked[0], second = ranked[1];
  if (!best || best.score < accept) {
    return { ...readSeal(rec.seal, base), hypothesis: null, candidates: ranked.slice(0, 4) };
  }
  const corrections = applyHypothesis(rec, best, groups, opts);
  base.unknown = [...base.unknown, ...(rec.strays ?? []).map((s) => ({ angle: s.angle, stray: true }))];
  // deux sceaux du grimoire peuvent expliquer le dessin presque aussi bien :
  // on nomme le meilleur, sans prétendre à la certitude
  const ambiguous = second && best.score - second.score < margin;
  const kind = !ambiguous && best.score >= (opts.exact ?? 0.9) && !corrections.length ? 'exact' : 'close';
  const rival = ambiguous ? second.spell : null;
  const reading = readSeal(rec.seal, { ...base, match: { kind, spell: best.spell, score: best.score, corrections, rival } });
  return { ...reading, hypothesis: { spell: best.spell, score: best.score, corrections, rival }, candidates: ranked.slice(0, 4) };
}

// Lecture d'une image : le bon découpage dépend de la densité du sceau — sur un
// sceau chargé, deux signes voisins fusionnent ; sur un sceau aéré, un sigil en
// plusieurs traits se disperse. On lit à plusieurs échelles de regroupement et
// on garde l'interprétation qui explique le mieux le dessin.
export function readImage(mask, opts = {}) {
  const scales = opts.mergeScales ?? [1, 0.5, 1.7];
  let best = null;
  for (const mergeScale of scales) {
    const rec = recognize(mask, { ...opts, mergeScale });
    if (!rec.ok) continue;
    const reading = readRecognition(rec, opts);
    const quality = reading?.hypothesis?.score ?? 0;
    if (!best || quality > best.quality) best = { rec, reading, quality, mergeScale };
  }
  return best;
}
