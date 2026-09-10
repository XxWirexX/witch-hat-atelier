// Service worker : rend l'application utilisable hors ligne.
//
// Tout tourne déjà dans le navigateur — aucune requête réseau une fois la page
// chargée — donc la mettre en cache suffit à la rendre entièrement autonome.
//
// CACHE porte un numéro : le changer force le remplacement de l'ancien cache.
const CACHE = 'grimoire-v1';

const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'src/app.js',
  'src/geometry.js',
  'src/glyphs.js',
  'src/seal.js',
  'src/spells.js',
  'src/interpreter.js',
  'src/recognizer.js',
  'src/hypothesis.js',
  'src/sloppy.js',
  'src/study.js',
  'src/ui/shared.js',
  'src/ui/read.js',
  'src/ui/study.js',
  'src/ui/compose.js',
  'src/ui/grimoire.js',
  'src/ui/dictionary.js',
  'src/ui/rules.js',
];

self.addEventListener('install', (e) => {
  // Une seule ressource manquante ferait échouer addAll : on les prend une à une.
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // La page elle-même passe par le réseau d'abord : sans ça, une version
  // déployée resterait invisible tant que le cache n'expire pas.
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return res; })
      .catch(() => caches.match(request).then((r) => r || caches.match('index.html'))));
    return;
  }

  // Le reste est servi depuis le cache et rafraîchi en arrière-plan.
  e.respondWith(caches.match(request).then((hit) => {
    const net = fetch(request).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
