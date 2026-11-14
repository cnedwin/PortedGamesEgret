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
import { DIFFICULTIES, FOCUSES, MERIDIANS, RELIC_BY_ID, SCENARIOS } from './data/extras.mjs';
import { BUILDINGS, ECONOMY, PILLS, armorName, weaponName } from './data/goods.mjs';
import { FORMATIONS, HOUSE_RULES, TALENTS } from './data/jianghu.mjs';
import { PLACES, PLACE_BY_ID, RESOURCE_NAMES, RESOURCES } from './data/places.mjs';
import { OFFICES, RANKS, SECTS, SECT_BY_ID, applyIdentity } from './data/sects.mjs';
import { createBattle } from './core/battle.mjs';
import { createEditor, describeItem, doublePress } from './core/editor.mjs';
import {
  CUSTOM_ART_LIMIT, PLOT_COUNT, SPY_COST, createArt, movePlot, duelSides, gearOffer, giveRelic, innerLevels, makePill, meridianNeed, openMeridian, plantSpy,
  setFocus, settleDuel, upgradeGear, usePill, writeManual,
} from './core/extras.mjs';
import { formationsFor, pendingView, resolvePending, setRule } from './core/jianghu.mjs';
import { applyMod } from './core/mod.mjs';
import { APT_NAMES, STAT_KEYS, STAT_NAMES, hpMax, learnableArts, prowess } from './core/persons.mjs';
import { createRng } from './core/rng.mjs';
import { createSlots, deserialize, saveFileName, serialize } from './core/save.mjs';
import {
  SHOP_LIMIT, advanceDay, appoint, assault, assaultSides, donate, beds, build, buildAvailability, createWorld, dateText, gift, ledger, membersOf, openShop, placesOf, promote,
  recruit, relocate, residents, setJob, setMaster, settle, settleAssault, strength, tradeRoutes, upgrade, usedCells,
} from './core/world.mjs';
import { btn, esc, fact, formRow, icon, meter, mount, num, panelTitle, pill, resource, screenHead, tag } from './ui/kit.mjs';
import { createVoice } from './ui/voice.mjs';
import { createFeedbackAudio } from './ui/feedback-audio.mjs';
import { legacyScreen, prologue, prologueScreen, sectScreen } from './ui/opening.mjs';
import { claimGoal, goalView, startGoals } from './core/goals.mjs';

const app = document.querySelector('#app'),
  park = document.querySelector('#park'),
  viewBox = document.querySelector('#view'),
  dialog = document.querySelector('#dialog'),
  announcement = document.querySelector('#announcement');
const slots = createSlots(localStorage);
const voice = createVoice(localStorage);
const feedbackAudio = createFeedbackAudio(localStorage);

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
  /** Great matters waiting to be announced, the season last reported, and the strongholds held when last looked. */
  heralds: [],
  /** The pace time had before a sheet stopped it. */
  resume: 0,
  season: null,
  held: null,
  ended: false,
  /** Whether name plates in the roster are being ticked for an order to many at once. */
  picking: false,
  /** Which of the seat's panels is open. */
  seatTab: 'build',
  commandCollapsed: false,
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
  /** Whether the map is shown as a 3D model, where the device can draw one. */
  map3d: true,
  /** How a new game is to begin, and whether the seat's buildings are named. */
  scenario: 'many',
  difficulty: 1,
  founding: false,
  prologue: 0,
  succession: false,
  ownName: '',
  ownLeader: '',
  tags: true,
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

function toast(text, tone = 'notice') {
  if (!text) return;
  const marker = { success: '✓', warning: '!', notice: '◆' }[tone];
  announcement.dataset.tone = tone;
  announcement.innerHTML = `<span class="toast-mark" aria-hidden="true">${marker}</span><span class="toast-copy">${esc(text)}</span>`;
  announcement.hidden = false;
  feedbackAudio.play({ success: 'confirm', warning: 'reject', notice: 'notice' }[tone]);
  toast.sheet = ui.sheet;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    announcement.hidden = true;
    const inline = dialog.querySelector('.sheet-feedback');
    if (inline) inline.hidden = true;
    toast.sheet = null;
  }, tone === 'warning' ? 4800 : 3200);
}

/** Reports the reason when a command is refused and confirms completed orders. */
const say = (result, okText = '') => (toast(result.ok ? okText : result.why, result.ok ? 'success' : 'warning'), result.ok);

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
const picture = { stage: null, seat: null, realm: null, tried: false, modules: null };
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
    const [stageModule, seatModule, arenaModule, realmModule] = await Promise.all([import('./view/stage.mjs'), import('./view/seat.mjs'), import('./view/arena.mjs'), import('./view/realm.mjs')]);
    picture.modules = { ...stageModule, ...seatModule, ...arenaModule, ...realmModule };
    // Trees and plants come from model files; scenes are planted from them when they arrive.
    import('./view/flora.mjs').then((flora) => flora.loadFlora(new URL('./assets/flora/', location.href)));
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
  if (slot.dataset.stage === 'realm') {
    // The model of the realm is built once for a world and repainted as strongholds change hands.
    if (picture.realm?.world !== world) {
      picture.realm = picture.modules.createRealm(stage, () => world, { layer: document.querySelector('#layer') });
      picture.realm.world = world;
      picture.realm.select(ui.mapPlace, false);
    }
    if (stage.current !== picture.realm) stage.show(picture.realm);
    picture.realm.refresh();
    // Carts run on every road that some sect trades along.
    picture.realm.setTrade(SECTS.filter((sect) => world.sects[sect.id].alive).flatMap((sect) => tradeRoutes(world, sect.id)));
    // Columns that set out since the map was last looked at are seen on the road.
    for (const move of world.marches ?? []) if (move.day > (picture.realm.seen ?? world.day - 10) && move.from) picture.realm.parade(move.from, move.to, colorOf(move.by));
    picture.realm.seen = world.day;
    picture.realm.select(ui.mapPlace);
    return;
  }
  if (picture.seat?.placeId !== ui.place || picture.seat.world !== world) {
    picture.seat = picture.modules.createSeat(stage, () => world, ui.place, { layer: document.querySelector('#layer'), nameOf: (kind) => BUILDINGS[kind].name });
    picture.seat.world = world;
    stage.show(picture.seat);
  } else {
    if (stage.current !== picture.seat) stage.show(picture.seat);
    picture.seat.refresh();
  }
  picture.seat.showTags = ui.tags;
}

// ---- before a game: the title and the choice of sect ----------------------------------------------------

