// Icônes de l'application (PNG), rendues avec le rastériseur du projet.
//
// Un PNG est assez simple à écrire à la main pour ne pas valoir une dépendance :
// signature, IHDR, IDAT (zlib, présent dans node) et IEND. Le dessin est
// suréchantillonné puis réduit, ce qui lisse les bords.
//
//   node scripts/make-icons.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { rasterizePolylines } from '../src/seal.js';

const SS = 4;                       // suréchantillonnage
const BG = [0x6b, 0x1a, 0x1a];      // rouge de sceau
const FG = [0xf5, 0xed, 0xdc];      // papier
// Une icône masquable peut être rognée en cercle : le dessin tient dans les 80 %
// centraux, la « zone sûre » recommandée.
const SAFE = 0.66;

// ───────────────────────── PNG ─────────────────────────

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(rgba, w, h) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filtre « none »
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // 8 bits par canal
  ihdr[9] = 6;   // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ───────────────────────── Dessin ─────────────────────────

// La marque du projet : le cercle du sceau et le chapeau pointu.
function markStrokes() {
  const circle = [];
  for (let a = 0; a <= 360; a += 2) {
    const t = (a * Math.PI) / 180;
    circle.push([50 + 42 * Math.cos(t), 50 + 42 * Math.sin(t)]);
  }
  return [
    circle,
    [[50, 22], [78, 72], [22, 72], [50, 22]],
    [[50, 22], [50, 88]],
  ];
}

function renderIcon(size) {
  const N = size * SS;
  const k = (N * SAFE) / 100;
  const off = (N - 100 * k) / 2;
  const mask = rasterizePolylines(
    markStrokes().map((pts) => ({ pts, width: 1 })),
    [],
    { width: N, height: N, map: ([x, y]) => [x * k + off, y * k + off], thickness: 6 * k, scale: k },
  );

  // Réduction : la part d'encre d'un bloc SS×SS donne la couverture du pixel.
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let ink = 0;
      for (let dy = 0; dy < SS; dy++) for (let dx = 0; dx < SS; dx++) ink += mask.data[(y * SS + dy) * N + x * SS + dx];
      const a = ink / (SS * SS);
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) rgba[i + c] = Math.round(BG[c] + (FG[c] - BG[c]) * a);
      rgba[i + 3] = 255;
    }
  }
  return encodePNG(rgba, size, size);
}

for (const size of [192, 512]) {
  const file = `icons/icon-${size}.png`;
  writeFileSync(file, renderIcon(size));
  console.log(`${file} — ${size}×${size}`);
}
