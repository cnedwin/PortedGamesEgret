import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { readTextureOffsets } from './src/kys-texture-offsets.mjs';
import { openGameData, packMap } from './tools/game-data.mjs';
import { isBattleParty, openBattleData } from './tools/battle-data.mjs';
import { createNativeSaveCodec } from './tools/native-save.mjs';
import { tar } from './tools/archiver.mjs';
import { enginePackages, makeGameImports, musicPackages } from './src/browser-imports.mjs';

const exec = promisify(execFile);
const portRoot = fileURLToPath(new URL('.', import.meta.url));
const [gameDirectory, cacheDirectory, portArg, vendorDirectory] = process.argv.slice(2);
const port = Number(portArg ?? 4185);
if (!gameDirectory || !cacheDirectory || !Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('用法：node server.mjs <game 目录> <私有缓存目录> [端口] [白鹭构建目录]');
  process.exit(2);
}

const game = await realpath(gameDirectory);
const webRoot = await realpath(join(portRoot, 'web'));
const vendorRoot = vendorDirectory ? await realpath(vendorDirectory) : await realpath(join(portRoot, 'vendor')).catch(error => {
  if (error.code !== 'ENOENT') throw error;
  return realpath(join(portRoot, '../KYS_Egret_Trial/vendor'));
});
await mkdir(resolve(cacheDirectory), { recursive: true });
const cache = await mkdtemp(join(resolve(cacheDirectory), 'kys-port-'));

async function extractFlatZip(archive, destination) {
  const [names, modes] = await Promise.all([
    exec(tar, ['-tf', archive], { maxBuffer: 8 * 1024 * 1024 }),
    exec(tar, ['-tvf', archive], { maxBuffer: 8 * 1024 * 1024 }),
  ]);
  const files = names.stdout.trimEnd().split(/\r?\n/);
  const entries = modes.stdout.trimEnd().split(/\r?\n/);
  if (files.length !== entries.length || files.some(name => !/^[a-z0-9][a-z0-9_.-]*$/i.test(name))
    || entries.some(entry => !entry.startsWith('-'))
    || new Set(files.map(name => name.toLowerCase())).size !== files.length) {
    throw new Error(`ZIP 需要使用无重复名称的平面文件结构：${archive}`);
  }
  await mkdir(destination, { recursive: true });
  await exec(tar, ['-xf', archive, '-C', destination]);
}

