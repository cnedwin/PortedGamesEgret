// 页面入口：存档、语言、引擎的 play（画布和每帧）、引擎的混音器（伴奏和击打声）、曲目、设置、延迟校准、暂停和
// 结算。按钮都是页面自己的按钮；敲击来自键盘、四块敲击区和手柄。一下敲击的时刻取页面事件的时间戳，换成那一刻耳朵
// 听到的曲子秒数，再交给 src/sim/judge.mjs 判定。
// The page's entry: the save, the language, the engine's play (the canvas and each frame), the engine's mixer (the
// backing and the strokes), the songs, the settings, the delay, the pause and the result. Every control is a page
// button; strokes come from the keys, the four pads and a gamepad. A stroke's moment is its page event's time stamp,
// turned into the second of the song heard at that moment, then judged by src/sim/judge.mjs.
import { play } from '@egret/engine/play';
import { browserLanguages, browserSaveStorage, prefersReducedMotion } from '@egret/engine/web/kit';
import { STROKE_SOUND, createSound } from './audio/sound.mjs';
import { paintStage } from './ground.mjs';
import { getLanguage, onLanguage, setLanguage, startLanguage, t } from './i18n.mjs';
import { SPEEDS, openSave, recordRun } from './saves.mjs';
import { buildChart, songOf } from './sim/chart.mjs';
import { advance, createRun, resultOf, strike } from './sim/judge.mjs';
import { DIFFICULTIES, SONGS } from './sim/songs.mjs';
import { createView } from './view.mjs';

const params = new URLSearchParams(location.search),
  $ = (selector) => document.querySelector(selector),
  field = $('#field'),
  pads = $('#pads'),
  panels = { title: $('#title'), menu: $('#menu'), end: $('#end'), cal: $('#cal') };

// The save, and what went wrong with it, said on the title.
let notice = null;
const save = openSave(browserSaveStorage(), startLanguage(browserLanguages()), (problem) => {
  notice = problem.kind === 'write-failed' ? 'saveRefused' : 'saveReset';
});
const settings = () => save.data.settings;
setLanguage(params.get('lang') ?? settings().language);
function setSetting(key, value) {
  if (!save.update((data) => void (data.settings[key] = value))) notice = 'saveRefused';
}

const app = {
  save,
  screen: 'title',
  song: null,
  difficulty: 'normal',
  chart: null,
  run: null,
  result: null,
  time: 0,
  /** The judged strokes of the current run, with how far off each was: for tests and for the curious. */
  strokes: [],
  get notice() {
    return notice;
  }
};

// ---- The engine: play makes the canvas in the stage's box and runs the frames; the mixer plays the sound. ----
// Frames begin as soon as play is set up; they do nothing until the rest of this page is ready.
let game,
  view,
  ready = false;
await play({
  width: 960,
  height: 540,
  parent: field,
  transparent: true,
  setup(made) {
    game = made;
    view = createView(game, { words: t, roman: () => getLanguage() === 'en' });
  },
  update: (seconds) => frame(seconds),
  onError: (cause) => console.error(cause)
});
// The stage is the page's, painted once under a clear canvas; the box play put the canvas in is made clear.
paintStage($('#ground'));
Object.assign(game.canvas.parentElement.style, { background: 'transparent', zIndex: '1', position: 'absolute', inset: '0' });
game.canvas.setAttribute('role', 'img');
game.canvas.setAttribute('aria-label', t('stage'));
game.sfx.muted = true;
if (settings().reducedMotion) game.reducedMotion = true;
const sound = await createSound(game.scope, { on: settings().sound, music: settings().music });

// ---- Strokes. ----
const KEYS = { KeyD: ['gong', 'd'], KeyF: ['drum', 'f'], KeyJ: ['drum', 'j'], KeyK: ['gong', 'k'] };
const PAD_KEYS = { 'pad:a': ['drum', 'pa'], 'pad:down': ['drum', 'pd'], 'pad:b': ['gong', 'pb'], 'pad:left': ['gong', 'pl'] };

