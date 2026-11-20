// 茶马古道：入口。搭起 3D 世界（地形流、天空大气、草木、水、驿站和吊桥）、车队和路上的危险，再在上面铺一层
// 引擎的 2D 界面；游戏在几个状态之间走：标题、开场、驾驶、驿站、扎营、结尾短片、结算。
//
// Tea Horse Road: the entry. It raises the 3D world (the terrain stream, the sky and its atmosphere, plants, water,
// the stations and the rope bridge), the convoy and the dangers of the road, then lays the engine's 2D interface over
// it. The game moves between a few states: the title, the opening, driving, a station, making camp, the closing film,
// and the account of the journey.
import { parseBitmapFont } from '@egret/engine/bitmapfont';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createWorld3DApp, createWorld3DOverlay } from '@egret/engine/webgl2/world3d';
import { browserSaveStorage } from '@egret/engine/web/kit';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { Scene3D, createFollowCamera3D, createPerspectiveCamera3D, createPhysicsWorld3D } from '@egret/engine/world3d';
import { paintGaugeFont } from './art/hudfont.mjs';
import { createSoundscape } from './audio/soundscape.mjs';
import { createCamp, CAMP_PIECES } from './play/camp.mjs';
import { createConvoy } from './play/convoy.mjs';
import { createEffects } from './play/effects.mjs';
import { createDriveInput } from './play/input.mjs';
import { EVENT_LINES, ROAD_LINES, STATION_LINES, ending } from './play/story.mjs';
import { createThreats } from './play/threats.mjs';
import { better, freshJourney, openSave } from './saves.mjs';
import { openCard } from './ui/card.mjs';
import { STAGE } from './ui/kit.mjs';
import { createHud } from './ui/hud.mjs';
import { createMarkers } from './ui/markers.mjs';
import { filmScreen, openingScreen, titleScreen } from './ui/screens.mjs';
import { TRUCK } from './models/truck.mjs';
import { createFlora } from './world/flora.mjs';
import { createLand, LAYER } from './world/land.mjs';
import { createLandmarks } from './world/landmarks.mjs';
import { prepareRoadPrograms } from './world/programs.mjs';
import { STATIONS, biomeAt, directionAt, pointAt } from './world/route.mjs';
import { createSky } from './world/sky.mjs';
import { createWaters } from './world/water.mjs';

const params = new URLSearchParams(location.search),
  frame = document.querySelector('#frame'),
  canvas = document.querySelector('#world'),
  loading = document.querySelector('#loading');
const save = openSave(browserSaveStorage());
const settings = save.data.settings;
const touchScreen = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

// ---- the 3D world -------------------------------------------------------------------------------------------------
const askedQuality = params.get('quality') ?? (settings.quality !== 'auto' ? settings.quality : undefined);
const app = await createWorld3DApp(canvas, { toneMapping: 'aces', exposure: 0.82, ...(askedQuality ? { quality: askedQuality } : {}), onError: (cause) => console.error(cause) });
const scene = new Scene3D();
const camera = createPerspectiveCamera3D({ fov: 58, near: 0.3, far: 9000 });
scene.addChild(camera);
const physics = createPhysicsWorld3D({ gravity: [0, -9.81, 0], fixedStep: 1 / 60, maxSubSteps: 4, solverSteps: 2, iterations: 4 });
const sky = createSky(scene, app.renderer, { quality: app.quality });
const flora = createFlora(scene, physics, { quality: app.quality });
const land = await createLand(scene, physics, { quality: app.quality, onTile: flora.onTile });
const landmarks = createLandmarks(scene, physics, { quality: app.quality });
const waters = createWaters(scene, { quality: app.quality });

// Where a journey begins: the first station, a station of the save, or (for testing) a distance given in the address.
let journey = save.data.journey;
const startS = (station) => STATIONS[station].s + (station === 0 ? 0 : 14);
let beginS = params.has('s') ? Number(params.get('s')) : startS(journey?.station ?? 0);
const p0 = pointAt(beginS);
loading.querySelector('[data-load-stage]').textContent = '正在铺设山路 · Preparing the mountain road';
land.update(p0[0], p0[2]);
while (!land.readyAround(p0[0], p0[2], 100)) {
  await new Promise((resolve) => setTimeout(resolve, 50));
  land.update(p0[0], p0[2]);
}
const convoy = createConvoy(scene, physics, land.heightAt, { s: beginS });
const effects = createEffects(scene, physics, convoy, { land, water: waters, quality: app.quality });
// Let the title and opening build while the first road shaders link. A quick start waits for the same work.
const roadProgramsReady = app.backend === 'webgl2' && !params.has('film')
  ? new Promise((resolve) => setTimeout(resolve, 0))
    .then(() => prepareRoadPrograms(app.renderer, scene, camera, waters, { reflections: app.quality === 'high' }))
    .catch((cause) => console.warn('Road shader preparation', cause))
  : null;
