// 静态牌桌：绒布桌面、中间的方框、四家的牌河、副露、别家的手牌和花牌，画在引擎画布下面的一张页面 canvas 上，
// 只在牌局有变化时重画。在无头 Chromium（软件渲染）里，几百张静态牌做成引擎的 Bitmap 每帧要 50 毫秒以上，画在这里
// 就只有变化的那一下（见 ENGINE-NOTES）。玩家的手牌和会动的牌由引擎画（view.mjs）。
// The still table: the baize, the centre square, the four rivers, the melds, the other hands and the flowers, painted
// on a page canvas under the engine's canvas, and painted again only when the hand changes. In headless Chromium with
// software rendering, a few hundred still tiles as engine Bitmaps cost over 50 ms a frame; here they cost only the
// moment they change (ENGINE-NOTES). The player's hand and every tile in motion are the engine's (view.mjs).
import { CENTRE, concealedSlots, flowerSlot, meldTiles, riverSlot, STAGE } from './layout.mjs';
import { BACK, CELL, TILE, frameOf } from './tiles.mjs';

/** Draw one tile of the atlas centred at a place. */
export function drawTile(g, atlas, kind, place, { dim = false, mark = null } = {}) {
  const frame = frameOf(kind ?? BACK),
    scale = place.scale,
    w = CELL.width * scale,
    h = CELL.height * scale,
    faceLeft = -TILE.width * scale / 2,
    faceTop = -h / 2 + 2 * scale;
  g.save();
  g.translate(place.x, place.y);
  g.rotate(place.rotation ?? 0);
  g.drawImage(atlas, frame.x, frame.y, frame.width, frame.height, -w / 2, -h / 2, w, h);
  if (dim) {
    g.fillStyle = 'rgba(7, 29, 31, 0.48)';
    roundRect(g, faceLeft, faceTop, TILE.width * scale, (TILE.height - 2) * scale, 14 * scale);
    g.fill();
  }
  if (mark) {
    roundRect(g, faceLeft - 1, faceTop - 1, TILE.width * scale + 2, (TILE.face + 4) * scale + 2, 5);
    g.strokeStyle = '#152829';
    g.lineWidth = 4;
    g.stroke();
    g.strokeStyle = mark;
    g.lineWidth = 2;
    g.stroke();
  }
  g.restore();
}

/** A small, deterministic weave. Its pattern is baked into the table once. */
function weave(g) {
  const swatch = document.createElement('canvas');
  swatch.width = swatch.height = 64;
  const ctx = swatch.getContext('2d');
  const grain = ctx.createImageData(64, 64);
  let random = 4136;
  for (let y = 0, i = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++, i += 4) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      const light = ((x + y) & 3) !== 0;
      grain.data[i] = light ? 191 : 4;
      grain.data[i + 1] = light ? 218 : 30;
      grain.data[i + 2] = light ? 193 : 33;
      grain.data[i + 3] = random >>> 28;
    }
  }
  ctx.putImageData(grain, 0, 0);
  return g.createPattern(swatch, 'repeat');
}

