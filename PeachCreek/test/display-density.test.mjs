import test from 'node:test';
import assert from 'node:assert/strict';
import { uiRenderDensity, alignLabelPixels } from '../src/display-density.mjs';
test('desktop UI backs the fitted physical pixels, including higher DPI', () => {
  assert.equal(uiRenderDensity({ width: 1280, height: 800, dpr: 1 }), 4 / 3);
  assert.equal(uiRenderDensity({ width: 1280, height: 800, dpr: 2 }), 8 / 3);
});
test('touch initialization reserves the same density in both orientations', () => {
  const landscape = uiRenderDensity({ width: 844, height: 390, dpr: 3, coarse: true });
  const portrait = uiRenderDensity({ width: 390, height: 844, dpr: 3, coarse: true });
  assert.equal(landscape, portrait);
  assert.ok(Math.ceil(960 * portrait) >= Math.ceil(1280 * (390 / 720) * 3));
  assert.ok(Math.ceil(540 * portrait) >= 390 * 3);
});
test('touch reserves the panel beyond browser chrome without resizing the host', () => {
  const withChrome = uiRenderDensity({ width: 360, height: 710, dpr: 3, coarse: true, screenWidth: 390, screenHeight: 844 });
  assert.ok(Math.ceil(960 * withChrome) >= 2080);
});
test('display density is finite and high DPI remains bounded by the pixel budget', () => {
  for (const coarse of [false, true]) {
    const density = uiRenderDensity({ width: 7680, height: 4320, dpr: 4, coarse });
    assert.ok(Number.isFinite(density) && density >= 1);
    assert.ok(960 * 540 * density ** 2 <= (coarse ? 4_800_000 : 6_400_000) + 1);
  }
  assert.equal(uiRenderDensity({ width: 1280, height: 720, dpr: NaN }), 4 / 3);
});
test('custom label aligning does not alter its parent or size', () => {
  const parent = { x: 10, y: 20, globalToLocal(x,y) { return { x: x-this.x, y:y-this.y }; } };
  const label = { x: 3.5, y: 4.5, localToGlobal(x,y) { return { x: parent.x+this.x+x, y:parent.y+this.y+y }; } };
  alignLabelPixels(label, parent, { width: 960, height: 540 }, 4/3);
  const global = label.localToGlobal(0,0);
  assert.ok(Math.abs(global.x*4/3-Math.round(global.x*4/3)) < 1e-8);
  assert.ok(Math.abs(global.y*4/3-Math.round(global.y*4/3)) < 1e-8);
  assert.deepEqual([parent.x,parent.y],[10,20]);
});