const events = [];
const threats = createThreats(scene, physics, { convoy, land, flora, effects, events: (name, detail) => events.push([name, detail]) });
const input = createDriveInput({ onError: (cause) => console.warn('input', cause) });
const follow = createFollowCamera3D(camera, convoy.lead.model.root, { distance: 13, height: 2.2, pitch: 0.28, world: physics, mask: LAYER.ground, minDistance: 5, maxDistance: 24 });
const VIEWS = [
  { distance: 13, pitch: 0.28 },
  { distance: 8, pitch: 0.2 },
  { distance: 21, pitch: 0.4 }
];
let view = 0;

// The camps laid out on earlier journeys stand at their stations.
const camps = landmarks.stations.map((station, i) => createCamp(scene, camera, canvas, { station: station.yard, heightAt: land.heightAt, saved: save.data.camps[station.id] }));

// Sound: water at the ford, under the bridge and at the lake shore.
const waterPlaces = waters.bodies.map((body) => [body.x, body.y + 0.5, body.z]);
const sound = createSoundscape(scene, camera, { waters: waterPlaces, volume: settings.volume / 100, music: settings.music });
sound.attach(convoy);

// ---- the 2D interface over it -------------------------------------------------------------------------------------
// A short screen (a phone on its side) gets a shorter stage, so the words and the controls come out larger on it.
const stageHeight = () => (frame.clientHeight < 520 ? 600 : 720);
const uiWidth = () => Math.max(Math.round(stageHeight() * 1.333), Math.min(1720, Math.round((stageHeight() * frame.clientWidth) / Math.max(1, frame.clientHeight))));
const painted = paintGaugeFont(),
  gaugeFont = parseBitmapFont(painted.font);
const ui = { game: null, width: 0, semantics: createUiSemantics(), sound, overlay: null, projection: null, pages: null };
let hud = null,
  screen = null,
  card = null,
  markers = null;

async function buildOverlay() {
  STAGE.height = ui.height = stageHeight();
  ui.width = uiWidth();
  ui.overlay = await createWorld3DOverlay(canvas, { width: ui.width, height: STAGE.height, update: (seconds) => uiFrame(Math.min(seconds, 1 / 20)), onError: (cause) => console.error('ui', cause) });
  ui.game = ui.overlay.game;
  ui.pages = [await ui.game.textureFromCanvas(painted.canvas)];
  ui.projection = ui.game.scope.use(
    createBrowserSemantics({ semantics: ui.semantics, canvas: ui.overlay.canvas, width: ui.width, height: STAGE.height, label: '茶马古道 · Tea Horse Road', onError: (cause) => console.warn('semantics', cause) })
  );
}
await buildOverlay();
loading.querySelector('[data-load-stage]').textContent = '车队即将出发 · Ready to depart';
markers = createMarkers(document.querySelector('#markers'), camera, {
  stations: landmarks.stations.map((station, index) => ({ x: station.x, y: station.y, z: station.z, s: STATIONS[index].s, zh: station.name })),
  followers: convoy.trucks.slice(1).map((truck, i) => ({ node: truck.model.root, zh: ['卓玛', '老马锅头'][i] }))
});
markers.visible = false;

// ---- the state of play ----------------------------------------------------------------------------------------------
let state = 'title',
  paused = false,
  pauseCard = null,
  pauseVersion = 0,
  odometer = 0,
  nextStation = 1,
  said = new Set(),
  lineTurn = {},
  orbitAngle = 0,
  campStation = -1,
  endingRecord = null;

/** The journey in the save, made fresh or carried on. */
function cargoOf() {
  return convoy.trucks.map((truck) => truck.cargo);
}
function setCargo(list) {
  convoy.trucks.forEach((truck, i) => truck.setCargo(list?.[i] ?? TRUCK.cargoSlots));
}

/** Put the convoy at a station (or at `s`) ready to go, and the world in the state for that point of the road. */
function placeConvoy(s) {
  convoy.trucks.forEach((truck, i) => convoy.reset(truck, Math.max(2, s - i * 16)));
  const p = pointAt(s);
  land.update(p[0], p[2]);
  threats.reset(s);
  nextStation = STATIONS.findIndex((station) => station.s > s + 20);
  if (nextStation < 0) nextStation = STATIONS.length - 1;
  said = new Set(ROAD_LINES.filter((line) => line.s < s).map((line) => line.s));
}

// Building a screen takes a few awaits (labels are made asynchronously). The interface is rebuilt for a new screen
// shape only between such builds, never in the middle of one.
let building = 0;
async function busy(work) {
  building++;
  try {
    return await work();
  } finally {
    building--;
  }
}

async function setHud(on) {
  if (!on) {
    hud?.dispose?.();
    if (hud) hud.root.visible = false;
    return;
  }
  if (!hud) await buildHud();
  hud.root.visible = true;
}

