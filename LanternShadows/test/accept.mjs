// Browser acceptance uses named engine UI rectangles and real browser input events.
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
const ready = page => wait(page, () => !!globalThis.__lantern?.ready && __lantern.ui.snapshot().screen === 'title');
const snapshot = page => page.evaluate(() => __lantern.ui.snapshot());
const state = page => page.evaluate(() => ({
  time: __lantern.act.time, x: __lantern.hero.x, y: __lantern.hero.y, vx: __lantern.hero.vx,
  solo: __lantern.act.solo, stage: __lantern.stage, playing: __lantern.playing,
}));
const replayFixtures = {
  'lantern-shadows-records': JSON.stringify({act1:{rank:'S',time:120,combo:22,noFalls:true}}),
  'lantern-shadows-trials': JSON.stringify({act2:{rank:'A',time:130,combo:16,noFalls:true}}),
};

// Named rectangles are in CSS pixels. Only these read-only helpers query the
// native view; all button, key and touch actions go through Chromium input.
const rect = (page, name) => page.evaluate(name => {
  try { return __lantern.ui.rect(name) ?? null; } catch { return null; }
}, name);
const waitRect = (page, name) => wait(page, name => {
  try {
    const r = __lantern.ui.rect(name);
    return !!r && r.width > 0 && r.height > 0;
  } catch { return false; }
}, name);
const hiddenRect = (page, name) => wait(page, name => {
  try {
    const r = __lantern.ui.rect(name);
    return !r || r.width <= 0 || r.height <= 0;
  } catch { return true; }
}, name);
async function pointOf(page, name) {
  await waitRect(page, name);
  const r = await rect(page, name);
  assert(r && r.width > 0 && r.height > 0, name + ' has a visible native control');
  const x = r.x + r.width / 2, y = r.y + r.height / 2;
  const viewport = page.viewportSize();
  assert(x >= 0 && y >= 0 && x <= viewport.width && y <= viewport.height,
    name + ' center is in the viewport: ' + JSON.stringify(r));
  return {x, y};
}
async function click(page, name) {
  const p = await pointOf(page, name);
  await page.mouse.click(p.x, p.y);
}
async function tap(page, name) {
  const p = await pointOf(page, name);
  await page.touchscreen.tap(p.x, p.y);
}
const uiNodes = (page, roles = ['button','group','text','heading','progressbar']) => page.evaluate(roles =>
  roles.flatMap(role => __lantern.ui.tester.findAll(role)), roles);
