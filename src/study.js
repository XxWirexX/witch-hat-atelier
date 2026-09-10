// Apprendre les sceaux : curriculum, questions, révision espacée, examen.
//
// Logique pure — rien du DOM n'est touché ici, tout est testable sous node.
// L'interface (ui/study.js) se contente de rendre ce que ces fonctions décrivent :
// une question est une donnée (un énoncé, une figure, des choix, une réponse),
// jamais du HTML.

import { GLYPHS, SIGN_IDS, SIGIL_IDS, DECORATIVE_IDS, DIR_LABEL } from './glyphs.js';
import { SPELLS, SPELL_BY_ID } from './spells.js';
import { rng } from './sloppy.js';

const DAY = 86400000;

// ───────────────────────── Petits outils ─────────────────────────

const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

export function shuffle(arr, r) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const pick = (arr, r) => arr[Math.floor(r() * arr.length)];

// Tire n éléments distincts, en préférant ceux du début de la liste (les
// « proches » du bon choix : c'est ce qui rend un distracteur instructif).
function sample(pool, n, r) {
  const out = [];
  const seen = new Set();
  const bag = shuffle(pool, r);
  for (const x of bag) {
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
    if (out.length >= n) break;
  }
  return out;
}

// ───────────────────────── Items ─────────────────────────

export const itemId = (kind, id) => `${kind}:${id}`;
export function parseItem(key) {
  const i = key.indexOf(':');
  return { kind: key.slice(0, i), id: key.slice(i + 1) };
}

export function itemLabel(key) {
  const { kind, id } = parseItem(key);
  return kind === 'glyph' ? GLYPHS[id].fr : SPELL_BY_ID[id].fr;
}

// ───────────────────────── Curriculum ─────────────────────────

// Les leçons suivent l'ordre dans lequel la série présente sa magie : d'abord
// de quoi le sort est fait (les sigils, à commencer par la tétrade), ensuite
// comment il se manifeste (les signes), puis l'inversion, les sigils décoratifs
// et enfin les sceaux complets.
// Découpe en paquets de n, sans laisser un dernier paquet ridicule : une leçon
// d'un seul glyphe n'apprend rien et casse le rythme.
function chunkSmart(arr, n, min = 3) {
  const parts = chunk(arr, n);
  if (parts.length > 1 && parts[parts.length - 1].length < min) {
    const tail = parts.pop();
    parts[parts.length - 1] = parts[parts.length - 1].concat(tail);
  }
  return parts;
}

const SIGN_GROUPS = [
  {
    dirs: ['directional'],
    title: 'Signes directionnels',
    intro: 'Ils poussent la magie dans une direction. Leur longueur dit la force de la poussée, et la somme des poussées décide si le sceau est équilibré ou part de travers.',
  },
  {
    dirs: ['semi'],
    title: 'Signes semi-directionnels',
    intro: 'Une direction, mais partagée : ils travaillent par paires ou par symétrie, et c\'est leur disposition autour du cercle qui donne la forme du sort.',
  },
  {
    dirs: ['non'],
    title: 'Signes non directionnels',
    intro: 'Sans direction propre : ils modifient le sort dans son ensemble — durée, portée, découpage, répétition.',
  },
  {
    dirs: ['asymmetric', 'unknown'],
    title: 'Signes à part',
    intro: 'Les asymétriques, qui n\'ont pas d\'inversion définie, et ceux dont la communauté n\'a pas encore tranché la catégorie.',
  },
];

