import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardLayout, displayPixelRatio, handSlots, STAGE, PORTRAIT } from '../src/layout.mjs';
import { CELL } from '../src/tiles.mjs';

test('native design uses table units without the old three-quarter intermediary', () => {
  assert.deepEqual(STAGE, { width: 1280, height: 720 });
  assert.deepEqual(PORTRAIT, { width: 720, height: 1280 });
  assert.equal(displayPixelRatio(1, 1), 1);
  assert.equal(displayPixelRatio(1.5, 1), 1.5);
  assert.equal(displayPixelRatio(.5, 2.625), 1.3125);
  assert.equal(displayPixelRatio(.7, 3), 1.5);
  assert.equal(displayPixelRatio(.5, 2.625, true), 1);
});

test('phone portrait turns only the table while an upright tablet has room above and below', () => {
  const safe = { x: 0, y: 0, width: 720, height: 1280 };
  const phone = boardLayout({ safe, orientation: 'portrait', screenScale: .55, tablet: false });
  const tablet = boardLayout({ safe, orientation: 'portrait', screenScale: 1.06, tablet: true });
  assert.equal(phone.rotation, 90);
  assert.equal(phone.x, 720);
  assert.equal(phone.y, 0);
  assert.equal(tablet.rotation, 0);
  assert.ok(tablet.y > 300);
  assert.ok(tablet.y + 720 * tablet.scale < 1000);
  assert.ok(tablet.x >= 0 && tablet.x + 1280 * tablet.scale <= 720);
});

test('expanded landscape allocates the hand from safe table space without overlapping targets', () => {
  const layout = boardLayout({ safe: { x: -300, y: 0, width: 1880, height: 720 }, orientation: 'landscape', screenScale: .46, tablet: false });
  const slots = handSlots(17, true, layout.hand);
  assert.equal(slots.length, 17);
  assert.ok(slots.every(slot => slot.hitW * layout.hand.cssUnit >= 44 - .01));
  for (let i = 1; i < slots.length; i++) assert.ok(slots[i].x - slots[i-1].x >= (slots[i].hitW + slots[i-1].hitW) / 2);
  assert.ok(slots[0].x - slots[0].hitW / 2 >= layout.hand.left);
  assert.ok(slots.at(-1).x + slots.at(-1).hitW / 2 <= layout.hand.right);
  assert.ok(slots.every(slot => slot.y + CELL.height * slot.scale / 2 <= STAGE.height - 4 + .001));
});

test('notch-limited hand gracefully shrinks and leaves room for player melds', () => {
  const layout = boardLayout({ safe: { x: -180, y: 12, width: 1640, height: 696 }, orientation: 'landscape', screenScale: .45, tablet: false });
  const full = handSlots(17, true, layout.hand);
  assert.ok(full.every(s => s.hitW * layout.hand.cssUnit < 44));
  assert.ok(full.at(-1).x + full.at(-1).hitW / 2 <= layout.hand.right);
  const meld = handSlots(14, true, { ...layout.hand, right: 1080 });
  assert.ok(meld.at(-1).x + meld.at(-1).hitW / 2 <= 1080);
});
