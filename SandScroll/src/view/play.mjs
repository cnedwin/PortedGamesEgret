// 一局的画面：上面是正在着色的手卷，中间是紫檀框的沙盘，下面（横屏时在右边）是放三块积木的托盘。手指按住托盘里的
// 一块拖到沙盘上方，沙盘里会出现它的影子和一道往下照的光，标出它会落到哪里；松手就落下。轻点一块是把它转九十度。
// 键盘：1/2/3 选一块，左右移，上转，空格或下放。消掉的沙化成光点飞向手卷，手卷的颜色跟着往右染。
// The view of a round: the handscroll taking its colour at the top, the rosewood tray of sand in the middle, and the
// dish of three pieces below it (at the right on a wide screen). Hold a piece in the dish and drag it over the sand:
// its shadow shows at the top of the tray with a shaft of light down to where it will land; let go and it falls. A tap
// on a piece turns it a quarter. Keys: 1/2/3 pick a piece, left and right move it, up turns it, Space or down drops
// it. Cleared sand flies to the scroll as sparks, and the scroll's colour spreads further to the right.
import { Bitmap, DisplayObjectContainer, Sprite, animate } from '@egret/engine';
import { createParticleEmitter } from '@egret/engine/particles';
import { BOARD, CRACKER, DANGER_GRACE, PIGMENTS, clampColumn, dropPiece, fireCracker, progress, step, surfaceAt, takeChanges, turnPiece } from '../sim/sand.mjs';
import { LANDSCAPE_TOUCH_BUTTON_HEIGHT } from '../ui/kit.mjs';
import { createBoardView, piecePixels } from './board.mjs';
import { createScrollPainter, mountScroll } from './scroll.mjs';

const hex = ([r, g, b], k = 1) => (Math.min(255, Math.round(r * k)) << 16) | (Math.min(255, Math.round(g * k)) << 8) | Math.min(255, Math.round(b * k));
const GOLD = 0xe2b866,
  ROSEWOOD = 0x3a1f12,
  INKWOOD = 0x1a0d07;
const NOTES = [0, 2, 4, 7, 9, 12, 14, 16]; // a pentatonic climb for chains
const MAX_QUEUED = 2;
// A round survives a view rebuild during rotation. Keep only its accepted drops for that same lifetime.
const roundPlacements = new WeakMap();

/** Where everything goes on a tall or a wide stage. */
export function playLayout(width, height, touch = false) {
  const { cols, rows } = BOARD;
  if (height > width) {
    const scale = 2,
      w = cols * scale,
      h = rows * scale;
    return {
      tall: true,
      scale,
      board: { x: Math.round((width - w) / 2), y: 198, w, h },
      scroll: { x: 30, y: 20, w: width - 60, h: Math.round((width - 60) / 4) },
      score: { x: 30, y: 158 },
      share: { x: width - 124, y: 158 },
      cracker: { x: 178, y: 150, w: 116, h: 40 },
      tray: { x: 14, y: 820, w: width - 28, h: 128, vertical: false },
      pause: { x: width - 108, y: 150, width: 88, height: 44 }
    };
  }
  const scale = 1.6,
    w = cols * scale,
    h = rows * scale,
    buttonHeight = touch ? LANDSCAPE_TOUCH_BUTTON_HEIGHT : 44,
    buttonY = height - 26 - buttonHeight;
  return {
    tall: false,
    scale,
    board: { x: Math.round((width - w) / 2), y: 40, w, h },
    scroll: { x: 22, y: 64, w: 276, h: 69 },
    score: { x: 24, y: 160 },
    share: { x: 298, y: 160 },
    cracker: { x: 162, y: buttonY, w: 136, h: buttonHeight },
    tray: { x: Math.round((width + w) / 2) + 28, y: 40, w: width - Math.round((width + w) / 2) - 50, h: h, vertical: true },
    pause: { x: 22, y: buttonY, width: 128, height: buttonHeight }
  };
}

const css = (colour, alpha = 1) => `rgba(${(colour >> 16) & 255}, ${(colour >> 8) & 255}, ${colour & 255}, ${alpha})`;

/** The rosewood frame and the dark lacquer inside it, with gold marks every block across the top (Canvas 2D). */
function drawTrayFrame(g, b, scale) {
  const pad = 14;
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
  g.strokeStyle = css(GOLD, 0.75);
  g.lineWidth = 1.5;
  g.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);
  const lacquer = g.createLinearGradient(0, b.y, 0, b.y + b.h);
  lacquer.addColorStop(0, '#170d08');
  lacquer.addColorStop(0.6, '#1d110a');
  lacquer.addColorStop(1, '#26160c');
  g.fillStyle = lacquer;
  g.fillRect(b.x, b.y, b.w, b.h);
  // The marks of each block's width along the top edge, and a faint thread down from each.
  for (let x = 0; x <= BOARD.cols; x += BOARD.block) {
    const major = x % (BOARD.block * 5) === 0;
    g.fillStyle = css(GOLD, major ? 0.55 : 0.3);
    g.fillRect(b.x + x * scale - 1, b.y - 6, 2, major ? 6 : 4);
    if (x > 0 && x < BOARD.cols) {
      g.fillStyle = 'rgba(255, 255, 255, 0.025)';
      g.fillRect(b.x + x * scale, b.y, 1, b.h);
    }
  }
}

