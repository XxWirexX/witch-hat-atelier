import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rasterizeSeal, flatten, makeSeal, sigil, ringOf } from '../src/seal.js';
import { recognize, maskFromImageData, otsu, fitCircle, relabel } from '../src/recognizer.js';
import { readSeal } from '../src/interpreter.js';
import { readImage } from '../src/hypothesis.js';
import { SPELL_BY_ID } from '../src/spells.js';

const multiset = (list) => { const m = new Map(); for (const k of list) m.set(k, (m.get(k) || 0) + 1); return m; };
const keyOf = (e) => `${e.glyph}${e.inverted ? '!' : ''}`;

function expectRecognized(id, opts = {}) {
  const sp = SPELL_BY_ID[id];
  const mask = rasterizeSeal(sp.seal, { size: opts.size ?? 640, thickness: opts.thickness ?? 3.5, rotate: opts.rotate ?? 0, offsetX: opts.offsetX ?? 0, offsetY: opts.offsetY ?? 0 });
  if (opts.noise) for (let i = 0; i < mask.data.length; i += opts.noise) mask.data[i] = 1;
  const rec = recognize(mask);
  assert.ok(rec.ok, `${id} : ${rec.reason}`);
  const truth = multiset(flatten(sp.seal).elements.map(keyOf));
  const got = multiset(flatten(rec.seal).elements.map(keyOf));
  for (const [k, v] of truth) assert.equal(got.get(k) || 0, v, `${id} : ${k} attendu ${v}, obtenu ${got.get(k) || 0}`);
  assert.equal(flatten(rec.seal).elements.length, flatten(sp.seal).elements.length, `${id} : glyphes en trop`);
  const read = readSeal(rec.seal);
  assert.ok(read.match && read.match.kind === 'exact' && read.match.spell.id === (opts.matchAs || id), `${id} : lecture → ${read.match?.spell.id} (${read.match?.kind})`);
  return rec;
}

test('sceaux de base reconnus depuis un rendu propre', () => {
  for (const id of ['pyreball', 'watershot', 'sylph_shoes', 'wall_breaker', 'integration', 'rainbringer', 'grasping_wind', 'light_beam', 'water_orb', 'crystal_shard', 'boulder_stretch', 'borrowshade', 'billow_cluster', 'bird_of_light', 'purify']) {
    expectRecognized(id);
  }
});

test('la brèche du cercle est détectée avec son orientation', () => {
  const rec = expectRecognized('pyreball');
  assert.ok(rec.ring.gap, 'brèche');
  assert.ok(Math.abs(rec.ring.gap.angle - 205) < 8, `angle ${rec.ring.gap.angle}`);
  const closed = recognize(rasterizeSeal(SPELL_BY_ID.integration.seal, { size: 600 }));
  assert.equal(closed.ring.gap, null);
});

test('robuste à la rotation, au décalage, à l\'épaisseur du trait et au bruit', () => {
  expectRecognized('pyreball', { rotate: 23, offsetX: 18, offsetY: -12, thickness: 6, noise: 911 });
  expectRecognized('wall_breaker', { rotate: -35, size: 900, thickness: 7 });
  expectRecognized('grasping_wind', { rotate: 90, size: 500, thickness: 2.5 });
});

// Deux glyphes du dictionnaire ne diffèrent que par un losange : le Sigil de
// Lumière et le Signe de Sélection. Isolé, le tracé est ambigu — c'est le sceau
// qui tranche, et c'est bien la lecture qui doit le faire.
test('un glyphe ambigu isolément est tranché par le sceau qui le contient', () => {
  const out = readImage(rasterizeSeal(SPELL_BY_ID.expansion.seal, { size: 700, thickness: 4 }));
  assert.equal(out.reading.match?.spell.id, 'expansion');
  assert.ok(flatten(out.rec.seal).elements.some((e) => e.glyph === 'selection'), 'Signe de Sélection rétabli');
});

// La garantie rendue à l'utilisateur porte sur l'identification du sort, pas sur
// un découpage parfait : sous perturbation, c'est la lecture qui doit tenir.
test('un sceau perturbé reste identifié même si le découpage est imparfait', () => {
  for (const [id, opts] of [['sylph_shoes', { rotate: 12, thickness: 5, noise: 1201 }], ['pyreball', { rotate: -50, thickness: 7 }], ['integration', { rotate: 33, size: 520, thickness: 2.5 }]]) {
    const sp = SPELL_BY_ID[id];
    const mask = rasterizeSeal(sp.seal, { size: opts.size ?? 640, thickness: opts.thickness ?? 3.5, rotate: opts.rotate ?? 0 });
    if (opts.noise) for (let i = 0; i < mask.data.length; i += opts.noise) mask.data[i] = 1;
    const out = readImage(mask);
    assert.ok(out?.reading?.match, `${id} : aucune identification`);
    assert.equal(out.reading.match.spell.id, id, `${id} → ${out.reading.match.spell.id}`);
    assert.ok(['exact', 'close'].includes(out.reading.match.kind), `${id} : ${out.reading.match.kind}`);
  }
});