/** A stroke of `kind` by `hand` at page time `ms`. */
function strikeAt(kind, hand, ms) {
  if (app.screen === 'cal') return calTap(ms, kind);
  if (app.screen !== 'play' || !app.run) {
    sound.strike(kind === 'drum' ? 'drum' : 'tai');
    return;
  }
  const time = sound.heardAt(ms) - settings().offset / 1000;
  const result = strike(app.run, kind, time, hand);
  if (result.type !== 'double') {
    const met = result.type === 'judged' && result.judgement !== 'miss' && result.note.kind === kind;
    sound.strike(met ? STROKE_SOUND[result.note.syllable] : kind === 'drum' ? 'drum' : 'tai');
  }
  if (result.type === 'judged' && app.strokes.length < 2000) app.strokes.push({ judgement: result.judgement, off: result.off, at: time });
  view.struck(kind, result);
}

for (const pad of pads.querySelectorAll('.pad')) {
  const { kind, hand } = pad.dataset;
  pad.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    pad.classList.add('down');
    strikeAt(kind, `${hand}${event.pointerId}`, event.timeStamp);
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) pad.addEventListener(type, () => pad.classList.remove('down'));
  // A pad pressed from the keyboard (Enter or Space on it) strikes too; a click that a pointer made has struck already.
  pad.addEventListener('click', (event) => event.detail === 0 && strikeAt(kind, hand, event.timeStamp));
}

// Keys are caught first, in the capture phase: play keeps Tab and Space from the page's buttons otherwise.
window.addEventListener(
  'keydown',
  (event) => {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const stroke = KEYS[event.code];
    if (stroke && (app.screen === 'play' || app.screen === 'cal')) {
      event.preventDefault();
      if (!event.repeat) strikeAt(stroke[0], stroke[1], event.timeStamp);
      return;
    }
    if (app.screen === 'play' && (event.key === 'Escape' || event.key.toLowerCase() === 'p')) {
      event.preventDefault();
      openMenu();
    } else if (app.screen === 'menu' && event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    } else if (app.screen === 'cal' && event.key === 'Escape') {
      event.preventDefault();
      endCalibration(true);
    }
  },
  true
);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && app.screen === 'play') openMenu();
});

// ---- Each frame: the song's time from the sound, the notes missed, the view and the bar. ----
let shownScore = -1;
function frame(seconds) {
  if (!ready) return;
  for (const [key, [kind, hand]] of Object.entries(PAD_KEYS)) if (game.keys.pressed(key)) strikeAt(kind, hand, performance.now());
  if (app.screen === 'cal') return calFrame();
  if (app.screen !== 'play' || !app.run) return;
  const time = sound.heardAt() - settings().offset / 1000;
  app.time = time;
  view.missed(advance(app.run, time).length);
  view.show(app.run, time, speedOf(), seconds);
  if (app.run.score !== shownScore) {
    shownScore = app.run.score;
    $('#score').textContent = t('score', { n: app.run.score });
  }
  if (app.run.done) finish();
}
const speedOf = () => 260 * settings().speed;

// ---- Screens. ----
function openPanel(name) {
  for (const [key, panel] of Object.entries(panels)) panel.hidden = key !== name;
  const covered = name !== null && name !== 'cal';
  field.inert = covered;
  pads.inert = covered;
  if (name) panels[name].querySelector('button')?.focus();
}
const sheet = (panel, html) => {
  panel.innerHTML = `<div class="sheet">${html}</div>`;
  return panel.firstElementChild;
};
const levelName = (difficulty) => t(difficulty);
const songName = (song) => (getLanguage() === 'zh' ? song.zh : song.en);
let lastSaid = '';
function say(words) {
  const live = $('#say');
  live.textContent = words === lastSaid ? `${words} ` : words;
  lastSaid = live.textContent;
}

