import { createBrowserGame } from '@egret/engine/web/game';
import { createView } from './view.mjs';
import { ITEMS, MAPS, QUEST } from './sim/data.mjs';
import { createSession, dispatch, update } from './sim/world.mjs';
import { isMuted, readSlot, setMuted, writeSlot } from './saves.mjs';
import { createSound } from './audio.mjs';

const $ = id => document.getElementById(id);
const canvas = $('stage'), field = $('field'), joystick = $('joystick');
const storage = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value)
};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sound = createSound();
const keys = new Set();
const history = [];
const autoSaveEvents = new Set(['portal', 'quest', 'pickup', 'equip', 'kill', 'death']);
const controlKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
function sizeFor() {
  const aspect = field.clientWidth / Math.max(1, field.clientHeight);
  const height = aspect < 1 ? 870 : 540;
  const width = Math.round(height * Math.max(.42, Math.min(2.8, aspect)));
  return { width, height };
}
const range = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const panelIds = { title: 'title', inventory: 'inventory-panel', pause: 'pause-panel', dead: 'death-panel', won: 'victory-panel' };
const gearUrl = itemId => new URL('../assets/gear/' + itemId + '.webp', import.meta.url).href;

let game, view, size = sizeFor(), stageCanvas = canvas, state = createSession(), phase = 'title';
let ready = false, slot = 1, muted = isMuted(storage);
let pauseOnBlur = false, saveAge = 0, hudAge = 0, noticeFor = 0, savedAt = 0;
let activePointer = null, stickX = 0, stickY = 0, holdingAttack = false, pendingAction = null;
let contextPerson, contextDrop, route, orientationTimer, rebuilding = false;

sound.setMute(muted);

function setText(id, text) {
  const element = $(id);
  if (element.textContent !== String(text)) element.textContent = text;
}

function clearInput() {
  keys.clear();
  if (activePointer !== null && joystick.hasPointerCapture(activePointer)) joystick.releasePointerCapture(activePointer);
  activePointer = null;
  joystick.firstElementChild.style.transform = '';
  stickX = stickY = 0;
  holdingAttack = false;
}

function showPhase(nextPhase) {
  phase = nextPhase;
  clearInput();
  for (const [name, id] of Object.entries(panelIds)) $(id).hidden = name !== phase;
  $('hud').hidden = phase === 'title';
  $('hud').inert = phase !== 'play';
  if (phase === 'title') refreshTitle();
  if (phase === 'inventory') renderInventory();
  if (phase === 'pause') saveStatus();
  const focus = { title: 'new-game', play: 'stage', inventory: 'close-inventory', pause: 'resume', dead: 'retry', won: 'victory-continue' }[phase];
  $(focus)?.focus({ preventScroll: true });
}

function refreshTitle() {
  const record = readSlot(storage, slot);
  $('continue-game').hidden = record.status !== 'ok';
  $('new-game').disabled = !ready;
  setText('new-game', record.status === 'ok' ? '另起战纪' : '初入西岐');
  let description = '';
  if (record.status === 'ok') {
    const save = record.snapshot;
    description = [MAPS[save.mapId]?.name, save.quest?.stage === 'complete' ? '古道已平定' : ('玄甲 · ' + (save.hero?.level ?? 1) + ' 级')].filter(Boolean).join(' · ');
  }
  if (record.status === 'invalid') description = '此存档无法读取，可另选存档位或重新开始。';
  if (record.status === 'unavailable') description = '浏览器禁止使用本地存档，本次游玩仍可继续。';
  setText('title-status', ready ? description : '正在准备西岐城…');
}

