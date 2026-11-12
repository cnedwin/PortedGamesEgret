// Browser-side mode 3 rules based on kys-cpp fe4ad958, the original mode 3 simulation.
const tickMs = 1000 / 60;
const nativeBloodFrames = [13, 11, 14, 12, 10];
const waterTiles = new Set([179, 180, 181, 261, 511, 662, 663, 664, 665, 674]);
const gridNeighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const skills = ['medicine', 'fist', 'sword', 'knife', 'unusual'];
const roleItemStats = ['physicalPower', 'poison', 'medicine', 'detoxification', 'usePoison', 'attack', 'defence',
  'speed', 'fist', 'sword', 'knife', 'unusual', 'hiddenWeapon', 'knowledge', 'morality', 'antiPoison', 'attackWithPoison'];
const gearStats = ['attack', 'speed', 'medicine', 'usePoison', 'detoxification', 'fist', 'sword',
  'knife', 'unusual', 'hiddenWeapon', 'maxMp', 'iq'];
const magicSlots = 10;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(n, hi));
const length = (x, y, z = 0) => Math.hypot(x, y, z);
const distance = (a, b) => length(a.worldX - b.worldX, a.worldY - b.worldY, (a.z ?? 0) - (b.z ?? 0));
const unit = (x, y) => {
  const size = length(x, y);
  return size ? [x / size, y / size] : [0, 0];
};
const directions = [[1, -1], [1, 1], [-1, -1], [-1, 1]];
function facingOf(x, y, previous) {
  if (x >= 0 && y > 0) return 1;
  if (x > 0 && y <= 0) return 0;
  if (x < 0 && y >= 0) return 3;
  if (x <= 0 && y < 0) return 2;
  return previous;
}
const rotate = (x, y, angle) => [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)];
const levelOf = learned => clamp(Math.trunc((learned?.level ?? 0) / 100), 0, 9);
const valueAt = (values, index) => values?.[index] ?? 0;
const frameCount = (role, type) => role.fightFrames?.[type] ?? 0;
const learnedFor = (role, id) => role.learnedMagics?.find(skill => skill.id === id);

/** Match the weapon, armor and manual branches of Role::canUseItem. */
export function canUseGear(role, item) {
  if (!role || (item?.type !== 1 && item?.type !== 2)) return false;
  if (item.magicId > 0) {
    const known = learnedFor(role, item.magicId);
    if (known) return levelOf(known) < 9;
    if ((role.learnedMagics?.length ?? 0) >= magicSlots) return false;
  }
  const requirements = item.requirements ?? {};
  if (item.type === 2) {
    if ([0, 1].includes(role.mpType) && [0, 1].includes(requirements.mpType)
      && role.mpType !== requirements.mpType) return false;
    if (requirements.onlyRoleId >= 0) return requirements.onlyRoleId === role.id;
  }
  return gearStats.every(stat => {
    const needed = requirements[stat] ?? 0;
    const current = role[stat] ?? 0;
    return needed > 0 ? current >= needed : needed === 0 || current <= -needed;
  });
}

export const canPractice = (role, item) => item?.type === 2 && canUseGear(role, item);

function practiceCost(role, item) {
  if (item.type !== 2 || !Number.isFinite(item.practiceExp) || item.practiceExp < 0) return Infinity;
  const known = item.magicId > 0 ? learnedFor(role, item.magicId) : undefined;
  const index = levelOf(known);
  if (index === 9) return Infinity;
  return item.practiceExp * Math.max(1, 7 - Math.trunc((role.iq ?? 0) / 15)) * Math.max(1, index);
}

function learnBookMagic(role, id) {
  if (!(id > 0)) return false;
  const known = learnedFor(role, id);
  if (known) {
    if (levelOf(known) === 9) return false;
    known.level = (known.level ?? 0) + 100;
    known.levelIndex = levelOf(known);
    return true;
  }
  if (role.learnedMagics.length >= magicSlots) return false;
  const used = new Set(role.learnedMagics.map(magic => magic.slot));
  let slot = 0;
  while (used.has(slot)) slot++;
  role.learnedMagics.push({ id, slot, level: 0, levelIndex: 0 });
  role.learnedMagics.sort((a, b) => a.slot - b.slot);
  return true;
}

function applyItemStats(role, item) {
  for (const stat of roleItemStats) role[stat] = clamp((role[stat] ?? 0) + (item[stat] ?? 0), 0, 100);
  for (const [stat, cap] of [['hp', 'maxHp'], ['mp', 'maxMp']]) {
    role[cap] = clamp(role[cap] + (item[cap] ?? 0), 0, 999);
    role[stat] = clamp(role[stat] + (item[stat] ?? 0), 0, role[cap]);
  }
  if (item.mpType === 2) role.mpType = 2;
  if (item.attackTwice) role.attackTwice = 1;
}

function pictureOf(role) {
  const style = role.actType;
  if (style < 0 || style > 4) {
    const count = role.fightFrames?.find(value => value > 0) ?? 0;
    return count ? count * role.facing : role.facing;
  }
  let chosen = style;
  if (frameCount(role, style) <= 0) {
    for (let candidate = 0; candidate < 5; candidate++) {
      if (frameCount(role, candidate) > 0) chosen = candidate;
    }
  }
  const count = frameCount(role, chosen);
  if (!count) return role.facing;
  const offset = (role.fightFrames ?? []).slice(0, chosen).reduce((sum, value) => sum + Math.max(value, 0) * 4, 0);
  return offset + count * role.facing + clamp(role.actFrame, 0, Math.max(0, count - 2));
}

/** The war record supplies fixed allies and the positions, and TeamMenu supplies selected IDs. */
export function resolveBattleTeam({ party, fixedTeam, teamPositions, roster }, selected = party) {
  const included = new Set(selected);
  included.add(0);
  const order = [...new Set([...fixedTeam, ...party.filter(id => included.has(id))])];
  if (!order.includes(0)) order.unshift(0);
  const ids = order.slice(0, teamPositions.length);
  if (!ids.includes(0)) ids[ids.length - 1] = 0;
  const actors = new Map(roster.map(role => [role.id, role]));
  return ids.map((id, index) => {
    const role = actors.get(id);
    const [x, y] = teamPositions[index];
    if (!role) throw new Error(`Missing battle roster role ${id}.`);
    return { ...role, x, y };
  });
}