let hudScope = null;
const buildHud = () => busy(buildHudNow);
async function buildHudNow() {
  hud?.dispose();
  hudScope = ui.game.engine.createScope();
  const { createScreenKit } = await import('./ui/kit.mjs');
  const kit = createScreenKit(ui.game, hudScope, { semantics: ui.semantics, sound, prefix: 'hud' });
  const touch = settings.touch === 'on' || (settings.touch === 'auto' && touchScreen) || params.has('touch');
  hud = await createHud(ui.game, hudScope, kit, {
    width: ui.width,
    font: gaugeFont,
    fontPages: ui.pages,
    stations: STATIONS.map((station) => ({ s: station.s })),
    length: STATIONS[3].s,
    touch,
    controls: input.touch,
    semantics: ui.semantics,
    onPause: () => pause(true),
    onHorn: () => honk(),
    onCamera: () => nextView(),
    onRecover: () => recover()
  });
  hud.kit = kit;
  hud.setDriving(state === 'drive' && !paused);
  hud.dispose = () => {
    kit.dispose();
    hudScope.dispose();
    hudScope = null;
    hud = null;
  };
  await updatePlace();
}

async function updatePlace() {
  if (!hud) return;
  const leg = biomeAt(convoy.lead.s, [0, 0, 0]),
    names = ['滇南茶山', '金沙峡谷', '梅里雪山'],
    i = leg[2] > 0.5 ? 2 : leg[1] > 0.5 ? 1 : 0,
    next = landmarks.stations[nextStation];
  await hud.setPlace(names[i], next?.name, Math.max(0, (next?.s ?? 0) - convoy.lead.s));
}

/** Say a line in the subtitles. */
function say(line, seconds) {
  hud?.say(line, seconds);
}
function sayEvent(kind) {
  const list = EVENT_LINES[kind];
  if (!list) return;
  const turn = (lineTurn[kind] = ((lineTurn[kind] ?? -1) + 1) % list.length);
  say(list[turn], 4);
}

function honk() {
  if (state !== 'drive' || paused) return;
  sound.play('horn', convoy.lead.chassis.position, { volume: 0.9 });
  input.rumble(0.3, 150);
  threats.horn();
}
function nextView() {
  view = (view + 1) % VIEWS.length;
  follow.distance = VIEWS[view].distance;
  follow.pitch = VIEWS[view].pitch;
}
function recover() {
  if (state !== 'drive') return;
  convoy.recover();
  hud?.setUpset(false);
}

// ---- screens --------------------------------------------------------------------------------------------------------
async function closeScreen() {
  const old = screen;
  screen = null;
  old?.dispose();
  card?.close();
  card = null;
}

const showTitle = (...args) => busy(() => showTitleNow(...args));
async function showTitleNow() {
  await closeScreen();
  state = 'title';
  paused = false;
  markers.visible = false;
  await setHud(false);
  sound.setMood(0);
  const j = save.data.journey;
  screen = await titleScreen(ui, {
    journey: j ? { station: j.station, stationName: landmarks.stations[j.station].name, cargoLeft: j.cargo.reduce((a, b) => a + b, 0) } : null,
    best: save.data.best,
    onNew: () => startJourney(true),
    onContinue: () => startJourney(false),
    onSettings: () => openSettings()
  });
  screen.focusFirst();
}

const startJourney = (fresh) => busy(() => startJourneyNow(fresh));
async function startJourneyNow(fresh) {
  if (state !== 'title') return;
  state = 'opening';
  void sound.start();
  if (fresh || !save.data.journey) {
    journey = freshJourney(convoy.trucks.map(() => TRUCK.cargoSlots));
    save.update((data) => {
      data.journey = journey;
    });
  } else journey = save.data.journey;
  setCargo(journey.cargo);
  odometer = journey.station ? STATIONS[journey.station].s : 0;
  placeConvoy(startS(journey.station));
  if (fresh && !params.has('quiet')) {
    await closeScreen();
    screen = await openingScreen(ui, { onDone: () => beginDriving() });
    screen.focusFirst();
  } else beginDriving();
}

const beginDriving = (...args) => busy(() => beginDrivingNow(...args));
async function beginDrivingNow() {
  if (roadProgramsReady) await roadProgramsReady;
  await closeScreen();
  state = 'drive';
  paused = false;
  markers.visible = true;
  await setHud(true);
  hud.setDriving(true);
  hud.focusFirst();
  sound.setMood(0);
  if (journey.station > 0) say({ who: 'master', ...STATION_LINES[journey.station] }, 4);
  else if (!params.has('s')) say(touchScreen
    ? { zh: '右手按住油门，左手拖动方向。停稳后按住刹车可倒车。', en: 'Hold the throttle and slide to steer. Hold brake at rest to reverse.' }
    : { zh: 'W 加速，A / D 转向，S 刹车。停稳后按住 S 可倒车。', en: 'W to accelerate, A / D to steer, S to brake or reverse.' }, 6);
}

