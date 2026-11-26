import { createBrowserGame } from '@egret/engine/web/game';
import { createView } from './view.mjs';
import { CAMPAIGN_CHAPTERS, CHAPTER, ITEMS, MAPS, SIDE_QUESTS } from './sim/data.mjs';
import { PROFESSIONS } from './sim/arsenal.mjs';
import { sideQuestUnlocked } from './sim/progression.mjs';
import { createSession, dispatch, nextRecovery, update } from './sim/world.mjs';
import { tideEscapeGuide } from './sim/tide-guide.mjs';
import { isMuted, readSlot, setMuted, writeSlot } from './saves.mjs';
import { createSound } from './audio.mjs';
import { campaignObjective, createProfessionPicker, createRpgPanels, destinations, gearUrl } from './rpg-ui.mjs';
import { createInventoryPanel } from './inventory-ui.mjs';
import { createCommercePanels } from './commerce-ui.mjs';
import { createNativeRpgUi } from './native-rpg-ui.mjs';

const $ = id => document.getElementById(id);
const canvas = $('stage'), field = $('field'), joystick = $('joystick');
const storage = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value)
};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sound = createSound(storage);
const keys = new Set();
const history = [];
const autoSaveEvents = new Set(['portal','quest','chapter','campaign','sideQuest','pickup','equip','unequip','buy','sell','forge','gather','reward','kill','death']);
const prizedTiers = ['rare','epic','legendary'];
const roleEmblems = {guard:'盾',ritualist:'符',ranger:'翎'};
const controlKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
function sizeFor() {
  const aspect = field.clientWidth / Math.max(1, field.clientHeight);
  const height = aspect < 1 ? 870 : 540;
  const width = Math.round(height * Math.max(.42, Math.min(2.8, aspect)));
  return { width, height };
}
const range = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const isGatherable = target => target.kind === 'herb' || Boolean(target.questId);
const targetName = target => target.name ?? ITEMS[target.itemId]?.name ?? '目标';
const panelIds = {
  title:'title', pause:'pause-panel', dead:'death-panel', won:'victory-panel',
  dialogue:'dialogue-panel', journal:'journal-panel'
};
const nativePhases = new Set(['inventory', 'shop', 'forge']);

let game, view, size = sizeFor(), stageCanvas = canvas, state = createSession(), phase = 'title';
let ready = false, slot = 1, muted = isMuted(storage);
let pauseOnBlur = false, saveAge = 0, hudAge = 0, noticeFor = 0, savedAt = 0;
let activePointer = null, stickX = 0, stickY = 0, holdingAttack = false, pendingAction = null;
let contextPerson, contextDrop, route, tideGuide, orientationTimer, rebuilding = false;
let questFocus = 'main';
const nativeRpg = createNativeRpgUi({
  host: $('native-rpg'),
  build: (kind, layout) => kind === 'inventory' ? bag.build(layout) : commerce.build(kind, layout),
  backend: () => game.backend,
  onAction: () => { sound.unlock(); sound.play('ui'); },
  onFailure(error) {
    console.error('RPG interface', error);
    if (!nativePhases.has(phase)) return;
    closeNativePhase();
    notify('界面加载失败，请重试。', 3);
  }
});
const bag = createInventoryPanel({ current: () => state, command: panelCommand, repaint: repaintNative, close: closeNativePhase });
const commerce = createCommercePanels({ current: () => state, command: panelCommand, repaint: repaintNative });