function titleScreen() {
  return `<main class="title-screen" style="${sceneStyle('title')}">
    <div class="title-nav"><span class="seal"><span>武</span><span>林</span></span></div>
    <div class="title-copy"><p class="title-era">大昭 · 承和元年</p><h1>武林<span>天下</span></h1><p>禁武令既下，江湖风雨欲来。<br>择一门派，兴建山门，教养弟子，问鼎武林。</p>
      <div class="title-actions">${btn('开创新局', 'page', { page: 'prologue' }, 'gold-button', 'arrow')}${btn('载入存档', 'sheet', { kind: 'load' }, 'on-dark', 'box')}</div>
    </div>
    <div class="title-version">为新白鹭引擎开发的 Demo</div>
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
  // The picture fills the screen behind everything: the realm on its page, the field in a fight, the seat otherwise.
  const scene = stagedScene();
  return `<div class="shell game" data-page="${ui.page}">
    <div class="backdrop ${isStaged() ? '' : 'is-dimmed'} ${isStaged() && scene !== 'battle' ? 'has-command' : ''}"><div class="stage-slot" data-stage="${scene}">${sceneImage({ realm: 'world', battle: 'battle', seat: 'seat' }[scene])}</div></div>
    <aside class="nav" aria-label="主要功能">
      <button class="nav-logo" data-act="page" data-page="saves" aria-label="存档"><span class="seal"><span>武</span><span>林</span></span></button>
      <nav class="nav-list" data-region="nav">${TABS.map(([id, label, glyph]) => `<button class="nav-button ${current === id ? 'is-active' : ''}" data-act="page" data-page="${id}" ${current === id ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span></button>`).join('')}</nav>
      <button class="nav-button nav-bottom" data-act="sheet" data-kind="settings">${icon('settings')}<span>设置</span></button>
    </aside>
    <header class="topbar" data-region="top">
      <div class="top-identity"><span class="sect-stamp" style="background:${sect.color}">${esc(sect.name[0])}</span><div><strong>${esc(sect.name)}</strong><button class="date-button" data-act="date" title="日期">${dateText(world)}</button></div></div>
      <div class="resources">${resource('coin', '银两', b.silver, '两')}${resource('grain', '粮草', b.grain, '石')}${resource('banner', '威望', b.renown)}${resource('balance', '正邪', b.virtue)}</div>
      <div class="time-controls"><span class="time-state" data-paused="${ui.speed === 0}">${ui.speed ? '行进中' : '已暂停'}</span><div class="speeds" role="group" aria-label="时间速度">${[[0, '暂停', 'pause'], [1, '行'], [4, '快'], [16, '疾']].map(speed).join('')}</div></div>
    </header>
    <main class="main ${isStaged() ? 'is-staged' : 'is-window'}" id="main"><div class="region" data-region="goal">${goalStrip()}</div><div class="region" data-region="notice">${end}${ui.notice ? `<div class="notice">${esc(ui.notice)}</div>` : ''}</div>${content}</main>
  </div>`;
}

/** Which scene the picture behind the screen shows. */
const stagedScene = () => (ui.page === 'battle' && ui.fight ? 'battle' : ui.page === 'world' && picture.stage && ui.map3d ? 'realm' : 'seat');
/** Whether the screen is the picture itself with panels over it, rather than a window in front of it. */
const isStaged = () => ui.page === 'seat' || (ui.page === 'battle' && !!ui.fight) || (ui.page === 'world' && !!picture.stage && ui.map3d);
const canFoldCommand = () => ui.page === 'seat' || (ui.page === 'world' && !!picture.stage && ui.map3d);
const commandToggle = (label) => `<button type="button" class="button on-dark ui-command-toggle" data-act="command-toggle" aria-controls="scene-command" aria-expanded="${!ui.commandCollapsed}">${icon(ui.commandCollapsed ? 'layers' : 'frame')}${ui.commandCollapsed ? label : '观景'}</button>`;

/** The matter in hand, shown above every screen: what to do, how far along, and where to go to do it. */
function goalStrip() {
  const goal = goalView(world);
  // A fight has the whole screen to itself.
  if (!goal || world.outcome || ui.fight) return '';
  const open = btn('要务', 'goal-open', {}, 'on-dark goal-open', 'banner');
  if (goal.last) return `${open}<section class="goal is-last"><div class="goal-mark">${icon('banner')}</div><div class="goal-copy"><b>${esc(goal.title)}</b><span>${esc(goal.text)}</span></div></section>`;
  const reward = Object.entries(goal.gives).map(([key, amount]) => `${{ silver: '银两', grain: '粮草', renown: '威望' }[key]} +${num(amount)}`).join('　');
  return `${open}<section class="goal ${goal.done ? 'is-done' : ''}">
    <div class="goal-mark"><small>要务</small><b>${goal.step}<i>/${goal.steps}</i></b></div>
    <div class="goal-copy"><b>${esc(goal.title)}</b><span>${esc(goal.done ? '此事已成，可以领赏了。' : goal.text)}</span>${goal.done ? '' : `<small>${icon('pin')}${esc(goal.how)}</small>`}</div>
    <div class="goal-side"><div class="goal-count"><span>${num(goal.now)} / ${num(goal.wanted)}</span>${meter(goal.now / goal.wanted)}</div>
      ${goal.done ? btn(`领赏　${reward}`, 'goal-claim', {}, 'primary') : goal.go ? btn('前往', 'goal-go', {}, 'outline', 'arrow') : `<span class="caption">${reward}</span>`}</div>
  </section>`;
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
  const tabs = [['build', '建筑'], ['recruit', `招贤${place.applicants.length ? ' ' + place.applicants.length : ''}`], ['here', '此地'], ['affairs', '事务']];
  if (!tabs.some(([id]) => id === ui.seatTab)) ui.seatTab = 'build';
  const tabPanel = {
    build: () => `<section class="panel building-panel">${panelTitle(kind.name, tag(`${picked.level} 级`))}
          <div class="building-detail"><p>${esc(kind.does)} · 占地 ${kind.cells} 格</p>${picked.level < kind.max ? btn(`升至 ${picked.level + 1} 级　${num(cost)} 两`, 'upgrade', { index: ui.building }, 'outline') : tag('已满级', 'positive')}</div>
          ${picked.kind === 'hall' || picked.kind === 'gate' ? '' : formRow('位置', `<select data-change="plot">${options([['', '由管事安排'], ...Array.from({ length: PLOT_COUNT }, (_, i) => [i, `第 ${i + 1} 块地（${i % 2 ? '东' : '西'}侧，离中路${['近', '中', '远'][Math.floor((i % 6) / 2)]}）`])], picked.plot ?? '')}</select>`)}
          ${picture.stage ? '<p class="caption building-hint">点画面上的建筑名，可查看别的建筑。</p>' : ''}
          <div class="building-switch ${picture.stage ? 'is-folded' : ''}" role="group" aria-label="现有建筑">${place.buildings.map((b, i) => pill(`${BUILDINGS[b.kind].name}${b.level > 1 ? ' ' + b.level : ''}`, 'building', { index: i }, i === ui.building)).join('')}</div>
        <div class="panel-foot">${btn('兴建建筑', 'sheet', { kind: 'build' }, 'primary', 'plus')}</div></section>`,
    recruit: () => `<section class="panel recruit-panel">${panelTitle('招贤榜', tag(place.applicants.length ? `${place.applicants.length} 人求见` : '无人求见', place.applicants.length ? 'positive' : 'plain'))}
          <div class="recruit-list">${place.applicants.slice(0, 4).map((p, i) => `<div class="recruit-content"><div class="recruit-avatar">${icon('people')}</div><div><h3>${esc(p.name)}</h3><p>${esc(p.origin)} · ${p.age}岁 · ${APT_NAMES[topAptitude(p)[0]]}资质 ${topAptitude(p)[1]}</p></div>${btn('会见', 'sheet', { kind: 'applicant', index: i }, 'outline')}</div>`).join('') || '<div class="recruit-content"><p>榜前无人。威望越高，来投的人越多、资质越好。</p></div>'}</div>
        </section>`,
    here: () => `<section class="panel">${panelTitle('此地', `<button class="text-link" data-act="page" data-page="disciples">驻此 ${here.length} 人 · 全派 ${row.members} 人 ${icon('arrow')}</button>`)}
        <div class="stat-grid"><div><span>建筑用地</span><b>${usedCells(world, placeId)}<small> / ${spec.cells}</small></b></div><div><span>厢房床位</span><b>${here.length}<small> / ${beds(world, placeId)}</small></b></div><div><span>山下店铺</span><b>${place.shops}<small> / ${SHOP_LIMIT}</small></b></div><div><span>掌门</span><b class="is-text">${leader?.place === placeId ? '在此' : esc(PLACE_BY_ID[leader?.place]?.name ?? '在外')}</b></div></div>
        <div class="terrain-list">${RESOURCES.map((key) => `<span>${RESOURCE_NAMES[key]} <strong>${dots(spec.resources[key])}</strong></span>`).join('')}</div>
        <div class="face-row">${[...here].sort((a, b) => b.rank - a.rank || b.level - a.level).slice(0, 14).map((p) => `<button data-act="person" data-id="${p.id}" title="${esc(p.name)} · ${RANKS[p.rank].name}">${face(p)}</button>`).join('')}${here.length > 14 ? `<button class="more" data-act="page" data-page="disciples">+${here.length - 14}</button>` : ''}</div>
        <div class="affairs">
          ${affair('此处专精', '一处据点只专一事', `<select data-change="focus">${options(Object.entries(FOCUSES).map(([id, f]) => [id, `${f.name}：${f.does}`]), place.focus ?? 'none')}</select>`)}
          ${affair('开设店铺', `每间每旬入银 ${ECONOMY.shopIncome.join('–')} 两，并代售门中出产`, btn(`${num(ECONOMY.shopCost)} 两`, 'shop', {}, 'outline', '', place.shops >= SHOP_LIMIT))}
        </div>
      </section>`,
    affairs: () => `<section class="panel">${panelTitle('门派事务', '<span class="caption">每旬结算</span>')}
        <div class="stat-grid"><div><span>全派薪俸</span><b>${row.wages}<small> 两</small></b></div><div><span>商路进项</span><b>${row.trade}<small> 两</small></b></div><div><span>上旬售货</span><b>${num(books().sold?.goods ?? 0)}<small> 两</small></b></div><div><span>朝廷关系</span><b>${Math.round(books().court)}</b></div></div>
        <div class="stock-line">库存　${RESOURCES.map((key) => `${RESOURCE_NAMES[key]} ${Math.round(books().res[key])}`).join(' · ')}</div>
        <div class="affairs">
          ${affair('门规', '全派上下一体遵行', `<select data-change="rule">${options(Object.entries(HOUSE_RULES).map(([id, rule]) => [id, `${rule.name}：${rule.does}`]), books().rule ?? 'plain')}</select>`)}
          ${affair('职位', '总管、教头、护法各司其职', btn('任命', 'sheet', { kind: 'offices' }, 'outline'))}
          ${affair('丹房', '炼药、服药', btn('入内', 'sheet', { kind: 'pills' }, 'outline'))}
          ${affair('布施', `散银 ${num(ECONOMY.donation)} 两，威望 +${ECONOMY.donationRenown}`, btn('布施', 'donate', {}, 'outline'))}
        </div>
      </section>`,
  }[ui.seatTab]();
  return `<section class="scene-panel seat-panel" aria-label="山门">
      <div class="region" data-region="seat-over">
        <div class="scene-top"><div class="scene-chip">${icon('pin')}<span>${esc(spec.name)}${seat}</span><small>${status}</small></div>${picture.stage ? `<div class="scene-chip hour-chip">${icon('banner')}<span id="hour-chip">${hourText()}</span></div>` : ''}${switcher}${commandToggle('山门指令')}</div>
        ${picture.stage ? `<div class="scene-zoom" role="group" aria-label="山门视角"><button data-act="zoom" data-dir="in" aria-label="拉近">${icon('plus')}</button><button data-act="zoom" data-dir="out" aria-label="拉远">${icon('minus')}</button><button data-act="zoom" data-dir="reset" aria-label="恢复全景">${icon('frame')}</button></div>
        <div class="scene-bottom"><span>${icon('layers')} 拖动转视角，滚轮或双指缩放</span><span><button class="scene-overlay-button" data-act="tags">${ui.tags ? '隐藏建筑名' : '显示建筑名'}</button></span></div>` : ''}
      </div>
    </section>
    <aside class="command" id="scene-command" data-region="seat-side">
      <div class="command-tabs" role="tablist">${tabs.map(([id, label]) => `<button role="tab" data-act="seat-tab" data-tab="${id}" class="${ui.seatTab === id ? 'is-active' : ''}" aria-selected="${ui.seatTab === id}">${label}</button>`).join('')}</div>
      <div class="command-body">${tabPanel}</div>
    </aside>`;
}

/** One line of things to be done: what it is, a word about it, and the control that does it. */
const affair = (name, about, control) => `<div class="affair"><div><b>${esc(name)}</b><small>${esc(about)}</small></div>${control}</div>`;

/** The hour in the seat's picture, by the old twelve-hour clock, with the part of the day it falls in. */
function hourText() {
  const hour = picture.seat?.light?.hour;
  if (hour === undefined) return '';
  const part = hour < 5 || hour >= 19.4 ? '夜' : hour < 8 ? '晨' : hour < 11 ? '上午' : hour < 13 ? '正午' : hour < 17 ? '午后' : '黄昏';
  return `${'子丑寅卯辰巳午未申酉戌亥'[Math.floor(((hour + 1) % 24) / 2)]}时 · ${part}`;
}
// The hour moves on its own, whether or not the days are passing.
setInterval(() => {
  const chip = document.querySelector('#hour-chip');
  if (chip) chip.textContent = hourText();
}, 2000);

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
  return { patrol: '行侠仗义', extort: '欺压良民', travel: '下山历练', rest: '休息' }[job.kind] ?? '休息';
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
const COMMON_JOBS = [...RESOURCES.map((key) => [`gather:${key}`, `采集${RESOURCE_NAMES[key]}`]), ['craft:weapon', '铸造兵器'], ['craft:armor', '织造护具'], ['craft:pill', '炼丹'], ['patrol', '行侠仗义'], ['extort', '欺压良民'], ['travel', '下山历练（三十日，长进快而有险）'], ['rest', '休息']];
function jobOf(value) {
  const [kind, arg] = value.split(':');
  return kind === 'train' || kind === 'seclude' ? { kind, art: arg } : kind === 'gather' ? { kind, res: arg } : kind === 'craft' ? { kind, make: arg } : { kind };
}

const weaponText = (person) => (person.gear.weapon?.relic ? `神兵·${RELIC_BY_ID[person.gear.weapon.relic].name}` : person.gear.weapon ? weaponName(person.gear.weapon.slot, person.gear.weapon.grade) : '空手');
const RANK_FILTERS = ['全部', '掌门', '长老', '亲传', '内门', '外门', '杂役'];
function roster() {
  return membersOf(world, me())
    .filter((p) => (ui.rank === '全部' || RANKS[p.rank].name === ui.rank) && (!ui.search || [p.name, jobText(p), bestArtText(p), PLACE_BY_ID[p.place].name].join(' ').includes(ui.search)))
    .sort((a, b) => b.rank - a.rank || b.level - a.level || a.id - b.id);
}
const picked = () => world.persons[ui.person]?.school === me() ? world.persons[ui.person] : leaderOf(me()) ?? membersOf(world, me())[0];

function disciplesScreen() {
  const all = membersOf(world, me()),
    rows = roster();
  for (const id of ui.batch) if (world.persons[id]?.school !== me()) ui.batch.delete(id);
  const many = placesOf(world, me()).length > 1;
  return `${screenHead('弟子', '门中弟子', `在册 ${all.length} 人 · 点一人查看详情、安排差事与武学`, btn('武学名录', 'page', { page: 'arts' }, 'outline', 'scroll'))}
    <section class="panel disciple-roster">
      <div class="panel-title roster-header"><div class="button-group" data-region="rank-filter">${RANK_FILTERS.map((rank) => pill(rank, 'rank', { rank }, ui.rank === rank)).join('')}</div><label class="search-wrap"><span class="sr-only">查找弟子</span><input type="search" id="search-person" value="${esc(ui.search)}" placeholder="查找弟子" autocomplete="off"></label></div>
      <div class="batch-toolbar" data-region="batch">${ui.picking ? `<span>已选 ${ui.batch.size} 人 · 点名牌增减</span>${btn('全选所列', 'batch-all', {}, 'ghost')}${btn('改派差事', 'sheet', { kind: 'batch' }, 'primary', '', !ui.batch.size)}${btn('完成', 'picking', {}, 'outline')}` : `<span>${rows.length} 人</span>${btn('多选改派', 'picking', {}, 'outline')}`}</div>
      <div class="member-grid" data-region="roster">${rows.map((p) => memberCard(p, { act: ui.picking ? 'batch-toggle' : 'person', on: ui.picking && ui.batch.has(p.id), where: many })).join('') || '<p class="empty">暂无符合条件的弟子。</p>'}</div>
    </section>`;
}

/**
 * A person's name plate, the same wherever people are listed: face, name,
 * standing, what they are best at, what they are doing and how loyal they are.
 */
function memberCard(p, { act = 'person', on = false, where = false, data = '' } = {}) {
  return `<button class="member-card ${on ? 'is-picked' : ''}" data-act="${act}" data-id="${p.id}" ${data}>${face(p, 'member-face')}
    <span class="member-main"><b>${esc(p.name)}${p.wounds > 0.05 ? ' <i class="bad">伤</i>' : ''}</b><small>${RANKS[p.rank].name} · ${p.level} 级${where ? ' · ' + esc(PLACE_BY_ID[p.place].name) : ''}</small><small>${esc(bestArtText(p))}</small></span>
    <span class="member-side"><em>${num(prowess(p))}</em><small>${esc(jobText(p))}</small>${meter(p.loyalty, p.loyalty < 30 ? 'enemy' : 'morale', '忠诚')}</span></button>`;
}

// ---- the arts ------------------------------------------------------------------------------------------

function artsScreen() {
  const list = ARTS.filter((a) => ui.artTier === '全部' || a.tier === Number(ui.artTier));
  const chosen = ART_BY_ID[ui.art] ?? list[0],
    person = picked();
  const needs = chosen ? unmetNeeds(person, chosen).filter((need) => !(chosen.tier === 5 && need === '需闭关领悟')) : [];
  const klass = chosen ? CLASSES[chosen.klass] : null;
  return `${screenHead('弟子', '武学名录', '十二类武学，五阶七十二门。一至三阶各派通用，四阶五阶为门派专属。', `<label class="for-whom"><span>为谁择艺</span><select data-change="arts-person">${options(membersOf(world, me()).sort((a, b) => b.rank - a.rank || b.level - a.level).map((p) => [p.id, `${p.name}（${RANKS[p.rank].name}）`]), person.id)}</select></label>` + btn('返回弟子', 'page', { page: 'disciples' }, 'outline', 'back'))}
    <div class="arts-layout"><section class="panel">${panelTitle('藏经阁', `<div class="button-group" data-region="art-tier">${['全部', 1, 2, 3, 4, 5].map((t) => pill(t === '全部' ? t : `${t}阶`, 'art-tier', { tier: t }, String(ui.artTier) === String(t))).join('')}</div>`)}
      <div class="arts-grid" data-region="arts">${list.map((a) => `<button class="art-button ${a.id === chosen?.id ? 'is-active' : ''}" data-act="art" data-id="${a.id}">${icon('scroll')}<span>${esc(a.name)}<small>${CLASSES[a.klass].name} · ${a.tier}阶${a.sect ? ' · ' + SECT_BY_ID[a.sect].name : ''}</small></span></button>`).join('')}</div></section>
      <section class="panel art-detail" data-region="art">${panelTitle(chosen?.name ?? '武学')}${chosen ? `<dl class="facts">${fact('阶位', `${chosen.tier}阶`)}${fact('类别', klass.name)}${fact('归属', esc(SECT_BY_ID[chosen.sect]?.name ?? '通用'))}${fact('倚重', klass.attrs.map((key) => STAT_NAMES[key]).join('、'))}${fact(`${esc(person.name)}已练`, `${levelOf(person.arts[chosen.id] ?? 0)} 重`)}</dl>
        <ol class="moves">${chosen.moves.map((move) => `<li>${esc(move.name)}：威力 ${Math.round(move.power)}，耗内力 ${move.nei}（${move.level} 重解锁）</li>`).join('')}</ol>
        ${needs.length ? `<p class="moves bad">${esc(person.name)}尚不能修练：${esc(needs.join('、'))}</p>` : ''}
        ${btn(chosen.tier === 5 ? `让${person.name}闭关领悟` : `让${person.name}修练`, 'train-art', { id: chosen.id }, 'primary', 'scroll', needs.length > 0)}
        ${btn(`由${person.name}著成秘笈`, 'manual', { id: chosen.id }, 'outline', '', levelOf(person.arts[chosen.id] ?? 0) < 7)}
        <p class="moves">${chosen.custom ? `${esc(chosen.founder)}所创。` : ''}${books().manuals[chosen.id] ? `藏经阁有 ${books().manuals[chosen.id]} 重抄本，在有藏经阁之处修练此艺更快。` : '练至七重者可著成秘笈，藏于阁中供后学研读。'}</p>` : ''}</section></div>`;
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
  const model = picture.stage && ui.map3d;
  return `${model ? '' : screenHead('江湖', '天下舆图', '点据点查看详情与可行之事。', btn('门派往来', 'sheet', { kind: 'diplomacy' }, 'outline', 'banner'))}
    <div class="world-layout ${model ? 'is-model' : ''}">
      ${model ? `<section class="scene-panel map-panel is-model" aria-label="天下沙盘">
        <div class="scene-top"><div class="scene-chip">${icon('map')}<span>大昭疆域</span><small>拖动平移 · 滚轮缩放</small></div>${commandToggle('据点详情')}${btn('门派往来', 'sheet', { kind: 'diplomacy' }, 'on-dark', 'banner')}${btn('画卷', 'mapmode', {}, 'on-dark', 'map')}</div>
        <div class="scene-zoom map-zoom"><button data-act="zoom" data-dir="in" aria-label="拉近">${icon('plus')}</button><button data-act="zoom" data-dir="out" aria-label="拉远">${icon('minus')}</button><button data-act="zoom" data-dir="reset" aria-label="恢复全景">${icon('frame')}</button></div>
      </section>` : `<section class="scene-panel map-panel" aria-label="天下舆图"><div class="scene-viewport"><div class="scene-stage map-stage">${sceneImage('world')}<div class="region" data-region="map">${mapMarks()}</div></div></div>
        <div class="map-label"><span>大昭疆域</span><small>二十据点</small></div>
        <div class="map-key"><span><i class="legend-home" style="--marker:${SECT_BY_ID[me()].color}"></i> 本派</span><span><i class="legend-faction"></i> 他派（按门派着色）</span><span><i></i> 无主</span></div>
        <div class="scene-zoom map-zoom"><button data-act="mapzoom" data-dir="in" aria-label="放大舆图">${icon('plus')}</button><button data-act="mapzoom" data-dir="out" aria-label="缩小舆图">${icon('minus')}</button><button data-act="mapzoom" data-dir="reset" aria-label="重置舆图">${icon('frame')}</button></div>
        ${picture.stage ? `<div class="scene-bottom"><button class="scene-overlay-button" data-act="mapmode">改看沙盘</button><span></span></div>` : ''}
      </section>`}
      <aside class="world-side ${model ? 'command' : ''}" ${model ? 'id="scene-command"' : ''} data-region="world-side">
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
      <section class="panel" style="margin-top:16px" data-region="duel">${panelTitle('擂台', tag('每三十日一开'))}<p class="moves" style="padding-top:10px">让一名弟子登擂，与过路的好手单打独斗。胜则扬名，负则带伤。</p><div class="detail-actions">${btn('选人登擂', 'duel', {}, 'primary', 'swords')}</div></section>
      ${last ? `<section class="panel battle-report" data-region="last-fight">${panelTitle('上一战 · ' + last.title)}<p>${esc(last.verdict)}</p>${last.lines.slice(-8).map((line) => `<p>${icon('swords')}${esc(line)}</p>`).join('')}</section>` : ''}`;
  }
  const { arena, title, heads, lines, side: mine } = ui.fight,
    battle = arena.battle;
  const side = (index) => {
    const units = battle.units.filter((unit) => unit.side === index),
      left = units.filter((unit) => !unit.down && !unit.fled);
    const share = (units.reduce((sum, unit) => sum + (unit.down || unit.fled ? 0 : unit.hp), 0) / units.reduce((sum, unit) => sum + unit.hpMax, 0)) * 100;
    return `<div class="army army-${index}">${face(heads[index].person, 'army-portrait')}<div><div class="army-name"><b>${esc(heads[index].name)}</b><span>${left.length} / ${units.length}</span></div>${meter(share, index === mine ? 'health' : 'enemy', `${heads[index].name}兵力`)}</div></div>`;
  };
  const marked = battle.units.find((unit) => unit.id === battle.orders[mine].focus && !unit.down);
  const clock = `${String(Math.floor(battle.time / 60)).padStart(2, '0')}:${String(Math.floor(battle.time % 60)).padStart(2, '0')}`;
  const stance = battle.stances[mine];
  return `<section class="scene-panel battle-panel" aria-label="战斗场景">
      <div class="region" data-region="battle-over">
        <div class="battle-top">${side(0)}<div class="fight-clock"><em>${esc(title)}</em><b>${clock}</b><small>${battle.done ? '胜负已分' : arena.paused ? '已暂停' : '交战中'}</small></div>${side(1)}</div>
        <div class="battle-bottom"><span class="battle-hint">${icon(marked ? 'target' : 'info')} ${marked ? `集火：${esc(marked.name)}（再点一次取消）` : '点选敌人下令集火'}</span>
          <div class="battle-orders">${btn(arena.paused ? '继续' : '暂停', 'fight-pause', {}, 'on-dark', arena.paused ? 'play' : 'pause')}
            <div class="speeds dark-speeds" role="group" aria-label="战斗速度">${[1, 2, 4].map((s) => `<button data-act="fight-speed" data-speed="${s}" class="${s === arena.speed && !arena.paused ? 'is-active' : ''}">${s}×</button>`).join('')}</div>
            ${btn(battle.rallied[mine] > 0 ? '号令中' : '号令', 'fight-rally', {}, 'on-dark', '', battle.rallied[mine] !== 0)}
            <div class="speeds dark-speeds" role="group" aria-label="攻守">${[['attack', '攻'], ['even', '衡'], ['defend', '守']].map(([id, label]) => `<button data-act="fight-stance" data-stance="${id}" class="${stance === id ? 'is-active' : ''}" title="${{ attack: '攻势加一成，防御减一成', even: '攻守均衡', defend: '防御加一成，攻势减一成' }[id]}">${label}</button>`).join('')}</div>
            ${btn('速决', 'fight-skip', {}, 'on-dark')}${btn('撤退', 'sheet', { kind: 'retreat' }, 'danger', '', battle.orders[mine].retreat)}</div></div>
      </div>
    </section>
    <section class="battle-report is-floating" data-region="battle-log">${lines.slice(-6).reverse().map((line) => `<p>${icon('swords')}${esc(line)}</p>`).join('') || '<p>两军正在接近。</p>'}</section>`;
}

/** One line of a fight's account, or nothing for an event not worth telling. */
function tell(event, name) {
  if (event.type === 'hit' && (event.crit || event.flank > 1))
    return `${event.time.toFixed(0)}秒 ${name(event.from)}以${event.art ?? ''}「${event.move}」${event.flank > 1.2 ? '背袭' : event.flank > 1 ? '侧击' : ''}${event.crit ? '重创' : '击中'}${name(event.to)}，伤 ${event.damage}`;
  if (event.type === 'down') return `${event.time.toFixed(0)}秒 ${name(event.id)}倒下`;
  if (event.type === 'fled') return `${event.time.toFixed(0)}秒 ${name(event.id)}脱离战场`;
  if (event.type === 'rally') return `${event.time.toFixed(0)}秒 一声号令，${event.side ? '守方' : '攻方'}士气大振`;
  return '';
}

/**
 * Plays a fight. With the 3D picture it is played out and the player gives
 * orders; without it the fight is settled at once. Either way it ends in a
 * written account.
 * @param fight.heads   who leads each side: `{ name, person }`, for the bars
 * @param fight.side    which side the player commands
 * @param fight.settle  applies the result to the world: (summary, rng) => { won, verdict }
 */
function startFight({ sides, formations = [], title, heads, colors, side = 0, settle: settleFight }) {
  const rng = createRng(1);
  rng.state = world.rng;
  const battle = createBattle({ sides, formations, seed: rng.int(1, 1e9) });
  const names = new Map(sides.flat().map((person) => [person.id, person.name]));
  const name = (id) => names.get(id) ?? '？';
  const lines = [];
  const people = new Map(sides.flat().map((person) => [person.id, person]));
  const note = (event) => {
    // Whoever lands a telling blow calls out the art it came from.
    if (ui.fight && event.type === 'hit' && event.crit && event.art) voice.shout(event.art + '！', people.get(event.from));
    const line = tell(event, name);
    if (line && (event.type !== 'hit' || lines.length < 80)) lines.push(line);
  };
  const finish = () => {
    const summary = { winner: battle.winner, time: battle.time, fighters: battle.units.map((u) => ({ id: u.id, side: u.side, down: u.down, fled: u.fled, hpLeft: u.hp / u.hpMax, dealt: u.dealt, xp: Math.round(u.dealt) })) };
    const result = settleFight(summary, rng);
    world.rng = rng.state;
    ui.fight = null;
    ui.lastFight = { title, won: result.won, verdict: `${result.verdict}历时 ${battle.time.toFixed(0)} 秒。`, lines };
    feedbackAudio.play(result.won ? 'victory' : 'defeat');
    ui.sheet = { kind: 'fight' };
  };
  ui.resume ||= ui.speed;
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
  const arena = picture.modules.createArena(picture.stage, battle, { colors, layer: document.querySelector('#layer'), onEvent: note, onEnd: () => (finish(), render()), playerSide: side });
  ui.fight = { arena, title, heads, lines, side };
  ui.page = 'battle';
}
const colorOf = (sectId) => parseInt(SECT_BY_ID[sectId].color.slice(1), 16);
const headOf = (sectId) => ({ name: SECT_BY_ID[sectId].name, person: leaderOf(sectId) ?? founder(SECT_BY_ID[sectId]) });
const fallenText = (outcome) => (outcome.fallen.length ? `战殁：${outcome.fallen.join('、')}。` : '无人战殁。');

/** Marches on a stronghold with the sect's ten best. */
function march(placeId) {
  const prepared = assaultSides(world, me(), placeId, marchParty().map((p) => p.id));
  if (!prepared.ok) return say(prepared);
  startFight({
    ...prepared, title: `攻打${PLACE_BY_ID[placeId].name}`, heads: [headOf(me()), headOf(prepared.defender)], colors: [colorOf(me()), colorOf(prepared.defender)],
    settle(summary, rng) {
      const outcome = settleAssault(world, me(), placeId, summary, rng);
      return { won: outcome.won, verdict: `${outcome.won ? '得胜，据点易主。' : '败退。'}${fallenText(outcome)}` };
    },
  });
}

/** Meets an attack on one of the player's strongholds in person. */
function defend() {
  const { attacker, place, party } = world.pending;
  world.pending = null;
  const prepared = assaultSides(world, attacker, place, party);
  if (!prepared.ok) return toast('来敌已退。');
  startFight({
    ...prepared, title: `${SECT_BY_ID[attacker].name}来犯${PLACE_BY_ID[place].name}`, heads: [headOf(attacker), headOf(me())], colors: [colorOf(attacker), colorOf(me())], side: 1,
    settle(summary, rng) {
      const outcome = settleAssault(world, attacker, place, summary, rng);
      return { won: !outcome.won, verdict: `${outcome.won ? '据点失守。' : '守住了。'}${fallenText(outcome)}` };
    },
  });
}

/** Sends the picked disciple up on the duelling stage. */
function duel() {
  const person = picked();
  const rng = createRng(1);
  rng.state = world.rng;
  const prepared = duelSides(world, person.id, rng);
  world.rng = rng.state;
  if (!prepared.ok) return say(prepared);
  startFight({
    sides: prepared.sides, title: `擂台 · ${person.name}对${prepared.rival.name}`, heads: [{ name: person.name, person }, { name: prepared.rival.name, person: prepared.rival }], colors: [colorOf(me()), 0x6b6255],
    settle(summary) {
      const mine = summary.fighters[0];
      settleDuel(world, person.id, summary.winner === 0, mine.hpLeft, mine.dealt);
      return { won: summary.winner === 0, verdict: summary.winner === 0 ? `${person.name}胜，威望有增。` : `${person.name}负，带伤下台。` };
    },
  });
}

// ---- the chronicle and the saves -----------------------------------------------------------------------

const LOG_TYPES = { start: '立派', conquer: '征伐', repel: '守御', fall: '覆灭', settle: '分舵', death: '讣告', desert: '叛离', insight: '领悟', succession: '传位', summit: '大会', event: '奇遇', court: '朝廷', join: '来投' };

function chronicleScreen() {
  const records = world.log.filter((r) => ui.logFilter === '全部' || (ui.logFilter === '本派') === (r.sect === me() || r.type === 'start')).slice(-160).reverse();
  // The record reads as annals: a heading for each year, the great matters set apart from the small.
  const GREAT = new Set(['start', 'conquer', 'fall', 'succession', 'summit', 'settle']);
  let lastYear = null;
  const lines = records.map((r) => {
    const y = 1 + Math.floor(r.day / 360),
      head = y !== lastYear ? `<li class="annal-year"><b>承和 ${y} 年</b></li>` : '';
    lastYear = y;
    return `${head}<li class="${GREAT.has(r.type) ? 'is-great' : ''} ${r.sect === me() ? 'is-mine' : ''}"><time>${dayText(r.day).replace(/^承和\d+年/, '')}</time><div>${tag(LOG_TYPES[r.type] ?? '江湖', r.sect === me() ? 'positive' : 'plain')}<p>${esc(r.text)}</p></div></li>`;
  });
  return `${screenHead('纪事', '门派纪事', '年年岁岁，山门与江湖的大小事。')}
    <section class="panel chronicle-panel">${panelTitle('编年', `<div class="button-group" data-region="log-filter">${['全部', '本派', '江湖'].map((t) => pill(t, 'log-filter', { filter: t }, ui.logFilter === t)).join('')}</div>`)}
      <ol class="timeline annals" data-region="log">${lines.join('') || '<li><p>暂无记录。</p></li>'}</ol>
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
/** Sheets opened from a person's panel, which return to it. */
const PERSON_SHEETS = new Set(['job', 'wheel', 'gear', 'meridian', 'create', 'master', 'move']);
const closeBtn = (label = '取消') => btn(label, 'close', {}, 'outline');
const pillText = (pill) => { const e = pill.effect; return e.hp ? '疗伤' : e.nei ? '增长修为' : e.cure ? '解毒' : e.stat ? '臂腰腿内各 +1（每人限二十颗）' : e.aptitude ? '最弱的一项资质 +5' : e.insight ? '闭关时服用，更易有悟' : ''; };

/** The sheets, by kind: each gives a title, a body and the buttons at its foot. */
const SHEETS = {
  goal() {
    const goal = goalView(world);
    if (!goal) return ['要务', '<p>眼下暂无待办要务。</p>', closeBtn('返回')];
    const reward = !goal.last && Object.entries(goal.gives).map(([key, amount]) => `${{ silver: '银两', grain: '粮草', renown: '威望' }[key]} +${num(amount)}`).join('　');
    const next = goal.done ? btn('领取赏赐', 'goal-claim', {}, 'primary') : goal.go ? btn('前往', 'goal-go', {}, 'primary', 'arrow') : '';
    return [goal.title, `<div class="goal-detail"><p>${esc(goal.text)}</p>${goal.last ? '' : `<p>${esc(goal.how)}</p><p>${num(goal.now)} / ${num(goal.wanted)}${meter(goal.now / goal.wanted)}</p><p>${esc(reward)}</p>`}</div>`, closeBtn('返回') + next];
  },
  load() {
    const saves = slots.list();
    return ['载入存档', `${saves.length ? `<div class="choice-list">${saves.map((s) => btn(`${s.slot === 'auto' ? '自动存档' : '存档位 ' + s.slot} · ${s.label ?? ''}`, 'load', { slot: s.slot }, 'outline', 'box')).join('')}</div>` : '<p>这个浏览器里还没有存档。</p>'}`, btn('导入存档文件', 'import', {}, 'outline', 'plus') + closeBtn('关闭')];
  },
  build() {
    const spec = PLACE_BY_ID[ui.place];
    const free = spec.cells - usedCells(world, ui.place);
    const selected = ui.sheet.buildKind ?? Object.keys(BUILDINGS).find(kind => buildAvailability(world, me(), ui.place, kind).ok) ?? 'dorm';
    const availability = buildAvailability(world, me(), ui.place, selected);
    const cards = Object.entries(BUILDINGS).map(([kind, b]) => {
      const status = buildAvailability(world, me(), ui.place, kind);
      return `<button type="button" class="build-card" data-act="build-kind" data-kind="${kind}" aria-pressed="${selected === kind}">
        <span class="build-card-head">${icon(b.makes ? 'settings' : b.trains ? 'swords' : b.yields ? 'layers' : 'gate')}<b>${esc(b.name)}</b></span>
        <span>${esc(b.does)}</span><small>${num(b.cost)} 两 · ${b.cells} 格</small>
        ${status.ok ? '' : `<small class="bad">${esc(status.why)}</small>`}</button>`;
    }).join('');
    return ['兴建建筑', `<div class="build-budget"><span>${icon('pin')}${esc(spec.name)} · 余地 ${free} 格</span><span>${icon('coin')}${num(books().silver)} 两</span></div>
      <div class="build-catalog" role="group" aria-label="建筑">${cards}</div>
      <input type="hidden" id="build-kind" value="${selected}">
      ${availability.ok ? '' : `<p class="build-reason bad">${esc(availability.why)}</p>`}`,
      closeBtn() + btn(`兴建${BUILDINGS[selected].name}`, 'build', {}, 'primary', 'plus', !availability.ok)];
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
      <div class="wheel">${Array.from({ length: size }, (_, i) => `<select data-wheel="${i}">${options([['', '（自行斟酌）'], ...moves.map(({ id, slot, move }) => [`${id}:${slot}`, `${ART_BY_ID[id].name}·${move.name}`])], wheel[i] ? `${wheel[i].art}:${wheel[i].move}` : '')}</select>`).join('')}</div>
      ${formRow('站位', `<select id="row-select">${options([['', '按兵器长短'], ['front', '站前排'], ['back', '站后排']], person.row ?? '')}</select>`)}`, btn('交还本人安排', 'wheel-auto', {}, 'outline') + closeBtn() + btn('定下次序', 'wheel', {}, 'primary')];
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
      ${formRow('阵法', `<select id="formation">${options(formationsFor(me(), party).map((id) => [id, `${FORMATIONS[id].name}：${FORMATIONS[id].does}`]), books().formation ?? 'line')}</select>`)}
      <p class="caption">出战者取全派战力最高的十人，伤重者留守。本派阵法需有长老或掌门在阵中。得胜则据点易主；开战后两派交恶。</p>`, closeBtn() + btn('出兵', 'march', { place }, 'primary', 'swords', !party.length)];
  },
  event() {
    const view = pendingView(world);
    if (!view) return ['江湖', '<p>此事已了。</p>', closeBtn('关闭')];
    ui.sheet.title = view.title;
    const person = view.portraitId ? { portraitId: view.portraitId, name: view.title.split(' · ')[1], school: me() } : null;
    const choices = `<div class="choice-list">${view.choices.map((choice, index) => `<button type="button" class="button outline" data-act="answer" data-index="${index}" ${choice.why ? 'disabled' : ''}><span>${esc(choice.label)}<small>${esc(choice.why || choice.hint)}</small></span></button>`).join('')}</div>`;
    const url = person && art ? portraitUrl(art, person, { view: 'full', expression: view.expression }) : undefined;
    return [view.title, url ? `<div class="encounter"><div class="encounter-portrait"><img src="${esc(url)}" alt="${esc(person.name)}"></div><div>${tag({ wish: '心愿', trial: '初试', legacy: '托付' }[view.kind] ?? '江湖奇人', 'positive')}<p style="margin-top:8px">${esc(view.text)}</p>${choices}</div></div>` : `<p>${esc(view.text)}</p>${choices}`, ''];
  },
  person() {
    const person = picked(),
      all = membersOf(world, me());
    const many = placesOf(world, me()).length > 1;
    const elders = all.filter((p) => p.rank >= 4 && p.id !== person.id);
    const master = world.persons[person.master];
    return [person.name, `<div class="person-sheet"><div class="person-sheet-side">
      <div class="person-visual">${sceneImage('title')}${face(person, 'detail-avatar', 'full')}<div class="leader-shade"></div><div class="person-caption">${tag(RANKS[person.rank].name, 'dark-tag')}<h2>${esc(person.name)}</h2><p>${esc(person.origin)} · ${person.female ? '女' : '男'} · ${person.age} 岁 · ${person.level} 级</p></div></div>
        <dl class="person-stats">${fact('气血', `${meter((1 - (person.wounds ?? 0)) * 100, 'health', '气血')} <b>${hpMax(person)}</b>`)}${fact('忠诚', `${meter(person.loyalty, 'morale', '忠诚')} <b>${Math.round(person.loyalty)}</b>`)}${fact('战力', `<b>${prowess(person)}</b>`)}${fact('差事', esc(jobText(person)))}${fact('所长', esc(bestArtText(person)))}${fact('师承', esc(master?.name ?? '无'))}</dl>
        <div class="person-facts"><div>${STAT_KEYS.map((key) => `${STAT_NAMES[key]} <b>${Math.round(person.stats[key])}</b>`).join('　')}</div><div>兵器：<b>${esc(weaponText(person))}</b>　护具：<b>${esc(armorName(person.gear.armor || 1))}</b>　经脉：<b>${person.meridians?.length ?? 0}</b> / 8</div>${person.talent ? `<div>天赋：<b>${TALENTS[person.talent].name}</b>（${TALENTS[person.talent].does}${person.talentDeep ? '，心愿已了，其效加倍' : ''}）</div>` : ''}<div>资质：${Object.entries(person.apt).map(([key, value]) => `${APT_NAMES[key]} <b>${value}</b>`).join('　')}</div>
          <div>武学：${Object.entries(person.arts).sort((a, b) => ART_BY_ID[b[0]].tier - ART_BY_ID[a[0]].tier).slice(0, 8).map(([id, points]) => `${ART_BY_ID[id].name} <b>${levelOf(points)}</b>重`).join('　') || '尚未习武'}</div></div>
      </div><div class="person-sheet-main">
        <div class="detail-actions">${btn('修练武学', 'page', { page: 'arts' }, 'primary', 'scroll')}${btn('改派差事', 'sheet', { kind: 'job' }, 'outline')}${btn('出招与站位', 'sheet', { kind: 'wheel' }, 'outline')}${btn('装备丹药', 'sheet', { kind: 'gear' }, 'outline')}${btn('经脉', 'sheet', { kind: 'meridian' }, 'outline')}${person.rank >= 3 ? btn('自创武学', 'sheet', { kind: 'create' }, 'outline') : ''}${person.rank < 4 ? btn('晋升', 'promote', { id: person.id }, 'outline') : ''}${person.rank < 4 && elders.length ? btn('拜师', 'sheet', { kind: 'master' }, 'outline') : ''}${many ? btn('调往', 'sheet', { kind: 'move' }, 'outline') : ''}</div>
      </div></div>`, closeBtn('关闭')];
  },
  duel() {
    const able = membersOf(world, me()).filter((p) => p.wounds <= 0.3).sort((a, b) => prowess(b) - prowess(a));
    return ['登擂', `<p class="caption">点一人登擂，与过路的好手单打独斗。胜则扬名，负则带伤。伤重者不在此列。</p><div class="member-grid">${able.map((p) => memberCard(p, { act: 'duel' })).join('') || '<p class="empty">无人可战。</p>'}</div>`, closeBtn()];
  },
  season() {
    const { was, now, mine, abroad, title } = ui.sheet;
    const row = (label, key, unit = '') => {
      const change = Math.round(now[key] - was[key]);
      return `<div><span>${label}</span><b>${num(now[key])}<small>${unit}</small></b><em class="${change < 0 ? 'bad' : change > 0 ? 'good' : ''}">${change > 0 ? '+' : ''}${change ? num(change) : '—'}</em></div>`;
    };
    const list = (entries, none) => entries.map((r) => `<li>${tag(LOG_TYPES[r.type] ?? '江湖')}<span>${esc(r.text)}</span></li>`).join('') || `<li><span class="caption">${none}</span></li>`;
    return [title, `<div class="season-grid">${row('银两', 'silver', '两')}${row('粮草', 'grain', '石')}${row('威望', 'renown')}${row('门人', 'members', '人')}${row('据点', 'places', '处')}</div>
      <h3 class="season-head">本派</h3><ul class="season-list">${list(mine, '这一季山门无事。')}</ul>
      <h3 class="season-head">江湖</h3><ul class="season-list">${list(abroad, '这一季江湖平静。')}</ul>
      <p class="caption">季报可在设置里关掉。</p>`, btn('继续', 'close', {}, 'primary')];
  },
  herald: ({ label, text }) => [label, `<div class="herald"><div class="herald-seal">${esc(label)}</div><p>${esc(text)}</p></div>`, btn('知道了', 'close', {}, 'primary')],
  outcome: ({ title, text }) => [title ?? '江湖', `<p>${esc(text)}</p>`, btn('知道了', 'close', {}, 'primary')],
  siege() {
    const pending = world.pending;
    if (pending?.kind !== 'siege') return ['来犯', '<p>来敌已退。</p>', closeBtn('关闭')];
    const party = pending.party.map((id) => world.persons[id]).filter(Boolean),
      guard = residents(world, pending.place).sort((a, b) => prowess(b) - prowess(a)).slice(0, 10);
    return [`${SECT_BY_ID[pending.attacker].name}来犯`, `<p>${esc(SECT_BY_ID[pending.attacker].name)}的人马已到${esc(PLACE_BY_ID[pending.place].name)}山门之外。</p>
      <dl class="facts">${fact('来敌', `${party.length} 人 · 战力 ${num(strength(party))}`)}${fact('我方守卫', `${guard.length} 人 · 战力 ${num(strength(guard))}`)}</dl>
      ${formRow('阵法', `<select id="formation">${options(formationsFor(me(), guard).map((id) => [id, `${FORMATIONS[id].name}：${FORMATIONS[id].does}`]), books().formation ?? 'line')}</select>`)}
      <p class="caption">守在此处的人迎战，山门与箭楼助守。亲自指挥，或交由守将自行应对。</p>`, btn('交由守将', 'siege-auto', {}, 'outline') + btn('亲自指挥', 'siege-fight', {}, 'primary', 'swords')];
  },
  gear() {
    const person = picked(),
      offer = gearOffer(world, person.id),
      relics = books().relics ?? [];
    const pills = Object.entries(books().stock).filter(([id]) => id.startsWith('pill:'));
    const holder = (id) => Object.values(world.persons).find((p) => p.gear.weapon?.relic === id)?.name;
    return [`装备丹药 · ${person.name}`, `<dl class="facts">${fact('兵器', esc(weaponText(person)))}${fact('护具', esc(armorName(person.gear.armor || 1)))}</dl>
      <div class="detail-actions">${offer.ok ? btn(`打造下一品（${offer.silver}两、铁矿 ${offer.iron}）`, 'gear-up', {}, 'primary') : `<span class="caption">${esc(offer.why)}</span>`}</div>
      <h3 style="margin-top:12px">神兵</h3>${relics.length ? `<div class="choice-list">${relics.map((id) => `<button type="button" class="button outline" data-act="relic" data-id="${id}"><span>${esc(RELIC_BY_ID[id].name)}（${{ sword: '剑', saber: '刀', spear: '枪', staff: '棍', glove: '拳套', stylus: '点穴笔', dart: '暗器' }[RELIC_BY_ID[id].slot]}，攻 ${RELIC_BY_ID[id].power}）<small>${esc(RELIC_BY_ID[id].tale)}。${holder(id) ? `现由${esc(holder(id))}佩用` : '尚在库中'}，点此赐予${esc(person.name)}</small></span></button>`).join('')}</div>` : '<p class="caption">本派尚无神兵。神兵不可打造，只在江湖事件中现世。</p>'}
      <h3 style="margin-top:12px">丹药</h3>${pills.length ? `<div class="button-group">${pills.map(([id, count]) => btn(`服用${PILLS[id.slice(5)]?.name ?? id}（余 ${count}）`, 'pill-use', { id: id.slice(5) }, 'outline')).join('')}</div>` : '<p class="caption">库中无丹药，可在山门的丹房炼制。</p>'}`, closeBtn('关闭')];
  },
  pills() {
    return ['丹房', `<p class="caption">以药材炼丹，成丹入库，在弟子的「装备丹药」中服用。库中药材 ${Math.round(books().res.herb)}。</p>
      <div class="choice-list">${Object.entries(PILLS).map(([id, pill]) => `<button type="button" class="button outline" data-act="pill-make" data-id="${id}"><span>${esc(pill.name)}（库存 ${books().stock['pill:' + id] ?? 0}）<small>需 ${pill.needs} 级丹房 · 药材 ${Math.ceil(pill.cost / 6)} · ${esc(pillText(pill))}</small></span></button>`).join('')}</div>`, closeBtn('关闭')];
  },
  meridian() {
    const person = picked(),
      opened = person.meridians ?? [],
      next = MERIDIANS[opened.length];
    const gift = (g) => Object.entries(g).filter(([key]) => key !== 'label').map(([key, amount]) => (key === 'vigor' ? `气血 +${Math.round(amount * 100)}%` : `${STAT_NAMES[key]} +${amount}`)).join('、');
    return [`经脉 · ${person.name}`, `<p>已通：${opened.map((choice, i) => `${MERIDIANS[i].name}（${MERIDIANS[i][choice].label}）`).join('、') || '尚未打通任何经脉'}</p>
      ${next ? `<p class="caption">下一脉「${next.name}」：各门内功重数合计需 ${meridianNeed(person)}，现有 ${innerLevels(person)}。两种走法只能择一，不可更改。</p>
      <div class="choice-list">${['a', 'b'].map((choice) => `<button type="button" class="button outline" data-act="meridian" data-choice="${choice}" ${innerLevels(person) < meridianNeed(person) ? 'disabled' : ''}><span>${next[choice].label}<small>${gift(next[choice])}</small></span></button>`).join('')}</div>` : '<p>奇经八脉俱已贯通。</p>'}`, closeBtn('关闭')];
  },
  create() {
    const person = picked();
    const moves = Object.keys(person.arts).filter((id) => CLASSES[ART_BY_ID[id].klass].combat).flatMap((id) => ART_BY_ID[id].moves.map((move, slot) => [`${id}:${slot}`, `${ART_BY_ID[id].name}·${move.name}（威力 ${Math.round(move.power)}）`, move.level]).filter(([, , level]) => levelOf(person.arts[id]) >= level));
    const mine = (world.customArts ?? []).filter((a) => a.sect === me());
    return [`自创武学 · ${person.name}`, `<p class="caption">从已学会的招式里取三招，合成一门本派独有的武学。三招须用同一种兵器（或同为空手）。每派至多 ${CUSTOM_ART_LIMIT} 门，已有 ${mine.length} 门${mine.length ? '：' + mine.map((a) => a.name).join('、') : ''}。</p>
      ${formRow('名称', '<input id="art-name" maxlength="8" placeholder="如：松风剑">')}${[0, 1, 2].map((i) => formRow(`第${'一二三'[i]}招`, `<select id="pick-${i}">${options(moves, moves[Math.min(i, moves.length - 1)]?.[0])}</select>`)).join('')}`, closeBtn() + btn('开宗立派', 'create-art', {}, 'primary')];
  },
  offices() {
    const all = membersOf(world, me()).filter((p) => p.rank >= 2).sort((a, b) => b.rank - a.rank || b.stats.wit - a.stats.wit);
    const held = books().offices;
    return ['任命职位', `<p class="caption">职位的增益随任职者的悟性而定。一人只任一职。舵主与左右堂主管的是${esc(PLACE_BY_ID[ui.place].name)}一处，长老管全派。</p>
      ${Object.entries(OFFICES).map(([id, office]) => formRow(office.name, `<select data-change="office" data-office="${id}">${options([['', '（空缺）'], ...all.map((p) => [p.id, `${p.name}（${RANKS[p.rank].name}，悟性 ${Math.round(p.stats.wit)}）`])], held[office.scope === 'place' ? `${id}@${ui.place}` : id] ?? '')}</select>`)).join('')}`, btn('完成', 'close', {}, 'primary')];
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
      return `<div>${face(leaderOf(s.id) ?? founder(s))}<span><strong>${esc(s.name)}</strong> ${tag(['邪', '中立', '正'][s.standing + 1])}<br><small class="muted">${row.members} 人 · ${row.places} 处 · 战力 ${num(row.strength)}</small></span><b class="${relation < 0 ? 'bad' : relation >= 40 ? 'good' : ''}">${relation}</b><span class="button-group">${btn('馈赠 500 两', 'gift', { sect: s.id }, 'outline')}${s.id in (books().spies ?? {}) ? tag('卧底在内', 'positive') : btn(`安插卧底（${SPY_COST}两）`, 'spy', { sect: s.id }, 'outline')}</span></div>`;
    }).join('')}</div><p class="caption">关系到 ${ECONOMY.allyRelation} 的门派，与本派据点相邻的道路即成商路，每旬各得 ${ECONOMY.allyRouteIncome} 两；本派两处据点之间的道路每旬得 ${ECONOMY.routeIncome} 两，两端每有一间店铺再加 ${ECONOMY.routeShopBonus} 两。</p><p class="caption">关系高的门派不易来犯，馈赠可以改善关系。有卧底在内的门派，与之交手时我方攻势加八分；卧底每旬有小概率败露，败露则两派交恶。</p>`, closeBtn('关闭')];
  },
  settings() {
    return ['游戏设置', `${formRow('画质', `<select data-change="quality">${options([['', '自动'], ['high', '高'], ['medium', '中'], ['low', '低（省电）']], storedQuality() ?? '')}</select>`)}
      <p class="caption">${picture.stage ? '改动画质后会重新载入页面，进度先自动保存。' : '这台设备画不了 3D，山门以画卷示意，战斗以文字结算。'}</p>
      ${formRow('配音', `<select data-change="voice">${options([['on', '开'], ['off', '关']], voice.on ? 'on' : 'off')}</select>`)}
      ${formRow('季报', `<select data-change="season">${options([['on', '每季一报'], ['off', '不报']], localStorage.getItem('wulin-season') ?? 'on')}</select>`)}
      ${formRow('配音音量', `<input type="range" min="0" max="1" step="0.05" data-change="voice-volume" value="${voice.volume}">`)}
      <section class="audio-settings"><h3>${icon('sound')} 操作音效</h3>
        ${formRow('反馈音效', `<select data-change="feedback-sound">${options([['on', '开启'], ['off', '静音']], feedbackAudio.on ? 'on' : 'off')}</select>`)}
        ${formRow('音效音量', `<input type="range" min="0" max="1" step="0.05" data-change="feedback-volume" value="${feedbackAudio.volume}">`)}
        ${btn('试听音效', 'feedback-test', {}, 'outline', 'sound')}
      </section>
      <p class="caption">${voice.supported ? '奇遇、来犯与战报由旁白念出；交战中打出重手的人会喊出武学的名字，男女老少嗓音各不相同。声音由这台设备自带的中文语音合成，各设备听感不同。' : '这台设备没有中文语音，配音暂时发不出声；装上系统的中文语音后即可使用。'}</p>
      ${voice.supported ? `<div class="button-group">${btn('试听', 'voice-test', {}, 'outline')}</div>` : ''}
      <p class="caption">连按两次 F8，或连续点击顶栏日期五次，可打开修改器。</p>
      <p class="caption">数据包（MOD）：${esc(modNote() || '未装载')}。数据包是一个 JSON 文件，可改经济与建筑数值、门派配色、武学名称与威力，并添加事件；格式见 src/core/mod.mjs。装载或卸下后会重新载入页面。</p>
      <div class="button-group">${btn('装载数据包', 'mod-load', {}, 'outline', 'plus')}${btn('卸下数据包', 'mod-clear', {}, 'outline', '', !modNote())}</div>`, btn('修改器', 'editor', {}, 'outline') + btn('完成', 'close', {}, 'primary')];
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
        <section><h3>据点与外交</h3>${formRow('据点', `<select data-change="ed-place">${options(PLACES.map((spec) => [spec.id, spec.name]), sheet.place ?? PLACES[0].id)}</select>`)}
          ${formRow('归属', `<select data-change="ed-owner">${options([['', '无主'], ...SECTS.filter((s) => world.sects[s.id].alive).map((s) => [s.id, s.name])], world.places[sheet.place ?? PLACES[0].id].owner ?? '')}</select>`)}
          ${world.places[sheet.place ?? PLACES[0].id].buildings.map((b, i) => field(BUILDINGS[b.kind].name, 'ed-building', b.level, `data-index="${i}"`)).join('')}
          ${sheet.sect !== me() ? field('与本派关系', 'ed-relation', books().relations[sheet.sect] ?? 0) : ''}</section>
      </div><p class="caption">改动立即生效；超出常规范围的数值也会生效。</p>`, btn('还原到打开前', 'ed-revert', {}, 'outline') + btn('关闭', 'close', {}, 'primary')];
  },
};

