// Onglet « Étudier » : apprendre les glyphes, les réviser, passer l'épreuve.
//
// Toute la logique (curriculum, questions, planification, notation) vit dans
// src/study.js. Ce fichier ne fait que la mettre à l'écran et garder la
// progression dans le navigateur.

import { GLYPHS } from '../glyphs.js';
import { SPELL_BY_ID } from '../spells.js';
import { glyphSVG, sealSVG } from '../seal.js';
import { maskFromImageData, classifyGlyph } from '../recognizer.js';
import {
  LESSONS, ALL_ITEMS, EXAM_FORMATS, parseItem, itemLabel, typesFor, makeQuestion,
  buildExam, gradeExam, schedule, dueQueue, stats, lessonProgress, judgeDrawing, shuffle,
} from '../study.js';
import { rng } from '../sloppy.js';
import { h } from './shared.js';

const STORE_KEY = 'grimoire-study';
const DRAW_SIZE = 340;

// ───────────────────────── Progression ─────────────────────────

// Le stockage local peut être refusé (navigation privée, réglages) : l'étude
// doit rester utilisable, seule la mémoire d'une séance à l'autre est perdue.
function loadStore() {
  const empty = { v: 1, progress: {}, lessons: {}, exams: [] };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch { return empty; }
}
function saveStore(store) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); return true; } catch { return false; }
}

// ───────────────────────── Fragments ─────────────────────────

function figureOf(fig, size = 150) {
  if (!fig) return null;
  if (fig.kind === 'seal') return h('div', { class: 'q-figure seal', html: sealSVG(SPELL_BY_ID[fig.spell].seal, { size }) });
  return h('div', { class: 'q-figure', html: glyphSVG(fig.glyph, { size, inverted: fig.inverted }) });
}

