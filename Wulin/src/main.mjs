// Wulin: lead a sect, raise its disciples, and win the martial world.
//
// This file is the page. It draws the game as screens and passes the player's
// choices on to the rules; it decides nothing itself. The other modules:
//   data/              the map, sects, arts, buildings and goods
//   core/world.mjs     what a day does (no page needed)
//   core/battle.mjs    a fight (no page needed)
//   core/persons.mjs   people and how they grow
//   core/save.mjs      saves, in the browser and as files
//   core/editor.mjs    the built-in editor (F8 twice)
//   ui/kit.mjs         buttons, tags and the other small pieces of a screen
//   view/              the 3D picture: a stronghold (seat.mjs) and a fight (arena.mjs)
//   ../art-handoff/    portraits, scene paintings and the interface's style sheets
// The 3D modules are loaded once a game starts, and where a device cannot draw
// them the scene paintings stand in and fights are settled in writing.
import { artUrl, loadArt, portraitUrl } from '../art-handoff/assets.mjs';
import { ART_BY_ID, ARTS, CLASSES, levelOf, unmetNeeds } from './data/arts.mjs';
import { BUILDINGS, ECONOMY } from './data/goods.mjs';
import { PLACES, PLACE_BY_ID, RESOURCE_NAMES, RESOURCES } from './data/places.mjs';
import { RANKS, SECTS, SECT_BY_ID } from './data/sects.mjs';
import { createBattle } from './core/battle.mjs';
import { createEditor, describeItem, doublePress } from './core/editor.mjs';
import { APT_NAMES, STAT_KEYS, STAT_NAMES, hpMax, learnableArts, prowess } from './core/persons.mjs';
import { createRng } from './core/rng.mjs';
import { createSlots, deserialize, saveFileName, serialize } from './core/save.mjs';
import {
  advanceDay, assaultSides, beds, build, createWorld, dateText, gift, ledger, membersOf, placesOf, promote, recruit,
  relocate, residents, setJob, setMaster, settle, settleAssault, strength, upgrade, usedCells,
} from './core/world.mjs';
import { btn, esc, fact, formRow, icon, meter, mount, num, panelTitle, pill, resource, screenHead, tag } from './ui/kit.mjs';

const app = document.querySelector('#app'),
  park = document.querySelector('#park'),
  viewBox = document.querySelector('#view'),
  dialog = document.querySelector('#dialog'),
  announcement = document.querySelector('#announcement');
const slots = createSlots(localStorage);

/** What the page is showing; the world itself is in `world`. */
const ui = {
  page: 'title',
  /** The sect picked on the choosing screen. */
  chosen: 'shaolin',
  speed: 0,
  /** The sheet open over the page, or null. */
  sheet: null,
  notice: '',
  /** The stronghold on the seat screen and the building picked there. */
  place: null,
  building: 0,
  tall: false,
  /** The roster: who is picked, the filter, the search and the ticked rows. */
  person: null,
  rank: '全部',
  search: '',
  batch: new Set(),
  /** The map: the stronghold picked and how the map is moved and zoomed. */
  mapPlace: null,
  map: { zoom: 1, x: 0, y: 0 },
  logFilter: '全部',
  artTier: '全部',
  art: null,
  /** A fight being played, and the account of the last one. */
  fight: null,
  lastFight: null,
  taps: 0,
  tapAt: 0,
};
let world = null;
/** The portraits and scene paintings, once their list has loaded. */
let art = null;
const editor = createEditor(() => world, (next) => (world = next));
/** State for the browser console and for automated checks; the game never reads it. */
globalThis.__wulin = { get world() { return world; }, ui, get picture() { return picture; } };

function fail(cause) {
  const box = document.querySelector('#error');
  box.textContent = '出错了 / Error: ' + (cause?.message ?? cause);
  box.hidden = false;
  console.error(cause);
}
window.addEventListener('error', (event) => fail(event.error ?? event.message));

const me = () => world.playerSect;
const books = () => world.sects[me()];
const autoLabel = () => `${SECT_BY_ID[me()].name} ${dateText(world)}`;
const dayText = (day) => `承和${1 + Math.floor(day / 360)}年${1 + Math.floor((day % 360) / 30)}月${1 + (day % 30)}日`;

function toast(text) {
  if (!text) return;
  announcement.textContent = text;
  announcement.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (announcement.hidden = true), 3600);
}
/** Reports the result of an action: the reason when refused, `okText` when done. */
const say = (result, okText = '') => (toast(result.ok ? okText : result.why), result.ok);

// ---- portraits and paintings ---------------------------------------------------------------------------

const sceneStyle = (name) => (art?.assets?.[name] ? `--scene-image: url('${esc(artUrl(art.assets[name]))}')` : '');
const sceneImage = (name) => `<div class="scene-image" style="${sceneStyle(name)}"></div>`;

/**
 * A person's face. People with a portrait of their own get it; everyone else
 * gets the first character of their name on their sect's colour.
 * @param view 'bust' or 'full'
 */
function face(person, css = 'avatar-small', view = 'bust') {
  const url = art && person ? portraitUrl(art, person, { view }) : undefined;
  const color = SECT_BY_ID[person?.school]?.color ?? '#5a5e48';
  const initial = esc((person?.name ?? '？')[0]);
  if (!url) return `<span class="person-monogram ${css}" style="--portrait-base:${color}">${initial}</span>`;
  return `<span class="portrait ${css}" style="--portrait-base:${color}"><span class="portrait-fallback">${initial}</span><img src="${esc(url)}" alt="" loading="lazy" decoding="async" onerror="this.hidden=true"></span>`;
}
/** The founding leader of a sect, for screens shown before a world exists. */
const founder = (sect) => ({ school: sect.id, name: sect.leader.name, origin: '掌门' });
const leaderOf = (sectId) => world.persons[world.sects[sectId].leaderId];

// ---- the 3D picture ----------------------------------------------------------------------------------

/** `stage` is null until a game starts, and stays null where 3D cannot be drawn. */
const picture = { stage: null, seat: null, tried: false, modules: null };
const storedQuality = () => {
  try {
    return localStorage.getItem('wulin-quality');
  } catch {
    return null;
  }
};

async function startPicture() {
  if (picture.tried) return;
  picture.tried = true;
  try {
    const [stageModule, seatModule, arenaModule] = await Promise.all([import('./view/stage.mjs'), import('./view/seat.mjs'), import('./view/arena.mjs')]);
    picture.modules = { ...stageModule, ...seatModule, ...arenaModule };
    const quality = picture.modules.pickQuality(undefined, storedQuality());
    picture.stage = await picture.modules.createStage(document.querySelector('#stage'), { quality, onError: (cause) => console.warn('3D:', cause) });
  } catch (cause) {
    console.warn('3D unavailable:', cause);
  }
  render();
}

/** Moves the 3D picture into the frame the screen left for it, and shows the right scene there. */
function syncPicture() {
  const { stage } = picture;
  const slot = stage && world ? app.querySelector('[data-stage]') : null;
  if (!slot) {
    if (viewBox.parentElement !== park) park.append(viewBox);
    stage?.sleep(true);
    return;
  }
  if (viewBox.parentElement !== slot) slot.append(viewBox);
  stage.sleep(false);
  if (slot.dataset.stage === 'battle') return void (stage.current !== ui.fight?.arena && ui.fight && stage.show(ui.fight.arena));
  if (picture.seat?.placeId !== ui.place || picture.seat.world !== world) {
    picture.seat = picture.modules.createSeat(stage, () => world, ui.place);
    picture.seat.world = world;
    stage.show(picture.seat);
  } else {
    if (stage.current !== picture.seat) stage.show(picture.seat);
    picture.seat.refresh();
  }
}

// ---- before a game: the title and the choice of sect ----------------------------------------------------

function titleScreen() {
  return `<main class="title-screen" style="${sceneStyle('title')}">
    <div class="title-nav"><span class="seal"><span>武</span><span>林</span></span></div>
    <div class="title-copy"><p class="title-era">大昭 · 承和元年</p><h1>武林<span>天下</span></h1><p>禁武令既下，江湖风雨欲来。<br>择一门派，兴建山门，教养弟子，问鼎武林。</p>
      <div class="title-actions">${btn('开创新局', 'page', { page: 'sects' }, 'gold-button', 'arrow')}${btn('载入存档', 'sheet', { kind: 'load' }, 'on-dark', 'box')}</div>
    </div>
    <div class="title-version">为新白鹭引擎开发的 Demo</div>
  </main>`;
}