let renderedSheet = '';
function renderSheet() {
  if (!ui.sheet || !SHEETS[ui.sheet.kind]) return void (dialog.open && dialog.close());
  const [title, body, foot] = SHEETS[ui.sheet.kind](ui.sheet);
  const previous = dialog.dataset.kind;
  const scrolled = previous === ui.sheet.kind ? dialog.querySelector('.sheet-body')?.scrollTop ?? 0 : 0;
  const focus = dialog.contains(document.activeElement) ? document.activeElement : null;
  const html = `<article class="sheet-inner"><div class="sheet-title"><h2 id="dialog-title" tabindex="-1">${esc(title)}</h2><button data-act="close" aria-label="关闭">${icon('close')}</button></div><div class="sheet-body">${body}</div><p class="sheet-feedback" role="status" hidden></p>${foot ? `<div class="sheet-footer">${foot}</div>` : ''}</article>`;
  if (html !== renderedSheet) {
    dialog.innerHTML = html;
    renderedSheet = html;
  }
  const inline = dialog.querySelector('.sheet-feedback');
  inline.hidden = announcement.hidden || toast.sheet !== ui.sheet;
  inline.textContent = inline.hidden ? '' : announcement.querySelector('.toast-copy')?.textContent ?? '';
  inline.dataset.tone = inline.hidden ? '' : announcement.dataset.tone;
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  dialog.dataset.kind = ui.sheet.kind;
  dialog.querySelector('.sheet-body').scrollTop = scrolled;
  const wasOpen = dialog.open;
  if (!wasOpen) dialog.showModal();
  if (!wasOpen || previous !== ui.sheet.kind) dialog.querySelector('#dialog-title').focus({ preventScroll: true });
  else if (focus && !focus.isConnected) restoreControl(dialog, focus);
}
/** Has the narrator read a sheet aloud the first time it is shown. */
function speakSheet() {
  const sheet = ui.sheet;
  let text = '',
    who = null;
  if (sheet?.kind === 'event') {
    const view = pendingView(world);
    text = view?.text ?? '';
  } else if (sheet?.kind === 'outcome' || sheet?.kind === 'herald') text = sheet.text;
  else if (sheet?.kind === 'season') text = sheet.title.replace(' · ', '，') + '。';
  else if (sheet?.kind === 'fight') text = `${ui.lastFight.won ? '此战告捷。' : '此战失利。'}${ui.lastFight.verdict}`;
  else if (sheet?.kind === 'siege' && world.pending?.kind === 'siege') text = `${SECT_BY_ID[world.pending.attacker].name}来犯${PLACE_BY_ID[world.pending.place].name}！`;
  const key = text && sheet.kind + ':' + text;
  if (key === ui.spoken) return;
  if (key && sheet.kind !== 'fight') feedbackAudio.play('notice');
  // Leaving a sheet that was being read stops the reading.
  if (ui.spoken && !key) voice.stop();
  ui.spoken = key;
  if (key) voice.say(text, who);
}
// Escape closes a sheet through the browser; the page's own state follows.
dialog.addEventListener('close', () => ui.sheet && (actions.close(), render()));

