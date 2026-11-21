#!/usr/bin/env node
// 引擎能力矩阵：每个游戏（不含 vendor/）从哪些 @egret/... 入口导入、用了哪些关键 API、用在哪个文件。
// 行是能力，列是游戏，格子链接到用这项能力的文件；README 能力对照表里写了文件的，优先用 README 写的。
// 能力全列表以引擎 packages/engine/package.json 的 exports 为准，没有游戏用到的也列出；少于两款游戏用到的单列在「缺口」一节。
//   node tools/capability-matrix.mjs            生成 CAPABILITIES.md 和 showcase/capabilities.js
//   node tools/capability-matrix.mjs --check    两份文件与现在的代码不一致时报错
//   --engine <引擎仓库>                         读那里的 package.json；默认 ../Egret_rebuild，找不到时用 tools/engine-exports.json
//
// The engine capability matrix: which @egret/... entries each game imports (vendor/ left out), which key APIs it calls,
// and in which file. Rows are capabilities, columns games, and each cell links the file that uses it, the file named in
// the game's README capability table first. The full list of entries is the engine's package.json exports, used or not;
// those fewer than two games use are listed again under "Gaps". `--check` fails when the files are out of date.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { ROOT, gameFolders, sectionsOf } from './check-standard.mjs';

const args = process.argv.slice(2);
const check = args.includes('--check');
const engineAt = args.includes('--engine') ? resolve(args[args.indexOf('--engine') + 1]) : null;
const CACHE = join(ROOT, 'tools', 'engine-exports.json');
const MARKDOWN = join(ROOT, 'CAPABILITIES.md');
const SHOWCASE = join(ROOT, 'showcase', 'capabilities.js');

/** The entries the engine publishes, from its package.json, or the copy kept beside this tool. */
function engineEntries() {
  // A check reads the list kept with the repository, so it gives the same answer on any machine.
  if (check && !engineAt && existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, 'utf8'));
  const roots = engineAt ? [engineAt] : ['Egret_rebuild', 'egret_rebuild'].map((name) => resolve(ROOT, '..', name));
  for (const root of roots) {
    const file = join(root, 'packages', 'engine', 'package.json');
    if (!existsSync(file)) continue;
    const entries = Object.keys(JSON.parse(readFileSync(file, 'utf8')).exports).map((key) => (key === '.' ? '@egret/engine' : '@egret/engine/' + key.slice(2)));
    const spine = join(root, 'packages', 'spine', 'package.json');
    if (existsSync(spine)) entries.push(...Object.keys(JSON.parse(readFileSync(spine, 'utf8')).exports ?? { '.': 0 }).map((key) => (key === '.' ? '@egret/spine' : '@egret/spine/' + key.slice(2))));
    let commit = null;
    try {
      const head = readFileSync(join(root, '.git', 'HEAD'), 'utf8').trim();
      commit = head.startsWith('ref: ') ? readFileSync(join(root, '.git', head.slice(5)), 'utf8').trim() : head;
    } catch {
      commit = null;
    }
    const cached = { commit, entries };
    if (!check) writeFileSync(CACHE, JSON.stringify(cached, null, 2) + '\n');
    return cached;
  }
  if (existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, 'utf8'));
  throw new Error('找不到引擎的 package.json，也没有 tools/engine-exports.json · no engine package.json and no cached list; pass --engine <path>.');
}

