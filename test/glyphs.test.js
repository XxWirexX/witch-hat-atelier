import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLYPHS, SIGN_IDS, SIGIL_IDS, DECORATIVE_IDS, placedStrokes } from '../src/glyphs.js';
import { glyphSVG, rasterizeGlyph } from '../src/seal.js';
import { bbox } from '../src/geometry.js';

test('le dictionnaire couvre les 46 signes et les sigils documentés', () => {
  assert.equal(SIGN_IDS.length, 46);
  assert.ok(SIGIL_IDS.length >= 22, `sigils : ${SIGIL_IDS.length}`);
  assert.ok(DECORATIVE_IDS.length >= 11, `décoratifs : ${DECORATIVE_IDS.length}`);
  for (const id of ['columns', 'levitation', 'convergence', 'crushing', 'pulling', 'regions', 'glaives']) assert.ok(GLYPHS[id], id);
  for (const id of ['fire', 'water', 'earth', 'wind', 'light', 'repetition']) assert.ok(GLYPHS[id], id);
});

test('chaque glyphe a des métadonnées françaises complètes et un dessin dans la boîte 100×100', () => {
  for (const [id, g] of Object.entries(GLYPHS)) {
    assert.ok(g.fr && g.fr.length > 3, `${id} : nom fr`);
    assert.ok(g.effect && g.effect.length > 10, `${id} : effet`);
    assert.ok(['sign', 'sigil', 'decorative'].includes(g.kind), `${id} : kind`);
    assert.ok(g.shape.strokes.length > 0, `${id} : traits`);
    const bb = bbox(g.shape.strokes, g.shape.dots);
    assert.ok(bb.x0 >= 0 && bb.y0 >= 0 && bb.x1 <= 100 && bb.y1 <= 100, `${id} : dépasse la boîte (${bb.x0},${bb.y0})-(${bb.x1},${bb.y1})`);
    assert.ok(bb.w >= 25 || bb.h >= 25, `${id} : trop petit`);
    if (g.kind === 'sign') assert.ok(['directional', 'semi', 'non', 'asymmetric', 'unknown'].includes(g.dir), `${id} : dir`);
  }
});

test('un signe inversé est le signe tourné de 180° (sauf forme inversée propre)', () => {
  const a = placedStrokes('columns', 0, true).strokes;
  const b = placedStrokes('columns', 180, false).strokes;
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < a[i].length; j++) {
    assert.ok(Math.abs(a[i][j][0] - b[i][j][0]) < 1e-9 && Math.abs(a[i][j][1] - b[i][j][1]) < 1e-9);
  }
  assert.ok(GLYPHS.rain.invertedShape, 'la Pluie a une forme inversée dédiée');
});

test('le rendu SVG et la rastérisation produisent quelque chose pour chaque glyphe', () => {
  for (const id of Object.keys(GLYPHS)) {
    const svg = glyphSVG(id, { size: 48 });
    assert.ok(svg.startsWith('<svg') && svg.includes('<path'), id);
    const ras = rasterizeGlyph(id, { size: 40 });
    let ink = 0;
    for (const v of ras.data) ink += v;
    assert.ok(ink > 30, `${id} : ${ink} pixels`);
  }
});
