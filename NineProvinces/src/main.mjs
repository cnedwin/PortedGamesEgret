// 页面入口：设置与语言、引擎（透明的画布叠在网页画布上；软件渲染时降到四分之三分辨率）、天下图与战场两种画面、
// 声音、界面；时间按所选的快慢一天天推进（暂停、每秒半天到八天），每月一号自动存档；收件箱里的演义、交战、使者和
// 俘虏一件件拿出来让玩家定夺。拖动平移、滚轮或双指缩放、空格暂停、1–5 调速度、方向键移动、+/- 缩放、Esc 关闭。
// The page's entry: settings and language, the engine (a clear canvas over the page canvas; three-quarter resolution
// under software rendering), the two views (the realm and the battlefield), sound and the interface; time moves on day
// by day at the chosen speed (paused, or half a day to eight days a second), with an autosave on the first of each
// month; the tale, battles, envoys and captives come out of the inbox one at a time for the player to decide. Drag to
// pan, the wheel or two fingers to zoom, Space to pause, 1–5 for speed, arrows to move, +/- to zoom, Esc to close.
import { createBrowserGame } from '@egret/engine/web/game';
import { browserSaveStorage } from '@egret/engine/web/kit';
import { FACTIONS, LATER } from './data/factions.mjs';
import { GENERALS } from './data/generals.mjs';
import { NODES } from './data/map.mjs';
import { createSound } from './audio/sound.mjs';
import { getLanguage, setLanguage, t } from './i18n.mjs';
import { exportText, importText, openSettings, openSlot, SLOTS, writeSlot } from './saves.mjs';
import { autoBattle } from './sim/battle.mjs';
import { dateOf, surname } from './sim/core.mjs';
import { answerEnvoy, breakTreaty, demandSurrender, gift, propose, askAttack } from './sim/diplomacy.mjs';
import { disband, finishBattle, muster, nearestFriendly, order, route } from './sim/military.mjs';
import { registerCustom } from './sim/newblood.mjs';
import { die, giveTreasure, issueTalentOrder, moveGeneral, persuade, release, searchCity } from './sim/people.mjs';
import { answerStory } from './sim/story.mjs';
import { advance, createGame, power, recruit, startWork, study, transfer } from './sim/world.mjs';
import { startBattle } from './ui/battleui.mjs';
import { createDialogs } from './ui/dialogs.mjs';
import { $, h } from './ui/dom.mjs';
import { createHud, SPEEDS, tipFor } from './ui/hud.mjs';
import { eventOf, logLine } from './ui/text.mjs';
import { showSetup, showTitle } from './ui/title.mjs';
import { dotTexture } from './view/battleview.mjs';
import { bannerAtlas, createMapView } from './view/mapview.mjs';
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
    if (key === 'reducedMotion') frame.classList.toggle('calm', value);
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
    app.map.setVisible(false);
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

// ——— Booting the engine and the views ———
async function boot() {
  const tall = innerHeight > innerWidth * 1.05;
  app.stageSize = tall ? { width: 900, height: 1600 } : { width: 1600, height: 900 };
  const canvas = h('canvas#stage', { tabIndex: -1 });
  $('#stageHost').replaceChildren(canvas);
  app.game = await createBrowserGame({
    canvas,
    width: app.stageSize.width,
    height: app.stageSize.height,
    backend: params.get('backend') ?? 'auto',
    pixelRatio: app.software ? 0.75 : Math.min(2, devicePixelRatio || 1),
    fit: 'cover',
    fitTo: $('#stageHost'),
    clearColor: 0x000000,
    clearAlpha: 0,
    hover: true,
    autoStart: false,
    update: (seconds) => tick(Math.min(seconds, 0.1))
  });
  // One sheet of characters for every banner on the map and the field: the powers' flags and every surname.
  const chars = new Set(['汉', '晋', '魏', '蜀', '吴', '吕', '叛', '兵']);
  for (const f of [...Object.values(FACTIONS), ...Object.values(LATER)]) chars.add(f.flag);
  for (const id of Object.keys(GENERALS)) chars.add(surname(id));
  for (const c of '王李张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董程曹袁邓许傅沈彭吕苏卢蒋蔡贾丁魏薛阎潘杜夏钟田任姜范方石姚廖邹金陆郝孔崔毛秦史顾侯孟段雷尹文庞臧鲍满桓羊蒯阚虞骆甘凌全步') chars.add(c);
  for (const c of ['诸葛', '司马', '夏侯', '公孙']) chars.add(c);
  app.atlas = await bannerAtlas(app.game, [...chars]);
  app.dot = await dotTexture(app.game);
  app.sound = await createSound(app.game.scope, { sound: app.settings.sound, music: app.settings.music });
  app.demoState = createGame({ seed: 184, faction: 'caocao', branch: 'free' });
  app.canvas = canvas;
  app.map = await createMapView({
    game: app.game,
    canvas,
    back: app.back,
    width: app.stageSize.width,
    height: app.stageSize.height,
    atlas: app.atlas,
    getState: () => app.state ?? app.demoState,
    on: {
      tapNode,
      tapArmy(id) {
        if (app.screen !== 'play') return;
        const a = app.state.armies[id];
        if (app.mode?.kind === 'march' && a && a.faction !== app.state.player) return tapNode(a.link ? a.link.to : a.at);
        app.sound.play('tap');
        app.select({ army: id });
      },
      hover(info) {
        app.hoverInfo = info;
        hoverChanged();
      }
    }
  });
  app.hud = createHud(app);
  app.dialogs = createDialogs(app);
  bindInput(canvas);
  app.game.loop.start();
}

