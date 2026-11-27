// The menu controls and rules viewport are Egret views. The rain-room art and seals share the game texture scope.
import { Bitmap } from '@egret/engine';
import { getLanguage, t } from './i18n.mjs';

const TITLE_ART = new URL('../assets/rain-room.webp', import.meta.url).href;
const PORTRAITS = new URL('../assets/opponents.webp', import.meta.url).href;
const PAPER = 0xf8ecd4;
const IVORY = 0xfff5dc;
const COPPER = 0xd7a674;
const GOLD = 0xffda9e;
const INK = 0x29201b;
const MUTED = 0x594537;
const LACQUER = 0x79382c;
const JADE = 0x12353b;
const TITLE_SKIN = { accent: GOLD, dim: 0.5 };
const SHEET_SKIN = { accent: 0x28644a, dim: 0 };
const SHEET_FOCUS = { menu: 'resumeButton', rules: 'rulesClose', settings: 'setting-sound', record: 'recordClose' };
const TITLE_TARGET = 82;
const textMeasure = document.createElement('canvas').getContext('2d');
const titleCrowd = [1, 3, 2];
const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-US');

const part = (type, x, y, w, h, options) => ({ type, x, y, w, h, ...options });
const text = (name, value, x, y, w, h, options) =>
  part('text', x, y, w, h, { name, text: value, color: INK, size: 22, ...options });
const fill = (x, y, w, h, color, options) => part('panel', x, y, w, h, { color, decorative: true, ...options });
const card = (x, y, w, h, color, border = COPPER, radius = 10) => fill(x, y, w, h, color, { card: { radius, border } });
const button = (name, value, x, y, w, h, action, { primary = false, dark = false, ...options } = {}) =>
  part('button', x, y, w, h, {
    name, text: value, size: 22, action,
    color: primary ? LACQUER : dark ? JADE : 0xfffaf0,
    textColor: primary || dark ? IVORY : INK,
    card: { radius: 9, border: primary || dark ? COPPER : 0xc09b72 }, ...options
  });

