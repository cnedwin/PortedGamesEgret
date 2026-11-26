import { Bitmap, createSharedMaterial2D } from '@egret/engine';
import { createUiScreenStack } from '@egret/engine/ui';
import { amount, getLanguage, t } from './i18n.mjs';

const SCALE = 0.75;
const WIDTH = 1280;
const HEIGHT = 720;
const PAPER = 0xfcf8ee;
const INK = 0x293b38;
const SOFT = 0x586e65;
const RED = 0x9c493b;
const JADE = 0x345d4d;
const LINE = 0xdbceb5;
// The carved peach insignia is part of the illustration in either language.
const TITLE_SEAL = String.fromCodePoint(0x6843);
const SANS = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
const FONTS = {
  serif: ['Noto Serif SC', 'Songti SC', 'STSong', 'Noto Serif TC', 'SimSun', 'Georgia', 'Noto Serif'],
  sans: ['Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans', 'Roboto', 'Arial']
};
const SAVE_FAILURES = ['corrupt', 'unreadable', 'invalid', 'too-new', 'too-old', 'migration-failed'];
const TITLE_MATERIAL = createSharedMaterial2D({ filter: 'linear', mipmapFilter: 'linear' });

const panel = (name, x, y, w, h, decorate) => ({ type: 'panel', name, x, y, w, h, decorate });
const text = (name, x, y, w, h, words, size, extra) => ({ type: 'text', name, x, y, w, h, text: words, size, color: INK, ...extra });
const button = (name, x, y, w, h, words, action, extra) => ({
  type: 'button', name, x, y, w, h, text: words, action, size: 16, color: PAPER, textColor: INK,
  decorate: plainButton, ...extra
});
const stop = (offset, color, alpha = 1) => ({ offset, color, alpha });

function plainButton(node, { w, h }) {
  node.graphics.clear().lineStyle(SCALE, LINE).beginFill(PAPER).drawRoundRect(0, 0, w, h, 20 * SCALE).endFill();
}

function primaryButton(node, { w, h }) {
  const inset = 4 * SCALE;
  node.graphics.clear()
    .lineStyle(SCALE, 0xa8794d)
    .beginLinearGradientFill(0, 0, 0, h, [stop(0, 0xab5c46), stop(1, 0x873f33)])
    .drawRoundRect(0, 0, w, h, 16 * SCALE).endFill()
    .lineStyle(SCALE, 0xe9bd86, 0.66)
    .drawRoundRect(inset, inset, w - 2 * inset, h - 2 * inset, 11 * SCALE);
}

function modalPaper(node, { w, h }) {
  const inset = 5 * SCALE;
  node.graphics.clear()
    .lineStyle(3 * SCALE, 0x6d513a, 0.15)
    .beginLinearGradientFill(0, 0, w, h, [stop(0, 0xfff7e6), stop(1, 0xf5e7cb)])
    .drawRoundRect(0, 0, w, h, 18 * SCALE).endFill()
    .lineStyle(SCALE, 0xc8b189)
    .drawRoundRect(inset, inset, w - 2 * inset, h - 2 * inset, 9 * SCALE);
}

function slotPaper(occupied) {
  return (node, { w, h }) => {
    node.graphics.clear().lineStyle(SCALE, 0xbdab83)
      .beginFill(occupied ? 0xfff9e9 : 0xf6edda).drawRoundRect(0, 0, w, h, 12 * SCALE).endFill()
      .lineStyle(0).beginFill(occupied ? 0x58806a : 0xbaa681).drawRect(SCALE, 5 * SCALE, 3 * SCALE, h - 10 * SCALE).endFill();
  };
}

async function loadIllustration(game, layer) {
  const lease = await game.browser.loadTexture(new URL('../assets/title-watercolor.webp', import.meta.url).href);
  const bitmap = game.scope.use(new Bitmap(lease));
  bitmap.sharedMaterial = TITLE_MATERIAL;
  bitmap.scaleX = WIDTH * SCALE / bitmap.width;
  bitmap.scaleY = HEIGHT * SCALE / bitmap.height;
  layer.addChild(bitmap);
}

