#!/usr/bin/env node
// 找出各游戏 src/ 里彼此几乎相同的代码，写成 docs/DUPLICATION.md：三个以上游戏各写了一遍的函数，以及很多游戏用同一个名字
// 写的函数。三个以上游戏写了同一段代码，它就该进引擎的 kit，或者进模板；引擎已经有的，表里写明用哪个名字替换。只读文件，
// 不改任何游戏。
//
// Finds code that the games wrote nearly alike in their src/ folders and writes it into docs/DUPLICATION.md: functions
// three or more games each wrote, and functions many games wrote under one name. Code that three or more games wrote is
// a candidate for the engine's kit or for the template; where the engine already has it, the table names what replaces
// it. It reads files only and changes no game.
//
// Each top-level function, class or `const` of a game's own scripts is read as tokens, with every name turned into one
// token, every number into another and every string into a third, so two copies that differ only in names and words
// look the same. Two units are alike when the Jaccard index of their runs of eight tokens is 0.6 or more; alike units
// are grouped, and a group is reported when it holds units of three or more games.
//
//   node tools/duplication.mjs [--write] [--check] [--json]
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameFolders } from './check-standard.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REPORT = 'docs/DUPLICATION.md';
export const SHINGLE = 8;
export const ALIKE = 0.6;
export const MIN_TOKENS = 40;
export const MIN_GAMES = 3;
export const NAME_GAMES = 5;

/** What the engine already has for a kind of code, by the names games give it. */
export const ENGINE_HAS = [
  { names: /save/i, has: '`createSaveStore` + `shapeOf` (@egret/engine/kit)' },
  { names: /random|rng|shuffle|seed|pick/i, has: '`createRandom`, `hashSeed` (@egret/engine/kit)' },
  { names: /^t$|^tr$|translat|words|lang|i18n|locale/i, has: '`createTextTable`, `pickLanguage` (@egret/engine/kit)' },
  { names: /cue|sound|sfx|tone|wav/i, has: '`createAudioCues`, `encodeWav` (@egret/engine/kit)' },
  { names: /bind|action|keymap/i, has: '`createInputActions` (@egret/engine/kit)' }
];

const KEYWORDS = new Set(
  'await break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while with yield async get set'.split(
    ' '
  )
);
const REGEX_BEFORE = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', 'return', 'typeof', 'case', 'do', 'else', 'in', 'of', '=>']);

/** The tokens of a script, each `{ t, line, start }`: names stay as written, strings become `S`, numbers `0`, regexes `R`. */
export function tokenize(text) {
  const tokens = [];
  let i = 0,
    line = 1,
    start = true;
  const push = t => {
    tokens.push({ t, line, start });
    start = false;
  };
  const skipString = quote => {
    for (i++; i < text.length && text[i] !== quote; i++) {
      if (text[i] === '\\') i++;
      else if (text[i] === '\n') line++;
    }
    i++;
  };
  const skipTemplate = () => {
    for (i++; i < text.length && text[i] !== '`'; i++) {
      if (text[i] === '\\') i++;
      else if (text[i] === '\n') line++;
      else if (text[i] === '$' && text[i + 1] === '{') {
        let depth = 1;
        for (i += 2; i < text.length && depth > 0; i++) {
          if (text[i] === '{') depth++;
          else if (text[i] === '}') depth--;
          else if (text[i] === '\n') line++;
          else if (text[i] === "'" || text[i] === '"') {
            skipString(text[i]);
            i--;
          }
        }
        i--;
      }
    }
    i++;
  };
  while (i < text.length) {
    const c = text[i];
    if (c === '\n') {
      line++;
      start = true;
      i++;
    } else if (/\s/.test(c)) i++;
    else if (c === '/' && text[i + 1] === '/') while (i < text.length && text[i] !== '\n') i++;
    else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end < 0 ? text.length : end + 2;
      line += (text.slice(i, stop).match(/\n/g) ?? []).length;
      i = stop;
    } else if (c === "'" || c === '"') {
      push('S');
      skipString(c);
    } else if (c === '`') {
      push('S');
      skipTemplate();
    } else if (/[A-Za-z_$]/.test(c)) {
      const word = text.slice(i).match(/^[A-Za-z_$][\w$]*/)[0];
      push(word);
      i += word.length;
    } else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(text[i + 1] ?? ''))) {
      const number = text.slice(i).match(/^(0[xob][\da-f_]+|[\d_]*\.?[\d_]+(e[+-]?\d+)?n?)/i)[0];
      push('0');
      i += number.length;
    } else if (c === '/' && (tokens.length === 0 || REGEX_BEFORE.has(tokens.at(-1).t))) {
      push('R');
      let inClass = false;
      for (i++; i < text.length && text[i] !== '\n'; i++) {
        if (text[i] === '\\') i++;
        else if (text[i] === '[') inClass = true;
        else if (text[i] === ']') inClass = false;
        else if (text[i] === '/' && !inClass) break;
      }
      for (i++; /[a-z]/.test(text[i] ?? ''); i++);
    } else if (c === '=' && text[i + 1] === '>') {
      push('=>');
      i += 2;
    } else {
      push(c);
      i++;
    }
  }
  return tokens;
}

