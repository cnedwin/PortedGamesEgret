#!/usr/bin/env node
// 把每个游戏 ENGINE-NOTES 里记下的引擎缺口汇总成一本账 docs/ENGINE-GAPS.md：引擎已经解决、游戏还标着未解决的；两个以上
// 游戏遇到的未解决缺口（该在引擎里修）；只有一个游戏遇到的（先写卡片，或在引擎里修）；以及每个游戏的数目。每条笔记标题下
// 有一行 `<!-- engine-note: {...} -->`，写着编号、状态、topic 和绕过代码所在的文件，格式见 docs/GAME-STANDARD.md 第 3 节。
// 引擎已经解决了什么，读引擎仓库的 guide/resolved.json；`--engine` 给出引擎仓库（或那个文件）时先把它抄进
// docs/engine-resolved.json，账本只按仓库里的这份抄本生成，所以 `--check` 在哪里跑结果都一样。
//
// Gathers the engine faults each game wrote into its ENGINE-NOTES into one ledger, docs/ENGINE-GAPS.md: what the engine
// has resolved that a game still marks open; open faults two or more games met (fix them in the engine); open faults one
// game met (a card first, or an engine fix); and the counts of each game. Under each note's heading is one line,
// `<!-- engine-note: {...} -->`, with its id, status, topic and the files that hold the workaround (docs/GAME-STANDARD.md
// part 3). What the engine resolved comes from the engine's guide/resolved.json: given `--engine` (the engine's
// checkout or that file), it is first copied to docs/engine-resolved.json, and the ledger is made from that copy alone,
// so `--check` gives the same answer wherever it runs.
//
//   node tools/engine-notes.mjs [--engine <engine checkout | resolved.json>] [--write] [--check] [--json]
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const LEDGER = 'docs/ENGINE-GAPS.md';
export const SNAPSHOT = 'docs/engine-resolved.json';
export const STATUSES = ['open', 'partly', 'worked-around', 'documented', 'resolved'];
const STATUS_WORDS = { open: '未解决 · open', partly: '部分解决 · partly', 'worked-around': '已在游戏侧绕过 · worked around', documented: '已写入文档 · documented', resolved: '已解决 · resolved' };
const TOPIC = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEADER = /<!--\s*engine-note:\s*(\{.*\})\s*-->/;
const HEADING = /^###\s+(\d+)\.\s+(.*)$/;

/** The status a heading ends with: `— 未解决 / open`, `— 已在 95897d7 解决 / resolved in 95897d7`, `— 缺口 / gap · 未解决 / open`. */
export function headingStatus(title) {
  const tail = title.split(/\s+[—–-]\s+/).pop().split('/').pop().trim().toLowerCase();
  if (/^partl|^partial/.test(tail)) return 'partly';
  if (/^resolved|^fixed/.test(tail)) return 'resolved';
  if (/^documented/.test(tail)) return 'documented';
  if (/^worked/.test(tail)) return 'worked-around';
  if (/^open/.test(tail)) return 'open';
  return undefined;
}