async function readOptional(path, encoding) {
  try {
    return await readFile(path, encoding);
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function loadTextures(group) {
  const directory = join(cache, group);
  await extractFlatZip(join(game, 'resource', `${group}.zip`), directory);
  const names = await readdir(directory);
  const files = new Map();
  const extensions = new Set();
  let maxId = 0;
  for (const name of names) {
    const match = /^(\d+)(?:_(\d+))?\.(png|webp)$/i.exec(name);
    if (!match) continue;
    const id = Number(match[1]);
    if (!Number.isSafeInteger(id)) continue;
    extensions.add(match[3].toLowerCase());
    maxId = Math.max(maxId, id);
    const current = files.get(id);
    if (match[2] === undefined || (Number(match[2]) === 0 && current === undefined)) files.set(id, name);
  }
  if (extensions.size !== 1) throw new Error(`${group} 需要使用统一的 PNG 或 WebP 贴图格式。`);
  const [text, binary] = await Promise.all([
    readOptional(join(directory, 'index.txt'), 'utf8'),
    readOptional(join(directory, 'index.ka')),
  ]);
  return { directory, files, offsets: readTextureOffsets(maxId + 1, { text, binary }) };
}

const initial = join(cache, 'initial');
const [, smap, mmap] = await Promise.all([
  extractFlatZip(join(game, 'save/0.zip'), initial),
  loadTextures('smap'),
  loadTextures('mmap'),
]);
const data = await openGameData(game, initial);
const battleData = await openBattleData(game, initial);
const initialArchive = await readFile(join(game, 'save', '0.zip'));
const nativeSave = await createNativeSaveCodec({ initialSave: initialArchive, openingSceneId: data.config.beginScene,
  temporaryDirectory: cache });
const originalScripts = new Set((await readdir(join(game, 'script', 'event-cifa')))
  .flatMap(name => /^\d{1,4}\.cifa$/.test(name) ? [Number.parseInt(name, 10)] : []));
const headFiles = (await readdir(join(game, 'resource', 'head')))
  .flatMap(name => /^\d{1,4}\.png$/i.test(name) ? [Number.parseInt(name, 10)] : []);
const legacyTalk = (await readOptional(join(game, 'resource', 'talkutf8.txt'), 'utf8'))?.replace(/^\uFEFF/, '').split(/\r?\n/) ?? [];
const leaveList = (await readOptional(join(game, 'list', 'leave.txt'), 'utf8'))?.match(/\d+/g)?.map(Number) ?? [];
const [firstLeaveEvent, ...leaveRoles] = leaveList;
const leaveEvents = leaveRoles.map((roleId, index) => [roleId, firstLeaveEvent + 2 * index])
  .filter(([, eventId]) => originalScripts.has(eventId));
const textures = new Map([['smap', Promise.resolve(smap)], ['mmap', Promise.resolve(mmap)]]);
function textureGroup(group) {
  if (!textures.has(group)) textures.set(group, loadTextures(group).catch(error => {
    textures.delete(group);
    throw error;
  }));
  return textures.get(group);
}
const start = {
  sceneId: data.config.beginScene,
  x: data.config.beginX,
  y: data.config.beginY,
  config: data.config,
  base: data.base,
  morality: battleData.roles[0].morality,
  inventory: battleData.inventory,
  saveIdentity: createHash('sha256').update(initialArchive).digest('hex'),
};

const manifests = await Promise.all(enginePackages.map(async folder =>
  [folder, JSON.parse(await readFile(join(vendorRoot, folder, 'package.json'), 'utf8'))]));
const imports = makeGameImports(manifests, (folder, name) => `/vendor/${folder}/${name}`, name => `/music-lib/${name}/index.js`);

const engineSource = await readOptional(join(vendorRoot, 'SOURCE.md'), 'utf8');
const world3dGltf = await readOptional(join(vendorRoot, 'engine', 'dist', 'rendering', 'world3d', 'Gltf3D.js'));
const world3dRenderer = await readOptional(join(vendorRoot, 'engine', 'dist', 'web', 'world3d', 'WebGL2Renderer3D.js'));
const engineIdentity = {
  revision: engineSource?.match(/\b[0-9a-f]{40}\b/i)?.[0] ?? null,
  webgl2HostSha256: createHash('sha256')
    .update(await readFile(join(vendorRoot, 'engine', 'dist', 'web', 'WebGL2Host.js'))).digest('hex'),
  world3d: Object.hasOwn(imports, '@egret/engine/webgl2/world3d'),
  world3dGltfSha256: world3dGltf ? createHash('sha256').update(world3dGltf).digest('hex') : null,
  world3dRendererSha256: world3dRenderer ? createHash('sha256').update(world3dRenderer).digest('hex') : null,
};

const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.mid': 'audio/midi',
  '.sf2': 'application/octet-stream', '.bin': 'application/octet-stream', '.glb': 'model/gltf-binary',
};

async function readSaveBody(request) {
  const chunks = [];
  const limit = 32 * 1024 * 1024;
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new RangeError('存檔檔案超過 32 MiB');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

const server = createServer(async (request, response) => {
  const send = (code, type, body, headers = {}) => {
    response.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
    response.end(request.method === 'HEAD' ? undefined : body);
  };
  const json = value => send(200, 'application/json; charset=utf-8', JSON.stringify(value));
  const missing = () => send(404, 'text/plain; charset=utf-8', 'Not found');
  if (request.headers.host !== `127.0.0.1:${port}` && request.headers.host !== `localhost:${port}`) {
    send(403, 'text/plain; charset=utf-8', 'Loopback host required');
    return;
  }
  try {
    const { pathname: path, searchParams } = new URL(request.url, 'http://127.0.0.1');
    if (request.method === 'POST' && (path === '/api/native-save/import' || path === '/api/native-save/export')) {
      const origin = request.headers.origin;
      if (origin && origin !== `http://${request.headers.host}`) return send(403, 'text/plain; charset=utf-8', 'Same origin required');
      try {
        const bytes = await readSaveBody(request);
        if (path.endsWith('/import')) return json(await nativeSave.importSave(bytes));
        const snapshot = JSON.parse(bytes.toString('utf8'));
        const archive = await nativeSave.exportSave(snapshot);
        return send(200, 'application/zip', archive, { 'Content-Disposition': 'attachment; filename="KYS-11.zip"' });
      } catch (error) {
        return send(400, 'text/plain; charset=utf-8', error.message);
      }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return send(405, 'text/plain; charset=utf-8', 'GET or HEAD required');
    if (path === '/api/start') return json(start);
    if (path === '/api/scenes') return json(data.scenes);
    if (path === '/api/catalog') return json({
      roles: battleData.roles, items: battleData.items, magics: battleData.magics, shops: data.shops,
      sceneIds: data.scenes.map(scene => scene.id), moneyItemId: data.config.moneyItemId, eventIds: [...originalScripts], headIds: headFiles,
      leaveEvents,
    });
    if (path === '/api/world') return json(packMap(data.world));
    const scriptMatch = /^\/api\/event\/(\d{1,4})$/.exec(path);
    if (scriptMatch && originalScripts.has(Number(scriptMatch[1]))) {
      const script = await readFile(join(game, 'script', 'event-cifa', `${Number(scriptMatch[1])}.cifa`));
      return send(200, 'text/plain; charset=utf-8', script);
    }
    const talk = /^\/api\/talk\/(\d{1,4})$/.exec(path);
    if (talk && legacyTalk[Number(talk[1])] !== undefined) return json(legacyTalk[Number(talk[1])]);
    const battle = /^\/api\/battle\/(\d{1,3})$/.exec(path);
    if (battle) {
      const id = Number(battle[1]);
      if (id >= battleData.count) return missing();
      const values = searchParams.getAll('party');
      const party = values[0]?.split(',').map(value => /^\d{1,4}$/.test(value) ? Number(value) : NaN);
      if (values.length > 1 || (party && !isBattleParty(party, battleData.roles))) {
        return send(400, 'text/plain; charset=utf-8', 'Battle party requires the protagonist and up to five other distinct roles.');
      }
      return json(packMap(await battleData.loadBattle(id, party)));
    }
    const role = /^\/api\/role\/(\d{1,4})$/.exec(path);
    if (role) {
      const record = battleData.roles[Number(role[1])];
      if (!record) return missing();
      const { id, name, headId, level, morality, carriedItems } = record;
      return json({ id, name, headId, level, morality, carriedItems });
    }
    const item = /^\/api\/item\/(\d{1,4})$/.exec(path);
    if (item) {
      const record = battleData.items[Number(item[1])];
      return record ? json({ id: record.id, name: record.name }) : missing();
    }
    const portrait = /^\/art\/(head|portrait|jyx2-portrait)\/(\d{1,4})\.png$/.exec(path);
    if (portrait) {
      const filename = `${portrait[2]}.png`;
      if (portrait[1] === 'jyx2-portrait') {
        const remastered = await readOptional(join(webRoot, 'jyx2', 'portraits', filename));
        if (remastered) return send(200, mime['.png'], remastered, { 'X-Kys-Portrait': 'jyx2' });
        const adapted = await readOptional(join(webRoot, 'jyx2', 'additions', filename));
        if (adapted) return send(200, mime['.png'], adapted, { 'X-Kys-Portrait': 'port-original-jyx2-style' });
      }
      if (portrait[1] !== 'head') {
        const original = await readOptional(join(webRoot, 'portraits', filename));
        if (original) return send(200, mime['.png'], original, { 'X-Kys-Portrait': 'port-original' });
      }
      return send(200, mime['.png'], await readFile(join(game, 'resource', 'head', filename)), { 'X-Kys-Portrait': 'classic' });
    }
    const itemIcon = /^\/art\/(item|jyx2-item)\/(\d{1,4})\.png$/.exec(path);
    if (itemIcon && battleData.items[Number(itemIcon[2])]) {
      const filename = `${itemIcon[2]}.png`;
      if (itemIcon[1] === 'jyx2-item') {
        const adapted = await readOptional(join(webRoot, 'jyx2', 'items', filename));
        if (adapted) return send(200, mime['.png'], adapted, { 'X-Kys-Item': 'port-original-jyx2-style' });
      }
      return send(200, mime['.png'], await readFile(join(game, 'resource', 'item', filename)), { 'X-Kys-Item': 'classic' });
    }
    const title = /^\/art\/title\/(203|205)\.png$/.exec(path);
    if (title) return send(200, mime['.png'], await readFile(join(game, 'resource', 'title', `${title[1]}.png`)));
    const music = /^\/audio\/midi\/(\d{1,3}\.mid|mid\.sf2)$/.exec(path);
    if (music) return send(200, mime[extname(music[1])], await readFile(join(game, 'music', music[1])));
    const library = /^\/music-lib\/([a-z_-]+)\/(index\.js|spessasynth_processor\.min\.js)$/.exec(path);
    if (library && musicPackages.includes(library[1])) {
      return send(200, mime['.js'], await readFile(join(portRoot, 'third-party', library[1], library[2])));
    }
    const wave = /^\/audio\/(wave|hit)\/(\d{1,2})\.wav$/.exec(path);
    if (wave) {
      const name = `${wave[1] === 'wave' ? 'atk' : 'e'}${wave[2].padStart(2, '0')}.wav`;
      const audio = await readOptional(join(game, 'sound', name));
      return audio ? send(200, mime['.wav'], audio) : send(204, mime['.wav']);
    }
    const program = /^\/(cifa-opening|cifa-trainer|cifa-recruit|cifa-game|game-events|kys-navigation|classic-battle|battle-progression)\.mjs$/.exec(path);
    if (program) {
      return send(200, mime['.mjs'], await readFile(join(portRoot, 'src', `${program[1]}.mjs`)));
    }
    if (path === '/idb-keyval.mjs') return send(200, mime['.mjs'], await readFile(join(portRoot, 'third-party', 'idb-keyval', 'index.mjs')));
    const sceneMatch = /^\/api\/scene\/(\d{1,4})$/.exec(path);
    if (sceneMatch) {
      const id = Number(sceneMatch[1]);
      if (!data.scenes.some(scene => scene.id === id)) return missing();
      return json(packMap(data.loadScene(id)));
    }
    const artList = /^\/api\/art\/(smap|mmap|fight\/fight\d{3}|eft\/(?:eft|bld)\d{3})$/.exec(path);
    if (artList) return json([...(await textureGroup(artList[1])).files.keys()]);
    const art = /^\/art\/(smap|mmap|fight\/fight\d{3}|eft\/(?:eft|bld)\d{3})\/(\d{1,7})(?:\.png)?$/.exec(path);
    if (art) {
      const group = await textureGroup(art[1]);
      const id = Number(art[2]);
      const file = group.files.get(id);
      if (!file) return missing();
      const { dx = 0, dy = 0 } = group.offsets.get(id) ?? {};
      return send(200, mime[extname(file).toLowerCase()], await readFile(join(group.directory, file)), {
        'X-Kys-Anchor-X': String(dx), 'X-Kys-Anchor-Y': String(dy),
      });
    }
    if (path === '/api/engine') return json(engineIdentity);
    const asset = path === '/' ? '/index.html' : path;
    if (asset === '/jyx2/actors/manifest.json') {
      const manifest = await readOptional(join(webRoot, 'jyx2', 'actors', 'manifest.json'));
      if (!manifest) return send(204, mime['.json']);
    }
    const isWeb = /^\/(?:index\.html|main\.mjs|opening-(?:dialogue|event)\.mjs|battle-(?:view|music|menu)\.mjs|world-menu\.mjs|scene-atmosphere\.mjs|gamepad-input\.mjs|trainer-event\.mjs|save-slot\.mjs|style\.css)$/.test(asset)
      || /^\/jyx2\/(?:ui|scene|effects|actors|inn3d|inn3d-actors|home3d|home3d-actors)\/[a-z0-9][a-z0-9_.-]*\.(?:mjs|json|png|webp|jpg|bin|glb)$/i.test(asset);
    const isVendor = /^\/vendor\/(?:engine|runtime|contracts|robust-predicates)\/[a-z0-9_./-]+\.js$/i.test(asset);
    if (!isWeb && !isVendor) return missing();
    const root = isWeb ? webRoot : vendorRoot;
    const file = await realpath(join(root, isWeb ? asset.slice(1) : asset.slice('/vendor/'.length)));
    const within = relative(root, file);
    if (!within || within === '..' || within.startsWith(`..${sep}`) || isAbsolute(within)) return missing();
    const content = await readFile(file);
    const body = asset === '/index.html'
      ? content.toString('utf8').replace(/<head\b[^>]*>/i, head => `${head}\n<script type="importmap">${JSON.stringify({ imports })}</script>`)
      : content;
    return send(200, mime[extname(file)], body);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') return missing();
    console.error(error);
    return send(500, 'text/plain; charset=utf-8', '读取原作资源失败');
  }
});

if (process.send) {
  if (!process.connected) process.exit(0);
  process.once('disconnect', () => server.close());
}

server.listen(port, '127.0.0.1', () => {
  const ready = `http://127.0.0.1:${port}/`;
  console.log(`KYS 原作地图 · ${ready}`);
  console.log(`子场景 ${start.sceneId} (${start.x}, ${start.y}) · smap ${smap.files.size} 张 · mmap ${mmap.files.size} 张`);
  if (process.connected) process.send?.({ ready });
});