function saveStatus(message = null) {
  const time = savedAt ? new Date(savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
  setText('save-status', message ?? (time ? '已保存 · ' + time : '进度保存在本浏览器 · 存档 ' + slot));
}

function saveGame(explicit = false) {
  if (phase === 'title') return false;
  const now = Date.now();
  if (writeSlot(storage, slot, state, now)) {
    savedAt = now;
    saveAge = 0;
    if (explicit) saveStatus('已保存 · 存档 ' + slot);
    return true;
  }
  saveAge = 0;
  saveStatus('浏览器未能保存进度，请检查存储权限。');
  if (phase === 'play') notify('浏览器未能保存进度', 2.4);
  return false;
}

function startGame(record = null) {
  if (!ready) return;
  state = createSession(record?.snapshot);
  savedAt = record?.savedAt ?? 0;
  pendingAction = null;
  history.length = 0;
  noticeFor = 0;
  $('notice').hidden = true;
  $('new-confirm').hidden = true;
  showPhase(state.phase === 'dead' ? 'dead' : 'play');
  view.update(state, 0, []);
  if (!record) {
    saveGame();
    notify('前往城中与姜尚交谈', 3);
  }
  renderHud();
}

function notify(text, seconds = 3.1) {
  if (!text) return;
  setText('notice', text);
  $('notice').hidden = false;
  noticeFor = seconds;
}

function questDestination(map) {
  const stage = state.quest.stage;
  if (stage === 'complete') return null;
  if (map.id === 'city') return stage === 'unaccepted' || stage === 'return' ? map.npcs[0] : map.portal;
  if (stage === 'return') return map.portal;
  if (stage === 'boss') return state.enemies.find(enemy => enemy.boss && !enemy.dead);
  return state.enemies.filter(enemy => !enemy.dead).sort((a, b) => range(a, state.hero) - range(b, state.hero))[0];
}

function renderHud() {
  const hero = state.hero, map = MAPS[state.mapId];
  const weapon = state.inventory.find(item => item.uid === state.equipment.weapon)?.itemId ?? 'bronze-sword';
  const icon = $('weapon-icon'), iconUrl = gearUrl(weapon);
  if (icon.src !== iconUrl) icon.src = iconUrl;
  $('hp-fill').style.transform = 'scaleX(' + hero.hp / hero.maxHp + ')';
  $('xp-fill').style.transform = 'scaleX(' + hero.xp / hero.needXp + ')';
  setText('hp-text', Math.ceil(hero.hp) + ' / ' + hero.maxHp);
  setText('level', 'Lv.' + hero.level);
  setText('wallet', hero.gold + ' 文');
  setText('map-name', map.name);
  setText('quest-title', QUEST.name + (state.quest.stage === 'hunt' ? ' · ' + state.quest.kills + ' / ' + QUEST.requiredKills : ''));
  setText('quest-text', QUEST.descriptions[state.quest.stage]);
  route = questDestination(map);
  $('track').hidden = !route;
  if (route) setText('track', '寻路 · ' + (route === map.portal ? (map.id === 'city' ? '古道出口' : '归营阵') : route.name));
  const boss = state.enemies.find(enemy => enemy.boss && !enemy.dead);
  $('boss-hud').hidden = !boss || range(boss, hero) >= 520;
  if (boss) $('boss-fill').style.transform = 'scaleX(' + boss.hp / boss.maxHp + ')';
  const people = [...map.npcs, map.portal].filter(person => range(person, hero) <= 135);
  contextPerson = people.sort((a, b) => range(a, hero) - range(b, hero))[0];
  contextDrop = state.drops.filter(drop => range(drop, hero) <= 95).sort((a, b) => range(a, hero) - range(b, hero))[0];
  $('interact').hidden = !contextPerson;
  $('pickup').hidden = !contextDrop;
  if (contextPerson) {
    const label = contextPerson.id === 'portal' ? contextPerson.name : contextPerson.id === 'smith' ? '购回春散 · 12 文' : '与姜尚交谈';
    setText('interact', label);
  }
  if (contextDrop) setText('pickup', '拾取 · ' + ITEMS[contextDrop.itemId].name);
  setText('potion-count', '×' + hero.potions);
  $('potion').disabled = !hero.potions || hero.hp >= hero.maxHp;
  $('artifact').disabled = !state.flags.artifactOwned || state.artifact.cooldown > .001;
  setText('artifact-clock', state.flags.artifactOwned && state.artifact.cooldown > .001 ? Math.ceil(state.artifact.cooldown) + 's' : '');
}

function renderInventory() {
  setText('equipment-stats', '攻击 ' + state.hero.attack + '　防御 ' + state.hero.defense + '　' + state.inventory.length + ' / 30');
  const rows = state.inventory.map(instance => {
    const item = ITEMS[instance.itemId];
    const equipped = state.equipment[item.slot] === instance.uid;
    const current = state.inventory.find(entry => entry.uid === state.equipment[item.slot]);
    const currentItem = ITEMS[current?.itemId];
    const row = document.createElement('li'), art = document.createElement('img'), summary = document.createElement('div');
    const name = document.createElement('b'), details = document.createElement('small'), button = document.createElement('button');
    row.dataset.tier = item.tier;
    art.className = 'gear-mark';
    art.alt = '';
    art.src = gearUrl(item.id);
    name.textContent = item.name;
    const attribute = value => value ? (value > 0 ? '+' : '') + value : '±0';
    const comparison = equipped ? '' : '　·　变化 ' + attribute((item.attack ?? 0) - (currentItem?.attack ?? 0)) + ' 攻 / ' + attribute((item.defense ?? 0) - (currentItem?.defense ?? 0)) + ' 防';
    details.textContent = '攻 ' + (item.attack ?? 0) + '　防 ' + (item.defense ?? 0) + comparison;
    button.type = 'button';
    button.className = 'equip';
    button.dataset.uid = instance.uid;
    button.disabled = equipped;
    button.textContent = equipped ? '已装备' : '装备';
    button.setAttribute('aria-label', item.name + (equipped ? '已装备' : '装备'));
    summary.append(name, details);
    row.append(art, summary, button);
    return row;
  });
  $('equipment-list').replaceChildren(...rows);
}

function consumeEvents(events) {
  let autosave = false;
  for (const event of events) {
    history.push({ ...event, mapId: state.mapId, time: state.time });
    sound.play(event.type);
    autosave ||= autoSaveEvents.has(event.type);
    switch (event.type) {
      case 'talk': notify(event.text, 5.5); break;
      case 'loot': if (event.itemId === 'iron-sword' || event.itemId === 'jade-seal') notify('掉落 · ' + event.name); break;
      case 'pickup': if (ITEMS[event.itemId].slot) notify('已拾取 · ' + event.name + '，可在行囊中装备'); break;
      case 'equip': notify('已装备 · ' + event.name); break;
      case 'level': notify('玄甲晋升至 ' + event.level + ' 级'); break;
      case 'portal': notify('进入 · ' + MAPS[state.mapId].name); break;
      case 'bossSpawn': notify('邪将已现身，循古道深入'); break;
      case 'death': showPhase('dead'); break;
      case 'victory': showPhase('won'); break;
    }
  }
  if (history.length > 180) history.splice(0, history.length - 180);
  if (autosave) saveGame();
}

function interact() {
  if (phase !== 'play') return;
  const person = contextPerson;
  if (person) dispatch(state, { type: 'interact', id: person.id });
  else notify('走近人物或归营阵，再互动', 1.8);
}

function pickUp() {
  if (phase === 'play' && contextDrop) dispatch(state, { type: 'pickup', id: contextDrop.id });
}

function combat(type) {
  if (phase === 'play') dispatch(state, { type });
}

function worldPoint(x, y) {
  if (!view) return null;
  const { left, top, width, height } = stageCanvas.getBoundingClientRect();
  const point = view.screenAt(x, y);
  return { x: left + point.x * width / size.width, y: top + point.y * height / size.height };
}

function entity(id) {
  const map = MAPS[state.mapId];
  return [...map.npcs, map.portal, ...state.enemies, ...state.drops].find(item => item.id === id && !item.dead);
}

function fieldPress(event) {
  if (phase !== 'play' || event.button !== 0 || !view) return;
  event.preventDefault();
  stageCanvas.focus({ preventScroll: true });
  const bounds = stageCanvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * size.width / bounds.width;
  const y = (event.clientY - bounds.top) * size.height / bounds.height;
  const point = view.worldAt(x, y);
  const map = MAPS[state.mapId];
  const candidates = [
    ...state.enemies.filter(enemy => !enemy.dead).map(enemy => ({ target: enemy, type: 'target', distance: 34 })),
    ...state.drops.map(drop => ({ target: drop, type: 'pickup', distance: 20 })),
    ...map.npcs.map(npc => ({ target: npc, type: 'interact', distance: 35 })),
    { target: map.portal, type: 'interact', distance: 39 }
  ].map(candidate => {
    const projected = view.screenAt(candidate.target.x, candidate.target.y);
    const feet = range({ x, y }, projected);
    const chest = candidate.distance >= 34 ? range({ x, y }, { ...projected, y: projected.y - 24 }) : feet;
    return { ...candidate, score: Math.min(feet, chest) / candidate.distance };
  }).filter(candidate => candidate.score <= 1).sort((a, b) => a.score - b.score);
  pendingAction = null;
  const selected = candidates[0];
  if (!selected) {
    dispatch(state, { type: 'moveTo', x: point.x, y: point.y });
  } else if (selected.type === 'target') {
    dispatch(state, { type: 'target', id: selected.target.id });
  } else {
    const reach = selected.type === 'interact' ? 135 : 95;
    if (range(state.hero, selected.target) <= reach) {
      dispatch(state, { type: selected.type, id: selected.target.id });
    } else {
      dispatch(state, { type: 'moveTo', x: selected.target.x, y: selected.target.y });
      pendingAction = { type: selected.type, id: selected.target.id, reach };
    }
  }
}

function frame(seconds) {
  if (!view || rebuilding) return;
  const dt = Math.min(seconds, .075);
  let events = [];
  if (phase === 'play' && !document.hidden && !pauseOnBlur) {
    const moveX = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')) + stickX;
    const moveY = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) + stickY;
    if (pendingAction && (Math.abs(moveX) + Math.abs(moveY) > .04)) pendingAction = null;
    if (pendingAction) {
      const target = entity(pendingAction.id);
      if (!target || range(state.hero, target) <= pendingAction.reach) {
        if (target) dispatch(state, pendingAction);
        pendingAction = null;
      }
    }
    events = update(state, dt, { moveX, moveY, attack: holdingAttack || keys.has('Space') });
    if (events.length) consumeEvents(events);
    saveAge += dt;
    if (saveAge >= 12) saveGame();
    hudAge += dt;
    if (events.length || hudAge >= .08) {
      renderHud();
      hudAge = 0;
    }
    if (noticeFor > 0) {
      noticeFor -= dt;
      if (noticeFor <= 0) $('notice').hidden = true;
    }
  }
  // Finish a falling pose behind the result panel while combat remains paused.
  const animate = !document.hidden && !pauseOnBlur && (phase === 'play' || phase === 'dead' || phase === 'won');
  if (phase !== 'title') view.update(state, animate ? dt : 0, events);
}