// ---- drawing -------------------------------------------------------------------------------------------

const SCREENS = { seat: seatScreen, disciples: disciplesScreen, arts: artsScreen, world: worldScreen, battle: battleScreen, chronicle: chronicleScreen, saves: savesScreen };

function restoreControl(root, control) {
  const match = control.id ? root.querySelector(`#${CSS.escape(control.id)}`)
    : [...root.querySelectorAll('[data-act], [data-change]')].find(candidate =>
      candidate.tagName === control.tagName && Object.keys(control.dataset).length &&
      Object.entries(control.dataset).every(([key, value]) => candidate.dataset[key] === value));
  match?.focus({ preventScroll: true });
}

function render() {
  let html, key;
  if (!world) {
    key = ui.page;
    if (ui.page === 'prologue') {
      html = prologueScreen(ui.prologue, sceneStyle);
      key += ':' + ui.prologue;
    } else if (ui.page === 'sects') {
      html = sectScreen(ui, sceneStyle, (sect, css, view) => face(founder(sect), css, view));
      key += ':' + ui.founding;
    } else if (ui.page === 'legacy') html = legacyScreen(ui, sceneStyle);
    else html = titleScreen();
  } else {
    if (!SCREENS[ui.page]) ui.page = 'seat';
    if (ui.fight) ui.page = 'battle';
    const mine = placesOf(world, me());
    if (!mine.includes(ui.place)) ui.place = mine.includes(SECT_BY_ID[me()].seat) ? SECT_BY_ID[me()].seat : mine[0];
    if (!ui.place) ui.page = ui.page === 'seat' ? 'world' : ui.page;
    // A sect with nobody left has only its story to look back on.
    const gone = !membersOf(world, me()).length;
    if (gone && !['chronicle', 'saves'].includes(ui.page)) ui.page = 'chronicle';
    html = shell(SCREENS[ui.page]());
    key = [ui.page, ui.page === 'battle' && !!ui.fight, !!picture.stage, ui.map3d].join();
  }
  // The key carries whether the paintings have loaded, so the still pictures appear when they arrive.
  const focused = document.activeElement;
  if (mount(app, html, key + (art ? ':art' : ''))) {
    window.scrollTo(0, 0);
    app.querySelector('.opening-stage h1')?.focus({ preventScroll: true });
  } else if (!focused.isConnected && focused.matches('[data-act], [data-change]')) restoreControl(app, focused);
  const shellNode = app.querySelector('.shell.game');
  if (shellNode) shellNode.dataset.commandCollapsed = String(canFoldCommand() && ui.commandCollapsed);
  syncPicture();
  placeMap();
  renderSheet();
  speakSheet();
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
  // Someone is watching this world, so its events wait for an answer.
  world.options.interactive = true;
  // A world from before there was a list of matters in hand begins one now.
  if (!world.goals) startGoals(world);
  Object.assign(ui, { page: 'seat', sheet: null, place: null, building: 0, person: null, mapPlace: null, fight: null, lastFight: null, speed: 0, notice: '' });
  ui.batch.clear();
  Object.assign(ui, { heralds: [], season: takeStock(), held: placesOf(world, me()), ended: !!world.outcome, picking: false });
  toast(text);
  startPicture();
}

