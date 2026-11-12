import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { decodeSubmap, decodeWorldLayers } from '../src/kys-formats.mjs';

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

/** Read game data without modifying the supplied directory or initial save. */
export async function openGameData(gameRoot, initialSaveRoot) {
  const saveRoot = initialSaveRoot ?? join(gameRoot, 'save');
  const [database, layers, events] = initialSaveRoot
    ? ['1.db', 's1.grp', 'd1.grp']
    : ['0.db', 'allsin.grp', 'alldef.grp'];
  const [configText, worldBytes, sceneLayers, sceneEvents] = await Promise.all([
    readFile(join(gameRoot, 'config', 'kysmod.ini'), 'utf8'),
    Promise.all(worldLayerNames.map(async name => [name, await readFile(join(gameRoot, 'resource', `${name}.002`))])),
    readFile(join(saveRoot, layers)),
    readFile(join(saveRoot, events)),
  ]);
  const config = readConfig(configText);
  const world = decodeWorldLayers(Object.fromEntries(worldBytes));
  const db = new DatabaseSync(join(saveRoot, database), { readOnly: true });
  let base;
  let scenes;
  let shops;
  try {
    db.exec('PRAGMA trusted_schema = OFF');
    base = readBase(db.prepare('SELECT * FROM base ORDER BY rowid LIMIT 1').get());
    scenes = db.prepare('SELECT * FROM submap ORDER BY rowid').all().map(readScene);
    shops = db.prepare('SELECT * FROM shop ORDER BY rowid').all().map(row =>
      Array.from({ length: 5 }, (_, index) => ({ id: row[`物品编号${index + 1}`], count: row[`物品总量${index + 1}`], price: row[`物品价格${index + 1}`] })));
  } finally {
    db.close();
  }
  if (sceneLayers.byteLength !== scenes.length * sceneLayerBytes || sceneEvents.byteLength !== scenes.length * sceneEventBytes) {
    throw new Error(`Scene layer and event byte counts do not match ${scenes.length} database records.`);
  }
  function loadScene(id) {
    if (!Number.isSafeInteger(id) || id < 0 || id >= scenes.length) {
      throw new RangeError(`Scene ${id} is outside ${scenes.length} available records.`);
    }
    return { ...scenes[id], ...decodeSubmap(sceneLayers, sceneEvents, id) };
  }
  return { config, base, world, scenes, shops, loadScene };
}

/** Serialize the raw map layers for transport without expanding every cell into JSON. */
export function packMap(map) {
  const layers = Object.fromEntries(Object.entries(map.layers).map(([name, cells]) => {
    const bytes = Buffer.allocUnsafe(cells.length * 2);
    for (let index = 0; index < cells.length; index++) bytes.writeInt16LE(cells[index], index * 2);
    return [name, bytes.toString('base64')];
  }));
  return { ...map, layers, encoding: 'i16le-base64' };
}
