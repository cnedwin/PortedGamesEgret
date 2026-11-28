// Wulin: lead a sect, raise its disciples, and win the martial world.
//
// This file is the page. It draws the game as screens and passes the player's
// choices on to the rules; it decides nothing itself. The other modules:
//   data/              the map, sects, arts, buildings and goods
//   core/world.mjs     what a day does (no page needed)
//   core/battle.mjs    a fight (no page needed)
//   core/persons.mjs   people and how they grow
//   core/disciples.mjs grades of gift, rankings, each disciple's record and pleas, one-step work
//   core/tourney.mjs   the Sword Meet, held every third year
//   core/unlocks.mjs   which of a sect's affairs a new leader is shown yet
//   core/save.mjs      saves, in the browser and as files
//   core/editor.mjs    the built-in editor (F8 twice)
//   ui/native-kit.mjs    native screen descriptions and controls
//   view/              the 3D picture: a stronghold (seat.mjs) and a fight (arena.mjs)
//   ../art-handoff/    portraits, scene paintings and the interface's style sheets
// The 3D modules are loaded once a game starts, and where a device cannot draw
// them the scene paintings stand in and fights are settled in writing.
import { play } from '@egret/engine/play';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { createUiTester } from '@egret/engine/ui/testing';
import { createNativeUi } from './ui/native-shell.mjs';
import { nativeSlots } from './ui/native-save.mjs';
import { createLocale } from './ui/locale.mjs';
import { browserSaveStorage } from '@egret/engine/web/kit';
import { artUrl, loadArt, portraitUrl } from '../art-handoff/assets.mjs';
import { ART_BY_ID, ARTS, CLASSES, CLASS_KEYS, levelOf, unmetNeeds } from './data/arts.mjs';
import { DIFFICULTIES, FOCUSES, MERIDIANS, RELIC_BY_ID, RELICS, SCENARIOS } from './data/extras.mjs';
import { BUILDINGS, ECONOMY, PILLS, armorName, weaponName } from './data/goods.mjs';
import { FORMATIONS, HOUSE_RULES, TALENTS, WANDERERS } from './data/jianghu.mjs';
import { PLACES, PLACE_BY_ID, RESOURCE_NAMES, RESOURCES } from './data/places.mjs';
import { OFFICES, RANKS, SECTS, SECT_BY_ID, applyIdentity } from './data/sects.mjs';
import { createBattle } from './core/battle.mjs';
import { createEditor, describeItem, doublePress } from './core/editor.mjs';
import {
  CUSTOM_ART_LIMIT, SPY_COST, chronicleEntries, createArt, movePlot, duelSides, gearOffer, giveRelic, innerLevels, makePill, meridianNeed, openMeridian, plantSpy,
  setFocus, settleDuel, upgradeGear, usePill, writeManual,
} from './core/extras.mjs';
import { formationsFor, pendingView, resolvePending, setRule } from './core/jianghu.mjs';
import { applyMod } from './core/mod.mjs';
import { APT_NAMES, STAT_KEYS, STAT_NAMES, TRAITS, hpMax, learnableArts, prowess } from './core/persons.mjs';
import { QUALITIES, RANKINGS, TRAIT_NOTES, aptitudeScore, attention, qualityOf, rankingLabel, rankingValue, ranked, recommendJobs, wordsOf } from './core/disciples.mjs';
import { TOURNEY, boutWinner, eligible as tourneyEligible, enterTourney, nextTourney, settleBout, tourneyBout, tourneyField } from './core/tourney.mjs';
import { checkUnlocks, isOpen, openAll, startUnlocks, stillToCome } from './core/unlocks.mjs';
import { BOOK_LEVEL, TEACHING, TEACH_LEVEL, askTeaching, bookOffers, buyManual, commonArts, heldArts, teachingOffers } from './core/library.mjs';
import { createRng } from './core/rng.mjs';
import { createSlots, deserialize, saveFileName, serialize } from './core/save.mjs';
import { SEAT_PLOTS, availablePlots } from './core/seat-layout.mjs';
import {
  SHOP_LIMIT, advanceDay, appoint, assault, assaultSides, beginAssault, canFallBackAtHome, donate, beds, build, buildAvailability, createWorld, dateText, gift, ledger, membersOf, openShop, openingProtection, placesOf, promote,
  recruit, recruitAvailability, relocate, residents, setJob, setMaster, settle, settleAssault, strength, tradeRoutes, upgrade, upgradeAvailability, usedCells,
} from './core/world.mjs';
const num = value => Math.round(value).toLocaleString('en-US');
import { createVoice } from './ui/voice.mjs';
import { createFeedbackAudio } from './ui/feedback-audio.mjs';
import { createClipAudio, createSoundtrack } from './ui/soundtrack.mjs';
import { courtyardTrack, createCombatAudio, createWorldAmbience } from './ui/world-audio.mjs';
import { createSpatialAudio } from './ui/spatial-audio.mjs';
import { prologue } from './ui/opening.mjs';
import { claimGoal, goalView, startGoals } from './core/goals.mjs';

const storage = browserSaveStorage();
let pendingSaveProblem = '';
const slots = nativeSlots(storage, problem => { pendingSaveProblem=problem.kind; });
const requestedLanguage=new URLSearchParams(location.search).get('lang');
const initialLanguage=requestedLanguage==='en'||requestedLanguage==='zh'?requestedLanguage:storage.getItem('wulin-language')==='en'?'en':'zh';
const locale = createLocale(initialLanguage);
let game, nativeUi, projection, pointerSurface, hints, lastHints='', confirming = false, fatal = false;
const clips = createClipAudio();
const music = createSoundtrack(storage, clips);
const feedbackAudio = createFeedbackAudio(storage);
const worldAmbience = createWorldAmbience(storage, clips);
const spatialAudio = createSpatialAudio(clips, worldAmbience);
const combatAudio = createCombatAudio(clips, feedbackAudio);
const voice = createVoice(storage, undefined, { clips, onSpeaking(active) {
  music.duck(active);
  worldAmbience.duck(active);
  spatialAudio.duck(active);
  combatAudio.duck(active);
} });
const recordedArts = new Map(ARTS.filter(art => CLASSES[art.klass]?.combat).map(art => [art.name, art.id]));
const recordedArtIds = new Set(recordedArts.values());
const prologueVoice = ['prologue-decree', 'prologue-gate', 'prologue-seal'];

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
  buildPlot: null,
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
  /** How the roster is shown ('cards' or 'table'), what it is ranked by ('rank' is by standing), and which way. */
  rosterView: 'cards',
  sortKey: 'rank',
  sortUp: false,
  /** Shows only those who need the leader's eye: '', 'idle', 'promotable', 'unhappy' or 'wounded'. */
  only: '',
  /** Which book of the chronicle is open: 'annals', 'arts', 'wanderers' or 'relics'. */
  book: 'annals',
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
  language:initialLanguage,
};
let world = null;
/** The portraits and scene paintings, once their list has loaded. */
let art = null;
const editor = createEditor(() => world, (next) => (world = next));
/** State for the browser console and for automated checks; the game never reads it. */
globalThis.__wulin = { get world() { return world; }, ui, get picture() { return picture; } };

