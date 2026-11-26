#!/usr/bin/env node
// 检查每个游戏目录是否符合 docs/GAME-STANDARD.md：文件、README 的九节、ENGINE-NOTES 的格式、测试、验收脚本、
// 截图基线和引擎副本。默认只报告，退出码只看模板（模板必须全部达标）；`--strict` 时任何缺项都算失败；`--fix` 补上
// 能安全补的（README 缺的节、引擎副本一节、空的 ENGINE-NOTES）；`--write` 把报告写进 docs/STANDARD-STATUS.md。
//
// Checks each game folder against docs/GAME-STANDARD.md: the files, the nine README sections, the form of
// ENGINE-NOTES, the tests, the acceptance script, the screenshot baselines and the engine copy. By default it reports,
// and the exit code follows the template alone (the template must pass everything); with `--strict` any gap fails;
// `--fix` adds what can be added safely (missing README sections, the engine copy section, an empty ENGINE-NOTES);
// `--write` writes the report to docs/STANDARD-STATUS.md.
//
//   node tools/check-standard.mjs [folder ...] [--strict] [--fix] [--write] [--json]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readNotes } from './engine-notes.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TEMPLATE = 'templates/egret-game';
export const MANAGEMENT_TEMPLATE = 'templates/management-game';
const templates = [TEMPLATE, MANAGEMENT_TEMPLATE];

// The gallery preview shares an engine copy. Scaffolds always carry their own.
export const vendorFolder = folder => folder === MANAGEMENT_TEMPLATE ? '../../PeachCreek/vendor' : './vendor';

/** The nine sections, in order: the heading the standard gives, and what an existing heading's English part may say. */
export const SECTIONS = [
  { key: 'intro', heading: '## 简介 · Introduction', match: /^(introduction|about)\b/i },
  { key: 'play', heading: '## 玩法与操作 · How to play', match: /how to play|^controls|^playing/i },
  { key: 'capabilities', heading: '## 引擎能力对照表 · Engine capabilities', match: /capabilit|uses? (of )?the engine|engine use|of the engine/i },
  { key: 'verified', heading: '## 已验证 · Verified', match: /verif/i },
  { key: 'knownIssues', heading: '## 已知问题 · Known issues', match: /known issue/i },
  { key: 'solved', heading: '## 已解决 · Solved', match: /solved|fixed/i },
  { key: 'unfinished', heading: '## 未完成 · Unfinished', match: /unfinished|not (yet )?done/i },
  { key: 'layout', heading: '## 目录结构 · Layout', match: /^layout|structure|what is here/i },
  { key: 'engineCopy', heading: '## 引擎副本 · Engine copy', match: /engine copy|vendored engine|engine and licen/i }
];
/** The line a game writes in ENGINE-NOTES when it met no engine fault. */
export const NONE_RECORDED = /^\*\*没有记录到引擎问题 · No engine issues recorded\*\*/m;

export const PLACEHOLDER = '（待补 · To be written）';

/** The game folders: every top-level folder with an engine copy, and the template. */
export function gameFolders(root = ROOT) {
  const folders = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && existsSync(join(root, entry.name, 'index.html')) && existsSync(join(root, entry.name, 'vendor')))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  for (const template of templates) if (existsSync(join(root, template))) folders.push(template);
  return folders;
}

const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : null);

/** The level-two sections of a README: heading, its English part, the section's text, and its line. */
export function sectionsOf(text) {
  const out = [];
  let current = null;
  text.split(/\r?\n/).forEach((line, i) => {
    const heading = /^##\s+(.*)$/.exec(line);
    if (heading) {
      current = { heading: heading[1].trim(), english: heading[1].split(' · ').pop().trim(), body: [], line: i + 1 };
      out.push(current);
    } else if (current) current.body.push(line);
  });
  for (const section of out) section.text = section.body.join('\n').trim();
  return out;
}

/** Which standard section an existing heading is, if any. */
export function sectionKey(section) {
  return SECTIONS.find((standard) => standard.match.test(section.english) || section.heading === standard.heading.slice(3))?.key;
}