function pause(on) {
  if (state !== 'drive' || paused === on) return;
  paused = on;
  const version = ++pauseVersion;
  hud?.setDriving(!on);
  sound.hush(on);
  if (!on) {
    card?.close();
    pauseCard?.close();
    card = null;
    pauseCard = null;
    hud?.focusFirst();
    return;
  }
  // The engine's managed dialog requires an idle pointer router at mount.
  // Wait for the pause button's own release dispatch, then retire other held fingers.
  Promise.resolve().then(() => {
    if (!paused || pauseVersion !== version) return;
    ui.game.pointer.cancelAll('suspended');
    return openCard(ui.game, {
      width: ui.width,
      semantics: ui.semantics,
      sound,
      name: '暂停',
      rows: [
        { kind: 'title', zh: '歇一歇', en: 'Paused' },
        { kind: 'button', text: '继续', sub: 'Resume', primary: true, onActivate: () => pause(false) },
        { kind: 'button', text: '设置', sub: 'Settings', onActivate: () => openSettings() },
        { kind: 'button', text: '回到上一驿站', sub: 'Back to the last station', onActivate: () => restartFromStation() },
        { kind: 'button', text: '回到标题', sub: 'To the title', onActivate: () => { pause(false); void showTitle(); } }
      ]
    });
  }).then((made) => {
    if (!made) return;
    if (state === 'drive' && paused && pauseVersion === version) card = pauseCard = made;
    else made.close();
  });
}

function restartFromStation() {
  pause(false);
  journey = save.data.journey ?? journey;
  setCargo(journey.cargo);
  placeConvoy(startS(journey.station));
}

const openSettings = (...args) => busy(() => openSettingsNow(...args));
async function openSettingsNow() {
  const previous = card;
  const initialTouch = settings.touch;
  const made = await openCard(ui.game, {
    width: ui.width,
    semantics: ui.semantics,
    sound,
    name: '设置',
    cardWidth: 560,
    rows: [
      { kind: 'title', zh: '设置', en: 'Settings' },
      {
        kind: 'choice',
        text: '画质 · Picture',
        options: [
          ['low', '流畅 Low'],
          ['medium', '均衡 Medium'],
          ['high', '精细 High']
        ],
        selected: app.quality,
        onChange: (quality) => {
          save.update((data) => {
            data.settings.quality = quality;
          });
          settings.quality = quality;
        }
      },
      { kind: 'note', zh: '画质在下次打开时生效 · Applies the next time the page opens' },
      {
        kind: 'slider',
        text: '音量 · Volume',
        min: 0,
        max: 100,
        step: 5,
        value: settings.volume,
        onChange: (value) => {
          settings.volume = value;
          sound.volume = value / 100;
          save.update((data) => {
            data.settings.volume = value;
          });
        }
      },
      {
        kind: 'toggle',
        text: '音乐 · Music',
        checked: settings.music,
        onChange: (on) => {
          settings.music = on;
          sound.music = on;
          save.update((data) => {
            data.settings.music = on;
          });
        }
      },
      {
        kind: 'choice',
        text: '触屏按键 · Touch controls',
        options: [
          ['auto', '自动 Auto'],
          ['on', '显示 On'],
          ['off', '隐藏 Off']
        ],
        selected: settings.touch,
        onChange: (value) => {
          settings.touch = value;
          save.update((data) => {
            data.settings.touch = value;
          });
        }
      },
      { kind: 'button', text: '好', sub: 'Done', primary: true, onActivate: () => made.close() }
    ],
    onClose: () => {
      if (card === made) card = previous;
      previous?.focusFirst?.();
      if (!rebuilding && hud && initialTouch !== settings.touch) {
        void buildHud().then(() => {
          // Reattach the open pause dialog above the newly added controls.
          if (state === 'drive' && paused) {
            pause(false);
            pause(true);
          }
        });
      }
    }
  });
  card = made;
}

// ---- stations and the camp ----------------------------------------------------------------------------------------
async function arrive(index) {
  state = 'station';
  hud?.setDriving(false);
  ui.game.pointer.cancelAll('suspended');
  const station = landmarks.stations[index];
  sound.play('arrive', null, { volume: 0.9 });
  sound.setMood(0);
  for (const truck of convoy.trucks) {
    truck.vehicle.throttle = 0;
    truck.vehicle.brake = 1;
  }
  journey = {
    ...journey,
    station: index,
    cargo: cargoOf(),
    seconds: journey.seconds
  };
  save.update((data) => {
    data.journey = journey;
  });
  nextStation = Math.min(STATIONS.length - 1, index + 1);
  await updatePlace();
  if (index === STATIONS.length - 1) return finish();
  stationCard(index);
}

const stationCard = (...args) => busy(() => stationCardNow(...args));
async function stationCardNow(index) {
  const station = landmarks.stations[index],
    line = STATION_LINES[index],
    cargo = convoy.cargo;
  card?.close();
  ui.game.pointer.cancelAll('suspended');
  card = await openCard(ui.game, {
    width: ui.width,
    semantics: ui.semantics,
    sound,
    name: station.name,
    cardWidth: 560,
    veil: 0.35,
    rows: [
      { kind: 'title', zh: station.name, en: station.english },
      { kind: 'text', zh: line.zh },
      { kind: 'note', zh: line.en },
      { kind: 'note', zh: `车上还有 ${cargo} 捆茶 · 已存档  ·  ${cargo} bundles aboard · saved` },
      { kind: 'button', text: '扎营布置', sub: 'Make camp', onActivate: () => makeCamp(index) },
      { kind: 'button', text: '继续上路', sub: 'On to the next station', primary: true, onActivate: () => leaveStation() }
    ]
  });
}

