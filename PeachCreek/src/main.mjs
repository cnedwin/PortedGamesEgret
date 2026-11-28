// The county clock, world camera, native UI and persistence meet here.
import { play } from '@egret/engine/play';
import { createScrollControl } from '@egret/engine/ui';
import { uiRenderDensity } from './display-density.mjs';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { createInspector, part, wrapText } from './inspector.mjs';
import { createScreens } from './screens.mjs';
import { bridgeUiSemantics, createUi } from './ui.mjs';
import { browserSaveStorage } from '@egret/engine/web/kit';
import { amount, buildingAbout, buildingName, duration, getLanguage, onLanguage, setLanguage, startLanguage, t } from './i18n.mjs';
import { CORE_BOUNDS, LAYOUT, MAP, loadTerrain, paintCounty, STAGE } from './paint.mjs';
import { paintBuilding, paintFacility } from './building-art.mjs';
import { openSaveSlots, recordTerm } from './saves.mjs';
import { createSound } from './sound.mjs';
import { BUILDINGS, DEFENCE, FINAL_RANK, HOUR, MILESTONES, NODES, OFFICES, RAIDS, RANKS, RECRUIT, SURVEY_COST, SURVEY_TIME, TALENTS, ZONES } from './sim/data.mjs';
import * as rules from './sim/world.mjs';
import { createView } from './view.mjs';

const { advance, busy, builders, canPlace, claimGoal, collectTax, defencePower, districtsOpen, drums, freeRecruit, GOALS, maxLevel, needFor, offlineCap, PLOTS_PER_DISTRICT, plotPlan, quote, raidPower, raidSide, rates, recruit, recruitPrice, seasonOf, SIDES, stationTroops, troopCapacity, trainTalents } = rules;

const params = new URLSearchParams(location.search);
const $ = (selector) => document.querySelector(selector);

// ——— Save, language, time ———
const problems = new Set();
const { slots, preferences } = openSaveSlots(browserSaveStorage(), startLanguage(navigator.languages ?? [navigator.language]), (p) => problems.add(p.kind));
setLanguage(params.get('lang') ?? preferences.data.language);
const app = { ui: null, inspector: null, screens: null, game: null, view: null, sound: null, state: null, slot: null, screen: 'loading', tab: 'city', sheet: null, offset: 0, lastPaint: '', ready: false };
/** Real time in seconds (tests may move it on with `offset`). */
const now = () => Date.now() / 1000 + app.offset;
let stageScale = 1;

// ——— Sizing ———
function fit() {
  const s = Math.min(innerWidth / STAGE.width, innerHeight / STAGE.height),
    left = (innerWidth - STAGE.width * s) / 2,
    top = (innerHeight - STAGE.height * s) / 2;
  stageScale = s;
  $('#frame').classList.toggle('compact', s < 0.72);
  $('#frame').classList.toggle('portrait-view', innerHeight > innerWidth);
  $('#back').style.transform = `translate(${left}px, ${top}px) scale(${s})`;
  Object.assign($('#stage').style, {
    left: left + 'px', top: top + 'px', width: STAGE.width * s + 'px', height: STAGE.height * s + 'px'
  });
}
addEventListener('resize', () => {
  fit();
  app.screens?.refresh();
  if (app.screen === 'play') { paintTop(); paintSheet(); }
  app.semanticSurface?.sync();
});

// Painted terrain, animated residents and native map targets share one camera.
const overviewZoom = Math.min(STAGE.width / MAP.width, (STAGE.height - 114) / MAP.height);
const coreZoom = Math.min(STAGE.width / CORE_BOUNDS.width, STAGE.height / CORE_BOUNDS.height);
const camera = { x: 0, y: 0, zoom: overviewZoom };
const host = $('#stage');
let drag = null, suppressPointerUntil = 0, sheetPointer = null;

function positionTargets() {
  app.ui?.transform('mapTargets', {
    x: -camera.x * camera.zoom, y: -camera.y * camera.zoom, scale: camera.zoom
  });
}

function setCamera(x, y, zoom = camera.zoom) {
  const previousZoom = camera.zoom;
  camera.zoom = Math.max(overviewZoom, Math.min(1.4, zoom));
  const viewportW = STAGE.width / camera.zoom, viewportH = STAGE.height / camera.zoom;
  camera.x = viewportW >= MAP.width ? (MAP.width - viewportW) / 2 : Math.max(0, Math.min(MAP.width - viewportW, x));
  camera.y = viewportH >= MAP.height ? (MAP.height - viewportH) / 2 : Math.max(0, Math.min(MAP.height - viewportH, y));
  $('#map').style.transform = 'translate(' + (-camera.x * camera.zoom) + 'px, ' + (-camera.y * camera.zoom) + 'px) scale(' + camera.zoom + ')';
  app.view?.setCamera(camera.x, camera.y, camera.zoom);
  positionTargets();
  if (previousZoom !== camera.zoom) paintTop();
}

function zoomAround(zoom, screenX = STAGE.width / 2, screenY = STAGE.height / 2) {
  const next = Math.max(overviewZoom, Math.min(1.4, zoom));
  setCamera(camera.x + screenX / camera.zoom - screenX / next, camera.y + screenY / camera.zoom - screenY / next, next);
}
function showCounty() {
  setCamera(CORE_BOUNDS.x + (CORE_BOUNDS.width - STAGE.width / coreZoom) / 2,
    CORE_BOUNDS.y + (CORE_BOUNDS.height - STAGE.height / coreZoom) / 2, coreZoom);
}
function canvasPoint(event) {
  const rect = host.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / stageScale, y: (event.clientY - rect.top) / stageScale };
}
function inPart(name, { x, y }) {
  const rect = app.ui.rect(name);
  return rect && x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}
function wheelStep(event, value) {
  return value * (event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? STAGE.height : 1);
}
function allowPointer(event) {
  return event?.via !== 'pointer' || (!drag?.moving && performance.now() >= suppressPointerUntil);
}
host.addEventListener('wheel', (event) => {
  if (app.screen !== 'play' || app.screens.modal) return;
  const point = canvasPoint(event);
  if (inPart('sheet', point)) return;
  if (inPart('resources', point) && resourceScroll.maximum > 0) {
    resourceScroll.scrollBy(wheelStep(event, event.deltaX || event.deltaY));
  } else if (!inPart('top', point) && !inPart('tabs', point)) {
    zoomAround(camera.zoom * (event.deltaY > 0 ? 1 / 1.12 : 1.12), point.x, point.y);
  }
  event.preventDefault();
}, { passive: false });
host.addEventListener('pointerdown', (event) => {
  if (app.screen !== 'play' || app.screens.modal || drag || event.button !== 0 || !event.isPrimary) return;
  suppressPointerUntil = 0;
  const point = canvasPoint(event);
  const isScroll = event.pointerType !== 'mouse';
  if (inPart('sheet', point)) {
    sheetPointer = event.pointerId;
    return;
  }
  const region = inPart('resources', point) && resourceScroll.maximum > 0 ? isScroll && 'resources'
    : !['top', 'tabs', 'mapTools', 'goalCard', 'taxBubble', 'petitionCall', 'raidBanner'].some((key) => inPart(key, point)) && 'map';
  if (region) drag = { id: event.pointerId, region, x: event.clientX, y: event.clientY, moving: false };
});
host.addEventListener('pointermove', (event) => {
  if (drag?.id !== event.pointerId) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  if (!drag.moving) {
    if (Math.hypot(dx, dy) < 7) return;
    drag.moving = true;
    // Capture on the original canvas so a drag ending over a control does not become a tap.
    event.target.setPointerCapture?.(event.pointerId);
    host.classList.toggle('dragging', drag.region === 'map');
  }
  if (drag.region === 'resources') resourceScroll.scrollBy(-dx / stageScale);
  else {
    const zoom = camera.zoom > overviewZoom ? camera.zoom : Math.min(1.4, overviewZoom * 1.24);
    if (zoom !== camera.zoom) {
      const origin = canvasPoint({ clientX: drag.x, clientY: drag.y });
      zoomAround(zoom, origin.x, origin.y);
    }
    setCamera(camera.x - dx / (stageScale * zoom), camera.y - dy / (stageScale * zoom));
  }
  drag.x = event.clientX;
  drag.y = event.clientY;
});
function endDrag(event) {
  if (event.pointerId === undefined || event.pointerId === sheetPointer) sheetPointer = null;
  if (!drag || (event.pointerId !== undefined && event.pointerId !== drag.id)) return;
  if (drag.moving) suppressPointerUntil = performance.now() + 120;
  drag = null;
  host.classList.remove('dragging');
}
for (const event of ['pointerup', 'pointercancel', 'blur']) addEventListener(event, endDrag);
host.addEventListener('lostpointercapture', endDrag);
function panKey(event) {
  const step = { ArrowLeft: [-96, 0], ArrowRight: [96, 0], ArrowUp: [0, -96], ArrowDown: [0, 96] }[event.key];
  if (!step) return;
  event.preventDefault();
  if (camera.zoom === overviewZoom) zoomAround(overviewZoom * 1.24);
  setCamera(camera.x + step[0] / camera.zoom, camera.y + step[1] / camera.zoom);
}



