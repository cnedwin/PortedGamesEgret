// 字体：从思源宋体（Noto Serif SC）切出本作用到的字加上 GB 2312 一级字（玩家在笔录里写字够用），
// 从马善政楷书切出标题用到的字，再用引擎的内容构建器（egret.font 1.0.0）做成资源清单与按 SHA-256 命名的字体文件。
// 引擎的字体集合加载器、段落排版和原生文字编辑都从这份清单读字体。
//
//   <Node 26.7.0> tools/assets/fonts.mjs --engine ../../Egret_rebuild --sources <folder with the full fonts>
//
// 源字体：NotoSerifSC[wght].ttf 先在 wght=400 取静态实例（fontTools.varLib.instancer），MaShanZheng-Regular.ttf 原样。
// 两者都是 SIL OFL 1.1，许可随字体放在 assets/fonts/。需要 Python 的 fontTools 做子集。
//
// Fonts: the characters this game uses plus the 3,755 first-level characters of GB 2312 (enough for a player's notes)
// are cut from Noto Serif SC, and the characters of the titles from Ma Shan Zheng; the engine's content builder
// (egret.font 1.0.0) then makes a resource manifest and font files named by their SHA-256. The engine's font-set
// loader, paragraph layout and native text editing all read the fonts from that manifest.
//
// Sources: NotoSerifSC[wght].ttf instanced at wght=400 with fontTools.varLib.instancer, and MaShanZheng-Regular.ttf
// as it is. Both are SIL OFL 1.1; the licences sit beside the fonts in assets/fonts/. Subsetting needs Python fontTools.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CASES, PROLOGUE, SCROLLS } from '../../src/sim/cases/index.mjs';
import { KINDS } from '../../src/sim/kinds.mjs';
import { WORDS } from '../../src/words.mjs';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const engine = path.resolve(GAME, arg('engine', '../../Egret_rebuild'));
const sources = path.resolve(arg('sources', '.'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

// Every string in the game, both languages.
function* strings(v) {
  if (typeof v === 'string') yield v;
  else if (Array.isArray(v)) for (const x of v) yield* strings(x);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) yield* strings(x);
}
const all = new Set();
for (const s of strings([CASES, PROLOGUE, SCROLLS, KINDS, WORDS])) for (const ch of s.replace(/\[\[[a-z0-9]+\|?|\]\]|\{\{[a-z0-9]+\}\}/g, '')) all.add(ch);
for (let c = 0x20; c < 0x7f; c++) all.add(String.fromCharCode(c));
for (const ch of '，。、；：？！“”‘’（）《》〈〉【】—…·　「」『』□○△×・─') all.add(ch);
const gb1 = [];
for (let a = 0xb0; a <= 0xd7; a++) for (let b = 0xa1; b <= 0xfe; b++) if (!(a === 0xd7 && b > 0xf9)) gb1.push(new TextDecoder('gb18030').decode(new Uint8Array([a, b])));
const song = [...new Set([...all, ...gb1])].filter((ch) => ch !== '\n');
// The brush face is for titles, headings, buttons and seals: every short string of the interface, the titles, the
// kinds, the verdict's fields and the words on the seals.
const headings = [
  CASES.map((c) => [c.title.zh, c.pages.map((p) => p.title.zh), Object.values(c.spots).map((s) => s.title.zh), c.verdict?.title.zh, c.verdict?.fields.map((f) => f.label.zh)]),
  SCROLLS.map((s) => s.title.zh),
  Object.values(KINDS).map((k) => k.zh + k.name.zh)
];
for (const entry of Object.values(WORDS)) if (typeof entry.zh === 'string' && entry.zh.length <= 16) headings.push(entry.zh);
const brush = [...new Set([...strings(headings)].join('') + '一二三四五六人物核实定谳结案洗冤仵作老秦')].filter((ch) => /\p{Script=Han}/u.test(ch));

const work = mkdtempSync(path.join(tmpdir(), 'inquest-fonts-'));
const subset = (from, chars, to) => {
  writeFileSync(path.join(work, 'chars.txt'), chars.join(''));
  execFileSync('python3', ['-m', 'fontTools.subset', path.join(sources, from), `--text-file=${path.join(work, 'chars.txt')}`, `--output-file=${to}`, '--layout-features=*', '--name-IDs=*', '--name-languages=*'], { stdio: 'inherit' });
  return readFileSync(to);
};
mkdirSync(path.join(work, 'project/sources'), { recursive: true });
const songBytes = subset('NotoSerifSC-Regular.ttf', song, path.join(work, 'project/sources/InquestSong.ttf'));
const brushBytes = subset('MaShanZheng-Regular.ttf', brush, path.join(work, 'project/sources/InquestBrush.ttf'));

// The engine's content build: two egret.font resources, one manifest.
const { createProjectStore } = await import(pathToFileURL(path.join(engine, 'node_modules/@egret/project/dist/index.js')).href);
const { buildContentProject } = await import(pathToFileURL(path.join(engine, 'tools/content/build.mjs')).href);
const root = path.join(work, 'project');
for (const name of ['cache', 'build']) mkdirSync(path.join(root, name));
const fonts = [
  ['song', 'InquestSong.ttf', 'Inquest Song', songBytes, 'Noto Serif SC (SIL OFL 1.1), static wght 400 instance, subset to the game text and GB 2312 level 1'],
  ['brush', 'InquestBrush.ttf', 'Inquest Brush', brushBytes, 'Ma Shan Zheng (SIL OFL 1.1), subset to the titles']
];
const files = fonts.map(([id, file, , bytes]) => ({ id: 'f_' + id, path: 'sources/' + file, role: 'source', mediaType: 'font/ttf', sha256: sha(bytes), byteLength: bytes.length }));
const recipes = fonts.map(([id, , family, bytes, origin]) => ({
  resourceId: 'e_' + id,
  sourceFileId: 'f_' + id,
  importer: { id: 'egret.font', version: '1.0.0' },
  settings: { family, flavor: 'truetype' },
  artifactFormatVersion: 'egret.font/1',
  dependencies: [],
  provenance: { origin, license: 'OFL-1.1', notice: 'Subset of the original font; the family name is a runtime alias. See assets/fonts/OFL-*.txt.', sha256: sha(bytes) }
}));
const snapshot = { projectSchemaVersion: '1.0', projectId: 'p_inquest_fonts', revision: 0, name: 'The Inquest Scrolls fonts', versions: { engineVersion: '0.0.0', resourceFormatVersion: '1.0', toolProtocolVersion: '1.0' }, roots: [], entities: [], files, retiredEntityIds: [], retiredFileIds: [] };
const admitted = createProjectStore(snapshot);
if (!admitted.ok) throw Error(JSON.stringify(admitted.diagnostics));
const result = await buildContentProject({
  projectStore: admitted.value,
  projectRoot: root,
  recipe: { format: 'egret.content-build-recipe/1', targetProfile: 'web-shared/1', recipes },
  cacheRoot: path.join(root, 'cache'),
  outputRoot: path.join(root, 'build'),
  selectorId: 'e_fonts',
  transactionId: 't_fonts'
});
if (result.status !== 'adopted') throw Error('FONT_BUILD_NOT_ADOPTED');

// Keep only what a page loads: the manifest and the blobs, under assets/fonts/build.
const out = path.join(GAME, 'assets/fonts');
rmSync(path.join(out, 'build'), { recursive: true, force: true });
mkdirSync(path.join(out, 'build'), { recursive: true });
cpSync(path.join(root, 'build/blobs'), path.join(out, 'build/blobs'), { recursive: true });
const manifestDir = path.dirname(result.manifestPath);
cpSync(path.join(root, manifestDir), path.join(out, 'build', path.relative('build', manifestDir)), { recursive: true });
const manifestBytes = readFileSync(path.join(root, result.manifestPath));
const config = {
  format: 'inquest.fonts/1',
  manifestPath: 'build/' + path.relative('build', result.manifestPath).split(path.sep).join('/'),
  manifestSha256: sha(manifestBytes),
  roots: ['e_song', 'e_brush'],
  families: { song: 'Inquest Song', brush: 'Inquest Brush' },
  blobs: Object.fromEntries(fonts.map(([id, , , bytes]) => [id, 'build/blobs/sha256/' + sha(bytes)])),
  characters: { song: song.length, brush: brush.length }
};
writeFileSync(path.join(out, 'fonts.json'), JSON.stringify(config, null, 2) + '\n');
writeFileSync(path.join(out, 'song-chars.txt'), song.join(''));
rmSync(work, { recursive: true, force: true });
console.log(JSON.stringify({ ...config, songBytes: songBytes.length, brushBytes: brushBytes.length }));