function leaveStation() {
  card?.close();
  card = null;
  state = 'drive';
  hud?.setDriving(true);
  hud?.focusFirst();
}

const makeCamp = (...args) => busy(() => makeCampNow(...args));
async function makeCampNow(index) {
  card?.close();
  card = null;
  state = 'camp';
  campStation = index;
  markers.visible = false;
  hud.root.visible = false;
  const camp = camps[index];
  camp.edit();
  let selectedKey = CAMP_PIECES[0].key;
  card = await openCard(ui.game, {
    width: ui.width,
    semantics: ui.semantics,
    sound,
    name: '扎营',
    cardWidth: 470,
    veil: 0,
    top: 20,
    left: 20,
    rows: [
      { kind: 'title', zh: '扎营', en: 'Drag the handles to move or turn a piece' },
      { kind: 'choice', text: '物件 · Piece', options: CAMP_PIECES.map((p) => [p.key, p.zh]), selected: selectedKey, onChange: (key) => (selectedKey = key) },
      {
        kind: 'buttons',
        items: [
          { text: '放下', name: '放下一件', primary: true, onActivate: () => camp.add(selectedKey) },
          { text: '下一件', name: '选下一件', onActivate: () => camp.selectNext() },
          { text: '拿走', name: '拿走选中的', onActivate: () => camp.removeSelected() }
        ]
      },
      {
        kind: 'choice',
        text: '手柄 · Handles',
        options: [
          ['translate', '移动 Move'],
          ['rotate', '旋转 Turn']
        ],
        selected: 'translate',
        onChange: (mode) => (camp.mode = mode)
      },
      { kind: 'button', text: '保存营地', sub: 'Save the camp', primary: true, onActivate: () => saveCamp(index) }
    ]
  });
}

function saveCamp(index) {
  const camp = camps[index],
    station = landmarks.stations[index];
  const doc = camp.serialize();
  const result = save.update((data) => {
    data.camps[station.id] = doc;
  });
  camp.finish();
  card?.close();
  card = null;
  markers.visible = true;
  hud.root.visible = true;
  state = 'station';
  if (result && result.ok === false) say({ who: 'road', zh: '营地没能存下（浏览器拒绝了写入）。', en: 'The camp could not be saved (the browser refused).' }, 5);
  else say({ who: 'drolma', zh: '营地搭好了，下回路过还在。', en: 'Camp is up; it will be here next time.' }, 4);
  stationCard(index);
}

// ---- the end --------------------------------------------------------------------------------------------------------
const finish = () => busy(finishNow);
async function finishNow() {
  state = 'film';
  markers.visible = false;
  await setHud(false);
  sound.setMood(-1);
  const delivered = convoy.cargo,
    record = { delivered, seconds: Math.round(journey.seconds), stolen: journey.stolen, recovered: journey.recovered, knocked: journey.knocked };
  endingRecord = record;
  save.update((data) => {
    data.best = better(data.best, record);
    data.journey = null;
  });
  const media = (file) => new URL('../media/' + file, import.meta.url).href;
  await closeScreen();
  // Without the film on the server, the account of the journey follows at once.
  const present = await fetch(media('ending.mp4'), { method: 'HEAD' }).then((reply) => reply.ok, () => false);
  if (!present) return results(record);
  screen = await filmScreen(ui, {
    film: [
      { src: media('ending.webm'), type: 'video/webm; codecs="vp9"' },
      { src: media('ending.mp4'), type: 'video/mp4; codecs="avc1.42E01E"' }
    ],
    onDone: () => results(record)
  });
  screen.focusFirst();
}

const results = (...args) => busy(() => resultsNow(...args));
async function resultsNow(record) {
  await closeScreen();
  state = 'end';
  sound.setMood(0);
  const story = ending(record.delivered / convoy.capacity);
  card = await openCard(ui.game, {
    width: ui.width,
    semantics: ui.semantics,
    sound,
    name: story.title.zh,
    cardWidth: 620,
    veil: 0.45,
    rows: [
      { kind: 'title', zh: story.title.zh, en: story.title.en },
      ...story.lines.flatMap((line) => [
        { kind: 'text', zh: line.zh },
        { kind: 'note', zh: line.en }
      ]),
      { kind: 'note', zh: `送到 ${record.delivered}/${convoy.capacity} 捆 · 被抢 ${record.stolen} · 夺回 ${record.recovered} · 撞倒山匪 ${record.knocked} · 用时 ${Math.floor(record.seconds / 60)} 分 ${record.seconds % 60} 秒` },
      { kind: 'button', text: '回到标题', sub: 'To the title', primary: true, onActivate: () => showTitle() }
    ]
  });
}

