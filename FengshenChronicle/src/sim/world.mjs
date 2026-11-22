import { CHAPTER, ENEMIES, EQUIPMENT_SLOTS, ITEMS, MAPS, QUEST } from './data.mjs';
import { addResource, afterKill, bagSize, enterRoom, grantItem, grantRing, makeEnemy, openDialogue,
  restoreRpg, rpgDefaults, rpgSnapshot, syncRoom, townAction } from './progression.mjs';
import {PROFESSIONS,canEquip,equipmentStats,professionStats,rareWeaponFor} from './arsenal.mjs';
import {claimCampaign} from './campaign.mjs';
import {forecastHits,lateBossForecast} from './campaign-ai.mjs';

const STEP = 1 / 60, HERO_RADIUS = 18, SPEED = 185, CELL = 40;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const copy = value => JSON.parse(JSON.stringify(value));
export const RECOVERY_ITEMS=Object.freeze([
  Object.freeze({itemId:'potion',key:'potions',name:'回春散',heal:45}),
  Object.freeze({itemId:'recovery-pill',key:'tonics',name:'回春丹',heal:65})
]);

function emit(state, type, detail = {}) {
  state.pendingEvents.push({ type, ...detail });
}
const enemy = makeEnemy;
function stats(state, restore = false) {
  const hero = state.hero;
  const role=PROFESSIONS[state.profession]??PROFESSIONS.guard,base=professionStats(role.id,hero.level);
  let {attack,defense,speed}=base,bonusHp=0;
  for (const slot of EQUIPMENT_SLOTS) {
    const uid = state.equipment[slot];
    const instance = state.inventory.find(item => item.uid === uid);
    const item = ITEMS[instance?.itemId];
    const values=equipmentStats(item,instance?.affixes);
    attack += values.attack;
    defense += values.defense;
    bonusHp += values.maxHp;
    speed += values.speed;
  }
  hero.attack = attack;
  hero.defense = defense;
  hero.maxHp = base.maxHp + bonusHp;
  hero.speed = speed;
  hero.classId=role.id;hero.reach=role.reach;hero.classSkillName=role.active.name;hero.classCooldownMax=role.active.cooldown;
  hero.rageName=role.rage.name;
  hero.hp = restore ? hero.maxHp : Math.min(hero.hp, hero.maxHp);
  hero.needXp = hero.level * 35;
}

export function createSession(snapshot = null,options={}) {
  const requested=typeof options==='string'?options:options.profession;
  const profession=snapshot?.version===1?(PROFESSIONS[snapshot.profession]?snapshot.profession:'guard'):(PROFESSIONS[requested]?requested:'guard');
  const role=PROFESSIONS[profession];
  const state = {
    profession,
    version: 1, mapId: 'city', phase: 'play', time: 0, seed: Number.isSafeInteger(options.seed)?options.seed>>>0:74123, nextId: 20, accumulator: 0,
    hero: { id: 'hero', name: '玄甲', ...MAPS.city.spawn, radius: HERO_RADIUS, facing: -Math.PI / 2,
      hp: 100, maxHp: 100, level: 1, xp: 0, needXp: 35, attack: 17, defense: 2, gold: 24, potions: 5,
      action: 'idle', actionTimer: 0, cooldown: 0, invulnerable: 0, anger: 0, ward: 0, speed: SPEED,classCooldown:0,tonics:0 },
    inventory: [{ uid: 'starter-sword', itemId: role.starterWeapon }, { uid: 'starter-armor', itemId: 'linen-armor' }],
    equipment: { weapon: 'starter-sword', offhand: null, armor: 'starter-armor', boots: null, ring: null, skill: null, charm: null },
    quest: { stage: 'unaccepted', kills: 0 },
    flags: { artifactOwned: false, firstWeaponDropped: false, armorDropped: false, bossDefeated: false },
    artifact: { phase: 'idle', x: 800, y: 810, cooldown: 0, elapsed: 0, dx: 0, dy: -1, hitIds: [] },
    enemies: [], drops: [], ...rpgDefaults(),
    targetId: null, moveTarget: null, path: [], autoAttack: false, repath: 0, pendingStrike: null,
    pendingEvents: [], events: [], notice: ''
  };
  state.hero.name=role.name;stats(state,true);
  if (snapshot?.version === 1 && Object.hasOwn(MAPS, snapshot.mapId) && snapshot.hero && Array.isArray(snapshot.inventory)
      && snapshot.quest && Object.hasOwn(QUEST.descriptions, snapshot.quest.stage) && snapshot.trailState
      && Array.isArray(snapshot.trailState.enemies) && Array.isArray(snapshot.trailState.drops)) {
    try {
      const saved = copy(snapshot);
      if (!['x', 'y', 'hp', 'level', 'xp', 'gold', 'potions'].every(key => Number.isFinite(saved.hero[key]))) throw Error('Invalid hero');
      if (saved.hero.level < 1 || saved.hero.level > 20 || saved.inventory.length > 40) throw Error('Invalid progression');
      if (saved.hero.hp < 0 || saved.hero.xp < 0 || saved.hero.gold < 0 || saved.hero.potions < 0) throw Error('Invalid resources');
      if (!Number.isSafeInteger(saved.nextId) || saved.nextId < 20 || !Number.isFinite(saved.seed)) throw Error('Invalid item sequence');
      if (!Number.isSafeInteger(saved.quest.kills) || saved.quest.kills < 0) throw Error('Invalid quest count');
      if (saved.inventory.some(item => !ITEMS[item.itemId]?.slot || typeof item.uid !== 'string')) throw Error('Invalid inventory');
      if (new Set(saved.inventory.map(item => item.uid)).size !== saved.inventory.length) throw Error('Duplicate inventory');
      if (saved.trailState.enemies.some(item => !ENEMIES[item.kind] || !['x', 'y', 'hp'].every(key => Number.isFinite(item[key])))) throw Error('Invalid enemies');
      if (saved.trailState.drops.some(item => !ITEMS[item.itemId] || !Number.isFinite(item.x + item.y))) throw Error('Invalid drops');
      Object.assign(state, { mapId: saved.mapId, phase: saved.phase === 'dead' ? 'dead' : 'play', time: saved.time ?? 0,
        seed: saved.seed >>> 0, nextId: Math.max(20, saved.nextId ?? 20), inventory: saved.inventory,
        quest: saved.quest, flags: { ...state.flags, ...saved.flags } });
      Object.assign(state.hero, saved.hero, { action: 'idle', actionTimer: 0, cooldown: 0, invulnerable: 0 });
      restoreRpg(state, saved);
      if (!validPoint(state.mapId, state.hero.x, state.hero.y, HERO_RADIUS)) Object.assign(state.hero, MAPS[state.mapId].spawn);
      stats(state);
      state.hero.classCooldown=clamp(Number.isFinite(saved.hero.classCooldown)?saved.hero.classCooldown:0,0,role.active.cooldown);
      state.hero.tonics=clamp(Number.isSafeInteger(saved.hero.tonics)?saved.hero.tonics:0,0,99);
      state.artifact.cooldown = Math.max(0, saved.artifactCooldown ?? 0);
      if (state.phase === 'dead') state.hero.action = 'dead';
      state.pendingEvents = [];
    } catch {
      return createSession(null,options);
    }
  }
  return state;
}

