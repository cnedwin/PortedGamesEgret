// A resumed journey has one extra button, which must fit the physical browser's short landscape window.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { titleVerticalLayout } = await import('../src/ui/screens.mjs');
const { CONTROL } = await import('../src/ui/kit.mjs');
const { planScreen } = await import('../vendor/engine/dist/web/screen.js');

function layout(width, height, buttons, best, insets) {
  const screen = planScreen({ box: { width, height }, design: { width: 1066, height: 600 }, fit: 'expand', insets });
  const footerHeight = 20;
  return { screen, footerHeight, layout: titleVerticalLayout(screen, { buttons, best, footerHeight }) };
}

function check({ screen, footerHeight, layout: l }) {
  const e = 1e-6;
  assert.ok(CONTROL * l.f * screen.scale >= 45 - e);
  assert.ok(l.y + e >= screen.safe.y);
  assert.ok(l.y + l.columnHeight * l.f + 8 * l.f <= l.footerY + e, 'reserve separate footer space');
  assert.ok(l.footerY + footerHeight * l.f <= screen.safe.y + screen.safe.height + e);
}

test('resumed Fold7 landscape title leaves Continue, Restart, Settings and the optional best record above the footer', () => {
  for (const best of [false, true]) {
    const result = layout(873, 325, 3, best);
    check(result);
    assert.ok(result.layout.heroScale < 1, 'compact the heading rather than the touch targets');
  }
});

test('fresh title and narrow portrait retain their original heading scale', () => {
  for (const result of [
    layout(873, 325, 2, false),
    layout(325, 873, 3, true),
    layout(852, 393, 2, false, { top: 0, left: 59, right: 59, bottom: 21 })
  ]) {
    check(result);
    assert.equal(result.layout.heroScale, 1);
  }
});
