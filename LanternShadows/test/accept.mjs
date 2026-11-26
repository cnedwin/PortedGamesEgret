// Browser acceptance uses the normal buttons and browser input events.
// During play steps diagnostics are read only. Explicit save/result layout fixtures are not wins.
import assert from 'node:assert/strict';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve } from '../../tools/lib/browser.mjs';

const gameDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gamePath = relative(ROOT, gameDir).split('\\').join('/');
const server = await serve();
const checks = [], problems = [];
let browser;
const url = extra => server.url + gamePath + '/?seed=734&lang=en' + extra;
const log = description => checks.push([true, description]);
const wait = (page, predicate, arg) => page.waitForFunction(predicate, arg, { timeout: 45000, polling: 80 });
const ready = page => wait(page, () => !!globalThis.__lantern && !document.getElementById('start').disabled);
const state = page => page.evaluate(() => ({
  time: __lantern.act.time, x: __lantern.hero.x, y: __lantern.hero.y, vx: __lantern.hero.vx,
  solo: __lantern.act.solo, stage: __lantern.stage, playing: __lantern.playing,
}));
const replayFixtures = {
  'lantern-shadows-records': JSON.stringify({act1:{rank:'S',time:120,combo:22,noFalls:true}}),
  'lantern-shadows-trials': JSON.stringify({act2:{rank:'A',time:130,combo:16,noFalls:true}}),
};

async function inPage(address, options, run) {
  const page = await openPage(browser, address, options);
  try {
    await ready(page);
    await run(page);
  } finally {
    problems.push(...page.problems);
    await page.context().close();
  }
}

async function desktop(page) {
  assert.equal(await page.evaluate(() => __lantern.backend), 'webgl2');
  assert(await page.locator('#curtain').isVisible());
  assert(await page.locator('#filling').isHidden());
  log('packed Egret WebGL2 opens a playable title');
  const title = await matchBaseline(page, gameDir, 'title');
  checks.push([title.written || title.passed, `English title screenshot (${(title.share * 100).toFixed(2)}% changed)`]);

  await page.locator('#start').click();
  await wait(page, () => __lantern.playing && __lantern.act.time > 0.08);
  await page.keyboard.press('p');
  await page.locator('#paused').waitFor();
  await page.locator('#curtain').waitFor({ state: 'hidden' });
  // The beginning of the Southern Gate, stopped by the same pause control a player uses.
  const scene = await matchBaseline(page, gameDir, 'gate-paused', { limit: 0.04 });
  checks.push([scene.written || scene.passed, `paused starting scene screenshot (${(scene.share * 100).toFixed(2)}% changed)`]);
  await page.locator('#paused').click();
  const start = await state(page);
  await page.keyboard.down('d');
  await wait(page, x => __lantern.hero.x > x + 22, start.x);
  await page.keyboard.press('p');
  await page.locator('#paused').waitFor();
  const stopped = await state(page);
  await page.waitForTimeout(350);
  assert.deepEqual(await state(page), stopped, 'Pause must freeze the act and movement even while D stays down');
  await page.keyboard.up('d');
  await page.keyboard.press('Escape');
  await page.locator('#paused').waitFor({ state: 'hidden' });
  await wait(page, t => __lantern.act.time > t + .25 && Math.abs(__lantern.hero.vx) < 1, stopped.time);
  assert(Math.abs((await state(page)).x - stopped.x) < 60, 'Only braking distance is allowed after resuming');
  log('keyboard movement, held key at pause, release and Escape resume');

  const beforeJump = await state(page);
  await page.keyboard.down('Space');
  await wait(page, y => __lantern.hero.y < y - 18, beforeJump.y);
  await page.keyboard.up('Space');
  await wait(page, () => __lantern.hero.grounded);
  log('Space jumps and releases back on the ground');

  const labels = () => page.evaluate(() => ({
    lang: document.documentElement.lang,
    valid: [...document.querySelectorAll('[data-label-zh]')].every(node =>
      node.getAttribute('aria-label') === node.dataset[document.documentElement.lang === 'en' ? 'labelEn' : 'labelZh']),
  }));
  assert.deepEqual(await labels(), {lang:'en',valid:true});
  await page.locator('#lang').click();
  assert.deepEqual(await labels(), {lang:'zh-CN',valid:true});
  await page.locator('#lang').click();
  assert.deepEqual(await labels(), {lang:'en',valid:true});
  await page.locator('#screen-controls').click();
  assert(await page.locator('#move-stick').isVisible());
  assert.equal(await page.locator('[data-hold="jump"]').count(), 1);
  assert.equal(await page.locator('[data-hold="jump"]').innerText(), 'Jump');
  log('English/Chinese accessibility labels switch and desktop optional controls contain one Jump');
}