const OPENS = new Set(['(', '[', '{']),
  CLOSES = new Set([')', ']', '}']);
const STARTS = new Set(['export', 'function', 'async', 'const', 'let', 'var', 'class', 'import']);

/** The top-level units of a script: each function, class or declaration, with its name, first line and tokens. */
export function unitsOf(text) {
  const tokens = tokenize(text);
  const units = [];
  let depth = 0,
    current;
  for (let k = 0; k < tokens.length; k++) {
    const token = tokens[k];
    if (depth === 0 && token.start && STARTS.has(token.t)) {
      if (current) units.push(current);
      current = { line: token.line, tokens: [] };
    }
    if (OPENS.has(token.t)) depth++;
    else if (CLOSES.has(token.t)) depth = Math.max(0, depth - 1);
    current?.tokens.push(token.t);
  }
  if (current) units.push(current);
  return units
    .filter(unit => unit.tokens[0] !== 'import')
    .map(unit => {
      const words = unit.tokens.filter(t => !['export', 'default', 'async', 'function', 'const', 'let', 'var', 'class', '*'].includes(t));
      return { name: /^[A-Za-z_$]/.test(words[0] ?? '') ? words[0] : '(default)', line: unit.line, tokens: unit.tokens };
    });
}

/** Names become `i`, keeping the language's own words, so that copies differing only in names compare equal. */
export const normalize = tokens => tokens.map(t => (/^[A-Za-z_$]/.test(t) && !KEYWORDS.has(t) && t !== 'S' && t !== 'R' ? 'i' : t));

export function shingles(tokens, size = SHINGLE) {
  const set = new Set();
  for (let k = 0; k + size <= tokens.length; k++) set.add(tokens.slice(k, k + size).join(' '));
  return set;
}

function scripts(folder) {
  const found = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(mjs|js)$/.test(entry.name) && statSync(full).size < 400_000) found.push(full);
    }
  };
  if (existsSync(join(folder, 'src'))) walk(join(folder, 'src'));
  return found;
}

/** Every unit of every game's src/, and the groups of alike units of three or more games. */
export function findDuplication(root = ROOT) {
  const games = gameFolders(root).filter(folder => !folder.startsWith('templates/'));
  const units = [];
  for (const game of games)
    for (const file of scripts(join(root, game)))
      for (const unit of unitsOf(readFileSync(file, 'utf8'))) {
        if (unit.tokens.length < MIN_TOKENS) continue;
        units.push({ game, file: relative(root, file).split('\\').join('/'), name: unit.name, line: unit.line, size: unit.tokens.length, shingles: shingles(normalize(unit.tokens)) });
      }
  // Candidates share at least one run of tokens that is not common to many units.
  const posting = new Map();
  units.forEach((unit, index) => {
    for (const shingle of unit.shingles) {
      let list = posting.get(shingle);
      if (!list) posting.set(shingle, (list = []));
      list.push(index);
    }
  });
  const shared = new Map();
  for (const list of posting.values()) {
    if (list.length < 2 || list.length > 60) continue;
    for (let a = 0; a < list.length; a++)
      for (let b = a + 1; b < list.length; b++) {
        if (units[list[a]].game === units[list[b]].game) continue;
        const key = list[a] * 1e6 + list[b];
        shared.set(key, (shared.get(key) ?? 0) + 1);
      }
  }
  const parent = units.map((_, index) => index);
  const find = x => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const pairs = [];
  for (const [key, count] of shared) {
    const a = Math.floor(key / 1e6),
      b = key % 1e6;
    const jaccard = count / (units[a].shingles.size + units[b].shingles.size - count);
    if (jaccard >= ALIKE) {
      pairs.push({ a, b, jaccard });
      parent[find(a)] = find(b);
    }
  }
  const groups = new Map();
  units.forEach((unit, index) => {
    if (!pairs.some(pair => pair.a === index || pair.b === index)) return;
    const head = find(index);
    if (!groups.has(head)) groups.set(head, []);
    groups.get(head).push(index);
  });
  const reported = [];
  for (const members of groups.values()) {
    const gamesOf = new Set(members.map(index => units[index].game));
    if (gamesOf.size < MIN_GAMES) continue;
    const inside = pairs.filter(pair => members.includes(pair.a));
    const names = [...new Set(members.map(index => units[index].name))];
    reported.push({
      games: [...gamesOf].sort(),
      names,
      similarity: Math.round((inside.reduce((sum, pair) => sum + pair.jaccard, 0) / inside.length) * 100) / 100,
      tokens: Math.round(members.reduce((sum, index) => sum + units[index].size, 0) / members.length),
      engine: engineHas(names),
      where: members.map(index => `${units[index].file}:${units[index].line}`).sort()
    });
  }
  reported.sort((a, b) => b.games.length - a.games.length || b.tokens - a.tokens || a.names[0].localeCompare(b.names[0]));
  // Names many games gave a function of their own, alike or not.
  const byName = new Map();
  for (const unit of units) {
    if (unit.name === '(default)') continue;
    if (!byName.has(unit.name)) byName.set(unit.name, new Set());
    byName.get(unit.name).add(unit.game);
  }
  const names = [...byName]
    .filter(([, set]) => set.size >= NAME_GAMES)
    .map(([name, set]) => ({ name, games: [...set].sort(), engine: engineHas([name]) }))
    .sort((a, b) => b.games.length - a.games.length || a.name.localeCompare(b.name));
  return { games: games.length, units: units.length, groups: reported, names };
}

