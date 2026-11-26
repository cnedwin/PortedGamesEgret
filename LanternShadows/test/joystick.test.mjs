import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStick, stickAmount } from '../src/joystick.mjs';

test('the stick stays neutral near the center and scales to full speed in either direction', () => {
  assert.equal(stickAmount(4, 25), 0);
  assert.equal(stickAmount(-4, 25), 0);
  assert.equal(stickAmount(50, 25), 1);
  assert.equal(stickAmount(-50, 25), -1);
  assert(stickAmount(10, 25) > 0 && stickAmount(10, 25) < stickAmount(20, 25));
  assert.equal(stickAmount(-14, 25), -stickAmount(14, 25));
});

test('one native pointer session owns the stick until release, cancellation or forced reset', () => {
  const stick = createStick();
  const first = {}, other = {}, last = {};
  const bounds = { x: 100, width: 100 };
  assert(stick.begin(first, 150, bounds));
  assert.equal(stick.move, 0);
  stick.track(first, 300);
  assert.equal(stick.move, 1);
  assert.equal(stick.shift, 1);
  assert.equal(stick.begin(other, 101, bounds), false);
  stick.end(other);
  assert.equal(stick.move, 1);
  stick.end(first);
  assert.equal(stick.move, 0);
  assert.equal(stick.held, false);
  assert.equal(stick.shift, 0);
  assert(stick.begin(last, 100, bounds));
  assert.equal(stick.move, -1);
  stick.clear();
  stick.track(last, 250);
  assert.equal(stick.move, 0);
});
