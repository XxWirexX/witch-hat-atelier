import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rasterizeSeal, makeSeal, sigil, ringOf } from '../src/seal.js';
import { SPELL_BY_ID } from '../src/spells.js';
import { EXERCISES, EXERCISE_BY_ID, gradeExercise, ringShape, angleDiff } from '../src/atelier.js';

const M = (seal, opts = {}) => rasterizeSeal(seal, { size: 640, thickness: 4, ...opts });
const critOf = (res, id) => res.criteria.find((c) => c.id === id);
const okOf = (res, id) => critOf(res, id)?.ok;

// Trace une ellipse directement dans un masque : c'est le défaut le plus
// courant d'un cercle à main levée, et il faut pouvoir le mesurer.
function ellipseMask(size, rx, ry, { gapAt = null, gapWidth = 0 } = {}) {
  const data = new Uint8Array(size * size);
  const cx = size / 2, cy = size / 2;
  for (let a = 0; a < 3600; a++) {
    const deg = a / 10;
    if (gapAt !== null && Math.abs(angleDiff(deg, gapAt)) < gapWidth / 2) continue;
    const t = (deg * Math.PI) / 180;
    for (let w = -2; w <= 2; w++) {
      const x = Math.round(cx + (rx + w) * Math.cos(t));
      const y = Math.round(cy + (ry + w) * Math.sin(t));
      if (x >= 0 && y >= 0 && x < size && y < size) data[y * size + x] = 1;
    }
  }
  return { width: size, height: size, data };
}

test('les six exercices vont du cercle au sceau entier', () => {
  assert.equal(EXERCISES.length, 6);
  assert.deepEqual(EXERCISES.map((e) => e.kind), ['circle', 'gap', 'sigil', 'sign', 'crown', 'seal']);
  for (const ex of EXERCISES) {
    assert.ok(ex.brief && ex.why, `${ex.id} : énoncé ou justification manquants`);
  }
});

test('un cercle rond passe, un cercle ovale est mesuré comme tel', () => {
  const round = gradeExercise(EXERCISE_BY_ID.cercle, M(makeSeal([])));
  assert.equal(round.passed, true, JSON.stringify(round.criteria));

  // 260 × 200 : un tiers plus large que haut.
  const oval = gradeExercise(EXERCISE_BY_ID.cercle, ellipseMask(640, 260, 200));
  assert.equal(okOf(oval, 'rond'), false, 'ovale accepté comme rond');
  assert.match(critOf(oval, 'rond').detail, /ovale de \d+ %/);
  assert.match(critOf(oval, 'rond').detail, /largeur/);
});

test('un cercle qui ne se referme pas est refusé', () => {
  const open = gradeExercise(EXERCISE_BY_ID.cercle, ellipseMask(640, 230, 230, { gapAt: 90, gapWidth: 50 }));
  assert.equal(okOf(open, 'ferme'), false);
  assert.match(critOf(open, 'ferme').detail, /il manque \d+°/);
});

test('la brèche est jugée sur sa présence et sur sa place', () => {
  const good = gradeExercise(EXERCISE_BY_ID.breche, M(makeSeal([], { gap: { angle: 180, width: 40 } })));
  assert.equal(good.passed, true, JSON.stringify(good.criteria));

  const misplaced = gradeExercise(EXERCISE_BY_ID.breche, M(makeSeal([], { gap: { angle: 20, width: 40 } })));
  assert.equal(okOf(misplaced, 'breche'), true, 'la brèche existe bien');
  assert.equal(okOf(misplaced, 'breche-place'), false, 'brèche mal placée acceptée');

  // Un cercle fermé ne satisfait pas un exercice qui demande une ouverture…
  const closed = gradeExercise(EXERCISE_BY_ID.breche, M(makeSeal([])));
  assert.equal(okOf(closed, 'breche'), false);
  // …et on ne lui reproche pas d'être fermé, ce serait contradictoire.
  assert.equal(critOf(closed, 'ferme'), undefined);
});

test('le sigil est jugé sur son identité, sa position et sa taille', () => {
  const good = gradeExercise(EXERCISE_BY_ID.sigil, M(makeSeal([sigil('fire', { size: 0.5 })])));
  assert.equal(good.passed, true, JSON.stringify(good.criteria));

  const wrong = gradeExercise(EXERCISE_BY_ID.sigil, M(makeSeal([sigil('water', { size: 0.5 })])));
  assert.equal(okOf(wrong, 'bon-glyphe'), false, 'un autre sigil a été accepté');
  assert.match(critOf(wrong, 'bon-glyphe').detail, /Eau/);
});

