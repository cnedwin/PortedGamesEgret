// 引擎画的部分：玩家的手牌（选中时抬起、可听牌的牌底下有金点）、正在飞的牌（打出、摸进、吃碰时移到副露），
// 以及吃、碰、槓、胡的大字和火花。手牌和飞行的牌都是同一张图集贴图上的 Bitmap，用 sourceRect 取牌面；同屏最多
// 二十来个，在软件渲染下也不贵。静止在桌上的牌由 felt.mjs 画在下层。
// What the engine draws: the player's hand (raised when chosen, a gold dot under a tile whose discard makes the hand
// ready), the tiles in flight (a discard, a draw, a call moving to the melds), and the large words and sparks of a
// call or a win. The hand and the flying tiles are Bitmaps cut from one atlas texture by sourceRect; never more than
// about twenty at once, cheap even with software rendering. Tiles at rest on the table are felt.mjs's, underneath.
import { Bitmap } from '@egret/engine';
import { handSlots, STAGE } from './layout.mjs';
import { BACK, CELL, TILE, frameOf } from './tiles.mjs';

const DEG = 180 / Math.PI;
const COPPER = 0xf4bc80;
const LACQUER = 0x172c34;
const CALLS = {
  chow: { ink: 0x103b37, highlight: 0x94ebc8, tilt: -6, sparks: 8 },
  pong: { ink: 0x682c29, highlight: 0xffb57a, tilt: -5, sparks: 14 },
  kong: { ink: 0x223f4f, highlight: 0xaee9f2, tilt: 0, sparks: 18 },
  win: { ink: 0x762723, highlight: 0xffda85, tilt: -7, sparks: 24 },
  selfDraw: { ink: 0x6c4720, highlight: 0xffe7ad, tilt: -5, sparks: 28 }
};

/** Distinct silhouettes for calls even with the sound off or on a small screen. */
function drawCallPulse(g, kind, color, radius) {
  if (kind === 'chow') {
    g.lineStyle(3, color, .84, { caps: 'round' });
    g.moveTo(-radius, 25).lineTo(-radius * .68, -20);
    g.moveTo(radius * .68, 20).lineTo(radius, -25);
    g.lineStyle(1.5, color, .56, { caps: 'round' });
    g.moveTo(-radius - 10, 12).lineTo(-radius * .82, -15);
    g.moveTo(radius * .82, 15).lineTo(radius + 10, -12);
    return;
  }
  if (kind === 'kong') {
    g.lineStyle(2, color, .9).drawRoundRect(-radius, -44, radius * 2, 88, 13);
    for (const x of [-radius + 8, -radius + 27, radius - 27, radius - 8]) {
      g.lineStyle(2, color, .84).drawRoundRect(x - 6, -56, 12, 112, 5);
    }
    return;
  }
  if (kind === 'pong') {
    g.lineStyle(4, color, .75).drawEllipse(-radius, -53, radius * 2, 106);
    g.lineStyle(2, color, .38).drawEllipse(-radius - 9, -62, radius * 2 + 18, 124);
    return;
  }
  g.lineStyle(4, color, .85).drawEllipse(-radius, -82, radius * 2, 164);
  g.lineStyle(1.8, color, .64, { dash: [12, 6] }).drawEllipse(-radius - 9, -91, radius * 2 + 18, 182);
  g.lineStyle(3, color, .87, { caps: 'round' });
  for (let ray = 0; ray < 12; ray++) {
    const angle = Math.PI * ray / 6;
    const x = Math.cos(angle), y = Math.sin(angle);
    g.moveTo(x * (radius + 15), y * 99).lineTo(x * (radius + 26), y * 113);
  }
}