function bar(ratio, label) {
  return h('div', { class: 'progress' },
    h('i', { style: { width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%` } }),
    label ? h('span', {}, label) : null,
  );
}

function itemFigure(key, size = 96) {
  const { kind, id } = parseItem(key);
  return kind === 'glyph' ? figureOf({ kind: 'glyph', glyph: id }, size) : figureOf({ kind: 'seal', spell: id }, size * 1.6);
}

function itemBlurb(key) {
  const { kind, id } = parseItem(key);
  if (kind === 'glyph') {
    const g = GLYPHS[id];
    return { title: g.fr, sub: [g.en, g.jp].filter(Boolean).join(' · '), text: g.effect.charAt(0).toUpperCase() + g.effect.slice(1) + '.', extra: g.inverted ? `Inversé : ${g.inverted}.` : null };
  }
  const sp = SPELL_BY_ID[id];
  return { title: sp.fr, sub: [sp.en, sp.jp].filter(Boolean).join(' · '), text: sp.effect, extra: null };
}

// ───────────────────────── Zone de tracé ─────────────────────────

// Le même canevas que l'onglet « Lire », en plus petit : on trace le glyphe
// demandé et le reconnaisseur juge, sans indulgence mais avec la marge de
// classifyGlyph — un trait honnête doit passer.
function drawPad() {
  const canvas = h('canvas', { width: DRAW_SIZE, height: DRAW_SIZE, class: 'draw-pad' });
  const cx = canvas.getContext('2d', { willReadFrequently: true });
  let strokes = [];
  let current = null;

  const clear = () => { cx.fillStyle = '#fff'; cx.fillRect(0, 0, DRAW_SIZE, DRAW_SIZE); };
  const stroke = (s, tail = false) => {
    const p = s.pts;
    cx.strokeStyle = '#1a0f0a'; cx.lineWidth = 5; cx.lineCap = 'round'; cx.lineJoin = 'round';
    cx.beginPath();
    if (tail && p.length >= 2) { cx.moveTo(...p[p.length - 2]); cx.lineTo(...p[p.length - 1]); }
    else { cx.moveTo(...p[0]); for (const q of p.slice(1)) cx.lineTo(...q); if (p.length === 1) cx.lineTo(p[0][0] + 0.1, p[0][1]); }
    cx.stroke();
  };
  const redraw = () => { clear(); for (const s of strokes) stroke(s); };
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * DRAW_SIZE, ((e.clientY - r.top) / r.height) * DRAW_SIZE]; };

  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); current = { pts: [pos(e)] }; strokes.push(current); stroke(current); });
  canvas.addEventListener('pointermove', (e) => { if (!current) return; current.pts.push(pos(e)); stroke(current, true); });
  const end = () => { current = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  clear();

  return {
    canvas,
    empty: () => strokes.length === 0,
    undo: () => { strokes.pop(); redraw(); },
    reset: () => { strokes = []; redraw(); },
    mask: () => maskFromImageData(cx.getImageData(0, 0, DRAW_SIZE, DRAW_SIZE)),
  };
}

// ───────────────────────── Carte de question ─────────────────────────

// `onDone(correct, detail)` est appelé une fois la question tranchée. En examen
// la correction n'est pas montrée (`reveal: false`) mais elle est bien calculée.
function questionCard(q, { reveal = true, onDone, initial = null }) {
  const wrap = h('div', { class: 'question' });
  const head = h('div', {}, h('p', { class: 'q-prompt' }, q.prompt), q.hint ? h('p', { class: 'muted q-hint' }, q.hint) : null);
  wrap.append(head);
  if (q.figure) wrap.append(figureOf(q.figure, q.figure.kind === 'seal' ? 260 : 170));

  const footer = h('div', { class: 'q-footer' });
  let answered = false;

  const finish = (correct, detail) => {
    if (answered) return;
    answered = true;
    onDone?.(correct, detail);
  };

  if (q.type === 'glyph-draw') {
    const pad = drawPad();
    const verdict = h('div', { class: 'q-verdict' });
    const validate = h('button', { class: 'btn primary' }, 'Valider le tracé');
    validate.addEventListener('click', () => {
      if (answered) return;
      if (pad.empty()) { verdict.replaceChildren(h('span', { class: 'badge warn' }, 'la feuille est vide')); return; }
      validate.disabled = true;
      validate.textContent = 'Lecture…';
      // Le rendu doit passer avant l'appariement, sinon le bouton reste figé.
      requestAnimationFrame(() => setTimeout(() => {
        const ranked = classifyGlyph(pad.mask(), { allowInverted: false });
        const j = judgeDrawing(ranked, q.target);
        validate.textContent = 'Valider le tracé';
        if (reveal) {
          verdict.replaceChildren(
            h('span', { class: `badge ${j.correct ? 'ok' : 'warn'}` }, j.correct ? (j.near ? 'accepté de justesse' : 'juste') : 'raté'),
            h('span', { class: 'muted' }, j.correct
              ? (j.near ? `lu d'abord comme ${GLYPHS[j.got.glyph].fr}, mais le vôtre suit de près` : `lu sans hésiter comme ${GLYPHS[q.target].fr}`)
              : `lu comme ${j.got ? GLYPHS[j.got.glyph].fr : 'rien de connu'}`),
          );
        } else {
          verdict.replaceChildren(h('span', { class: 'badge grey' }, 'tracé enregistré'));
        }
        finish(j.correct, j);
      }, 0));
    });
    wrap.append(
      h('div', { class: 'pad-wrap' }, pad.canvas, h('div', { class: 'pad-target', html: glyphSVG(q.target, { size: DRAW_SIZE }) })),
      h('div', { class: 'btn-row' },
        validate,
        h('button', { class: 'btn small', onClick: () => pad.undo() }, '↶ Annuler'),
        h('button', { class: 'btn small', onClick: () => pad.reset() }, 'Effacer'),
        h('label', { class: 'overlay-toggle' }, h('input', { type: 'checkbox', onChange: (e) => wrap.classList.toggle('show-target', e.target.checked) }), 'Afficher le modèle'),
      ),
      verdict,
    );
    wrap.append(footer);
    return { el: wrap, footer };
  }

  const buttons = [];
  const grid = h('div', { class: q.layout === 'figures' ? 'q-choices figures' : 'q-choices' });
  for (const c of q.choices) {
    const btn = h('button', { class: 'q-choice', 'data-key': c.key },
      c.figure ? figureOf(c.figure, c.figure.kind === 'seal' ? 160 : 92) : null,
      h('span', {}, c.label),
    );
    btn.addEventListener('click', () => {
      if (answered) return;
      const correct = c.key === q.answer;
      for (const b of buttons) {
        b.disabled = true;
        if (reveal && b.dataset.key === q.answer) b.classList.add('good');
      }
      btn.classList.add(reveal ? (correct ? 'good' : 'bad') : 'picked');
      if (reveal && q.explain) wrap.append(h('p', { class: 'q-explain' }, q.explain));
      finish(correct, { key: c.key });
    });
    if (initial && initial.key === c.key) btn.classList.add('picked');
    buttons.push(btn);
    grid.append(btn);
  }
  wrap.append(grid, footer);
  return { el: wrap, footer, buttons };
}