/** Key APIs to show as their own rows: a name, and how to find it in a file's text. */
export const KEY_APIS = [
  { id: 'createParticleEmitter', zh: '粒子发射器', en: 'Particle emitter', test: /\bcreateParticleEmitter\s*\(/ },
  { id: 'addJoint', zh: '2D 物理关节', en: '2D physics joints', test: /\.addJoint\s*\(/ },
  { id: 'createUiRoot', zh: '托管界面根节点', en: 'Managed UI root', test: /\bcreateUiRoot\s*\(/ },
  { id: 'createBrowserVideo', zh: '网页视频', en: 'Browser video', test: /\bcreateBrowserVideo\s*\(/ },
  { id: 'createTextInput', zh: '文字输入框', en: 'Text input', test: /\bcreate(?:Browser)?TextInput\s*\(/ },
  { id: 'Spine', zh: 'Spine 骨骼动画', en: 'Spine skeletons', test: /from\s+'@egret\/spine[^']*'/ },
  { id: 'multi-touch', zh: '多点触控', en: 'Multi-touch', test: /\b(?:createTouchStick|createTouchButton|createPlayTouch|createPointerInput|createBrowserPointerInput)\s*\(/ }
];

const SKIP = new Set(['vendor', 'node_modules', '.git', 'media', 'test', 'tests', 'tools', 'docs', 'assets']);

/** Every script of a game outside vendor/ and its tests and tools. */
function scripts(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) scripts(path, out);
    } else if (/\.(?:m?js|html)$/.test(entry.name)) out.push(path);
  }
  return out.sort();
}

/** The files named in a README's capability table, by what the row names. */
function readmeFiles(folder) {
  const file = join(ROOT, folder, 'README.md');
  if (!existsSync(file)) return [];
  const section = sectionsOf(readFileSync(file, 'utf8')).find((s) => /capabilit|引擎能力/i.test(s.heading));
  if (!section) return [];
  const rows = [];
  for (const line of section.text.split('\n')) {
    if (!line.startsWith('|') || /^\|\s*-/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 3) continue;
    const paths = [...cells[cells.length - 1].matchAll(/`([^`]+\.(?:m?js|html|css))`|\]\(([^)]+\.(?:m?js|html))\)/g)].map((m) => (m[1] ?? m[2]).replace(/^\.\//, ''));
    if (paths.length) rows.push({ names: cells[0], file: paths[0] });
  }
  return rows;
}

const posix = (path) => path.split('\\').join('/');

/** What one game uses: capability id → the file (relative to the repository) that shows it. */
function usesOf(folder, keys) {
  const found = new Map();
  for (const file of scripts(join(ROOT, folder))) {
    const text = readFileSync(file, 'utf8'),
      at = posix(relative(ROOT, file));
    for (const [, entry] of text.matchAll(/(?:from\s+|import\s*\(\s*)'(@egret\/[^']+)'/g)) if (!found.has(entry)) found.set(entry, at);
    for (const key of keys) if (!found.has(key.id) && key.test.test(text)) found.set(key.id, at);
  }
  // The README's own table names the file to read first, when it names one that exists.
  for (const row of readmeFiles(folder)) {
    const path = posix(join(folder, row.file));
    if (!existsSync(join(ROOT, path))) continue;
    for (const id of found.keys()) {
      const short = id.replace('@egret/engine/', '').replace('@egret/', '');
      // A whole name only: `@egret/engine/webgl2` must not match inside `@egret/engine/webgl2/world3d`.
      const whole = (name) => new RegExp(`(^|[^\\w/@-])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w/-])`).test(row.names);
      if (whole(id) || (id.startsWith('@egret') && short.length > 3 && whole(short))) found.set(id, path);
    }
  }
  return found;
}

function build() {
  const { commit, entries } = engineEntries();
  const games = gameFolders().filter((folder) => !folder.startsWith('templates/'));
  const uses = new Map(games.map((game) => [game, usesOf(game, KEY_APIS)]));
  const imported = new Set([...uses.values()].flatMap((map) => [...map.keys()].filter((key) => key.startsWith('@egret'))));
  const rows = [
    ...entries.map((id) => ({ id, kind: 'entry', label: '`' + id + '`' })),
    // Entries a game imports that are not in the engine's exports (another package, or an older name).
    ...[...imported].filter((id) => !entries.includes(id)).sort().map((id) => ({ id, kind: 'other', label: '`' + id + '`' })),
    ...KEY_APIS.map((key) => ({ id: key.id, kind: 'api', label: `${key.zh} · ${key.en} (\`${key.id}\`)` }))
  ].map((row) => ({ ...row, games: games.filter((game) => uses.get(game).has(row.id)).map((game) => ({ game, file: uses.get(game).get(row.id) })) }));
  return { commit, games, rows };
}

