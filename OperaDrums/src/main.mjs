// 页面入口：存档、语言、引擎的 play（画布、每帧、屏幕的形状）、引擎的混音器（伴奏和击打声）、曲目、设置、延迟
// 校准、暂停和结算。所有界面都是引擎的数据界面，写在 src/ui/：画面由引擎的屏幕栈管，演出页的四块敲击区也是界面的
// 部件。敲击来自键盘、敲击区和手柄；一下敲击的时刻取输入事件的时间戳，换成那一刻耳朵听到的曲子秒数，再交给
// src/sim/judge.mjs 判定。
//
// The page's entry: the save, the language, the engine's play (the canvas, each frame, the screen's shape), the
// engine's mixer (the backing and the strokes), the songs, the settings, the delay, the pause and the result. Every
// interface is one of the engine's views described as data, in src/ui/: the engine's screen stack holds the screens,
// and the four pads of the performance are parts of a view too. Strokes come from the keys, the pads and a gamepad; a
// stroke's moment is its input event's time stamp, turned into the second of the song heard at that moment, then
// judged by src/sim/judge.mjs.
import { play } from '@egret/engine/play';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { browserLanguages, browserSaveStorage, prefersReducedMotion } from '@egret/engine/web/kit';
import { STROKE_SOUND, createSound } from './audio/sound.mjs';
import { getLanguage, onLanguage, setLanguage, startLanguage, t } from './i18n.mjs';
import { SPEEDS, openSave, recordRun } from './saves.mjs';
import { LEAD, buildChart, songOf } from './sim/chart.mjs';
import { ENCORE_POWER, ENCORE_SONG, createEncore, updateEncore } from './sim/encore.mjs';
import { explainStrike } from './sim/feedback.mjs';
import { LESSON_SONG, LESSON_STEPS, buildLesson, lessonStepAt } from './sim/lesson.mjs';
import { advance, createRun, resultOf, strike } from './sim/judge.mjs';
import { DIFFICULTIES, SONGS } from './sim/songs.mjs';
import { createScreens } from './ui/screens.mjs';
import { SKIN } from './ui/skin.mjs';
import { PADS, drawStageFrame, openPlayPage } from './ui/stage-ui.mjs';
import { INSTRUMENTS, createView } from './view.mjs';

const params = new URLSearchParams(location.search);
const lessonCues = ['practiceDrum', 'practiceGong', 'practiceDouble', 'practiceRoll'];
const lessonSkills = ['Drum', 'Gong', 'Double', 'Roll'];
let lastMissed = null;
let lastLessonFeedback = { key: 'timingReady' };
let lessonCounts = null;
let encoreFeedback = null;
const READY_CUE_DELAY = 0.075;
const ENCORE_CUES = { start: 'rally', end: 'rally-end', break: 'rally-break' };
const ENCORE_WORDS = { ready: 'encoreFull', start: 'encoreTrigger', end: 'encoreEnded', break: 'encoreBroken' };

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

const songName = (id) => (id === LESSON_SONG.id ? t('practiceName') : id === ENCORE_SONG.id ? t('encore') : getLanguage() === 'zh' ? songOf(id).zh : songOf(id).en);
const levelName = (difficulty) => t(difficulty);
const freshHud = () => ({
  songLine: '', scoreLine: '', progress: 0, encorePhase: null,
  coach: { shown: false, label: '', hint: '', phase: 'lesson', bar: 0, barShown: false },
  readout: { text: '', warn: false },
  padsDown: { d: 0, f: 0, j: 0, k: 0 }
});

const app = {
  save,
  screen: 'title',
  chosenAct: SONGS[0],
  chosenLevel: DIFFICULTIES[0],
  song: null,
  mode: 'song',
  lessonSkills: null,
  lessonStep: null,
  lessonCompletedBefore: [],
  encore: null,
  difficulty: 'normal',
  chart: null,
  run: null,
  result: null,
  time: 0,
  hud: freshHud(),
  /** How many strokes the pads have taken by finger or mouse. */
  padPresses: 0,
  cal: { running: false, message: '', beat: false },
  /** The judged strokes of the current run, with how far off each was: for tests and for the curious. */
  strokes: [],
  portrait: () => game?.orientation === 'portrait',
  get notice() {
    return notice;
  }
};