// ——— Painting the map ———
const mapCanvas = $('#map'),
  pixelBudget = matchMedia('(pointer: coarse)').matches ? 4_800_000 : 6_400_000,
  mapScale = Math.min(1.5, Math.sqrt(pixelBudget / (MAP.width * MAP.height)), devicePixelRatio || 1);
mapCanvas.width = Math.ceil(MAP.width * mapScale);
mapCanvas.height = Math.ceil(MAP.height * mapScale);
mapCanvas.style.width = `${MAP.width}px`;
mapCanvas.style.height = `${MAP.height}px`;
const mapG = mapCanvas.getContext('2d');
// `?hour=10` pins the time of day (for tests and screenshots); otherwise the player's own clock lights the lanterns.
const pinnedHour = params.has('hour') ? Number(params.get('hour')) : null;
const nightOf = () => {
  const h = pinnedHour ?? new Date(now() * 1000).getHours() + new Date(now() * 1000).getMinutes() / 60;
  if (h >= 20 || h < 5) return 1;
  if (h >= 18) return (h - 18) / 2;
  if (h < 7) return 1 - (h - 5) / 2;
  return 0;
};
function paintMap(force = false) {
  const s = app.state;
  if (!s || app.screen !== 'play') return;
  const building = new Set(s.works.filter((w) => w.type === 'plot').map((w) => w.key));
  const night = Math.round(nightOf() * 4) / 4,
    key = JSON.stringify([s.plots, s.nodes, s.districts, s.defence, s.rank, seasonOf(s), night, [...building], getLanguage()]);
  if (!force && key === app.lastPaint) return;
  app.lastPaint = key;
  mapG.setTransform(mapScale, 0, 0, mapScale, 0, 0);
  paintCounty(mapG, {
    state: s,
    season: seasonOf(s),
    night,
    building,
    wardOpen: (i) => rules.wardIsOpen(s, i),
    wardState: (i) => wardState(s, i),
    labels: { ward: wardLabel, side: sideName, yamen: () => t('yamenName') }
  });
  app.view?.setWeather(seasonOf(s), night);
}
function wardLabel(i) {
  const s = app.state,
    zone = s.districts[i].zone;
  const recommendation = rules.wardRecommendation(i);
  const name = t('ward', { n: i + 1 });
  if (!rules.wardIsOpen(s, i)) return `${name} · ${t(wardState(s, i) === 'available' ? 'claimableLand' : 'outerLand')}`;
  if (zone) return `${name} · ${t('zone' + cap(zone))}`;
  return `${name} · ${t(recommendation ? 'site' + cap(recommendation) : 'chooseLand')}`;
}
function wardState(s, index) {
  if (rules.wardIsOpen(s, index)) return 'owned';
  return ['adjacent', 'none'].includes(rules.expansionQuote(s, index).why) ? 'locked' : 'available';
}
const cap = (w) => w[0].toUpperCase() + w.slice(1);
const sideName = (i) => t('side' + cap(SIDES[i] ?? SIDES[0]));
const targetName = (target) => target.type === 'camp' ? t('camp') : `${sideName(target.key)} · ${t(target.type === 'tower' ? 'gatehouse' : 'wall')}`;

// Each target keeps its world rectangle as the camera pans.
const mapName = ({ type, key = 0 }) => 'map-' + type + '-' + key;
function buildHits() {
  const items = [
    { type: 'panel', name: 'mapViewport', x: 0, y: 0, w: STAGE.width, h: STAGE.height, clip: true },
    { type: 'panel', parent: 'mapViewport', name: 'mapTargets', x: 0, y: 0, w: MAP.width, h: MAP.height }
  ];
  const make = (target, { x, y, w, h }, label) => items.push({
    type: 'button', parent: 'mapTargets', name: mapName(target), x, y, w, h, label, invisible: true,
    action: (event) => { if (allowPointer(event)) openTarget(target); }
  });
  const s = app.state;
  make({ type: 'yamen' }, LAYOUT.yamen, `${t('yamen')} · ${t('r' + s.rank)}`);
  LAYOUT.walls.forEach((r, i) => make({ type: 'wall', key: i }, r, `${sideName(i)} · ${t('wall')} · ${t('level', { n: s.defence.wall[i] })}`));
  LAYOUT.gates.forEach((r, i) => make({ type: 'tower', key: i }, r, `${sideName(i)} · ${t('gatehouse')} · ${t('level', { n: s.defence.tower[i] })}`));
  if (s.rank >= DEFENCE.camp.rank || s.defence.camp) make({ type: 'camp' }, LAYOUT.camp, `${t('camp')} · ${t('level', { n: s.defence.camp })}`);
  LAYOUT.nodes.forEach((r, i) => {
    const n = s.nodes[i];
    make({ type: 'node', key: i }, r, n.found ? `${buildingName(n.kind)} · ${t('level', { n: n.level })}` : t('hidden'));
  });
  LAYOUT.wards.forEach((w, i) => {
    if (!rules.wardIsOpen(s, i)) {
      make({ type: 'ward', key: i }, w, wardLabel(i));
      return;
    }
    make({ type: 'ward', key: i }, w.label, wardLabel(i));
    for (let p = 0; p < PLOTS_PER_DISTRICT; p++) {
      const index = i * PLOTS_PER_DISTRICT + p,
        plot = s.plots[index];
      const name = plot.kind ? `${buildingName(plot.kind)} ${t('level', { n: plot.level })}` : t(rules.RIVERSIDE.has(index) ? 'riverPlot' : 'empty');
      make({ type: 'plot', key: index }, LAYOUT.plots[index], `${t('ward', { n: i + 1 })} ${p + 1} · ${name}`);
    }
  });
  app.ui.show('map', { label: t('mapControls'), items });
  positionTargets();
}