// ---- each frame -----------------------------------------------------------------------------------------------------
const biome = [0, 0, 0];
// For pictures of the game: the camera is left where a script puts it.
let freeCamera = false;
let placeTimer = 0,
  dangerWas = false;

function tick(dt) {
  if (filming) return;
  const step = Math.min(dt, 1 / 20);
  const state0 = input.poll(step);
  if (input.pressed('pause')) {
    if (state === 'drive') {
      if (paused && card && card !== pauseCard) card.close();
      else pause(!paused);
    }
    else if (card && (state === 'title' || state === 'end')) card.close();
  }
  if (state === 'drive' && !paused) {
    if (input.pressed('horn')) honk();
    if (input.pressed('camera')) nextView();
    if (input.pressed('recover')) recover();
    const speed = convoy.lead.vehicle.speed;
    let throttle = state0.throttle,
      brake = state0.brake;
    // Brake held at a standstill reverses.
    if (brake > 0 && speed < 1 && throttle === 0) {
      throttle = -brake * 0.6;
      brake = 0;
    }
    convoy.drive({ steer: state0.steer, throttle, brake, handbrake: state0.handbrake }, step);
    odometer += Math.abs(speed) * step;
    journey.seconds += step;
  } else if (!paused) convoy.drive({ steer: 0, throttle: 0, brake: 1, handbrake: true }, step, { followers: state !== 'drive' ? false : true });
  if (!paused) {
    physics.step(step);
    if (state === 'drive' || state === 'station') threats.update(step);
  }
  if (state === 'camp') camps[campStation]?.update();
  // The pad's A (or Enter with nothing focused) takes the main way on: the card's main button, or the screen's.
  if (input.pressed('confirm')) {
    if (card && state !== 'camp') card.confirm();
    else screen?.confirm?.();
  }

  // What happened on the road this frame.
  for (const [name, detail] of events.splice(0)) {
    if (name === 'ambush') {
      sayEvent(detail.zone.kind === 'wolf' ? 'ambushWolf' : 'ambushBandit');
      sound.play(detail.zone.kind === 'wolf' ? 'howl' : 'shout', [detail.zone.x, detail.zone.y + 2, detail.zone.z], { volume: 1 });
    } else if (name === 'grab') {
      journey.stolen++;
      sayEvent('grab');
      sound.play('lost', null, { volume: 0.7 });
    } else if (name === 'recovered') {
      journey.recovered++;
      journey.stolen = Math.max(0, journey.stolen - 1);
      sayEvent('recovered');
    } else if (name === 'knocked') {
      journey.knocked++;
      sayEvent('knocked');
      sound.play('thud', detail.position, { volume: 1 });
      input.rumble(0.8, 200);
    } else if (name === 'yelp') sound.play('yelp', detail.position);
    else if (name === 'bite') sayEvent('bite');
    else if (name === 'scared') sayEvent('scared');
  }

  const lead = convoy.lead,
    pos = lead.chassis.position;
  if (state === 'drive') {
    // Lines along the road, and the stations.
    for (const line of ROAD_LINES)
      if (!said.has(line.s) && lead.s > line.s) {
        said.add(line.s);
        say(line, 6);
      }
    const station = STATIONS[nextStation];
    if (station && lead.s > station.s - 6 && Math.hypot(pos[0] - station.x, pos[2] - station.z) < station.radius) void arrive(nextStation);
    hud?.setUpset(convoy.leadUpset);
    if (convoy.leadUpset && !said.has('upset')) {
      said.add('upset');
      sayEvent('upset');
    }
    const danger = threats.danger;
    if (danger !== dangerWas) {
      dangerWas = danger;
      sound.setMood(danger ? 1 : 0);
    }
  }

  land.update(pos[0], pos[2]);
  // The camera: round the first station on the title; behind the lead truck otherwise.
  if (state === 'title' || state === 'opening') {
    // A slow drift up the road ahead of the convoy, on the side away from the station's hall, looking back at it.
    orbitAngle += step * 0.04;
    const title = state === 'title',
      s = lead.s + 25 + Math.sin(orbitAngle) * 5,
      p = pointAt(s),
      [dx, dz] = directionAt(s),
      x = p[0] + dz * 10,
      z = p[2] - dx * 10;
    camera.setPosition(x, land.heightAt(x, z) + 4.3 + Math.sin(orbitAngle * 0.7) * 0.7, z);
    camera.lookAt(pos[0] - dz * (title ? 9 : 2), pos[1] + 2.6, pos[2] + dx * (title ? 9 : 2));
  } else if (state !== 'camp' && !freeCamera) {
    let dy = convoy.heading() - follow.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    follow.yaw += dy * Math.min(1, step * 3);
    follow.update(step);
  }
  flora.update(camera.position[0], camera.position[2]);
  biomeAt(lead.s, biome);
  // The last stretch to the plateau is driven into the evening.
  sky.dusk = Math.max(0, Math.min(1, (lead.s - (STATIONS[3].s - 700)) / 700)) * 0.75;
  sky.update(camera, pos, biome);
  landmarks.update(step, pos);
  effects.update(step, camera, biome);
  waters.update(step);
  sound.update(step, { snow: biome[2] });
  if (state === 'drive' || state === 'station') markers.update(nextStation, lead.s);
  placeTimer -= step;
  if (placeTimer <= 0) {
    placeTimer = 1;
    void updatePlace();
  }
  hud?.update(step, { s: lead.s, kmh: Math.abs(lead.vehicle.speed) * 3.6, cargo: convoy.cargo, capacity: convoy.capacity, odometerKm: odometer / 1000 });
  input.endFrame();
}

