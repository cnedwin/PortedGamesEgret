// 拆画的画面：上面是用沙铺成的画（同一个沙盘画法），下面一条传送带从左往右走、再从下面绕回来，带上的沙桶经过哪里，
// 就从沙盘最底下一行吸走头顶的同色沙，一道沙流落进桶里，桶里的颜料一点点涨上去。再往下是几列排队的桶，点一列的
// 最前面那只（或按 1 到 5），它就上传送带。框、轨道这些不动的东西由页面画在引擎画布下面。
// The view of unpainting: the painting in sand above (drawn by the same tray view), and under it a belt running left
// to right and back underneath; where a bucket on it passes, it draws its colour from the bottom row straight above,
// a stream of sand falls into it and its paint rises. Below wait the lanes of buckets; tap the front one of a lane (or
// press 1 to 5) and it goes onto the belt. The frame and the tracks, which never move, are painted by the page under
// the engine's canvas.
import { DisplayObjectContainer, Sprite } from '@egret/engine';
import { createParticleEmitter } from '@egret/engine/particles';
import { BOARD, PIGMENTS } from '../sim/sand.mjs';
import { BELT, collectedShare, placeAt, stepUnpaint, tapLane } from '../sim/unpaint.mjs';
import { createBoardView } from './board.mjs';
import { paintScroll } from './scroll.mjs';

const hex = ([r, g, b], k = 1) => (Math.min(255, Math.round(r * k)) << 16) | (Math.min(255, Math.round(g * k)) << 8) | Math.min(255, Math.round(b * k));
const css = (colour, alpha = 1) => `rgba(${(colour >> 16) & 255}, ${(colour >> 8) & 255}, ${colour & 255}, ${alpha})`;
const GOLD = 0xe2b866;

/** Where everything goes on a tall or a wide stage. */
export function unpaintLayout(width, height) {
  const { cols, rows } = BOARD;
  if (height > width) {
    const S = 2;
    return { tall: true, S, board: { x: (width - cols * S) / 2, y: 66, w: cols * S, h: rows * S }, belt: 696, back: 748, lanes: { x: 20, y: 790, w: width - 40, h: 160 }, title: { x: 24, y: 18 }, share: { x: width - 120, y: 22 } };
  }
  const S = 1.45;
  return { tall: false, S, board: { x: 40, y: 14, w: cols * S, h: rows * S }, belt: 14 + rows * S + 16, back: 14 + rows * S + 46, lanes: { x: 40 + cols * S + 50, y: 120, w: width - (40 + cols * S + 50) - 30, h: 380 }, title: { x: 40 + cols * S + 50, y: 24 }, share: { x: width - 30, y: 70 } };
}

/** A bucket: a pail of rosewood with a gold rim, its paint filled to `share`. Big buckets are wider. */
function drawBucket(g, w, h, pigment, share, { big = false, dim = false } = {}) {
  const rgb = PIGMENTS[pigment].rgb,
    colour = hex(rgb),
    top = w * (big ? 0.5 : 0.42),
    foot = w * (big ? 0.38 : 0.32);
  g.clear();
  g.beginFill(0x000000, 0.3).drawEllipse(-foot, h * 0.46, foot * 2, h * 0.1).endFill();
  // The pail, then the paint inside up to its share, then the rim.
  g.beginFill(dim ? 0x3a2418 : 0x5a3422, 1).moveTo(-top, -h / 2).lineTo(top, -h / 2).lineTo(foot, h / 2).lineTo(-foot, h / 2).lineTo(-top, -h / 2).endFill();
  const level = h * Math.min(1, share),
    at = h / 2 - level,
    edge = (y) => foot + ((top - foot) * (h / 2 - y)) / h;
  if (level > 0) g.beginFill(colour, dim ? 0.55 : 1).moveTo(-edge(at) + 2, at).lineTo(edge(at) - 2, at).lineTo(foot - 2, h / 2 - 2).lineTo(-foot + 2, h / 2 - 2).lineTo(-edge(at) + 2, at).endFill();
  // A band of the bucket's colour round it, so an empty bucket still says what it takes.
  g.beginFill(colour, dim ? 0.6 : 0.95).drawRect(-edge(-h * 0.1), -h * 0.12, edge(-h * 0.1) * 2, h * 0.16).endFill();
  g.lineStyle(2, GOLD, dim ? 0.4 : 0.9).moveTo(-top - 2, -h / 2).lineTo(top + 2, -h / 2).lineStyle(0);
  if (big) g.lineStyle(1.5, 0xfff0c0, 0.9).drawCircle(0, -h / 2 - 7, 4).lineStyle(0);
}

