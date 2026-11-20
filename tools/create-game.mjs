#!/usr/bin/env node
// 从模板新建一款游戏：复制 templates/egret-game/，换掉标题、存档键和目录深度相关的路径，再生成引擎副本。
//   node tools/create-game.mjs <目录名> --title "中文名 · English name" [--engine <引擎仓库>]
//   npm run create -- <目录名> --title "中文名 · English name"
// 给了 --engine（或仓库旁边有 ../Egret_rebuild 且已构建）时，用那里的 tools/vendor-game.mjs 按模板的入口重新复制引擎，
// 并把新的 import map 贴进 index.html；否则沿用模板自带的引擎副本。截图基线不复制：新游戏第一次跑
// `node test/accept.mjs --update` 写下自己的基线。
//
// Make a new game from the template: copy templates/egret-game/, replace its title, its save key and the paths that
// depend on folder depth, then make the engine copy. With --engine (or a built ../Egret_rebuild beside this repository)
// the engine's tools/vendor-game.mjs copies the template's entries again and the new import map is pasted into
// index.html; otherwise the template's copy is kept. Screenshot baselines are not copied: the new game's first
// `node test/accept.mjs --update` writes its own.
import { execFileSync } from 'node:child_process';
import { cp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ROOT, TEMPLATE } from './check-standard.mjs';

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  if (at < 0) return undefined;
  const [value] = args.splice(at, 2).slice(1);
  return value;
};
const title = option('--title'),
  engineOption = option('--engine'),
  folder = args.find((a) => !a.startsWith('-'));

const fail = (words) => {
  console.error(words);
  process.exit(1);
};
if (!folder || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(folder))
  fail('用法 · Usage: node tools/create-game.mjs <目录名 · folder> --title "中文名 · English name" [--engine <path>]\n目录名只用字母、数字、- 和 _ · letters, digits, - and _ only.');
const [zh, en] = (title ?? `${folder} · ${folder}`).split(/\s+·\s+/).map((s) => s.trim());
if (!zh || !en) fail('--title 写成 "中文名 · English name" · write --title as "中文名 · English name".');

const target = join(ROOT, folder),
  template = join(ROOT, TEMPLATE);
if (existsSync(target)) fail(`${folder} 已存在 · already exists.`);

await cp(template, target, {
  recursive: true,
  filter: (source) => !source.includes(join('test', 'baseline'))
});

const saveKey = folder.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const edit = async (path, change) => {
  const file = join(target, path);
  await writeFile(file, change(await readFile(file, 'utf8')));
};
const js = (s) => s.replaceAll('\\', '\\\\').replaceAll("'", "\\'");

await edit('src/i18n.mjs', (s) =>
  s
    .replace("title: { zh: '提灯人', en: 'The Lantern Bearer' }", `title: { zh: '${js(zh)}', en: '${js(en)}' }`)
    .replace("stage: { zh: '提灯人 · 游戏模板', en: 'The Lantern Bearer · game template' }", `stage: { zh: '${js(zh)}', en: '${js(en)}' }`)
);
await edit('src/saves.mjs', (s) => s.replace("'egret-game-template'", `'${saveKey}'`));
await edit('index.html', (s) => s.replace('<title>提灯人 · The Lantern Bearer</title>', `<title>${zh} · ${en}</title>`));
await edit('test/accept.mjs', (s) => s.replaceAll("'../../../tools/lib/browser.mjs'", "'../../tools/lib/browser.mjs'").replaceAll("'egret-game-template'", `'${saveKey}'`).replaceAll('template acceptance', `${folder} acceptance`));
await edit('README.md', (s) => {
  const lines = s.split('\n');
  lines[0] = `# ${zh} · ${en}`;
  return lines
    .join('\n')
    .replaceAll('提灯人', zh)
    .replaceAll('The Lantern Bearer', en)
    .replaceAll('templates/egret-game/', `${folder}/`)
    .replaceAll('https://cnedwin.github.io/PortedGamesEgret/templates/egret-game/', `https://cnedwin.github.io/PortedGamesEgret/${folder}/`);
});
for (const name of ['ENGINE-NOTES.md', 'QUALITY.md']) await edit(name, (s) => s.replaceAll('提灯人', zh).replaceAll('The Lantern Bearer', en).replaceAll('templates/egret-game', folder));

// 引擎副本 · The engine copy.
const engine = engineOption
  ? resolve(engineOption)
  : ['Egret_rebuild', 'egret_rebuild'].map((name) => resolve(ROOT, '..', name)).find((path) => existsSync(path)) ?? resolve(ROOT, '..', 'Egret_rebuild');
let vendored = 'kept';
if (existsSync(join(engine, 'tools', 'vendor-game.mjs')) && existsSync(join(engine, 'packages', 'engine', 'dist'))) {
  const source = await readFile(join(template, 'vendor', 'SOURCE.md'), 'utf8');
  const entries = [...(/Entries: (.*)\. Only/.exec(source)?.[1] ?? '').matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  await rm(join(target, 'vendor'), { recursive: true, force: true });
  execFileSync(process.execPath, ['tools/vendor-game.mjs', target, ...entries], { cwd: engine, stdio: 'inherit' });
  const map = await readFile(join(target, 'vendor', 'importmap.json'), 'utf8');
  await edit('index.html', (s) => s.replace(/(<script type="importmap">)[\s\S]*?(<\/script>)/, (_, a, b) => `${a}\n${map.trim()}\n  ${b}`));
  vendored = engine;
} else if (engineOption) fail(`${engine} 里没有构建好的引擎 · has no built engine (run its build first).`);

const commit = /commit `([0-9a-f]{7,40})`/.exec(await readFile(join(target, 'vendor', 'SOURCE.md'), 'utf8'))?.[1] ?? '?';
await edit('README.md', (s) => s.replace(/`[0-9a-f]{40}`/g, `\`${commit}\``));

const count = async (dir) => {
  let n = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) n += entry.isDirectory() ? await count(join(dir, entry.name)) : 1;
  return n;
};
console.log(`已建 · Made ${folder}/ (${await count(target)} files), save key '${saveKey}', engine ${vendored === 'kept' ? `copy kept from the template (${commit.slice(0, 7)})` : `copied from ${vendored} (${commit.slice(0, 7)})`}.`);
console.log(`接下来 · Next:
  cd ${folder}
  node --test test/*.test.mjs
  node test/accept.mjs --update   # 第一次写下截图基线 · writes the first baselines
  node test/accept.mjs
  node ../tools/quality.mjs .`);
