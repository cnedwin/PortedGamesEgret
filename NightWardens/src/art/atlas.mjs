// 图集：把 paint.mjs 画的每一帧按 2 倍分辨率排进一张画布，交给引擎做一张纹理。小怪的走路是引擎的帧动画片段
// （createSequenceClip），静止的小图从精灵表（createSpriteSheet）取；首领各有一张自己的图集，只在它那一夜载入。
// 同一张图集上的位图由引擎合成一批绘制，所以满屏的邪祟也只花一次绘制。
// The atlas: every frame painted by paint.mjs is laid out at twice its size on one canvas and handed to the engine as
// one texture. The walks of the haunts are the engine's frame clips (createSequenceClip); the still pictures come from
// a sprite sheet (createSpriteSheet). Each warden has an atlas of its own, loaded only on its night. Bitmaps of one
// atlas are drawn by the engine as one batch, so a road full of haunts costs one draw.
import { createSequenceClip, createSpriteSheet } from '@egret/engine';
import * as paint from './paint.mjs';

/** Canvas pixels per rule unit in the atlas. */
export const RES = 2;

/**
 * The frames of the common atlas. `size` is in rule units around the frame's centre; `frames` the number of pictures
 * and `seconds` how long each shows in a walk.
 */
export const HAUNT_ART = {
  paper: { draw: paint.paperDoll, size: [44, 64], frames: 2, seconds: 0.28 },
  wisp: { draw: paint.wisp, size: [40, 46], frames: 3, seconds: 0.1 },
  jiangshi: { draw: paint.jiangshi, size: [56, 76], frames: 2, seconds: 0.5 },
  lantern: { draw: paint.lanternGhost, size: [56, 70], frames: 2, seconds: 0.35 },
  bride: { draw: paint.ghostBride, size: [64, 90], frames: 2, seconds: 0.4 }
};
export const WARDEN_ART = {
  general: { draw: paint.paperGeneral, size: [170, 180], frames: 3, seconds: 0.45 },
  wuchang: { draw: paint.whiteWuchang, size: [150, 210], frames: 3, seconds: 0.5 },
  hanba: { draw: paint.droughtDemon, size: [170, 170], frames: 3, seconds: 0.4 }
};
const STILLS = {
  crossbow: { draw: paint.crossbow, size: [80, 70] },
  tower: { draw: paint.gateTower, size: [104, 44] },
  bolt: { draw: (g) => paint.bolt(g, 'gold'), size: [16, 38] },
  boltBlue: { draw: (g) => paint.bolt(g, 'blue'), size: [16, 38] },
  spit: { draw: paint.spitFire, size: [24, 24] },
  soul: { draw: paint.soul, size: [20, 20] },
  crack: { draw: paint.crack, size: [32, 24] }
};

/** Lay `items` ({ name, w, h, draw }) on shelves no wider than `maxWidth` pixels; returns the canvas and rectangles. */
function pack(items, maxWidth = 1024) {
  const pad = 2,
    placed = [];
  let x = pad,
    y = pad,
    shelf = 0,
    width = 0;
  for (const item of [...items].sort((a, b) => b.h - a.h)) {
    if (x + item.w + pad > maxWidth) {
      x = pad;
      y += shelf + pad;
      shelf = 0;
    }
    placed.push({ ...item, x, y });
    x += item.w + pad;
    width = Math.max(width, x);
    shelf = Math.max(shelf, item.h);
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(maxWidth, width);
  canvas.height = y + shelf + pad;
  const g = canvas.getContext('2d');
  for (const item of placed) {
    g.save();
    g.beginPath();
    g.rect(item.x, item.y, item.w, item.h);
    g.clip();
    g.translate(item.x + item.w / 2, item.y + item.h / 2);
    g.scale(RES, RES);
    item.draw(g);
    g.restore();
  }
  return { canvas, rects: Object.fromEntries(placed.map((p) => [p.name, { x: p.x, y: p.y, width: p.w, height: p.h }])) };
}

/** The frames of an animated set as items for `pack`. */
function animatedItems(set) {
  const items = [];
  for (const [kind, art] of Object.entries(set))
    for (let f = 0; f < art.frames; f++) items.push({ name: `${kind}:${f}`, w: art.size[0] * RES, h: art.size[1] * RES, draw: (g) => art.draw(g, f) });
  return items;
}

/** A clip of a kind's frames `from` up to `to` on an atlas of `canvas` size, frame after frame. */
function clipOf(kind, art, rects, canvas, from = 0, to = art.frames) {
  return createSequenceClip({
    atlasWidth: canvas.width,
    atlasHeight: canvas.height,
    frames: Array.from({ length: to - from }, (_, i) => ({ ...rects[`${kind}:${from + i}`], durationSeconds: art.seconds }))
  });
}

/**
 * The common atlas: the haunts' walks as clips, and the still pictures as a sprite sheet. The lease belongs to the
 * game's scope; the sheet is disposed by `scope`.
 */
export async function loadCommonAtlas(game, scope) {
  const items = [...animatedItems(HAUNT_ART), ...Object.entries(STILLS).map(([name, art]) => ({ name, w: art.size[0] * RES, h: art.size[1] * RES, draw: art.draw }))];
  const { canvas, rects } = pack(items);
  const lease = await game.textureFromCanvas(canvas);
  const sheet = scope.use(createSpriteSheet(lease, Object.keys(STILLS).map((name) => ({ name, ...rects[name] }))));
  const clips = Object.fromEntries(Object.entries(HAUNT_ART).map(([kind, art]) => [kind, clipOf(kind, art, rects, canvas)]));
  return { lease, sheet, clips, rects, size: Object.fromEntries(Object.entries(HAUNT_ART).map(([k, a]) => [k, a.size])), stills: STILLS };
}

/** One warden's atlas: its walk (the first two frames) and its stomp (the third) as clips, with its size. */
export async function loadWardenAtlas(game, kind) {
  const art = WARDEN_ART[kind];
  const { canvas, rects } = pack(animatedItems({ [kind]: art }), 2048);
  const lease = await game.textureFromCanvas(canvas);
  return { lease, walk: clipOf(kind, art, rects, canvas, 0, 2), stomp: clipOf(kind, art, rects, canvas, 2, 3), size: art.size, seconds: art.seconds };
}

/** A small picture for particles, `size` pixels square, as a texture of its own. */
export async function loadParticleTexture(game, name, size = 32) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  paint.PARTICLES[name](canvas.getContext('2d'), size);
  return game.textureFromCanvas(canvas);
}

/** The browser composites the still scenery behind the moving Egret canvas. */
export function roadUrl(name) {
  return new URL(`../../assets/art/${name}.webp`, import.meta.url).href;
}