// ---- The engine: play makes the canvas, fits it to any screen, runs the frames, and draws the views. ----
const semantics = createUiSemantics();
let game, view, sound, screens, playPage = null, stageRoot, projection, projected = '';
let ready = false;
// Every picture the views and the stage show, loaded two at a time before the first screen and kept: the engine
// refuses a fifth image while four are loading (ENGINE-NOTES.md), and the title alone shows three. The views ask for
// the same addresses and share them.
const PICTURES = ['assets/qiba.webp', 'assets/tangma.webp', 'assets/jijifeng.webp', INSTRUMENTS];
// The illustrated stage never moves, so the page paints it once under the clear canvas, as the engine's guide advises
// for a still background (ENGINE-NOTES.md): behind the menus it fills the window, and in a performance it sits under
// the part of the view named `stage`.
const backdrop = document.querySelector('#backdrop'),
  ground = document.querySelector('#ground');

/** The stage of the performance: its frame, then the lane, notes and instruments of src/view.mjs, in stage units. */
function buildWorld() {
  stageRoot = game.sprite();
  // The canvas covers the window, so notes coming in from the right are cut at the stage's edge.
  stageRoot.clipRect = { x: -2, y: -2, width: 964, height: 544 };
  game.sprite(drawStageFrame, stageRoot);
  view = createView(game, {
    words: t,
    roman: () => getLanguage() === 'en',
    parent: stageRoot,
    place: (x, y) => ({ x: stageRoot.x + x * stageRoot.scaleX, y: stageRoot.y + y * stageRoot.scaleY, scale: stageRoot.scaleX })
  });
  stageRoot.visible = false;
}

/** Places what depends on the screen: the stage under its part, the page's picture under it, and the projection. */
function arrange() {
  const screen = game.screen,
    performing = Boolean(stageRoot?.visible);
  document.documentElement.dataset.mode = performing ? 'play' : 'menu';
  ground.hidden = !performing || !playPage;
  if (playPage) {
    const r = playPage.rect('stage');
    stageRoot.x = r.x;
    stageRoot.y = r.y;
    stageRoot.scaleX = stageRoot.scaleY = r.width / 960;
    // The same place in the page's pixels: the canvas spans the screen.
    const box = game.canvas.getBoundingClientRect(),
      unit = box.width / screen.width;
    Object.assign(ground.style, {
      left: `${box.left + (r.x - screen.x) * unit}px`,
      top: `${box.top + (r.y - screen.y) * unit}px`,
      width: `${r.width * unit}px`,
      height: `${r.height * unit}px`
    });
  }
  // The projection for assistive technology maps the canvas to the stage, whose size follows the screen.
  const size = `${Math.round(screen.width)}x${Math.round(screen.height)}`;
  if (size !== projected) {
    projected = size;
    projection?.dispose();
    try {
      projection = createBrowserSemantics({ semantics, canvas: game.canvas, width: screen.width, height: screen.height, label: t('stage'), onError: (cause) => console.warn('semantics', cause) });
    } catch (cause) {
      projection = null;
      console.warn('semantics', cause);
    }
  }
}

/**
 * Whether the page draws with a software renderer (SwiftShader, llvmpipe): every pixel costs there, so the canvas is
 * drawn at three quarters of its size and scaled up (ENGINE-NOTES.md).
 */
function softwareRendering() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|software/i.test(String(name ?? ''));
  } catch {
    return false;
  }
}