// The county view retains the lacquer HUD, parchment notices and map toolbar.
const SHOWN = ['coin', 'grain', 'wood', 'stone', 'iron', 'silk', 'porcelain', 'tea', 'wine', 'mulberry', 'clay'];
const TABS = ['city', 'build', 'talent', 'affairs', 'defence'];
const CREAM = 0xf5e6c6, INK = 0x293b38, JADE = 0x345d4d;
const BRASS = 0xc3a778, LACQUER = 0x293d32;
const label = (name, words, x, y, w, h, props = {}) => ({
  type: 'text', name, text: String(words), x, y, w, h, color: INK, ...props
});
const panel = (name, x, y, w, h, color, props = {}) => ({ type: 'panel', name, x, y, w, h, color, ...props });
const control = (name, words, action, x, y, w, h, props = {}) => ({
  type: 'button', name, text: words, x, y, w, h, action, size: 16, bold: true, color: 0xf7edda, textColor: INK,
  card: { radius: 7, border: 0xc9b68f }, ...props
});
const TAB_ICONS = {
  city: [[0,42],[50,9],[100,42],[87,42],[87,91],[60,91],[60,61],[40,61],[40,91],[13,91],[13,42]],
  build: [[8,22],[33,7],[71,7],[92,24],[76,40],[59,27],[57,46],[50,97],[36,94],[44,29],[18,39]],
  talent: [[38,9],[62,9],[71,35],[63,52],[81,61],[92,89],[8,89],[19,61],[37,52],[29,35]],
  affairs: [[17,9],[87,9],[87,21],[78,21],[78,79],[89,79],[89,93],[14,93],[14,79],[26,79],[26,21],[17,21]],
  defence: [[50,4],[89,17],[86,59],[71,81],[50,96],[29,81],[14,59],[11,17]]
};
function lacquer(node, { w, h }) {
  node.graphics.clear().lineStyle(0.75, 0xc3a778)
    .beginLinearGradientFill(0, 0, w, h, [{ offset: 0, color: 0x49614d }, { offset: .72, color: LACQUER }, { offset: 1, color: LACQUER }])
    .drawRoundRect(0, 0, w, h, 13).endFill()
    .lineStyle(0.75, 0x907d55, .55).drawRoundRect(3, 3, w - 6, h - 6, 9);
}
function makeTabSkin(tab, active, labelWidth) {
  return (node, { w, h }) => {
    const color = active ? 0x764735 : CREAM;
    const g = node.graphics.clear();
    if (active) {
      g.lineStyle(.75, 0xc7a76f)
        .beginLinearGradientFill(0, 0, 0, h, [{ offset: 0, color: 0xfdf0d4 }, { offset: 1, color: 0xe2cca2 }])
        .drawRoundRect(0, 0, w, h, 6).endFill();
    }
    const iconX = Math.max(4, (w - (labelWidth + 24) * .75) / 2);
    const iconY = (h - 12.75) / 2;
    const points = TAB_ICONS[tab];
    const vertex = ([x, y]) => [iconX + x * .1275, iconY + y * .1275];
    g.lineStyle(0).beginFill(color, .84).moveTo(...vertex(points[0]));
    for (const point of points.slice(1)) g.lineTo(...vertex(point));
    g.lineTo(...vertex(points[0])).endFill();
  };
}
const hudCard = { radius: 10, border: BRASS };
const dark = { textColor: CREAM, color: LACQUER, card: hudCard };
const measure = document.createElement('canvas').getContext('2d');
function widthOf(words, size) {
  measure.font = size + 'px sans-serif';
  return measure.measureText(words).width;
}
const resourceScroll = createScrollControl({
  axis: 'x', viewportLength: 1, contentLength: 0, onScroll: () => paintTop()
});
let paintingTop = false;
function paintTop() {
  if (paintingTop || app.screen !== 'play') return;
  paintingTop = true;
  try {
    const s = app.state, r = rates(s);
    const compact = stageScale < 0.72, zh = getLanguage() === 'zh';
    const season = seasonOf(s), term = s.term ? t('term', { n: s.term + 1 }) : '';
    const county = t('countyLine', { rank: t('r' + s.rank) });
    const countyWidth = Math.min(420, Math.ceil(widthOf(county, zh ? 25 : 21)) + 12);
    const termWidth = term ? widthOf(term, 15) + 16 : 0;
    const almanacX = 65 + countyWidth + termWidth;
    const seasonWord = t('season' + season);
    const almanacW = Math.max(61, widthOf(seasonWord, 18) + 31);
    const items = [
      panel('top', 18, 12, 1244, 90, LACQUER, { card: hudCard, intercept: true, decorate: lacquer }),
      panel('countySeal', 32, 31, 19, 23, 0xa65745, { card: { radius: 3, border: 0xce9770 } }),
      label('county', county, 62, 22, countyWidth, 42, { size: zh ? 25 : 21, color: CREAM, bold: true, role: 'heading' }),
      control('almanac', seasonWord, () => openTarget({ type: 'almanac' }), almanacX, 20, almanacW, 44, {
        ...dark, color: [0x526f52, 0x325e60, 0x795838, 0x465e6d][season],
        label: t('almanacLabel', { season: seasonWord })
      }),
      control('settingsButton', t('settings'), () => app.screens.openSettings('settingsButton'), 1138, 20, 108, 44, dark),
      label('vitals', t('pop') + ' ' + amount(s.pop) + ' / ' + amount(r.house) + '    ' + t('life') + ' ' + Math.round(s.life) + '    ' + t('fame') + ' ' + amount(s.fame),
        720, 20, 401, 44, { color: CREAM, size: 16, align: 'right' })
    ];
    if (term) items.push(label('term', term, 62 + countyWidth, 26, termWidth, 33, { color: CREAM, size: 15 }));
    const resourceWidth = compact ? 540 : 1217;
    items.push(panel('resources', 31, 69, resourceWidth, 30, LACQUER, { clip: true }));
    const net = (k) => k === 'coin' ? r.tax + r.coin + r.salary : (r.make[k] ?? 0) - (r.use[k] ?? 0);
    let resourceX = 0;
    const resourceItems = [];
    for (const k of SHOWN.filter((key) => key === 'coin' || key === 'grain' || s.res[key] > 0 || (r.make[key] ?? 0) > 0)) {
      const delta = net(k);
      const itemText = t(k) + '  ' + amount(s.res[k]) + '  ' + (delta >= 0 ? '+' : '') + amount(delta) + '/h';
      const size = compact ? 16 : 14, w = Math.ceil(widthOf(itemText, size)) + 20;
      resourceItems.push({ k, delta, itemText, size, w, x: resourceX });
      resourceX += w + 9;
    }
    resourceScroll.setLengths(resourceWidth, resourceX);
    for (const { k, delta, itemText, size, w, x } of resourceItems) {
      const offset = x - resourceScroll.offset;
      if (offset + w <= 0 || offset >= resourceWidth) continue;
      const parent = 'resources';
      items.push(panel('resource-card-' + k, offset, 0, w, 26, k === 'coin' || k === 'grain' ? 0xf4e9cf : 0xe9ebde, { parent, card: { radius: 5, border: 0xb7b594 } }),
        label('resource-' + k, itemText, offset + 8, 0, w - 16, 26, { parent, size, color: delta < 0 ? 0x9c493b : INK }));
    }
    const tax = Math.floor(s.pendingTax);
    if (tax >= 1) items.push(control('taxBubble', '⊙ ' + amount(tax), collect, 18, compact ? 120 : 112, 104, compact ? 62 : 49, {
      color: 0xf9e8bb, textColor: 0x624a24, size: 18, label: t('collect') + ' · ' + t('taxWaiting', { n: amount(tax) })
    }));
    const goal = GOALS[s.goal], done = Boolean(goal?.check(s));
    if (goal && !app.sheet) {
      const y = compact ? 120 : 112;
      const goalWords = t('g_' + goal.id);
      const lines = wrapText(goalWords, 252, 16);
      const h = 36 + lines.length * 21 + (done ? 45 : 0);
      items.push(panel('goalCard', 983, y, 278, h, 0xfcf8ee, { intercept: true, card: { radius: 13, border: 0xf9f5e8 } }),
        label('goalLabel', t('goal'), 996, y + 7, 251, 21, { color: JADE, size: 13, bold: true }),
        ...lines.map((line, i) => label('goalText-' + i, line, 996, y + 28 + i * 21, 252, 21, { size: 16, bold: true })));
      if (done) items.push(control('claimButton', t('claim') + ' · ' + rewardWords(goal.reward), claim, 996, y + h - 44, 251, 36, { color: JADE, textColor: 0xffffff, size: 15 }));
    }
    const soon = s.raid.next && s.raid.next - s.time < RAIDS.warn * 2;
    if (soon) {
      const raid = sideName(raidSide(s)) + ' · ' + t('nextRaid', { kind: t('raid_' + RAIDS.kinds[s.raid.n % RAIDS.kinds.length]), time: duration(s.raid.next - s.time) });
      const y = compact ? 564 : 582, lines = wrapText(raid, 246, 16);
      items.push(control('raidBanner', '', () => openTab('defence'), 983, y, 278, 50, { label: raid, color: 0xf8e5d7 }),
        ...lines.map((line, i) => label('raid-line-' + i, line, 997, y + 4 + i * 20, 246, 20, { size: 16, color: 0x753c2e })));
    }
    if (s.petition) items.push(control('petitionCall', t('petitionWaiting'), openPetition, 18, compact ? 190 : 174, 170, compact ? 62 : 45, {
      color: 0x884d3e, textColor: 0xfff0d2, size: 17
    }));
    const toolY = compact ? 552 : 580, toolH = compact ? 62 : 44;
    const tools = [
      ['countyFocus', t('mapCounty'), showCounty], ['overview', t('mapOverview'), () => setCamera(0, 0, overviewZoom)],
      ['frontiers', t('expandLand'), () => openTarget({ type: 'frontier' })],
      ['zoomOut', '−', () => zoomAround(camera.zoom / 1.2)], ['zoomIn', '+', () => zoomAround(camera.zoom * 1.2)]
    ];
    const widths = tools.map(([, words]) => Math.max(compact ? 62 : 45, widthOf(words, compact ? 19 : 16) + 28));
    items.push(panel('mapTools', 18, toolY - 4, widths.reduce((a, b) => a + b, 0) + 24, toolH + 8, LACQUER, { card: hudCard, intercept: true }));
    let toolX = 22;
    tools.forEach(([name, words, action], i) => {
      items.push(control(name, words, action, toolX, toolY, widths[i], toolH, {
        size: compact ? 19 : 16,
        ...(i === 2 ? { color: 0x884d3e, textColor: CREAM } : {}),
        ...(i >= 3 ? { disabled: i === 3 ? camera.zoom <= overviewZoom : camera.zoom >= 1.4, label: t(i === 3 ? 'mapZoomOut' : 'mapZoomIn') } : {})
      }));
      toolX += widths[i] + 4;
    });
    const activeDots = { talent: freeRecruit(s) || s.fame >= recruitPrice(s), affairs: Boolean(s.petition) || done, defence: Boolean(soon) };
    const tabWidth = compact ? 710 : 644, tabHeight = compact ? 75 : 59, tabLeft = (1280 - tabWidth) / 2, tabY = 707 - tabHeight;
    items.push(panel('tabs', tabLeft, tabY, tabWidth, tabHeight, LACQUER, { card: hudCard, intercept: true, role: 'tablist', label: county, decorate: lacquer }));
    const tabItemW = (tabWidth - 28) / TABS.length;
    TABS.forEach((tab, i) => {
      const x = 6 + i * (tabItemW + 4), h = tabHeight - 12, size = compact ? 19 : 16;
      const words = t('tab' + cap(tab)), active = app.tab === tab;
      const labelWidth = widthOf(words, size);
      const labelLeft = Math.max(5, (tabItemW - labelWidth - 24) / 2) + 24;
      items.push(control('tab-' + tab, '', () => openTab(tab), x, 6, tabItemW, h, {
        parent: 'tabs', role: 'tab', label: words, selected: active, size,
        badge: activeDots[tab] || undefined, decorate: makeTabSkin(tab, active, labelWidth)
      }), label(undefined, words, x + labelLeft, 6, tabItemW - labelLeft - 2, h, {
        parent: 'tabs', size, bold: true, color: active ? 0x764735 : CREAM
      }));
    });
    app.ui.show('county', { label: county, items });
  } finally {
    paintingTop = false;
  }
}
function openTab(tab) {
  app.tab = tab;
  app.sound?.play('tap');
  if (tab === 'city') closeSheet(false);
  else openSheet({ tab });
  paintTop();
}
function openPetition() {
  openTab('affairs');
  app.inspector.reveal('petition-a');
}


