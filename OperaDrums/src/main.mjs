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
  panels = { title: $('#title'), options: $('#options'), guide: $('#guide'), menu: $('#menu'), end: $('#end'), cal: $('#cal') };
const progress = $('#songProgress');
let chosenAct = SONGS[0];
let chosenLevel = DIFFICULTIES[0];

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
// The illustrated backdrop is a static CSS layer under the engine canvas.
Object.assign(game.canvas.parentElement.style, { background: 'transparent', zIndex: '1', position: 'absolute', inset: '0' });
game.canvas.setAttribute('role', 'img');
game.canvas.setAttribute('aria-label', t('stage'));
game.sfx.muted = true;
function syncMotion() {
  game.reducedMotion = settings().reducedMotion || prefersReducedMotion();
  document.documentElement.dataset.reduced = game.reducedMotion;
}
syncMotion();
const sound = await createSound(game.scope, { on: settings().sound, music: settings().music });

// ---- Strokes. ----
const KEYS = { KeyD: ['gong', 'd'], KeyF: ['drum', 'f'], KeyJ: ['drum', 'j'], KeyK: ['gong', 'k'] };
const PAD_KEYS = { 'pad:a': ['drum', 'pa'], 'pad:down': ['drum', 'pd'], 'pad:b': ['gong', 'pb'], 'pad:left': ['gong', 'pl'] };

/** A stroke of `kind` by `hand` at page time `ms`. */
function strikeAt(kind, hand, ms) {
  if (app.screen === 'cal') return calTap(ms, kind);
  if (app.screen !== 'play' || !app.run) return;
  const time = sound.heardAt(ms) - settings().offset / 1000;
  const result = strike(app.run, kind, time, hand);
  const met = result.type === 'judged' && result.judgement !== 'miss' && result.note.kind === kind;
  const free = kind === 'drum' ? 'drum' : 'tai';
  const effect = met ? STROKE_SOUND[result.note.syllable]
    : result.type === 'double' ? 'double'
    : result.type === 'roll' && kind === 'drum' ? 'roll' : free;
  sound.strike(effect);
  if (result.type === 'judged' && app.strokes.length < 2000) app.strokes.push({ judgement: result.judgement, off: result.off, at: time });
  view.struck(kind, result);
}

const padContacts = new Map();
function releasePads() {
  for (const [pad, contacts] of padContacts) {
    contacts.clear();
    pad.classList.remove('down');
  }
}
for (const pad of pads.querySelectorAll('.pad')) {
  const { kind, hand } = pad.dataset;
  const contacts = new Set();
  padContacts.set(pad, contacts);
  pad.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || app.screen !== 'play') return;
    event.preventDefault();
    pad.setPointerCapture(event.pointerId);
    contacts.add(event.pointerId);
    pad.classList.add('down');
    strikeAt(kind, `${hand}${event.pointerId}`, event.timeStamp);
  });
  const release = (event) => {
    contacts.delete(event.pointerId);
    pad.classList.toggle('down', contacts.size > 0);
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(type, release);
  pad.addEventListener('contextmenu', (event) => event.preventDefault());
  // Keyboard and assistive-technology activation have not fired pointerdown.
  pad.addEventListener('click', (event) => event.detail === 0 && strikeAt(kind, hand, event.timeStamp));
}
window.addEventListener('blur', releasePads);

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
    } else if ((app.screen === 'options' || app.screen === 'guide') && event.key === 'Escape') {
      event.preventDefault();
      showTitle(`[data-open="${app.screen}"]`);
    } else if ((app.screen === 'cal' || app.screen === 'calIdle') && event.key === 'Escape') {
      event.preventDefault();
      endCalibration(true);
    }
  },
  true
);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden') return;
  releasePads();
  if (app.screen === 'play') openMenu();
});

// ---- Each frame: the song's time from the sound, the notes missed, the view and the bar. ----
let shownScore = -1;
let shownProgress = -1;
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
  const progressPercent = Math.round(100 * Math.max(0, Math.min(1, time / app.chart.end)));
  if (shownProgress !== progressPercent) {
    shownProgress = progressPercent;
    progress.value = progressPercent;
  }
  if (app.run.done) finish();
}
const speedOf = () => 260 * settings().speed;