/** The engine's part of the table. `tall`: the stage is turned a quarter inside a tall engine. */
export function createView(game, lease, { tall = false, scale = 0.75 } = {}) {
  const root = game.sprite(() => {}, game.world);
  root.scaleX = root.scaleY = scale;
  if (tall) {
    root.rotation = 90;
    root.x = STAGE.height * scale;
  }
  const handLayer = game.sprite(() => {}, root),
    handFeedback = game.sprite(() => {}, root),
    flyLayer = game.sprite(() => {}, root),
    wordLayer = game.sprite(() => {}, root);
  /** A stage point in the engine's world, for what play draws there itself (bursts). */
  const toWorld = (at) => (tall ? { x: (STAGE.height - at.y) * scale, y: at.x * scale } : { x: at.x * scale, y: at.y * scale });
  const pool = [];
  const marks = [];
  const selection = game.sprite((g) => {
    const x = -TILE.width / 2 - 2,
      y = 2 - CELL.height / 2 - 2,
      w = TILE.width + 4,
      h = TILE.face + 4;
    g.lineStyle(7, LACQUER, 0.88).drawRoundRect(x, y, w, h, 15);
    g.lineStyle(3.5, COPPER, 1).drawRoundRect(x, y, w, h, 15);
  }, handFeedback);
  selection.visible = false;
  let selectedId = null;
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
      const raised = id === selected,
        at = { ...slots[i], y: slots[i].y - (raised ? 18 : 0) },
        animate = !fresh && moving && !game.reducedMotion;
      if (raised) {
        if (!selection.visible || selectedId !== id) place(selection, animate ? { ...at, x: bitmap.x, y: bitmap.y } : at);
        selection.visible = true;
        if (animate) game.tween(selection).to({ x: at.x, y: at.y }, 0.14, 'quadOut');
        else place(selection, at);
      }
      if (animate) game.tween(bitmap).to({ x: at.x, y: at.y }, 0.14, 'quadOut');
      else place(bitmap, at);
      next.push({ id, bitmap });
    });
    for (const bitmap of before.values()) release(bitmap);
    shown = next;
    selectedId = selected;
    if (selected === null || !next.some(({ id }) => id === selected)) selection.visible = false;
    // Copper studs under tiles whose discard makes the hand ready.
    for (const mark of marks) mark.visible = false;
    let used = 0;
    tiles.forEach(({ id }, i) => {
      if (!ready.has(id)) return;
      let mark = marks[used];
      if (!mark) {
        mark = game.sprite((g) => {
          g.beginFill(LACQUER).drawCircle(0, 0, 6).endFill();
          g.beginFill(COPPER).drawCircle(0, 0, 3.8).endFill();
        }, handFeedback);
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
    const reduced = game.reducedMotion,
      end = { x: to.x, y: to.y, scaleX: to.scale, scaleY: to.scale, rotation: (to.rotation ?? 0) * DEG };
    if (reduced) seconds = 0.01;
    const motion = game.tween(bitmap);
    if (reduced) motion.to(end, seconds, 'cubicOut');
    else {
      const reach = Math.hypot(to.x - from.x, to.y - from.y),
        lift = Math.min(22, reach * 0.056),
        peak = (from.scale + to.scale) * 0.52;
      motion.to({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - lift, scaleX: peak, scaleY: peak,
        rotation: (bitmap.rotation + end.rotation) / 2 }, seconds * 0.43, 'quadOut')
        .to(end, seconds * 0.57, 'quadInOut');
    }
    // A game made again mid-flight (the screen turned) never finishes the motion; do not wait on it for ever.
    const landed = await Promise.race([motion.done.then(() => true), new Promise((resolve) => setTimeout(() => resolve(false), seconds * 1000 + 600))]);
    if (landed && !reduced && to.scale < 0.43 && bitmap.parent === flyLayer) {
      const spot = toWorld(to);
      game.burst(spot.x, spot.y, { color: COPPER, count: 4, speed: 49, life: 0.24, size: 1.8 });
    }
    release(bitmap);
  }

  /** Lacquer title and a short impact effect, timed by the same game clock as tile motion. */
  function call(words, at, { color = 0xffe7b4, size = 64, big = false, kind } = {}) {
    const accent = CALLS[kind];
    const highlight = accent?.highlight ?? COPPER;
    const units = Array.from(words).reduce((width, character) => width + (/[^\u0000-\u00ff]/u.test(character) ? 1 : 0.56), 0),
      w = Math.max(78, units * size + 32),
      h = size * 1.18 + 14,
      x = Math.max(w / 2 + 12, Math.min(STAGE.width - w / 2 - 12, at.x)),
      y = at.y;
    const effect = game.sprite(() => {}, wordLayer);
    effect.x = x;
    effect.y = y;
    let pulse;
    if (accent && !game.reducedMotion) {
      pulse = game.sprite((g) => drawCallPulse(g, kind, highlight, Math.max(big ? 116 : 78, w * .55)), effect);
    }
    const stamp = game.sprite((g) => {
      g.beginFill(0x07191c, .74).drawRoundRect(-w / 2, -h / 2 + 5, w, h, 10).endFill();
      g.beginFill(accent?.ink ?? LACQUER, .985).drawRoundRect(-w / 2, -h / 2, w, h, 10).endFill();
      g.lineStyle(big ? 3.2 : 2.4, highlight, .96).drawRoundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 9);
      g.lineStyle(1, highlight, .45).drawRoundRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, 5);
    }, effect);
    game.text(words, { x: 0, y: 1, size, color, align: 'center', baseline: 'middle', bold: true, layer: stamp });
    const remove = () => effect.parent && game.remove(effect);
    if (game.reducedMotion) {
      game.after(big ? 1.4 : 0.8, remove);
      return;
    }
    if (pulse) {
      pulse.scaleX = pulse.scaleY = .7;
      game.tween(pulse).to({ scaleX: 1.16, scaleY: 1.16, alpha: .7 }, .18, 'quadOut')
        .to({ scaleX: 1.38, scaleY: 1.38, alpha: 0 }, big ? .65 : .37, 'quadOut');
    }
    stamp.scaleX = stamp.scaleY = .72;
    stamp.rotation = (accent?.tilt ?? 0) - 5;
    game.tween(stamp).to({ scaleX: 1.08, scaleY: 1.08, rotation: accent?.tilt ?? 0 }, .12, 'quadOut')
      .to({ scaleX: 1, scaleY: 1, rotation: 0 }, .12).wait(big ? .74 : .32)
      .to({ alpha: 0, y: -16 }, .23, 'quadIn').call(remove);
    const spot = toWorld({ x, y });
    game.burst(spot.x, spot.y, { color: highlight, count: accent?.sparks ?? 7,
      speed: big ? 235 : 132, life: big ? .64 : .36, size: big ? 4 : 2.5 });
  }

  function clear() {
    for (const s of shown) release(s.bitmap);
    shown = [];
    selection.visible = false;
    selectedId = null;
    for (const mark of marks) mark.visible = false;
    for (const child of [...flyLayer.children ?? []]) flyLayer.removeChild(child);
    for (const child of [...wordLayer.children ?? []]) game.remove(child);
  }

  return { showHand, handPlace, fly, call, clear, stage: STAGE };
}
