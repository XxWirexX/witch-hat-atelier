// Onglet « Composer » : assembler un sceau et le lire en direct.
import { GLYPHS, SIGN_IDS, SIGIL_IDS, DECORATIVE_IDS } from '../glyphs.js';
import { makeSeal, sigil, ringOf, at, sealSVG } from '../seal.js';
import { SPELLS, SPELL_BY_ID } from '../spells.js';
import { readSeal } from '../interpreter.js';
import { h, glyphIcon, renderReading, openDrawer, download } from './shared.js';
import { spellDetail } from './grimoire.js';

const DEFAULT = {
  name: 'Mon sceau',
  sigils: [{ glyph: 'fire', size: 0.5, x: 0, y: 0, rot: 0 }],
  rings: [{ glyph: 'levitation', n: 4, start: 45, dist: 0.72, size: 0.34, inverted: false, tilt: 0 }],
  gap: false, gapAngle: 205,
};

export function mountCompose(root, ctx) {
  let state = load() || structuredClone(DEFAULT);

  const preview = h('div', { class: 'seal-preview' });
  const readingBox = h('div', { class: 'card' });
  const controls = h('div', { class: 'card' });
  const nameInput = h('input', { type: 'text', value: state.name, onInput: (e) => { state.name = e.target.value; save(); } });

  root.append(h('div', { class: 'grid-3' },
    controls,
    h('div', { class: 'card' },
      h('div', { class: 'btn-row', style: { marginBottom: '0.6rem', justifyContent: 'space-between' } },
        h('label', { class: 'field', style: { flex: '1' } }, h('span', {}, 'Nom du sceau'), nameInput),
      ),
      preview,
      h('div', { class: 'btn-row', style: { marginTop: '0.8rem' } },
        h('button', { class: 'btn', onClick: () => download(`${slug(state.name)}.svg`, sealSVG(build(), { size: 800, color: '#6b1a1a' }), 'image/svg+xml') }, 'SVG'),
        h('button', { class: 'btn', onClick: exportPNG }, 'PNG'),
        h('button', { class: 'btn', onClick: () => ctx.goto('lire', { seal: build(), name: state.name }) }, 'Tester la reconnaissance'),
        h('button', { class: 'btn', onClick: () => download(`${slug(state.name)}.json`, JSON.stringify(state, null, 2), 'application/json') }, 'Exporter la recette'),
      ),
    ),
    readingBox,
  ));

  ctx.bus.addEventListener('open:composer', (e) => importSeal(e.detail));
  const pending = sessionStorage.getItem('grimoire-open-composer');
  if (pending) { sessionStorage.removeItem('grimoire-open-composer'); try { importSeal(JSON.parse(pending)); } catch { /* ignore */ } }

  renderControls();
  refresh();

  // ── construction du sceau à partir de l'état ──
  function build() {
    const els = [];
    for (const s of state.sigils) els.push(sigil(s.glyph, { size: s.size, x: s.x, y: s.y, rot: s.rot, inverted: s.inverted }));
    for (const r of state.rings) {
      if (r.n === 1 && r.dist < 0.12) els.push(at(r.glyph, 0, 0, r.size, { inverted: r.inverted, rot: r.tilt }));
      else els.push(...ringOf(r.glyph, r.n, { start: r.start, dist: r.dist, size: r.size, inverted: r.inverted, tilt: r.tilt, sizes: r.sizes }));
    }
    const children = (state.children || []).map((c) => ({ seal: c.seal, x: c.x, y: c.y, scale: c.scale }));
    return makeSeal(els, { gap: state.gap ? { angle: state.gapAngle, width: 14 } : null, children });
  }

  function refresh() {
    const seal = build();
    preview.innerHTML = sealSVG(seal, { size: 480 });
    readingBox.replaceChildren(renderReading(readSeal(seal), { onOpenSpell: (sp) => openDrawer(spellDetail(sp, ctx)) }));
    save();
  }

  // ── contrôles ──
  function renderControls() {
    controls.replaceChildren();
    controls.append(h('h3', {}, 'Sigils'));
    state.sigils.forEach((s, i) => controls.append(sigilRow(s, i)));
    controls.append(h('div', { class: 'btn-row', style: { margin: '0.4rem 0 1rem' } },
      h('button', { class: 'btn small', onClick: () => { state.sigils.push({ glyph: 'water', size: 0.4, x: 0, y: 0, rot: 0 }); renderControls(); refresh(); } }, '+ Ajouter un sigil')));
    controls.append(h('h3', {}, 'Signes'));
    state.rings.forEach((r, i) => controls.append(signRow(r, i)));
    controls.append(h('div', { class: 'btn-row', style: { margin: '0.4rem 0 1rem' } },
      h('button', { class: 'btn small', onClick: () => { state.rings.push({ glyph: 'columns', n: 4, start: 0, dist: 0.72, size: 0.3, inverted: false, tilt: 0 }); renderControls(); refresh(); } }, '+ Ajouter des signes')));
    controls.append(h('h3', {}, 'Cercle'));
    const gapChk = h('input', { type: 'checkbox', checked: state.gap, onChange: (e) => { state.gap = e.target.checked; refresh(); } });
    const gapAngle = h('input', { type: 'range', min: 0, max: 359, value: state.gapAngle, onInput: (e) => { state.gapAngle = +e.target.value; refresh(); } });
    controls.append(h('label', { class: 'field' }, h('span', {}, h('span', {}, gapChk, ' Laisser une brèche (sort préparé, inactif)')), gapAngle));
    if (state.children?.length) controls.append(h('p', { class: 'muted', style: { fontSize: '0.85rem' } }, `${state.children.length} sceau(x) imbriqué(s) importé(s) — non éditables ici.`));
    controls.append(h('h3', { style: { marginTop: '1rem' } }, 'Partir d\'un sort'));
    const sel = h('select', {}, h('option', { value: '' }, '— grimoire —'), ...SPELLS.map((s) => h('option', { value: s.id }, s.fr)));
    sel.addEventListener('change', () => { if (sel.value) importSeal({ seal: SPELL_BY_ID[sel.value].seal, name: SPELL_BY_ID[sel.value].fr }); });
    controls.append(sel, h('div', { class: 'btn-row', style: { marginTop: '0.8rem' } },
      h('button', { class: 'btn small', onClick: () => { state = structuredClone(DEFAULT); nameInput.value = state.name; renderControls(); refresh(); } }, 'Réinitialiser'),
      h('label', { class: 'btn small' }, 'Importer une recette', h('input', { type: 'file', accept: 'application/json', hidden: true, onChange: (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { try { state = { ...structuredClone(DEFAULT), ...JSON.parse(t) }; nameInput.value = state.name; renderControls(); refresh(); } catch { alert('Recette illisible.'); } }); } })),
    ));
  }

  function glyphSelect(value, ids, onChange) {
    const sel = h('select', { onChange: (e) => onChange(e.target.value) });
    for (const [label, list] of ids) {
      const og = h('optgroup', { label });
      for (const id of list) og.append(h('option', { value: id, selected: id === value }, GLYPHS[id].fr));
      sel.append(og);
    }
    return sel;
  }

  function slider(label, value, min, max, step, onInput, fmt = (v) => v) {
    const out = h('b', {}, fmt(value));
    const input = h('input', { type: 'range', min, max, step, value, onInput: (e) => { const v = +e.target.value; out.textContent = fmt(v); onInput(v); } });
    return h('label', {}, h('span', {}, label, out), input);
  }

  function sigilRow(s, i) {
    const icon = glyphIcon(s.glyph, { size: 34 });
    const row = h('div', { class: 'sign-row' },
      h('div', { class: 'row-head' }, icon,
        glyphSelect(s.glyph, [['Sigils', SIGIL_IDS], ['Sigils décoratifs', DECORATIVE_IDS], ['Signes (au centre)', SIGN_IDS]], (v) => { s.glyph = v; icon.innerHTML = glyphIcon(v, { size: 34 }).innerHTML; refresh(); }),
        h('button', { class: 'icon-btn', title: 'Retirer', onClick: () => { state.sigils.splice(i, 1); renderControls(); refresh(); } }, '✕')),
      h('div', { class: 'sliders' },
        slider('Taille', s.size, 0.1, 1.9, 0.02, (v) => { s.size = v; refresh(); }, (v) => v.toFixed(2)),
        slider('Rotation', s.rot, -180, 180, 5, (v) => { s.rot = v; refresh(); }, (v) => `${v}°`),
        slider('Position ↔', s.x, -0.8, 0.8, 0.02, (v) => { s.x = v; refresh(); }, (v) => v.toFixed(2)),
        slider('Position ↕', s.y, -0.8, 0.8, 0.02, (v) => { s.y = v; refresh(); }, (v) => v.toFixed(2)),
      ),
    );
    return row;
  }

  function signRow(r, i) {
    const g = GLYPHS[r.glyph];
    const icon = glyphIcon(r.glyph, { size: 34, inverted: r.inverted && !g.invertedShape });
    const invChk = h('input', { type: 'checkbox', checked: r.inverted, onChange: (e) => { r.inverted = e.target.checked; icon.innerHTML = glyphIcon(r.glyph, { size: 34, inverted: r.inverted && !GLYPHS[r.glyph].invertedShape }).innerHTML; refresh(); } });
    const row = h('div', { class: 'sign-row' },
      h('div', { class: 'row-head' }, icon,
        glyphSelect(r.glyph, [['Signes', SIGN_IDS], ['Sigils (en couronne)', SIGIL_IDS], ['Décoratifs', DECORATIVE_IDS]], (v) => { r.glyph = v; icon.innerHTML = glyphIcon(v, { size: 34, inverted: r.inverted }).innerHTML; refresh(); }),
        h('button', { class: 'icon-btn', title: 'Retirer', onClick: () => { state.rings.splice(i, 1); renderControls(); refresh(); } }, '✕')),
      h('div', { class: 'sliders' },
        slider('Nombre', r.n, 1, 24, 1, (v) => { r.n = v; refresh(); }),
        slider('Angle de départ', r.start, 0, 359, 1, (v) => { r.start = v; refresh(); }, (v) => `${v}°`),
        slider('Distance au centre', r.dist, 0, 1.05, 0.01, (v) => { r.dist = v; refresh(); }, (v) => v.toFixed(2)),
        slider('Longueur', r.size, 0.06, 1.9, 0.02, (v) => { r.size = v; refresh(); }, (v) => v.toFixed(2)),
        slider('Inclinaison', r.tilt, -90, 90, 5, (v) => { r.tilt = v; refresh(); }, (v) => `${v}°`),
        slider('Un signe plus long', r.longer ?? 1, 1, 2.5, 0.05, (v) => { r.longer = v; r.sizes = v > 1 ? [r.size * v] : null; refresh(); }, (v) => `×${v.toFixed(2)}`),
      ),
      h('div', { class: 'toggles' }, h('label', {}, invChk, ' inversés (tournés vers l\'extérieur)'), h('span', { class: 'muted' }, g.dir ? `· ${g.dir === 'non' ? 'non directionnel' : g.dir === 'semi' ? 'semi-directionnel' : g.dir === 'directional' ? 'directionnel' : g.dir}` : '')),
    );
    return row;
  }

  // Import d'un sceau (grimoire, relevé) → état éditable.
  function importSeal(payload) {
    const seal = payload.seal;
    if (!seal) return;
    const st = { name: payload.name || 'Sceau importé', sigils: [], rings: [], gap: !!seal.gap, gapAngle: seal.gap?.angle ?? 205, children: seal.children || [] };
    // regroupe les éléments identiques disposés en couronne
    const groups = new Map();
    for (const el of seal.elements) {
      const d = Math.hypot(el.x, el.y);
      const g = GLYPHS[el.glyph];
      if (g.kind !== 'sign' || d < 0.12) {
        st.sigils.push({ glyph: el.glyph, size: el.size, x: el.x, y: el.y, rot: typeof el.rot === 'number' ? el.rot : 0, inverted: !!el.inverted });
        continue;
      }
      const key = `${el.glyph}|${el.inverted ? 1 : 0}|${Math.round(el.size * 20)}|${Math.round(d * 10)}|${el.tilt || 0}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(el);
    }
    for (const list of groups.values()) {
      const first = list[0];
      const angles = list.map((e) => ((Math.atan2(e.x, -e.y) * 180) / Math.PI + 360) % 360).sort((a, b) => a - b);
      const d = Math.hypot(first.x, first.y);
      st.rings.push({ glyph: first.glyph, n: list.length, start: Math.round(angles[0]), dist: Math.round(d * 100) / 100, size: Math.round(first.size * 100) / 100, inverted: !!first.inverted, tilt: first.tilt || (typeof first.rot === 'number' && d >= 0.12 ? 0 : 0) });
    }
    state = st;
    nameInput.value = state.name;
    renderControls();
    refresh();
  }

  function exportPNG() {
    const svg = sealSVG(build(), { size: 1200, color: '#6b1a1a', background: '#f5eddc' });
    const img = new Image();
    img.onload = () => {
      const c = h('canvas', { width: 1200, height: 1200 });
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob((b) => download(`${slug(state.name)}.png`, b), 'image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function save() { try { localStorage.setItem('grimoire-composer', JSON.stringify(state)); } catch { /* ignore */ } }
  function load() { try { const s = localStorage.getItem('grimoire-composer'); return s ? JSON.parse(s) : null; } catch { return null; } }
}

function slug(s) { return (s || 'sceau').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sceau'; }