/** The engine commit recorded in vendor/SOURCE.md. */
export function engineCommit(folder, root = ROOT) {
  return /[0-9a-f]{40}/.exec(read(join(root, folder, vendorFolder(folder), 'SOURCE.md')) ?? '')?.[0] ?? null;
}

/** Check one folder; returns its rows of `[item, ok, note]` and, with `fix`, what it changed. */
export function checkGame(folder, { root = ROOT, fix = false } = {}) {
  const dir = join(root, folder),
    rows = [],
    fixed = [];
  const row = (item, ok, note = '') => rows.push({ item, ok: Boolean(ok), note });

  // README and its nine sections.
  let readme = read(join(dir, 'README.md'));
  row('README.md', readme !== null);
  if (readme !== null && fix) {
    const result = fixReadme(folder, readme, root);
    if (result.text !== readme) {
      writeFileSync(join(dir, 'README.md'), result.text);
      readme = result.text;
      fixed.push(...result.added.map((key) => `README: ${key}`));
    }
  }
  if (readme !== null) {
    const sections = sectionsOf(readme),
      found = new Map();
    for (const section of sections) {
      const key = sectionKey(section);
      if (key && !found.has(key)) found.set(key, section);
    }
    row('README title (# 中文 · English)', /^# .+ · .+/.test(readme.split('\n')[0]), readme.split('\n')[0].slice(0, 60));
    for (const standard of SECTIONS) {
      const section = found.get(standard.key),
        empty = section && (section.text === '' || section.text === PLACEHOLDER);
      row(`README: ${standard.heading.slice(3)}`, section && !empty, !section ? 'missing' : empty ? 'empty' : `line ${section.line}`);
    }
    const order = SECTIONS.map((standard) => found.get(standard.key)?.line).filter(Boolean);
    row('README: sections in order', order.every((line, i) => i === 0 || line > order[i - 1]), order.join(','));
    const intro = found.get('intro')?.text ?? readme.split(/^## /m)[0];
    row('README: play link and engine link', /github\.io\/PortedGamesEgret\//.test(intro) && /Egret_rebuild/.test(intro));
    const table = found.get('capabilities')?.text ?? '';
    const header = table.split('\n').find((line) => line.startsWith('|')) ?? '';
    row('README: capability table (… | 文件 · File)', header.split('|').length >= 5 && /文件|File/.test(header), header.slice(0, 80));
    const copy = found.get('engineCopy')?.text ?? '',
      commit = engineCommit(folder, root);
    row('README: engine commit as in vendor/SOURCE.md', commit && copy.includes(commit.slice(0, 7)), commit?.slice(0, 7) ?? 'no commit');
  }

  // ENGINE-NOTES: numbered items, each with a status and the four parts.
  let notes = read(join(dir, 'ENGINE-NOTES.md'));
  if (notes === null && fix) {
    notes = emptyNotes(folder, root);
    writeFileSync(join(dir, 'ENGINE-NOTES.md'), notes);
    fixed.push('ENGINE-NOTES.md (empty)');
  }
  row('ENGINE-NOTES.md', notes !== null);
  if (notes !== null) {
    const items = notesItems(notes);
    // A game that met no engine fault says so in one line of its own, rather than inventing an item.
    const none = items.length === 0 && NONE_RECORDED.test(notes);
    row('ENGINE-NOTES: numbered items', items.length > 0 || none, none ? 'none recorded' : `${items.length} items`);
    const bad = items.filter((item) => !item.status || !item.parts.every(Boolean));
    row('ENGINE-NOTES: status, what happens, workaround, suggestion in every item', none || (items.length > 0 && bad.length === 0), bad.length ? `incomplete: ${bad.map((item) => item.number).join(', ')}` : '');
    // The header line under each heading is what tools/engine-notes.mjs and the engine's `egret notes` read.
    const unread = readNotes(notes, folder.split('/').pop(), dir).filter((note) => note.problems.length);
    row('ENGINE-NOTES: an engine-note header under every item', unread.length === 0, unread.map((note) => `${note.number}: ${note.problems[0]}`).join('; '));
  }

  row('QUALITY.md', existsSync(join(dir, 'QUALITY.md')));

  // Tests: Node tests that cover the rules and the save.
  const tests = existsSync(join(dir, 'test')) ? readdirSync(join(dir, 'test')).filter((name) => name.endsWith('.test.mjs')) : [];
  row('test/*.test.mjs', tests.length > 0, `${tests.length} files`);
  const body = tests.map((name) => name + '\n' + read(join(dir, 'test', name))).join('\n');
  row('tests cover the save', /save/i.test(body));
  row('tests cover the rules', /\b(sim|rules?|step|battle|board|world|core|levels?|road)\b/i.test(body));
  row('test/accept.mjs (browser acceptance)', existsSync(join(dir, 'test', 'accept.mjs')));
  const baseline = existsSync(join(dir, 'test', 'baseline')) ? readdirSync(join(dir, 'test', 'baseline')).filter((name) => name.endsWith('.png')) : [];
  row('test/baseline/*.png', baseline.length > 0, `${baseline.length} pictures`);

  // The engine copy.
  const commit = engineCommit(folder, root);
  row('vendor/SOURCE.md with the engine commit', commit, commit?.slice(0, 7));
  const page = read(join(dir, 'index.html')),
    map = read(join(dir, vendorFolder(folder), 'importmap.json'));
  if (page && map && page.includes('type="importmap"')) {
    const pasted = /<script type="importmap">([\s\S]*?)<\/script>/.exec(page)?.[1];
    let same = false;
    try {
      // Every entry of the engine copy is in the page, as written; the page may add its own (its modules with a
      // cache tag, say).
      const want = JSON.parse(map).imports,
        have = JSON.parse(pasted).imports;
      same = Object.entries(want).every(([name, file]) => have[name] === file.replace('./vendor/', vendorFolder(folder) + '/'));
    } catch {
      same = false;
    }
    row('index.html import map = vendor/importmap.json', same);
  }
  return { folder, rows, fixed, passed: rows.every((r) => r.ok) };
}

/** The items of an ENGINE-NOTES file: number, status, and whether each of the four parts is there. */
export function notesItems(text) {
  const items = [];
  const parts = text.split(/^### /m).slice(1);
  for (const part of parts) {
    const [heading, ...rest] = part.split('\n'),
      body = rest.join('\n'),
      number = /^(\d+)\./.exec(heading)?.[1];
    if (!number) continue;
    const status = heading.split(' — ').slice(1).join(' — '),
      settled = /已解决|resolved|已写入文档|documented/i.test(status);
    items.push({
      number: Number(number),
      status: /未解决|open|已解决|resolved|已写入文档|documented|部分解决|partly|已在/i.test(status),
      // An item the engine has settled needs no suggestion any more; "before / this game now" count as what happens
      // and the workaround, as MechanismCity's notes are written.
      parts: [
        /现象|原来|What happens|Before|^- [0-9a-f]{7}[：:]/im.test(body),
        /绕过|游戏里|本作|Workaround|In the game|This game( now)?:/i.test(body),
        settled || /建议|仍未提供|Suggest|Still missing/i.test(body)
      ]
    });
  }
  return items;
}

/** An ENGINE-NOTES file with its heading and nothing yet. */
function emptyNotes(folder, root) {
  const commit = engineCommit(folder, root) ?? 'unknown';
  return `# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（提交 \`${commit.slice(0, 7)}\`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (commit \`${commit.slice(0, 7)}\`) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

${PLACEHOLDER}
`;
}

/** The README with the standard sections it lacks added (and the engine copy section filled from vendor/SOURCE.md). */
export function fixReadme(folder, text, root = ROOT) {
  const sections = sectionsOf(text),
    present = new Set(sections.map(sectionKey).filter(Boolean)),
    added = [];
  let out = text.replace(/\s+$/, '') + '\n';
  // No introduction heading: the words between the title and the first section are the introduction.
  if (!present.has('intro')) {
    const lines = out.split('\n'),
      first = lines.findIndex((line, i) => i > 0 && line.trim() !== '');
    if (first > 0 && !lines[first].startsWith('## ')) {
      lines.splice(first, 0, SECTIONS[0].heading, '');
      out = lines.join('\n');
      added.push('intro');
      present.add('intro');
    }
  }
  const source = read(join(root, folder, vendorFolder(folder), 'SOURCE.md')) ?? '',
    commit = engineCommit(folder, root),
    entries = /Entries: (.*?)\. Only/.exec(source)?.[1] ?? '';
  for (const standard of SECTIONS) {
    if (present.has(standard.key)) continue;
    let body = PLACEHOLDER;
    if (standard.key === 'engineCopy' && commit)
      body = `引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 \`${commit}\`，由引擎仓库的 \`tools/vendor-game.mjs\` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。\n\nThe engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit \`${commit}\`, copied by the engine's \`tools/vendor-game.mjs\`; see [vendor/SOURCE.md](vendor/SOURCE.md).${entries ? `\n\n入口 · Entries: ${entries}.` : ''}`;
    out += `\n${standard.heading}\n\n${body}\n`;
    added.push(standard.key);
  }
  return { text: out, added };
}

/** The report of all folders, as Markdown. */
export function reportMarkdown(results) {
  const items = results[0]?.rows.map((r) => r.item) ?? [];
  const lines = [
    '# 工程标准现状 · Standard status',
    '',
    '由 `node tools/check-standard.mjs --write` 生成；标准见 [GAME-STANDARD.md](GAME-STANDARD.md)。✔ 达标，✘ 缺或不全。',
    '',
    'Made by `node tools/check-standard.mjs --write`; the standard is [GAME-STANDARD.md](GAME-STANDARD.md). ✔ meets it, ✘ missing or incomplete.',
    '',
    `| 项 · Item | ${results.map((r) => r.folder.replace('templates/', '')).join(' | ')} |`,
    `|---|${results.map(() => ':-:').join('|')}|`
  ];
  const all = [...new Set(results.flatMap((r) => r.rows.map((row) => row.item)))];
  for (const item of all.length ? all : items) lines.push(`| ${item} | ${results.map((r) => (r.rows.find((row) => row.item === item) ? (r.rows.find((row) => row.item === item).ok ? '✔' : '✘') : '–')).join(' | ')} |`);
  lines.push('', '## 每个游戏缺的项 · What each game lacks', '');
  for (const result of results) {
    const missing = result.rows.filter((r) => !r.ok);
    lines.push(`- **${result.folder}**: ${missing.length ? missing.map((r) => r.item + (r.note ? ` (${r.note})` : '')).join('; ') : '全部达标 · all met'}`);
  }
  return lines.join('\n') + '\n';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2),
    flags = new Set(args.filter((arg) => arg.startsWith('--'))),
    named = args.filter((arg) => !arg.startsWith('--')).map(arg => relative(ROOT, resolve(ROOT, arg)).split(sep).join('/'));
  const folders = named.length ? named : gameFolders();
  const results = folders.map((folder) => checkGame(folder, { fix: flags.has('--fix') }));
  if (flags.has('--json')) console.log(JSON.stringify(results, null, 2));
  else
    for (const result of results) {
      const missing = result.rows.filter((r) => !r.ok);
      console.log(`${result.passed ? '✔' : '✘'} ${result.folder}${missing.length ? ` — ${missing.length} missing` : ''}`);
      for (const r of missing) console.log(`    ✘ ${r.item}${r.note ? ` (${r.note})` : ''}`);
      for (const change of result.fixed) console.log(`    + added ${change}`);
    }
  if (flags.has('--write')) writeFileSync(join(ROOT, 'docs', 'STANDARD-STATUS.md'), reportMarkdown(results));
  // The template must meet the standard in full; the games must too under --strict.
  const failing = results.filter((r) => !r.passed && (flags.has('--strict') || templates.includes(r.folder)));
  if (failing.length) {
    console.error(`\n${failing.map((r) => r.folder).join(', ')}: not up to the standard`);
    process.exitCode = 1;
  }
}
