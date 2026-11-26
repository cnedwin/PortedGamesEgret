// 小游戏验收：把 tools/wechat.mjs 导出的小游戏目录放进引擎的微信替身（tools/wechat/check-minigame.mjs 的那一页：
// GameGlobal 里只有 wx、控制台和计时器），横屏 844×390，用鼠标当手指：标题 → 选关 → 第一关 → 手记 → 拖出一根杆件 →
// 载入参考解 → 点「试通」→ 过桥。每一步都等游戏自己报告换了画面。页面上不许多出元素、不许有错误。
//
//   node LubanBridge/test/minigame.mjs --engine <Egret_rebuild> --folder <exported mini game>
//
// The mini game acceptance: the folder tools/wechat.mjs exports, run in the engine's WeChat stand-in (the page of
// tools/wechat/check-minigame.mjs, whose GameGlobal holds only wx, the console and timers), 844 × 390 wide, the
// mouse standing in for a finger: title → levels → the first level → the notes → one member dragged out → the
// reference loaded → Test → across. Each step waits for the game to say its screen changed. No element may be added
// to the page, and no error may happen.
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const arg = (name) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) throw Error(`--${name} is needed`);
  return path.resolve(process.argv[i + 1]);
};
const engine = arg('engine'),
  folder = arg('folder');
const { standInPage } = await import(pathToFileURL(path.join(engine, 'tools/wechat/check-minigame.mjs')).href);
const W = 844,
  H = 390;
const TYPES = { '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer((request, response) => {
  const url = decodeURIComponent(new URL(request.url, 'http://x').pathname);
  if (url === '/') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return response.end(standInPage({ width: W, height: H, ratio: 2 }));
  }
  const file = path.resolve(folder, url.replace(/^\/pkg\//, ''));
  if (!url.startsWith('/pkg/') || !file.startsWith(folder) || !existsSync(file) || statSync(file).isDirectory()) {
    response.writeHead(404);
    return response.end();
  }
  response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  response.end(readFileSync(file));
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const checks = [],
  problems = [];
const check = (ok, words) => {
  checks.push([Boolean(ok), words]);
  process.stderr.write(`${ok ? 'ok' : 'not ok'} - ${words}\n`);
};
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('console', (m) => m.type() === 'error' && problems.push('console: ' + m.text().slice(0, 300)));
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
const game = (fn, a) => page.evaluate(fn, a);
const until = (fn, a, seconds = 90) => page.waitForFunction(fn, a, { timeout: seconds * 1000, polling: 200 });
// A stage point (global units) as the phone's screen shows it: the stage is the design grown to the screen's shape.
const toPage = (point) =>
  game((p) => {
    const g = GameGlobal.egretGame.game,
      o = g.ui.localToGlobal(0, 0),
      w = g.width + 2 * o.x,
      h = g.height + 2 * o.y,
      k = Math.min(innerWidth / w, innerHeight / h);
    return { x: (innerWidth - w * k) / 2 + p.x * k, y: (innerHeight - h * k) / 2 + p.y * k };
  }, point);
const tap = async (point) => {
  const at = await toPage(point);
  await page.mouse.click(at.x, at.y);
};
const middleOf = (pick) =>
  game((src) => {
    const r = new Function('egret', 'return ' + src)(GameGlobal.egretGame);
    return r.sprite.localToGlobal(0, 0);
  }, pick);
const screenIs = (name) => until((n) => GameGlobal.egretGame?.ready && GameGlobal.egretGame.screen === n && !GameGlobal.egretGame.busy, name);
const shot = async (name) => writeFileSync(path.join(process.env.SHOTS ?? tmpdir(), 'luban-minigame-' + name + '.png'), await page.locator('#screen').screenshot());

try {
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await screenIs('title');
  check(await game(() => GameGlobal.egretGame.app.miniGame), 'the game knows it is a mini game');
  await game(() => GameGlobal.egretGame.game.invalidate());
  await page.waitForTimeout(400);
  await shot('title');
  await tap(await middleOf('egret.view.focus[1]'));
  await screenIs('levels');
  await game(() => GameGlobal.egretGame.game.invalidate());
  await page.waitForTimeout(400);
  await shot('levels');
  await tap(await middleOf('egret.view.focus[0]'));
  await screenIs('build');
  await until(() => GameGlobal.egretGame.overlay === 'tip');
  // The notes card's one button, which holds the focus.
  await tap(await game(() => GameGlobal.egretGame.focusNow().sprite.localToGlobal(0, 0)));
  await until(() => GameGlobal.egretGame.overlay === null);
  check(true, 'a finger goes from the title through the levels into the first level and puts the notes away');
  // One member dragged with a finger: the first deck plank of the reference.
  const [a, b] = await game(() => {
    const v = GameGlobal.egretGame.view,
      m = v.level.reference.members[0];
    return [v.stagePoint(m[0], m[1]), v.stagePoint(m[2], m[3])];
  });
  const pa = await toPage(a),
    pb = await toPage(b);
  await page.mouse.move(pa.x, pa.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(pa.x + ((pb.x - pa.x) * i) / 8, pa.y + ((pb.y - pa.y) * i) / 8);
  await page.mouse.up();
  await page.waitForTimeout(300);
  check((await game(() => GameGlobal.egretGame.view.design.members.length)) === 1, 'a finger drags out a member');
  await game(() => {
    const e = GameGlobal.egretGame,
      level = e.view.level;
    e.app.update((d) => (d.designs[level.id] = level.reference));
    return e.app.go('build', level.id);
  });
  await screenIs('build');
  await game(() => GameGlobal.egretGame.game.invalidate());
  await page.waitForTimeout(400);
  await shot('site');
  await tap(await middleOf('egret.view.testRecord'));
  await until(() => GameGlobal.egretGame.view?.running);
  check(true, 'a finger on Test starts the crossing');
  await page.waitForTimeout(3000);
  await shot('crossing');
  await until(() => GameGlobal.egretGame.overlay === 'result', null, 180);
  const passed = await game(() => GameGlobal.egretGame.app.data().progress['1-1']?.passed);
  check(passed === true, 'the carts get across and the level is passed, saved in WeChat storage');
  await shot('result');
  check((await game(() => document.body.querySelectorAll('*').length)) < 20, 'nothing was added to the page');
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
} finally {
  await browser.close();
  server.close();
  for (const p of problems) check(false, p);
  console.log(`# LubanBridge mini game (WeChat stand-in, 844×390): ${checks.filter(([ok]) => ok).length} of ${checks.length} passed`);
  process.exit(checks.every(([ok]) => ok) ? 0 : 1);
}