/** The data pack kept in this browser, as a short note; empty when there is none. */
let modApplied = '';
const modNote = () => modApplied;
try {
  const kept = localStorage.getItem('wulin-mod');
  if (kept) {
    const result = applyMod(JSON.parse(kept));
    if (result.ok) modApplied = `${result.name}（改动 ${result.changed} 处，新增事件 ${result.added} 条）`;
  }
} catch (cause) {
  console.warn('mod:', cause);
}
function loadMod() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    try {
      const text = await input.files[0].text();
      if (!applyMod(JSON.parse(text)).ok) throw new Error('bad pack');
      localStorage.setItem('wulin-mod', text);
      if (world) slots.write('auto', world, autoLabel());
      location.reload();
    } catch {
      toast('这个文件不是可用的数据包。');
    }
  };
  input.click();
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
    else toast(loaded.why, 'warning');
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
    if (ui.fight && data.page !== 'battle') return toast('战事未了。', 'warning');
    if (world && !membersOf(world, me()).length && !['chronicle', 'saves'].includes(data.page)) return toast('本门已不复存在。', 'warning');
    if (!world && data.page === 'prologue' && ui.page === 'title') {
      applyIdentity(null);
      Object.assign(ui, { chosen: 'shaolin', founding: false, prologue: 0, succession: false, scenario: 'many', difficulty: 1, ownName: '', ownLeader: '' });
    }
    if (ui.page !== data.page) ui.commandCollapsed = false;
    ui.page = data.page;
    ui.sheet = null;
    ui.notice = '';
  },
  sheet: (data) => (ui.sheet = { ...data, index: data.index === undefined ? undefined : Number(data.index) }),
  close() {
    if (ui.sheet?.kind === 'editor') editor.close();
    // What was opened from a person's panel goes back to it; a report that stopped the clock starts it again.
    if (PERSON_SHEETS.has(ui.sheet?.kind)) return void (ui.sheet = { kind: 'person' });
    if ((ui.sheet?.kind === 'season' || ui.sheet?.kind === 'herald') && ui.sheet.pace) ui.speed = ui.sheet.pace;
    ui.sheet = null;
    // Time takes up the pace it had before something stopped it.
    if (ui.resume && world && !world.pending && !ui.fight && !ui.heralds.length) (ui.speed = ui.resume), (ui.resume = 0);
  },
  'prologue-next'() {
    if (ui.prologue < prologue.length - 1) ui.prologue++;
    else ui.page = 'sects';
  },
  'skip-prologue': () => (ui.page = 'sects'),
  'choose-founding': (data) => (ui.founding = data.own === 'true'),
  'choose-sect': (data) => (ui.chosen = data.sect),
  'sect-next'() {
    if (ui.founding && (!ui.ownName.trim() || !ui.ownLeader.trim())) {
      toast('请为门派和掌门定下名号。', 'warning');
      app.querySelector(ui.ownName.trim() ? '#own-leader' : '#own-name').focus();
      return;
    }
    ui.page = 'legacy';
  },
  'sect-back': () => (ui.page = 'sects'),
  succession: (data) => (ui.succession = data.enabled === 'true'),
  new() {
    const sect = ui.chosen;
    const custom = ui.founding ? { sect, name: ui.ownName.trim(), leader: ui.ownLeader.trim() } : null;
    enter(createWorld({ seed: (Date.now() % 1e9) + 1, playerSect: sect, succession: ui.succession, scenario: ui.scenario, difficulty: ui.difficulty, custom }));
  },
  load(data) {
    const loaded = slots.read(data.slot);
    if (loaded.ok) enter(loaded.state, '已读取存档。');
    else toast(loaded.why, 'warning');
  },
  save(data) {
    const saved = slots.write(data.slot, world, autoLabel());
    toast(saved ? `进度已存入卷宗 ${data.slot}。` : '无法保存，请导出存档文件。', saved ? 'success' : 'warning');
  },
  export: () => download(saveFileName(world, SECT_BY_ID[me()].name), serialize(world, autoLabel())),
  import: importFile,
  quit() {
    slots.write('auto', world, autoLabel());
    world = null;
    Object.assign(ui, { page: 'title', speed: 0, fight: null, sheet: null });
  },
  speed: (data) => ((ui.speed = Number(data.speed)), (ui.resume = 0)),
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
    ui.commandCollapsed = false;
    if (data.go) ui.page = 'seat';
  },
  'seat-tab': (data) => (ui.seatTab = data.tab),
  'command-toggle': () => (ui.commandCollapsed = !ui.commandCollapsed),
  mapmode: () => ((ui.map3d = !ui.map3d), (ui.commandCollapsed = false)),
  zoom(data) {
    const orbit = picture.stage?.orbit;
    if (!orbit) return;
    orbit.distance = data.dir === 'reset' ? (ui.page === 'world' ? 150 : 50) : Math.max(orbit.minDistance, Math.min(orbit.maxDistance, orbit.distance * (data.dir === 'in' ? 0.78 : 1.28)));
  },
  building: (data) => ((ui.building = Number(data.index)), (ui.seatTab = 'build'), (ui.commandCollapsed = false)),
  'build-kind': ({ kind }) => (ui.sheet.buildKind = kind),
  build() {
    const kind = pick('#build-kind');
    if (!say(build(world, me(), ui.place, kind), `${BUILDINGS[kind]?.name ?? '建筑'}已建成。`)) return;
    ui.building = world.places[ui.place].buildings.length - 1;
    ui.sheet = null;
  },
  upgrade: (data) => say(upgrade(world, me(), ui.place, Number(data.index)), '扩建完成。'),
  recruit: (data) => say(recruit(world, me(), ui.place, Number(data.index)), '收入门墙。') && (ui.sheet = null),

  person: (data) => ((ui.person = Number(data.id)), (ui.sheet = { kind: 'person' })),
  picking: () => ((ui.picking = !ui.picking), ui.picking || ui.batch.clear()),
  'batch-toggle': (data) => (ui.batch.has(Number(data.id)) ? ui.batch.delete(Number(data.id)) : ui.batch.add(Number(data.id))),
  'batch-all': () => roster().forEach((p) => ui.batch.add(p.id)),
  rank: (data) => (ui.rank = data.rank),
  'batch-clear': () => ui.batch.clear(),
  job: () => say(setJob(world, picked().id, jobOf(pick('#job-select'))), '已改派差事。') && (ui.sheet = { kind: 'person' }),
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
    person.row = pick('#row-select') || undefined;
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
  master: () => say(setMaster(world, picked().id, Number(pick('#master-select'))), '已拜师。') && (ui.sheet = { kind: 'person' }),
  move: () => say(relocate(world, picked().id, pick('#move-select')), '已启程。') && (ui.sheet = { kind: 'person' }),
  'art-tier': (data) => ((ui.artTier = data.tier), (ui.art = null)),
  art: (data) => (ui.art = data.id),
  'train-art': (data) => say(setJob(world, picked().id, { kind: ART_BY_ID[data.id].tier === 5 ? 'seclude' : 'train', art: data.id }), `${picked().name}已开始修练。`),

  place: (data) => ((ui.mapPlace = data.place), (ui.commandCollapsed = false)),
  mapzoom: (data) => (data.dir === 'reset' ? ((ui.map = { zoom: 1, x: 0, y: 0 }), placeMap()) : zoomMap(data.dir === 'in' ? 1.3 : 1 / 1.3)),
  settle: (data) => say(settle(world, me(), data.place), '分舵已立。') && (ui.sheet = null),
  gift: (data) => say(gift(world, me(), data.sect, 500), `已向${SECT_BY_ID[data.sect].name}馈赠。`),
  march(data) {
    books().formation = pick('#formation') || books().formation;
    // On the 3D map the column is seen marching up the road before the fight begins.
    const from = PLACE_BY_ID[data.place].roads.find((id) => world.places[id].owner === me());
    if (picture.realm && picture.stage?.current === picture.realm && from && !ui.marching) {
      ui.marching = true;
      ui.sheet = null;
      ui.speed = 0;
      return picture.realm.march(from, data.place, colorOf(me()), () => ((ui.marching = false), march(data.place), render()));
    }
    march(data.place);
  },
  'goal-open': () => (ui.sheet = { kind: 'goal' }),
  'goal-go'() {
    const go = goalView(world)?.go;
    if (!go) return;
    actions.page({ page: go.page });
    if (go.sheet) ui.sheet = { kind: go.sheet };
  },
  'goal-claim'() {
    const result = claimGoal(world);
    if (!result.ok) return toast(result.why, 'warning');
    const next = goalView(world);
    if (ui.sheet?.kind === 'goal') ui.sheet = null;
    toast(`「${result.title}」已成。`, 'success');
    voice.say(`${result.title}，已成。${next?.last ? '' : '下一件：' + next.title + '。'}`);
  },
  shop: () => say(openShop(world, me(), ui.place), '店铺开张了。'),
  donate: () => say(donate(world, me()), '银两散出，本派声名更著。'),
  tags: () => (ui.tags = !ui.tags),
  'gear-up': () => say(upgradeGear(world, picked().id), '新兵器与护具已送到。'),
  relic: (data) => say(giveRelic(world, picked().id, data.id), `已将${RELIC_BY_ID[data.id].name}赐予${picked().name}。`),
  'pill-use': (data) => say(usePill(world, picked().id, data.id), `${picked().name}服下了${PILLS[data.id].name}。`),
  'pill-make': (data) => say(makePill(world, me(), data.id), `炼成一颗${PILLS[data.id].name}。`),
  meridian: (data) => say(openMeridian(world, picked().id, data.choice), '经脉已通。'),
  'create-art': () => say(createArt(world, picked().id, pick('#art-name'), [0, 1, 2].map((i) => pick('#pick-' + i))), '新武学已录入本派名录。') && (ui.sheet = null),
  manual: (data) => say(writeManual(world, picked().id, data.id), '秘笈已藏入阁中。'),
  spy: (data) => say(plantSpy(world, me(), data.sect), '人已安插进去。'),
  duel(data) {
    if (!data.id) return void (ui.sheet = { kind: 'duel' });
    ui.person = Number(data.id);
    ui.sheet = null;
    duel();
  },
  'siege-fight'() {
    books().formation = pick('#formation') || books().formation;
    defend();
  },
  'siege-auto'() {
    const { attacker, place, party } = world.pending;
    world.pending = null;
    const rng = createRng(1);
    rng.state = world.rng;
    const result = assault(world, attacker, place, party, rng);
    world.rng = rng.state;
    ui.sheet = { kind: 'outcome', title: `${SECT_BY_ID[attacker].name}来犯`, text: !result.ok ? '来敌已退。' : result.won ? `${PLACE_BY_ID[place].name}失守。` : `守将击退了来敌。` };
  },
  'mod-load': loadMod,
  'mod-clear'() {
    try {
      localStorage.removeItem('wulin-mod');
    } catch {
      return;
    }
    if (world) slots.write('auto', world, autoLabel());
    location.reload();
  },
  'feedback-test': () => feedbackAudio.play('confirm', { preview: true }),
  'voice-test': () => voice.say('江湖路远，各位保重。', membersOf(world, me()).find((person) => person.id === books().leaderId)),
  'fight-rally': () => (voice.shout('众弟子听令，随我上！', ui.fight.heads?.[ui.fight.side]?.person), ui.fight.arena.battle.rally(ui.fight.side)),
  'fight-stance': (data) => ui.fight.arena.battle.stance(ui.fight.side, data.stance),
  answer(data) {
    const rng = createRng(1);
    rng.state = world.rng;
    const result = resolvePending(world, Number(data.index), rng);
    world.rng = rng.state;
    if (!result.ok) return toast(result.why, 'warning');
    ui.sheet = { kind: 'outcome', title: ui.sheet.title, text: result.text };
  },
  'log-filter': (data) => (ui.logFilter = data.filter),

  'fight-pause': () => ui.fight && (ui.fight.arena.paused = !ui.fight.arena.paused),
  'fight-speed': (data) => ((ui.fight.arena.speed = Number(data.speed)), (ui.fight.arena.paused = false)),
  'fight-skip': () => ui.fight.arena.skip(),
  'fight-retreat': () => (ui.fight.arena.battle.retreat(ui.fight.side), (ui.fight.arena.paused = false), (ui.sheet = null)),

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
  'arts-person': (_, value) => (ui.person = Number(value)),
  season: (_, value) => localStorage.setItem('wulin-season', value),
  voice: (_, value) => voice.set({ on: value === 'on' }),
  'voice-volume': (_, value) => voice.set({ volume: Number(value) }),
  'feedback-sound': (_, value) => feedbackAudio.set({ on: value === 'on' }),
  'feedback-volume': (_, value) => feedbackAudio.set({ volume: Number(value) }),
  quality(_, value) {
    slots.write('auto', world, autoLabel());
    try {
      value ? localStorage.setItem('wulin-quality', value) : localStorage.removeItem('wulin-quality');
    } catch {
      return;
    }
    location.reload();
  },
  plot: (_, value) => void say(movePlot(world, me(), ui.place, ui.building, value === '' ? null : Number(value)), '已迁建。'),
  scenario: (_, value) => { if (Object.hasOwn(SCENARIOS, value)) ui.scenario = value; },
  difficulty: (_, value) => { if (Object.hasOwn(DIFFICULTIES, value)) ui.difficulty = Number(value); },
  focus: (_, value) => void say(setFocus(world, me(), ui.place, value), `此处专精改为「${FOCUSES[value]?.name}」。`),
  office: (data, value) => void (value ? say(appoint(world, me(), data.office, ui.place, Number(value)), '已任命。') : delete books().offices[OFFICES[data.office].scope === 'place' ? `${data.office}@${ui.place}` : data.office]),
  rule: (_, value) => void say(setRule(world, me(), value), `门规改为「${HOUSE_RULES[value]?.name}」。`),
  'ed-sect': (_, value) => ((ui.sheet.sect = value), (ui.sheet.person = undefined)),
  'ed-person': (_, value) => (ui.sheet.person = Number(value)),
  'ed-place': (_, value) => (ui.sheet.place = value),
  'ed-owner': (_, value) => editor.setOwner(ui.sheet.place ?? PLACES[0].id, value || null),
  'ed-building': (data, value) => editor.setBuildingLevel(ui.sheet.place ?? PLACES[0].id, Number(data.index), Number(value)),
  'ed-relation': (_, value) => editor.setRelation(me(), ui.sheet.sect, Number(value)),
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

