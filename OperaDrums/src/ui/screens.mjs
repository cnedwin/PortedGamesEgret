// 画面：标题（选戏、选难度）、怎么敲、压轴说明、设置、延迟校准、暂停、谢幕和跟练结束。每个画面都是引擎的数据
// 界面（game.show）：这里写它的部件和每个有名字的部件跟着什么状态走，横屏和竖屏各一套部件，名字相同。画面由引擎的
// 屏幕栈（createUiScreenStack）管：标题、演出和谢幕是页面，其余是一次只开一个的对话框；Esc 和手柄 B 关掉最前面的
// 对话框。界面上的每一个字都从 t(key) 来。
//
// The screens: the title (an act and a difficulty), how to strike, the encore, the settings, the delay, the pause, the
// curtain call and the end of the lesson. Each is one of the engine's views described as data (`game.show`): here are
// its parts, and what state each named part follows, one set of parts for a wide screen and one for a tall one, with the
// same names. The engine's screen stack (`createUiScreenStack`) holds them: the title, the performance and the curtain
// call are pages, the rest dialogs shown one at a time; Escape and the pad's B close the dialog in front. Every word
// comes from t(key).
import { createUiScreenStack } from '@egret/engine/ui';
import { BRASS, C, EDGE, SKIN, button, primary } from './skin.mjs';
import { wrapLines, wrapped } from './wrap.mjs';

const ACT_IDS = ['qiba', 'tangma', 'jijifeng'];
const LEVELS = ['easy', 'normal', 'hard'];
const card = (more) => ({ type: 'panel', card: true, color: C.sheet, border: BRASS, ...more });
const text = (name, words, more = {}) => ({ type: 'text', name, text: words, ...more });

/**
 * The screens of the game, over `game`. `words` is { t, language, songName, levelName }; `app` is the state the
 * screens read; `act` holds what their buttons do.
 */