function settingsHtml() {
  const s = settings();
  const toggle = (key, on) => `<button type="button" data-toggle="${key}" aria-pressed="${on}">${t('switchState', { name: t(key), state: t(on ? 'on' : 'off') })}</button>`;
  return `
    <div class="row">${toggle('sound', s.sound)}${toggle('reducedMotion', s.reducedMotion)}<button type="button" data-language aria-label="${t('languageName')}" lang="${getLanguage() === 'zh' ? 'en' : 'zh-CN'}">${t('language')}</button></div>
    <div class="row"><span class="label">${t('musicVolume')}</span><button type="button" data-step="music:-1" aria-label="${t('musicVolume')} −">−</button><span>${Math.round(s.music * 100)}%</span><button type="button" data-step="music:1" aria-label="${t('musicVolume')} +">+</button></div>
    <div class="row"><span class="label">${t('speed')}</span><button type="button" data-step="speed:-1" aria-label="${t('speed')} −">−</button><span>×${s.speed}</span><button type="button" data-step="speed:1" aria-label="${t('speed')} +">+</button></div>
    <div class="row"><span class="label">${t('offset')}</span><button type="button" data-step="offset:-1" aria-label="${t('offset')}: ${t('offsetEarlier')}">−</button><span>${t('offsetValue', { n: s.offset })}</span><button type="button" data-step="offset:1" aria-label="${t('offset')}: ${t('offsetLater')}">+</button><button type="button" data-calibrate>${t('calibrate')}</button></div>`;
}

function wireSettings(root, redraw) {
  for (const button of root.querySelectorAll('[data-toggle]'))
    button.addEventListener('click', () => {
      const key = button.dataset.toggle,
        value = !settings()[key];
      setSetting(key, value);
      if (key === 'sound') sound.setOn(value);
      if (key === 'reducedMotion') game.reducedMotion = value || prefersReducedMotion();
      redraw(`[data-toggle="${key}"]`);
    });
  for (const button of root.querySelectorAll('[data-step]'))
    button.addEventListener('click', () => {
      const [key, way] = button.dataset.step.split(':'),
        step = Number(way),
        s = settings();
      if (key === 'music') {
        const value = Math.round(Math.max(0, Math.min(1, s.music + step * 0.1)) * 10) / 10;
        setSetting('music', value);
        sound.setMusic(value);
      } else if (key === 'speed') setSetting('speed', SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, SPEEDS.indexOf(s.speed) + step))]);
      else setSetting('offset', Math.max(-300, Math.min(300, s.offset + step * 10)));
      redraw(`[data-step="${button.dataset.step}"]`);
    });
  root.querySelector('[data-calibrate]')?.addEventListener('click', () => openCalibration());
  root.querySelector('[data-language]')?.addEventListener('click', () => {
    const next = getLanguage() === 'zh' ? 'en' : 'zh';
    setSetting('language', next);
    setLanguage(next);
  });
}

function showTitle(focus) {
  app.screen = 'title';
  app.run = null;
  sound.stop();
  if (game.paused) game.resume();
  view.clear();
  $('#hud').hidden = true;
  $('#prompt').hidden = true;
  pads.hidden = true;
  const best = save.data.best;
  const songs = SONGS.map((song) => {
    const levels = DIFFICULTIES.map((difficulty) => {
      const kept = best[song.id]?.[difficulty];
      const note = kept ? t('bestOf', { rank: t(kept.rank), score: kept.score }) : t('bestNone');
      return `<button type="button" class="level${difficulty === 'normal' ? ' strong' : ''}" data-song="${song.id}" data-level="${difficulty}" aria-label="${t('playChart', { song: songName(song), level: levelName(difficulty) })}, ${note}"><span>${levelName(difficulty)}</span><small>${note}</small></button>`;
    }).join('');
    return `<div class="song"><h3>${songName(song)}</h3><p class="about">${getLanguage() === 'zh' ? song.noteZh : song.noteEn} · ${t('bpm', { n: song.bpm })}</p><div class="levels">${levels}</div></div>`;
  }).join('');
  const root = sheet(
    panels.title,
    `<h1>${t('title')}</h1>
     <p>${t('tagline')}</p>
     <p class="quietText">${t('demo')}</p>
     ${notice ? `<p class="notice" role="status">${t(notice)}</p>` : ''}
     <h2>${t('songs')}</h2>${songs}
     <h2>${t('howTitle')}</h2>
     <ul><li>${t('how1')}</li><li>${t('how2')}</li><li>${t('how3')}</li></ul>
     <p class="quietText">${t('keysLine')}</p>
     <h2>${t('settings')}</h2>${settingsHtml()}`
  );
  for (const button of root.querySelectorAll('[data-song]')) button.addEventListener('click', () => startSong(button.dataset.song, button.dataset.level));
  wireSettings(root, (selector) => showTitle(selector));
  openPanel('title');
  // A preference just changed keeps the focus on its control.
  if (focus) root.querySelector(focus)?.focus();
  else if (app.song) root.querySelector(`[data-song="${app.song.id}"][data-level="${app.difficulty}"]`)?.focus();
}

