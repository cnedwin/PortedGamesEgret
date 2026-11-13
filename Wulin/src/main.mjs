// Wulin: lead a sect, raise its disciples, and win the martial world.
//
// This file is the page: it draws the world as panels and passes the player's
// choices on to the rules. The other modules each own one concern:
//   data/places.mjs   the map
//   data/sects.mjs    the twelve sects, ranks and offices
//   data/arts.mjs     martial arts and what they need
//   data/goods.mjs    buildings, equipment, pills and prices
//   core/world.mjs    what a day does (no page needed)
//   core/battle.mjs   a fight (no page needed)
//   core/persons.mjs  people and how they grow
//   core/save.mjs     saves, in the browser and as files
//   core/editor.mjs   the built-in editor (F8 twice)
//   view/stage.mjs    the 3D picture: view/seat.mjs a stronghold, view/arena.mjs a fight
// The 3D modules are loaded only once a game starts, and the game carries on
// with its panels alone where the device cannot draw them.
import { ART_BY_ID, ARTS, levelOf } from './data/arts.mjs';
import { BUILDINGS } from './data/goods.mjs';
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

const app = document.querySelector('#app'),
  head = document.querySelector('#head'),
  viewBox = document.querySelector('#view'),
  hud = document.querySelector('#hud');
const slots = createSlots(localStorage);

/** What the page is showing; the world itself is in `world`. */
const ui = { tab: 'sect', speed: 0, sheet: null, message: '', taps: 0, tapAt: 0, place: null, fight: null, tall: false };
let world = null;
const editor = createEditor(() => world, (next) => (world = next));
/** State for the browser console and for automated checks; the game never reads it. */
globalThis.__wulin = { get world() { return world; }, ui, get picture() { return picture; } };

function fail(cause) {
  const box = document.querySelector('#error');
  box.textContent = '出错了 / Error: ' + (cause?.message ?? cause);
  box.hidden = false;
}
window.addEventListener('error', (event) => fail(event.error ?? event.message));

/** Makes text safe to place in markup; names can be typed by the player. */
const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const me = () => world.playerSect;

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
    viewBox.hidden = false;
    const quality = picture.modules.pickQuality(undefined, storedQuality());
    picture.stage = await picture.modules.createStage(document.querySelector('#stage'), { quality, onError: (cause) => console.warn('3D:', cause) });
  } catch (cause) {
    console.warn('3D unavailable:', cause);
  }
  render();
}

/** Keeps the picture in step with the page: which stronghold is shown, and whether it is in sight. */
function syncPicture() {
  const { stage } = picture;
  const wanted = !!stage && !!world && (ui.fight || ui.tab === 'sect');
  viewBox.hidden = !wanted;
  viewBox.classList.toggle('tall', ui.tall);
  document.body.classList.toggle('fighting', !!ui.fight);
  if (!stage) return;
  stage.sleep(!wanted);
  if (!wanted || ui.fight) return;
  const mine = placesOf(world, me());
  if (!mine.includes(ui.place)) ui.place = mine.includes(SECT_BY_ID[me()].seat) ? SECT_BY_ID[me()].seat : mine[0];
  if (!ui.place) return;
  if (picture.seat?.placeId !== ui.place || picture.seat.world !== world) {
    picture.seat = picture.modules.createSeat(stage, () => world, ui.place);
    picture.seat.world = world;
    stage.show(picture.seat);
  } else {
    if (stage.current !== picture.seat) stage.show(picture.seat);
    picture.seat.refresh();
  }
}
const say = (result, okText = '') => (ui.message = result.ok ? okText : result.why);

// ---- title ---------------------------------------------------------------------------------------

