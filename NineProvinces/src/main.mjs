// 页面入口：设置与语言、3D 天下（地形、城池、军团和名牌；战斗就在这张图上打）、声音、界面；时间按所选的快慢一天天
// 推进（暂停、每秒半天到八天），每月一号自动存档；收件箱里的演义、交战、使者和俘虏一件件拿出来让玩家定夺。拖动平移、
// 滚轮或双指缩放、空格暂停、1–5 调速度、方向键移动、+/- 缩放、Esc 关闭。
// The page's entry: settings and language, the 3D realm (land, cities, armies and name plates; battles are fought on
// this same map), sound and the interface; time moves on day by day at the chosen speed (paused, or half a day to eight
// days a second), with an autosave on the first of each month; the tale, battles, envoys and captives come out of the
// inbox one at a time for the player to decide. Drag to pan, the wheel or two fingers to zoom, Space to pause, 1–5 for
// speed, arrows to move, +/- to zoom, Esc to close.
import { browserSaveStorage } from '@egret/engine/web/kit';
import { NODES } from './data/map.mjs';
import { createSound } from './audio/sound.mjs';
import { getLanguage, setLanguage, t } from './i18n.mjs';
import { exportText, importText, openOfficerRoster, openSettings, openSlot, SLOTS, writeSlot } from './saves.mjs';
import { recordedAutoBattle } from './sim/battle-history.mjs';
import { dateOf } from './sim/core.mjs';
import { answerEnvoy, breakTreaty, demandSurrender, gift, propose, askAttack } from './sim/diplomacy.mjs';
import { disband, finishBattle, muster, nearestFriendly, order, route } from './sim/military.mjs';
import { registerCustom } from './sim/newblood.mjs';
import { die, giveTreasure, issueTalentOrder, moveGeneral, persuade, release, searchCity } from './sim/people.mjs';
import { answerStory } from './sim/story.mjs';
import { advance, createGame, power, recruit, startWork, study, transfer } from './sim/world.mjs';
import { createDialogs } from './ui/dialogs.mjs';
import { $, h } from './ui/dom.mjs';
import { createHud, SPEEDS, tipFor } from './ui/hud.mjs';
import { eventOf, logLine } from './ui/text.mjs';
import { startBattle } from './ui/battleui.mjs';
import { createMinimap } from './ui/minimap.mjs';
import { createPlates } from './ui/plates.mjs';
import { showSetup, showTitle } from './ui/title.mjs';
import { createRealmView } from './view3d/realm.mjs';
import { factionName, generalName, placeName } from './view/names.mjs';
import { TREASURES } from './data/treasures.mjs';
import { nm } from './i18n.mjs';

const params = new URLSearchParams(location.search);
const frame = $('#frame');

// ——— Settings and language ———
const problems = [];
const storage = browserSaveStorage();
const settingsStore = openSettings(storage, navigator.language?.startsWith('zh') ? 'zh' : 'en', (p) => problems.push(p.kind));
const slots = Object.fromEntries(SLOTS.map((slot) => [slot, openSlot(storage, slot, (p) => problems.push(p.kind))]));
const officerRoster = openOfficerRoster(storage, (problem) => problems.push(problem.kind));
setLanguage(params.get('lang') ?? settingsStore.data.settings.language);
document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';

/** Whether the page draws WebGL in software (SwiftShader, llvmpipe and the like). */
function softwareRenderer() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(gl.getParameter(info?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|softpipe|lavapipe|software rasterizer|microsoft basic render/i.test(name);
  } catch {
    return false;
  }
}

