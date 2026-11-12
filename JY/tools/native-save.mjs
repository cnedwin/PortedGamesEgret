import { mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { isDeepStrictEqual } from 'node:util';
import { decodeSubmap } from '../src/kys-formats.mjs';
import { unzipSync, zipSync } from '../third-party/fflate/index.js';

const zipLimit = 24 * 1024 * 1024;
const inflatedLimit = 64 * 1024 * 1024;
// KYS Save.cpp and Types.h at fe4ad958 write 64×64 signed layer cells and 200 eleven-field events per scene.
const cells = 64 * 64;
const eventCount = 200;
const layerNames = ['earth', 'building', 'decoration', 'eventIndex', 'buildingHeight', 'decorationHeight'];
const eventFields = ['cannotWalk', 'index', 'event1', 'event2', 'event3', 'currentPic', 'endPic', 'beginPic', 'picDelay', 'x', 'y'];
const layerBytes = cells * layerNames.length * 2;
const eventBytes = eventFields.length * 2;
const sceneEventBytes = eventBytes * eventCount;
const teamColumns = Array.from({ length: 6 }, (_, index) => `队友${index + 1}`);
const shopSlots = 5;
const itemAssignments = [
  { field: 'weaponId', column: '武器', type: 1, equipType: 0 },
  { field: 'armorId', column: '防具', type: 1, equipType: 1 },
  { field: 'practiceItemId', column: '修炼物品', type: 2 },
];
const roleColumns = {
  headId: '头像', name: '名字', nick: '外号', sexual: '性别', fame: '声望', level: '等级', exp: '经验',
  lifeGrowth: '生命成长', iq: '资质', practiceItemId: '修炼物品', practiceExp: '修炼点数', craftingExp: '物品修炼点数',
  hp: '生命', maxHp: '生命最大值', mp: '内力', maxMp: '内力最大值', mpType: '内力性质',
  physicalPower: '体力', hurt: '内伤', poison: '中毒', attack: '攻击力', defence: '防御力', speed: '轻功',
  fist: '拳掌', sword: '御剑', knife: '耍刀', unusual: '特殊', hiddenWeapon: '暗器', morality: '品德',
  knowledge: '武学常识', medicine: '医疗', usePoison: '用毒', detoxification: '解毒', antiPoison: '抗毒',
  attackWithPoison: '攻击带毒', attackTwice: '左右互搏', weaponId: '武器', armorId: '防具', equipmentId: '装备物品',
};

function integer(value, min, max, label) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${label} ${value} must be in ${min}..${max}.`);
  return value;
}

const int32 = (value, label) => integer(value, -0x80000000, 0x7fffffff, label);
const sequence = (value, max, label) => {
  if (!Array.isArray(value) || value.length > max) throw new TypeError(`${label} must be an array with at most ${max} entries.`);
  return value;
};
const scalarChanges = (before, after) => Object.fromEntries(Object.entries(after).filter(([key, value]) => !isDeepStrictEqual(before[key], value)));

function readArchive(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 22 || bytes.byteLength > zipLimit) {
    throw new Error('Desktop save ZIP must be 22 bytes to 24 MiB.');
  }
  const seen = new Set();
  let total = 0;
  const members = unzipSync(bytes, { filter({ name, originalSize }) {
    const normalized = name.toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.-]*$/i.test(name) || seen.has(normalized)) throw new Error(`Invalid or duplicate ZIP entry name: ${name}`);
    if (seen.size >= 64) throw new Error('Too many desktop save ZIP entries.');
    seen.add(normalized);
    total += integer(originalSize, 0, inflatedLimit, 'ZIP entry size');
    if (total > inflatedLimit) throw new Error('Desktop save ZIP exceeds the 64 MiB decoded limit.');
    return true;
  } });
  for (const member of ['1.db', 's1.grp', 'd1.grp']) {
    if (!Object.hasOwn(members, member) || members[member].length === 0) throw new Error(`Desktop save ZIP needs ${member}.`);
  }
  return members;
}

async function withDatabase(bytes, temporaryDirectory, write, operate) {
  const directory = await mkdtemp(join(temporaryDirectory, 'kys-native-save-'));
  const path = join(directory, 'save.db');
  try {
    await writeFile(path, bytes, { flag: 'wx' });
    const database = new DatabaseSync(path, { readOnly: !write });
    try {
      database.exec('PRAGMA trusted_schema = OFF');
      if (write) {
        if (database.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'trigger' LIMIT 1").get()) {
          throw new Error('Desktop save databases with triggers cannot be exported.');
        }
        database.exec('PRAGMA journal_mode = MEMORY; BEGIN IMMEDIATE');
      }
      const result = operate(database);
      if (write) database.exec('COMMIT');
      else return result;
    } finally {
      database.close();
    }
    return await readFile(path);
  } finally {
    for (const suffix of ['', '-journal', '-shm', '-wal']) {
      await unlink(path + suffix).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
    await rmdir(directory);
  }
}

function readTables(database) {
  const read = table => database.prepare(`SELECT rowid AS _kys_rowid, * FROM ${table} ORDER BY rowid`).all();
  const [base] = read('base');
  const bag = read('bag');
  const roles = read('role');
  const scenes = read('submap');
  const items = read('item');
  const shops = read('shop');
  if (!base || !roles.length || !scenes.length || bag.length > 1000 || !Object.hasOwn(base, '子场景内')) {
    throw new Error('Desktop save database has incompatible base, bag, role or submap tables.');
  }
  return { base, bag, roles, scenes, items, shops };
}

function checkSceneRecords(members, count) {
  if (members['s1.grp'].length !== count * layerBytes || members['d1.grp'].length !== count * sceneEventBytes) {
    throw new Error('Desktop save GRP lengths do not match its submap count.');
  }
}

function checkReference(tables, reference) {
  if (['roles', 'scenes', 'items', 'shops'].some(table => tables[table].length !== reference[table].length)) {
    throw new Error('Desktop save role, scene, item or shop count differs from the active game pack.');
  }
}

function mapRole(row) {
  const role = {};
  for (const [key, column] of Object.entries(roleColumns)) {
    if (Object.hasOwn(row, column)) role[key] = row[column];
  }
  for (const [key, prefix] of [['equippedMagics', '装备武功'], ['alternateMagics', '二组装备武功']]) {
    if (Object.hasOwn(row, `${prefix}1`)) role[key] = Array.from({ length: 4 }, (_, index) => row[`${prefix}${index + 1}`] ?? 0);
  }
  if (Object.hasOwn(row, '所会武功1')) {
    role.learnedMagics = Array.from({ length: 10 }, (_, index) => {
      const id = row[`所会武功${index + 1}`];
      const level = row[`武功等级${index + 1}`] ?? 0;
      return { id, level, slot: index, levelIndex: Math.max(0, Math.min(9, Math.trunc(level / 100))) };
    }).filter(magic => magic.id > 0);
  }
  if (Object.hasOwn(row, '携带物品1')) {
    role.carriedItems = Array.from({ length: 4 }, (_, index) => ({
      id: row[`携带物品${index + 1}`], count: row[`携带物品数量${index + 1}`],
    })).filter(item => item.id >= 0);
  }
  return role;
}

function sceneDiff(members, reference, tables, referenceTables, openingSceneId) {
  const patches = [];
  const layers = Buffer.from(members['s1.grp'].buffer, members['s1.grp'].byteOffset, members['s1.grp'].byteLength);
  const baselineLayers = Buffer.from(reference['s1.grp'].buffer, reference['s1.grp'].byteOffset, reference['s1.grp'].byteLength);
  const events = Buffer.from(members['d1.grp'].buffer, members['d1.grp'].byteOffset, members['d1.grp'].byteLength);
  const baselineEvents = Buffer.from(reference['d1.grp'].buffer, reference['d1.grp'].byteOffset, reference['d1.grp'].byteLength);
  const openingEvents = [];
  for (let id = 0; id < tables.scenes.length; id++) {
    const patch = { events: [], eventTiles: [] };
    const layerStart = id * layerBytes;
    const eventStart = id * sceneEventBytes;
    const sameLayers = layers.subarray(layerStart, layerStart + layerBytes).equals(baselineLayers.subarray(layerStart, layerStart + layerBytes));
    const sameEvents = events.subarray(eventStart, eventStart + sceneEventBytes).equals(baselineEvents.subarray(eventStart, eventStart + sceneEventBytes));
    if (!sameLayers) {
      for (const [layer, name] of layerNames.entries()) {
        const changes = [];
        const start = layerStart + layer * cells * 2;
        for (let cell = 0; cell < cells; cell++) {
          const offset = start + cell * 2;
          const value = layers.readInt16LE(offset);
          if (value !== baselineLayers.readInt16LE(offset)) changes.push([cell, value]);
        }
        if (!changes.length) continue;
        if (name === 'eventIndex') patch.eventTiles = changes;
        else (patch.layers ??= {})[name] = changes;
      }
    }
    if (!sameEvents || id === openingSceneId) {
      const current = decodeSubmap(layers, events, id).events;
      if (id === openingSceneId) openingEvents.push(...current.slice(0, 2));
      if (!sameEvents) {
        const original = decodeSubmap(baselineLayers, baselineEvents, id).events;
        for (let slot = id === openingSceneId ? 2 : 0; slot < eventCount; slot++) {
          const changes = scalarChanges(original[slot], current[slot]);
          if (Object.keys(changes).length) patch.events.push([slot, changes]);
        }
      }
    }
    const condition = tables.scenes[id]['进入条件'];
    if (condition !== referenceTables.scenes[id]['进入条件']) patch.entranceCondition = int32(condition, 'Entrance condition');
    if (patch.events.length || patch.eventTiles.length || patch.layers || patch.entranceCondition !== undefined) patches.push([id, patch]);
  }
  return { openingEvents, scenePatches: patches };
}

function nativeInventory(bag) {
  const inventory = [];
  const seen = new Set();
  for (const row of bag) {
    const id = int32(row['物品编号'], 'Native item ID');
    if (id < 0) break;
    if (seen.has(id)) continue;
    seen.add(id);
    inventory.push([id, integer(row['物品数量'], 0, 0x7fffffff, 'Native item count')]);
  }
  return inventory;
}

function locationOf(base, sceneCount) {
  const id = integer(base['子场景内'], -1, sceneCount - 1, 'Native scene ID');
  const facing = integer(base['面朝方向'], 0, 3, 'Native direction');
  if (id < 0) return { id: 'world', x: integer(base['主地图X'], 0, 479, 'World X'), y: integer(base['主地图Y'], 0, 479, 'World Y'), facing };
  return { id, x: integer(base['子场景X'], 0, 63, 'Scene X'), y: integer(base['子场景Y'], 0, 63, 'Scene Y'), facing };
}

function updateRow(database, table, row, updates) {
  const changes = Object.entries(updates).filter(([column, value]) => {
    if (!Object.hasOwn(row, column)) throw new Error(`Desktop save table ${table} lacks column ${column}.`);
    return row[column] !== value;
  });
  if (!changes.length) return;
  const assignments = changes.map(([column]) => `"${column}" = ?`).join(', ');
  database.prepare(`UPDATE ${table} SET ${assignments} WHERE rowid = ?`).run(...changes.map(([, value]) => value), row._kys_rowid);
}

function updateBase(database, tables, snapshot) {
  const { id, x, y, facing } = snapshot.location ?? {};
  const party = sequence(snapshot.party, teamColumns.length, 'Party');
  if (new Set(party).size !== party.length) throw new Error('Party contains duplicate role IDs.');
  const team = Object.fromEntries(teamColumns.map((column, index) => [column,
    index < party.length ? integer(party[index], 0, tables.roles.length - 1, 'Party role') : -1,
  ]));
  const inside = id !== 'world';
  const limit = inside ? 63 : 479;
  integer(x, 0, limit, 'Location X');
  integer(y, 0, limit, 'Location Y');
  const position = {
    子场景内: inside ? integer(id, 0, tables.scenes.length - 1, 'Scene ID') : -1,
    主地图X: inside ? integer(snapshot.mainX, 0, 479, 'World X') : x,
    主地图Y: inside ? integer(snapshot.mainY, 0, 479, 'World Y') : y,
    面朝方向: integer(facing, 0, 3, 'Direction'),
    ...(inside ? { 子场景X: x, 子场景Y: y } : {}),
  };
  updateRow(database, 'base', tables.base, { ...position, ...team });
}

function updateInventory(database, rows, value) {
  const inventory = sequence(value, 1000, 'Inventory');
  const seen = new Set();
  for (const pair of inventory) {
    if (!Array.isArray(pair) || pair.length !== 2) throw new TypeError('Inventory entries must be [id, count] pairs.');
    const [id, count] = pair;
    integer(id, 0, 0x7fffffff, 'Item ID');
    integer(count, 0, 0x7fffffff, 'Item count');
    if (seen.has(id)) throw new Error(`Duplicate inventory item ${id}.`);
    seen.add(id);
  }
  if (isDeepStrictEqual(nativeInventory(rows), inventory)) return;
  for (let index = 0; index < Math.max(rows.length, inventory.length); index++) {
    const [id, count] = inventory[index] ?? [-1, 0];
    const row = rows[index];
    if (row && (index < inventory.length || row['物品编号'] >= 0)) {
      updateRow(database, 'bag', row, { 物品编号: id, 物品数量: count });
    } else if (!row) {
      database.prepare('INSERT INTO bag (物品编号, 物品数量) VALUES (?, ?)').run(id, count);
    }
  }
}

function updateRoles(database, rows, value) {
  const seen = new Set();
  for (const role of sequence(value ?? [], rows.length, 'Role states')) {
    const row = rows[integer(role.id, 0, rows.length - 1, 'Role ID')];
    if (seen.has(role.id)) throw new Error(`Duplicate role state ${role.id}.`);
    seen.add(role.id);
    const changes = scalarChanges(mapRole(row), role);
    const updates = {};
    for (const [key, column] of Object.entries(roleColumns)) {
      if (!Object.hasOwn(changes, key)) continue;
      const value = changes[key];
      updates[column] = (key === 'name' || key === 'nick') && typeof value === 'string' ? value : int32(value, key);
    }
    for (const [key, prefix] of [['equippedMagics', '装备武功'], ['alternateMagics', '二组装备武功']]) {
      if (!Object.hasOwn(changes, key)) continue;
      const values = sequence(changes[key], 4, key);
      for (let index = 0; index < 4; index++) updates[`${prefix}${index + 1}`] = int32(values[index] ?? 0, key);
    }
    if (Object.hasOwn(changes, 'learnedMagics')) {
      const magics = sequence(changes.learnedMagics, 10, 'Learned magics');
      const slots = new Map();
      for (const [index, magic] of magics.entries()) {
        const slot = integer(magic.slot ?? index, 0, 9, 'Learned magic slot');
        if (slots.has(slot)) throw new Error(`Duplicate learned magic slot ${slot}.`);
        slots.set(slot, magic);
      }
      for (let index = 0; index < 10; index++) {
        const magic = slots.get(index);
        const idColumn = `所会武功${index + 1}`;
        const levelColumn = `武功等级${index + 1}`;
        if (!magic && !(row[idColumn] > 0)) continue;
        updates[idColumn] = int32(magic?.id ?? 0, 'Learned magic ID');
        updates[levelColumn] = int32(magic?.level ?? 0, 'Learned magic level');
      }
    }
    if (Object.hasOwn(changes, 'carriedItems')) {
      const items = sequence(changes.carriedItems, 4, 'Carried items');
      for (let index = 0; index < 4; index++) {
        const item = items[index];
        updates[`携带物品${index + 1}`] = int32(item?.id ?? -1, 'Carried item ID');
        updates[`携带物品数量${index + 1}`] = int32(item?.count ?? 0, 'Carried item count');
      }
    }
    updateRow(database, 'role', row, updates);
  }
}

function shopSold(shops, reference) {
  const sold = [];
  for (const [shopIndex, row] of shops.entries()) {
    const original = reference[shopIndex];
    for (let itemIndex = 0; itemIndex < shopSlots; itemIndex++) {
      const slot = itemIndex + 1;
      const item = `物品编号${slot}`;
      const total = `物品总量${slot}`;
      if (row[item] !== original[item] || !Number.isInteger(row[item]) || row[item] < 0 || row[total] === original[total]) continue;
      if (!Number.isSafeInteger(row[total]) || row[total] < 0 || !Number.isSafeInteger(original[total]) || original[total] < 0) continue;
      sold.push([`${shopIndex}:${itemIndex}`, original[total] - row[total]]);
    }
  }
  return sold;
}

function updateShops(database, shops, reference, sold) {
  const seen = new Set();
  for (const [key, count] of sequence(sold ?? [], shops.length * shopSlots, 'Shop inventory changes')) {
    const match = typeof key === 'string' && /^(0|[1-9]\d*):([0-4])$/.exec(key);
    if (!match || seen.has(key)) throw new Error(`Invalid or duplicate shop slot: ${key}`);
    seen.add(key);
    const index = integer(Number(match[1]), 0, shops.length - 1, 'Shop index');
    const slot = Number(match[2]) + 1;
    const row = shops[index];
    const original = reference[index];
    const item = `物品编号${slot}`;
    const total = `物品总量${slot}`;
    if (row[item] !== original[item] || !Number.isInteger(row[item]) || row[item] < 0) throw new Error(`Shop item differs from the active game pack: ${key}`);
    const initial = integer(original[total], 0, 0x7fffffff, 'Initial shop stock');
    const remaining = integer(initial - int32(count, 'Shop count change'), 0, 0x7fffffff, 'Remaining shop stock');
    updateRow(database, 'shop', row, { [total]: remaining });
  }
}

// Role::equip transfers Item::User and releases the previous item in the affected role slot.
function updateItemUsers(database, { roles, items }, roleState) {
  const patches = new Map((roleState ?? []).map(patch => [patch.id, patch]));
  const owners = new Map();
  const assignments = new Map();
  for (const [roleId, patch] of patches) {
    const row = roles[roleId];
    for (const { field, column, type, equipType } of itemAssignments) {
      if (!Object.hasOwn(patch, field) || row[column] === patch[field]) continue;
      const previousItem = row[column];
      if (items[previousItem]?.['使用人'] === roleId) owners.set(previousItem, -1);
      const itemId = patch[field];
      const item = items[itemId];
      if (item?.['物品类型'] !== type || (equipType !== undefined && item['装备类型'] !== equipType)) continue;
      if (assignments.has(itemId)) throw new Error(`Item ${itemId} is assigned to more than one role.`);
      assignments.set(itemId, { roleId, field, column });
    }
  }
  for (const [itemId, { roleId, field, column }] of assignments) {
    const previousRoleId = items[itemId]['使用人'];
    const previousRole = roles[previousRoleId];
    const previousPatch = patches.get(previousRoleId);
    if (previousRoleId !== roleId && (previousPatch?.[field] ?? previousRole?.[column]) === itemId) {
      updateRow(database, 'role', previousRole, { [column]: -1 });
    }
    owners.set(itemId, roleId);
  }
  for (const [itemId, roleId] of owners) updateRow(database, 'item', items[itemId], { 使用人: roleId });
}

function applySceneChanges(members, sceneCount, openingSceneId, snapshot) {
  const layers = Buffer.from(members['s1.grp']);
  const events = Buffer.from(members['d1.grp']);
  function writeEvent(scene, slot, changes) {
    const base = scene * sceneEventBytes + integer(slot, 0, eventCount - 1, 'Event slot') * eventBytes;
    for (const [field, value] of Object.entries(changes)) {
      const index = eventFields.indexOf(field);
      if (index === -1) throw new Error(`Unknown scene event field: ${field}`);
      events.writeInt16LE(integer(value, -32768, 32767, field), base + index * 2);
    }
  }
  sequence(snapshot.openingEvents ?? [], 2, 'Opening events').forEach((changes, slot) => writeEvent(openingSceneId, slot, changes));
  const conditions = new Map();
  for (const [id, patch] of sequence(snapshot.scenePatches ?? [], sceneCount, 'Scene patches')) {
    integer(id, 0, sceneCount - 1, 'Patch scene');
    for (const [slot, changes] of sequence(patch.events ?? [], eventCount, 'Event patches')) writeEvent(id, slot, changes);
    for (const [name, changes] of Object.entries({ ...patch.layers, eventIndex: patch.eventTiles ?? patch.layers?.eventIndex ?? [] })) {
      const layer = layerNames.indexOf(name);
      if (layer === -1) throw new Error(`Unknown scene layer: ${name}`);
      const start = id * layerBytes + layer * cells * 2;
      for (const [cell, value] of sequence(changes, cells, `${name} cells`)) {
        layers.writeInt16LE(integer(value, -32768, 32767, `${name} value`), start + integer(cell, 0, cells - 1, `${name} cell`) * 2);
      }
    }
    if (patch.entranceCondition !== undefined) conditions.set(id, int32(patch.entranceCondition, 'Entrance condition'));
  }
  return { layers, events, conditions };
}

/** Convert the pinned desktop ZIP format to and from the browser's progress snapshot. */
export async function createNativeSaveCodec({ initialSave, openingSceneId, openingEventId = 691, temporaryDirectory = tmpdir() }) {
  const reference = readArchive(initialSave);
  const referenceTables = await withDatabase(reference['1.db'], temporaryDirectory, false, readTables);
  integer(openingSceneId, 0, referenceTables.scenes.length - 1, 'Opening scene');
  checkSceneRecords(reference, referenceTables.scenes.length);
  const openingEvent = decodeSubmap(reference['s1.grp'], reference['d1.grp'], openingSceneId).events[0];

  async function importSave(bytes) {
    const members = readArchive(bytes);
    const tables = await withDatabase(members['1.db'], temporaryDirectory, false, readTables);
    checkReference(tables, referenceTables);
    checkSceneRecords(members, tables.scenes.length);
    const { openingEvents, scenePatches } = sceneDiff(members, reference, tables, referenceTables, openingSceneId);
    return {
      location: locationOf(tables.base, tables.scenes.length),
      mainX: integer(tables.base['主地图X'], 0, 479, 'World X'), mainY: integer(tables.base['主地图Y'], 0, 479, 'World Y'),
      openingDone: openingEvent.event3 === openingEventId && openingEvents[0].event3 !== openingEventId,
      openingEvents, scenePatches, inventory: nativeInventory(tables.bag),
      party: teamColumns.map(column => int32(tables.base[column], column)).filter(id => id >= 0),
      flags: { shopSold: shopSold(tables.shops, referenceTables.shops) },
      roleState: tables.roles.flatMap((row, id) => {
        const changes = scalarChanges(mapRole(referenceTables.roles[id]), mapRole(row));
        return Object.keys(changes).length ? [{ id, ...changes }] : [];
      }),
      nativeTemplate: Buffer.from(bytes).toString('base64'),
    };
  }

  async function exportSave(snapshot) {
    let members = reference;
    if (snapshot.nativeTemplate !== undefined) {
      const encoded = snapshot.nativeTemplate;
      if (typeof encoded !== 'string' || encoded.length > Math.ceil(zipLimit / 3) * 4) throw new Error('Invalid native ZIP template.');
      const bytes = Buffer.from(encoded, 'base64');
      if (bytes.toString('base64') !== encoded) throw new Error('Invalid native ZIP template.');
      members = readArchive(bytes);
    }
    checkSceneRecords(members, referenceTables.scenes.length);
    const { layers, events, conditions } = applySceneChanges(members, referenceTables.scenes.length, openingSceneId, snapshot);
    const database = await withDatabase(members['1.db'], temporaryDirectory, true, database => {
      const tables = readTables(database);
      checkReference(tables, referenceTables);
      updateBase(database, tables, snapshot);
      updateInventory(database, tables.bag, snapshot.inventory);
      updateRoles(database, tables.roles, snapshot.roleState);
      updateItemUsers(database, tables, snapshot.roleState);
      updateShops(database, tables.shops, referenceTables.shops, snapshot.flags?.shopSold);
      for (const [id, value] of conditions) updateRow(database, 'submap', tables.scenes[id], { 进入条件: value });
    });
    return zipSync({ ...members, '1.db': database, 's1.grp': layers, 'd1.grp': events });
  }

  return { importSave, exportSave };
}
