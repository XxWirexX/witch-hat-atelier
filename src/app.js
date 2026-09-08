import { mountRead } from './ui/read.js';
import { mountCompose } from './ui/compose.js';
import { mountGrimoire } from './ui/grimoire.js';
import { mountDictionary } from './ui/dictionary.js';
import { mountRules } from './ui/rules.js';

const TABS = ['lire', 'composer', 'grimoire', 'dictionnaire', 'regles'];
const mounted = {};
const bus = new EventTarget();

function activate(name) {
  if (!TABS.includes(name)) name = 'lire';
  for (const t of TABS) {
    const sec = document.getElementById(`tab-${t}`);
    const link = document.querySelector(`.tabs a[data-tab="${t}"]`);
    const on = t === name;
    sec.hidden = !on;
    link.classList.toggle('active', on);
    if (on) link.setAttribute('aria-selected', 'true'); else link.removeAttribute('aria-selected');
  }
  if (!mounted[name]) {
    const sec = document.getElementById(`tab-${name}`);
    const ctx = { bus, goto: (tab, payload) => { if (payload) bus.dispatchEvent(new CustomEvent(`open:${tab}`, { detail: payload })); location.hash = tab; } };
    ({ lire: mountRead, composer: mountCompose, grimoire: mountGrimoire, dictionnaire: mountDictionary, regles: mountRules })[name](sec, ctx);
    mounted[name] = true;
  }
  bus.dispatchEvent(new CustomEvent('tab', { detail: name }));
}

function route() {
  const [tab] = location.hash.replace('#', '').split('/');
  activate(tab || 'lire');
}
window.addEventListener('hashchange', route);

// Thème
const root = document.documentElement;
try {
  const saved = localStorage.getItem('grimoire-theme');
  if (saved) root.dataset.theme = saved;
} catch { /* stockage indisponible */ }
document.getElementById('theme-toggle').addEventListener('click', () => {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('grimoire-theme', root.dataset.theme); } catch { /* ignore */ }
});

// Pré-monte l'onglet Composer si on y saute avec un sort (événement émis avant le montage)
bus.addEventListener('open:composer', (e) => { sessionStorage.setItem('grimoire-open-composer', JSON.stringify(e.detail)); });
bus.addEventListener('open:lire', (e) => { sessionStorage.setItem('grimoire-open-lire', JSON.stringify(e.detail)); });

route();