const rewardWords = (reward) => Object.entries(reward).map(([k, v]) => `${t(k)} ${amount(v)}`).join(' · ');
const signed = (n) => (n >= 0 ? '+' : '−') + amount(Math.abs(n));

function petitionSheet(s) {
  const { id, season } = s.petition;
  return part('group', { appearance: 'petition' },
    Number.isInteger(season) ? part('note', { appearance: 'petitionSeason', text: t('season' + season) }) : null,
    part('paragraph', { text: t('p_' + id) }),
    part('group', { appearance: 'petitionChoices' },
      ...['a', 'b'].map((choice) => {
        const offer = rules.petitionOffer(s, choice);
        const detail = Object.entries(offer.delta).filter(([, n]) => n).map(([k, n]) => `${t(k)} ${signed(n)}`);
        if (offer.life) detail.push(t('petitionMood', { n: signed(offer.life), time: duration(offer.duration) }));
        if (offer.sellBoost > 0) detail.push(t('petitionSales', { n: amount(offer.sellBoost * 100), time: duration(offer.duration) }));
        if (offer.talent) detail.push(t('petitionTalent'));
        if (offer.why === 'cost') detail.push(t('petitionCost'));
        return button(t('p' + choice + '_' + id), () => decide(choice), { name: 'petition-' + choice, note: detail.join(' · '), disabled: Boolean(offer.why) });
      })));
}

// ——— The sheet ———
function openTarget(target) {
  app.sound?.play('tap');
  app.view?.focus(rectOf(target));
  openSheet(target);
}
function rectOf(target) {
  if (target.type === 'plot') return LAYOUT.plots[target.key];
  if (target.type === 'node') return LAYOUT.nodes[target.key];
  if (target.type === 'tower') return LAYOUT.gates[target.key];
  if (target.type === 'ward') return LAYOUT.wards[target.key];
  if (target.type === 'yamen') return LAYOUT.yamen;
  if (target.type === 'camp') return LAYOUT.camp;
  if (target.type === 'wall') return LAYOUT.walls[target.key ?? 0];
  return null;
}
function openSheet(what) {
  app.sheet = what;
  app.inspector.reset();
  paintTop();
  paintSheet();
  app.inspector.focusFirst();
}
function closeSheet(restoreFocus = true) {
  const was = app.sheet;
  app.sheet = null;
  app.inspector.hide();
  app.view?.focus(null);
  if (was?.tab) {
    app.tab = 'city';
    if (restoreFocus) app.ui.focus('tab-' + was.tab);
  } else if (restoreFocus && was) {
    app.ui.focus(was.type === 'almanac' ? 'almanac' : was.type === 'frontier' ? 'frontiers' : mapName(was));
  }
  paintTop();
}

function button(words, action, { note = '', disabled = false, kind = '', name } = {}) {
  return part('action', { action, appearance: kind, disabled, name },
    part('label', { text: words }), note && part('note', { text: note }) || null);
}
const priceWords = (price) => Object.entries(price).map(([k, v]) => `${t(k)} ${amount(v)}`).join(' · ');
const shortWords = (price) => {
  const s = app.state;
  return Object.entries(price)
    .filter(([k, v]) => (k === 'fame' ? s.fame : s.res[k]) < v)
    .map(([k, v]) => `${t(k)} ${amount(v - (k === 'fame' ? s.fame : s.res[k]))}`)
    .join(' · ');
};
function whyWords(q, price) {
  if (!q.why) return '';
  if (q.why === 'cost') return t('notEnough', { what: shortWords(price) });
  if (q.why === 'builders') return t('queueFull');
  if (q.why === 'maxLevel') return t('maxLevelReached', { n: maxLevel(app.state) });
  if (q.why === 'rank') return t('needRank', { rank: t('r' + (q.rank ?? '')) });
  if (q.why === 'river') return t('riverOnly');
  if (q.why === 'working') return t('waiting');
  return '';
}

function paintSheet() {
  const what = app.sheet;
  if (!what || !app.state) return;
  const parts = what.tab ? TAB_SHEETS[what.tab]() : TARGET_SHEETS[what.type](what);
  app.inspector.setContent(parts);
}

function layoutNote(plan) {
  const score = t('layoutEfficiency', { n: Math.round(plan.multiplier * 100) });
  const detail = [
    !plan.linked ? t('supplyFar') : '',
    plan.smoke > 0 ? t('smokeNearby') : '',
    plan.upkeep > 0.5 ? t('haulCost', { n: amount(plan.upkeep) }) : ''
  ].filter(Boolean);
  return [score, ...detail].join(' · ');
}

const previewCache = new Map();
function architecture(kind, level, ceiling, { facility = false, side = 0, rank = false } = {}) {
  const season = seasonOf(app.state);
  const proposed = !rank && level === 0;
  const levels = proposed ? [1] : level < ceiling ? [level, level + 1] : [level];
  return part('group', { appearance: 'architecture' }, ...levels.map((shown, index) => {
    const key = `${kind}:${shown}:${season}:${facility}:${side}`;
    let image = previewCache.get(key);
    if (!image) {
      image = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(320, 190) : Object.assign(document.createElement('canvas'), { width: 320, height: 190 });
      const context = image.getContext('2d');
      const rect = { x: 12, y: 7, w: 296, h: 175 };
      if (facility) paintFacility(context, kind, shown, rect, season, { side });
      else paintBuilding(context, kind, shown, rect, season);
      if (previewCache.size >= 36) previewCache.delete(previewCache.keys().next().value);
      previewCache.set(key, image);
    }
    const caption = rank ? t('r' + shown) : t(proposed || index ? 'nextArchitecture' : 'currentArchitecture', { n: shown });
    return part('figure', {}, part('image', { image }), part('note', { text: caption }));
  }));
}

function expansionReason(quote) {
  if (quote.why === 'adjacent') return t('connectedLand');
  if (quote.why === 'cost') return t('notEnough', { what: shortWords(quote.cost) });
  return '';
}

function showOnMap(type, key) {
  const rect = rectOf({ type, key }), zoom = Math.max(coreZoom, camera.zoom);
  setCamera(rect.x + rect.w / 2 - STAGE.width * 0.39 / zoom, rect.y + rect.h / 2 - STAGE.height / (2 * zoom), zoom);
  openTarget({ type, key });
}

/** A line for what a building makes at a level (before talents and zones). */
function outputWords(kind, level, spec = BUILDINGS[kind] ?? NODES[kind]) {
  const words = [],
    m = 2 ** MILESTONES.filter((x) => level >= x).length;
  if (spec.house) words.push(t('houses', { n: Math.round(spec.house * level * (1 + 0.1 * Math.floor(level / 10))) }));
  for (const [k, v] of Object.entries(spec.out ?? {})) words.push(`${t(k)} ${t('perHour', { n: amount(v * level * m) })}`);
  if (spec.use) words.push(`${t('uses')} ${Object.entries(spec.use).map(([k, v]) => `${t(k)} ${amount(v * level * m)}`).join(' · ')}`);
  if (spec.life) words.push(t('lifeAdd', { n: (spec.life * level ** 0.8).toFixed(1) }));
  if (spec.sell) words.push(t('sells', { n: amount(spec.sell * level * m) }));
  if (spec.power) words.push(t('defenceAdd', { n: amount(spec.power * level * m) }));
  return words.join(' · ');
}

function upgradeBlock(target, spec, level) {
  const s = app.state,
    q = quote(s, target),
    work = s.works.find((w) => w.type === target.type && w.key === (target.key ?? target.type));
  const out = [];
  if (work) out.push(part('paragraph', { appearance: 'muted', text: work.ends ? t('inWorks', { time: duration(work.ends - s.time) }) : t('waiting') }));
  if (q.price) {
    const next = level + 1,
      milestoneNext = MILESTONES.includes(next);
    out.push(
      button(level === 0 ? t('build') : t('levelUp', { n: next }), () => doUpgrade(target), {
        note: `${priceWords(q.price)} · ${t('works')} ${duration(q.time)}${milestoneNext ? ' · ' + t('milestone') : ''}${q.why ? ' · ' + whyWords({ ...q, rank: spec.rank }, q.price) : ''}`,
        disabled: Boolean(q.why),
        kind: 'primary', name: 'upgrade-' + target.type + '-' + (target.key ?? 0)
      })
    );
  } else if (q.why) out.push(part('paragraph', { appearance: 'muted', text: whyWords({ ...q, rank: spec.rank }, {}) }));
  return out;
}

function doUpgrade(target) {
  const result = rules.upgrade(app.state, target);
  if (result.why) return toast(whyWords(result, {}));
  app.sound.play(target.type === 'wall' || target.type === 'tower' ? 'defense' : 'mallet');
  afterChange();
}