export function createSaveSnapshot(state) {
  const progression = rpgSnapshot(state);
  return copy({ version: 1, mapId: state.mapId, phase: state.phase, time: state.time, seed: state.seed, nextId: state.nextId,
    hero: state.hero, inventory: state.inventory, equipment: state.equipment, quest: state.quest, flags: state.flags,
    trailState: state.trailState, artifactCooldown: Math.max(0, state.artifact.cooldown), ...progression });
}

function validPoint(mapId, x, y, radius) {
  const map = MAPS[mapId];
  return x >= radius && y >= radius && x <= map.width - radius && y <= map.height - radius
    && !map.obstacles.some(rect => x > rect.x - radius && x < rect.x + rect.width + radius
      && y > rect.y - radius && y < rect.y + rect.height + radius);
}
export function clearLine(mapId, from, to, radius) {
  const steps = Math.ceil(distance(from, to) / 12);
  for (let index = 1; index <= steps; index++) {
    const phase = index / steps;
    if (!validPoint(mapId, from.x + (to.x - from.x) * phase, from.y + (to.y - from.y) * phase, radius)) return false;
  }
  return true;
}

/** Eight-connected A* on expanded solids. Diagonal steps require both neighbouring sides to be free. */
function findPath(mapId, start, requested, radius) {
  const map = MAPS[mapId], columns = Math.ceil(map.width / CELL), rows = Math.ceil(map.height / CELL);
  const point = index => ({ x: (index % columns + .5) * CELL, y: (Math.floor(index / columns) + .5) * CELL });
  const free = index => index >= 0 && index < columns * rows && validPoint(mapId, point(index).x, point(index).y, radius);
  const cell = value => clamp(Math.floor(value), 0, columns - 1);
  const origin = cell(start.x / CELL) + clamp(Math.floor(start.y / CELL), 0, rows - 1) * columns;
  let goal = cell(requested.x / CELL) + clamp(Math.floor(requested.y / CELL), 0, rows - 1) * columns;
  if (!free(goal)) {
    let nearest = Infinity;
    for (let index = 0; index < columns * rows; index++) if (free(index)) {
      const d = distance(point(index), requested);
      if (d < nearest) { nearest = d; goal = index; }
    }
  }
  const end = validPoint(mapId, requested.x, requested.y, radius) ? requested : point(goal);
  if (clearLine(mapId, start, end, radius)) return [{ ...end }];
  const open = new Set([origin]), scores = new Map([[origin, 0]]), previous = new Map();
  const estimate = index => distance(point(index), point(goal)) / CELL;
  while (open.size) {
    let current, best = Infinity;
    for (const index of open) {
      const score = scores.get(index) + estimate(index);
      if (score < best) { best = score; current = index; }
    }
    if (current === goal) {
      const route = [end];
      while (current !== origin) { route.push(point(current)); current = previous.get(current); }
      route.reverse();
      return route.filter((entry, index) => index === route.length - 1 || distance(entry, route[index + 1]) > 1);
    }
    open.delete(current);
    const cx = current % columns, cy = Math.floor(current / columns);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy || cx + dx < 0 || cx + dx >= columns || cy + dy < 0 || cy + dy >= rows) continue;
      const next = current + dx + dy * columns;
      if (!free(next) || dx && dy && (!free(current + dx) || !free(current + dy * columns))) continue;
      const cost = scores.get(current) + (dx && dy ? Math.SQRT2 : 1);
      if (cost >= (scores.get(next) ?? Infinity)) continue;
      scores.set(next, cost); previous.set(next, current); open.add(next);
    }
  }
  return [];
}

