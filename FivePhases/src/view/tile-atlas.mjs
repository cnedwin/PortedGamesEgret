const TILE = 128;
const KINDS = 6;
const VARIANTS = 4;

/** 本色、横消、竖消和炸弹纹章放在同一张图集。 */
export function createTilePainter({ Bitmap, scope, textureLease }) {
  const { width, height } = textureLease.value;
  if (width !== KINDS * TILE || height !== VARIANTS * TILE) {
    throw new Error('棋子图集尺寸与纹章布局不符');
  }
  const bitmaps = new WeakMap();
  return (sprite, { kind, special, size }) => {
    let bitmap = bitmaps.get(sprite);
    if (!bitmap) {
      bitmap = scope.use(new Bitmap(textureLease));
      bitmap.anchorOffsetX = bitmap.anchorOffsetY = TILE / 2;
      sprite.addChild(bitmap);
      bitmaps.set(sprite, bitmap);
    }
    const row = special > 0 && special < VARIANTS ? special : 0;
    bitmap.sourceRect = { x: kind * TILE, y: row * TILE, width: TILE, height: TILE };
    bitmap.scaleX = bitmap.scaleY = (size * 0.95) / TILE;
  };
}