test('les signes inversés sont distingués des signes à l\'endroit', () => {
  const a = recognize(rasterizeSeal(SPELL_BY_ID.crystal_shard.seal, { size: 640 }));
  assert.ok(flatten(a.seal).elements.filter((e) => e.glyph === 'columns').every((e) => e.inverted));
  const b = recognize(rasterizeSeal(SPELL_BY_ID.light_beam.seal, { size: 640 }));
  assert.ok(flatten(b.seal).elements.filter((e) => e.glyph === 'columns').every((e) => !e.inverted));
});

test('sceaux imbriqués : cercle intérieur et sigil enfant', () => {
  const rec = recognize(rasterizeSeal(SPELL_BY_ID.vapor_bubble.seal, { size: 760, thickness: 4 }));
  assert.equal(rec.innerRings.length, 1);
  const inner = rec.seal.children[0];
  assert.ok(inner && inner.seal.elements.some((e) => e.glyph === 'water'), 'Eau dans le sceau intérieur');
});

test('correction manuelle : relabel recompose le sceau', () => {
  const rec = recognize(rasterizeSeal(SPELL_BY_ID.watershot.seal, { size: 600 }));
  const col = rec.elements.find((e) => e.glyph === 'columns');
  relabel(rec, col, 'levitation', false);
  const glyphs = flatten(rec.seal).elements.map((e) => e.glyph);
  assert.ok(glyphs.includes('levitation'));
  assert.equal(glyphs.filter((g) => g === 'columns').length, 3);
});

test('un cercle nu et une image vide', () => {
  const rec = recognize(rasterizeSeal(makeSeal([]), { size: 400 }));
  assert.ok(rec.ok);
  assert.equal(rec.elements.length, 0);
  assert.match(readSeal(rec.seal).paragraphs.join(' '), /explosion/);
  const empty = recognize({ width: 50, height: 50, data: new Uint8Array(2500) });
  assert.equal(empty.ok, false);
});

test('seuillage : encre sombre sur fond clair et inverse (blanc sur noir)', () => {
  const mask = rasterizeSeal(makeSeal([sigil('obliviation', { size: 0.5 })]), { size: 200 });
  const w = mask.width, h = mask.height;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { const v = mask.data[i] ? 30 : 235; rgba.set([v, v, v, 255], i * 4); }
  const m1 = maskFromImageData({ width: w, height: h, data: rgba });
  assert.equal(m1.inverted, false);
  let same = 0; for (let i = 0; i < w * h; i++) if (m1.data[i] === mask.data[i]) same++;
  assert.ok(same / (w * h) > 0.99);
  for (let i = 0; i < w * h; i++) { const v = mask.data[i] ? 235 : 30; rgba.set([v, v, v, 255], i * 4); }
  const m2 = maskFromImageData({ width: w, height: h, data: rgba });
  assert.equal(m2.inverted, true);
  same = 0; for (let i = 0; i < w * h; i++) if (m2.data[i] === mask.data[i]) same++;
  assert.ok(same / (w * h) > 0.99);
  assert.ok(otsu(new Float32Array([0, 0, 0, 255, 255, 255])) > 0);
});

test('ajustement de cercle (Kåsa)', () => {
  const W = 100, pix = [];
  for (let a = 0; a < 360; a += 3) pix.push(Math.round(50 + 30 * Math.sin((a * Math.PI) / 180)) * W + Math.round(40 + 30 * Math.cos((a * Math.PI) / 180)));
  const c = fitCircle(pix, W);
  assert.ok(Math.abs(c.cx - 40) < 1 && Math.abs(c.cy - 50) < 1 && Math.abs(c.r - 30) < 1, JSON.stringify(c));
  assert.ok(c.rms < 1);
});

test('un sceau composé à la main est lu comme attendu', () => {
  const seal = makeSeal([sigil('fire', { size: 0.5 }), ...ringOf('columns', 4, { dist: 0.74, size: 0.3 })]);
  const rec = recognize(rasterizeSeal(seal, { size: 640 }));
  const r = readSeal(rec.seal);
  assert.match(r.paragraphs.join(' '), /colonne de l'élément feu jaillit droit/);
});