function postLine(place) {
  const s = app.state,
    talent = s.talents.find((t2) => t2.post && t2.post.type === place.type && t2.post.key === place.key);
  return part('group',
    { appearance: 'row' },
    button(talent ? t('postedAt', { where: t('t_' + talent.id) }) : t('postAt'), () => openSheet({ type: 'pick', place, back: app.sheet }), { note: talent ? talentLine(talent) : t('unposted') })
  );
}
const talentLine = (talent) => t('talentLine', { rarity: t('rarity_' + TALENTS.find((x) => x.id === talent.id).rarity), level: talent.level, stars: talent.stars });

const TARGET_SHEETS = {
  harbor({ key }) {
    const s = app.state;
    const byWard = new Map();
    for (const index of rules.RIVERSIDE) {
      const ward = Math.floor(index / PLOTS_PER_DISTRICT);
      if (!byWard.has(ward)) byWard.set(ward, []);
      byWard.get(ward).push(index);
    }
    return [
      part('heading', { text: t(key === undefined ? 'harborSites' : 'moveDock') }),
      part('paragraph', { text: t(key === undefined ? 'harborHint' : 'moveDockHint') }),
      ...[...byWard].flatMap(([ward, plots]) => {
        const open = rules.wardIsOpen(s, ward);
        const free = plots.filter((index) => !s.plots[index].kind);
        return [
          part('subheading', { text: t('ward', { n: ward + 1 }) }),
          !open ? button(t('viewHarborWard'), () => showOnMap('ward', ward), { note: t('expandLand'), kind: 'jade' })
            : free.length ? part('group', { appearance: 'choices' }, ...free.map((index) =>
              button(t('harborLot', { n: index % PLOTS_PER_DISTRICT + 1 }), () => {
                if (key === undefined) return showOnMap('plot', index);
                const result = rules.moveDock(s, key, index);
                if (result.why) return toast(t('harborUnavailable'));
                app.sound.play('chime');
                afterChange(true);
                persist(true);
                showOnMap('plot', index);
              }))) : part('paragraph', { appearance: 'muted', text: t('harborFull') })
        ];
      })
    ];
  },
  almanac() {
    const current = rules.seasonInfo(app.state);
    const seasonEffects = Object.entries(current.effects).flatMap(([key, factor]) => {
      const change = key === 'life' ? factor : Math.round((factor - 1) * 100);
      return change ? [part('entry', {}, part('label', { appearance: 'grow', text: t('effect_' + key) }),
        part('strong', { text: signed(change) + (key === 'life' ? '' : '%') }))] : [];
    });
    return [
      part('heading', { text: t('almanacTitle') }),
      part('group', { appearance: 'almanacSeason' },
        part('strong', { text: t('season' + current.season) }),
        part('label', { text: t('nextSeason', { season: t('season' + current.next), time: duration(current.remaining) }) })),
      part('list', { appearance: 'list' }, ...seasonEffects),
      part('paragraph', { appearance: 'muted', text: t('seasonAdvice' + current.season) })
    ];
  },
  plot({ key }) {
    const s = app.state,
      plot = s.plots[key],
      ward = Math.floor(key / PLOTS_PER_DISTRICT);
    if (!plot.kind) {
      const choices = Object.keys(BUILDINGS).sort((a, b) => BUILDINGS[a].rank - BUILDINGS[b].rank);
      return [
        part('heading', { text: `${t('ward', { n: ward + 1 })} · ${t('empty')} ${key % PLOTS_PER_DISTRICT + 1}` }),
        part('paragraph', { appearance: 'muted', text: t(rules.RIVERSIDE.has(key) ? 'riverPlotNote' : 'emptyNote') }),
        part('group',
          { appearance: 'choices' },
          ...choices.map((kind) => {
            const why = canPlace(s, key, kind),
              q = !why ? quote(s, { type: 'plot', key, kind }) : null;
            const note = why === 'rank' ? t('needRank', { rank: t('r' + BUILDINGS[kind].rank) }) : why === 'river' ? t('riverOnly') : q ? `${priceWords(q.price)} · ${duration(q.time)}${q.why ? ' · ' + whyWords(q, q.price) : ''}` : '';
            const plan = plotPlan(s, key, kind);
            const disabled = Boolean(why || q?.why);
            return part('action', {
              name: 'build-' + kind, appearance: 'choice', disabled,
              onDisabledTap: disabled ? () => toast(note) : undefined,
              action: () => {
                doUpgrade({ type: 'plot', key, kind });
                openSheet({ type: 'plot', key });
              }
            }, part('strong', { text: buildingName(kind) }), part('note', { text: buildingAbout(kind) }),
            part('note', { appearance: 'planScore', text: layoutNote(plan) }), part('note', { text: note }));
          })
        )
      ];
    }
    const spec = BUILDINGS[plot.kind], inlandDock = plot.kind === 'dock' && !rules.RIVERSIDE.has(key);
    return [
      part('heading', { text: `${buildingName(plot.kind)} · ${t('level', { n: plot.level })}` }),
      architecture(plot.kind, plot.level, inlandDock ? plot.level : maxLevel(s)),
      part('paragraph', { text: buildingAbout(plot.kind) }),
      part('paragraph', { appearance: 'muted', text: outputWords(plot.kind, Math.max(1, plot.level)) }),
      part('paragraph', { appearance: 'planScore', text: layoutNote(plotPlan(s, key)) }),
      ...upgradeBlock({ type: 'plot', key }, spec, plot.level),
      inlandDock ? button(t('moveDock'), () => openSheet({ type: 'harbor', key }), { name: 'moveDock', note: t('moveDockHint'), kind: 'jade' }) : null,
      postLine({ type: 'plot', key }),
      part('group', { appearance: 'row' }, button(t('demolish'), () => {
        rules.demolish(s, key);
        afterChange();
        closeSheet();
      }))
    ];
  },
  ward({ key }) {
    const s = app.state;
    const recommendation = rules.wardRecommendation(key);
    if (!rules.wardIsOpen(s, key)) {
      const quote = rules.expansionQuote(s, key);
      return [
        part('heading', { text: `${t('ward', { n: key + 1 })} · ${t('expandLand')}` }),
        part('paragraph', { appearance: 'muted', text: t('expandNote') }),
        recommendation ? part('paragraph', { appearance: 'planScore', text: t('recommend' + cap(recommendation)) }) : null,
        quote.cost ? button(t('claimWard'), () => {
          const result = rules.expandWard(s, key);
          if (result.why) return toast(expansionReason(result));
          app.sound.play('chime');
          app.view.built(LAYOUT.wards[key].label);
          afterChange(true);
          persist(true);
        }, { note: [priceWords(quote.cost), expansionReason(quote)].filter(Boolean).join(' · '), disabled: Boolean(quote.why), kind: 'primary' })
        : part('paragraph', { appearance: 'muted', text: expansionReason(quote) })
      ];
    }
    return [
      part('heading', { text: `${t('ward', { n: key + 1 })} · ${t('planWard')}` }),
      part('paragraph', { appearance: 'muted', text: t('planNote') }),
      recommendation ? part('paragraph', { appearance: 'planScore', text: t('recommend' + cap(recommendation)) }) : null,
      part('group',
        { appearance: 'choices' },
        ...[...ZONES, null].map((zone) => {
          return part('action', {
            name: 'zone-' + (zone ?? 'none'), appearance: 'choice', pressed: s.districts[key].zone === zone,
            action: () => {
              rules.zone(s, key, zone);
              app.sound.play('tap');
              afterChange();
              closeSheet();
            }
          }, part('strong', { text: t(zone ? 'zone' + cap(zone) : 'zoneNone') }),
          part('note', { text: t(zone ? 'note' + cap(zone) : 'clearPlanNote') }));
        })
      )
    ];
  },
  frontier() {
    const s = app.state;
    const unclaimed = LAYOUT.wards.map((_, index) => index).filter((index) => !rules.wardIsOpen(s, index));
    const options = unclaimed.map((index) => ({
      index, quote: rules.expansionQuote(s, index)
    }));
    options.sort((a, b) => Number(a.quote.why === 'adjacent') - Number(b.quote.why === 'adjacent'));
    return [
      part('heading', { text: t('expandLand') }),
      part('paragraph', { text: t('expandedCount', { n: districtsOpen(s), all: LAYOUT.wards.length }) }),
      part('paragraph', { appearance: 'muted', text: t('expandNote') }),
      options.length ? part('list', { appearance: 'list frontierList' }, ...options.map(({ index, quote }) =>
        part('entry', {}, button(wardLabel(index), () => showOnMap('ward', index), {
          note: [quote.cost && priceWords(quote.cost), expansionReason(quote)].filter(Boolean).join(' · ')
        })))) : part('paragraph', { text: t('allLandClaimed') })
    ];
  },
  node({ key }) {
    const s = app.state,
      node = s.nodes[key];
    if (!node.found) {
      const next = s.nodes.findIndex((n) => !n.found);
      const surveying = s.works.find((w) => w.type === 'survey');
      return [
        part('heading', { text: t('hidden') }),
        surveying ? part('paragraph', { appearance: 'muted', text: t('surveyBusy', { time: duration((surveying.ends ?? s.time) - s.time) }) }) : null,
        next >= 0 ? surveyButton() : part('paragraph', { text: t('surveyDone') })
      ];
    }
    return [
      part('heading', { text: `${buildingName(node.kind)} · ${t('level', { n: node.level })}` }),
      part('paragraph', { text: buildingAbout(node.kind) }),
      architecture(node.kind, node.level, maxLevel(s), { facility: true }),
      part('paragraph', { appearance: 'muted', text: outputWords(node.kind, Math.max(1, node.level), NODES[node.kind]) }),
      ...upgradeBlock({ type: 'node', key }, NODES[node.kind], node.level),
      postLine({ type: 'node', key })
    ];
  },
  yamen() {
    const s = app.state,
      need = needFor(s, s.rank + 1),
      works = s.works.find((w) => w.type === 'rank');
    const parts = [
      part('heading', { text: t('yamenTitle', { rank: t('r' + s.rank) }) }),
      architecture('yamen', s.rank, FINAL_RANK, { facility: true, rank: true })
    ];
    if (s.pendingTax >= 1) parts.push(button(t('collect'), collect, { note: t('taxWaiting', { n: amount(s.pendingTax) }), kind: 'jade' }));
    if (!need) {
      parts.push(part('paragraph', { text: t('topRank') }), part('paragraph', { appearance: 'muted', text: t('promoteNote') }), button(t('promote'), promote, { name: 'promote', kind: 'primary' }));
      return parts;
    }
    parts.push(part('subheading', { text: `${t('rankNeeds')} · ${t('rankUp', { rank: t('r' + (s.rank + 1)) })}` }));
    parts.push(
      part('list',
        { appearance: 'needs' },
        ...Object.entries(need).map(([k, v]) => {
          const have = k === 'pop' ? s.pop : k === 'life' ? s.life : s.res[k],
            li = part('entry', {}, part('label', { text: t(k) }), part('meter', { value: Math.min(1, have / v) }), part('label', { text: `${amount(have)} / ${amount(v)}` }));
          if (have >= v) li.appearance = 'met';
          return li;
        })
      )
    );
    parts.push(part('paragraph', { appearance: 'muted', text: t('keep') }));
    if (works) parts.push(part('paragraph', { text: t('rankBusy', { time: duration(works.ends - s.time) }) }));
    else {
      const probe = rules.rankUp(JSON.parse(JSON.stringify(s)));
      parts.push(button(t('rankUp', { rank: t('r' + (s.rank + 1)) }), doRankUp, { note: `${t('rankWorks', { time: duration(RANKS[s.rank + 1].time) })}${probe.why ? '' : ' · ' + t('rankReady')}`, disabled: Boolean(probe.why), name: 'rankUp', kind: 'primary' }));
    }
    parts.push(postLine({ type: 'office', key: 'deputy' }));
    return parts;
  },
  wall: ({ key = 0 }) => defenceSheet({ type: 'wall', key }),
  tower: ({ key }) => defenceSheet({ type: 'tower', key }),
  camp: () => defenceSheet({ type: 'camp' }),
  pick({ place, back }) {
    const s = app.state;
    return [
      part('heading', { text: t('choosePost') }),
      s.talents.length ? null : part('paragraph', { text: t('noTalents') }),
      part('list',
        { appearance: 'list' },
        ...s.talents.map((talent) =>
          part('entry',
            {},
            part('label', { appearance: 'grow', text: `${t('t_' + talent.id)} · ${talentLine(talent)}` }),
            button(t('postAt'), () => {
              rules.post(s, talent.id, place);
              app.sound.play('tap');
              afterChange();
              openSheet(back);
            })
          )
        )
      )
    ];
  }
};

