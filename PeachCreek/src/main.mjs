// 页面入口：存档和语言、引擎（play，四分之三分辨率）、地图和界面。规则按真实时间每秒推进一次；离开再回来时按仓廪
// 的上限补算收成，并列出这段时间的收获。地图上的每块地、每处资源点、县衙、城墙和箭楼都是一个透明按钮，键盘和读屏
// 都能用；点开后底部升起一张单子，在上面营建、规划、派驻和升格。
// The page's entry: the save and the language, the engine (play, at three-quarter resolution), the map and the
// interface. The rules move on with real time once a second; coming back after an absence counts the harvest up to the
// granaries' cap and lists what came in. Every plot, resource point, the yamen, the wall and the towers on the map is a
// clear button, for keyboards and screen readers alike; a sheet rises from the bottom to build, plan, post and rise.
import { play } from '@egret/engine/play';
import { browserSaveStorage } from '@egret/engine/web/kit';
import { amount, buildingAbout, buildingName, duration, getLanguage, onLanguage, setLanguage, startLanguage, t } from './i18n.mjs';
import { CORE_BOUNDS, LAYOUT, MAP, loadTerrain, paintCounty, STAGE } from './paint.mjs';
import { paintBuilding, paintFacility } from './building-art.mjs';
import { countyLooksRight, openSave, recordTerm } from './saves.mjs';
import { createSound } from './sound.mjs';
import { BUILDINGS, DEFENCE, FINAL_RANK, GOODS, HOUR, MILESTONES, NODES, OFFICES, PETITIONS, RAIDS, RANKS, RECRUIT, SURVEY_COST, SURVEY_TIME, TALENTS, ZONES } from './sim/data.mjs';
import * as rules from './sim/world.mjs';
import { createView } from './view.mjs';

const { advance, busy, builders, canPlace, claimGoal, collectTax, defencePower, districtsOpen, drums, freeRecruit, GOALS, maxLevel, needFor, offlineCap, PLOTS_PER_DISTRICT, plotPlan, quote, raidPower, raidSide, rates, recruit, recruitPrice, seasonOf, SIDES, stationTroops, troopCapacity, trainTalents } = rules;

const params = new URLSearchParams(location.search);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of children) if (child !== null && child !== undefined) node.append(child);
  return node;
};

// ——— Save, language, time ———
const problems = [];
const save = openSave(browserSaveStorage(), startLanguage(navigator.languages ?? [navigator.language]), (p) => problems.push(p.kind));
setLanguage(params.get('lang') ?? save.data.settings.language);
const app = { game: null, view: null, sound: null, state: null, screen: 'loading', tab: 'city', sheet: null, offset: 0, lastPaint: '', lastSave: 0, ready: false };
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
  for (const layer of [$('#back'), $('#ui')]) layer.style.transform = `translate(${left}px, ${top}px) scale(${s})`;
  $('#stage').style.transform = `translate(${left}px, ${top}px) scale(${(s * 4) / 3})`;
}
addEventListener('resize', fit);

// Hit regions, scenery and animated actors all share this world-space camera.
// Leave room for the HUD so all four gates and the far-bank plots fit the overview.
const overviewZoom = Math.min(STAGE.width / MAP.width, (STAGE.height - 114) / MAP.height);
const coreZoom = Math.min(STAGE.width / CORE_BOUNDS.width, STAGE.height / CORE_BOUNDS.height);
const camera = { x: 0, y: 0, zoom: overviewZoom };
const hits = $('#hits'), targets = $('#mapTargets');
let drag = null, ignoreClick = false;
let sheetContact = null;

function setCamera(x, y, zoom = camera.zoom) {
  camera.zoom = Math.max(overviewZoom, Math.min(1.4, zoom));
  const viewportW = STAGE.width / camera.zoom, viewportH = STAGE.height / camera.zoom;
  camera.x = viewportW >= MAP.width ? (MAP.width - viewportW) / 2 : Math.max(0, Math.min(MAP.width - viewportW, x));
  camera.y = viewportH >= MAP.height ? (MAP.height - viewportH) / 2 : Math.max(0, Math.min(MAP.height - viewportH, y));
  const transform = `translate(${-camera.x * camera.zoom}px, ${-camera.y * camera.zoom}px) scale(${camera.zoom})`;
  $('#map').style.transform = targets.style.transform = transform;
  app.view?.setCamera(camera.x, camera.y, camera.zoom);
  $('#zoomOut').disabled = camera.zoom <= overviewZoom;
  $('#zoomIn').disabled = camera.zoom >= 1.4;
}