function titleView() {
  const saves = slots.list();
  return `<div class="title">
    <h1>武林天下</h1>
    <p class="muted">大昭承和年间，朝廷颁《禁武令》，江湖风雨欲来。择一门派，经营山门，教养弟子，问鼎武林。</p>
    <div class="row" style="justify-content:center">
      <label><input type="checkbox" id="succession"> 世代更替（人物会老去，掌门需传位）</label>
    </div>
    <div class="sects">${SECTS.map(
      (sect) => `<button data-act="new" data-sect="${sect.id}" style="border-left-color:${sect.color}">
        <b>${sect.name}</b> <span class="tag">${['邪', '中立', '正'][sect.standing + 1]}</span><br>
        <span class="muted">${PLACE_BY_ID[sect.seat].name} · ${sect.leader.name}<br>${sect.role}</span></button>`,
    ).join('')}</div>
    ${saves.length ? `<h3>继续</h3><div class="row" style="justify-content:center">${saves.map((s) => `<button data-act="load" data-slot="${esc(s.slot)}">${esc(s.label || '存档 ' + s.slot)}</button>`).join('')}</div>` : ''}
    <div class="row" style="justify-content:center"><button data-act="import">导入存档文件</button></div>
    <p class="muted">${esc(ui.message)}</p>
  </div>`;
}

// ---- the panels of a game in progress -------------------------------------------------------------------

function barView() {
  const books = world.sects[me()],
    sect = SECT_BY_ID[me()];
  const speed = (value, label) => `<button data-act="speed" data-speed="${value}" class="${ui.speed === value ? 'on' : ''}">${label}</button>`;
  return `<div class="bar" style="border-bottom-color:${sect.color}">
    <span class="name">${sect.name}</span>
    <span data-act="date">${dateText(world)}</span>
    <span>银 ${Math.round(books.silver)}</span><span>粮 ${Math.round(books.grain)}</span>
    <span>威望 ${Math.round(books.renown)}</span><span>正邪 ${Math.round(books.virtue)}</span>
    <span class="spacer"></span>
    ${speed(0, '暂停')}${speed(1, '行')}${speed(4, '快')}${speed(16, '疾')}
  </div>
  <div class="tabs">${[['sect', '山门'], ['people', '弟子'], ['world', '江湖'], ['log', '纪事'], ['save', '存档']]
    .map(([id, label]) => `<button data-act="tab" data-tab="${id}" class="${ui.tab === id ? 'on' : ''}">${label}</button>`)
    .join('')}</div>`;
}

function sectView() {
  const books = world.sects[me()],
    row = ledger(world, me());
  const places = placesOf(world, me())
    .map((placeId) => {
      const place = world.places[placeId],
        spec = PLACE_BY_ID[placeId];
      const options = Object.entries(BUILDINGS).map(([kind, b]) => `<option value="${kind}">${b.name}（${b.cost}两，占${b.cells}格）</option>`).join('');
      const look = picture.stage && placeId !== ui.place ? ` <button data-act="look" data-place="${placeId}">观看</button>` : '';
      return `<div class="card mine"><h2>${spec.name}${look}</h2>
        <div class="muted">${spec.note} · 建地 ${usedCells(world, placeId)}/${spec.cells} · 住 ${residents(world, placeId).length}/${beds(world, placeId)}</div>
        <div class="muted">${RESOURCES.map((key) => `${RESOURCE_NAMES[key]}${'★'.repeat(spec.resources[key]) || '无'}`).join(' ')}</div>
        <div class="row">${place.buildings
          .map((b, i) => `<button data-act="upgrade" data-place="${placeId}" data-index="${i}" title="${BUILDINGS[b.kind].does}">${BUILDINGS[b.kind].name} ${b.level}级 ↑</button>`)
          .join('')}</div>
        <div class="row"><select id="build-${placeId}">${options}</select><button data-act="build" data-place="${placeId}">兴建</button></div>
        <h3>求见者</h3>
        ${place.applicants.length ? place.applicants.map((p, i) => `<div class="row"><span>${esc(p.name)}（${p.origin}，${p.age}岁）</span><span class="muted">${Object.entries(p.apt).map(([k, v]) => APT_NAMES[k] + v).join(' ')}</span><button data-act="recruit" data-place="${placeId}" data-index="${i}">收录</button></div>`).join('') : '<div class="muted">榜前无人。</div>'}
      </div>`;
    })
    .join('');
  return `<div class="row"><span>弟子 ${row.members} 人</span><span>据点 ${row.places} 处</span><span>每旬薪俸 ${row.wages} 两</span><span>朝廷 ${Math.round(books.court)}</span>
    <span class="muted">${RESOURCES.map((key) => `${RESOURCE_NAMES[key]} ${Math.round(books.res[key])}`).join(' · ')}</span></div>
    <div class="grid">${places}</div>`;
}