function move(state, actor, dx, dy) {
  if (validPoint(state.mapId, actor.x + dx, actor.y + dy, actor.radius)) { actor.x += dx; actor.y += dy; }
  else {
    if (validPoint(state.mapId, actor.x + dx, actor.y, actor.radius)) actor.x += dx;
    if (validPoint(state.mapId, actor.x, actor.y + dy, actor.radius)) actor.y += dy;
  }
  if (Math.abs(dx) + Math.abs(dy) > .01) actor.facing = Math.atan2(dy, dx);
}
function follow(state, actor, path, speed) {
  while (path.length && distance(actor, path[0]) < 5) path.shift();
  if (!path.length) return false;
  const target = path[0], length = distance(actor, target), stride = Math.min(speed, length);
  move(state, actor, (target.x - actor.x) / length * stride, (target.y - actor.y) / length * stride);
  return true;
}
function random(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}
function talk(state, text) { state.notice = text; emit(state, 'talk', { text }); }
function questStage(state, stage) {
  state.quest.stage = stage;
  emit(state, 'quest', { stage, text: QUEST.descriptions[stage], kills: state.quest.kills });
}
function drop(state, itemId, x, y, amount = 1, affixes) {
  const item = { id: `drop-${state.nextId++}`, itemId, x, y, amount,...(affixes&&Object.keys(affixes).length?{affixes}:{}) };
  state.drops.push(item); emit(state, 'loot', { ...item, name: ITEMS[itemId].name });
}
function hurtEnemy(state, foe, amount, cause) {
  if (foe.dead || state.phase !== 'play') return;
  const damage = Math.max(1, Math.round(amount * (foe.guard > 0 ? .6 : 1)));
  const actual = Math.min(foe.hp, damage);
  foe.hp = Math.max(0, foe.hp - damage);
  if (cause !== 'rage') state.hero.anger = clamp(state.hero.anger + actual * .25 + 2, 0, 100);
  emit(state, 'hit', { id: foe.id, x: foe.x, y: foe.y, amount: damage, cause });
  if(foe.telegraph?.channeling&&foe.hp>0){
    foe.channelDamage=(foe.channelDamage??0)+actual;
    if(foe.channelDamage>=foe.telegraph.breakDamage){
      foe.telegraph=null;foe.state='idle';foe.cooldown=1.1;foe.channelDamage=0;
      emit(state,'interrupt',{id:foe.id,x:foe.x,y:foe.y,reason:'channel-break'});
    }
  }
  if (foe.hp > 0) return;
  foe.dead = true; foe.state = 'dead'; foe.telegraph = null;
  emit(state, 'kill', { id: foe.id, kind: foe.kind, x: foe.x, y: foe.y, boss: foe.boss });
  state.hero.xp += ENEMIES[foe.kind].xp;
  while (state.hero.xp >= state.hero.needXp && state.hero.level < 20) {
    state.hero.xp -= state.hero.needXp; state.hero.level++; stats(state, true);
    emit(state, 'level', { level: state.hero.level, x: state.hero.x, y: state.hero.y });
  }
  drop(state, 'gold', foe.x + 15, foe.y + 8, foe.boss ? 65 : 7 + Math.floor(random(state) * 8));
  if (afterKill(state, foe, { drop, random })) return;
  if (foe.boss) {
    state.flags.bossDefeated = true;
    drop(state, 'jade-seal', foe.x - 12, foe.y);
    questStage(state, 'return');
    emit(state, 'victory', { x: foe.x, y: foe.y });
    return;
  }
  state.quest.kills++;
  if (!state.flags.firstWeaponDropped) {
    state.flags.firstWeaponDropped = true;
    drop(state, state.profession==='guard'?'iron-sword':rareWeaponFor(state.profession,1), foe.x - 14, foe.y - 5);
    talk(state, '适合本职业的兵器落地了！走近拾取，在行囊中装备，攻击力将明显提高。');
  } else if (state.quest.kills >= 4 && !state.flags.armorDropped) {
    state.flags.armorDropped = true; drop(state, 'scale-armor', foe.x - 14, foe.y);
  } else if (random(state) < .38) drop(state, 'potion', foe.x - 10, foe.y);
  if (state.quest.stage === 'hunt' && state.quest.kills >= QUEST.requiredKills) {
    questStage(state, 'boss');
    const boss = enemy('boss', 1480, 240, 'boss'); state.enemies.push(boss);
    emit(state, 'bossSpawn', { id: boss.id, x: boss.x, y: boss.y });
  }
}