// ---- Screens. ----
function openPanel(name) {
  for (const [key, panel] of Object.entries(panels)) panel.hidden = key !== name;
  const covered = name !== null;
  field.inert = covered;
  pads.inert = covered || app.screen === 'loading';
  if (covered) releasePads();
  if (name) (panels[name].querySelector('[data-focus]:not([hidden])') ?? panels[name].querySelector('button:not([hidden])'))?.focus({ preventScroll: true });
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

function settingsHtml({ calibrate = true } = {}) {
  const s = settings();
  const toggle = (key, on) => `<button type="button" data-toggle="${key}" aria-pressed="${on}">${t('switchState', { name: t(key), state: t(on ? 'on' : 'off') })}</button>`;
  const stepper = (key, label, value, atMin, atMax) => `<div class="row step-field"><span class="label">${t(label)}</span>
    <button type="button" data-step="${key}:-1" aria-label="${t(label)} −" aria-disabled="${atMin}">−</button>
    <output>${value}</output>
    <button type="button" data-step="${key}:1" aria-label="${t(label)} +" aria-disabled="${atMax}">+</button></div>`;
  return `<div class="prefs">
    <div class="row">${toggle('sound', s.sound)}${toggle('reducedMotion', s.reducedMotion)}<button type="button" data-language aria-label="${t('languageName')}" lang="${getLanguage() === 'zh' ? 'en' : 'zh-CN'}">${t('language')}</button></div>
    ${stepper('music', 'musicVolume', Math.round(s.music * 100) + '%', s.music <= 0, s.music >= 1)}
    ${stepper('speed', 'speed', '×' + s.speed, s.speed === SPEEDS[0], s.speed === SPEEDS.at(-1))}
    ${stepper('offset', 'offset', t('offsetValue', { n: s.offset }), s.offset <= -300, s.offset >= 300)}
    ${calibrate ? `<button class="opt-calibrate" type="button" data-calibrate>${t('calibrate')}</button>` : ''}
    </div>`;
}

function wireSettings(root, redraw) {
  for (const button of root.querySelectorAll('[data-toggle]'))
    button.addEventListener('click', () => {
      const key = button.dataset.toggle,
        value = !settings()[key];
      setSetting(key, value);
      if (key === 'sound') sound.setOn(value);
      if (key === 'reducedMotion') syncMotion();
      redraw(`[data-toggle="${key}"]`);
    });
  for (const button of root.querySelectorAll('[data-step]'))
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-disabled') === 'true') return;
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
  const acts = SONGS.map((song) => `<button type="button" class="act" data-act="${song.id}" aria-pressed="false">
      <img src="assets/${song.id}.webp" width="520" height="693" alt=""><span>${songName(song)}</span></button>`).join('');
  const levels = DIFFICULTIES.map((level) => `<button type="button" class="level" data-level="${level}" aria-pressed="false">
      <span>${levelName(level)}</span><small></small></button>`).join('');
  const root = sheet(panels.title, `
    <header class="brand">
      <div class="brand-rule"></div><h1>${t('title')}</h1><p class="tagline">${t('tagline')}</p>
      <div class="title-tools">
        <button type="button" data-open="guide">${t('howTitle')}</button>
        <button type="button" data-open="options">${t('settings')}</button>
      </div>
      ${notice ? `<p class="notice" role="status">${t(notice)}</p>` : ''}
    </header>
    <div class="program">
      <div class="program-head"><h2>${t('songs')}</h2></div>
      <div class="acts">${acts}</div>
      <div class="playbill">
        <div class="act-meta"><span class="about"></span><output></output></div>
        <div class="levels" role="group" aria-label="${t('chooseLevel')}">${levels}</div>
        <div class="launch">
          <p class="hint"><span class="key-hint">${t('keysHint')}</span><span class="touch-hint">${t('touchHint')}</span></p>
          <button type="button" class="strong" data-start>${t('play')}</button>
        </div>
      </div>
    </div>`);
  const paintSelection = () => {
    for (const button of root.querySelectorAll('[data-act]')) button.setAttribute('aria-pressed', button.dataset.act === chosenAct.id);
    root.querySelector('.act-meta .about').textContent = getLanguage() === 'zh' ? chosenAct.noteZh : chosenAct.noteEn;
    root.querySelector('.act-meta output').textContent = t('bpm', { n: chosenAct.bpm });
    for (const button of root.querySelectorAll('[data-level]')) {
      const level = button.dataset.level;
      const kept = save.data.best[chosenAct.id]?.[level];
      button.setAttribute('aria-pressed', level === chosenLevel);
      button.querySelector('small').textContent = kept ? t('bestOf', { rank: t(kept.rank), score: kept.score }) : t('bestNone');
    }
    root.querySelector('[data-start]').setAttribute('aria-label', t('startChart', { song: songName(chosenAct), level: levelName(chosenLevel) }));
  };
  for (const button of root.querySelectorAll('[data-act]')) {
    button.addEventListener('click', () => {
      chosenAct = songOf(button.dataset.act);
      sound.cue?.('select');
      paintSelection();
    });
  }
  for (const button of root.querySelectorAll('[data-level]')) {
    button.addEventListener('click', () => {
      chosenLevel = button.dataset.level;
      sound.cue?.('select');
      paintSelection();
    });
  }
  root.querySelector('[data-start]').addEventListener('click', () => startSong(chosenAct.id, chosenLevel));
  root.querySelector('[data-open="guide"]').addEventListener('click', showGuide);
  root.querySelector('[data-open="options"]').addEventListener('click', () => showOptions());
  paintSelection();
  openPanel('title');
  (root.querySelector(focus || `[data-act="${chosenAct.id}"]`))?.focus({ preventScroll: true });
}

function showGuide() {
  app.screen = 'guide';
  sound.cue?.('open');
  panels.guide.setAttribute('aria-labelledby', 'guideHeading');
  const root = sheet(panels.guide, `<h2 id="guideHeading">${t('howTitle')}</h2>
    <ol><li>${t('how1')}</li><li>${t('how2')}</li><li>${t('how3')}</li></ol>
    <p class="quietText">${t('keysLine')}</p>
    <div class="row">
      <button type="button" data-sample="drum"><i class="note-mark drum" aria-hidden="true"></i> ${t('sampleDrum')}</button>
      <button type="button" data-sample="tai"><i class="note-mark gong" aria-hidden="true"></i> ${t('sampleGong')}</button>
    </div>
    <div class="row sheet-actions"><button type="button" class="strong" data-do="close" data-focus>${t('close')}</button></div>`);
  for (const button of root.querySelectorAll('[data-sample]')) button.addEventListener('click', () => sound.strike(button.dataset.sample));
  root.querySelector('[data-do="close"]').addEventListener('click', () => showTitle('[data-open="guide"]'));
  openPanel('guide');
}

function showOptions(focus) {
  if (app.screen === 'title') sound.cue?.('open');
  app.screen = 'options';
  panels.options.setAttribute('aria-labelledby', 'optionsHeading');
  const root = sheet(panels.options, `<h2 id="optionsHeading">${t('settings')}</h2>
    ${settingsHtml()}
    <div class="row sheet-actions"><button type="button" class="strong" data-do="close">${t('close')}</button></div>`);
  root.querySelector('[data-do="close"]').addEventListener('click', () => showTitle('[data-open="options"]'));
  wireSettings(root, showOptions);
  openPanel('options');
  if (focus) root.querySelector(focus)?.focus({ preventScroll: true });
}

function labelPads() {
  for (const pad of pads.querySelectorAll('.pad')) {
    const kind = pad.dataset.kind,
      key = pad.dataset.hand.toUpperCase();
    pad.innerHTML = `<i class="pad-mark" aria-hidden="true"></i><span>${t(`${kind}Pad`)}</span><kbd>${key}</kbd>`;
    pad.setAttribute('aria-label', t(`${kind}PadName`, { key }));
  }
}

function updatePlayLabels() {
  $('#songName').textContent = `${songName(app.song)} · ${levelName(app.difficulty)}`;
  $('#score').textContent = t('score', { n: app.run?.score ?? 0 });
  progress.setAttribute('aria-label', t('scoreProgress'));
  $('#pauseButton').textContent = t('pause');
  labelPads();
}

async function startSong(id, difficulty) {
  if (app.screen === 'loading') return;
  const song = songOf(id);
  chosenAct = song;
  chosenLevel = difficulty;
  if (notice === 'audioError') notice = null;
  field.dataset.act = song.id;
  app.song = song;
  app.difficulty = difficulty;
  app.chart = buildChart(song, difficulty);
  app.run = null;
  app.result = null;
  app.screen = 'loading';
  openPanel(null);
  view.reset(app.chart, speedOf());
  $('#hud').hidden = false;
  updatePlayLabels();
  progress.value = 0;
  $('#pauseButton').disabled = true;
  pads.hidden = false;
  const prompt = $('#prompt');
  prompt.textContent = t('loading');
  prompt.hidden = false;
  try {
    await sound.prepare(song);
    if (sound.state === 'locked') prompt.textContent = t('tapToStart');
    if (!(await sound.start(song))) throw new Error('The backing voice did not start.');
  } catch (cause) {
    console.warn('Opera Drums score could not start', cause);
    notice = 'audioError';
    return showTitle('[data-start]');
  }
  prompt.hidden = true;
  app.run = createRun(app.chart);
  app.strokes = [];
  shownScore = -1;
  shownProgress = -1;
  app.screen = 'play';
  $('#pauseButton').disabled = false;
  openPanel(null);
  if (game.paused) game.resume();
  say(`${songName(song)} · ${levelName(difficulty)}`);
  if (document.hidden) openMenu();
  else pads.querySelector('.drum')?.focus({ preventScroll: true });
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
     <details class="pause-settings"${focus ? ' open' : ''}><summary>${t('settings')}</summary>${settingsHtml({ calibrate: false })}</details>`
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
  sound.stop();
  sound.cue?.(result.cleared ? 'clear' : 'retry');
  showEnd();
}

function showEnd() {
  const r = app.result;
  pads.hidden = true;
  $('#hud').hidden = true;
  view.clear();
  const root = sheet(
    panels.end,
    `<div class="end-head"><h2 id="endHeading">${t('curtainCall')}</h2><small>${t('resultTitle', { song: songName(app.song), level: levelName(app.difficulty) })}</small></div>
     <div class="end-lead">
       <img src="assets/${app.song.id}.webp" alt="">
       <div><p class="rank" data-rank="${r.rank}">${t(r.rank)}</p>
       <p class="end-score">${t('score', { n: r.score })}</p>
       ${r.best ? `<p class="new-best">${t('newBest')}</p>` : ''}</div>
     </div>
     <dl class="stats">${[
       ['great', r.counts.great], ['ok', r.counts.ok], ['miss', r.counts.miss],
       ['maxCombo', r.maxCombo], ['rollCount', r.rolls], ['doubleCount', r.doubles]
     ].map(([label, count]) => `<div><dt>${t(label)}</dt><dd>${count}</dd></div>`).join('')}</dl>
     ${r.kept ? '' : `<p class="notice" role="status">${t('saveRefused')}</p>`}
     <div class="row sheet-actions"><button type="button" class="strong" data-do="again">${t('again')}</button><button type="button" data-do="quit">${t('quit')}</button></div>`
  );
  panels.end.setAttribute('aria-labelledby', 'endHeading');
  root.querySelector('[data-do=again]').addEventListener('click', () => startSong(app.song.id, app.difficulty));
  root.querySelector('[data-do=quit]').addEventListener('click', () => showTitle());
  say(`${t(r.rank)}, ${t('score', { n: r.score })}`);
  openPanel('end');
}

// ---- The delay: strokes with the clapper's clicks show how late a player's strokes come after the sound. ----
const CAL = { beats: 16, gap: 0.6, lead: 1, needed: 8 };
const cal = { taps: new Map(), voice: null, done: false };
function calSheet(message) {
  const root = sheet(
    panels.cal,
    `<h2 id="calHeading">${t('calTitle')}</h2>
     <p>${t('calHow', { n: CAL.needed })}</p>
     <p id="calCount" role="status">${message ?? ''}</p>
     <button type="button" data-cal-tap hidden>${t('calTap')}</button>
     ${settings().sound ? '' : `<p>${t('calNeedsSound')}</p>`}
     <div class="row sheet-actions"><button type="button" class="strong" data-do="${settings().sound ? 'start' : 'sound'}">${t(settings().sound ? 'calStart' : 'enableSound')}</button><button type="button" data-do="close">${t('close')}</button></div>`
  );
  panels.cal.setAttribute('aria-labelledby', 'calHeading');
  root.querySelector('[data-do=start]')?.addEventListener('click', startCalibration);
  root.querySelector('[data-do=sound]')?.addEventListener('click', () => {
    setSetting('sound', true);
    sound.setOn(true);
    openCalibration();
  });
  root.querySelector('[data-do=close]').addEventListener('click', () => endCalibration(true));
  const tap = root.querySelector('[data-cal-tap]');
  tap.addEventListener('pointerdown', (event) => {
    if (event.button === 0) calTap(event.timeStamp, 'drum');
  });
  tap.addEventListener('click', (event) => {
    if (event.detail === 0) calTap(event.timeStamp, 'drum');
  });
}

function openCalibration() {
  app.screen = 'calIdle';
  calSheet();
  openPanel('cal');
}

async function startCalibration() {
  if (app.screen !== 'calIdle') return;
  cal.taps.clear();
  cal.done = false;
  cal.voice = null;
  app.screen = 'cal';
  const tap = $('[data-cal-tap]');
  tap.hidden = false;
  tap.focus({ preventScroll: true });
  $('#cal [data-do=start]').hidden = true;
  $('#calCount').textContent = t('calCount', { n: 0, total: CAL.beats });
  try {
    cal.voice = await sound.clicks(CAL.beats, CAL.gap, CAL.lead);
  } catch {
    if (app.screen !== 'cal') return;
    sound.stop();
    app.screen = 'calIdle';
    calSheet(t('audioError'));
    openPanel('cal');
  }
}

function calTap(ms, kind) {
  if (app.screen !== 'cal' || !cal.voice) return;
  sound.strike(kind === 'drum' ? 'drum' : 'tai');
  const heard = sound.heardAt(ms);
  const beat = Math.round((heard - CAL.lead) / CAL.gap);
  if (beat < 0 || beat >= CAL.beats) return;
  const late = heard - (CAL.lead + beat * CAL.gap);
  if (Math.abs(late) > 0.25 || cal.taps.has(beat)) return;
  cal.taps.set(beat, late);
  $('#calCount').textContent = t('calCount', { n: cal.taps.size, total: CAL.beats });
}

function calFrame() {
  if (cal.done || !cal.voice) return;
  if (cal.voice.state === 'ended') return endCalibration(false);
  const elapsed = sound.heardAt() - CAL.lead;
  $('[data-cal-tap]').classList.toggle('beat', elapsed >= 0 && elapsed % CAL.gap < 0.10);
}

function endCalibration(closing) {
  cal.done = true;
  sound.stop();
  if (closing) return showOptions('[data-calibrate]');
  let message = t('calFew');
  if (cal.taps.size >= CAL.needed) {
    const sorted = [...cal.taps.values()].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const ms = Math.round(median * 1000);
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
  if (app.screen === 'options') showOptions('[data-language]');
  else if (app.screen === 'title') showTitle();
  else if (app.screen === 'menu') {
    updatePlayLabels();
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