function buildLessons() {
  const lessons = [];
  const add = (l) => { lessons.push({ ...l, items: l.items.filter(Boolean) }); };

  // Une famille découpée en plusieurs leçons se numérote ; seule, elle garde son nom.
  const addSeries = (base, ids, size) => {
    const parts = chunkSmart(ids, size);
    parts.forEach((part, i) => add({
      ...base,
      id: `${base.id}-${i + 1}`,
      title: parts.length > 1 ? `${base.title} (${i + 1}/${parts.length})` : base.title,
      items: part,
    }));
  };

  const glyphItems = (ids) => ids.map((id) => itemId('glyph', id));

  add({
    id: 'tetrade',
    title: 'La tétrade primaire',
    intro: 'Quatre sigils fondamentaux : feu, eau, terre, vent. Le sigil, au centre du sceau, décide de quoi le sort est fait ; sa taille en règle l\'intensité.',
    items: glyphItems(SIGIL_IDS.filter((id) => GLYPHS[id].tetrad)),
  });

  addSeries(
    { id: 'sigils', title: 'Les autres sigils', intro: 'Au-delà des quatre éléments, un sigil peut appeler la lumière, le cristal, la fumée, l\'ombre, le son, le temps…' },
    glyphItems(SIGIL_IDS.filter((id) => !GLYPHS[id].tetrad)), 6,
  );

  for (const grp of SIGN_GROUPS) {
    const ids = SIGN_IDS.filter((id) => grp.dirs.includes(GLYPHS[id].dir || 'unknown'));
    if (!ids.length) continue;
    addSeries({ id: `signes-${grp.dirs[0]}`, title: grp.title, intro: grp.intro }, glyphItems(ids), 6);
  }

  addSeries(
    { id: 'inversion', title: 'L\'inversion', intro: 'Retourner un signe de 180° retourne son effet : ce qui monte descend, ce qui repousse attire. C\'est le levier le plus simple du système — et le plus facile à rater.', focus: 'glyph-inverted' },
    glyphItems(SIGN_IDS.filter((id) => GLYPHS[id].inverted)), 10,
  );

  addSeries(
    { id: 'decoratifs', title: 'Sigils décoratifs', intro: 'Ils sculptent le sort à l\'image d\'une créature ou d\'une plante, ou restreignent son effet à elle. Les dessins du dépôt en sont des reconstructions simplifiées.' },
    glyphItems(DECORATIVE_IDS), 6,
  );

  // Les sceaux dans l'ordre où la série les montre : on apprend la Boule de feu
  // avant la Bannière de capture.
  const spells = SPELLS.slice().sort((a, b) => (a.chapter ?? 999) - (b.chapter ?? 999));
  addSeries(
    { id: 'sorts', title: 'Sceaux du grimoire', intro: 'Reconnaître un sceau entier : le sigil au centre, la couronne de signes, le cercle et sa brèche.' },
    spells.map((s) => itemId('spell', s.id)), 8,
  );

  return lessons;
}

export const LESSONS = buildLessons();
export const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
// La leçon d'inversion revient sur des signes déjà vus : un item ne compte
// qu'une fois dans la progression.
export const ALL_ITEMS = [...new Set(LESSONS.flatMap((l) => l.items))];

// ───────────────────────── Questions ─────────────────────────

const QUESTION_TYPES = ['glyph-name', 'glyph-shape', 'glyph-effect', 'glyph-inverted', 'glyph-draw', 'spell-name', 'spell-effect', 'spell-seal'];
export { QUESTION_TYPES };

// Glyphes « voisins » d'un glyphe : même famille d'abord, c'est là que se
// jouent les confusions réelles (Colonne / Lévitation, Feu / Lumière).
function siblingsOf(id) {
  const g = GLYPHS[id];
  const family = g.kind === 'sign' ? SIGN_IDS : g.kind === 'decorative' ? DECORATIVE_IDS : SIGIL_IDS;
  const same = family.filter((x) => x !== id && GLYPHS[x].dir === g.dir);
  const rest = family.filter((x) => x !== id && GLYPHS[x].dir !== g.dir);
  return [...same, ...rest];
}

function spellSiblings(id) {
  const sp = SPELL_BY_ID[id];
  const same = SPELLS.filter((s) => s.id !== id && s.type === sp.type);
  const rest = SPELLS.filter((s) => s.id !== id && s.type !== sp.type);
  return [...same.map((s) => s.id), ...rest.map((s) => s.id)];
}

// Les choix doivent différer par leur libellé, sinon la question n'a pas de
// réponse unique (deux sorts peuvent partager un effet résumé de la même façon).
function distinctChoices(correct, pool, labelOf, r, n = 4) {
  const seen = new Set([labelOf(correct)]);
  const out = [correct];
  for (const cand of pool) {
    const l = labelOf(cand);
    if (seen.has(l)) continue;
    seen.add(l);
    out.push(cand);
    if (out.length >= n) break;
  }
  return shuffle(out, r);
}