/** What shows when a file did not load: the words and a button that loads the page again. */
function showLoadFailed() {
  game.show({ label: t('loadFailed'), skin: SKIN, modal: true, root: {
    type: 'panel', card: true, color: 0x231b14, anchor: 'center', width: 420, height: 170, padding: 24, layout: 'column', gap: 16, children: [
      { type: 'text', name: 'load-failed', text: t('loadFailed'), height: 40, size: 22, bold: true },
      { type: 'button', name: 'retry', text: t('retry'), height: 60, color: 0x9b352a, textColor: 0xfff0d6 }
    ]
  } }, { bind: { retry: { tap: () => location.reload() } } });
  // The tree needs a projection to be read: there is no other screen to make one.
  arrange();
}

await play({
  width: 960,
  height: 680,
  portrait: { width: 540, height: 960 },
  fit: 'expand',
  transparent: true,
  ...(softwareRendering() ? { pixelRatio: 0.75 } : {}),
  // Menus stand still most of the time: a frame is drawn only when something on the screen changed.
  renderMode: 'on-demand',
  audio: false,
  semantics,
  setup(made) {
    game = made;
  },
  update: (seconds) => frame(seconds),
  arrange: () => arrange(),
  onError: (cause) => console.error(cause)
});
// The sound and the pictures load behind the engine's loading bar. The bar is shown once play has started its frames:
// a view that `setup` awaits is not drawn (ENGINE-NOTES.md).
document.querySelector('#boot')?.remove();
const loaded = await game.loading([
  createSound(game.scope, { on: settings().sound, music: settings().music }),
  ...PICTURES.map((url) => () => game.browser.loadTexture(url))
], { label: t('loading'), atOnce: 2 }).catch((cause) => {
  console.warn('Opera Drums could not load', cause);
  return null;
});
if (!loaded) {
  // A file did not arrive: say so and offer to load the page again; the game goes no further.
  showLoadFailed();
  await new Promise(() => {});
}
sound = loaded[0];
buildWorld();
function syncMotion() {
  game.reducedMotion = settings().reducedMotion || prefersReducedMotion();
}
syncMotion();

// A status line for assistive technology: what a sighted player sees at a glance, said once.
let lastSaid = '';
semantics.add({ id: 'say', role: 'status', describe: () => ({ name: lastSaid, bounds: { x: 0, y: 0, width: 1, height: 1 } }) });
function say(words) {
  lastSaid = words === lastSaid ? `${words} ` : words;
}

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
  const feedback = explainStrike(result, kind, time, app.chart.notes[app.run.next], lastMissed);
  view.struck(kind, result, feedback ? t(feedback.key, feedback) : '');
  if (app.lessonSkills) {
    if (met && !result.note.big && ++lessonCounts[kind] >= 2) app.lessonSkills.add(kind);
    if (result.type === 'double') app.lessonSkills.add('double');
    if (result.type === 'roll' && kind === 'drum' && ++lessonCounts.roll >= 4) app.lessonSkills.add('roll');
    if (feedback) setLessonFeedback(result.type === 'roll' && kind !== 'drum' ? { key: 'timingUseDrum' } : feedback);
  }
  updateRally(result, time);
}

// The pads: a finger or the mouse strikes as it goes down, at the time stamp of its event; each pad lights while a
// contact holds it. A tap that follows such a press is the same stroke; one with no press before it is a key or
// assistive technology, and strikes then.
const contacts = new Map(PADS.map((p) => [p.hand, new Set()]));
function padBuilt(made) {
  // Told while the view is being made, before `openPlayPage` has given it back.
  playPage = made;
  for (const p of PADS) {
    const node = made.get(p.name),
      held = contacts.get(p.hand),
      input = game.browser.pointer;
    held.clear();
    app.hud.padsDown[p.hand] = 0;
    node.on(input.events.begin, (event) => {
      const contact = event.payload;
      if (app.screen !== 'play') return;
      held.add(contact.session.pointerId);
      app.hud.padsDown[p.hand] = held.size;
      app.padPresses++;
      strikeAt(p.kind, `${p.hand}${contact.session.pointerId}`, contact.timestamp);
    });
    const release = (event) => {
      held.delete(event.payload.session.pointerId);
      app.hud.padsDown[p.hand] = held.size;
    };
    node.on(input.events.end, release);
    node.on(input.events.cancel, release);
  }
  arrange();
}
function padActivated(p, activation) {
  if (['mouse', 'touch', 'pen'].includes(activation.source)) return;
  strikeAt(p.kind, p.hand, performance.now());
}
function releasePads() {
  for (const [hand, held] of contacts) {
    held.clear();
    app.hud.padsDown[hand] = 0;
  }
}
window.addEventListener('blur', releasePads);

