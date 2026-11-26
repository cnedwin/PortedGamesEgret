// 导出微信小游戏：先在临时目录里整理一份小游戏用的游戏目录（不带测试、工具和文档），交给引擎的
// tools/wechat/export-wechat.mjs 打包。本作的插画及树木贴图在 assets/，音频由代码合成，保持一个主包。
//
//   node LubanBridge/tools/wechat.mjs --engine <Egret_rebuild> --esbuild <esbuild package folder> --out <new folder>
//
// Exports the WeChat mini game: a copy of the game folder fit for a mini game (without the tests, tools and docs) is
// put together in a temporary folder and packed by the engine's tools/wechat/export-wechat.mjs. Lightweight artwork is in assets/; sound is made in code, keeping one main package.
import { cpSync, mkdtempSync, rmSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0 || !process.argv[i + 1]) throw Error(`--${name} is needed`);
  return path.resolve(process.argv[i + 1]);
};
const engine = arg('engine'),
  out = arg('out'),
  esbuild = createRequire(import.meta.url)(arg('esbuild'));
const { exportWechat, MAIN_PACKAGE_LIMIT, TOTAL_LIMIT } = await import(pathToFileURL(path.join(engine, 'tools/wechat/export-wechat.mjs')).href);

const stage = mkdtempSync(path.join(tmpdir(), 'luban-wechat-'));
const leaveOut = (rel) => /^(test|tools|docs|node_modules)(\/|$)/.test(rel) || /\.md$/.test(rel);
cpSync(GAME, stage, { recursive: true, filter: (from) => !leaveOut(path.relative(GAME, from).split(path.sep).join('/')) });
const report = await exportWechat({ esbuild, gameDir: stage, out, orientation: 'landscape', name: 'LubanBridge' });
rmSync(stage, { recursive: true, force: true });

const sizeOf = (p) => (statSync(p).isDirectory() ? readdirSync(p).reduce((sum, name) => sum + sizeOf(path.join(p, name)), 0) : statSync(p).size);
const total = sizeOf(out);
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
const summary = { out, gameJs: mb(report.gameJsBytes), total: mb(total), withinMainPackage: total <= MAIN_PACKAGE_LIMIT, withinTotal: total <= TOTAL_LIMIT, refused: report.refused, warnings: report.warnings };
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.withinMainPackage && !report.refused.length ? 0 : 1);
