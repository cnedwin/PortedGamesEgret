// 小游戏验收：把 tools/wechat.mjs 导出的小游戏目录放进引擎的微信替身（tools/wechat/check-minigame.mjs 的那一页：
// GameGlobal 里只有 wx、控制台和计时器），竖屏 390×844，用鼠标当手指一步步点：开卷 → 序 → 案情 → 进第一案 →
// 点掉老秦 → 点尸身 → 点一个词收进词囊 → 合上 → 卷宗里填一页并盖印 → 笔录用字盘写 → 最后一案用字盘写判词并呈上。
// 每一步都等游戏自己报告换了画面再点下一下。没有 CanvasKit、没有文本框、页面上不许多出元素、不许有错误。
//
//   node InquestScrolls/test/minigame.mjs --engine <Egret_rebuild> --folder <exported mini game>
//
// The mini game acceptance: the folder tools/wechat.mjs exports, run in the engine's WeChat stand-in (the page of
// tools/wechat/check-minigame.mjs, whose GameGlobal holds only wx, the console and timers), 390 × 844 upright, the
// mouse standing in for a finger: begin → prologue → report → the first case → Old Qin put away → the body → a word
// into the pouch → closed → a dossier page filled and sealed → notes written on the board → the verdict of the last
// case written on the board and handed in. Each step waits for the game to say its screen changed. No CanvasKit, no
// text field, no element added to the page, no error.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { report } from '../../tools/lib/browser.mjs';

const arg = (name) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) throw Error(`--${name} is needed`);
  return path.resolve(process.argv[i + 1]);
};
const engine = arg('engine'),
  folder = arg('folder');
const { standInPage } = await import(pathToFileURL(path.join(engine, 'tools/wechat/check-minigame.mjs')).href);
const W = 390,
  H = 844;
const TYPES = { '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.txt': 'text/plain' };
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
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const checks = [],
  problems = [],
  started = Date.now();
const check = (ok, words) => {
  checks.push([Boolean(ok), words]);
  process.stderr.write(`${((Date.now() - started) / 1000).toFixed(0)}s ${ok ? 'ok' : 'not ok'} - ${words}\n`);
};
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('console', (m) => m.type() === 'error' && problems.push('console: ' + m.text().slice(0, 300)));
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
const game = (fn, a) => page.evaluate(fn, a);
const until = (fn, a, seconds = 90) => page.waitForFunction(fn, a, { timeout: seconds * 1000, polling: 200 });
// A point of the stage (global units), as the phone's screen shows it. A mini game's stage fills the screen: it is
// the design grown to the screen's shape, with the design's area in its middle.
const tap = async (point) => {
  const at = await game((p) => {
    const g = GameGlobal.egretGame.game,
      o = g.ui.localToGlobal(0, 0),
      w = g.width + 2 * o.x,
      h = g.height + 2 * o.y,
      k = Math.min(innerWidth / w, innerHeight / h);
    return { x: (innerWidth - w * k) / 2 + p.x * k, y: (innerHeight - h * k) / 2 + p.y * k };
  }, point);
  await page.mouse.click(at.x, at.y);
};
// The middle of a focus record (a button, a tile) in stage units.
const middleOf = (pick) =>
  game((src) => {
    const r = new Function('egret', 'return ' + src)(GameGlobal.egretGame);
    const p = r.sprite.localToGlobal(0, 0);
    return { x: p.x + (r.ox ?? -r.w / 2) + r.w / 2, y: p.y + (r.oy ?? -r.h / 2) + r.h / 2 };
  }, pick);
const screenIs = (name) => until((n) => GameGlobal.egretGame?.ready && GameGlobal.egretGame.screen === n && !GameGlobal.egretGame.busy, name);
// Pictures of the steps go to a folder outside the repository (SHOTS, or the system's temporary folder).
const shot = async (name) => writeFileSync(path.join(process.env.SHOTS ?? tmpdir(), 'inquest-minigame-' + name + '.png'), await page.locator('#screen').screenshot());