// ───────────────────────── Onglet ─────────────────────────

export function mountStudy(root, ctx) {
  let store = loadStore();
  const storageOk = saveStore(store);
  let screen = { name: 'home' };
  let ticker = null;

  const commit = () => { saveStore(store); };
  const toTop = () => { try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch { window.scrollTo(0, 0); } };
  const go = (next) => { screen = next; render(); };

  // Une réponse en leçon ou en révision met tout de suite la carte à jour :
  // c'est ce qui fait avancer la révision espacée.
  const record = (key, correct) => {
    store.progress[key] = schedule(store.progress[key], correct);
    commit();
  };

  function render() {
    clearInterval(ticker); ticker = null;
    root.replaceChildren();
    toTop();
    if (!storageOk) root.append(h('p', { class: 'notice' }, 'Le stockage local est indisponible : la progression ne sera pas conservée d\'une séance à l\'autre.'));
    ({ home: homeScreen, lesson: lessonScreen, review: reviewScreen, exam: examScreen })[screen.name]();
  }

  // ── accueil ──
  function homeScreen() {
    const st = stats(store.progress, ALL_ITEMS);
    const due = dueQueue(store.progress, Date.now(), { limit: 999, includeNew: false }).length;

    root.append(
      h('div', { class: 'card study-hero' },
        h('h2', {}, 'Étudier les sceaux'),
        h('p', { class: 'lead' }, 'Apprenez les glyphes un groupe à la fois, révisez ce qui s\'efface, puis passez l\'épreuve. Les questions de tracé sont corrigées par le lecteur du projet, pas à l\'honneur.'),
        bar(st.seen / Math.max(1, st.total)),
        h('div', { class: 'study-stats' },
          h('div', {}, h('b', {}, st.total), 'cartes'),
          h('div', {}, h('b', {}, st.seen), 'vues'),
          h('div', {}, h('b', { class: due ? 'hot' : '' }, due), 'à revoir'),
          h('div', {}, h('b', {}, st.mastered), 'acquises'),
        ),
        h('div', { class: 'btn-row study-actions' },
          h('button', { class: 'btn primary', onClick: () => go({ name: 'lesson', pick: true }) }, '📖 Apprendre'),
          h('button', { class: 'btn', onClick: () => go({ name: 'review' }) }, `🔁 Réviser${due ? ` (${due})` : ''}`),
          h('button', { class: 'btn', onClick: () => go({ name: 'exam' }) }, '🎓 Passer l\'épreuve'),
        ),
      ),
    );

    if (store.exams.length) {
      const last = store.exams[store.exams.length - 1];
      const best = store.exams.reduce((a, b) => (b.ratio > a.ratio ? b : a));
      root.append(h('div', { class: 'card' },
        h('h3', {}, 'Épreuves passées'),
        h('p', {}, `${store.exams.length} épreuve${store.exams.length > 1 ? 's' : ''} · dernière : ${Math.round(last.ratio * 100)} % (${last.rank}) · meilleure : ${Math.round(best.ratio * 100)} %`),
      ));
    }

    const list = h('div', { class: 'lesson-list' });
    for (const l of LESSONS) {
      const p = lessonProgress(store.progress, l);
      const done = store.lessons[l.id]?.done;
      list.append(h('button', { class: `lesson-row${done ? ' done' : ''}`, onClick: () => go({ name: 'lesson', lesson: l.id }) },
        h('div', { class: 'lesson-figs' }, ...l.items.slice(0, 4).map((k) => itemFigure(k, 34))),
        h('div', { class: 'lesson-body' },
          h('h3', {}, l.title),
          h('div', { class: 'muted' }, `${l.items.length} cartes · ${p.seen} vues · ${p.mastered} acquises`),
          bar(p.seen / Math.max(1, p.total)),
        ),
        done ? h('span', { class: 'badge ok' }, 'faite') : null,
      ));
    }
    root.append(h('div', { class: 'section-title' }, h('h2', {}, 'Leçons'), h('span', { class: 'muted' }, `${LESSONS.length}`)), list);
  }

  // ── leçon : d'abord les fiches, ensuite l'exercice ──
  function lessonScreen() {
    if (screen.pick || !screen.lesson) {
      // « Apprendre » sans leçon choisie : la première non terminée.
      const next = LESSONS.find((l) => !store.lessons[l.id]?.done) ?? LESSONS[0];
      screen = { name: 'lesson', lesson: next.id, phase: 'cards' };
    }
    const lesson = LESSONS.find((l) => l.id === screen.lesson) ?? LESSONS[0];
    const phase = screen.phase ?? 'cards';

    root.append(h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onClick: () => go({ name: 'home' }) }, '← Toutes les leçons')));

    if (phase === 'cards') {
      const cards = h('div', { class: 'cards study-cards' });
      for (const key of lesson.items) {
        const b = itemBlurb(key);
        const { kind, id } = parseItem(key);
        cards.append(h('div', { class: 'card study-card' },
          itemFigure(key, kind === 'glyph' ? 92 : 76),
          h('div', {},
            h('h3', {}, b.title),
            b.sub ? h('div', { class: 'names' }, b.sub) : null,
            h('p', {}, b.text),
            b.extra ? h('p', { class: 'muted' }, b.extra) : null,
            h('button', { class: 'btn small', onClick: () => ctx.goto(kind === 'glyph' ? 'dictionnaire' : 'grimoire', kind === 'glyph' ? { glyph: id } : { spell: id }) }, 'Fiche complète'),
          ),
        ));
      }
      root.append(
        h('div', { class: 'card' }, h('h2', {}, lesson.title), h('p', { class: 'lead' }, lesson.intro)),
        cards,
        h('div', { class: 'btn-row study-actions' }, h('button', { class: 'btn primary', onClick: () => go({ ...screen, phase: 'quiz' }) }, 'Passer à l\'exercice →')),
      );
      return;
    }

    // Deux questions par carte, mélangées, en variant les angles d'attaque.
    const r = rng(Date.now() & 0xffff);
    const queue = [];
    for (const key of lesson.items) {
      const types = shuffle(typesFor(key).filter((t) => t !== 'glyph-draw'), r);
      const focus = lesson.focus && typesFor(key).includes(lesson.focus) ? lesson.focus : null;
      queue.push(makeQuestion(key, r, { type: focus ?? types[0] }));
      queue.push(makeQuestion(key, r, { type: types[1] ?? types[0] }));
    }
    runSession(shuffle(queue, r), {
      title: lesson.title,
      onEnd: (correct, total) => {
        const ratio = correct / Math.max(1, total);
        const prev = store.lessons[lesson.id] ?? {};
        store.lessons[lesson.id] = { done: prev.done || ratio >= 0.8, best: Math.max(prev.best ?? 0, ratio), at: Date.now() };
        commit();
        const idx = LESSONS.indexOf(lesson);
        const next = LESSONS[idx + 1];
        return h('div', { class: 'btn-row study-actions' },
          next ? h('button', { class: 'btn primary', onClick: () => go({ name: 'lesson', lesson: next.id, phase: 'cards' }) }, `Leçon suivante : ${next.title}`) : null,
          h('button', { class: 'btn', onClick: () => go({ name: 'lesson', lesson: lesson.id, phase: 'quiz' }) }, 'Refaire l\'exercice'),
          h('button', { class: 'btn', onClick: () => go({ name: 'home' }) }, 'Retour'),
        );
      },
    });
  }

  // ── révision ──
  function reviewScreen() {
    root.append(h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onClick: () => go({ name: 'home' }) }, '← Retour')));
    const queue = dueQueue(store.progress, Date.now(), { limit: 20 });
    if (!queue.length) {
      root.append(h('div', { class: 'card' },
        h('h2', {}, 'Rien à revoir'),
        h('p', {}, 'Toutes les cartes commencées sont encore fraîches. Revenez plus tard, ou attaquez une nouvelle leçon.'),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onClick: () => go({ name: 'lesson', pick: true }) }, 'Apprendre une leçon')),
      ));
      return;
    }
    const r = rng(Date.now() & 0xffff);
    runSession(queue.map((k) => makeQuestion(k, r)), {
      title: 'Révision',
      onEnd: () => h('div', { class: 'btn-row study-actions' },
        h('button', { class: 'btn primary', onClick: () => go({ name: 'review' }) }, 'Continuer à réviser'),
        h('button', { class: 'btn', onClick: () => go({ name: 'home' }) }, 'Retour'),
      ),
    });
  }

  // Séance corrigée au fur et à mesure : leçon et révision partagent tout sauf
  // ce qu'on propose à la fin.
  function runSession(questions, { title, onEnd }) {
    let i = 0, correct = 0;
    const host = h('div');
    root.append(host);

    const step = () => {
      host.replaceChildren();
      toTop();
      if (i >= questions.length) {
        const ratio = correct / Math.max(1, questions.length);
        host.append(h('div', { class: 'card result' },
          h('h2', {}, `${correct} / ${questions.length}`),
          bar(ratio),
          h('p', { class: 'lead' }, ratio >= 0.8 ? 'Bien vu. Ces cartes s\'éloigneront dans le temps.' : 'Les cartes ratées reviendront dans quelques minutes.'),
          onEnd(correct, questions.length),
        ));
        return;
      }
      const q = questions[i];
      const card = questionCard(q, {
        reveal: true,
        onDone: (ok) => {
          if (ok) correct += 1;
          record(q.item, ok);
          card.footer.append(h('button', { class: 'btn primary', onClick: () => { i += 1; step(); } }, i + 1 < questions.length ? 'Suivante →' : 'Terminer'));
          card.footer.querySelector('button').focus();
        },
      });
      host.append(h('div', { class: 'card session' },
        h('div', { class: 'session-head' },
          h('span', { class: 'muted' }, `${title} · ${i + 1} / ${questions.length}`),
          h('span', { class: 'muted' }, `${correct} juste${correct > 1 ? 's' : ''}`),
        ),
        bar(i / questions.length),
        card.el,
      ));
    };
    step();
  }

  // ── épreuve ──
  function examScreen() {
    root.append(h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onClick: () => go({ name: 'home' }) }, '← Retour')));

    if (!screen.exam) {
      const st = stats(store.progress, ALL_ITEMS);
      root.append(h('div', { class: 'card' },
        h('h2', {}, 'L\'épreuve'),
        h('p', { class: 'lead' }, 'Un examen chronométré, tiré dans tout le dictionnaire et tout le grimoire. Aucune correction avant la fin, et les questions de tracé sont jugées par le lecteur.'),
        st.seen < 20 ? h('p', { class: 'notice' }, `Vous n'avez encore vu que ${st.seen} cartes sur ${st.total}. L'épreuve porte sur l'ensemble : elle sera rude.`) : null,
        h('div', { class: 'btn-row study-actions' },
          ...Object.entries(EXAM_FORMATS).map(([k, f]) => h('button', { class: `btn${k === 'standard' ? ' primary' : ''}`, onClick: () => go({ name: 'exam', exam: buildExam({ format: k }), answers: {}, at: 0, deadline: Date.now() + f.minutes * 60000 }) }, `${f.label} — ${f.count} questions, ${f.minutes} min`)),
        ),
      ));
      return;
    }

    if (screen.graded) { examResult(); return; }

    const { exam, answers } = screen;
    const at = screen.at ?? 0;
    const q = exam.questions[at];

    const clock = h('span', { class: 'clock' });
    const strip = h('div', { class: 'exam-strip' }, ...exam.questions.map((qq, i) => h('button', {
      class: `dot${answers[qq.id] ? ' filled' : ''}${i === at ? ' current' : ''}`,
      title: `Question ${i + 1}`,
      onClick: () => go({ ...screen, at: i }),
    })));

    const submit = () => go({ ...screen, graded: gradeExam(exam, answers) });
    const tick = () => {
      const left = Math.max(0, screen.deadline - Date.now());
      const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      clock.textContent = `${m}:${String(s).padStart(2, '0')}`;
      clock.classList.toggle('low', left < 60000);
      if (left <= 0) { clearInterval(ticker); ticker = null; submit(); }
    };

    const card = questionCard(q, {
      reveal: false,
      initial: answers[q.id],
      onDone: (ok, detail) => {
        answers[q.id] = { key: detail?.key ?? q.target, correct: ok };
        strip.children[at].classList.add('filled');
        const nextBtn = h('button', { class: 'btn primary', onClick: () => go({ ...screen, at: Math.min(exam.questions.length - 1, at + 1) }) }, 'Suivante →');
        card.footer.append(at + 1 < exam.questions.length ? nextBtn : h('button', { class: 'btn primary', onClick: submit }, 'Rendre la copie'));
      },
    });

    root.append(h('div', { class: 'card exam' },
      h('div', { class: 'session-head' },
        h('span', { class: 'muted' }, `Question ${at + 1} / ${exam.questions.length}`),
        clock,
      ),
      strip,
      card.el,
      h('div', { class: 'btn-row exam-nav' },
        at > 0 ? h('button', { class: 'btn small', onClick: () => go({ ...screen, at: at - 1 }) }, '← Précédente') : null,
        at + 1 < exam.questions.length ? h('button', { class: 'btn small', onClick: () => go({ ...screen, at: at + 1 }) }, 'Passer →') : null,
        h('button', { class: 'btn small', onClick: submit }, 'Rendre la copie'),
      ),
    ));
    tick();
    ticker = setInterval(tick, 1000);
  }

  function examResult() {
    const g = screen.graded;
    // Une épreuve nourrit la révision : ce qu'on a raté redevient à revoir.
    if (!screen.saved) {
      for (const row of g.rows) if (!row.skipped) record(row.question.item, row.correct);
      store.exams.push({ at: Date.now(), format: screen.exam.format.label, ratio: g.ratio, rank: g.rank.label, correct: g.correct, total: g.total });
      store.exams = store.exams.slice(-30);
      commit();
      screen.saved = true;
    }

    root.append(h('div', { class: 'card result' },
      h('h2', {}, g.rank.label),
      h('p', { class: 'lead' }, `${g.correct} bonnes réponses sur ${g.total} — ${Math.round(g.ratio * 100)} %.`),
      bar(g.ratio),
      h('p', {}, g.rank.note),
      g.missedLessons.length ? h('div', {},
        h('h3', {}, 'À reprendre'),
        h('div', { class: 'chips' }, ...g.missedLessons.map(({ lesson, count }) => h('span', { class: 'chip', onClick: () => go({ name: 'lesson', lesson: lesson.id, phase: 'cards' }) }, `${lesson.title} (${count})`))),
      ) : null,
      h('div', { class: 'btn-row study-actions' },
        h('button', { class: 'btn primary', onClick: () => go({ name: 'exam' }) }, 'Repasser l\'épreuve'),
        h('button', { class: 'btn', onClick: () => go({ name: 'review' }) }, 'Réviser les ratés'),
        h('button', { class: 'btn', onClick: () => go({ name: 'home' }) }, 'Retour'),
      ),
    ));

    const table = h('div', { class: 'exam-review' });
    g.rows.forEach((row, i) => {
      const q = row.question;
      const given = row.skipped ? 'sans réponse' : q.type === 'glyph-draw' ? 'votre tracé' : (q.choices.find((c) => c.key === row.given)?.label ?? '—');
      table.append(h('div', { class: `review-row ${row.correct ? 'ok' : 'ko'}` },
        h('span', { class: 'num' }, i + 1),
        h('div', {},
          h('div', { class: 'q' }, q.prompt),
          h('div', { class: 'muted' }, row.correct ? `Juste — ${itemLabel(q.item)}` : `Vous : ${given} · réponse : ${itemLabel(q.item)}`),
        ),
        itemFigure(q.item, 40),
      ));
    });
    root.append(h('div', { class: 'section-title' }, h('h2', {}, 'Copie')), table);
  }

  ctx.bus.addEventListener('open:etudier', () => go({ name: 'home' }));
  render();
}