function hurtHero(state, amount, foe) {
  const hero = state.hero;
  if (hero.invulnerable > 0 || state.phase !== 'play') return;
  const damage = Math.max(1, Math.round((amount - hero.defense) * (hero.ward > 0 ? .65 : 1)));
  hero.anger = clamp(hero.anger + Math.min(hero.hp, damage) * .8 + 3, 0, 100);
  hero.hp = Math.max(0, hero.hp - damage); hero.invulnerable = .35;
  emit(state, 'hit', { id: 'hero', x: hero.x, y: hero.y, amount: damage, sourceId: foe.id });
  if (!hero.hp) {
    state.phase = 'dead'; hero.action = 'dead'; state.autoAttack = false; state.path = [];
    state.hero.gold -= Math.floor(state.hero.gold * .1);
    state.artifact.phase = 'idle';
    state.skillEffect = null; state.rage.phase = 'idle';
    emit(state, 'death', { x: hero.x, y: hero.y });
  }
}
function melee(state) {
  const hero = state.hero,role=PROFESSIONS[state.profession];
  if (hero.cooldown > 0 || hero.actionTimer > 0) return false;
  const selected = state.enemies.find(foe => foe.id === state.targetId && !foe.dead);
  const target = selected ?? state.enemies.filter(foe => !foe.dead && distance(foe, hero) < role.reach).sort((a, b) => distance(a, hero) - distance(b, hero))[0];
  if (target) hero.facing = Math.atan2(target.y - hero.y, target.x - hero.x);
  const limit=target?Math.min(1,role.reach/Math.max(1,distance(target,hero))):1;
  const x=target?hero.x+(target.x-hero.x)*limit:hero.x+Math.cos(hero.facing)*Math.min(160,role.reach),
    y=target?hero.y+(target.y-hero.y)*limit:hero.y+Math.sin(hero.facing)*Math.min(160,role.reach);
  hero.action = 'attack'; hero.actionTimer = role.id==='guard'?.32:.36; hero.cooldown = role.attackCooldown;
  if(role.id==='ritualist')scheduleCast(state,{kind:'sigil',x,y,radius:48,remaining:role.attackWindup,total:role.attackWindup,damage:hero.attack,cause:'sigil',pulses:1,life:role.attackWindup});
  else state.pendingStrike = { remaining: role.attackWindup, targetId: target?.id, angle: hero.facing,profession:role.id };
  emit(state, 'attack', { id: 'hero', x: hero.x, y: hero.y, direction: hero.facing,profession:role.id,
    attackKind:role.id==='guard'?'melee':role.id==='ranger'?'arrow':'sigil',targetX:x,targetY:y });
  return true;
}
function aimPoint(state,action,range){
  const hero=state.hero;
  const selected=state.enemies.find(foe=>foe.id===state.targetId&&!foe.dead)
    ??state.enemies.filter(foe=>!foe.dead&&distance(foe,hero)<=range).sort((a,b)=>distance(a,hero)-distance(b,hero))[0];
  const point=Number.isFinite(action?.x+action?.y)?action:selected;
  if(!point)return{x:hero.x+Math.cos(hero.facing)*Math.min(range,150),y:hero.y+Math.sin(hero.facing)*Math.min(range,150)};
  const length=distance(point,hero),scale=Math.min(1,range/Math.max(1,length));
  return{x:hero.x+(point.x-hero.x)*scale,y:hero.y+(point.y-hero.y)*scale};
}
function scheduleCast(state,cast){
  if(state.casts.length>=10)return;
  const id=`cast-${state.nextId++}`;
  state.casts.push({id,interval:0,slow:0,...cast});
  emit(state,'playerForecast',{id,kind:cast.kind,x:cast.x,y:cast.y,radius:cast.radius,duration:cast.remaining,profession:state.profession});
}
function launchArrow(state,angle,damage,{range=260,pierce=1,skillId='basic-arrow',volleyHits=null}={}){
  if(state.projectiles.length>=24)return;
  const id=`arrow-${state.nextId++}`,speed=850;
  state.projectiles.push({id,ownerId:'hero',kind:'arrow',skillId,x:state.hero.x,y:state.hero.y,dx:Math.cos(angle),dy:Math.sin(angle),
    speed,remaining:range/speed,damage,pierce,hitIds:[],volleyHits});
  emit(state,'projectile',{id,kind:'arrow',skillId,x:state.hero.x,y:state.hero.y,direction:angle,profession:state.profession});
}
function castClassSkill(state,action={}){
  const hero=state.hero,role=PROFESSIONS[state.profession],active=role.active;
  if(hero.classCooldown>0)return false;
  hero.classCooldown=active.cooldown;hero.ward=Math.max(hero.ward,active.ward);hero.action='attack';hero.actionTimer=.35;
  const point=aimPoint(state,action,active.range),angle=Math.atan2(point.y-hero.y,point.x-hero.x);
  hero.facing=angle;
  emit(state,'classSkill',{profession:role.id,skillId:active.id,name:active.name,x:hero.x,y:hero.y,targetX:point.x,targetY:point.y,radius:active.radius,duration:active.duration});
  if(role.id==='guard'){
    for(const foe of state.enemies)if(!foe.dead&&distance(hero,foe)<=active.radius+foe.radius){
      foe.guard=0;foe.shieldClock=1.6;hurtEnemy(state,foe,Math.round(hero.attack*active.damageMultiplier),'classSkill');
      const d=Math.max(1,distance(hero,foe)),end={x:foe.x+(foe.x-hero.x)/d*18,y:foe.y+(foe.y-hero.y)/d*18};
      if(!foe.dead&&!foe.boss&&validPoint(state.mapId,end.x,end.y,foe.radius)){foe.x=end.x;foe.y=end.y;}
    }
  }else if(role.id==='ranger'){
    const volleyHits=Object.create(null);
    for(const offset of [-.16,0,.16])launchArrow(state,angle+offset,Math.round(hero.attack*active.damageMultiplier),{range:active.range,pierce:2,skillId:active.id,volleyHits});
  }else scheduleCast(state,{kind:'spirit-array',skillId:active.id,x:point.x,y:point.y,radius:active.radius,remaining:.25,total:.25,
    damage:Math.round(hero.attack*active.damageMultiplier),cause:'classSkill',pulses:3,interval:.8,life:active.duration,slow:.55});
  return true;
}