async function nodeOf(page, name, roles) {
  const nodes = await uiNodes(page, roles);
  const matches = nodes.filter(n => n.id === name || n.id.endsWith(':' + name));
  assert.equal(matches.length, 1, name + ' has one published semantic node: ' + JSON.stringify(matches));
  return matches[0];
}
const buttons = page => page.evaluate(() => __lantern.ui.buttons());
async function optionalControls(page) {
  if (!(await rect(page, 'stick'))) await click(page, 'screen-controls');
  await waitRect(page, 'stick');
}
async function waitPaused(page, paused) {
  await wait(page, paused => __lantern.paused === paused, paused);
  if (paused) await waitRect(page, 'paused');
  else await hiddenRect(page, 'paused');
}

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
  const opening = await snapshot(page);
  assert.equal(opening.screen, 'title');
  assert.equal(opening.ready, true);
  assert(!opening.error);
  assert(await rect(page, 'start'));
  assert.equal((await nodeOf(page, 'start', ['button'])).disabled, false);
  log('packed Egret WebGL2 opens a playable native title');
  const title = await matchBaseline(page, gameDir, 'title');
  checks.push([title.written || title.passed, 'English title screenshot (' + (title.share * 100).toFixed(2) + '% changed)']);

  await click(page, 'start');
  await wait(page, () => __lantern.playing && __lantern.act.time > 0.08);
  await page.keyboard.press('p');
  await waitPaused(page, true);
  assert.equal((await snapshot(page)).screen, 'play');
  await hiddenRect(page, 'start');
  // The beginning of the Southern Gate, stopped by the same pause control a player uses.
  const scene = await matchBaseline(page, gameDir, 'gate-paused', { limit: 0.04 });
  checks.push([scene.written || scene.passed, 'paused starting scene screenshot (' + (scene.share * 100).toFixed(2) + '% changed)']);
  await click(page, 'paused');
  await waitPaused(page, false);
  const start = await state(page);
  await page.keyboard.down('d');
  await wait(page, x => __lantern.hero.x > x + 22, start.x);
  await page.keyboard.press('p');
  await waitPaused(page, true);
  const stopped = await state(page);
  await page.waitForTimeout(350);
  assert.deepEqual(await state(page), stopped, 'Pause must freeze the act and movement even while D stays down');
  await page.keyboard.up('d');
  await page.keyboard.press('Escape');
  await waitPaused(page, false);
  await wait(page, t => __lantern.act.time > t + .25 && Math.abs(__lantern.hero.vx) < 1, stopped.time);
  assert(Math.abs((await state(page)).x - stopped.x) < 60, 'Only braking distance is allowed after resuming');
  log('keyboard movement, held key at pause, release and Escape resume');

  const beforeJump = await state(page);
  await page.keyboard.down('Space');
  await wait(page, y => __lantern.hero.y < y - 18, beforeJump.y);
  await page.keyboard.up('Space');
  await wait(page, () => __lantern.hero.grounded);
  log('Space jumps and releases back on the ground');

  // Accessibility labels now come from the engine's published semantic nodes.
  async function labels(lang, expected) {
    assert.equal(await page.evaluate(() => document.documentElement.lang), lang);
    assert.equal(await page.evaluate(() => document.querySelector('#stage')?.getAttribute('aria-label')),
      lang === 'zh-CN' ? '皮影戏台' : 'Shadow-puppet stage', 'Canvas accessible name follows the current language');
    for (const [name, label] of Object.entries(expected)) {
      const node = await nodeOf(page, name, ['button']);
      assert.match(node.name, label, name + ' accessible label');
    }
  }
  const english = {mute:/Effects/i, music:/Music/i, 'screen-controls':/On-screen/i, 'pause-play':/Pause/i, full:/Full screen/i};
  const chinese = {mute:/音效/, music:/配乐/, 'screen-controls':/屏幕/, 'pause-play':/暂停/, full:/全屏/};
  await labels('en', english);
  await click(page, 'lang');
  await wait(page, () => document.documentElement.lang === 'zh-CN');
  await labels('zh-CN', chinese);
  await click(page, 'lang');
  await wait(page, () => document.documentElement.lang === 'en');
  await labels('en', english);
  await optionalControls(page);
  const jump = (await uiNodes(page, ['group','button'])).filter(n => n.name === 'Jump');
  assert.equal(jump.length, 1, 'desktop optional controls publish one Jump');
  assert(await rect(page, 'jump'));
  log('English/Chinese accessibility labels switch and desktop optional controls contain one Jump');
}

async function keyboardTitle(page) {
  // The browser's actual Tab handling and semantic focus must agree. No tester
  // action is used to navigate or activate the title.
  const seen = new Set();
  let beginFocused = false;
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);
    const focused = (await uiNodes(page, ['button'])).filter(n => n.focused && !n.inert && !n.disabled);
    assert(focused.length <= 1, 'Only one title button has native focus');
    if (focused.length === 1) {
      seen.add(focused[0].name);
      if (focused[0].id === 'start' || focused[0].id.endsWith(':start')) {
        if (seen.size >= 2) { beginFocused = true; break; }
      }
    }
  }
  assert(beginFocused && seen.size >= 2, 'Tab cycles native title controls: ' + [...seen].join(', '));
  const activeDescendant = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const id = canvas?.getAttribute('aria-activedescendant');
    return id && document.getElementById(id)?.getAttribute('aria-label');
  });
  assert.equal(activeDescendant, 'Begin', 'Native keyboard focus is projected to the browser');
  await page.keyboard.press('Enter');
  await wait(page, () => __lantern.playing && __lantern.act.time > 0.08);
  log('Tab cycles real native title focus and Enter activates Begin; active descendant agrees');
}