function glyphQuestion(id, type, r) {
  const g = GLYPHS[id];
  const kindWord = g.kind === 'sign' ? 'signe' : g.kind === 'decorative' ? 'sigil décoratif' : 'sigil';
  const sibs = siblingsOf(id);

  if (type === 'glyph-shape') {
    const opts = distinctChoices(id, sample(sibs, 6, r), (x) => GLYPHS[x].fr, r);
    return {
      type, item: itemId('glyph', id), answer: id,
      prompt: `Lequel de ces dessins est le ${g.fr} ?`,
      choices: opts.map((x) => ({ key: x, label: GLYPHS[x].fr, figure: { kind: 'glyph', glyph: x } })),
      layout: 'figures',
      explain: `${g.fr} — ${g.effect}.`,
    };
  }

  if (type === 'glyph-effect') {
    const opts = distinctChoices(id, sample(sibs, 8, r), (x) => GLYPHS[x].effect, r);
    return {
      type, item: itemId('glyph', id), answer: id,
      prompt: `Que fait ce ${kindWord} ?`,
      figure: { kind: 'glyph', glyph: id },
      choices: opts.map((x) => ({ key: x, label: cap(GLYPHS[x].effect) + '.' })),
      explain: `C'est le ${g.fr}.`,
    };
  }

  if (type === 'glyph-inverted') {
    const pool = sample(SIGN_IDS.filter((x) => x !== id && GLYPHS[x].inverted), 8, r);
    const opts = distinctChoices(id, pool, (x) => GLYPHS[x].inverted, r);
    return {
      type, item: itemId('glyph', id), answer: id,
      prompt: `Ce signe est tracé à l'envers. Que devient son effet ?`,
      figure: { kind: 'glyph', glyph: id, inverted: true },
      choices: opts.map((x) => ({ key: x, label: cap(GLYPHS[x].inverted) + '.' })),
      explain: `${g.fr} à l'endroit : ${g.effect}. Inversé : ${g.inverted}.`,
    };
  }

  if (type === 'glyph-draw') {
    return {
      type, item: itemId('glyph', id), answer: id, target: id,
      prompt: `Tracez le ${g.fr}.`,
      hint: g.kind === 'sign' ? 'Comme dans le dictionnaire : le haut du dessin regarde le centre du sceau.' : null,
      explain: `${g.fr} — ${g.effect}.`,
    };
  }

  const opts = distinctChoices(id, sample(sibs, 6, r), (x) => GLYPHS[x].fr, r);
  return {
    type: 'glyph-name', item: itemId('glyph', id), answer: id,
    prompt: `Quel est ce ${kindWord} ?`,
    figure: { kind: 'glyph', glyph: id },
    choices: opts.map((x) => ({ key: x, label: GLYPHS[x].fr })),
    explain: `${g.fr} — ${g.effect}.`,
  };
}

function spellQuestion(id, type, r) {
  const sp = SPELL_BY_ID[id];
  const sibs = spellSiblings(id);

  if (type === 'spell-effect') {
    const opts = distinctChoices(id, sample(sibs, 8, r), (x) => SPELL_BY_ID[x].effect, r);
    return {
      type, item: itemId('spell', id), answer: id,
      prompt: `Que fait le ${sp.fr} ?`,
      choices: opts.map((x) => ({ key: x, label: SPELL_BY_ID[x].effect })),
      explain: sp.notes || sp.effect,
    };
  }

  if (type === 'spell-seal') {
    const opts = distinctChoices(id, sample(sibs, 6, r), (x) => SPELL_BY_ID[x].fr, r);
    return {
      type, item: itemId('spell', id), answer: id,
      prompt: `Lequel de ces sceaux est le ${sp.fr} ?`,
      choices: opts.map((x) => ({ key: x, label: SPELL_BY_ID[x].fr, figure: { kind: 'seal', spell: x } })),
      layout: 'figures',
      explain: sp.effect,
    };
  }

  const opts = distinctChoices(id, sample(sibs, 6, r), (x) => SPELL_BY_ID[x].fr, r);
  return {
    type: 'spell-name', item: itemId('spell', id), answer: id,
    prompt: 'Quel sort ce sceau lance-t-il ?',
    figure: { kind: 'seal', spell: id },
    choices: opts.map((x) => ({ key: x, label: SPELL_BY_ID[x].fr })),
    explain: sp.effect,
  };
}