const navigationActions = new Set(['page', 'sheet', 'close', 'prologue-next', 'skip-prologue', 'sect-next', 'sect-back', 'command-toggle', 'goal-open', 'mapmode']);
const selectionActions = new Set(['choose-sect', 'choose-founding', 'succession', 'building', 'build-kind', 'place', 'look', 'rank', 'seat-tab', 'person', 'picking', 'batch-toggle', 'art', 'art-tier', 'speed', 'fight-pause', 'fight-speed', 'fight-stance', 'log-filter']);
const confirmationActions = new Set(['new', 'load', 'march', 'fight-rally', 'fight-retreat', 'siege-fight', 'answer']);

document.body.addEventListener('click', (event) => {
  const target = event.target.closest('[data-act]');
  if (!target || target.disabled) return;
  const { act } = target.dataset;
  if (mapDragged && act === 'place') return;
  feedbackAudio.unlock(event);
  try {
    const sheet = ui.sheet;
    const beforeToast = toast.timer;
    actions[act]?.(target.dataset, event);
    if (sheet && toast.timer !== beforeToast && toast.sheet === sheet) toast.sheet = ui.sheet;
    if (event.isTrusted) {
      if (navigationActions.has(act)) feedbackAudio.play('nav');
      else if (selectionActions.has(act)) feedbackAudio.play('pick');
      else if (confirmationActions.has(act)) feedbackAudio.play('confirm');
    }
  } catch (cause) {
    fail(cause);
  }
  if (!['date', 'import', 'zoom', 'mapzoom', 'mod-load', 'feedback-test', 'voice-test'].includes(act)) render();
});
document.body.addEventListener('change', (event) => {
  const target = event.target;
  if (target.dataset.batch) return void ((target.checked ? ui.batch.add(Number(target.dataset.batch)) : ui.batch.delete(Number(target.dataset.batch))), render());
  if (target.id === 'batch-all') return void (roster().forEach((p) => (target.checked ? ui.batch.add(p.id) : ui.batch.delete(p.id))), render());
  if (!target.dataset.change) return;
  feedbackAudio.unlock(event);
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
  if (event.target.id === 'own-name') return void (ui.ownName = event.target.value);
  if (event.target.id === 'own-leader') return void (ui.ownLeader = event.target.value);
  if (event.target.id !== 'search-person') return;
  ui.search = event.target.value;
  render();
});
window.addEventListener('keydown', doublePress('F8', () => (ui.sheet?.kind === 'editor' ? (actions.close(), render()) : openEditor())));
// Space holds and releases a fight.
window.addEventListener('keydown', (event) => event.key === ' ' && ui.fight && !ui.sheet && event.target === document.body && (event.preventDefault(), actions['fight-pause'](), render()));

