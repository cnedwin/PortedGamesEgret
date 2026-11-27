// 桌邊資料與聽牌提示是引擎節點；桌面座標只用來對齊中框和牌張，座位資料由安全區定位。
// The table HUD is drawn by the engine. Board coordinates align the centre and the tiles; safe pins place the seats.
import { Bitmap } from '@egret/engine';
import { getLanguage, t, tileName } from './i18n.mjs';
import { liveLeft } from './sim/game.mjs';
import { CELL, frameOf } from './tiles.mjs';
import { STAGE } from './layout.mjs';

const GOLD = 0xd7a674, SOFT = 0xffda9e, PAPER = 0xe9dcc0, WHITE = 0xfff2dc;
const PORTRAIT = [0, 0, 2, 1];
const SERIF = 'serif', SANS = 'sans-serif';
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function setBoardTransform(node, board) {
  node.x = board.x;
  node.y = board.y;
  node.rotation = board.rotation;
  node.scaleX = node.scaleY = board.scale;
}

function boundsOf(node) {
  const b = node.getBounds();
  const points = [node.localToGlobal(b.x, b.y), node.localToGlobal(b.x + b.width, b.y),
    node.localToGlobal(b.x, b.y + b.height), node.localToGlobal(b.x + b.width, b.y + b.height)];
  const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y));
  return { x, y, width: Math.max(...points.map(p => p.x)) - x, height: Math.max(...points.map(p => p.y)) - y };
}