function zoomAround(zoom, screenX = STAGE.width / 2, screenY = STAGE.height / 2) {
  const next = Math.max(overviewZoom, Math.min(1.4, zoom));
  setCamera(camera.x + screenX / camera.zoom - screenX / next, camera.y + screenY / camera.zoom - screenY / next, next);
}
function showCounty() {
  setCamera(CORE_BOUNDS.x + (CORE_BOUNDS.width - STAGE.width / coreZoom) / 2,
    CORE_BOUNDS.y + (CORE_BOUNDS.height - STAGE.height / coreZoom) / 2, coreZoom);
}
$('#countyFocus').addEventListener('click', showCounty);
$('#overview').addEventListener('click', () => setCamera(0, 0, overviewZoom));
$('#frontiers').addEventListener('click', () => openTarget({ type: 'frontier' }));
$('#almanac').addEventListener('click', () => openTarget({ type: 'almanac' }));
$('#zoomOut').addEventListener('click', () => zoomAround(camera.zoom / 1.2));
$('#zoomIn').addEventListener('click', () => zoomAround(camera.zoom * 1.2));
hits.addEventListener('wheel', (event) => {
  if (app.screen !== 'play') return;
  event.preventDefault();
  const rect = hits.getBoundingClientRect();
  zoomAround(camera.zoom * (event.deltaY > 0 ? 1 / 1.12 : 1.12), (event.clientX - rect.left) / stageScale, (event.clientY - rect.top) / stageScale);
}, { passive: false });
hits.addEventListener('pointerdown', (event) => {
  if (app.screen !== 'play' || drag || event.button !== 0) return;
  ignoreClick = false;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moving: false };
});
hits.addEventListener('pointermove', (event) => {
  if (drag?.id !== event.pointerId) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  if (!drag.moving) {
    if (Math.hypot(dx, dy) < 7) return;
    drag.moving = true;
    hits.setPointerCapture(event.pointerId);
    hits.classList.add('dragging');
  }
  const zoom = camera.zoom > overviewZoom ? camera.zoom : Math.min(1.4, overviewZoom * 1.24);
  if (zoom !== camera.zoom) {
    const rect = hits.getBoundingClientRect();
    zoomAround(zoom, (drag.x - rect.left) / stageScale, (drag.y - rect.top) / stageScale);
  }
  setCamera(camera.x - dx / (stageScale * zoom), camera.y - dy / (stageScale * zoom));
  drag.x = event.clientX;
  drag.y = event.clientY;
});
function endDrag(event) {
  if (!drag || (event.pointerId !== undefined && event.pointerId !== drag.id)) return;
  ignoreClick = drag.moving;
  drag = null;
  hits.classList.remove('dragging');
}
addEventListener('pointerup', endDrag);
addEventListener('pointercancel', endDrag);
addEventListener('blur', endDrag);
hits.addEventListener('lostpointercapture', endDrag);
$('#sheet').addEventListener('pointerdown', (event) => { sheetContact ??= event.pointerId; });
function releaseSheetContact(event) {
  if (event.pointerId === undefined || event.pointerId === sheetContact) sheetContact = null;
}
addEventListener('pointerup', releaseSheetContact);
addEventListener('pointercancel', releaseSheetContact);
addEventListener('blur', releaseSheetContact);
hits.addEventListener('click', (event) => {
  if (ignoreClick && event.detail > 0) {
    ignoreClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
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

// ——— The clear buttons over the map ———
function buildHits() {
  const box = targets,
    buttons = [];
  const make = (target, r, label) => {
    const b = el('button', { type: 'button' });
    Object.assign(b.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    b.dataset.target = JSON.stringify(target);
    b.setAttribute('aria-label', label);
    b.addEventListener('focus', () => {
      if (!b.matches(':focus-visible')) return;
      const center = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
      const vx = (center.x - camera.x) * camera.zoom, vy = (center.y - camera.y) * camera.zoom;
      if (vx < 25 || vx > STAGE.width - 25 || vy < 125 || vy > STAGE.height - 80) {
        setCamera(center.x - STAGE.width / (2 * camera.zoom), center.y - STAGE.height / (2 * camera.zoom));
      }
    });
    b.addEventListener('click', () => openTarget(target));
    buttons.push(b);
  };
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
  const focusedTarget = document.activeElement?.dataset?.target;
  box.replaceChildren(...buttons);
  if (focusedTarget) buttons.find((b) => b.dataset.target === focusedTarget)?.focus({ preventScroll: true });
}

// ——— Top bar, goal, raid, taxes ———
const SHOWN = ['coin', 'grain', 'wood', 'stone', 'iron', 'silk', 'porcelain', 'tea', 'wine', 'mulberry', 'clay'];
function paintTop() {
  const s = app.state,
    r = rates(s);
  $('#county').textContent = t('countyLine', { rank: t('r' + s.rank) });
  const season = seasonOf(s), almanac = $('#almanac');
  almanac.textContent = t('season' + season);
  almanac.dataset.season = season;
  almanac.setAttribute('aria-label', t('almanacLabel', { season: t('season' + season) }));
  // The term shows from the second one on.
  $('#term').textContent = s.term ? t('term', { n: s.term + 1 }) : '';
  const net = (k) => (k === 'coin' ? r.tax + r.coin + r.salary : (r.make[k] ?? 0) - (r.use[k] ?? 0));
  $('#resources').replaceChildren(
    ...SHOWN.filter((k) => k === 'coin' || k === 'grain' || s.res[k] > 0 || (r.make[k] ?? 0) > 0).map((k) => {
      const li = el('li', {}, el('span', { textContent: t(k) }), el('b', { textContent: amount(s.res[k]) }), el('small', { textContent: (net(k) >= 0 ? '+' : '') + amount(net(k)) + '/h' }));
      if (net(k) < 0) li.className = 'low';
      return li;
    })
  );
  $('#vitals').replaceChildren(
    el('span', {}, t('pop') + ' ', el('b', { textContent: amount(s.pop) }), ` / ${amount(r.house)}`),
    el('span', {}, t('life') + ' ', el('b', { textContent: Math.round(s.life) })),
    el('span', {}, t('fame') + ' ', el('b', { textContent: amount(s.fame) }))
  );
  const tax = Math.floor(s.pendingTax);
  const bubble = $('#taxBubble');
  bubble.hidden = tax < 1 || app.screen !== 'play';
  bubble.replaceChildren(el('span', { className: 'pill', textContent: '⊙ ' + amount(tax) }));
  bubble.setAttribute('aria-label', `${t('collect')} · ${t('taxWaiting', { n: amount(tax) })}`);
  // The goal.
  const goal = GOALS[s.goal],
    card = $('#goalCard');
  card.hidden = app.screen !== 'play' || !goal;
  if (goal) {
    $('.goalLabel', card).textContent = t('goal');
    $('#goalText').textContent = t('g_' + goal.id);
    const done = goal.check(s);
    const claim = $('#claimButton');
    claim.hidden = !done;
    claim.textContent = `${t('claim')} · ${rewardWords(goal.reward)}`;
  }
  // A raid on the way.
  const banner = $('#raidBanner');
  const soon = s.raid.next && s.raid.next - s.time < RAIDS.warn * 2;
  banner.hidden = app.screen !== 'play' || !soon;
  if (soon) banner.textContent = `${sideName(raidSide(s))} · ${t('nextRaid', { kind: t('raid_' + RAIDS.kinds[s.raid.n % RAIDS.kinds.length]), time: duration(s.raid.next - s.time) })}`;
  const call = $('#petitionCall');
  call.hidden = app.screen !== 'play' || !s.petition;
  if (s.petition) call.textContent = t('petitionWaiting');
  // Tabs with something waiting.
  $('#tabs [data-tab="affairs"]')?.classList.toggle('waiting', Boolean(s.petition));
  const dot = (tab, on) => {
    const b = $(`#tabs [data-tab="${tab}"]`);
    if (!b) return;
    let d = $('.dot', b);
    if (on && !d) b.append(el('span', { className: 'dot', ariaHidden: 'true' }));
    if (!on && d) d.remove();
  };
  dot('affairs', Boolean(s.petition) || Boolean(goal?.check(s)));
  dot('talent', freeRecruit(s) || s.fame >= recruitPrice(s));
  dot('defence', Boolean(soon));
}
const rewardWords = (reward) => Object.entries(reward).map(([k, v]) => `${t(k)} ${amount(v)}`).join(' · ');
const signed = (n) => (n >= 0 ? '+' : '−') + amount(Math.abs(n));

function petitionSheet(s) {
  const { id, season } = s.petition;
  return el('div', { className: 'petition' },
    Number.isInteger(season) ? el('small', { className: 'petitionSeason', textContent: t('season' + season) }) : null,
    el('p', { textContent: t('p_' + id) }),
    el('div', { className: 'petitionChoices' },
      ...['a', 'b'].map((choice) => {
        const offer = rules.petitionOffer(s, choice);
        const detail = Object.entries(offer.delta).filter(([, n]) => n).map(([k, n]) => `${t(k)} ${signed(n)}`);
        if (offer.life) detail.push(t('petitionMood', { n: signed(offer.life), time: duration(offer.duration) }));
        if (offer.sellBoost > 0) detail.push(t('petitionSales', { n: amount(offer.sellBoost * 100), time: duration(offer.duration) }));
        if (offer.talent) detail.push(t('petitionTalent'));
        if (offer.why === 'cost') detail.push(t('petitionCost'));
        return button(t('p' + choice + '_' + id), () => decide(choice), { note: detail.join(' · '), disabled: Boolean(offer.why) });
      })));
}

// ——— Tabs ———
const TABS = ['city', 'build', 'talent', 'affairs', 'defence'];
function paintTabs() {
  $('#tabs').replaceChildren(
    ...TABS.map((tab) => {
      const b = el('button', { type: 'button', role: 'tab', textContent: t('tab' + cap(tab)) });
      b.dataset.tab = tab;
      b.setAttribute('aria-selected', String(app.tab === tab));
      b.addEventListener('click', () => openTab(tab));
      return b;
    })
  );
}
function openTab(tab) {
  app.tab = tab;
  paintTabs();
  app.sound?.play('tap');
  if (tab === 'city') return closeSheet();
  openSheet({ tab });
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
  const sheet = $('#sheet');
  sheet.hidden = false;
  paintSheet();
  sheet.scrollTop = 0;
  ($('#sheetBody .btn:not([aria-disabled="true"]), #sheetBody .choice:not([aria-disabled="true"])') ?? $('.sheetClose'))?.focus({ preventScroll: true });
}
function closeSheet() {
  const was = app.sheet;
  app.sheet = null;
  $('#sheet').hidden = true;
  app.view?.focus(null);
  if (was?.tab) {
    app.tab = 'city';
    paintTabs();
    $(`#tabs [data-tab="${was.tab}"]`)?.focus();
  } else if (was?.type === 'almanac') $('#almanac').focus();
  else if (was?.type === 'frontier') $('#frontiers').focus();
  else if (was) $$('#hits button').find((b) => b.dataset.target === JSON.stringify(was))?.focus();
}
$('.sheetClose').addEventListener('click', closeSheet);

function button(words, onClick, { note = '', disabled = false, kind = '' } = {}) {
  const b = el('button', { type: 'button', className: 'btn ' + kind }, el('span', { textContent: words }), note ? el('small', { textContent: note }) : null);
  if (disabled) b.setAttribute('aria-disabled', 'true');
  b.addEventListener('click', () => {
    if (b.getAttribute('aria-disabled') === 'true') return;
    onClick();
  });
  return b;
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
  const what = app.sheet,
    body = $('#sheetBody');
  if (!what || !app.state) return;
  $('.sheetClose').textContent = t('close');
  const parts = what.tab ? TAB_SHEETS[what.tab]() : TARGET_SHEETS[what.type](what);
  const focusedText = document.activeElement?.closest('#sheetBody') ? document.activeElement.textContent : null;
  body.replaceChildren(...parts.filter(Boolean));
  if (focusedText) $$('#sheetBody button').find((b) => b.textContent === focusedText)?.focus({ preventScroll: true });
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
  return el('div', { className: 'architecture' }, ...levels.map((shown, index) => {
    const key = `${kind}:${shown}:${season}:${facility}:${side}`;
    let image = previewCache.get(key);
    if (!image) {
      image = el('canvas', { width: 320, height: 190 });
      const context = image.getContext('2d');
      const rect = { x: 12, y: 7, w: 296, h: 175 };
      if (facility) paintFacility(context, kind, shown, rect, season, { side });
      else paintBuilding(context, kind, shown, rect, season);
      if (previewCache.size >= 36) previewCache.delete(previewCache.keys().next().value);
      previewCache.set(key, image);
    }
    const canvas = el('canvas', { width: image.width, height: image.height });
    canvas.setAttribute('aria-hidden', 'true');
    canvas.getContext('2d').drawImage(image, 0, 0);
    const caption = rank ? t('r' + shown) : t(proposed || index ? 'nextArchitecture' : 'currentArchitecture', { n: shown });
    return el('figure', {}, canvas, el('figcaption', { textContent: caption }));
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
  if (work) out.push(el('p', { className: 'muted', textContent: work.ends ? t('inWorks', { time: duration(work.ends - s.time) }) : t('waiting') }));
  if (q.price) {
    const next = level + 1,
      milestoneNext = MILESTONES.includes(next);
    out.push(
      button(level === 0 ? t('build') : t('levelUp', { n: next }), () => doUpgrade(target), {
        note: `${priceWords(q.price)} · ${t('works')} ${duration(q.time)}${milestoneNext ? ' · ' + t('milestone') : ''}${q.why ? ' · ' + whyWords({ ...q, rank: spec.rank }, q.price) : ''}`,
        disabled: Boolean(q.why),
        kind: 'primary'
      })
    );
  } else if (q.why) out.push(el('p', { className: 'muted', textContent: whyWords({ ...q, rank: spec.rank }, {}) }));
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
  return el(
    'div',
    { className: 'row' },
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
      el('h2', { textContent: t(key === undefined ? 'harborSites' : 'moveDock') }),
      el('p', { textContent: t(key === undefined ? 'harborHint' : 'moveDockHint') }),
      ...[...byWard].flatMap(([ward, plots]) => {
        const open = rules.wardIsOpen(s, ward);
        const free = plots.filter((index) => !s.plots[index].kind);
        return [
          el('h3', { textContent: t('ward', { n: ward + 1 }) }),
          !open ? button(t('viewHarborWard'), () => showOnMap('ward', ward), { note: t('expandLand'), kind: 'jade' })
            : free.length ? el('div', { className: 'choices' }, ...free.map((index) =>
              button(t('harborLot', { n: index % PLOTS_PER_DISTRICT + 1 }), () => {
                if (key === undefined) return showOnMap('plot', index);
                const result = rules.moveDock(s, key, index);
                if (result.why) return toast(t('harborUnavailable'));
                app.sound.play('chime');
                afterChange(true);
                persist(true);
                showOnMap('plot', index);
              }))) : el('p', { className: 'muted', textContent: t('harborFull') })
        ];
      })
    ];
  },
  almanac() {
    const current = rules.seasonInfo(app.state);
    const seasonEffects = Object.entries(current.effects).flatMap(([key, factor]) => {
      const change = key === 'life' ? factor : Math.round((factor - 1) * 100);
      return change ? [el('li', {}, el('span', { className: 'grow', textContent: t('effect_' + key) }),
        el('b', { textContent: signed(change) + (key === 'life' ? '' : '%') }))] : [];
    });
    return [
      el('h2', { textContent: t('almanacTitle') }),
      el('div', { className: 'almanacSeason' },
        el('b', { textContent: t('season' + current.season) }),
        el('span', { textContent: t('nextSeason', { season: t('season' + current.next), time: duration(current.remaining) }) })),
      el('ul', { className: 'list' }, ...seasonEffects),
      el('p', { className: 'muted', textContent: t('seasonAdvice' + current.season) })
    ];
  },
  plot({ key }) {
    const s = app.state,
      plot = s.plots[key],
      ward = Math.floor(key / PLOTS_PER_DISTRICT);
    if (!plot.kind) {
      const choices = Object.keys(BUILDINGS).sort((a, b) => BUILDINGS[a].rank - BUILDINGS[b].rank);
      return [
        el('h2', { textContent: `${t('ward', { n: ward + 1 })} · ${t('empty')} ${key % PLOTS_PER_DISTRICT + 1}` }),
        el('p', { className: 'muted', textContent: t(rules.RIVERSIDE.has(key) ? 'riverPlotNote' : 'emptyNote') }),
        el(
          'div',
          { className: 'choices' },
          ...choices.map((kind) => {
            const why = canPlace(s, key, kind),
              q = !why ? quote(s, { type: 'plot', key, kind }) : null;
            const note = why === 'rank' ? t('needRank', { rank: t('r' + BUILDINGS[kind].rank) }) : why === 'river' ? t('riverOnly') : q ? `${priceWords(q.price)} · ${duration(q.time)}${q.why ? ' · ' + whyWords(q, q.price) : ''}` : '';
            const plan = plotPlan(s, key, kind);
            const b = el('button', { type: 'button', className: 'choice' }, el('b', { textContent: buildingName(kind) }), el('small', { textContent: buildingAbout(kind) }),
              el('small', { className: 'planScore', textContent: layoutNote(plan) }),
              el('small', { textContent: note }));
            b.dataset.kind = kind;
            if (why || q?.why) b.setAttribute('aria-disabled', 'true');
            b.addEventListener('click', () => {
              if (b.getAttribute('aria-disabled') === 'true') return toast(note);
              doUpgrade({ type: 'plot', key, kind });
              openSheet({ type: 'plot', key });
            });
            return b;
          })
        )
      ];
    }
    const spec = BUILDINGS[plot.kind], inlandDock = plot.kind === 'dock' && !rules.RIVERSIDE.has(key);
    return [
      el('h2', { textContent: `${buildingName(plot.kind)} · ${t('level', { n: plot.level })}` }),
      architecture(plot.kind, plot.level, inlandDock ? plot.level : maxLevel(s)),
      el('p', { textContent: buildingAbout(plot.kind) }),
      el('p', { className: 'muted', textContent: outputWords(plot.kind, Math.max(1, plot.level)) }),
      el('p', { className: 'planScore', textContent: layoutNote(plotPlan(s, key)) }),
      ...upgradeBlock({ type: 'plot', key }, spec, plot.level),
      inlandDock ? button(t('moveDock'), () => openSheet({ type: 'harbor', key }), { note: t('moveDockHint'), kind: 'jade' }) : null,
      postLine({ type: 'plot', key }),
      el('div', { className: 'row' }, button(t('demolish'), () => {
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
        el('h2', { textContent: `${t('ward', { n: key + 1 })} · ${t('expandLand')}` }),
        el('p', { className: 'muted', textContent: t('expandNote') }),
        recommendation ? el('p', { className: 'planScore', textContent: t('recommend' + cap(recommendation)) }) : null,
        quote.cost ? button(t('claimWard'), () => {
          const result = rules.expandWard(s, key);
          if (result.why) return toast(expansionReason(result));
          app.sound.play('chime');
          app.view.built(LAYOUT.wards[key].label);
          afterChange(true);
          persist(true);
        }, { note: [priceWords(quote.cost), expansionReason(quote)].filter(Boolean).join(' · '), disabled: Boolean(quote.why), kind: 'primary' })
        : el('p', { className: 'muted', textContent: expansionReason(quote) })
      ];
    }
    return [
      el('h2', { textContent: `${t('ward', { n: key + 1 })} · ${t('planWard')}` }),
      el('p', { className: 'muted', textContent: t('planNote') }),
      recommendation ? el('p', { className: 'planScore', textContent: t('recommend' + cap(recommendation)) }) : null,
      el(
        'div',
        { className: 'choices' },
        ...[...ZONES, null].map((zone) => {
          const b = el('button', { type: 'button', className: 'choice' }, el('b', { textContent: t(zone ? 'zone' + cap(zone) : 'zoneNone') }), el('small', { textContent: t(zone ? 'note' + cap(zone) : 'clearPlanNote') }));
          b.setAttribute('aria-pressed', String(s.districts[key].zone === zone));
          b.addEventListener('click', () => {
            rules.zone(s, key, zone);
            app.sound.play('tap');
            afterChange();
            closeSheet();
          });
          return b;
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
      el('h2', { textContent: t('expandLand') }),
      el('p', { textContent: t('expandedCount', { n: districtsOpen(s), all: LAYOUT.wards.length }) }),
      el('p', { className: 'muted', textContent: t('expandNote') }),
      options.length ? el('ul', { className: 'list frontierList' }, ...options.map(({ index, quote }) =>
        el('li', {}, button(wardLabel(index), () => showOnMap('ward', index), {
          note: [quote.cost && priceWords(quote.cost), expansionReason(quote)].filter(Boolean).join(' · ')
        })))) : el('p', { textContent: t('allLandClaimed') })
    ];
  },
  node({ key }) {
    const s = app.state,
      node = s.nodes[key];
    if (!node.found) {
      const next = s.nodes.findIndex((n) => !n.found);
      const surveying = s.works.find((w) => w.type === 'survey');
      return [
        el('h2', { textContent: t('hidden') }),
        surveying ? el('p', { className: 'muted', textContent: t('surveyBusy', { time: duration((surveying.ends ?? s.time) - s.time) }) }) : null,
        next >= 0 ? surveyButton() : el('p', { textContent: t('surveyDone') })
      ];
    }
    return [
      el('h2', { textContent: `${buildingName(node.kind)} · ${t('level', { n: node.level })}` }),
      el('p', { textContent: buildingAbout(node.kind) }),
      architecture(node.kind, node.level, maxLevel(s), { facility: true }),
      el('p', { className: 'muted', textContent: outputWords(node.kind, Math.max(1, node.level), NODES[node.kind]) }),
      ...upgradeBlock({ type: 'node', key }, NODES[node.kind], node.level),
      postLine({ type: 'node', key })
    ];
  },
  yamen() {
    const s = app.state,
      need = needFor(s, s.rank + 1),
      works = s.works.find((w) => w.type === 'rank');
    const parts = [
      el('h2', { textContent: t('yamenTitle', { rank: t('r' + s.rank) }) }),
      architecture('yamen', s.rank, FINAL_RANK, { facility: true, rank: true })
    ];
    if (s.pendingTax >= 1) parts.push(button(t('collect'), collect, { note: t('taxWaiting', { n: amount(s.pendingTax) }), kind: 'jade' }));
    if (!need) {
      parts.push(el('p', { textContent: t('topRank') }), el('p', { className: 'muted', textContent: t('promoteNote') }), button(t('promote'), promote, { kind: 'primary' }));
      return parts;
    }
    parts.push(el('h3', { textContent: `${t('rankNeeds')} · ${t('rankUp', { rank: t('r' + (s.rank + 1)) })}` }));
    parts.push(
      el(
        'ul',
        { className: 'needs' },
        ...Object.entries(need).map(([k, v]) => {
          const have = k === 'pop' ? s.pop : k === 'life' ? s.life : s.res[k],
            li = el('li', {}, el('span', { textContent: t(k) }), el('span', { className: 'bar' }, el('i', { style: `width:${Math.min(100, (100 * have) / v)}%` })), el('span', { textContent: `${amount(have)} / ${amount(v)}` }));
          if (have >= v) li.className = 'met';
          return li;
        })
      )
    );
    parts.push(el('p', { className: 'muted', textContent: t('keep') }));
    if (works) parts.push(el('p', { textContent: t('rankBusy', { time: duration(works.ends - s.time) }) }));
    else {
      const probe = rules.rankUp(JSON.parse(JSON.stringify(s)));
      parts.push(button(t('rankUp', { rank: t('r' + (s.rank + 1)) }), doRankUp, { note: `${t('rankWorks', { time: duration(RANKS[s.rank + 1].time) })}${probe.why ? '' : ' · ' + t('rankReady')}`, disabled: Boolean(probe.why), kind: 'primary' }));
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
      el('h2', { textContent: t('choosePost') }),
      s.talents.length ? null : el('p', { textContent: t('noTalents') }),
      el(
        'ul',
        { className: 'list' },
        ...s.talents.map((talent) =>
          el(
            'li',
            {},
            el('span', { className: 'grow', textContent: `${t('t_' + talent.id)} · ${talentLine(talent)}` }),
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
    el('h2', { textContent: `${targetName(target)} · ${t('level', { n: level })}` }),
    target.type === 'wall' ? null : architecture(target.type === 'tower' ? 'gate' : 'camp', level, maxLevel(s), { facility: true, side }),
    el('p', { textContent: target.type === 'tower' ? t('gateNote') : t('about_' + target.type) }),
    el('p', { className: 'muted', textContent: `${t('power', { n: amount(defencePower(s, side)) })} · ${t('defenceAdd', { n: amount(spec.power) })}` }),
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
  return el('div', { className: 'troopControls' },
    el('b', { textContent: t('troopsHere', { n: stationed }) }),
    el('span', { textContent: t('troopsReserve', { n: reserve }) }),
    troopCapacity(s) ? null : el('p', { className: 'muted', textContent: t('needRank', { rank: t('r' + DEFENCE.wall.rank) }) }),
    el('div', { className: 'row' },
      button(t('deployTroop'), () => send(1), { disabled: reserve === 0, kind: 'jade' }),
      button(t('recallTroop'), () => send(-1), { disabled: stationed === 0 })));
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
      el('h2', { textContent: t('worksTitle') }),
      button(t('expandLand'), () => openSheet({ type: 'frontier' }), { kind: 'jade' }),
      button(t('harborSites'), () => openSheet({ type: 'harbor' }), { kind: 'jade' }),
      el('p', { className: 'muted', textContent: t('choosePlotHint') }),
      el('p', { className: 'planScore', textContent: t('countyLayout', { n: Math.round(rates(s).planning.efficiency * 100) }) }),
      el('p', { className: 'muted', textContent: t('builders', { busy: busy(s), all: builders(s), queued: rules.queued(s), cap: builders(s) * rules.QUEUE_PER_BUILDER }) }),
      s.works.length
        ? el('ul', { className: 'list' }, ...s.works.map((w) => el('li', {}, el('span', { className: 'grow', textContent: workName(w) }), el('span', { className: 'muted', textContent: w.ends ? duration(w.ends - s.time) : t('waiting') }))))
        : el('p', { textContent: t('noWorks') }),
      el('div', { className: 'row' }, surveyButton()),
      el('h3', { textContent: t('upgrade') }),
      el(
        'ul',
        { className: 'list' },
        ...items.map(({ target, name, level }) => {
          const q = quote(s, target);
          return el(
            'li',
            {},
            el('span', { className: 'grow', textContent: `${name} · ${t('level', { n: level })}` }),
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
      el('h2', { textContent: t('tabTalent') }),
      el('p', { className: 'muted', textContent: t('recruitNote') }),
      el('div', { className: 'row' }, button(free ? t('recruitFree') : t('recruitCost', { n: amount(price) }), doRecruit, { disabled: !free && s.fame < price, kind: 'primary' })),
      el('h3', { textContent: `${t('office_deputy')} · ${t('office_registrar')} · ${t('office_sheriff')}` }),
      ...Object.keys(OFFICES).map((office) => {
        const holder = s.talents.find((x) => x.post?.type === 'office' && x.post.key === office);
        return el('div', { className: 'row' }, button(`${t('office_' + office)}: ${holder ? t('t_' + holder.id) : t('unposted')}`, () => openSheet({ type: 'pick', place: { type: 'office', key: office }, back: { tab: 'talent' } }), { note: t('officeNote_' + office) }));
      }),
      el('h3', { textContent: t('roster', { n: s.talents.length }) }),
      s.talents.length ? null : el('p', { textContent: t('noTalents') }),
      ...s.talents.map((talent) => {
        const spec = TALENTS.find((x) => x.id === talent.id);
        return el(
          'div',
          { className: 'talent' },
          el('span', { className: 'portrait r-' + spec.rarity, textContent: t('t_' + talent.id).slice(0, 1) }),
          el(
            'div',
            {},
            el('b', { textContent: t('t_' + talent.id) }),
            el('div', { className: 'stats', textContent: `${talentLine(talent)} · ${['rule', 'farm', 'craft', 'trade', 'arms'].map((k, i) => `${t('stat_' + k)}${spec.stats[i]}`).join(' ')}` }),
            el('div', { className: 'stats', textContent: [Object.keys(spec.gift).map((g) => t('gift_' + g)).join(' · '), talent.post ? t('postedAt', { where: placeName(talent.post) }) : t('unposted')].filter(Boolean).join(' · ') })
          ),
          el('span')
        );
      })
    ];
  },
  affairs() {
    const s = app.state,
      goal = GOALS[s.goal];
    const parts = [el('h2', { textContent: t('tabAffairs') })];
    parts.push(el('h3', { textContent: t('goal') }));
    if (goal) {
      parts.push(el('p', { textContent: `${t('g_' + goal.id)} · ${t('goalReward', { what: rewardWords(goal.reward) })}` }));
      if (goal.check(s)) parts.push(button(t('claim'), claim, { kind: 'jade' }));
    } else parts.push(el('p', { textContent: t('allGoals') }));
    parts.push(el('h3', { textContent: t('petition') }));
    if (s.petition) parts.push(petitionSheet(s));
    else parts.push(el('p', { className: 'muted', textContent: t('noPetition') }));
    parts.push(el('h3', { textContent: t('log') }));
    parts.push(el('ul', { className: 'list' }, ...s.log.slice(0, 12).map((entry) => el('li', {}, el('span', { className: 'grow', textContent: logWords(entry) })))));
    return parts;
  },
  defence() {
    const s = app.state;
    const parts = [el('h2', { textContent: t('defenceTitle') }), el('p', { textContent: t('defenceHint') })];
    if (s.raid.next) {
      parts.push(el('p', { textContent: `${sideName(raidSide(s))} · ${t('nextRaid', { kind: t('raid_' + RAIDS.kinds[s.raid.n % RAIDS.kinds.length]), time: duration(s.raid.next - s.time) })} · ${t('enemyPower', { n: amount(raidPower(s)) })}` }));
      const inWindow = s.raid.next - s.time <= RAIDS.warn;
      parts.push(button(s.raid.drums ? t('drumsOn') : t('drums'), beatDrums, { disabled: s.raid.drums || !inWindow, note: inWindow ? '' : t('drumsLater'), kind: 'primary' }));
    } else parts.push(el('p', { className: 'muted', textContent: t('noRaid') }));
    parts.push(...SIDES.map((_, key) => el('article', { className: 'defenceSide' },
      el('h3', { textContent: `${sideName(key)} · ${t('power', { n: amount(defencePower(s, key)) })}` }),
      el('div', { className: 'row' },
        button(t('wall'), () => openTarget({ type: 'wall', key }), { note: t('level', { n: s.defence.wall[key] }) }),
        button(t('gatehouse'), () => openTarget({ type: 'tower', key }), { note: t('level', { n: s.defence.tower[key] }) })),
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
  save.update((data) => {
    recordTerm(data, (s.time - s.started) / HOUR);
  });
  app.state = next;
  afterChange(true);
  closeSheet();
}

$('#taxBubble').addEventListener('click', collect);
$('#claimButton').addEventListener('click', claim);
$('#raidBanner').addEventListener('click', () => openTab('defence'));
$('#petitionCall').addEventListener('click', () => {
  openTab('affairs');
  const petition = $('.petition');
  petition?.scrollIntoView({ block: 'nearest' });
  $('button:not([aria-disabled="true"])', petition ?? $('#sheetBody'))?.focus({ preventScroll: true });
});

// ——— Toasts ———
function toast(words) {
  if (!words) return;
  const box = $('#toasts');
  const node = el('div', { className: 'toast', textContent: words });
  box.append(node);
  setTimeout(() => node.remove(), 3700);
  while (box.children.length > 3) box.firstChild.remove();
}

// ——— The clock ———
function afterChange(full = false, ticking = false) {
  paintMap(full);
  if (full || app.hitsKey !== hitsKey()) {
    buildHits();
    app.hitsKey = hitsKey();
  }
  paintTop();
  if (app.sheet && (!ticking || (sheetContact === null && Math.floor(app.state.time) % 3 === 0))) paintSheet();
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
      app.sound.play(raid.won ? 'win' : 'lose');
      toast(raid.won ? t('raidWon', { kind, coin: amount(raid.loot) }) : t('raidLost', { kind }));
    });
  }
  if (report.petitions) toast(t('petition'));
}

let lastPersist = 0;
function persist(force = false) {
  const at = Date.now();
  if (!force && at - lastPersist < 5000) return;
  lastPersist = at;
  const county = JSON.parse(JSON.stringify(app.state));
  save.update((data) => {
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
  const lines = [el('p', { textContent: t('awayFor', { time: duration(away) }) }), el('p', { className: 'muted', textContent: t('awayCounted', { time: duration(Math.min(away, offlineCap(s))) }) })];
  const made = Object.entries(report.made).filter(([, v]) => v >= 1);
  if (made.length) lines.push(el('p', { textContent: `${t('awayMade')}：${made.map(([k, v]) => `${t(k)} ${amount(v)}`).join(' · ')}` }));
  if (report.sold >= 1) lines.push(el('p', { textContent: t('awaySold', { n: amount(report.sold) }) }));
  if (report.tax >= 1) lines.push(el('p', { textContent: t('awayTax', { n: amount(s.pendingTax) }) }));
  if (report.works.length) lines.push(el('p', { textContent: t('awayWorks', { n: report.works.length }) }));
  if (report.raids.length) lines.push(el('p', { textContent: t('awayRaids', { won: report.raids.filter((r) => r.won).length, lost: report.raids.filter((r) => !r.won).length }) }));
  $('#awayTitle').textContent = t('welcomeBack');
  $('#awayBody').replaceChildren(...lines);
  $('#awayOk').textContent = t('ok');
  $('#away').hidden = false;
  $('#awayOk').focus();
  afterChange(true);
}
$('#awayOk').addEventListener('click', () => {
  $('#away').hidden = true;
  $('#taxBubble').focus();
});

// ——— Title and settings ———
function paintTitle() {
  document.title = t('pageTitle');
  $('#titleName').textContent = t('title');
  $('#tagline').textContent = t('tagline');
  $('#demoLine').textContent = t('demo');
  $('#overview').textContent = t('mapOverview');
  $('#countyFocus').textContent = t('mapCounty');
  $('#frontiers').textContent = t('expandLand');
  $('#hits').setAttribute('aria-label', t('mapControls'));
  $('#zoomIn').setAttribute('aria-label', t('mapZoomIn'));
  $('#zoomOut').setAttribute('aria-label', t('mapZoomOut'));
  $('#rotateHint').textContent = t('rotateHint');
  $('#startButton').textContent = save.data.county ? t('continue') : t('start');
  $('#titleSettings').textContent = t('settings');
  const lang = $('#languageButton');
  lang.textContent = getLanguage() === 'zh' ? t('english') : t('chinese');
  lang.setAttribute('aria-label', t('switchLanguage'));
  const notice = $('#title .notice'),
    words = [problems.some((p) => ['corrupt', 'unreadable', 'invalid', 'too-new'].includes(p)) ? t('saveBroken') : '', problems.includes('write-failed') ? t('saveRefused') : ''].filter(Boolean);
  notice.hidden = !words.length;
  notice.textContent = words.join(' ');
  $('#settingsButton').replaceChildren(el('span', { className: 'pill', textContent: t('settings') }));
}
function paintSettings() {
  const s = save.data.settings,
    list = $('#settings .settingsList');
  $('#settingsTitle').textContent = t('settings');
  const rows = [
    ['sound', t('sound'), t(s.sound ? 'on' : 'off')],
    ['music', t('music'), t(s.music ? 'on' : 'off')],
    ['reducedMotion', t('reducedMotion'), t(s.reducedMotion ? 'on' : 'off')],
    ['language', t('switchLanguage'), getLanguage() === 'zh' ? t('english') : t('chinese')]
  ];
  list.replaceChildren(
    ...rows.flatMap(([key, label, value], i) => {
      const name = el('span', { textContent: label, id: 'set' + i });
      const b = el('button', { type: 'button', textContent: value, id: 'set' + i + 'v' });
      b.setAttribute('aria-labelledby', `set${i} set${i}v`);
      b.addEventListener('click', () => {
        if (key === 'language') switchLanguage();
        else
          save.update((data) => {
            data.settings[key] = !data.settings[key];
          });
        if (key === 'sound') app.sound.setSound(save.data.settings.sound);
        if (key === 'music') app.sound.setMusic(save.data.settings.music);
        if (key === 'reducedMotion' && app.game) app.game.reducedMotion = save.data.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
        paintSettings();
        $('#set' + i + 'v').focus();
      });
      return [name, b];
    })
  );
  $('#settings .closeButton').textContent = t('close');
}
function openSettings(from) {
  paintSettings();
  $('#settings').hidden = false;
  $('#settings').returnTo = from;
  $('#settings button').focus();
}
$('#settings .closeButton').addEventListener('click', () => {
  $('#settings').hidden = true;
  $('#settings').returnTo?.focus();
});
$('#settingsButton').addEventListener('click', () => openSettings($('#settingsButton')));
$('#titleSettings').addEventListener('click', () => openSettings($('#titleSettings')));
function switchLanguage() {
  const next = getLanguage() === 'zh' ? 'en' : 'zh';
  setLanguage(next);
  save.update((data) => {
    data.settings.language = next;
  });
}
$('#languageButton').addEventListener('click', () => {
  switchLanguage();
  $('#languageButton').focus();
});
onLanguage(() => {
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  paintTitle();
  paintTabs();
  if (!$('#settings').hidden) paintSettings();
  if (app.screen === 'play') afterChange(true);
});

$('#startButton').addEventListener('click', (event) => {
  app.sound.start();
  if (!app.state) app.state = rules.createCounty({ seed: Number(params.get('seed') ?? Math.floor(Math.random() * 1e6)), now: now() });
  app.screen = 'play';
  $('#title').hidden = true;
  $('#mapTools').hidden = false;
  app.view.setCountyActivity(app.state);
  afterChange(true);
  welcomeBack();
  // From the keyboard the focus goes on to the map; after a click or a tap it is let go, so no frame shows.
  if (!$('#away').hidden) return;
  if (event.detail === 0) ($('#taxBubble:not([hidden])') ?? $('#hits button'))?.focus();
  else document.activeElement?.blur();
});

// ——— Keys ———
// play takes Tab, Space and the arrows on the window for its own keys; this game reads none of play's keys, so every
// key is caught first and kept from play (ENGINE-NOTES 1).
addEventListener(
  'keydown',
  (event) => {
    event.stopPropagation();
    if (event.key !== 'Escape') {
      if (hits.contains(document.activeElement)) panKey(event);
      return;
    }
    if (!$('#settings').hidden) return $('#settings .closeButton').click();
    if (!$('#away').hidden) return $('#awayOk').click();
    if (app.sheet) return closeSheet();
  },
  true
);

// ——— Start ———
async function boot() {
  fit();
  const game = await play({
    width: STAGE.width * 0.75, height: STAGE.height * 0.75, parent: $('#stage'), transparent: true,
    update: (seconds) => { if (app.screen === 'play') app.view.update(Math.min(0.1, seconds)); },
    onError: (error) => console.error(error)
  });
  // The holder play makes under a clear canvas is black; the map shows through (ENGINE-NOTES 2).
  if (game.canvas.parentElement) game.canvas.parentElement.style.background = 'transparent';
  game.reducedMotion = save.data.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  app.game = game;
  app.view = createView(game);
  showCounty();
  app.sound = createSound(game, { sound: save.data.settings.sound, music: save.data.settings.music });
  const saved = save.data.county;
  app.state = saved && countyLooksRight(saved) ? JSON.parse(JSON.stringify(saved)) : null;
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  paintTitle();
  paintTabs();
  $('#loading').hidden = true;
  $('#title').hidden = false;
  app.screen = 'title';
  $('#startButton').focus();
  setInterval(tick, 1000);
  app.ready = true;
  // The cover is enough for the title. Decode the world painting after controls are ready.
  requestAnimationFrame(() => { void loadTerrain().then(() => paintMap(true)); });
}

/** For tests: the app, the rules and a clock that can be moved on. */
window.peach = {
  app,
  rules,
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