function repaintNative(options) {
  if (nativePhases.has(phase)) nativeRpg.refresh(phase, options);
}
function closeNativePhase() {
  if (phase === 'inventory') showPhase('play');
  else if (phase === 'shop') panelCommand({type:'closeShop'});
  else if (phase === 'forge') panelCommand({type:'closeForge'});
}
const rpg = createRpgPanels({
  command: panelCommand, current: () => state, tracked: () => questFocus,
  track(id) { questFocus = id; showPhase('play'); }
});
const professions = createProfessionPicker(profession => startGame(null, profession));

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
  $('hud').hidden = phase === 'title' || phase === 'dialogue';
  $('hud').inert = phase !== 'play';
  if (phase === 'play') renderHud();
  if (phase === 'title') refreshTitle();
  nativeRpg.refresh(nativePhases.has(phase) ? phase : null);
  if (phase === 'pause') saveStatus();
  if (phase === 'dialogue') rpg.renderDialogue();
  if (phase === 'journal') rpg.renderJournal();
  const focus = {
    title:'new-game', play:'stage', pause:'resume', dead:'retry', won:'victory-continue',
    dialogue:'dialogue-next', journal:'journal-close'
  }[phase];
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
    description = [MAPS[save.mapId]?.name, (PROFESSIONS[save.profession] ?? PROFESSIONS.guard).name,
      'Lv.' + (save.hero?.level ?? 1)].filter(Boolean).join(' · ');
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

function startGame(record = null, profession = 'guard') {
  if (!ready) return;
  const seed = record ? undefined : crypto.getRandomValues(new Uint32Array(1))[0];
  state = createSession(record?.snapshot ?? null, {profession,seed});
  const role = PROFESSIONS[state.profession ?? 'guard'];
  $('hud').dataset.profession = role.id;
  setText('profession-name', role.name);
  $('class-skill').title = role.active.description;
  $('rage').title = role.rage.name + ' · ' + role.rage.description + ' 攻击与受击时积怒。';
  setText('class-mark',roleEmblems[role.id]);
  setText('class-skill-name',role.active.name);
  savedAt = record?.savedAt ?? 0;
  pendingAction = null;
  bag.reset();
  questFocus = 'main';
  history.length = 0;
  noticeFor = 0;
  $('notice').hidden = true;
  $('new-confirm').hidden = true;
  showPhase(state.phase === 'dead' ? 'dead' : 'play');
  syncMusic();
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
  const mission = campaignObjective(state), stage = mission.progress?.stage ?? 'locked';
  const elder = map.npcs.find(npc => npc.id === 'elder');
  const nearest = targets => targets.sort((a,b) => range(a,state.hero) - range(b,state.hero))[0];
  const exitTo = id => (map.portals ?? [map.portal]).find(portal => portal?.to === id);
  const side = state.sideQuests?.[questFocus];
  if (side && side.stage !== 'complete' && sideQuestUnlocked(state,questFocus)) {
    const sideMap = {herbs:'trail',parts:'trail',ferry:'ford',beacons:'siege'}[questFocus];
    if (map.id === 'city') {
      if (['available','ready'].includes(side.stage)) {
        return map.npcs.find(npc => npc.id === SIDE_QUESTS[questFocus].npcId);
      }
      if (stage === 'unaccepted') return elder;
      return exitTo(sideMap) ?? elder;
    }
    if (side.stage === 'ready' || map.id !== sideMap) return map.portal;
    const targets = questFocus === 'parts' ?
      [...state.drops.filter(drop => drop.itemId === 'scrap-iron'),...state.enemies.filter(enemy => !enemy.dead)] :
      (state.gatherables ?? []).filter(point => !point.collected &&
        (point.questId === questFocus || (questFocus === 'herbs' && point.kind === 'herb')));
    return nearest(targets) ?? map.portal;
  }
  if (map.id === 'city') {
    if ([mission.huntStage,'boss'].includes(stage)) return exitTo(mission.mapId) ?? elder;
    if (stage === 'complete') return map.npcs.find(npc => npc.id === 'scout');
    return elder;
  }
  if (stage === 'return' || (map.id !== mission.mapId && map.id !== 'trial')) return map.portal;
  const alive = state.enemies.filter(enemy => !enemy.dead);
  return (stage === 'boss' ? alive.find(enemy => enemy.boss) : nearest(alive)) ?? map.portal;
}