export function createScreens(game, { words, app, act, semantics }) {
  const { t } = words;
  const stack = createUiScreenStack({ onError: (cause) => console.error('screens', cause) });
  const settings = () => app.save.data.settings;
  const bestLine = (songId, level) => {
    const kept = app.save.data.best[songId]?.[level];
    return kept ? t('bestOf', { rank: t(kept.rank), score: kept.score }) : t('bestNone');
  };
  const view = (description, options) => game.show({ skin: SKIN, ...description }, options);
  const modal = (context, description, options = {}) =>
    view({ modal: true, ...description }, { dismiss: () => context.close(), ...options });

  /** Moves the keyboard focus to the part named `name` of the screen in front, as a press of Tab would. */
  function focus(name) {
    const snapshot = semantics.publish();
    const node = snapshot.nodes.filter((n) => n.id.endsWith(':' + name) && !n.hidden && !n.inert && n.actions.includes('focus')).at(-1);
    if (node) semantics.perform(node.id, 'focus');
  }

  // ---- The title: the brand, the three acts, the difficulty and the way in. ----
  function actCard(id, height) {
    return {
      type: 'panel', name: 'act-' + id, label: words.songName(id), width: 'fill', height, color: C.lacquer, border: EDGE,
      children: [
        { type: 'image', name: 'portrait-' + id, src: `assets/${id}.webp`, label: words.songName(id), width: 'fill', height: 'fill' },
        { type: 'panel', anchor: 'bottom', width: 'fill', height: 40, color: 0x120f0d, alpha: 0.86, children: [
          text('act-name-' + id, words.songName(id), { anchor: 'center', width: 'fill', height: 40, size: 21, bold: true, align: 'center' })
        ] },
        { type: 'panel', name: 'chosen-' + id, anchor: 'top-right', x: 6, y: 6, width: 66, height: 26, color: C.gold, alpha: 1, children: [
          text('chosen-word-' + id, t('chosen'), { anchor: 'center', width: 'fill', height: 26, size: 14, bold: true, align: 'center', color: C.gongText })
        ] }
      ]
    };
  }
  const titleHead = (encoreWidth, h = 40) => ({ type: 'panel', layout: 'row', gap: 10, height: Math.max(44, h), align: 'center', children: [
    text('songs', t('songs'), { width: 'fill', height: 32, size: 24, bold: true, color: C.gold }),
    button('encore', t('encore'), { width: encoreWidth, height: h, size: 16, color: 0x38251c, textColor: C.gold })
  ] });
  const titleActs = (height) => ({ type: 'panel', layout: 'row', gap: 10, height, children: ACT_IDS.map((id) => actCard(id, height)) });
  const titleAbout = () => ({ type: 'panel', layout: 'row', gap: 8, height: 26, align: 'center', children: [
    text('about', '', { width: 'fill', height: 26, size: 15, color: C.muted }),
    text('bpm', '', { width: 150, height: 26, size: 15, color: C.gold, align: 'right' })
  ] });
  const titleLevels = (height) => ({ type: 'panel', name: 'levels', label: t('chooseLevel'), layout: 'row', gap: 8, height, children:
    LEVELS.map((level) => button('level-' + level, words.levelName(level), { width: 'fill', height, size: 17, color: 0x1f1c16 })) });
  const titleLaunch = (startWidth, h = 54) => ({ type: 'panel', layout: 'row', gap: 12, height: h, align: 'center', children: [
    button('practice', t('practice'), { width: 150, height: Math.max(48, h), textColor: C.gold }),
    { type: 'space', width: 'fill' },
    primary('start', t('play'), { width: startWidth, height: h, size: 20 })
  ] });
  const noticeLines = (width) => (app.notice ? wrapLines(t(app.notice), width, 14).join('\n') : '');

  function openTitle(context) {
    const landscape = {
      type: 'panel', width: 'fill', height: 'fill', children: [
        { type: 'panel', anchor: 'left', x: 52, width: 300, height: 380, layout: 'column', gap: 10, align: 'start', children: [
          { type: 'panel', width: 78, height: 4, color: C.red, alpha: 1 },
          text('brand', t('title'), { width: 300, height: 112, size: 92, bold: true, color: 0xffe6b8 }),
          text('tagline', t('tagline'), { width: 300, height: 28, size: 20, color: C.muted }),
          { type: 'panel', layout: 'row', gap: 8, width: 300, height: 44, children: [
            button('guide', t('howTitle'), { width: 120, height: 44, size: 16 }),
            button('options', t('settings'), { width: 96, height: 44, size: 16 })
          ] },
          text('notice', '', { width: 300, height: 70, size: 14, color: C.cream })
        ] },
        { type: 'panel', anchor: 'right', x: 44, width: 560, height: 520, layout: 'column', gap: 10, children: [
          titleHead(230), titleActs(262), titleAbout(), titleLevels(58), titleLaunch(300)
        ] }
      ]
    };
    const portrait = {
      type: 'panel', width: 'fill', height: 'fill', padding: 18, layout: 'column', gap: 10, justify: 'center', children: [
        { type: 'panel', layout: 'row', gap: 8, height: 72, align: 'center', children: [
          text('brand', t('title'), { width: 'fill', height: 72, size: 60, bold: true, color: 0xffe6b8 }),
          button('guide', t('howTitle'), { width: 110, height: 64, size: 16 }),
          button('options', t('settings'), { width: 88, height: 64, size: 16 })
        ] },
        text('tagline', t('tagline'), { height: 26, size: 18, color: C.muted }),
        text('notice', '', { height: 52, size: 14, color: C.cream }),
        titleHead(210, 64), titleActs(214), titleAbout(), titleLevels(64), titleLaunch(260, 64)
      ]
    };
    const chosen = (id) => app.chosenAct.id === id;
    const bind = {
      guide: { tap: () => act.openGuide() },
      options: { tap: () => act.openOptions('title') },
      notice: { text: () => noticeLines(app.portrait() ? 500 : 300), visible: () => Boolean(app.notice) },
      encore: { text: () => {
        const best = app.save.data.best.encore?.normal;
        return best ? `${t('encore')} · ${t('bestOf', { rank: t(best.rank), score: best.score })}` : t('encore');
      }, tap: () => act.openEncore() },
      about: { text: () => (words.language() === 'zh' ? app.chosenAct.noteZh : app.chosenAct.noteEn) },
      bpm: { text: () => t('bpm', { n: app.chosenAct.bpm }) },
      practice: { tap: () => act.startLesson() },
      start: { text: () => t('startChart', { song: words.songName(app.chosenAct.id), level: words.levelName(app.chosenLevel) }), tap: () => act.startChosen() }
    };
    for (const id of ACT_IDS) {
      bind['act-' + id] = { tap: () => act.chooseAct(id), color: () => (chosen(id) ? C.chosen : C.lacquer) };
      bind['act-name-' + id] = { color: () => (chosen(id) ? C.bright : C.paper) };
      bind['chosen-' + id] = { visible: () => chosen(id) };
    }
    for (const level of LEVELS)
      bind['level-' + level] = {
        text: () => `${app.chosenLevel === level ? '✓ ' : ''}${words.levelName(level)} · ${bestLine(app.chosenAct.id, level)}`,
        color: () => (app.chosenLevel === level ? C.chosen : 0x1f1c16),
        tap: () => act.chooseLevel(level)
      };
    return view({ label: t('title'), root: landscape, portrait }, { bind, gamepad: true });
  }

  // ---- How to strike, and the encore: words and two buttons. ----
  function openGuide(context) {
    const describe = (width, h) => card({ anchor: 'center', width: width + 48, padding: 24, layout: 'column', gap: 10, height: 'fill', children: [
      text('heading', t('howTitle'), { height: 44, size: 32, bold: true }),
      wrapped('how1', '1. ' + t('how1'), width, { size: 16 }),
      wrapped('how2', '2. ' + t('how2'), width, { size: 16 }),
      wrapped('how3', '3. ' + t('how3'), width, { size: 16 }),
      wrapped('keys', t('keysLine'), width, { size: 14, color: C.muted }),
      { type: 'panel', layout: 'row', gap: 10, height: h, children: [
        button('sample-drum', '□ ' + t('sampleDrum'), { width: 'fill', height: h, size: 16 }),
        button('sample-gong', '◇ ' + t('sampleGong'), { width: 'fill', height: h, size: 16 })
      ] },
      { type: 'panel', layout: 'row', gap: 10, height: Math.max(50, h), children: [
        primary('lesson', t('practice'), { width: 'fill', height: Math.max(50, h) }),
        button('close', t('close'), { width: 110, height: Math.max(50, h) })
      ] }
    ] });
    const sized = (part) => ({ ...part, height: part.children.reduce((sum, child) => sum + child.height, 0) + (part.children.length - 1) * part.gap + part.padding * 2 });
    return modal(context, { label: t('howTitle'), root: sized(describe(520, 44)), portrait: sized(describe(452, 64)) }, { bind: {
      'sample-drum': { tap: () => act.sample('drum') },
      'sample-gong': { tap: () => act.sample('tai') },
      lesson: { tap: () => act.startLesson() },
      close: { tap: () => context.close() }
    } });
  }

  function openEncore(context) {
    const describe = (width, h) => {
      const brief = wrapped('brief', t('encoreBrief'), width, { size: 17 });
      return card({ anchor: 'center', width: width + 48, height: 44 + brief.height + h + 20 + 48, padding: 24, layout: 'column', gap: 10, children: [
        text('heading', t('encore'), { height: 44, size: 32, bold: true }),
        brief,
        { type: 'panel', layout: 'row', gap: 10, height: h, children: [
          primary('encore-start', t('play'), { width: 'fill', height: h }),
          button('close', t('close'), { width: 110, height: h })
        ] }
      ] });
    };
    return modal(context, { label: t('encore'), root: describe(480, 50), portrait: describe(452, 64) }, { bind: {
      'encore-start': { tap: () => act.startEncore() },
      close: { tap: () => context.close() }
    } });
  }

  // ---- The settings: switches, steppers, the language and the delay. ----
  function stepper(key, label, h) {
    return { type: 'panel', name: 'step-' + key, label, layout: 'row', gap: 8, height: h + 2, align: 'center', children: [
      text('step-label-' + key, label, { width: 'fill', height: 30, size: 17 }),
      button(key + '-down', '−', { width: Math.max(48, h), height: h, size: 22 }),
      text(key + '-value', '', { width: 104, height: 30, size: 17, align: 'center', color: C.gold }),
      button(key + '-up', '+', { width: Math.max(48, h), height: h, size: 22 })
    ] };
  }
  function openOptions(context) {
    const fromTitle = context.params?.from !== 'pause';
    const describe = (width, h) => {
      const rows = [
        text('heading', t('settings'), { height: 44, size: 32, bold: true }),
        { type: 'toggle', name: 'sound', text: t('sound'), height: h },
        { type: 'toggle', name: 'motion', text: t('reducedMotion'), height: h },
        { type: 'panel', name: 'language-row', label: t('languageLabel'), layout: 'row', gap: 8, height: h + 2, align: 'center', children: [
          text('language-label', t('languageLabel'), { width: 'fill', height: 30, size: 17 }),
          button('language', t('language'), { width: 120, height: h, size: 16 })
        ] },
        stepper('music', t('musicVolume'), h),
        stepper('speed', t('speed'), h),
        stepper('offset', t('offset'), h),
        ...(fromTitle ? [button('calibrate', t('calibrate'), { height: h, size: 16 })] : []),
        primary('close', t('close'), { height: Math.max(50, h) })
      ];
      return card({ anchor: 'center', width: width + 48, padding: 24, layout: 'column', gap: 8,
        height: rows.reduce((sum, row) => sum + row.height, 0) + (rows.length - 1) * 8 + 48, children: rows });
    };
    const s = settings;
    const bind = {
      sound: { checked: () => s().sound, tap: () => act.toggle('sound') },
      motion: { checked: () => s().reducedMotion, tap: () => act.toggle('reducedMotion') },
      language: { tap: () => act.switchLanguage() },
      'music-value': { text: () => Math.round(s().music * 100) + '%' },
      'music-down': { disabled: () => s().music <= 0, tap: () => act.step('music', -1) },
      'music-up': { disabled: () => s().music >= 1, tap: () => act.step('music', 1) },
      'speed-value': { text: () => '×' + s().speed },
      'speed-down': { disabled: () => act.speedAt(-1), tap: () => act.step('speed', -1) },
      'speed-up': { disabled: () => act.speedAt(1), tap: () => act.step('speed', 1) },
      'offset-value': { text: () => t('offsetValue', { n: s().offset }) },
      'offset-down': { disabled: () => s().offset <= -300, tap: () => act.step('offset', -1) },
      'offset-up': { disabled: () => s().offset >= 300, tap: () => act.step('offset', 1) },
      close: { tap: () => context.close() }
    };
    if (fromTitle) bind.calibrate = { tap: () => act.openCalibration() };
    return modal(context, { label: t('settings'), root: describe(440, 44), portrait: describe(444, 64) }, { bind });
  }

  // ---- The delay: strokes with the clapper's clicks. ----
  function openCalibration(context) {
    const describe = (width, h) => {
      const how = wrapped('how', t('calHow', { n: 8 }), width, { size: 16 });
      const rows = [
        text('heading', t('calTitle'), { height: 44, size: 32, bold: true }),
        how,
        text('count', '', { height: 52, size: 16, color: C.gold }),
        { type: 'panel', name: 'tap', label: t('calTap'), height: 84, color: C.drum, alpha: 1, border: BRASS, children: [
          text('tap-word', t('calTap'), { anchor: 'center', width: 'fill', height: 40, size: 22, bold: true, align: 'center', color: C.cream })
        ] },
        ...(settings().sound ? [] : [wrapped('needs-sound', t('calNeedsSound'), width, { size: 15, color: C.rose })]),
        { type: 'panel', layout: 'row', gap: 10, height: h, children: [
          primary('cal-start', t(settings().sound ? 'calStart' : 'enableSound'), { width: 'fill', height: h }),
          button('close', t('close'), { width: 110, height: h })
        ] }
      ];
      return card({ anchor: 'center', width: width + 48, padding: 24, layout: 'column', gap: 10,
        height: rows.reduce((sum, row) => sum + row.height, 0) + (rows.length - 1) * 10 + 48, children: rows });
    };
    return modal(context, { label: t('calTitle'), root: describe(440, 50), portrait: describe(444, 64) }, { bind: {
      // An empty text part stops the semantic tree from publishing (ENGINE-NOTES.md), so the line hides until it has words.
      count: { text: () => app.cal.message, visible: () => Boolean(app.cal.message) },
      // The pad stands there from the start, dim until the clapper plays, so the dialog does not change its shape.
      tap: { color: () => (!app.cal.running ? 0x3a2a22 : app.cal.beat ? C.drumLit : C.drum), tap: () => act.calKey() },
      'cal-start': { visible: () => !app.cal.running, tap: () => act.calStart() },
      close: { tap: () => context.close() }
    }, built: (made) => act.calBuilt(made) });
  }

  // ---- The pause. ----
  function openPause(context) {
    const describe = (width, h) => card({ anchor: 'center', width: width + 48, height: 44 + h + h + 20 + 48, padding: 24, layout: 'column', gap: 10, children: [
      text('heading', t('paused'), { height: 44, size: 32, bold: true }),
      { type: 'panel', layout: 'row', gap: 10, height: h, children: [
        primary('resume', t('resume'), { width: 'fill', height: h }),
        button('restart', t('restart'), { width: 'fill', height: h }),
        button('quit', t('quit'), { width: 'fill', height: h })
      ] },
      button('pause-settings', t('settings'), { height: h, textColor: C.gold })
    ] });
    return modal(context, { label: t('paused'), root: describe(480, 52), portrait: describe(452, 64) }, {
      dismiss: () => act.resume(),
      resume: () => act.resume(),
      bind: {
        resume: { tap: () => act.resume() },
        restart: { tap: () => act.restart() },
        quit: { tap: () => act.quit() },
        'pause-settings': { tap: () => act.openOptions('pause') }
      }
    });
  }

  // ---- The curtain call, and the end of the lesson. ----
  function openEnd() {
    const r = app.result;
    const portraitId = r.mode === 'encore' ? 'jijifeng' : app.song.id;
    const nextEncore = r.cleared && r.mode === 'song' && app.song.id === 'qiba' && app.difficulty === 'easy';
    const stat = (key, value) => ({ type: 'panel', name: 'stat-' + key, label: t(key), card: true, color: C.cell, layout: 'column', padding: 6, height: 'fill', width: 'fill', children: [
      text('stat-value-' + key, String(value), { height: 'fill', size: 21, bold: true, align: 'center' }),
      text('stat-name-' + key, t(key), { height: 22, size: 14, align: 'center', color: C.muted })
    ] });
    const describe = (width, leadHeight, h) => {
      const notes = [
        ...(r.kept ? [] : [wrapped('save-notice', t('saveRefused'), width, { size: 14, color: C.cream })]),
        ...(nextEncore ? [wrapped('encore-hint', t('encoreNextHint'), width, { size: 15, color: C.gold })] : [])
      ];
      const rows = [
        { type: 'panel', layout: 'row', gap: 12, height: 44, align: 'center', children: [
          text('heading', t('curtainCall'), { width: 'fill', height: 44, size: 32, bold: true }),
          text('subtitle', r.mode === 'encore' ? words.songName('encore') : t('resultTitle', { song: words.songName(app.song.id), level: words.levelName(app.difficulty) }),
            { width: 300, height: 26, size: 15, align: 'right', color: C.gold })
        ] },
        { type: 'panel', layout: 'row', gap: 18, height: leadHeight, align: 'center', children: [
          { type: 'image', name: 'end-portrait', src: `assets/${portraitId}.webp`, label: words.songName(portraitId), width: Math.round(leadHeight * 0.75), height: leadHeight, border: EDGE },
          { type: 'panel', layout: 'column', gap: 4, width: 'fill', height: leadHeight, justify: 'center', children: [
            text('rank', t(r.rank), { height: 64, size: 52, bold: true, color: r.rank === 'fail' ? C.rose : C.bright }),
            text('end-score', t('score', { n: r.score }), { height: 34, size: 24 }),
            ...(r.best ? [text('new-best', t('newBest'), { height: 24, size: 16, color: C.gold })] : []),
            ...(app.encore ? [text('encore-bonus', t('encoreBonus', { n: app.encore.rallies, score: app.encore.bonus }), { height: 24, size: 15, color: C.gold })] : [])
          ] }
        ] },
        { type: 'panel', layout: 'column', gap: 6, height: 2 * 66 + 6, children: [
          { type: 'panel', layout: 'row', gap: 6, height: 66, children: [stat('great', r.counts.great), stat('ok', r.counts.ok), stat('miss', r.counts.miss)] },
          { type: 'panel', layout: 'row', gap: 6, height: 66, children: [stat('maxCombo', r.maxCombo), stat('rollCount', r.rolls), stat('doubleCount', r.doubles)] }
        ] },
        ...notes,
        { type: 'panel', layout: 'row', gap: 10, height: h, children: [
          ...(nextEncore ? [primary('encore-next', t('encoreNext'), { width: 'fill', height: h })] : []),
          (nextEncore ? button : primary)('again', t('again'), { width: 'fill', height: h }),
          button('quit', t('quit'), { width: nextEncore ? 'fill' : 190, height: h })
        ] }
      ];
      return card({ anchor: 'center', width: width + 48, padding: 22, layout: 'column', gap: 12,
        height: rows.reduce((sum, row) => sum + row.height, 0) + (rows.length - 1) * 12 + 44, children: rows });
    };
    const bind = {
      again: { tap: () => act.again() },
      quit: { tap: () => act.quit() }
    };
    if (nextEncore) bind['encore-next'] = { tap: () => act.startEncore() };
    return view({ label: t('curtainCall'), root: describe(620, 170, 52), portrait: describe(452, 150, 64) }, { bind, gamepad: true });
  }

  function openLessonEnd() {
    const done = new Set(app.result.skills);
    const skill = (id, title, h) => ({ type: 'panel', name: 'skill-' + id, label: title, card: true, color: C.well, border: EDGE, layout: 'row', padding: 8, gap: 6, align: 'center', width: 'fill', height: 'fill', children: [
      text('skill-name-' + id, title, { width: 'fill', height: 30, size: 17 }),
      done.has(id)
        ? text('skill-done-' + id, t('practicePassed'), { width: 80, height: 30, size: 16, bold: true, color: C.gold, align: 'right' })
        : button('retry-' + id, t('practiceAgain'), { width: 150, height: h, size: 15, textColor: C.gold })
    ] });
    const describe = (width, columns, h) => {
      const skills = [['drum', 'Drum'], ['gong', 'Gong'], ['double', 'Double'], ['roll', 'Roll']].map(([id, key]) => skill(id, t('practiceSkill' + key), h));
      const cell = h + 16;
      const grid = columns === 2
        ? [{ type: 'panel', layout: 'row', gap: 8, height: cell, children: skills.slice(0, 2) }, { type: 'panel', layout: 'row', gap: 8, height: cell, children: skills.slice(2) }]
        : skills.map((part) => ({ type: 'panel', layout: 'row', height: cell, children: [part] }));
      const rows = [
        { type: 'panel', layout: 'row', gap: 12, height: 44, align: 'center', children: [
          text('heading', t('practiceDone'), { width: 'fill', height: 44, size: 32, bold: true }),
          text('learned', t('practiceLearned', { n: done.size }), { width: 200, height: 26, size: 15, align: 'right', color: C.gold })
        ] },
        { type: 'panel', layout: 'column', gap: 8, height: grid.length * cell + (grid.length - 1) * 8, children: grid },
        { type: 'panel', layout: 'row', gap: 10, height: Math.max(52, h), children: [
          primary('play-song', t('play'), { width: 'fill', height: Math.max(52, h) }),
          button('again', t('practiceRetry'), { width: 'fill', height: Math.max(52, h) }),
          button('quit', t('quit'), { width: 'fill', height: Math.max(52, h) })
        ] }
      ];
      return card({ anchor: 'center', width: width + 48, padding: 22, layout: 'column', gap: 14,
        height: rows.reduce((sum, row) => sum + row.height, 0) + (rows.length - 1) * 14 + 44, children: rows });
    };
    const bind = {
      'play-song': { tap: () => act.startChosen() },
      again: { tap: () => act.startLesson() },
      quit: { tap: () => act.quit('practice') }
    };
    for (const id of ['drum', 'gong', 'double', 'roll']) if (!done.has(id)) bind['retry-' + id] = { tap: () => act.retryStep(id) };
    return view({ label: t('practiceDone'), root: describe(560, 2, 44), portrait: describe(452, 1, 64) }, { bind, gamepad: true });
  }

  const SCREENS = {
    title: { id: 'title', layer: 'page', back: 'none', open: openTitle },
    guide: { id: 'guide', layer: 'modal', open: openGuide },
    encore: { id: 'encore', layer: 'modal', open: openEncore },
    options: { id: 'options', layer: 'modal', open: openOptions },
    calibration: { id: 'calibration', layer: 'modal', open: openCalibration },
    pause: { id: 'pause', layer: 'modal', back: 'none', open: openPause },
    end: { id: 'end', layer: 'page', back: 'none', open: (context) => (app.result.mode === 'lesson' ? openLessonEnd(context) : openEnd(context)) }
  };
  return { stack, SCREENS, focus };
}