function sectScreen() {
  const sect = SECT_BY_ID[ui.chosen];
  const standing = ['邪', '中立', '正'][sect.standing + 1];
  return `<main class="sect-screen">
    <div class="sect-screen-head">${btn('返回标题', 'page', { page: 'title' }, 'ghost', 'back')}<span class="seal"><span>武</span><span>林</span></span></div>
    <div class="sect-select-layout">
      <section><h1>择一门派</h1><p class="subtitle">从十二门派中择一执掌。各派据点、武学和经营路数有所不同。</p>
      <div class="sect-grid" data-region="sect-grid">${SECTS.map((s) => `<button class="sect-choice ${s.id === sect.id ? 'is-active' : ''}" data-act="choose-sect" data-sect="${s.id}" aria-pressed="${s.id === sect.id}">
        ${face(founder(s), 'sect-thumb')}<span><b>${esc(s.name)}</b><small>${esc(PLACE_BY_ID[s.seat].name)}</small></span></button>`).join('')}</div></section>
      <div class="region" data-region="sect-feature"><article class="sect-feature" style="--sect-accent:${sect.color}">
        <div class="sect-feature-art">${sceneImage('title')}${face(founder(sect), 'sect-hero', 'full')}<div class="sect-feature-shade"></div></div>
        <div class="sect-feature-copy"><div class="line-between">${tag(standing, standing === '正' ? 'positive' : 'plain')}<span class="caption">${esc(PLACE_BY_ID[sect.seat].name)} · 总舵</span></div>
          <h2>${esc(sect.name)}</h2><p class="sect-master">掌门 · ${esc(sect.leader.name)}（${sect.leader.age} 岁）</p><p>${esc(sect.role)}。${esc(PLACE_BY_ID[sect.seat].note)}。</p>
          <p class="caption">主修${CLASSES[sect.main].name}，兼修${CLASSES[sect.second].name}</p>
          <label class="check-row"><input type="checkbox" id="succession" ${ui.succession ? 'checked' : ''}> 世代更替（人物会老去，掌门需传位）</label>
          ${btn('入主山门', 'new', { sect: sect.id }, 'primary', 'arrow')}
        </div>
      </article></div>
    </div>
  </main>`;
}

// ---- the frame of a game in progress --------------------------------------------------------------------

const TABS = [['seat', '山门', 'gate'], ['disciples', '弟子', 'people'], ['world', '江湖', 'map'], ['battle', '战阵', 'swords'], ['chronicle', '纪事', 'scroll'], ['saves', '存档', 'box']];