/** A dish in the tray: a carved rosewood plate with a gold line, brighter when chosen, and a turning arrow (Canvas 2D). */
function drawDish(g, x, y, w, h, chosen) {
  g.fillStyle = 'rgba(0, 0, 0, 0.3)';
  g.beginPath();
  g.roundRect(x + 8, y + 10, w - 12, h - 12, 14);
  g.fill();
  const face = g.createLinearGradient(0, y + 4, 0, y + h - 4);
  face.addColorStop(0, chosen ? '#6a3a22' : '#4a2817');
  face.addColorStop(1, chosen ? '#3a1f12' : '#24130a');
  g.fillStyle = face;
  g.beginPath();
  g.roundRect(x + 5, y + 4, w - 10, h - 10, 14);
  g.fill();
  g.strokeStyle = css(GOLD, chosen ? 0.95 : 0.45);
  g.lineWidth = chosen ? 2.5 : 1.2;
  g.beginPath();
  g.roundRect(x + 10, y + 9, w - 20, h - 20, 10);
  g.stroke();
  const cx = x + w - 24,
    cy = y + 24;
  g.strokeStyle = css(GOLD, 0.7);
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, 7, 0, 1.5 * Math.PI);
  g.stroke();
  g.fillStyle = css(GOLD, 0.8);
  g.beginPath();
  g.moveTo(cx - 1, cy - 11);
  g.lineTo(cx + 5, cy - 7);
  g.lineTo(cx - 1, cy - 3);
  g.fill();
}

/** A soft round dot, for sparks. */
function dotPixels(size = 12) {
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2),
        a = Math.max(0, 1 - d) ** 1.6,
        o = (y * size + x) * 4;
      out[o] = out[o + 1] = out[o + 2] = 255;
      out[o + 3] = Math.round(a * 255);
    }
  return out;
}

/**
 * Build the round's view under `root`. `kit` makes words; `hooks` tells the screen when the round ends. Returns
 * `update(seconds)` for each frame and the controls the keys use.
 */