function jobText(person) {
  const job = person.job ?? { kind: 'rest' };
  if (job.kind === 'train') return '修练 ' + (ART_BY_ID[job.art]?.name ?? '');
  if (job.kind === 'seclude') return `闭关悟 ${ART_BY_ID[job.art]?.name ?? ''}（${job.days ?? 0}日）`;
  if (job.kind === 'gather') return '采集 ' + RESOURCE_NAMES[job.res];
  return { craft: '制造', patrol: '行侠仗义', extort: '欺压良民', rest: '休息' }[job.kind] ?? '休息';
}

function peopleView() {
  const members = membersOf(world, me()).sort((a, b) => b.rank - a.rank || b.level - a.level);
  const elders = members.filter((p) => p.rank >= 4);
  const rows = members
    .map((person) => {
      const arts = learnableArts(person);
      const jobs = [
        '<option value="">— 改派 —</option>',
        ...arts.filter((art) => art.tier < 5).map((art) => `<option value="train:${art.id}">练 ${art.name}（${levelOf(person.arts[art.id] ?? 0)}重）</option>`),
        ...ARTS.filter((art) => art.tier === 5 && art.sect === person.school && !person.insights.includes(art.id) && person.rank >= 3).map((art) => `<option value="seclude:${art.id}">闭关悟 ${art.name}</option>`),
        ...RESOURCES.map((key) => `<option value="gather:${key}">采 ${RESOURCE_NAMES[key]}</option>`),
        '<option value="craft:weapon">铸造</option><option value="craft:armor">织造</option><option value="craft:pill">炼丹</option>',
        '<option value="patrol">行侠仗义</option><option value="extort">欺压良民</option><option value="rest">休息</option>',
      ].join('');
      const best = Object.entries(person.arts).sort((a, b) => ART_BY_ID[b[0]].tier - ART_BY_ID[a[0]].tier || b[1] - a[1])[0];
      const mood = person.loyalty < 30 ? 'bad' : person.loyalty < 55 ? 'warn' : 'good';
      return `<tr><td><b>${esc(person.name)}</b> ${person.female ? '女' : '男'} ${person.age}</td><td>${RANKS[person.rank].name}</td><td>${person.level}</td>
        <td>${hpMax(person)}${person.wounds > 0.05 ? ' <span class="bad">伤</span>' : ''}</td><td>${prowess(person)}</td>
        <td>${best ? `${ART_BY_ID[best[0]].name} ${levelOf(best[1])}重` : '—'}</td>
        <td class="${mood}">${Math.round(person.loyalty)}</td><td>${PLACE_BY_ID[person.place].name}</td>
        <td>${jobText(person)}</td>
        <td><select data-change="job" data-id="${person.id}">${jobs}</select></td>
        <td>${person.rank < 4 ? `<button data-act="promote" data-id="${person.id}">晋升</button>` : ''}
          ${person.rank < 4 && elders.length ? `<select data-change="master" data-id="${person.id}"><option value="">${person.master ? '师：' + esc(world.persons[person.master]?.name ?? '') : '拜师'}</option>${elders.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select>` : ''}
          ${placesOf(world, me()).length > 1 ? `<select data-change="move" data-id="${person.id}"><option value="">调往</option>${placesOf(world, me()).map((id) => `<option value="${id}">${PLACE_BY_ID[id].name}</option>`).join('')}</select>` : ''}</td></tr>`;
    })
    .join('');
  return `<div class="scroll"><table><thead><tr><th>姓名</th><th>身份</th><th>级</th><th>气血</th><th>战力</th><th>所长</th><th>忠诚</th><th>所在</th><th>差事</th><th>改派</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function worldView() {
  const mine = new Set(placesOf(world, me()));
  const cards = PLACES.map((spec) => {
    const place = world.places[spec.id];
    const near = spec.roads.some((id) => mine.has(id));
    const guard = place.owner ? residents(world, spec.id) : [];
    let action = '';
    if (!place.owner && near) action = `<button data-act="settle" data-place="${spec.id}">开设分舵（1500两）</button>`;
    else if (place.owner && place.owner !== me() && near) action = `<button data-act="assault" data-place="${spec.id}">出兵</button>`;
    return `<div class="card ${place.owner === me() ? 'mine' : ''}" style="border-left:5px solid ${place.owner ? SECT_BY_ID[place.owner].color : 'var(--line)'}">
      <h2>${spec.name} <span class="tag">${place.owner ? SECT_BY_ID[place.owner].name : '无主'}</span></h2>
      <div class="muted">通 ${spec.roads.map((id) => PLACE_BY_ID[id].name).join('、')}</div>
      <div class="muted">${place.owner ? `守 ${guard.length} 人，战力 ${strength(guard)}` : spec.note}</div>
      <div class="row">${action}</div></div>`;
  }).join('');
  const sects = SECTS.filter((sect) => sect.id !== me())
    .map((sect) => {
      const books = world.sects[sect.id];
      if (!books.alive) return `<tr><td>${sect.name}</td><td colspan="5" class="muted">已除名</td></tr>`;
      const row = ledger(world, sect.id),
        relation = Math.round(world.sects[me()].relations[sect.id]);
      return `<tr><td style="border-left:5px solid ${sect.color}">${sect.name}</td><td>${row.members}</td><td>${row.places}</td><td>${row.strength}</td>
        <td class="${relation >= 40 ? 'good' : relation < 0 ? 'bad' : ''}">${relation}</td><td><button data-act="gift" data-sect="${sect.id}">馈赠 500 两</button></td></tr>`;
    })
    .join('');
  return `<div class="scroll"><table><thead><tr><th>门派</th><th>人</th><th>据点</th><th>战力</th><th>关系</th><th></th></tr></thead><tbody>${sects}</tbody></table></div>
    <h3 style="margin-top:12px">天下据点</h3><div class="grid">${cards}</div>`;
}

const logView = () => `<div class="log">${world.log.slice().reverse().map((entry) => `<div><span class="muted">第${entry.day}日</span> ${esc(entry.text)}</div>`).join('')}</div>`;

function saveView() {
  const saved = Object.fromEntries(slots.list().map((s) => [s.slot, s]));
  return `<div class="grid">${['1', '2', '3', 'auto']
    .map((slot) => `<div class="card"><h2>${slot === 'auto' ? '自动存档' : '存档位 ' + slot}</h2><div class="muted">${saved[slot] ? esc(saved[slot].label) : '空'}</div>
      <div class="row">${slot === 'auto' ? '' : `<button data-act="save" data-slot="${slot}">保存</button>`}<button data-act="load" data-slot="${slot}" ${saved[slot] ? '' : 'disabled'}>读取</button></div></div>`)
    .join('')}</div>
    <div class="row" style="margin-top:12px"><button class="primary" data-act="export">导出存档文件</button><button data-act="import">导入存档文件</button><button data-act="quit">回到标题</button></div>
    <div class="row"><span>画质</span><select data-change="quality">${[['', '自动'], ['high', '高'], ['medium', '中'], ['low', '低（省电）']].map(([value, label]) => `<option value="${value}" ${(storedQuality() ?? '') === value ? 'selected' : ''}>${label}</option>`).join('')}</select>
      <span class="muted">${picture.stage ? '改动后会重新载入页面，进度先自动保存。' : '这台设备画不了 3D，游戏以文字面板进行。'}</span></div>
    <p class="muted">存档保存在这个浏览器里；清除浏览器数据会一并清掉，重要的进度请导出为文件。${world.flags.editorUsed ? '<br>此存档使用过修改器。' : ''}</p>`;
}

// ---- sheets over the page: a fight's account, and the editor ---------------------------------------------

function fightSheet(sheet) {
  return `<div class="sheet"><div><h2>${esc(sheet.title)}</h2><p>${esc(sheet.verdict)}</p>
    <div class="fight">${sheet.lines.map((line) => `<div>${esc(line)}</div>`).join('')}</div>
    <div class="row" style="margin-top:8px"><button class="primary" data-act="close">知道了</button></div></div></div>`;
}

function editorSheet() {
  const books = world.sects[ui.sheet.sect],
    members = membersOf(world, ui.sheet.sect);
  const person = world.persons[ui.sheet.person] ?? members[0];
  const field = (label, change, value, extra = '') => `<label class="row"><span style="min-width:4.5em">${label}</span><input type="number" data-change="${change}" ${extra} value="${Math.round(value * 100) / 100}" style="width:8em"></label>`;
  return `<div class="sheet"><div><h2>修改器</h2>
    <div class="row"><select data-change="ed-sect">${SECTS.filter((s) => world.sects[s.id].alive).map((s) => `<option value="${s.id}" ${s.id === ui.sheet.sect ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
      <button data-act="ed-revert">还原到打开前</button><button class="primary" data-act="close">关闭</button></div>
    <div class="grid">
      <div class="card"><h3>门派</h3>${field('银两', 'ed-silver', books.silver)}${field('粮', 'ed-grain', books.grain)}${field('威望', 'ed-renown', books.renown)}${field('正邪', 'ed-virtue', books.virtue)}${field('朝廷', 'ed-court', books.court)}
        ${RESOURCES.map((key) => field(RESOURCE_NAMES[key], 'ed-res', books.res[key], `data-key="${key}"`)).join('')}</div>
      <div class="card"><h3>角色</h3>
        <div class="row"><select data-change="ed-person">${members.map((p) => `<option value="${p.id}" ${p.id === person?.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
        ${person ? `<label class="row"><span style="min-width:4.5em">姓名</span><input data-change="ed-name" value="${esc(person.name)}" style="width:8em"></label>
          ${field('等级', 'ed-level', person.level)}${field('忠诚', 'ed-loyalty', person.loyalty)}${field('年龄', 'ed-age', person.age)}
          ${STAT_KEYS.map((key) => field(STAT_NAMES[key], 'ed-stat', person.stats[key], `data-key="${key}"`)).join('')}
          ${Object.keys(person.apt).map((key) => field(APT_NAMES[key] + '资质', 'ed-apt', person.apt[key], `data-key="${key}"`)).join('')}
          <div class="row"><select id="ed-art">${ARTS.map((art) => `<option value="${art.id}">${art.name}（${levelOf(person.arts[art.id] ?? 0)}重）</option>`).join('')}</select>
            <input type="number" id="ed-art-level" min="0" max="10" value="10" style="width:4.5em"><button data-act="ed-art">设为此重</button></div>` : ''}</div>
      <div class="card"><h3>物品</h3>
        <div class="muted">物品代号：pill:heal1、weapon:sword:5、armor:3</div>
        <div class="row"><input id="ed-item" value="weapon:sword:7" style="width:11em"><input type="number" id="ed-count" value="1" style="width:5em"><button data-act="ed-stock">设定数量</button></div>
        ${Object.entries(books.stock).map(([id, count]) => `<div>${esc(describeItem(id)?.name ?? id)} × ${count}</div>`).join('') || '<div class="muted">库中无物。</div>'}</div>
    </div><p class="muted">${esc(ui.message)}　超出常规范围的数值也会生效。</p></div></div>`;
}

// ---- drawing -------------------------------------------------------------------------------------------

/** The bars over a fight: both sides' strength, the clock, and the player's orders. */
function hudView() {
  if (!ui.fight) {
    if (!picture.stage || !world) return '';
    return `<div></div><div class="corner"><button data-act="tall">${ui.tall ? '收起' : '展开'}</button></div>`;
  }
  const { arena, title } = ui.fight,
    battle = arena.battle;
  const side = (index) => {
    const units = battle.units.filter((unit) => unit.side === index),
      left = units.filter((unit) => !unit.down && !unit.fled);
    const share = units.reduce((sum, unit) => sum + (unit.down || unit.fled ? 0 : unit.hp), 0) / units.reduce((sum, unit) => sum + unit.hpMax, 0);
    return `<div class="side ${index ? 'right' : ''}"><b>${SECT_BY_ID[ui.fight.sects[index]].name}</b> ${left.length}/${units.length}<div class="meter"><i style="width:${Math.round(share * 100)}%"></i></div></div>`;
  };
  const speed = (value) => `<button data-act="fight-speed" data-speed="${value}" class="${arena.speed === value && !arena.paused ? 'on' : ''}">${value}×</button>`;
  const marked = battle.units.find((unit) => unit.id === battle.orders[0].focus && !unit.down);
  return `<div class="fightbar">${side(0)}<div>${esc(title)}<br><span class="muted" style="color:#ddd">${battle.time.toFixed(0)} 秒</span></div>${side(1)}</div>
    <div class="orders"><div class="hint">${battle.done ? '胜负已分' : marked ? `集火：${esc(marked.name)}（再点一次取消）` : arena.paused ? '已暂停。点敌人可下令集火，拖动可转视角。' : '点敌人可下令集火'}</div>
      <button data-act="fight-pause" class="${arena.paused ? 'on' : ''}">${arena.paused ? '继续' : '暂停'}</button>${speed(1)}${speed(2)}${speed(4)}
      <button data-act="fight-skip">速决</button><button data-act="fight-retreat" ${battle.orders[0].retreat ? 'disabled' : ''}>撤退</button></div>`;
}

function render() {
  syncPicture();
  hud.innerHTML = hudView();
  if (!world) return void ((head.innerHTML = ''), (app.innerHTML = titleView()));
  const views = { sect: sectView, people: peopleView, world: worldView, log: logView, save: saveView };
  const end = world.outcome ? `<div class="card" style="margin-bottom:10px"><b>${{ 'won-conquest': '一统江湖！', 'won-summit': '武林大会推举你为盟主！', lost: '本门已不复存在。' }[world.outcome.result] ?? ''}</b></div>` : '';
  const sheet = ui.sheet?.kind === 'fight' ? fightSheet(ui.sheet) : ui.sheet?.kind === 'editor' ? editorSheet() : '';
  head.innerHTML = barView();
  app.innerHTML = `<main>${end}${ui.message && !ui.sheet ? `<p class="warn">${esc(ui.message)}</p>` : ''}${views[ui.tab]()}</main>${sheet}`;
}

// ---- what the player does ---------------------------------------------------------------------------------

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
  const party = membersOf(world, me()).filter((p) => p.wounds < 0.3).sort((a, b) => prowess(b) - prowess(a)).slice(0, 10);
  const prepared = assaultSides(world, me(), placeId, party.map((p) => p.id));
  if (!prepared.ok) return say(prepared);
  const rng = createRng(1);
  rng.state = world.rng;
  const battle = createBattle({ sides: prepared.sides, formations: prepared.formations, seed: rng.int(1, 1e9) });
  const name = (id) => world.persons[id]?.name ?? '？';
  const lines = [];
  const note = (event) => {
    const line = tell(event, name);
    if (line && (event.type !== 'hit' || lines.length < 60)) lines.push(line);
  };
  const title = `攻打${PLACE_BY_ID[placeId].name}`;
  const finish = () => {
    const summary = { winner: battle.winner, time: battle.time, fighters: battle.units.map((u) => ({ id: u.id, side: u.side, down: u.down, fled: u.fled, hpLeft: u.hp / u.hpMax, dealt: u.dealt, xp: Math.round(u.dealt) })) };
    const outcome = settleAssault(world, me(), placeId, summary, rng);
    world.rng = rng.state;
    ui.fight = null;
    ui.sheet = { kind: 'fight', title, verdict: `${outcome.won ? '得胜' : '败退'}，历时 ${battle.time.toFixed(0)} 秒。${outcome.fallen.length ? '战殁：' + outcome.fallen.join('、') : ''}`, lines };
  };
  ui.speed = 0;
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
  ui.fight = { arena, title, sects };
  picture.stage.show(arena);
}

function download(name, text) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const loaded = deserialize(await file.text());
    if (loaded.ok) (world = loaded.state), (ui.message = '已读入存档。'), (ui.tab = 'sect'), startPicture();
    else ui.message = loaded.why;
    render();
  };
  input.click();
}

function openEditor() {
  if (!world || ui.fight || ui.sheet?.kind === 'editor') return;
  editor.open();
  ui.sheet = { kind: 'editor', sect: me(), person: undefined };
  ui.speed = 0;
  ui.message = '';
  render();
}

const actions = {
  new(data) {
    world = createWorld({ seed: (Date.now() % 1e9) + 1, playerSect: data.sect, succession: document.querySelector('#succession')?.checked ?? false });
    ui.tab = 'sect';
    ui.message = '';
    startPicture();
  },
  load(data) {
    const loaded = slots.read(data.slot);
    if (loaded.ok) (world = loaded.state), (ui.message = ''), startPicture();
    else ui.message = loaded.why;
  },
  save: (data) => (ui.message = slots.write(data.slot, world, `${SECT_BY_ID[me()].name} ${dateText(world)}`) ? '已保存。' : '浏览器拒绝了保存，请改用导出文件。'),
  export: () => download(saveFileName(world, SECT_BY_ID[me()].name), serialize(world, `${SECT_BY_ID[me()].name} ${dateText(world)}`)),
  import: importFile,
  quit() {
    world = null;
    ui.speed = 0;
    ui.fight = null;
  },
  tab: (data) => ((ui.tab = data.tab), (ui.message = '')),
  speed: (data) => (ui.speed = Number(data.speed)),
  build: (data) => say(build(world, me(), data.place, document.querySelector(`#build-${data.place}`).value), '动工了。'),
  upgrade: (data) => say(upgrade(world, me(), data.place, Number(data.index)), '扩建完成。'),
  recruit: (data) => say(recruit(world, me(), data.place, Number(data.index)), '收入门墙。'),
  promote: (data) => say(promote(world, Number(data.id)), '已晋升。'),
  settle: (data) => say(settle(world, me(), data.place), '分舵已立。'),
  assault: (data) => march(data.place),
  look: (data) => (ui.place = data.place),
  tall: () => (ui.tall = !ui.tall),
  'fight-pause': () => (ui.fight.arena.paused = !ui.fight.arena.paused),
  'fight-speed': (data) => ((ui.fight.arena.speed = Number(data.speed)), (ui.fight.arena.paused = false)),
  'fight-skip': () => ui.fight.arena.skip(),
  'fight-retreat': () => (ui.fight.arena.battle.retreat(0), (ui.fight.arena.paused = false)),
  gift: (data) => say(gift(world, me(), data.sect, 500), '礼已送到。'),
  close() {
    if (ui.sheet?.kind === 'editor') editor.close();
    ui.sheet = null;
    ui.message = '';
  },
  // Five quick taps on the date open the editor where there is no keyboard.
  date(_, event) {
    ui.taps = event.timeStamp - ui.tapAt < 600 ? ui.taps + 1 : 1;
    ui.tapAt = event.timeStamp;
    if (ui.taps >= 5) (ui.taps = 0), openEditor();
  },
  'ed-revert': () => (ui.message = editor.revert() ? '已还原。' : ''),
  'ed-art'() {
    const person = world.persons[ui.sheet.person] ?? membersOf(world, ui.sheet.sect)[0];
    const result = editor.setArt(person.id, document.querySelector('#ed-art').value, Number(document.querySelector('#ed-art-level').value));
    ui.message = result.ok ? '已设定。' : result.why;
  },
  'ed-stock'() {
    const result = editor.setStock(ui.sheet.sect, document.querySelector('#ed-item').value.trim(), Number(document.querySelector('#ed-count').value));
    ui.message = result.ok ? '已设定。' : '没有这种物品。';
  },
};

const changes = {
  job(data, value) {
    const [kind, arg] = value.split(':');
    if (!kind) return;
    const job = kind === 'train' || kind === 'seclude' ? { kind, art: arg } : kind === 'gather' ? { kind, res: arg } : kind === 'craft' ? { kind, make: arg } : { kind };
    say(setJob(world, Number(data.id), job));
  },
  master: (data, value) => value && say(setMaster(world, Number(data.id), Number(value)), '已拜师。'),
  move: (data, value) => value && say(relocate(world, Number(data.id), value)),
  quality(_, value) {
    slots.write('auto', world, `${SECT_BY_ID[me()].name} ${dateText(world)}`);
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
const edited = () => world.persons[ui.sheet.person] ?? membersOf(world, ui.sheet.sect)[0];

document.body.addEventListener('click', (event) => {
  const target = event.target.closest('[data-act]');
  if (!target || target.disabled) return;
  try {
    actions[target.dataset.act]?.(target.dataset, event);
  } catch (cause) {
    fail(cause);
  }
  if (target.dataset.act !== 'date' && target.dataset.act !== 'import') render();
});
document.body.addEventListener('change', (event) => {
  const target = event.target.closest('[data-change]');
  if (!target) return;
  try {
    const result = changes[target.dataset.change]?.(target.dataset, target.value);
    // A value outside the usual range still applies; the field is tinted so the player knows.
    if (result?.unusual) return void target.classList.add('unusual');
  } catch (cause) {
    fail(cause);
  }
  render();
});
window.addEventListener('keydown', doublePress('F8', () => (ui.sheet?.kind === 'editor' ? (actions.close(), render()) : openEditor())));
window.addEventListener('keydown', (event) => event.key === 'Escape' && ui.sheet && (actions.close(), render()));
// Space holds and releases a fight.
window.addEventListener('keydown', (event) => event.key === ' ' && ui.fight && (event.preventDefault(), actions['fight-pause'](), render()));

// ---- time ---------------------------------------------------------------------------------------------------

/** Days pass while the game is running and nothing is open over the page. */
setInterval(() => {
  if (ui.fight) return void (hud.innerHTML = hudView());
  if (!world || !ui.speed || ui.sheet || world.outcome) return;
  // Leave the page alone while the player has a list open, so it does not close under them.
  if (document.activeElement?.tagName === 'SELECT' || document.activeElement?.tagName === 'INPUT') return;
  const before = world.log.length;
  for (let i = 0; i < ui.speed; i++) advanceDay(world);
  if (world.day % 30 < ui.speed) slots.write('auto', world, `${SECT_BY_ID[me()].name} ${dateText(world)}`);
  if (world.log.length !== before && world.log.at(-1).sect === me()) ui.message = world.log.at(-1).text;
  render();
}, 1000);

render();