function markdown({ commit, games, rows }) {
  const cell = (row, game) => {
    const hit = row.games.find((g) => g.game === game);
    return hit ? `[✔](${hit.file})` : '';
  };
  const table = (list) => [
    `| 能力 · Capability | 游戏数 · Games | ${games.join(' | ')} |`,
    `|---|:-:|${games.map(() => ':-:').join('|')}|`,
    ...list.map((row) => `| ${row.label} | ${row.games.length} | ${games.map((game) => cell(row, game)).join(' | ')} |`)
  ];
  const gaps = rows.filter((row) => row.kind !== 'other' && row.games.length < 2);
  return [
    '# 引擎能力矩阵 · Engine capability matrix',
    '',
    '由 `node tools/capability-matrix.mjs` 生成，不要手改；`--check` 检查它是否过期。行是引擎能力，列是游戏，✔ 链接到用这项能力的文件（游戏 README 能力对照表写了文件的，用 README 写的）。入口的全列表取自引擎 `packages/engine/package.json` 的 `exports`' + (commit ? `（引擎提交 \`${commit.slice(0, 7)}\`）` : '') + '，没有游戏用到的也列出；只统计游戏自己的代码，不含 `vendor/`、测试和工具。',
    '',
    'Made by `node tools/capability-matrix.mjs`; do not edit by hand, and `--check` says whether it is out of date. Rows are',
    'engine capabilities and columns games; each ✔ links the file that uses it (the one named in the game\'s README',
    'capability table, when it names one). The entries are the `exports` of the engine\'s `packages/engine/package.json`' + (commit ? ` (engine commit \`${commit.slice(0, 7)}\`)` : '') + ',',
    'used or not; only each game\'s own code is read, not `vendor/`, tests or tools. The same table is on the showcase site',
    '(`capabilities.html`).',
    '',
    '## 入口 · Entries',
    '',
    ...table(rows.filter((row) => row.kind !== 'api')),
    '',
    '## 关键 API · Key APIs',
    '',
    ...table(rows.filter((row) => row.kind === 'api')),
    '',
    '## 缺口 · Gaps',
    '',
    '少于两款游戏用到的能力：只有一款游戏是例子，或者还没有例子。新游戏优先选这些能力来做。',
    '',
    'Capabilities fewer than two games use: one example at most. A new game is a good place to show them.',
    '',
    '| 能力 · Capability | 用到的游戏 · Used by |',
    '|---|---|',
    ...gaps.map((row) => `| ${row.label} | ${row.games.length ? row.games.map((g) => `[${g.game}](${g.file})`).join(', ') : '无 · none'} |`),
    ''
  ].join('\n');
}

function showcase({ commit, games, rows }) {
  const data = { commit, games, rows: rows.map(({ id, kind, label, games: used }) => ({ id, kind, label: label.replaceAll('`', ''), games: used })) };
  return (
    '// 由 tools/capability-matrix.mjs 生成，不要手改 · Made by tools/capability-matrix.mjs; do not edit by hand.\n' +
    `export const MATRIX = ${JSON.stringify(data, null, 1)};\n`
  );
}

const matrix = build();
const outputs = [
  [MARKDOWN, markdown(matrix)],
  [SHOWCASE, showcase(matrix)]
];
if (check) {
  const stale = outputs.filter(([file, text]) => !existsSync(file) || readFileSync(file, 'utf8') !== text).map(([file]) => posix(relative(ROOT, file)));
  if (stale.length) {
    console.error(`能力矩阵过期 · The capability matrix is out of date: ${stale.join(', ')}\n运行 · Run: node tools/capability-matrix.mjs`);
    process.exit(1);
  }
  console.log(`能力矩阵是最新的 · The capability matrix is up to date (${matrix.rows.length} rows, ${matrix.games.length} games).`);
} else {
  for (const [file, text] of outputs) writeFileSync(file, text);
  const gaps = matrix.rows.filter((row) => row.kind !== 'other' && row.games.length < 2).length;
  console.log(`写好 · Wrote CAPABILITIES.md and showcase/capabilities.js: ${matrix.rows.length} rows, ${matrix.games.length} games, ${gaps} gaps.`);
}