/** Title, save slots, settings and offline harvest, using the engine's screen stack. */
export function createScreens(game, ui, { slots, problems, preferences, isPlaying, isCompact, onEnter, onSetting, onReturnTitle, onAwayClose }) {
  const screens = createUiScreenStack({ onError: console.error });
  const measure = document.createElement('canvas').getContext('2d');
  const art = game.sprite(undefined, game.ui);
  const artwork = game.sprite(undefined, art);
  const finish = game.sprite(undefined, art);
  game.ui.setChildIndex(art, 0);
  art.visible = false;
  art.graphics.beginFill(0xe3ecdc).drawRect(0, 0, WIDTH * SCALE, HEIGHT * SCALE).endFill();
  finish.graphics
    .beginLinearGradientFill(0, 0, WIDTH * SCALE, 0, [stop(0, 0xfff6e3), stop(.23, 0xfffaec, .85), stop(.47, 0xfffaf0, .21), stop(.65, 0xfffaf0, 0)])
    .drawRect(0, 0, WIDTH * SCALE, HEIGHT * SCALE).endFill()
    .lineStyle(SCALE, 0x846e4c, .58)
    .drawRect(22 * SCALE, 22 * SCALE, (WIDTH - 44) * SCALE, (HEIGHT - 44) * SCALE);
  let titleVisible = false;
  let current = null;
  let returnPending = false;
  let awayLines = [];
  let artworkStatus = 'loading';
  const labels = new WeakMap();
  const fonts = Object.fromEntries(Object.entries(FONTS).map(([style, choices]) => [style, availableFont(choices)]));
  const ready = prepareIllustration();

  async function prepareIllustration() {
    artworkStatus = 'loading';
    if (titleVisible) renderTitle();
    try {
      await loadIllustration(game, artwork);
      artworkStatus = 'ready';
    } catch (error) {
      artworkStatus = 'failed';
      console.warn('The title illustration could not be loaded.', error);
    }
    if (titleVisible) renderTitle();
  }

  async function retryIllustration() {
    if (artworkStatus !== 'failed') return;
    const restoreFocus = ui.focused === 'retryTitleArtwork';
    await prepareIllustration();
    if (titleVisible && restoreFocus) ui.focus(artworkStatus === 'failed' ? 'retryTitleArtwork' : 'startButton');
  }

  function availableFont(choices) {
    if (!measure) return choices[0];
    const sample = `${TITLE_SEAL} wide ii MW`;
    measure.font = '20px monospace';
    const baseline = measure.measureText(sample);
    return choices.find((family) => {
      measure.font = `20px "${family}", monospace`;
      const candidate = measure.measureText(sample);
      return candidate.width !== baseline.width || candidate.actualBoundingBoxAscent !== baseline.actualBoundingBoxAscent;
    }) ?? choices.at(-1);
  }

  function wrap(words, size, width) {
    if (!measure) return words;
    measure.font = `${size}px ${SANS}`;
    return words.split('\n').map((paragraph) => {
      const units = [...new Intl.Segmenter(getLanguage(), { granularity: 'word' }).segment(paragraph)].map(({ segment }) => segment);
      const lines = [];
      let row = '';
      for (const unit of units) {
        if (row && measure.measureText(row + unit).width > width) {
          lines.push(row.trimEnd());
          row = unit.trimStart();
        } else row += unit;
      }
      return [...lines, row.trimEnd()].join('\n');
    }).join('\n');
  }

  function nativeLabel(words, size, lineHeight, { family = 'serif', weight = 700, color = INK, align = 'left', decorate } = {}) {
    return (node, rect) => {
      decorate?.(node, rect);
      const locale = /[\u4e00-\u9fff]/u.test(words) ? 'zh' : 'en';
      const spec = { text: words, fontFamily: fonts[family], fontSize: size * SCALE,
        lineHeight: lineHeight * SCALE, fontWeight: weight, locale, color };
      const key = JSON.stringify(spec);
      const place = (entry) => {
        if (!entry.label) return;
        const { display } = entry.label;
        display.x = align === 'center' ? (entry.rect.w - display.width) / 2 : 0;
        display.y = (entry.rect.h - display.height) / 2;
      };
      const previous = labels.get(node);
      if (previous?.key === key) {
        previous.rect = rect;
        place(previous);
        return;
      }
      previous?.label?.dispose();
      const next = { key, rect, label: null };
      labels.set(node, next);
      void game.browser.createLabel(spec).then(async (label) => {
        try {
          await label.ready;
          if (!node.isDisposed && labels.get(node) === next) {
            next.label = label;
            node.addChild(label.display);
            place(next);
          } else label.dispose();
        } catch (error) {
          label.dispose();
          throw error;
        }
      }).catch((error) => {
        if (node.isDisposed || labels.get(node) !== next) return;
        game.text(words, { size: size * SCALE, bold: true, color, align, layer: node, baseline: 'middle',
          x: align === 'center' ? rect.w / 2 : 0, y: rect.h / 2 });
        console.warn('Title typography fell back to the standard game font.', error);
      });
    };
  }

  function bodyText(name, x, y, w, h, words, size, { color = INK, lineHeight = size * 1.25 } = {}) {
    return text(name, x, y, w, h, words, size, { hideText: true,
      decorate: nativeLabel(words, size, lineHeight, { family: 'sans', weight: 400, color }) });
  }

  function menuButton(name, x, y, w, h, words, action, extra = {}) {
    return button(name, x, y, w, h, words, action, { ...extra, hideText: true,
      decorate: nativeLabel(words, 16, 20, { family: 'sans', weight: 600, align: 'center', color: extra.textColor,
        decorate: plainButton }) });
  }

  function renderTitle() {
    const zh = getLanguage() === 'zh';
    const warnings = [SAVE_FAILURES.some((problem) => problems.has(problem)) ? t('saveBroken') : '', problems.has('write-failed') ? t('saveRefused') : ''].filter(Boolean);
    const notice = wrap(warnings.join(' '), 16, 360);
    const warningH = notice ? 22 * notice.split('\n').length + 15 : 0;
    const y = (zh ? 148 : 119) - warningH / 2;
    const titleH = zh ? 82 : 112;
    const tagY = y + 92 + titleH;
    const tagline = wrap(t('tagline'), 18, 370);
    const tagH = (zh ? 2 : 3) * 28;
    const startY = tagY + tagH + 24 + warningH;
    const title = zh ? t('title') : t('title').replace(/ (Peach Creek)$/u, '\n$1');
    const start = slots.some((slot) => slot.data.county) ? t('continue') : t('start');
    const coverNeedsAttention = artworkStatus !== 'ready';
    document.title = t('pageTitle');
    const items = [
      panel('titleSeal', 70, y, 58, 62, nativeLabel(TITLE_SEAL, 37, 44, { color: 0xfff1dc, align: 'center', decorate(node, { w, h }) {
        node.graphics.clear().lineStyle(2 * SCALE, 0x873f37).beginFill(RED).drawRoundRect(0, 0, w, h, 8 * SCALE).endFill()
          .lineStyle(2 * SCALE, 0xeed8b4).drawRect(4 * SCALE, 4 * SCALE, w - 8 * SCALE, h - 8 * SCALE);
      } })),
      text('titleName', 70, y + 77, 520, titleH, t('title'), zh ? 76 : 52, { hideText: true, role: 'heading', level: 1,
        decorate: nativeLabel(title, zh ? 76 : 52, zh ? 82 : 56, { weight: 800 }) }),
      bodyText('tagline', 70, tagY, 370, tagH, tagline, 18, { color: SOFT, lineHeight: 28 }),
      button('startButton', 70, startY, 300, 62, start, openSlots, {
        size: 22, textColor: 0xfff8ef, color: RED, hideText: true,
        decorate: nativeLabel(start, 22, 28, { color: 0xfff8ef, align: 'center', decorate: primaryButton })
      }),
      menuButton('titleSettings', 70, startY + 70, 146, 44, t('settings'), () => openSettings('titleSettings')),
      menuButton('languageButton', 224, startY + 70, 146, 44, languageValue(), () => { onSetting('language'); refresh(); }, { label: t('switchLanguage') }),
      bodyText('demoLine', 70, startY + (coverNeedsAttention ? 194 : 142), 500, 18, t('demo'), 12, { color: SOFT })
    ];
    if (coverNeedsAttention) items.push(menuButton('retryTitleArtwork', 70, startY + 122, 300, 44,
      t(artworkStatus === 'failed' ? 'retryTitleArtwork' : 'loadingTitleArtwork'), () => { void retryIllustration(); },
      { disabled: artworkStatus === 'loading' }));
    if (notice) items.push(bodyText('saveNotice', 70, tagY + tagH + 10, 360, warningH - 15, notice, 16, { color: RED }));
    ui.show('title', { label: t('title'), items });
  }

  function languageValue() { return getLanguage() === 'zh' ? t('english') : t('chinese'); }

  function modalCard(key, title, height, rows, heading = title) {
    const x = 420, y = (HEIGHT - height) / 2;
    const extraHeading = 40 * (heading.split('\n').length - 1);
    ui.show(key, { modal: true, label: title, skin: { dim: 0 }, items: [
      panel(`${key}Shade`, 0, 0, WIDTH, HEIGHT, (node, { w, h }) => {
        node.graphics.clear().beginFill(0x203229, .396).drawRect(0, 0, w, h).endFill();
      }),
      panel(`${key}Paper`, x, y, 440, height, modalPaper),
      text(`${key}Title`, x + 25, y + 24, 390, 39 + extraHeading, title, 27, { hideText: true, role: 'heading',
        decorate: nativeLabel(heading, 27, 39) }),
      ...rows(x + 25, y + 79 + extraHeading)
    ] });
  }

  function renderSlots(context) {
    const compact = isCompact();
    const rowH = compact ? 82 : 68, closeH = compact ? 62 : 44;
    modalCard('slots', t('saveSlotsTitle'), compact ? 450 : 396, (x, y) => [
      ...slots.flatMap((slot, index) => {
        const county = slot.data.county;
        const title = t('saveSlot', { n: index + 1 });
        const detail = county ? t('saveSlotCounty', { rank: t('r' + county.rank), term: (county.term ?? 0) + 1, people: amount(county.pop ?? 0) }) : t('saveSlotEmpty');
        const name = `saveSlot${index + 1}`;
        const top = y + index * (rowH + 9);
        return [
          button(name, x, top, 390, rowH, title, ({ via } = {}) => context.close({ index, keyboard: via !== 'pointer' }), {
            label: `${title} ${detail}`, hideText: true, color: county ? 0xfff9e9 : 0xf6edda, decorate: slotPaper(Boolean(county))
          }),
          text(undefined, x + 17, top + 8, 356, compact ? 31 : 26, title, compact ? 23 : 18, {
            hideText: true, decorate: nativeLabel(title, compact ? 23 : 18, compact ? 30 : 24)
          }),
          bodyText(undefined, x + 17, top + (compact ? 43 : 37), 356, 24, detail, compact ? 18 : 15, { color: SOFT })
        ];
      }),
      menuButton('closeSaveSlots', x, y + 3 * (rowH + 9) + 8, 61, closeH, t('close'), () => context.close())
    ]);
  }

  async function returnToTitle() {
    if (returnPending) return;
    returnPending = true;
    refresh();
    try { await onReturnTitle(); }
    finally {
      returnPending = false;
      if (!game.ui.isDisposed) refresh();
    }
  }

  function renderSettings(context) {
    const compact = isCompact();
    const h = compact ? 62 : 44;
    const rows = ['sound', 'music', 'reducedMotion', 'language'];
    modalCard('settings', t('settings'), compact ? 451 : 361, (x, y) => [
      ...rows.flatMap((key, i) => {
        const label = key === 'language' ? t('switchLanguage') : t(key);
        const value = key === 'language' ? languageValue() : t(preferences.data[key] ? 'on' : 'off');
        const top = y + i * (h + 8);
        const name = `setting${key[0].toUpperCase()}${key.slice(1)}`;
        return [bodyText(undefined, x, top, 285, h, label, 16),
          menuButton(name, x + 298, top, 92, h, value, () => { onSetting(key); refresh(); }, { label: `${label} ${value}` })];
      }),
      menuButton('closeSettings', x, y + 4 * (h + 8) + 5, 61, h, t('close'), () => context.close()),
      ...(isPlaying() ? [menuButton('returnToTitle', x + 68, y + 4 * (h + 8) + 5, 216, h, t('returnToTitle'), () => {
        void returnToTitle().catch(console.error);
      }, { textColor: JADE, disabled: returnPending })] : [])
    ]);
  }

  function renderAway(context) {
    const closeH = isCompact() ? 62 : 44;
    const title = t('welcomeBack');
    const zh = getLanguage() === 'zh';
    const heading = zh ? title : title.replace(/ (Creek)$/u, '\n$1');
    const headingExtra = 40 * (heading.split('\n').length - 1);
    const rows = awayLines.map((line) => {
      const words = typeof line === 'string' ? line : line.text;
      const wrapped = wrap(words, 16, 390);
      return { words: wrapped, muted: typeof line !== 'string' && line.muted, height: 21 * wrapped.split('\n').length };
    });
    const total = rows.reduce((sum, row) => sum + row.height + 19, 0);
    modalCard('away', title, 105 + total + closeH + headingExtra, (x, y) => {
      let top = y;
      const items = rows.map((line, index) => {
        const item = bodyText(`awayLine${index + 1}`, x, top, 390, line.height, line.words, 16, { color: line.muted ? SOFT : INK });
        top += line.height + 19;
        return item;
      });
      return [...items, menuButton('awayOk', x, top, zh ? 46 : 54, closeH, t('ok'), () => context.close())];
    }, heading);
  }

  function defineModal(id, render, firstFocus) {
    return { id, layer: 'modal', open(context) {
      return {
        show() { current = { id, context, render }; render(context); },
        activate() { ui.focus(firstFocus()); },
        close() { ui.hide(id); current = null; }
      };
    } };
  }

  const titlePage = { id: 'title', layer: 'page', back: 'none', open() {
    return {
      show() { titleVisible = true; art.visible = true; renderTitle(); ui.focus('startButton'); },
      close() { titleVisible = false; art.visible = false; ui.hide('title'); }
    };
  } };
  const slotsModal = defineModal('slots', renderSlots, () => {
    const firstUsed = slots.findIndex((slot) => slot.data.county);
    return `saveSlot${Math.max(0, firstUsed) + 1}`;
  });
  const settingsModal = defineModal('settings', renderSettings, () => 'settingSound');
  const awayModal = defineModal('away', renderAway, () => 'awayOk');

  function openSlots() {
    if (screens.isOpen(slotsModal)) return;
    void screens.open(slotsModal).then((result) => {
      if (result) onEnter(result.index, result.keyboard);
      else ui.focus('startButton');
    }).catch(console.error);
  }

  function openSettings(from = 'titleSettings') {
    if (screens.isOpen(settingsModal)) return;
    void screens.open(settingsModal).then(() => ui.focus(from)).catch(console.error);
  }

  function refresh() {
    if (titleVisible) renderTitle();
    current?.render(current.context);
  }

  return {
    ready,
    showTitle() { void screens.open(titlePage).catch(console.error); },
    hideTitle() { void screens.close(titlePage).catch(console.error); },
    openSlots,
    openSettings,
    showAway(lines) {
      awayLines = lines;
      if (screens.isOpen(awayModal)) {
        if (current?.id === 'away') current.render(current.context);
        return;
      }
      void screens.open(awayModal).then(onAwayClose).catch(console.error);
    },
    refresh,
    back() {
      if (!current) return false;
      if (!returnPending) void screens.back().catch(console.error);
      return true;
    },
    get modal() {
      if (current) return current.id;
      return [slotsModal, settingsModal, awayModal].find((modal) => screens.isOpen(modal))?.id ?? null;
    }
  };
}
