import { Bitmap } from '@egret/engine';
import { getLanguage, t, tileName } from './i18n.mjs';
import { kindOf } from './sim/game.mjs';
import { BACK, CELL, frameOf } from './tiles.mjs';
import { scrollRotatedTouch } from './ui.mjs';

const SCALE = .75;
const INK = 0x263935;
const PARCHMENT = 0xfaf1dc;
const GOLD = 0xb28b54;
const JADE = 0x234c3d;
const RED = 0x9c493d;
const TONES = {
  win: { fill: 0xd69828, edge: 0xffecc0, words: 0x301c08 },
  discard: { fill: 0x235740, edge: 0xa2c5a8, words: 0xfff5dc },
  pass: { fill: 0x34483e, edge: 0x9fb9a9, words: 0xfff5dc },
  call: { fill: 0x934739, edge: 0xf2c793, words: 0xfff5dc }
};

function paper(node, { w, h }) {
  const g = node.graphics;
  g.clear().lineStyle(1, 0xe0c899).beginFill(PARCHMENT).drawRoundRect(0, 0, w, h, 15).endFill();
  g.lineStyle(.75, GOLD, .7).drawRoundRect(6, 6, w - 12, h - 12, 8);
}

const text = (name, value, x, y, w, h, style = {}) => ({
  type: 'text', name, text: String(value), x, y, w, h, color: INK, size: 20, ...style
});
const panel = (name, x, y, w, h, style = {}) => ({ type: 'panel', name, x, y, w, h, ...style });
const card = (name, value, x, y, w, h, action, style = {}) => ({
  type: 'button', name, text: value, x, y, w, h, action, size: 23, color: 0xfff9eb, textColor: INK,
  card: { radius: 9, border: GOLD }, ...style
});
const primary = { color: RED, textColor: 0xfff4db, card: { radius: 9, border: 0xd59b68 } };
const shade = () => panel('shade', 0, 0, 1280, 720, { color: 0x071f27, alpha: .57, decorative: true });
const modalSkin = { accent: GOLD, dim: 0 };
const scoreStyle = value => ({ color: value < 0 ? RED : value > 0 ? JADE : INK, align: 'right', bold: true });