async function narrowTouch(page) {
  // Match the actual Fold7 regression: the English title is already loaded in
  // landscape, then the viewport rotates before the user starts the game.
  await page.setViewportSize({width:844,height:390});
  await wait(page, () => matchMedia('(orientation: landscape)').matches);
  await page.setViewportSize({width:411,height:813});
  await wait(page, () => matchMedia('(orientation: portrait)').matches);
  await waitRect(page, 'start');
  const rotated = await page.evaluate(() => {
    const r = __lantern.ui.rect('start'), centerX=r.x+r.width/2, centerY=r.y+r.height/2;
    const hit = document.elementFromPoint(centerX,centerY);
    return {within:r.x>=0 && r.x+r.width<=innerWidth && r.y>=0 && r.y+r.height<=innerHeight,
      hit:hit instanceof HTMLCanvasElement, pageWidth:innerWidth, rect:[r.x,r.y,r.width,r.height]};
  });
  assert(rotated.within && rotated.hit, JSON.stringify(rotated));
  log('Landscape-to-portrait English title: actual native start bounds and canvas hit test stay inside the viewport (browser emulation)');
  await page.setViewportSize({width:390,height:844});
  await wait(page, () => innerWidth === 390 && innerHeight === 844);
  const titleActions = ['start','start-boss','start-act2','start-erlang','start-act3','start-laozi','trial-picker'];
  const targets = await Promise.all(titleActions.map(async name => {
    await waitRect(page, name);
    return {name, ...(await rect(page,name))};
  }));
  assert(targets.every(({width,height}) => width >= 44 && height >= 44), JSON.stringify(targets));
  await tap(page, 'start');
  await wait(page, () => __lantern.playing && __lantern.act.time > .05);
  await waitRect(page, 'stick');
  assert.equal((await uiNodes(page, ['group','button'])).filter(n => n.name === 'Jump').length, 1);
  const first = await state(page), r = await rect(page, 'stick');
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
  await tap(page, 'pause-play');
  await waitPaused(page, true);
  const paused = await state(page);
  await page.waitForTimeout(250);
  assert.deepEqual(await state(page), paused);
  await tap(page, 'paused');
  await waitPaused(page, false);
  await wait(page, t => __lantern.act.time > t + .1, paused.time);
  await cdp.detach();
  log('390×844 emulated touch: 44px title targets, single jump, out-of-stick tracking/cancel and pause/resume');
}

async function development(page) {
  assert.equal(await page.evaluate(() => __lantern.backend), 'webgl2');
  await waitRect(page, 'show-records');
  assert.match((await nodeOf(page, 'show-records', ['text','heading'])).name, /The Gate S · 3\/3/);
  await click(page, 'trial-picker');
  await waitRect(page, 'trial-act2');
  assert.match((await nodeOf(page, 'trial-act2', ['button'])).name, /The Orchard · A · 3\/3/);
  await click(page, 'trial-act2');
  await wait(page, () => __lantern.playing && __lantern.act.solo);
  assert.equal((await state(page)).stage, 'act2');
  await hiddenRect(page, 'hairs');
  await optionalControls(page);
  assert.equal((await buttons(page)).find(n => n.name === 'special')?.disabled, true, 'Staff trial disables Special input');
  await page.reload();
  await ready(page);
  await waitRect(page, 'show-records');
  assert.match((await nodeOf(page, 'show-records', ['text','heading'])).name, /The Gate S · 3\/3/);
  await click(page, 'trial-picker');
  await waitRect(page, 'trial-act2');
  assert.match((await nodeOf(page, 'trial-act2', ['button'])).name, /The Orchard · A · 3\/3/);
  const stored = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key,localStorage.getItem(key)])), Object.keys(replayFixtures));
  assert.deepEqual(stored, replayFixtures, 'Campaign and trial replay must not overwrite the saved record fixtures');
  // The native trial picker is modal; close it by Escape before starting a campaign.
  if (await rect(page, 'trial-act2')) {
    await page.keyboard.press('Escape');
    await hiddenRect(page, 'trial-act2');
  }
  await click(page, 'start');
  await wait(page, () => __lantern.playing && !__lantern.act.solo);
  await waitRect(page, 'hairs');
  await optionalControls(page);
  assert.equal((await buttons(page)).find(n => n.name === 'special')?.disabled, false, 'Campaign enables Special input');
  log('unbundled ?dev: separate campaign/trial record fixtures persist through replay selection and reload');
}

