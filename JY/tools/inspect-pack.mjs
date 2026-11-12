import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { decodeSubmap, decodeWorldLayers } from '../src/kys-formats.mjs';

const worldLayers = ['earth', 'surface', 'building', 'buildx', 'buildy'];
const looseSave = ['save/0.db', 'save/allsin.grp', 'save/alldef.grp'];

async function hasFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
    throw error;
  }
}

async function inspect(root, scene) {
  if (!await hasFile(join(root, 'config/kysmod.ini'))) {
    throw new Error('找不到 config/kysmod.ini。请传入解压后的 game 目录。');
  }

  const inputs = {};
  const files = {};
  for (const name of worldLayers) {
    const relative = `resource/${name}.002`;
    const bytes = await readFile(join(root, relative));
    inputs[name] = bytes;
    files[relative] = {
      bytes: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  }
  const world = decodeWorldLayers(inputs);
  const hasZip = await hasFile(join(root, 'save/0.zip'));
  const missingLoose = [];
  for (const file of looseSave) {
    if (!await hasFile(join(root, file))) missingLoose.push(file);
  }
  const report = {
    world: { width: world.width, height: world.height, files },
    initialSave: { zipPresent: hasZip, looseFilesPresent: !missingLoose.length, missingLoose },
  };
  if (scene !== undefined) {
    if (missingLoose.includes(looseSave[1]) || missingLoose.includes(looseSave[2])) {
      throw new Error('指定子场景需要解出的 save/allsin.grp 和 save/alldef.grp。');
    }
    const [layers, events] = await Promise.all(looseSave.slice(1).map(file => readFile(join(root, file))));
    const submap = decodeSubmap(layers, events, scene);
    report.scene = { ordinal: scene, width: submap.width, height: submap.height, eventSlots: submap.events.length };
  }
  return report;
}

const [folder, flag, ordinal, ...extra] = process.argv.slice(2);
const scene = flag === '--scene' && /^\d+$/.test(ordinal ?? '') ? Number(ordinal) : undefined;
if (!folder || folder.startsWith('--') || extra.length || flag !== undefined && !Number.isSafeInteger(scene)) {
  console.error('用法：node tools/inspect-pack.mjs <game 目录> [--scene <从 0 开始的场景序号>]');
  process.exitCode = 2;
} else {
  try {
    console.log(JSON.stringify(await inspect(resolve(folder), scene), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
