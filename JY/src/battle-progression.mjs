// Role equipment and post-battle progression shared by classic and historical combat.
const roleItemStats = ['physicalPower', 'poison', 'medicine', 'detoxification', 'usePoison', 'attack', 'defence',
  'speed', 'fist', 'sword', 'knife', 'unusual', 'hiddenWeapon', 'knowledge', 'morality', 'antiPoison', 'attackWithPoison'];
const gearStats = ['attack', 'speed', 'medicine', 'usePoison', 'detoxification', 'fist', 'sword',
  'knife', 'unusual', 'hiddenWeapon', 'maxMp', 'iq'];
const magicSlots = 10;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(n, hi));
const levelOf = learned => clamp(Math.trunc((learned?.level ?? 0) / 100), 0, 9);
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

export function applyItemStats(role, item) {
  for (const stat of roleItemStats) role[stat] = clamp((role[stat] ?? 0) + (item[stat] ?? 0), 0, 100);
  for (const [stat, cap] of [['hp', 'maxHp'], ['mp', 'maxMp']]) {
    role[cap] = clamp(role[cap] + (item[cap] ?? 0), 0, 999);
    role[stat] = clamp(role[stat] + (item[stat] ?? 0), 0, role[cap]);
  }
  if (item.mpType === 2) role.mpType = 2;
  if (item.attackTwice) role.attackTwice = 1;
}

export function createBattleProgression(battle, { randInt, bag, changeInventory, progression: entries }) {
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
    if (progression.practice || progression.crafting) entries.push(progression);
  }

  return { applyExperience, applyPracticeAndCrafting };
}

export function battleRoleSnapshot(role, levelsGained) {
  const { id, hp, maxHp, mp, maxMp, physicalPower, expGot, exp, level, practiceExp, craftingExp, hurt, poison,
    attack, speed, defence, medicine, detoxification, usePoison, fist, sword, knife, unusual, hiddenWeapon,
    mpType, attackTwice, knowledge, morality, antiPoison, attackWithPoison } = role;
  return { id, hp, maxHp, mp, maxMp, physicalPower, expGot, exp, level, levelsGained, practiceExp, craftingExp, hurt, poison,
    attack, speed, defence, medicine, detoxification, usePoison, fist, sword, knife, unusual, hiddenWeapon,
    mpType, attackTwice, knowledge, morality, antiPoison, attackWithPoison,
    equippedMagics: [...role.equippedMagics], learnedMagics: role.learnedMagics.map(magic => ({ ...magic })) };
}
