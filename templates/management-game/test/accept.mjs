import assert from 'node:assert/strict';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, serve } from '../../../tools/lib/browser.mjs';

const directory = fileURLToPath(new URL('..', import.meta.url));
const route = relative(ROOT, directory).split('\\').join('/');
const server = await serve();
const browser = await launch();
const pages = [];

async function open(options, lang) {
  const url = server.url + route + '/?seed=1&backend=webgl2&lang=' + lang;
  const page = await openPage(browser, url, options);
  pages.push(page);
  await page.locator('#village[data-state="select"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function snapshot(page, name) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const result = await matchBaseline(page, resolve(directory), name);
  assert.ok(result.passed || result.written, name + ' baseline differs');
}

try {
  const page = await open({ width: 960, height: 540, reducedMotion: true }, 'zh');
  const village = page.locator('#village');
  await snapshot(page, 'empty-bank');
  const willow = page.locator('[data-plot="willow"]');
  await willow.focus();
  await page.keyboard.press('Enter');
  assert.equal(await village.getAttribute('data-state'), 'preview');
  assert.equal(await page.locator('#timber').textContent(), '12');
  await page.keyboard.press('Escape');
  assert.equal(await village.getAttribute('data-state'), 'select');
  assert.ok(await willow.evaluate(node => node === document.activeElement));
  await page.locator('[data-plot="terrace"]').click();
  await page.keyboard.press('Space');
  await page.locator('#village[data-state="complete"]').waitFor();
  assert.equal(await page.locator('#timber').textContent(), '4');
  assert.equal(await page.locator('#people').textContent(), '2');
  await snapshot(page, 'settled-bank');
  await page.reload();
  await page.locator('#village[data-state="complete"]').waitFor();
  assert.match(await page.locator('#hint').textContent(), /台地/);
  await page.locator('#again').click();
  await page.locator('#cancel').click();
  assert.equal(await village.getAttribute('data-state'), 'complete');
  await page.locator('#again').click();
  await page.locator('#confirm').click();
  assert.equal(await village.getAttribute('data-state'), 'select');
  await page.locator('#sound').click();
  assert.equal(await page.locator('#sound').getAttribute('aria-pressed'), 'false');
  await page.locator('#language').click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');

  const phone = await open({ width: 320, height: 690, touch: true, reducedMotion: false }, 'en');
  const bank = await phone.locator('.world-window').boundingBox();
  const map = await phone.locator('.map').boundingBox();
  const inView = rect => rect.x >= bank.x && rect.y >= bank.y &&
    rect.x + rect.width <= bank.x + bank.width && rect.y + rect.height <= bank.y + bank.height;
  // Both ferry workers occupy this rectangle before the player places a cottage.
  const family = {
    x: map.x + 178 / 960 * map.width, y: map.y + 345 / 540 * map.height,
    width: 37 / 960 * map.width, height: 44 / 540 * map.height
  };
  assert.ok(inView(family), 'The waiting family fits within the narrow viewport');
  for (const site of await phone.locator('[data-plot]').all()) {
    const rect = await site.boundingBox();
    assert.ok(inView(rect), 'Each marked plot fits within the narrow viewport');
    assert.ok(rect.x + rect.width <= family.x || rect.x >= family.x + family.width ||
      rect.y + rect.height <= family.y || rect.y >= family.y + family.height,
      'No plot label obscures the waiting family');
  }
  await snapshot(phone, 'narrow-bank');
  await phone.locator('[data-plot="ford"]').tap();
  await phone.locator('#confirm').tap();
  await phone.locator('#village[data-state="raising"]').waitFor();
  await phone.locator('#village[data-state="complete"]').waitFor();
  assert.match(await phone.locator('#hint').textContent(), /Shallow ford/);
  assert.equal(await phone.locator('#people').textContent(), '2');
  await phone.locator('#again').tap();
  await phone.locator('#confirm').tap();
  await phone.locator('[data-plot="willow"]').tap();
  await phone.locator('#confirm').tap();
  await phone.locator('#village[data-state="raising"]').waitFor();
  await phone.reload();
  await phone.locator('#village[data-state="complete"]').waitFor();
  assert.match(await phone.locator('#hint').textContent(), /Willow/);
  assert.equal(await phone.locator('#timber').textContent(), '4');
  assert.deepEqual(pages.flatMap(p => p.problems), []);
  console.log('Browser acceptance passed for keyboard, pointer, portrait touch, preview cancellation, construction, save and reset.');
} finally {
  await browser.close();
  await server.close();
}
