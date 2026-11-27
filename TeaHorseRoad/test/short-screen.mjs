// Targeted regression for the physical 873 x 325 browser viewport and the narrow non-touch PC window.
// The saved-title cases use separate test saves; the subtitle case uses an existing road line as a UI fixture.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { launch, openPage, serve } from '../../tools/lib/browser.mjs';
import { checkpoint, tapControl, waitFor } from './play.mjs';

const output = resolve(process.argv[2] ?? 'qa-short-screen');
await mkdir(output);
const server = await serve(), browser = await launch(), report = {
  environment: 'Headless Chromium / SwiftShader; simulated touch and screen sizes, isolated UI fixtures',
  checkpoints: {}, errors: [], pass: false
};
const url = server.url + 'TeaHorseRoad/?quality=low&quiet';
const saved = { version: 1, data: { journey: { station: 1, cargo: [24, 23, 22], stolen: 3, recovered: 0, knocked: 2,
  seconds: 100, startedAt: Date.now() }, camps: {}, best: null, seenIntro: true,
  settings: { quality: 'low', volume: 80, music: true, touch: 'auto', camera: 'chase' } } };
const best = { delivered: 67, seconds: 512, stolen: 5, recovered: 0, knocked: 3 };
const noInsets = { top: 0, right: 0, bottom: 0, left: 0 };
let touchPage, pcPage;
function player(page) {
  return {
    page, read: (fn, arg) => page.evaluate(fn, arg), wait: seconds => page.waitForTimeout(seconds * 1000),
    expect: (condition, description) => assert.ok(condition, description),
    picture: name => page.screenshot({ path: join(output, name + '.png') })
  };
}
async function ready(p) {
  await waitFor(p, () => window.teaHorseRoad?.state === 'title' && document.querySelector('#loading').classList.contains('gone'), undefined, 'title ready');
}
async function record(p, name) {
  report.checkpoints[name] = await checkpoint(p, name);
}
async function resize(p, viewport, insets = noInsets) {
  const revision = await p.read(() => window.teaHorseRoad.ui.semantics.snapshot.revision);
  await p.read(insets => { window.__egretAgent = { insets }; }, insets);
  await p.page.setViewportSize(viewport);
  await waitFor(p, ({ viewport, insets, revision }) => {
    const { ui } = window.teaHorseRoad, s = ui.game.screen, r = ui.overlay.canvas.getBoundingClientRect();
    const sx = r.width / s.width, sy = r.height / s.height;
    return ui.semantics.snapshot.revision > revision && Math.abs(r.width - viewport.width) < 2 &&
      Math.abs(r.height - viewport.height) < 2 && Math.abs(s.safe.x * sx - insets.left) < 1.5 &&
      Math.abs(s.safe.y * sy - insets.top) < 1.5 &&
      ui.semantics.snapshot.nodes.filter(n => !n.hidden && !n.inert && !n.disabled && ['button','slider','switch','radio'].includes(n.role)).every(n => {
        const b = n.bounds, p = ui.projection.elementOf(n.id)?.getBoundingClientRect();
        return p && b.width * sx >= 43.9 && b.height * sy >= 43.9 &&
          Math.abs(p.y - (r.y + b.y * sy)) < 1.25 && Math.abs(p.height - b.height * sy) < 1.25 &&
          b.x >= s.safe.x - 1 / sx && b.y >= s.safe.y - 1 / sy &&
          b.x + b.width <= s.safe.x + s.safe.width + 1 / sx && b.y + b.height <= s.safe.y + s.safe.height + 1 / sy;
      });
  }, { viewport, insets, revision }, 'naturally republished screen geometry', 30000);
}
async function portraitUnderlying(p, name) {
  // The portrait-phone rotate prompt is part of the product. Check it first; then only hide its visual layer
  // temporarily for a diagnostic view of the still-live underlying UI.
  assert.equal(await p.read(() => getComputedStyle(document.querySelector('#rotate')).display !== 'none'), true);
  await p.picture(name + '-prompt');
  await p.read(() => { document.querySelector('#rotate').style.display = 'none'; });
  try { await record(p, name); }
  finally { await p.read(() => { document.querySelector('#rotate').style.display = ''; }); }
}
try {
  touchPage = await openPage(browser, url, { width: 873, height: 325, touch: true,
    before: async page => {
      await page.addInitScript(({ saved, insets }) => {
        window.__egretAgent = { insets };
        if (!localStorage.getItem('tea-horse-road')) localStorage.setItem('tea-horse-road', JSON.stringify(saved));
      }, { saved, insets: noInsets });
    }
  });
  const p = player(touchPage);
  await ready(p);
  assert.equal(await p.read(() => window.teaHorseRoad.save.data.journey.station), 1);
  assert.equal(await p.read(() => window.teaHorseRoad.save.data.best), null);
  await record(p, 'continued-short-no-best');
  assert.equal(report.checkpoints['continued-short-no-best'].controls.length, 3);
  await tapControl(p, '设置');
  await waitFor(p, () => window.teaHorseRoad.ui.semantics.snapshot.nodes.some(n => !n.hidden && !n.inert && n.name === '好'), undefined, 'settings card');
  await record(p, 'settings-short');
  const minimum = Math.min(...report.checkpoints['settings-short'].controls.map(n => Math.min(n.width, n.height)));
  assert.ok(minimum >= 44, 'strict physical minimum: ' + minimum);
  await p.read(() => { const g = window.teaHorseRoad; window.__shortScreenRef = { card: g.card, overlay: g.ui.overlay, game: g.ui.game }; });
  await resize(p, { width: 325, height: 873 });
  await portraitUnderlying(p, 'settings-portrait');
  await resize(p, { width: 852, height: 393 }, { top: 0, right: 59, bottom: 21, left: 59 });
  await record(p, 'settings-normal-notch');
  assert.equal(await p.read(() => {
    const g = window.teaHorseRoad, ref = window.__shortScreenRef;
    return g.card === ref.card && g.ui.overlay === ref.overlay && g.ui.game === ref.game;
  }), true);
  await tapControl(p, '好');
  await waitFor(p, () => !window.teaHorseRoad.card, undefined, 'settings closes');
  await p.read(best => {
    const key = 'tea-horse-road', doc = JSON.parse(localStorage.getItem(key));
    doc.data.best = best;
    localStorage.setItem(key, JSON.stringify(doc));
  }, best);
  await p.page.setViewportSize({ width: 873, height: 325 });
  await p.page.reload();
  await ready(p);
  assert.equal(await p.read(() => window.teaHorseRoad.save.data.best.delivered), 67);
  await record(p, 'continued-short-with-best');
  assert.equal(report.checkpoints['continued-short-with-best'].controls.length, 3);
  await resize(p, { width: 325, height: 873 });
  await portraitUnderlying(p, 'continued-portrait-with-best');
  await resize(p, { width: 852, height: 393 }, { top: 0, right: 59, bottom: 21, left: 59 });
  await record(p, 'continued-normal-with-best');

  pcPage = await openPage(browser, url, { width: 393, height: 852, touch: false });
  const pc = player(pcPage);
  await ready(pc);
  await tapControl(pc, '出发 新的旅程');
  await waitFor(pc, () => window.teaHorseRoad.state === 'drive' && window.teaHorseRoad.hud(), undefined, 'driving HUD');
  await pc.read(async () => {
    const { ROAD_LINES } = await import('/TeaHorseRoad/src/play/story.mjs');
    await window.teaHorseRoad.hud().say(ROAD_LINES[0], 60);
  });
  await pc.wait(.6);
  await record(pc, 'driving-pc-portrait');
  report.subtitle = await pc.read(async () => {
    const { semanticBoundsOf } = await import('@egret/engine/ui/semantics');
    const { root } = window.teaHorseRoad.hud();
    // A non-touch HUD has the route, cargo, pause, dial, subtitle and hint containers, in that order.
    const dial = semanticBoundsOf(root.getChildAt(3)), subtitle = semanticBoundsOf(root.getChildAt(4));
    const alpha = root.getChildAt(4).alpha;
    return { dial, subtitle, alpha, gap: dial.y - (subtitle.y + subtitle.height) };
  });
  assert.ok(report.subtitle.alpha > 0.5 && report.subtitle.gap > 0, JSON.stringify(report.subtitle));
  report.errors = [...touchPage.problems, ...pcPage.problems];
  assert.deepEqual(report.errors, []);
  report.pass = true;
} catch (cause) {
  report.failure = String(cause.stack ?? cause);
  throw cause;
} finally {
  if (touchPage) report.touchErrors = touchPage.problems;
  if (pcPage) report.pcErrors = pcPage.problems;
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  await server.close();
}