export async function createPlayView(app, scope, root, kit, game, hooks) {
  const { width, height } = app.stage,
    L = playLayout(width, height, app.touch),
    b = L.board,
    S = L.scale,
    T = L.tray,
    slotW = T.vertical ? T.w : Math.floor(T.w / 3),
    slotH = T.vertical ? Math.floor(T.h / 3) : T.h,
    trayScale = Math.min(1.5, (Math.min(slotW, slotH) - 30) / (BOARD.block * 4)),
    textures = (w, h, px) => app.game.textureFromPixels(w, h, px);
  const queued = roundPlacements.get(game) ?? [];
  roundPlacements.set(game, queued);
  let paused = false;

  // ——— What never moves: the scroll on its mount, the frame of the tray and the dishes. The page paints them under the
  // engine's canvas (app.backdrop), again only when the scroll takes more colour or a dish is chosen. ———
  let painter = createScrollPainter(game.painting, { width: 960, height: 240 });
  painter.paint(progress(game));
  let shownShare = progress(game),
    sinceScroll = 0;
  const looks = ['', '', ''];
  app.backdrop.set((g) => {
    mountScroll(g, L.scroll);
    g.drawImage(painter.canvas, L.scroll.x, L.scroll.y, L.scroll.w, L.scroll.h);
    drawTrayFrame(g, b, S);
    for (let k = 0; k < 3; k++) {
      const x = L.tray.x + (L.tray.vertical ? 0 : k * slotW),
        y = L.tray.y + (L.tray.vertical ? k * slotH : 0);
      drawDish(g, x, y, slotW, slotH, looks[k] === 'chosen');
    }
  });

  // ——— The tray of sand. ———
  const field = root.addChild(scope.use(new DisplayObjectContainer()));
  field.x = b.x;
  field.y = b.y;
  const shaft = field.addChild(scope.use(new Sprite()));
  const board = await createBoardView(scope, field, game, textures, { scale: S });
  scope.use(board);
  const queueTargets = field.addChild(scope.use(new Sprite()));
  const danger = field.addChild(scope.use(new Sprite()));
  const fx = field.addChild(scope.use(new DisplayObjectContainer()));
  const air = field.addChild(scope.use(new DisplayObjectContainer()));
  // A tap on the sand while a firecracker is lit sets it off there; the ring shows where.
  const aim = field.addChild(scope.use(new Sprite()));
  aim.touchEnabled = true;
  aim.hitArea = { x: 0, y: 0, width: b.w, height: b.h };

  // ——— Sparks: one emitter a pigment for the dust of a landing and the burst of a run. ———
  const dot = await textures(12, 12, dotPixels(12));
  const bursts = {};
  for (let pigment = 1; pigment < PIGMENTS.length; pigment++) {
    const rgb = PIGMENTS[pigment].rgb;
    const emitter = scope.use(
      createParticleEmitter({
        texture: dot,
        maxParticles: 500,
        rate: 0,
        lifetime: [0.45, 1.0],
        speed: [40, 190],
        angle: [200, 340],
        gravity: { x: 0, y: 420 },
        drag: 0.6,
        size: 5,
        startScale: [0.5, 1.1],
        endScale: 0.15,
        startColor: hex(rgb, 1.45),
        endColor: hex(rgb, 0.9),
        startAlpha: 1,
        endAlpha: 0,
        shape: { kind: 'rectangle', width: b.w / S, height: 6 },
        blendMode: 'add',
        seed: 17 + pigment
      })
    );
    emitter.display.scaleX = emitter.display.scaleY = 1;
    fx.addChild(emitter.display);
    bursts[pigment] = emitter;
  }
  // The firecracker's sparks: gold to red, out in every direction from the blast.
  const sparks = scope.use(
    createParticleEmitter({
      texture: dot,
      maxParticles: 400,
      rate: 0,
      lifetime: [0.35, 0.9],
      speed: [80, 320],
      angle: [0, 360],
      gravity: { x: 0, y: 260 },
      drag: 1.2,
      size: 6,
      startScale: [0.6, 1.3],
      endScale: 0.1,
      startColor: 0xfff0b0,
      endColor: 0xd8402a,
      startAlpha: 1,
      endAlpha: 0,
      shape: { kind: 'circle', radius: CRACKER.radius * 0.5 },
      blendMode: 'add',
      seed: 91
    })
  );
  fx.addChild(sparks.display);
  bursts.sparks = sparks;
  fx.scaleX = fx.scaleY = S;

  // ——— The pieces: in the dish, in the air and as a shadow over the sand. ———
  const leases = new Map();
  const pieceTexture = (piece) => {
    const key = `${piece.id}:${piece.turns}`;
    if (!leases.has(key)) {
      const { w, h, pixels } = piecePixels(piece);
      leases.set(key, textures(w, h, pixels));
    }
    return leases.get(key);
  };
  // A texture is let go only when no piece and no bitmap uses it any more.
  const forget = () => {
    const keep = new Set([...game.tray, game.falling?.piece].filter(Boolean).map((p) => `${p.id}:${p.turns}`));
    for (const key of [ghostKey, fallingKey, ...slots.map((slot) => slot.key)]) keep.add(key);
    for (const [key, lease] of leases)
      if (!keep.has(key)) {
        leases.delete(key);
        void lease.then((l) => l.release()).catch(() => {});
      }
  };
  const ghost = air.addChild(scope.use(new DisplayObjectContainer()));
  const falling = air.addChild(scope.use(new DisplayObjectContainer()));
  ghost.scaleX = ghost.scaleY = falling.scaleX = falling.scaleY = S;
  let ghostBitmap = null,
    fallingBitmap = null,
    ghostKey = '',
    fallingKey = '';
  async function show(holder, which, piece) {
    const key = `${piece.id}:${piece.turns}`;
    const lease = await pieceTexture(piece);
    if (which === 'ghost') {
      if (ghostKey === key) return;
      ghostKey = key;
      if (ghostBitmap) ghostBitmap.textureLease = lease;
      else ghostBitmap = holder.addChild(scope.use(new Bitmap(lease)));
    } else {
      if (fallingKey === key) return;
      fallingKey = key;
      if (fallingBitmap) fallingBitmap.textureLease = lease;
      else fallingBitmap = holder.addChild(scope.use(new Bitmap(lease)));
    }
  }

  const dish = root.addChild(scope.use(new DisplayObjectContainer()));
  const slots = [0, 1, 2].map((k) => {
    const holder = dish.addChild(scope.use(new DisplayObjectContainer()));
    holder.x = T.x + (T.vertical ? 0 : k * slotW);
    holder.y = T.y + (T.vertical ? k * slotH : 0);
    const plate = holder.addChild(scope.use(new Sprite()));
    plate.touchEnabled = true;
    plate.hitArea = { x: 0, y: 0, width: slotW, height: slotH };
    const art = holder.addChild(scope.use(new DisplayObjectContainer()));
    const reservation = holder.addChild(scope.use(new Sprite()));
    reservation.visible = false;
    return { k, holder, plate, art, reservation, bitmap: null, key: '' };
  });
  function paintSlot(slot, { chosen = false, lifted = false } = {}) {
    // The dish is on the page; only the piece dims here while it is lifted out.
    slot.art.alpha = slot.reservation.visible || lifted ? 0.3 : 1;
    const look = chosen ? 'chosen' : '';
    if (looks[slot.k] !== look) {
      looks[slot.k] = look;
      app.backdrop.repaint();
    }
  }
  async function refreshSlot(slot) {
    const piece = game.tray[slot.k];
    const key = `${piece.id}:${piece.turns}`;
    if (slot.key === key) return;
    slot.key = key;
    const lease = await pieceTexture(piece);
    if (slot.key !== key) return;
    if (slot.bitmap) slot.bitmap.textureLease = lease;
    else slot.bitmap = slot.art.addChild(scope.use(new Bitmap(lease)));
    const w = lease.value.width,
      h = lease.value.height;
    slot.art.scaleX = slot.art.scaleY = trayScale;
    slot.art.x = (slotW - w * trayScale) / 2;
    slot.art.y = (slotH - h * trayScale) / 2 + 2;
  }

  // ——— Words. ———
  const scoreLabel = await kit.label(root, '', { x: L.score.x, y: L.score.y, size: 20, weight: 700, color: 0xf3e3c0 });
  const shareLabel = await kit.label(root, '', { x: L.share.x, y: L.share.y + 2, size: 17, color: GOLD, align: 'right' });
  const chainLabel = await kit.label(root, ' ', { x: b.x, y: b.y + b.h * 0.3, size: 34, weight: 800, color: 0xfff0c8, align: 'center', width: b.w });
  const pointsLabel = await kit.label(root, ' ', { x: b.x, y: b.y + b.h * 0.3 + 44, size: 22, weight: 700, color: GOLD, align: 'center', width: b.w });
  const warnLabel = await kit.label(root, ' ', { x: b.x, y: b.y + BOARD.danger * S + 8, size: 18, weight: 700, color: 0xff8a6a, align: 'center', width: b.w });
  const announceLabel = await kit.label(root, ' ', { x: b.x, y: b.y + b.h * 0.16, size: 26, weight: 700, color: 0xf1d79a, align: 'center', width: b.w });
  chainLabel.display.alpha = pointsLabel.display.alpha = warnLabel.display.alpha = announceLabel.display.alpha = 0;
  let announceTime = 0;
  const announce = (words) => {
    void announceLabel.set(words);
    announceLabel.display.alpha = 1;
    announceTime = 2.2;
  };

  const guideBox = L.tall ? { x: b.x + 8, y: b.y + 8, w: b.w - 16, h: 55 } : { x: 22, y: 325, w: 276, h: 77 };
  const guide = root.addChild(scope.use(new DisplayObjectContainer()));
  const guideBacking = guide.addChild(scope.use(new Sprite()));
  guideBacking.graphics.lineStyle(1, GOLD, 0.65).beginFill(INKWOOD, 0.92)
    .drawRoundRect(guideBox.x, guideBox.y, guideBox.w, guideBox.h, 8, 8).endFill();
  const guideLabel = await kit.label(guide, ' ', {
    x: guideBox.x + 6, y: guideBox.y + 7, width: guideBox.w - 12, align: 'center',
    size: 15, color: 0xffe5aa, weight: 600, lineHeight: 20
  });
  const walls = field.addChild(scope.use(new Sprite()));
  for (const x of [3, b.w - 6]) {
    walls.graphics.beginFill(GOLD, 0.75).drawRect(x, b.h - 50, 3, 44).endFill();
  }
  let guideKey;
  let firstClear = game.bestChain > 0;
  let firstClearFeedback = 0;
  function refreshGuide() {
    const key = game.over ? '' : firstClearFeedback > 0 ? 'playGuideDone' : firstClear ? '' :
      game.pieces > 0 ? 'playGuideConnect' : L.tall ? 'playGuideTall' : 'playGuideWide';
    if (key === guideKey) return;
    guideKey = key;
    guide.visible = Boolean(key);
    walls.visible = key === 'playGuideConnect';
    if (key) void guideLabel.set(hooks.words(key));
  }
  refreshGuide();

  // ——— The firecracker: a button lights one, a tap on the sand (or F) sets it off. ———
  let armed = false;
  const crackerText = () => hooks.words(L.tall ? 'crackerShort' : 'cracker', { n: game.crackers });
  const crackerButton = await kit.button({
    x: L.cracker.x,
    y: L.cracker.y,
    width: L.cracker.w,
    height: L.cracker.h,
    text: crackerText(),
    name: hooks.words('cracker', { n: game.crackers }),
    small: true,
    container: root,
    onActivate: () => arm(!armed)
  });
  let shownCrackers = game.crackers;
  function arm(on) {
    armed = on && !paused && game.crackers > 0 && !game.over;
    void crackerButton.setText(armed ? hooks.words('crackerAim') : crackerText());
    crackerButton.setEnabled(!paused && game.crackers > 0);
    drawAim(null);
  }
  function drawAim(at) {
    const g = aim.graphics;
    g.clear();
    if (!armed) return;
    g.lineStyle(2, 0xff9a5a, 0.9).drawRect(1, 1, b.w - 2, b.h - 2).lineStyle(0);
    if (at) g.lineStyle(2, 0xffd08a, 0.95).drawCircle(at.x * S, at.y * S, CRACKER.radius * S).lineStyle(0);
  }
  function boom(x, y) {
    if (fireCracker(game, x, y) >= 0) arm(false);
  }
  arm(false);
  let shownScore = -1,
    shownPercent = -1;
  const refreshWords = () => {
    if (game.score !== shownScore) {
      shownScore = game.score;
      void scoreLabel.set(hooks.words('score', { score: game.score.toLocaleString(hooks.locale) }));
    }
    const percent = Math.floor(progress(game) * 100);
    if (percent !== shownPercent) {
      shownPercent = percent;
      void shareLabel.set(hooks.words('share', { percent }));
    }
  };
  refreshWords();

  // ——— Holding, dragging and dropping. ———
  const hold = { slot: null, session: null, startX: 0, startY: 0, moved: false, column: 0, keys: false };
  const widthOf = (piece) => (Math.max(...piece.blocks.map(([x]) => x)) + 1) * BOARD.block;
  const columnAt = (globalX, piece) => {
    const w = widthOf(piece);
    return clampColumn((globalX - b.x) / S - w / 2, w);
  };
  const isReserved = (slot) => queued.some((drop) => drop.slot === slot);
  const rejectDrop = (key) => {
    announce(hooks.words(key));
    app.sound.play('warn', { volume: 0.35 });
  };
  const drop = (slot, column) => {
    if (dropPiece(game, slot, column)) app.sound.play('drop', { volume: 0.7 });
  };
  function drawQueueTargets() {
    const g = queueTargets.graphics;
    g.clear();
    for (const [index, { column, width, tint }] of queued.entries()) {
      const x = column * S;
      const surface = surfaceAt(game, column + Math.floor(width / 2));
      const y = Math.max(12, surface * S - 9 - index * 11);
      g.beginFill(INKWOOD, 0.9).drawRect(x, y - 3, width * S, 9).endFill();
      g.beginFill(tint, 1).drawRect(x, y, width * S, 3);
      for (let dot = 0; dot <= index; dot++) g.drawCircle(x + 8 + dot * 10, y - 7, 3);
      g.endFill();
    }
  }
  function drawReservations() {
    for (const slot of slots) {
      slot.reservation.visible = false;
      slot.reservation.graphics.clear();
    }
    for (const [index, { slot, tint }] of queued.entries()) {
      const marker = slots[slot].reservation;
      marker.visible = true;
      marker.graphics.beginFill(INKWOOD, 0.9).drawRoundRect(10, 10, 23 + index * 10, 18, 8, 8).endFill();
      marker.graphics.beginFill(tint);
      for (let dot = 0; dot <= index; dot++) marker.graphics.drawCircle(21 + dot * 10, 19, 3.5);
      marker.graphics.endFill();
    }
    drawQueueTargets();
  }
  function release(slot, column) {
    if (paused || game.over) return;
    if (isReserved(slot)) return rejectDrop('placementReserved');
    if (!game.falling && !queued.length) return drop(slot, column);
    if (queued.length >= MAX_QUEUED) return rejectDrop('placementFull');
    const piece = game.tray[slot];
    queued.push({ slot, column, width: widthOf(piece), tint: hex(PIGMENTS[piece.pigment].rgb, 1.6) });
    drawReservations();
    announce(hooks.words('placementQueued', { count: queued.length }));
    app.sound.play('turn', { volume: 0.42, rate: 1.35 });
  }
  function turn(slot) {
    if (isReserved(slot)) return rejectDrop('placementReserved');
    if (!paused && turnPiece(game, slot)) {
      app.sound.play('turn');
      void refreshSlot(slots[slot]);
    }
  }
  const overSand = ({ globalX: x, globalY: y }) =>
    x >= b.x - 12 && x <= b.x + b.w + 12 && y >= b.y - 12 && y <= b.y + b.h + 12;
  const clearHold = () => Object.assign(hold, { slot: null, session: null, moved: false, over: false });
  kit.own({
    dispose: app.game.pointer.observe(({ kind, contact, target }) => {
      if (paused) return;
      if (kind === 'begin' && armed && target === aim) {
        boom((contact.globalX - b.x) / S, (contact.globalY - b.y) / S);
        return;
      }
      if (kind === 'begin' && hold.session === null) {
        const slot = slots.find((s) => s.plate === target);
        if (!slot || game.over) return;
        if (isReserved(slot.k)) return rejectDrop('placementReserved');
        Object.assign(hold, { slot: slot.k, session: contact.session.id, startX: contact.globalX, startY: contact.globalY, moved: false, over: false });
        hold.column = columnAt(contact.globalX, game.tray[slot.k]);
        app.sound.play('pick', { volume: 0.6 });
      } else if (contact.session.id === hold.session) {
        if (kind === 'move') {
          if (!hold.moved && Math.hypot(contact.globalX - hold.startX, contact.globalY - hold.startY) > 12) hold.moved = true;
          if (hold.moved) {
            hold.over = overSand(contact);
            hold.column = columnAt(contact.globalX, game.tray[hold.slot]);
          }
        } else if (kind === 'end') {
          const dragged = hold.moved || Math.hypot(contact.globalX - hold.startX, contact.globalY - hold.startY) > 12;
          if (!dragged) turn(hold.slot);
          else if (overSand(contact)) release(hold.slot, columnAt(contact.globalX, game.tray[hold.slot]));
          clearHold();
        } else if (kind === 'cancel') clearHold();
      }
    })
  });

  // Keys: a chosen slot and a column, moved with the arrows.
  const keys = { slot: 0, column: (BOARD.cols - 40) / 2, active: false };
  const controls = {
    choose(slot) {
      if (paused || slot < 0 || slot > 2) return;
      keys.slot = slot;
      if (isReserved(slot)) {
        keys.active = false;
        return rejectDrop('placementReserved');
      }
      keys.active = true;
      app.sound.play('pick', { volume: 0.5 });
    },
    move(direction, seconds) {
      if (paused || isReserved(keys.slot)) return;
      keys.active = true;
      keys.column += direction * 150 * seconds;
    },
    turn() {
      if (paused) return;
      keys.active = true;
      turn(keys.slot);
    },
    cracker() {
      if (paused) return;
      // F: set off a firecracker over the chosen column, a little under the sand's surface there.
      const x = Math.max(0, Math.min(BOARD.cols - 1, Math.round(keys.column + 20)));
      armed = game.crackers > 0;
      boom(x, Math.min(BOARD.rows - 1, surfaceAt(game, x) + CRACKER.radius * 0.6));
    },
    drop() {
      if (paused) return;
      const w = widthOf(game.tray[keys.slot]);
      release(keys.slot, clampColumn(keys.column, w));
      keys.active = !isReserved(keys.slot);
    }
  };

  // ——— What happened: sound, sparks, words. ———
  let chainTime = 0,
    warnShown = false;
  const flyers = [];
  function sparkToScroll(x, y, colour) {
    const spark = root.addChild(scope.use(new Sprite()));
    spark.graphics.beginFill(colour, 0.5).drawCircle(0, 0, 7).endFill().beginFill(0xfff4d0, 1).drawCircle(0, 0, 3).endFill();
    spark.x = x;
    spark.y = y;
    const front = L.scroll.x + Math.min(0.98, progress(game)) * L.scroll.w;
    flyers.push({ spark, x0: x, y0: y, x1: front + (Math.random() - 0.5) * 30, y1: L.scroll.y + L.scroll.h * (0.3 + Math.random() * 0.4), t: -Math.random() * 0.25, d: 0.7 + Math.random() * 0.3 });
  }
  function handle(e) {
    if (e.kind === 'land') {
      const emitter = bursts[e.pigment];
      if (emitter && !app.reducedMotion) {
        emitter.display.x = 0;
        emitter.x = e.x + e.w / 2;
        emitter.y = Math.min(BOARD.rows - 2, e.y + e.h);
        emitter.burst(18);
      }
      app.sound.play('land', { volume: 0.55 + Math.min(0.45, e.w / 160), rate: 0.9 + Math.random() * 0.2 });
    } else if (e.kind === 'shine') {
      const note = NOTES[Math.min(NOTES.length - 1, e.chain - 1)];
      app.sound.play('shine', { rate: 2 ** (note / 12) });
      if (e.chain >= 2) {
        void chainLabel.set(hooks.words('chain', { chain: e.chain }));
        chainLabel.display.alpha = 1;
        chainTime = 1.4;
      }
      void pointsLabel.set('+' + e.points.toLocaleString(hooks.locale));
      pointsLabel.display.alpha = 1;
      chainTime = Math.max(chainTime, 1.1);
      app.vibrate?.(30);
      // A big run or a chain shakes the tray a little.
      if (e.chain >= 2 || e.size > 6000) shake = Math.max(shake, 0.18 + 0.06 * Math.min(4, e.chain));
    } else if (e.kind === 'clear') {
      if (!firstClear) {
        firstClear = true;
        firstClearFeedback = 2.4;
      }
      const emitter = bursts[e.pigment];
      if (emitter && !app.reducedMotion) {
        emitter.x = BOARD.cols / 2;
        emitter.y = e.cy;
        emitter.burst(Math.round(Math.min(260, 60 + e.size / 30)));
      }
      app.sound.play('clear', { volume: 0.8 });
      const colour = hex(PIGMENTS[e.pigment].rgb, 1.3);
      if (!app.reducedMotion) for (let k = 0; k < 7; k++) sparkToScroll(b.x + (BOARD.cols * (0.15 + k * 0.12)) * S, b.y + e.cy * S, colour);
    } else if (e.kind === 'boom') {
      if (!app.reducedMotion) {
        sparks.x = e.x;
        sparks.y = e.y;
        sparks.burst(160);
      }
      app.sound.play('boom');
      shake = 0.5;
      app.vibrate?.(60);
    } else if (e.kind === 'cracker') {
      announce(hooks.words('crackerGot'));
      app.sound.play('turn', { rate: 1.5 });
    } else if (e.kind === 'pigment') {
      announce(hooks.words('newPigment', { name: hooks.words('pigment' + e.pigment) }));
      app.sound.play('shine', { rate: 0.75 });
    } else if (e.kind === 'painted') {
      // The endless tray: the finished painting is shown whole a moment, then the next one starts as ink.
      announce(hooks.words('paintedOne', { name: hooks.words('scroll_' + game.level.paintings[(e.paintings - 1) % game.level.paintings.length]) }));
      app.sound.play('won', { volume: 0.7 });
      celebrate();
      painter.paint(1);
      app.backdrop.repaint();
      nextPainting = 1.6;
    } else if (e.kind === 'won') {
      celebrate();
      hooks.ended(true);
    } else if (e.kind === 'lost') {
      hooks.ended(false);
    }
  }
  /** Sand of every pigment bursting up over the whole tray. */
  function celebrate() {
    shake = Math.max(shake, 0.35);
    if (app.reducedMotion) return;
    for (const pigment of game.pigments)
      for (let k = 0; k < 4; k++) {
        const emitter = bursts[pigment];
        emitter.x = BOARD.cols * (0.15 + k * 0.23);
        emitter.y = BOARD.rows * 0.7;
        emitter.burst(50);
      }
  }
  let shake = 0,
    nextPainting = 0;

  drawReservations();
  for (const slot of slots) {
    paintSlot(slot);
    await refreshSlot(slot);
  }

  let pulse = 0;
  return {
    pauseBounds: L.pause,
    controls,
    hold,
    setPaused(on) {
      paused = on;
      if (on) {
        clearHold();
        keys.active = false;
      }
      arm(false);
    },
    get paused() {
      return paused;
    },
    update(seconds) {
      if (!paused) step(game, seconds);
      if (game.over && queued.length) {
        queued.length = 0;
        drawReservations();
      } else if (!paused && queued.length && !game.falling) {
        const next = queued.shift();
        drop(next.slot, next.column);
        drawReservations();
      }
      const { events, rows } = takeChanges(game);
      board.update(rows);
      if (rows && queued.length) drawQueueTargets();
      for (const e of events) handle(e);
      if (game.crackers !== shownCrackers) {
        shownCrackers = game.crackers;
        arm(armed && game.crackers > 0);
      }
      // The shake: a few stage units, dying away; none when motion is reduced.
      if (shake > 0) {
        shake = Math.max(0, shake - seconds);
        const k = app.reducedMotion ? 0 : shake * 14;
        field.x = b.x + (Math.random() - 0.5) * k;
        field.y = b.y + (Math.random() - 0.5) * k;
      } else if (field.x !== b.x || field.y !== b.y) {
        field.x = b.x;
        field.y = b.y;
      }
      if (announceTime > 0) {
        announceTime -= seconds;
        announceLabel.display.alpha = Math.min(1, announceTime / 0.5);
      }
      if (nextPainting > 0 && (nextPainting -= seconds) <= 0) {
        painter = createScrollPainter(game.painting, { width: 960, height: 240 });
        shownShare = 0;
        painter.paint(progress(game));
        app.backdrop.repaint();
      }
      if (events.some((e) => e.kind === 'drop' || e.kind === 'land')) {
        forget();
        for (const slot of slots) void refreshSlot(slot);
      }

      // The piece in the air.
      if (game.falling) {
        void show(falling, 'falling', game.falling.piece);
        falling.visible = true;
        falling.x = game.falling.x * S;
        falling.y = Math.floor(game.falling.y) * S;
      } else falling.visible = false;

      // The shadow and the shaft of the piece being placed.
      const placing = hold.slot !== null ? (hold.over ? { slot: hold.slot, column: hold.column } : null) :
        keys.active && !game.over && !isReserved(keys.slot) ? { slot: keys.slot, column: null } : null;
      const sg = shaft.graphics;
      if (!placing && shaft.drawn) {
        sg.clear();
        shaft.drawn = '';
      }
      if (placing) {
        const piece = game.tray[placing.slot],
          w = widthOf(piece),
          h = (Math.max(...piece.blocks.map(([, y]) => y)) + 1) * BOARD.block;
        if (placing.column === null) placing.column = keys.column = clampColumn(keys.column, w);
        void show(ghost, 'ghost', piece);
        ghost.visible = true;
        ghost.alpha = game.falling ? 0.35 : 0.7;
        ghost.x = placing.column * S;
        ghost.y = 0;
        // Where the sand under it begins, column by column.
        let surface = BOARD.rows;
        for (let cx = 0; cx < w; cx += 2) {
          let y = h;
          const x = placing.column + cx;
          while (y < BOARD.rows && !game.color[y * BOARD.cols + x]) y++;
          surface = Math.min(surface, y);
        }
        // A faint shaft with bright edges down to the sand, and a mark where the piece will meet it.
        const drawn = `${piece.id}:${piece.turns}:${placing.column}:${surface}`;
        if (shaft.drawn !== drawn) {
        shaft.drawn = drawn;
        sg.clear();
        const tint = hex(PIGMENTS[piece.pigment].rgb, 1.3),
          x0 = placing.column * S,
          x1 = (placing.column + w) * S,
          y0 = h * S,
          y1 = surface * S;
        if (y1 > y0) {
          sg.beginFill(tint, 0.045).drawRect(x0, y0, x1 - x0, y1 - y0).endFill();
          sg.beginFill(tint, 0.3).drawRect(x0, y0, 1.5, y1 - y0).drawRect(x1 - 1.5, y0, 1.5, y1 - y0).endFill();
        }
        sg.beginFill(tint, 0.85).drawRect(x0 - 3, y1 - 3, x1 - x0 + 6, 3).endFill();
        }
        for (const slot of slots) paintSlot(slot, { chosen: slot.k === placing.slot && hold.slot === null, lifted: slot.k === hold.slot && hold.moved });
      } else {
        ghost.visible = false;
        for (const slot of slots) paintSlot(slot);
      }

      // The line at the top: quiet, then red and beating as sand stays over it.
      pulse += seconds;
      const threat = game.danger / DANGER_GRACE,
        level = threat > 0 ? Math.round(threat * 8) + 1 : 0;
      if (danger.level !== level) {
        danger.level = level;
        const dg = danger.graphics;
        dg.clear();
        if (threat > 0) dg.beginFill(0xd8402a, 0.1 + 0.2 * threat).drawRect(0, 0, b.w, BOARD.danger * S).endFill();
        for (let x = 0; x < b.w; x += 14) dg.beginFill(threat > 0 ? 0xff7a5a : 0xc99a5a, threat > 0 ? 0.9 : 0.35).drawRect(x, BOARD.danger * S, 8, 1.5).endFill();
      }
      danger.alpha = threat > 0 ? 0.65 + 0.35 * Math.sin(pulse * 10) : 1;
      const warn = threat > 0.15;
      if (warn !== warnShown) {
        warnShown = warn;
        void warnLabel.set(warn ? hooks.words('danger') : ' ');
        if (warn) app.sound.play('warn');
      }
      warnLabel.display.alpha = warn ? 0.6 + 0.4 * Math.sin(pulse * 10) : 0;

      // Words that rise and fade.
      if (chainTime > 0) {
        chainTime -= seconds;
        const a = Math.min(1, chainTime / 0.4);
        chainLabel.display.alpha = Math.min(chainLabel.display.alpha, a);
        pointsLabel.display.alpha = a;
        pointsLabel.display.y = b.y + b.h * 0.3 + 44 - (1.1 - Math.max(0, chainTime)) * 20;
      }
      refreshWords();
      if (!paused) firstClearFeedback = Math.max(0, firstClearFeedback - seconds);
      refreshGuide();

      // Sparks in flight to the scroll.
      for (let k = flyers.length - 1; k >= 0; k--) {
        const f = flyers[k];
        f.t += seconds;
        const p = Math.max(0, Math.min(1, f.t / f.d)),
          e = p * p * (3 - 2 * p);
        f.spark.x = f.x0 + (f.x1 - f.x0) * e;
        f.spark.y = f.y0 + (f.y1 - f.y0) * e - Math.sin(Math.PI * e) * 60;
        f.spark.alpha = p < 0.85 ? 1 : (1 - p) / 0.15;
        if (p >= 1) {
          f.spark.parent?.removeChild(f.spark);
          flyers.splice(k, 1);
        }
      }
      for (const emitter of Object.values(bursts)) emitter.update(seconds);

      // The scroll takes its colour a little at a time.
      const share = progress(game);
      sinceScroll += seconds;
      if (nextPainting <= 0 && shownShare < share && sinceScroll > 0.12) {
        sinceScroll = 0;
        shownShare = Math.min(share, shownShare + Math.max(0.004, (share - shownShare) * 0.35));
        if (painter.paint(shownShare)) app.backdrop.repaint();
      }
    }
  };
}