// The strike keys are read from the page's events for their time stamps; every other key is the views' and play's.
window.addEventListener(
  'keydown',
  (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const stroke = KEYS[event.code];
    if (stroke && (app.screen === 'play' || app.screen === 'cal')) {
      event.preventDefault();
      if (!event.repeat) strikeAt(stroke[0], stroke[1], event.timeStamp);
    }
  },
  true
);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden') return;
  releasePads();
  if (app.screen === 'play') openMenu();
});

// ---- Each frame: the song's time from the sound, the notes missed, the stage and the page's numbers. ----
function frame(seconds) {
  if (!ready) return;
  for (const [key, [kind, hand]] of Object.entries(PAD_KEYS)) if (game.keys.pressed(key)) strikeAt(kind, hand, performance.now());
  if (app.screen === 'play' && game.keys.pressed('escape', 'p', 'pad:start')) return openMenu();
  if (app.screen === 'cal') return calFrame();
  if (app.screen !== 'play' || !app.run) return;
  const time = sound.heardAt() - settings().offset / 1000;
  app.time = time;
  const missed = advance(app.run, time);
  if (missed.length) {
    lastMissed = missed.at(-1);
    view.missed();
    if (app.lessonSkills) setLessonFeedback({ key: 'timingMissedHint' });
  }
  view.show(app.run, time, speedOf(), seconds);
  app.hud.scoreLine = t('score', { n: app.run.score });
  app.hud.progress = Math.max(0, Math.min(1, time / app.chart.end));
  if (app.encore) updateRally(null, time);
  if (app.mode !== 'song') paintCoach(time);
  if (app.run.done) finish();
}
const speedOf = () => (app.mode === 'lesson' ? 275 : 260 * settings().speed);

function updateRally(result, time) {
  if (!app.encore) return;
  const previous = app.encore;
  const { state, award, activated } = updateEncore(previous, result, app.run, time);
  app.encore = state;
  if (award) app.run.score += award;

  const phase = state.activeUntil > time ? 'active' : state.charge === ENCORE_POWER.capacity ? 'ready' : 'charge';
  let cue = null;
  if (activated) {
    encoreFeedback.bonusStart = state.bonus - award;
    cue = 'start';
  } else if (previous.activeUntil && !state.activeUntil) {
    cue = time < previous.activeUntil ? 'break' : 'end';
  } else if (phase === 'ready' && encoreFeedback.phase !== 'ready') {
    cue = 'ready';
  }
  if (encoreFeedback.phase !== phase) {
    encoreFeedback.phase = phase;
    view.setEncorePhase(phase);
  }

  if (cue) {
    encoreFeedback.notice = { cue, time };
    view.encoreCue(cue);
    say(t(ENCORE_WORDS[cue]));
    if (cue === 'ready') encoreFeedback.readyAt = time + READY_CUE_DELAY;
    else sound.cue?.(ENCORE_CUES[cue]);
  }
  // Both contacts on the charging gong can also trigger the rally. In that case,
  // play only its activation cue. This clock also holds while the game is paused.
  if (phase !== 'ready') encoreFeedback.readyAt = null;
  if (encoreFeedback.readyAt !== null && time >= encoreFeedback.readyAt) {
    encoreFeedback.readyAt = null;
    sound.cue?.('rally-ready');
  }
}

