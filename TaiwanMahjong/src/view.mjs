// 引擎画的部分：玩家的手牌（选中时抬起、可听牌的牌底下有金点）、正在飞的牌（打出、摸进、吃碰时移到副露），
// 以及吃、碰、槓、胡的大字和火花。手牌和飞行的牌都是同一张图集贴图上的 Bitmap，用 sourceRect 取牌面；同屏最多
// 二十来个，在软件渲染下也不贵。静止在桌上的牌由 felt.mjs 画在下层。
// What the engine draws: the player's hand (raised when chosen, a gold dot under a tile whose discard makes the hand
// ready), the tiles in flight (a discard, a draw, a call moving to the melds), and the large words and sparks of a
// call or a win. The hand and the flying tiles are Bitmaps cut from one atlas texture by sourceRect; never more than
// about twenty at once, cheap even with software rendering. Tiles at rest on the table are felt.mjs's, underneath.
import { Bitmap } from '@egret/engine';
import { handSlots, STAGE } from './layout.mjs';
import { BACK, CELL, frameOf } from './tiles.mjs';

const DEG = 180 / Math.PI;

/** The engine's part of the table. `tall`: the stage is turned a quarter inside a tall engine. */
export function createView(game, lease, { tall = false, scale = 0.75 } = {}) {
  const root = game.sprite(() => {}, game.world);
  root.scaleX = root.scaleY = scale;
  if (tall) {
    root.rotation = 90;
    root.x = STAGE.height * scale;
  }
  const handLayer = game.sprite(() => {}, root),
    flyLayer = game.sprite(() => {}, root),
    wordLayer = game.sprite(() => {}, root);
  /** A stage point in the engine's world, for what play draws there itself (bursts). */
  const toWorld = (at) => (tall ? { x: (STAGE.height - at.y) * scale, y: at.x * scale } : { x: at.x * scale, y: at.y * scale });
  const pool = [];
  const marks = [];
  let shown = [];

  function tile(kind) {
    const bitmap = pool.pop() ?? new Bitmap(lease);
    bitmap.sourceRect = frameOf(kind ?? BACK);
    bitmap.anchorOffsetX = CELL.width / 2;
    bitmap.anchorOffsetY = CELL.height / 2;
    bitmap.alpha = 1;
    bitmap.visible = true;
    return bitmap;
  }
  function release(bitmap) {
    bitmap.parent?.removeChild(bitmap);
    pool.push(bitmap);
  }
  const place = (bitmap, at) => {
    bitmap.x = at.x;
    bitmap.y = at.y;
    bitmap.scaleX = bitmap.scaleY = at.scale;
    bitmap.rotation = (at.rotation ?? 0) * DEG;
  };

  /**
   * Show the player's hand: `tiles` is [{ id, kind }] in order; `drawnApart` sets the last apart; `selected` is an
   * id raised; `ready` a set of ids marked; `moving` lets tiles glide to their places.
   */
  function showHand(tiles, { drawnApart = false, selected = null, ready = new Set(), moving = true } = {}) {
    const slots = handSlots(tiles.length, drawnApart),
      before = new Map(shown.map((s) => [s.id, s.bitmap]));
    const next = [];
    tiles.forEach(({ id, kind }, i) => {
      let bitmap = before.get(id);
      before.delete(id);
      const fresh = !bitmap;
      if (fresh) {
        bitmap = tile(kind);
        handLayer.addChild(bitmap);
      } else bitmap.sourceRect = frameOf(kind);
      const at = { ...slots[i], y: slots[i].y - (id === selected ? 18 : 0) };
      if (fresh || !moving || game.reducedMotion) place(bitmap, at);
      else game.tween(bitmap).to({ x: at.x, y: at.y }, 0.14, 'quadOut');
      next.push({ id, bitmap });
    });
    for (const bitmap of before.values()) release(bitmap);
    shown = next;
    // Gold dots under tiles that make the hand ready.
    for (const mark of marks) mark.visible = false;
    let used = 0;
    tiles.forEach(({ id }, i) => {
      if (!ready.has(id)) return;
      let mark = marks[used];
      if (!mark) {
        mark = game.rect(-9, -2.5, 18, 5, 0xf5c95c, handLayer);
        marks.push(mark);
      }
      mark.visible = true;
      mark.x = slots[i].x;
      mark.y = slots[i].y + CELL.height * slots[i].scale * 0.5 + 6;
      used++;
    });
  }

  /** Where the player's `index`-th of `count` tiles is. */
  const handPlace = (index, count, drawnApart) => handSlots(count, drawnApart)[index];

  /** A tile flying from one place to another; resolves when it lands. */
  async function fly(kind, from, to, seconds = 0.28) {
    const bitmap = tile(kind);
    flyLayer.addChild(bitmap);
    place(bitmap, from);
    if (game.reducedMotion) seconds = 0.01;
    const motion = game.tween(bitmap).to({ x: to.x, y: to.y, scaleX: to.scale, scaleY: to.scale, rotation: (to.rotation ?? 0) * DEG }, seconds, 'cubicOut');
    // A game made again mid-flight (the screen turned) never finishes the motion; do not wait on it for ever.
    await Promise.race([motion.done, new Promise((resolve) => setTimeout(resolve, seconds * 1000 + 600))]);
    release(bitmap);
  }

  /** A word of a call or a win, popping over a place. */
  function call(words, at, { color = 0xffe08a, size = 64, big = false } = {}) {
    const label = game.text(words, { x: at.x, y: at.y, size, color, align: 'center', baseline: 'middle', bold: true, layer: wordLayer });
    label.scaleX = label.scaleY = 0.4;
    if (game.reducedMotion) {
      label.scaleX = label.scaleY = 1;
      game.after(big ? 1.4 : 0.8, () => game.remove(label));
      return;
    }
    game.tween(label).to({ scaleX: 1.15, scaleY: 1.15 }, 0.16, 'backOut').to({ scaleX: 1, scaleY: 1 }, 0.1).wait(big ? 1.1 : 0.45).to({ alpha: 0, y: at.y - 24 }, 0.3, 'quadIn').call(() => game.remove(label));
    const spot = toWorld(at);
    game.burst(spot.x, spot.y, { color, count: big ? 40 : 14, speed: big ? 320 : 180, life: big ? 0.9 : 0.5, size: big ? 6 : 4 });
    if (big) {
      game.flash(0xfff2c0, 0.25);
      game.shake(4, 0.25);
    }
  }

  function clear() {
    for (const s of shown) release(s.bitmap);
    shown = [];
    for (const mark of marks) mark.visible = false;
    for (const child of [...flyLayer.children ?? []]) flyLayer.removeChild(child);
  }

  return { showHand, handPlace, fly, call, clear, stage: STAGE };
}