function engineHas(names) {
  return ENGINE_HAS.find(known => names.some(name => known.names.test(name)))?.has ?? null;
}

export function reportMarkdown(found) {
  const lines = [
    '# 重复代码 · Duplicated code',
    '',
    '由 `node tools/duplication.mjs --write` 从各游戏的 `src/` 生成，不要手改；`--check` 检查它是否过期。三个以上游戏各写了一遍的代码，该进引擎的 kit 或模板；「引擎已有」一栏写着可以换成什么。',
    '',
    'Made by `node tools/duplication.mjs --write` from the `src/` of every game; do not edit by hand, and `--check` says whether it is out of date. Code three or more games each wrote belongs in the engine\'s kit or in the template; "Engine has" names what can replace it.',
    '',
    `${found.games} 个游戏，${found.units} 段至少 ${MIN_TOKENS} 个词元的顶层代码。名字、数字和字符串都换成同一个记号后，连续 ${SHINGLE} 个词元的 Jaccard 指数不小于 ${ALIKE} 就算相同。`,
    '',
    `${found.games} games, ${found.units} top-level units of at least ${MIN_TOKENS} tokens. With every name, number and string made one token, two units are alike when the Jaccard index of their runs of ${SHINGLE} tokens is ${ALIKE} or more.`,
    '',
    `## 1. ${MIN_GAMES} 个以上游戏写了几乎相同的代码 · Code that ${MIN_GAMES} or more games wrote nearly alike`,
    '',
    '| 名字 · Names | 游戏数 · Games | 相似度 · Alike | 词元 · Tokens | 引擎已有 · Engine has | 位置 · Where |',
    '|---|:-:|:-:|:-:|---|---|'
  ];
  if (!found.groups.length) lines.push('| （没有 · None） | | | | | |');
  for (const group of found.groups)
    lines.push(
      `| ${group.names.slice(0, 6).map(name => '`' + name + '`').join(', ')} | ${group.games.length} | ${group.similarity} | ${group.tokens} | ${group.engine ?? '–'} | ${group.where.slice(0, 8).join('<br>')}${group.where.length > 8 ? `<br>… +${group.where.length - 8}` : ''} |`
    );
  lines.push(
    '',
    `## 2. ${NAME_GAMES} 个以上游戏用的同一个函数名 · Names that ${NAME_GAMES} or more games gave a function`,
    '',
    '同名不一定是同一段代码：`update`、`draw` 这类名字各游戏写法各异。和引擎已有的东西同名的，先看能不能换掉。',
    '',
    'One name is not always one piece of code: games write an `update` or a `draw` of their own. A name that matches what the engine has is worth a look first.',
    '',
    '| 名字 · Name | 游戏数 · Games | 引擎已有 · Engine has | 游戏 · Games |',
    '|---|:-:|---|---|'
  );
  for (const name of found.names) lines.push(`| \`${name.name}\` | ${name.games.length} | ${name.engine ?? '–'} | ${name.games.join(', ')} |`);
  return lines.join('\n') + '\n';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  const found = findDuplication();
  if (args.has('--json')) {
    process.stdout.write(JSON.stringify(found, null, 2) + '\n');
  } else {
    const text = reportMarkdown(found);
    const file = join(ROOT, REPORT);
    if (args.has('--check')) {
      const now = existsSync(file) ? readFileSync(file, 'utf8') : '';
      if (now !== text) {
        process.stderr.write(`${REPORT} is out of date: run node tools/duplication.mjs --write\n`);
        process.exitCode = 1;
      } else process.stdout.write(`${REPORT} is current.\n`);
    } else if (args.has('--write')) {
      writeFileSync(file, text);
      process.stdout.write(`Wrote ${REPORT}: ${found.groups.length} groups, ${found.names.length} names.\n`);
    } else process.stdout.write(text);
  }
}
