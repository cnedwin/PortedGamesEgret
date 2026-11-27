import { Bitmap } from '@egret/engine';
import { getLanguage, t } from './i18n.mjs';
import { DANGER, HEROES, HERO_KINDS, WAVES } from './sim/data.mjs';
import { GOLD, MUTED, button, label, viewSpace, showView, panel, paper, primary, textWidth, wrap } from './ui-layout.mjs';

const center = (size, color = GOLD) => ({ size, color, bold: true, align: 'center' });
const totalKeys = ['wavesStat', 'killsStat', 'mergesStat', 'divineStat'];
const totalFields = ['wave', 'kills', 'merges', 'divines'];

export function createScreens(game, app, actions) {
  // Failed portraits leave readable cards and offer a retry at the title.
  const missingArt = new Set();
  const art = Object.fromEntries(HERO_KINDS.map(hero => [
    hero, game.browser.loadTexture(new URL('../assets/' + hero + '.webp', import.meta.url).href)
      .catch(error => {
        console.warn('Portrait unavailable', error);
        missingArt.add(hero);
        if (missingArt.size === 1) actions.artworkUnavailable();
        return null;
      })
  ]));
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
    });
  }

  // The engine selects these four descriptions using its own container/orientation
  // classification. Each preserves the same semantic names and actions.
  const profiles = {
    root: { upright: false, compact: true, tablet: false, titleWidth: 520, dialogPadding: 12, settingsCols: 4 },
    portrait: { upright: true, compact: false, tablet: false, titleWidth: 545, dialogPadding: 16, settingsCols: 2 },
    tablet: { upright: false, compact: false, tablet: true, titleWidth: 630, dialogPadding: 24, settingsCols: 4 },
    tabletPortrait: { upright: true, compact: false, tablet: true, titleWidth: 660, dialogPadding: 26, settingsCols: 2 }
  };

  function variants(make) {
    const ui = viewSpace(game);
    return Object.fromEntries(Object.entries(profiles).map(([name, profile]) => [name, make(ui, profile)]));
  }

  function buildTitle(ui, profile) {
    const { upright, compact, tablet } = profile;
    const w = Math.min(profile.titleWidth, ui.width - 28);
    const buttonH = 46, gap = 8;
    const heroW = (w - gap * 2) / 3;
    const heroH = compact ? (missingArt.size > 0 ? 60 : 74) : Math.min(heroW / 0.87, tablet ? 166 : 136);
    const titleSize = compact ? (getLanguage() === 'zh' ? 46 : 36) :
      tablet ? (getLanguage() === 'zh' ? 78 : 62) : Math.min(65, Math.max(40, w * 0.12));
    const lineSize = compact ? 13 : 16;
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
    const guideW = Math.min(112, (w - startW - 16) * 0.52);
    const settingsW = Math.min(106, w - startW - guideW - 16);
    add(button('start', 0, y, startW, buttonH, t('start'), { ...primary, size: 20 }), actions.start);
    add(button('guide', startW + gap, y, guideW, buttonH, t('howTitle'), { size: Math.min(15, (guideW - 10) / Math.max(1, textWidth(t('howTitle'), 1, true))) }), actions.guide);
    add(button('options', startW + guideW + gap * 2, y, settingsW, buttonH, t('settings')), actions.options);
    y += buttonH + (compact ? 4 : 11);
    add(label('chooseHero', 0, y, w, 23, t('chooseHero'), 17, { color: GOLD, bold: true }));
    y += 24;

    const heroTop = y;
    for (const [index, hero] of HERO_KINDS.entries()) {
      const open = app.save.data.unlocked.includes(hero);
      const record = app.save.data.best[hero]?.[app.danger];
      const note = !open ? t(HEROES[hero].unlock === 'win' ? 'unlockWin' : 'unlockWave10') :
        record > WAVES ? t('bestWon') : record ? t('bestWave', { n: record }) : t('noBest');
      const x = index * (heroW + gap);
      const noteText = wrap(note, heroW - 10, compact ? 10 : 11);
      const noteH = noteText.split('\n').length * (compact ? 11 : 13);
      const heroNameSize = Math.min(15, (heroW - 10) / Math.max(1, textWidth(t(hero), 1, true)));
      add(button('hero_' + hero, x, y, heroW, heroH, t(hero), {
        color: open && app.hero === hero ? 0xa77849 : 0x193330,
        size: heroNameSize, textColor: 0x193330
      }), () => actions.hero(hero), { disabled: () => !open });
      add(label(undefined, x + 6, y + heroH - noteH - 23, heroW - 12, 17, t(hero), heroNameSize, { bold: true }));
      add(label('record_' + hero, x + 6, y + heroH - noteH - 5, heroW - 12, noteH, noteText, compact ? 10 : 11, { color: MUTED }));
      if (app.hero === hero) add(panel(undefined, x + 4, y + 4, 18, 3, { color: 0xffdc99, alpha: 1 }));
    }
    y = heroTop + heroH + 3;
    const noteSize = compact ? 11 : 12;
    const heroNote = wrap(t(app.hero + 'Note'), w, noteSize);
    const heroNoteH = heroNote.split('\n').length * (noteSize + 3);
    add(label('heroNote', 0, y, w, heroNoteH, heroNote, noteSize, { color: MUTED }));
    y += heroNoteH + 1;
    add(label('chooseDanger', 0, y, w, 22, t('chooseDanger'), 17, { color: GOLD, bold: true }));
    y += 23;
    DANGER.forEach((_, danger) => add(button('danger' + danger, danger * (heroW + gap), y, heroW, buttonH, t('danger' + danger), {
      size: Math.min(15, (heroW - 8) / Math.max(1, textWidth(t('danger' + danger), 1, true))), color: app.danger === danger ? 0x45684e : 0x1a3a35
    }), () => actions.danger(danger)));
    y += buttonH + 2;
    add(label('dangerNote', 0, y, w, 18, t('danger' + app.danger + 'Note'), 12, { color: MUTED }));
    y += 18;
    if (missingArt.size > 0) {
      y += 7;
      add(button('artworkRetry', 0, y, w, 46, t('artworkRetry'), { size: 14 }), () => location.reload());
      y += 46;
    }

    const root = panel(undefined, upright ? 0 : 14, upright ? 12 : 0, w, y, {
      anchor: upright ? 'bottom' : 'left', children
    });
    return {root, bind};
  }

  function title() {
    const made = variants(buildTitle);
    return showView(game, t('title'), Object.fromEntries(Object.entries(made).map(([key, item]) => [key, item.root])), {
      bind: made.root.bind, gamepad: true,
      built(view) {
        for (const hero of HERO_KINDS) portrait(view, 'hero_' + hero, hero, app.save.data.unlocked.includes(hero), true);
      }
    });
  }

  function buildDialog(heading, render, ui, profile, maxWidth) {
    const w = Math.min(maxWidth, ui.width - 24);
    const p = profile.dialogPadding;
    const body = w - 2 * p;
    const children = [], bind = {};
    let y = p;
    const add = (part, binding) => {
      children.push(part);
      if (binding) bind[part.name] = binding;
    };
    const row = (words, { name, size = 15, color = MUTED, bold = false, inset = 0, gap = profile.compact ? 5 : 8 } = {}) => {
      const content = wrap(words, body - inset, size, bold);
      const h = (size + 5) * content.split('\n').length;
      add(label(name, p + inset, y, body - inset, h, content, size, { color, bold }));
      y += h + gap;
    };
    const buttons = (list) => {
      const bw = (body - (list.length - 1) * 8) / list.length;
      list.forEach(([name, words, click, extra], index) => add(
        button(name, p + index * (bw + 8), y, bw, 46, words, {
          size: Math.min(15, (bw - 12) / Math.max(1, textWidth(words, 1, true))),
          ...extra
        }), { tap: click }
      ));
      y += profile.compact ? 49 : 54;
    };
    const context = { add, row, buttons, p, body, ui, profile, get top() { return y; }, advance: (height) => { y += height; } };
    if (heading) row(heading, { name: 'heading', size: profile.compact ? 25 : 34, color: GOLD, bold: true, gap: profile.compact ? 6 : 10 });
    render(context);
    const h = y + p - 8;
    return {root: {...paper(children, 0, 0, w, h), anchor: 'center'}, bind};
  }

  function dialog(heading, render, { maxWidth = 620, artwork, semanticName = heading, dismiss, resume } = {}) {
    const made = variants((ui, profile) => buildDialog(heading, render, ui, profile, maxWidth + (profile.tablet ? 100 : 0)));
    return showView(game, semanticName, Object.fromEntries(Object.entries(made).map(([key, item]) => [key, item.root])), {
      modal: true, bind: made.root.bind, built: artwork, dismiss, resume
    });
  }

  function settings({ add, p, body, profile, top, advance }) {
    const names = ['sound', 'music', 'reducedMotion'];
    const columns = profile.settingsCols;
    const bw = (body - (columns - 1) * 8) / columns;
    const s = app.save.data.settings;
    names.forEach((name, index) => {
      const words = t('switchState', { name: t(name), state: t(s[name] ? 'on' : 'off') });
      const x = p + index % columns * (bw + 8), y = top + Math.floor(index / columns) * 52;
      add({ type: 'toggle', name, x, y, width: bw, height: 46, text: words, checked: s[name],
        size: Math.max(10, Math.min(14, (bw - 59) / Math.max(1, textWidth(words, 1)))) },
      { tap: () => actions.setting(name) });
    });
    const index = names.length;
    add(button('language', p + index % columns * (bw + 8), top + Math.floor(index / columns) * 52, bw, 46, t('language')), { tap: actions.language });
    advance(Math.ceil(4 / columns) * 52);
  }

  function guide() {
    return dialog(t('howTitle'), ({ row, buttons, profile }) => {
      const small = profile.compact;
      row(game.device === 'touch' ? t('controlTouch') : t('controlKeys'), { name: 'controls', size: 14, gap: 9 });
      for (const index of [1, 2, 3]) row(index + '. ' + t('how' + index), { name: 'how' + index, size: small ? 12 : 15 });
      row(t('keysLine'), { name: 'keysLine', size: 12 });
      buttons([['start', t('start'), actions.start, primary], ['close', t('closed'), () => actions.title('guide')]]);
    }, { dismiss: () => actions.title('guide') });
  }

  function options() {
    return dialog(t('settings'), context => {
      settings(context);
      context.buttons([['close', t('closed'), () => actions.title('options'), primary]]);
    }, { dismiss: () => actions.title('options') });
  }

  function menu() {
    return dialog(t('paused'), context => {
      context.row(t('wave', { n: app.run.wave, total: WAVES }), { name: 'pausedWave' });
      context.buttons([['resume', t('resume'), actions.resume, primary], ['quit', t('quit'), actions.quit]]);
      context.row(t('settings'), { name: 'settingsHeading', size: 21, color: GOLD, bold: true });
      settings(context);
    }, { dismiss: actions.resume, resume: actions.resume });
  }

  function end() {
    const result = app.result;
    const heading = t(result.won ? 'won' : 'lost');
    return dialog(null, context => {
      const { add, row, buttons, p, body, top, advance, profile } = context;
      const w = Math.min(profile.tablet ? 244 : 190, body * (profile.tablet ? 0.37 : 0.34));
      const h = profile.tablet ? 184 : profile.compact ? 90 : 124;
      add(panel('resultPortrait', p, top, w, h, { color: 0x203d37 }));
      const titleSize = profile.tablet ? 34 : profile.upright ? 25 : 29;
      const words = wrap(heading, body - w - 14, titleSize, true);
      const titleH = (titleSize + 3) * words.split('\n').length;
      add(label('resultHeading', p + w + 14, top + 8, body - w - 14, titleH, words, titleSize, { color: GOLD, bold: true }));
      const note = wrap(t(result.won ? 'wonNote' : 'lostNote', { wave: result.wave }), body - w - 14, 13);
      const noteH = note.split('\n').length * 16;
      add(label('resultNote', p + w + 14, top + 11 + titleH, body - w - 14, noteH, note, 13));
      advance(Math.max(h, titleH + noteH + 11) + 12);
      const columns = profile.upright || profile.tablet ? 2 : 4;
      const cellW = body / columns, totalsTop = context.top;
      for (const [index, key] of totalKeys.entries()) {
        add(panel(undefined, p + cellW * (index % columns) + 2, totalsTop + 51 * Math.floor(index / columns), cellW - 4, 47, { color: 0x0b2221, alpha: 1 }));
        add(label(key, p + cellW * (index % columns), totalsTop + 51 * Math.floor(index / columns), cellW, 19, t(key), 12, { align: 'center', color: MUTED }));
        add(label(key + 'Value', p + cellW * (index % columns), totalsTop + 51 * Math.floor(index / columns) + 19, cellW, 25, result[totalFields[index]], 19, center(19)));
      }
      advance(51 * Math.ceil(totalKeys.length / columns) + 6);
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