/** The notes of one ENGINE-NOTES.md, each with its header and the problems found in it. */
export function readNotes(text, folder, gameDir) {
  const lines = text.split('\n');
  const notes = [];
  for (let i = 0; i < lines.length; i++) {
    const heading = HEADING.exec(lines[i]);
    if (!heading) continue;
    const number = Number(heading[1]);
    const title = heading[2].trim().replace(/\s+[—–-]\s+[^—–]*$/, '');
    const note = { id: `${folder}#${number}`, number, title, line: i + 1, heading: headingStatus(heading[2]), problems: [] };
    const found = HEADER.exec(lines[i + 1] ?? '');
    if (!found) note.problems.push('no engine-note header on the line under the heading');
    else {
      try {
        note.header = JSON.parse(found[1]);
      } catch (cause) {
        note.problems.push('the header is not JSON: ' + cause.message);
      }
    }
    const header = note.header;
    if (header) {
      if (header.id !== note.id) note.problems.push(`id ${JSON.stringify(header.id)} is not ${note.id}`);
      if (!STATUSES.includes(header.status)) note.problems.push('status is one of ' + STATUSES.join(', '));
      else if (note.heading && note.heading !== header.status) note.problems.push(`the heading says ${note.heading}, the header ${header.status}`);
      if (typeof header.topic !== 'string' || !TOPIC.test(header.topic)) note.problems.push('topic is lower-case words joined by dashes');
      for (const file of header.workaround ?? [])
        if (typeof file !== 'string' || file.includes('..') || file.startsWith('/') || (gameDir && !existsSync(join(gameDir, file))))
          note.problems.push('workaround names a file the game does not have: ' + file);
    }
    note.status = header?.status ?? note.heading;
    note.topic = header?.topic;
    note.workaround = header?.workaround ?? [];
    notes.push(note);
  }
  const numbers = notes.map((note) => note.number);
  for (const note of notes) if (numbers.filter((n) => n === note.number).length > 1) note.problems.push('number used twice');
  return notes;
}