test('un signe retourné est repéré comme tel', () => {
  const good = gradeExercise(EXERCISE_BY_ID.signe, M(makeSeal(ringOf('columns', 1, { start: 0, dist: 0.74, size: 0.3 }))));
  assert.equal(okOf(good, 'sens'), true, JSON.stringify(good.criteria));

  const upside = gradeExercise(EXERCISE_BY_ID.signe, M(makeSeal(ringOf('columns', 1, { start: 0, dist: 0.74, size: 0.3, inverted: true }))));
  assert.equal(okOf(upside, 'sens'), false, 'signe retourné accepté');
  assert.match(critOf(upside, 'sens').detail, /invers/);
});

test('un signe posé au mauvais angle est mesuré en degrés', () => {
  const off = gradeExercise(EXERCISE_BY_ID.signe, M(makeSeal(ringOf('columns', 1, { start: 70, dist: 0.74, size: 0.3 }))));
  assert.equal(okOf(off, 'angle'), false);
  assert.match(critOf(off, 'angle').detail, /décalé de \d+°/);
});

test('la couronne est jugée sur la régularité, pas sur l\'intention', () => {
  const even = gradeExercise(EXERCISE_BY_ID.couronne, M(makeSeal(ringOf('levitation', 4, { dist: 0.72, size: 0.32 }))));
  assert.equal(even.passed, true, JSON.stringify(even.criteria));

  // Quatre signes, mais l'un d'eux nettement plus long : le sceau part de son côté.
  const uneven = gradeExercise(EXERCISE_BY_ID.couronne, M(makeSeal(ringOf('levitation', 4, { dist: 0.72, sizes: [0.32, 0.6, 0.32, 0.32] }))));
  assert.equal(okOf(uneven, 'longueur'), false, 'longueurs inégales acceptées');
  assert.match(critOf(uneven, 'longueur').detail, /d'écart/);

  const three = gradeExercise(EXERCISE_BY_ID.couronne, M(makeSeal(ringOf('levitation', 3, { dist: 0.72, size: 0.32 }))));
  assert.equal(okOf(three, 'nombre'), false, '3 signes acceptés là où on en demande 4');
});

test('le sceau entier est corrigé par le lecteur, et rend sa lecture', () => {
  const good = gradeExercise(EXERCISE_BY_ID.sceau, M(SPELL_BY_ID.pyreball.seal, { size: 700 }));
  assert.equal(good.passed, true, JSON.stringify(good.criteria));
  assert.ok(good.reading?.paragraphs?.length, 'aucune lecture rendue');

  const other = gradeExercise(EXERCISE_BY_ID.sceau, M(SPELL_BY_ID.watershot.seal, { size: 700 }));
  assert.equal(okOf(other, 'reconnu'), false, 'un autre sort a été accepté');
});

test('une feuille blanche ne réussit aucun exercice', () => {
  const blank = { width: 400, height: 400, data: new Uint8Array(160000) };
  for (const ex of EXERCISES) {
    const res = gradeExercise(ex, blank);
    assert.equal(res.passed, false, `${ex.id} réussi sur une feuille vide`);
    assert.ok(res.criteria.length > 0, `${ex.id} : aucun critère rendu`);
  }
});

test('ringShape sépare l\'ovalisation du tremblement', () => {
  const ring = { cx: 320, cy: 320, r: 230 };
  const round = ringShape(ellipseMask(640, 230, 230), ring);
  assert.ok(round.ovality < 0.03, `cercle rond mesuré ovale à ${round.ovality}`);
  assert.ok(round.wobble < 0.03, `cercle net mesuré tremblé à ${round.wobble}`);

  const oval = ringShape(ellipseMask(640, 260, 200), { cx: 320, cy: 320, r: 230 });
  assert.ok(oval.ovality > 0.15, `ovale franc mesuré à ${oval.ovality}`);
  assert.ok(Math.abs(oval.axis) < 20, `grand axe attendu horizontal, mesuré à ${oval.axis}°`);
});