function defenceSheet(target) {
  const s = app.state,
    spec = DEFENCE[target.type],
    side = target.key ?? 0,
    level = target.type === 'camp' ? s.defence.camp : s.defence[target.type][side];
  return [
    part('heading', { text: `${targetName(target)} · ${t('level', { n: level })}` }),
    target.type === 'wall' ? null : architecture(target.type === 'tower' ? 'gate' : 'camp', level, maxLevel(s), { facility: true, side }),
    part('paragraph', { text: target.type === 'tower' ? t('gateNote') : t('about_' + target.type) }),
    part('paragraph', { appearance: 'muted', text: `${t('power', { n: amount(defencePower(s, side)) })} · ${t('defenceAdd', { n: amount(spec.power) })}` }),
    ...upgradeBlock(target, spec, level),
    target.type === 'camp' ? null : troopControls(side),
    postLine({ type: 'defence', key: target.type === 'camp' ? 'camp' : `${target.type}:${side}` })
  ];
}

function troopControls(side) {
  const s = app.state, stationed = s.defence.troops[side];
  const reserve = Math.max(0, troopCapacity(s) - s.defence.troops.reduce((sum, count) => sum + count, 0));
  const send = (amount) => {
    const result = stationTroops(s, side, stationed + amount);
    if (result.why) return toast(t('noReserve'));
    app.sound.play('deploy');
    afterChange();
  };
  return part('group', { appearance: 'troopControls' },
    part('strong', { text: t('troopsHere', { n: stationed }) }),
    part('label', { text: t('troopsReserve', { n: reserve }) }),
    troopCapacity(s) ? null : part('paragraph', { appearance: 'muted', text: t('needRank', { rank: t('r' + DEFENCE.wall.rank) }) }),
    part('group', { appearance: 'row' },
      button(t('deployTroop'), () => send(1), { disabled: reserve === 0, name: 'deploy-' + side, kind: 'jade' }),
      button(t('recallTroop'), () => send(-1), { disabled: stationed === 0, name: 'recall-' + side })));
}

function surveyButton() {
  const s = app.state,
    index = s.nodes.findIndex((n) => !n.found);
  const kind = s.nodes[index]?.kind;
  const busyNow = s.works.some((w) => w.type === 'survey');
  const cost = SURVEY_COST(s.surveys);
  const rankShort = kind && s.rank < NODES[kind].rank;
  return button(t('survey'), () => {
    const r = rules.survey(s);
    if (r.why) return toast(r.why === 'cost' ? t('notEnough', { what: `${t('coin')} ${amount(cost - s.res.coin)}` }) : r.why === 'builders' ? t('queueFull') : r.why === 'rank' ? t('needRank', { rank: t('r' + NODES[kind].rank) }) : t('waiting'));
    app.sound.play('mallet');
    afterChange();
  }, { note: rankShort ? t('needRank', { rank: t('r' + NODES[kind].rank) }) : t('surveyNote', { coin: amount(cost), time: duration(SURVEY_TIME[Math.min(SURVEY_TIME.length - 1, s.surveys)]) }), disabled: busyNow || rankShort, kind: 'jade' });
}

