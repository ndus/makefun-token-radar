import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [directory, snapshotPath] = process.argv.slice(2);
if (!directory || !snapshotPath) {
  console.error('Usage: node tools/check-output.mjs <output-dir> <snapshot.json>');
  process.exit(2);
}
let failures = 0;
function check(rule, passed, detail = '') {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${rule}${detail ? ': ' + detail : ''}`);
  if (!passed) failures++;
}
try {
  const file = join(directory, 'board.json');
  check('board size <= 8 MiB', statSync(file).size <= 8 * 1024 * 1024, `${statSync(file).size} bytes`);
  const document = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(file)));
  const rows = Array.isArray(document) ? document : document.rows;
  check('rows array', Array.isArray(rows));
  if (!Array.isArray(rows)) throw new Error('Cannot inspect a board without rows');
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  const known = new Set(snapshot.protocols.map(p => p.slug));
  const slugs = new Set(rows.map(r => r?.slug));
  check('100-4000 rows', rows.length >= 100 && rows.length <= 4000, `${rows.length} rows`);
  check('known slugs', rows.every(r => known.has(r?.slug)));
  check('unique valid slugs', slugs.size === rows.length && rows.every(r => typeof r?.slug === 'string' && /^[^\s]{1,128}$/u.test(r.slug)));
  check('nonempty names', rows.every(r => typeof r?.name === 'string' && r.name.trim().length > 0));
  const missing = snapshot.watchlist.filter(slug => !slugs.has(slug));
  check('watchlist coverage', missing.length === 0, `${snapshot.watchlist.length - missing.length}/${snapshot.watchlist.length}`);
  const ranked = [...rows].sort((a, b) => a.rank - b.rank);
  check('ranks exactly 1..N', ranked.every((row, i) => row.rank === i + 1));
  check('positive integer values within cap', rows.every(r => Number.isSafeInteger(r.implied_value_usd) && r.implied_value_usd > 0 && r.implied_value_usd <= 100_000_000_000_000));
  check('values non-increasing by rank', ranked.every((row, i) => i === 0 || row.implied_value_usd <= ranked[i - 1].implied_value_usd));
  check('values not all equal', new Set(rows.map(r => r.implied_value_usd)).size > 1);
  check('3-12 farm steps, 20-600 trimmed characters', rows.every(r => Array.isArray(r.farm_steps) && r.farm_steps.length >= 3 && r.farm_steps.length <= 12 && r.farm_steps.every(step => typeof step === 'string' && [...step.trim()].length >= 20 && [...step.trim()].length <= 600)));
} catch (error) {
  check('readable valid board and snapshot', false, error.message);
}
process.exitCode = failures ? 1 : 0;
