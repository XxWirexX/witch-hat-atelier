// Onglet « Dictionnaire » : sigils et signes.
import { GLYPHS, SIGN_IDS, SIGIL_IDS, DECORATIVE_IDS, DIR_LABEL, ELEMENT_LABEL } from '../glyphs.js';
import { glyphSVG } from '../seal.js';
import { spellsUsing } from '../spells.js';
import { h, openDrawer } from './shared.js';
import { spellDetail } from './grimoire.js';

export function glyphDetail(id, ctx) {
  const g = GLYPHS[id];
  const using = spellsUsing(id);
  const canInvert = g.kind === 'sign' && g.dir !== 'non' && g.dir !== 'asymmetric';
  const pair = h('div', { class: 'glyph-pair' },
    h('figure', { html: glyphSVG(id, { size: 110 }) + `<figcaption>${g.kind === 'sign' ? 'à l\'endroit (haut = vers le centre)' : 'tel qu\'il apparaît'}</figcaption>` }),
    canInvert ? h('figure', { html: glyphSVG(id, { size: 110, inverted: true }) + '<figcaption>inversé</figcaption>' }) : null,
  );
  return h('div', {},
    h('h2', { style: { color: 'var(--seal)', marginTop: '0.4rem' } }, g.fr),
    h('div', { class: 'btn-row', style: { marginBottom: '0.8rem' } },
      h('span', { class: 'badge' }, g.kind === 'sign' ? 'signe · 矢' : g.kind === 'decorative' ? 'sigil décoratif · 装飾紋' : 'sigil · 紋'),
      g.dir ? h('span', { class: 'badge accent' }, DIR_LABEL[g.dir]) : null,
      g.element ? h('span', { class: 'badge grey' }, ELEMENT_LABEL[g.element] || g.element) : null,
      h('span', { class: `badge ${g.official ? 'ok' : 'warn'}` }, g.official ? 'nom officiel' : 'nom donné par les fans'),
      g.descOfficial ? h('span', { class: 'badge ok' }, 'effet confirmé') : h('span', { class: 'badge grey' }, 'effet déduit'),
      g.forbidden ? h('span', { class: 'badge warn' }, 'magie interdite') : null,
    ),
    pair,
    h('dl', { class: 'kv' },
      g.en ? [h('dt', {}, 'Anglais'), h('dd', {}, g.en)] : null,
      g.jp ? [h('dt', {}, 'Japonais'), h('dd', {}, `${g.jp}${g.romaji ? ` — ${g.romaji}` : ''}`)] : null,
      g.alt?.length ? [h('dt', {}, 'Autres noms'), h('dd', {}, g.alt.join(' · '))] : null,
      g.variantOf ? [h('dt', {}, 'Variante de'), h('dd', {}, GLYPHS[g.variantOf].fr)] : null,
      g.tetrad ? [h('dt', {}, 'Famille'), h('dd', {}, 'Tétrade primaire (les quatre sigils fondamentaux)')] : null,
    ),
    h('h3', {}, 'Effet'),
    h('p', {}, g.effect.charAt(0).toUpperCase() + g.effect.slice(1) + '.'),
    g.inverted ? h('p', {}, h('b', {}, 'Inversé : '), g.inverted + '.') : null,
    g.size ? h('p', {}, h('b', {}, 'Taille : '), g.size + '.') : null,
    g.count ? h('p', {}, h('b', {}, 'Nombre : '), g.count + '.') : null,
    g.tilt ? h('p', {}, h('b', {}, 'Inclinaison : '), g.tilt + '.') : null,
    g.hint ? h('p', { class: 'muted' }, g.hint) : null,
    h('h3', {}, `Sorts qui l'utilisent (${using.length})`),
    using.length ? h('div', { class: 'chips' }, ...using.map((sp) => h('span', { class: 'chip', onClick: () => openDrawer(spellDetail(sp, ctx)) }, sp.fr))) : h('p', { class: 'muted' }, 'Aucun sceau du grimoire — mais le glyphe est reconnu par le lecteur.'),
  );
}

