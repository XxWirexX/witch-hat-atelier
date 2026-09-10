import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLYPHS, FIDELITY_LABEL } from '../src/glyphs.js';
import { SPELL_BY_ID } from '../src/spells.js';
import { rasterizeGlyph } from '../src/seal.js';
import { classifyGlyph } from '../src/recognizer.js';
import { rng } from '../src/sloppy.js';
import {
  LESSONS, ALL_ITEMS, parseItem, typesFor, makeQuestion, buildExam, gradeExam,
  schedule, newState, dueQueue, stats, judgeDrawing, rankFor, INTERVALS, MAX_BOX,
} from '../src/study.js';

const DAY = 86400000;

test('le curriculum couvre tout le dictionnaire et tout le grimoire, sans doublon', () => {
  assert.equal(new Set(ALL_ITEMS).size, ALL_ITEMS.length, 'items en double');
  const glyphs = ALL_ITEMS.filter((k) => parseItem(k).kind === 'glyph').map((k) => parseItem(k).id);
  const spells = ALL_ITEMS.filter((k) => parseItem(k).kind === 'spell').map((k) => parseItem(k).id);
  assert.deepEqual(new Set(glyphs), new Set(Object.keys(GLYPHS)));
  assert.deepEqual(new Set(spells), new Set(Object.keys(SPELL_BY_ID)));
  for (const l of LESSONS) assert.ok(l.items.length >= 3, `${l.title} : ${l.items.length} item(s)`);
});

test('chaque question a une réponse et une seule', () => {
  const r = rng(7);
  for (const key of ALL_ITEMS) {
    for (const type of typesFor(key)) {
      const q = makeQuestion(key, r, { type });
      assert.equal(q.item, key);
      if (type === 'glyph-draw') { assert.equal(q.target, parseItem(key).id); continue; }
      assert.ok(q.choices.length >= 2, `${key}/${type} : ${q.choices.length} choix`);
      const good = q.choices.filter((c) => c.key === q.answer);
      assert.equal(good.length, 1, `${key}/${type} : ${good.length} bonne(s) réponse(s)`);
      // Deux choix au libellé identique rendraient la question insoluble.
      assert.equal(new Set(q.choices.map((c) => c.label)).size, q.choices.length, `${key}/${type} : libellés en double`);
    }
  }
});

// Le dictionnaire distingue le nom (officiel ou non) du tracé (conforme au
// relevé ou non). Faire recopier un tracé approximatif n'apprend rien : la
// question de tracé ne doit porter que sur ce dont la forme est sûre.
test('seuls les glyphes au tracé conforme sont proposés au tracé', () => {
  for (const id of Object.keys(GLYPHS)) {
    const types = typesFor(`glyph:${id}`);
    const draws = types.includes('glyph-draw');
    assert.equal(draws, GLYPHS[id].shapeRef === 'conforme', `${GLYPHS[id].fr} (${GLYPHS[id].shapeRef}) : tracé ${draws ? 'proposé' : 'écarté'}`);
    assert.ok(FIDELITY_LABEL[GLYPHS[id].shapeRef], `${id} : fidélité non étiquetée`);
  }
  // Une épreuve entière ne doit contenir aucune question de tracé douteuse.
  const exam = buildExam({ seed: 5, format: 'long' });
  for (const q of exam.questions) {
    if (q.type !== 'glyph-draw') continue;
    assert.equal(GLYPHS[q.target].shapeRef, 'conforme', `${q.target} demandé au tracé`);
  }
});

test('un examen respecte sa taille et varie avec la graine', () => {
  const a = buildExam({ seed: 1, format: 'standard' });
  const b = buildExam({ seed: 1, format: 'standard' });
  const c = buildExam({ seed: 2, format: 'standard' });
  assert.equal(a.questions.length, 24);
  assert.deepEqual(a.questions.map((q) => q.item), b.questions.map((q) => q.item), 'même graine, même épreuve');
  assert.notDeepEqual(a.questions.map((q) => q.item), c.questions.map((q) => q.item));
  assert.equal(buildExam({ seed: 3, format: 'court' }).questions.length, 12);
  assert.equal(buildExam({ seed: 3, format: 'long' }).questions.length, 40);
  // Un tirage sans quota donnerait des épreuves très inégales : on vérifie le mélange.
  const types = new Set(a.questions.map((q) => q.type));
  assert.ok(types.size >= 5, `épreuve trop homogène : ${[...types].join(', ')}`);
});

