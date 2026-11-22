import { CHAPTER, ENEMIES, EQUIPMENT_SLOTS, ITEMS, MAPS, QUEST } from './data.mjs';
import { addResource, afterKill, bagSize, enterRoom, grantItem, grantRing, makeEnemy, openDialogue,
  restoreRpg, rpgDefaults, rpgSnapshot, syncRoom, townAction } from './progression.mjs';

const STEP = 1 / 60, HERO_RADIUS = 18, SPEED = 185, CELL = 40;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const copy = value => JSON.parse(JSON.stringify(value));

function emit(state, type, detail = {}) {
  state.pendingEvents.push({ type, ...detail });
}
const enemy = makeEnemy;
function stats(state, restore = false) {
  const hero = state.hero;
  let attack = 2 + hero.level * 2, defense = 1, bonusHp = 0, speed = SPEED;
  for (const slot of EQUIPMENT_SLOTS) {
    const uid = state.equipment[slot];
    const instance = state.inventory.find(item => item.uid === uid);
    const item = ITEMS[instance?.itemId];
    attack += item?.attack ?? 0;
    defense += item?.defense ?? 0;
    bonusHp += item?.maxHp ?? 0;
    speed += item?.speed ?? 0;
  }
  hero.attack = attack;
  hero.defense = defense;
  hero.maxHp = 100 + (hero.level - 1) * 15 + bonusHp;
  hero.speed = speed;
  hero.hp = restore ? hero.maxHp : Math.min(hero.hp, hero.maxHp);
  hero.needXp = hero.level * 35;
}