async function narrowTouch(page) {
  // Match the actual Fold7 regression: the English title is already loaded in
  // landscape, then the viewport rotates before the user starts the game.
  await page.setViewportSize({width:844,height:390});
  await wait(page, () => matchMedia('(orientation: landscape)').matches);
  await page.setViewportSize({width:411,height:813});
  await wait(page, () => matchMedia('(orientation: portrait)').matches);
  const rotated = await page.locator('#start').evaluate(node => {
    const r = node.getBoundingClientRect(), centerX=r.x+r.width/2, centerY=r.y+r.height/2;
    const hit = document.elementFromPoint(centerX,centerY);
    return {within:r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight, hit:node===hit || node.contains(hit), pageWidth:innerWidth, rect:[r.x,r.y,r.width,r.height]};
  });
  assert(rotated.within && rotated.hit, JSON.stringify(rotated));
  log('Landscape-to-portrait English title: actual start bounds and hit test stay inside the viewport (browser emulation)');
  await page.setViewportSize({width:390,height:844});
  const targets = await page.locator('#curtain button:visible, #trial-picker summary:visible').evaluateAll(nodes => nodes.map(node => {
    const {width,height} = node.getBoundingClientRect();
    return {name:node.textContent.trim(),width,height};
  }));
  assert(targets.length >= 7, 'Title shows the campaign, boss practices and staff trial picker');
  assert(targets.every(({width,height}) => width >= 44 && height >= 44), JSON.stringify(targets));
  await page.locator('#start').tap();
  await wait(page, () => __lantern.playing && __lantern.act.time > .05);
  await page.locator('#move-stick').waitFor();
  assert.equal(await page.locator('[data-hold="jump"]:visible').count(), 1);
  const first = await state(page), r = await page.locator('#move-stick').boundingBox();
  assert(r && r.width >= 44 && r.height >= 44, 'Touch stick fits');
  // Emulated browser touch through CDP, not a report of a physical phone.
  const cdp = await page.context().newCDPSession(page);
  const x = r.x + r.width / 2, y = r.y + r.height / 2;
  await cdp.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x,y,id:1}]});
  try {
    await cdp.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:x+r.width*.85,y,id:1}]});
    await wait(page, startX => __lantern.hero.x > startX + 18, first.x);
  } finally {
    await cdp.send('Input.dispatchTouchEvent', {type:'touchCancel',touchPoints:[]});
  }
  const cancelled = await state(page);
  await wait(page, t => __lantern.act.time > t+.25 && Math.abs(__lantern.hero.vx)<1, cancelled.time);
  assert(Math.abs((await state(page)).x - cancelled.x)<60, 'Cancelled touch does not keep driving');
  assert.equal(await page.evaluate(() => window.scrollY), 0);
  await page.locator('#pause-play').tap();
  await page.locator('#paused').waitFor();
  const paused = await state(page);
  await page.waitForTimeout(250);
  assert.deepEqual(await state(page), paused);
  await page.locator('#paused').tap();
  await wait(page, t => __lantern.act.time > t + .1, paused.time);
  await cdp.detach();
  log('390×844 emulated touch: 44px title targets, single jump, out-of-stick tracking/cancel and pause/resume');
}