function fail(cause) {
  console.error(cause?.message??cause, cause?.cause??""); if(fatal)return; fatal=true;
  if(nativeUi){nativeUi.error(cause?.message??cause);requestAnimationFrame(()=>{globalThis.egretGame.ready=true;globalThis.egretGame.failed=true;document.querySelector('#loading').hidden=true;});} else {document.querySelector('#loading').textContent='载入失败，请重新载入网页 / Loading failed. Reload the page. '+String(cause?.message??cause);globalThis.egretGame.ready=true;globalThis.egretGame.failed=true;}
}
window.addEventListener('error', event=>fail(event.error??event.message));
window.addEventListener('unhandledrejection', event=>fail(event.reason));
const me = () => world.playerSect;
const books = () => world.sects[me()];
/** Whether a part of the game is on show yet (see core/unlocks.mjs). */
const open = (id) => isOpen(world, id);
const autoLabel = () => `${SECT_BY_ID[me()].name} ${dateText(world)}`;
const dayText = (day) => `承和${1 + Math.floor(day / 360)}年${1 + Math.floor((day % 360) / 30)}月${1 + (day % 30)}日`;

function toast(text, tone = 'notice') {
  if(!text)return;
  nativeUi?.toast(text,tone);
  feedbackAudio.play({success:'confirm',warning:'reject',notice:'notice'}[tone]);
}

/** Reports the reason when a command is refused and confirms completed orders. */
const say = (result, okText = '') => (toast(result.ok ? okText : result.why, result.ok ? 'success' : 'warning'), result.ok);

// ---- portraits and paintings ---------------------------------------------------------------------------

const sceneUrl = name => art?.assets?.[name] ? artUrl(art.assets[name]) : undefined;
const faceUrl = (person,view='bust') => art&&person ? portraitUrl(art,person,{view}) : undefined;
/** The founding leader of a sect, for screens shown before a world exists. */
const founder = (sect) => ({ school: sect.id, name: sect.leader.name, female: sect.leader.female, origin: '掌门' });
const leaderOf = (sectId) => world.persons[world.sects[sectId].leaderId];

// ---- the 3D picture ----------------------------------------------------------------------------------

/** `stage` is null until a game starts, and stays null where 3D cannot be drawn. */
const picture = { stage: null, seat: null, realm: null, tried: false, modules: null };
const storedQuality = () => {
  try {
    return storage.getItem('wulin-quality');
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
    picture.stage = await picture.modules.createStage(document.querySelector('#stage'), { game, pointerSurface, quality, webgpu: new URLSearchParams(location.search).get('backend')==='webgpu', onError: (cause) => console.warn('3D:', cause) });
    picture.stage?.setTranslator?.(value=>locale.translate(value));
  } catch (cause) {
    console.warn('3D unavailable:', cause);
  }
  render();
}