function shell(content) {
  const sect = SECT_BY_ID[me()],
    b = books();
  const speed = ([value, label, glyph]) => `<button data-act="speed" data-speed="${value}" class="${ui.speed === value ? 'is-active' : ''}" aria-pressed="${ui.speed === value}" title="${label}">${glyph ? icon(glyph) : label}</button>`;
  const current = ui.page === 'arts' ? 'disciples' : ui.page;
  const end = world.outcome ? `<div class="notice">${{ 'won-conquest': '一统江湖！', 'won-summit': '武林大会推举你为盟主！', 'won-court': '朝廷封你为武林都指挥使，禁武令自此废除。', lost: '本门已不复存在。' }[world.outcome.result] ?? ''}</div>` : '';
  return `<div class="shell">
    <aside class="nav" aria-label="主要功能">
      <button class="nav-logo" data-act="page" data-page="saves" aria-label="存档"><span class="seal"><span>武</span><span>林</span></span></button>
      <nav class="nav-list" data-region="nav">${TABS.map(([id, label, glyph]) => `<button class="nav-button ${current === id ? 'is-active' : ''}" data-act="page" data-page="${id}" ${current === id ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span></button>`).join('')}</nav>
      <button class="nav-button nav-bottom" data-act="sheet" data-kind="settings">${icon('settings')}<span>设置</span></button>
    </aside>
    <header class="topbar" data-region="top">
      <div class="top-identity"><span class="sect-stamp" style="background:${sect.color}">${esc(sect.name[0])}</span><div><strong>${esc(sect.name)}</strong><button class="date-button" data-act="date" title="日期">${dateText(world)}</button></div></div>
      <div class="resources">${resource('coin', '银两', b.silver, '两')}${resource('grain', '粮草', b.grain, '石')}${resource('banner', '威望', b.renown)}${resource('balance', '正邪', b.virtue)}</div>
      <div class="speeds" role="group" aria-label="时间速度">${[[0, '暂停', 'pause'], [1, '行'], [4, '快'], [16, '疾']].map(speed).join('')}</div>
    </header>
    <main class="main" id="main"><div class="region" data-region="notice">${end}${ui.notice ? `<div class="notice">${esc(ui.notice)}</div>` : ''}</div>${content}</main>
  </div>`;
}

// ---- the seat ------------------------------------------------------------------------------------------

const dots = (grade) => `${'●'.repeat(grade)}${'<i>○</i>'.repeat(3 - grade)}`;
const topAptitude = (person) => Object.entries(person.apt).sort((a, b) => b[1] - a[1])[0];

function seatScreen() {
  const placeId = ui.place,
    place = world.places[placeId],
    spec = PLACE_BY_ID[placeId],
    sect = SECT_BY_ID[me()];
  const mine = placesOf(world, me());
  const here = residents(world, placeId),
    leader = leaderOf(me()),
    row = ledger(world, me());
  ui.building = Math.min(ui.building, place.buildings.length - 1);
  const picked = place.buildings[ui.building],
    kind = BUILDINGS[picked.kind];
  const cost = kind.cost * (picked.level + 1);
  const seat = spec.id === sect.seat ? '总舵' : '分舵';
  const status = b_status(place, here);
  const switcher = mine.length > 1 ? `<div class="place-switch">${mine.map((id) => pill(PLACE_BY_ID[id].name, 'look', { place: id }, id === placeId)).join('')}</div>` : '';
  return `<div class="region" data-region="seat-head">${screenHead('山门', spec.name, `${sect.name}${seat} · ${spec.note}`, switcher + btn('兴建建筑', 'sheet', { kind: 'build' }, 'primary', 'plus'))}</div>
    <div class="seat-layout">
      <section class="scene-panel seat-panel ${ui.tall ? 'is-tall' : ''}" aria-label="山门">
        <div class="stage-slot" data-stage="seat">${sceneImage('seat')}</div>
        <div class="region" data-region="seat-over">
          <div class="scene-top"><div class="scene-chip">${icon('pin')}<span>${esc(spec.name)}${seat}</span></div><div class="scene-status"><span></span>${status}</div></div>
          ${picture.stage ? `<div class="scene-zoom" role="group" aria-label="山门视角"><button data-act="zoom" data-dir="in" aria-label="拉近">${icon('plus')}</button><button data-act="zoom" data-dir="out" aria-label="拉远">${icon('minus')}</button><button data-act="zoom" data-dir="reset" aria-label="恢复全景">${icon('frame')}</button></div>` : ''}
          <div class="scene-bottom"><span>${icon('layers')} ${picture.stage ? '拖动转视角，滚轮或双指缩放' : '山门全景'}</span><button class="scene-overlay-button" data-act="tall">${ui.tall ? '收起画面' : '展开画面'}</button></div>
        </div>
      </section>
      <aside class="seat-side" data-region="seat-side">
        <section class="panel leader-panel">
          <div class="leader-visual">${sceneImage('title')}${face(leader, 'leader-image', 'full')}<div class="leader-shade"></div><div class="leader-copy">${tag(leader?.place === placeId ? '掌门在位' : `掌门在${PLACE_BY_ID[leader?.place]?.name ?? '外'}`, 'dark-tag')}<h2>${esc(leader?.name ?? '')}</h2><p>${esc(sect.role.split('，')[0])}</p></div></div>
          <div class="leader-footer"><div><span>驻此弟子</span><b>${here.length}<small> 人</small></b></div><div><span>全派</span><b>${row.members}<small> 人</small></b></div><button class="icon-link" data-act="page" data-page="disciples" aria-label="查看弟子">${icon('arrow')}</button></div>
        </section>
        <section class="panel recruit-panel">${panelTitle('招贤榜', tag(place.applicants.length ? `${place.applicants.length} 人求见` : '无人求见', place.applicants.length ? 'positive' : 'plain'))}
          <div class="recruit-list">${place.applicants.slice(0, 4).map((p, i) => `<div class="recruit-content"><div class="recruit-avatar">${icon('people')}</div><div><h3>${esc(p.name)}</h3><p>${esc(p.origin)} · ${p.age}岁 · ${APT_NAMES[topAptitude(p)[0]]}资质 ${topAptitude(p)[1]}</p></div>${btn('会见', 'sheet', { kind: 'applicant', index: i }, 'outline')}</div>`).join('') || '<div class="recruit-content"><p>榜前无人。威望越高，来投的人越多、资质越好。</p></div>'}</div>
        </section>
      </aside>
    </div>
    <div class="seat-bottom" data-region="seat-bottom">
      <section class="panel"><div class="panel-title"><h2>据点总览</h2><span class="caption">每旬结算</span></div>
        <div class="stat-grid"><div><span>建筑用地</span><b>${usedCells(world, placeId)}<small> / ${spec.cells}</small></b></div><div><span>厢房床位</span><b>${here.length}<small> / ${beds(world, placeId)}</small></b></div><div><span>全派薪俸</span><b>${row.wages}<small> 两</small></b></div><div><span>朝廷关系</span><b>${Math.round(books().court)}</b></div></div>
        <div class="terrain-list">${RESOURCES.map((key) => `<span>${RESOURCE_NAMES[key]} <strong>${dots(spec.resources[key])}</strong></span>`).join('')}</div>
        <div class="stock-line">库存：${RESOURCES.map((key) => `${RESOURCE_NAMES[key]} ${Math.round(books().res[key])}`).join(' · ')}</div>
      </section>
      <section class="panel building-panel">${panelTitle('建筑管理', tag(`${place.buildings.length} 座`))}
        <div class="building-switch" role="group" aria-label="现有建筑">${place.buildings.map((b, i) => pill(`${BUILDINGS[b.kind].name}${b.level > 1 ? ' ' + b.level : ''}`, 'building', { index: i }, i === ui.building)).join('')}</div>
        <div class="building-detail"><div><h3>${esc(kind.name)} ${tag(`${picked.level}级`)}</h3><p>${esc(kind.does)} · 占地 ${kind.cells} 格</p></div>${picked.level < kind.max ? btn(`升至${picked.level + 1}级（${num(cost)}两）`, 'upgrade', { index: ui.building }, 'outline') : tag('已满级', 'positive')}</div>
      </section>
    </div>`;
}

/** One line on how a stronghold is doing. */
function b_status(place, here) {
  if (books().grain <= 0) return '粮草告急';
  if (books().silver < ledger(world, me()).wages) return '银两不足发薪';
  if (here.some((person) => person.loyalty < 30)) return '有人心生去意';
  if (place.applicants.length) return '有客求见';
  return '山门安定';
}

// ---- the roster ----------------------------------------------------------------------------------------

function jobText(person) {
  const job = person.job ?? { kind: 'rest' };
  if (job.kind === 'train') return '修练 ' + (ART_BY_ID[job.art]?.name ?? '');
  if (job.kind === 'seclude') return `闭关悟 ${ART_BY_ID[job.art]?.name ?? ''}`;
  if (job.kind === 'gather') return '采集' + RESOURCE_NAMES[job.res];
  if (job.kind === 'craft') return { weapon: '铸造', armor: '织造', pill: '炼丹' }[job.make] ?? '制造';
  return { patrol: '行侠仗义', extort: '欺压良民', rest: '休息' }[job.kind] ?? '休息';
}
const bestArt = (person) => Object.entries(person.arts).sort((a, b) => ART_BY_ID[b[0]].tier - ART_BY_ID[a[0]].tier || b[1] - a[1])[0];
const bestArtText = (person) => {
  const best = bestArt(person);
  return best ? `${ART_BY_ID[best[0]].name} ${levelOf(best[1])}重` : '—';
};
/** The jobs a person may be given, as [value, label]; the value is read back by `jobOf`. */
function jobChoices(person) {
  return [
    ...learnableArts(person).filter((a) => a.tier < 5).map((a) => [`train:${a.id}`, `修练 ${a.name}（${levelOf(person.arts[a.id] ?? 0)}重）`]),
    ...ARTS.filter((a) => a.tier === 5 && a.sect === person.school && !person.insights.includes(a.id) && person.rank >= 3).map((a) => [`seclude:${a.id}`, `闭关悟 ${a.name}`]),
    ...COMMON_JOBS,
  ];
}
const COMMON_JOBS = [...RESOURCES.map((key) => [`gather:${key}`, `采集${RESOURCE_NAMES[key]}`]), ['craft:weapon', '铸造兵器'], ['craft:armor', '织造护具'], ['craft:pill', '炼丹'], ['patrol', '行侠仗义'], ['extort', '欺压良民'], ['rest', '休息']];
function jobOf(value) {
  const [kind, arg] = value.split(':');
  return kind === 'train' || kind === 'seclude' ? { kind, art: arg } : kind === 'gather' ? { kind, res: arg } : kind === 'craft' ? { kind, make: arg } : { kind };
}

const RANK_FILTERS = ['全部', '掌门', '长老', '亲传', '内门', '外门', '杂役'];
function roster() {
  return membersOf(world, me())
    .filter((p) => (ui.rank === '全部' || RANKS[p.rank].name === ui.rank) && (!ui.search || [p.name, jobText(p), bestArtText(p), PLACE_BY_ID[p.place].name].join(' ').includes(ui.search)))
    .sort((a, b) => b.rank - a.rank || b.level - a.level || a.id - b.id);
}
const picked = () => world.persons[ui.person]?.school === me() ? world.persons[ui.person] : leaderOf(me()) ?? membersOf(world, me())[0];

function disciplesScreen() {
  const all = membersOf(world, me()),
    rows = roster(),
    person = picked();
  for (const id of ui.batch) if (world.persons[id]?.school !== me()) ui.batch.delete(id);
  const many = placesOf(world, me()).length > 1;
  const elders = all.filter((p) => p.rank >= 4 && p.id !== person.id);
  const master = world.persons[person.master];
  const table = `<table class="roster-table"><thead><tr><th scope="col"><label class="batch-check"><span class="sr-only">选择当前筛选的弟子</span><input type="checkbox" id="batch-all" ${rows.length && rows.every((p) => ui.batch.has(p.id)) ? 'checked' : ''}></label></th><th>姓名</th><th>身份</th><th>级</th><th>所长</th><th>战力</th><th>忠诚</th>${many ? '<th>所在</th>' : ''}<th>差事</th></tr></thead>
    <tbody>${rows.map((p) => `<tr class="${p.id === person.id ? 'is-active' : ''}"><td><label class="batch-check"><span class="sr-only">选择${esc(p.name)}</span><input type="checkbox" data-batch="${p.id}" ${ui.batch.has(p.id) ? 'checked' : ''}></label></td>
      <td><button class="person-row-button" data-act="person" data-id="${p.id}">${face(p)}<span><strong>${esc(p.name)}</strong><small>${p.female ? '女' : '男'} · ${p.age}岁</small></span></button></td>
      <td>${tag(RANKS[p.rank].name, p.rank >= 4 ? 'positive' : 'plain')}</td><td class="tabular">${p.level}</td><td>${esc(bestArtText(p))}</td><td class="tabular">${prowess(p)}</td>
      <td><span class="loyalty ${p.loyalty < 30 ? 'bad' : ''}">${Math.round(p.loyalty)}</span></td>${many ? `<td>${esc(PLACE_BY_ID[p.place].name)}</td>` : ''}<td>${esc(jobText(p))}${p.wounds > 0.05 ? ' <span class="bad">伤</span>' : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">暂无符合条件的弟子。</td></tr>'}</tbody></table>`;
  return `${screenHead('弟子', '门中弟子', `在册 ${all.length} 人 · 查看弟子、安排差事与武学`, btn('武学名录', 'page', { page: 'arts' }, 'outline', 'scroll'))}
    <div class="disciple-layout">
      <section class="panel disciple-roster">
        <div class="panel-title roster-header"><div class="button-group" data-region="rank-filter">${RANK_FILTERS.map((rank) => pill(rank, 'rank', { rank }, ui.rank === rank)).join('')}</div><label class="search-wrap"><span class="sr-only">查找弟子</span><input type="search" id="search-person" value="${esc(ui.search)}" placeholder="查找弟子" autocomplete="off"></label></div>
        <div class="batch-toolbar" data-region="batch"><span>已选 ${ui.batch.size} 人</span>${btn('批量改派', 'sheet', { kind: 'batch' }, 'outline', '', !ui.batch.size)}${btn('取消选择', 'batch-clear', {}, 'ghost', '', !ui.batch.size)}</div>
        <div class="table-scroll" data-region="roster">${table}</div>
      </section>
      <section class="panel person-detail" data-region="person">
        <div class="person-visual">${sceneImage('title')}${face(person, 'detail-avatar', 'full')}<div class="leader-shade"></div><div class="person-caption">${tag(RANKS[person.rank].name, 'dark-tag')}<h2>${esc(person.name)}</h2><p>${esc(person.origin)} · ${person.female ? '女' : '男'} · ${person.age} 岁 · ${person.level} 级</p></div></div>
        <dl class="person-stats">${fact('气血', `${meter((1 - (person.wounds ?? 0)) * 100, 'health', '气血')} <b>${hpMax(person)}</b>`)}${fact('忠诚', `${meter(person.loyalty, 'morale', '忠诚')} <b>${Math.round(person.loyalty)}</b>`)}${fact('战力', `<b>${prowess(person)}</b>`)}${fact('差事', esc(jobText(person)))}${fact('所长', esc(bestArtText(person)))}${fact('师承', esc(master?.name ?? '无'))}</dl>
        <div class="person-facts"><div>${STAT_KEYS.map((key) => `${STAT_NAMES[key]} <b>${Math.round(person.stats[key])}</b>`).join('　')}</div><div>资质：${Object.entries(person.apt).map(([key, value]) => `${APT_NAMES[key]} <b>${value}</b>`).join('　')}</div>
          <div>武学：${Object.entries(person.arts).sort((a, b) => ART_BY_ID[b[0]].tier - ART_BY_ID[a[0]].tier).slice(0, 8).map(([id, points]) => `${ART_BY_ID[id].name} <b>${levelOf(points)}</b>重`).join('　') || '尚未习武'}</div></div>
        <div class="detail-actions">${btn('改派差事', 'sheet', { kind: 'job' }, 'primary', 'scroll')}${btn('出招次序', 'sheet', { kind: 'wheel' }, 'outline')}${person.rank < 4 ? btn('晋升', 'promote', { id: person.id }, 'outline') : ''}${person.rank < 4 && elders.length ? btn('拜师', 'sheet', { kind: 'master' }, 'outline') : ''}${many ? btn('调往', 'sheet', { kind: 'move' }, 'outline') : ''}</div>
      </section>
    </div>`;
}

// ---- the arts ------------------------------------------------------------------------------------------

function artsScreen() {
  const list = ARTS.filter((a) => ui.artTier === '全部' || a.tier === Number(ui.artTier));
  const chosen = ART_BY_ID[ui.art] ?? list[0],
    person = picked();
  const needs = chosen ? unmetNeeds(person, chosen).filter((need) => !(chosen.tier === 5 && need === '需闭关领悟')) : [];
  const klass = chosen ? CLASSES[chosen.klass] : null;
  return `${screenHead('弟子', '武学名录', '十二类武学，五阶七十二门。一至三阶各派通用，四阶五阶为门派专属。', btn('返回弟子', 'page', { page: 'disciples' }, 'outline', 'back'))}
    <div class="arts-layout"><section class="panel">${panelTitle('藏经阁', `<div class="button-group" data-region="art-tier">${['全部', 1, 2, 3, 4, 5].map((t) => pill(t === '全部' ? t : `${t}阶`, 'art-tier', { tier: t }, String(ui.artTier) === String(t))).join('')}</div>`)}
      <div class="arts-grid" data-region="arts">${list.map((a) => `<button class="art-button ${a.id === chosen?.id ? 'is-active' : ''}" data-act="art" data-id="${a.id}">${icon('scroll')}<span>${esc(a.name)}<small>${CLASSES[a.klass].name} · ${a.tier}阶${a.sect ? ' · ' + SECT_BY_ID[a.sect].name : ''}</small></span></button>`).join('')}</div></section>
      <section class="panel art-detail" data-region="art">${panelTitle(chosen?.name ?? '武学')}${chosen ? `<dl class="facts">${fact('阶位', `${chosen.tier}阶`)}${fact('类别', klass.name)}${fact('归属', esc(SECT_BY_ID[chosen.sect]?.name ?? '通用'))}${fact('倚重', klass.attrs.map((key) => STAT_NAMES[key]).join('、'))}${fact(`${esc(person.name)}已练`, `${levelOf(person.arts[chosen.id] ?? 0)} 重`)}</dl>
        <ol class="moves">${chosen.moves.map((move) => `<li>${esc(move.name)}：威力 ${Math.round(move.power)}，耗内力 ${move.nei}（${move.level} 重解锁）</li>`).join('')}</ol>
        ${needs.length ? `<p class="moves bad">${esc(person.name)}尚不能修练：${esc(needs.join('、'))}</p>` : ''}
        ${btn(chosen.tier === 5 ? `让${person.name}闭关领悟` : `让${person.name}修练`, 'train-art', { id: chosen.id }, 'primary', 'scroll', needs.length > 0)}` : ''}</section></div>`;
}

// ---- the map -------------------------------------------------------------------------------------------

function mapMarks() {
  const edges = PLACES.flatMap((place) => place.roads.filter((other) => other > place.id).map((other) => [place.at, PLACE_BY_ID[other].at]));
  return `<svg class="map-roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${edges.map(([a, b]) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`).join('')}</svg>
    ${PLACES.map((spec) => {
      const owner = world.places[spec.id].owner;
      return `<button class="map-pin ${spec.id === ui.mapPlace ? 'is-active' : ''} ${owner === me() ? 'is-home' : ''}" style="--x:${spec.at.x}%;--y:${spec.at.y}%;--marker:${owner ? SECT_BY_ID[owner].color : '#b9a77d'}" aria-pressed="${spec.id === ui.mapPlace}" data-act="place" data-place="${spec.id}" title="${owner ? SECT_BY_ID[owner].name : '无主'}"><i></i><span>${esc(spec.name)}</span></button>`;
    }).join('')}`;
}

/** What the player may do about a stronghold, and why not when they may not. */
function placeDeal(placeId) {
  const owner = world.places[placeId].owner;
  const near = PLACE_BY_ID[placeId].roads.some((id) => world.places[id].owner === me());
  if (owner === me()) return { kind: 'mine' };
  if (!near) return { kind: 'far' };
  return { kind: owner ? 'foe' : 'open' };
}
const marchParty = () => membersOf(world, me()).filter((p) => p.wounds < 0.3).sort((a, b) => prowess(b) - prowess(a)).slice(0, 10);

function worldScreen() {
  ui.mapPlace ??= SECT_BY_ID[me()].seat;
  const spec = PLACE_BY_ID[ui.mapPlace],
    place = world.places[spec.id],
    owner = SECT_BY_ID[place.owner];
  const deal = placeDeal(spec.id);
  const guard = place.owner ? residents(world, spec.id) : [];
  const relation = owner && owner.id !== me() ? Math.round(books().relations[owner.id]) : null;
  const action = {
    mine: btn('前往此处山门', 'look', { place: spec.id, go: 1 }, 'primary', 'gate'),
    far: `<span class="caption">不与本派据点相邻，鞭长莫及。</span>`,
    open: btn(`开设分舵（${num(ECONOMY.settleCost ?? 1500)}两）`, 'sheet', { kind: 'settle', place: spec.id }, 'primary', 'pin'),
    foe: btn('商议出兵', 'sheet', { kind: 'march', place: spec.id }, 'primary', 'swords') + btn('馈赠 500 两', 'gift', { sect: place.owner }, 'outline'),
  }[deal.kind];
  return `${screenHead('江湖', '天下舆图', '沿道路查看据点、邻派关系与可行的出兵路线。拖动可平移，滚轮或按钮可缩放。', btn('门派往来', 'sheet', { kind: 'diplomacy' }, 'outline', 'banner'))}
    <div class="world-layout">
      <section class="scene-panel map-panel" aria-label="天下舆图"><div class="scene-viewport"><div class="scene-stage map-stage">${sceneImage('world')}<div class="region" data-region="map">${mapMarks()}</div></div></div>
        <div class="map-label"><span>大昭疆域</span><small>二十据点</small></div>
        <div class="map-key"><span><i class="legend-home" style="--marker:${SECT_BY_ID[me()].color}"></i> 本派</span><span><i class="legend-faction"></i> 他派（按门派着色）</span><span><i></i> 无主</span></div>
        <div class="scene-zoom map-zoom"><button data-act="mapzoom" data-dir="in" aria-label="放大舆图">${icon('plus')}</button><button data-act="mapzoom" data-dir="out" aria-label="缩小舆图">${icon('minus')}</button><button data-act="mapzoom" data-dir="reset" aria-label="重置舆图">${icon('frame')}</button></div>
      </section>
      <aside class="world-side" data-region="world-side">
        <section class="panel place-card">${panelTitle(spec.name, tag(owner?.name ?? '无主', owner ? 'positive' : 'plain'))}<p>${esc(spec.note)}</p>
          <dl class="facts">${fact('地块容量', `${spec.cells} 格`)}${fact('物产', RESOURCES.filter((key) => spec.resources[key] >= 2).map((key) => RESOURCE_NAMES[key]).join('、') || '平平')}
            ${owner ? fact('守卫', `${guard.length} 人 · 战力 ${num(strength(guard))}`) : ''}${relation !== null ? fact('与本派关系', `<span class="${relation < 0 ? 'bad' : relation >= 40 ? 'good' : ''}">${relation}</span>`) : ''}
            ${fact('与本派', { mine: spec.id === SECT_BY_ID[me()].seat ? '本派总舵' : '本派分舵', far: '未接壤', open: '接壤', foe: '接壤' }[deal.kind])}</dl>
          <div class="place-actions button-group">${action}</div>
        </section>
        <section class="panel">${panelTitle('通达据点')}<div class="route-list">${spec.roads.map((id) => `<button data-act="place" data-place="${id}">${icon('pin')}<span>${esc(PLACE_BY_ID[id].name)} <small class="muted">${esc(SECT_BY_ID[world.places[id].owner]?.name ?? '无主')}</small></span>${icon('arrow')}</button>`).join('')}</div></section>
      </aside>
    </div>`;
}

/** Applies the map's zoom and position to the page, keeping the map inside its frame. */
function placeMap() {
  const stage = app.querySelector('.map-stage');
  if (!stage) return;
  const box = stage.parentElement.getBoundingClientRect();
  const reach = (size) => ((ui.map.zoom - 1) * size) / 2;
  ui.map.x = Math.max(-reach(box.width), Math.min(reach(box.width), ui.map.x));
  ui.map.y = Math.max(-reach(box.height), Math.min(reach(box.height), ui.map.y));
  stage.style.setProperty('--zoom', ui.map.zoom);
  stage.style.setProperty('--px', ui.map.x + 'px');
  stage.style.setProperty('--py', ui.map.y + 'px');
}
const zoomMap = (factor) => ((ui.map.zoom = Math.max(1, Math.min(3, ui.map.zoom * factor))), placeMap());

// ---- a fight -------------------------------------------------------------------------------------------

function battleScreen() {
  if (!ui.fight) {
    const targets = PLACES.filter((spec) => placeDeal(spec.id).kind === 'foe');
    const last = ui.lastFight;
    return `${screenHead('战阵', '眼下无战事', '可出兵攻打与本派据点相邻的他派据点。出战最多十人，伤重者不上阵。')}
      <section class="panel"><div data-region="targets">${panelTitle('可攻之敌', tag(`我方可战 ${marchParty().length} 人 · 战力 ${num(strength(marchParty()))}`))}
        <div class="route-list">${targets.map((spec) => `<button data-act="sheet" data-kind="march" data-place="${spec.id}">${icon('swords')}<span>${esc(spec.name)} <small class="muted">${esc(SECT_BY_ID[world.places[spec.id].owner].name)} · 守 ${residents(world, spec.id).length} 人 · 战力 ${num(strength(residents(world, spec.id)))}</small></span>${icon('arrow')}</button>`).join('') || '<p class="muted" style="padding:6px">四邻皆无他派据点。</p>'}</div></div></section>
      ${last ? `<section class="panel battle-report" data-region="last-fight">${panelTitle('上一战 · ' + last.title)}<p>${esc(last.verdict)}</p>${last.lines.slice(-8).map((line) => `<p>${icon('swords')}${esc(line)}</p>`).join('')}</section>` : ''}`;
  }
  const { arena, title, sects, lines } = ui.fight,
    battle = arena.battle;
  const side = (index) => {
    const units = battle.units.filter((unit) => unit.side === index),
      left = units.filter((unit) => !unit.down && !unit.fled);
    const share = (units.reduce((sum, unit) => sum + (unit.down || unit.fled ? 0 : unit.hp), 0) / units.reduce((sum, unit) => sum + unit.hpMax, 0)) * 100;
    const sect = SECT_BY_ID[sects[index]];
    return `<div class="army army-${index}">${face(leaderOf(sect.id) ?? founder(sect), 'army-portrait')}<div><div class="army-name"><b>${esc(sect.name)}</b><span>${left.length} / ${units.length}</span></div>${meter(share, index ? 'enemy' : 'health', `${sect.name}兵力`)}</div></div>`;
  };
  const marked = battle.units.find((unit) => unit.id === battle.orders[0].focus && !unit.down);
  const clock = `${String(Math.floor(battle.time / 60)).padStart(2, '0')}:${String(Math.floor(battle.time % 60)).padStart(2, '0')}`;
  return `${screenHead('战阵', title, '点选敌方下令集火，随时可暂停（空格）、调速或撤退。暂停时显示各人姓名。')}
    <section class="scene-panel battle-panel" aria-label="战斗场景">
      <div class="stage-slot" data-stage="battle">${sceneImage('battle')}</div>
      <div class="region" data-region="battle-over">
        <div class="battle-top">${side(0)}<div class="fight-clock"><b>${clock}</b><small>${battle.done ? '胜负已分' : arena.paused ? '已暂停' : '交战中'}</small></div>${side(1)}</div>
        <div class="battle-bottom"><span class="battle-hint">${icon(marked ? 'target' : 'info')} ${marked ? `集火：${esc(marked.name)}（再点一次取消）` : '点选敌人下令集火'}</span>
          <div class="battle-orders">${btn(arena.paused ? '继续' : '暂停', 'fight-pause', {}, 'on-dark', arena.paused ? 'play' : 'pause')}
            <div class="speeds dark-speeds" role="group" aria-label="战斗速度">${[1, 2, 4].map((s) => `<button data-act="fight-speed" data-speed="${s}" class="${s === arena.speed && !arena.paused ? 'is-active' : ''}">${s}×</button>`).join('')}</div>
            ${btn('速决', 'fight-skip', {}, 'on-dark')}${btn('撤退', 'sheet', { kind: 'retreat' }, 'danger', '', battle.orders[0].retreat)}</div></div>
      </div>
    </section>
    <section class="panel battle-report" data-region="battle-log">${panelTitle('交战记录')}${lines.slice(-6).reverse().map((line) => `<p>${icon('swords')}${esc(line)}</p>`).join('') || '<p>两军正在接近。</p>'}</section>`;
}

/** One line of a fight's account, or nothing for an event not worth telling. */
function tell(event, name) {
  if (event.type === 'hit' && (event.crit || event.flank > 1))
    return `${event.time.toFixed(0)}秒 ${name(event.from)}以${event.art ?? ''}「${event.move}」${event.flank > 1.2 ? '背袭' : event.flank > 1 ? '侧击' : ''}${event.crit ? '重创' : '击中'}${name(event.to)}，伤 ${event.damage}`;
  if (event.type === 'down') return `${event.time.toFixed(0)}秒 ${name(event.id)}倒下`;
  if (event.type === 'fled') return `${event.time.toFixed(0)}秒 ${name(event.id)}脱离战场`;
  return '';
}

/**
 * Fights for a stronghold with the sect's ten best. With the 3D picture the
 * fight is played out and the player can give orders; without it the fight is
 * settled at once. Either way it ends in a written account.
 */
function march(placeId) {
  const prepared = assaultSides(world, me(), placeId, marchParty().map((p) => p.id));
  if (!prepared.ok) return say(prepared);
  const rng = createRng(1);
  rng.state = world.rng;
  const battle = createBattle({ sides: prepared.sides, formations: prepared.formations, seed: rng.int(1, 1e9) });
  const name = (id) => world.persons[id]?.name ?? '？';
  const lines = [];
  const note = (event) => {
    const line = tell(event, name);
    if (line && (event.type !== 'hit' || lines.length < 80)) lines.push(line);
  };
  const title = `攻打${PLACE_BY_ID[placeId].name}`;
  const finish = () => {
    const summary = { winner: battle.winner, time: battle.time, fighters: battle.units.map((u) => ({ id: u.id, side: u.side, down: u.down, fled: u.fled, hpLeft: u.hp / u.hpMax, dealt: u.dealt, xp: Math.round(u.dealt) })) };
    const outcome = settleAssault(world, me(), placeId, summary, rng);
    world.rng = rng.state;
    ui.fight = null;
    ui.lastFight = { title, won: outcome.won, verdict: `${outcome.won ? '得胜' : '败退'}，历时 ${battle.time.toFixed(0)} 秒。${outcome.fallen.length ? '战殁：' + outcome.fallen.join('、') : '无人战殁。'}`, lines };
    ui.sheet = { kind: 'fight' };
  };
  ui.speed = 0;
  ui.sheet = null;
  if (!picture.stage) {
    while (!battle.done) {
      battle.update();
      battle.events.forEach(note);
      battle.events.length = 0;
    }
    return finish();
  }
  const sects = [me(), prepared.defender];
  const arena = picture.modules.createArena(picture.stage, battle, {
    colors: sects.map((id) => parseInt(SECT_BY_ID[id].color.slice(1), 16)),
    layer: document.querySelector('#layer'),
    onEvent: note,
    onEnd: () => (finish(), render()),
  });
  ui.fight = { arena, title, sects, lines };
  ui.page = 'battle';
}

// ---- the chronicle and the saves -----------------------------------------------------------------------

const LOG_TYPES = { start: '立派', conquer: '征伐', repel: '守御', fall: '覆灭', settle: '分舵', death: '讣告', desert: '叛离', insight: '领悟', succession: '传位', summit: '大会', event: '奇遇', court: '朝廷', join: '来投' };

function chronicleScreen() {
  const records = world.log.filter((r) => ui.logFilter === '全部' || (ui.logFilter === '本派') === (r.sect === me() || r.type === 'start')).slice(-120).reverse();
  return `${screenHead('纪事', '门派纪事', '山门、修练和江湖往来的记录。')}
    <section class="panel chronicle-panel">${panelTitle('江湖要事', `<div class="button-group" data-region="log-filter">${['全部', '本派', '江湖'].map((t) => pill(t, 'log-filter', { filter: t }, ui.logFilter === t)).join('')}</div>`)}
      <ol class="timeline" data-region="log">${records.map((r) => `<li><time>${dayText(r.day)}</time><div>${tag(LOG_TYPES[r.type] ?? '江湖')}<p>${esc(r.text)}</p></div></li>`).join('') || '<li><p>暂无记录。</p></li>'}</ol>
    </section>`;
}

function savesScreen() {
  const saved = Object.fromEntries(slots.list().map((s) => [s.slot, s]));
  return `${screenHead('存档', '江湖卷宗', '三个手动存档位和一个自动存档，保存在这个浏览器里。', btn('回到标题', 'quit', {}, 'outline', 'back'))}
    <section class="save-grid" data-region="saves">${['1', '2', '3', 'auto'].map((slot) => `<article class="panel save-card"><div class="save-emblem">${icon('box')}</div><h2>${slot === 'auto' ? '自动存档' : `存档位 ${slot}`}</h2><p>${saved[slot] ? esc(saved[slot].label) : '空卷'}</p>
      <div class="button-group">${slot !== 'auto' ? btn('保存', 'save', { slot }, 'primary') : ''}${btn('读取', 'load', { slot }, 'outline', '', !saved[slot])}</div></article>`).join('')}</section>
    <section class="panel save-options">${panelTitle('存档文件')}<p>清除浏览器数据会一并清掉存档，重要的进度请导出为文件。${world.flags.editorUsed ? '此存档使用过修改器。' : ''}</p>
      <div class="button-group">${btn('导出存档', 'export', {}, 'outline', 'box')}${btn('导入存档', 'import', {}, 'outline', 'plus')}</div></section>`;
}

// ---- sheets over the page ------------------------------------------------------------------------------

const options = (pairs, chosen) => pairs.map(([value, label]) => `<option value="${esc(value)}" ${String(value) === String(chosen) ? 'selected' : ''}>${esc(label)}</option>`).join('');
const closeBtn = (label = '取消') => btn(label, 'close', {}, 'outline');

/** The sheets, by kind: each gives a title, a body and the buttons at its foot. */
const SHEETS = {
  load() {
    const saves = slots.list();
    return ['载入存档', `${saves.length ? `<div class="choice-list">${saves.map((s) => btn(`${s.slot === 'auto' ? '自动存档' : '存档位 ' + s.slot} · ${s.label ?? ''}`, 'load', { slot: s.slot }, 'outline', 'box')).join('')}</div>` : '<p>这个浏览器里还没有存档。</p>'}`, btn('导入存档文件', 'import', {}, 'outline', 'plus') + closeBtn('关闭')];
  },
  build() {
    const spec = PLACE_BY_ID[ui.place],
      free = spec.cells - usedCells(world, ui.place);
    return ['兴建建筑', `${formRow('建筑', `<select id="build-kind">${options(Object.entries(BUILDINGS).map(([kind, b]) => [kind, `${b.name} · ${b.cost}两 · ${b.cells}格 · ${b.does}`]))}</select>`)}<p class="caption">${esc(spec.name)}尚余建地 ${free} 格，库中有银 ${num(books().silver)} 两。</p>`, closeBtn() + btn('兴建', 'build', {}, 'primary')];
  },
  applicant({ index }) {
    const p = world.places[ui.place].applicants[index];
    if (!p) return ['招贤榜', '<p>此人已经离去。</p>', closeBtn('关闭')];
    return [`招贤榜 · ${p.name}`, `<div class="applicant"><span class="person-monogram">${esc(p.name[0])}</span><div><h3>${esc(p.name)}</h3><p>${esc(p.origin)} · ${p.female ? '女' : '男'} · ${p.age} 岁</p></div></div>
      <p>资质：${Object.entries(p.apt).map(([key, value]) => `${APT_NAMES[key]} ${value}`).join('　')}</p><p>根骨：${STAT_KEYS.map((key) => `${STAT_NAMES[key]} ${Math.round(p.stats[key])}`).join('　')}</p>
      <p class="caption">入门时交束修 ${p.fee} 两。收录需掌门在此，且厢房有空铺。</p>`, closeBtn('暂不收录') + btn('收录弟子', 'recruit', { index }, 'primary')];
  },
  job() {
    const person = picked();
    return ['改派差事', formRow(person.name, `<select id="job-select">${options(jobChoices(person))}</select>`) + `<p class="caption">眼下：${esc(jobText(person))}</p>`, closeBtn() + btn('确认差事', 'job', {}, 'primary')];
  },
  batch() {
    return ['批量改派差事', `<p>将为所选 ${ui.batch.size} 名弟子统一安排差事。</p>${formRow('差事', `<select id="job-select">${options([['auto', '各自修练最合适的武学'], ...COMMON_JOBS])}</select>`)}`, closeBtn() + btn('确认改派', 'batch-job', {}, 'primary')];
  },
  wheel() {
    const person = picked();
    const moves = Object.keys(person.arts).filter((id) => CLASSES[ART_BY_ID[id].klass].combat).flatMap((id) => ART_BY_ID[id].moves.map((move, slot) => ({ id, slot, move })).filter(({ move }) => levelOf(person.arts[id]) >= move.level));
    const size = RANKS[person.rank].slots || 4;
    const wheel = person.wheel ?? [];
    return [`出招次序 · ${person.name}`, `<p class="caption">交手时按此次序循环出招，共 ${size} 格。同一兵器的招式才能连用；留空的格子由本人自行斟酌。</p>
      <div class="wheel">${Array.from({ length: size }, (_, i) => `<select data-wheel="${i}">${options([['', '（自行斟酌）'], ...moves.map(({ id, slot, move }) => [`${id}:${slot}`, `${ART_BY_ID[id].name}·${move.name}`])], wheel[i] ? `${wheel[i].art}:${wheel[i].move}` : '')}</select>`).join('')}</div>`, btn('交还本人安排', 'wheel-auto', {}, 'outline') + closeBtn() + btn('定下次序', 'wheel', {}, 'primary')];
  },
  master() {
    const person = picked();
    return ['拜师', formRow(person.name, `<select id="master-select">${options(membersOf(world, me()).filter((p) => p.rank >= 4 && p.id !== person.id).map((p) => [p.id, `${p.name}（${RANKS[p.rank].name}，${bestArtText(p)}）`]), person.master)}</select>`) + '<p class="caption">师父的造诣越高，徒弟修练越快。</p>', closeBtn() + btn('行拜师礼', 'master', {}, 'primary')];
  },
  move() {
    const person = picked();
    return ['调往别处', formRow(person.name, `<select id="move-select">${options(placesOf(world, me()).map((id) => [id, PLACE_BY_ID[id].name]), person.place)}</select>`), closeBtn() + btn('启程', 'move', {}, 'primary')];
  },
  settle({ place }) {
    return ['开设分舵', `<p>在${esc(PLACE_BY_ID[place].name)}设立分舵需 1,500 两，建成后自带正殿、山门、招贤榜与一间厢房。</p><p class="caption">库中有银 ${num(books().silver)} 两。</p>`, closeBtn() + btn('确认开设', 'settle', { place }, 'primary')];
  },
  march({ place }) {
    const party = marchParty(),
      guard = residents(world, place).sort((a, b) => prowess(b) - prowess(a)).slice(0, 10),
      owner = SECT_BY_ID[world.places[place].owner];
    return ['商议出兵', `<p>进攻${esc(owner.name)}的${esc(PLACE_BY_ID[place].name)}。</p>
      <dl class="facts">${fact('我方出战', `${party.length} 人 · 战力 ${num(strength(party))}`)}${fact('对方守卫', `${guard.length} 人 · 战力 ${num(strength(guard))}`)}${fact('两派关系', String(Math.round(books().relations[owner.id])))}</dl>
      <p class="caption">出战者取全派战力最高的十人，伤重者留守。得胜则据点易主；开战后两派交恶。</p>`, closeBtn() + btn('出兵', 'march', { place }, 'primary', 'swords', !party.length)];
  },
  retreat: () => ['确认撤退', '<p>撤退即认负。跑得出战场的弟子可以保全，来不及的仍会倒下。</p>', closeBtn('继续作战') + btn('确认撤退', 'fight-retreat', {}, 'danger')],
  fight() {
    const last = ui.lastFight;
    return [`战报 · ${last.title}`, `<p class="battle-result ${last.won ? '' : 'bad'}">${last.won ? '此战告捷' : '此战失利'}</p><p>${esc(last.verdict)}</p><div class="fight-lines">${last.lines.map((line) => `<div>${esc(line)}</div>`).join('') || '两军未及交手。'}</div>`, btn('返回江湖', 'page', { page: 'world' }, 'primary', 'arrow')];
  },
  diplomacy() {
    return ['门派往来', `<div class="diplomacy-list">${SECTS.filter((s) => s.id !== me()).map((s) => {
      const theirs = world.sects[s.id];
      if (!theirs.alive) return `<div>${face(founder(s))}<strong>${esc(s.name)}</strong><span class="muted">已除名</span><span></span></div>`;
      const row = ledger(world, s.id),
        relation = Math.round(books().relations[s.id]);
      return `<div>${face(leaderOf(s.id) ?? founder(s))}<span><strong>${esc(s.name)}</strong> ${tag(['邪', '中立', '正'][s.standing + 1])}<br><small class="muted">${row.members} 人 · ${row.places} 处 · 战力 ${num(row.strength)}</small></span><b class="${relation < 0 ? 'bad' : relation >= 40 ? 'good' : ''}">${relation}</b>${btn('馈赠 500 两', 'gift', { sect: s.id }, 'outline')}</div>`;
    }).join('')}</div><p class="caption">关系高的门派不易来犯。馈赠可以改善关系。</p>`, closeBtn('关闭')];
  },
  settings() {
    return ['游戏设置', `${formRow('画质', `<select data-change="quality">${options([['', '自动'], ['high', '高'], ['medium', '中'], ['low', '低（省电）']], storedQuality() ?? '')}</select>`)}
      <p class="caption">${picture.stage ? '改动画质后会重新载入页面，进度先自动保存。' : '这台设备画不了 3D，山门以画卷示意，战斗以文字结算。'}</p>
      <p class="caption">连按两次 F8，或连续点击顶栏日期五次，可打开修改器。</p>`, btn('修改器', 'editor', {}, 'outline') + btn('完成', 'close', {}, 'primary')];
  },
  editor() {
    const sheet = ui.sheet,
      theirs = world.sects[sheet.sect],
      members = membersOf(world, sheet.sect);
    const person = world.persons[sheet.person] ?? members[0];
    const field = (label, change, value, extra = '') => formRow(label, `<input type="number" data-change="${change}" ${extra} value="${Math.round(value * 100) / 100}">`);
    return ['数据修改器', `${formRow('门派', `<select data-change="ed-sect">${options(SECTS.filter((s) => world.sects[s.id].alive).map((s) => [s.id, s.name]), sheet.sect)}</select>`)}
      <div class="editor-grid">
        <section><h3>门派</h3>${field('银两', 'ed-silver', theirs.silver)}${field('粮草', 'ed-grain', theirs.grain)}${field('威望', 'ed-renown', theirs.renown)}${field('正邪', 'ed-virtue', theirs.virtue)}${field('朝廷', 'ed-court', theirs.court)}${RESOURCES.map((key) => field(RESOURCE_NAMES[key], 'ed-res', theirs.res[key], `data-key="${key}"`)).join('')}</section>
        <section><h3>角色</h3>${formRow('人物', `<select data-change="ed-person">${options(members.map((p) => [p.id, p.name]), person?.id)}</select>`)}
          ${person ? `${formRow('姓名', `<input data-change="ed-name" value="${esc(person.name)}">`)}${field('等级', 'ed-level', person.level)}${field('忠诚', 'ed-loyalty', person.loyalty)}${field('年龄', 'ed-age', person.age)}${STAT_KEYS.map((key) => field(STAT_NAMES[key], 'ed-stat', person.stats[key], `data-key="${key}"`)).join('')}${Object.keys(person.apt).map((key) => field(APT_NAMES[key] + '资质', 'ed-apt', person.apt[key], `data-key="${key}"`)).join('')}
          ${formRow('武学', `<select id="ed-art">${options(ARTS.map((a) => [a.id, `${a.name}（${levelOf(person.arts[a.id] ?? 0)}重）`]))}</select>`)}${formRow('重数', '<input type="number" id="ed-art-level" min="0" max="10" value="10">')}${btn('设为此重', 'ed-art', {}, 'outline')}` : ''}</section>
        <section><h3>物品</h3><p class="caption">代号如 pill:heal1、weapon:sword:5、armor:3</p>${formRow('物品', '<input id="ed-item" value="weapon:sword:7">')}${formRow('数量', '<input type="number" id="ed-count" value="1">')}${btn('设定数量', 'ed-stock', {}, 'outline')}
          <p class="caption" style="margin-top:8px">${Object.entries(theirs.stock).map(([id, count]) => `${esc(describeItem(id)?.name ?? id)} × ${count}`).join('<br>') || '库中无物。'}</p></section>
      </div><p class="caption">改动立即生效；超出常规范围的数值也会生效。</p>`, btn('还原到打开前', 'ed-revert', {}, 'outline') + btn('关闭', 'close', {}, 'primary')];
  },
};

function renderSheet() {
  if (!ui.sheet || !SHEETS[ui.sheet.kind]) return void (dialog.open && dialog.close());
  const [title, body, foot] = SHEETS[ui.sheet.kind](ui.sheet);
  dialog.innerHTML = `<article class="sheet-inner"><div class="sheet-title"><h2 id="dialog-title">${esc(title)}</h2><button data-act="close" aria-label="关闭">${icon('close')}</button></div><div class="sheet-body">${body}</div>${foot ? `<div class="sheet-footer">${foot}</div>` : ''}</article>`;
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  if (!dialog.open) dialog.showModal();
}
// Escape closes a sheet through the browser; the page's own state follows.
dialog.addEventListener('close', () => ui.sheet && (actions.close(), render()));

// ---- drawing -------------------------------------------------------------------------------------------

const SCREENS = { seat: seatScreen, disciples: disciplesScreen, arts: artsScreen, world: worldScreen, battle: battleScreen, chronicle: chronicleScreen, saves: savesScreen };

function render() {
  let html, key;
  if (!world) {
    if (ui.page !== 'sects') ui.page = 'title';
    html = ui.page === 'sects' ? sectScreen() : titleScreen();
    key = ui.page;
  } else {
    if (!SCREENS[ui.page]) ui.page = 'seat';
    if (ui.fight) ui.page = 'battle';
    const mine = placesOf(world, me());
    if (!mine.includes(ui.place)) ui.place = mine.includes(SECT_BY_ID[me()].seat) ? SECT_BY_ID[me()].seat : mine[0];
    if (!ui.place) ui.page = ui.page === 'seat' ? 'world' : ui.page;
    html = shell(SCREENS[ui.page]());
    key = [ui.page, ui.page === 'battle' && !!ui.fight, ui.tall, !!picture.stage].join();
  }
  // The key carries whether the paintings have loaded, so the still pictures appear when they arrive.
  if (mount(app, html, key + (art ? ':art' : ''))) window.scrollTo(0, 0);
  syncPicture();
  placeMap();
  renderSheet();
}

// ---- what the player does ---------------------------------------------------------------------------------

function download(name, text) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}

/** Takes a world as the one being played. */
function enter(next, text = '') {
  world = next;
  Object.assign(ui, { page: 'seat', sheet: null, place: null, building: 0, person: null, mapPlace: null, fight: null, lastFight: null, speed: 0, notice: '' });
  ui.batch.clear();
  toast(text);
  startPicture();
}

function importFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const loaded = deserialize(await file.text());
    if (loaded.ok) enter(loaded.state, '已读入存档。');
    else toast(loaded.why);
    render();
  };
  input.click();
}

function openEditor() {
  if (!world || ui.fight || ui.sheet?.kind === 'editor') return;
  editor.open();
  ui.sheet = { kind: 'editor', sect: me(), person: undefined };
  ui.speed = 0;
  render();
}
const edited = () => world.persons[ui.sheet.person] ?? membersOf(world, ui.sheet.sect)[0];
const pick = (selector) => dialog.querySelector(selector)?.value ?? '';

const actions = {
  page(data) {
    if (ui.fight && data.page !== 'battle') return toast('战事未了。');
    ui.page = data.page;
    ui.sheet = null;
    ui.notice = '';
  },
  sheet: (data) => (ui.sheet = { ...data, index: data.index === undefined ? undefined : Number(data.index) }),
  close() {
    if (ui.sheet?.kind === 'editor') editor.close();
    ui.sheet = null;
  },
  'choose-sect': (data) => (ui.chosen = data.sect),
  new: (data) => enter(createWorld({ seed: (Date.now() % 1e9) + 1, playerSect: data.sect, succession: !!ui.succession })),
  load(data) {
    const loaded = slots.read(data.slot);
    if (loaded.ok) enter(loaded.state, '已读取存档。');
    else toast(loaded.why);
  },
  save: (data) => toast(slots.write(data.slot, world, autoLabel()) ? `已保存到存档位 ${data.slot}。` : '浏览器拒绝了保存，请改用导出文件。'),
  export: () => download(saveFileName(world, SECT_BY_ID[me()].name), serialize(world, autoLabel())),
  import: importFile,
  quit() {
    slots.write('auto', world, autoLabel());
    world = null;
    Object.assign(ui, { page: 'title', speed: 0, fight: null, sheet: null });
  },
  speed: (data) => (ui.speed = Number(data.speed)),
  // Five quick taps on the date open the editor where there is no keyboard.
  date(_, event) {
    ui.taps = event.timeStamp - ui.tapAt < 600 ? ui.taps + 1 : 1;
    ui.tapAt = event.timeStamp;
    if (ui.taps >= 5) (ui.taps = 0), openEditor();
  },
  editor: openEditor,

  look(data) {
    ui.place = data.place;
    ui.building = 0;
    if (data.go) ui.page = 'seat';
  },
  tall: () => (ui.tall = !ui.tall),
  zoom(data) {
    const orbit = picture.stage?.orbit;
    if (!orbit) return;
    orbit.distance = data.dir === 'reset' ? 50 : Math.max(orbit.minDistance, Math.min(orbit.maxDistance, orbit.distance * (data.dir === 'in' ? 0.78 : 1.28)));
  },
  building: (data) => (ui.building = Number(data.index)),
  build: () => say(build(world, me(), ui.place, pick('#build-kind')), '动工了。') && ((ui.building = world.places[ui.place].buildings.length - 1), (ui.sheet = null)),
  upgrade: (data) => say(upgrade(world, me(), ui.place, Number(data.index)), '扩建完成。'),
  recruit: (data) => say(recruit(world, me(), ui.place, Number(data.index)), '收入门墙。') && (ui.sheet = null),

  person: (data) => (ui.person = Number(data.id)),
  rank: (data) => (ui.rank = data.rank),
  'batch-clear': () => ui.batch.clear(),
  job: () => say(setJob(world, picked().id, jobOf(pick('#job-select'))), '已改派差事。') && (ui.sheet = null),
  'batch-job'() {
    const value = pick('#job-select');
    let done = 0;
    for (const id of ui.batch) {
      const person = world.persons[id];
      const best = learnableArts(person).filter((a) => a.tier < 5).sort((a, b) => b.tier - a.tier)[0];
      const job = value === 'auto' ? (best ? { kind: 'train', art: best.id } : { kind: 'rest' }) : jobOf(value);
      if (setJob(world, id, job).ok) done++;
    }
    toast(`已为 ${done} 名弟子改派差事。`);
    ui.batch.clear();
    ui.sheet = null;
  },
  wheel() {
    const person = picked();
    const chosen = [...dialog.querySelectorAll('[data-wheel]')].map((select) => select.value).filter(Boolean);
    person.wheel = chosen.map((value) => ({ art: value.split(':')[0], move: Number(value.split(':')[1]), link: 'power' }));
    toast(chosen.length ? '次序已定。' : '已交还本人安排。');
    ui.sheet = null;
  },
  'wheel-auto'() {
    picked().wheel = [];
    toast('已交还本人安排。');
    ui.sheet = null;
  },
  promote: (data) => say(promote(world, Number(data.id)), '已晋升。'),
  master: () => say(setMaster(world, picked().id, Number(pick('#master-select'))), '已拜师。') && (ui.sheet = null),
  move: () => say(relocate(world, picked().id, pick('#move-select')), '已启程。') && (ui.sheet = null),
  'art-tier': (data) => ((ui.artTier = data.tier), (ui.art = null)),
  art: (data) => (ui.art = data.id),
  'train-art': (data) => say(setJob(world, picked().id, { kind: ART_BY_ID[data.id].tier === 5 ? 'seclude' : 'train', art: data.id }), `${picked().name}已开始修练。`),

  place: (data) => (ui.mapPlace = data.place),
  mapzoom: (data) => (data.dir === 'reset' ? ((ui.map = { zoom: 1, x: 0, y: 0 }), placeMap()) : zoomMap(data.dir === 'in' ? 1.3 : 1 / 1.3)),
  settle: (data) => say(settle(world, me(), data.place), '分舵已立。') && (ui.sheet = null),
  gift: (data) => say(gift(world, me(), data.sect, 500), `已向${SECT_BY_ID[data.sect].name}馈赠。`),
  march: (data) => march(data.place),
  'log-filter': (data) => (ui.logFilter = data.filter),

  'fight-pause': () => ui.fight && (ui.fight.arena.paused = !ui.fight.arena.paused),
  'fight-speed': (data) => ((ui.fight.arena.speed = Number(data.speed)), (ui.fight.arena.paused = false)),
  'fight-skip': () => ui.fight.arena.skip(),
  'fight-retreat': () => (ui.fight.arena.battle.retreat(0), (ui.fight.arena.paused = false), (ui.sheet = null)),

  'ed-revert': () => toast(editor.revert() ? '已还原。' : ''),
  'ed-art'() {
    const result = editor.setArt(edited().id, pick('#ed-art'), Number(pick('#ed-art-level')));
    toast(result.ok ? '已设定。' : result.why);
  },
  'ed-stock'() {
    const result = editor.setStock(ui.sheet.sect, pick('#ed-item').trim(), Number(pick('#ed-count')));
    toast(result.ok ? '已设定。' : '没有这种物品。');
  },
};

const changes = {
  quality(_, value) {
    slots.write('auto', world, autoLabel());
    try {
      value ? localStorage.setItem('wulin-quality', value) : localStorage.removeItem('wulin-quality');
    } catch {
      return;
    }
    location.reload();
  },
  'ed-sect': (_, value) => ((ui.sheet.sect = value), (ui.sheet.person = undefined)),
  'ed-person': (_, value) => (ui.sheet.person = Number(value)),
  'ed-silver': (_, value) => editor.setSilver(ui.sheet.sect, Number(value)),
  'ed-grain': (_, value) => editor.setGrain(ui.sheet.sect, Number(value)),
  'ed-renown': (_, value) => editor.setRenown(ui.sheet.sect, Number(value)),
  'ed-virtue': (_, value) => editor.setVirtue(ui.sheet.sect, Number(value)),
  'ed-court': (_, value) => editor.setCourt(ui.sheet.sect, Number(value)),
  'ed-res': (data, value) => editor.setResource(ui.sheet.sect, data.key, Number(value)),
  'ed-name': (_, value) => editor.setName(edited().id, value),
  'ed-level': (_, value) => editor.setLevel(edited().id, Number(value)),
  'ed-loyalty': (_, value) => editor.setLoyalty(edited().id, Number(value)),
  'ed-age': (_, value) => editor.setAge(edited().id, Number(value)),
  'ed-stat': (data, value) => editor.setStat(edited().id, data.key, Number(value)),
  'ed-apt': (data, value) => editor.setAptitude(edited().id, data.key, Number(value)),
};

/** True for a moment after the map has been dragged, so the drag does not also pick a stronghold. */
let mapDragged = false;

document.body.addEventListener('click', (event) => {
  const target = event.target.closest('[data-act]');
  if (!target || target.disabled) return;
  if (mapDragged && target.dataset.act === 'place') return;
  try {
    actions[target.dataset.act]?.(target.dataset, event);
  } catch (cause) {
    fail(cause);
  }
  if (!['date', 'import', 'zoom', 'mapzoom'].includes(target.dataset.act)) render();
});
document.body.addEventListener('change', (event) => {
  const target = event.target;
  if (target.id === 'succession') return void (ui.succession = target.checked);
  if (target.dataset.batch) return void ((target.checked ? ui.batch.add(Number(target.dataset.batch)) : ui.batch.delete(Number(target.dataset.batch))), render());
  if (target.id === 'batch-all') return void (roster().forEach((p) => (target.checked ? ui.batch.add(p.id) : ui.batch.delete(p.id))), render());
  if (!target.dataset.change) return;
  try {
    const result = changes[target.dataset.change]?.(target.dataset, target.value);
    // A value outside the usual range still applies; the field is tinted so the player knows.
    if (result?.unusual) return void target.closest('.form-row')?.classList.add('is-unusual');
  } catch (cause) {
    fail(cause);
  }
  render();
});
document.body.addEventListener('input', (event) => {
  if (event.target.id !== 'search-person') return;
  ui.search = event.target.value;
  render();
});
window.addEventListener('keydown', doublePress('F8', () => (ui.sheet?.kind === 'editor' ? (actions.close(), render()) : openEditor())));
// Space holds and releases a fight.
window.addEventListener('keydown', (event) => event.key === ' ' && ui.fight && !ui.sheet && event.target === document.body && (event.preventDefault(), actions['fight-pause'](), render()));

// The map is dragged with a pointer and zoomed with the wheel or two fingers.
const mapTouches = new Map();
let pinch = 0;
app.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('.map-panel') || event.target.closest('.scene-zoom')) return;
  mapTouches.set(event.pointerId, { x: event.clientX, y: event.clientY, moved: 0 });
  pinch = 0;
});
window.addEventListener('pointermove', (event) => {
  const last = mapTouches.get(event.pointerId);
  if (!last) return;
  const dx = event.clientX - last.x,
    dy = event.clientY - last.y;
  Object.assign(last, { x: event.clientX, y: event.clientY, moved: last.moved + Math.abs(dx) + Math.abs(dy) });
  if (mapTouches.size >= 2) {
    const [a, b] = [...mapTouches.values()];
    const gap = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch) ui.map.zoom = Math.max(1, Math.min(3, (ui.map.zoom * gap) / pinch));
    pinch = gap;
  }
  if (last.moved > 6) (mapDragged = true), (ui.map.x += dx / mapTouches.size), (ui.map.y += dy / mapTouches.size), placeMap();
});
const liftMap = (event) => mapTouches.delete(event.pointerId) && ((pinch = 0), setTimeout(() => (mapDragged = false), 0));
window.addEventListener('pointerup', liftMap);
window.addEventListener('pointercancel', liftMap);
app.addEventListener('wheel', (event) => event.target.closest('.map-panel') && (event.preventDefault(), zoomMap(Math.exp(-event.deltaY * 0.0015))), { passive: false });

// ---- time ---------------------------------------------------------------------------------------------------

/** Days pass while the game is running and nothing is open over the page. */
setInterval(() => {
  if (!world || !ui.speed || ui.sheet || ui.fight || world.outcome) return;
  // Leave the page alone while the player has a list open, so it does not close under them.
  if (document.activeElement?.tagName === 'SELECT') return;
  const before = world.log.length;
  for (let i = 0; i < ui.speed; i++) advanceDay(world);
  if (world.day % 30 < ui.speed) slots.write('auto', world, autoLabel());
  const news = world.log.slice(before).filter((entry) => entry.sect === me()).at(-1);
  if (news) ui.notice = news.text;
  render();
}, 1000);
// A fight's bars and clock are redrawn a few times a second.
setInterval(() => ui.fight && !ui.sheet && render(), 400);

render();
loadArt().then((loaded) => ((art = loaded), render())).catch((cause) => console.warn('art:', cause));
