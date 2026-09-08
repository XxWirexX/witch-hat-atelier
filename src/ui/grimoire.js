// Onglet « Grimoire » : les sceaux canoniques et leur lecture.
import { GLYPHS } from '../glyphs.js';
import { sealSVG, flatten } from '../seal.js';
import { SPELLS, TYPE_LABEL, collectGlyphs } from '../spells.js';
import { readSeal } from '../interpreter.js';
import { h, renderReading, openDrawer, typeBadge, glyphIcon, download } from './shared.js';

export function spellDetail(sp, ctx) {
  const reading = readSeal(sp.seal);
  const glyphs = [...collectGlyphs(sp.seal)];
  const wrap = h('div', {},
    h('h2', { style: { color: 'var(--seal)', marginTop: '0.4rem' } }, sp.fr),
    h('div', { class: 'btn-row', style: { marginBottom: '0.6rem' } }, typeBadge(sp.type), sp.forbidden ? h('span', { class: 'badge warn' }, 'magie interdite') : null, sp.official === false ? h('span', { class: 'badge grey' }, 'nom non officiel') : null),
    h('div', { class: 'seal-preview', html: sealSVG(sp.seal, { size: 380 }) }),
    h('dl', { class: 'kv' },
      sp.en ? [h('dt', {}, 'Anglais'), h('dd', {}, sp.en)] : null,
      sp.jp ? [h('dt', {}, 'Japonais'), h('dd', {}, `${sp.jp}${sp.romaji ? ` (${sp.romaji})` : ''}`)] : null,
      h('dt', {}, 'Première apparition'), h('dd', {}, `Chapitre ${sp.chapter}${sp.episode ? ` · épisode ${sp.episode}` : ''}`),
      sp.users?.length ? [h('dt', {}, 'Lanceurs'), h('dd', {}, sp.users.join(', '))] : null,
      sp.creator ? [h('dt', {}, 'Créé par'), h('dd', {}, sp.creator)] : null,
      h('dt', {}, 'Composants'), h('dd', {}, h('div', { class: 'chips' }, ...glyphs.map((id) => h('span', { class: 'chip', onClick: () => ctx.goto('dictionnaire', { glyph: id }) }, GLYPHS[id].fr)))),
    ),
    h('p', { class: 'lead' }, sp.effect),
    sp.notes ? h('p', { class: 'muted' }, sp.notes) : null,
    h('h3', {}, 'Lecture du sceau'),
    renderReading(reading, { hideEffect: true, hideTitle: true }),
    h('div', { class: 'btn-row', style: { marginTop: '0.8rem' } },
      h('button', { class: 'btn primary', onClick: () => ctx.goto('composer', { seal: sp.seal, name: sp.fr }) }, 'Ouvrir dans le compositeur'),
      h('button', { class: 'btn', onClick: () => ctx.goto('lire', { seal: sp.seal, name: sp.fr }) }, 'Tester la reconnaissance'),
      h('button', { class: 'btn', onClick: () => download(`${sp.id}.svg`, sealSVG(sp.seal, { size: 800, color: '#6b1a1a' }), 'image/svg+xml') }, 'SVG'),
    ),
  );
  return wrap;
}

export function mountGrimoire(root, ctx) {
  const search = h('input', { type: 'search', placeholder: 'Rechercher un sort, un glyphe, un lanceur…' });
  const typeSel = h('select', {}, h('option', { value: '' }, 'Tous les types'), ...Object.entries(TYPE_LABEL).map(([k, v]) => h('option', { value: k }, v)));
  const count = h('span', { class: 'muted' });
  const cards = h('div', { class: 'cards' });
  root.append(
    h('div', { class: 'filter-bar' }, search, typeSel, count),
    cards,
  );
  const render = () => {
    const q = search.value.trim().toLowerCase();
    const t = typeSel.value;
    cards.replaceChildren();
    let n = 0;
    for (const sp of SPELLS) {
      if (t && sp.type !== t) continue;
      if (q) {
        const hay = [sp.fr, sp.en, sp.jp, sp.romaji, sp.effect, sp.notes, ...(sp.users || []), ...[...collectGlyphs(sp.seal)].map((g) => GLYPHS[g].fr)].join(' ').toLowerCase();
        if (!hay.includes(q)) continue;
      }
      n++;
      cards.append(h('div', { class: 'card spell-card', onClick: () => openDrawer(spellDetail(sp, ctx)) },
        h('div', { class: 'seal-preview', html: sealSVG(sp.seal, { size: 190 }) }),
        h('h3', {}, sp.fr),
        h('div', { class: 'meta' }, `${TYPE_LABEL[sp.type] || sp.type} · ch. ${sp.chapter}${sp.forbidden ? ' · interdit' : ''}`),
        h('p', { style: { fontSize: '0.9rem', margin: 0 } }, sp.effect),
      ));
    }
    count.textContent = `${n} sceau${n > 1 ? 'x' : ''}`;
  };
  search.addEventListener('input', render);
  typeSel.addEventListener('change', render);
  render();
  ctx.bus.addEventListener('open:grimoire', (e) => { const sp = SPELLS.find((s) => s.id === e.detail?.spell); if (sp) openDrawer(spellDetail(sp, ctx)); });
}