// Outside a fight, Space holds and releases time and the number keys set its pace.
window.addEventListener('keydown', (event) => {
  if (!world || ui.fight || ui.sheet || event.target !== document.body || event.ctrlKey || event.metaKey || event.altKey) return;
  const pace = event.key === ' ' ? (ui.speed ? 0 : 1) : { 1: 1, 2: 4, 3: 16, '`': 0 }[event.key];
  if (pace === undefined) return;
  event.preventDefault();
  feedbackAudio.unlock(event);
  feedbackAudio.play('pick');
  actions.speed({ speed: pace });
  render();
});
// The picture is not a page: no menu of the browser's over it.
window.addEventListener('contextmenu', (event) => event.target.closest('.shell.game') && !event.target.closest('input, textarea') && event.preventDefault());

// The map is dragged with a pointer and zoomed with the wheel or two fingers.
const mapTouches = new Map();
let pinch = 0;
app.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('.map-panel:not(.is-model)') || event.target.closest('.scene-zoom')) return;
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
app.addEventListener('wheel', (event) => event.target.closest('.map-panel:not(.is-model)') && (event.preventDefault(), zoomMap(Math.exp(-event.deltaY * 0.0015))), { passive: false });

// ---- time ---------------------------------------------------------------------------------------------------

/** What the sect has, for telling a season's change. */
const takeStock = () => ({ index: Math.floor(world.day / 90), day: world.day, silver: books().silver, grain: books().grain, renown: books().renown, members: membersOf(world, me()).length, places: placesOf(world, me()).length });
/** At the turn of a season, reports what changed over the one that ended, and stops the clock for it. */
function openSeason() {
  const was = ui.season,
    now = takeStock();
  ui.season = now;
  if (!was || localStorage.getItem('wulin-season') === 'off' || !membersOf(world, me()).length) return;
  const since = world.log.filter((r) => r.day >= was.day);
  ui.sheet = {
    kind: 'season', was, now, pace: ui.speed,
    title: `承和 ${1 + Math.floor((world.day - 1) / 360)} 年 · ${'春夏秋冬'[Math.floor(((world.day - 1) % 360) / 90) % 4]}季报`,
    mine: since.filter((r) => r.sect === me()).slice(-6),
    abroad: since.filter((r) => r.sect !== me() && ['conquer', 'fall', 'summit', 'settle', 'succession'].includes(r.type)).slice(-5),
  };
  ui.speed = 0;
}