export function mountDictionary(root, ctx) {
  const search = h('input', { type: 'search', placeholder: 'Colonne, feu, 浮遊, levitation…' });
  const kindSel = h('select', {}, h('option', { value: '' }, 'Tout'), h('option', { value: 'sigil' }, 'Sigils'), h('option', { value: 'sign' }, 'Signes'), h('option', { value: 'decorative' }, 'Sigils décoratifs'));
  const dirSel = h('select', {}, h('option', { value: '' }, 'Toute catégorie'), ...Object.entries(DIR_LABEL).map(([k, v]) => h('option', { value: k }, v)));
  const count = h('span', { class: 'muted' });
  const body = h('div');
  root.append(h('div', { class: 'filter-bar' }, search, kindSel, dirSel, count), body);

  const card = (id) => {
    const g = GLYPHS[id];
    return h('div', { class: 'card glyph-card', onClick: () => openDrawer(glyphDetail(id, ctx)) },
      h('div', { class: 'glyph-svg', html: glyphSVG(id, { size: 72 }) }),
      h('div', {},
        h('h3', {}, g.fr),
        h('div', { class: 'names' }, [g.en, g.jp].filter(Boolean).join(' · ')),
        h('p', { style: { fontSize: '0.88rem', margin: '0.3rem 0 0' } }, g.effect.charAt(0).toUpperCase() + g.effect.slice(1) + '.'),
        h('div', { class: 'btn-row', style: { marginTop: '0.3rem' } }, g.dir ? h('span', { class: 'badge accent' }, DIR_LABEL[g.dir]) : null, g.official ? null : h('span', { class: 'badge warn' }, 'nom fan')),
      ));
  };

  const render = () => {
    const q = search.value.trim().toLowerCase();
    body.replaceChildren();
    let n = 0;
    const sections = [['Sigils (紋, mon)', 'sigil', SIGIL_IDS, 'Le sigil, au centre, décide de quoi le sort est fait : feu, eau, terre, vent, lumière… Sa taille règle l\'intensité.'], ['Signes (矢, ya)', 'sign', SIGN_IDS, 'Les signes disent comment la magie se manifeste : direction, forme, portée. Leur longueur, leur nombre, leur orientation et leur symétrie comptent.'], ['Sigils décoratifs (装飾紋)', 'decorative', DECORATIVE_IDS, 'Ils sculptent le sort à l\'image d\'une créature ou d\'une plante, ou limitent son effet à elle.']];
    for (const [title, kind, ids, intro] of sections) {
      if (kindSel.value && kindSel.value !== kind) continue;
      const list = ids.filter((id) => {
        const g = GLYPHS[id];
        if (dirSel.value && g.dir !== dirSel.value) return false;
        if (!q) return true;
        return [g.fr, g.en, g.jp, g.romaji, g.effect, g.hint, ...(g.alt || [])].join(' ').toLowerCase().includes(q);
      });
      if (!list.length) continue;
      n += list.length;
      body.append(h('div', { class: 'section-title' }, h('h2', {}, title), h('span', { class: 'muted' }, `${list.length}`)), h('p', { class: 'muted', style: { marginTop: '-0.4rem' } }, intro), h('div', { class: 'cards' }, ...list.map(card)));
    }
    count.textContent = `${n} glyphes`;
  };
  search.addEventListener('input', render);
  kindSel.addEventListener('change', render);
  dirSel.addEventListener('change', render);
  render();
  ctx.bus.addEventListener('open:dictionnaire', (e) => { if (e.detail?.glyph && GLYPHS[e.detail.glyph]) openDrawer(glyphDetail(e.detail.glyph, ctx)); });
  const pending = sessionStorage.getItem('grimoire-open-dictionnaire');
  if (pending) {
    sessionStorage.removeItem('grimoire-open-dictionnaire');
    try { const { glyph } = JSON.parse(pending); if (GLYPHS[glyph]) openDrawer(glyphDetail(glyph, ctx)); } catch { /* ignore */ }
  }
}