function labelPads() {
  for (const pad of pads.querySelectorAll('.pad')) {
    const kind = pad.dataset.kind,
      key = pad.dataset.hand.toUpperCase();
    pad.innerHTML = `${t(`${kind}Pad`)}<small>${key}</small>`;
    pad.setAttribute('aria-label', t(`${kind}PadName`, { key }));
  }
}

async function startSong(id, difficulty) {
  const song = songOf(id);
  app.song = song;
  app.difficulty = difficulty;
  app.chart = buildChart(song, difficulty);
  app.run = null;
  app.result = null;
  app.screen = 'loading';
  openPanel(null);
  view.reset(app.chart, speedOf());
  $('#hud').hidden = false;
  $('#songName').textContent = `${songName(song)} · ${levelName(difficulty)}`;
  $('#score').textContent = t('score', { n: 0 });
  $('#pauseButton').textContent = t('pause');
  labelPads();
  pads.hidden = false;
  const prompt = $('#prompt');
  prompt.textContent = t('loading');
  prompt.hidden = false;
  await sound.prepare(song);
  if (app.song !== song || app.screen !== 'loading') return;
  if (sound.state === 'locked') prompt.textContent = t('tapToStart');
  await sound.start(song);
  prompt.hidden = true;
  app.run = createRun(app.chart);
  app.strokes = [];
  shownScore = -1;
  app.screen = 'play';
  if (game.paused) game.resume();
  say(`${songName(song)} · ${levelName(difficulty)}`);
  pads.querySelector('.drum')?.focus({ preventScroll: true });
}
$('#pauseButton').addEventListener('click', () => openMenu());

function openMenu(focus) {
  if (app.screen !== 'play') return;
  sound.pause();
  game.pause();
  app.screen = 'menu';
  const root = sheet(
    panels.menu,
    `<h2 id="menuHeading">${t('paused')}</h2>
     <div class="row"><button type="button" class="strong" data-do="resume">${t('resume')}</button><button type="button" data-do="restart">${t('restart')}</button><button type="button" data-do="quit">${t('quit')}</button></div>
     <h2>${t('settings')}</h2>${settingsHtml().replace(/<button type="button" data-calibrate>[^<]*<\/button>/, '')}`
  );
  panels.menu.setAttribute('aria-labelledby', 'menuHeading');
  root.querySelector('[data-do=resume]').addEventListener('click', closeMenu);
  root.querySelector('[data-do=restart]').addEventListener('click', () => {
    sound.resume();
    startSong(app.song.id, app.difficulty);
  });
  root.querySelector('[data-do=quit]').addEventListener('click', () => {
    sound.resume();
    showTitle();
  });
  wireSettings(root, (selector) => {
    app.screen = 'play';
    openMenu(selector);
  });
  openPanel('menu');
  if (focus) root.querySelector(focus)?.focus();
}

function closeMenu() {
  app.screen = 'play';
  openPanel(null);
  sound.resume();
  game.resume();
  pads.querySelector('.drum')?.focus({ preventScroll: true });
}

function finish() {
  const result = resultOf(app.run);
  let best = false;
  const kept = save.update((data) => void (best = recordRun(data, app.song.id, app.difficulty, result)));
  if (!kept) notice = 'saveRefused';
  app.result = { ...result, best, kept };
  app.screen = 'end';
  showEnd();
}