// Types possibles pour un item donné : tout ne s'applique pas à tout (un sigil
// ne s'inverse pas, un sort ne se trace pas de mémoire).
export function typesFor(key) {
  const { kind, id } = parseItem(key);
  if (kind === 'spell') return ['spell-name', 'spell-effect', 'spell-seal'];
  const g = GLYPHS[id];
  const out = ['glyph-name', 'glyph-shape', 'glyph-effect'];
  // On ne fait recopier que les tracés confrontés à un relevé : demander de
  // reproduire une approximation n'apprend rien et sanctionne à tort.
  if (g.shapeRef === 'conforme') out.push('glyph-draw');
  if (g.kind === 'sign' && g.inverted) out.push('glyph-inverted');
  return out;
}

export function makeQuestion(key, r = Math.random, opts = {}) {
  const { kind, id } = parseItem(key);
  const allowed = typesFor(key).filter((t) => !opts.exclude?.includes(t));
  const type = opts.type && allowed.includes(opts.type) ? opts.type : pick(allowed.length ? allowed : typesFor(key), r);
  const q = kind === 'spell' ? spellQuestion(id, type, r) : glyphQuestion(id, type, r);
  return { id: `${key}|${type}|${Math.floor(r() * 1e9).toString(36)}`, ...q };
}

// ───────────────────────── Révision espacée (Leitner) ─────────────────────────

// Sept boîtes : une carte ratée retombe d'un cran et revient dans la séance,
// une carte réussie monte et s'éloigne. Rien d'exotique — c'est le schéma qui
// résiste le mieux à un usage irrégulier.
export const INTERVALS = [0, 1, 2, 4, 8, 16, 32];
export const MAX_BOX = INTERVALS.length - 1;
const RELEARN = 8 * 60000; // une carte ratée revient huit minutes plus tard

export function newState() {
  return { box: 0, due: 0, seen: 0, wrong: 0, streak: 0, last: 0 };
}

export function schedule(state, correct, now = Date.now()) {
  const s = { ...newState(), ...state };
  s.seen += 1;
  s.last = now;
  if (correct) {
    s.streak += 1;
    s.box = Math.min(MAX_BOX, s.box + 1);
    s.due = now + INTERVALS[s.box] * DAY;
  } else {
    s.wrong += 1;
    s.streak = 0;
    s.box = Math.max(0, s.box - 1);
    s.due = now + RELEARN;
  }
  return s;
}

export function isDue(state, now = Date.now()) {
  return !state || state.seen === 0 || (state.due ?? 0) <= now;
}

// Ce qui est à revoir maintenant : les cartes échues d'abord (les plus en retard
// en tête), puis, si la séance n'est pas pleine, des cartes jamais vues.
export function dueQueue(progress, now = Date.now(), opts = {}) {
  const limit = opts.limit ?? 20;
  const scope = opts.items ?? ALL_ITEMS;
  const started = scope.filter((k) => progress[k]?.seen);
  const fresh = scope.filter((k) => !progress[k]?.seen);
  const due = started.filter((k) => (progress[k].due ?? 0) <= now).sort((a, b) => (progress[a].due ?? 0) - (progress[b].due ?? 0));
  const queue = due.slice(0, limit);
  if (opts.includeNew !== false) for (const k of fresh) { if (queue.length >= limit) break; queue.push(k); }
  return queue;
}

export function stats(progress, items = ALL_ITEMS, now = Date.now()) {
  let seen = 0, due = 0, mastered = 0;
  for (const k of items) {
    const s = progress[k];
    if (!s?.seen) continue;
    seen += 1;
    if ((s.due ?? 0) <= now) due += 1;
    if (s.box >= 4) mastered += 1;
  }
  return { total: items.length, seen, due, mastered, fresh: items.length - seen };
}

export function lessonProgress(progress, lesson, now = Date.now()) {
  return stats(progress, lesson.items, now);
}

// ───────────────────────── Examen ─────────────────────────

// La composition est fixée : sans quota, le tirage aléatoire donne des épreuves
// très inégales d'une fois sur l'autre, et la note ne veut plus rien dire.
export const EXAM_FORMATS = {
  court: { label: 'Court', count: 12, minutes: 8 },
  standard: { label: 'Standard', count: 24, minutes: 18 },
  long: { label: 'Complet', count: 40, minutes: 30 },
};

const MIX = [
  ['glyph-name', 0.24],
  ['glyph-shape', 0.16],
  ['glyph-effect', 0.16],
  ['glyph-inverted', 0.12],
  ['glyph-draw', 0.12],
  ['spell-name', 0.12],
  ['spell-effect', 0.08],
];