function renderHud() {
  const hero = state.hero, map = MAPS[state.mapId];
  const role = PROFESSIONS[state.profession ?? 'guard'];
  const weapon = state.inventory.find(item => item.uid === state.equipment.weapon)?.itemId ?? role.starterWeapon;
  const icon = $('weapon-icon'), iconUrl = gearUrl(weapon);
  if (icon.src !== iconUrl) icon.src = iconUrl;
  $('hp-fill').style.transform = 'scaleX(' + hero.hp / hero.maxHp + ')';
  $('xp-fill').style.transform = 'scaleX(' + hero.xp / hero.needXp + ')';
  setText('hp-text', Math.ceil(hero.hp) + ' / ' + hero.maxHp);
  setText('level', 'Lv.' + hero.level);
  setText('wallet', hero.gold + ' 文');
  setText('map-name', map.name);
  const {data,progress,huntStage} = campaignObjective(state);
  const stage = progress?.stage ?? 'locked';
  const count = stage === huntStage ? ' · ' + Math.min(progress.kills,data.requiredKills) + ' / ' + data.requiredKills : '';
  const side = state.sideQuests?.[questFocus];
  if (side && (side.stage === 'complete' || !sideQuestUnlocked(state,questFocus))) questFocus = 'main';
  const sideInfo = SIDE_QUESTS[questFocus];
  setText('quest-title', sideInfo ? sideInfo.name + ' · ' + Math.min(side?.amount ?? 0, sideInfo.required) + ' / ' + sideInfo.required : data.name + count);
  setText('quest-text', side?.stage === 'ready' ? '回西岐交付任务并选择报酬。' : sideInfo ? sideInfo.description :
    state.mapId === 'trial' ? '击败演武镇将取得战利品。清场后可由归营阵返回。' : data.descriptions[stage]);
  route = questDestination(map);
  $('track').hidden = !route;
  if (route) setText('track', '寻路 · ' + targetName(route));
  const boss = state.enemies.find(enemy => enemy.boss && !enemy.dead);
  const bossNearby = Boolean(boss && range(boss, hero) < 520);
  $('boss-hud').hidden = !bossNearby;
  $('hud').classList.toggle('late-boss-focus', bossNearby && Boolean(CAMPAIGN_CHAPTERS[state.mapId]));
  tideGuide = null;
  if (boss) {
    setText('boss-name',boss.name);
    $('boss-fill').style.transform = 'scaleX(' + boss.hp / boss.maxHp + ')';
    const warning = boss.telegraph?.skillId ? boss.telegraph : null;
    $('boss-warning').hidden = !warning;
    if (bossNearby && size.width < size.height && field.clientWidth <= 620) {
      tideGuide = tideEscapeGuide(state.mapId, hero, warning);
    }
    if (warning) {
      let hint = warning.hint;
      if (tideGuide?.kind === 'outer') hint = '沿箭头向' + tideGuide.direction + '退到外缘，也可进青色内圈。';
      if (tideGuide?.kind === 'inner') hint = '外撤路线太远，沿箭头进青色内圈。';
      if (tideGuide?.kind === 'safe') hint = '站位安全，留在红区外。';
      setText('boss-warning', warning.name + ' · ' + hint);
    }
  }
  const people = [...map.npcs,...(map.portals ?? [map.portal])].filter(person => range(person, hero) <= 135);
  contextPerson = people.sort((a, b) => range(a, hero) - range(b, hero))[0];
  contextDrop = [...state.drops,...(state.gatherables ?? []).filter(node => !node.collected)].filter(drop => range(drop, hero) <= (isGatherable(drop) ? 76 : 95))
    .sort((a, b) => range(a, hero) - range(b, hero))[0];
  $('interact').hidden = !contextPerson;
  $('pickup').hidden = !contextDrop;
  if (contextPerson) {
    const label = contextPerson.to ? contextPerson.name : '与' + contextPerson.name + '交谈';
    setText('interact', label);
  }
  if (contextDrop) {
    const verb = {herb:'采集',rescue:'解救',beacon:'拆除'}[contextDrop.kind] ?? '拾取';
    setText('pickup', verb + ' · ' + targetName(contextDrop));
  }
  const recovery = nextRecovery(hero);
  const recoveryKey = recovery?.key ?? (hero.potions || !hero.tonics ? 'potions' : 'tonics');
  setText('potion-name', recoveryKey === 'tonics' ? '回春丹' : '回春散');
  setText('potion-count', '×' + (hero[recoveryKey] ?? 0));
  $('potion').disabled = !recovery;
  const supply = '回春散 ' + hero.potions + ' 份 · 回春丹 ' + (hero.tonics ?? 0) + ' 枚';
  if ($('potion').title !== supply) $('potion').title = supply;
  const activeSkill = state.inventory.find(item => item.uid === state.equipment.skill)?.itemId;
  $('artifact').disabled = !activeSkill || state.artifact.cooldown > .001;
  setText('skill-name', activeSkill ? ITEMS[activeSkill].name : '法宝');
  const skillIcon = gearUrl(activeSkill ?? 'qiankun-ring');
  if ($('skill-icon').src !== skillIcon) $('skill-icon').src = skillIcon;
  setText('artifact-clock', activeSkill && state.artifact.cooldown > .001 ? Math.ceil(state.artifact.cooldown) + 's' : '');
  $('class-skill').disabled = (hero.classCooldown ?? 0) > .001;
  setText('class-skill-clock',hero.classCooldown > .001 ? Math.ceil(hero.classCooldown) + 's' : '');
  const anger = Math.floor(hero.anger ?? 0);
  $('rage').disabled = anger < 100;
  $('rage').classList.toggle('ready',anger >= 100);
  setText('anger-count',anger >= 100 ? '满' : anger + '%');
}