function showEnd() {
  const r = app.result;
  pads.hidden = true;
  $('#hud').hidden = true;
  view.clear();
  const root = sheet(
    panels.end,
    `<h2 id="endHeading">${t('resultTitle', { song: songName(app.song), level: levelName(app.difficulty) })}</h2>
     <p class="rank">${t(r.rank)}</p>
     <p>${t('score', { n: r.score })}</p>
     <p>${t('resultNote', { great: r.counts.great, ok: r.counts.ok, miss: r.counts.miss, combo: r.maxCombo, rolls: r.rolls, doubles: r.doubles })}</p>
     ${r.best ? `<p><strong>${t('newBest')}</strong></p>` : ''}
     ${r.kept ? '' : `<p class="notice" role="status">${t('saveRefused')}</p>`}
     <div class="row"><button type="button" class="strong" data-do="again">${t('again')}</button><button type="button" data-do="quit">${t('quit')}</button></div>`
  );
  panels.end.setAttribute('aria-labelledby', 'endHeading');
  root.querySelector('[data-do=again]').addEventListener('click', () => startSong(app.song.id, app.difficulty));
  root.querySelector('[data-do=quit]').addEventListener('click', () => showTitle());
  say(`${t(r.rank)}, ${t('score', { n: r.score })}`);
  openPanel('end');
}

// ---- The delay: strokes with the clapper's clicks show how late a player's strokes come after the sound. ----
const CAL = { beats: 16, gap: 0.6, lead: 1, needed: 8 };
const cal = { taps: [], voice: null, done: false };
function calSheet(message) {
  const root = sheet(
    panels.cal,
    `<h2 id="calHeading">${t('calTitle')}</h2>
     <p>${t('calHow', { n: CAL.needed })}</p>
     <p id="calCount" aria-live="polite">${message ?? ''}</p>
     <div class="row"><button type="button" class="strong" data-do="start">${t('calStart')}</button><button type="button" data-do="close">${t('close')}</button></div>`
  );
  panels.cal.setAttribute('aria-labelledby', 'calHeading');
  root.querySelector('[data-do=start]').addEventListener('click', startCalibration);
  root.querySelector('[data-do=close]').addEventListener('click', () => endCalibration(true));
  return root;
}
function openCalibration() {
  app.screen = 'calIdle';
  calSheet();
  openPanel('cal');
}
async function startCalibration() {
  cal.taps = [];
  cal.done = false;
  labelPads();
  pads.hidden = false;
  app.screen = 'cal';
  $('#calCount').textContent = t('calCount', { n: 0, total: CAL.needed });
  cal.voice = await sound.clicks(CAL.beats, CAL.gap, CAL.lead);
}
function calTap(ms, kind) {
  sound.strike(kind === 'drum' ? 'drum' : 'tai');
  const heard = sound.heardAt(ms),
    beat = Math.round((heard - CAL.lead) / CAL.gap);
  if (beat < 0 || beat >= CAL.beats) return;
  const late = heard - (CAL.lead + beat * CAL.gap);
  if (Math.abs(late) > 0.25) return;
  cal.taps.push(late);
  $('#calCount').textContent = t('calCount', { n: cal.taps.length, total: CAL.needed });
}
function calFrame() {
  if (!cal.done && cal.voice && cal.voice.state === 'ended') endCalibration(false);
}
function endCalibration(closing) {
  cal.done = true;
  sound.stop();
  pads.hidden = true;
  if (closing) return showTitle('[data-calibrate]');
  let message = t('calFew');
  if (cal.taps.length >= CAL.needed) {
    const sorted = [...cal.taps].sort((a, b) => a - b),
      median = sorted[Math.floor(sorted.length / 2)],
      ms = Math.round(median * 1000);
    setSetting('offset', Math.max(-300, Math.min(300, ms)));
    message = t('calDone', { n: ms });
  }
  app.screen = 'calIdle';
  calSheet(message);
  openPanel('cal');
  say(message);
}

// A change of language writes every word again, on whichever screen is shown.
onLanguage(() => {
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  document.title = t('pageTitle');
  game.canvas.setAttribute('aria-label', t('stage'));
  if (app.screen === 'title') showTitle('[data-language]');
  else if (app.screen === 'menu') {
    app.screen = 'play';
    openMenu('[data-language]');
  }
});
document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
document.title = t('pageTitle');
$('#loading').remove();
showTitle();
ready = true;

// For tests and for anyone curious, from the console.
window.operaDrums = {
  app,
  game,
  sound,
  start: startSong,
  get screen() {
    return app.screen;
  },
  get ready() {
    return true;
  }
};
