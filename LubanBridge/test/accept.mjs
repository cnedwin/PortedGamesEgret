// 浏览器验收：在无头 Chromium 里打开游戏，走一遍——标题、设置（关声音、切英文）、选关、进第一关、用鼠标一根根
// 搭出参考解、撤销重做、右键拆一根、按 T 试通、过桥拿到三枚印章、回车进下一关、竖屏、坏档——断言每一步，
// 比对标题和工地两张截图基线，最后断言控制台干净。`node test/accept.mjs` 跑一遍；`--update` 重写基线。
// Browser acceptance: opens the game in headless Chromium and walks it — the title, settings (sound off, English),
// the levels, the first level, its reference laid member by member with the mouse, undo and redo, a right click
// taking one down, T to test, across with three seals, Enter on to the next level, a tall screen, a broken save —
// checking each step, comparing the title and the site with their baselines, and that the console stayed clean.
// `node test/accept.mjs` runs it; `--update` writes the baselines again.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve, until } from '../../tools/lib/browser.mjs';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  path = relative(ROOT, GAME).split('\\').join('/');
const server = await serve(),
  browser = await launch(),
  checks = [],
  check = (ok, words) => checks.push([Boolean(ok), words]);
let page, tall;
try {
  page = await openPage(browser, `${server.url}${path}/?seed=1&lang=zh&tips=0`, { width: 1280, height: 720 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await until(page, () => window.egretGame?.ready && window.egretGame.screen === 'title');
  await page.waitForTimeout(800);
  const title = await matchBaseline(page, GAME, 'title');
  check(title.written || title.passed, `title looks as its baseline (${(title.share * 100).toFixed(2)}% differs)`);
  const names = () => page.evaluate(() => [...document.querySelectorAll('[role=button], button')].map((n) => n.getAttribute('aria-label') || n.textContent).join('|'));
  check(/开工/.test(await names()) && /选关/.test(await names()), 'the title offers Begin and Levels to a screen reader');

  // Settings: the sound switch, by keyboard, is saved; English turns the page and the buttons English.
  await page.evaluate(() => window.egretGame.app.overlay('settings'));
  await until(page, () => window.egretGame.overlay === 'settings');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.egretGame.app.settings().sound)) === false, 'the focused sound switch turns off with Enter, and is saved');
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.egretGame.app.setLanguage('en'));
  await until(page, () => window.egretGame?.ready && !window.egretGame.busy);
  await page.waitForTimeout(300);
  check((await page.evaluate(() => document.documentElement.lang)) === 'en' && /Levels/.test(await names()), 'English changes the page language and the buttons');
  await page.evaluate(() => window.egretGame.app.setLanguage('zh'));
  await until(page, () => window.egretGame?.ready && !window.egretGame.busy);

  // The levels: the first open, the second not yet.
  await page.evaluate(() => window.egretGame.app.go('levels'));
  await until(page, () => window.egretGame?.ready && !window.egretGame.busy && window.egretGame.screen === 'levels');
  const levelNames = await names();
  check(/1-1 小河/.test(levelNames) && /1-2 石塘 · 未解锁/.test(levelNames), 'the first level is open and the second locked');

  // The first level: its reference laid with the mouse, one drag a member, the material chosen by number key.
  await page.evaluate(() => window.egretGame.app.go('build', '1-1'));
  await until(page, () => window.egretGame?.ready && !window.egretGame.busy && window.egretGame.screen === 'build');
  await page.waitForTimeout(500);
  const plan = await page.evaluate(() => {
    const v = window.egretGame.view;
    return { materials: v.level.materials, members: v.level.reference.members.map((m) => ({ m, a: v.pagePoint(m[0], m[1]), b: v.pagePoint(m[2], m[3]) })) };
  });
  for (const { m, a, b } of plan.members) {
    await page.keyboard.press(`Digit${plan.materials.indexOf(m[4]) + 1}`);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 6, a.y + ((b.y - a.y) * i) / 6);
    await page.mouse.up();
    await page.waitForTimeout(120);
  }
  const laid = await page.evaluate(() => window.egretGame.view.design.members.length);
  check(laid === plan.members.length, `the mouse lays the reference member by member (${laid} of ${plan.members.length})`);
  await page.keyboard.press('z');
  await page.waitForTimeout(250);
  const undone = await page.evaluate(() => window.egretGame.view.design.members.length);
  await page.keyboard.press('y');
  await page.waitForTimeout(250);
  const redone = await page.evaluate(() => window.egretGame.view.design.members.length);
  check(undone === laid - 1 && redone === laid, `Z undoes and Y does again (${laid} → ${undone} → ${redone})`);
  const mid = await page.evaluate(() => {
    const v = window.egretGame.view,
      m = v.design.members[0],
      a = v.pagePoint(m[0], m[1]),
      b = v.pagePoint(m[2], m[3]);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  });
  await page.mouse.click(mid.x, mid.y, { button: 'right' });
  await page.waitForTimeout(200);
  check((await page.evaluate(() => window.egretGame.view.design.members.length)) === laid - 1, 'a right click takes a member down');
  await page.keyboard.press('z');
  await page.mouse.move(5, 5);
  await page.waitForTimeout(500);
  const site = await matchBaseline(page, GAME, 'site');
  check(site.written || site.passed, `the site looks as its baseline (${(site.share * 100).toFixed(2)}% differs)`);
  check((await page.evaluate(() => JSON.parse(localStorage.getItem('luban-bridge')).data.designs['1-1'].members.length)) === laid, 'the drawing is kept in the save');

  // T sends the carts across; the result gives three seals, and they are saved.
  await page.keyboard.press('t');
  await until(page, () => window.egretGame.view?.running);
  check(true, 'T starts a test crossing');
  await until(page, () => window.egretGame.overlay === 'result', 120);
  const rec = await page.evaluate(() => window.egretGame.app.data().progress['1-1']);
  check(rec?.passed && rec.seals.pass && rec.seals.thrift && rec.seals.intact, `across, with all three seals (${JSON.stringify(rec?.seals)})`);
  await page.keyboard.press('Enter');
  await until(page, () => window.egretGame?.ready && !window.egretGame.busy && window.egretGame.screen === 'build' && window.egretGame.view.level.id === '1-2');
  check(true, 'Enter on the result goes on to the next level');

  // A level's failing bridge: a bare deck on 1-2 drops the carts in the river.
  await page.evaluate(() => {
    const app = window.egretGame.app;
    app.update((d) => (d.designs['1-2'] = { members: [[0, 0, 5, 0, 'plank'], [5, 0, 10, 0, 'plank'], [10, 0, 15, 0, 'plank'], [15, 0, 16, 0, 'plank']], pontoons: [], piers: [] }));
    return app.go('build', '1-2');
  });
  await until(page, () => window.egretGame?.ready && !window.egretGame.busy && window.egretGame.screen === 'build');
  await page.evaluate(() => window.egretGame.view.startTest());
  await until(page, () => window.egretGame.overlay === 'result', 120);
  check((await page.evaluate(() => window.egretGame.app.data().progress['1-2']?.passed)) !== true, 'a bare deck fails and the level stays unpassed');

  // A tall screen: the site laid out for it, without errors.
  tall = await openPage(browser, `${server.url}${path}/?seed=1&lang=zh&tips=0&level=2-3&ref=1&all=1`, { width: 720, height: 1280 });
  await until(tall, () => window.egretGame?.ready && window.egretGame.screen === 'build');
  await tall.waitForTimeout(600);
  const tallSite = await matchBaseline(tall, GAME, 'site-tall');
  check(tallSite.written || tallSite.passed, `the tall site looks as its baseline (${(tallSite.share * 100).toFixed(2)}% differs)`);

  // A broken save: the game starts again and says so, without an error.
  await page.evaluate(() => localStorage.setItem('luban-bridge', '{broken'));
  page.problems.length = 0;
  await page.goto(`${server.url}${path}/?seed=1&lang=zh`);
  await until(page, () => window.egretGame?.ready && window.egretGame.screen === 'title');
  check((await page.evaluate(() => window.egretGame.app.notice === null && window.egretGame.problems.length > 0)) === true, 'a broken save is started again, and the title says so');
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
} finally {
  const problems = [...(page?.problems ?? []), ...(tall?.problems ?? [])];
  await browser.close();
  await server.close();
  report('LubanBridge acceptance (headless Chromium, SwiftShader)', checks, problems);
}
