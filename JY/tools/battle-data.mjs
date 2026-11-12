import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { promisify } from 'node:util';
import { readIndexedGroup } from '../src/kys-formats.mjs';
import { resolveClassicTeam } from '../src/classic-battle.mjs';

const run = promisify(execFile);
const recordBytes = 186;
const fieldSize = 64;
const layerCells = fieldSize * fieldSize;
const layerBytes = layerCells * 2;
const teamCount = 6;
const enemyCount = 20;
const big5 = new TextDecoder('big5');

export function isBattleParty(party, roles) {
  return Array.isArray(party) && party.length <= teamCount && party.includes(0)
    && new Set(party).size === party.length && party.every(id => Number.isSafeInteger(id) && id >= 0 && roles[id]);
}

function readValues(view, offset, count) {
  return Array.from({ length: count }, (_, index) => view.getInt16(offset + index * 2, true));
}

export function decodeBattleList(bytes) {
  if (!bytes.length || bytes.length % recordBytes) throw new Error(`war.sta must contain complete ${recordBytes}-byte battle records.`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return Array.from({ length: bytes.length / recordBytes }, (_, id) => {
    const start = id * recordBytes;
    return {
      id,
      sourceId: view.getInt16(start, true),
      name: big5.decode(bytes.subarray(start + 2, start + 12)).split('\0', 1)[0],
      battlefieldId: view.getInt16(start + 12, true),
      exp: view.getInt16(start + 14, true),
      music: view.getInt16(start + 16, true),
      teamMate: readValues(view, start + 18, teamCount),
      autoTeamMate: readValues(view, start + 30, teamCount),
      teamX: readValues(view, start + 42, teamCount),
      teamY: readValues(view, start + 54, teamCount),
      enemy: readValues(view, start + 66, enemyCount),
      enemyX: readValues(view, start + 106, enemyCount),
      enemyY: readValues(view, start + 146, enemyCount),
    };
  });
}

export function decodeBattlefield(bytes) {
  if (!bytes || bytes.byteLength < layerBytes * 2) throw new Error(`warfld record must contain at least ${layerBytes * 2} bytes.`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const layerAt = start => Int16Array.from({ length: layerCells }, (_, index) => view.getInt16(start + index * 2, true));
  return { width: fieldSize, height: fieldSize, layers: { earth: layerAt(0), building: layerAt(layerBytes) } };
}

const columns = (row, prefix, count) => Array.from({ length: count }, (_, index) => row[`${prefix}${index + 1}`]);

function readRole(row, id) {
  const headId = row['头像'];
  return {
    id, headId, name: row['名字'], nick: row['外号'], sexual: row['性别'], fame: row['声望'],
    level: row['等级'], exp: row['经验'],
    lifeGrowth: row['生命成长'], iq: row['资质'], practiceItemId: row['修炼物品'],
    practiceExp: row['修炼点数'], craftingExp: row['物品修炼点数'],
    hp: row['生命'], maxHp: row['生命最大值'], mp: row['内力'], maxMp: row['内力最大值'], mpType: row['内力性质'],
    physicalPower: row['体力'], hurt: row['内伤'], poison: row['中毒'],
    attack: row['攻击力'], defence: row['防御力'], speed: row['轻功'],
    fist: row['拳掌'], sword: row['御剑'], knife: row['耍刀'], unusual: row['特殊'], hiddenWeapon: row['暗器'],
    morality: row['品德'],
    knowledge: row['武学常识'], medicine: row['医疗'], usePoison: row['用毒'], detoxification: row['解毒'], antiPoison: row['抗毒'],
    attackWithPoison: row['攻击带毒'], attackTwice: row['左右互搏'],
    weaponId: row['武器'], armorId: row['防具'], equipmentId: row['装备物品'],
    equippedMagics: columns(row, '装备武功', 4), alternateMagics: columns(row, '二组装备武功', 4),
    learnedMagics: columns(row, '所会武功', 10).flatMap((magicId, slot) => {
      if (magicId <= 0) return [];
      const level = row[`武功等级${slot + 1}`];
      return [{ id: magicId, slot, level, levelIndex: Math.max(0, Math.min(9, Math.trunc(level / 100))) }];
    }),
    carriedItems: columns(row, '携带物品', 4).flatMap((itemId, index) => itemId >= 0
      ? [{ id: itemId, count: row[`携带物品数量${index + 1}`] }] : []),
    fightGroup: `fight/fight${String(headId).padStart(3, '0')}`,
  };
}

function readMagic(row, id) {
  const selectDistance = columns(row, '移动范围', 10);
  return {
    id, name: row['名称'], magicType: row['武功类型'], effectId: row['武功动画'], soundId: row['出招音效'],
    hurtType: row['伤害类型'], attackArea: row['攻击范围类型'], needMp: row['消耗内力'], poison: row['敌人中毒'],
    attack: columns(row, '威力', 10), selectDistance, moveDistance: selectDistance,
    attackDistance: columns(row, '杀伤范围', 10), addMp: columns(row, '加内力', 10), hurtMp: columns(row, '杀伤内力', 10),
  };
}

function readItem(row, id) {
  const outputs = columns(row, '练出物品', 5);
  const craftingItems = outputs[0] >= 0 ? outputs.flatMap((itemId, index) => itemId >= 0
    ? [{ id: itemId, count: row[`练出物品数量${index + 1}`] }] : []) : [];
  return {
    id, name: row['物品名'], description: row['物品说明'], type: row['物品类型'],
    magicId: row['练出武功'], userId: row['使用人'], practiceExp: row['需经验'],
    craftingExp: row['练出物品需经验'], materialId: row['需材料'], craftingItems,
    requirements: {
      onlyRoleId: row['仅修炼人物'], mpType: row['需内力性质'], maxMp: row['需内力'],
      attack: row['需攻击力'], speed: row['需轻功'], usePoison: row['需用毒'], medicine: row['需医疗'],
      detoxification: row['需解毒'], fist: row['需拳掌'], sword: row['需御剑'], knife: row['需耍刀'],
      unusual: row['需特殊兵器'], hiddenWeapon: row['需暗器'], iq: row['需资质'],
    },
    equipType: row['装备类型'], hiddenWeaponEffectId: row['暗器动画编号'],
    hp: row['加生命'], maxHp: row['加生命最大值'], mp: row['加内力'], maxMp: row['加内力最大值'],
    poison: row['加中毒解毒'], physicalPower: row['加体力'], mpType: row['改变内力性质'],
    attack: row['加攻击力'], speed: row['加轻功'], defence: row['加防御力'],
    medicine: row['加医疗'], usePoison: row['加使毒'], detoxification: row['加解毒'], antiPoison: row['加抗毒'],
    fist: row['加拳掌'], sword: row['加御剑'], knife: row['加耍刀'], unusual: row['加特殊兵器'], hiddenWeapon: row['加暗器技巧'],
    knowledge: row['加武学常识'], morality: row['加品德'], attackTwice: row['加左右互搏'], attackWithPoison: row['加攻击带毒'],
  };
}

function readDatabase(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    db.exec('PRAGMA trusted_schema = OFF');
    const base = db.prepare('SELECT * FROM base ORDER BY rowid LIMIT 1').get();
    if (!base) throw new Error('Initial save has no base record.');
    const inventory = {};
    for (const row of db.prepare('SELECT * FROM bag ORDER BY rowid').iterate()) {
      const id = row['物品编号'];
      if (id < 0) break;
      if (!Object.hasOwn(inventory, id)) inventory[id] = row['物品数量'];
    }
    return {
      party: columns(base, '队友', teamCount).filter(id => id >= 0), inventory,
      roles: db.prepare('SELECT * FROM role ORDER BY rowid').all().map(readRole),
      magics: db.prepare('SELECT * FROM magic ORDER BY rowid').all().map(readMagic),
      items: db.prepare('SELECT * FROM item ORDER BY rowid').all().map(readItem),
    };
  } finally {
    db.close();
  }
}

async function readFightFrames(resource, group) {
  let text;
  try {
    text = (await run('tar', ['-xOf', join(resource, `${group}.zip`), 'fightframe.txt'])).stdout;
  } catch {
    try {
      text = await readFile(join(resource, group, 'fightframe.txt'), 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return [0, 0, 0, 0, 0];
    }
  }
  const values = (text.match(/-?\d+/g) ?? []).map(Number);
  const result = [0, 0, 0, 0, 0];
  for (let index = 0; index + 1 < values.length; index += 2) {
    const style = values[index];
    if (style >= 0 && style < result.length) result[style] = Math.max(0, values[index + 1]);
  }
  return result;
}

/** Load native battlefield assets and the initial save tables without changing them. */
export async function openBattleData(gameRoot, initialSaveRoot) {
  const resource = join(gameRoot, 'resource');
  const [war, idx, grp, levelUpList] = await Promise.all([
    readFile(join(resource, 'war.sta')), readFile(join(resource, 'warfld.idx')), readFile(join(resource, 'warfld.grp')),
    readFile(join(gameRoot, 'list', 'levelup.txt'), 'utf8').catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return '';
    }),
  ]);
  const levelUpExp = (levelUpList.match(/-?\d+/g) ?? []).map(Number);
  const records = decodeBattleList(war);
  const fields = readIndexedGroup(idx, grp);
  const database = initialSaveRoot ? join(initialSaveRoot, '1.db') : join(gameRoot, 'save', '0.db');
  const { roles, magics, items, inventory, party: initialParty } = readDatabase(database);
  const party = [...new Set(initialParty.filter(id => roles[id]))];
  if (!party.includes(0)) party.unshift(0);
  party.length = Math.min(party.length, teamCount);
  const frameCache = new Map();
  async function actor(id, side, x, y) {
    const role = roles[id];
    if (!frameCache.has(role.fightGroup)) frameCache.set(role.fightGroup, readFightFrames(resource, role.fightGroup));
    return { ...role, x, y, side, team: side, fightFrames: await frameCache.get(role.fightGroup) };
  }

  async function loadBattle(id, activeParty = party) {
    const battle = Number.isSafeInteger(id) && records[id];
    if (!battle) throw new RangeError(`Battle ${id} is outside ${records.length} available records.`);
    if (!isBattleParty(activeParty, roles)) throw new RangeError('Battle party requires the protagonist and up to five other distinct roles.');
    const { id: ordinal, sourceId, name, battlefieldId, exp, music, autoTeamMate, enemy: enemies, enemyX, enemyY, teamMate, teamX, teamY } = battle;
    const field = decodeBattlefield(fields[battlefieldId]);
    const fixedTeam = autoTeamMate[0] >= 0 ? [...new Set(autoTeamMate.filter(member => roles[member]))] : [];
    const [roster, enemy] = await Promise.all([
      Promise.all([...new Set([...activeParty, ...fixedTeam])].map(member => actor(member, 0))),
      Promise.all(enemies.flatMap((member, index) => roles[member] ? [actor(member, 1, enemyX[index], enemyY[index])] : [])),
    ]);
    const lineup = { party: [...activeParty], fixedTeam, autoTeamMate, roster, teamPositions: teamX.map((x, index) => [x, teamY[index]]) };
    return { id: ordinal, sourceId, name, battlefieldId, exp, music, ...field, team: resolveClassicTeam(lineup),
      enemy, roles, magics, items, levelUpExp, teamMate, ...lineup };
  }

  return { inventory, items, roles, magics, party, loadBattle, count: records.length };
}