/** Paint the still parts on the page: the frame round the sand, the belt and its return, the lanes' trays. */
export function paintUnpaintBack(g, L, lanes, silk) {
  const b = L.board,
    pad = 12;
  g.fillStyle = 'rgba(0, 0, 0, 0.35)';
  g.fillRect(b.x - pad + 4, b.y - pad + 8, b.w + pad * 2, b.h + pad * 2);
  const wood = g.createLinearGradient(b.x - pad, 0, b.x + b.w + pad, 0);
  wood.addColorStop(0, '#4a2817');
  wood.addColorStop(0.5, '#6a3a22');
  wood.addColorStop(1, '#3e2113');
  g.fillStyle = wood;
  g.beginPath();
  g.roundRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, 12);
  g.fill();
  // Under the sand, the silk the picture was painted on: as the sand goes, the bare silk shows.
  g.drawImage(silk, b.x, b.y, b.w, b.h);
  g.strokeStyle = css(GOLD, 0.7);
  g.lineWidth = 1.5;
  g.strokeRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10);
  // The belt under the tray, and its return below it, joined at both ends.
  const left = b.x - 6,
    right = b.x + b.w + 6;
  g.strokeStyle = '#6a4630';
  g.lineWidth = 18;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(left, L.belt + 20);
  g.lineTo(right, L.belt + 20);
  g.arc(right, (L.belt + 20 + L.back) / 2, (L.back - L.belt - 20) / 2, -Math.PI / 2, Math.PI / 2);
  g.lineTo(left, L.back);
  g.arc(left, (L.belt + 20 + L.back) / 2, (L.back - L.belt - 20) / 2, Math.PI / 2, (3 * Math.PI) / 2);
  g.stroke();
  g.strokeStyle = css(GOLD, 0.7);
  g.lineWidth = 1.5;
  g.setLineDash([6, 8]);
  g.beginPath();
  g.moveTo(left, L.belt + 20);
  g.lineTo(right, L.belt + 20);
  g.stroke();
  g.setLineDash([]);
  // The lanes' trays.
  const n = lanes,
    lw = L.lanes.w / n;
  for (let k = 0; k < n; k++) {
    const x = L.lanes.x + k * lw + 4;
    const face = g.createLinearGradient(0, L.lanes.y, 0, L.lanes.y + L.lanes.h);
    face.addColorStop(0, '#4a2817');
    face.addColorStop(1, '#24130a');
    g.fillStyle = face;
    g.beginPath();
    g.roundRect(x, L.lanes.y, lw - 8, L.lanes.h, 12);
    g.fill();
    g.strokeStyle = css(GOLD, 0.45);
    g.lineWidth = 1.2;
    g.beginPath();
    g.roundRect(x + 4, L.lanes.y + 4, lw - 16, L.lanes.h - 8, 9);
    g.stroke();
  }
}

/**
 * Build the unpaint round's view under `root` for `game`. `hooks.ended(won)` hears when it is over. Returns
 * `update(seconds)` and `tap(lane)` for the keys.
 */