/** Fixed-tick mode 3 battle, using KYS's native grid, role and magic data. */
export function createMode3Battle(battle, { rng = Math.random, tileWidth = 18, onEvent, inventory = {} } = {}) {
  const { width, height } = battle;
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1
    || !Number.isFinite(tileWidth) || tileWidth < 1) throw new RangeError('Invalid battle dimensions');
  const earth = battle.layers?.earth;
  const buildings = battle.layers?.building;
  const offset = width * tileWidth;
  const randInt = limit => Math.floor(rng() * limit);
  const toWorld = (x, y) => [offset + (x - y) * tileWidth, (x + y) * tileWidth];
  const toGrid = (x, y) => [(x - offset + y) / (2 * tileWidth), (offset - x + y) / (2 * tileWidth)];
  const passable = (x, y) => {
    const index = x + y * width;
    return x >= 0 && y >= 0 && x < width && y < height && !(battle.blocked?.[index] || buildings?.[index] > 0)
      && !waterTiles.has(Math.trunc((earth?.[index] ?? 0) / 2));
  };
  let regions;
  const magicAt = id => battle.magics?.[id];
  const defaultMagic = magicAt(1);
  const itemAt = id => id >= 0 ? battle.items?.[id] : undefined;
  const bag = new Map(inventory instanceof Map || Array.isArray(inventory) ? inventory
    : Object.entries(inventory).map(([id, count]) => [Number(id), count]));
  const inventoryChanges = new Map();
  const active = [];
  const allies = [];
  const enemies = [];
  const projectiles = [];
  const blood = [];
  const impacts = [];
  // Visual sampling has its own stream so draw feedback cannot change combat or settlement rolls.
  let visualSeed = (battle.id ?? battle.battleId ?? 0) + 1;
  const visualSample = () => ((visualSeed = (Math.imul(visualSeed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const visualInt = limit => Math.floor(visualSample() * limit);
  const presentation = {
    freeze: 0, slow: 0, closeUp: 0, zoom: 1, shake: 0, shakeX: 0, shakeY: 0,
    focus: null, swordLight: 0, swordLightColor: 0xffffff, texts: [], blood: [], impacts: [],
  };
  const state = {
    id: battle.id ?? battle.battleId,
    roles: active, effects: [], result: null, pendingResult: null, stranded: null, canTakeControl: false,
    elapsedMs: 0, frame: 0, totalEnemies: 0, remainingEnemies: 0,
    lastEvent: null, auto: false, settlement: null, progression: [], presentation, inventoryDelta: [],
    get activeMagicName() { return equipped(controlled)?.name ?? '普通攻擊'; },
  };
  let accumulator = 0;
  let previousTab = false;
  let switchMagic = 0;
  let visualId = 0;

  function spawn(source, side, index) {
    const [worldX, worldY] = toWorld(source.x, source.y);
    const facing = source.facing ?? (side ? randInt(4) : 0);
    const [directionX, directionY] = directions[facing] ?? directions[0];
    const learnedMagics = (source.learnedMagics ?? []).map((magic, index) => ({ ...magic, slot: magic.slot ?? index }));
    const gear = [itemAt(source.weaponId), itemAt(source.armorId)];
    const role = {
      ...source, key: `${side}:${index}`, side, team: side, spawnX: source.x, spawnY: source.y,
      worldX, worldY, z: 0, facing, directionX, directionY, vx: 0, vy: 0, vz: 0,
      hp: source.maxHp, mp: source.maxMp, physicalPower: Math.max(source.physicalPower ?? 0, 90),
      poison: side ? 0 : source.poison,
      posture: 25, maxPosture: 100, cooldown: 0, breathless: 0, invincible: 0, frozen: 0, attention: 0, shake: 0,
      action: 'idle', frame: 0, picture: 0, op: -1, opCount: 0, actType: -1, actFrame: 0,
      hasAction: false, magic: null, learnedMagics, equippedMagics: [...(source.equippedMagics ?? [])],
      magicId: source.equippedMagics?.[0] ?? 0,
      attackBonus: gear.reduce((sum, item) => sum + (item?.attack ?? 0), 0),
      defenceBonus: gear.reduce((sum, item) => sum + (item?.defence ?? 0), 0),
      preActFrame: 0, walkFrames: 0, expGot: 0, damage: 0, dead: false, findingWay: false,
    };
    return role;
  }

  const team = battle.team ?? battle.roles?.filter(role => (role.side ?? role.team) === 0) ?? [];
  const enemy = battle.enemy ?? battle.roles?.filter(role => (role.side ?? role.team) === 1) ?? [];
  if (!team.length || !enemy.length) throw new Error('Mode 3 needs at least one ally and one enemy');
  allies.push(...team.map((role, index) => spawn(role, 0, index)));
  enemies.push(...enemy.map((role, index) => spawn(role, 1, index)));
  focusOn(enemies[0]);
  enemies.sort((a, b) => a.maxHp + a.attack - b.maxHp - b.attack);
  state.totalEnemies = state.remainingEnemies = enemies.length;
  active.push(enemies.shift(), ...allies);
  const player = allies.find(role => role.id === 0) ?? allies[0];
  state.player = player;
  let controlled = state.controlled = player;
  updateView();

  function walkRegion(role) {
    if (role.z > 1) return 0;
    const [x, y] = toGrid(role.worldX, role.worldY).map(Math.round);
    if (!passable(x, y)) return 0;
    if (!regions) {
      regions = new Int32Array(width * height);
      let region = 0;
      for (let index = 0; index < regions.length; index++) {
        if (regions[index] || !passable(index % width, Math.floor(index / width))) continue;
        const queue = [index];
        regions[index] = ++region;
        for (let cursor = 0; cursor < queue.length; cursor++) {
          const cell = queue[cursor];
          const x0 = cell % width;
          const y0 = Math.floor(cell / width);
          for (const [dx, dy] of gridNeighbors) {
            const nx = x0 + dx;
            const ny = y0 + dy;
            const neighbor = nx + ny * width;
            if (!passable(nx, ny) || regions[neighbor]) continue;
            regions[neighbor] = region;
            queue.push(neighbor);
          }
        }
      }
    }
    return regions[x + y * width];
  }

  function nearest(origin, side = origin.side, include) {
    let closest;
    let minimum = Infinity;
    for (const role of active) {
      if (role.side === side || role.dead || (include && !include(role))) continue;
      const range = distance(role, origin);
      if (range >= minimum) continue;
      minimum = range;
      closest = role;
    }
    return closest;
  }

  function updateStranded() {
    const livingAllies = allies.filter(role => !role.dead);
    const fighting = state.result === null && state.pendingResult === null;
    state.canTakeControl = fighting && player.dead && livingAllies.some(role => role !== controlled);
    state.stranded = null;
    if (!fighting || !livingAllies.length) return;
    const opposing = active.filter(role => role.side === 1 && !role.dead);
    const availableSlots = livingAllies.length + 1 - opposing.length;
    if (availableSlots > 0) opposing.push(...enemies.slice(0, availableSlots));
    if (!opposing.length) return;
    const allyRegions = new Set(livingAllies.map(walkRegion));
    if (allyRegions.has(0) || opposing.some(role => {
      const region = walkRegion(role);
      return !region || allyRegions.has(region);
    })) return;
    state.stranded = { allyIds: livingAllies.map(role => role.id), enemyIds: opposing.map(role => role.id) };
  }

  // The original camera follows a surviving ally. Manual handoff also leaves their cooldown and position intact.
  function takeControl(roleId) {
    if (!player.dead || state.result !== null || state.pendingResult !== null) return false;
    const next = roleId === undefined ? allies.findLast(role => !role.dead) : allies.find(role => role.id === roleId && !role.dead);
    if (!next) return false;
    controlled = state.controlled = next;
    state.auto = false;
    switchMagic = 0;
    updateStranded();
    return true;
  }

  function canMove(role, x, y, z = role.z, separation = tileWidth * 1.5) {
    if (role.z > 1) return true;
    const target = { worldX: x, worldY: y, z };
    const [gridX, gridY] = toGrid(x, y).map(value => Math.sign(value) * Math.round(Math.abs(value)));
    if (!passable(gridX, gridY)) return false;
    for (const other of active) {
      if (other === role || other.dead) continue;
      const next = distance(target, other);
      if (next < separation && distance(role, other) >= next) return false;
    }
    return true;
  }

  function move(role, x, y, z = role.z, separation = tileWidth * 1.5) {
    if (!canMove(role, x, y, z, separation)) return false;
    role.worldX = x;
    role.worldY = y;
    role.z = Math.max(0, z);
    return true;
  }

  function signal(type, role, extra = {}) {
    state.lastEvent = { type, role: role.id, key: role.key, frame: state.frame, ...extra };
    onEvent?.(state.lastEvent);
  }

  function listItems() {
    return Array.from(bag).flatMap(([id, count]) => {
      const item = itemAt(id);
      return count > 0 && (item?.type === 3 || item?.type === 4)
        ? [{ id, name: item.name, count, type: item.type, effectId: item.hiddenWeaponEffectId }]
        : [];
    });
  }

  function canUseItem(id) {
    if (state.result !== null || state.pendingResult !== null || presentation.freeze
      || controlled.dead || controlled.frozen || controlled.cooldown) return false;
    const item = Number.isSafeInteger(id) && itemAt(id);
    return (item?.type === 3 || item?.type === 4) && (bag.get(id) ?? 0) > 0;
  }

  function changeInventory(id, change) {
    const count = (bag.get(id) ?? 0) + change;
    bag.set(id, count);
    const total = (inventoryChanges.get(id) ?? 0) + change;
    if (total) inventoryChanges.set(id, total);
    else inventoryChanges.delete(id);
    state.inventoryDelta = [...inventoryChanges];
    return count;
  }

  function useItem(id) {
    if (!canUseItem(id)) return false;
    // The original mode contains the execution branch but no item-selection input.
    const item = itemAt(id);
    const actor = controlled;
    if (item.type === 3) applyItemStats(actor, item);
    else {
      let farthest;
      let range = 0;
      for (const role of active) {
        if (role.side === actor.side || role.dead) continue;
        const separation = distance(role, actor);
        if (separation <= range) continue;
        farthest = role;
        range = separation;
      }
      const [vx, vy, vz] = farthest ? [(farthest.worldX - actor.worldX) / range, (farthest.worldY - actor.worldY) / range,
        (farthest.z - actor.z) / range] : [...unit(actor.directionX, actor.directionY), 0];
      projectiles.push({ role: actor, item, effectId: item.hiddenWeaponEffectId, worldX: actor.worldX, worldY: actor.worldY,
        z: actor.z, vx: 10 * vx, vy: 10 * vy, vz: 10 * vz, frame: 0, totalFrames: 100, spent: false });
    }
    const count = changeInventory(id, -1);
    state.auto = false;
    updateView();
    signal('item', actor, { itemId: id, itemType: item.type, count, effectId: item.hiddenWeaponEffectId });
    return true;
  }

  function focusOn(role) {
    const { worldX, worldY, z, key: roleKey } = role;
    const [x, y] = toGrid(worldX, worldY);
    presentation.focus = { x, y, worldX, worldY, z, roleKey };
  }

  function setSwordLight(frames, color = 0xffffff) {
    presentation.swordLight = frames;
    presentation.swordLightColor = color;
  }

  const equipped = role => magicAt(role.learnedMagics.find(skill => skill.id === role.equippedMagics[0])?.id)
    ?? magicAt(role.learnedMagics[0]?.id);
  const property = (role, type) => role[skills[type]] ?? 0;
  const cast = op => [10, 20, 15, 2][op] ?? 0;

  function cooldown(role, op, type) {
    if (op < 0 || op > 3) return 0;
    const skill = property(role, type);
    const base = [100 - Math.trunc(skill / 2), 160 - skill, 70 - Math.trunc(skill / 2), 5][op];
    let count = Math.max([20, 45, 30, 5][op], base);
    if (role.attackTwice > 0) count = Math.max(cast(op) + 2, Math.trunc(count * 0.666));
    return count;
  }

  function begin(role, op, magic) {
    if (role === controlled && !state.auto) {
      if (op === 0 && (role.opCount >= 3 || state.frame - role.preActFrame > 60)) role.opCount = 0;
      role.opCount = role.op === op ? role.opCount + 1 : 0;
    }
    role.op = op;
    if (op === 0 || op === 5) {
      role.magic = magic;
      if (magic) role.actType = magic.magicType;
    } else if (role !== controlled || state.auto) role.magic = magic;
    role.actFrame = 0;
    role.hasAction = true;
    role.cooldown = magic ? cooldown(role, op, magic.magicType) : 0;
    if (op === 0 && role === controlled && !state.auto && role.opCount >= 3) role.cooldown *= 2;
    if (op === 0) signal('attack', role, { magicId: magic?.id });
    if (op === 3) signal('dodge', role);
  }

  function toggleAutomatic() {
    state.auto = !state.auto;
  }

  function controls(keys) {
    const pressed = code => keys.has(code);
    const tab = pressed('Tab');
    if (tab && !previousTab) toggleAutomatic();
    previousTab = tab;
    const left = pressed('KeyA') || pressed('ArrowLeft');
    const right = pressed('KeyD') || pressed('ArrowRight');
    const up = pressed('KeyW') || pressed('ArrowUp');
    const down = pressed('KeyS') || pressed('ArrowDown');
    const dx = right ? 1 : left ? -1 : 0;
    const dy = down ? 1 : up ? -1 : 0;
    const op = pressed('KeyL') ? 3 : pressed('KeyE') ? 5 : pressed('KeyI') ? 0 : -1;
    if (controlled.dead && (dx || dy || op >= 0)) takeControl();
    const actor = controlled;
    if (actor.dead || actor.frozen > 0) return;
    if ((dx || dy) && actor.cooldown === 0 && actor.breathless === 0) {
      const [dirX, dirY] = unit(dx, dy);
      const speed = Math.min(4, actor.speed / 30);
      actor.directionX = dirX;
      actor.directionY = dirY;
      actor.walkFrames++;
      move(actor, actor.worldX + speed * dirX, actor.worldY + speed * dirY);
    }
    if (switchMagic > 0) switchMagic--;
    const previousMagic = pressed('KeyQ') || pressed('ArrowLeft');
    const nextMagic = pressed('KeyF') || pressed('ArrowRight');
    if (switchMagic === 0 && actor.learnedMagics.length && (previousMagic || nextMagic)) {
      const current = equipped(actor);
      const index = actor.learnedMagics.findIndex(magic => magic.id === current?.id);
      const direction = previousMagic ? -1 : 1;
      const slot = (index + direction + actor.learnedMagics.length) % actor.learnedMagics.length;
      actor.equippedMagics[0] = actor.learnedMagics[slot].id;
      switchMagic = 20;
    }
    const magic = equipped(actor);
    actor.magicId = magic?.id ?? 0;
    if (actor.cooldown > 0) return;
    if (op >= 0) {
      state.auto = false;
      begin(actor, op, magic);
    } else {
      actor.opCount = 0;
      if (actor.op === 5) {
        actor.op = 0;
        actor.hasAction = false;
      }
    }
  }

  function advanceRole(role) {
    role.damage = 0;
    if (role.frozen > 0) role.frozen--;
    if (role.invincible > 0) role.invincible--;
    if (role.attention > 0) role.attention--;
    if (role.shake > 0) role.shake--;
    if (role.breathless > 0) role.breathless--;
    role.posture = Math.max(0, role.posture - 0.05);
    if (role.posture >= 100 && role.breathless === 0) role.breathless = role.shake = 300;
    if (!role.frozen && length(role.vx, role.vy, role.vz)) {
      if (role !== controlled && !role.dead && role.z <= 0) role.walkFrames++;
      if (!move(role, role.worldX + role.vx, role.worldY + role.vy, role.z + role.vz,
        role.op === 3 ? 1 : tileWidth * 1.5)) {
        role.vx = role.vy = role.vz = 0;
      }
      if (role.z === 0) {
        const speed = length(role.vx, role.vy);
        const friction = speed <= 0.1 ? 0 : (speed - 0.1) / speed;
        role.vx *= friction;
        role.vy *= friction;
        role.vz = 0;
      } else role.vz -= 4;
    }
    if (role.cooldown > 0) role.cooldown--;
    if (role.op !== 5 && role.cooldown === 0) {
      if (!role.dead) {
        if (state.frame % 3 === 0) role.physicalPower++;
        role.mp++;
        role.actFrame = 0;
      }
      role.actType = -1;
      role.hasAction = false;
    }
  }

  function act(role) {
    if (!role.hasAction || role.dead) return;
    if (role.cooldown === 0) {
      const target = nearest(role);
      if (target) [role.directionX, role.directionY] = unit(target.worldX - role.worldX, target.worldY - role.worldY);
    }
    if (role.actFrame === cast(role.op)) {
      role.preActFrame = state.frame;
      const magic = role.magic ?? defaultMagic;
      if (magic) {
        role.physicalPower = Math.max(0, role.physicalPower - 3);
        const learned = learnedFor(role, magic.id);
        const level = levelOf(learned);
        let mp = (magic.needMp ?? 0) * Math.trunc((level + 2) / 2);
        if (learned) {
          learned.level = clamp(Math.trunc(learned.level + rng() * 2 + 1), 0, 999);
          learned.levelIndex = levelOf(learned);
        }
        const [dx, dy] = unit(role.directionX, role.directionY);
        if (role.op === 0) {
          presentation.shake = 10;
          const target = nearest(role);
          const finishing = target?.breathless > 0;
          const [vx, vy] = finishing ? unit(target.worldX - role.worldX, target.worldY - role.worldY) : [dx, dy];
          const speed = finishing ? Math.min(10, role.speed / 15) : valueAt(magic.selectDistance ?? magic.moveDistance, level) / 2;
          if (finishing) {
            role.vx = vx * speed;
            role.vy = vy * speed;
            role.directionX = vx;
            role.directionY = vy;
          }
          projectiles.push({
            role, magic, effectId: magic.effectId, worldX: role.worldX + (finishing ? 0 : tileWidth * 2 * dx),
            worldY: role.worldY + (finishing ? 0 : tileWidth * 2 * dy), z: role.z,
            vx: vx * speed, vy: vy * speed, frame: 0, totalFrames: finishing ? 30 : 10, spent: false,
          });
          signal('cast', role, { magicId: magic.id, effectId: magic.effectId, soundId: magic.soundId });
          mp *= 0.1;
        } else if (role.op === 3) {
          const speed = Math.min(10, role.speed / 15);
          role.vx = dx * speed;
          role.vy = dy * speed;
          role.vz = 1;
          role.actType = -1;
          mp *= 0.05;
        }
        role.mp -= Math.trunc(mp);
      }
      role.magic = null;
    }
    role.actFrame = role.op === 5 ? 30 : role.actFrame + 1;
  }

  function chooseMagic(role) {
    const choices = role.learnedMagics.map(learned => ({
      magic: magicAt(learned.id),
      weight: Math.exp(valueAt(magicAt(learned.id)?.attack, levelOf(learned)) / 500),
    })).filter(choice => choice.magic);
    if (!choices.length) return undefined;
    if (choices.length === 1) return choices[0].magic;
    let selection = rng() * choices.reduce((total, choice) => total + choice.weight, 0);
    return choices.find(choice => (selection -= choice.weight) < 0)?.magic ?? choices.at(-1).magic;
  }

  // Original AI falls back to a distance layer when straight-line movement is blocked.
  function detour(role, target) {
    const [sx, sy] = toGrid(role.worldX, role.worldY).map(Math.round);
    const [tx, ty] = toGrid(target.worldX, target.worldY).map(Math.round);
    if (!passable(tx, ty)) return undefined;
    const distances = new Int16Array(width * height).fill(-1);
    const queue = [tx + ty * width];
    distances[queue[0]] = 0;
    for (let index = 0; index < queue.length; index++) {
      const cell = queue[index];
      const x = cell % width;
      const y = Math.floor(cell / width);
      if (x === sx && y === sy || distances[cell] >= 64) continue;
      for (const [dx, dy] of gridNeighbors) {
        const nx = x + dx;
        const ny = y + dy;
        const neighbor = nx + ny * width;
        if (!passable(nx, ny) || distances[neighbor] >= 0) continue;
        distances[neighbor] = distances[cell] + 1;
        queue.push(neighbor);
      }
    }
    let best;
    let smallest = Infinity;
    for (const [dx, dy] of gridNeighbors) {
      const point = toWorld(sx + dx, sy + dy);
      if (!canMove(role, ...point)) continue;
      const steps = distances[sx + dx + (sy + dy) * width];
      if (steps < 0) continue;
      const cost = steps + rng() - rng();
      if (cost >= smallest) continue;
      best = point;
      smallest = cost;
    }
    return best;
  }

  function aiTarget(role) {
    const target = nearest(role);
    if (!target || distance(role, target) <= tileWidth * 3) return target;
    const originRegion = walkRegion(role);
    const targetRegion = walkRegion(target);
    if (!originRegion || !targetRegion || originRegion === targetRegion) return target;
    return nearest(role, role.side, candidate => walkRegion(candidate) === originRegion) ?? target;
  }

  function ai(role) {
    if (role.dead || role.cooldown || role.breathless || role === controlled && !state.auto) return;
    const magic = role.magic ?? chooseMagic(role);
    role.magic = magic;
    if (magic) {
      role.equippedMagics[0] = role.magicId = magic.id;
      if (role === controlled) {
        role.hasAction = false;
        if (projectiles.some(effect => effect.role.side !== role.side && distance(role, effect) <= tileWidth * 2.1)) {
          begin(role, 5, magic);
          role.actFrame = 30;
          return;
        }
      }
    }
    const target = aiTarget(role);
    if (!target || role.hasAction) return;
    [role.directionX, role.directionY] = unit(target.worldX - role.worldX, target.worldY - role.worldY);
    const range = distance(role, target);
    const speed = role.speed / 30;
    if (range > tileWidth * 3) {
      const nextX = role.worldX + speed * role.directionX;
      const nextY = role.worldY + speed * role.directionY;
      if (!role.findingWay && canMove(role, nextX, nextY)) {
        if (rng() < 0.25 && role.speed >= 60 && magic && role !== controlled) begin(role, 3, magic);
        else {
          role.op = -1;
          role.worldX = nextX;
          role.worldY = nextY;
          role.walkFrames++;
        }
      } else if (length(role.vx, role.vy) < 0.1) {
        const path = detour(role, target);
        if (path) {
          role.findingWay = true;
          [role.directionX, role.directionY] = unit(path[0] - role.worldX, path[1] - role.worldY);
          if (rng() < 0.25 && role.speed >= 60 && magic && role !== controlled) begin(role, 3, magic);
          else {
            role.op = -1;
            role.vx = role.directionX * speed;
            role.vy = role.directionY * speed;
          }
        }
      }
      return;
    }
    role.findingWay = false;
    if (role.physicalPower < 30 || !magic) return;
    if (rng() < 0.5 && range < tileWidth * 2.5) begin(role, 0, magic);
    else if (rng() < 0.5 || role.op === 3) {
      [role.directionX, role.directionY] = rotate(role.directionX, role.directionY, Math.PI * 0.75 * (2 * rng() - 1));
      begin(role, 3, magic);
    } else {
      [role.directionX, role.directionY] = rotate(role.directionX, role.directionY, Math.PI * 0.5 * (2 * rng() - 1));
      role.vx = role.directionX * speed;
      role.vy = role.directionY * speed;
    }
  }

  function magicHurt(attacker, defender, magic) {
    let level = levelOf(learnedFor(attacker, magic.id));
    if (magic.needMp > 0) level = clamp(Math.trunc(attacker.mp / (magic.needMp * 2)) * 2 - 1, 0, level);
    let hurt;
    if (magic.hurtType === 1) hurt = valueAt(magic.hurtMp, level);
    else {
      if (attacker.mp <= 10) return 1 + randInt(10);
      hurt = attacker.attack + attacker.attackBonus + Math.trunc(valueAt(magic.attack, level) / 3)
        - defender.defence - defender.defenceBonus;
      // calRoleDistance uses the native spawn-grid role coordinates in mode 3.
      const range = Math.abs(attacker.spawnX - defender.spawnX) + Math.abs(attacker.spawnY - defender.spawnY);
      if (range > 1) hurt = Math.trunc(hurt / Math.exp((range - 1) / 10));
    }
    hurt += randInt(10) - randInt(10);
    return hurt < 10 ? 1 + randInt(10) : hurt;
  }

  function hit(effect, defender) {
    const { role: attacker, magic, item, effectId } = effect;
    let base;
    if (item) {
      // The mode 3 damage routine includes darts even though its original collision dispatcher skipped operation 4.
      const range = Math.abs(attacker.spawnX - defender.spawnX) + Math.abs(attacker.spawnY - defender.spawnY);
      const impact = (attacker.hiddenWeapon ?? 0) - (item.hp ?? 0) + randInt(10) - randInt(10);
      const distancePenalty = Math.exp(Math.trunc((range - 1) / 10));
      base = Math.trunc(Math.max(1, Math.trunc(impact / distancePenalty)) / 5);
    } else base = magicHurt(attacker, defender, magic);
    let hurt = base * (1 - 0.5 * effect.frame / effect.totalFrames);
    const event = { attacker: attacker.id, effectId, ...(item && { itemId: item.id }) };
    const [fx, fy] = unit(effect.worldX - defender.worldX, effect.worldY - defender.worldY);
    const [dx, dy] = unit(defender.directionX, defender.directionY);
    const angle = (fx || fy) && (dx || dy) ? Math.acos(clamp(fx * dx + fy * dy, -1, 1)) : 0;
    if (angle >= Math.PI * 0.75) hurt *= 2;
    else if (angle >= Math.PI * 0.25) hurt *= 1.5;
    const [kx, ky] = unit(defender.worldX - attacker.worldX, defender.worldY - attacker.worldY);
    const [vx, vy] = unit(defender.vx + kx * 2, defender.vy + ky * 2);
    const force = Math.min(2, length(defender.vx + kx * 2, defender.vy + ky * 2));
    defender.vx = vx * force;
    defender.vy = vy * force;
    if (defender.mp >= hurt / 10) defender.mp = Math.trunc(defender.mp - hurt / 10);
    if (magic && rng() < property(defender, magic.magicType) / 200) {
      if (magic.magicType === 2) attacker.cooldown = Math.trunc(attacker.cooldown * 0.5);
      if (magic.magicType === 3) hurt *= 1.5;
      if (magic.magicType === 4) {
        const [vx, vy] = unit(rng(), rng());
        defender.vx += vx;
        defender.vy += vy;
      }
    }
    hurt += 5 * (rng() - rng());
    if (hurt <= 0) hurt = 1 + rng() * 3;
    effect.spent = true;
    effect.frame = Math.max(effect.totalFrames - 15, effect.frame);
    if (magic) {
      const [x, y] = toGrid(defender.worldX, defender.worldY);
      impacts.push({ magicId: magic.id, x, y, z: defender.z, frame: state.frame });
      if (impacts.length > 24) impacts.shift();
    }
    if (defender.op !== 5) defender.hitFrame = state.frame;
    if (defender.op === 5) {
      defender.vx = defender.vy = 0;
      if (defender.opCount <= 2) {
        const posture = Math.max(75, hurt / 2);
        attacker.posture += posture;
        defender.posture = Math.max(0, defender.posture - posture / 2);
        [attacker.vx, attacker.vy] = unit(defender.directionX - attacker.directionX, defender.directionY - attacker.directionY).map(value => value * 2);
        attacker.cooldown = 30;
        setSwordLight(30);
        presentation.shake = 30;
        signal('parry', defender, { ...event, soundId: 10 });
        return;
      }
      attacker.posture += hurt * 0.01;
      defender.posture += hurt * 0.1;
      defender.damage += hurt * 0.33;
      setSwordLight(10);
      signal('guard', defender, { ...event, hurt: Math.trunc(hurt * 0.33) });
    } else if (magic?.hurtType === 1) {
      defender.mp = Math.trunc(defender.mp - hurt);
      attacker.mp = Math.trunc(attacker.mp + hurt * 0.8);
      signal('hit', defender, { ...event, mpHurt: Math.trunc(hurt) });
    } else {
      if (defender.breathless) {
        defender.damage += Math.max(hurt * 10, defender.hp + 100);
        setSwordLight(40, 0xff0000);
      } else {
        defender.damage += hurt;
        defender.posture += hurt * 0.2;
      }
      signal('hit', defender, { ...event, hurt: Math.trunc(hurt) });
    }
    attacker.expGot = Math.trunc(attacker.expGot + hurt / 2);
  }

  function advanceEffects() {
    const struck = new Set();
    for (const effect of projectiles) {
      effect.frame++;
      effect.worldX += effect.vx;
      effect.worldY += effect.vy;
      effect.z += effect.vz ?? 0;
      const target = nearest(effect, effect.role.side);
      if (target) {
        if (!effect.item) {
          const speed = length(effect.vx, effect.vy);
          const [dx, dy] = unit(target.worldX - effect.worldX, target.worldY - effect.worldY);
          [effect.vx, effect.vy] = unit(effect.vx + dx * speed / 20, effect.vy + dy * speed / 20).map(value => value * speed);
        }
        if (!effect.spent && !target.invincible && !struck.has(target) && distance(target, effect) < tileWidth * 2) {
          struck.add(target);
          presentation.shake = 5;
          hit(effect, target);
        }
      }
    }
    for (let index = projectiles.length - 1; index >= 0; index--) {
      if (projectiles[index].frame >= projectiles[index].totalFrames) projectiles.splice(index, 1);
    }
    for (let index = blood.length - 1; index >= 0; index--) {
      if (++blood[index].frame >= blood[index].totalFrames) blood.splice(index, 1);
    }
  }

  function limitExperience(role) {
    for (const stat of ['exp', 'practiceExp', 'craftingExp']) role[stat] = clamp(role[stat], 0, 99999);
  }

  function applyExperience(role, earned, training) {
    const before = role.level ?? 1;
    role.level = before;
    role.exp ??= 0;
    role.practiceExp ??= 0;
    role.craftingExp ??= 0;
    role.expGot = earned;
    if (role.level >= 30) role.practiceExp += earned;
    else if (training) {
      role.exp += Math.trunc(earned / 2);
      role.practiceExp += Math.trunc(earned / 2);
    } else role.exp += earned;
    role.craftingExp += earned;

    while (battle.levelUpExp?.length && role.level >= 1 && role.level < 30) {
      const required = battle.levelUpExp[role.level - 1] ?? 60000;
      if (required <= 0 || role.exp < required) break;
      role.exp -= required;
      role.level++;
      role.physicalPower = 100;
      role.maxHp = clamp(role.maxHp + (role.lifeGrowth ?? 0) * 3 + randInt(6), 0, 999);
      role.maxMp = clamp(role.maxMp + 20 + randInt(6), 0, 999);
      role.hp = role.maxHp;
      role.mp = role.maxMp;
      role.hurt = role.poison = 0;
      for (const stat of ['attack', 'speed', 'defence']) role[stat] = clamp((role[stat] ?? 0) + randInt(7), 0, 100);
      for (const stat of ['medicine', 'detoxification', 'usePoison']) {
        if (role[stat] > 0) role[stat] = Math.min(100, role[stat] + 1 + randInt(3));
      }
      for (const stat of ['fist', 'sword', 'knife', 'unusual', 'hiddenWeapon']) {
        if (role[stat] > 10) role[stat] = Math.min(100, role[stat] + 1 + randInt(3));
      }
      limitExperience(role);
    }
    return role.level - before;
  }

  function applyPracticeAndCrafting(role, item) {
    if (!item) return;
    let times = 0;
    for (let required = practiceCost(role, item); role.practiceExp >= required; required = practiceCost(role, item)) {
      applyItemStats(role, item);
      const learned = learnBookMagic(role, item.magicId);
      role.practiceExp -= required;
      limitExperience(role);
      times++;
      // A zero-cost manual that changes no skill would otherwise never finish on malformed data.
      if (required === 0 && !learned) break;
    }
    const progression = { roleId: role.id };
    if (times) progression.practice = { itemId: item.id, name: item.name, times, magicId: item.magicId };
    if (item.craftingItems?.length && role.craftingExp >= item.craftingExp && (bag.get(item.materialId) ?? 0) > 0) {
      const output = item.craftingItems[randInt(item.craftingItems.length)];
      changeInventory(output.id, output.count);
      changeInventory(item.materialId, -1);
      role.craftingExp = 0;
      progression.crafting = { itemId: output.id, count: output.count, materialId: item.materialId,
        bookId: item.id, bookName: item.name };
    }
    if (progression.practice || progression.crafting) state.progression.push(progression);
  }

  function finish(won, surrendered = false) {
    const base = Math.trunc((battle.exp ?? 0) / allies.length);
    state.settlement = allies.map(role => {
      let levelsGained = 0;
      if (surrendered) role.expGot = 0;
      else {
        const training = itemAt(role.practiceItemId);
        levelsGained = applyExperience(role, role.expGot + base, training);
        applyPracticeAndCrafting(role, training);
      }
      const { id, hp, maxHp, mp, maxMp, physicalPower, expGot, exp, level, practiceExp, craftingExp, hurt, poison,
        attack, speed, defence, medicine, detoxification, usePoison, fist, sword, knife, unusual, hiddenWeapon,
        mpType, attackTwice, knowledge, morality, antiPoison, attackWithPoison } = role;
      return { id, hp, maxHp, mp, maxMp, physicalPower, expGot, exp, level, levelsGained, practiceExp, craftingExp, hurt, poison,
        attack, speed, defence, medicine, detoxification, usePoison, fist, sword, knife, unusual, hiddenWeapon,
        mpType, attackTwice, knowledge, morality, antiPoison, attackWithPoison,
        equippedMagics: [...role.equippedMagics], learnedMagics: role.learnedMagics.map(magic => ({ ...magic })) };
    });
    state.result = won;
    updateStranded();
    signal('result', player, { won, surrendered });
  }

  function recordHit(role, hurt) {
    const text = `-${hurt}`;
    const key = visualId++;
    presentation.texts.push({ key, text, size: 30, color: role.side ? 0xffffff : 0xff1414, frame: 0,
      worldX: role.worldX - 7.5 * text.length, worldY: role.worldY - 50 });
    const style = visualInt(nativeBloodFrames.length);
    blood.push({ key, group: `eft/bld00${style}`, role, frame: 0, totalFrames: nativeBloodFrames[style] });
  }

  function knockOut(role, hurt) {
    role.dead = true;
    role.defeatFrame = state.frame;
    role.hp = 0;
    const magnitude = length(role.vx, role.vy, role.vz);
    if (magnitude) {
      role.vx *= 15 / magnitude;
      role.vy *= 15 / magnitude;
    }
    role.vz = 12;
    const launch = Math.min(hurt / 2, 30) / length(role.vx, role.vy, role.vz);
    role.vx *= launch;
    role.vy *= launch;
    role.vz *= launch;
    role.frozen = 5;
    presentation.shakeX = visualInt(2) - visualInt(2);
    presentation.shakeY = visualInt(2) - visualInt(2);
    focusOn(role);
    Object.assign(presentation, { freeze: 5, shake: 10, slow: 10, closeUp: 30 });
    signal('defeat', role);
  }

  function updateView() {
    for (const role of active) {
      [role.x, role.y] = toGrid(role.worldX, role.worldY);
      role.facing = facingOf(role.directionX, role.directionY, role.facing);
      role.action = role.dead ? 'dead' : role.breathless ? 'stagger' : role.op === 5 ? 'guard'
        : role.hasAction && role.op === 0 ? 'attack' : role.hasAction && role.op === 3 ? 'dodge'
          : role.walking ? 'walk' : 'idle';
      role.frame = role.actType < 0 ? Math.floor(role.walkFrames / 5) : role.actFrame;
      role.picture = pictureOf(role);
      role.rotation = role.dead ? (role.facing >= 2 ? 90 : 270) : 0;
      role.alpha = (255 - 4 * role.attention) / 255;
      role.shakeX = state.pendingResult === null && role.shake ? visualSample() * 5 - 2.5 : 0;
    }
    state.target = nearest(controlled) ?? null;
    state.effects = projectiles.map(effect => {
      const [x, y] = toGrid(effect.worldX, effect.worldY);
      return { effectId: effect.effectId, x, y, worldX: effect.worldX, worldY: effect.worldY, z: effect.z,
        frame: effect.frame, totalFrames: effect.totalFrames,
        magicId: effect.magic?.id,
        angle: Math.atan2(effect.vy / 2, effect.vx) * 180 / Math.PI,
        side: effect.role.side, ...(effect.item && { itemId: effect.item.id }) };
    });
    presentation.zoom = presentation.closeUp ? 2 : 1;
    presentation.blood = blood.map(({ role, key, group, frame, totalFrames }) => ({ key, group, frame, totalFrames,
      x: role.x, y: role.y, z: role.z, alpha: 1 - frame / (1.25 * totalFrames) }));
    while (impacts.length && state.frame - impacts[0].frame >= 12) impacts.shift();
    presentation.impacts = impacts.map(impact => ({ ...impact, alpha: 1 - (state.frame - impact.frame) / 12 }));
    updateStranded();
  }

  function simulate() {
    for (const role of active) advanceRole(role);
    for (const role of active) act(role);
    for (const role of active) ai(role);
    advanceEffects();
    for (const role of active) {
      const hurt = Math.trunc(role.damage);
      if (hurt > 0) {
        recordHit(role, hurt);
        role.hp -= hurt;
        if (!role.dead && role.hp <= 0) knockOut(role, hurt);
      }
      role.hp = clamp(role.hp, 0, role.maxHp);
      role.mp = clamp(role.mp, 0, role.maxMp);
      role.physicalPower = clamp(role.physicalPower, 0, 100);
      role.posture = clamp(role.posture, 0, 101);
    }
    presentation.texts = presentation.texts.filter(text => ++text.frame < 30);
    for (const text of presentation.texts) {
      text.worldY -= 2;
      [text.x, text.y] = toGrid(text.worldX, text.worldY);
    }

    const liveAllies = allies.filter(role => !role.dead).length;
    const liveEnemies = active.filter(role => role.side === 1 && !role.dead).length;
    if (liveEnemies < liveAllies + 1 && enemies.length) {
      const entrant = enemies.shift();
      entrant.cooldown = entrant.invincible = entrant.attention = 30;
      active.push(entrant);
      signal('spawn', entrant);
    }
    state.remainingEnemies = enemies.length + active.filter(role => role.side === 1 && !role.dead).length;
    if (state.pendingResult === null && (!liveAllies || !state.remainingEnemies)) {
      state.pendingResult = Boolean(liveAllies);
      Object.assign(presentation, { closeUp: 60, freeze: 60, slow: 30, shake: 60 });
    }
    if (state.pendingResult !== null && presentation.slow === 0) finish(state.pendingResult);
  }

  function tick(keys) {
    state.frame++;
    state.elapsedMs = state.frame * tickMs;
    if (presentation.shake > 0) {
      presentation.shakeX = visualInt(3) - visualInt(3);
      presentation.shakeY = visualInt(3) - visualInt(3);
      presentation.shake--;
    }
    if (presentation.freeze > 0) presentation.freeze--;
    else {
      if (presentation.closeUp > 0) presentation.closeUp--;
      if (presentation.swordLight > 0) presentation.swordLight--;
      if (!presentation.closeUp) {
        const focus = controlled.dead ? allies.findLast(role => !role.dead) : controlled;
        if (focus) focusOn(focus);
      }
      for (const role of active) { role.lastWorldX = role.worldX; role.lastWorldY = role.worldY; }
      controls(keys);
      // Native mode 3 applies input before its quarter-speed simulation gate.
      if (!presentation.slow || state.frame % 4 === 0) {
        if (presentation.slow > 0) presentation.slow--;
        simulate();
      }
      for (const role of active) role.walking = role.lastWorldX !== role.worldX || role.lastWorldY !== role.worldY;
    }
    updateView();
  }

  return {
    state, listItems, canUseItem, useItem, takeControl, toggleAutomatic,
    step(deltaMs, keys = new Set()) {
      if (state.result !== null || !Number.isFinite(deltaMs) || deltaMs <= 0) return state;
      accumulator += Math.min(deltaMs, 250);
      while (accumulator + 1e-6 >= tickMs && state.result === null) {
        accumulator -= tickMs;
        tick(keys);
      }
      return state;
    },
    surrender() {
      if (state.result === null && state.pendingResult === null) finish(false, true);
      return state.result;
    },
  };
}