/** Moves the 3D picture into the frame the screen left for it, and shows the right scene there. */
function syncPicture() {
  const { stage } = picture;
  if (!stage || !world) { stage?.setInputEnabled?.(false);stage?.sleep(true); return; }
  if(ui.page==='world'&&!ui.map3d){stage.setInputEnabled?.(false);stage.sleep(true);return;}
  stage.sleep(false);
  stage.setInputEnabled?.(!ui.sheet && !confirming && isStaged());
  if (ui.page==='battle' && ui.fight) return void (stage.current!==ui.fight.arena && stage.show(ui.fight.arena));
  if (stagedScene()==='realm') {
    // The model of the realm is built once for a world and repainted as strongholds change hands.
    if (picture.realm?.world !== world) {
      picture.realm = picture.modules.createRealm(stage, () => world, {onAudio:updateSpatialAudio,onSelect(place){ if(ui.sheet||confirming)return;actions.place({place});feedbackAudio.play('pick');render(); }});
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
    picture.seat = picture.modules.createSeat(stage, () => world, ui.place, {
      nameOf: (kind) => BUILDINGS[kind].name, onHour: syncSeatAmbience, onAudio: updateSpatialAudio,
      canBuild: () => ui.page === 'seat' && ui.seatTab === 'build' && !ui.commandCollapsed,
      onSelect(selection) {
        if (ui.page !== 'seat' || ui.sheet) return;
        if (selection.kind === 'person') actions.person({id:selection.id});
        else if (selection.kind === 'building') actions.building(selection);
        else if (selection.kind === 'plot') actions['build-plot'](selection);
        feedbackAudio.play('pick');
        render();
      },
    });
    picture.seat.world = world;
    stage.show(picture.seat);
  } else {
    if (stage.current !== picture.seat) stage.show(picture.seat);
    picture.seat.refresh();
  }
  picture.seat.showTags = ui.tags;
  picture.seat.selectedBuilding = ui.buildPlot === null ? ui.building : null;
  picture.seat.selectedPlot = ui.buildPlot;
}

let lastSeatTrack;
let spatialScene, spatialElapsed = 0;

function updateSpatialAudio(scene, dt) {
  if (scene !== spatialScene) return;
  spatialElapsed += dt;
  if (spatialElapsed < .10) return;
  spatialElapsed = 0;
  spatialAudio.update(picture.stage.orbit);
}

function syncSpatialAudio() {
  const current = picture.stage?.current;
  const next = world && !ui.fight && (ui.page === 'seat' && current === picture.seat || ui.page === 'world' && ui.map3d && current === picture.realm)
    ? current : undefined;
  if (spatialScene === next) return;
  spatialScene = next;
  spatialElapsed = .10;
  spatialAudio.select(next);
}

function syncSeatAmbience(hour) {
  if (ui.page !== 'seat') return;
  const track = courtyardTrack(hour);
  if (track === lastSeatTrack) return;
  lastSeatTrack = track;
  worldAmbience.select(track);
}

function syncAmbience() {
  if (world && ui.page === 'seat' && !ui.fight) {
    lastSeatTrack = courtyardTrack(picture.seat?.light.hour ?? 12);
    worldAmbience.select(lastSeatTrack);
  } else {
    lastSeatTrack = undefined;
    const realm = world && ui.page === 'world' && !ui.fight;
    worldAmbience.select(realm ? 'realm' : undefined, !!(realm && ui.map3d && picture.stage && picture.stage.current === picture.realm && picture.realm?.isMarching));
  }
}

// ---- before a game: the title and the choice of sect ----------------------------------------------------

const stagedScene=()=>ui.page==='battle'&&ui.fight?'battle':ui.page==='world'&&picture.stage&&ui.map3d?'realm':'seat';
const isStaged=()=>ui.page==='seat'||ui.page==='battle'&&!!ui.fight||ui.page==='world'&&!!picture.stage&&ui.map3d;
const canFoldCommand=()=>ui.page==='seat'||ui.page==='world'&&!!picture.stage&&ui.map3d;
/** The hour in the seat's picture, by the old twelve-hour clock, with the part of the day it falls in. */
function hourText() {
  const hour = picture.seat?.light?.hour;
  if (hour === undefined) return '';
  const part = hour < 5 || hour >= 19.4 ? '夜' : hour < 8 ? '晨' : hour < 11 ? '上午' : hour < 13 ? '正午' : hour < 17 ? '午后' : '黄昏';
  return `${'子丑寅卯辰巳午未申酉戌亥'[Math.floor(((hour + 1) % 24) / 2)]}时 · ${part}`;
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

const jobText = (person) => jobName(person.job ?? { kind: 'rest' });
function jobName(job) {
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
    ...learnableArts(person, heldArts(world, me())).filter((a) => a.tier < 5).map((a) => [`train:${a.id}`, `修练 ${a.name}（${levelOf(person.arts[a.id] ?? 0)}重）`]),
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
/** The people the leader should look at, by what they are waiting for: `[key, label, people]`. */
function waiting() {
  const watch = attention(world, me());
  return [['idle', '闲着', watch.idle], ['promotable', '可晋升', watch.promotable], ['unhappy', '想走', watch.unhappy], ['wounded', '带伤', watch.wounded]];
}
function roster() {
  const only = ui.only ? new Set(waiting().find(([key]) => key === ui.only)?.[2].map((p) => p.id)) : null;
  const list = membersOf(world, me()).filter((p) => (!only || only.has(p.id)) && (ui.rank === '全部' || RANKS[p.rank].name === ui.rank) && (!ui.search || [p.name, jobText(p), bestArtText(p), PLACE_BY_ID[p.place].name].join(' ').includes(ui.search)));
  return ui.sortKey === 'rank' ? list.sort((a, b) => b.rank - a.rank || b.level - a.level || a.id - b.id) : ranked(list, ui.sortKey, ui.sortUp);
}
const picked = () => world.persons[ui.person]?.school === me() ? world.persons[ui.person] : leaderOf(me()) ?? membersOf(world, me())[0];

/** The columns of the ranking table: the grade of gift, then RANKINGS less the five single aptitudes and age. */
const TABLE_KEYS = RANKINGS.map(([key]) => key).filter((key) => !key.startsWith('apt:') && key !== 'age');

/** Where the sect has an art from, in a few words: its own, a teacher, a manual, or the first lessons anyone can give. */
function artSource(art) {
  if (art.sect === me() || art.custom) return '本门绝学';
  const teacher = membersOf(world, me()).filter((p) => levelOf(p.arts[art.id] ?? 0) >= TEACH_LEVEL).sort((a, b) => (b.arts[art.id] ?? 0) - (a.arts[art.id] ?? 0))[0];
  const copy = books().manuals[art.id];
  if (teacher && copy) return `${teacher.name}可授 · 抄本 ${copy} 重`;
  if (teacher) return `${teacher.name}可授`;
  if (copy) return `抄本 ${copy} 重`;
  return '入门功夫';
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

function placeMap(){if(game){const reachX=(ui.map.zoom-1)*game.safe.width/game.uiScale/2,reachY=(ui.map.zoom-1)*game.safe.height/game.uiScale/2;ui.map.x=Math.max(-reachX,Math.min(reachX,ui.map.x));ui.map.y=Math.max(-reachY,Math.min(reachY,ui.map.y));}render();}
const zoomMap=factor=>{ui.map.zoom=Math.max(1,Math.min(3,ui.map.zoom*factor));placeMap();};
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
function startFight({ sides, formations = [], title, heads, colors, side = 0, seed, saveAfter = false, settle: settleFight }) {
  const rng = createRng(1);
  rng.state = world.rng;
  const battle = createBattle({ sides, formations, seed: seed ?? rng.int(1, 1e9) });
  const names = new Map(sides.flat().map((person) => [person.id, person.name]));
  const name = (id) => names.get(id) ?? '？';
  const lines = [];
  const note = (event) => {
    const line = tell(event, name);
    if (line && (event.type !== 'hit' || lines.length < 80)) lines.push(line);
  };
  const contact = (cue) => {
    if (cue.type === 'hit' && cue.critical && cue.art) {
      const art = recordedArts.get(cue.art);
      voice.shout(cue.art + '！', art ? 'art-' + art : undefined);
    }
    combatAudio.contact(cue);
  };
  const finish = () => {
    voice.endBattle();
    const summary = { winner: battle.winner, time: battle.time, fighters: battle.units.map((u) => ({ id: u.id, side: u.side, down: u.down, fled: u.fled, hpLeft: u.hp / u.hpMax, dealt: u.dealt, xp: Math.round(u.dealt) })) };
    const result = settleFight(summary, rng);
    world.rng = rng.state;
    queueOutcome();
    if (saveAfter) slots.write('auto', world, autoLabel());
    ui.fight = null;
    ui.lastFight = { title, won: result.won, fellBack: result.fellBack, tourney: result.tourney, verdict: `${result.verdict}历时 ${battle.time.toFixed(0)} 秒。`, lines };
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
  const artIds = [];
  const maxMoves = Math.max(0, ...battle.units.map(unit => unit.wheel.length));
  for (let slot = 0; slot < maxMoves; slot++) {
    for (const unit of battle.units) {
      const id = unit.wheel[slot]?.art;
      if (recordedArtIds.has(id)) artIds.push(id);
    }
  }
  voice.prepareBattle(artIds);
  const arena = picture.modules.createArena(picture.stage, battle, {
    colors, onEvent: note, onContact: contact,
    onClearSounds: combatAudio.silence, onEnd: () => (finish(), render()), playerSide: side,
  });
  ui.battleLog=false;ui.fight = { arena, title, heads, lines, side };
  ui.page = 'battle';
}
const colorOf = (sectId) => parseInt(SECT_BY_ID[sectId].color.slice(1), 16);
const headOf = (sectId) => ({ name: SECT_BY_ID[sectId].name, person: leaderOf(sectId) ?? founder(SECT_BY_ID[sectId]) });
const fallenText = (outcome) => (outcome.fallen.length ? `战殁：${outcome.fallen.join('、')}。` : '无人战殁。');
function defenseVerdict(outcome, placeId) {
  if (!outcome.won) return (outcome.held ? '守住了山门。' : '击退来敌，但掌门战殁、无人继任，山门失守。') + fallenText(outcome);
  if (outcome.held && outcome.losses) {
    return `首战失利，众人退守内院，仍持有${PLACE_BY_ID[placeId].name}。损失银两 ${num(outcome.losses.silver)}、粮草 ${num(outcome.losses.grain)}。他派仍可能来犯，可趁机整备守军或改善邻派关系。` + fallenText(outcome);
  }
  return '据点失守。' + fallenText(outcome);
}

/** Marches on a stronghold with the sect's ten best. */
function march(placeId) {
  const prepared = beginAssault(world, me(), placeId, marchParty().map((p) => p.id));
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
    ...prepared, title: `${SECT_BY_ID[attacker].name}来犯${PLACE_BY_ID[place].name}`, heads: [headOf(attacker), headOf(me())], colors: [colorOf(attacker), colorOf(me())], side: 1, saveAfter: true,
    settle(summary, rng) {
      const outcome = settleAssault(world, attacker, place, summary, rng);
      if (outcome.losses) ui.resume = 0;
      return { won: !outcome.won && outcome.held, fellBack: !!outcome.losses, verdict: defenseVerdict(outcome, place) };
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

/** Fights the player's bout at the Sword Meet in person. */
function tourneyFight() {
  const bout = tourneyBout(world);
  if (!bout) return;
  const { mine, rival, round, side, seed } = bout;
  const fighters = side === 0 ? [mine, rival] : [rival, mine];
  startFight({
    sides: fighters.map((person) => [person]), title: `论剑${round}`, heads: fighters.map((person) => ({ name: person.name, person })),
    colors: fighters.map((person) => colorOf(person.school)), side, seed, saveAfter: true,
    settle(summary) {
      const won = boutWinner(fighters[0], fighters[1], summary.winner) === side;
      settleBout(world, won);
      // The meet may have ended with this bout; its honours are read out once the fight's report is closed.
      if (!world.tourney) ui.heralds.push({ kind: 'tourney' });
      return { won, tourney: true, verdict: won ? `${mine.name}胜${rival.name}，${world.tourney ? '晋级下一轮。' : '夺得魁首！'}` : `${mine.name}不敌${rival.name}，止步${round}。` };
    },
  });
}

/** Tells the player of whatever has newly come into their hands. */
function announceUnlocks() {
  if (!world?.unlocks || world.outcome) return;
  const features = checkUnlocks(world);
  if (features.length) ui.heralds.push({ kind: 'unlock', features });
}

// ---- the chronicle and the saves -----------------------------------------------------------------------

const LOG_TYPES = { moment: '弟子', tourney: '论剑', 'tourney-call': '论剑', start: '立派', conquer: '征伐', repel: '守御', fallback: '退守', fall: '覆灭', settle: '分舵', death: '讣告', desert: '叛离', insight: '领悟', succession: '传位', summit: '大会', event: '奇遇', intel: '情报', hostilities: '交战', court: '朝廷', join: '来投' };

const PERSON_SHEETS = new Set(['job','wheel','gear','meridian','create','master','move']);
/** Has the narrator read a sheet aloud the first time it is shown. */
function speakSheet() {
  const sheet = ui.sheet;
  let text = '',
    clip;
  if (sheet?.kind === 'event') {
    const view = pendingView(world);
    text = view?.text ?? '';
    clip = 'event';
  } else if (sheet?.kind === 'outcome' || sheet?.kind === 'herald') {
    text = sheet.text;
    clip = 'outcome';
  } else if (sheet?.kind === 'season') {
    text = sheet.title.replace(' · ', '，') + '。';
    clip = 'season';
  } else if (sheet?.kind === 'fight') {
    text = `${ui.lastFight.won ? '此战告捷。' : '此战失利。'}${ui.lastFight.verdict}`;
    clip = ui.lastFight.won ? 'victory' : 'defeat';
  } else if (sheet?.kind === 'siege' && world.pending?.kind === 'siege') {
    text = `${SECT_BY_ID[world.pending.attacker].name}来犯${PLACE_BY_ID[world.pending.place].name}！`;
    clip = 'siege';
  }
  const key = text && sheet.kind + ':' + text;
  if (key === ui.spoken) return;
  if (key && sheet.kind !== 'fight') feedbackAudio.play('notice');
  // Leaving a sheet that was being read stops the reading.
  if (ui.spoken && !key) voice.stop();
  ui.spoken = key;
  if (key) voice.say(text, { clip, preferSystem: true });
}
// Native screen stack is updated from the same world state and actions.
let spokenPrologue=null;
function context(){return {world,ui,picture,art,slots,storage,music,voice,worldAmbience,feedbackAudio,editor,
  helpers:{me,books,open,dayText,founder,leaderOf,b_status,jobText,jobName,bestArt,bestArtText,jobChoices,weaponText,roster,picked,waiting,placeDeal,marchParty,artSource,stagedScene,isStaged,canFoldCommand,sceneUrl,faceUrl,edited,modNote,storedQuality,hourText}};}
function render(){
  if(!game||fatal)return;
  if(world){
    if(ui.fight)ui.page='battle';
    const mine=placesOf(world,me());if(!mine.includes(ui.place))ui.place=mine.includes(SECT_BY_ID[me()].seat)?SECT_BY_ID[me()].seat:mine[0];
    if(!ui.place&&ui.page==='seat')ui.page='world';
    if(!membersOf(world,me()).length&&!['chronicle','saves'].includes(ui.page))ui.page='chronicle';
    ui.mapPlace??=SECT_BY_ID[me()].seat;
    locale.registerNames?.(Object.values(world.persons??{}).map(p=>p.name).concat(Object.values(world.places??{}).flatMap(p=>(p.applicants??[]).map(a=>a.name)),ui.ownName,ui.ownLeader));
  }
  syncPicture();syncSpatialAudio();
  music.select(ui.fight?'battle':world?'explore':'title');syncAmbience();combatAudio.setEngaged(!!ui.fight);
  const beat=!world&&ui.page==='prologue'?ui.prologue:null;
  if(beat!==spokenPrologue){if(spokenPrologue!==null)voice.stop();spokenPrologue=beat;if(beat!==null)voice.say(prologue[beat].line,{clip:prologueVoice[beat]});}
  nativeUi?.request();speakSheet();
  const hintKey=world&&ui.commandCollapsed&&!ui.sheet&&!ui.fight?ui.language+':'+ui.page:'';
  if(hints&&hintKey!==lastHints){lastHints=hintKey;hints.set(hintKey?[{action:locale.translate('暂停'),key:'Space',pad:'Start',touch:locale.translate('暂停')},{action:locale.translate('返回指令'),key:'Tab',pad:'D-pad',touch:locale.translate('点按')}]:[]);}

  if(pendingSaveProblem){const problem=pendingSaveProblem;pendingSaveProblem='';nativeUi?.toast(problem==='write-failed'?'无法保存，请导出存档文件。':'存档无法读取。原档已保留。','warning');}
}

function download(name, text) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}

/** Takes a world as the one being played. */
function enter(next, text = '', { guide = false } = {}) {
  world = next;
  // Someone is watching this world, so its events wait for an answer.
  world.options.interactive = true;
  // A world from before there was a list of matters in hand begins one now.
  if (!world.goals) startGoals(world);
  // A new sect is handed its affairs a few at a time; a world from before that keeps everything open.
  if (guide && !world.unlocks) (startUnlocks(world), checkUnlocks(world));
  Object.assign(ui, {
    page: 'seat', sheet: guide ? { kind: 'guide' } : null, place: null, building: 0, buildPlot: null,
    seatTab: 'build', commandCollapsed: false, person: books().leaderId, mapPlace: null,
    fight: null, lastFight: null, speed: 0, resume: 0, notice: '', only: '', book: 'annals',
  });
  ui.batch.clear();
  Object.assign(ui, { heralds: [], season: takeStock(), held: placesOf(world, me()), ended: !!world.outcome, picking: false });
  const protection = openingProtection(world);
  if (protection?.active && protection.daysLeft <= 30) ui.heralds.push(truceWarning(protection.daysLeft));
  toast(text);
  startPicture();
}

/** The data pack kept in this browser, as a short note; empty when there is none. */
let modApplied = '';
const modNote = () => modApplied;
try {
  const kept = storage.getItem('wulin-mod');
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
      storage.setItem('wulin-mod', text);
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
const pick=selector=>nativeUi?.read(selector)??'';

const actions = {
  retry:()=>location.reload(),
  language:({language})=>setLanguage(language),
  'list-page':({key,page})=>{(ui.listPages??={})[key]=Math.max(0,Number(page));},
  'sheet-list-page':({list,page})=>{(ui.sheet.listPages??={})[list]=Number(page);},
  page(data) {
    if (ui.fight && data.page !== 'battle') return toast('战事未了。', 'warning');
    if (world && !open(data.page)) return toast('此处尚未开放。', 'warning');
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
  sheet(data) {
    if (data.kind === 'build') ui.buildPlot = null;
    ui.sheet = { ...data, index: data.index === undefined ? undefined : Number(data.index) };
  },
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
      nativeUi?.focus(ui.ownName.trim()?'own-leader':'own-name');
      return;
    }
    ui.page = 'legacy';
  },
  'sect-back': () => (ui.page = 'sects'),
  succession: (data) => (ui.succession = data.enabled === 'true'),
  new() {
    const sect = ui.chosen;
    const custom = ui.founding ? { sect, name: ui.ownName.trim(), leader: ui.ownLeader.trim() } : null;
    enter(createWorld({ seed: Number(new URLSearchParams(location.search).get('seed')) || (Date.now() % 1e9) + 1, playerSect: sect, succession: ui.succession, scenario: ui.scenario, difficulty: ui.difficulty, custom }), '', { guide: true });
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
  date() {
    const now=performance.now();
    ui.taps = now - ui.tapAt < 600 ? ui.taps + 1 : 1;
    ui.tapAt = now;
    if (ui.taps >= 5) (ui.taps = 0), openEditor();
  },
  editor: openEditor,

  look(data) {
    ui.place = data.place;
    ui.building = 0;
    ui.buildPlot = null;
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
  building(data) {
    Object.assign(ui, { building: Number(data.index), buildPlot: null, seatTab: 'build', commandCollapsed: false });
  },
  'build-plot'(data) {
    const plot = Number(data.plot);
    if (!availablePlots(world.places[ui.place].buildings).includes(plot)) return toast('这块地已被占用或不可建造。', 'warning');
    Object.assign(ui, { buildPlot: plot, seatTab: 'build', commandCollapsed: false, sheet: { kind: 'build' } });
  },
  'build-kind': ({ kind }) => (ui.sheet.buildKind = kind),
  build() {
    const kind = ui.sheet?.buildKind ?? Object.keys(BUILDINGS).find(kind=>buildAvailability(world,me(),ui.place,kind,ui.buildPlot).ok) ?? 'dorm';
    if (!say(build(world, me(), ui.place, kind, ui.buildPlot), `${BUILDINGS[kind]?.name ?? '建筑'}已建成。`)) return;
    ui.building = world.places[ui.place].buildings.length - 1;
    ui.buildPlot = null;
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
    const held = heldArts(world, me());
    for (const id of ui.batch) {
      const person = world.persons[id];
      const best = learnableArts(person, held).filter((a) => a.tier < 5).sort((a, b) => b.tier - a.tier)[0];
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
    const chosen = Array.from({length:RANKS[person.rank]?.slots??4},(_,i)=>pick('#wheel-'+i)).filter(Boolean);
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
  'buy-book'(data) {
    const result = buyManual(world, me(), data.id);
    if (!result.ok) return toast(result.why);
    ui.art = data.id;
    toast(`《${result.art.name}》已入藏经阁。`);
  },
  'ask-teaching'(data) {
    const result = askTeaching(world, me(), data.sect, data.id);
    if (!result.ok) return toast(result.why);
    toast(`${SECT_BY_ID[data.sect].name}送来《${result.art.name}》抄本。`);
  },
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
  'guide-open': () => (ui.sheet = { kind: 'guide' }),
  'guide-go'(data) {
    if (data.tab === 'train') {
      actions.page({ page: 'disciples' });
      const newest = membersOf(world, me()).filter((person) => person.rank === 0).at(-1);
      if (newest) Object.assign(ui, { person: newest.id, sheet: { kind: 'job' } });
      return;
    }
    actions.page({ page: 'seat' });
    ui.commandCollapsed = false;
    ui.seatTab = data.tab;
    if (data.tab === 'build') {
      const dorm = world.places[ui.place]?.buildings.findIndex((building) => building.kind === 'dorm');
      if (dorm >= 0) actions.building({ index: dorm });
    }
  },
  'prepare-defense'() {
    actions.page({ page: 'seat' });
    ui.resume = ui.speed = 0;
    ui.sheet = { kind: 'guard' };
  },
  'guard-gate'(data) {
    actions.building(data);
    ui.sheet = null;
  },
  'goal-go'() {
    const go = goalView(world)?.go;
    if (!go) return;
    actions.page({ page: go.page });
    if (go.tab) ui.seatTab = go.tab;
    if (go.sheet) actions.sheet({ kind: go.sheet });
  },
  'goal-claim'() {
    const result = claimGoal(world);
    if (!result.ok) return toast(result.why, 'warning');
    const next = goalView(world);
    if (ui.sheet?.kind === 'goal') ui.sheet = null;
    toast(`「${result.title}」已成。`, 'success');
    voice.say(`${result.title}，已成。${next?.last ? '' : '下一件：' + next.title + '。'}`, { clip: 'goal', preferSystem: true });
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
    books().formation = pick('#formation') || books().formation;
    world.pending = null;
    const rng = createRng(1);
    rng.state = world.rng;
    const result = assault(world, attacker, place, party, rng);
    world.rng = rng.state;
    if (result.losses) ui.resume = 0;
    queueOutcome();
    if (result.ok) slots.write('auto', world, autoLabel());
    ui.sheet = { kind: 'outcome', title: `${SECT_BY_ID[attacker].name}来犯`, text: result.ok ? defenseVerdict(result, place) : '来敌已退。' };
  },
  'mod-load': loadMod,
  'mod-clear'() {
    try {
      storage.removeItem('wulin-mod');
    } catch {
      return;
    }
    if (world) slots.write('auto', world, autoLabel());
    location.reload();
  },
  'feedback-test': () => feedbackAudio.play('confirm', { preview: true }),
  'voice-test': () => voice.say('江湖路远，各位保重。', { clip: 'preview' }),
  'title-music': () => music.set({ on: !music.unlocked || !music.on }),
  'fight-rally': () => (voice.shout('众弟子听令，随我上！', 'rally'), ui.fight.arena.battle.rally(ui.fight.side)),
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
  book: (data) => (ui.book = data.book),

  // The roster: who to show, and in what order.
  only: (data) => (ui.only = ui.only === data.only ? '' : data.only),
  'only-go'(data) {
    actions.page({ page: 'disciples' });
    Object.assign(ui, { only: data.only, rank: '全部', search: '' });
  },
  sort(data) {
    if (ui.sortKey === data.key) ui.sortUp = !ui.sortUp;
    else Object.assign(ui, { sortKey: data.key, sortUp: false });
  },
  'sort-dir': () => (ui.sortUp = !ui.sortUp),
  'roster-view': (data) => (ui.rosterView = data.view),
  'promote-all'() {
    const raised = attention(world, me()).promotable.filter((person) => promote(world, person.id).ok);
    toast(raised.length ? `${raised.length} 人晋升：${raised.slice(0, 4).map((person) => person.name).join('、')}${raised.length > 4 ? ' 等' : ''}。` : '眼下无人可晋升。', raised.length ? 'success' : 'warning');
  },
  assign(data) {
    const plan = recommendJobs(world, me(), { idleOnly: data.idle === 'true' });
    const done = plan.filter(({ person, job }) => setJob(world, person.id, job).ok);
    ui.sheet = null;
    toast(done.length ? `已为 ${done.length} 人安排差事。` : '各人差事未动。', done.length ? 'success' : 'notice');
  },
  'open-all'() {
    openAll(world);
    toast('各项事务已全部开放。', 'success');
  },

  // The Sword Meet.
  'tourney-enter'(data) {
    const result = enterTourney(world, Number(data.id));
    if (!result.ok) return toast(result.why, 'warning');
    slots.write('auto', world, autoLabel());
    ui.sheet = { kind: 'tourney' };
  },
  'tourney-skip'() {
    const result = enterTourney(world, null);
    if (!result.ok) return toast(result.why, 'warning');
    slots.write('auto', world, autoLabel());
    ui.sheet = { kind: 'tourney' };
  },
  'tourney-auto'() {
    const result = settleBout(world, null);
    if (!result.ok) return toast(result.why, 'warning');
    slots.write('auto', world, autoLabel());
    ui.sheet = { kind: 'tourney' };
  },
  'tourney-fight': () => tourneyFight(),

  'battle-log':()=>{ui.battleLog=!ui.battleLog;},
  'fight-pause'() {
    if (!ui.fight) return;
    const arena = ui.fight.arena;
    arena.paused = !arena.paused;
    if (arena.paused) combatAudio.silence();
  },
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
  language:(_,value)=>setLanguage(value),
  'rank-filter':(_,value)=>{ui.rank=value;},
  '@field':({id},value)=>{if(id==='own-name')ui.ownName=value;else if(id==='own-leader')ui.ownLeader=value;else if(id==='search-person')ui.search=value;},
  'arts-person': (_, value) => (ui.person = Number(value)),
  sort: (_, value) => Object.assign(ui, { sortKey: value, sortUp: false }),
  season: (_, value) => storage.setItem('wulin-season', value),
  voice: (_, value) => voice.set({ on: value === 'on' }),
  'voice-volume': (_, value) => voice.set({ volume: Number(value) }),
  music: (_, value) => music.set({ on: value === 'on' }),
  'music-volume': (_, value) => music.set({ volume: Number(value) }),
  'feedback-sound': (_, value) => { feedbackAudio.set({ on: value === 'on' }); combatAudio.settingsChanged(); },
  'feedback-volume': (_, value) => { feedbackAudio.set({ volume: Number(value) }); combatAudio.settingsChanged(); },
  ambience: (_, value) => { worldAmbience.set({ on: value === 'on' }); spatialAudio.settingsChanged(); },
  'ambience-volume': (_, value) => { worldAmbience.set({ volume: Number(value) }); spatialAudio.settingsChanged(); },
  quality(_, value) {
    if(world)slots.write('auto', world, autoLabel());
    try {
      value ? storage.setItem('wulin-quality', value) : storage.removeItem('wulin-quality');
    } catch {
      return;
    }
    location.reload();
  },
  plot: (_, value) => void say(movePlot(world, me(), ui.place, ui.building, value === '' ? null : Number(value)), '已迁建。'),
  'build-location'(_, value) {
    ui.buildPlot = value === '' ? null : Number(value);
    delete ui.sheet.buildKind;
  },
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

// Browser listeners are limited to the trusted audio unlock and visibility lifecycle.
document.addEventListener('visibilitychange',()=>{music.setHidden(document.hidden);worldAmbience.setHidden(document.hidden);spatialAudio.setHidden(document.hidden);combatAudio.setHidden(document.hidden);if(document.hidden)voice.stop();});
function setLanguage(language){
  ui.language=language==='en'?'en':'zh';locale.setLanguage(ui.language);document.documentElement.lang=ui.language==='en'?'en':'zh-CN';
  try{storage.setItem('wulin-language',ui.language);}catch{}
}
const confirmActions=new Set(['new','quit','fight-retreat','ed-revert','mod-clear']);
async function dispatch(act,data={},activation){
  if(confirming)return;
  if(act==='retry'){location.reload();return;}
  // Irreversible decisions get the engine's safe-area native confirmation.
  const overwrite=act==='save'&&slots.list().some(s=>s.slot===String(data.slot));
  if(confirmActions.has(act)||overwrite){
    confirming=true;picture.stage?.setInputEnabled?.(false);
    const question=({new:'确定开始新局？',quit:'保存当前进度并返回标题？','fight-retreat':'确定撤退？','ed-revert':'还原修改器打开前的状态？','mod-clear':'清除当前数据包？'})[act]??'覆盖此存档？';
    try{if(!await nativeUi.confirm(question))return;}finally{confirming=false;render();}
  }
  try{
    const normalized=Object.fromEntries(Object.entries(data??{}).map(([k,v])=>[k,typeof v==='boolean'?String(v):v]));
    actions[act]?.(normalized,activation);
    announceUnlocks();
    feedbackAudio.play(['save','new','upgrade','recruit','build'].includes(act)?'confirm':'pick');
  }catch(cause){fail(cause);}
  render();
}
function change(key,data,value,activation){
  try{changes[key]?.(data,String(value));announceUnlocks();feedbackAudio.play('pick');}catch(cause){fail(cause);}render();
}
let lastF8=-10000;
function updateInput(){
  if(!game||fatal)return;
  picture.stage?.orbit.updateNative?.();
  if(nativeUi?.editing||nativeUi?.choosing||confirming)return;
  if(game.keys.pressed('F8')){
    const now=performance.now();if(now-lastF8<550){if(ui.sheet?.kind==='editor')actions.close();else openEditor();render();lastF8=-10000;}else lastF8=now;
  }
  if(!world)return;
  if(ui.sheet)return;
  if(game.keys.pressed('space','pad:start')){if(ui.fight)actions['fight-pause']();else actions.speed({speed:ui.speed?0:1});render();}
  if(!ui.fight){for(const [key,speed] of [['1',1],['2',4],['3',16],['Backquote',0]])if(game.keys.pressed(key)){actions.speed({speed});render();}}
}
// ---- time ---------------------------------------------------------------------------------------------------

/** What the sect has, for telling a season's change. */
const takeStock = () => ({ index: Math.floor(world.day / 90), day: world.day, silver: books().silver, grain: books().grain, renown: books().renown, members: membersOf(world, me()).length, places: placesOf(world, me()).length });
const truceWarning = (days) => ({
  kind: 'herald', label: '立足期将尽', prepare: true,
  text: `立足期还剩 ${days} 日。届时他派可能来攻。先检查本地守军、山门和库存，或去江湖改善邻派关系。`,
});

/** The same notices are due whether a day or a battle determined the outcome. */
function queueOutcome() {
  if (!world.outcome || ui.ended) return;
  ui.ended = true;
  world.pending = null;
  const result = world.outcome.result;
  const text = { 'won-conquest': '天下据点尽归本派，一统江湖！', 'won-summit': '武林大会推举你为盟主，号令天下，莫敢不从。', 'won-court': '朝廷封你为武林都指挥使，禁武令自此废除。', lost: '本门已不复存在。江湖路远，后会有期。' }[result] ?? '';
  ui.heralds.push({ kind: 'herald', label: result === 'lost' ? '终局' : '功成', text });
}
/** At the turn of a season, reports what changed over the one that ended, and stops the clock for it. */
function openSeason() {
  const was = ui.season,
    now = takeStock();
  ui.season = now;
  if (!was || storage.getItem('wulin-season') === 'off' || !membersOf(world, me()).length) return;
  const since = chronicleEntries(world).filter((r) => r.day >= was.day && r.type !== 'moment');
  // Who came on this season: the days worth remembering first, then the latest of the rest.
  const told = new Set(world.log.filter((r) => r.type === 'moment' && r.day >= was.day).map((r) => r.text));
  const growth = membersOf(world, me())
    .flatMap((person) => (person.life ?? []).filter((entry) => entry.day >= was.day).map((entry) => ({ ...entry, name: person.name, big: told.has(`${person.name}${entry.text}。`) })))
    .sort((a, b) => b.big - a.big || b.day - a.day)
    .slice(0, 6)
    .map((entry) => [entry.name, entry.text]);
  ui.sheet = {
    kind: 'season', was, now, growth, pace: ui.speed,
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
  if (world?.pending && !world.outcome && !ui.sheet && !ui.fight) return void ((ui.sheet = { kind: world.pending.kind === 'siege' ? 'siege' : 'event' }), (ui.resume ||= ui.speed), (ui.speed = 0), render());
  if (!world || ui.sheet || ui.fight || world.outcome || confirming || document.hidden || nativeUi?.editing || nativeUi?.choosing) return;
  // The Sword Meet holds the calendar until it is over.
  if (world.tourney) return void ((ui.sheet = { kind: 'tourney' }), (ui.resume ||= ui.speed), (ui.speed = 0), render());
  if (Math.floor(world.day / 90) !== ui.season?.index) {
    openSeason();
    if (ui.sheet) return void render();
  }
  if (!ui.speed) return;
  // Leave the page alone while the player has a list open, so it does not close under them.
  if (nativeUi?.editing || nativeUi?.choosing) return;
  const before = world.day;
  const protection = openingProtection(world);
  const warningDay = protection?.active ? protection.until - 30 : -1;
  const seasonReport = storage.getItem('wulin-season') !== 'off';
  for (let i = 0; i < ui.speed && !world.pending && !world.outcome && !world.tourney; i++) {
    advanceDay(world);
    if (world.day === warningDay || seasonReport && world.day % 90 === 0) break;
  }
  const fresh = world.log.filter((entry) => entry.day > before);
  const news = fresh.filter((entry) => entry.sect === me()).at(-1);
  if (news) ui.notice = news.text;
  if (!world.outcome && world.day === warningDay && before < warningDay) ui.heralds.push(truceWarning(30));
  // Great matters are announced one at a time, each on a sheet of its own.
  for (const entry of fresh) {
    const mine = entry.sect === me(),
      lost = entry.type === 'conquer' && !mine && ui.held?.includes(entry.place);
    const label = entry.type === 'fall' ? '除名' : entry.type === 'summit' ? '武林大会' : entry.type === 'succession' && mine ? '传位' : entry.type === 'conquer' && mine ? '克城' : lost ? '失地' : entry.type === 'repel' && mine ? '守御' : null;
    if (label) ui.heralds.push({ kind: 'herald', label, text: entry.text });
    else if (entry.type === 'tourney-call') ui.heralds.push({ kind: 'herald', label: '论剑', text: entry.text });
    else if (entry.type === 'moment' && mine) ui.heralds.push({ kind: 'moment', person: entry.person, text: entry.text });
  }
  announceUnlocks();
  ui.held = placesOf(world, me());
  queueOutcome();
  if (Math.floor(world.day / 30) > Math.floor(before / 30) || world.outcome) slots.write('auto', world, autoLabel());
  if (ui.heralds.length) ui.sheet = { ...ui.heralds.shift(), pace: ui.speed };
  else if (Math.floor(world.day / 90) !== ui.season?.index) openSeason();
  render();
}, 1000);
// A fight's bars and clock are redrawn a few times a second.
setInterval(() => ui.fight && !ui.sheet && render(), 400);


const semantics=createUiSemantics({maxNodes:4096});
const tester=createUiTester({semantics});
const params=new URLSearchParams(location.search);
const host=document.querySelector('#overlay');
let startup;
try{
 startup=await play({parent:host,width:1280,height:720,portrait:{width:720,height:1280},fit:'expand',pixelRatio:Math.min(2,Math.max(1.5,devicePixelRatio||1)),uiScale:{min:1,max:1.2},transparent:true,backend:'webgl2',audio:false,renderMode:'on-demand',semantics,
  setup(g){
    game=g;
    hints=g.hints([]);
    pointerSurface=g.sprite(undefined,g.world);
    const arrangeSurface=()=>{const bounds=g.screen;pointerSurface.hitArea={x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height};};
    arrangeSurface();
    // The optional painted map also takes gestures from Play, never raw DOM pointers.
    const painting=()=>world&&ui.page==='world'&&(!picture.stage||!ui.map3d)&&!ui.sheet&&!confirming;
    let mapPinch=1;
    g.gestures(pointerSurface,{
      drag(d){if(painting()&&(d.phase==='start'||d.phase==='move')){ui.map.x+=d.dx/g.uiScale;ui.map.y+=d.dy/g.uiScale;placeMap();}},
      pinch(p){if(!painting())return;if(p.phase==='start')mapPinch=ui.map.zoom;else if(p.phase==='move'){ui.map.zoom=Math.max(1,Math.min(3,mapPinch*p.scale));placeMap();}}
    });
    nativeUi=createNativeUi(g,{context,locale,dispatch,change,onClose:()=>{actions.close();render();},onError:fail});
    projection=createBrowserSemantics({semantics,canvas:g.canvas,width:g.screen.width,height:g.screen.height,onError:fail});
    // Audio's native browser hardware unlock stays in a trusted input event.
    const unlock=e=>{music.unlock(e);feedbackAudio.unlock(e);};
    g.canvas.addEventListener('pointerdown',unlock,{passive:true});
    g.canvas.addEventListener('keydown',unlock);
    g.canvas.addEventListener('contextmenu',event=>event.preventDefault());
    globalThis.__wulin.native={game:g,semantics,tester,ui:nativeUi};
    globalThis.egretGame={game:g,semantics,ready:false};
    setLanguage(ui.language);render();
  },
  arrange(g){if(pointerSurface){const b=g.screen;pointerSurface.hitArea={x:b.x,y:b.y,width:b.width,height:b.height};}projection?.sync({width:g.screen.width,height:g.screen.height});nativeUi?.resize();},
  update(){updateInput();},
  onError:fail,
 });
 // Required manifest is loaded on the native loading layer; failure can be retried.
 const loaded=await game.loading([()=>loadArt()],{label:locale.translate('正在展开画卷')});art=loaded[0];
 if(fatal)throw Error('The startup screen could not be constructed.');document.querySelector('#loading').hidden=true;render();
 if(!slots.persistent)nativeUi.toast('当前浏览器无法永久保存，请导出存档。','warning');
 await new Promise(resolve=>requestAnimationFrame(resolve));globalThis.egretGame.ready=!fatal;
}catch(error){fail(error);}