function setLessonFeedback(feedback) {
  const warn = ['timingEarly', 'timingLate', 'timingMissedHint'].includes(feedback.key);
  app.hud.readout = { text: t(feedback.key, feedback), warn };
  lastLessonFeedback = feedback;
}
/** The line under the stage: the lesson's feedback, or the keys and pads of a song. */
function paintReadout() {
  if (app.mode === 'lesson') return setLessonFeedback(lastLessonFeedback);
  app.hud.readout = { text: t(game.device === 'touch' ? 'touchHint' : 'keysHint'), warn: false };
}

function paintCoach(time) {
  const coach = app.hud.coach;
  coach.shown = true;
  if (app.mode === 'lesson') {
    const step = app.lessonStep ? LESSON_STEPS.findIndex(({ skill }) => skill === app.lessonStep) : lessonStepAt(time);
    coach.label = app.lessonStep ? t('practiceSkill' + lessonSkills[step]) : t('practiceCount', { n: step + 1 });
    coach.hint = t(lessonCues[step]);
    coach.phase = 'lesson';
    coach.barShown = false;
    return;
  }
  const { charge, activeUntil, bonus } = app.encore;
  const { phase, notice: last, bonusStart } = encoreFeedback;
  const age = last ? time - last.time : Infinity;
  const roundBonus = () => t('encoreRoundBonus', { score: bonus - bonusStart });
  coach.phase = phase;
  if (phase === 'active') {
    coach.label = t('encoreActive', { n: Math.ceil(activeUntil - time) });
    coach.hint = age < 0.9 ? t('encoreTrigger') : roundBonus();
  } else if (phase === 'ready') {
    coach.label = t('encoreFull');
    coach.hint = t('encoreReady');
  } else if ((last?.cue === 'end' || last?.cue === 'break') && age < 1.15) {
    coach.phase = last.cue;
    coach.label = t(ENCORE_WORDS[last.cue]);
    coach.hint = roundBonus();
  } else {
    coach.label = t('encoreCharge', { n: charge, max: ENCORE_POWER.capacity });
    coach.hint = t('encoreHint');
  }
  coach.barShown = true;
  coach.bar = phase === 'active' ? (activeUntil - time) / ENCORE_POWER.seconds : charge / ENCORE_POWER.capacity;
  app.hud.encorePhase = coach.phase;
}

// ---- Screens. ----
const soon = (callback) => requestAnimationFrame(() => requestAnimationFrame(callback));
const focusSoon = (name) => soon(() => screens.focus(name));

function showMenus() {
  stageRoot.visible = false;
  view.clear();
  arrange();
}

function showTitle(focusName) {
  app.screen = 'title';
  app.run = null;
  sound.stop();
  if (game.paused) game.resume();
  playPage = null;
  openDialog = null;
  showMenus();
  screens.stack.closeAll();
  screens.stack.open(screens.SCREENS.title);
  focusSoon(focusName ?? 'act-' + app.chosenAct.id);
}

/** The dialog open now, as it was opened: a change of language opens it again the same way. */
let openDialog = null;
function openModal(name, screenName, params, onClose) {
  // What shows when it closes: the screen under the dialogs, also when one dialog gives way to another.
  const before = openDialog && !openDialog.relabeled ? openDialog.before : app.screen;
  // The part that opened it gets the focus back: the page under a dialog is not active yet when the dialog closes, so
  // the engine's own return of the focus finds nothing to give it to (ENGINE-NOTES.md).
  const opener = openDialog?.opener ?? semantics.publish().nodes.find((node) => node.focused)?.id.split(':').slice(1).join(':');
  const record = { name, screenName, params, onClose, before, opener, relabeled: false };
  openDialog = record;
  app.screen = screenName;
  screens.stack.open(screens.SCREENS[name], params).then(() => {
    if (record.relabeled) return;
    if (openDialog === record) openDialog = null;
    if (app.screen === screenName || (name === 'calibration' && app.screen === 'cal')) app.screen = record.before;
    if (onClose) onClose();
    else if (opener) focusSoon(opener);
  });
}
function openGuide() {
  sound.cue?.('open');
  openModal('guide', 'guide');
}
function openEncoreGuide() {
  sound.cue?.('open');
  openModal('encore', 'encoreGuide');
}
function openOptions(from) {
  if (from === 'pause') {
    screens.stack.close(screens.SCREENS.pause);
    openModal('options', 'options', { from }, () => {
      app.screen = 'play';
      openMenu(true);
    });
  } else {
    sound.cue?.('open');
    openModal('options', 'options', { from });
  }
}