function syncMusic() {
  const hasBoss = state.enemies.some(enemy => enemy.boss && !enemy.dead);
  sound.setScene(state.mapId === 'city' ? 'city' : state.quest.stage === 'boss' || hasBoss ? 'boss' : 'trail');
}

function eventSound(event) {
  let cue = event.type;
  if (cue === 'hit') {
    if (event.cause === 'artifact') return;
    if (event.id === 'hero') cue = 'hero-hurt';
  } else if (cue === 'telegraph' && (event.skillId || event.id === 'boss')) cue = 'telegraphBoss';
  else if (cue === 'bossPhase') cue = 'telegraphBoss';
  else if (cue === 'hazardAttack') cue = 'enemyAttack';
  else if (cue === 'interrupt') cue = 'equip';
  else if (cue === 'loot' && prizedTiers.includes(ITEMS[event.itemId]?.tier)) cue = 'rareLoot';
  else if (cue === 'rage') cue = 'artifactHit';
  else if (cue === 'rageTelegraph' || cue === 'skillCast' || cue === 'classSkill') cue = 'artifactCast';
  else if (cue === 'skillPulse' || cue === 'classPulse') cue = 'artifactReturn';
  else if (cue === 'gather') cue = 'pickup';
  else if (cue === 'buy' || cue === 'sell') cue = 'pickup';
  else if (cue === 'chapter' || cue === 'campaign' || cue === 'sideQuest' || cue === 'forge') cue = 'quest';
  const pan = Number.isFinite(event.x) ? (event.x - state.hero.x) / 420 : 0;
  sound.play(cue, pan);
}

function consumeEvents(events) {
  let autosave = false;
  for (const event of events) {
    history.push({ ...event, mapId: state.mapId, time: state.time });
    eventSound(event);
    autosave ||= autoSaveEvents.has(event.type);
    switch (event.type) {
      case 'talk': notify(event.text, 5.5); break;
      case 'loot': if (prizedTiers.includes(ITEMS[event.itemId]?.tier)) notify('掉落 · ' + ITEMS[event.itemId].name); break;
      case 'pickup': if (ITEMS[event.itemId].slot) notify('已拾取 · ' + event.name + '，可在行囊中装备'); break;
      case 'equip': notify('已装备 · ' + event.name); break;
      case 'level': notify((PROFESSIONS[state.profession] ?? PROFESSIONS.guard).name + '晋升至 ' + event.level + ' 级'); break;
      case 'portal': notify('进入 · ' + MAPS[state.mapId].name); break;
      case 'gather': notify('已完成 · ' + (event.name ?? ITEMS[event.itemId]?.name ?? '调查目标')); break;
      case 'bossSpawn': notify('敌军主将已现身'); break;
      case 'bossPhase': notify('首领进入第二阶段，招式间隔缩短'); break;
      case 'interrupt': notify('已打断首领蓄力', 1.8); break;
      case 'death': showPhase('dead'); break;
      case 'victory':
        setText('victory-chapter',CAMPAIGN_CHAPTERS[state.mapId]?.name ??
          (state.mapId === 'pass' ? CHAPTER.name : state.mapId === 'trial' ? '演武旧营' : MAPS.trail.name));
        setText('victory-title',state.mapId === 'trial' ? '演武告捷' : '敌将已伏');
        setText('victory-text',state.mapId === 'trial' ? '没有退兵的急令，先收拢战利品，再返回西岐。' : '收好战利品，经归营阵回城，向姜尚复命。');
        showPhase('won'); break;
    }
  }
  if (events.some(event => ['portal','quest','chapter','campaign','bossSpawn','victory'].includes(event.type))) syncMusic();
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
  if (phase === 'play' && contextDrop) dispatch(state, { type: isGatherable(contextDrop) ? 'gather' : 'pickup', id: contextDrop.id });
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
  return [...destinations(state),...state.enemies,...state.drops].find(item => item.id === id && !item.dead);
}