export function createSession(snapshot = null) {
  const state = {
    version: 1, mapId: 'city', phase: 'play', time: 0, seed: 74123, nextId: 20, accumulator: 0,
    hero: { id: 'hero', name: '玄甲', ...MAPS.city.spawn, radius: HERO_RADIUS, facing: -Math.PI / 2,
      hp: 100, maxHp: 100, level: 1, xp: 0, needXp: 35, attack: 17, defense: 2, gold: 24, potions: 5,
      action: 'idle', actionTimer: 0, cooldown: 0, invulnerable: 0, anger: 0, ward: 0, speed: SPEED },
    inventory: [{ uid: 'starter-sword', itemId: 'bronze-sword' }, { uid: 'starter-armor', itemId: 'linen-armor' }],
    equipment: { weapon: 'starter-sword', offhand: null, armor: 'starter-armor', boots: null, ring: null, skill: null, charm: null },
    quest: { stage: 'unaccepted', kills: 0 },
    flags: { artifactOwned: false, firstWeaponDropped: false, armorDropped: false, bossDefeated: false },
    artifact: { phase: 'idle', x: 800, y: 810, cooldown: 0, elapsed: 0, dx: 0, dy: -1, hitIds: [] },
    enemies: [], drops: [], ...rpgDefaults(),
    targetId: null, moveTarget: null, path: [], autoAttack: false, repath: 0, pendingStrike: null,
    pendingEvents: [], events: [], notice: ''
  };
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
      state.artifact.cooldown = Math.max(0, saved.artifactCooldown ?? 0);
      if (state.phase === 'dead') state.hero.action = 'dead';
      state.pendingEvents = [];
    } catch {
      return createSession();
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
function clearLine(mapId, from, to, radius) {
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
function drop(state, itemId, x, y, amount = 1) {
  const item = { id: `drop-${state.nextId++}`, itemId, x, y, amount };
  state.drops.push(item); emit(state, 'loot', { ...item, name: ITEMS[itemId].name });
}
function hurtEnemy(state, foe, amount, cause) {
  if (foe.dead || state.phase !== 'play') return;
  const damage = Math.max(1, Math.round(amount * (foe.guard > 0 ? .6 : 1)));
  const actual = Math.min(foe.hp, damage);
  foe.hp = Math.max(0, foe.hp - damage);
  if (cause !== 'rage') state.hero.anger = clamp(state.hero.anger + actual * .25 + 2, 0, 100);
  emit(state, 'hit', { id: foe.id, x: foe.x, y: foe.y, amount: damage, cause });
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
    drop(state, 'iron-sword', foe.x - 14, foe.y - 5);
    talk(state, '破邪剑落地了！走近拾取，在背包中装备，攻击力将明显提高。');
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
  const hero = state.hero;
  if (hero.cooldown > 0 || hero.actionTimer > 0) return false;
  const selected = state.enemies.find(foe => foe.id === state.targetId && !foe.dead);
  const target = selected ?? state.enemies.filter(foe => !foe.dead && distance(foe, hero) < 88).sort((a, b) => distance(a, hero) - distance(b, hero))[0];
  if (target) hero.facing = Math.atan2(target.y - hero.y, target.x - hero.x);
  hero.action = 'attack'; hero.actionTimer = .32; hero.cooldown = .48;
  state.pendingStrike = { remaining: .12, targetId: target?.id, angle: hero.facing };
  emit(state, 'attack', { id: 'hero', x: hero.x, y: hero.y, direction: hero.facing,
    targetX: target?.x ?? hero.x + Math.cos(hero.facing) * 65, targetY: target?.y ?? hero.y + Math.sin(hero.facing) * 65 });
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
function castRage(state) {
  const hero = state.hero;
  if (hero.anger < 100 || state.rage.phase !== 'idle') return false;
  hero.anger = 0;
  Object.assign(state.rage, { phase: 'charging', remaining: .42, x: hero.x, y: hero.y, radius: 185 });
  emit(state, 'rageTelegraph', { x: hero.x, y: hero.y, radius: 185, duration: .42 });
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
      emit(state, 'rage', { x: rage.x, y: rage.y, radius: rage.radius });
      for (const foe of state.enemies) if (!foe.dead && distance(rage, foe) <= rage.radius + foe.radius) {
        const amount = Math.round(46 + hero.level * 8 + hero.attack * .5);
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

function planEnemyAttack(state, foe, data) {
  const hero = state.hero;
  let kind = foe.kind === 'shaman' || foe.kind === 'slinger' ? 'bolt' : 'slash';
  let x = hero.x, y = hero.y, radius = kind === 'bolt' ? 47 : foe.boss ? 70 : 40, total = data.windup;
  let extra = [];
  if (foe.kind === 'windlord') {
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
  return { kind, x, y, radius, remaining: total, total, extra };
}
function updateEnemies(state, seconds) {
  for (const foe of state.enemies) {
    if (foe.dead || state.phase !== 'play') continue;
    const data = ENEMIES[foe.kind];
    foe.guard = Math.max(0, (foe.guard ?? 0) - seconds);
    foe.cooldown = Math.max(0, foe.cooldown - seconds);
    if (foe.telegraph) {
      foe.telegraph.remaining -= seconds;
      if (foe.telegraph.remaining > 0) continue;
      const attack = foe.telegraph;
      emit(state, 'enemyAttack', { id: foe.id, x: foe.x, y: foe.y, targetX: attack.x, targetY: attack.y,
        radius: attack.radius, kind: attack.kind, extra: attack.extra ?? [] });
      if (attack.kind === 'dash') {
        const length = distance(foe, attack), travel = Math.max(0, length - foe.radius - HERO_RADIUS - 2);
        const end = { x: foe.x + (attack.x - foe.x) / Math.max(1, length) * travel,
          y: foe.y + (attack.y - foe.y) / Math.max(1, length) * travel };
        if (validPoint(state.mapId, end.x, end.y, foe.radius) && clearLine(state.mapId, foe, end, foe.radius)) {
          foe.x = end.x; foe.y = end.y;
        }
      }
      if ([attack, ...(attack.extra ?? [])].some(mark => distance(state.hero, mark) <= mark.radius + HERO_RADIUS))
        hurtHero(state, data.attack * (attack.kind === 'slam' ? 1.3 : 1) * (1 + Math.min(4, (foe.run ?? 1) - 1) * .04), foe);
      foe.telegraph = null; foe.cooldown = data.cooldown; foe.state = 'idle';
      continue;
    }
    const d = distance(foe, state.hero);
    if (d > (foe.boss ? 650 : 380)) { foe.state = 'idle'; continue; }
    foe.facing = Math.atan2(state.hero.y - foe.y, state.hero.x - foe.x);
    if (d <= data.range && foe.cooldown <= 0) {
      foe.attacks++;
      foe.telegraph = planEnemyAttack(state, foe, data);
      foe.state = 'windup';
      emit(state, 'telegraph', { id: foe.id, x: foe.telegraph.x, y: foe.telegraph.y, radius: foe.telegraph.radius,
        duration: foe.telegraph.total, kind: foe.telegraph.kind, extra: foe.telegraph.extra });
    } else if (d > data.range * .83) {
      foe.repath -= seconds;
      if (foe.repath <= 0 || !foe.path.length) {
        foe.path = findPath(state.mapId, foe, state.hero, foe.radius); foe.repath = .6;
      }
      foe.state = follow(state, foe, foe.path, data.speed * seconds) ? 'walk' : 'idle';
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
    case 'rage': return castRage(state);
    case 'potion':
      if (state.hero.potions <= 0 || state.hero.hp >= state.hero.maxHp) return false;
      state.hero.potions--; state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 45);
      emit(state, 'heal', { x: state.hero.x, y: state.hero.y, amount: 45 }); return true;
    case 'equip': {
      const instance = state.inventory.find(entry => entry.uid === action.uid), item = ITEMS[instance?.itemId];
      if (!item?.slot) return false;
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
      else if (item.itemId === 'potion') state.hero.potions = Math.min(99, state.hero.potions + item.amount);
      else if (!addResource(state, item.itemId, item.amount)) state.inventory.push({ uid: `item-${state.nextId++}`, itemId: item.itemId });
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
          emit(state, 'chapter', { id: CHAPTER.id, stage: 'complete' });
          emit(state, 'campaignComplete', { x: state.hero.x, y: state.hero.y });
        } else talk(state, QUEST.descriptions[state.quest.stage]);
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
  if (Number.isFinite(input.aimX + input.aimY)) hero.facing = Math.atan2(input.aimY - hero.y, input.aimX - hero.x);
  if (state.pendingStrike) {
    state.pendingStrike.remaining -= seconds;
    if (state.pendingStrike.remaining <= 0) {
      const strike = state.pendingStrike;
      const foe = state.enemies.find(entry => entry.id === strike.targetId && !entry.dead);
      if (foe && distance(hero, foe) <= 88) hurtEnemy(state, foe, hero.attack, 'melee');
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
    if (foe && distance(hero, foe) > 70) {
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
  if (hero.actionTimer <= 0) hero.action = walking ? 'walk' : 'idle';
  updateArtifact(state, seconds);
  updateSkills(state, seconds);
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
