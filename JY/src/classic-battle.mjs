import { applyItemStats, battleRoleSnapshot, createBattleProgression } from './battle-progression.mjs';

// Grid, turn and action rules from kys-cpp fe4ad958, BattleScene and BattleMenu.
const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const waterTiles = new Set([179, 180, 181, 261, 511, 662, 663, 664, 665, 674]);
const supportActions = {
  poison: { stat: 'usePoison', minimum: 30, cost: 3, effectId: 30, allied: false },
  detox: { stat: 'detoxification', minimum: 30, cost: 5, effectId: 36, allied: true },
  medicine: { stat: 'medicine', minimum: 10, cost: 5, effectId: 0, allied: true },
};
const bloodFrames = [13, 11, 14, 12, 10];
const frameMs = 1000 / 60;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const sameCell = (a, b) => a.x === b.x && a.y === b.y;
const rank = learned => clamp(Math.trunc((learned?.level ?? 0) / 100), 0, 9);
const actionRange = stat => Math.trunc((stat ?? 0) / 15) + 1;
const arrayValue = (values, index) => values?.[index] ?? 0;
const manaCost = (magic, index) => (magic.needMp ?? 0) * Math.trunc((index + 2) / 2);
const bySpeed = (a, b) => (b.speed ?? 0) - (a.speed ?? 0) || b.id - a.id || b.x - a.x || b.y - a.y;
const active = role => !role.dead;

function face(role, x, y) {
  const dx = x - role.x, dy = y - role.y;
  if (Math.abs(dx) > Math.abs(dy)) role.facing = dx > 0 ? 1 : 2;
  else if (dy) role.facing = dy > 0 ? 3 : 0;
}

function pictureOf(role) {
  const frames = role.fightFrames ?? [];
  const style = role.actType;
  if (style < 0 || !frames[style]) return (frames.find(count => count > 0) ?? 1) * role.facing;
  const offset = frames.slice(0, style).reduce((sum, count) => sum + count * 4, 0);
  return offset + frames[style] * role.facing + Math.min(role.actFrame, frames[style] - 1);
}

export function resolveClassicTeam({ party, autoTeamMate, fixedTeam, roster, teamPositions }, selected = party) {
  const fixed = autoTeamMate?.[0] >= 0 ? autoTeamMate.filter(id => id >= 0) : fixedTeam;
  const selectedIds = new Set(selected);
  const ids = fixed?.length ? fixed : party.filter(id => selectedIds.has(id));
  return [...new Set(ids)].slice(0, teamPositions.length).map((id, index) => {
    const role = roster.find(entry => entry.id === id);
    if (!role) throw new Error('Missing battle roster role ' + id);
    const [x, y] = teamPositions[index];
    return { ...role, x, y };
  });
}

