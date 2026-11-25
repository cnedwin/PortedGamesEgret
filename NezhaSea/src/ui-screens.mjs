import { Bitmap } from '@egret/engine';
import { getLanguage, t } from './i18n.mjs';
import { DANGER, HEROES, HERO_KINDS, WAVES } from './sim/data.mjs';
import { GOLD, MUTED, button, label, layoutFor, panel, paper, primary, textWidth, wrap } from './ui-layout.mjs';

const center = (size, color = GOLD) => ({ size, color, bold: true, align: 'center' });
const totalKeys = ['wavesStat', 'killsStat', 'mergesStat', 'divineStat'];
const totalFields = ['wave', 'kills', 'merges', 'divines'];

export function createScreens(game, app, actions) {
  // The portraits live inside the Egret views. Failed downloads leave the same readable card.
  const art = Object.fromEntries(HERO_KINDS.map(hero => [
    hero, decodePortrait(hero).catch(error => { console.warn('Portrait unavailable', error); return null; })
  ]));
  async function decodePortrait(hero) {
    // The browser image provider accepts PNG; the supplied artwork is compressed WebP.
    const image = new Image();
    image.src = new URL('../assets/' + hero + '.webp', import.meta.url).href;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(300, image.naturalWidth);
    canvas.height = Math.round(image.naturalHeight * canvas.width / image.naturalWidth);
    canvas.getContext('2d', { willReadFrequently: true }).drawImage(image, 0, 0, canvas.width, canvas.height);
    return game.browser.textureFromCanvas(canvas);
  }
  function portrait(view, part, hero, unlocked, textShade) {
    const root = view.get(part);
    if (textShade && root.numChildren) root.getChildAt(0).visible = false;
    const { width, height } = view.rect(part);
    void art[hero].then(lease => {
      if (lease === null || root.isDisposed) return;
      const crop = game.sprite(undefined, root);
      crop.touchEnabled = crop.touchChildren = false;
      const image = new Bitmap(lease);
      const ownW = image.width, ownH = image.height;
      const scale = Math.max(width / ownW, height / ownH);
      const cropW = Math.max(1, Math.min(ownW, Math.round(width / scale)));
      const cropH = Math.max(1, Math.min(ownH, Math.round(height / scale)));
      image.sourceRect = {
        x: Math.round((ownW - cropW) * 0.5),
        y: Math.round((ownH - cropH) * 0.27),
        width: cropW, height: cropH
      };
      image.scaleX = width / cropW;
      image.scaleY = height / cropH;
      crop.addChild(image);
      image.alpha = unlocked ? 1 : 0.63;
      const shade = game.sprite(undefined, crop);
      const start = textShade ? height * 0.25 : 0;
      if (textShade) shade.graphics.beginLinearGradientFill(0, start, 0, height, [
        { offset: 0, color: 0x091d20, alpha: 0 },
        { offset: 0.55, color: 0x091d20, alpha: 0.48 },
        { offset: 1, color: 0x091d20, alpha: 0.99 }
      ]).drawRect(0, start, width, height - start).endFill();
      shade.graphics.lineStyle(2, 0xe4b976, unlocked ? 0.9 : 0.38).drawRect(1, 1, width - 2, height - 2);
      root.setChildIndex(crop, 0);
      actions.wakeTitle();
    });
  }

  function title() {
    const ui = layoutFor(game);
    const portraitMode = innerWidth < innerHeight;
    const short = ui.height < 500, narrow = ui.width < 470;
    const w = Math.min(portraitMode ? 545 : short ? 490 : 545, ui.width - (narrow ? 28 : 48));
    const side = portraitMode ? (ui.width - w) / 2 : 24;
    const top = portraitMode ? 14 + Math.min(222, Math.max(90, ui.height * 0.27)) : Math.max(13, (ui.height - (short ? 353 : 535)) / 2);
    const buttonH = 44, gap = 8;
    const heroW = (w - gap * 2) / 3;
    const heroH = short ? 74 : Math.min(heroW / 0.87, ui.height * (portraitMode ? 0.2 : 0.26));
    const titleSize = short ? (getLanguage() === 'zh' ? 50 : 37) :
      portraitMode ? Math.min(72, Math.max(44, ui.width * 0.119)) : getLanguage() === 'zh' ? 91 : 73;
    const lineSize = short ? 13 : 16;
    let y = 0;
    const children = [], bind = {};
    const add = (part, tap, extra) => {
      children.push(part);
      if (tap || extra) bind[part.name] = { ...(tap ? { tap } : {}), ...extra };
    };
    const headline = wrap(t('title'), w, titleSize, true);
    const headlineH = (titleSize + 3) * headline.split('\n').length;
    add(label('titleHeading', 0, y, w, headlineH, headline, titleSize, { bold: true, color: 0xffe6aa }));
    y += headlineH + 4;
    const line = wrap(t('titleLine'), w - 4, lineSize);
    const lineH = (lineSize + 4) * line.split('\n').length;
    add(label('titleLine', 0, y, w, lineH, line, lineSize, { color: MUTED }));
    y += lineH + 7;
    if (app.notice) {
      const words = wrap(t(app.notice), w - 12, 12);
      const h = (words.split('\n').length + 1) * 14;
      add(panel(undefined, 0, y, w, h, { color: 0x653830, alpha: 1 }));
      add(label('saveNotice', 6, y, w - 12, h, words, 12));
      y += h + 4;
    }
    const startW = Math.min(200, Math.max(120, w - 195));
    const guideW = narrow ? Math.min(96, (w - startW - 16) * 0.52) : 112;
    const settingsW = Math.min(106, w - startW - guideW - 16);
    add(button('start', 0, y, startW, buttonH, t('start'), { ...primary, size: 20 }), actions.start);
    add(button('guide', startW + gap, y, guideW, buttonH, t('howTitle'), { size: narrow ? 13 : 15 }), actions.guide);
    add(button('options', startW + guideW + gap * 2, y, settingsW, buttonH, t('settings')), actions.options);
    y += buttonH + (short ? 4 : 11);
    add(label('chooseHero', 0, y, w, 23, t('chooseHero'), 17, { color: GOLD, bold: true }));
    y += 24;

    const heroTop = y;
    for (const [index, hero] of HERO_KINDS.entries()) {
      const open = app.save.data.unlocked.includes(hero);
      const record = app.save.data.best[hero]?.[app.danger];
      const note = !open ? t(HEROES[hero].unlock === 'win' ? 'unlockWin' : 'unlockWave10') :
        record > WAVES ? t('bestWon') : record ? t('bestWave', { n: record }) : t('noBest');
      const x = index * (heroW + gap);
      const noteText = wrap(note, heroW - 10, short ? 10 : 11);
      const noteH = noteText.split('\n').length * (short ? 11 : 13);
      const heroNameSize = Math.min(15, (heroW - 10) / Math.max(1, textWidth(t(hero), 1, true)));
      add(button('hero_' + hero, x, y, heroW, heroH, t(hero), {
        color: open && app.hero === hero ? 0xa77849 : 0x193330,
        size: heroNameSize, textColor: 0x193330
      }), () => actions.hero(hero), { disabled: () => !open });
      add(label(undefined, x + 6, y + heroH - noteH - 23, heroW - 12, 17, t(hero), heroNameSize, { bold: true }));
      add(label('record_' + hero, x + 6, y + heroH - noteH - 5, heroW - 12, noteH, noteText, short ? 10 : 11, { color: MUTED }));
      if (app.hero === hero) add(panel(undefined, x + 4, y + 4, 18, 3, { color: 0xffdc99, alpha: 1 }));
    }
    y = heroTop + heroH + 3;
    const noteSize = narrow ? 11 : 12;
    const heroNote = wrap(t(app.hero + 'Note'), w, noteSize);
    const heroNoteH = heroNote.split('\n').length * (noteSize + 3);
    add(label('heroNote', 0, y, w, heroNoteH, heroNote, noteSize, { color: MUTED }));
    y += heroNoteH + 1;
    add(label('chooseDanger', 0, y, w, 22, t('chooseDanger'), 17, { color: GOLD, bold: true }));
    y += 23;
    DANGER.forEach((_, danger) => add(button('danger' + danger, danger * (heroW + gap), y, heroW, buttonH, t('danger' + danger), {
      size: narrow ? 12 : 15, color: app.danger === danger ? 0x45684e : 0x1a3a35
    }), () => actions.danger(danger)));
    y += buttonH + 2;
    add(label('dangerNote', 0, y, w, 18, t('danger' + app.danger + 'Note'), 12, { color: MUTED }));

    const y0 = Math.min(top, Math.max(6, ui.height - y - 20));
    return ui.show(t('title'), panel(undefined, side, y0, w, y + 18, { children }), {
      bind,
      built(view) {
        for (const hero of HERO_KINDS) portrait(view, 'hero_' + hero, hero, app.save.data.unlocked.includes(hero), true);
      }
    });
  }

  function dialog(heading, render, { maxWidth = 620, artwork, semanticName = heading } = {}) {
    const ui = layoutFor(game);
    const w = Math.min(maxWidth, ui.width - 24);
    const p = ui.height < 500 ? 15 : 24;
    const body = w - 2 * p;
    const children = [], bind = {};
    let y = p;
    const add = (part, binding) => {
      children.push(part);
      if (binding) bind[part.name] = binding;
    };
    const row = (words, { name, size = 15, color = MUTED, bold = false, inset = 0, gap = 8 } = {}) => {
      const content = wrap(words, body - inset, size, bold);
      const h = (size + 5) * content.split('\n').length;
      add(label(name, p + inset, y, body - inset, h, content, size, { color, bold }));
      y += h + gap;
    };
    const buttons = (list) => {
      const bw = (body - (list.length - 1) * 8) / list.length;
      list.forEach(([name, words, click, extra], index) => add(
        button(name, p + index * (bw + 8), y, bw, 44, words, {
          size: Math.min(15, (bw - 12) / Math.max(1, textWidth(words, 1, true))),
          ...extra
        }), { tap: click }
      ));
      y += 53;
    };
    const context = { add, row, buttons, p, body, ui, get top() { return y; }, advance: (height) => { y += height; } };
    if (heading) row(heading, { name: 'heading', size: ui.height < 500 ? 27 : 34, color: GOLD, bold: true, gap: 10 });
    render(context);
    const h = y + p - 8;
    return ui.show(semanticName, paper(children, (ui.width - w) / 2, Math.max(4, (ui.height - h) / 2), w, h), {
      modal: true, bind, built: artwork
    });
  }

  function settings({ add, p, body, ui, top, advance, buttons }) {
    const names = ['sound', 'music', 'reducedMotion'];
    const columns = body >= 470 ? 4 : 2;
    const bw = (body - (columns - 1) * 8) / columns;
    const s = app.save.data.settings;
    names.forEach((name, index) => {
      const words = t('switchState', { name: t(name), state: t(s[name] ? 'on' : 'off') });
      const x = p + index % columns * (bw + 8), y = top + Math.floor(index / columns) * 52;
      add({ type: 'toggle', name, x, y, width: bw, height: 44, text: words, checked: s[name],
        size: Math.max(10, Math.min(14, (bw - 59) / Math.max(1, textWidth(words, 1)))) },
      { tap: () => actions.setting(name) });
    });
    const index = names.length;
    add(button('language', p + index % columns * (bw + 8), top + Math.floor(index / columns) * 52, bw, 44, t('language')), { tap: actions.language });
    advance(Math.ceil(4 / columns) * 52);
  }

  function guide() {
    return dialog(t('howTitle'), ({ row, buttons, ui }) => {
      const small = ui.height < 500;
      row(game.device === 'touch' ? t('controlTouch') : t('controlKeys'), { name: 'controls', size: 14, gap: 9 });
      for (const index of [1, 2, 3]) row(index + '. ' + t('how' + index), { name: 'how' + index, size: small ? 13 : 15 });
      row(t('keysLine'), { name: 'keysLine', size: 12 });
      buttons([['start', t('start'), actions.start, primary], ['close', t('closed'), () => actions.title('guide')]]);
    });
  }

  function options() {
    return dialog(t('settings'), context => {
      settings(context);
      context.buttons([['close', t('closed'), () => actions.title('options'), primary]]);
    });
  }

  function menu() {
    return dialog(t('paused'), context => {
      context.row(t('wave', { n: app.run.wave, total: WAVES }), { name: 'pausedWave' });
      context.buttons([['resume', t('resume'), actions.resume, primary], ['quit', t('quit'), actions.quit]]);
      context.row(t('settings'), { name: 'settingsHeading', size: 21, color: GOLD, bold: true });
      settings(context);
    });
  }

  function end() {
    const result = app.result;
    const heading = t(result.won ? 'won' : 'lost');
    return dialog(null, context => {
      const { add, row, buttons, p, body, top, advance, ui } = context;
      const w = Math.min(190, body * 0.34);
      const h = Math.min(164, Math.max(85, ui.height * 0.17));
      add(panel('resultPortrait', p, top, w, h, { color: 0x203d37 }));
      const titleSize = Math.min(31, ui.width < 480 ? 25 : 31);
      const words = wrap(heading, body - w - 14, titleSize, true);
      const titleH = (titleSize + 3) * words.split('\n').length;
      add(label('resultHeading', p + w + 14, top + 8, body - w - 14, titleH, words, titleSize, { color: GOLD, bold: true }));
      const note = wrap(t(result.won ? 'wonNote' : 'lostNote', { wave: result.wave }), body - w - 14, 13);
      const noteH = note.split('\n').length * 16;
      add(label('resultNote', p + w + 14, top + 11 + titleH, body - w - 14, noteH, note, 13));
      advance(Math.max(h, titleH + noteH + 11) + 12);
      const cellW = body / 4, totalsTop = context.top;
      for (const [index, key] of totalKeys.entries()) {
        add(panel(undefined, p + cellW * index + 2, totalsTop, cellW - 4, 47, { color: 0x0b2221, alpha: 1 }));
        add(label(key, p + cellW * index, totalsTop, cellW, 19, t(key), 12, { align: 'center', color: MUTED }));
        add(label(key + 'Value', p + cellW * index, totalsTop + 19, cellW, 25, result[totalFields[index]], 19, center(19)));
      }
      advance(57);
      if (result.best) row(t('newBest'), { name: 'newBest', color: GOLD, size: 13, gap: 3 });
      result.unlocked.forEach((hero) => row(t('unlocked', { name: t(hero) }), { name: 'unlocked_' + hero, size: 13, color: GOLD, gap: 3 }));
      if (!result.kept) row(t('saveRefused'), { name: 'saveNotice', size: 13, color: 0xffbda0 });
      buttons([['again', t('again'), actions.start, primary], ['title', t('toTitle'), () => actions.title()]]);
    }, { semanticName: heading, artwork: view => portrait(view, 'resultPortrait', app.hero, true, false) });
  }

  function error() {
    return dialog(t('loadError'), ({ row, buttons }) => {
      row(t('loadRetryNote'), { name: 'loadNote' });
      buttons([['reload', t('reload'), () => location.reload(), primary]]);
    });
  }

  return { title, guide, options, menu, end, error };
}
