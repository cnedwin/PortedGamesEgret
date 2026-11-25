// 浏览器验收：在无头 Chromium 里走一遍——标题（背景是一盘静止的棋盘）、遭遇战准备（键盘选战场和指挥官）、出阵、
// 选单位移动后待命、在兵营招募、结束回合让电脑走完一回合、读档接着打、设置里关音乐、切英文、坏档重来；全程不许有
// 控制台错误或缺文件；标题、准备和开局三张画面与截图基线比对。`node test/accept.mjs` 跑一遍（软件渲染，画面慢，但
// 流程完整），`--update` 重写基线。
// Browser acceptance in headless Chromium: the title (a still board behind it), skirmish preparation (battlefield and
// commanders chosen with the keys), the start, a unit moved and told to wait, a recruit at the barracks, the turn
// ended and the computer's turn played, the battle resumed from the save, music turned off in settings, English, a
// broken save started again; no console error or missing file anywhere; the title, the preparation and the opening
// against their screenshot baselines. `node test/accept.mjs` runs it (software rendering: slow, but complete);
// `--update` writes the baselines again.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve, until } from '../../tools/lib/browser.mjs';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  path = relative(ROOT, GAME).split('\\').join('/');
const server = await serve(),
  browser = await launch(),
  checks = [],
  started = Date.now(),
  check = (ok, words) => {
    checks.push([Boolean(ok), words]);
    // Progress as it goes (software rendering is slow), on stderr so the report stays clean.
    process.stderr.write(`${((Date.now() - started) / 1000).toFixed(0)}s ${ok ? 'ok' : 'not ok'} - ${words}\n`);
  };
