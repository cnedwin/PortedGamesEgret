// 沙盘的画法：规则里每一粒沙在这里变成一个像素，整块沙盘按二十行一条切成十五条贴图，哪条有沙动了才重新上传哪条。
// 每粒的颜色 = 颜料本色 × 自己的深浅；上面空着的沙粒受光、亮一点；越往沙堆里面越暗（向下数头顶压着几粒沙，
// 一种很便宜的环境光遮蔽）；正在闪的整片沙往白里提。积木和托盘里的块也用同一种着色，只是不算遮蔽。
// How the tray is drawn: each grain of the rules is one pixel here, and the tray is cut into fifteen strips twenty rows
// tall, each its own texture; a strip is uploaded again only when its sand moved. A grain's colour is its pigment
// times its own shade; a grain with nothing above it catches the light; the deeper in a heap, the darker (counting the
// grains over it, a cheap ambient occlusion); a run that is shining is lifted toward white. Pieces in the air and in
// the tray are shaded the same way, without the occlusion.
import { Bitmap, DisplayObjectContainer } from '@egret/engine';
import { BOARD, FLASH, PIGMENTS, pieceGrains } from '../sim/sand.mjs';

export const STRIP = 20;
const DEPTH = 10;

/** Write the colour of one grain into `out` at byte `o`. `lift` brightens (light, shine), `shade` darkens (depth). */
export function grainColour(out, o, pigment, tone, lift = 0, shade = 0) {
  const rgb = PIGMENTS[pigment].rgb,
    f = (0.72 + (tone / 255) * 0.46) * (1 - shade);
  // A few grains glint: the brightest shades read as specks of crystal in the pigment.
  const glint = tone > 236 ? 0.18 : 0;
  const up = lift + glint;
  out[o] = Math.min(255, rgb[0] * f + (255 - rgb[0] * f) * up);
  out[o + 1] = Math.min(255, rgb[1] * f + (255 - rgb[1] * f) * up);
  out[o + 2] = Math.min(255, rgb[2] * f + (255 - rgb[2] * f) * up);
  out[o + 3] = 255;
}

/** The pixels of a piece's grains: lit at the top edge of each block, as it looks before it breaks. */
export function piecePixels(piece) {
  const g = pieceGrains(piece),
    out = new Uint8Array(g.w * g.h * 4);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const k = y * g.w + x;
      if (!g.mask[k]) continue;
      const above = y > 0 && g.mask[k - g.w];
      grainColour(out, k * 4, piece.pigment, g.tone[k], above ? 0 : 0.22);
    }
  return { ...g, pixels: out };
}

/**
 * The sand of `game` drawn in `parent` at `scale` stage units a grain. `textures` makes a texture lease from pixels
 * (the game's `textureFromPixels`). Call `update(rows, shining)` each frame with the rows the rules changed.
 */
export async function createBoardView(scope, parent, game, textures, { scale }) {
  const { cols, rows } = BOARD,
    pixels = new Uint8Array(cols * rows * 4),
    root = parent.addChild(scope.use(new DisplayObjectContainer()));
  root.scaleX = root.scaleY = scale;
  const strips = [];
  for (let k = 0; k < rows / STRIP; k++) {
    const lease = await textures(cols, STRIP, pixels.subarray(k * STRIP * cols * 4, (k + 1) * STRIP * cols * 4));
    const bitmap = root.addChild(scope.use(new Bitmap(lease)));
    bitmap.y = k * STRIP;
    strips.push({ bitmap, lease, dirty: false, busy: false });
  }
  let uploads = 0,
    closed = false;

  /** Colour rows `top` to `bottom` again from the rules' cells. */
  function paint(top, bottom) {
    const { color, tone, frozen } = game;
    // A shining run lights up from the left wall to the right, the way it connects, then glows until it goes.
    const shineOf = new Map();
    for (const run of game.clearing) shineOf.set(run, Math.min(1, run.t / FLASH));
    const shineCell = new Map();
    if (shineOf.size)
      for (const [run, p] of shineOf)
        if (run.maxY >= top && run.minY <= bottom) {
          const front = p * 1.6 * cols;
          for (const i of run.cells) {
            const x = i % cols,
              lit = Math.max(0, Math.min(1, (front - x) / 24));
            shineCell.set(i, 0.12 + lit * (0.45 + 0.25 * ((tone[i] * 7 + x) % 13) / 13));
          }
        }
    for (let x = 0; x < cols; x++) {
      // How many grains lie straight above the first row, up to DEPTH.
      let depth = 0;
      for (let y = top - 1; y >= 0 && y >= top - DEPTH; y--) {
        if (!color[y * cols + x]) break;
        depth++;
      }
      for (let y = top; y <= bottom; y++) {
        const i = y * cols + x,
          o = i * 4,
          c = color[i];
        if (!c) {
          pixels[o + 3] = 0;
          depth = 0;
          continue;
        }
        const open = y === 0 || !color[i - cols],
          openLeft = x > 0 && y > 0 && !color[i - cols - 1];
        let lift = open ? 0.2 : openLeft ? 0.08 : 0;
        if (frozen[i]) lift = shineCell.get(i) ?? 0.5;
        grainColour(pixels, o, c, tone[i], lift, Math.min(depth, DEPTH) * 0.014);
        depth++;
      }
    }
    for (let k = Math.floor(top / STRIP); k <= Math.floor(bottom / STRIP); k++) strips[k].dirty = true;
  }

  async function upload(k) {
    const strip = strips[k];
    strip.busy = true;
    strip.dirty = false;
    try {
      const lease = await textures(cols, STRIP, pixels.subarray(k * STRIP * cols * 4, (k + 1) * STRIP * cols * 4));
      if (closed) return lease.release();
      const old = strip.lease;
      strip.bitmap.textureLease = strip.lease = lease;
      old.release();
      uploads++;
    } finally {
      strip.busy = false;
    }
  }

  paint(0, rows - 1);
  return {
    root,
    get uploads() {
      return uploads;
    },
    /** Paint the changed rows (and the occlusion below them) and send the strips that changed. */
    update(changed) {
      let top = rows,
        bottom = -1;
      if (changed) [top, bottom] = changed;
      for (const run of game.clearing) {
        top = Math.min(top, run.minY);
        bottom = Math.max(bottom, run.maxY);
      }
      if (bottom >= top) paint(Math.max(0, top), Math.min(rows - 1, bottom + DEPTH));
      for (let k = 0; k < strips.length; k++) if (strips[k].dirty && !strips[k].busy) void upload(k);
    },
    dispose() {
      closed = true;
    }
  };
}