function castArtifact(state, target = {}) {
  const ring = state.artifact, hero = state.hero;
  if (!state.flags.artifactOwned || ring.cooldown > 0 || ring.phase !== 'idle') return false;
  const skill = state.inventory.find(item => item.uid === state.equipment.skill)?.itemId;
  if (skill === 'wind-banner') {
    ring.cooldown = 8;
    hero.ward = 3;
    state.skillEffect = { id: 'wind-banner', remaining: 1.3, pulseIn: .1, pulses: 0, radius: 150 };
    emit(state, 'skillCast', { skillId: skill, x: hero.x, y: hero.y, radius: 150, duration: 1.3 });
    return true;
  }
  if (skill !== 'qiankun-ring') return false;
  const foe = state.enemies.find(entry => entry.id === state.targetId && !entry.dead)
    ?? state.enemies.filter(entry => !entry.dead).sort((a, b) => distance(a, hero) - distance(b, hero))[0];
  const aim = Number.isFinite(target.x + target.y) ? target : foe;
  const angle = aim ? Math.atan2(aim.y - hero.y, aim.x - hero.x) : hero.facing;
  Object.assign(ring, { phase: 'outbound', x: hero.x, y: hero.y, dx: Math.cos(angle), dy: Math.sin(angle), elapsed: 0, cooldown: 5, hitIds: [] });
  emit(state, 'artifactCast', { x: hero.x, y: hero.y, direction: angle });
  return true;
}
function castRage(state,action={}) {
  const hero = state.hero,role=PROFESSIONS[state.profession],data=role.rage;
  if (hero.anger < 100 || state.rage.phase !== 'idle') return false;
  hero.anger = 0;
  const point=role.id==='guard'?hero:aimPoint(state,action,data.range),windup=role.id==='guard'?.42:data.windup;
  Object.assign(state.rage, { phase: 'charging', remaining: windup, x: point.x, y: point.y, radius:role.id==='guard'?185:data.radius,
    skillId:data.id,profession:role.id });
  emit(state, 'rageTelegraph', { x: point.x, y: point.y, radius:state.rage.radius,duration:windup,skillId:data.id,profession:role.id });
  return true;
}
function updateSkills(state, seconds) {
  const hero = state.hero;
  hero.ward = Math.max(0, hero.ward - seconds);
  const wind = state.skillEffect;
  if (wind) {
    wind.remaining -= seconds;
    wind.pulseIn -= seconds;
    if (wind.pulseIn <= 0 && wind.pulses < 3) {
      wind.pulses++;
      wind.pulseIn += .55;
      emit(state, 'skillPulse', { skillId: wind.id, x: hero.x, y: hero.y, radius: wind.radius, pulse: wind.pulses });
      for (const foe of state.enemies) if (!foe.dead && distance(hero, foe) <= wind.radius + foe.radius)
        hurtEnemy(state, foe, 14 + hero.level * 2, 'wind');
    }
    if (wind.remaining <= 0) state.skillEffect = null;
  }
  const rage = state.rage;
  if (rage.phase === 'charging') {
    rage.remaining -= seconds;
    if (rage.remaining <= 0) {
      rage.phase = 'idle';
      emit(state, 'rage', { x: rage.x, y: rage.y, radius: rage.radius,skillId:rage.skillId,profession:state.profession });
      for (const foe of state.enemies) if (!foe.dead && distance(rage, foe) <= rage.radius + foe.radius) {
        const amount = state.profession==='guard'?Math.round(46 + hero.level * 8 + hero.attack * .5)
          :Math.round(hero.attack*PROFESSIONS[state.profession].rage.damageMultiplier+hero.level*6);
        hurtEnemy(state, foe, amount, 'rage');
        emit(state, 'rageHit', { id: foe.id, x: foe.x, y: foe.y, amount });
      }
    }
  }
}
function segmentDistance(point, from, to) {
  const dx = to.x - from.x, dy = to.y - from.y, square = dx * dx + dy * dy;
  const t = square ? clamp(((point.x - from.x) * dx + (point.y - from.y) * dy) / square, 0, 1) : 0;
  return Math.hypot(point.x - from.x - dx * t, point.y - from.y - dy * t);
}
function updateArtifact(state, seconds) {
  const ring = state.artifact;
  ring.cooldown = Math.max(0, ring.cooldown - seconds);
  if (ring.phase === 'idle') return;
  const before = { x: ring.x, y: ring.y };
  ring.elapsed += seconds;
  if (ring.phase === 'outbound') {
    ring.x += ring.dx * 540 * seconds; ring.y += ring.dy * 540 * seconds;
  } else {
    const length = distance(ring, state.hero), speed = 630 * seconds;
    if (length <= speed + 12) {
      ring.phase = 'idle'; emit(state, 'artifactCatch', { x: state.hero.x, y: state.hero.y }); return;
    }
    ring.x += (state.hero.x - ring.x) / length * speed;
    ring.y += (state.hero.y - ring.y) / length * speed;
  }
  for (const foe of state.enemies) {
    if (foe.dead || ring.hitIds.includes(foe.id) || segmentDistance(foe, before, ring) > foe.radius + 21) continue;
    ring.hitIds.push(foe.id);
    const amount = ring.phase === 'outbound' ? 26 + state.hero.level * 2 : 16 + state.hero.level;
    hurtEnemy(state, foe, amount, 'artifact');
    emit(state, 'artifactHit', { id: foe.id, x: foe.x, y: foe.y, amount, phase: ring.phase });
  }
  if (ring.phase === 'outbound' && ring.elapsed >= .67) {
    ring.phase = 'return'; ring.hitIds = [];
    emit(state, 'artifactReturn', { x: ring.x, y: ring.y });
  }
}
function updatePlayerSpells(state,seconds){
  for(const foe of state.enemies)foe.slow=0;
  for(let i=state.casts.length-1;i>=0;i--){
    const cast=state.casts[i];cast.life-=seconds;cast.remaining-=seconds;
    if(cast.slow&&cast.life>0)for(const foe of state.enemies)if(!foe.dead&&distance(cast,foe)<=cast.radius+foe.radius)foe.slow=cast.slow;
    if(cast.remaining<=0&&cast.pulses>0){
      cast.pulses--;cast.remaining+=cast.interval;
      emit(state,'castHit',{id:cast.id,kind:cast.kind,skillId:cast.skillId,x:cast.x,y:cast.y,radius:cast.radius,profession:state.profession});
      const multiplier=cast.kind==='spirit-array'?[1,.65,.5][cast.pulseIndex??0]:1;
      for(const foe of state.enemies)if(!foe.dead&&distance(cast,foe)<=cast.radius+foe.radius)hurtEnemy(state,foe,Math.round(cast.damage*multiplier),cast.cause);
      cast.pulseIndex=(cast.pulseIndex??0)+1;
    }
    if(cast.pulses<=0&&cast.life<=0)state.casts.splice(i,1);
  }
  for(let i=state.projectiles.length-1;i>=0;i--){
    const p=state.projectiles[i],before={x:p.x,y:p.y},travel=p.speed*Math.min(seconds,Math.max(0,p.remaining));
    p.x+=p.dx*travel;p.y+=p.dy*travel;p.remaining-=seconds;
    for(const foe of state.enemies){
      if(foe.dead||p.hitIds.includes(foe.id)||segmentDistance(foe,before,p)>foe.radius+7)continue;
      p.hitIds.push(foe.id);
      const repeats=p.volleyHits?.[foe.id]??0,multiplier=p.volleyHits?(repeats===0?1:repeats===1?.2:.1):1;
      if(p.volleyHits)p.volleyHits[foe.id]=repeats+1;
      hurtEnemy(state,foe,Math.round(p.damage*multiplier),p.skillId==='basic-arrow'?'arrow':'classSkill-arrow');
      emit(state,'projectileHit',{id:p.id,targetId:foe.id,x:foe.x,y:foe.y,skillId:p.skillId,profession:state.profession});
      if(p.hitIds.length>=p.pierce){p.remaining=0;break;}
    }
    if(p.remaining<=0)state.projectiles.splice(i,1);
  }
}
export function nextRecovery(hero){
  const missing=Math.max(0,hero.maxHp-hero.hp);if(!missing)return null;
  const small=RECOVERY_ITEMS[0],large=RECOVERY_ITEMS[1],hasSmall=hero.potions>0,hasLarge=hero.tonics>0;
  if(missing<=small.heal&&hasSmall)return small;
  if(hasLarge)return large;
  return hasSmall?small:null;
}