try {
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await screenIs('title');
  check(await game(() => GameGlobal.egretGame.app.plain && GameGlobal.egretGame.app.board), 'the game knows it is a mini game: paragraphs from labels, boards for writing');
  check(await game(() => typeof CanvasKitInit === 'undefined'), 'no CanvasKit is loaded');
  await tap(await middleOf("egret.view.focus[egret.view.focusStart ?? 0]"));
  await screenIs('prologue');
  await tap(await middleOf('egret.view.focus[egret.view.focusStart]'));
  await screenIs('intro');
  await tap(await middleOf('egret.view.focus[egret.view.focusStart]'));
  await screenIs('case');
  check(true, 'a finger goes from the title through the prologue and the report into the first case');
  await until(() => !!GameGlobal.egretGame.view.teachPoint());
  await tap(await game(() => GameGlobal.egretGame.view.teachPoint()));
  await until(() => !GameGlobal.egretGame.view.teachPoint());
  // The body may be off the tall screen's view of the scene: the camera is turned to it first, as arrows would.
  await game(() => GameGlobal.egretGame.view.scene.focusSpot('body'));
  await page.waitForTimeout(1500);
  const body = await game(() => {
    const [x, y] = GameGlobal.egretGame.view.spotPoint('body');
    return { x, y };
  });
  await tap(body);
  await until(() => GameGlobal.egretGame.view.overlay?.kind === 'card' && !!GameGlobal.egretGame.view.overlay.wordRect);
  await page.waitForTimeout(1500);
  await tap(await game(() => GameGlobal.egretGame.view.overlay.wordRect('strangle')));
  await until(() => GameGlobal.egretGame.app.progress().cases.c1.found.includes('strangle'), null, 20);
  check(true, 'tapping the body opens its card, and tapping a word there puts it in the pouch');
  await shot('card');
  await tap(await middleOf('egret.view.overlay.focus.at(-1)'));
  await until(() => !GameGlobal.egretGame.view.overlay);
  // The other words, as a thorough player would gather them.
  await game(() => {
    const { app, rules, caseById } = GameGlobal.egretGame,
      c = caseById('c1'),
      st = rules.caseState(app.progress(), 'c1');
    for (const s of Object.keys(c.spots)) {
      rules.seeSpot(st, c, s);
      for (const w of rules.wordsOfSpot(c, s)) rules.collect(st, c, w);
    }
    app.save();
  });
  // The dossier from its button in the bottom bar.
  await tap(await middleOf('egret.view.focus.find((r) => r.sprite.buttonWidth)'));
  await until(() => GameGlobal.egretGame.view.overlay?.kind === 'dossier');
  await game(async () => {
    const d = GameGlobal.egretGame.view.overlay;
    d.show('p1');
    await d.settled();
    for (const [b, w] of [['b1', 'aman'], ['b2', 'sash'], ['b3', 'sunda'], ['b4', 'scratch']]) {
      d.place(b, w);
      await d.settled();
    }
  });
  await tap(await middleOf('egret.view.overlay.focus.find((r) => r.sprite.buttonWidth === 150 && r.h === 52)'));
  await until(() => GameGlobal.egretGame.app.progress().cases.c1.sealed.includes('p1'), null, 20);
  check(true, 'the dossier opens from its button; a full page is checked with a tap and sealed');
  await page.waitForTimeout(1500);
  await shot('dossier');
  await game(() => GameGlobal.egretGame.view.overlay.close());
  // Notes on the board.
  await game(() => GameGlobal.egretGame.view.openNotes());
  await until(() => GameGlobal.egretGame.view.overlay?.kind === 'notes');
  await page.waitForTimeout(1000);
  await tap(await middleOf("egret.view.overlay.focus.find((r) => r.tile?.text === '孙大')"));
  await tap(await middleOf("egret.view.overlay.focus.find((r) => r.tile?.text === '可疑')"));
  await until(() => GameGlobal.egretGame.app.progress().cases.c1.notes === '孙大可疑', null, 20);
  check(true, 'notes are written by tapping the board, and kept');
  await shot('notes');
  check(await game(() => GameGlobal.egretGame.store.data.progress.cases.c1.notes === '孙大可疑'), 'the notes are in the save');
  await game(() => GameGlobal.egretGame.view.overlay.close());
  // The last case's verdict on the board.
  await game(() => {
    const { app, rules } = GameGlobal.egretGame;
    for (const id of ['c1', 'c2', 'c3', 'c4', 'c5']) rules.caseState(app.progress(), id).solved = true;
    rules.caseState(app.progress(), 'c6').sealed = ['names', 'p1', 'p2'];
    app.save();
    app.go('case', 'c6');
  });
  await until(() => GameGlobal.egretGame.view?.caseId === 'c6' && GameGlobal.egretGame.view.overlay?.kind === 'verdict');
  await page.waitForTimeout(1000);
  for (const [field, text] of [['chief', '陆承恩'], ['partner', '冯禄'], ['crimes', '伪造会子杀人']]) {
    const i = ['chief', 'partner', 'crimes'].indexOf(field);
    await tap(await middleOf(`egret.view.overlay.focus[${i}]`));
    for (const ch of text) await tap(await middleOf(`egret.view.overlay.focus.find((r) => r.tile?.text === ${JSON.stringify(ch)})`));
  }
  await page.waitForTimeout(500);
  await shot('verdict');
  check(await game(() => GameGlobal.egretGame.view.overlay.judge().ok), 'the verdict is written by tapping the board');
  await tap(await middleOf('egret.view.overlay.focus.at(-1)'));
  await screenIs('outro');
  check(await game(() => GameGlobal.egretGame.app.progress().cases.c6.solved), 'and handed in, which closes the last case');
  const state = await game(() => ({ elements: document.querySelectorAll('*').length - window.__baseline - 1, failed: window.__failed ?? null, errors: window.__errors ?? [] }));
  check(state.elements === 0, `no element added to the page (${state.elements})`);
  check(!state.failed && !state.errors.length, 'the game never stopped');
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
  await shot('stopped').catch(() => {});
} finally {
  await browser.close();
  server.close();
  report('InquestScrolls mini game in the WeChat stand-in (390 × 844, headless Chromium)', checks, problems.filter((p) => !/favicon|GPU stall/.test(p)));
}