export async function createUnpaintView(app, scope, root, kit, game, hooks) {
  const { width, height } = app.stage,
    L = unpaintLayout(width, height),
    b = L.board,
    S = L.S,
    textures = (w, h, px) => app.game.textureFromPixels(w, h, px);
  const silk = paintScroll(game.level.painting, true, { width: 960, height: 240, silkOnly: true });
  const [cx, cy, cw, ch] = game.level.crop,
    // Only the part under the picture: the silk cut from the same place as the picture, stretched over the tray.
    cut = Object.assign(document.createElement('canvas'), { width: cw, height: ch });
  cut.getContext('2d').drawImage(silk, cx, cy, cw, ch, 0, 0, cw, ch);
  app.backdrop.set((g) => paintUnpaintBack(g, L, game.level.lanes, cut));

  const field = root.addChild(scope.use(new DisplayObjectContainer()));
  field.x = b.x;
  field.y = b.y;
  const board = await createBoardView(scope, field, game, textures, { scale: S });
  scope.use(board);
  const streams = root.addChild(scope.use(new Sprite()));
  const beltLayer = root.addChild(scope.use(new DisplayObjectContainer()));
  const laneLayer = root.addChild(scope.use(new DisplayObjectContainer()));
  const fx = root.addChild(scope.use(new DisplayObjectContainer()));

  // Sparkles where a full bucket leaves the belt.
  const dot = new Uint8Array(8 * 8 * 4);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const d = Math.hypot(x - 3.5, y - 3.5) / 4,
        o = (y * 8 + x) * 4;
      dot[o] = dot[o + 1] = dot[o + 2] = 255;
      dot[o + 3] = Math.round(Math.max(0, 1 - d) ** 1.5 * 255);
    }
  const sparkle = scope.use(
    createParticleEmitter({
      texture: await textures(8, 8, dot),
      maxParticles: 300,
      rate: 0,
      lifetime: [0.4, 0.9],
      speed: [60, 200],
      angle: [200, 340],
      gravity: { x: 0, y: 300 },
      size: 7,
      startScale: [0.6, 1.2],
      endScale: 0.1,
      startColor: 0xfff2c0,
      endColor: GOLD,
      startAlpha: 1,
      endAlpha: 0,
      shape: { kind: 'circle', radius: 14 },
      blendMode: 'add',
      seed: 23
    })
  );
  fx.addChild(sparkle.display);

  // The belt's buckets: one sprite a place, drawn again when its bucket or its fill changes.
  const bw = L.tall ? 44 : 40,
    bh = L.tall ? 46 : 44;
  const places = game.belt.map(() => {
    const sprite = beltLayer.addChild(scope.use(new Sprite()));
    return { sprite, look: '' };
  });
  const beltPoint = (at) => {
    // Along the top under the tray, then back along the return, right to left.
    const { cols } = BOARD;
    if (at < cols) return { x: b.x + at * S, y: L.belt + 6, under: false };
    const back = (at - cols) / BELT.back;
    return { x: b.x + b.w - back * b.w, y: L.back - 4, under: true };
  };

  // The lanes: the front bucket of each can be tapped; two more wait behind it, smaller.
  const n = game.level.lanes,
    lw = L.lanes.w / n;
  const lanes = game.lanes.map((queue, k) => {
    const holder = laneLayer.addChild(scope.use(new DisplayObjectContainer()));
    holder.x = L.lanes.x + k * lw + lw / 2;
    holder.y = L.lanes.y;
    const hit = holder.addChild(scope.use(new Sprite()));
    hit.touchEnabled = true;
    hit.hitArea = { x: -lw / 2 + 4, y: 0, width: lw - 8, height: L.lanes.h };
    const front = holder.addChild(scope.use(new Sprite())),
      second = holder.addChild(scope.use(new Sprite())),
      third = holder.addChild(scope.use(new Sprite()));
    front.y = L.tall ? 40 : 60;
    second.y = L.tall ? 96 : 150;
    third.y = L.tall ? 136 : 220;
    return { hit, front, second, third, look: '' };
  });
  const count = await kit.label(root, '', { x: L.share.x, y: L.share.y, size: 17, color: GOLD, align: 'right' });
  let shownShare = -1;
  function paintLanes() {
    game.lanes.forEach((queue, k) => {
      const lane = lanes[k],
        look = queue
          .slice(0, 3)
          .map((q) => q.id)
          .join(',') + (game.belt.includes(null) ? '' : '!');
      if (lane.look === look) return;
      lane.look = look;
      const full = !game.belt.includes(null);
      [lane.front, lane.second, lane.third].forEach((sprite, d) => {
        const bucket = queue[d];
        sprite.visible = Boolean(bucket);
        if (!bucket) return;
        const k = d === 0 ? (L.tall ? 1.25 : 1.5) : d === 1 ? 0.85 : 0.65;
        drawBucket(sprite.graphics, Math.min(lw * 0.62, bw * k * 1.3), bh * k, bucket.pigment, 0, { dim: d > 0 || full });
      });
    });
  }
  function paintBelt() {
    game.belt.forEach((bucket, place) => {
      const p = places[place];
      if (!bucket) {
        p.sprite.visible = false;
        p.look = '';
        return;
      }
      const at = beltPoint(placeAt(game, place));
      p.sprite.visible = true;
      p.sprite.x = at.x;
      p.sprite.y = at.y;
      p.sprite.alpha = at.under ? 0.55 : 1;
      const share = bucket.filled / bucket.capacity,
        look = `${bucket.id}:${Math.round(share * 30)}:${bucket.big ? 1 : 0}`;
      if (p.look === look) return;
      p.look = look;
      drawBucket(p.sprite.graphics, bucket.big ? bw * 1.3 : bw, bucket.big ? bh * 1.15 : bh, bucket.pigment, share, { big: bucket.big });
    });
  }
  paintLanes();
  paintBelt();

  function tap(lane) {
    if (tapLane(game, lane)) app.sound.play('pick', { volume: 0.7 });
    else app.sound.play('turn', { rate: 0.6 });
  }
  kit.own({
    dispose: app.game.pointer.observe(({ kind, target }) => {
      if (kind !== 'begin' || game.over) return;
      const lane = lanes.findIndex((l) => l.hit === target);
      if (lane >= 0) tap(lane);
    })
  });

  let paused = false,
    endedSent = false;
  return {
    setPaused: (on) => (paused = on),
    get paused() {
      return paused;
    },
    tap,
    update(seconds) {
      if (!paused) stepUnpaint(game, seconds);
      const events = game.events;
      game.events = [];
      const rows = game.dirtyTop <= game.dirtyBottom ? [game.dirtyTop, game.dirtyBottom] : null;
      game.dirtyTop = BOARD.rows;
      game.dirtyBottom = -1;
      board.update(rows);
      for (const e of events) {
        if (e.kind === 'board') app.sound.play('drop', { volume: 0.4, rate: 1.3 });
        else if (e.kind === 'merge') {
          app.sound.play('shine', { rate: 1.12 });
          app.vibrate?.(25);
        } else if (e.kind === 'full') {
          const at = beltPoint(placeAt(game, e.place));
          app.sound.play('shine', { rate: e.big ? 0.84 : 1, volume: 0.8 });
          if (!app.reducedMotion) {
            sparkle.x = at.x;
            sparkle.y = at.y;
            sparkle.burst(e.big ? 70 : 36);
          }
        } else if ((e.kind === 'won' || e.kind === 'lost') && !endedSent) {
          endedSent = true;
          hooks.ended(e.kind === 'won');
        }
      }
      paintLanes();
      paintBelt();
      // Streams of sand from the bottom of the tray into the buckets drawing now.
      const g = streams.graphics;
      g.clear();
      game.belt.forEach((bucket, place) => {
        if (!bucket || game.ticks - (bucket.pouring ?? -99) > 6) return;
        const at = beltPoint(placeAt(game, place));
        if (at.under) return;
        const colour = hex(PIGMENTS[bucket.pigment].rgb, 1.15),
          top = b.y + b.h,
          bottom = at.y - bh / 2;
        for (let k = 0; k < 7; k++) {
          const y = top + ((game.ticks * 3 + k * 9) % Math.max(4, bottom - top));
          g.beginFill(colour, 0.9).drawRect(at.x - 3 + ((k * 5) % 6), y, 2.5, 2.5).endFill();
        }
      });
      sparkle.update(seconds);
      const share = Math.floor(collectedShare(game) * 100);
      if (share !== shownShare) {
        shownShare = share;
        void count.set(hooks.words('collected', { percent: share }));
      }
    }
  };
}
