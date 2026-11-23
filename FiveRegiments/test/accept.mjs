// 浏览器验收：在无头 Chromium 里走一遍——卷首、选营（键盘切换）、配技能、阵前、开打、让替身打完、结算、回卷首；
// 再直接进一场以一敌二打完；设置里关血雾并存档；切英文；全程不许有控制台错误或缺文件；最后卷首、选营和一场对决
// 与截图基线比对。`node test/accept.mjs` 跑一遍（软件渲染，画面慢，但流程完整），`--update` 重写基线。
// Browser acceptance in headless Chromium: the title, choosing a regiment with the keys, fitting skills, the card
// before the fight, the fight played out by a stand-in, the result, back to the title; then a one-against-two fight
// straight from the address, played out; turning blood off in settings and keeping it; switching to English; and no
// console error or missing file anywhere; then the title, the choice and a duel against their screenshot baselines.
// `node test/accept.mjs` runs it (software rendering: slow, but complete); `--update` writes the baselines again.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve, until } from '../../tools/lib/browser.mjs';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  path = relative(ROOT, GAME).split('\\').join('/');
const server = await serve(),
  browser = await launch(),
  checks = [],
  check = (ok, words) => checks.push([Boolean(ok), words]);
const mode = (page) => page.evaluate(() => window.egretGame?.mode);
const text = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent ?? '', sel);
let page;
try {
  page = await openPage(browser, `${server.url}${path}/?seed=3&lang=zh&quality=low`, { width: 1024, height: 600 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await until(page, () => window.egretGame?.mode === 'title' && document.querySelector('.page.title'), 120);
  check((await text(page, '.page.title h1')) === '五营争锋', 'the title is up, in Chinese');

  // The road: choose with the keys, fit, go.
  await page.click('[data-act=road]');
  await until(page, () => document.querySelector('.page.choose'));
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  check((await text(page, '.regiment h3')) === '虎步', 'the right arrow turns to the Tiger Step');
  await page.keyboard.press('Enter');
  await until(page, () => document.querySelector('.page.loadout'));
  check((await page.evaluate(() => document.querySelectorAll('.loadout .skills .card.on').length)) === 2, 'two skills are taken by default');
  await page.click('.loadout .talents .card:not(.on)');
  check((await page.evaluate(() => document.querySelectorAll('.loadout .talents .card.on').length)) === 4, 'taking another talent keeps four');
  await page.keyboard.press('Enter');
  await until(page, () => document.querySelector('.page.card-stage'));
  check(/县城校场/.test(await text(page, '.card-stage h2')), 'the first fight is on the county drill ground');
  await page.keyboard.press('Enter');
  await until(page, () => window.egretGame.mode === 'fight', 180);
  const men = await page.evaluate(() => window.egretGame.game.men.map((m) => m.regiment));
  check(men[0] === 'tiger' && men.length === 2, `the fight is on: ${men.join(' against ')}`);
  check(await page.evaluate(() => !document.querySelector('.hud').hidden && document.querySelectorAll('.hud-skill').length >= 4), 'the HUD shows the two skills, the kick and the step');
  const over = await page.evaluate(() => window.egretGame.run(240));
  check(over === 'won' || over === 'lost', `a stand-in plays it out: ${over}`);
  await until(page, () => window.egretGame.mode === 'result' && document.querySelector('.page.result'), 60);
  const head = await text(page, '.page.result h2');
  check(head === '胜' || head === '败', `the result reads ${head}`);
  await page.click('.page.result [data-act=title]');
  await until(page, () => window.egretGame.mode === 'title' && document.querySelector('.page.title'), 120);
  check(true, 'back to the title');

  // Settings: blood off, kept in the save.
  await page.click('[data-act=settings]');
  await until(page, () => document.querySelector('.page.settings'));
  await page.click('[data-arg="blood:false"]');
  await page.waitForTimeout(200);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('five-regiments')).data.settings.blood);
  check(saved === false, 'blood off is kept in the save');
  await page.keyboard.press('Escape');

  // English.
  await until(page, () => document.querySelector('.page.title'));
  await page.click('.page.title [data-act=lang]');
  await page.waitForTimeout(300);
  check((await text(page, '.page.title h1')) === 'Five Regiments' && (await page.evaluate(() => document.documentElement.lang)) === 'en', 'switching to English redraws the title');

  // Two at once, straight from the address.
  await page.goto(`${server.url}${path}/?seed=5&lang=zh&quality=low&duel=vanguard,plume,archer&place=palace`);
  await until(page, () => window.egretGame?.mode === 'fight', 180);
  check((await page.evaluate(() => document.querySelectorAll('.hud-foe').length)) === 2, 'two foes along the top');
  const two = await page.evaluate(() => window.egretGame.run(300));
  check(two === 'won' || two === 'lost', `one against two plays out: ${two}`);
  await until(page, () => window.egretGame.mode === 'result', 60);
  check(true, 'and ends on a result');

  // Baselines. With `?fixed` every frame drawn is one tick of the world, so waiting for a count of frames fixes the
  // picture (to a tick or two). `--update` writes them again.
  const frames = async (n) => {
    const from = await page.evaluate(() => window.egretGame.status.frames);
    await page.waitForFunction((at) => window.egretGame.status.frames >= at, from + n, { timeout: 240000, polling: 50 });
  };
  const looks = async (name, words) => {
    const seen = await matchBaseline(page, GAME, name);
    check(seen.written || seen.passed, `${words} (${seen.written ? 'baseline written' : `${(seen.share * 100).toFixed(2)}% differs`})`);
  };
  await page.goto(`${server.url}${path}/?seed=3&lang=zh&quality=low&fixed`);
  await until(page, () => window.egretGame?.mode === 'title' && document.querySelector('.page.title'), 120);
  await frames(40);
  await looks('title', 'the title and the five on the drill ground look as their baseline');
  await page.click('[data-act=road]');
  await until(page, () => document.querySelector('.page.choose'));
  await frames(60);
  await looks('choose', 'choosing a regiment looks as its baseline');
  await page.goto(`${server.url}${path}/?seed=4&lang=zh&quality=low&fixed&auto&duel=plume,vanguard&place=bamboo`);
  await until(page, () => window.egretGame?.mode === 'fight', 180);
  await page.addStyleTag({ content: '.hud-banner { display: none !important; }' });
  await frames(150);
  await looks('fight', 'a duel on the bamboo path looks as its baseline');
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
} finally {
  const problems = page?.problems ?? [];
  await browser.close();
  await server.close();
  report('FiveRegiments acceptance (headless Chromium, SwiftShader)', checks, problems);
}