/** The tray of the play page: what it says before the first note. */
function resetHud() {
  const hud = freshHud();
  hud.songLine = app.mode === 'song' ? `${songName(app.song.id)} · ${levelName(app.difficulty)}` : songName(app.song.id);
  hud.scoreLine = t('score', { n: 0 });
  app.hud = hud;
  paintReadout();
}

async function startSong(id, difficulty, { step = null, completed = [] } = {}) {
  if (app.screen === 'loading') return;
  const lesson = id === LESSON_SONG.id;
  const encore = id === ENCORE_SONG.id;
  const song = lesson ? LESSON_SONG : encore ? ENCORE_SONG : songOf(id);
  app.mode = lesson ? 'lesson' : encore ? 'encore' : 'song';
  if (app.mode === 'song') {
    app.chosenAct = song;
    app.chosenLevel = difficulty;
  }
  if (notice === 'audioError') notice = null;
  if (game.paused) game.resume();
  ground.dataset.act = encore ? 'jijifeng' : song.id;
  app.song = song;
  app.difficulty = difficulty;
  app.lessonStep = lesson ? step : null;
  app.lessonCompletedBefore = lesson ? completed : [];
  app.lessonSkills = lesson ? new Set(completed) : null;
  lessonCounts = lesson ? { drum: 0, gong: 0, roll: 0 } : null;
  lastMissed = null;
  lastLessonFeedback = { key: 'timingReady' };
  app.encore = encore ? createEncore() : null;
  encoreFeedback = encore ? { phase: 'charge', notice: null, readyAt: null, bonusStart: 0 } : null;
  app.chart = lesson ? buildLesson(step) : buildChart(song, difficulty);
  app.time = 0;
  app.run = null;
  app.result = null;
  app.screen = 'loading';
  resetHud();
  view.reset(app.chart, speedOf());
  stageRoot.visible = true;
  screens.stack.closeAll();
  screens.stack.open(screens.SCREENS.play);
  arrange();
  try {
    const [voice] = await game.loading([lesson ? sound.clicks(app.chart.beats + 2, 60 / song.bpm, LEAD.seconds) : sound.start(song)], { label: t('loading') });
    if (!voice) throw new Error('The backing voice did not start.');
  } catch (cause) {
    console.warn('Opera Drums score could not start', cause);
    notice = 'audioError';
    return showTitle('start');
  }
  app.run = createRun(app.chart);
  app.strokes = [];
  app.screen = 'play';
  if (app.mode !== 'song') paintCoach(0);
  say(`${songName(song.id)} · ${levelName(difficulty)}`);
  if (document.hidden) openMenu();
  else focusSoon('pad-f');
}

function openMenu(again = false) {
  if (app.screen !== 'play') return;
  if (!again) {
    sound.pause();
    game.pause();
  }
  releasePads();
  app.screen = 'menu';
  screens.stack.open(screens.SCREENS.pause);
}

function closeMenu() {
  if (app.screen !== 'menu') return;
  screens.stack.close(screens.SCREENS.pause);
  app.screen = 'play';
  sound.resume();
  game.resume();
  focusSoon('pad-f');
}