/** Reuse the original strip's exact three crops and its CSS-style transparent fade once, not per frame. */
async function portraitAtlas(game) {
  const image = new Image();
  image.src = new URL('../assets/seat-portraits.webp', import.meta.url).href;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const g = canvas.getContext('2d');
  g.drawImage(image, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const fade = g.createLinearGradient(0, 0, 0, canvas.height);
  fade.addColorStop(.01, 'transparent');
  fade.addColorStop(.09, '#000');
  fade.addColorStop(.68, '#000');
  fade.addColorStop(1, 'transparent');
  g.fillStyle = fade;
  g.fillRect(0, 0, canvas.width, canvas.height);
  return game.browser.textureFromCanvas(canvas);
}

/** Table labels, safe-edge name plates, speech highlights and the ready-tile strip. */
export function createHud(game, lease, { nameOf, sealOf, signed, semantics }) {
  const layer = game.sprite(undefined, game.ui);
  const centre = game.sprite(undefined, layer);
  const hintNode = game.sprite(undefined, layer);
  const measure = document.createElement('canvas').getContext('2d');
  let board = null, visible = false, speaker = null, centreLabel = '', hintLabel = '', hintBounds = null, hintData = null;
  let hintKey = '', hintWidth = 0, hintHeight = 0;
  const hintParts = [];
  const text = (parent, words, x, y, size, color, options = {}) => game.text(words, {
    layer: parent, x, y, size, color, fontFamily: SANS, baseline: 'middle', ...options
  });
  const widthOf = (words, size, bold = false, family = SANS) => {
    measure.font = `${bold ? '700' : '400'} ${size}px ${family}`;
    return Math.ceil(measure.measureText(words).width);
  };

  const round = text(centre, '', 640, 346, 22, SOFT, { align: 'center', fontFamily: SERIF, bold: true });
  const wall = text(centre, '', 640, 377, 19, PAPER, { align: 'center' });
  const windPlaces = [[640, 416, 0], [705, 360, -90], [640, 304, 180], [575, 360, 90]];
  const winds = windPlaces.map(([x, y, rotation]) => {
    const wind = text(centre, '', x, y, 22, 0xc9a24a, { align: 'center', bold: true, fontFamily: SERIF });
    wind.rotation = rotation;
    return wind;
  });
  // An unfolded or upright tablet has room for a readable, separate round summary above the table.
  const summary = game.sprite(undefined, layer);
  summary.graphics.lineStyle(1, 0xc1935e, .8).beginFill(0x102a30, .96).drawRoundRect(0, 0, 312, 70, 10).endFill();
  const summaryRound = text(summary, '', 156, 23, 24, SOFT, { align: 'center', fontFamily: SERIF, bold: true });
  const summaryWall = text(summary, '', 156, 48, 20, PAPER, { align: 'center' });
  const summaryPin = game.pin(summary, { centerX: 0, top: 24 });
  summary.visible = false;

  const plates = Array.from({ length: 4 }, (_, seat) => {
    const root = game.sprite(undefined, layer);
    const card = game.sprite(undefined, root), badge = game.sprite(undefined, root), seal = game.sprite(undefined, root);
    const mark = text(seal, sealOf(seat), 31, 36, 26, WHITE, { fontFamily: SERIF, align: 'center', bold: true });
    const portrait = game.sprite(undefined, root);
    const who = text(root, '', 74, 23, 20, WHITE, { bold: true });
    const wind = text(root, '', 74, 49, 16, GOLD, { bold: true, fontFamily: SERIF });
    const dealer = text(root, '', 0, 49, 16, 0x3a1612, { bold: true });
    const score = text(root, '', 152, 49, 18, PAPER, { align: 'right' });
    const pin = game.pin(root, { left: 0, top: 0 });
    const plate = { seat, root, card, badge, seal, mark, portrait, who, wind, dealer, score, pin,
      width: 180, height: 72, top: seat === 0 ? 0 : -21, state: '', playing: false, title: '' };
    seal.graphics.lineStyle(1, 0xd4a577, .8).beginFill(0x226452).drawRoundRect(6, 11, 50, 50, 7).endFill();
    mark.visible = true;
    return plate;
  });

  function drawPlate(plate) {
    const { width: w, height: h, seat, playing, card } = plate;
    const talk = speaker === seat, lit = talk || playing;
    card.graphics.clear();
    if (lit) card.graphics.lineStyle(4, talk ? 0xf3aa68 : 0xf6bd77, .32).drawRoundRect(0, 0, w, h, 9);
    card.graphics.lineStyle(1.2, talk ? 0xffd99a : playing ? SOFT : 0xb98053, lit ? .98 : .72)
      .beginLinearGradientFill(0, 0, w, h, [
        { offset: 0, color: playing ? 0x474538 : seat === 0 ? 0x102f35 : 0x233c35, alpha: .98 },
        { offset: .56, color: 0x102a30, alpha: .98 }, { offset: 1, color: 0x0b232b, alpha: .98 }
      ]).drawRoundRect(0, 0, w, h, 8).endFill();
  }

  // The portrait art is optional; the familiar character seals remain a readable fallback if it cannot load.
  void portraitAtlas(game).then(texture => {
    const image = texture.value, part = Math.floor(image.width / 3);
    for (const plate of plates.slice(1)) {
      const bitmap = new Bitmap(texture);
      bitmap.sourceRect = { x: PORTRAIT[plate.seat] * part, y: 0, width: part, height: image.height };
      bitmap.scaleX = 88 / part;
      bitmap.scaleY = 93 / image.height;
      bitmap.x = 1;
      bitmap.y = plate.height - 93 + (plate.seat === 1 ? 10 : 1);
      plate.portrait.addChild(bitmap);
      plate.seal.visible = false;
    }
    if (board) arrange(board);
  }).catch(error => console.warn('The table portrait could not be loaded.', error));

  function updatePlate(plate, match, hand, windOf) {
    const { seat, who, wind, dealer, score, mark, badge } = plate;
    const name = nameOf(seat), windName = t('wind' + windOf(seat)), value = signed(match.scores[seat]);
    const dealerName = seat === hand.dealer ? t('dealer') + (hand.streak ? ' ' + t('streak', { n: hand.streak }) : '') : '';
    const playing = !hand.result && hand.turn === seat && hand.phase === 'act';
    const state = JSON.stringify([name, windName, dealerName, value, sealOf(seat), playing]);
    if (state === plate.state) return;
    plate.state = state;
    plate.playing = playing;
    plate.title = `${name} ${windName} ${dealerName} ${value}`.replace(/\s+/g, ' ').trim();
    const start = seat === 0 ? 67 : 74;
    const windWidth = widthOf(windName, 16, true, SERIF), dealerWidth = dealerName ? widthOf(dealerName, 16, true) + 12 : 0;
    plate.width = Math.max(168, start + widthOf(name, 20, true) + 12,
      start + windWidth + 10 + dealerWidth + 12 + widthOf(value, 18) + 12);
    who.text = name; who.x = start;
    wind.text = windName; wind.x = start;
    dealer.text = dealerName; dealer.x = start + windWidth + 14; dealer.visible = Boolean(dealerName);
    badge.graphics.clear();
    if (dealerName) badge.graphics.beginFill(GOLD).drawRoundRect(dealer.x - 6, 37, dealerWidth, 23, 4).endFill();
    score.text = value; score.x = plate.width - 12;
    score.color = match.scores[seat] < 0 ? 0xf0a59c : PAPER;
    mark.text = sealOf(seat);
    drawPlate(plate);
  }

  // Native pins use the transformed box (including the raised portrait and shadow), so all four seats clear insets.
  // The board remains whole, while extra landscape width is useful for the two edge plates instead of black bars.
  function arrange(next) {
    board = next;
    setBoardTransform(centre, board);
    const safe = game.safe, turned = board.rotation === 90, uprightTablet = board.tablet && board.portrait;
    const s = board.scale;
    summary.visible = uprightTablet;
    round.visible = wall.visible = !uprightTablet;
    summaryPin.set({ centerX: 0, top: Math.max(16, Math.min(54, (board.y - safe.y) / 4)) });
    for (const plate of plates) {
      const { seat, root, pin, width, height } = plate;
      const topRow = seat === 2 || seat === 3, rightSide = seat === 1 || seat === 2;
      root.rotation = turned ? 90 : 0;
      root.scaleX = root.scaleY = s;
      const box = boundsOf(root); // Stage-space size, independent of the current translation.
      const w = Math.max(turned ? height * s : width * s, box.width), h = Math.max(turned ? width * s : height * s, box.height);
      const margin = 24 * s;
      // The far seat was intentionally inset from the desktop's right edge; wide phones spend the extra room on the edge.
      const extra = Math.max(0, (turned ? safe.height : safe.width) - STAGE.width * s);
      const farMargin = seat === 2 && !uprightTablet ? Math.max(margin, (STAGE.width - 920 - width) * s - extra) : margin;
      if (uprightTablet) {
        const y = topRow ? board.y - h - 16 * s : board.y + STAGE.height * s + 16 * s;
        pin.set({ ...(rightSide ? { right: margin } : { left: margin }), top: clamp(y - safe.y, 8 * s, safe.height - h - 8 * s) });
      } else if (turned) {
        const x = board.x - (topRow ? 18 : 520) * s - w;
        pin.set({ ...(rightSide ? { bottom: farMargin } : { top: margin }),
          left: clamp(x - safe.x, 8 * s, safe.width - w - 8 * s) });
      } else {
        const y = board.y + (topRow ? 18 : 520) * s;
        // The portrait formerly rose 20 units above the plate; reserve that box, rather than cutting the head at a notch.
        const rise = seat === 0 ? 0 : Math.max(0, h - height * s);
        pin.set({ ...(rightSide ? { right: farMargin } : { left: margin }),
          top: clamp(y - safe.y - rise, 8 * s, safe.height - h - 8 * s) });
      }
    }
    placeHint();
  }

  function paint({ hand, match, windOf }) {
    if (!hand || !match) return;
    const line = t('roundLine', { wind: t('wind' + hand.wind), seat: t('wind' + hand.passes) });
    centreLabel = line;
    round.text = getLanguage() === 'en' ? line.replace(', ', ',\n') : line;
    round.size = getLanguage() === 'en' ? 16 : 22;
    round.y = getLanguage() === 'en' ? 344 : 346;
    summaryRound.text = line;
    wall.text = t('wallLeft', { n: Math.max(0, liveLeft(hand)) });
    summaryWall.text = wall.text;
    centreLabel += ` · ${wall.text}`;
    for (const [seat, word] of winds.entries()) {
      word.text = t('wind' + windOf(seat));
      word.color = seat === hand.dealer ? 0xfff1c8 : 0xc9a24a;
    }
    for (const plate of plates) updatePlate(plate, match, hand, windOf);
    if (board) arrange(board);
  }

  /** Keep the hint strip at its old table spot, wrapping only the rare long list of waits. */
  function placeHint() {
    if (!board || !hintBounds) return;
    const { scale: s, portrait, tablet } = board;
    hintNode.rotation = board.rotation;
    hintNode.scaleX = hintNode.scaleY = s;
    const x = 260, y = Math.min(466, 506 - hintHeight);
    if (portrait && tablet) {
      hintNode.rotation = 0;
      hintNode.x = clamp(board.x + (STAGE.width - hintWidth) * s / 2, game.safe.x, game.safe.x + game.safe.width - hintWidth * s);
      hintNode.y = Math.max(game.safe.y + 128, board.y - (hintHeight + 116) * s);
    } else if (board.rotation === 90) {
      hintNode.x = board.x - y * s;
      hintNode.y = board.y + x * s;
    } else {
      hintNode.x = board.x + x * s;
      hintNode.y = board.y + y * s;
    }
  }

  function hint(data) {
    hintData = data;
    if (!data) { hintNode.visible = false; hintLabel = ''; return; }
    const { key, tile, waits, seen } = data;
    const [before, after = ''] = t(key, { tile: '\u0001', tiles: '\u0002' }).split('\u0002');
    const [lead, middle = ''] = before.split('\u0001');
    const pieces = [{ words: lead, size: 19, color: PAPER }];
    if (tile !== null && tile !== undefined) pieces.push({ tile }, { words: middle, size: 19, color: PAPER });
    for (const kind of waits) pieces.push({ tile: kind, words: `×${Math.max(0, 4 - seen[kind])}`, color: GOLD, size: 15 });
    if (after) pieces.push({ words: after, size: 19, color: PAPER });
    hintLabel = pieces.map(part => `${part.tile === undefined ? '' : tileName(part.tile)} ${part.words ?? ''}`).join(' ').trim();
    const signature = JSON.stringify(pieces);
    hintNode.visible = visible;
    if (signature === hintKey) return;
    hintKey = signature;
    for (const node of hintParts.splice(0)) game.remove(node);
    // A very long wait list (especially English) can wrap. A compact two-line strip clears both the centre wind
    // markers above it and the call buttons at y=514 below it; do not let an opaque third line hide the table.
    const compact = pieces.reduce((sum, part) => sum + (part.words ? widthOf(part.words, part.size) : 0)
      + (part.tile === undefined ? 0 : 30) + 8, 28) > 760;
    const row = compact ? 30 : 40, iconW = compact ? 21 : 26, iconH = compact ? 28 : 35, pad = compact ? 6 : 8;
    let x = 14, y = 5, widest = 0;
    for (const part of pieces) {
      const size = compact ? Math.min(16, part.size ?? 16) : part.size;
      const labelW = part.words ? widthOf(part.words, size) : 0;
      const w = labelW + (part.tile === undefined ? 0 : iconW + 4) + pad;
      if (x > 14 && x + w > 746) { widest = Math.max(widest, x); x = 14; y += row; }
      if (part.tile !== undefined) {
        const picture = new Bitmap(lease);
        picture.sourceRect = frameOf(part.tile);
        picture.scaleX = iconW / CELL.width;
        picture.scaleY = iconH / CELL.height;
        picture.x = x; picture.y = y;
        hintNode.addChild(picture); hintParts.push(picture);
        x += iconW + 4;
      }
      if (part.words) {
        const words = text(hintNode, part.words, x, y + iconH / 2, size, part.color);
        hintParts.push(words); x += labelW;
      }
      x += pad;
      widest = Math.max(widest, x);
    }
    hintWidth = Math.min(760, widest + 6); hintHeight = y + row;
    hintNode.graphics.clear().lineStyle(1, 0xc1935e, .7).beginFill(0x102932, .94)
      .drawRoundRect(0, 0, hintWidth, hintHeight, 6).endFill();
    hintBounds = { width: hintWidth, height: hintHeight };
    placeHint();
  }

  function speakerChanged(seat) {
    if (speaker === seat) return;
    const before = speaker; speaker = seat;
    if (before !== null && plates[before]) drawPlate(plates[before]);
    if (seat !== null && plates[seat]) drawPlate(plates[seat]);
  }

  const show = on => {
    visible = Boolean(on);
    layer.visible = visible;
    hintNode.visible = visible && Boolean(hintData);
  };
  show(false);

  // The former aria-labels are now informational semantic nodes; none adds a new focus or activation target.
  if (semantics) {
    const information = (id, role, name, node, shown) => semantics.add({ id: `mahjong-hud:${id}`, role,
      describe: () => ({ name: name(), hidden: !visible || !shown(), bounds: boundsOf(typeof node === 'function' ? node() : node) }) });
    for (const plate of plates) information(`seat-${plate.seat}`, 'group', () => plate.title, plate.root, () => Boolean(plate.title));
    information('round', 'text', () => centreLabel, () => summary.visible ? summary : round, () => Boolean(centreLabel));
    information('hint', 'status', () => hintLabel, hintNode, () => Boolean(hintData));
  }
  return { arrange, paint, hint, speaker: speakerChanged, show };
}
