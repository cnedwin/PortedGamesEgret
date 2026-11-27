import { Bitmap } from '@egret/engine';
import { getLanguage, t, tileName } from './i18n.mjs';
import { kindOf } from './sim/game.mjs';
import { BACK, CELL, frameOf } from './tiles.mjs';
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
const wideFrame = { width: 1280, height: 720 };
const tallFrame = width => ({ width, height: 1280 });
const geometry = (item, x, y, w = item.w, h = item.h) => ({ ...item, x, y, w, h });

function dialogVariants(items, landscape, portrait) {
  return {
    items: landscape(items), frame: wideFrame,
    variants: {
      tablet: { items, frame: wideFrame },
      portrait: { items: portrait(items, 720), frame: tallFrame(720) },
      tabletPortrait: { items: portrait(items, 920), frame: tallFrame(920) }
    }
  };
}

export function createRoundUi(game, ui, lease, { nameOf, sealOf, signed }) {
  const measure = document.createElement('canvas').getContext('2d');
  const tileSlots = new WeakMap();
  let peopleTexture = null, repaintResult;
  void game.browser.loadTexture(new URL('../assets/seat-portraits.webp', import.meta.url).href).then(texture => {
    peopleTexture = texture;
    repaintResult?.();
  }).catch(error => console.warn('The settlement portrait could not be loaded.', error));

  function tileIcon(kind, width, height, x = 0, y = 0) {
    return (node, rect = { w: width, h: height }) => {
      let picture = tileSlots.get(node);
      if (!picture) {
        picture = new Bitmap(lease);
        node.addChild(picture);
        tileSlots.set(node, picture);
      }
      const ratio = Math.min(rect.w / CELL.width, rect.h / CELL.height);
      picture.sourceRect = frameOf(kind ?? BACK);
      picture.scaleX = picture.scaleY = ratio;
      picture.x = x + (rect.w - CELL.width * ratio) / 2;
      picture.y = y + (rect.h - CELL.height * ratio) / 2;
    };
  }
  function tilePart(name, kind, x, y, w, h, parent) {
    return panel(name, x, y, w, h, { parent, decorative: true, decorate: tileIcon(kind, w, h) });
  }

  function showTools(autoplay, onAuto, onPause) {
    const quiet = { color: 0x12313a, textColor: 0xffecd0, card: { radius: 8, border: 0x977449 }, size: 20 };
    const items = [
      card('autoButton', t(autoplay ? 'autoplayOn' : 'autoplay'), 166, 112, 105, 84, onAuto, autoplay
        ? { ...quiet, color: GOLD, textColor: 0x2a1400 } : quiet),
      card('pauseButton', t('pause'), 166, 206, 105, 84, onPause, quiet)
    ];
    const wide = items.map((item, index) => geometry(item, item.x, index ? 230 : 112, Math.max(110, item.w), 104));
    const tall = items.map((item, index) => geometry(item, 300 + index * 170, 1150, 156, 102));
    ui.show('tools', { label: t('pause'), table: 'exceptTabletPortrait', items: wide, frame: wideFrame,
      variants: {
        tablet: { items, frame: wideFrame },
        portrait: { items: wide, frame: wideFrame },
        tabletPortrait: { items: tall, frame: tallFrame(920) }
      }
    });
  }
  function showHand(ids, slots, apart, ready, acting, onTap) {
    if (!ids.length) return ui.hide('hand');
    const items = ids.map((id, index) => {
      const slot = slots[index];
      const w = slot.hitW ?? Math.min(CELL.width * slot.scale - 4,
        index > 0 ? slot.x - slots[index - 1].x : Infinity,
        index + 1 < slots.length ? slots[index + 1].x - slot.x : Infinity);
      const h = slot.hitH ?? Math.max(96, CELL.height * slot.scale + 14);
      return {
        type: 'button', name: 'tile-' + id, x: slot.x - w / 2, y: slot.y - h / 2 - 6, w, h,
        invisible: true, disabled: !acting, action: () => onTap(id),
        label: t(apart && index === ids.length - 1 ? 'drawnTile' : 'handTile', { tile: tileName(kindOf(id)) })
          + (ready.has(id) ? ' · ' + t('readyMark') : '')
      };
    });
    ui.show('hand', { label: t('handTile', { tile: '' }).trim(), table: true, items });
  }

  function showActions(options) {
    if (!options.length) return ui.hide('actions');
    const size = getLanguage() === 'zh' ? 27 : 23;
    measure.font = '700 ' + size + 'px sans-serif';
    const widths = options.map(({ words, tile }) => Math.max(106, measure.measureText(words).width + 34 + (tile === undefined ? 0 : 40)));
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
    const wide = items.map(item => {
      if (item.type === 'button' || item.type === 'text') return geometry(item, item.x, 489, item.w, 104);
      return { ...item, y: item.y - 12 };
    });
    // A tablet upright has enough room for an independent call bar below the
    // board. The phone's bar stays aligned to its quarter-turned table.
    const leftmost = Math.min(...items.map(item => item.x));
    const rightmost = Math.max(...items.map(item => item.x + item.w));
    const offset = (920 - (rightmost - leftmost)) / 2 - leftmost;
    const tall = wide.map(item => ({ ...item, x: item.x + offset, y: item.y + 548 }));
    ui.show('actions', { label: t('canCall'), table: 'exceptTabletPortrait', items: wide,
      variants: {
        tablet: { items, frame: wideFrame },
        portrait: { items: wide, frame: wideFrame },
        tabletPortrait: { items: tall, frame: tallFrame(920) }
      }
    });
  }

  function showChow(chows, kind, choose, close) {
    const h = 142 + chows.length * 80;
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
    items.push(card('chow-back', t('back'), x + 44, y + h - 72, w - 88, 58, close));
    const rearrange = (original, width) => {
      const upright = width < 1280, height = upright ? 1280 : 720;
      const panelW = upright ? Math.min(width - 60, 620) : 460;
      const rowH = upright ? 132 : 108;
      const panelH = 174 + chows.length * (rowH + 14);
      const px = (width - panelW) / 2, py = (height - panelH) / 2;
      return original.map(item => {
        if (item.name === 'shade') return geometry(item, 0, 0, width, height);
        if (item.name === 'chow-paper') return geometry(item, px, py, panelW, panelH);
        if (item.name === 'chowTitle') return geometry(item, px + 24, py + 16, panelW - 48, 54);
        if (item.name === 'chow-back') return geometry(item, px + 36, py + panelH - 110, panelW - 72, 104);
        let match = /^chow-choice-(\d+)$/.exec(item.name);
        if (match) return geometry(item, px + 36, py + 72 + Number(match[1]) * (rowH + 14), panelW - 72, rowH);
        match = /^chow-tile-(\d+)-(\d+)$/.exec(item.name);
        if (match) {
          const tileW = upright ? 76 : 60;
          return geometry(item, width / 2 - tileW * 1.6 + Number(match[2]) * tileW * 1.1,
            py + 78 + Number(match[1]) * (rowH + 14), tileW, rowH - 14);
        }
        return item;
      });
    };
    ui.show('chow', {
      label: t('chooseChow'), modal: true, skin: modalSkin, initialFocus: 'chow-choice-0', dismiss: close,
      ...dialogVariants(items, list => rearrange(list, 1280), rearrange)
    });
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
      decorate(node, rect) {
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
        image.scaleX = image.scaleY = Math.min(rect.w, rect.h) / side;
      }
    });
  }
  function showResult(entry, match, next) {
    repaintResult = () => showResult(entry, match, next);
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
        text('result-seat-' + index, nameOf(index) + (index === dealer ? ' · ' + t('dealer') : ''), tx + 10, at, tw * .52 - 8, 51, { size: 19, bold: index === 0 }),
        text('result-payment-' + index, payment ? signed(payment) : '0', tx + tw * .55, at, tw * .17, 51, { size: 19, ...scoreStyle(payment) }),
        text('result-balance-' + index, signed(match.scores[index]), tx + tw * .75, at, tw * .22, 51, { size: 19, ...scoreStyle(match.scores[index]) }));
    }
    items.push(card('nextButton', t(match.over ? 'finalScores' : 'nextHand'), x + w - 292, y + h - 81, 249, 60, next, primary));
    const portrait = (original, width) => {
      const tablet = width >= 900;
      const px = 30, pw = width - 60, py = 38, ph = 1204, left = px + 28, inner = pw - 56;
      const pieceItems = original.filter(item => item.name?.startsWith('result-tile-'));
      const perRow = tablet ? 18 : 12;
      const tileW = Math.min(52, inner / perRow);
      const tileRows = Math.ceil(pieceItems.length / perRow);
      const tileStart = py + 146;
      const taiTop = tileStart + tileRows * 72 + 16;
      const tableTop = won ? Math.max(720, taiTop + 276) : 270;
      const rowH = won ? 70 : 130;
      const payRows = item => {
        const index = Number(item.name.split('-').at(-1));
        const rowY = tableTop + index * rowH;
        if (item.name.startsWith('result-pay-row-')) return geometry(item, left, rowY, inner, rowH - 7);
        if (item.name.startsWith('result-seat-')) return geometry(item, left + 12, rowY, inner * .46, rowH - 7);
        if (item.name.startsWith('result-payment-')) return geometry(item, left + inner * .49, rowY, inner * .20, rowH - 7);
        return geometry(item, left + inner * .72, rowY, inner * .25, rowH - 7);
      };
      return original.map(item => {
        if (item.name === 'shade') return geometry(item, 0, 0, width, 1280);
        if (item.name === 'resultPaper') return geometry(item, px, py, pw, ph);
        if (item.name === 'resultPortrait') return geometry(item, left, py + 28, 76, 76);
        const heading = left + (won ? 91 : 0);
        if (item.name === 'resultTitle') return { ...geometry(item, heading, py + 20, px + pw - 20 - heading, 56), size: tablet ? 39 : 32 };
        if (item.name === 'resultNote') return geometry(item, heading, py + 83, px + pw - 20 - heading, 45);
        if (pieceItems.includes(item)) {
          const index = pieceItems.indexOf(item);
          return geometry(item, left + (index % perRow) * tileW, tileStart + Math.floor(index / perRow) * 72, tileW, 67);
        }
        if (item.name === 'resultTai') return geometry(item, left, taiTop, inner, Math.min(208, tableTop - taiTop - 55));
        if (item.parent === 'resultTai') {
          const isValue = item.name.startsWith('result-points-');
          return geometry(item, isValue ? inner - 118 : 0, item.y * 1.14,
            isValue ? 113 : inner - 129, item.h * 1.14);
        }
        if (item.name === 'resultTotal') return geometry(item, left, tableTop - 51, inner, 44);
        if (/^result-(pay-row|seat|payment|balance)-/.test(item.name)) return payRows(item);
        if (item.name === 'nextButton') return geometry(item, left, py + ph - 120, inner, 101);
        return item;
      });
    };
    const phone = original => original.map(item => item.name === 'nextButton'
      ? geometry(item, 846, 569, 248, 98) : item);
    ui.show('result', { label: title, modal: true, skin: modalSkin, initialFocus: 'nextButton',
      ...dialogVariants(items, phone, portrait) });
  }

  function showFinal(match, best, again, home) {
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
    const portrait = (original, width) => {
      const panelW = Math.min(width - 44, 820), panelH = 1080, px = (width - panelW) / 2, py = 100;
      const inner = panelW - 68, left = px + 34;
      return original.map(item => {
        if (item.name === 'shade') return geometry(item, 0, 0, width, 1280);
        if (item.name === 'finalPaper') return geometry(item, px, py, panelW, panelH);
        if (item.name === 'finalTitle') return geometry(item, left, py + 34, inner, 64);
        if (item.name === 'finalNote') return geometry(item, left, py + 784, inner, 55);
        if (item.name === 'againButton') return geometry(item, left, py + 850, inner / 2 - 7, 108);
        if (item.name === 'homeButton') return geometry(item, left + inner / 2 + 7, py + 850, inner / 2 - 7, 108);
        const at = /^rank-(card|place|name|score)-(\d+)$/.exec(item.name);
        if (!at) return item;
        const y = py + 136 + Number(at[2]) * 150;
        if (at[1] === 'card') return geometry(item, left, y, inner, 128);
        if (at[1] === 'place') return geometry(item, left + 14, y, inner * .22, 128);
        if (at[1] === 'name') return geometry(item, left + inner * .25, y, inner * .40, 128);
        return geometry(item, left + inner * .68, y, inner * .29, 128);
      });
    };
    const phone = original => original.map(item => ['againButton', 'homeButton'].includes(item.name)
      ? geometry(item, item.x, 527, item.w, 104) : item);
    ui.show('final', { label: title, modal: true, skin: modalSkin, initialFocus: 'againButton',
      ...dialogVariants(items, phone, portrait) });
  }
  return {
    showTools, showHand, showActions, showChow, showResult, showFinal,
    closeResult() {
      repaintResult = null;
      ui.hide('result');
    }
  };
}
