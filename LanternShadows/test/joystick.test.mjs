import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindJoystick, stickAmount } from '../src/joystick.mjs';

test('the stick stays neutral near the center and scales to full speed in either direction', () => {
  assert.equal(stickAmount(4, 25), 0);
  assert.equal(stickAmount(-4, 25), 0);
  assert.equal(stickAmount(50, 25), 1);
  assert.equal(stickAmount(-50, 25), -1);
  assert(stickAmount(10, 25) > 0 && stickAmount(10, 25) < stickAmount(20, 25));
  assert.equal(stickAmount(-14, 25), -stickAmount(14, 25));
});

test('one pointer owns the stick until release, cancellation or a forced reset', () => {
  const element = new EventTarget(), target = new EventTarget();
  const properties = new Map(), classes = new Set(), captures = new Set();
  Object.assign(element, {
    getBoundingClientRect: () => ({ left: 100, width: 100 }),
    style: { setProperty: (name, value) => properties.set(name, value), removeProperty: name => properties.delete(name) },
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
    hasPointerCapture: id => captures.has(id), setPointerCapture: id => captures.add(id), releasePointerCapture: id => captures.delete(id),
  });
  const stick = bindJoystick(element, target);
  const pointer = (node, type, id, x) => node.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), {
    pointerId: id, clientX: x, button: 0,
  }));
  pointer(element, 'pointerdown', 3, 150);
  assert.equal(stick.move, 0);
  pointer(target, 'pointermove', 3, 300);
  assert.equal(stick.move, 1);
  assert.equal(properties.get('--stick-shift'), '27px');
  pointer(element, 'pointerdown', 8, 101);
  pointer(target, 'pointerup', 8, 101);
  assert.equal(stick.move, 1);
  pointer(target, 'pointercancel', 3, 300);
  assert.equal(stick.move, 0);
  assert.equal(classes.size + captures.size + properties.size, 0);
  pointer(element, 'pointerdown', 10, 100);
  assert.equal(stick.move, -1);
  stick.clear();
  pointer(target, 'pointermove', 10, 250);
  assert.equal(stick.move, 0);
});
