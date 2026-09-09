// Banc d'essai « tracé maladroit » : `node scripts/sloppy-eval.mjs [seeds] [id] [--png]`
// Critère de réussite : le bon sort est la meilleure correspondance de la lecture
// (les variantes de composition identique — jet d'eau déséquilibré, vent vrillé — comptent pour leur base).
import { writeFileSync } from 'node:fs';
import { SPELLS } from '../src/spells.js';
import { flatten } from '../src/seal.js';
import { sloppyMask } from '../src/sloppy.js';
import { recognize } from '../src/recognizer.js';
import { readImage } from '../src/hypothesis.js';

const args = process.argv.slice(2);
const seeds = +(args.find((a) => /^\d+$/.test(a)) ?? 5);
const only = args.find((a) => !/^\d+$/.test(a) && !a.startsWith('--'));
const png = args.includes('--png');
const profile = args.includes('--severe') ? 'severe' : 'moderate';
const VARIANTS = { watershot_unbalanced: 'watershot', grasping_wind_twist: 'grasping_wind' };

let ok = 0, tot = 0, glyphHit = 0, glyphTot = 0;
const perSpell = [];
for (const sp of SPELLS) {
  if (only && sp.id !== only) continue;
  let hits = 0; const fails = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const mask = sloppyMask(sp.seal, seed * 7919 + sp.id.length, { profile });
    if (png) writePBM(`/tmp/sloppy-${sp.id}-${seed}.pbm`, mask);
    const out = readImage(mask);
    const rec = out?.rec ?? { ok: false, elements: [], unknown: [] };
    const read = out?.reading ?? null;
    const m = read?.match?.spell.id;
    const good = (m === sp.id || m === VARIANTS[sp.id] || VARIANTS[m] === sp.id) && ['exact', 'close'].includes(read?.match?.kind);
    tot++; if (good) { ok++; hits++; } else fails.push(`s${seed}→${m ?? '-'}${read?.match ? '/' + read.match.kind : ''}`);
    if (rec.ok) {
      const truth = flatten(sp.seal).elements.map((e) => `${e.glyph}${e.inverted && e.glyph !== 'regions' ? '!' : ''}`);
      const got = flatten(rec.seal).elements.map((e) => `${e.glyph}${e.inverted && e.glyph !== 'regions' ? '!' : ''}`);
      const t = new Map(); for (const k of truth) t.set(k, (t.get(k) || 0) + 1);
      const g = new Map(); for (const k of got) g.set(k, (g.get(k) || 0) + 1);
      for (const [k, v] of t) glyphHit += Math.min(v, g.get(k) || 0);
      glyphTot += truth.length;
      if (only) console.log(`  seed ${seed}: got [${got.join(' ')}] unknown ${rec.unknown.length} gap ${rec.ring.gap ? Math.round(rec.ring.gap.angle) : '-'} match ${m}/${read.match?.kind}`);
    }
  }
  perSpell.push([sp.id, hits]);
  console.log(`${hits === seeds ? 'OK ' : '.. '} ${sp.id.padEnd(26)} ${hits}/${seeds} ${fails.join(' ')}`);
}
console.log(`\nprofil ${profile} · sorts lus ${ok}/${tot} (${(100 * ok / tot).toFixed(1)} %) · glyphes ${glyphHit}/${glyphTot} (${(100 * glyphHit / glyphTot).toFixed(1)} %) · sceaux 100 % : ${perSpell.filter(([, h]) => h === seeds).length}/${perSpell.length}`);

function writePBM(path, m) {
  let s = `P1\n${m.width} ${m.height}\n`;
  for (let y = 0; y < m.height; y++) { let row = ''; for (let x = 0; x < m.width; x++) row += m.data[y * m.width + x] ? '1' : '0'; s += row + '\n'; }
  writeFileSync(path, s);
}