export function buildExam(opts = {}) {
  const format = EXAM_FORMATS[opts.format] ?? EXAM_FORMATS.standard;
  const count = opts.count ?? format.count;
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  const r = rng(seed);
  const scope = opts.items ?? ALL_ITEMS;

  const glyphItems = scope.filter((k) => parseItem(k).kind === 'glyph');
  const spellItems = scope.filter((k) => parseItem(k).kind === 'spell');
  if (!glyphItems.length && !spellItems.length) return { seed, format, questions: [] };

  // Chaque type reçoit sa part, arrondie, puis on complète au besoin.
  const plan = [];
  for (const [type, share] of MIX) {
    for (let i = 0; i < Math.round(count * share); i++) plan.push(type);
  }
  while (plan.length < count) plan.push('glyph-name');
  plan.length = count;

  const used = new Set();
  const questions = [];
  for (const type of shuffle(plan, r)) {
    const spellType = type.startsWith('spell');
    let pool = (spellType ? spellItems : glyphItems).filter((k) => typesFor(k).includes(type));
    if (!pool.length) pool = scope;
    // Un même glyphe ne tombe pas deux fois tant qu'il reste des inconnus.
    const unused = pool.filter((k) => !used.has(k));
    const key = pick(unused.length ? unused : pool, r);
    used.add(key);
    questions.push(makeQuestion(key, r, { type }));
  }
  return { seed, format, minutes: opts.minutes ?? format.minutes, questions };
}

export const RANKS = [
  { min: 0.95, label: 'Sans faute', note: 'Le grimoire n\'a plus rien à vous apprendre.' },
  { min: 0.85, label: 'Très bien', note: 'Solide. Les erreurs qui restent sont des pièges de détail.' },
  { min: 0.7, label: 'Bien', note: 'Les bases sont là ; les confusions portent sur des glyphes voisins.' },
  { min: 0.5, label: 'Passable', note: 'La moitié est acquise. Reprenez les leçons signalées ci-dessous.' },
  { min: 0, label: 'À revoir', note: 'Passez par « Apprendre » avant de repasser l\'épreuve.' },
];

export function rankFor(ratio) {
  return RANKS.find((x) => ratio >= x.min) ?? RANKS[RANKS.length - 1];
}

// answers : { [question.id]: { key, correct } } — la correction d'un tracé est
// faite par le reconnaisseur côté interface, qui fournit déjà `correct`.
export function gradeExam(exam, answers) {
  const rows = exam.questions.map((q) => {
    const a = answers[q.id];
    return { question: q, given: a?.key ?? null, correct: !!a?.correct, skipped: !a };
  });
  const correct = rows.filter((x) => x.correct).length;
  const total = rows.length || 1;
  const ratio = correct / total;
  const byType = {};
  for (const row of rows) {
    const t = (byType[row.question.type] ??= { total: 0, correct: 0 });
    t.total += 1;
    if (row.correct) t.correct += 1;
  }
  const missedLessons = [];
  const missed = new Set(rows.filter((x) => !x.correct).map((x) => x.question.item));
  for (const l of LESSONS) {
    const n = l.items.filter((k) => missed.has(k)).length;
    if (n) missedLessons.push({ lesson: l, count: n });
  }
  missedLessons.sort((a, b) => b.count - a.count);
  return { rows, correct, total: rows.length, ratio, rank: rankFor(ratio), byType, missedLessons: missedLessons.slice(0, 4) };
}

// ───────────────────────── Correction d'un tracé ─────────────────────────

// Le reconnaisseur rend une liste de candidats classés. Le tracé est accepté si
// le glyphe demandé arrive en tête, ou juste derrière avec un écart minime :
// à la main, deux dessins voisins se départagent à peu de chose, et refuser un
// trait honnête décourage plus que ça n'enseigne.
export const DRAW_MARGIN = 0.25;

export function judgeDrawing(ranked, target) {
  if (!ranked?.length) return { correct: false, reason: 'vide', ranked: [] };
  const top = ranked[0];
  const mine = ranked.findIndex((x) => x.glyph === target);
  if (mine < 0) return { correct: false, got: top, reason: 'absent', ranked: ranked.slice(0, 3) };
  const hit = ranked[mine];
  const correct = mine === 0 || hit.score - top.score <= DRAW_MARGIN;
  return { correct, got: top, mine: hit, rank: mine, near: correct && mine > 0, ranked: ranked.slice(0, 3) };
}