function finish() {
  const result = resultOf(app.run);
  let best = false;
  const isLesson = app.mode === 'lesson';
  const kept = isLesson || save.update((data) => {
    best = recordRun(data, app.song.id, app.difficulty, result, { count: app.mode === 'song' });
  });
  if (!kept) notice = 'saveRefused';
  app.result = { ...result, best, kept, mode: app.mode, skills: [...(app.lessonSkills ?? [])] };
  app.screen = 'end';
  sound.stop();
  sound.cue?.(isLesson || result.cleared ? 'clear' : 'retry');
  playPage = null;
  showMenus();
  screens.stack.closeAll();
  screens.stack.open(screens.SCREENS.end);
  say(isLesson ? t('practiceLearned', { n: app.result.skills.length }) : `${t(result.rank)}, ${t('score', { n: result.score })}`);
  focusSoon(app.result.mode === 'lesson' ? 'play-song' : app.result.cleared && app.result.mode === 'song' && app.song.id === 'qiba' && app.difficulty === 'easy' ? 'encore-next' : 'again');
}

// ---- The delay: strokes with the clapper's clicks show how late a player's strokes come after the sound. ----
const CAL = { beats: 16, gap: 0.6, lead: 1, needed: 8 };
const cal = { taps: new Map(), voice: null, done: false };
function openCalibration() {
  screens.stack.close(screens.SCREENS.options);
  Object.assign(app.cal, { running: false, message: '', beat: false });
  openModal('calibration', 'calIdle', undefined, () => {
    cal.done = true;
    app.cal.running = false;
    sound.stop();
    openOptions('title');
    focusSoon('calibrate');
  });
  focusSoon('cal-start');
}
function calBuilt(made) {
  const node = made.get('tap');
  node.on(game.browser.pointer.events.begin, (event) => {
    calTap(event.payload.timestamp, 'drum');
  });
}
function calKey(activation) {
  if (['mouse', 'touch', 'pen'].includes(activation.source)) return;
  calTap(performance.now(), 'drum');
}
async function startCalibration() {
  if (!settings().sound) {
    setSetting('sound', true);
    sound.setOn(true);
    relabel();
    return;
  }
  if (app.screen !== 'calIdle') return;
  cal.taps.clear();
  cal.done = false;
  cal.voice = null;
  app.screen = 'cal';
  app.cal.running = true;
  app.cal.message = t('calCount', { n: 0, total: CAL.beats });
  focusSoon('tap');
  try {
    cal.voice = await sound.clicks(CAL.beats, CAL.gap, CAL.lead);
  } catch {
    if (app.screen !== 'cal') return;
    sound.stop();
    app.screen = 'calIdle';
    app.cal.running = false;
    app.cal.message = t('audioError');
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
  app.cal.message = t('calCount', { n: cal.taps.size, total: CAL.beats });
}
function calFrame() {
  if (cal.done || !cal.voice) return;
  if (cal.voice.state === 'ended') return endCalibration();
  const elapsed = sound.heardAt() - CAL.lead;
  app.cal.beat = elapsed >= 0 && elapsed % CAL.gap < 0.1;
}
function endCalibration() {
  cal.done = true;
  sound.stop();
  let message = t('calFew');
  if (cal.taps.size >= CAL.needed) {
    const sorted = [...cal.taps.values()].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const ms = Math.round(median * 1000);
    setSetting('offset', Math.max(-300, Math.min(300, ms)));
    message = t('calDone', { n: ms });
  }
  app.screen = 'calIdle';
  app.cal.running = false;
  app.cal.beat = false;
  app.cal.message = message;
  say(message);
  focusSoon('cal-start');
}

// ---- What the screens' buttons do. ----
const act = {
  openGuide,
  openEncore: openEncoreGuide,
  openOptions,
  chooseAct(id) {
    app.chosenAct = songOf(id);
    sound.cue?.('select');
  },
  chooseLevel(level) {
    app.chosenLevel = level;
    sound.cue?.('select');
  },
  startChosen: () => startSong(app.chosenAct.id, app.chosenLevel),
  startLesson: () => startSong(LESSON_SONG.id, 'easy'),
  startEncore: () => startSong(ENCORE_SONG.id, 'normal'),
  retryStep: (id) => startSong(LESSON_SONG.id, 'easy', { step: id, completed: app.result?.skills ?? [] }),
  sample: (name) => sound.strike(name),
  toggle(key) {
    const value = !settings()[key];
    setSetting(key, value);
    if (key === 'sound') sound.setOn(value);
    if (key === 'reducedMotion') syncMotion();
  },
  step(key, way) {
    const s = settings();
    if (key === 'music') {
      const value = Math.round(Math.max(0, Math.min(1, s.music + way * 0.1)) * 10) / 10;
      setSetting('music', value);
      sound.setMusic(value);
    } else if (key === 'speed') setSetting('speed', SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, SPEEDS.indexOf(s.speed) + way))]);
    else setSetting('offset', Math.max(-300, Math.min(300, s.offset + way * 10)));
  },
  speedAt: (way) => (way < 0 ? settings().speed === SPEEDS[0] : settings().speed === SPEEDS.at(-1)),
  switchLanguage() {
    const next = getLanguage() === 'zh' ? 'en' : 'zh';
    setSetting('language', next);
    setLanguage(next);
  },
  openCalibration,
  calStart: () => startCalibration(),
  calKey,
  calBuilt,
  pause: () => openMenu(),
  resume: () => closeMenu(),
  restart() {
    sound.resume();
    startSong(app.song.id, app.difficulty, { step: app.lessonStep, completed: app.lessonCompletedBefore });
  },
  again: () => startSong(app.song.id, app.difficulty),
  quit(focusName) {
    sound.resume();
    showTitle(focusName);
  },
  padActivated
};

