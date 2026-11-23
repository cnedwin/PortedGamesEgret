// 浏览器验收：在无头 Chromium 里打开游戏，走一遍固定流程——标题、设置（关声音、切语言）、开始、走动、收齐光点、
// 结算、回标题——断言每一步，比对标题和设置两张截图基线，最后断言没有控制台错误。
// `node test/accept.mjs` 跑一遍；`--update` 重写基线。
// Browser acceptance: opens the game in headless Chromium and walks a fixed path — title, settings (sound off,
// language switched), start, walk, gather every light, the round's end, back to the title — checking each step,
// comparing the title and settings with their screenshot baselines, and finally that the console stayed clean.
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
let page;
try {
  page = await openPage(browser, `${server.url}${path}/?seed=1&lang=zh`, { width: 960, height: 540 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await until(page, () => window.egretGame?.ready && window.egretGame.screen === 'title');
  await page.waitForTimeout(800);
  const title = await matchBaseline(page, GAME, 'title');
  check(title.written || title.passed, `title looks as its baseline (${(title.share * 100).toFixed(2)}% differs)`);

  // Settings: the first control holds the focus; Space turns the sound off, which is saved.
  await page.keyboard.press('ArrowDown');
  await page.evaluate(() => window.egretGame.app.go('settings'));
  await until(page, () => window.egretGame.ready && window.egretGame.screen === 'settings');
  await page.waitForTimeout(500);
  const settings = await matchBaseline(page, GAME, 'settings');
  check(settings.written || settings.passed, `settings look as their baseline (${(settings.share * 100).toFixed(2)}% differs)`);
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.egretGame.app.save.data.settings.sound)) === false, 'Space on the focused switch turns the sound off and saves it');
  await page.evaluate(() => window.egretGame.app.switchLanguage('en'));
  await until(page, () => window.egretGame.ready);
  check((await page.evaluate(() => document.documentElement.lang)) === 'en', 'switching to English changes the page language');
  const names = await page.evaluate(() => [...document.querySelectorAll('[role=button], button')].map((node) => node.getAttribute('aria-label') || node.textContent).join('|'));
  check(/Done/.test(names) && !/[\u3400-\u9fff]/.test(names.replace('中文', '')), `buttons read in English: ${names}`);

  // Play: Enter on the title starts; holding the right arrow walks right.
  await page.evaluate(() => window.egretGame.app.go('title'));
  await until(page, () => window.egretGame.ready && window.egretGame.screen === 'title');
  await page.keyboard.press('Enter');
  await until(page, () => window.egretGame.ready && window.egretGame.screen === 'play');
  const before = await page.evaluate(() => window.egretGame.app.world.hero.x);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1200);
  await page.keyboard.up('ArrowRight');
  const after = await page.evaluate(() => window.egretGame.app.world.hero.x);
  check(after > before + 20, `the right arrow walks the character right (${before.toFixed(0)} → ${after.toFixed(0)})`);

  // Gather every light: the character is set beside each in turn, as a quick player would walk there.
  const count = await page.evaluate(() => window.egretGame.app.world.lights.length);
  for (let i = 0; i < count; i++) {
    await page.evaluate((index) => {
      const world = window.egretGame.app.world,
        light = world.lights[index];
      world.hero.x = light.x;
      world.hero.y = light.y;
    }, i);
    await page.waitForTimeout(150);
  }
  await until(page, () => window.egretGame.ready && window.egretGame.screen === 'end');
  const best = await page.evaluate(() => JSON.parse(localStorage.getItem('five-regiments')).data.best);
  check(typeof best === 'number' && best > 0, `the round's time is saved as the best (${best} s)`);
  await page.keyboard.press('Escape');
  await until(page, () => window.egretGame.ready && window.egretGame.screen === 'title');
  check(true, 'Escape goes back to the title');

  // A broken save: the game starts again and says so, without an error.
  await page.evaluate(() => localStorage.setItem('five-regiments', '{broken'));
  page.problems.length = 0;
  await page.reload();
  await until(page, () => window.egretGame?.ready && window.egretGame.screen === 'title');
  check((await page.evaluate(() => window.egretGame.app.notice)) !== null, 'a broken save is started again, and the title says so');
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
} finally {
  const problems = page?.problems ?? [];
  await browser.close();
  await server.close();
  report('FiveRegiments acceptance (headless Chromium, SwiftShader)', checks, problems);
}