function planEnemyAttack(state, foe, data) {
  const late=lateBossForecast(state,foe);if(late)return late;
  const hero = state.hero;
  let kind = foe.kind === 'shaman' || foe.kind === 'slinger' ? 'bolt' : 'slash';
  let x = hero.x, y = hero.y, radius = kind === 'bolt' ? 47 : foe.boss ? 70 : 40, total = data.windup;
  let extra = [];
  if(foe.kind==='wolf'||foe.kind==='fenwolf'){
    kind=foe.attacks%2?'pounce':'slash';radius=foe.kind==='fenwolf'?47:40;total=data.windup;
  }else if(foe.kind==='sentinel'){
    kind=foe.attacks%2?'cleave':'slam';radius=kind==='slam'?120:78;total=kind==='slam'?1.08:.9;
    if(kind==='slam'){x=foe.x;y=foe.y;}
  }else if(foe.kind==='channeler'){
    return{kind:'channel-bolt',name:'聚潮咒',hint:'攻击可以打断吟唱，也可先离开落点。',skillId:'channeler-bolt',pattern:'channel-bolt',
      x,y,radius:60,total:1.25,remaining:1.25,extra:[],channeling:true,breakDamage:18};
  }else if (foe.kind === 'windlord') {
    const cycle = (foe.attacks - 1) % 3;
    kind = cycle === 0 ? 'dash' : cycle === 1 ? 'crosswind' : 'slam';
    radius = cycle === 2 ? 160 : 62;
    total = cycle === 0 ? .72 : 1.05;
    if (cycle === 2) { x = foe.x; y = foe.y; }
    if (cycle === 1) extra = [-95, 95].map(dx => ({ x: hero.x + dx, y: hero.y, radius: 57 }));
  } else if (foe.kind === 'guard') {
    kind = foe.attacks % 2 ? 'cleave' : 'slam';
    radius = kind === 'slam' ? 100 : 65;
    total = kind === 'slam' ? 1.05 : .85;
    if (kind === 'slam') { x = foe.x; y = foe.y; foe.guard = 1.05; }
  } else if (foe.boss && foe.attacks % 3 === 0) {
    kind = 'slam'; x = foe.x; y = foe.y; radius = 145; total = 1.1;
  } else if (foe.kind === 'slinger' && foe.attacks % 2 === 0) {
    extra = [{ x: hero.x - 85, y: hero.y + 25, radius: 40 }, { x: hero.x + 85, y: hero.y + 25, radius: 40 }];
  }
  const names={slash:'横扫',pounce:'扑咬',bolt:'落咒',cleave:'蓄力劈击',slam:'震地',dash:'突进',crosswind:'回风三叠'};
  return { kind,skillId:foe.kind+'-'+kind,pattern:kind,name:names[kind]??kind,hint:kind==='slam'?'远离脚下蓄力圈。':'侧移离开固定落点。', x, y, radius, remaining: total, total, extra };
}
function updateHazards(state,seconds){
  for(let i=state.hazards.length-1;i>=0;i--){
    const mark=state.hazards[i],owner=state.enemies.find(foe=>foe.id===mark.ownerId);
    if(!owner||owner.dead){state.hazards.splice(i,1);continue;}
    mark.remaining-=seconds;
    if(mark.remaining<=0){
      emit(state,'hazardAttack',{...mark});
      if(forecastHits(state.hero,mark))hurtHero(state,mark.damage,owner);
      state.hazards.splice(i,1);
    }
  }
}
function updateEnemies(state, seconds) {
  for (const foe of state.enemies) {
    if (foe.dead || state.phase !== 'play') continue;
    const data = ENEMIES[foe.kind];
    foe.guard = Math.max(0, (foe.guard ?? 0) - seconds);
    if(foe.kind==='sentinel'){
      foe.shieldClock=(foe.shieldClock??0)+seconds;
      foe.guard=foe.shieldClock%4<1.45?.25:0;
      foe.shielded=foe.guard>0;
    }
    if(foe.kind==='riverLord'||foe.kind==='warMarshal'){
      const phase=foe.hp/foe.maxHp<=.5?2:1;
      if(foe.bossPhase!==phase){foe.bossPhase=phase;if(phase===2)emit(state,'bossPhase',{id:foe.id,phase,x:foe.x,y:foe.y});}
    }
    foe.cooldown = Math.max(0, foe.cooldown - seconds);
    if (foe.telegraph) {
      foe.telegraph.remaining -= seconds;
      if (foe.telegraph.remaining > 0) continue;
      const attack = foe.telegraph;
      emit(state, 'enemyAttack', { ...attack,id: foe.id, x: foe.x, y: foe.y, targetX: attack.x, targetY: attack.y });
      if (attack.kind === 'dash'||attack.kind==='pounce') {
        const length = distance(foe, attack), travel = Math.max(0, length - foe.radius - HERO_RADIUS - 2);
        const end = { x: foe.x + (attack.x - foe.x) / Math.max(1, length) * travel,
          y: foe.y + (attack.y - foe.y) / Math.max(1, length) * travel };
        if (validPoint(state.mapId, end.x, end.y, foe.radius) && clearLine(state.mapId, foe, end, foe.radius)) {
          foe.x = end.x; foe.y = end.y;
        }
      }
      if ([attack, ...(attack.extra ?? [])].some(mark => forecastHits(state.hero,mark)))
        hurtHero(state, data.attack * (attack.kind === 'slam' ? 1.3 : 1) * (1 + Math.min(4, (foe.run ?? 1) - 1) * .04), foe);
      for(const wave of attack.followUps??[]){
        const mark={id:`hazard-${state.nextId++}`,ownerId:foe.id,kind:attack.kind,name:attack.name,hint:attack.hint,
          total:wave.delay,remaining:wave.delay,damage:data.attack,...wave};
        if(state.hazards.length<18){state.hazards.push(mark);emit(state,'hazardTelegraph',{...mark});}
      }
      if(attack.summon&&state.enemies.filter(enemy=>!enemy.dead).length<12){
        for(const side of [-1,1]){
          const point={x:foe.x+side*100,y:foe.y+100};
          if(validPoint(state.mapId,point.x,point.y,22)){
            const add=makeEnemy(side<0?'fenwolf':'channeler',point.x,point.y,`reinforcement-${state.nextId++}`,foe.run);
            state.enemies.push(add);emit(state,'summon',{id:add.id,kind:add.kind,x:add.x,y:add.y});
          }
        }
      }
      foe.telegraph = null; foe.cooldown = data.cooldown; foe.state = 'idle';
      continue;
    }
    const d = distance(foe, state.hero);
    if (d > (foe.boss ? 650 : 380)) { foe.state = 'idle'; continue; }
    foe.facing = Math.atan2(state.hero.y - foe.y, state.hero.x - foe.x);
    if (d <= data.range && foe.cooldown <= 0) {
      foe.attacks++;
      foe.telegraph = planEnemyAttack(state, foe, data);
      foe.channelDamage=0;
      foe.state = 'windup';
      emit(state, 'telegraph', { ...foe.telegraph,id:foe.id,duration:foe.telegraph.total });
    }else if(foe.kind==='channeler'&&d<160&&foe.cooldown>0){
      const angle=Math.atan2(foe.y-state.hero.y,foe.x-state.hero.x);
      move(state,foe,Math.cos(angle)*data.speed*seconds,Math.sin(angle)*data.speed*seconds);foe.state='walk';
    } else if (d > data.range * .83) {
      foe.repath -= seconds;
      if (foe.repath <= 0 || !foe.path.length) {
        let goal=state.hero;
        if((foe.kind==='wolf'||foe.kind==='fenwolf')&&d<250){
          const angle=Math.atan2(foe.y-state.hero.y,foe.x-state.hero.x)+(foe.id.length%2?.45:-.45);
          const flank={x:state.hero.x+Math.cos(angle)*48,y:state.hero.y+Math.sin(angle)*48};
          if(validPoint(state.mapId,flank.x,flank.y,foe.radius))goal=flank;
        }
        foe.path = findPath(state.mapId, foe, goal, foe.radius); foe.repath = .6;
      }
      foe.state = follow(state, foe, foe.path, data.speed * (foe.slow||1) * seconds) ? 'walk' : 'idle';
    } else foe.state = 'idle';
  }
}