const app = {
  game: null,
  back: $('#back'),
  stageSize: { width: 1600, height: 900 },
  settings: settingsStore.data.settings,
  sound: { play() {}, theme() {}, setSound() {}, setMusic() {} },
  state: null,
  demoState: null,
  map: null,
  hud: null,
  dialogs: null,
  battle: null,
  lab: null,
  atlas: null,
  dot: null,
  sel: null,
  mode: null,
  paused: true,
  speed: Math.max(0, Math.min(4, settingsStore.data.settings.speed ?? 2)),
  dialogOpen: false,
  notice: problems.some((k) => k !== 'write-failed') ? t('saveReset') : null,
  screen: 'loading',
  software: softwareRenderer(),
  rulerSet: new Set(),
  tales: [],
  language: () => getLanguage(),
  officerRoster: () => officerRoster.read(),
  saveOfficerRoster: list => officerRoster.write(list),
  openSandbox: () => openBattleLab(),
  openBattleReplay: tape => openBattleLab(tape),
  /** Whether to keep motion down: the setting, or the system's own preference. */
  calm: () => Boolean(app.settings.reducedMotion) || matchMedia('(prefers-reduced-motion: reduce)').matches,
  rulers() {
    return app.rulerSet;
  },
  open: (name, args) => app.dialogs.open(name, args),
  select(sel) {
    app.sel = sel && (sel.node || sel.army) ? sel : null;
    if (!sel?.army || app.mode?.army !== sel.army) app.mode = null;
    app.map?.select(app.sel ?? {});
    app.hud?.refresh();
  },
  setMode(mode) {
    app.mode = mode;
    if (!mode) app.map?.showRoute(null);
    app.hud.refresh(true);
    if (mode?.kind === 'march') app.hud.toast(t('pickTarget'));
  },
  setPaused(v) {
    app.paused = v;
    app.hud?.refresh();
  },
  setSpeed(i) {
    app.speed = i;
    app.paused = false;
    app.setSetting('speed', i);
    app.hud?.refresh();
  },
  setSetting(key, value) {
    const kept = settingsStore.update((data) => {
      data.settings[key] = value;
    });
    app.settings = settingsStore.data.settings;
    if (kept === false) app.hud?.toast(t('saveRefused'), 'bad');
    if (key === 'sound') app.sound.setSound(value);
    if (key === 'music') app.sound.setMusic(value);
    if (key === 'musicVolume') app.sound.setVolumes?.({ music: value });
    if (key === 'effectsVolume') app.sound.setVolumes?.({ effects: value });
    if (key === 'reducedMotion') {
      frame.classList.toggle('calm', value);
      app.map?.setReducedMotion?.(app.calm());
    }
  },
  setLanguage(language) {
    setLanguage(language);
    app.setSetting('language', language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = t('title') + (language === 'zh' ? ' · Nine Provinces Ablaze' : ' · 九州烽烟');
    app.map?.redraw();
    if (app.screen === 'title') showTitle(app);
    if (app.dialogs?.name) app.dialogs.render();
    app.hud?.refresh(true);
  },
  slotSummary(slot) {
    return slots[slot].data.summary;
  },
  act: (kind, ...args) => act(kind, ...args),
  newGame,
  loadSlot,
  wake: () => wake(),
  toTitle,
  keepWatching() {
    app.watching = true;
    app.dialogs.close(true);
  },
  exportFile() {
    const blob = new Blob([exportText(app.state)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `nine-provinces-${dateOf(app.state.day).year}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  async importFile(file) {
    const game = importText(await file.text());
    if (!game) return app.hud.toast(t('importBad'), 'bad');
    app.dialogs.close(true);
    play(game);
  },
  startBattle(setup) {
    app.dialogs.close(true);
    app.screen = 'battle';
    frame.dataset.screen = 'battle';
    app.battle = startBattle(app, setup);
  },
  endBattle(done) {
    app.battle = null;
    app.screen = 'play';
    frame.dataset.screen = 'play';
    app.map.setVisible(true);
    app.map.refreshLands(true);
    app.sound.theme('realm');
    app.dialogs.open('battleResult', done);
    app.hud.refresh(true);
  },
  afterDialog() {
    app.hud?.refresh(true);
    setTimeout(nextInbox, 0);
  }
};

let labLoading = false;
async function openBattleLab(tape = null) {
  if (app.lab || labLoading) return;
  labLoading = true;
  const screen = app.screen;
  const state = app.state;
  const returnFocus = document.activeElement;
  const background = ['#stageHost', '#title', '#hud', '#modal'].map(selector => $(selector));
  function close() {
    const active = app.lab;
    if (!active) return;
    app.lab = null;
    active.controller.destroy();
    for (const node of background) node.inert = false;
    app.map.setVisible(true);
    app.sound.theme(screen === 'title' ? 'title' : 'realm');
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }
  try {
    const { openBattleSandbox, openBattleReplay } = await import('./ui/battle-lab.mjs');
    if (screen !== app.screen || state !== app.state || (tape && app.dialogs.name !== 'battleResult')) return;
    const options = { onExit: close };
    const controller = tape ? openBattleReplay(app, tape, { ...options, tab: 'replay' }) : openBattleSandbox(app, options);
    app.lab = { controller, close };
    for (const node of background) node.inert = true;
    app.map.setVisible(false);
    app.sound.theme('battle');
  } catch (error) {
    console.error(error);
    if (app.screen === 'title') {
      app.notice = t('battleLabFailed');
      showTitle(app);
    } else app.hud.toast(t('battleLabFailed'), 'bad');
  } finally {
    labLoading = false;
  }
}

// ——— Booting the engine and the views ———
async function boot() {
  const tall = innerHeight > innerWidth * 1.05;
  app.stageSize = tall ? { width: 900, height: 1600 } : { width: 1600, height: 900 };
  const canvas = h('canvas#stage', { tabIndex: -1 });
  const plates = h('div#plates');
  $('#stageHost').replaceChildren(canvas, plates);
  app.demoState = createGame({ seed: 184, faction: 'caocao', branch: 'free' });
  app.canvas = canvas;
  app.tapNode = tapNode;
  app.tapArmy = tapArmy;
  app.map = await createRealmView({
    canvas,
    plates,
    getState: () => app.state ?? app.demoState,
    plateFor: createPlates(app),
    quality: params.get('quality') ?? (app.settings.quality && app.settings.quality !== 'auto' ? app.settings.quality : undefined),
    tick: (seconds) => tick(seconds),
    onError: (cause) => console.error(cause),
    on: {
      tapNode,
      tapArmy,
      tapGround: (hit) => app.battle?.tapGround?.(hit),
      hover(info) {
        app.hoverInfo = info;
        hoverChanged();
      },
      move(e) {
        mouse = { x: e.clientX, y: e.clientY };
        if (app.hoverInfo) app.hud.showTip(tipFor(app, app.hoverInfo), mouse.x, mouse.y);
      }
    }
  });
  app.quality = app.map.app.quality;
  app.map.setReducedMotion?.(app.calm());
  app.sound = await createSound(app.map.app.scope, app.settings);
  app.hud = createHud(app);
  app.dialogs = createDialogs(app);
  app.minimap = createMinimap(app, $('#hud'));
  // Who holds what changes the minimap's colours; the plates and flags follow the state each frame.
  const refreshLands = app.map.refreshLands;
  app.map.refreshLands = () => {
    refreshLands();
    app.minimap.refresh();
  };
  bindKeys();
  app.map.start();
  // Hidden, the world stops drawing and time stands still; shown again, both go on.
  // The engine's clock is paused too, so the first frame back does not count the time away (ENGINE-NOTES 7).
  document.addEventListener('visibilitychange', () => {
    const { engine } = app.map.app;
    if (document.hidden) {
      app.map.app.stop();
      engine.clock.pause();
    } else {
      engine.clock.resume();
      app.map.app.start();
    }
  });
}

function tapArmy(id) {
  if (app.battle) return app.battle.tapArmy?.(id);
  if (app.screen !== 'play') return;
  const a = app.state.armies[id];
  if (app.mode?.kind === 'march' && a && a.faction !== app.state.player) return tapNode(a.link ? a.link.to : a.at);
  app.sound.play('tap');
  app.select({ army: id });
}

// ——— Taps on the map ———
function tapNode(id) {
  if (app.battle) return app.battle.tapNode?.(id);
  // On the setup screen a tap on a place picks the power that holds it.
  if (app.screen === 'setup') {
    const owner = app.demoState.nodes[id].owner;
    if (owner) app.pickFaction?.(owner);
    return;
  }
  if (app.screen !== 'play') return;
  if (app.mode?.kind === 'march') {
    const armyId = app.mode.army;
    const r = order(app.state, armyId, id);
    if (r.ok) {
      app.sound.play('march');
      app.hud.toast(r.days ? t('marchOrdered', { place: placeName(id), days: r.days }) : t('marchLater', { place: placeName(id) }));
      app.mode = null;
      app.map.showRoute(null);
      app.select({ army: armyId });
    } else app.hud.toast(t('why_' + r.why), 'bad');
    return;
  }
  app.sound.play('tap');
  app.select({ node: id });
}

let mouse = { x: 0, y: 0 };
function hoverChanged() {
  const info = app.hoverInfo;
  if (app.screen === 'battle') return app.hud.showTip(null);
  if (app.screen !== 'play') return app.hud.showTip(null);
  app.hud.showTip(tipFor(app, info), mouse.x, mouse.y);
  if (app.mode?.kind === 'march' && info?.node) {
    const a = app.state.armies[app.mode.army];
    const r = a && route(app.state, a, a.link ? a.link.to : a.at, info.node);
    app.map.showRoute(r ? [a.link ? a.link.to : a.at, ...r.path] : null);
  }
}

// ——— Keys (dragging, the wheel and two fingers belong to the realm view) ———
function bindKeys() {
  window.addEventListener(
    'keydown',
    (e) => {
      if (app.lab) return;
      if (e.target instanceof HTMLInputElement && e.target.type !== 'range') return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (app.battle && !app.dialogOpen) {
        if (app.battle.key(e.code)) return e.preventDefault();
      }
      if (e.code === 'Escape') {
        if (app.dialogOpen) app.dialogs.close();
        else if (app.mode) app.setMode(null);
        else if (app.sel) app.select(null);
        return;
      }
      if (app.screen !== 'play' && app.screen !== 'battle') return;
      if (app.dialogOpen) return;
      const pan = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] }[e.code];
      if (pan) {
        app.map.panBy(pan[0] * 140, pan[1] * 140);
        e.preventDefault();
        return;
      }
      if (e.key === '+' || e.key === '=') return app.map.zoomBy(1.25);
      if (e.key === '-' || e.key === '_') return app.map.zoomBy(1 / 1.25);
      if (app.screen !== 'play') return;
      if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        app.setPaused(!app.paused);
      } else if (/^Digit[1-5]$/.test(e.code)) app.setSpeed(+e.code.slice(5) - 1);
    },
    true
  );
}

// ——— Time ———
let acc = 0,
  sinceHud = 0;
function tick(dt) {
  app.frames = (app.frames ?? 0) + 1;
  if (app.lab) return;
  if (app.battle) {
    app.battle.update(dt);
    return;
  }
  if (app.screen === 'play' && app.state && !app.paused && !app.dialogOpen && (!app.state.over || app.watching)) {
    acc += dt * SPEEDS[app.speed];
    let steps = 0;
    while (acc >= 1 && steps < 12) {
      acc -= 1;
      steps++;
      if (!day()) {
        acc = 0;
        break;
      }
    }
  } else acc = Math.min(acc, 0.99);
  if (app.map) app.map.setDayShare(app.paused || app.dialogOpen ? 0 : acc);
  sinceHud += dt;
  if (sinceHud > 0.2 && (app.screen === 'play' || app.screen === 'battle')) {
    sinceHud = 0;
    if (app.screen === 'play') app.hud.refresh();
    app.minimap?.draw();
  }
}

/** One day of the realm; false when something must be decided first. */
function day() {
  const s = app.state;
  const logBefore = s.log[0];
  const month = dateOf(s.day).month;
  // After the ending the realm may be watched on: the day moves on although the game is over.
  let went;
  if (s.over && app.watching) {
    const over = s.over;
    s.over = null;
    went = advance(s);
    s.over = over;
  } else went = advance(s);
  if (!went) {
    nextInbox();
    return false;
  }
  if (dateOf(s.day).month !== month) {
    autosave();
    app.rulerSet = new Set(Object.values(s.factions).map((f) => f.ruler));
  }
  newsSince(logBefore);
  if (s.over && !app.endingShown) {
    app.endingShown = true;
    app.setPaused(true);
    app.sound.play(s.over.kind === 'fallen' ? 'gong' : 'win');
    app.dialogs.open('ending');
    return false;
  }
  if (s.inbox.length || app.tales.length) {
    nextInbox();
    return !app.dialogOpen;
  }
  return true;
}

/** Notices for the lines of the log that concern the player. */
function newsSince(before) {
  const s = app.state;
  const fresh = [];
  for (const l of s.log) {
    if (l === before) break;
    fresh.push(l);
  }
  for (const l of fresh.reverse()) {
    const v = l.values ?? {};
    const mine = v.faction === s.player || v.from === s.player || v.to === s.player || v.enemy !== undefined || (v.general && s.generals[v.general]?.faction === s.player) || ['logTech', 'logWorkDone', 'logHunger', 'logUnrest', 'logAnswered', 'logDebutJoin'].includes(l.key);
    if (l.key === 'logStory') {
      // The player's own tale unrolls as a scroll; the rest of the age passes as a notice.
      const e = eventOf(v.event);
      if (e && e.branch === s.branch && !e.choices?.length) app.tales.push(v.event);
      else {
        app.sound.play('event');
        app.hud.toast(logLine(s, l), 'tale');
      }
      continue;
    }
    if (!mine) continue;
    if (l.key === 'logTaken') app.sound.play(v.faction === s.player ? 'seal' : 'gong');
    else if (l.key === 'logWorkDone') app.sound.play('build');
    else if (l.key === 'logTech') app.sound.play('coin');
    else if (l.key === 'logFall' && v.faction !== s.player) app.sound.play('gong');
    app.hud.toast(logLine(s, l), v.from === s.player || l.key === 'logHunger' || l.key === 'logUnrest' || l.key === 'logRevolt' ? 'bad' : '');
  }
  if (fresh.some((l) => l.key === 'logTaken' || l.key === 'logRevolt' || l.key === 'logFall')) app.map.refreshLands();
}

/** Take the next thing from the inbox that waits for the player. */
function nextInbox() {
  const s = app.state;
  if (!s || app.dialogOpen || app.battle || app.screen !== 'play') return;
  const m = s.inbox.find((x) => x.blocks) ?? (app.tales.length ? null : s.inbox[0]);
  if (!m && app.tales.length) {
    app.sound.play('event');
    app.dialogs.open('story', { event: app.tales.shift(), told: true });
    return;
  }
  if (!m) return;
  if (m.kind === 'story') app.dialogs.open('story', { event: m.event });
  else if (m.kind === 'battle') {
    app.sound.play('horn');
    app.dialogs.open('battle', { setup: m.setup });
  } else if (m.kind === 'envoy') app.dialogs.open('envoy', { message: m });
  else if (m.kind === 'captive') {
    if (s.generals[m.general]?.status !== 'captive' || s.generals[m.general].captor !== s.player) {
      s.inbox = s.inbox.filter((x) => x !== m);
      return nextInbox();
    }
    app.dialogs.open('captive', { general: m.general });
  } else s.inbox = s.inbox.filter((x) => x !== m);
}

// ——— What the player does ———
function act(kind, ...args) {
  const s = app.state;
  const P = s?.player;
  const say = (r, okText, sound = 'tap') => {
    if (r?.why) {
      app.hud.toast(t('why_' + r.why), 'bad');
      return false;
    }
    if (okText) app.hud.toast(okText);
    if (sound) app.sound.play(sound);
    return true;
  };
  const dropInbox = (pred) => (s.inbox = s.inbox.filter((m) => !pred(m)));
  let r;
  switch (kind) {
    case 'work':
      r = startWork(s, P, args[0], args[1]);
      say(r, null, 'build');
      break;
    case 'recruit':
      r = recruit(s, P, args[0], args[1]);
      say(r, r.ok ? t('recruited', { n: r.got }) : null, 'drum');
      break;
    case 'muster': {
      r = muster(s, P, args[0], args[1]);
      if (say(r, null, 'march')) {
        app.dialogs.close(true);
        app.select({ army: r.army });
        if (!args[1].target) app.setMode({ kind: 'march', army: r.army });
        else {
          const a = s.armies[r.army];
          app.hud.toast(a?.path.length ? t('marchOrdered', { place: placeName(args[1].target), days: route(s, a, a.at, args[1].target)?.days ?? '?' }) : t('why_noWay'), a?.path.length ? '' : 'bad');
        }
      }
      break;
    }
    case 'search': {
      r = searchCity(s, P, args[0], args[1]);
      if (say(r, null, 'open')) {
        app.dialogs.close(true);
        const found = r.found.map((x) => (x.general ? generalName(x.general) : nm(TREASURES[x.treasure])));
        app.hud.toast(found.length ? t('found', { what: found.join(getLanguage() === 'en' ? ', ' : '、') }) : t('foundNothing'), found.length ? 'good' : '');
        if (found.length) app.sound.play('coin');
      }
      break;
    }
    case 'persuade': {
      const [by, target, captive] = args;
      r = persuade(s, P, by, target);
      if (r.why) say(r);
      else {
        app.sound.play(r.joined ? 'win' : 'close');
        app.hud.toast(r.joined ? t('joined', { name: generalName(target) }) : t('notJoined', { name: generalName(target) }), r.joined ? 'good' : '');
        if (r.joined || captive) dropInbox((m) => m.kind === 'captive' && m.general === target);
        app.dialogs.close(true);
      }
      break;
    }
    case 'moveGeneral':
      r = moveGeneral(s, P, args[0], args[1]);
      if (say(r, t('movedTo', { name: generalName(args[0]), place: placeName(args[1]) }))) app.dialogs.close(true);
      break;
    case 'transfer':
      r = transfer(s, P, args[0], args[1], args[2]);
      if (say(r, r.ok ? t('moved', { n: r.moved }) : null, 'drum')) app.dialogs.close(true);
      break;
    case 'give':
      r = giveTreasure(s, P, args[0], args[1]);
      say(r, null, 'coin');
      break;
    case 'release':
      release(s, args[0]);
      dropInbox((m) => m.kind === 'captive' && m.general === args[0]);
      app.hud.toast(t('released', { name: generalName(args[0]) }));
      app.dialogs.close(true);
      break;
    case 'execute':
      die(s, args[0], 'executed');
      dropInbox((m) => m.kind === 'captive' && m.general === args[0]);
      app.sound.play('gong');
      app.hud.toast(t('logExecuted', { general: generalName(args[0]) }), 'bad');
      app.dialogs.close(true);
      break;
    case 'keepCaptive':
      dropInbox((m) => m.kind === 'captive' && m.general === args[0]);
      app.dialogs.close(true);
      break;
    case 'return': {
      const a = s.armies[args[0]];
      const home = a && (s.nodes[a.home]?.owner === P ? a.home : nearestFriendly(s, P, a.link ? a.link.to : a.at));
      r = home ? order(s, args[0], home) : { why: 'noWay' };
      say(r, r.ok ? t('marchOrdered', { place: placeName(home), days: r.days ?? '?' }) : null, 'march');
      break;
    }
    case 'disband': {
      const at = s.armies[args[0]]?.at;
      r = disband(s, args[0]);
      if (say(r, null, 'drum')) app.select({ node: at });
      break;
    }
    case 'gift':
      r = gift(s, P, args[0], args[1]);
      say(r, r.ok ? t('giftDone', { n: r.by }) : null, 'coin');
      break;
    case 'propose':
      r = propose(s, P, args[0], args[1]);
      if (!r.why) {
        app.hud.toast(r.accepted ? t('accepted') : t('refused'), r.accepted ? 'good' : 'bad');
        app.sound.play(r.accepted ? 'seal' : 'close');
      } else say(r);
      break;
    case 'breakTreaty':
      r = breakTreaty(s, P, args[0]);
      say(r, t('treatyBroken'), 'gong');
      break;
    case 'demand':
      r = demandSurrender(s, P, args[0]);
      if (!r.why) {
        app.hud.toast(r.accepted ? t('submitted', { faction: factionName(s, args[0]) }) : t('refused'), r.accepted ? 'good' : 'bad');
        app.sound.play(r.accepted ? 'win' : 'close');
        if (r.accepted) app.map.refreshLands(true);
      } else say(r);
      break;
    case 'askAttack':
      r = askAttack(s, P, args[0], args[1]);
      say(r, t('askSent'));
      break;
    case 'study':
      r = study(s, P, args[0]);
      say(r, null, 'coin');
      break;
    case 'tax':
      s.factions[P].tax = args[0];
      app.sound.play('tap');
      break;
    case 'talentOrder':
      r = issueTalentOrder(s, P);
      say(r, t('talentActive'), 'seal');
      break;
    case 'told':
      app.dialogs.close(true);
      break;
    case 'story':
      answerStory(s, args[0], args[1]);
      app.sound.play('seal');
      app.dialogs.close(true);
      app.map.refreshLands(true);
      break;
    case 'envoy':
      answerEnvoy(s, args[0], args[1]);
      app.sound.play(args[1] ? 'seal' : 'close');
      app.dialogs.close(true);
      break;
    case 'entrust': {
      const setup = args[0];
      const { result, tape, report } = recordedAutoBattle(setup, s);
      app.dialogs.close(true);
      app.sound.play(result.winner === setup.factions.indexOf(P) ? 'win' : 'lose');
      finishBattle(s, setup, result);
      app.map.refreshLands(true);
      app.dialogs.open('battleResult', { setup, result, tape, report });
      break;
    }
    case 'saveSlot':
      if (writeSlot(slots[args[0]], s, power(s, P).cities)) app.hud.toast(t('saved'));
      else app.hud.toast(t('saveRefused'), 'bad');
      app.sound.play('seal');
      break;
  }
  if (app.dialogs.name && !['story', 'battle', 'battleResult', 'ending'].includes(app.dialogs.name)) app.dialogs.render();
  app.hud.refresh(true);
  return r;
}

// ——— Saves ———
function autosave() {
  if (!app.state || app.state.over) return;
  if (!writeSlot(slots.auto, app.state, power(app.state, app.state.player).cities)) {
    if (!app.saveWarned) app.hud.toast(t('saveRefused'), 'bad');
    app.saveWarned = true;
  }
}
function loadSlot(slot) {
  const game = slots[slot].data.game;
  if (!game) return;
  app.dialogs.close(true);
  play(JSON.parse(JSON.stringify(game)));
}

// ——— Screens ———
function newGame(pick) {
  const state = createGame({ ...pick, seed: Number(params.get('seed') ?? Date.now() % 1000000) });
  play(state);
  // Events of the player's tale that open the game unroll at once.
  for (const l of state.log.slice().reverse()) {
    const e = l.key === 'logStory' && eventOf(l.values.event);
    if (e && e.branch === state.branch && !e.choices?.length) app.tales.push(e.id);
  }
  autosave();
}
function play(state) {
  wake();
  app.map.setDrift(null);
  registerCustom(state);
  app.state = state;
  app.tales = [];
  app.rulerSet = new Set(Object.values(state.factions).map((f) => f.ruler));
  app.endingShown = Boolean(state.over);
  app.watching = false;
  app.screen = 'play';
  frame.dataset.screen = 'play';
  $('#title').hidden = true;
  $('#hud').hidden = false;
  app.select(null);
  app.mode = null;
  app.map.refreshLands(true);
  app.map.jumpTo(state.factions[state.player].capital, app.stageSize.width < app.stageSize.height ? 48 : 52);
  app.paused = false;
  app.hud.refresh(true);
  app.sound.theme('realm');
  setTimeout(nextInbox, 300);
}
function toTitle() {
  app.lab?.close();
  app.dialogs.close(true);
  if (app.battle) app.battle = null;
  app.state = null;
  if (app.demoState?.scenario !== '184') app.demoState = createGame({ seed: 184 });
  app.screen = 'title';
  frame.dataset.screen = 'title';
  $('#hud').hidden = true;
  app.select(null);
  app.map.setVisible(true);
  app.map.refreshLands(true);
  app.map.jumpTo('luoyang', 95);
  // The view drifts slowly over the land, unless motion is to be kept down.
  app.map.setDrift(app.calm() ? null : { speed: 2.2, from: NODES.luoyang.x - 160, to: NODES.luoyang.x + 260 });
  showTitle(app);
  app.sound.theme('title');
}
/** Kept for callers from before the realm was 3D: the 3D view always draws. */
function wake() {}

await boot();
document.title = t('title') + (getLanguage() === 'zh' ? ' · Nine Provinces Ablaze' : ' · 九州烽烟');
$('#loading')?.remove();
frame.classList.toggle('calm', Boolean(app.settings.reducedMotion));
if (params.get('slot') && slots[params.get('slot')]?.data.game) loadSlot(params.get('slot'));
else if (params.get('faction')) newGame({ faction: params.get('faction'), scenario: params.get('scenario') ?? '184',
  branch: params.get('branch') ?? 'free', lifespan: 'history', command: params.get('command') !== 'off', difficulty: 'normal' });
else {
  toTitle();
  if (params.get('screen') === 'setup') {
    app.screen = 'setup';
    showSetup(app, params.get('branch'));
  }
}

// For tests and for anyone curious, from the console.
window.egretGame = {
  app,
  get screen() {
    return app.screen;
  },
  get ready() {
    return app.screen !== 'loading';
  },
  get state() {
    return app.state;
  },
  /** Move the realm on by days at once (stops at anything to decide). */
  days(n) {
    for (let i = 0; i < n; i++) if (!day()) break;
    app.hud.refresh(true);
    return app.state.day;
  },
  nodeAt(id) {
    const n = NODES[id];
    return app.map.pagePoint(n.x, n.y);
  },
  /** Bring a place into the middle of the view at once (for tests and the console). */
  look(id, d = 70) {
    app.map.jumpTo(id, d);
  },
  get frames() {
    return app.frames ?? 0;
  },
  get battle() {
    return app.battle;
  }
};