function syncPanels() {
  if (!['play','dialogue','shop','forge'].includes(phase)) return;
  const next = state.forge ? 'forge' : state.shop ? 'shop' : state.dialogue ? 'dialogue' : 'play';
  if (next !== phase) {
    pendingAction = null;
    if (next === 'shop') commerce.resetShop();
    if (next === 'forge') commerce.resetForge();
    showPhase(next);
  } else if (next === 'dialogue') rpg.renderDialogue();
  else repaintNative();
}

function panelCommand(action) {
  if (!['shop','dialogue','forge','inventory'].includes(phase)) return;
  const changed = dispatch(state,action);
  const events = update(state,0);
  consumeEvents(events);
  if (changed) saveGame();
  syncPanels();
  if (phase === 'inventory') bag.notify(events);
  else if (phase === 'shop' || phase === 'forge') commerce.notify(events);
  repaintNative();
}

function fieldPress(event) {
  if (phase !== 'play' || event.button !== 0 || !view) return;
  event.preventDefault();
  stageCanvas.focus({ preventScroll: true });
  const bounds = stageCanvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * size.width / bounds.width;
  const y = (event.clientY - bounds.top) * size.height / bounds.height;
  const point = view.worldAt(x, y);
  const candidates = [
    ...state.enemies.filter(enemy => !enemy.dead).map(enemy => ({ target: enemy, type: 'target', distance: 34 })),
    ...state.drops.map(drop => ({ target: drop, type: 'pickup', distance: 20 })),
    ...destinations(state).map(target => ({target, type: isGatherable(target) ? 'gather' : 'interact', distance: isGatherable(target) ? 25 : 39 }))
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
    const reach = selected.type === 'interact' ? 135 : selected.type === 'gather' ? 76 : 95;
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
    if (state.dialogue || state.shop || state.forge) syncPanels();
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
  if (phase !== 'title') view.update(state, animate ? dt : 0, events, phase === 'play' ? tideGuide : null);
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
$('class-skill').addEventListener('click', () => combat('classSkill'));
$('rage').addEventListener('click', () => combat('rage'));
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
  else {
    const type = isGatherable(route) ? 'gather' : route.itemId ? 'pickup' : 'interact';
    const reach = type === 'gather' ? 76 : type === 'pickup' ? 95 : 130;
    if (range(route,state.hero) > reach) dispatch(state,{type:'moveTo',x:route.x,y:route.y});
    else dispatch(state,{type,id:route.id});
  }
});
$('pickup').addEventListener('click', pickUp);
$('inventory').addEventListener('click', () => showPhase('inventory'));
$('journal').addEventListener('click', () => showPhase('journal'));
$('journal-close').addEventListener('click', () => showPhase('play'));
$('pause').addEventListener('click', () => showPhase('pause'));
$('resume').addEventListener('click', () => showPhase('play'));
$('save').addEventListener('click', () => saveGame(true));
$('return-title').addEventListener('click', () => { saveGame(); showPhase('title'); sound.setScene('city'); });
$('victory-continue').addEventListener('click', () => showPhase('play'));
$('retry').addEventListener('click', () => {
  dispatch(state, { type: 'retry' });
  pendingAction = null;
  showPhase('play');
  saveGame();
  renderHud();
});
$('slot').addEventListener('change', event => { slot = Number(event.target.value); refreshTitle(); });
$('new-game').addEventListener('click', () => {
  const record = readSlot(storage, slot);
  if (record.status === 'ok') {
    $('new-confirm').hidden = false;
    $('title').inert = true;
    $('new-cancel').focus();
  } else professions.open();
});
$('new-cancel').addEventListener('click', () => {
  $('new-confirm').hidden = true;
  $('title').inert = false;
  $('new-game').focus();
});
$('new-overwrite').addEventListener('click', () => {
  $('new-confirm').hidden = true;
  professions.open();
});
$('continue-game').addEventListener('click', () => {
  const record = readSlot(storage, slot);
  if (record.status === 'ok') startGame(record);
});
$('audio').addEventListener('click', () => {
  muted = !muted;
  sound.setMute(muted);
  setMuted(storage, muted);
  if (!muted) sound.unlock();
  $('audio').setAttribute('aria-pressed', String(!muted));
  setText('audio', muted ? '声音关闭' : '声音开启');
});
setText('audio', muted ? '声音关闭' : '声音开启');
$('audio').setAttribute('aria-pressed', String(!muted));
for (const [channel, level] of Object.entries(sound.inspect().levels)) {
  const slider = $(channel + '-volume');
  slider.value = String(Math.round(level * 100));
  slider.addEventListener('input', () => sound.setLevel(channel, Number(slider.value) / 100));
}
$('game-shell').addEventListener('pointerdown', () => sound.unlock(), { capture: true, passive: true });
$('game-shell').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (event.detail === 0) sound.unlock();
  if (button.closest('.card, .utility, .title-actions')) sound.play('ui');
}, { capture: true });