// The interface's own frame: screens that move, and the page's copy of the semantic tree a few times a second.
let sinceSync = 0,
  lastFocus = '';
function uiFrame(seconds) {
  screen?.update?.(seconds);
  const focus = ui.game?.keyboard?.getSnapshot(),
    key = `${focus?.focusedId}|${focus?.focusVisible}`;
  if (key !== lastFocus) {
    lastFocus = key;
    screen?.kit?.repaint();
    card?.repaint();
    hud?.kit?.repaint();
  }
  sinceSync += seconds;
  if (sinceSync > 0.15) {
    sinceSync = 0;
    ui.semantics.publish();
    ui.projection?.sync();
  }
}

app.show(scene, camera, {
  onUpdate: (dt) => {
    tick(dt);
    if (app.quality === 'high') waters.beforeRender(app.renderer, scene, camera);
  }
});

// The interface is laid out for the shape of the screen; when that changes much (a phone turned), it is laid out again.
let relayout = null;
let rebuilding = false;
async function rebuildOverlay() {
  if (rebuilding) return;
  rebuilding = true;
  while (building > 0) await new Promise((resolve) => setTimeout(resolve, 50));
  const hudShown = state === 'drive' || state === 'station';
  const openingIndex = state === 'opening' ? screen?.index : undefined;
  await closeScreen();
  hud?.dispose();
  await ui.overlay.dispose();
  await buildOverlay();
  if (state === 'drive' || state === 'station' || state === 'camp') {
    await buildHud();
    hud.root.visible = hudShown;
  }
  if (state === 'title') await showTitle();
  else if (state === 'opening') screen = await openingScreen(ui, { onDone: () => beginDriving(), startAt: openingIndex });
  else if (state === 'station') await stationCard(journey.station);
  else if (state === 'camp') {
    camps[campStation].finish();
    await stationCard(campStation);
    state = 'station';
  } else if (state === 'film' || state === 'end') await results(endingRecord);
  if (paused) {
    pauseCard = null;
    paused = false;
    pause(true);
  }
  rebuilding = false;
  // The screen may have changed shape again while this was being built.
  if (Math.abs(uiWidth() - ui.width) > ui.width * 0.1 || stageHeight() !== STAGE.height) void rebuildOverlay();
}
window.addEventListener('resize', () => {
  clearTimeout(relayout);
  relayout = setTimeout(() => {
    if (Math.abs(uiWidth() - ui.width) > ui.width * 0.1 || stageHeight() !== STAGE.height) void rebuildOverlay();
  }, 300);
});

const rotateButton = document.querySelector('#rotate-button'),
  orientation = window.screen.orientation;