// ——— Taps on the map ———
function tapNode(id) {
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

// ——— Input: dragging, the wheel, two fingers, keys ———
function bindInput(canvas) {
  const pointers = new Map();
  let pinch = null;
  const view = () => (app.battle ? app.battle : app.map);
  const unitsPerPx = () => app.stageSize.width / canvas.getBoundingClientRect().width;
  canvas.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: false });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    mouse = { x: e.clientX, y: e.clientY };
    const p = pointers.get(e.pointerId);
    if (!p) {
      if (app.hoverInfo) app.hud.showTip(tipFor(app, app.hoverInfo), mouse.x, mouse.y);
      return;
    }
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    if (pointers.size === 2 && pinch) {
      p.x = e.clientX;
      p.y = e.clientY;
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      view()?.zoomBy(d / pinch);
      pinch = d;
      return;
    }
    if (!p.moved && Math.hypot(dx, dy) < 6) return;
    p.moved = true;
    p.x = e.clientX;
    p.y = e.clientY;
    const k = unitsPerPx();
    view()?.panBy(-dx * k, -dy * k);
  });
  const up = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => app.hud.showTip(null));
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      view()?.zoomBy(e.deltaY > 0 ? 1 / 1.15 : 1.15);
    },
    { passive: false }
  );
  window.addEventListener(
    'keydown',
    (e) => {
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
        view()?.panBy(pan[0] * 120, pan[1] * 120);
        e.preventDefault();
        return;
      }
      if (e.key === '+' || e.key === '=') return view()?.zoomBy(1.2);
      if (e.key === '-' || e.key === '_') return view()?.zoomBy(1 / 1.2);
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
  if (app.map) app.map.update(dt, app.paused || app.dialogOpen ? 0 : acc);
  sinceHud += dt;
  if (sinceHud > 0.2 && app.screen === 'play') {
    sinceHud = 0;
    app.hud.refresh();
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
      const result = autoBattle(setup, s);
      app.dialogs.close(true);
      app.sound.play(result.winner === setup.factions.indexOf(P) ? 'win' : 'lose');
      finishBattle(s, setup, result);
      app.map.refreshLands(true);
      app.dialogs.open('battleResult', { setup, result });
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
  const state = createGame({ seed: Number(params.get('seed') ?? Date.now() % 1000000), faction: pick.faction, branch: pick.branch, lifespan: pick.lifespan, command: pick.command, difficulty: pick.difficulty });
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
  app.map.focus(state.factions[state.player].capital, app.stageSize.width < app.stageSize.height ? 1.25 : 0.85);
  app.paused = false;
  app.hud.refresh(true);
  app.sound.theme('realm');
  setTimeout(nextInbox, 300);
}
function toTitle() {
  app.dialogs.close(true);
  if (app.battle) app.battle = null;
  app.state = null;
  app.screen = 'title';
  frame.dataset.screen = 'title';
  $('#hud').hidden = true;
  app.select(null);
  app.map.setVisible(true);
  app.map.refreshLands(true);
  app.map.overview(Math.max(0.42, app.stageSize.height / 2600));
  showTitle(app);
  app.sound.theme('realm');
  // The title is a still picture: once the map has settled the engine stops drawing, and starts again with the game.
  clearTimeout(app.resting);
  app.resting = setTimeout(() => {
    if (app.screen !== 'title') return;
    app.game.loop.stop();
  }, 1200);
}
/** Make sure the engine draws (after the still title). */
function wake() {
  clearTimeout(app.resting);
  if (app.game && app.game.loop.state !== 'running') app.game.loop.start();
}

await boot();
document.title = t('title') + (getLanguage() === 'zh' ? ' · Nine Provinces Ablaze' : ' · 九州烽烟');
$('#loading')?.remove();
frame.classList.toggle('calm', Boolean(app.settings.reducedMotion));
if (params.get('slot') && slots[params.get('slot')]?.data.game) loadSlot(params.get('slot'));
else if (params.get('faction')) newGame({ faction: params.get('faction'), branch: params.get('branch') ?? 'free', lifespan: 'history', command: params.get('command') !== 'off', difficulty: 'normal' });
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
  get battle() {
    return app.battle;
  }
};
