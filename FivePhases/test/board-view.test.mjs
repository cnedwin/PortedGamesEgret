import assert from 'node:assert/strict';
import test from 'node:test';
import { ELEMENT_COLORS } from '../src/view/draw.mjs';
import { cascadeTempo, CLEAR_MS, createBoardView, FALL_MS, SPAWN_MS, SWAP_MS } from '../src/view/board-view.mjs';
import { createSequence } from '../src/view/sequence.mjs';

class FakeSprite {
  x = 0;
  y = 0;
  scaleX = 1;
  scaleY = 1;
  alpha = 1;
  visible = true;
  parent = null;
  fills = [];
  graphics = new Proxy({}, {
    get: (_, key) => (...args) => {
      if (key === 'clear') this.fills.length = 0;
      if (key === 'beginFill') this.fills.push(args[0]);
      return this.graphics;
    },
  });
}

function setup() {
  const board = { size: 3, kind: [0, 1, 2, 3, 4, 0, 1, 2, 3], special: Array(9).fill(0) };
  const layer = {
    children: new Set(),
    addChild(sprite) {
      this.children.add(sprite);
      sprite.parent = this;
    },
    removeChild(sprite) {
      this.children.delete(sprite);
      sprite.parent = null;
    },
  };
  const scope = { use() {} };
  const geometry = { x: 0, y: 0, cell: 20 };
  const view = createBoardView({ battle: { board }, Sprite: FakeSprite, scope, layer, geometry });
  return { board, layer, view, sequence: createSequence(), fx: { burst() {} } };
}

test('swap, special spawn, successive falls and clears use the sprites at playback time', () => {
  const { layer, view, sequence, fx } = setup();
  const original = [...view.sprites];
  view.playSwap({ a: 0, b: 1 }, sequence);
  sequence.call(() => {
    assert.equal(view.sprites[0], original[1]);
    assert.equal(view.sprites[1], original[0]);
  });
  view.playClear({
    cleared: [{ index: 3, kind: 3 }],
    spawned: [{ index: 0, kind: 1, special: 1 }],
  }, sequence, fx);
  sequence.call(() => {
    assert.equal(view.sprites[0], original[1], 'the special replaces its existing anchor');
    assert.equal(view.sprites[3], null);
    assert.equal(layer.children.size, 8, 'the next fall has not added its fill yet');
  });
  view.playFall({ drops: [{ from: 0, to: 3 }], fills: [{ index: 0, kind: 4, y: 0 }] }, sequence);
  sequence.call(() => {
    assert.equal(view.sprites[3], original[1]);
    assert.deepEqual({ x: original[1].x, y: original[1].y }, view.centre(3));
    assert.equal(layer.children.size, 9);
  });
  view.playClear({ cleared: [{ index: 3, kind: 1 }] }, sequence, fx);
  view.playFall({ drops: [{ from: 0, to: 3 }], fills: [{ index: 0, kind: 2, y: 0 }] }, sequence);

  assert.deepEqual(view.sprites, original);
  assert.equal(layer.children.size, 9);
  sequence.update(2);
  assert.equal(sequence.busy, false);
  assert.deepEqual(layer.children, new Set(view.sprites));
  assert.equal(layer.children.size, 9);
  view.sprites.forEach((sprite, i) => {
    assert.deepEqual({ x: sprite.x, y: sprite.y }, view.centre(i));
  });
});

test('card repaint uses its event colour before the resulting clear and fall', () => {
  const { board, layer, view, sequence, fx } = setup();
  const target = view.sprites[0];
  board.kind[0] = 2;
  view.playRepaint({ cells: [0], kind: 'wood' }, sequence);
  sequence.call(() => assert.equal(target.fills[0], ELEMENT_COLORS.wood.deep));
  view.playCleared({ cells: [0] }, sequence, fx);
  view.playFall({ drops: [], fills: [{ index: 0, kind: 2, y: 0 }] }, sequence);
  assert.equal(view.sprites[0], target, 'a later card clear must not detach the current tile');
  sequence.update(1);
  assert.equal(sequence.busy, false);
  assert.equal(view.sprites[0].fills[0], ELEMENT_COLORS.metal.deep);
  assert.deepEqual(layer.children, new Set(view.sprites));
});

test('clear and spawn omit near-zero geometry, then a reused sprite becomes visible again', () => {
  const { layer, view, sequence, fx } = setup();
  const target = view.sprites[0];
  view.playClear({
    cleared: [{ index: 0, kind: 0 }],
    spawned: [{ index: 0, kind: 1, special: 1 }],
  }, sequence, fx);
  sequence.update((CLEAR_MS - 1) / 1000);
  assert.equal(target.visible, false, 'a nearly vanished tile must not reach the renderer');
  sequence.update(0.0011);
  assert.equal(view.sprites[0], target);
  assert.equal(target.visible, false, 'a nearly zero-sized spawn must not reach the renderer');
  sequence.update(SPAWN_MS / 1000);
  assert.equal(target.visible, true);
  assert.equal(target.scaleX, 1);
  assert.equal(target.alpha, 1);
  assert.equal(layer.children.size, 9);

  view.playCleared({ cells: [0] }, sequence, fx);
  sequence.update(0.179);
  assert.equal(target.visible, false, 'card clears also skip the transparent tail');
  view.playFall({ drops: [], fills: [{ index: 0, kind: 2, y: 0 }] }, sequence);
  sequence.update((FALL_MS + SWAP_MS) / 1000);
  assert.equal(view.sprites[0], target);
  assert.equal(target.visible, true);
  assert.equal(target.alpha, 1);
});

test('deep cascades replay every step within a presentation budget', () => {
  const { layer, view, sequence } = setup();
  const events = Array.from({ length: 42 }, (_, i) => [
    { type: 'clearStep', chain: i + 1, cleared: [{ index: 0, kind: (i + 4) % 5 }] },
    { type: 'fall', chain: i + 1, drops: [], fills: [{ index: 0, kind: i % 5, y: 0 }] },
  ]).flat();
  const shortTempo = cascadeTempo(events.slice(0, 12));
  for (let chain = 1; chain <= 6; chain += 1) assert.equal(shortTempo(chain), 1);
  const tempo = cascadeTempo(events);
  assert.equal(tempo(1), 1);
  assert.equal(tempo(2), 1);
  assert.equal(tempo(42), 1);

  let bursts = 0;
  const fx = { burst() { bursts += 1; } };
  for (const event of events) {
    const durationScale = tempo(event.chain);
    if (event.type === 'clearStep') view.playClear(event, sequence, fx, durationScale);
    else view.playFall(event, sequence, durationScale);
  }
  for (let i = 0; i < 250; i += 1) sequence.update(0.016);
  assert.equal(sequence.busy, false, '42 steps should finish within 4 seconds of playback');
  assert.equal(bursts, 42);
  assert.equal(view.sprites[0].fills[0], ELEMENT_COLORS.earth.deep);
  assert.deepEqual(layer.children, new Set(view.sprites));
});