export function createRoundUi(game, ui, lease, { nameOf, sealOf, signed }) {
  const measure = document.createElement('canvas').getContext('2d');
  const tileSlots = new WeakMap();
  let peopleTexture = null, repaintResult, resultView;
  scrollRotatedTouch(game, () => ui.modal === 'result' ? resultView : null, 'resultTai');
  void game.browser.loadTexture(new URL('../assets/seat-portraits.webp', import.meta.url).href).then(texture => {
    peopleTexture = texture;
    repaintResult?.();
  }).catch(error => console.warn('The settlement portrait could not be loaded.', error));

  function tileIcon(kind, width, height, x = 0, y = 0) {
    return (node) => {
      let picture = tileSlots.get(node);
      if (!picture) {
        picture = new Bitmap(lease);
        node.addChild(picture);
        tileSlots.set(node, picture);
      }
      const ratio = Math.min(width * SCALE / CELL.width, height * SCALE / CELL.height);
      picture.sourceRect = frameOf(kind ?? BACK);
      picture.scaleX = picture.scaleY = ratio;
      picture.x = x * SCALE + (width * SCALE - CELL.width * ratio) / 2;
      picture.y = y * SCALE + (height * SCALE - CELL.height * ratio) / 2;
    };
  }
  function tilePart(name, kind, x, y, w, h, parent) {
    return panel(name, x, y, w, h, { parent, decorative: true, decorate: tileIcon(kind, w, h) });
  }

  function showTools(autoplay, onAuto, onPause) {
    const quiet = { color: 0x12313a, textColor: 0xffecd0, card: { radius: 8, border: 0x977449 }, size: 20 };
    ui.show('tools', { label: t('pause'), items: [
      card('autoButton', t(autoplay ? 'autoplayOn' : 'autoplay'), 166, 112, 105, 84, onAuto, autoplay
        ? { ...quiet, color: GOLD, textColor: 0x2a1400 } : quiet),
      card('pauseButton', t('pause'), 166, 206, 105, 84, onPause, quiet)
    ] });
  }
  function showHand(ids, slots, apart, ready, acting, onTap) {
    if (!ids.length) return ui.hide('hand');
    const items = ids.map((id, index) => ({
      type: 'button', name: 'tile-' + id, x: slots[index].x - 32, y: 612, w: 64, h: 96,
      invisible: true, disabled: !acting, action: () => onTap(id),
      label: t(apart && index === ids.length - 1 ? 'drawnTile' : 'handTile', { tile: tileName(kindOf(id)) })
        + (ready.has(id) ? ' · ' + t('readyMark') : '')
    }));
    ui.show('hand', { label: t('handTile', { tile: '' }).trim(), items });
  }

  function showActions(options) {
    if (!options.length) return ui.hide('actions');
    const size = getLanguage() === 'zh' ? 27 : 23;
    measure.font = '700 ' + size + 'px sans-serif';
    const widths = options.map(({ words, tile }) => Math.max(96, measure.measureText(words).width + 34 + (tile === undefined ? 0 : 40)));
    const gap = 10;
    let left = 1080 - widths.reduce((total, width) => total + width, 0) - (options.length - 1) * gap;
    const items = options.flatMap(({ id, words, tone = 'call', tile, action }, index) => {
      const x = left, w = widths[index];
      left += w + gap;
      const shade = TONES[tone];
      const label = tile === undefined ? words : words + ' · ' + tileName(tile);
      const out = [card(id, tile === undefined ? words : '', x, 514, w, 80, action, {
        label, color: shade.fill, textColor: shade.words, size, card: { radius: 9, border: shade.edge }
      })];
      if (tile !== undefined) {
        out.push(text(id + '-words', words, x + 13, 514, w - 49, 80, { size, color: shade.words, bold: true, decorative: true }),
          tilePart(id + '-icon', tile, x + w - 38, 528, 31, 50));
      }
      return out;
    });
    ui.show('actions', { label: t('canCall'), items });
  }

  function showChow(chows, kind, choose, close, focus = true) {
    const h = 129 + chows.length * 80;
    const x = 441, y = (720 - h) / 2, w = 398;
    const items = [shade(), panel('chow-paper', x, y, w, h, { decorate: paper, decorative: true }),
      text('chowTitle', t('chooseChow'), x + 27, y + 16, w - 54, 46, { size: 30, bold: true, role: 'heading' })];
    chows.forEach((ids, index) => {
      const top = y + 68 + index * 80;
      const kinds = [...ids.map(kindOf), kind].sort((a, b) => a - b);
      items.push(card('chow-choice-' + index, '', x + 44, top, w - 88, 71, () => choose(ids), {
        label: kinds.map(tileName).join(' ')
      }));
      kinds.forEach((k, i) => items.push(tilePart('chow-tile-' + index + '-' + i, k, x + 118 + i * 56, top + 5, 48, 61)));
    });
    items.push(card('chow-back', t('back'), x + 44, y + h - 59, w - 88, 45, close));
    ui.show('chow', { label: t('chooseChow'), modal: true, skin: modalSkin, items });
    if (focus) ui.focus('chow-choice-0');
  }

  function resultTiles(hand, result) {
    const player = hand.players[result.seat];
    const pieces = player.hand.filter(id => id !== result.winTile).sort((a,b) => kindOf(a) - kindOf(b)).map(kindOf);
    if (result.winTile != null) pieces.push('gap', kindOf(result.winTile));
    for (const meld of player.melds) {
      pieces.push('gap', ...meld.tiles.map((id, i) => meld.how === 'closed' && (i === 0 || i === 3) ? null : kindOf(id)));
    }
    if (player.flowers.length) pieces.push('gap', ...player.flowers.map(kindOf));
    return pieces;
  }
  function winnerPortrait(name, seat, x, y) {
    if (seat === 0 || !peopleTexture) return text(name, sealOf(seat), x, y, 68, 68, { align: 'center', size: 32, bold: true });
    return panel(name, x, y, 68, 68, {
      decorative: true,
      decorate(node) {
        let image = tileSlots.get(node);
        if (!image) {
          image = new Bitmap(peopleTexture);
          node.addChild(image);
          tileSlots.set(node, image);
        }
        const source = peopleTexture.value;
        const width = Math.floor(source.width / 3);
        const cutX = [0, 0, 2, 1][seat] * width;
        const side = Math.min(width, source.height);
        image.sourceRect = { x: cutX + (width - side) / 2, y: 0, width: side, height: side };
        image.scaleX = image.scaleY = 68 * SCALE / side;
      }
    });
  }
  function showResult(entry, match, next, focus = true) {
    repaintResult = () => showResult(entry, match, next, false);
    const { result, dealer } = entry;
    const won = result.kind !== 'draw', seat = result.seat;
    const title = won ? t(result.from === null ? 'resultSelf' : 'resultWin', { name: nameOf(seat) }) : t('resultDraw');
    const note = !won ? t('resultDrawNote') : result.from === null ? t('paidByAll') : t('dealIn', { name: nameOf(result.from) });
    const x = 144, w = 992, y = 47, h = 626;
    const items = [shade(), panel('resultPaper', x, y, w, h, { decorate: paper, decorative: true })];
    if (won) items.push(winnerPortrait('resultPortrait', seat, x + 32, y + 25));
    const headingX = x + (won ? 117 : 34);
    items.push(text('resultTitle', title, headingX, y + 24, w - 155, 46, { size: 35, bold: true, role: 'heading' }),
      text('resultNote', note, headingX, y + 68, w - 155, 35, { size: 19 }));
    if (won) {
      const pieces = resultTiles(match.hand, result);
      const tileW = Math.min(44, 904 / (pieces.filter(k => k !== 'gap').length + .4 * pieces.filter(k => k === 'gap').length));
      let left = x + 33;
      pieces.forEach((kind, i) => {
        if (kind === 'gap') left += tileW * .4;
        else {
          items.push(tilePart('result-tile-' + i, kind, left, y + 122, tileW, 59));
          left += tileW;
        }
      });
      const scoreRows = result.score.items.map(item => [
        t('tai_' + item.key) + (item.kind === undefined ? '' : ' (' + tileName(item.kind) + ')'),
        t('taiUnit', { n: item.tai })
      ]);
      if (dealer === seat || result.from === dealer || (result.from === null && seat !== dealer)) {
        scoreRows.push([entry.streak ? t('dealerStreakNote', { s: entry.streak }) : t('dealerTaiNote'), t('taiUnit', { n: result.dealerTai })]);
      }
      items.push(panel('resultTai', x + 34, y + 202, 460, 302, { scroll: 'vertical' }));
      scoreRows.forEach(([label, value], i) => {
        items.push(text('result-tai-' + i, label, 0, i * 31, 365, 31, { parent: 'resultTai' }),
          text('result-points-' + i, value, 374, i * 31, 81, 31, { parent: 'resultTai', align: 'right', bold: true }));
      });
      const total = result.score.total + (dealer === seat || result.from === dealer ? result.dealerTai : 0);
      items.push(text('resultTotal', t('taiTotal', { n: total }), x + 36, y + 511, 450, 44, { size: 24, bold: true, color: JADE }));
    }
    const tx = x + (won ? 512 : 34), tw = w - (won ? 548 : 70), rowY = y + (won ? 203 : 143);
    for (let index = 0; index < 4; index++) {
      const at = rowY + index * 58, payment = result.payments?.[index] ?? 0;
      items.push(panel('result-pay-row-' + index, tx, at, tw, 51, { color: index % 2 ? 0xf4e8d0 : 0xfdf6e7, decorative: true }),
        text('result-seat-' + index, nameOf(index) + (index === dealer ? ' · ' + t('dealer') : ''), tx + 10, at, tw * .52 - 8, 51, { size: 18, bold: index === 0 }),
        text('result-payment-' + index, payment ? signed(payment) : '0', tx + tw * .55, at, tw * .17, 51, { size: 18, ...scoreStyle(payment) }),
        text('result-balance-' + index, signed(match.scores[index]), tx + tw * .75, at, tw * .22, 51, { size: 18, ...scoreStyle(match.scores[index]) }));
    }
    items.push(card('nextButton', t(match.over ? 'finalScores' : 'nextHand'), x + w - 292, y + h - 81, 249, 60, next, primary));
    const view = ui.show('result', { label: title, modal: true, skin: modalSkin, items });
    resultView = won ? view : null;
    if (focus) ui.focus('nextButton');
  }

  function showFinal(match, best, again, home, focus = true) {
    const title = t('gameOver'), x = 313, y = 86, w = 654, h = 549;
    const items = [shade(), panel('finalPaper', x, y, w, h, { decorate: paper, decorative: true }),
      text('finalTitle', title, x + 40, y + 29, w - 80, 46, { size: 36, bold: true, role: 'heading' })];
    const seats = [0, 1, 2, 3].sort((a,b) => match.scores[b] - match.scores[a] || a - b);
    seats.forEach((seat, index) => {
      const at = y + 101 + 71 * index, score = match.scores[seat];
      items.push(panel('rank-card-' + index, x + 39, at, w - 78, 59, { color: seat === 0 ? 0xdfe8d9 : 0xf1e4cf, decorative: true, card: { radius: 8 } }),
        text('rank-place-' + index, t('place' + (index + 1)), x + 55, at, 100, 59, { size: 22, color: JADE, bold: true }),
        text('rank-name-' + index, nameOf(seat), x + 182, at, 222, 59, { size: 24, bold: seat === 0 }),
        text('rank-score-' + index, t('points', { n: signed(score) }), x + 402, at, 182, 59, { size: 21, ...scoreStyle(score) }));
    });
    if (best) items.push(text('finalNote', t('bestGame'), x + 42, y + 388, w - 84, 45, { size: 20, color: JADE }));
    items.push(card('againButton', t('again'), x + 42, y + 449, 250, 66, again, primary),
      card('homeButton', t('toTitle'), x + 312, y + 449, 280, 66, home));
    ui.show('final', { label: title, modal: true, skin: modalSkin, items });
    if (focus) ui.focus('againButton');
  }
  return {
    showTools, showHand, showActions, showChow, showResult, showFinal,
    closeResult() {
      repaintResult = null;
      resultView = null;
      ui.hide('result');
    }
  };
}
