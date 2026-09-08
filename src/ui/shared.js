import { GLYPHS, DIR_LABEL, ELEMENT_LABEL } from '../glyphs.js';
import { glyphSVG, sealSVG } from '../seal.js';
import { readSeal } from '../interpreter.js';
import { SPELL_BY_ID, TYPE_LABEL } from '../spells.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

export function glyphIcon(id, opts = {}) {
  const span = h('span', { class: 'glyph-svg', html: glyphSVG(id, { size: opts.size ?? 40, inverted: opts.inverted, rot: opts.rot ?? 0 }) });
  return span;
}

export function sealFigure(seal, opts = {}) {
  return h('div', { class: 'seal-preview', html: sealSVG(seal, { size: opts.size ?? 420, highlight: opts.highlight }) });
}

export function typeBadge(type) {
  return h('span', { class: 'badge' }, TYPE_LABEL[type] || ELEMENT_LABEL[type] || type);
}

export function glyphLabel(id, inverted = false) {
  const g = GLYPHS[id];
  return `${g.fr}${inverted ? ' (inversé)' : ''}`;
}

export function dirLabel(g) { return DIR_LABEL[g.dir] || ''; }

// Rendu d'une lecture (résultat de readSeal) en carte HTML.
export function renderReading(reading, opts = {}) {
  const wrap = h('div', { class: 'reading' });
  const badges = h('div', { class: 'btn-row', style: { marginBottom: '0.6rem' } });
  badges.append(h('span', { class: 'badge' }, reading.type));
  if (reading.match) {
    const cls = reading.match.kind === 'exact' ? 'ok' : reading.match.kind === 'close' ? 'accent' : 'grey';
    const label = reading.match.kind === 'exact' ? 'sceau connu' : reading.match.kind === 'close' ? `proche à ${Math.round(reading.match.score * 100)} %` : `apparenté (${Math.round(reading.match.score * 100)} %)`;
    badges.append(h('span', { class: `badge ${cls}` }, label));
  }
  if (!reading.analysis.ring.closed) badges.append(h('span', { class: 'badge warn' }, 'cercle ouvert'));
  if (reading.analysis.ring.nested) badges.append(h('span', { class: 'badge accent' }, 'sceaux imbriqués'));
  for (const w of reading.warnings) badges.append(h('span', { class: 'badge warn' }, w));
  if (!opts.hideTitle) wrap.append(h('h2', {}, reading.title));
  wrap.append(badges);
  if (reading.match && reading.match.kind === 'exact' && !opts.hideEffect) {
    wrap.append(h('p', { class: 'lead' }, reading.match.spell.effect));
  }
  const ol = h('ol');
  for (const p of reading.paragraphs) ol.append(h('li', {}, p));
  wrap.append(ol);
  if (reading.match && reading.match.spell && opts.onOpenSpell) {
    wrap.append(h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onClick: () => opts.onOpenSpell(reading.match.spell) }, `Voir « ${reading.match.spell.fr} » dans le grimoire`)));
  }
  return wrap;
}

export function readAndRender(seal, opts = {}) {
  return renderReading(readSeal(seal, opts), opts);
}

export function download(filename, blobOrText, type = 'text/plain') {
  const blob = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function openDrawer(content) {
  const backdrop = h('div', { class: 'drawer-backdrop' });
  const drawer = h('div', { class: 'drawer', role: 'dialog', 'aria-modal': 'true' });
  const close = () => { backdrop.remove(); drawer.remove(); document.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', close); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', close);
  drawer.append(h('button', { class: 'btn small close', onClick: close, 'aria-label': 'Fermer' }, '✕ Fermer'), content);
  document.body.append(backdrop, drawer);
  return close;
}

export function spellById(id) { return SPELL_BY_ID[id]; }

// Sérialisation compacte d'un sceau pour le compositeur / le partage.
export function serializeSeal(seal) {
  return JSON.stringify(seal, (k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v));
}
