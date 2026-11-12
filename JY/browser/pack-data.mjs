import { decodeSubmap, decodeWorldLayers, readIndexedGroup } from '../src/kys-formats.mjs';
import { resolveClassicTeam } from '../src/classic-battle.mjs';
import { unpackFlatZip } from './pack-zip.mjs';
import { openPackSqlite } from './pack-sqlite.mjs';

export { openPackSqlite } from './pack-sqlite.mjs';

const worldLayerNames = ['earth', 'surface', 'building', 'buildx', 'buildy'];
const sceneLayerBytes = 6 * 64 * 64 * 2;
const sceneEventBytes = 200 * 11 * 2;

function readConfig(text) {
  const values = new Map();
  let section = '';
  for (const line of text.split(/\r?\n/)) {
    const name = /^\s*\[([^\]]+)\]/.exec(line);
    if (name) {
      section = name[1].trim().toLowerCase();
      continue;
    }
    const setting = /^\s*([\w]+)\s*=\s*([^;#]*)/.exec(line);
    if (setting) values.set(`${section}.${setting[1].toLowerCase()}`, setting[2].trim());
  }
  const getInt = (key, fallback) => {
    const value = Number.parseInt(values.get(key), 10);
    return Number.isSafeInteger(value) ? value : fallback;
  };
  return {
    beginScene: getInt('constant.begin_scene', 70),
    beginX: getInt('constant.begin_sx', 19),
    beginY: getInt('constant.begin_sy', 20),
    beginEvent: getInt('constant.begin_event', -1),
    useScript: getInt('game.use_script', 1),
    battleMode: 0,
    zipSave: getInt('game.zip_save', 1),
    tileScale: getInt('game.tile_scale', 1),
    renderWidth: getInt('game.render_width', 640),
    renderHeight: getInt('game.render_height', 360),
    pngFromPath: getInt('game.png_from_path', 0),
    moneyItemId: getInt('constant.moneyitemid', 174),
  };
}

function readBase(row) {
  if (!row) throw new Error('Initial save has no base record.');
  return {
    mainX: row['主地图X'], mainY: row['主地图Y'],
    subX: row['子场景X'], subY: row['子场景Y'],
    facing: row['面朝方向'], inSubmap: row['子场景内'], inShip: row['乘船'],
    ship: [row['船X'], row['船Y']], shipReturn: [row['船X1'], row['船Y1']],
    party: Array.from({ length: 6 }, (_, index) => row[`队友${index + 1}`]),
  };
}

function readScene(row, id) {
  return {
    // Save::makeMapsAndRepairID assigns IDs by storage order.
    id,
    sourceId: row['编号'],
    name: row['名称'],
    entranceMusic: row['进门音乐'], exitMusic: row['出门音乐'],
    entranceCondition: row['进入条件'],
    entrance: [row['入口X'], row['入口Y']],
    worldEntrances: [[row['外景入口X1'], row['外景入口Y1']], [row['外景入口X2'], row['外景入口Y2']]],
    exits: [[row['出口X1'], row['出口Y1']], [row['出口X2'], row['出口Y2']], [row['出口X3'], row['出口Y3']]],
    jumpTo: row['跳转场景'],
    jump: [row['跳转X'], row['跳转Y']],
    jumpReturn: [row['跳转返还X'], row['跳转返还Y']],
  };
}

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


const textDecoder = new TextDecoder();

async function readPackBytes(store, path, required = true) {
  let file;
  try {
    file = await store.read(path);
  } catch (error) {
    if (required || error.code !== 'ENOENT') throw error;
  }
  if (file instanceof Uint8Array) return file;
  if (file instanceof ArrayBuffer) return new Uint8Array(file);
  if (typeof file?.arrayBuffer === 'function') return new Uint8Array(await file.arrayBuffer());
  if (!required && file == null) return undefined;
  throw new Error(file == null ? '原版资料缺少 ' + path + '。' : '无法读取原版资料 ' + path + '。');
}

function readRows(db, table) {
  const [result] = db.exec('SELECT * FROM ' + table + ' ORDER BY rowid');
  return result?.values.map(values => Object.fromEntries(
    result.columns.map((name, index) => [name, values[index]]),
  )) ?? [];
}

function readTables(db) {
  const base = readBase(readRows(db, 'base')[0]);
  const inventory = {};
  for (const row of readRows(db, 'bag')) {
    const id = row['物品编号'];
    if (id < 0) break;
    if (!Object.hasOwn(inventory, id)) inventory[id] = row['物品数量'];
  }
  return {
    base, inventory,
    scenes: readRows(db, 'submap').map(readScene),
    shops: readRows(db, 'shop').map(row => Array.from({ length: 5 }, (_, index) => ({
      id: row['物品编号' + (index + 1)],
      count: row['物品总量' + (index + 1)],
      price: row['物品价格' + (index + 1)],
    }))),
    roles: readRows(db, 'role').map(readRole),
    magics: readRows(db, 'magic').map(readMagic),
    items: readRows(db, 'item').map(readItem),
  };
}

function archiveMember(archive, name) {
  const bytes = archive.get(name);
  if (!bytes?.byteLength) throw new Error('原版 save/0.zip 缺少 ' + name + '。');
  return bytes;
}

const integersIn = text => (text.match(/-?\d+/g) ?? []).map(Number);

async function readFightFrames(store, group) {
  const path = 'resource/' + group;
  const bytes = await readPackBytes(store, path + '.zip', false);
  const frames = bytes && unpackFlatZip(bytes, {
    label: path + '.zip', include: name => name === 'fightframe.txt',
  }).get('fightframe.txt');
  const source = frames ?? await readPackBytes(store, path + '/fightframe.txt', false);
  const counts = [0, 0, 0, 0, 0];
  if (!source) return counts;
  const values = integersIn(textDecoder.decode(source));
  for (let index = 0; index + 1 < values.length; index += 2) {
    const style = values[index];
    if (style >= 0 && style < counts.length) counts[style] = Math.max(0, values[index + 1]);
  }
  return counts;
}

/** Read an imported 4in1 resource directory. Source files are never modified. */
export async function createPackData(store) {
  const [configBytes, initialArchive, worldEntries, war, idx, grp, levelUpBytes] = await Promise.all([
    readPackBytes(store, 'config/kysmod.ini'),
    readPackBytes(store, 'save/0.zip'),
    Promise.all(worldLayerNames.map(async name => [name, await readPackBytes(store, 'resource/' + name + '.002')])),
    readPackBytes(store, 'resource/war.sta'),
    readPackBytes(store, 'resource/warfld.idx'),
    readPackBytes(store, 'resource/warfld.grp'),
    readPackBytes(store, 'list/levelup.txt', false),
  ]);
  const archive = unpackFlatZip(initialArchive, { label: 'save/0.zip' });
  const initialDatabase = archiveMember(archive, '1.db');
  const initialSceneLayers = archiveMember(archive, 's1.grp');
  const initialSceneEvents = archiveMember(archive, 'd1.grp');
  const db = await openPackSqlite(initialDatabase);
  let tables;
  try {
    tables = readTables(db);
  } finally {
    db.close();
  }
  const { base, scenes, roles, magics, items } = tables;
  if (initialSceneLayers.byteLength !== scenes.length * sceneLayerBytes
    || initialSceneEvents.byteLength !== scenes.length * sceneEventBytes) {
    throw new Error('原版场景文件大小与存档中的 ' + scenes.length + ' 条场景记录不一致。');
  }
  if (!roles[0]) throw new Error('原版存档缺少主角资料。');
  const config = readConfig(textDecoder.decode(configBytes));
  const world = decodeWorldLayers(Object.fromEntries(worldEntries));
  const records = decodeBattleList(war);
  const fields = readIndexedGroup(idx, grp);
  const levelUpExp = levelUpBytes ? integersIn(textDecoder.decode(levelUpBytes)) : [];
  const party = [...new Set(base.party.filter(id => roles[id]))];
  if (!party.includes(0)) party.unshift(0);
  party.length = Math.min(party.length, teamCount);
  const frameCache = new Map();
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', initialArchive));
  const saveIdentity = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');

  function loadScene(id) {
    if (!Number.isSafeInteger(id) || id < 0 || id >= scenes.length) {
      throw new RangeError('场景 ' + id + ' 不在 ' + scenes.length + ' 条原版记录内。');
    }
    return { ...scenes[id], ...decodeSubmap(initialSceneLayers, initialSceneEvents, id) };
  }

  async function actor(id, side, x, y) {
    const role = roles[id];
    if (!frameCache.has(role.fightGroup)) {
      frameCache.set(role.fightGroup, readFightFrames(store, role.fightGroup).catch(error => {
        frameCache.delete(role.fightGroup);
        throw error;
      }));
    }
    return { ...role, x, y, side, team: side, fightFrames: await frameCache.get(role.fightGroup) };
  }

  async function loadBattle(id, activeParty = party) {
    const battle = Number.isSafeInteger(id) && records[id];
    if (!battle) throw new RangeError('战斗 ' + id + ' 不在 ' + records.length + ' 条原版记录内。');
    if (!isBattleParty(activeParty, roles)) throw new RangeError('队伍需包含主角，且最多有五名不重复的其他角色。');
    const {
      id: ordinal, sourceId, name, battlefieldId, exp, music,
      autoTeamMate, enemy: enemies, enemyX, enemyY, teamMate, teamX, teamY,
    } = battle;
    const field = decodeBattlefield(fields[battlefieldId]);
    const fixedTeam = autoTeamMate[0] >= 0 ? [...new Set(autoTeamMate.filter(member => roles[member]))] : [];
    const [roster, enemy] = await Promise.all([
      Promise.all([...new Set([...activeParty, ...fixedTeam])].map(member => actor(member, 0))),
      Promise.all(enemies.flatMap((member, index) => roles[member]
        ? [actor(member, 1, enemyX[index], enemyY[index])]
        : [])),
    ]);
    const lineup = { party: [...activeParty], fixedTeam, autoTeamMate, roster, teamPositions: teamX.map((x, index) => [x, teamY[index]]) };
    return {
      id: ordinal, sourceId, name, battlefieldId, exp, music, ...field, team: resolveClassicTeam(lineup),
      enemy, roles, magics, items, levelUpExp, teamMate, ...lineup,
    };
  }

  return {
    ...tables, config, world, party, loadScene, loadBattle, count: records.length, saveIdentity,
    initialArchive, initialDatabase, initialSceneLayers, initialSceneEvents,
  };
}

function encodeLayer(cells) {
  const bytes = new Uint8Array(cells.length * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < cells.length; index++) view.setInt16(index * 2, cells[index], true);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x4000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x4000));
  }
  return btoa(binary);
}

/** Keep the HTTP API's little-endian map representation in browser mode. */
export function packMap(map) {
  const layers = Object.fromEntries(Object.entries(map.layers).map(([name, cells]) => [name, encodeLayer(cells)]));
  return { ...map, layers, encoding: 'i16le-base64' };
}
