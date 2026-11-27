// Browser input regression for the expanded sea and independently scaled HUD.
// This uses Chromium touch events and viewport changes; it is not a physical-phone test.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { launch, openPage, serve } from '../../tools/lib/browser.mjs';

const output = process.argv[2] ? resolve(process.argv[2]) : await mkdtemp(join(tmpdir(), 'nezha-hud-stick-'));
if (process.argv[2]) await mkdir(output, { recursive: true });
const server = await serve();
const browser = await launch();
const report = { input: 'Chromium CDP touch / mouse, simulated responsive viewport', checks: [], errors: [] };
let page, cdp;
const check = (name, value, data) => {
  report.checks.push({ name, passed: Boolean(value), data });
  assert(value, name);
};
const screen = name => page.waitForFunction(name => window.nezhaSea?.ready && window.nezhaSea.screen === name, name, { timeout: 30000 });
const state = (fn, arg) => page.evaluate(fn, arg);
const settle = () => state(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const axes = () => state(() => {
  const { active, vector } = window.nezhaSea.stick;
  return { active, x: vector.x, y: vector.y, scroll: [scrollX, scrollY] };
});
const touch = async (type, ...touchPoints) => {
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  await settle();
};
const rects = () => state(() => {
  const { game, hud, ui } = window.nezhaSea, canvas = game.canvas.getBoundingClientRect();
  const ground = document.querySelector('#ground').getBoundingClientRect();
  const stageToClient = r => ({
    x: canvas.left + r.x * canvas.width / game.screen.width,
    y: canvas.top + r.y * canvas.height / game.screen.height,
    width: r.width * canvas.width / game.screen.width,
    height: r.height * canvas.height / game.screen.height
  });
  const field = stageToClient({ ...game.toStage(0, 0), width: game.width, height: game.height });
  const safe = stageToClient({ ...game.toStage(game.safe.x, game.safe.y), width: game.safe.width, height: game.safe.height });
  const nodes = ui.tree.snapshot.nodes.filter(n => !n.inert && n.bounds?.width > 0 && n.bounds?.height > 0);
  const parts = Object.fromEntries(nodes.filter(n => /:(pause|wave|timer|hp|hpText|xp|level|pearls|tutorial|tutorialPaper)$/.test(n.id))
    .map(n => [n.id.split(':').at(-1), { ...stageToClient(n.bounds), word: n.name }]));
  const pauseNode = nodes.find(n => n.id.endsWith(':pause'));
  const excluded = pauseNode && (() => {
    const point = game.fromStage(pauseNode.bounds.x + pauseNode.bounds.width / 2, pauseNode.bounds.y + pauseNode.bounds.height / 2);
    return hud.exclude(point.x, point.y);
  })();
  return { viewport: [innerWidth, innerHeight], orientation: game.orientation, factor: game.uiScale,
    css: { x: canvas.left, y: canvas.top, width: canvas.width, height: canvas.height }, safe, field,
    art: { x: ground.left, y: ground.top, width: ground.width, height: ground.height }, parts, excluded,
    device: game.device, backend: game.browser.backend };
});
const center = r => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
const inside = (r, outer, margin = 1.5) => r.x >= outer.x - margin && r.y >= outer.y - margin
  && r.x + r.width <= outer.x + outer.width + margin && r.y + r.height <= outer.y + outer.height + margin;
const point = async part => state(part => {
  const { game, ui } = window.nezhaSea;
  const node = ui.tree.snapshot.nodes.find(n => !n.inert && n.id.endsWith(':' + part));
  if (!node) throw Error('No active control ' + part);
  const r = game.canvas.getBoundingClientRect();
  return { x: r.x + (node.bounds.x + node.bounds.width / 2) * r.width / game.screen.width,
    y: r.y + (node.bounds.y + node.bounds.height / 2) * r.height / game.screen.height };
}, part);
const tap = async part => { const p = await point(part); await page.touchscreen.tap(p.x, p.y); await settle(); };

function layout(name, g) {
  check(name + ': safe expanded canvas covers the viewport', Math.abs(g.css.width - g.viewport[0]) < 2 && Math.abs(g.css.height - g.viewport[1]) < 2, g);
  check(name + ': the 540×960 sea is centred and aligned with the art',
    Object.entries(g.field).every(([key, n]) => Math.abs(n - g.art[key]) < 2), { field: g.field, art: g.art });
  const pause = g.parts.pause;
  check(name + ': independent native pause target meets 44 CSS pixels and stays within safe area',
    pause && pause.width >= 43.5 && pause.height >= 43.5 && inside(pause, g.safe) && g.excluded, { pause, safe: g.safe, excluded: g.excluded });
  check(name + ': HUD controls stay inside the safe area',
    ['wave', 'timer', 'hp', 'hpText', 'xp', 'level', 'pearls'].every(n => g.parts[n] && inside(g.parts[n], g.safe)), g.parts);
}

try {
  page = await openPage(browser, server.url + 'NezhaSea/?seed=11&lang=en', { width: 873, height: 325, touch: true, scale: 1 });
  cdp = await page.context().newCDPSession(page);
  await screen('title');
  await tap('start');
  await screen('play');
  await settle();
  const landscape = await rects();
  layout('landscape', landscape);
  assert.equal(landscape.orientation, 'landscape');
  await page.screenshot({ path: resolve(output, 'landscape-play.png') });
  const f = landscape.field;
  const margin = { id: 8, x: (landscape.safe.x + f.x) / 2, y: f.y + 0.5 * f.height };
  check('landscape offers a real expanded-side margin', margin.x >= 0 && margin.x < f.x - 5, { margin, field: f });
  await touch('touchStart', margin);
  check('a fresh touch outside the original sea cannot acquire steering', !(await axes()).active, await axes());
  await touch('touchEnd');
  const owner = { id: 1, ...center(f) }, second = { id: 2, x: f.x + f.width * 0.3, y: f.y + f.height * 0.7 };
  await touch('touchStart', owner);
  const held = await axes();
  check('a real arbitrary field touch owns the floating stick', held.active && held.x === 0 && held.y === 0, held);
  await touch('touchMove', { ...owner, x: owner.x + 4 });
  check('the native five CSS pixel dead zone is preserved', Math.abs((await axes()).x) < 0.001);
  await touch('touchMove', { ...owner, x: owner.x + 18 });
  const gentle = await axes();
  // At this narrow battlefield the old CSS reach is clamped to 36 pixels.
  check('a short gesture remains proportional at the same CSS reach', gentle.x > 0.3 && gentle.x < 0.5, gentle);
  const outside = { ...owner, x: Math.min(landscape.viewport[0] - 2, f.x + f.width + 80) };
  await touch('touchStart', { ...owner, x: owner.x + 18 }, second);
  await touch('touchMove', outside, { ...second, y: second.y - 20 });
  const steered = await axes();
  check('the owning finger continues outside the sea even with a second contact', steered.active && steered.x > .95 && steered.scroll.every(n => n === 0), steered);
  await touch('touchEnd', outside);
  const released = await axes();
  check('owner release cannot hand the stick to the second contact', !released.active && released.x === 0 && released.y === 0, released);
  await touch('touchEnd');
  // A second finger presses the real pause control while steering remains
  // physically held. Retiring that owner must not revive it after resume.
  await touch('touchStart', owner);
  await touch('touchMove', outside);
  const pauseFinger = { id: 9, ...center(landscape.parts.pause) };
  await touch('touchStart', outside, pauseFinger);
  await touch('touchEnd', pauseFinger);
  await screen('menu');
  const paused = await axes();
  check('a second finger can pause through the actual native button and retire the owner', !paused.active && paused.x === 0, paused);
  await page.screenshot({ path: resolve(output, 'landscape-paused.png') });
  const resumeFinger = { id: 10, ...await point('resume') };
  await touch('touchStart', outside, resumeFinger);
  await touch('touchEnd', resumeFinger);
  await screen('play');
  await settle();
  await touch('touchMove', { ...outside, y: outside.y + 8 });
  check('resuming with an old contact cannot reactivate steering', !(await axes()).active, await axes());
  await touch('touchEnd');
  await touch('touchStart', owner);
  await touch('touchMove', outside);
  check('a fresh contact can steer again after resuming', (await axes()).active);
  // A real browser resize during an owned contact exercises the engine's
  // resize notification and touch retirement (not physical device rotation).
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => window.nezhaSea.game.orientation === 'portrait' && !window.nezhaSea.stick.active);
  await touch('touchEnd');
  await settle();
  const portrait = await rects();
  layout('portrait', portrait);
  assert.equal(portrait.orientation, 'portrait');
  await page.screenshot({ path: resolve(output, 'portrait-play.png') });
  const p = { id: 4, ...center(portrait.field) };
  await touch('touchStart', p);
  await touch('touchMove', { ...p, x: p.x + 40 });
  await touch('touchCancel');
  const cancelled = await axes();
  check('portrait cancellation clears the fresh owner', !cancelled.active && cancelled.x === 0 && cancelled.y === 0, cancelled);
  // Mouse input goes through the engine browser's client/stage conversion and
  // remains available in the same embedded canvas, independently of touch.
  const mouse = center(portrait.field);
  await page.mouse.move(mouse.x, mouse.y);
  await page.mouse.down();
  await page.mouse.move(mouse.x + 35, mouse.y);
  await settle();
  check('real browser mouse drag steers the field in portrait', (await axes()).active && (await axes()).x > .25, await axes());
  await page.mouse.up();
  await settle();
  check('mouse release clears steering', !(await axes()).active && (await axes()).x === 0);
  await tap('pause');
  await screen('menu');
  await tap('resume');
  await screen('play');
  check('portrait pause and resume use actual visible controls', !(await axes()).active);
  report.landscape = landscape; report.portrait = portrait;
  report.errors = page.problems;
  check('no browser console, page or HTTP errors', !report.errors.length, report.errors);
  report.passing = true;
} catch (error) {
  report.failure = String(error.stack ?? error);
  report.errors = page?.problems ?? [];
  await page?.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
} finally {
  if (cdp) await cdp.detach().catch(() => {});
  if (page) await page.context().close();
  await browser.close();
  server.close();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ passing: report.passing ?? false, checks: report.checks.length, errors: report.errors, failure: report.failure, output }));
if (!report.passing) process.exitCode = 1;