const TAB_SHEETS = {
  build() {
    const s = app.state;
    const items = [];
    s.plots.forEach((p, i) => p.kind && items.push({ target: { type: 'plot', key: i }, name: buildingName(p.kind), level: p.level, spec: BUILDINGS[p.kind] }));
    s.nodes.forEach((n, i) => n.found && n.level > 0 && items.push({ target: { type: 'node', key: i }, name: buildingName(n.kind), level: n.level, spec: NODES[n.kind] }));
    return [
      part('heading', { text: t('worksTitle') }),
      button(t('expandLand'), () => openSheet({ type: 'frontier' }), { name: 'expandLand', kind: 'jade' }),
      button(t('harborSites'), () => openSheet({ type: 'harbor' }), { name: 'harborSites', kind: 'jade' }),
      part('paragraph', { appearance: 'muted', text: t('choosePlotHint') }),
      part('paragraph', { appearance: 'planScore', text: t('countyLayout', { n: Math.round(rates(s).planning.efficiency * 100) }) }),
      part('paragraph', { appearance: 'muted', text: t('builders', { busy: busy(s), all: builders(s), queued: rules.queued(s), cap: builders(s) * rules.QUEUE_PER_BUILDER }) }),
      s.works.length
        ? part('list', { appearance: 'list' }, ...s.works.map((w) => part('entry', {}, part('label', { appearance: 'grow', text: workName(w) }), part('label', { appearance: 'muted', text: w.ends ? duration(w.ends - s.time) : t('waiting') }))))
        : part('paragraph', { text: t('noWorks') }),
      part('group', { appearance: 'row' }, surveyButton()),
      part('subheading', { text: t('upgrade') }),
      part('list',
        { appearance: 'list' },
        ...items.map(({ target, name, level }) => {
          const q = quote(s, target);
          return part('entry',
            {},
            part('label', { appearance: 'grow', text: `${name} · ${t('level', { n: level })}` }),
            button(t('levelUp', { n: level + 1 }), () => doUpgrade(target), { note: q.price ? priceWords(q.price) : whyWords(q, {}), disabled: Boolean(q.why) })
          );
        })
      )
    ];
  },
  talent() {
    const s = app.state,
      free = freeRecruit(s),
      price = recruitPrice(s);
    return [
      part('heading', { text: t('tabTalent') }),
      part('paragraph', { appearance: 'muted', text: t('recruitNote') }),
      part('group', { appearance: 'row' }, button(free ? t('recruitFree') : t('recruitCost', { n: amount(price) }), doRecruit, { disabled: !free && s.fame < price, name: 'recruit', kind: 'primary' })),
      part('subheading', { text: `${t('office_deputy')} · ${t('office_registrar')} · ${t('office_sheriff')}` }),
      ...Object.keys(OFFICES).map((office) => {
        const holder = s.talents.find((x) => x.post?.type === 'office' && x.post.key === office);
        return part('group', { appearance: 'row' }, button(`${t('office_' + office)}: ${holder ? t('t_' + holder.id) : t('unposted')}`, () => openSheet({ type: 'pick', place: { type: 'office', key: office }, back: { tab: 'talent' } }), { note: t('officeNote_' + office) }));
      }),
      part('subheading', { text: t('roster', { n: s.talents.length }) }),
      s.talents.length ? null : part('paragraph', { text: t('noTalents') }),
      ...s.talents.map((talent) => {
        const spec = TALENTS.find((x) => x.id === talent.id);
        return part('group',
          { appearance: 'talent' },
          part('label', { appearance: 'portrait r-' + spec.rarity, text: t('t_' + talent.id).slice(0, 1) }),
          part('group',
            {},
            part('strong', { text: t('t_' + talent.id) }),
            part('group', { appearance: 'stats', text: `${talentLine(talent)} · ${['rule', 'farm', 'craft', 'trade', 'arms'].map((k, i) => `${t('stat_' + k)}${spec.stats[i]}`).join(' ')}` }),
            part('group', { appearance: 'stats', text: [Object.keys(spec.gift).map((g) => t('gift_' + g)).join(' · '), talent.post ? t('postedAt', { where: placeName(talent.post) }) : t('unposted')].filter(Boolean).join(' · ') })
          ),
          part('label')
        );
      })
    ];
  },
  affairs() {
    const s = app.state,
      goal = GOALS[s.goal];
    const parts = [part('heading', { text: t('tabAffairs') })];
    parts.push(part('subheading', { text: t('goal') }));
    if (goal) {
      parts.push(part('paragraph', { text: `${t('g_' + goal.id)} · ${t('goalReward', { what: rewardWords(goal.reward) })}` }));
      if (goal.check(s)) parts.push(button(t('claim'), claim, { kind: 'jade' }));
    } else parts.push(part('paragraph', { text: t('allGoals') }));
    parts.push(part('subheading', { text: t('petition') }));
    if (s.petition) parts.push(petitionSheet(s));
    else parts.push(part('paragraph', { appearance: 'muted', text: t('noPetition') }));
    parts.push(part('subheading', { text: t('log') }));
    parts.push(part('list', { appearance: 'list' }, ...s.log.slice(0, 12).map((entry) => part('entry', {}, part('label', { appearance: 'grow', text: logWords(entry) })))));
    return parts;
  },
  defence() {
    const s = app.state;
    const parts = [part('heading', { text: t('defenceTitle') }), part('paragraph', { text: t('defenceHint') })];
    if (s.raid.next) {
      parts.push(part('paragraph', { text: `${sideName(raidSide(s))} · ${t('nextRaid', { kind: t('raid_' + RAIDS.kinds[s.raid.n % RAIDS.kinds.length]), time: duration(s.raid.next - s.time) })} · ${t('enemyPower', { n: amount(raidPower(s)) })}` }));
      const inWindow = s.raid.next - s.time <= RAIDS.warn;
      parts.push(button(s.raid.drums ? t('drumsOn') : t('drums'), beatDrums, { disabled: s.raid.drums || !inWindow, note: inWindow ? '' : t('drumsLater'), kind: 'primary' }));
    } else parts.push(part('paragraph', { appearance: 'muted', text: t('noRaid') }));
    parts.push(...SIDES.map((_, key) => part('group', { appearance: 'defenceSide' },
      part('subheading', { text: `${sideName(key)} · ${t('power', { n: amount(defencePower(s, key)) })}` }),
      part('group', { appearance: 'row' },
        button(t('wall'), () => openTarget({ type: 'wall', key }), { note: t('level', { n: s.defence.wall[key] }) }),
        button(t('gatehouse'), () => openTarget({ type: 'tower', key }), { name: 'gatehouse-' + key, note: t('level', { n: s.defence.tower[key] }) })),
      troopControls(key))));
    parts.push(button(t('camp'), () => openTarget({ type: 'camp' }), { note: t('level', { n: s.defence.camp }) }));
    return parts;
  }
};

function placeName(post) {
  const s = app.state;
  if (post.type === 'office') return t('office_' + post.key);
  if (post.type === 'plot') return `${t('ward', { n: Math.floor(post.key / PLOTS_PER_DISTRICT) + 1 })} ${buildingName(s.plots[post.key].kind ?? 'house')}`;
  if (post.type === 'node') return buildingName(s.nodes[post.key].kind);
  if (post.type === 'defence' && post.key.includes(':')) {
    const [type, key] = post.key.split(':');
    return targetName({ type, key: Number(key) });
  }
  return t(post.key);
}
function workName(w) {
  const s = app.state;
  if (w.type === 'plot') return `${buildingName(w.kind ?? s.plots[w.key].kind)} → ${w.level}`;
  if (w.type === 'node') return `${buildingName(s.nodes[w.key].kind)} → ${w.level}`;
  if (w.type === 'survey') return t('survey');
  if (w.type === 'rank') return t('rankUp', { rank: t('r' + w.level) });
  if (w.type === 'wall' || w.type === 'tower') return `${targetName(w)} → ${w.level}`;
  return `${t(w.type)} → ${w.level}`;
}
function logWords(entry) {
  if (entry.type === 'raid') return t('logRaid', { kind: t('raid_' + entry.kind), result: entry.won ? t('won') : t('lost') });
  return t('logDone', { what: workName({ ...entry.work, ends: 1 }) });
}

// ——— Actions ———
function collect() {
  const s = app.state,
    got = collectTax(s);
  if (!got) return;
  app.sound.play('coins');
  const yamenX = LAYOUT.yamen.x + LAYOUT.yamen.w / 2;
  app.view.coins(yamenX, LAYOUT.yamen.y + LAYOUT.yamen.h / 2, Math.min(30, 8 + Math.log10(got) * 4));
  app.view.float('+' + amount(got), yamenX, LAYOUT.yamen.y);
  afterChange();
}
function claim() {
  const goal = claimGoal(app.state);
  if (!goal) return;
  app.sound.play('chime');
  toast(`${t('goalDone')} ${rewardWords(goal.reward)}`);
  afterChange();
}
function decide(choice) {
  const r = rules.answer(app.state, choice);
  if (r.why) return;
  app.sound.play('tap');
  if (r.talent?.talent) talentArrived(r.talent);
  toast(t('answered'));
  afterChange();
  persist(true);
}
function doRecruit() {
  const r = recruit(app.state);
  if (r.why) return;
  talentArrived(r);
  afterChange();
}
function talentArrived(r) {
  app.sound.play('stone');
  toast(r.star ? t('starUp', { name: t('t_' + r.talent.id) }) : t('newTalent', { name: t('t_' + r.talent.id) }));
}
function doRankUp() {
  const r = rules.rankUp(app.state);
  if (r.why) return;
  app.sound.play('mallet');
  afterChange();
}
function beatDrums() {
  if (drums(app.state).why) return;
  app.sound.play('drum');
  afterChange();
}
function promote() {
  const s = app.state,
    next = rules.promote(s, now());
  if (!next) return;
  const county = JSON.parse(JSON.stringify(next));
  slots[app.slot].update((data) => {
    recordTerm(data, (s.time - s.started) / HOUR);
    data.county = county;
  });
  app.state = next;
  afterChange(true);
  closeSheet();
}

// Short status notices remain in the game layer and its semantic tree.
const notices = [];
function paintNotices() {
  if (!notices.length) return app.ui.hide('notices');
  let y = 113;
  const items = [];
  for (const notice of notices) {
    const lines = wrapText(notice.words, 398, 16);
    const height = lines.length * 22 + 16;
    items.push(panel('notice-paper-' + notice.id, 425, y, 430, height, 0x334940, { card: { radius: 10 } }),
      ...lines.map((line, i) => label('notice-' + notice.id + '-' + i, line, 441, y + 8 + i * 22, 398, 22, {
        color: 0xfff8ec, size: 16, ...(i === 0 ? { role: 'status', label: notice.words } : {})
      })));
    y += height + 6;
  }
  app.ui.show('notices', { items });
}
let noticeId = 0;
function toast(words) {
  if (!words || !app.ui) return;
  const notice = { id: ++noticeId, words };
  notices.push(notice);
  if (notices.length > 3) notices.shift();
  paintNotices();
  setTimeout(() => {
    const index = notices.indexOf(notice);
    if (index < 0) return;
    notices.splice(index, 1);
    if (app.screen !== 'loading') paintNotices();
  }, 3700);
}