screens = createScreens(game, {
  words: { t, language: getLanguage, songName, levelName },
  app,
  act,
  semantics
});
screens.SCREENS.play = {
  id: 'play',
  layer: 'page',
  back: 'none',
  open() {
    playPage = openPlayPage(game, { t, app, act, onBuilt: padBuilt });
    return playPage;
  }
};

/** A change of language writes every screen again: the open ones are made anew in the new words. */
function relabel() {
  const page = screens.stack.snapshot().pages.at(-1),
    dialog = openDialog;
  if (dialog) dialog.relabeled = true;
  screens.stack.closeAll().then(() => {
    if (page) screens.stack.open(screens.SCREENS[page]);
    if (dialog) {
      app.screen = dialog.before;
      openModal(dialog.name, dialog.screenName, dialog.params, dialog.onClose);
    }
    focusSoon(dialog?.name === 'options' ? 'language' : dialog?.name === 'calibration' ? 'cal-start' : page === 'title' ? 'act-' + app.chosenAct.id : 'again');
  });
}

// A change of language writes every word again, on whichever screen is shown.
onLanguage(() => {
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  document.title = t('pageTitle');
  game.canvas.setAttribute('aria-label', t('stage'));
  if (app.mode === 'lesson' && app.run) setLessonFeedback(lastLessonFeedback);
  else if (app.run) paintReadout();
  if (app.song) app.hud.songLine = app.mode === 'song' ? `${songName(app.song.id)} · ${levelName(app.difficulty)}` : songName(app.song.id);
  relabel();
});
document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
document.title = t('pageTitle');
// The canvas holds the page's keyboard focus; the projection names the part the views have focused.
game.canvas.tabIndex = 0;
game.canvas.focus({ preventScroll: true });
showTitle();
ready = true;

// For tests and for anyone curious, from the console.
window.operaDrums = {
  app,
  game,
  sound,
  semantics,
  screens: screens.stack,
  start: startSong,
  playPage: () => playPage,
  /** The name of the part with the keyboard focus, as the semantic tree has it. */
  focused: () => semantics.publish().nodes.find((node) => node.focused)?.name ?? '',
  get screen() {
    return app.screen;
  },
  get ready() {
    return true;
  }
};