/** Keep numbers and closing punctuation together in Chinese, and words together in English. */
function linesOf(value, width, size) {
  textMeasure.font = size + 'px serif';
  const chinese = getLanguage() === 'zh';
  const chunks = chinese ? value.match(/\d+(?:[.,]\d+)*|[A-Za-z]+|./gu) ?? [] : value.split(/\s+/);
  const lines = [];
  let line = '';
  for (const chunk of chunks) {
    const next = line && !chinese ? line + ' ' + chunk : line + chunk;
    if (line && textMeasure.measureText(next).width > width && !(chinese && /^[，。；：、！？」』）]/u.test(chunk))) {
      lines.push(line.trimEnd());
      line = chunk.trimStart();
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function paragraph(name, value, x, y, w, size, lineHeight, options) {
  return linesOf(value, w - 8, size).map((line, index) => text(
    name + '-' + index, line, x, y + index * lineHeight, w, lineHeight,
    { size, ...(index === 0 ? { label: value } : { decorative: true }), ...options }
  ));
}

const wideFrame = { width: 1280, height: 720 };
const tallFrame = width => ({ width, height: 1280 });
const geometry = (item, x, y, w = item.w, h = item.h) => ({ ...item, x, y, w, h });
const titleLinks = ['rulesButton', 'recordButton', 'settingsButton', 'languageButton'];

// Preserve the original desktop composition; on short phones make the main
// choices taller. Upright variants rearrange the choices and start/link rows
// independently instead of rotating or proportionally shrinking a desktop.
function titleVariant(items, top, width = null) {
  if (width === null) return items.map(item => {
    if (item.parent && (item.parent === 'rounds-group' || item.parent === 'level-group')) {
      return item.type === 'button' ? { ...item, h: 100 } : item;
    }
    if (item.name === 'startButton') return geometry(item, 56, top + 336, 174, 104);
    const link = titleLinks.indexOf(item.name);
    if (link >= 0) return geometry(item, 240 + link * 128, top + 336, 120, 104);
    if (item.name === 'rounds-group') return { ...item, h: 100, y: item.y - 3 };
    if (item.name === 'level-group') return { ...item, h: 100, y: item.y + 9 };
    if (item.name === 'level-label') return { ...item, y: item.y + 13 };
    if (item.y >= top + 237 && item.y < top + 310) return { ...item, y: item.y + 24 };
    return item;
  });
  const column = width >= 900 ? 760 : 630;
  const left = (width - column) / 2;
  const across = column / 625;
  const offset = width >= 900 ? 140 : 186;
  const rowY = Math.min(1100, top + offset + 402);
  return items.map(item => {
    if (item.name === 'title-art') return geometry(item, 0, 0, width, 1280);
    if (item.name === 'startButton') return geometry(item, left, rowY, column, 112);
    const link = titleLinks.indexOf(item.name);
    if (link >= 0) {
      const cell = (column - 24) / 4;
      return geometry(item, left + link * (cell + 8), rowY + 124, cell, 100);
    }
    if (item.parent === 'rounds-group' || item.parent === 'level-group') {
      return geometry(item, item.x * across, item.y, item.w * across, item.type === 'button' ? 108 : item.h);
    }
    if (item.name === 'retryTitleArt') return geometry(item, left + 20, 96, Math.min(400, column - 40), 100);
    // The optional art error occupies the otherwise open upper image, never the choice rows.
    if (item.x >= 768) {
      const y = item.name?.startsWith('title-art-notice') ? 45 + (item.y - 502) : 28;
      return geometry(item, left + (item.x - 768) * across, y, Math.min(column, item.w * across), item.h);
    }
    let down = item.y + offset;
    if (item.y >= top + 237) down += 54;
    else if (item.y >= top + 115) down += 28;
    const x = left + (item.x - 56) * across;
    const w = Math.min(column - (x - left), item.w * across);
    return geometry(item, x, down, w, item.name?.endsWith('-group') ? 108 : item.h);
  });
}

// Each portrait sheet has the same named controls and text lines as its
// landscape counterpart, but a different flow selected by game.show.
function portraitSheet(id, items, source, width) {
  const tablet = width >= 900;
  let w = width - 40, h = 1190, x = 20, y = 45;
  if (id === 'record') { w = tablet ? 790 : 660; h = 1030; }
  if (id === 'menu') { w = tablet ? 720 : 630; h = 740; }
  if (id === 'record' || id === 'menu') { x = (width - w) / 2; y = (1280 - h) / 2; }
  const left = x + 36, inner = w - 72;
  const controlsY = y + h - 122;
  const desc = new Map();
  const bodyStart = y + 110;
  let descBottom = bodyStart;
  for (const key of ['rulesIntro', 'rulesFlow', 'rulesPay', 'rulesNotIncluded']) {
    const lines = items.filter(item => item.name?.startsWith(key + '-'));
    if (!lines.length) continue;
    // The wider portrait column can repack the same words into fewer of the
    // already-named lines; retain the first line's full accessible sentence.
    const size = 22;
    const wrapped = linesOf(lines[0].label, inner - 8, size);
    const text = wrapped.length <= lines.length ? wrapped : lines.map(item => item.text);
    lines.forEach((item, index) => desc.set(item, {
      ...geometry(item, left, descBottom + Math.min(index, text.length) * 28, inner, 28),
      size, text: text[index] ?? ''
    }));
    descBottom += text.length * 28 + 10;
  }
  const scrollTop = descBottom + 44;
  const originalScroll = items.find(item => item.name === 'rulesScroll');
  return items.map(item => {
    switch (item.name) {
      case 'sheetShade': return geometry(item, 0, 0, width, 1280);
      case 'sheetEdge': return geometry(item, x - 5, y - 5, w + 10, h + 10);
      case 'sheetPaper': return geometry(item, x, y, w, h);
      case 'sheetDivider': return geometry(item, left, y + 88, inner, 1.5);
    }
    if (item.name === id + 'Title') return geometry(item, left, y + 23, inner, 55);
    if (id === 'rules') {
      if (desc.has(item)) return desc.get(item);
      if (item.name === 'tai-table-heading') return geometry(item, left, scrollTop - 35, inner, 32);
      if (item.name === 'rulesScroll') return geometry(item, left, scrollTop, inner, Math.max(120, controlsY - scrollTop - 16));
      if (item.parent === 'rulesScroll') {
        const factor = inner / originalScroll.w;
        return geometry(item, item.x * factor, item.y, item.w * factor, item.h);
      }
      if (item.name === 'rulesClose') return geometry(item, left, controlsY, 175, 96);
      if (item.name === 'rulesUp') return geometry(item, x + w - 248, controlsY, 100, 96);
      if (item.name === 'rulesDown') return geometry(item, x + w - 136, controlsY, 100, 96);
    }
    if (id === 'settings') {
      if (item.name === 'settingsClose') return geometry(item, left, controlsY, 184, 100);
      const row = Math.floor((item.y - source.y - 98) / 82);
      const index = row * 2 + (item.x >= source.x + 36 + 413 ? 1 : 0);
      const columns = tablet ? 2 : 1;
      const cellW = (inner - (columns - 1) * 16) / columns;
      const rx = left + index % columns * (cellW + 16);
      const ry = y + 125 + Math.floor(index / columns) * (tablet ? 182 : 128);
      const rowH = tablet ? 151 : 112;
      if (item.name?.startsWith('setting-label-')) return geometry(item, rx + 12, ry + 9, cellW - 186, rowH - 18);
      if (item.name?.startsWith('setting-')) return geometry(item, rx + cellW - 170, ry + 8, 162, rowH - 16);
      return geometry(item, rx, ry, cellW, rowH);
    }
    if (id === 'record') {
      if (item.name === 'recordClose') return geometry(item, left, controlsY, 175, 96);
      const index = Math.floor((item.y - source.y - 98) / 47);
      const ry = y + 125 + index * 91;
      if (item.name?.endsWith('-label')) return geometry(item, left + 14, ry, inner - 215, 82);
      if (item.name?.endsWith('-value')) return geometry(item, x + w - 250, ry, 204, 82);
      return geometry(item, left, ry, inner, 82);
    }
    if (id === 'menu') {
      const index = ['resumeButton', 'menuRules', 'menuSettings', 'quitButton'].indexOf(item.name);
      if (index >= 0) return geometry(item, left, y + 130 + index * 143, inner, 116);
    }
    return item;
  });
}

function phoneSheet(id, items, source) {
  return items.map(item => {
    if (id === 'rules') {
      if (item.name === 'rulesScroll') return { ...item, h: 430 };
      if (item.name === 'rulesClose') return geometry(item, 550, 594, 170, 104);
      if (item.name === 'rulesUp') return geometry(item, 955, 594, 104, 104);
      if (item.name === 'rulesDown') return geometry(item, 1070, 594, 104, 104);
    }
    if (id === 'settings' || id === 'menu') {
      if (item.name === 'sheetEdge') return geometry(item, item.x, 21, item.w, 678);
      if (item.name === 'sheetPaper') return geometry(item, item.x, 26, item.w, 668);
      if (item.name === 'sheetDivider') return { ...item, y: 104 };
      if (item.name === id + 'Title') return { ...item, y: 45 };
      if (id === 'menu') {
        const index = ['resumeButton', 'menuRules', 'menuSettings', 'quitButton'].indexOf(item.name);
        if (index >= 0) return geometry(item, item.x, 136 + index * 136, item.w, 112);
      } else {
        if (item.name === 'settingsClose') return geometry(item, item.x, 587, 175, 104);
        if (item.type === 'button' || item.name?.startsWith('setting-label-') || item.card && item.y >= source.y + 98) {
          const row = Math.floor((item.y - source.y - 98) / 82);
          return geometry(item, item.x, 117 + row * 113 + (item.name?.startsWith('setting-label-') ? 8 : 0),
            item.w, item.name?.startsWith('setting-label-') ? 94 : 104);
        }
      }
    }
    if (id === 'record' && item.name === 'recordClose') return geometry(item, item.x, 552, 175, 104);
    return item;
  });
}

/** Native title, rules, record, preferences, and the pause menu. Actions are owned by the round controller. */
export function createScreens(game, ui, {
  save, problems, nameOf, seats, levelNames, rules, tai, start, setSetting, switchLanguage, resume, quit, playUi
}) {
  let title = false, titleLease, portraitsLease, artPending;
  let artFailed = false, retryWasFocused = false;
  const stack = [];
  const art = new WeakMap();
  const ready = loadArt();

  function loadArt() {
    if (artPending) return artPending;
    const missing = [];
    if (!titleLease) missing.push(game.browser.loadTexture(TITLE_ART).then((lease) => { titleLease = lease; }));
    if (!portraitsLease) missing.push(game.browser.loadTexture(PORTRAITS).then((lease) => { portraitsLease = lease; }));
    artPending = Promise.allSettled(missing).then((results) => {
      artPending = undefined;
      artFailed = results.some((result) => result.status === 'rejected');
      if (!title || game.scope.state !== 'open') return;
      const restoreFocus = retryWasFocused && (ui.focused === null || ui.focused === 'retryTitleArt');
      retryWasFocused = false;
      paintTitle();
      if (restoreFocus) ui.focus(artFailed ? 'retryTitleArt' : 'startButton');
    });
    return artPending;
  }

  function retryTitleArt() {
    if (artPending) return;
    retryWasFocused = ui.focused === 'retryTitleArt';
    void loadArt();
    paintTitle();
  }

  function bitmap(node, lease, w, h, crop) {
    if (!lease) return;
    let picture = art.get(node);
    if (!picture) {
      picture = new Bitmap(lease);
      node.addChild(picture);
      art.set(node, picture);
    }
    if (crop) picture.sourceRect = crop;
    picture.width = w;
    picture.height = h;
  }

  function titleBackdrop(node, { w, h }) {
    let crop;
    if (titleLease && h > w) {
      const source = titleLease.value;
      const width = Math.floor(Math.min(source.width, source.height * w / h));
      crop = { x: Math.max(0, source.width - width), y: 0, width, height: source.height };
    }
    bitmap(node, titleLease, w, h, crop);
    const extent = w * (h > w ? 1 : .66);
    node.graphics.clear().beginFill(0x081a20).drawRect(0, 0, w, h).endFill();
    let shade = node.numChildren > 1 ? node.getChildAt(1) : null;
    if (node.numChildren && shade === null) shade = game.sprite(undefined, node);
    if (!shade || !shade.graphics) return;
    // The photographed right side stays bright. Gradual shading protects the letters over the left.
    const graphics = shade.graphics.clear();
    if (h > w) {
      graphics.beginFill(0x081a20, .73).drawRect(0, h * .13, w, h * .79).endFill();
      return;
    }
    const strips = 28;
    for (let index = 0; index < strips; index++) {
      const ratio = index / (strips - 1);
      const alpha = 0.95 * (1 - ratio ** 3);
      if (alpha > 0) graphics.beginFill(0x081a20, alpha)
        .drawRect(index * extent / strips, 0, extent / strips, h).endFill();
    }
  }

  function titleChoice(parent, name, caption, detail, selected, x, w, action) {
    return [
      button(name, '', x, 0, w, TITLE_TARGET, action, {
        parent, dark: true, label: caption + ' · ' + detail, checked: selected,
        role: 'radio', color: selected ? 0x4c372d : 0x122d35,
        card: { radius: 8, border: selected ? GOLD : 0x9d785b }
      }),
      text(name + '-caption', caption, x + 12, 9, w - 24, 27, { parent, color: IVORY, size: 22, bold: true, decorative: true }),
      ...paragraph(name + '-detail', detail, x + 12, 34, w - 24, getLanguage() === 'en' && w < 220 ? 15 : 17, 18, { parent, color: 0xe1c8ae, decorative: true })
    ];
  }

  function paintTitle() {
    const en = getLanguage() === 'en';
    const setup = save.data.setup;
    const warning = [
      problems.some((code) => ['corrupt', 'unreadable', 'invalid'].includes(code)) ? t('saveBroken') : '',
      problems.some((code) => ['write', 'refused'].includes(code)) ? t('saveRefused') : ''
    ].filter(Boolean).join(' ');
    const choose = (key, value) => () => {
      if (save.data.setup[key] === value) return;
      save.update((data) => { data.setup[key] = value; });
      paintTitle();
    };
    const notices = warning ? paragraph('save-notice', warning, 56, 229, 625, 17, 22, { color: IVORY }) : [];
    const top = warning ? 262 + (notices.length - 1) * 22 : 215;
    const items = [
      fill(0, 0, 1280, 720, 0x081a20, { name: 'title-art', decorate: titleBackdrop }),
      fill(56, 74, 28, 2, COPPER),
      text('title-type', t('titleType'), 96, 60, 550, 29, { color: COPPER, bold: true, size: 21 }),
      text('title-name', t('title'), 54, 91, 708, 92, { color: IVORY, bold: true, size: en ? 51 : 76, role: 'heading', level: 1 }),
      ...paragraph('tagline', t('tagline'), 56, 181, 638, 22, 27, { color: 0xf2e2c6 }),
      ...notices,
      // Begin keyboard traversal at the main action, while retaining the established visual layout.
      button('startButton', t('play'), 56, top + 322, 162, TITLE_TARGET, start, { dark: true, primary: true, size: 23 }),
      text('rounds-label', t('length'), 56, top, 305, 24, { color: COPPER, size: 17, bold: true }),
      part('panel', 56, top + 30, 611, TITLE_TARGET, { name: 'rounds-group', role: 'radiogroup', label: t('length') }),
      ...[[1, 'oneRound', 'oneRoundNote'], [4, 'fullGame', 'fullGameNote']].flatMap(([value, key, note], index) =>
        titleChoice('rounds-group', 'rounds-' + value, t(key), t(note), setup.rounds === value, index * 311, 300, choose('rounds', value))),
      text('level-label', t('level'), 56, top + 115, 305, 24, { color: COPPER, size: 17, bold: true }),
      part('panel', 56, top + 145, 611, TITLE_TARGET, { name: 'level-group', role: 'radiogroup', label: t('level') }),
      ...levelNames.flatMap((level, index) =>
        titleChoice('level-group', 'level-' + level, t(level), t(level + 'Note'), setup.level === level, index * 207, 197, choose('level', level))),
      ...titleCrowd.flatMap((seat, index) => {
        const x = 56 + index * 207, y = top + 237;
        return [
          card(x, y, 197, 65, JADE, 0x7f6250, 7),
          fill(x + 6, y + 6, 53, 53, 0x285147, {
            name: 'opponent-art-' + seat,
            decorate(node, { w, h }) { bitmap(node, portraitsLease, w, h, { x: index * 480, y: 0, width: 480, height: 480 }); }
          }),
          text('opponent-' + seat, nameOf(seat), x + 66, y + 5, 122, 27, { color: IVORY, size: 18, bold: true }),
          ...paragraph('opponent-note-' + seat, t(seats[seat].key + 'Note'), x + 66, y + 33, 122, 14, 16, { color: 0xe2ccb3 })
        ];
      }),
      ...[
        ['rulesButton', t('rules'), 137, () => open('rules')],
        ['recordButton', t('record'), 100, () => open('record')],
        ['settingsButton', t('settings'), 101, () => open('settings')],
        ['languageButton', en ? t('chinese') : t('english'), TITLE_TARGET, () => switchLanguage(), { label: t('switchLanguage') }]
      ].map(([name, label, w, action, options], index, entries) => {
        const x = 226 + entries.slice(0, index).reduce((width, row) => width + row[2] + 8, 0);
        return button(name, label, x, top + 322, w, TITLE_TARGET, action, { dark: true, size: 18, ...options });
      })
    ];
    if (artFailed) {
      items.push(
        card(768, 483, 444, 164, 0x102d35, COPPER, 12),
        ...paragraph('title-art-notice', t('titleArtUnavailable'), 790, 502, 398, 20, 25, { color: IVORY }),
        button('retryTitleArt', t(artPending ? 'titleArtLoading' : 'retryTitleArt'), 790, 552, 204, TITLE_TARGET, retryTitleArt,
          { dark: true, disabled: Boolean(artPending) })
      );
    }
    ui.show('title', { label: t('title'), skin: TITLE_SKIN, items: titleVariant(items, top), frame: wideFrame,
      variants: {
        tablet: { frame: wideFrame, items },
        portrait: { frame: tallFrame(720), items: titleVariant(items, top, 720) },
        tabletPortrait: { frame: tallFrame(920), items: titleVariant(items, top, 920) }
      }
    });
  }

  function sheet(id, heading, x, y, w, h, contents) {
    const items = [
      fill(0, 0, 1280, 720, 0x08171c, { name: 'sheetShade', alpha: 0.53 }),
      { ...card(x - 5, y - 5, w + 10, h + 10, 0x132e36, 0x132e36, 16), name: 'sheetEdge' },
      { ...card(x, y, w, h, PAPER, COPPER, 11), name: 'sheetPaper' },
      text(id + 'Title', heading, x + 35, y + 23, w - 70, 49, { color: LACQUER, size: 37, bold: true, role: 'heading' }),
      fill(x + 36, y + 78, w - 72, 1.5, 0xb79369, { name: 'sheetDivider' }),
      ...contents
    ];
    const source = { x, y, w, h };
    ui.show(id, {
      label: heading, modal: true, skin: SHEET_SKIN,
      initialFocus: SHEET_FOCUS[id],
      dismiss: () => id === 'menu' ? resume() : close(id),
      ...(id === 'menu' ? { resume } : {}),
      items: phoneSheet(id, items, source), frame: wideFrame,
      variants: {
        tablet: { frame: wideFrame, items },
        portrait: { frame: tallFrame(720), items: portraitSheet(id, items, source, 720) },
        tabletPortrait: { frame: tallFrame(920), items: portraitSheet(id, items, source, 920) }
      }
    });
  }

  function paintRules() {
    const x = 62, y = 24, w = 1156, h = 672;
    const viewport = { x: x + 512, y: y + 116, w: 604, h: 448 };
    const descriptions = [];
    let lineY = y + 105;
    for (const key of ['rulesIntro', 'rulesFlow', 'rulesPay', 'rulesNotIncluded']) {
      const lines = paragraph(key, t(key, { base: rules.base, per: rules.perTai }), x + 36, lineY, 456, 19, 22);
      descriptions.push(...lines);
      lineY += lines.length * 22 + 9;
    }
    const rows = [];
    let rowY = 0;
    for (const [index, [key, points]] of Object.entries(tai).entries()) {
      const parent = 'rulesScroll';
      const notes = paragraph('rule-note-' + key, t('note_' + key), 220, rowY + 7, 320, 17, 24, { parent, color: MUTED });
      const rowH = Math.max(43, notes.length * 24 + 14);
      rows.push(
        fill(0, rowY, viewport.w, rowH - 1, index % 2 ? 0xf0e1c5 : 0xfaf1de, { parent }),
        text('rule-tai-' + key, t('tai_' + key), 10, rowY + 3, 205, rowH - 7, { parent, size: 18, bold: true }),
        ...notes,
        text('rule-points-' + key, String(points), viewport.w - 56, rowY + 3, 42, rowH - 7, { parent, size: 19, align: 'right', bold: true, color: LACQUER })
      );
      rowY += rowH;
    }
    const page = (direction) => () => {
      const view = ui.view('rules');
      if (view) view.scroll('rulesScroll').scrollBy(direction * view.rect('rulesScroll').height * .88);
    };
    sheet('rules', t('rules'), x, y, w, h, [
      ...descriptions,
      text('tai-table-heading', t('taiTable'), viewport.x, y + 83, viewport.w, 30, { color: LACQUER, size: 20, bold: true, role: 'heading' }),
      part('panel', viewport.x, viewport.y, viewport.w, viewport.h, { name: 'rulesScroll', label: t('taiTable'), scroll: 'vertical' }),
      ...rows,
      button('rulesClose', t('close'), x + w / 2 - 80, y + 581, 160, 69, () => close('rules')),
      button('rulesUp', '↑', x + w - 202, y + 581, 76, 69, page(-1), { label: t('rulesUp') }),
      button('rulesDown', '↓', x + w - 116, y + 581, 76, 69, page(1), { label: t('rulesDown') })
    ]);
  }

  function paintSettings() {
    const x = 197, y = 91, w = 886, h = 538;
    const state = save.data.settings;
    const toggle = (key) => [key, t(key), t(state[key] ? 'on' : 'off'), () => setSetting(key, !state[key]), state[key]];
    const rows = [
      toggle('sound'), toggle('music'), toggle('voice'),
      ['pace', t('pace'), t(state.pace), () => setSetting('pace', state.pace === 'calm' ? 'brisk' : 'calm')],
      toggle('hints'), toggle('reducedMotion'),
      ['language', t('switchLanguage'), getLanguage() === 'zh' ? t('english') : t('chinese'), () => switchLanguage()]
    ];
    sheet('settings', t('settings'), x, y, w, h, [
      ...rows.flatMap(([key, label, value, update, checked], index) => {
        const left = x + 36 + (index % 2) * 413, top = y + 98 + Math.floor(index / 2) * 82;
        return [
          card(left, top, 401, 73, 0xfdf2dd, 0xd6bf98, 8),
          text('setting-label-' + key, label, left + 14, top + 11, 227, 51, { size: 21, bold: true }),
          button('setting-' + key, value, left + 253, top + 5, 141, 63, () => { update(); paintSettings(); }, {
            label: label + ' · ' + value, ...(checked ? { color: 0x265745, textColor: IVORY } : {})
          })
        ];
      }),
      button('settingsClose', t('close'), x + 36, y + h - 85, 160, 65, () => close('settings'))
    ]);
  }

  function paintRecord() {
    const x = 282, y = 64, w = 716, h = 592, record = save.data.record;
    const rows = [
      ['recordGames', record.games], ['recordFirsts', record.firsts],
      ['recordHands', record.hands], ['recordWins', record.wins],
      ['recordSelf', record.selfDraws], ['recordDealIn', record.dealIns],
      ['recordBestTai', record.bestTai ? t('taiUnit', { n: record.bestTai }) : t('none')],
      ['recordBestGame', record.bestGame === null ? t('none') : t('points', { n: signed(record.bestGame) })]
    ];
    sheet('record', t('record'), x, y, w, h, [
      ...rows.flatMap(([key, value], index) => {
        const top = y + 98 + index * 47;
        return [
          fill(x + 36, top, w - 72, 46, index % 2 ? 0xf9edd7 : 0xf3e3c9),
          text(key + '-label', t(key), x + 51, top, w - 246, 46, { size: 22 }),
          text(key + '-value', String(value), x + w - 235, top, 184, 46, { color: LACQUER, bold: true, align: 'right' })
        ];
      }),
      button('recordClose', t('close'), x + 36, y + h - 85, 160, 65, () => close('record'))
    ]);
  }

  function paintMenu() {
    const x = 399, y = 108, w = 482, h = 504;
    sheet('menu', t('pauseTitle'), x, y, w, h, [
      ...[
        ['resumeButton', 'resume', resume],
        ['menuRules', 'rules', () => open('rules')],
        ['menuSettings', 'settings', () => open('settings')],
        ['quitButton', 'quit', quit]
      ].map(([name, key, action], index) =>
        button(name, t(key), x + 36, y + 105 + index * 96, w - 72, 79, action, { primary: index === 0, size: 26 }))
    ]);
  }

  const painters = { menu: paintMenu, rules: paintRules, settings: paintSettings, record: paintRecord };
  function open(id) {
    if (!Object.hasOwn(painters, id) || stack.includes(id)) return;
    playUi();
    stack.push(id);
    painters[id]();
  }
  function close(id = stack.at(-1)) {
    const at = stack.lastIndexOf(id);
    if (at === -1) return;
    for (const closed of stack.splice(at).reverse()) ui.hide(closed);
  }
  return {
    ready,
    showTitle() {
      title = true;
      paintTitle();
      ui.focus('startButton');
    },
    hideTitle() {
      title = false;
      ui.hide('title');
    },
    open,
    close,
    closeAll() { close(stack[0]); },
    refresh() {
      if (title) paintTitle();
      for (const id of stack) painters[id]();
    },
    get modal() { return stack.at(-1) ?? null; },
    get panels() { return stack.slice(); }
  };
}