/** Days pass while the game is running and nothing is open over the page. */
setInterval(() => {
  // Something at the door is answered before time moves on.
  if (world && ui.heralds.length && !ui.sheet && !ui.fight) return void ((ui.sheet = ui.heralds.shift()), render());
  if (world?.pending && !ui.sheet && !ui.fight) return void ((ui.sheet = { kind: world.pending.kind === 'siege' ? 'siege' : 'event' }), (ui.resume ||= ui.speed), (ui.speed = 0), render());
  if (!world || !ui.speed || ui.sheet || ui.fight || world.outcome) return;
  // Leave the page alone while the player has a list open, so it does not close under them.
  if (document.activeElement?.tagName === 'SELECT') return;
  const before = world.log.length;
  for (let i = 0; i < ui.speed && !world.pending; i++) advanceDay(world);
  if (world.day % 30 < ui.speed) slots.write('auto', world, autoLabel());
  const fresh = world.log.slice(before);
  const news = fresh.filter((entry) => entry.sect === me()).at(-1);
  if (news) ui.notice = news.text;
  // Great matters are announced one at a time, each on a sheet of its own.
  for (const entry of fresh) {
    const mine = entry.sect === me(),
      lost = entry.type === 'conquer' && !mine && ui.held?.includes(entry.place);
    const label = entry.type === 'fall' ? '除名' : entry.type === 'summit' ? '武林大会' : entry.type === 'succession' && mine ? '传位' : entry.type === 'conquer' && mine ? '克城' : lost ? '失地' : entry.type === 'repel' && mine ? '守御' : null;
    if (label) ui.heralds.push({ kind: 'herald', label, text: entry.text });
  }
  ui.held = placesOf(world, me());
  if (world.outcome && !ui.ended) {
    ui.ended = true;
    ui.heralds.push({ kind: 'herald', label: world.outcome.result === 'lost' ? '终局' : '功成', text: { 'won-conquest': '天下据点尽归本派，一统江湖！', 'won-summit': '武林大会推举你为盟主，号令天下，莫敢不从。', 'won-court': '朝廷封你为武林都指挥使，禁武令自此废除。', lost: '本门已不复存在。江湖路远，后会有期。' }[world.outcome.result] ?? '' });
  }
  if (ui.heralds.length) ui.sheet = { ...ui.heralds.shift(), pace: ui.speed };
  else if (Math.floor(world.day / 90) !== ui.season?.index) openSeason();
  render();
}, 1000);
// A fight's bars and clock are redrawn a few times a second.
setInterval(() => ui.fight && !ui.sheet && render(), 400);

render();
loadArt().then((loaded) => ((art = loaded), render())).catch((cause) => console.warn('art:', cause));