/** The baize, its lacquered rail and the centre inlay. */
function paintBase(scale) {
  const canvas = document.createElement('canvas');
  const { width, height } = STAGE;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const g = canvas.getContext('2d');
  g.scale(scale, scale);
  const rail = g.createLinearGradient(0, 0, width * 0.72, height);
  rail.addColorStop(0, '#644037');
  rail.addColorStop(0.26, '#211d21');
  rail.addColorStop(0.64, '#352a2a');
  rail.addColorStop(1, '#13171d');
  g.fillStyle = rail;
  g.fillRect(0, 0, width, height);
  g.strokeStyle = '#91654b';
  g.lineWidth = 2;
  roundRect(g, 4, 4, width - 8, height - 8, 18);
  g.stroke();

  const copper = g.createLinearGradient(0, 8, width * 0.9, height);
  copper.addColorStop(0, '#b77a58');
  copper.addColorStop(0.4, '#6d4740');
  copper.addColorStop(0.76, '#d5a278');
  copper.addColorStop(1, '#775247');
  g.fillStyle = copper;
  roundRect(g, 11, 11, width - 22, height - 22, 19);
  g.fill();

  g.save();
  roundRect(g, 15, 15, width - 30, height - 30, 17);
  g.clip();
  const baize = g.createRadialGradient(width * 0.43, height * 0.43, 15, width * 0.49, height * 0.49, 720);
  baize.addColorStop(0, '#2b6566');
  baize.addColorStop(0.53, '#194b50');
  baize.addColorStop(1, '#10282f');
  g.fillStyle = baize;
  g.fillRect(0, 0, width, height);
  g.fillStyle = weave(g);
  g.fillRect(0, 0, width, height);
  const railShade = g.createLinearGradient(0, 15, 0, height - 15);
  railShade.addColorStop(0, 'rgba(2,15,21,0.68)');
  railShade.addColorStop(0.13, 'rgba(2,15,21,0)');
  railShade.addColorStop(0.82, 'rgba(2,15,21,0)');
  railShade.addColorStop(1, 'rgba(2,15,21,0.57)');
  g.fillStyle = railShade;
  g.fillRect(0, 0, width, height);
  g.restore();

  // Copper corner stitches and a fine inner seam stay outside the play area.
  g.strokeStyle = '#c48e63';
  g.lineWidth = 2.5;
  for (const [x, y, sx, sy] of [[23, 23, 1, 1], [width - 23, 23, -1, 1],
    [23, height - 23, 1, -1], [width - 23, height - 23, -1, -1]]) {
    g.save();
    g.translate(x, y);
    g.scale(sx, sy);
    g.beginPath();
    g.moveTo(2, 30);
    g.lineTo(2, 12);
    g.quadraticCurveTo(2, 2, 12, 2);
    g.lineTo(30, 2);
    g.stroke();
    g.fillStyle = '#e8b581';
    g.fillRect(9, 9, 3, 3);
    g.restore();
  }
  g.strokeStyle = 'rgba(174,206,178,0.13)';
  g.lineWidth = 1;
  roundRect(g, 19, 19, width - 38, height - 38, 15);
  g.stroke();

  const { x, y, half } = CENTRE;
  const side = half * 2;
  g.fillStyle = 'rgba(3,17,23,0.63)';
  roundRect(g, x - half - 3, y - half + 5, side + 6, side + 1, 17);
  g.fill();
  const lacquer = g.createLinearGradient(x - half, y - half, x + half, y + half);
  lacquer.addColorStop(0, '#43303a');
  lacquer.addColorStop(0.56, '#28252e');
  lacquer.addColorStop(1, '#171f29');
  g.fillStyle = lacquer;
  roundRect(g, x - half, y - half, side, side, 14);
  g.fill();
  g.strokeStyle = copper;
  g.lineWidth = 2.5;
  roundRect(g, x - half + 4, y - half + 4, side - 8, side - 8, 11);
  g.stroke();
  g.strokeStyle = 'rgba(214,164,118,0.25)';
  g.lineWidth = 1;
  roundRect(g, x - half + 10, y - half + 10, side - 20, side - 20, 8);
  g.stroke();

  // A quiet seal under the score text, with four matching wind marks.
  g.beginPath();
  g.arc(x, y, 33, 0, 2 * Math.PI);
  g.stroke();
  for (let i = 0; i < 4; i++) {
    g.save();
    g.translate(x, y);
    g.rotate(i * Math.PI / 2);
    g.beginPath();
    g.moveTo(0, -42);
    g.lineTo(5, -36);
    g.lineTo(0, -30);
    g.lineTo(-5, -36);
    g.closePath();
    g.stroke();
    g.restore();
  }
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
      g.fillStyle = '#ffd088';
      g.shadowColor = '#e7a765';
      g.shadowBlur = 9;
      roundRect(g, ...glow, 2.5);
      g.fill();
      g.shadowBlur = 0;
    }
    // Draw the rivers and the far side first, the near side last, so nearer tiles overlap farther ones.
    for (const seat of [2, 1, 3, 0]) {
      const player = hand.players[seat];
      player.discards.forEach((d, i) => {
        if (hidden.has(d.id)) return;
        const place = riverSlot(seat, i);
        drawTile(g, atlas, kindOf(d.id), place, { dim: d.taken, mark: d.id === last ? '#ffd185' : null });
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
