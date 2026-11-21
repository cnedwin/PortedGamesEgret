// 浏览器验收：在无头 Chromium 里打开游戏走一遍——标题和设置的截图基线、空格关声音、切英文、回车赴任；只用键盘
// 选一块空地、修一座民居、Esc 关单子；离开十小时再回来，看到收获清单；点开税银收进库；五个标签页都能打开；刷新后
// 县城还在；坏存档会重新开始并提示——最后断言没有控制台错误。
// `node test/accept.mjs` 跑一遍；`--update` 重写基线。
// Browser acceptance: opens the game in headless Chromium and walks it — the title and settings against their
// screenshot baselines, Space turning the sound off, English, Enter to take office; by keyboard alone a free plot
// chosen, a house built and the sheet closed with Escape; ten hours away and back, with the list of what came in; the
// taxes collected into the treasury; each of the five tabs opened; the county still there after a reload; a broken
// save started again with a notice — and finally that the console stayed clean.
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
const state = (page, fn) => page.evaluate(fn);
let page;
try {
  page = await openPage(browser, `${server.url}${path}/?seed=1&lang=zh&hour=10`, { width: 1280, height: 720 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await until(page, () => window.peach?.ready && window.peach.screen === 'title');
  await page.waitForTimeout(800);
  const title = await matchBaseline(page, GAME, 'title');
  check(title.written || title.passed, `title looks as its baseline (${(title.share * 100).toFixed(2)}% differs)`);
  check((await page.evaluate(() => document.activeElement?.id)) === 'startButton', 'the start button holds the focus on the title');

  // Settings: the first switch holds the focus; Space turns the sound off and it is saved.
  await page.click('#titleSettings');
  await page.waitForTimeout(300);
  const settings = await matchBaseline(page, GAME, 'settings');
  check(settings.written || settings.passed, `settings look as their baseline (${(settings.share * 100).toFixed(2)}% differs)`);
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  check((await state(page, () => JSON.parse(localStorage.getItem('peach-creek')).data.settings.sound)) === false, 'Space on the focused switch turns the sound off and saves it');
  await page.keyboard.press('Escape');
  check(await state(page, () => document.querySelector('#settings').hidden && document.activeElement?.id === 'titleSettings'), 'Escape closes the settings and gives the focus back');

  // English.
  await page.click('#languageButton');
  await page.waitForTimeout(200);
  check((await state(page, () => document.documentElement.lang)) === 'en', 'switching to English changes the page language');
  const names = await state(page, () => [...document.querySelectorAll('#title button, #tabs button')].map((b) => b.getAttribute('aria-label') || b.textContent).join('|'));
  check(/Take office/i.test(names) && !/[\u3400-\u9fff]/.test(names.replace('中文', '')), `buttons read in English: ${names}`);

  // Take office with Enter.
  await page.focus('#startButton');
  await page.keyboard.press('Enter');
  await until(page, () => window.peach.screen === 'play');
  check(await state(page, () => document.querySelector('#title').hidden && document.querySelectorAll('#hits button').length > 20), 'Enter takes office and the map has its buttons');
  check(await state(page, () => document.querySelectorAll('#hits button[aria-label*="Gatehouse"]').length === 4), 'all four gatehouses have map controls');

  const beforeDrag = await state(page, () => document.querySelector('#map').style.transform);
  await page.mouse.move(570, 360);
  await page.mouse.down();
  await page.mouse.move(430, 290, { steps: 9 });
  await page.mouse.up();
  check(await page.evaluate((before) => {
    const map = document.querySelector('#map').style.transform;
    return map !== before && map === document.querySelector('#mapTargets').style.transform && document.querySelector('#sheet').hidden;
  }, beforeDrag), 'drag moves art and hit targets without opening a building sheet');
  await page.click('#overview');

  // By keyboard alone: Tab to the first free plot, Enter, Enter on the first choice (a house).
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    await page.keyboard.press('Tab');
    found = await state(page, () => /Ward 1 2 · Empty/i.test(document.activeElement?.getAttribute('aria-label') ?? ''));
  }
  check(found, 'Tab reaches the first free plot in ward 1');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  check(await state(page, () => !document.querySelector('#sheet').hidden && document.activeElement?.classList.contains('choice')), 'Enter opens the plot sheet with the focus on the first choice');
  check(await state(page, () => document.querySelector('#sheetBody [data-kind="market"]')?.getAttribute('aria-disabled') !== 'true' &&
    [...document.querySelectorAll('#sheetBody .planScore')].length >= 3), 'the residential ward offers markets and shows site efficiency');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  check(await state(page, () => window.peach.app.state.works.some((w) => w.type === 'plot' && w.key === 1)), 'Enter on the first choice starts building a house');
  await page.keyboard.press('Escape');
  check(await state(page, () => document.querySelector('#sheet').hidden && /Ward 1 2/.test(document.activeElement?.getAttribute('aria-label') ?? '')), 'Escape closes the sheet and the focus returns to the plot');

  // Ten hours away: the list of what came in, and the work done.
  await state(page, () => window.peach.away(10 * 3600));
  await page.waitForTimeout(300);
  const away = await state(page, () => ({ shown: !document.querySelector('#away').hidden, lines: document.querySelector('#awayBody').children.length, built: window.peach.app.state.plots[1].level }));
  check(away.shown && away.lines >= 3, `coming back shows what came in (${away.lines} lines)`);
  check(away.built === 1, 'the house was finished while away');
  await page.keyboard.press('Enter');
  check(await state(page, () => document.querySelector('#away').hidden), 'Enter closes the welcome');

  // The taxes.
  const coin = await state(page, () => window.peach.app.state.res.coin);
  await page.click('#taxBubble');
  const after = await state(page, () => window.peach.app.state.res.coin);
  check(after > coin + 50, `collecting the taxes fills the treasury (${Math.round(coin)} → ${Math.round(after)})`);

  // Each tab opens its sheet.
  for (const tab of ['build', 'talent', 'affairs', 'defence']) {
    await page.click(`#tabs [data-tab="${tab}"]`);
    await page.waitForTimeout(150);
    check(await state(page, () => !document.querySelector('#sheet').hidden && document.querySelector('#sheetBody h2')?.textContent.length > 0), `the ${tab} tab opens its sheet`);
  }
  await page.click('#tabs [data-tab="city"]');

  // A controlled later-rank fixture exercises the garrison UI without waiting
  // through the multiplayer-hour economy. All orders use normal controls.
  await page.evaluate(() => {
    const s = window.peach.app.state;
    s.rank = 2;
    s.res.coin = 30000;
    s.res.wood = 3000;
    window.peach.tick();
  });
  await page.click('#tabs [data-tab="defence"]');
  const east = page.locator('.defenceSide').nth(1);
  await east.getByRole('button', { name: 'Deploy a squad' }).click();
  check(await state(page, () => window.peach.app.state.defence.troops.join(',') === '0,1,0,0'), 'one squad goes to the chosen side');
  await east.getByRole('button', { name: /Gatehouse/ }).click();
  await page.locator('#sheetBody .btn.primary').click();
  check(await state(page, () => window.peach.app.state.works.some((w) => w.type === 'tower' && w.key === 1)), 'only the selected gatehouse receives an upgrade order');
  await page.click('#tabs [data-tab="city"]');

  // A reload: the county is still there.
  const before = await state(page, () => JSON.stringify(window.peach.app.state.plots));
  await page.evaluate(() => dispatchEvent(new Event('pagehide')));
  await page.reload();
  await until(page, () => window.peach?.ready);
  check(/Back to Peach Creek|回到桃溪/.test(await state(page, () => document.querySelector('#startButton').textContent)), 'after a reload the title offers to go back');
  await page.click('#startButton');
  await page.waitForTimeout(300);
  check((await state(page, () => JSON.stringify(window.peach.app.state.plots))) === before, 'the county is the one left behind');
  check(await state(page, () => window.peach.app.state.defence.troops[1] === 1), 'the garrison layout survives reload');

  // A broken save: the game starts again and says so, without an error.
  // (Broken from a plain file of the same site, so the game's own save on leaving cannot write over it.)
  await page.goto(`${server.url}${path}/style.css`);
  await page.evaluate(() => localStorage.setItem('peach-creek', '{broken'));
  page.problems.length = 0;
  await page.goto(`${server.url}${path}/?seed=1&lang=zh&hour=10`);
  await until(page, () => window.peach?.ready);
  check(await state(page, () => !document.querySelector('#title .notice').hidden && window.peach.app.state === null), 'a broken save is started again, and the title says so');
  await page.setViewportSize({ width: 411, height: 813 });
  await until(page, () => getComputedStyle(document.querySelector('#rotateHint')).display !== 'none', 4);
  const portraitFits = await page.evaluate(() => {
    const frame = document.querySelector('#frame'),
      start = document.querySelector('#startButton'),
      rect = start.getBoundingClientRect();
    return frame.getBoundingClientRect().width === innerWidth && frame.scrollTop === 0 &&
      start.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  });
  check(portraitFits, 'a narrow portrait viewport retains its full frame and a tappable title');
  if (portraitFits) {
    await page.click('#startButton');
    await until(page, () => window.peach.screen === 'play', 4);
    await page.setViewportSize({ width: 844, height: 390 });
    await until(page, () => getComputedStyle(document.querySelector('#rotateHint')).display === 'none', 4);
    check(await state(page, () => window.peach.app.state.plots.length === 72), 'landscape resize keeps the county open');
  }
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
} finally {
  const problems = page?.problems ?? [];
  await browser.close();
  await server.close();
  report('PeachCreek acceptance (headless Chromium, SwiftShader)', checks, problems);
}