async function development(page) {
  assert.equal(await page.evaluate(() => __lantern.backend), 'webgl2');
  assert(await page.locator('#show-records').isVisible());
  assert.match(await page.locator('#show-records').innerText(), /The Gate S · 3\/3/);
  await page.locator('#trial-picker summary').click();
  assert.match(await page.locator('#trial-act2').innerText(), /The Orchard · A · 3\/3/);
  await page.locator('#trial-act2').click();
  await wait(page, () => __lantern.playing && __lantern.act.solo);
  assert.equal((await state(page)).stage, 'act2');
  assert(await page.locator('#hairs').isHidden());
  assert(await page.locator('[data-hold="special"]').isDisabled());
  await page.reload();
  await ready(page);
  assert.match(await page.locator('#show-records').innerText(), /The Gate S · 3\/3/);
  await page.locator('#trial-picker summary').click();
  assert.match(await page.locator('#trial-act2').innerText(), /The Orchard · A · 3\/3/);
  const stored = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key,localStorage.getItem(key)])), Object.keys(replayFixtures));
  assert.deepEqual(stored, replayFixtures, 'Campaign and trial replay must not overwrite the saved record fixtures');
  await page.locator('#start').click();
  await wait(page, () => __lantern.playing && !__lantern.act.solo);
  assert(await page.locator('#hairs').isVisible());
  assert(await page.locator('[data-hold="special"]').isEnabled());
  log('unbundled ?dev: separate campaign/trial record fixtures persist through replay selection and reload');
}

async function landscapeResultLayout(page) {
  await page.locator('#start').tap();
  await wait(page, () => __lantern.playing && __lantern.act.time > .05);
  // This is a layout fixture only. Supply a plausible completed-act record to exercise
  // the most crowded result screen (badges, trial, next, replay); it does not simulate a win.
  await page.evaluate(() => {
    __lantern.act.state = 'cleared';
    __lantern.act.result = {rank:'S',time:120,felled:12,best:22,wounds:0,falls:0};
  });
  // The regular language action rebuilds the result UI in English.
  await page.locator('#lang').tap();
  await page.locator('#result').waitFor();
  await page.locator('#curtain').waitFor({ state:'hidden' });
  const fit = await page.evaluate(() => {
    const outer = document.querySelector('#result'), box = outer.getBoundingClientRect();
    return ['#result-title','#rank','#tally','#replay','#try-trial','#again','#next','#playbill-back'].map(id => {
      const node = document.querySelector(id), r = node.getBoundingClientRect();
      return {id,inside:r.width > 0 && r.height > 0 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1 && r.left >= box.left - 1 && r.right <= box.right + 1};
    });
  });
  assert(fit.every(item => item.inside), JSON.stringify(fit));
  log('844×390 emulated landscape: complete fixture result and replay/next controls fit the screen');
}

const seedRecords = page => page.addInitScript(fixtures => {
  if (sessionStorage.getItem('lantern-acceptance-seeded')) return;
  for (const [key,value] of Object.entries(fixtures)) localStorage.setItem(key,value);
  sessionStorage.setItem('lantern-acceptance-seeded','1');
}, replayFixtures);

try {
  browser = await launch();
  if (!process.argv.includes('--result-layout')) {
  await inPage(url(''), {
    width:960,height:540,reducedMotion:true,
    // Keep test-only visual randomness fixed; the playable game keeps its normal random source.
    before: page => page.addInitScript(() => {
      let seed = 734;
      Math.random = () => ((seed = Math.imul(1664525, seed) + 1013904223 | 0) >>> 0) / 4294967296;
    }),
  }, desktop);
  await inPage(url(''), {width:390,height:844,touch:true,reducedMotion:true}, narrowTouch);
  await inPage(url('&dev'), {
    width:960,height:540,reducedMotion:true,
    before: seedRecords,
  }, development);
  }
  await inPage(url('').replace('lang=en','lang=zh'), {
    width:844,height:390,touch:true,reducedMotion:true,before:seedRecords,
  }, landscapeResultLayout);
} catch(error) {
  checks.push([false, error.stack ?? String(error)]);
} finally {
  await browser?.close();
  await server.close();
}
report('Lantern Shadows browser acceptance (headless Chromium / SwiftShader; not hardware)', checks, problems);
