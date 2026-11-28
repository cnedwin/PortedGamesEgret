import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScratchCanvas } from '../src/ui/scratch-canvas.mjs';

test('scratch drawing supports a browser with no OffscreenCanvas', () => {
  const element = { width: 0, height: 0, getContext: name => name === '2d' ? {} : null };
  const host = { document: { createElement(name) { assert.equal(name, 'canvas'); return element; } } };
  assert.equal(createScratchCanvas(64, 32, host), element);
  assert.equal(element.width, 64);
  assert.equal(element.height, 32);
  assert.ok(element.getContext('2d'));
});

test('a supported OffscreenCanvas remains the preferred drawing surface', () => {
  class OffscreenCanvas { constructor(width, height) { Object.assign(this, { width, height }); } }
  const canvas = createScratchCanvas(17, 29, { OffscreenCanvas });
  assert.ok(canvas instanceof OffscreenCanvas);
  assert.deepEqual([canvas.width, canvas.height], [17, 29]);
});
