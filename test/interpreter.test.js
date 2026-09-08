import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSeal, sigil, ringOf, at } from '../src/seal.js';
import { readSeal, analyzeSeal, compass } from '../src/interpreter.js';
import { SPELLS } from '../src/spells.js';

const text = (r) => r.paragraphs.join('\n');

test('chaque sceau du grimoire est reconnu comme lui-même (ou comme sa variante de base)', () => {
  const variants = { watershot_unbalanced: 'watershot', grasping_wind_twist: 'grasping_wind' };
  for (const sp of SPELLS) {
    const r = readSeal(sp.seal);
    assert.ok(r.match && r.match.kind === 'exact', `${sp.id} : pas de correspondance exacte`);
    assert.ok([sp.id, variants[sp.id]].includes(r.match.spell.id), `${sp.id} → ${r.match.spell.id}`);
    assert.ok(r.paragraphs.length >= 2, `${sp.id} : lecture trop courte`);
  }
});

test('Boule de feu : sphère de feu flottante, symétrie radiale, cercle ouvert', () => {
  const sp = SPELLS.find((s) => s.id === 'pyreball');
  const r = readSeal(sp.seal);
  const t = text(r);
  assert.equal(r.title, 'Sceau de Boule de feu');
  assert.match(t, /cercle est ouvert/);
  assert.match(t, /Sigil de Feu/);
  assert.match(t, /Quatre signes de Lévitation/);
  assert.match(t, /symétrie radiale d'ordre 4/);
  assert.match(t, /sphère de l'élément feu flotte/);
});

test('une Colonne plus longue fait partir le jet de son côté (leçon d\'Agott, ch. 3)', () => {
  const seal = makeSeal([sigil('water', { size: 0.5 }), ...ringOf('columns', 4, { dist: 0.74, sizes: [0.3, 0.5, 0.3, 0.3] })]);
  const r = readSeal(seal);
  const t = text(r);
  assert.match(t, /1,7× plus long/);
  assert.match(t, /part de biais vers la droite/);
  assert.ok(r.warnings.includes('déséquilibre'));
  const balanced = readSeal(makeSeal([sigil('water', { size: 0.5 }), ...ringOf('columns', 4, { dist: 0.74, size: 0.3 })]));
  assert.match(text(balanced), /jaillit droit du sceau/);
  assert.ok(!balanced.warnings.includes('déséquilibre'));
});

test('inversion : Broyage inversé recompose (Intégration) ; Broyage à l\'endroit pulvérise (Brise-mur)', () => {
  const wb = text(readSeal(SPELLS.find((s) => s.id === 'wall_breaker').seal));
  const it = text(readSeal(SPELLS.find((s) => s.id === 'integration').seal));
  assert.match(wb, /broyée jusqu'à l'état de sable/);
  assert.match(it, /inversés — il rassemble/);
  assert.match(it, /se recompose temporairement/);
});

test('signes inclinés : rotation en vrille', () => {
  const r = readSeal(SPELLS.find((s) => s.id === 'grasping_wind_twist').seal);
  assert.ok(r.analysis.rotation, 'rotation détectée');
  assert.match(text(r), /tourne en vrille/);
  const straight = readSeal(SPELLS.find((s) => s.id === 'grasping_wind').seal);
  assert.equal(straight.analysis.rotation, null);
});

test('Régions : toutes vers l\'extérieur → hors du cercle ; toutes du même côté → projection', () => {
  const out = readSeal(makeSeal([sigil('aeriforms', { size: 0.5 }), ...ringOf('regions', 8, { dist: 0.8, size: 0.14, inverted: true })]));
  assert.match(text(out), /hors du cercle/);
  const side = readSeal(makeSeal([sigil('water', { size: 0.4 }), at('regions', 90, 0.5, 0.3, { rot: 90 }), at('regions', 270, 0.5, 0.3, { rot: 90 })]));
  assert.match(text(side), /pointées vers la droite/);
});

test('cercle nu = explosion ; sceaux imbriqués signalés', () => {
  assert.match(text(readSeal(makeSeal([]))), /explosion/);
  const nested = readSeal(SPELLS.find((s) => s.id === 'vapor_bubble').seal);
  assert.ok(nested.analysis.ring.nested);
  assert.match(text(nested), /sceaux intérieurs/);
});

test('composition inédite : pas de correspondance, mais une lecture', () => {
  const r = readSeal(makeSeal([sigil('smoke', { size: 0.5 }), ...ringOf('orb', 3, { dist: 0.7, size: 0.3 }), ...ringOf('coil', 3, { start: 60, dist: 0.7, size: 0.3 })]));
  assert.ok(!r.match || r.match.kind !== 'exact');
  assert.match(text(r), /Sigil de Fumée/);
  assert.match(text(r), /Composition inédite|Apparenté|Très proche/);
});

test('analyse structurelle : symétrie et poussées', () => {
  const A = analyzeSeal(makeSeal([sigil('fire', { size: 0.5 }), ...ringOf('columns', 3, { dist: 0.7, size: 0.3 })]));
  assert.equal(A.globalSym.radial, 3);
  assert.ok(A.imbalance.magnitude < 0.05);
  assert.equal(compass(0), 'le haut');
  assert.equal(compass(92), 'la droite');
  assert.equal(compass(225), 'le bas à gauche');
});