function changeMap(state, mapId) {
  syncRoom(state);
  state.mapId = mapId;
  enterRoom(state, mapId);
  Object.assign(state.hero, MAPS[mapId].spawn, { action: 'idle', actionTimer: 0, cooldown: 0 });
  state.path = []; state.targetId = null; state.moveTarget = null; state.autoAttack = false; state.pendingStrike = null;
  state.artifact.phase = 'idle';
  state.hero.ward = 0;
  if (mapId === 'city') { state.hero.hp = state.hero.maxHp; state.hero.potions = Math.max(3, state.hero.potions); }
  emit(state, 'portal', { mapId, x: state.hero.x, y: state.hero.y });
}

export function dispatch(state, action) {
  if (!action || typeof action.type !== 'string') return false;
  if (action.type === 'retry' && state.phase === 'dead') {
    state.phase = 'play';
    for (const foe of state.enemies) if (!foe.dead) { foe.hp = foe.maxHp; foe.telegraph = null; foe.cooldown = .8; }
    changeMap(state, 'city'); return true;
  }
  if (state.phase !== 'play') return false;
  const townResult = townAction(state, action, { changeMap, stats });
  if (townResult !== null) return townResult;
  switch (action.type) {
    case 'moveTo':
      if (!Number.isFinite(action.x + action.y)) return false;
      state.dialogue = state.shop = null;
      state.moveTarget = { x: action.x, y: action.y };
      state.path = findPath(state.mapId, state.hero, state.moveTarget, HERO_RADIUS);
      state.autoAttack = false;
      return state.path.length > 0;
    case 'target': {
      const foe = state.enemies.find(entry => entry.id === action.id && !entry.dead);
      if (!foe) return false;
      state.dialogue = state.shop = null;
      state.targetId = foe.id; state.autoAttack = true; state.repath = 0; state.moveTarget = null; return true;
    }
    case 'attack': return melee(state);
    case 'artifact': return castArtifact(state, action);
    case 'rage': return castRage(state,action);
    case 'classSkill':return castClassSkill(state,action);
    case 'potion':{
      const recovery=Object.hasOwn(action,'itemId')
        ?RECOVERY_ITEMS.find(item=>item.itemId===action.itemId):nextRecovery(state.hero);
      if(!recovery||state.hero.hp>=state.hero.maxHp||!(state.hero[recovery.key]>=1))return false;
      state.hero[recovery.key]--;const amount=Math.min(recovery.heal,state.hero.maxHp-state.hero.hp);
      state.hero.hp+=amount;emit(state,'heal',{x:state.hero.x,y:state.hero.y,amount,itemId:recovery.itemId});return true;
    }
    case 'equip': {
      const instance = state.inventory.find(entry => entry.uid === action.uid), item = ITEMS[instance?.itemId];
      if (!item?.slot) return false;
      if(!canEquip(item,state.profession,state.hero.level))return false;
      if (item.slot === 'skill' && state.artifact.phase !== 'idle') return false;
      state.equipment[item.slot] = instance.uid; stats(state);
      emit(state, 'equip', { uid: instance.uid, itemId: instance.itemId, name: item.name }); return true;
    }
    case 'unequip': {
      const slot = action.slot === 'charm' ? 'ring' : action.slot;
      if (!EQUIPMENT_SLOTS.includes(slot) || !state.equipment[slot]) return false;
      if (slot === 'skill' && state.artifact.phase !== 'idle') return false;
      state.equipment[slot] = null;
      if (slot === 'skill') { state.skillEffect = null; state.hero.ward = 0; }
      stats(state); emit(state, 'unequip', { slot }); return true;
    }
    case 'pickup': {
      const item = action.id ? state.drops.find(entry => entry.id === action.id)
        : [...state.drops].sort((a, b) => distance(a, state.hero) - distance(b, state.hero))[0];
      if (!item || distance(item, state.hero) > 100) return false;
      if (ITEMS[item.itemId].slot && bagSize(state) >= 30) { talk(state, '背包已满，请先整理。物品仍留在地上。'); return false; }
      if (item.itemId === 'gold') state.hero.gold += item.amount;
      else if (ITEMS[item.itemId].consumable||item.itemId==='potion'){
        const key=ITEMS[item.itemId].consumable??'potions';state.hero[key]=Math.min(99,(state.hero[key]??0)+item.amount);
      }else if (!addResource(state, item.itemId, item.amount)) state.inventory.push({ uid: `item-${state.nextId++}`, itemId: item.itemId,...(item.affixes?{affixes:item.affixes}:{}) });
      state.drops.splice(state.drops.indexOf(item), 1);
      emit(state, 'pickup', { id: item.id, itemId: item.itemId, name: ITEMS[item.itemId].name, amount: item.amount, x: item.x, y: item.y }); return true;
    }
    case 'interact': {
      const map = MAPS[state.mapId];
      const person = (map.portals ?? [map.portal]).find(portal => portal.id === action.id) ?? map.npcs.find(npc => npc.id === action.id);
      if (!person || distance(person, state.hero) > 140) return false;
      if (person.to) {
        if (state.quest.stage === 'unaccepted') { talk(state, '先向姜尚领取除祟之托，再出城。'); return false; }
        if (person.to === 'pass' && !['active', 'return', 'complete'].includes(state.chapter.stage)) {
          talk(state, '铜关阵门尚未开放，先平定古道，再向姜尚领命。'); return false;
        }
        if((person.to==='ford'||person.to==='siege')&&!['active','return','complete'].includes(state.campaign[person.to].stage)){
          talk(state,'此地阵门尚未开放，先向姜尚复命并领取下一章。');return false;
        }
        changeMap(state, person.to); return true;
      }
      if (action.id === 'elder') {
        if (state.quest.stage === 'unaccepted') {
          grantRing(state); questStage(state, 'hunt');
          talk(state, '岐山古道邪气蔓延。持此乾坤圈除去六名邪祟，逼出阵中邪将。圈出伤敌，归途再击；谨记避开敌人的蓄力。');
        } else if (state.quest.stage === 'return') {
          state.hero.gold += 100; questStage(state, 'complete');
          if (state.chapter.stage === 'locked') state.chapter.stage = 'offer';
          talk(state, '古道已安，功劳当记。赏钱一百文！镇邪印亦可装备护身，西岐百姓会记得你的名字。');
        } else if (state.chapter.stage === 'return' && !state.chapter.rewarded) {
          if (!grantItem(state, 'wind-boots')) return false;
          state.hero.gold += 160; state.chapter.stage = 'complete'; state.chapter.rewarded = true;
          if(state.campaign.ford.stage==='locked')state.campaign.ford.stage='offer';
          emit(state, 'chapter', { id: CHAPTER.id, stage: 'complete' });
          emit(state, 'campaignComplete', { x: state.hero.x, y: state.hero.y });
        } else {
          const claimed=claimCampaign(state,grantItem);if(claimed===false)return false;
          if(claimed===null)talk(state,QUEST.descriptions[state.quest.stage]);
        }
      }
      return openDialogue(state, action.id);
    }
    default: return false;
  }
}