document.addEventListener('keydown', event => {
  if (event.altKey || event.metaKey || event.ctrlKey) return;
  const code = event.code;
  if (code === 'Escape') {
    if (nativePhases.has(phase)) {
      event.preventDefault();
      event.stopPropagation();
      closeNativePhase();
      return;
    }
    if (phase === 'title' && !$('new-confirm').hidden) $('new-cancel').click();
    else if (phase === 'title' && !$('profession-panel').hidden) professions.close();
    else if (phase === 'dialogue') panelCommand({type:'closeDialogue'});
    else if (phase === 'play') showPhase('pause');
    else if (phase === 'pause' || phase === 'journal') showPhase('play');
    return;
  }
  if (phase === 'inventory' && nativeRpg.focusName()?.startsWith('bag-tab-') && bag.stepTab(code)) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  if (event.target.tagName === 'SELECT') return;
  if (phase === 'dialogue' && code === 'Enter' && !event.repeat && !$('dialogue-next').hidden) {
    event.preventDefault(); rpg.nextLine(); return;
  }
  if (code === 'KeyJ' && !event.repeat && (phase === 'play' || phase === 'journal')) {
    showPhase(phase === 'play' ? 'journal' : 'play'); return;
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
    const action = { KeyQ: () => combat('artifact'), KeyX: () => combat('classSkill'), KeyR: () => combat('rage'), KeyE: interact, KeyF: pickUp, Digit1: () => combat('potion') }[code];
    action?.();
  }
}, { capture: true });
document.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { pauseOnBlur = true; clearInput(); });
window.addEventListener('focus', () => { pauseOnBlur = false; });
document.addEventListener('visibilitychange', () => {
  sound.setVisible(!document.hidden);
  if (document.hidden) { clearInput(); saveGame(); }
});
window.addEventListener('pagehide', () => saveGame());

const diagnostics = Object.freeze({
  inspect: () => ({
    ready, phase, backend: game?.backend, state: structuredClone(state), slot,
    hud: { history: structuredClone(history), savedAt, tideGuide: structuredClone(tideGuide),
      notice: $('notice').hidden ? '' : $('notice').textContent },
    audio: sound.inspect()
  }),
  ui: () => nativeRpg.snapshot(),
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