function drift(event) {
  if (activePointer !== event.pointerId) return;
  const bounds = joystick.getBoundingClientRect();
  const x = event.clientX - bounds.left - bounds.width / 2;
  const y = event.clientY - bounds.top - bounds.height / 2;
  const limit = bounds.width * .34, magnitude = Math.hypot(x, y);
  const divisor = Math.max(limit, magnitude);
  stickX = magnitude < 5 ? 0 : x / divisor;
  stickY = magnitude < 5 ? 0 : y / divisor;
  joystick.firstElementChild.style.transform = 'translate(' + (stickX * limit) + 'px,' + (stickY * limit) + 'px)';
}

function endStick(event) {
  if (activePointer !== event.pointerId) return;
  activePointer = null;
  stickX = stickY = 0;
  joystick.firstElementChild.style.transform = '';
}

joystick.addEventListener('pointerdown', event => {
  if (phase !== 'play' || activePointer !== null || event.button !== 0) return;
  event.preventDefault();
  activePointer = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  drift(event);
});
joystick.addEventListener('pointermove', drift);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) joystick.addEventListener(type, endStick);

$('attack').addEventListener('pointerdown', event => {
  if (phase !== 'play' || event.button !== 0) return;
  $('attack').setPointerCapture(event.pointerId);
  holdingAttack = true;
  combat('attack');
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('attack').addEventListener(type, () => { holdingAttack = false; });
$('attack').addEventListener('click', event => { if (event.detail === 0) combat('attack'); });
$('artifact').addEventListener('click', () => combat('artifact'));
$('potion').addEventListener('click', () => combat('potion'));
$('interact').addEventListener('click', interact);
$('quest-toggle').addEventListener('click', () => {
  const expanded = $('quest-toggle').getAttribute('aria-expanded') !== 'true';
  $('quest-toggle').setAttribute('aria-expanded', String(expanded));
  $('quest-text').classList.toggle('expanded', expanded);
  setText('quest-toggle', expanded ? '收起' : '详情');
});
$('track').addEventListener('click', () => {
  if (phase !== 'play' || !route) return;
  pendingAction = null;
  if (route.hp !== undefined) dispatch(state, { type: 'target', id: route.id });
  else if (range(route, state.hero) > 130) dispatch(state, { type: 'moveTo', x: route.x, y: route.y });
  else dispatch(state, { type: 'interact', id: route.id });
});
$('pickup').addEventListener('click', pickUp);
$('inventory').addEventListener('click', () => showPhase('inventory'));
$('close-inventory').addEventListener('click', () => showPhase('play'));
$('pause').addEventListener('click', () => showPhase('pause'));
$('resume').addEventListener('click', () => showPhase('play'));
$('save').addEventListener('click', () => saveGame(true));
$('return-title').addEventListener('click', () => { saveGame(); showPhase('title'); });
$('victory-continue').addEventListener('click', () => showPhase('play'));
$('retry').addEventListener('click', () => {
  dispatch(state, { type: 'retry' });
  pendingAction = null;
  showPhase('play');
  saveGame();
  renderHud();
});
$('equipment-list').addEventListener('click', event => {
  const button = event.target.closest('.equip');
  if (!button || !dispatch(state, { type: 'equip', uid: button.dataset.uid })) return;
  consumeEvents(update(state, 0));
  renderInventory();
  $('close-inventory').focus({ preventScroll: true });
});
$('slot').addEventListener('change', event => { slot = Number(event.target.value); refreshTitle(); });
$('new-game').addEventListener('click', () => {
  const record = readSlot(storage, slot);
  if (record.status === 'ok') {
    $('new-confirm').hidden = false;
    $('new-cancel').focus();
  } else startGame();
});
$('new-cancel').addEventListener('click', () => { $('new-confirm').hidden = true; $('new-game').focus(); });
$('new-overwrite').addEventListener('click', () => startGame());
$('continue-game').addEventListener('click', () => {
  const record = readSlot(storage, slot);
  if (record.status === 'ok') startGame(record);
});
$('audio').addEventListener('click', () => {
  muted = !muted;
  sound.setMute(muted);
  setMuted(storage, muted);
  if (!muted) sound.unlock();
  setText('audio', muted ? '音效关闭' : '音效开启');
});
setText('audio', muted ? '音效关闭' : '音效开启');
$('game-shell').addEventListener('pointerdown', () => sound.unlock(), { capture: true, passive: true });

document.addEventListener('keydown', event => {
  if (event.altKey || event.metaKey || event.ctrlKey || event.target.tagName === 'SELECT') return;
  const code = event.code;
  if (code === 'Escape') {
    if (phase === 'title' && !$('new-confirm').hidden) $('new-cancel').click();
    else if (phase === 'play') showPhase('pause');
    else if (phase === 'pause' || phase === 'inventory') showPhase('play');
    return;
  }
  if (code === 'KeyB' && !event.repeat && (phase === 'play' || phase === 'inventory')) {
    showPhase(phase === 'play' ? 'inventory' : 'play'); return;
  }
  if (phase !== 'play') return;
  if (controlKeys.has(code) || code === 'Space') {
    if (code === 'Space' && event.target instanceof HTMLButtonElement) return;
    event.preventDefault();
    keys.add(code);
    if (code === 'Space' && !event.repeat) combat('attack');
  } else if (!event.repeat) {
    const action = { KeyQ: () => combat('artifact'), KeyE: interact, KeyF: pickUp, Digit1: () => combat('potion') }[code];
    action?.();
  }
}, { capture: true });
document.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { pauseOnBlur = true; clearInput(); });
window.addEventListener('focus', () => { pauseOnBlur = false; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearInput(); saveGame(); }
});
window.addEventListener('pagehide', () => saveGame());