if (document.documentElement.requestFullscreen && typeof orientation?.lock === 'function') {
  rotateButton.hidden = false;
  rotateButton.addEventListener('click', async () => {
    const entered = !document.fullscreenElement;
    try {
      if (entered) await document.documentElement.requestFullscreen();
      await orientation.lock('landscape');
    } catch {
      if (entered && document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      document.querySelector('#rotate-help').textContent = '请关闭系统方向锁定，再转动手机。';
    }
  });
}

// A touch grants audio activation on release. Keep listening until the context is running.
function wake() {
  void sound.start().then(() => {
    if (!sound.started) return;
    window.removeEventListener('pointerup', wake, true);
    window.removeEventListener('keydown', wake, true);
  });
}
window.addEventListener('pointerup', wake, true);
window.addEventListener('keydown', wake, true);

// ---- the closing film, recorded from the game itself (tools/make-ending.mjs) --------------------------------------
let filming = false;
const FILM_SECONDS = 21;
function filmFrame(t, dt) {
  const plateau = STATIONS[3],
    lead = convoy.lead;
  // The convoy drives itself down to the station's yard and stops there.
  const toGo = plateau.s + 6 - lead.s;
  for (const truck of convoy.trucks) truck.drag = 0;
  const steer = convoy.steerAlong(lead).steer,
    want = Math.max(0, Math.min(9, toGo * 0.35)),
    speed = lead.vehicle.speed;
  convoy.drive({ steer, throttle: Math.max(0, Math.min(1, (want - speed) * 0.5)), brake: speed > want + 1 ? 0.7 : toGo < 2 ? 1 : 0, handbrake: false }, dt);
  physics.step(dt);
  const pos = lead.chassis.position;
  land.update(pos[0], pos[2]);
  // Three shots: a crane down behind the convoy, a low pass beside the road, and a rise over the yard to the peaks.
  const ease = (x) => x * x * (3 - 2 * x),
    [dx, dz] = directionAt(lead.s);
  if (t < 7) {
    const k = ease(t / 7),
      back = 26 - k * 12,
      up = 22 - k * 15;
    camera.setPosition(pos[0] - dx * back + dz * 5, pos[1] + up, pos[2] - dz * back - dx * 5);
    camera.lookAt(pos[0] + dx * 10, pos[1] + 1.5, pos[2] + dz * 10);
  } else if (t < 13) {
    // Low beside the road, ahead of the lead truck, which passes the camera; on whichever side the ground is lower.
    const k = (t - 7) / 6,
      along = 12 - k * 20,
      sideOf = (side) => land.heightAt(pos[0] - dz * side + dx * along, pos[2] + dx * side + dz * along),
      side = sideOf(11) < sideOf(-11) ? 11 : -11,
      x = pos[0] - dz * side + dx * along,
      z = pos[2] + dx * side + dz * along;
    camera.setPosition(x, Math.max(land.heightAt(x, z) + 1.6, pos[1] + 0.8), z);
    camera.lookAt(pos[0] + dx * 2, pos[1] + 1.4, pos[2] + dz * 2);
  } else {
    // Over the yard: the trucks at rest by the hall, the camera rising and drawing back toward the peaks.
    const k = ease((t - 13) / (FILM_SECONDS - 13)),
      yard = landmarks.stations[3].yard,
      fx = Math.sin(yard.yaw),
      fz = Math.cos(yard.yaw),
      r = 16 + k * 22;
    camera.setPosition(yard.x + fx * r + fz * 6, yard.y + 3 + k * 14, yard.z + fz * r - fx * 6);
    camera.lookAt(yard.x - fx * k * 20, yard.y + 2 + k * 8, yard.z - fz * k * 20);
  }
  flora.update(camera.position[0], camera.position[2]);
  biomeAt(lead.s, biome);
  sky.dusk = 0.9;
  sky.update(camera, pos, biome);
  landmarks.update(dt, pos);
  effects.update(dt, camera, biome);
  waters.update(dt);
  const words = document.querySelector('#film-words');
  if (words) {
    const show = (from, to) => Math.max(0, Math.min(1, (t - from) / 1, (to - t) / 1));
    words.querySelector('.place').style.opacity = show(1.5, 6.5);
    words.querySelector('.title').style.opacity = show(15, FILM_SECONDS + 2);
  }
}

if (roadProgramsReady && params.has('s')) await roadProgramsReady;
loading.classList.add('gone');
if (params.has('film')) {
  filming = true;
  await setHud(false);
  setCargo(convoy.trucks.map(() => TRUCK.cargoSlots));
  // The ground under the convoy has to be in place before the trucks are set down on it.
  const from = pointAt(STATIONS[3].s - 230);
  land.update(from[0], from[2]);
  while (!land.readyAround(from[0], from[2], 260)) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    land.update(from[0], from[2]);
  }
  placeConvoy(STATIONS[3].s - 230);
  const words = document.createElement('div');
  words.id = 'film-words';
  words.innerHTML = '<p class="place">高原驿站<span>PLATEAU STATION</span></p><p class="title">茶马古道<span>TEA HORSE ROAD</span></p>';
  frame.append(words);
  ui.overlay.canvas.style.display = 'none';
  window.teaHorseRoadFilm = { seconds: FILM_SECONDS, frame: filmFrame, settle: (seconds) => { for (let t = 0; t < seconds; t += 1 / 30) filmFrame(0, 1 / 30); } };
} else if (params.has('s')) {
  journey = freshJourney(convoy.trucks.map(() => TRUCK.cargoSlots));
  journey.station = Math.max(0, STATIONS.findLastIndex((station) => station.s <= beginS));
  placeConvoy(beginS);
  void beginDriving();
} else await showTitle();

// For tests and the curious, from the console.
window.teaHorseRoad = {
  app,
  convoy,
  threats,
  effects,
  physics,
  land,
  camera,
  follow,
  camps,
  landmarks,
  save,
  sound,
  ui,
  get state() {
    return state;
  },
  get card() {
    return card;
  },
  get screen() {
    return screen;
  },
  /** Run the game without drawing, `seconds` long, with these controls held (`auto` steers along the road). */
  sim(seconds, held = {}, auto = false) {
    for (let t = 0; t < seconds; t += 1 / 30) {
      Object.assign(input.touch, held);
      if (auto) input.touch.steer = convoy.steerAlong(convoy.lead).steer;
      tick(1 / 30);
    }
    Object.assign(input.touch, { steer: 0, throttle: 0, brake: 0 });
  },
  place: (s) => placeConvoy(s),
  set freeCamera(on) {
    freeCamera = on;
  },
  hud: () => hud,
  arrive,
  results
};