const text = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent ?? '', sel);
const battle = (page, fn, arg) => page.evaluate(fn, arg);
let page;
try {
  page = await openPage(browser, `${server.url}${path}/?seed=3&lang=zh&quality=low&map=wheat`, { width: 1024, height: 600 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await until(page, () => window.egretGame?.ready && document.querySelector('.title-screen'), 180);
  check((await text(page, '.logo h1')) === '星旗战记', 'the title is up, in Chinese');
  await page.waitForTimeout(1500);
  const title = await matchBaseline(page, GAME, 'title', { limit: 0.03 });
  check(title.written || title.passed, `the title looks as its baseline (${(title.share * 100).toFixed(2)}% differs)`);

  // Preparation: the arrows move between the choices, Enter takes one.
  await page.click('.title-menu .btn.primary');
  await until(page, () => document.querySelector('.setup-screen'));
  check((await page.evaluate(() => document.querySelectorAll('.map-card').length)) === 3, 'three battlefields to choose from');
  await page.focus('.map-card[data-id=coves]');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  check((await page.evaluate(() => document.querySelector('.map-card.on')?.dataset.id)) === 'wheat', 'the left arrow and Enter choose Wheatwater Ford');
  await page.click('.commanders >> nth=1 >> .cmd[data-id=vireta]');
  check((await page.evaluate(() => document.querySelectorAll('.commanders')[1].querySelector('.cmd.on')?.dataset.id)) === 'vireta', 'the opponent is Vireta');
  await page.waitForTimeout(500);
  const setup = await matchBaseline(page, GAME, 'setup', { limit: 0.03 });
  check(setup.written || setup.passed, `the preparation looks as its baseline (${(setup.share * 100).toFixed(2)}% differs)`);

  // The battle.
  await page.click('.setup-go .btn.primary');
  await until(page, () => window.egretGame.screen === 'battle' && window.egretGame.battle?.mode === 'idle', 240);
  const start = await battle(page, () => {
    const g = window.egretGame.battle.game;
    return { turn: g.turn, current: g.current, gold: g.players[0].gold, units: g.units.filter((u) => u.owner === 0).length };
  });
  check(start.turn === 1 && start.current === 0 && start.gold === 200, `the battle begins on turn 1 with 200 gold (${JSON.stringify(start)})`);
  check(await page.evaluate(() => document.querySelectorAll('.cmd-card').length === 2 && !!document.querySelector('.turn-chip') && !!document.querySelector('.tile-card')), 'the commanders, the turn and the terrain card are shown');
  const opening = await matchBaseline(page, GAME, 'opening', { limit: 0.04 });
  check(opening.written || opening.passed, `the opening looks as its baseline (${(opening.share * 100).toFixed(2)}% differs)`);

  // A swordsman moves two tiles up and waits.
  const sw = await battle(page, () => window.egretGame.battle.game.units.find((u) => u.owner === 0 && u.type === 'swordsman'));
  await battle(page, ({ x, y }) => window.egretGame.battle.cursorTo(x, y), sw);
  await page.keyboard.press('Enter');
  await until(page, () => window.egretGame.battle.mode === 'move');
  await battle(page, ({ x, y }) => window.egretGame.battle.cursorTo(x, y - 2), sw);
  await page.keyboard.press('Enter');
  await until(page, () => document.querySelector('.menu'), 30);
  const items = await page.evaluate(() => [...document.querySelectorAll('.menu-item .l')].map((e) => e.textContent));
  check(items.includes('待命') && items.includes('取消'), `the action menu offers ${items.join('、')}`);
  await page.keyboard.press('Enter');
  await until(page, () => window.egretGame.battle.mode === 'idle', 30);
  const moved = await battle(page, (id) => window.egretGame.battle.game.units.find((u) => u.id === id), sw.id);
  check(moved.y === sw.y - 2 && moved.done, `the swordsman moved two tiles and waits (${sw.x},${sw.y} → ${moved.x},${moved.y})`);

  // Recruit at the barracks.
  const barracks = await battle(page, () => window.egretGame.battle.game.buildings.find((b) => b.owner === 0 && b.kind === 'barracks'));
  await battle(page, ({ x, y }) => window.egretGame.battle.cursorTo(x, y), barracks);
  await page.keyboard.press('Enter');
  await until(page, () => document.querySelector('.menu'), 30);
  const names = await page.evaluate(() => [...document.querySelectorAll('.menu-item .l')].map((e) => e.textContent));
  check(names[0] === '剑士' && names.includes('巨人'), `the barracks list the ground troops, cheapest first (${names.slice(0, 4).join('、')}…)`);
  await page.keyboard.press('Enter');
  await until(page, () => window.egretGame.battle.mode === 'idle', 60);
  const after = await battle(page, () => ({ gold: window.egretGame.battle.game.players[0].gold, n: window.egretGame.battle.game.units.filter((u) => u.owner === 0).length }));
  check(after.gold === 100 && after.n === start.units + 1, `a swordsman is recruited for 100 gold (${JSON.stringify(after)})`);

  // End the turn: the computer plays its side and the turn comes back.
  await page.evaluate(() => {
    window.egretGame.app.settings.speed = 12;
    window.egretGame.app.reducedMotion = true;
  });
  await page.keyboard.press('KeyF');
  await until(page, () => window.egretGame.battle.game.turn === 2 && window.egretGame.battle.mode === 'idle', 300);
  const two = await battle(page, () => ({ turn: window.egretGame.battle.game.turn, foe: window.egretGame.battle.game.units.filter((u) => u.owner === 1).length }));
  check(two.turn === 2, `the computer played its turn and it is turn 2 (enemy units: ${two.foe})`);

  // The save: back to the title and resume.
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('star-banner')).data.battle?.game?.turn);
  check(kept === 2, `the battle is kept in the save at turn ${kept}`);
  await page.reload();
  await until(page, () => window.egretGame?.ready && document.querySelector('.title-screen'), 180);
  check((await text(page, '.title-menu .btn.primary')) === '继续上一局', 'the title offers to resume');
  await page.click('.title-menu .btn.primary');
  await until(page, () => window.egretGame.screen === 'battle' && window.egretGame.battle?.mode === 'idle', 240);
  check((await battle(page, () => window.egretGame.battle.game.turn)) === 2, 'the battle resumes on turn 2');

  // Settings from the battle menu: music off, kept.
  await page.evaluate(() => void window.egretGame.app.overlay('settings'));
  await until(page, () => document.querySelector('.settings'));
  await page.click('.settings .row:nth-child(2) .toggle');
  check((await page.evaluate(() => JSON.parse(localStorage.getItem('star-banner')).data.settings.music)) === false, 'music turned off and kept');
  await page.click('.settings .foot .btn.quiet');
  check((await page.evaluate(() => document.documentElement.lang)) === 'en', 'the language switch turns the page to English');
  const labels = await page.evaluate(() => [...document.querySelectorAll('.hud-btn')].map((b) => b.getAttribute('aria-label')).join('|'));
  check(/End turn/.test(labels), `the battle buttons read in English: ${labels}`);
  await page.click('.settings .foot .btn.primary');

  // A broken save: the game starts again and says so, without an error.
  await page.evaluate(() => localStorage.setItem('star-banner', '{broken'));
  page.problems.length = 0;
  await page.reload();
  await until(page, () => window.egretGame?.ready && document.querySelector('.title-screen'), 180);
  check(await page.evaluate(() => !!document.querySelector('.title-screen .notice')), 'a broken save is started again, and the title says so');
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
} finally {
  const problems = page?.problems ?? [];
  await browser.close();
  await server.close();
  report('StarBanner acceptance (headless Chromium, SwiftShader)', checks, problems);
}