function tick(state, seconds, input) {
  if (state.phase !== 'play') return;
  state.time += seconds;
  const hero = state.hero;
  hero.cooldown = Math.max(0, hero.cooldown - seconds);
  hero.actionTimer = Math.max(0, hero.actionTimer - seconds);
  hero.invulnerable = Math.max(0, hero.invulnerable - seconds);
  hero.classCooldown=Math.max(0,hero.classCooldown-seconds);
  if (Number.isFinite(input.aimX + input.aimY)) hero.facing = Math.atan2(input.aimY - hero.y, input.aimX - hero.x);
  if (state.pendingStrike) {
    state.pendingStrike.remaining -= seconds;
    if (state.pendingStrike.remaining <= 0) {
      const strike = state.pendingStrike;
      const foe = state.enemies.find(entry => entry.id === strike.targetId && !entry.dead);
      if(strike.profession==='ranger'){
        const angle=foe?Math.atan2(foe.y-hero.y,foe.x-hero.x):strike.angle;
        launchArrow(state,angle,hero.attack,{range:PROFESSIONS.ranger.reach+24});
      }else if (foe && distance(hero, foe) <= PROFESSIONS[state.profession].reach) hurtEnemy(state, foe, hero.attack, 'melee');
      state.pendingStrike = null;
    }
  }
  const mx = Number.isFinite(input.moveX) ? input.moveX : 0, my = Number.isFinite(input.moveY) ? input.moveY : 0;
  const magnitude = Math.hypot(mx, my);
  let walking = false;
  if (magnitude > .05) {
    state.autoAttack = false; state.moveTarget = null; state.path = [];
    state.dialogue = state.shop = null;
    move(state, hero, mx / Math.max(1, magnitude) * hero.speed * seconds, my / Math.max(1, magnitude) * hero.speed * seconds);
    walking = true;
  } else {
    const foe = state.autoAttack && state.enemies.find(entry => entry.id === state.targetId && !entry.dead);
    if (foe && distance(hero, foe) > PROFESSIONS[state.profession].chaseRange) {
      state.repath -= seconds;
      if (state.repath <= 0 || !state.path.length) { state.path = findPath(state.mapId, hero, foe, HERO_RADIUS); state.repath = .35; }
      walking = follow(state, hero, state.path, hero.speed * seconds);
    } else if (foe) {
      state.path = []; melee(state);
    } else if (state.moveTarget) {
      walking = follow(state, hero, state.path, hero.speed * seconds);
      if (!state.path.length) state.moveTarget = null;
    }
  }
  if (input.attack) melee(state);
  if (input.artifact) castArtifact(state, { x: input.aimX, y: input.aimY });
  if (input.rage) castRage(state);
  if(input.classSkill)castClassSkill(state,{x:input.aimX,y:input.aimY});
  if (hero.actionTimer <= 0) hero.action = walking ? 'walk' : 'idle';
  updateArtifact(state, seconds);
  updateSkills(state, seconds);
  updatePlayerSpells(state,seconds);
  updateHazards(state,seconds);
  if (state.mapId !== 'city') updateEnemies(state, seconds);
}

export function update(state, dt, input = {}) {
  state.accumulator += clamp(Number.isFinite(dt) ? dt : 0, 0, .25);
  while (state.accumulator + 1e-10 >= STEP) {
    tick(state, STEP, input); state.accumulator -= STEP;
  }
  state.events = state.pendingEvents.splice(0);
  return state.events;
}
