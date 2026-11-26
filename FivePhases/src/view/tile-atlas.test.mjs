import assert from 'node:assert/strict';
import test from 'node:test';
import { createTilePainter } from './tile-atlas.mjs';

class Bitmap {
  constructor(texture) { this.texture = texture; }
}

const scope = { use: (value) => value };
const textureLease = { value: { width: 768, height: 512 } };

test('棋盘翻色和特殊状态复用自己的图集位图', () => {
  const paint = createTilePainter({ Bitmap, scope, textureLease });
  const tiles = [];
  const sprite = { addChild: (value) => tiles.push(value) };
  paint(sprite, { kind: 3, special: 2, size: 92 });
  assert.deepEqual(tiles[0].sourceRect, { x: 384, y: 256, width: 128, height: 128 });
  assert.equal(tiles[0].anchorOffsetX, 64);
  paint(sprite, { kind: 5, special: 4, size: 92 });
  assert.equal(tiles.length, 1);
  assert.deepEqual(tiles[0].sourceRect, { x: 640, y: 0, width: 128, height: 128 });
  assert.equal(tiles[0].texture, textureLease);
});

test('棋子图集必须有六列、四行的固定区域', () => {
  assert.throws(() => createTilePainter({ Bitmap, scope, textureLease: {
    value: { width: 640, height: 512 },
  } }), /图集尺寸/);
});
