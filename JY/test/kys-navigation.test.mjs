import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findTilePath, screenToTile } from '../src/kys-navigation.mjs';

test('screen clicks use the current camera origin and tile scale', () => {
  const originX = 117, originY = -36;
  assert.deepEqual(screenToTile(originX - 36, originY + 702, originX, originY, 2), { x: 19, y: 20 });
  assert.deepEqual(screenToTile(originX - 4, originY - 3, originX, originY), { x: 0, y: 0 });
});

test('click walking chooses the deterministic shortest route around an obstacle', () => {
  const canWalk = (x, y) => x >= 0 && x <= 4 && y >= 0 && y <= 4 && !(x === 2 && y === 1);
  const start = { x: 1, y: 1 };
  assert.deepEqual(findTilePath(start, [{ x: 3, y: 1 }], canWalk), [
    { x: 1, y: 0, facing: 0 }, { x: 2, y: 0, facing: 1 }, { x: 3, y: 0, facing: 1 }, { x: 3, y: 1, facing: 3 },
  ]);
  assert.equal(findTilePath(start, [{ x: 3, y: 1 }], canWalk, { maxVisited: 3 }), null);
});

test('a blocked click remains unreachable while the nearest adjacent interaction tile is selectable', () => {
  const start = { x: 0, y: 1 };
  const blocked = { x: 2, y: 1 };
  const canWalk = (x, y) => x >= 0 && x <= 4 && y >= 0 && y <= 4 && !(x === blocked.x && y === blocked.y);
  assert.equal(findTilePath(start, [blocked], canWalk), null);
  assert.deepEqual(findTilePath(start, [{ x: 3, y: 1 }, { x: 1, y: 1 }], canWalk), [{ x: 1, y: 1, facing: 1 }]);
  assert.deepEqual(findTilePath(start, [start], canWalk), []);
});
