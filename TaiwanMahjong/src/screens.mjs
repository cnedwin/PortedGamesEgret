// The menu controls and rules viewport are Egret views. The rain-room art and seals share the game texture scope.
import { Bitmap } from '@egret/engine';
import { getLanguage, t } from './i18n.mjs';
import { scrollRotatedTouch } from './ui.mjs';

const TITLE_ART = new URL('../assets/rain-room.webp', import.meta.url).href;
const PORTRAITS = new URL('../assets/opponents.webp', import.meta.url).href;
const PAPER = 0xf8ecd4;
const IVORY = 0xfff5dc;
const COPPER = 0xd7a674;
const GOLD = 0xffda9e;
const INK = 0x29201b;
const MUTED = 0x6b5546;
const LACQUER = 0x79382c;
const JADE = 0x12353b;
const SCALE = 0.75;
const TITLE_SKIN = { accent: GOLD, dim: 0.5 };
const SHEET_SKIN = { accent: 0x28644a, dim: 0 };
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

/** Native title, rules, record, preferences, and the pause menu. Actions are owned by the round controller. */
export function createScreens(game, ui, {
  save, problems, nameOf, seats, levelNames, rules, tai, start, setSetting, switchLanguage, resume, quit, playUi
}) {
  let title = false, rulesView, titleLease, portraitsLease, artPending;
  let artFailed = false, retryWasFocused = false;
  const stack = [];
  const art = new WeakMap();
  const ready = loadArt();

  scrollRotatedTouch(game, () => stack.at(-1) === 'rules' ? rulesView : null, 'rulesScroll');

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
    if (!lease || art.has(node)) return;
    const picture = new Bitmap(lease);
    if (crop) picture.sourceRect = crop;
    picture.width = w;
    picture.height = h;
    node.addChild(picture);
    art.set(node, picture);
  }

  function titleBackdrop(node, { w, h }) {
    bitmap(node, titleLease, w, h);
    const extent = w * 0.66;
    node.graphics.clear().beginFill(0x081a20).drawRect(0, 0, w, h).endFill();
    let shade = node.numChildren > 1 ? node.getChildAt(1) : null;
    if (node.numChildren && shade === null) shade = game.sprite(undefined, node);
    if (!shade || !shade.graphics) return;
    // The photographed right side stays bright. Gradual shading protects the letters over the left.
    const graphics = shade.graphics.clear();
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
      ...paragraph(name + '-detail', detail, x + 12, 34, w - 24, 16, 16, { parent, color: 0xe1c8ae, decorative: true })
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
          ...paragraph('opponent-note-' + seat, t(seats[seat].key + 'Note'), x + 66, y + 34, 122, 13, 15, { color: 0xe2ccb3 })
        ];
      }),
      ...[
        ['startButton', t('play'), 162, start, { primary: true }],
        ['rulesButton', t('rules'), 137, () => open('rules')],
        ['recordButton', t('record'), 100, () => open('record')],
        ['settingsButton', t('settings'), 101, () => open('settings')],
        ['languageButton', en ? t('chinese') : t('english'), TITLE_TARGET, () => switchLanguage(), { label: t('switchLanguage') }]
      ].map(([name, label, w, action, options], index, entries) => {
        const x = 56 + entries.slice(0, index).reduce((width, row) => width + row[2] + 8, 0);
        return button(name, label, x, top + 322, w, TITLE_TARGET, action, { dark: true, size: index === 0 ? 23 : 18, ...options });
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
    ui.show('title', { label: t('title'), skin: TITLE_SKIN, items });
  }

  function sheet(id, heading, x, y, w, h, contents) {
    const view = ui.show(id, {
      label: heading, modal: true, skin: SHEET_SKIN,
      dismiss: () => id === 'menu' ? resume() : close(id),
      ...(id === 'menu' ? { resume } : {}),
      items: [
        // This scrim shares the table's design coordinates when the whole view turns on a phone.
        fill(0, 0, 1280, 720, 0x08171c, { alpha: 0.53 }),
        card(x - 5, y - 5, w + 10, h + 10, 0x132e36, 0x132e36, 16),
        card(x, y, w, h, PAPER, COPPER, 11),
        text(id + 'Title', heading, x + 35, y + 23, w - 70, 49, { color: LACQUER, size: 37, bold: true, role: 'heading' }),
        fill(x + 36, y + 78, w - 72, 1.5, 0xb79369),
        ...contents
      ]
    });
    return view;
  }

  function paintRules() {
    const x = 62, y = 24, w = 1156, h = 672;
    const viewport = { x: x + 512, y: y + 116, w: 604, h: 448 };
    const top = rulesView?.scroll('rulesScroll').offset ?? 0;
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
      const notes = paragraph('rule-note-' + key, t('note_' + key), 220, rowY + 7, 320, 16, 22, { parent, color: MUTED });
      const rowH = Math.max(41, notes.length * 22 + 14);
      rows.push(
        fill(0, rowY, viewport.w, rowH - 1, index % 2 ? 0xf0e1c5 : 0xfaf1de, { parent }),
        text('rule-tai-' + key, t('tai_' + key), 10, rowY + 3, 205, rowH - 7, { parent, size: 17, bold: true }),
        ...notes,
        text('rule-points-' + key, String(points), viewport.w - 56, rowY + 3, 42, rowH - 7, { parent, size: 19, align: 'right', bold: true, color: LACQUER })
      );
      rowY += rowH;
    }
    const page = (direction) => () => rulesView?.scroll('rulesScroll').scrollBy(direction * viewport.h * 0.88 * SCALE);
    rulesView = sheet('rules', t('rules'), x, y, w, h, [
      ...descriptions,
      text('tai-table-heading', t('taiTable'), viewport.x, y + 83, viewport.w, 30, { color: LACQUER, size: 20, bold: true, role: 'heading' }),
      part('panel', viewport.x, viewport.y, viewport.w, viewport.h, { name: 'rulesScroll', label: t('taiTable'), scroll: 'vertical' }),
      ...rows,
      button('rulesClose', t('close'), x + w / 2 - 80, y + 581, 160, 69, () => close('rules')),
      button('rulesUp', '↑', x + w - 202, y + 581, 76, 69, page(-1), { label: t('rulesUp') }),
      button('rulesDown', '↓', x + w - 116, y + 581, 76, 69, page(1), { label: t('rulesDown') })
    ]);
    rulesView.scroll('rulesScroll').scrollTo(top);
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
    const first = { menu: 'resumeButton', rules: 'rulesClose', settings: 'setting-sound', record: 'recordClose' };
    ui.focus(first[id], { via: 'keyboard' });
  }
  function close(id = stack.at(-1)) {
    const at = stack.lastIndexOf(id);
    if (at === -1) return;
    for (const closed of stack.splice(at).reverse()) {
      if (closed === 'rules') rulesView = undefined;
      ui.hide(closed);
    }
  }
  return {
    ready,
    showTitle() {
      title = true;
      paintTitle();
      ui.focus('startButton', { via: 'keyboard' });
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