async function landscapeResultLayout(page) {
  await tap(page, 'start');
  await wait(page, () => __lantern.playing && __lantern.act.time > .05);
  // This is a layout fixture only. Supply a plausible completed-act record to exercise
  // the most crowded result screen (badges, trial, next, replay); it does not simulate a win.
  await page.evaluate(() => {
    __lantern.act.state = 'cleared';
    __lantern.act.result = {rank:'S',time:120,felled:12,best:22,wounds:0,falls:0};
  });
  // The regular language action rebuilds the result UI in English.
  await tap(page, 'lang');
  await wait(page, () => __lantern.ui.snapshot().screen === 'result');
  await hiddenRect(page, 'start');
  await waitRect(page, 'result');
  const names = ['result-title','rank','tally','replay','try-trial','again','next','playbill-back'];
  const fit = await page.evaluate(names => {
    const box = __lantern.ui.rect('result');
    return names.map(id => {
      const r = __lantern.ui.rect(id);
      return {id,inside:!!r && r.width > 0 && r.height > 0 &&
        r.y >= box.y - 1 && r.y+r.height <= box.y+box.height+1 &&
        r.x >= box.x - 1 && r.x+r.width <= box.x+box.width+1 &&
        r.y >= -1 && r.y+r.height <= innerHeight+1 && r.x >= -1 && r.x+r.width <= innerWidth+1};
    });
  }, names);
  assert(fit.every(item => item.inside), JSON.stringify(fit));
  assert.equal((await snapshot(page)).result.rank, 'S');
  log('844×390 emulated landscape: complete fixture result and replay/next controls fit the screen');
}

async function loadingFailure() {
  let faults = 0;
  // Deliver a broken response exactly once through Chromium's real request path;
  // the next navigation must fetch the intact game asset again.
  const page = await openPage(browser, url(''), {
    width:960,height:540,reducedMotion:true,
    before: page => page.route('**/assets/levels/act1.tmj', route => {
      if (faults++) return route.continue();
      return route.fulfill({status:200, contentType:'application/json',body:'!lantern-fault!'});
    }),
  });
  try {
    const reload = page.getByRole('button', {name:'Reload',exact:true});
    await reload.waitFor({state:'attached',timeout:45000});
    await page.getByText(/The booth could not be set up/).first().waitFor({state:'attached',timeout:45000});
    const r = await reload.boundingBox();
    assert(r && r.width > 0 && r.height > 0, 'Native error screen publishes Reload bounds');
    const x = r.x+r.width/2, y=r.y+r.height/2;
    assert(await page.evaluate(({x,y}) => document.elementFromPoint(x,y) instanceof HTMLCanvasElement,{x,y}),
      'The reload control is drawn on the engine canvas');
    const expected = page.problems.splice(0);
    assert(expected.some(message => message.includes('lantern-fault')), 'Observed real malformed asset error: '+expected.join('; '));
    for (const message of expected) if (!message.includes('lantern-fault')) problems.push(message);
    await page.mouse.click(x,y);
    await ready(page);
    assert.equal(faults,2,'Reload fetched the original level again');
    assert.equal((await snapshot(page)).error,'');
    await click(page,'start');
    await wait(page,()=>__lantern.playing && __lantern.act.time>.08);
    log('Malformed level load shows the native error and Reload; real click recovers playable data');
  } finally {
    problems.push(...page.problems);
    await page.context().close();
  }
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
    await inPage(url(''), {width:960,height:540,reducedMotion:true}, keyboardTitle);
    await inPage(url(''), {width:390,height:844,touch:true,reducedMotion:true}, narrowTouch);
    await inPage(url('&dev'), {width:960,height:540,reducedMotion:true,before:seedRecords}, development);
    await loadingFailure();
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