/** Every game folder with an ENGINE-NOTES.md, outside the templates. */
export function gameFolders(root = ROOT) {
  return readdirSync(root)
    .filter((name) => !name.startsWith('.') && !['docs', 'templates', 'tools', 'guide-cards', 'showcase', 'node_modules'].includes(name))
    .filter((name) => statSync(join(root, name)).isDirectory() && existsSync(join(root, name, 'ENGINE-NOTES.md')))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

/** The engine commit a game's copy is pinned to, from vendor/SOURCE.md. */
function pinOf(dir) {
  const source = existsSync(join(dir, 'vendor', 'SOURCE.md')) ? readFileSync(join(dir, 'vendor', 'SOURCE.md'), 'utf8') : '';
  return /\b([0-9a-f]{40})\b/.exec(source)?.[1];
}

/** The engine's list of resolved notes in the copy docs/engine-resolved.json, or an empty one. */
export function readSnapshot(root = ROOT) {
  const file = join(root, SNAPSHOT);
  if (!existsSync(file)) return [];
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (data.schemaVersion !== 1 || !Array.isArray(data.resolved)) throw new Error(SNAPSHOT + ': schemaVersion 1 and a list of resolved notes');
  return data.resolved;
}

/** All games and notes, and what the engine's list says about each note still open. */
export function gather(root = ROOT, resolved = readSnapshot(root)) {
  const games = gameFolders(root).map((folder) => {
    const dir = join(root, folder);
    const notes = readNotes(readFileSync(join(dir, 'ENGINE-NOTES.md'), 'utf8'), folder, dir);
    // The engine copy of a game made after the agent kit carries the list at its own pin.
    const kit = join(dir, 'vendor', 'egret', 'guide', 'resolved.json');
    const inCopy = existsSync(kit) ? JSON.parse(readFileSync(kit, 'utf8')).resolved : undefined;
    for (const note of notes) {
      const match = (list) => list?.find((entry) => (note.topic && entry.topic === note.topic) || entry.notes?.includes(note.id));
      const entry = match(resolved);
      const stale = entry && (note.status === 'open' || note.status === 'worked-around' || (note.status === 'partly' && entry.status === 'resolved'));
      if (stale) note.engine = { ...entry, inCopy: Boolean(match(inCopy)) };
    }
    return { folder, pin: pinOf(dir), notes };
  });
  return { games, notes: games.flatMap((game) => game.notes) };
}

const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const OPEN = new Set(['open', 'partly', 'worked-around']);

/** The ledger as Markdown, from the games and the engine's list. */
export function ledger({ games, notes }, resolved) {
  const count = (status) => notes.filter((note) => note.status === status).length;
  const out = [];
  out.push('# 引擎缺口总账 · Engine gaps ledger', '');
  out.push(
    `由 \`node tools/engine-notes.mjs --write\` 从各游戏的 ENGINE-NOTES 生成，不要手改；\`--check\` 检查它是否过期。引擎已解决的清单抄自引擎仓库的 \`guide/resolved.json\`，见 [engine-resolved.json](engine-resolved.json)（${resolved.length} 条）。笔记格式见 [GAME-STANDARD.md](GAME-STANDARD.md) 第 3 节。`,
    '',
    `Made by \`node tools/engine-notes.mjs --write\` from the ENGINE-NOTES of the games; do not edit by hand, and \`--check\` says whether it is out of date. What the engine resolved is copied from the engine's \`guide/resolved.json\` into [engine-resolved.json](engine-resolved.json) (${resolved.length} entries). The form of a note is in part 3 of [GAME-STANDARD.md](GAME-STANDARD.md).`,
    ''
  );
  out.push(
    `${games.length} 个游戏、${notes.length} 条笔记：未解决 ${count('open')}，部分解决 ${count('partly')}，游戏侧绕过 ${count('worked-around')}，已写入文档 ${count('documented')}，已解决 ${count('resolved')}。`,
    '',
    `${notes.length} notes from ${games.length} games: ${count('open')} open, ${count('partly')} partly resolved, ${count('worked-around')} worked around in the game, ${count('documented')} documented, ${count('resolved')} resolved.`,
    ''
  );

  const stale = notes.filter((note) => note.engine);
  out.push('## 1. 引擎已经解决、游戏还标着未解决 · Resolved by the engine, still open in a game', '');
  out.push(
    '刷新引擎副本（引擎仓库的 `tools/vendor-game.mjs`），去掉绕过代码，再验一遍游戏，然后改笔记的状态。「副本里有」表示游戏现在的副本已经带着这个修复；在游戏目录里运行 `node vendor/egret.mjs notes` 也会列出这些。',
    '',
    "Refresh the engine copy (the engine's `tools/vendor-game.mjs`), take the workaround out, check the game again, then change the note's status. \"In the copy\" means the game's present copy already has the fix; `node vendor/egret.mjs notes` in the game's folder lists these too.",
    ''
  );
  if (stale.length === 0) out.push('（没有 · None）', '');
  else {
    out.push('| 笔记 · Note | Topic | 引擎 · Engine | 副本里有 · In the copy | 绕过代码 · Workaround | 引擎做了什么 · What the engine did |', '|---|---|---|:-:|---|---|');
    for (const note of stale) {
      const e = note.engine;
      const where = e.pr ? `#${e.pr}` : e.commit ? `\`${e.commit.slice(0, 7)}\`` : '';
      out.push(`| ${note.id} ${cell(note.title)} | \`${note.topic ?? ''}\` | ${e.status} ${where} | ${e.inCopy ? '✔' : ''} | ${note.workaround.map((f) => '`' + f + '`').join(', ')} | ${cell(e.what)} |`);
    }
    out.push('');
  }

  const open = notes.filter((note) => OPEN.has(note.status) && !note.engine);
  const byTopic = new Map();
  for (const note of open) byTopic.set(note.topic ?? note.id, [...(byTopic.get(note.topic ?? note.id) ?? []), note]);
  const shared = [...byTopic].filter(([, list]) => new Set(list.map((note) => note.id.split('#')[0])).size >= 2);
  const single = [...byTopic].filter(([, list]) => new Set(list.map((note) => note.id.split('#')[0])).size < 2);
  const order = (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'en');

  out.push('## 2. 两个以上游戏遇到的未解决缺口：在引擎里修 · Open faults that two or more games met: fix them in the engine', '');
  out.push(
    '同一个绕过办法出现在两个以上游戏里，说明问题在引擎的接口上，应该改引擎，而不是再写一张卡片。',
    '',
    'The same workaround in two or more games means the fault is in the engine\'s interface: change the engine rather than write another card.',
    ''
  );
  if (shared.length === 0) out.push('（没有 · None）', '');
  else {
    out.push('| Topic | 游戏数 · Games | 笔记 · Notes |', '|---|:-:|---|');
    for (const [topic, list] of shared.sort(order))
      out.push(`| \`${topic}\` | ${new Set(list.map((note) => note.id.split('#')[0])).size} | ${list.map((note) => `${note.id} ${cell(note.title)} (${note.status})`).join('<br>')} |`);
    out.push('');
  }

  out.push('## 3. 只有一个游戏遇到的未解决缺口 · Open faults one game met', '');
  out.push(
    '先把教训写成引擎指南的卡片（引擎仓库 `guide/cards`），引擎能顺手修的就修；第二个游戏遇到时移到第 2 节。',
    '',
    "Write the lesson as a card of the engine's guide (`guide/cards` in the engine repository) first, and fix it in the engine where that is easy; when a second game meets it, it moves to part 2.",
    ''
  );
  if (single.length === 0) out.push('（没有 · None）', '');
  else {
    out.push('| Topic | 笔记 · Note | 状态 · Status |', '|---|---|---|');
    for (const [topic, list] of single.sort((a, b) => a[0].localeCompare(b[0], 'en')))
      for (const note of list) out.push(`| \`${topic}\` | ${note.id} ${cell(note.title)} | ${STATUS_WORDS[note.status]} |`);
    out.push('');
  }

  out.push('## 4. 各游戏 · By game', '');
  out.push('| 游戏 · Game | 笔记 · Notes | 未解决 · Open | 部分 · Partly | 绕过 · Worked around | 文档 · Documented | 已解决 · Resolved | 引擎已解决待去掉 · To take out | 引擎副本 · Engine pin |', '|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|');
  for (const game of games) {
    const n = (status) => game.notes.filter((note) => note.status === status).length;
    out.push(`| [${game.folder}](../${game.folder}/ENGINE-NOTES.md) | ${game.notes.length} | ${n('open')} | ${n('partly')} | ${n('worked-around')} | ${n('documented')} | ${n('resolved')} | ${game.notes.filter((note) => note.engine).length} | ${game.pin ? '`' + game.pin.slice(0, 7) + '`' : ''} |`);
  }
  out.push('');
  return out.join('\n');
}

/** The engine's resolved.json named by --engine: the file itself, or guide/resolved.json in an engine checkout. */
function engineList(path) {
  const file = existsSync(join(path, 'guide', 'resolved.json')) ? join(path, 'guide', 'resolved.json') : path;
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (data.schemaVersion !== 1 || !Array.isArray(data.resolved)) throw new Error(file + ' is not the engine\'s resolved.json');
  return data;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--engine');
  if (at >= 0) {
    const data = engineList(resolve(args[at + 1]));
    writeFileSync(join(ROOT, SNAPSHOT), JSON.stringify(data, null, 2) + '\n');
  }
  const resolved = readSnapshot();
  const all = gather(ROOT, resolved);
  const text = ledger(all, resolved);
  const problems = all.notes.filter((note) => note.problems.length);
  if (args.includes('--json')) process.stdout.write(JSON.stringify(all, null, 2) + '\n');
  else {
    for (const note of problems) console.log(`${note.id}: ${note.problems.join('; ')}`);
    const stale = all.notes.filter((note) => note.engine).length;
    console.log(`${all.notes.length} notes in ${all.games.length} games; ${stale} the engine has resolved since; ${problems.length} with problems.`);
  }
  if (args.includes('--write')) writeFileSync(join(ROOT, LEDGER), text);
  if (args.includes('--check')) {
    const current = existsSync(join(ROOT, LEDGER)) ? readFileSync(join(ROOT, LEDGER), 'utf8') : '';
    if (current !== text) console.log(`${LEDGER} is out of date: node tools/engine-notes.mjs --write`);
    process.exitCode = current !== text || problems.length ? 1 : 0;
  }
}