/** A single actor at a time, with movement and action on the original battlefield grid. */
export function createClassicBattle(battle, { rng = Math.random, tileWidth = 18, onEvent, inventory = {}, getExp = false } = {}) {
  const { width, height } = battle;
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1
    || !Number.isFinite(tileWidth) || tileWidth < 1) throw new RangeError('Invalid battle dimensions');
  const bag = new Map(inventory instanceof Map || Array.isArray(inventory) ? inventory
    : Object.entries(inventory).map(([id, count]) => [Number(id), count]));
  const inventoryChanges = new Map();
  const randInt = limit => Math.floor(rng() * limit);
  const itemAt = id => id >= 0 ? battle.items?.[id] : undefined;
  const magicAt = id => id > 0 ? battle.magics?.[id] : undefined;
  const indexOf = (x, y) => x + y * width;
  const inside = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < width && y < height;
  const cellAt = index => ({ x: index % width, y: Math.floor(index / width) });
  const positions = role => {
    role.worldX = (width + role.x - role.y) * tileWidth;
    role.worldY = (role.x + role.y) * tileWidth;
  };

  function spawn(source, side, index) {
    const maxHp = source.maxHp ?? source.hp ?? 1;
    const maxMp = source.maxMp ?? source.mp ?? 0;
    const role = {
      ...source, key: side + ':' + index, side, team: side, maxHp, maxMp,
      hp: side ? maxHp : clamp(source.hp ?? maxHp, Math.trunc(maxHp / 10), maxHp),
      mp: side ? maxMp : clamp(source.mp ?? maxMp, Math.trunc(maxMp / 10), maxMp),
      physicalPower: side ? Math.max(source.physicalPower ?? 0, 90) : source.physicalPower ?? 100,
      poison: side ? 0 : source.poison ?? 0,
      facing: source.facing ?? 0, z: 0, alpha: 1, rotation: 0, shakeX: 0,
      posture: 0, maxPosture: 100, action: 'idle', actFrame: 0, actType: -1, walkFrames: 0,
      moved: false, dead: false, expGot: 0, learnedMagics: (source.learnedMagics ?? []).map((skill, slot) => ({ slot, ...skill })),
      equippedMagics: [...(source.equippedMagics ?? [])], carriedItems: (source.carriedItems ?? []).map(item => ({ ...item })),
    };
    positions(role);
    role.picture = pictureOf(role);
    return role;
  }

  const allies = battle.team.map((source, index) => spawn(source, 0, index));
  const enemies = battle.enemy.map((source, index) => spawn(source, 1, index));
  const roles = [...allies, ...enemies];
  const player = allies.find(role => role.id === 0) ?? allies[0];
  const presentation = {
    freeze: 0, slow: 0, closeUp: 0, zoom: 1, shake: 0, shakeX: 0, shakeY: 0,
    focus: player ?? enemies[0] ?? { x: 0, y: 0 }, swordLight: 0, swordLightColor: 0xffffff,
    texts: [], blood: [], impacts: [],
  };
  const state = {
    id: battle.id ?? battle.battleId, roles, player, turn: null, round: 0, controlled: player,
    selection: null, selectedMagicId: null, effects: [], result: null, pendingResult: null,
    elapsedMs: 0, frame: 0, totalEnemies: enemies.length, remainingEnemies: enemies.length,
    lastEvent: null, auto: false, settlement: null, progression: [], presentation, inventoryDelta: [],
    get canAct() { return this.result === null && this.pendingResult === null && !animation && this.turn?.side === 0 && !this.auto; },
    get moveRange() { return this.turn ? moveRange(this.turn) : 0; },
    get activeMagicName() { return magicAt(this.selectedMagicId)?.name ?? '武學'; },
  };
  const { applyExperience, applyPracticeAndCrafting } = createBattleProgression(battle, {
    randInt, bag, changeInventory, progression: state.progression,
  });
  let order = [];
  let animation;
  let computerPlan;
  let selectedPath;
  let visualId = 0;

  function emit(type, actor, details = {}) {
    state.lastEvent = { type, role: actor?.id, key: actor?.key, frame: state.frame, ...details };
    onEvent?.(state.lastEvent);
  }

  function gear(role, stat) {
    return [role.weaponId, role.armorId].reduce((sum, id) => sum + (itemAt(id)?.[stat] ?? 0), role[stat] ?? 0);
  }

  function moveRange(role) {
    return role.moved || role.physicalPower < 10 ? 0 : Math.max(0, actionRange(gear(role, 'speed')));
  }

  function nearest(origin, candidates) {
    return candidates.reduce((best, role) => !best || distance(origin, role) < distance(origin, best) ? role : best, null);
  }

  function moveArea(role, start = role, range = moveRange(role), stopNearEnemy = true) {
    const origin = indexOf(start.x, start.y);
    const frontier = [{ ...cellAt(origin), index: origin, previous: null, steps: 0 }];
    const reached = new Map([[origin, frontier[0]]]);
    const occupants = new Set(roles.filter(unit => active(unit) && unit !== role).map(unit => indexOf(unit.x, unit.y)));
    const opposition = roles.filter(unit => active(unit) && unit.side !== role.side);
    for (let i = 0; i < frontier.length; i++) {
      const cell = frontier[i];
      if (cell.steps >= range || stopNearEnemy && cell.steps > 0 && opposition.some(enemy => distance(enemy, cell) <= 1)) continue;
      for (const [dx, dy] of neighbors) {
        const x = cell.x + dx, y = cell.y + dy;
        const index = indexOf(x, y);
        if (!inside(x, y) || reached.has(index) || occupants.has(index) || battle.blocked?.[index]
          || battle.layers?.building?.[index] > 0 || waterTiles.has(Math.trunc((battle.layers?.earth?.[index] ?? 0) / 2))) continue;
        const next = { x, y, index, previous: cell, steps: cell.steps + 1 };
        reached.set(index, next);
        frontier.push(next);
      }
    }
    return reached;
  }

  function magicOptions(role = state.turn) {
    return (role?.learnedMagics ?? []).flatMap(learned => {
      const magic = magicAt(learned.id);
      const levelIndex = rank(learned);
      return magic ? [{ id: magic.id, name: magic.name, level: levelIndex + 1, levelIndex, needMp: manaCost(magic, levelIndex) }] : [];
    });
  }

  function stock(role, id) {
    return role.side ? role.carriedItems.find(item => item.id === id)?.count ?? 0 : bag.get(id) ?? 0;
  }

  function listItems(role = state.turn?.side === 0 ? state.turn : player) {
    if (!role) return [];
    const inventory = role.side ? role.carriedItems.map(item => [item.id, item.count]) : bag;
    return Array.from(inventory, ([id, count]) => {
      const item = itemAt(id);
      return count > 0 && (item?.type === 3 || item?.type === 4)
        ? { id, name: item.name, count, type: item.type, effectId: item.hiddenWeaponEffectId } : null;
    }).filter(Boolean);
  }

  function actions(role = state.turn) {
    if (!role) return [];
    const list = [];
    if (moveRange(role)) list.push('move');
    if (role.physicalPower >= 20 && magicOptions(role).length) list.push('magic');
    for (const [type, action] of Object.entries(supportActions)) {
      if (role[action.stat] > 0 && role.physicalPower >= action.minimum) list.push(type);
    }
    const items = listItems(role);
    if (role.hiddenWeapon > 15 && role.physicalPower >= 10 && items.some(item => item.type === 4)) list.push('dart');
    if (items.some(item => item.type === 3)) list.push('drug');
    return [...list, 'status', 'auto', 'rest'];
  }

  function cellsIn(x, y, range, filter) {
    const cells = [];
    for (let ix = Math.max(0, x - range); ix <= Math.min(width - 1, x + range); ix++) {
      for (let iy = Math.max(0, y - range); iy <= Math.min(height - 1, y + range); iy++) {
        const cell = { x: ix, y: iy };
        if (filter(cell)) cells.push(cell);
      }
    }
    return cells;
  }

  function magicCells(origin, magic, level) {
    const range = Math.max(0, arrayValue(magic.selectDistance, level));
    if (magic.attackArea === 2) return [{ x: origin.x, y: origin.y }];
    return cellsIn(origin.x, origin.y, range, cell => magic.attackArea === 1
      ? !sameCell(origin, cell) && (cell.x === origin.x || cell.y === origin.y) : distance(origin, cell) <= range);
  }

  function magicEffects(origin, target, magic, level) {
    const range = Math.max(0, arrayValue(magic.selectDistance, level));
    if (magic.attackArea === 1) return cellsIn(origin.x, origin.y, range, cell => {
      const dx = target.x - origin.x, dy = target.y - origin.y;
      return dx ? cell.y === origin.y && Math.sign(cell.x - origin.x) === Math.sign(dx)
        : cell.x === origin.x && Math.sign(cell.y - origin.y) === Math.sign(dy);
    });
    if (magic.attackArea === 2) return cellsIn(origin.x, origin.y, range, cell => cell.x === origin.x || cell.y === origin.y);
    if (magic.attackArea === 3) return cellsIn(target.x, target.y, Math.max(0, arrayValue(magic.attackDistance, level)), () => true);
    return [target];
  }

  function rangeCells(origin, stat) {
    const range = actionRange(stat);
    return cellsIn(origin.x, origin.y, range, cell => distance(origin, cell) <= range);
  }

  function setTurn() {
    computerPlan = null;
    state.selection = null;
    if (!order.length) {
      order = roles.filter(active).sort(bySpeed);
      state.round++;
      for (const role of order) role.moved = false;
    }
    const actor = state.turn = order[0] ?? null;
    if (!actor) return;
    state.controlled = actor;
    state.target = nearest(actor, roles.filter(role => active(role) && role.side !== actor.side));
    if (state.target) face(actor, state.target.x, state.target.y);
    actor.picture = pictureOf(actor);
    presentation.focus = actor;
    const magics = magicOptions(actor);
    state.selectedMagicId = (magics.find(magic => magic.id === actor.selectedMagicId) ?? magics[0])?.id ?? null;
    emit('turn', actor, { round: state.round });
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

  function consume(actor, id) {
    if (!actor.side) return changeInventory(id, -1);
    const carried = actor.carriedItems.find(item => item.id === id);
    return --carried.count;
  }

  function floatText(target, value, color, size = 25) {
    const text = String(value);
    presentation.texts.push({ key: visualId++, text, color, size, frame: 0,
      x: target.x - (47 + 6 * text.length) / (2 * tileWidth),
      y: target.y - (47 - 6 * text.length) / (2 * tileWidth) });
  }

  function hit(actor, target, hurt, details) {
    const lost = Math.min(target.hp, hurt);
    target.hp -= lost;
    target.hitFrame = state.frame;
    floatText(target, '-' + lost, 0xff6868);
    const style = visualId % bloodFrames.length;
    presentation.blood.push({ key: visualId++, group: 'eft/bld00' + style, x: target.x, y: target.y, z: 0,
      alpha: 1, frame: 0, totalFrames: bloodFrames[style] });
    if (details.magicId !== undefined) presentation.impacts.push({ ...details, x: target.x, y: target.y, z: 0, alpha: 1 });
    emit('hit', target, { attacker: actor.id, hurt: lost, ...details });
    if (target.hp > 0) return;
    target.dead = true;
    target.action = 'dead';
    target.defeatFrame = state.frame;
    state.remainingEnemies = enemies.filter(active).length;
    emit('defeat', target);
  }

  function damage(actor, target, magic, origin = actor) {
    const known = rank(actor.learnedMagics.find(skill => skill.id === magic.id));
    const need = magic.needMp ?? 0;
    const level = need <= 0 ? known : clamp(Math.trunc(actor.mp / (need * 2)) * 2 - 1, 0, known);
    let value = 0;
    if (magic.hurtType === 1) value = arrayValue(magic.hurtMp, level);
    else if (magic.hurtType === 0) {
      if (actor.mp <= 10) return 1 + randInt(10);
      value = gear(actor, 'attack') + Math.trunc(arrayValue(magic.attack, level) / 3) - gear(target, 'defence');
      const gap = distance(origin, target);
      if (gap > 1) value = Math.trunc(value / Math.exp((gap - 1) / 10));
    } else return 0;
    value += randInt(10) - randInt(10);
    return value < 10 ? 1 + randInt(10) : value;
  }

  function dartDamage(actor, target, item, origin = actor) {
    const value = (actor.hiddenWeapon ?? 0) - (item.hp ?? 0) + randInt(10) - randInt(10);
    return Math.max(1, Math.trunc(value / Math.exp(Math.trunc((distance(origin, target) - 1) / 10))));
  }

  function markEffect(actor, cells, details) {
    if (details.effectId >= 0) state.effects = cells.map(cell => ({ ...cell, z: 0, side: actor.side, frame: 0, totalFrames: 26, ...details }));
  }

  function finish(won, surrendered = false) {
    const eligible = surrendered || !won && !getExp ? [] : won ? allies.filter(active) : allies;
    const base = eligible.length ? Math.trunc((battle.exp ?? 0) / eligible.length) : 0;
    state.settlement = allies.map(role => {
      let levelsGained = 0;
      if (eligible.includes(role)) {
        const book = itemAt(role.practiceItemId);
        levelsGained = applyExperience(role, role.expGot + base, book);
        applyPracticeAndCrafting(role, book);
      } else role.expGot = 0;
      return battleRoleSnapshot(role, levelsGained);
    });
    state.selection = null;
    state.pendingResult = won;
    state.result = won;
    emit('result', player, { won, surrendered });
  }

  function finishTurn(actor) {
    if (active(actor)) {
      actor.poison = clamp(actor.poison - (actor.antiPoison ?? 0), 0, 100);
      const amount = Math.min(Math.max(0, actor.hp - 1), Math.trunc(actor.poison / 3));
      if (amount) {
        actor.hp -= amount;
        floatText(actor, '-' + amount, 0x8eea8a);
      }
    }
    order.shift();
    order = order.filter(active);
    if (!allies.some(active) || !enemies.some(active)) finish(allies.some(active));
    else setTurn();
  }

  function animate(actor, duration, options = {}) {
    animation = { actor, duration, elapsed: 0, ...options };
  }

  function performMove(actor, destination, reachable) {
    const path = [];
    for (let cursor = reachable.get(indexOf(destination.x, destination.y)); cursor?.previous; cursor = cursor.previous) path.unshift(cursor);
    if (!path.length) return false;
    actor.moved = true;
    actor.physicalPower = Math.max(0, actor.physicalPower - 2);
    actor.expGot++;
    actor.action = 'walk';
    actor.walkFrames = 0;
    face(actor, path[0].x, path[0].y);
    const route = [{ x: actor.x, y: actor.y }, ...path];
    animate(actor, Math.min(660, 115 * path.length), {
      update(progress) {
        const travelled = progress * path.length;
        const index = Math.min(path.length - 1, Math.floor(travelled));
        const [from, to] = [route[index], route[index + 1]];
        const part = travelled - index;
        actor.x = from.x + (to.x - from.x) * part;
        actor.y = from.y + (to.y - from.y) * part;
        const direction = { x: from.x, y: from.y, facing: actor.facing };
        face(direction, to.x, to.y);
        actor.facing = direction.facing;
        positions(actor);
        actor.walkFrames = Math.floor(progress * animation.duration / frameMs);
      },
    });
    emit('move', actor, { x: destination.x, y: destination.y });
    return true;
  }

  function performMagic(actor, target, id) {
    const magic = magicAt(id);
    const learned = actor.learnedMagics.find(skill => skill.id === id);
    const cells = magicEffects(actor, target, magic, rank(learned));
    const area = new Set(cells.map(cell => indexOf(cell.x, cell.y)));
    const opponents = roles.filter(role => active(role) && role.side !== actor.side && area.has(indexOf(role.x, role.y)));
    const details = { magicId: id, effectId: magic.effectId, soundId: magic.soundId };
    const strikes = [];
    const count = actor.attackTwice > 0 ? 2 : 1;
    actor.selectedMagicId = state.selectedMagicId = id;
    face(actor, target.x, target.y);
    // Native combat computes both strikes against pre-animation HP, then removes knockouts between animations.
    for (let i = 0; i < count; i++) {
      actor.physicalPower = Math.max(0, actor.physicalPower - 3);
      actor.mp = Math.max(0, actor.mp - manaCost(magic, rank(learned)));
      const impacts = [];
      for (const opponent of opponents) {
        const amount = damage(actor, opponent, magic);
        if (amount <= 0) continue;
        if (magic.hurtType === 1) {
          const lost = Math.min(opponent.mp, amount);
          opponent.mp -= lost;
          actor.mp = Math.min(actor.maxMp, actor.mp + amount);
          actor.expGot += Math.trunc(lost / 2);
          impacts.push({ opponent, amount: lost });
        } else {
          const lost = Math.min(opponent.hp, amount);
          actor.expGot += lost + (lost === opponent.hp ? Math.trunc(lost / 2) : 0);
          impacts.push({ opponent, amount });
        }
      }
      strikes.push(impacts);
      learned.level = Math.min(999, (learned.level ?? 0) + 1 + randInt(2));
      learned.levelIndex = rank(learned);
    }
    function strike(index) {
      actor.action = 'attack';
      actor.actType = magic.magicType ?? 0;
      actor.actFrame = 0;
      emit('cast', actor, details);
      animate(actor, 570, {
        impact() {
          markEffect(actor, cells, details);
          for (const { opponent, amount } of strikes[index]) {
            if (!active(opponent)) continue;
            if (magic.hurtType === 1) {
              floatText(opponent, '-' + amount, 0xb68bfa);
              emit('hit', opponent, { attacker: actor.id, mpHurt: amount, ...details });
            } else hit(actor, opponent, amount, details);
          }
        },
        done() {
          if (index + 1 < strikes.length) strike(index + 1);
          else finishTurn(actor);
        },
      });
    }
    strike(0);
  }

  function performSupport(actor, target, type) {
    const action = supportActions[type];
    face(actor, target.x, target.y);
    actor.physicalPower = Math.max(0, actor.physicalPower - action.cost);
    actor.action = 'attack';
    actor.actType = 0;
    animate(actor, 420, {
      impact() {
        markEffect(actor, [target], { effectId: action.effectId });
        const recipient = roles.find(role => active(role) && (role.side === actor.side) === action.allied && sameCell(role, target));
        if (!recipient) return;
        let amount;
        if (type === 'medicine') {
          amount = Math.min(actor.medicine, recipient.maxHp - recipient.hp);
          recipient.hp += amount;
        } else {
          const before = recipient.poison;
          recipient.poison = clamp(before + (type === 'poison' ? 1 : -1) * Math.trunc(actor[action.stat] / 3), 0, 100);
          amount = recipient.poison - before;
        }
        actor.expGot += amount;
        floatText(recipient, (amount > 0 ? '+' : '') + amount, 0x9eeacb);
        emit(type, actor, { target: recipient.id, amount, effectId: action.effectId });
      },
      done: () => finishTurn(actor),
    });
  }

  function performItem(actor, id, target) {
    const item = itemAt(id);
    const count = consume(actor, id);
    emit('item', actor, { itemId: id, count, itemType: item.type, name: item.name });
    if (item.type === 3) {
      const before = actor.hp;
      applyItemStats(actor, item);
      floatText(actor, actor.hp > before ? '+' + (actor.hp - before) : item.name ?? '', 0x9eeacb);
      animate(actor, 350, { done: () => finishTurn(actor) });
      return;
    }
    const details = { itemId: id, effectId: item.hiddenWeaponEffectId };
    face(actor, target.x, target.y);
    actor.physicalPower = Math.max(0, actor.physicalPower - 5);
    actor.action = 'attack';
    actor.actType = 0;
    animate(actor, 450, {
      impact() {
        markEffect(actor, [target], details);
        const opponent = roles.find(role => active(role) && role.side !== actor.side && sameCell(role, target));
        if (opponent) {
          const hurt = dartDamage(actor, opponent, item);
          actor.expGot += hurt;
          hit(actor, opponent, hurt, details);
        }
      },
      done: () => finishTurn(actor),
    });
  }

  function performRest(actor) {
    actor.physicalPower = Math.min(100, actor.physicalPower + 5);
    actor.hp = Math.min(actor.maxHp, actor.hp + Math.trunc(actor.maxHp * .05));
    actor.mp = Math.min(actor.maxMp, actor.mp + Math.trunc(actor.maxMp * .05));
    emit('rest', actor);
    animate(actor, 180, { done: () => finishTurn(actor) });
  }

  function cancelSelection() {
    if (!state.selection) return false;
    state.selection = null;
    selectedPath = null;
    return true;
  }

  function selectAction(type, id) {
    if (!state.canAct || !actions().includes(type)) return false;
    const actor = state.turn;
    if (type === 'auto') return setAuto(true);
    if (type === 'rest') {
      cancelSelection();
      performRest(actor);
      return true;
    }
    let cells;
    if (type === 'move') {
      selectedPath = moveArea(actor);
      cells = [...selectedPath.values()].filter(cell => cell.steps > 0).map(({ x, y }) => ({ x, y }));
    } else if (type === 'magic') {
      id ??= state.selectedMagicId;
      const entry = magicOptions(actor).find(magic => magic.id === id);
      if (!entry) return false;
      actor.selectedMagicId = state.selectedMagicId = id;
      cells = magicCells(actor, magicAt(id), entry.levelIndex);
    } else if (type === 'drug' || type === 'dart') {
      const item = itemAt(id);
      if (item?.type !== (type === 'drug' ? 3 : 4) || stock(actor, id) <= 0) return false;
      if (type === 'drug') {
        cancelSelection();
        performItem(actor, id);
        return true;
      }
      cells = rangeCells(actor, actor.hiddenWeapon);
    } else if (type === 'status') {
      cells = roles.filter(active).map(({ x, y }) => ({ x, y }));
    } else cells = rangeCells(actor, actor[supportActions[type].stat]);
    state.selection = { type, id, cells };
    return true;
  }

  function selectCell(x, y) {
    const selection = state.selection;
    const target = { x, y };
    if (!state.canAct || !selection?.cells.some(cell => sameCell(cell, target))) return false;
    const actor = state.turn;
    const path = selectedPath;
    cancelSelection();
    if (selection.type === 'move') return performMove(actor, target, path);
    if (selection.type === 'status') {
      state.inspected = roles.find(role => active(role) && sameCell(role, target));
      return true;
    }
    if (selection.type === 'magic') performMagic(actor, target, selection.id);
    else if (selection.type === 'dart') performItem(actor, selection.id, target);
    else performSupport(actor, target, selection.type);
    return true;
  }

  function selectMagic(direction) {
    const magics = magicOptions();
    if (!state.canAct || !magics.length || !Number.isInteger(direction)) return false;
    const index = magics.findIndex(magic => magic.id === state.selectedMagicId);
    const next = magics[(Math.max(0, index) + Math.sign(direction) + magics.length) % magics.length];
    state.turn.selectedMagicId = state.selectedMagicId = next.id;
    if (state.selection?.type === 'magic') selectAction('magic', next.id);
    return true;
  }

  function canUseItem(id) {
    const item = itemAt(id);
    const action = item?.type === 3 ? 'drug' : item?.type === 4 ? 'dart' : '';
    return Boolean(state.canAct && actions().includes(action) && stock(state.turn, id) > 0);
  }

  function useItem(id, x, y) {
    if (!canUseItem(id)) return false;
    const action = itemAt(id).type === 3 ? 'drug' : 'dart';
    return selectAction(action, id) && (action === 'drug' || x === undefined || selectCell(x, y));
  }

  function setAuto(enabled) {
    if (state.result !== null || state.pendingResult !== null) return false;
    state.auto = Boolean(enabled);
    cancelSelection();
    if (!state.auto && state.turn?.side === 0) computerPlan = null;
    return true;
  }

  function planComputer(actor) {
    const other = roles.filter(role => active(role) && role.side !== actor.side);
    const friendly = roles.filter(role => active(role) && role.side === actor.side);
    const target = nearest(actor, other);
    const reachable = moveArea(actor);
    const choices = [...reachable.values()].sort((a, b) => a.x - b.x || a.y - b.y);
    const origin = reachable.get(indexOf(actor.x, actor.y));
    const available = actions(actor);
    let best = { type: 'rest', from: origin, score: 0 };
    const offer = (type, score, from, target, id) => {
      if (score <= 0) return;
      const weighted = score + rng() * 10;
      if (weighted > best.score) best = { type, score: weighted, from, target, id };
    };
    if (!target) return { ...best, reachable };

    function positionNear(unit) {
      const map = moveArea(actor, unit, 64, false);
      let closest = origin, bestDistance = Infinity;
      for (const cell of choices) {
        const steps = map.get(cell.index)?.steps ?? Infinity;
        if (steps < bestDistance) {
          bestDistance = steps;
          closest = cell;
        }
      }
      return closest;
    }

    const approach = positionNear(target);
    if (available.includes('drug') && (actor.hp < actor.maxHp * .2 || actor.mp < actor.maxMp * .2 || actor.physicalPower < 20)) {
      const far = choices.reduce((best, cell) => {
        const value = other.reduce((sum, enemy) => sum + distance(cell, enemy), 0);
        return value > best.value ? { cell, value } : best;
      }, { cell: origin, value: 0 }).cell;
      for (const { id, type } of listItems(actor)) {
        if (type !== 3) continue;
        const item = itemAt(id);
        let score = item.hp > 0 ? Math.min(item.hp, actor.maxHp - actor.hp) - Math.trunc(item.hp / 10) : 0;
        if (item.mp > 0) score += Math.trunc(Math.min(item.mp, actor.maxMp - actor.mp) / 2) - Math.trunc(item.mp / 10);
        else if (item.physicalPower > 0) score += Math.min(item.physicalPower, 100 - actor.physicalPower) - Math.trunc(item.physicalPower / 10);
        offer('drug', score * 1.5, far, actor, id);
      }
    }
    if ((actor.morality ?? 0) > 50) {
      for (const type of ['detox', 'medicine']) {
        if (!available.includes(type)) continue;
        for (const recipient of friendly) {
          if (type === 'detox' ? recipient.poison <= 50 : recipient.hp >= recipient.maxHp * .2) continue;
          const from = positionNear(recipient);
          if (distance(from, recipient) <= actionRange(actor[supportActions[type].stat])) {
            offer(type, type === 'detox' ? recipient.poison : recipient.medicine ?? 0, from, recipient);
          }
        }
      }
    } else if (available.includes('poison') && distance(approach, target) <= actionRange(actor.usePoison)) {
      offer('poison', target.hp < 10 ? 1 : Math.trunc(Math.min(100 - target.poison, actor.usePoison) / 2), approach, target);
    }
    if (available.includes('dart') && distance(approach, target) <= actionRange(actor.hiddenWeapon)) {
      for (const { id, type } of listItems(actor)) {
        if (type !== 4) continue;
        const amount = dartDamage(actor, target, itemAt(id), approach);
        offer('dart', (amount > target.hp ? target.hp * 1.25 : amount) * .5, approach, target, id);
      }
    }
    if (available.includes('magic')) {
      for (const { id, levelIndex } of magicOptions(actor)) {
        const magic = magicAt(id);
        let bestCell, bestScore = 0;
        for (const cell of magicCells(approach, magic, levelIndex)) {
          const area = new Set(magicEffects(approach, cell, magic, levelIndex).map(pos => indexOf(pos.x, pos.y)));
          let score = 0;
          for (const enemy of other) {
            if (!area.has(indexOf(enemy.x, enemy.y))) continue;
            const amount = damage(actor, enemy, magic, approach) * (actor.attackTwice > 0 ? 2 : 1);
            score += magic.hurtType === 1 ? Math.trunc(amount / 5) : amount >= enemy.hp ? Math.trunc(enemy.hp * 1.25) : amount;
          }
          if (score > bestScore) {
            bestCell = cell;
            bestScore = score;
          }
        }
        offer('magic', bestScore, approach, bestCell, id);
      }
    }
    if (best.type === 'rest' && choices.length > 1) {
      let score = 0;
      for (const enemy of other) {
        const from = positionNear(enemy);
        if (from === origin) continue;
        const improvement = distance(origin, enemy) / (distance(from, enemy) + 1);
        if (improvement > score) {
          best.from = from;
          score = improvement;
        }
      }
    }
    return { ...best, reachable };
  }

  function computerTurn(actor) {
    const plan = computerPlan ??= planComputer(actor);
    if (!actor.moved && !sameCell(actor, plan.from) && performMove(actor, plan.from, plan.reachable)) return;
    if (plan.type === 'magic') performMagic(actor, plan.target, plan.id);
    else if (plan.type === 'drug' || plan.type === 'dart') performItem(actor, plan.id, plan.target);
    else if (plan.type in supportActions) performSupport(actor, plan.target, plan.type);
    else performRest(actor);
  }

  function step(deltaMs) {
    if (state.result !== null || !Number.isFinite(deltaMs) || deltaMs <= 0) return state;
    const delta = Math.min(deltaMs, 250);
    const previousFrame = state.frame;
    state.elapsedMs += delta;
    state.frame = Math.floor(state.elapsedMs / frameMs);
    const frames = state.frame - previousFrame;
    state.effects = state.effects.filter(effect => (effect.frame += frames) < effect.totalFrames);
    presentation.blood = presentation.blood.filter(effect => {
      effect.frame += frames;
      effect.alpha = 1 - effect.frame / (1.25 * effect.totalFrames);
      return effect.frame < effect.totalFrames;
    });
    presentation.texts = presentation.texts.filter(text => {
      text.frame += frames;
      text.x -= frames / tileWidth;
      text.y -= frames / tileWidth;
      return text.frame < 40;
    });
    presentation.impacts = presentation.impacts.filter(impact => (impact.alpha -= frames / 20) > 0);
    for (const role of roles) if (role.dead) role.alpha = Math.max(0, 1 - (state.frame - role.defeatFrame) / 15);
    if (animation) {
      const action = animation;
      action.elapsed += delta;
      const progress = Math.min(1, action.elapsed / action.duration);
      action.update?.(progress);
      const actor = action.actor;
      if (actor.action === 'attack') {
        actor.actFrame = Math.floor(action.elapsed / 38);
        actor.picture = pictureOf(actor);
      }
      if (progress >= .35 && action.impact) {
        action.impact();
        action.impact = null;
      }
      if (progress >= 1) {
        animation = null;
        if (active(actor)) actor.action = 'idle';
        actor.actType = -1;
        actor.picture = pictureOf(actor);
        action.done?.();
      }
    } else if (state.turn && (state.turn.side || state.auto)) computerTurn(state.turn);
    return state;
  }

  if (allies.length && enemies.length) setTurn();
  else finish(Boolean(allies.length));

  return {
    state, listActions: actions, listMagics: magicOptions, listItems, selectAction, selectCell, cancelSelection,
    selectMagic, canUseItem, useItem, setAuto, step,
    toggleAutomatic: () => setAuto(!state.auto),
    moveTo: (x, y) => (state.selection?.type === 'move' || selectAction('move')) && selectCell(x, y),
    attackAt: (x, y) => (state.selection?.type === 'magic' || selectAction('magic')) && selectCell(x, y),
    rest: () => selectAction('rest'),
    surrender() {
      if (state.result === null) finish(false, true);
      return state.result;
    },
  };
}
