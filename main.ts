import * as fs from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSnapshot, buildBoard, dashboardData } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

/** Accept file or directory inputs, retaining the starter CLI's optional output override. */
function options(args: string[]) {
  const settings = { input: '/input/snapshot.json', output: process.env.MAKEFUN_OUTPUT_DIR ?? '/output' };
  for (let i = 0; i < args.length; i++) {
    const match = /^--(input|output)(?:=(.*))?$/.exec(args[i]);
    if (!match) throw new Error(`Unrecognized argument: ${args[i]}`);
    const value = match[2] ?? args[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing path for --${match[1]}`);
    settings[match[1] as 'input' | 'output'] = value;
  }
  return settings;
}

async function publish() {
  const settings = options(process.argv.slice(2));
  const input = resolve(settings.input);
  const inputFile = (await fs.stat(input)).isDirectory() ? join(input, 'snapshot.json') : input;
  const snapshot = readSnapshot(await fs.readFile(inputFile, 'utf8'));
  const rows = buildBoard(snapshot);
  if (rows.length < 100 || rows.length > 4000) throw new Error('Board row count is outside 100-4000');
  if (new Set(rows.map(row => row.implied_value_usd)).size < 2) throw new Error('Board values must vary');
  const boardJson = JSON.stringify({ rows }) + '\n';
  if (Buffer.byteLength(boardJson, 'utf8') > 8 * 1024 * 1024) throw new Error('Board exceeds 8 MiB');
  const payload = dashboardData(snapshot, rows);
  const destination = resolve(settings.output);
  const repository = fileURLToPath(new URL('.', import.meta.url));
  await fs.mkdir(destination, { recursive: true });
  await fs.writeFile(join(destination, 'board.json'), boardJson, 'utf8');
  // index.html loads ../data.js: the payload belongs beside dashboard/, not inside it.
  await fs.writeFile(join(destination, 'data.js'), 'window.RADAR=' + JSON.stringify(payload) + ';\n', 'utf8');
  for (const folder of ['dashboard', 'screenshots']) {
    await fs.cp(join(repository, folder), join(destination, folder), {
      recursive: true, filter: source => !source.split('/').at(-1)!.startsWith('.'),
    });
  }
  const shots = await fs.readdir(join(destination, 'screenshots'));
  if (shots.length < 3) throw new Error('Three screenshots are required');
  const dossier = buildDossier(destination, {
    text_max_bytes: 65_536,
    screenshots: { max: 4, max_bytes: 524_288 },
    dashboard: { max_files: 400, max_bytes: 4_194_304 },
  });
  await fs.writeFile(join(destination, 'dossier.json'), dossier);
  process.stdout.write(`Wrote ${rows.length} ranked protocols, ${payload.watchlist_size} watchlist members and ${payload.live_size} comparables to ${destination}\n`);
}

publish().catch(error => {
  process.stderr.write(`Radar build failed: ${error.message}\n`);
  process.exitCode = 1;
});
