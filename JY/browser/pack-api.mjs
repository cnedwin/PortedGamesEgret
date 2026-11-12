import { readTextureOffsets } from '../src/kys-texture-offsets.mjs';
import { isBattleParty, packMap } from './pack-data.mjs';
import { createBrowserNativeSaveCodec } from './pack-native-save.mjs';
import { publishedArt } from './pack-art.mjs';
import { unpackFlatZip } from './pack-zip.mjs';

const plain = 'text/plain; charset=utf-8';
const jsonType = 'application/json; charset=utf-8';
const png = 'image/png';
const decoder = new TextDecoder();
const textureGroup = '(smap|mmap|fight/fight\\d{3}|eft/(?:eft|bld)\\d{3})';
const artListPath = new RegExp('^/api/art/' + textureGroup + '$');
const artPath = new RegExp('^/art/' + textureGroup + '/(\\d{1,7})(?:\\.png)?$');
const saveBodyLimit = 32 * 1024 * 1024;

function responseFor(request) {
  return (code, type, body, extra) => new Response(
    request.method === 'HEAD' || code === 204 ? null : body,
    { status: code, headers: { 'Content-Type': type, 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', ...extra } },
  );
}

function mediaResponse(request, send, type, body) {
  const size = body instanceof Blob ? body.size : body.byteLength;
  const headers = { 'Accept-Ranges': 'bytes', 'Content-Length': String(size) };
  const range = request.method === 'HEAD' ? null : new Headers(request.headers).get('range');
  if (!range) return send(200, type, body, headers);

  const match = /^bytes=(\d*)-(\d*)$/i.exec(range);
  const invalid = () => send(416, type, null, { ...headers, 'Content-Length': '0', 'Content-Range': 'bytes */' + size });
  if (!match || (!match[1] && !match[2])) return invalid();
  const first = Number(match[1]);
  const last = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) return invalid();
  const start = match[1] ? first : Math.max(0, size - last);
  const end = match[1] ? Math.min(last, size - 1) : size - 1;
  if (start > end || start >= size) return invalid();
  const part = body instanceof Blob ? body.slice(start, end + 1) : body.subarray(start, end + 1);
  return send(206, type, part, { ...headers, 'Content-Length': String(end - start + 1),
    'Content-Range': 'bytes ' + start + '-' + end + '/' + size });
}

async function saveBody(request) {
  const length = new Headers(request.headers).get('content-length');
  if (length && Number(length) > saveBodyLimit) throw new RangeError('存檔檔案超過 32 MiB');
  const stream = request instanceof Request ? request.body : new Response(request.body).body;
  if (!stream) return new Uint8Array();
  const chunks = [];
  const reader = stream.getReader();
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > saveBodyLimit) {
        await reader.cancel();
        throw new RangeError('存檔檔案超過 32 MiB');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function loadTextures(store, group) {
  const bytes = await store.read('resource/' + group + '.zip');
  if (!bytes) return undefined;
  const archive = unpackFlatZip(bytes, { label: group });
  const files = new Map();
  const extensions = new Set();
  let maxId = 0;
  for (const [name, image] of archive) {
    const match = /^(\d{1,7})(?:_(\d+))?\.(png|webp)$/.exec(name);
    if (!match) continue;
    const id = Number(match[1]);
    extensions.add(match[3]);
    maxId = Math.max(maxId, id);
    if (match[2] === undefined || (Number(match[2]) === 0 && !files.has(id))) files.set(id, image);
  }
  if (extensions.size !== 1) throw new Error(group + ' 需要使用统一的 PNG 或 WebP 贴图格式。');
  return {
    files,
    type: extensions.has('webp') ? 'image/webp' : png,
    offsets: readTextureOffsets(maxId + 1, {
      text: archive.has('index.txt') ? decoder.decode(archive.get('index.txt')) : '',
      binary: archive.get('index.ka'),
    }),
  };
}

function gameTextureCache(store) {
  const groups = new Map();
  return group => {
    if (!groups.has(group)) {
      const data = loadTextures(store, group).catch(error => {
        if (groups.get(group) === data) groups.delete(group);
        throw error;
      });
      groups.set(group, data);
    }
    const data = groups.get(group);
    groups.delete(group);
    groups.set(group, data);
    if (groups.size > 40) {
      const stale = [...groups.keys()].find(name => name !== 'smap' && name !== 'mmap');
      groups.delete(stale);
    }
    return data;
  };
}

function shippedAsset(path) {
  return new URL('../web/' + path, import.meta.url);
}

async function publishedImage(transport, directory, id) {
  if (!publishedArt.get(directory)?.has(id)) return undefined;
  const result = await transport(shippedAsset(directory + '/' + id + '.png')).catch(() => undefined);
  return result?.ok ? result.blob() : undefined;
}

async function engineIdentity(transport) {
  const urls = {
    webgl2HostSha256: 'engine/dist/web/WebGL2Host.js',
    world3dGltfSha256: 'engine/dist/rendering/world3d/Gltf3D.js',
    world3dRendererSha256: 'engine/dist/web/world3d/WebGL2Renderer3D.js',
  };
  const source = await transport(new URL('../vendor/SOURCE.md', import.meta.url));
  const revision = source.ok ? (await source.text()).match(/\b[0-9a-f]{40}\b/i)?.[0] ?? null : null;
  const hashes = await Promise.all(Object.entries(urls).map(async ([key, path]) => {
    const response = await transport(new URL('../vendor/' + path, import.meta.url));
    if (!response.ok) return [key, null];
    const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
    return [key, Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')];
  }));
  return { revision, world3d: true, ...Object.fromEntries(hashes) };
}

/** Respond to virtual game URLs with imported local files. Works inside a module service worker. */
export async function createPackFetch(store, data, transport = globalThis.fetch.bind(globalThis)) {
  const paths = [...store.paths].sort();
  const originals = new Set(paths.flatMap(path => {
    const match = /^script\/event-cifa\/(\d{1,4})\.cifa$/.exec(path);
    return match ? [Number(match[1])] : [];
  }));
  const heads = paths.flatMap(path => {
    const match = /^resource\/head\/(\d{1,4})\.png$/.exec(path);
    return match ? [Number(match[1])] : [];
  });
  const [talk, leave] = await Promise.all([store.read('resource/talkutf8.txt'), store.read('list/leave.txt')]);
  const legacyTalk = talk ? decoder.decode(talk).split(/\r?\n/) : [];
  const [firstLeave, ...leaveRoles] = (leave ? decoder.decode(leave).match(/\d+/g) : null)?.map(Number) ?? [];
  const leaveEvents = leaveRoles.map((role, index) => [role, firstLeave + 2 * index])
    .filter(([, event]) => originals.has(event));

  const start = {
    sceneId: data.config.beginScene, x: data.config.beginX, y: data.config.beginY, config: data.config,
    base: data.base, morality: data.roles[0].morality, inventory: data.inventory, saveIdentity: data.saveIdentity,
  };
  const catalog = {
    roles: data.roles, items: data.items, magics: data.magics, shops: data.shops,
    sceneIds: data.scenes.map(scene => scene.id), moneyItemId: data.config.moneyItemId,
    eventIds: [...originals], headIds: heads, leaveEvents,
  };
  const cachedTextures = gameTextureCache(store);
  let nativeSave;
  let identity;

  async function codec() {
    nativeSave ??= createBrowserNativeSaveCodec(data)
      .catch(error => { nativeSave = undefined; throw error; });
    return nativeSave;
  }

  return async function serve(path, request = {}) {
    const send = responseFor(request);
    const json = value => send(200, jsonType, JSON.stringify(value));
    const missing = () => send(404, plain, 'Not found');
    const { pathname, searchParams } = new URL(path, 'https://pack.invalid');
    const method = request.method ?? 'GET';
    try {
      if (method === 'POST' && (pathname === '/api/native-save/import' || pathname === '/api/native-save/export')) {
        try {
          const bytes = await saveBody(request);
          const save = await codec();
          if (pathname.endsWith('/import')) return json(await save.importSave(bytes));
          const archive = await save.exportSave(JSON.parse(decoder.decode(bytes)));
          return send(200, 'application/zip', archive, { 'Content-Disposition': 'attachment; filename="KYS-11.zip"' });
        } catch (error) {
          return send(400, plain, error.message);
        }
      }
      if (method !== 'GET' && method !== 'HEAD') return send(405, plain, 'GET or HEAD required');
      if (pathname === '/api/start') return json(start);
      if (pathname === '/api/scenes') return json(data.scenes);
      if (pathname === '/api/catalog') return json(catalog);
      if (pathname === '/api/world') return json(packMap(data.world));
      if (pathname === '/api/engine') return json(await (identity ??= engineIdentity(transport)));

      const event = /^\/api\/event\/(\d{1,4})$/.exec(pathname);
      if (event && originals.has(Number(event[1]))) {
        const script = await store.read('script/event-cifa/' + Number(event[1]) + '.cifa');
        return script ? send(200, plain, script) : missing();
      }
      const legacy = /^\/api\/talk\/(\d{1,4})$/.exec(pathname);
      if (legacy && legacyTalk[Number(legacy[1])] !== undefined) return json(legacyTalk[Number(legacy[1])]);

      const battle = /^\/api\/battle\/(\d{1,3})$/.exec(pathname);
      if (battle) {
        const id = Number(battle[1]);
        if (id >= data.count) return missing();
        const values = searchParams.getAll('party');
        const party = values[0]?.split(',').map(value => /^\d{1,4}$/.test(value) ? Number(value) : NaN);
        if (values.length > 1 || (party && !isBattleParty(party, data.roles))) {
          return send(400, plain, 'Battle party requires the protagonist and up to five other distinct roles.');
        }
        return json(packMap(await data.loadBattle(id, party)));
      }
      const role = /^\/api\/role\/(\d{1,4})$/.exec(pathname);
      if (role) {
        const record = data.roles[Number(role[1])];
        if (!record) return missing();
        const { id, name, headId, level, morality, carriedItems } = record;
        return json({ id, name, headId, level, morality, carriedItems });
      }
      const item = /^\/api\/item\/(\d{1,4})$/.exec(pathname);
      if (item) {
        const record = data.items[Number(item[1])];
        return record ? json({ id: record.id, name: record.name }) : missing();
      }
      const scene = /^\/api\/scene\/(\d{1,4})$/.exec(pathname);
      if (scene) {
        const id = Number(scene[1]);
        return data.scenes.some(scene => scene.id === id) ? json(packMap(data.loadScene(id))) : missing();
      }
      const list = artListPath.exec(pathname);
      if (list) {
        const group = await cachedTextures(list[1]);
        return group ? json([...group.files.keys()]) : missing();
      }
      const art = artPath.exec(pathname);
      if (art) {
        const group = await cachedTextures(art[1]);
        const id = Number(art[2]);
        const image = group?.files.get(id);
        if (!image) return missing();
        const { dx = 0, dy = 0 } = group.offsets.get(id) ?? {};
        return send(200, group.type, image, { 'X-Kys-Anchor-X': String(dx), 'X-Kys-Anchor-Y': String(dy) });
      }

      const portrait = /^\/art\/(head|portrait|jyx2-portrait)\/(\d{1,4})\.png$/.exec(pathname);
      if (portrait) {
        const id = Number(portrait[2]);
        if (portrait[1] === 'jyx2-portrait') {
          const remastered = await publishedImage(transport, 'jyx2/portraits', id);
          if (remastered) return send(200, png, remastered, { 'X-Kys-Portrait': 'jyx2' });
          const adapted = await publishedImage(transport, 'jyx2/additions', id);
          if (adapted) return send(200, png, adapted, { 'X-Kys-Portrait': 'port-original-jyx2-style' });
        }
        if (portrait[1] !== 'head') {
          const original = await publishedImage(transport, 'portraits', id);
          if (original) return send(200, png, original, { 'X-Kys-Portrait': 'port-original' });
        }
        const classic = await store.read('resource/head/' + id + '.png');
        return classic ? send(200, png, classic, { 'X-Kys-Portrait': 'classic' }) : missing();
      }
      const itemIcon = /^\/art\/(item|jyx2-item)\/(\d{1,4})\.png$/.exec(pathname);
      if (itemIcon && data.items[Number(itemIcon[2])]) {
        const id = Number(itemIcon[2]);
        if (itemIcon[1] === 'jyx2-item') {
          const adapted = await publishedImage(transport, 'jyx2/items', id);
          if (adapted) return send(200, png, adapted, { 'X-Kys-Item': 'port-original-jyx2-style' });
        }
        const classic = await store.read('resource/item/' + id + '.png');
        return classic ? send(200, png, classic, { 'X-Kys-Item': 'classic' }) : missing();
      }
      const title = /^\/art\/title\/(203|205)\.png$/.exec(pathname);
      if (title) {
        const image = await store.read('resource/title/' + title[1] + '.png');
        return image ? send(200, png, image) : missing();
      }

      const music = /^\/audio\/midi\/(\d{1,3}\.mid|mid\.sf2)$/.exec(pathname);
      if (music) {
        const file = 'music/' + music[1];
        const audio = await (store.file ? store.file(file) : store.read(file));
        return audio ? mediaResponse(request, send, music[1].endsWith('.mid') ? 'audio/midi' : 'application/octet-stream', audio)
          : missing();
      }
      const wave = /^\/audio\/(wave|hit)\/(\d{1,2})\.wav$/.exec(pathname);
      if (wave) {
        const file = 'sound/' + (wave[1] === 'wave' ? 'atk' : 'e') + wave[2].padStart(2, '0') + '.wav';
        const audio = await (store.file ? store.file(file) : store.read(file));
        return audio ? mediaResponse(request, send, 'audio/wav', audio) : send(204, 'audio/wav');
      }
      return missing();
    } catch (error) {
      console.error('读取本地游戏资料失败', pathname, error);
      return send(500, plain, '读取原作资源失败');
    }
  };
}
