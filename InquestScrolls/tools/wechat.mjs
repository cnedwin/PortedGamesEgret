// 导出微信小游戏：先在临时目录里整理一份小游戏用的游戏目录（不带 CanvasKit、字体构建、高清背景和测试），交给引擎的
// tools/wechat/export-wechat.mjs 打包（WebP 转成 JPEG/PNG），再把案件图片 assets/art/ 设成分包，开局后下载。
// 主包不得超过 4 MB，全部不得超过 30 MB。
//
//   node InquestScrolls/tools/wechat.mjs --engine <Egret_rebuild> --esbuild <esbuild package folder> \
//     --playwright <playwright/index.mjs> --out <new folder>
//
// Exports the WeChat mini game: a copy of the game folder fit for a mini game is put together in a temporary folder
// (without CanvasKit, the font build, the full-size backgrounds or the tests), packed by the engine's
// tools/wechat/export-wechat.mjs (WebP written again as JPEG or PNG), and the case pictures in assets/art/ are made a
// subpackage, downloaded once the game has started. The main package must stay under 4 MB, everything under 30 MB.
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHRINK = `
import json, os, sys
from PIL import Image
folder = sys.argv[1]
index = json.load(open(os.path.join(folder, 'index.json')))
largest = {'fig': 560, 'prop': 420, 'chart': 760}
for name, info in index.items():
    edge = largest.get(info['kind'])
    file = os.path.join(folder, name + '.webp')
    if not edge or not os.path.exists(file):
        continue
    picture = Image.open(file)
    scale = edge / max(picture.size)
    if scale < 1:
        picture.resize((round(picture.width * scale), round(picture.height * scale)), Image.LANCZOS).save(file, 'WEBP', quality=90)
`;
const arg = (name) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0 || !process.argv[i + 1]) throw Error(`--${name} is needed`);
  return path.resolve(process.argv[i + 1]);
};
const engine = arg('engine'),
  out = arg('out'),
  esbuild = createRequire(import.meta.url)(arg('esbuild')),
  playwright = arg('playwright');
const { exportWechat, chromiumTranscoder, MAIN_PACKAGE_LIMIT, TOTAL_LIMIT } = await import(pathToFileURL(path.join(engine, 'tools/wechat/export-wechat.mjs')).href);

// The game as a mini game sees it.
const stage = mkdtempSync(path.join(tmpdir(), 'inquest-wechat-'));
const leaveOut = (rel) =>
  /^(runtime|test|tools|docs|node_modules)(\/|$)/.test(rel) ||
  /^assets\/fonts\/build(\/|$)/.test(rel) ||
  // Only the smaller backgrounds are used in a mini game.
  /^assets\/art\/bg-[a-z0-9]+\.webp$/.test(rel) ||
  /\.md$/.test(rel);
cpSync(GAME, stage, { recursive: true, filter: (from) => !leaveOut(path.relative(GAME, from).split(path.sep).join('/')) });
// Smaller pictures for a phone: figures, things and the body charts at about the size a phone's screen shows them.
// WeChat on some phones does not decode WebP, and the PNG they become is several times larger, so this keeps the
// whole package under WeChat's limit.
execFileSync('python3', ['-c', SHRINK, path.join(stage, 'assets/art')], { stdio: 'inherit' });
// The page's CanvasKit script is not part of a mini game.
const page = path.join(stage, 'index.html');
writeFileSync(page, readFileSync(page, 'utf8').replace(/\s*<script src="runtime\/canvaskit\/canvaskit\.js"><\/script>/, ''));

const transcoder = await chromiumTranscoder((await import(pathToFileURL(playwright).href)).chromium);
const report = await exportWechat({ esbuild, gameDir: stage, out, orientation: 'portrait', name: 'InquestScrolls', transcode: transcoder.transcode }).finally(() => transcoder.close());
rmSync(stage, { recursive: true, force: true });

// The pictures as a subpackage: a folder with an entry script of its own, loaded by wx.loadSubpackage({ name: 'art' }).
writeFileSync(path.join(out, 'assets/art/game.js'), '// The pictures of the cases: a subpackage with no code of its own.\n');
const gameJson = JSON.parse(readFileSync(path.join(out, 'game.json'), 'utf8'));
gameJson.subpackages = [{ name: 'art', root: 'assets/art/' }];
writeFileSync(path.join(out, 'game.json'), JSON.stringify(gameJson, null, 2) + '\n');

const sizeOf = (p) => (statSync(p).isDirectory() ? readdirSync(p).reduce((sum, name) => sum + sizeOf(path.join(p, name)), 0) : statSync(p).size);
const total = sizeOf(out),
  art = sizeOf(path.join(out, 'assets/art')),
  main = total - art;
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
const summary = {
  out,
  gameJs: mb(report.gameJsBytes),
  mainPackage: mb(main),
  artSubpackage: mb(art),
  total: mb(total),
  withinMainPackage: main <= MAIN_PACKAGE_LIMIT,
  withinTotal: total <= TOTAL_LIMIT,
  refused: report.refused,
  transcoded: report.transcoded.length,
  warnings: report.warnings
};
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.withinMainPackage && summary.withinTotal && !report.refused.length ? 0 : 1);