const diagnostics = Object.freeze({
  inspect: () => ({
    ready, phase, backend: game?.backend, state: structuredClone(state), slot,
    hud: { history: structuredClone(history), savedAt, notice: $('notice').hidden ? '' : $('notice').textContent }
  }),
  point: worldPoint,
  target: id => {
    const target = entity(id);
    return target ? worldPoint(target.x, target.y) : null;
  }
});
Object.defineProperty(window, 'egretGame', { value: diagnostics });

async function boot() {
  const backend = new URLSearchParams(location.search).get('backend') === 'webgpu' ? 'webgpu' : 'webgl2';
  const build = async kind => createBrowserGame({
    canvas: stageCanvas, ...size, backend: kind, fit: 'contain', fitTo: field,
    clearColor: 0x192524, blendSpace: 'srgb', autoStart: false, update: frame
  });
  try {
    game = await build(backend);
  } catch (error) {
    if (backend === 'webgl2') throw error;
    const replacement = stageCanvas.cloneNode();
    stageCanvas.replaceWith(replacement);
    stageCanvas = replacement;
    game = await build('webgl2');
  }
  stageCanvas.tabIndex = 0;
  stageCanvas.addEventListener('pointerdown', fieldPress);
  stageCanvas.addEventListener('contextmenu', event => event.preventDefault());
  view = await createView(game, game.scope, { ...size, reducedMotion });
  game.stage.addChild(view.root);
  view.update(state, 0, []);
  game.loop.start();
}

boot().then(() => {
  ready = true;
  refreshTitle();
}).catch(error => {
  console.error(error);
  setText('title-status', '无法启动画面。请在支持 WebGL2 的浏览器中刷新重试。');
});

window.addEventListener('resize', () => {
  clearTimeout(orientationTimer);
  orientationTimer = setTimeout(async () => {
    const desired = sizeFor();
    if (!ready || rebuilding || desired.height === size.height) return;
    rebuilding = true;
    clearInput();
    const replacement = stageCanvas.cloneNode();
    stageCanvas.replaceWith(replacement);
    stageCanvas = replacement;
    try {
      await game.dispose();
      view = null;
      size = desired;
      await boot();
    } catch (error) {
      console.error(error);
      saveGame();
      showPhase('title');
      ready = false;
      $('new-game').disabled = true;
      $('continue-game').hidden = true;
      setText('title-status', '画面重建失败，进度已尝试保存。请刷新页面。');
    } finally {
      rebuilding = false;
    }
  }, 170);
});
