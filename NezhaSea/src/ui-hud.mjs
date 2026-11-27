import { t } from './i18n.mjs';
import { WAVES, waveSeconds, xpToLevel } from './sim/data.mjs';
import { GOLD, MUTED, button, label, panel, showView, textWidth, viewSpace, wrap } from './ui-layout.mjs';

const HUD_MAX_WIDTH = 560;

export function createHud(game, app, rules, pause) {
  let view, hints, introStarted, onlyPaused = false, maxHp = 1;
  let lastWave, lastTimer, lastHealth;
  function syncStats() {
    maxHp = app.run ? rules.statsOf(app.run).maxHp : 1;
    lastWave = lastTimer = lastHealth = undefined;
  }
  const state = {
    showHints: false, tutorial: '', waveWords: '', timer: '', hp: 1, hpWords: '', xp: 0,
    level: 1, pearls: 0, boss: false, bossHp: 0, bossWords: '', alert: false, alertWords: '', tip: ''
  };
  const bind = {
    wave: { text: s => s.waveWords },
    timer: { text: s => s.timer },
    hp: { value: s => s.hp },
    hpText: { text: s => s.hpWords },
    xp: { value: s => s.xp },
    level: { pick: s => s.level, roll: 0.22, format: n => t('level', { n }) },
    pearls: { pick: s => s.pearls, roll: 0.21, format: n => t('pearls', { n }) },
    boss: { value: s => s.bossHp, visible: s => s.boss },
    bossName: { text: s => s.bossWords, visible: s => s.boss },
    bossAlert: { visible: s => s.alert },
    bossAlertText: { text: s => s.alertWords },
    tip: { text: s => s.tip, visible: s => s.tip !== '' },
    tipPaper: { visible: s => s.tip !== '' },
    tutorialPaper: { visible: s => s.showHints },
    tutorial: { text: s => s.tutorial },
    pause: { tap: pause, disabled: () => onlyPaused }
  };
  const bar = (name, x, y, width, height, color, words) => ({ type: 'bar', name, x, y, width, height, color, label: words });

  function arrange() {
    view?.close();
    view = undefined;
    if (!app.run) return;
    syncStats();
    update();
    // The expanded stage keeps the sea centred, while the native view can
    // use all of the safe window. Its own units respect Play's uiScale.
    const { width, height } = viewSpace(game);
    const w = Math.min(HUD_MAX_WIDTH, width - 12);
    const short = w < 285;
    const labelSize = short ? 12 : 15, pauseW = short ? 52 : 65;
    const normalTimerW = short ? 53 : 78;
    const waveMaxWidth = textWidth(t('wave', { n: WAVES, total: WAVES }), labelSize, true);
    // On a narrow safe area, share the left column vertically. Play's view
    // scale keeps the pause button at least 44 CSS pixels tall.
    const stackedClock = w - pauseW - normalTimerW - 18 < waveMaxWidth + 8;
    const timerX = stackedClock ? 7 : w - pauseW - normalTimerW - 10;
    const timerW = stackedClock ? w - pauseW - 16 : normalTimerW;
    const timerY = stackedClock ? 24 : 8, timerH = stackedClock ? 20 : 30;
    const waveW = stackedClock ? timerW : timerX - 8, waveH = stackedClock ? 24 : 46;
    const tutorialWords = wrap(t('visualTip'), w - 20, short ? 11 : 13);
    const tutorialH = tutorialWords.split('\n').length * 17 + 14;
    state.tutorial = tutorialWords;
    const tutorialBottom = Math.max(0, Math.min(60, height - 143 - tutorialH - 10));
    const row = panel(undefined, 0, 5, w, 143, { anchor: 'top', children: [
      panel(undefined, 0, 0, w, 46, { color: 0x0b2424, alpha: 0.96 }),
      label('wave', 7, 0, waveW, waveH, '', labelSize, { bold: true, color: GOLD }),
      panel(undefined, timerX, timerY, timerW, timerH, { color: 0x193c34, alpha: 1 }),
      label('timer', timerX, timerY, timerW, timerH, '', short ? 11 : 13, { align: 'center' }),
      button('pause', w - pauseW - 1, 1, pauseW, 44, t('pause'), { size: short ? 11 : 13 }),
      bar('hp', 0, 49, w, 15, 0xb44a3c, t('hpName')),
      label('hpText', 6, 49, w - 12, 15, '', 11, { bold: true }),
      panel(undefined, 0, 67, w, 22, { color: 0x0b2424, alpha: 0.96 }),
      bar('xp', 6, 76, w * 0.43, 5, 0xe8bb74, t('experience')),
      label('level', w * 0.47, 66, w * 0.2, 23, '', 11, { color: MUTED }),
      label('pearls', w * 0.66, 66, w * 0.32, 23, '', 11, { color: GOLD, align: 'right' }),
      bar('boss', 0, 92, w, 16, 0x9063a0, t('bossLeft')),
      label('bossName', 6, 92, w - 12, 16, '', 11, { bold: true }),
      panel('bossAlert', 0, 112, w, 31, { color: 0x432e3b, alpha: 0.97, children: [
        label('bossAlertText', 4, 0, w - 8, 31, '', short ? 11 : 14, { color: GOLD, bold: true, align: 'center' })
      ] }),
      panel('tipPaper', 0, 112, w, 30, { color: 0x102c30, alpha: 0.88, children: [
        label('tip', 4, 0, w - 8, 30, '', short ? 10 : 12, { align: 'center' })
      ] })
    ] });
    const root = panel(undefined, 0, 0, 'fill', 'fill', { children: [
      row,
      // Keep the first-wave explanation above the engine's bottom hints bar.
      panel('tutorialPaper', 0, tutorialBottom, w, tutorialH, { anchor: 'bottom', color: 0x102c30, alpha: 0.90, children: [
        label('tutorial', 6, 0, w - 12, tutorialH, '', short ? 11 : 13, { align: 'center' })
      ] })
    ] });
    view = showView(game, t('stage'), { root }, { state, bind });
    view.deactivate();
    if (!onlyPaused) view.activate();
  }
  function update() {
    const run = app.run;
    if (!run) return;
    const play = app.screen === 'play', boss = run.boss;
    const elapsed = waveSeconds(run.wave) - run.waveLeft;
    const seconds = boss ? null : Math.ceil(run.waveLeft);
    const hp = Math.ceil(run.player.hp);
    if (lastWave !== run.wave) {
      state.waveWords = t('wave', { n: run.wave, total: WAVES });
      lastWave = run.wave;
    }
    if (lastTimer !== seconds) {
      state.timer = boss ? t('bossLeft') : t('waveLeft', { s: seconds });
      lastTimer = seconds;
    }
    if (lastHealth !== hp) {
      state.hpWords = t('hp', { hp, max: maxHp });
      lastHealth = hp;
    }
    state.hp = run.player.hp / maxHp;
    state.xp = run.xp / xpToLevel(run.level);
    state.level = run.level;
    state.pearls = run.pearls;
    state.boss = Boolean(boss);
    state.bossHp = boss ? boss.hp / boss.max : 0;
    state.bossWords = boss ? t(boss.kind === 'yaksha' ? 'yaksha' : 'aoBing') : '';
    state.alertWords = boss ? t(boss.kind === 'yaksha' ? 'bossYaksha' : 'bossAoBing') : '';
    state.alert = play && Boolean(boss) && elapsed <= 2.5;
    state.tip = play && !boss && run.wave > 1 && elapsed <= 1.6 ? t('wavePrepare', { n: run.wave }) : '';
    onlyPaused = !play;
    state.showHints = play && !boss && run.wave === 1 && elapsed <= 4.5;
    if (state.showHints) {
      if (hints === undefined) hints = game.hints([
        { action: t('autoAttackHint'), key: 'WASD / ↑↓←→', pad: 'L', touch: t('dragHint') }
      ]);
    } else if (hints) {
      hints.dispose();
      hints = undefined;
    }
    if (state.alert && view) {
      if (introStarted === undefined) introStarted = game.time;
      const dt = game.time - introStarted;
      view.get('bossAlert').alpha = game.reducedMotion ? 1 : Math.min(1, 0.52 + Math.max(0, dt) * 3.2);
    } else introStarted = undefined;
  }
  function enable(active) {
    onlyPaused = !active;
    syncStats();
    if (active) view?.activate();
    else view?.deactivate();
    update();
    view?.refresh();
  }
  function exclude(x, y) {
    const target = view?.visibleRect('pause');
    if (!target) return false;
    // Floating stick origins are design coordinates; visibleRect is a
    // clipped stage rectangle after the view's independent scale.
    const at = game.toStage(x, y);
    return at.x >= target.x && at.x < target.x + target.width
      && at.y >= target.y && at.y < target.y + target.height;
  }
  function close() {
    view?.close();
    hints?.dispose();
    view = hints = introStarted = undefined;
  }

  return { arrange, update, enable, exclude, close, get hints() { return hints?.shown ?? []; } };
}