test('la notation compte les réponses et pointe les leçons à reprendre', () => {
  const exam = buildExam({ seed: 11, format: 'court' });
  const answers = {};
  exam.questions.forEach((q, i) => { answers[q.id] = { key: q.answer, correct: i % 2 === 0 }; });
  const g = gradeExam(exam, answers);
  assert.equal(g.total, 12);
  assert.equal(g.correct, 6);
  assert.ok(Math.abs(g.ratio - 0.5) < 1e-9);
  assert.equal(g.rank.label, 'Passable');
  assert.ok(g.missedLessons.length > 0, 'aucune leçon signalée');
  // Une copie blanche ne plante pas et ne vaut rien.
  const blank = gradeExam(exam, {});
  assert.equal(blank.correct, 0);
  assert.equal(blank.rows.every((x) => x.skipped), true);
  assert.equal(rankFor(1).label, 'Sans faute');
});

test('la révision espacée éloigne ce qui est su et ramène ce qui est raté', () => {
  const now = Date.now();
  let s = newState();
  for (let i = 0; i < 3; i++) s = schedule(s, true, now);
  assert.equal(s.box, 3);
  assert.equal(s.streak, 3);
  assert.equal(s.due, now + INTERVALS[3] * DAY);

  const missed = schedule(s, false, now);
  assert.equal(missed.box, 2, 'une erreur fait redescendre d\'un cran');
  assert.equal(missed.streak, 0);
  assert.ok(missed.due - now < DAY, 'une carte ratée revient dans la séance');

  let top = newState();
  for (let i = 0; i < 20; i++) top = schedule(top, true, now);
  assert.equal(top.box, MAX_BOX, 'la dernière boîte ne déborde pas');
});

test('la file de révision sert d\'abord les cartes échues, puis des nouvelles', () => {
  const now = Date.now();
  const [a, b, c] = ALL_ITEMS;
  const progress = {
    [a]: { ...newState(), seen: 1, box: 1, due: now - 5 * DAY },
    [b]: { ...newState(), seen: 1, box: 1, due: now - 1 * DAY },
    [c]: { ...newState(), seen: 1, box: 3, due: now + 10 * DAY },
  };
  const q = dueQueue(progress, now, { limit: 5 });
  assert.deepEqual(q.slice(0, 2), [a, b], 'la plus en retard passe en premier');
  assert.ok(!q.includes(c), 'une carte non échue ne revient pas');
  assert.equal(q.length, 5, 'la séance est complétée par des cartes neuves');

  const only = dueQueue(progress, now, { limit: 5, includeNew: false });
  assert.deepEqual(only, [a, b]);

  const st = stats(progress, [a, b, c], now);
  assert.deepEqual(st, { total: 3, seen: 3, due: 2, mastered: 0, fresh: 0 });
});

// Ce que l'examen exige d'un élève : un trait honnête mais tremblé doit passer.
// Sans ça la question de tracé punirait la souris, pas l'ignorance.
test('un tracé penché, d\'épaisseur inégale et taché reste accepté', () => {
  const shaky = (id, seed) => {
    const r = rng(seed);
    const mask = rasterizeGlyph(id, { size: 220 + Math.round(r() * 160), rot: (r() - 0.5) * 36, thickness: 3 + r() * 7 });
    for (let i = 0; i < Math.round(mask.data.length * 0.0004); i++) mask.data[Math.floor(r() * mask.data.length)] = 1;
    return mask;
  };
  const ids = Object.keys(GLYPHS);
  let ok = 0, total = 0;
  for (const id of ids) {
    for (const seed of [3, 19, 41]) {
      total += 1;
      if (judgeDrawing(classifyGlyph(shaky(id, seed), { allowInverted: false }), id).correct) ok += 1;
    }
  }
  assert.ok(ok / total >= 0.95, `${ok}/${total} tracés hésitants acceptés`);
});

test('un tracé est corrigé par le reconnaisseur, pas par la confiance de l\'élève', () => {
  for (const id of ['fire', 'columns', 'levitation', 'water']) {
    const verdict = judgeDrawing(classifyGlyph(rasterizeGlyph(id, { size: 300 })), id);
    assert.ok(verdict.correct, `${id} bien tracé mais refusé (${verdict.got?.glyph})`);
  }
  // Tracer autre chose que ce qui est demandé ne passe pas.
  const wrong = judgeDrawing(classifyGlyph(rasterizeGlyph('fire', { size: 300 })), 'obliviation');
  assert.equal(wrong.correct, false, 'un glyphe étranger a été accepté');
  // Une feuille blanche non plus.
  assert.equal(judgeDrawing([], 'fire').correct, false);
});
