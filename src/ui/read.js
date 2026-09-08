// Onglet « Lire » : image ou dessin → reconnaissance → lecture.
import { GLYPHS, SIGN_IDS, SIGIL_IDS, DECORATIVE_IDS } from '../glyphs.js';
import { sealSVG } from '../seal.js';
import { SPELLS } from '../spells.js';
import { maskFromImageData, recognize, relabel, assembleSeal } from '../recognizer.js';
import { readSeal } from '../interpreter.js';
import { h, glyphIcon, renderReading, openDrawer, download } from './shared.js';
import { spellDetail } from './grimoire.js';

const CANVAS = 720;

export function mountRead(root, ctx) {
  let mode = 'image';
  let rec = null;            // dernier résultat de reconnaissance
  let showOverlay = true;
  let sourceImage = null;    // ImageBitmap / Image chargée
  let strokes = [];          // dessin à main levée
  let pen = 6;

  // ── colonne gauche ──
  const modes = h('div', { class: 'source-modes' },
    h('button', { class: 'btn active', 'data-mode': 'image', onClick: () => setMode('image') }, '📷 Image'),
    h('button', { class: 'btn', 'data-mode': 'draw', onClick: () => setMode('draw') }, '✍️ Dessiner'),
    h('button', { class: 'btn', 'data-mode': 'example', onClick: () => setMode('example') }, '📖 Exemple'),
  );
  const fileInput = h('input', { type: 'file', accept: 'image/*', hidden: true, onChange: (e) => { if (e.target.files[0]) loadFile(e.target.files[0]); } });
  const canvas = h('canvas', { width: CANVAS, height: CANVAS, hidden: true });
  const overlay = h('canvas', { width: CANVAS, height: CANVAS, hidden: true, style: { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' } });
  const placeholder = h('div', { class: 'placeholder' },
    h('strong', {}, 'Déposez une image de sceau ici'),
    'photo, scan ou capture — ou collez-la (Ctrl+V). ', h('br'),
    h('button', { class: 'btn small', style: { marginTop: '0.6rem' }, onClick: () => fileInput.click() }, 'Choisir un fichier…'));
  const dropzone = h('div', { class: 'dropzone' }, placeholder, canvas, overlay, fileInput);

  const exampleSelect = h('select', {}, ...SPELLS.map((s) => h('option', { value: s.id }, s.fr)));
  const jitter = h('input', { type: 'checkbox', checked: true });
  const exampleBar = h('div', { class: 'draw-tools', hidden: true },
    h('label', {}, 'Sort : ', exampleSelect),
    h('label', {}, jitter, ' rotation & décalage aléatoires'),
    h('button', { class: 'btn small', onClick: () => loadExample() }, 'Générer'),
  );
  const penRange = h('input', { type: 'range', min: 2, max: 16, value: pen, onInput: (e) => { pen = +e.target.value; } });
  const drawBar = h('div', { class: 'draw-tools', hidden: true },
    h('label', {}, 'Plume ', penRange),
    h('button', { class: 'btn small', onClick: () => { strokes.pop(); redrawStrokes(); scheduleAnalyze(); } }, '↶ Annuler'),
    h('button', { class: 'btn small', onClick: () => { strokes = []; redrawStrokes(); clearResult(); } }, 'Effacer'),
    h('span', { class: 'muted' }, 'Tracez le cercle, le sigil, les signes. La lecture se met à jour à chaque trait.'),
  );
  const overlayToggle = h('label', { class: 'overlay-toggle' }, h('input', { type: 'checkbox', checked: true, onChange: (e) => { showOverlay = e.target.checked; drawOverlay(); } }), 'Surligner les glyphes reconnus');
  const status = h('div', { class: 'status' });
  const analyzeBtn = h('button', { class: 'btn primary', onClick: () => analyze() }, 'Lire le sceau');
  const left = h('div', { class: 'card' },
    modes, dropzone, exampleBar, drawBar,
    h('div', { class: 'btn-row', style: { marginTop: '0.8rem', justifyContent: 'space-between' } }, analyzeBtn, overlayToggle),
    status,
  );

  // ── colonne droite ──
  const readingBox = h('div', { class: 'card' }, h('h2', {}, 'Lecture'), h('p', { class: 'muted' }, 'Chargez une image, dessinez un sceau ou choisissez un exemple du grimoire : le lecteur repère le cercle, identifie sigils et signes, puis explique ce que ferait le sort.'));
  const elementsBox = h('div', { class: 'card', hidden: true });
  const right = h('div', {}, readingBox, elementsBox);

  root.append(h('div', { class: 'grid-2' }, left, right));

  // ── événements de chargement ──
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
  dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('drag'); const f = e.dataTransfer.files[0]; if (f) { setMode('image'); loadFile(f); } });
  document.addEventListener('paste', (e) => {
    if (root.hidden) return;
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (item) { setMode('image'); loadFile(item.getAsFile()); }
  });
  ctx.bus.addEventListener('open:lire', (e) => openSeal(e.detail));
  const pending = sessionStorage.getItem('grimoire-open-lire');
  if (pending) { sessionStorage.removeItem('grimoire-open-lire'); try { openSeal(JSON.parse(pending)); } catch { /* ignore */ } }

  // ── dessin ──
  const cx = canvas.getContext('2d', { willReadFrequently: true });
  let current = null;
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * CANVAS, ((e.clientY - r.top) / r.height) * CANVAS]; };
  canvas.addEventListener('pointerdown', (e) => { if (mode !== 'draw') return; canvas.setPointerCapture(e.pointerId); current = { w: pen, pts: [pos(e)] }; strokes.push(current); });
  canvas.addEventListener('pointermove', (e) => { if (!current) return; current.pts.push(pos(e)); drawStroke(current, true); });
  const endStroke = () => { if (!current) return; current = null; scheduleAnalyze(); };
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);

  function drawStroke(s, last = false) {
    const p = s.pts;
    cx.strokeStyle = '#1a0f0a'; cx.lineWidth = s.w; cx.lineCap = 'round'; cx.lineJoin = 'round';
    cx.beginPath();
    if (last && p.length >= 2) { cx.moveTo(...p[p.length - 2]); cx.lineTo(...p[p.length - 1]); }
    else { cx.moveTo(...p[0]); for (const q of p.slice(1)) cx.lineTo(...q); if (p.length === 1) cx.lineTo(p[0][0] + 0.1, p[0][1]); }
    cx.stroke();
  }
  function redrawStrokes() {
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, CANVAS, CANVAS);
    for (const s of strokes) drawStroke(s);
  }

  let timer = null;
  function scheduleAnalyze() { clearTimeout(timer); timer = setTimeout(analyze, 250); }

  function setMode(m) {
    mode = m;
    for (const b of modes.children) b.classList.toggle('active', b.dataset.mode === m);
    exampleBar.hidden = m !== 'example';
    drawBar.hidden = m !== 'draw';
    if (m === 'draw') { placeholder.hidden = true; canvas.hidden = false; overlay.hidden = false; canvas.style.touchAction = 'none'; redrawStrokes(); clearResult(); }
    if (m === 'example') loadExample();
    if (m === 'image') { if (!sourceImage) { placeholder.hidden = false; canvas.hidden = true; overlay.hidden = true; clearResult(); } else showImage(sourceImage); }
  }

  function loadFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); sourceImage = img; showImage(img); analyze(); };
    img.onerror = () => { status.textContent = 'Image illisible.'; };
    img.src = url;
  }

  function showImage(img) {
    const k = Math.min(1, 1400 / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    canvas.width = Math.round((img.naturalWidth || img.width) * k); canvas.height = Math.round((img.naturalHeight || img.height) * k);
    overlay.width = canvas.width; overlay.height = canvas.height;
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, canvas.width, canvas.height);
    cx.drawImage(img, 0, 0, canvas.width, canvas.height);
    placeholder.hidden = true; canvas.hidden = false; overlay.hidden = false;
  }

  function loadExample() {
    const sp = SPELLS.find((s) => s.id === exampleSelect.value);
    const svg = sealSVG(sp.seal, { size: 640, color: '#1a0f0a', strokeWidth: 4.5 });
    const img = new Image();
    img.onload = () => {
      canvas.width = CANVAS; canvas.height = CANVAS; overlay.width = CANVAS; overlay.height = CANVAS;
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, CANVAS, CANVAS);
      cx.save();
      const rot = jitter.checked ? (Math.random() - 0.5) * 60 : 0;
      const dx = jitter.checked ? (Math.random() - 0.5) * 40 : 0, dy = jitter.checked ? (Math.random() - 0.5) * 40 : 0;
      cx.translate(CANVAS / 2 + dx, CANVAS / 2 + dy); cx.rotate((rot * Math.PI) / 180);
      cx.drawImage(img, -320, -320);
      cx.restore();
      sourceImage = null;
      placeholder.hidden = true; canvas.hidden = false; overlay.hidden = false;
      analyze();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // Ouvre un sceau venu du compositeur / grimoire : on le rend puis on le reconnaît.
  function openSeal(payload) {
    if (!payload || !payload.seal) return;
    const svg = sealSVG(payload.seal, { size: 640, color: '#1a0f0a', strokeWidth: 4.5 });
    const img = new Image();
    img.onload = () => {
      setMode('image');
      canvas.width = CANVAS; canvas.height = CANVAS; overlay.width = CANVAS; overlay.height = CANVAS;
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, CANVAS, CANVAS); cx.drawImage(img, 40, 40);
      sourceImage = null; placeholder.hidden = true; canvas.hidden = false; overlay.hidden = false;
      analyze();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function clearResult() {
    rec = null;
    overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
    readingBox.replaceChildren(h('h2', {}, 'Lecture'), h('p', { class: 'muted' }, mode === 'draw' ? 'Commencez par tracer le cercle.' : 'En attente d\'un sceau.'));
    elementsBox.hidden = true;
    status.textContent = '';
  }

  function analyze() {
    if (canvas.hidden) return;
    status.textContent = 'Lecture en cours…';
    requestAnimationFrame(() => {
      const t0 = performance.now();
      const img = cx.getImageData(0, 0, canvas.width, canvas.height);
      const mask = maskFromImageData(img);
      rec = recognize(mask);
      if (!rec.ok) { status.textContent = rec.reason; clearResult(); return; }
      status.textContent = `${rec.elements.length} glyphe${rec.elements.length > 1 ? 's' : ''} reconnu${rec.elements.length > 1 ? 's' : ''}${rec.unknown.length ? `, ${rec.unknown.length} inconnu${rec.unknown.length > 1 ? 's' : ''}` : ''} · cercle ${Math.round(rec.ring.coverage * 100)} % tracé${rec.ring.fallback ? ' (cercle non détecté, estimé)' : ''} · ${Math.round(performance.now() - t0)} ms`;
      drawOverlay();
      renderResult();
    });
  }

  function drawOverlay() {
    const o = overlay.getContext('2d');
    o.clearRect(0, 0, overlay.width, overlay.height);
    if (!rec || !showOverlay) return;
    o.lineWidth = 2;
    o.strokeStyle = 'rgba(29,90,107,0.8)';
    o.setLineDash([6, 4]);
    o.beginPath(); o.arc(rec.ring.cx, rec.ring.cy, rec.ring.r, 0, Math.PI * 2); o.stroke();
    for (const ir of rec.innerRings) { o.beginPath(); o.arc(ir.cx, ir.cy, ir.r, 0, Math.PI * 2); o.stroke(); }
    o.setLineDash([]);
    if (rec.ring.gap) {
      o.strokeStyle = 'rgba(200,120,20,0.9)'; o.lineWidth = 6;
      const a0 = ((rec.ring.gap.angle - rec.ring.gap.width / 2 - 90) * Math.PI) / 180, a1 = ((rec.ring.gap.angle + rec.ring.gap.width / 2 - 90) * Math.PI) / 180;
      o.beginPath(); o.arc(rec.ring.cx, rec.ring.cy, rec.ring.r, a0, a1); o.stroke();
    }
    o.font = `${Math.max(11, overlay.width / 60)}px ${getComputedStyle(document.body).fontFamily}`;
    for (const e of [...rec.elements, ...rec.unknown]) {
      const known = rec.elements.includes(e) && !e.ignored;
      o.lineWidth = 2;
      o.strokeStyle = known ? (e.confidence > 0.55 ? 'rgba(47,107,58,0.9)' : 'rgba(138,90,18,0.9)') : 'rgba(160,40,40,0.9)';
      o.strokeRect(e.box.x0 - 3, e.box.y0 - 3, e.box.x1 - e.box.x0 + 6, e.box.y1 - e.box.y0 + 6);
      const label = known ? GLYPHS[e.glyph].fr.replace(/^(Signe|Sigil)( décoratif)? (de |des |d'|du |: )?/, '') + (e.inverted ? ' ↺' : '') : '?';
      o.fillStyle = o.strokeStyle;
      o.fillText(label, e.box.x0, Math.max(12, e.box.y0 - 6));
    }
  }

  function renderResult() {
    const reading = readSeal(rec.seal, { unknown: rec.unknown.map((u) => ({ angle: u.angle })) });
    readingBox.replaceChildren(renderReading(reading, { onOpenSpell: (sp) => openDrawer(spellDetail(sp, ctx)) }));
    readingBox.append(h('div', { class: 'btn-row', style: { marginTop: '0.8rem' } },
      h('button', { class: 'btn small', onClick: () => ctx.goto('composer', { seal: rec.seal, name: reading.title }) }, 'Ouvrir le relevé dans le compositeur'),
      h('button', { class: 'btn small', onClick: () => download('releve-sceau.svg', sealSVG(rec.seal, { size: 600, color: '#6b1a1a' }), 'image/svg+xml') }, 'Télécharger le relevé (SVG)'),
    ));
    readingBox.append(h('div', { class: 'seal-preview', style: { marginTop: '0.8rem' }, html: sealSVG(rec.seal, { size: 260 }) }), h('p', { class: 'muted', style: { textAlign: 'center' } }, 'Relevé : le sceau tel que le lecteur l\'a compris.'));

    // tableau des éléments, avec correction manuelle
    const table = h('table', { class: 'elements-table' });
    const all = [...rec.elements, ...rec.unknown].sort((a, b) => a.angle - b.angle);
    for (const e of all) {
      const known = rec.elements.includes(e);
      const sel = h('select', { onChange: (ev) => { const v = ev.target.value; if (v === '__ignore') { e.ignored = true; } else { const [g, inv] = v.split('|'); if (!known) { rec.unknown = rec.unknown.filter((u) => u !== e); rec.elements.push(e); } relabel(rec, e, g, inv === '1'); } rec.seal = assembleSeal(rec); drawOverlay(); renderResult(); } });
      const opts = [];
      for (const a of e.alternatives) opts.push([`${a.glyph}|${a.inverted ? 1 : 0}`, `${GLYPHS[a.glyph].fr}${a.inverted ? ' (inversé)' : ''} — ${Math.round(a.confidence * 100)} %`]);
      const group = (label, ids) => { const og = h('optgroup', { label }); for (const id of ids) { og.append(h('option', { value: `${id}|0` }, GLYPHS[id].fr)); if (GLYPHS[id].kind === 'sign' && GLYPHS[id].dir !== 'non') og.append(h('option', { value: `${id}|1` }, `${GLYPHS[id].fr} (inversé)`)); } return og; };
      const top = h('optgroup', { label: 'Candidats' }, ...opts.map(([v, l]) => h('option', { value: v }, l)));
      sel.append(top, group('Signes', SIGN_IDS), group('Sigils', SIGIL_IDS), group('Sigils décoratifs', DECORATIVE_IDS), h('option', { value: '__ignore' }, '— Ignorer ce tracé —'));
      sel.value = e.ignored ? '__ignore' : (known ? `${e.glyph}|${e.inverted ? 1 : 0}` : opts[0]?.[0]);
      if (!known && sel.value !== '__ignore') sel.value = '__ignore';
      const conf = h('span', { class: `conf${e.confidence < 0.55 ? ' low' : ''}`, title: `${Math.round(e.confidence * 100)} %` }, h('i', { style: { width: `${Math.round(e.confidence * 100)}%` } }));
      table.append(h('tr', {},
        h('td', { class: 'glyph-cell' }, known && !e.ignored ? glyphIcon(e.glyph, { inverted: e.inverted && !GLYPHS[e.glyph].invertedShape, rot: 0 }) : h('span', { class: 'muted' }, '?')),
        h('td', {}, sel),
        h('td', {}, conf),
        h('td', { class: 'muted' }, `${Math.round(e.angle)}° · ${e.dist < 0.22 ? 'centre' : 'r ' + e.dist.toFixed(2)}`),
      ));
    }
    elementsBox.replaceChildren(h('h3', {}, 'Glyphes repérés'), h('p', { class: 'muted', style: { fontSize: '0.85rem' } }, 'Corrigez une identification douteuse : la lecture se recalcule.'), table);
    elementsBox.hidden = false;
  }

  // Bascule d'onglet : rien à faire, l'état est conservé.
}
