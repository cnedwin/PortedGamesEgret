// 静态牌桌：绒布桌面、中间的方框、四家的牌河、副露、别家的手牌和花牌，画在引擎画布下面的一张页面 canvas 上，
// 只在牌局有变化时重画。在无头 Chromium（软件渲染）里，几百张静态牌做成引擎的 Bitmap 每帧要 50 毫秒以上，画在这里
// 就只有变化的那一下（见 ENGINE-NOTES）。玩家的手牌和会动的牌由引擎画（view.mjs）。
// The still table: the baize, the centre square, the four rivers, the melds, the other hands and the flowers, painted
// on a page canvas under the engine's canvas, and painted again only when the hand changes. In headless Chromium with
// software rendering, a few hundred still tiles as engine Bitmaps cost over 50 ms a frame; here they cost only the
// moment they change (ENGINE-NOTES). The player's hand and every tile in motion are the engine's (view.mjs).
import { CENTRE, concealedSlots, flowerSlot, meldTiles, riverSlot, STAGE } from './layout.mjs';
import { BACK, CELL, frameOf } from './tiles.mjs';

/** Draw one tile of the atlas centred at a place. */
export function drawTile(g, atlas, kind, place, { dim = false, mark = null } = {}) {
  const frame = frameOf(kind ?? BACK),
    w = CELL.width * place.scale,
    h = CELL.height * place.scale;
  g.save();
  g.translate(place.x, place.y);
  g.rotate(place.rotation ?? 0);
  g.drawImage(atlas, frame.x, frame.y, frame.width, frame.height, -w / 2, -h / 2, w, h);
  if (dim) {
    g.fillStyle = 'rgba(20, 40, 30, 0.42)';
    g.fillRect(-w / 2 + 2, -h / 2 + 1, w - 4, h * 0.86);
  }
  if (mark) {
    g.strokeStyle = mark;
    g.lineWidth = 3;
    g.strokeRect(-w / 2 + 1, -h / 2, w - 2, h * 0.9);
  }
  g.restore();
}

/** The baize, the rim and the centre square, made once. */
function paintBase(scale) {
  const canvas = document.createElement('canvas');
  canvas.width = STAGE.width * scale;
  canvas.height = STAGE.height * scale;
  const g = canvas.getContext('2d');
  g.scale(scale, scale);
  const baize = g.createRadialGradient(640, 380, 80, 640, 360, 820);
  baize.addColorStop(0, '#1f7552');
  baize.addColorStop(0.55, '#17603f');
  baize.addColorStop(1, '#0b3526');
  g.fillStyle = baize;
  g.fillRect(0, 0, STAGE.width, STAGE.height);
  // The weave: faint diagonal threads.
  g.strokeStyle = 'rgba(255,255,255,0.025)';
  g.lineWidth = 1;
  for (let i = -720; i < 1280; i += 6) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 720, 720);
    g.stroke();
  }
  // The centre square: lacquer with a gold line.
  const { x, y, half } = CENTRE;
  g.fillStyle = 'rgba(0,0,0,0.25)';
  roundRect(g, x - half - 2, y - half + 4, half * 2 + 4, half * 2 + 4, 16);
  g.fill();
  const lacquer = g.createLinearGradient(x - half, y - half, x + half, y + half);
  lacquer.addColorStop(0, '#3a1612');
  lacquer.addColorStop(1, '#1d0a08');
  g.fillStyle = lacquer;
  roundRect(g, x - half, y - half, half * 2, half * 2, 14);
  g.fill();
  g.strokeStyle = '#c9a24a';
  g.lineWidth = 2;
  roundRect(g, x - half + 6, y - half + 6, half * 2 - 12, half * 2 - 12, 10);
  g.stroke();
  return canvas;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/**
 * The still table on `canvas`, drawn from the atlas. `paint(view)` takes { hand, turn, dealer, reveal, hidden, last }:
 * the hand state, whose turn it is, the dealer seat, whether the others' hands are shown, ids not to draw yet (still
 * flying), and the id of the last discard to mark.
 */
export function createFelt(canvas, atlas, kindOf) {
  const scale = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));
  canvas.width = STAGE.width * scale;
  canvas.height = STAGE.height * scale;
  const g = canvas.getContext('2d'),
    base = paintBase(scale);
  g.imageSmoothingQuality = 'high';

  function paint({ hand, turn = -1, reveal = false, hidden = new Set(), last = null, winner = -1 } = {}) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(base, 0, 0);
    g.setTransform(scale, 0, 0, scale, 0, 0);
    if (!hand) return;
    // Whose turn: a glow on that side of the centre square.
    if (turn >= 0) {
      const { x, y, half } = CENTRE,
        glow = [
          [x - half + 14, y + half - 10, half * 2 - 28, 5],
          [x + half - 10, y - half + 14, 5, half * 2 - 28],
          [x - half + 14, y - half + 5, half * 2 - 28, 5],
          [x - half + 5, y - half + 14, 5, half * 2 - 28]
        ][turn];
      g.fillStyle = '#f5c95c';
      g.shadowColor = '#f5c95c';
      g.shadowBlur = 12;
      g.fillRect(...glow);
      g.shadowBlur = 0;
    }
    // Draw the rivers and the far side first, the near side last, so nearer tiles overlap farther ones.
    for (const seat of [2, 1, 3, 0]) {
      const player = hand.players[seat];
      player.discards.forEach((d, i) => {
        if (hidden.has(d.id)) return;
        const place = riverSlot(seat, i);
        drawTile(g, atlas, kindOf(d.id), place, { dim: d.taken, mark: d.id === last ? '#f5c95c' : null });
      });
    }
    for (const seat of [2, 1, 3]) {
      const player = hand.players[seat],
        show = reveal || seat === winner,
        ids = show ? player.hand.slice().sort((a, b) => kindOf(a) - kindOf(b)) : player.hand;
      concealedSlots(seat, ids.length).forEach((place, i) => {
        if (hidden.has(ids[i])) return;
        drawTile(g, atlas, show ? kindOf(ids[i]) : null, show ? { ...place, scale: place.scale * 0.92 } : place);
      });
    }
    for (const seat of [2, 1, 3, 0]) {
      for (const tile of meldTiles(seat, hand.players[seat].melds, kindOf)) drawTile(g, atlas, tile.kind, tile);
      hand.players[seat].flowers.forEach((id, i) => drawTile(g, atlas, kindOf(id), flowerSlot(seat, i)));
    }
  }
  return { paint };
}
