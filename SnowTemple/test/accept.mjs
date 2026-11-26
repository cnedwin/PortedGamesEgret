// Browser acceptance: the real title and chapter opening, at a fixed seed and low settings.
// This is a short software-rendered smoke test, not a performance test or a full combat run.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, openPage, serve, matchBaseline, report } from '../../tools/lib/browser.mjs';
const gameDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gamePath = relative(ROOT, gameDir).split('\\').join('/');
const server = await serve();
const browser = await launch();
const checks = [];
const check = (okay, words) => checks.push([Boolean(okay), words]);
let page;

try {
  page = await openPage(browser, server.url + gamePath + '/?seed=7&quality=low&models=low', { width: 640, height: 360 });
  const wait = (condition, value, timeout) => page.waitForFunction(condition, value, { timeout, polling: 100 });
  await wait(() => {
    const app = window.__snow;
    const start = document.querySelector('#title [data-way="chapter"]');
    return app?.status.frames >= 2 && !app.status.error && start && !start.disabled &&
      getComputedStyle(document.querySelector('#boot')).opacity === '0';
  }, null, 30000);
  check(await page.locator('#title .name').isVisible() && await page.locator('#title [data-way="chapter"]').isVisible(),
    'title and its chapter entry are visible after loading');
  check(await page.locator('#title [data-way="chapter"]').isEnabled() &&
    await page.locator('#title [data-way="yard"]').isEnabled(), 'both title entries are enabled');
  check(await page.evaluate(() => {
    const gl = window.__snow.renderer.canvas.getContext('webgl2');
    return gl && !gl.isContextLost() && window.__snow.status.error === null;
  }), 'the actual WebGL2 context is alive');

  const title = await matchBaseline(page, gameDir, 'title');
  check(title.written || title.passed, 'title screenshot ' + (title.written ? 'recorded for review' : 'matches the reviewed baseline (' + (title.share * 100).toFixed(2) + '% differs)'));

  const frameBefore = await page.evaluate(() => window.__snow.status.frames);
  await page.locator('#title [data-way="chapter"]').click({ timeout: 12000 });
  await wait(() => document.querySelector('#title').classList.contains('gone') &&
    window.__snow.game.mode === 'chapter' && window.__snow.game.stage === 'road', null, 15000);
  check(await page.evaluate(() => {
    const { game } = window.__snow;
    return game.hero.hp > 0 && game.tier === 1 && game.stage === 'road' && game.mode === 'chapter';
  }), 'trusted chapter button enters the first-tier road with a living hero');
  await wait(before => window.__snow.status.frames > before && window.__snow.game.cine < 3.2 &&
    !window.__snow.status.error, frameBefore, 20000);
  check(true, 'the real opening state advances on the normal engine clock');
  check(await page.evaluate(() => !window.__snow.status.error &&
    document.querySelector('#error').hidden), 'no visible error screen after entering the chapter');
} catch (error) {
  check(false, 'the walk stopped: ' + error.message.split('\n')[0]);
} finally {
  const problems = page?.problems ?? [];
  await browser.close();
  await server.close();
  report('SnowTemple acceptance (headless Chromium, WebGL2 software rendering)', checks, problems);
}
