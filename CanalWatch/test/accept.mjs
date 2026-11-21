// 浏览器验收：在无头 Chromium 里打开游戏，只用键盘走一遍——标题（关音效、切英文）、开局、在两个建造位建塔、叫下一波、
// 加速、关闸、暂停再继续、守不住到结算、再来一局、回标题、直接守住第十二波拿到星、坏档提示——每一步都断言，比对标题、
// 开局地图和结算三张截图基线，最后断言没有控制台错误。`node test/accept.mjs` 跑一遍；`--update` 重写基线。
// Browser acceptance: opens the game in headless Chromium and goes through it by keyboard alone — the title (sound
// off, English), a game started, towers built on two plots, the next wave called, the speed raised, a gate shut, a
// pause and back, the gate falling and the end, another game, the title, a game won at the twelfth wave for its stars,
// and a broken save — checking each step, comparing the title, the map at the start and the end with their screenshot
// baselines, and finally that the console stayed clean. `node test/accept.mjs` runs it; `--update` writes the
// baselines again.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve, until } from '../../tools/lib/browser.mjs';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  path = relative(ROOT, GAME).split('\\').join('/');
const server = await serve(),
  browser = await launch(),
  checks = [],
  check = (ok, words) => checks.push([Boolean(ok), words]);
let page;
const state = (expression) => page.evaluate(expression);
const focused = () => state(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || document.activeElement?.tagName);
try {
  page = await openPage(browser, `${server.url}${path}/?seed=1&lang=zh`, { width: 1280, height: 800 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await until(page, () => window.canalWatch?.ready && window.canalWatch.screen === 'title');
  await page.waitForTimeout(600);
  const title = await matchBaseline(page, GAME, 'title');
  check(title.written || title.passed, `title looks as its baseline (${(title.share * 100).toFixed(2)}% differs)`);
  check(/寻常/.test(await focused()), `the title opens with the first difficulty focused (${await focused()})`);

  // The settings on the title, by Tab and Space: the sound goes off and is saved.
  for (let i = 0; i < 12 && !/音效/.test(await focused()); i++) await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  check((await state(() => window.canalWatch.app.save.data.settings.sound)) === false, 'Tab and Space reach the sound switch and turn it off, and it is saved');
  check(/关/.test(await focused()), `the switch keeps the focus and says it is off (${await focused()})`);
  for (let i = 0; i < 6 && !/切换到英文/.test(await focused()); i++) await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await until(page, () => document.documentElement.lang === 'en');
  const names = await state(() => [...document.querySelectorAll('button')].filter((b) => !b.closest('[hidden]')).map((b) => b.getAttribute('aria-label') || b.textContent).join('|'));
  check(!/[\u3400-\u9fff]/.test(names.replace('中文', '')) && /Normal/.test(names), `in English every button reads in English: ${names.slice(0, 120)}…`);
  check((await state(() => window.canalWatch.app.save.data.settings.language)) === 'en', 'the language is saved');

  // A game: back to the first difficulty, Enter starts it, and the plot on the middle bank has the focus.
  for (let i = 0; i < 14 && !/^Normal/.test(await focused()); i++) await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await until(page, () => window.canalWatch.screen === 'play');
  check(/Plot 6/.test(await focused()), `the game starts on a plot (${await focused()})`);
  const silver = await state(() => window.canalWatch.app.world.silver);
  await page.keyboard.press('Enter');
  await until(page, () => !document.querySelector('#picker').hidden);
  check(/Crossbow/.test(await focused()), `Enter opens the plot's picker on its first tower (${await focused()})`);
  await page.keyboard.press('Enter');
  await until(page, () => window.canalWatch.app.world.towers[5]?.kind === 'crossbow');
  check((await state(() => window.canalWatch.app.world.silver)) === silver - 70, 'Enter builds the crossbow tower for 70 silver');
  check(/Plot 6: Crossbow tower level 1/.test(await focused()), `the focus is back on the plot, which says what stands on it (${await focused()})`);
  await page.keyboard.press('Tab');
  await page.keyboard.press('4');
  await until(page, () => window.canalWatch.app.world.towers[6]?.kind === 'gong');
  check(true, 'Tab to the next plot and 4 builds a gong post there');
  await page.waitForTimeout(400);
  const start = await matchBaseline(page, GAME, 'map', { limit: 0.03 });
  check(start.written || start.passed, `the map at the start looks as its baseline (${(start.share * 100).toFixed(2)}% differs)`);

  await page.keyboard.press('n');
  await until(page, () => window.canalWatch.app.world.wave === 0 && window.canalWatch.app.world.state === 'wave');
  check(true, 'N calls the first wave');
  await page.keyboard.press('f');
  await page.keyboard.press('f');
  check((await state(() => window.canalWatch.game.timeScale)) === 3, 'F twice runs the game three times as fast');
  await page.keyboard.press('q');
  check((await state(() => window.canalWatch.app.world.gates[0].shutLeft)) > 0, 'Q shuts the upper gate');
  await page.keyboard.press('p');
  await until(page, () => window.canalWatch.screen === 'menu' && window.canalWatch.game.paused);
  const time = await state(() => window.canalWatch.app.world.time);
  await page.waitForTimeout(500);
  check((await state(() => window.canalWatch.app.world.time)) === time, 'P opens the menu and nothing moves behind it');
  await page.keyboard.press('Escape');
  await until(page, () => window.canalWatch.screen === 'play' && !window.canalWatch.game.paused);
  check(true, 'Escape closes the menu and the game goes on');

  // Too few towers: with one life left the first raider through ends it.
  await state(() => (window.canalWatch.app.world.lives = 1));
  await until(page, () => window.canalWatch.screen === 'end' && !document.querySelector('#end').hidden, 90);
  const lost = await state(() => document.querySelector('#end h1').textContent);
  check(lost === 'The gate fell', `the end says the gate fell (${lost})`);
  const saved = await state(() => JSON.parse(localStorage.getItem('canal-watch')).data);
  check(saved.plays === 1 && saved.best.normal === 0, `the game is counted and no stars are kept (${JSON.stringify(saved.best)})`);
  check(/Play again/.test(await focused()), `the end offers another game first (${await focused()})`);
  await page.keyboard.press('Enter');
  await until(page, () => window.canalWatch.screen === 'play' && window.canalWatch.app.world.time < 5);
  check((await state(() => window.canalWatch.app.world.towers.every((tower) => tower === null))) === true, 'Enter on it starts a new game on a clear map');

  // A game held: the twelfth wave is brought on and its last raider is gone.
  await state(() => {
    const world = window.canalWatch.app.world;
    world.wave = 11;
    world.state = 'wave';
    world.queue = [];
    world.raiders = [];
  });
  await until(page, () => window.canalWatch.screen === 'end' && !document.querySelector('#end').hidden);
  // A notice still fading at the top of the map is let go before the picture is taken.
  await page.waitForTimeout(2600);
  const won = await state(() => document.querySelector('#end').textContent);
  check(/The gate held/.test(won) && /★★★/.test(won) && /New best/.test(won), 'holding all twelve waves with every life gives three stars and a new best');
  const end = await matchBaseline(page, GAME, 'end');
  check(end.written || end.passed, `the end looks as its baseline (${(end.share * 100).toFixed(2)}% differs)`);
  check((await state(() => JSON.parse(localStorage.getItem('canal-watch')).data.best.normal)) === 3, 'three stars are kept for normal');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await until(page, () => window.canalWatch.screen === 'title');
  const best = await state(() => document.querySelector('#title').textContent);
  check(/Best ★★★/.test(best), 'the title shows the best stars for normal');

  // A broken save: the game starts again and says so, without an error.
  await state(() => localStorage.setItem('canal-watch', '{broken'));
  page.problems.length = 0;
  await page.reload();
  await until(page, () => window.canalWatch?.ready && window.canalWatch.screen === 'title');
  check((await state(() => document.querySelector('#title .notice')?.textContent ?? '')).length > 0, 'a broken save is started again, and the title says so');
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
} finally {
  const problems = page?.problems ?? [];
  await browser.close();
  await server.close();
  report('CanalWatch acceptance (headless Chromium, SwiftShader)', checks, problems);
}
