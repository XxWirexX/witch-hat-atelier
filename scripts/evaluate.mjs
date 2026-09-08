// Évaluation de la reconnaissance sur le grimoire : `node scripts/evaluate.mjs [id]`
import { SPELLS } from '../src/spells.js';
import { rasterizeSeal, flatten } from '../src/seal.js';
import { recognize } from '../src/recognizer.js';
import { readSeal } from '../src/interpreter.js';

const only = process.argv[2];
let totalTruth = 0, totalHit = 0, spellsOk = 0, n = 0;
for (const sp of SPELLS) {
  if (only && sp.id !== only) continue;
  n++;
  const mask = rasterizeSeal(sp.seal, { size: 700, thickness: 4, rotate: 0 });
  const t0 = Date.now();
  const rec = recognize(mask);
  const truth = flatten(sp.seal).elements.map((e) => `${e.glyph}${e.inverted ? '!' : ''}`);
  const got = rec.ok ? flatten(rec.seal).elements.map((e) => `${e.glyph}${e.inverted ? '!' : ''}`) : [];
  const t = new Map(); for (const k of truth) t.set(k, (t.get(k) || 0) + 1);
  const g = new Map(); for (const k of got) g.set(k, (g.get(k) || 0) + 1);
  let hit = 0; for (const [k, v] of t) hit += Math.min(v, g.get(k) || 0);
  totalTruth += truth.length; totalHit += hit;
  const read = rec.ok ? readSeal(rec.seal) : null;
  const matched = read && read.match ? read.match.spell.id : '-';
  const ok = hit === truth.length && got.length === truth.length;
  if (ok) spellsOk++;
  const wrong = got.filter((k) => !t.has(k) || (g.get(k) > (t.get(k) || 0)));
  console.log(`${ok ? 'OK ' : '.. '} ${sp.id.padEnd(26)} ${hit}/${truth.length} got ${got.length} unk ${rec.unknown?.length ?? '-'} gap:${rec.ring?.gap ? Math.round(rec.ring.gap.angle) : '-'} match:${matched} ${Date.now() - t0}ms ${wrong.length ? 'WRONG:' + [...new Set(wrong)].join(',') : ''}`);
  if (only) {
    for (const e of rec.elements) console.log('  ', e.glyph.padEnd(18), 'ang', Math.round(e.angle), 'dist', e.dist.toFixed(2), 'size', e.size.toFixed(2), 'rot', e.rot, e.inverted ? 'INV' : '', 'conf', e.confidence.toFixed(2), 'alt', e.alternatives.map((a) => `${a.glyph}:${a.confidence.toFixed(2)}`).join(' '));
    for (const e of rec.unknown) console.log('  ?', e.glyph, 'ang', Math.round(e.angle), 'conf', e.confidence.toFixed(2));
    console.log(truth.join(' '));
  }
}
console.log(`\nglyphs ${totalHit}/${totalTruth} (${(100 * totalHit / totalTruth).toFixed(1)}%), spells fully correct ${spellsOk}/${n}`);