// ——— The clock ———
function afterChange(full = false, ticking = false) {
  paintMap(full);
  if (full || app.hitsKey !== hitsKey()) {
    buildHits();
    app.hitsKey = hitsKey();
  }
  paintTop();
  if (app.sheet && (!ticking || (sheetPointer === null && Math.floor(app.state.time) % 3 === 0))) paintSheet();
  persist();
}
const hitsKey = () => JSON.stringify([app.state.plots, app.state.nodes.map((n) => [n.found, n.level]), app.state.defence, app.state.rank, app.state.districts, getLanguage()]);

function tick() {
  const s = app.state;
  if (!s || app.screen !== 'play') return;
  const before = s.time,
    report = advance(s, now(), { active: true });
  trainTalents(s, (s.time - before) / HOUR);
  present(report);
  app.view.setCountyActivity(s);
  afterChange(false, true);
}
function present(report) {
  for (const work of report.works) {
    if (work.type === 'plot') {
      app.view.built(LAYOUT.plots[work.key]);
      if (MILESTONES.includes(work.level)) toast(`${buildingName(app.state.plots[work.key].kind)} · ${t('milestone')}`);
    } else if (work.type === 'node') app.view.built(LAYOUT.nodes[work.key]);
    else if (work.type === 'wall' || work.type === 'tower' || work.type === 'camp') app.view.built(rectOf(work));
    else if (work.type === 'rank') {
      toast(t('rankUp', { rank: t('r' + work.level) }));
      app.game?.flash(0xfff1c8, 0.3);
      for (let i = 0; i < 4; i++) app.game?.after(i * 0.25, () => app.view.coins(200 + i * 100, 360, 24));
      if (work.level === FINAL_RANK) toast(t('termDone'));
    }
    app.sound.play(work.type === 'rank' ? 'win' : 'chime');
  }
  for (const raid of report.raids) {
    const kind = t('raid_' + raid.kind);
    app.view.raid(raid.won, raid.side).then(() => {
      if (app.screen !== 'play') return;
      app.sound.play(raid.won ? 'win' : 'lose');
      toast(raid.won ? t('raidWon', { kind, coin: amount(raid.loot) }) : t('raidLost', { kind }));
    }).catch((error) => {
      if (app.screen === 'play') console.error(error);
    });
  }
  if (report.petitions) toast(t('petition'));
}

let lastPersist = 0;
function persist(force = false) {
  if (app.slot === null || !app.state) return false;
  const at = Date.now();
  if (!force && at - lastPersist < 5000) return;
  lastPersist = at;
  const county = JSON.parse(JSON.stringify(app.state));
  return slots[app.slot].update((data) => {
    data.county = county;
  });
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && app.state) persist(true);
  else if (!document.hidden && app.state && app.screen === 'play') welcomeBack();
});
addEventListener('pagehide', () => app.state && persist(true));

/** Catch up after an absence and list what came in. */
function welcomeBack() {
  const s = app.state,
    away = now() - s.time;
  if (away < 120) return tick();
  const before = s.time,
    report = advance(s, now(), { active: false });
  trainTalents(s, (s.time - before) / HOUR);
  const lines = [t('awayFor', { time: duration(away) }),
    { text: t('awayCounted', { time: duration(Math.min(away, offlineCap(s))) }), muted: true }];
  const made = Object.entries(report.made).filter(([, value]) => value >= 1);
  if (made.length) lines.push(t('awayMade') + '：' + made.map(([k, v]) => t(k) + ' ' + amount(v)).join(' · '));
  if (report.sold >= 1) lines.push(t('awaySold', { n: amount(report.sold) }));
  if (report.tax >= 1) lines.push(t('awayTax', { n: amount(s.pendingTax) }));
  if (report.works.length) lines.push(t('awayWorks', { n: report.works.length }));
  if (report.raids.length) lines.push(t('awayRaids', { won: report.raids.filter((r) => r.won).length, lost: report.raids.filter((r) => !r.won).length }));
  afterChange(true);
  app.screens.showAway(lines);
}
function updateLanguage() {
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  document.title = t('pageTitle');
  app.game?.canvas.setAttribute('aria-label', t('title'));
  $('#rotateHint').textContent = t('rotateHint');
  app.screens?.refresh();
  if (app.screen === 'play') afterChange(true);
}
onLanguage(updateLanguage);

function changePreference(key) {
  if (key === 'language') {
    const next = getLanguage() === 'zh' ? 'en' : 'zh';
    setLanguage(next);
    preferences.update((settings) => { settings.language = next; });
    return;
  }
  preferences.update((settings) => { settings[key] = !settings[key]; });
  if (key === 'sound') app.sound.setSound(preferences.data.sound);
  if (key === 'music') app.sound.setMusic(preferences.data.music);
  if (key === 'reducedMotion') app.game.reducedMotion = preferences.data.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function returnToTitle() {
  if (!persist(true)) {
    toast(t('saveRefused'));
    return false;
  }
  app.slot = null;
  app.screen = 'loading';
  $('#loading').hidden = false;
  try {
    app.semanticSurface.dispose();
    app.ui.dispose();
    app.inspector.dispose();
    await app.game.dispose();
  } catch (error) {
    console.warn(error);
  }
  location.reload();
  return true;
}

function enterCounty(index, keyboard) {
  if (app.screen !== 'title') return;
  const saved = slots[index].data.county;
  app.slot = index;
  app.state = saved ? JSON.parse(JSON.stringify(saved)) : rules.createCounty({
    seed: Number(params.get('seed') ?? Math.floor(Math.random() * 1e6)), now: now()
  });
  app.screens.hideTitle();
  app.sound.start();
  app.screen = 'play';
  app.view.setCountyActivity(app.state);
  afterChange(true);
  welcomeBack();
  if (app.screens.modal === 'away') return;
  if (keyboard && !app.ui.focus('taxBubble', { via: 'keyboard' })) app.ui.focus('map-yamen-0', { via: 'keyboard' });
  else if (!keyboard) app.ui.blur();
}

// Keep inspection scrolling and world panning separate from the canvas control traversal.
document.addEventListener('keydown', (event) => {
  if (!app.ui || event.defaultPrevented) return;
  if (event.key === 'Escape') {
    if (app.screens.back() || (app.sheet && (closeSheet(), true))) event.preventDefault();
    return;
  }
  if (app.screen !== 'play' || app.screens.modal) return;
  if (event.key === 'Tab' && app.inspector.advanceFocus(event)) {
    event.preventDefault();
    return;
  }
  if (app.sheet && ['PageUp', 'PageDown'].includes(event.key)) {
    app.inspector.scrollBy(event.key === 'PageDown' ? 370 : -370);
    event.preventDefault();
  } else if (app.ui.focused?.startsWith('map-')) panKey(event);
}, true);

async function boot() {
  fit();
  const semantics = createUiSemantics({ maxNodes: 1024 });
  const bridge = bridgeUiSemantics(semantics);
  const uiDensity = uiRenderDensity({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio,
    coarse: matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0,
    screenWidth: screen.width, screenHeight: screen.height }, STAGE);
  const game = await play({
    width: STAGE.width * 0.75, height: STAGE.height * 0.75, parent: host, transparent: true, semantics: bridge,
    pixelRatio: uiDensity, audio: typeof globalThis.AudioContext === 'function',
    renderMode: 'on-demand',
    arrange: () => app.ui?.arrange(),
    update: (seconds) => {
      if (app.screen !== 'play') return;
      app.view.update(Math.min(0.1, seconds));
      app.inspector?.syncScroll();
    },
    onError: console.error
  });
  game.reducedMotion = preferences.data.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  app.game = game;
  app.view = createView(game);
  showCounty();
  app.sound = createSound(game, { sound: preferences.data.sound, music: preferences.data.music });
  app.semantics = semantics;
  app.ui = createUi(game, bridge);
  app.semanticSurface = createBrowserSemantics({
    semantics, canvas: game.canvas, width: STAGE.width * 0.75, height: STAGE.height * 0.75, label: t('title')
  });
  app.inspector = createInspector(game, app.ui, {
    close: () => closeSheet(), compact: () => stageScale < 0.72, allowPointer
  });
  app.screens = createScreens(game, app.ui, {
    slots, problems, preferences, uiDensity, isPlaying: () => app.screen === 'play', isCompact: () => stageScale < 0.72,
    onEnter: enterCounty, onSetting: changePreference, onReturnTitle: returnToTitle,
    onAwayClose: () => app.ui.focus('taxBubble')
  });
  updateLanguage();
  await app.screens.ready;
  app.screen = 'title';
  app.screens.showTitle();
  $('#loading').hidden = true;
  setInterval(tick, 1000);
  app.ready = true;
  // Decode the county painting after the title controls are available.
  requestAnimationFrame(() => { void loadTerrain().then(() => paintMap(true)); });
}


/** For tests: the app, the rules and a clock that can be moved on. */
window.peach = {
  app,
  rules,
  get ui() { return app.ui; },
  get semantics() { return app.semantics; },
  get ready() {
    return app.ready;
  },
  get screen() {
    return app.screen;
  },
  get game() {
    return app.game;
  },
  /** Move real time on by `seconds` (as if away) and catch up. */
  away(seconds) {
    app.offset += seconds;
    welcomeBack();
  },
  tick
};

boot().catch((error) => {
  console.error(error);
  $('#loading').textContent = String(error.message ?? error);
});
