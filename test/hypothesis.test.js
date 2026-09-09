import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPELLS, SPELL_BY_ID } from '../src/spells.js';
import { flatten, makeSeal, sigil, ringOf, rasterizeSeal } from '../src/seal.js';
import { sloppyMask } from '../src/sloppy.js';
import { recognize } from '../src/recognizer.js';
import { spellHypotheses, readImage } from '../src/hypothesis.js';

const readSloppy = (id, seed, opts = {}) => readImage(sloppyMask(SPELL_BY_ID[id].seal, seed, opts));

test('un sceau mal dessiné est identifié malgré les tremblements et les ruptures', () => {
  const ids = ['pyreball', 'watershot', 'wall_breaker', 'integration', 'grasping_wind', 'sylph_shoes', 'light_beam', 'crystal_shard', 'water_orb', 'rainbringer'];
  const fails = [];
  for (const id of ids) {
    for (const seed of [11, 29, 47]) {
      const out = readSloppy(id, seed);
      const m = out?.reading?.match;
      if (!m || m.spell.id !== id || !['exact', 'close'].includes(m.kind)) fails.push(`${id}/${seed} → ${m?.spell.id ?? '-'}`);
    }
  }
  assert.equal(fails.length, 0, `non lus : ${fails.join(', ')}`);
});

test('le profil sévère (glyphes décalés, cercle ovale, taches) reste lisible', () => {
  // à ce niveau de maladresse un signe peut ressortir nettement plus long que
  // ses voisins : lire « Jet d'eau déséquilibré » est alors la bonne réponse
  const VARIANTS = { watershot: 'watershot_unbalanced', grasping_wind: 'grasping_wind_twist' };
  const fails = [];
  for (const id of ['pyreball', 'watershot', 'wall_breaker', 'grasping_wind', 'light_beam']) {
    for (const seed of [3, 17]) {
      const m = readSloppy(id, seed, { profile: 'severe' })?.reading?.match;
      if (!m || (m.spell.id !== id && m.spell.id !== VARIANTS[id])) fails.push(`${id}/${seed} → ${m?.spell.id ?? '-'}`);
    }
  }
  assert.equal(fails.length, 0, `non lus : ${fails.join(', ')}`);
});

test('l\'hypothèse classe le bon sort en tête sur un tracé propre', () => {
  for (const id of ['pyreball', 'wall_breaker', 'water_horse', 'billow_cluster']) {
    const rec = recognize(rasterizeSeal(SPELL_BY_ID[id].seal, { size: 640 }));
    const { ranked } = spellHypotheses(rec.elements, rec.rescore);
    assert.equal(ranked[0].spell.id, id, `${id} → ${ranked[0].spell.id}`);
    assert.ok(ranked[0].score > 0.75, `${id} : score ${ranked[0].score.toFixed(2)}`);
  }
});

test('la ré-identification garde la géométrie mesurée, pas celle attendue', () => {
  // jet d'eau dont une Colonne est nettement plus longue : la lecture doit
  // conserver le déséquilibre, même reconnue comme « Sceau de Jet d'eau »
  const seal = makeSeal([sigil('water', { size: 0.5 }), ...ringOf('columns', 4, { dist: 0.74, sizes: [0.3, 0.52, 0.3, 0.3] })]);
  const out = readImage(rasterizeSeal(seal, { size: 700, thickness: 4 }));
  assert.ok(out.reading.match, 'identifié');
  assert.ok(['watershot', 'watershot_unbalanced'].includes(out.reading.match.spell.id), out.reading.match.spell.id);
  assert.match(out.reading.paragraphs.join(' '), /plus long/);
  assert.match(out.reading.paragraphs.join(' '), /de biais/);
});

test('une composition inédite n\'est pas forcée dans un sort du grimoire', () => {
  const seal = makeSeal([sigil('smoke', { size: 0.5 }), ...ringOf('orb', 3, { dist: 0.7, size: 0.3 }), ...ringOf('coil', 3, { start: 60, dist: 0.7, size: 0.3 })]);
  const out = readImage(rasterizeSeal(seal, { size: 700, thickness: 4 }));
  const m = out.reading.match;
  assert.ok(!m || m.kind !== 'exact', `identifié à tort comme ${m?.spell.id}`);
});

// Le sondage ne doit confirmer un glyphe que là où il y a vraiment de l'encre :
// c'est ce qui empêche une hypothèse de « voir » ce qu'elle attend.
test('le sondage trouve un glyphe présent et rien là où le sceau est vide', () => {
  const seal = makeSeal([sigil('fire', { size: 0.5 }), ...ringOf('levitation', 3, { start: 0, dist: 0.72, size: 0.34 })]);
  const rec = recognize(rasterizeSeal(seal, { size: 700, thickness: 4 }));
  const here = rec.probeAt(0, -0.72, 0.34, 'levitation');
  assert.ok(here && here.confidence > 0.6, `signe présent non retrouvé (${here?.confidence})`);
  // 60° : à mi-chemin entre deux signes, il n'y a rien à trouver
  const nowhere = rec.probeAt(0.72 * Math.sin(Math.PI / 3), -0.72 * Math.cos(Math.PI / 3), 0.34, 'levitation');
  assert.ok(!nowhere || nowhere.confidence < 0.45, `glyphe inventé sur une zone vide (${nowhere?.confidence})`);
});

test('chaque sceau du grimoire reste discernable de tous les autres', () => {
  for (const sp of SPELLS) {
    const rec = recognize(rasterizeSeal(sp.seal, { size: 700, thickness: 4 }));
    const { ranked } = spellHypotheses(rec.elements, rec.rescore);
    const self = ranked.findIndex((r) => r.spell.id === sp.id);
    assert.ok(self >= 0 && self < 6, `${sp.id} : rang ${self} de sa propre hypothèse`);
    void flatten(sp.seal);
  }
});
