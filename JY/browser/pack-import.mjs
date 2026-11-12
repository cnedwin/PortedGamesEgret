import { checkPackEntries, maxArchiveBytes, normalizedPath, packSignature, requiredPaths, selectedPath } from './pack-format.mjs';

const dbName = 'ported-games-egret:jy:original-packs';
let opening;

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function completed(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onabort = tx.onerror = () => reject(tx.error ?? Error('浏览器未能写入原作资源。'));
  });
}

function database() {
  if (!opening) {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('metadata');
      const files = db.createObjectStore('files', { keyPath: ['id', 'path'] });
      files.createIndex('id', 'id');
    };
    opening = requestValue(request).then(db => {
      db.onversionchange = () => { db.close(); opening = undefined; };
      return db;
    }, error => { opening = undefined; throw error; });
  }
  return opening;
}

function storeFor(db, record) {
  const paths = Object.freeze([...record.paths]);
  async function file(path) {
    const canonical = normalizedPath(path);
    if (!canonical || !selectedPath(canonical)) return undefined;
    const tx = db.transaction('files', 'readonly');
    return (await requestValue(tx.objectStore('files').get([record.id, canonical])))?.blob;
  }
  return Object.freeze({
    id: record.id, paths, size: record.bytes, kind: record.kind,
    list(prefix = '') {
      if (!prefix) return paths;
      const trailing = prefix.endsWith('/');
      const canonical = normalizedPath(trailing ? prefix.slice(0, -1) : prefix);
      if (!canonical) return [];
      const first = trailing ? canonical + '/' : canonical;
      return paths.filter(path => path.startsWith(first));
    },
    file,
    async read(path) {
      const blob = await file(path);
      return blob ? new Uint8Array(await blob.arrayBuffer()) : undefined;
    },
  });
}

export async function openPackStore() {
  const db = await database();
  const record = await requestValue(db.transaction('metadata', 'readonly').objectStore('metadata').get('active'));
  return record ? storeFor(db, record) : undefined;
}

async function writeBatch(db, id, rows) {
  const tx = db.transaction('files', 'readwrite');
  const done = completed(tx);
  const files = tx.objectStore('files');
  for (const { path, blob } of rows) files.add({ id, path, blob });
  await done;
}

async function removeGeneration(db, id) {
  if (!id) return;
  const tx = db.transaction('files', 'readwrite');
  const done = completed(tx);
  const files = tx.objectStore('files');
  const cursor = files.index('id').openKeyCursor(IDBKeyRange.only(id));
  cursor.onsuccess = () => {
    const row = cursor.result;
    if (row) {
      files.delete(row.primaryKey);
      row.continue();
    }
  };
  await done;
}

async function activate(db, record) {
  const tx = db.transaction('metadata', 'readwrite');
  const done = completed(tx);
  const metadata = tx.objectStore('metadata');
  const current = metadata.get('active');
  let expired;
  current.onsuccess = () => {
    expired = current.result?.previous;
    metadata.put({ ...record, previous: current.result?.id }, 'active');
  };
  await done;
  return expired;
}

function readFolder(source) {
  const files = Array.from(source ?? [], file => ({ name: normalizedPath(file.webkitRelativePath), blob: file }));
  const suffix = 'config/kysmod.ini';
  const roots = [...new Set(files.flatMap(({ name }) => name === suffix ? ['']
    : name?.endsWith('/' + suffix) ? [name.slice(0, -suffix.length)] : []))];
  const defaultRoots = roots.filter(path => path === 'game/' || path.endsWith('/game/'));
  const root = defaultRoots.length === 1 ? defaultRoots[0] : roots.length === 1 ? roots[0] : undefined;
  if (root === undefined) throw Error('请选择解压后的默认 game 目录。');
  return files.flatMap(({ name, blob }) => {
    if (!name?.startsWith(root)) return [];
    const path = name.slice(root.length);
    return selectedPath(path) ? [{ path, blob, size: blob.size }] : [];
  });
}

async function validatePack(store) {
  const files = await Promise.all(requiredPaths.map(path => store.file(path)));
  if (files.some(blob => !blob?.size)) throw Error('原作资源包包含空白的游戏数据。');
  const byPath = new Map(requiredPaths.map((path, index) => [path, files[index]]));
  for (const path of ['save/0.zip', 'resource/smap.zip', 'resource/mmap.zip']) {
    const signature = new Uint8Array(await byPath.get(path).slice(0, 4).arrayBuffer());
    if (signature[0] !== 0x50 || signature[1] !== 0x4b || signature[2] !== 3 || signature[3] !== 4) {
      throw Error('原作 ZIP 文件无法识别：' + path);
    }
  }
  if (files.some((blob, index) => requiredPaths[index].endsWith('.002') && blob.size !== 480 * 480 * 2)) {
    throw Error('原作大地图数据尺寸不符。');
  }
  const war = byPath.get('resource/war.sta');
  const idx = byPath.get('resource/warfld.idx');
  const group = byPath.get('resource/warfld.grp');
  const tail = await idx.slice(-4).arrayBuffer();
  if (war.size % 186 || idx.size % 4 || tail.byteLength !== 4 || new DataView(tail).getUint32(0, true) !== group.size) {
    throw Error('原作战斗索引数据不符。');
  }
}

async function extractArchive(file, { signal, notify, save }) {
  if (file.size > maxArchiveBytes) throw Error('原作压缩包超出浏览器导入容量。');
  const signature = new Uint8Array(await file.slice(0, packSignature.length).arrayBuffer());
  if (!packSignature.every((byte, index) => signature[index] === byte)) throw Error('请选择原作的 .7z 资源包。');
  signal?.throwIfAborted();
  const worker = new Worker(new URL('./sevenzip-worker.js', import.meta.url));
  let total, received = 0, abort;
  const result = new Promise((resolve, reject) => {
    abort = () => reject(signal.reason);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    worker.onerror = event => reject(Error(event.message || '浏览器无法运行 7-Zip 解包。'));
    worker.onmessageerror = () => reject(Error('浏览器无法读取解包后的资源。'));
    worker.onmessage = async ({ data }) => {
      try {
        signal?.throwIfAborted();
        if (data.type === 'listed') {
          total = data.total;
          notify({ phase: 'extracting', done: 0, total, bytes: data.bytes, methods: data.methods });
        } else if (data.type === 'batch') {
          const rows = data.files.map(({ path, buffer }) => ({ path, blob: new Blob([buffer]) }));
          await save(rows);
          received += rows.length;
          notify({ phase: 'saving', done: received, total });
          worker.postMessage({ type: 'ack' });
        } else if (data.type === 'error') reject(Error(data.message));
        else if (data.type === 'done') {
          if (!total || received !== total) throw Error('原作压缩包解包未完成。');
          resolve();
        }
      } catch (error) { reject(error); }
    };
    worker.postMessage({ type: 'extract', file });
  });
  try { await result; }
  finally {
    signal?.removeEventListener('abort', abort);
    worker.terminate();
  }
}

/** Stage browser files, validate the complete import, then promote one active IndexedDB generation. */
export async function importGamePack(source, { onProgress, signal, validate } = {}) {
  const notify = value => { try { onProgress?.(value); } catch { /* UI feedback cannot invalidate an import. */ } };
  signal?.throwIfAborted();
  notify({ phase: 'reading' });
  const db = await database();
  const id = crypto.randomUUID();
  const archive = source instanceof Blob;
  const entries = [];
  async function save(rows) {
    await writeBatch(db, id, rows);
    for (const { path, blob } of rows) entries.push({ path, size: blob.size });
  }
  try {
    if (archive) await extractArchive(source, { signal, notify, save });
    else {
      const files = readFolder(source);
      checkPackEntries(files);
      for (let index = 0; index < files.length; index += 64) {
        signal?.throwIfAborted();
        await save(files.slice(index, index + 64));
        notify({ phase: 'saving', done: Math.min(index + 64, files.length), total: files.length });
      }
    }
    const bytes = checkPackEntries(entries);
    const record = { id, kind: archive ? '7z' : 'folder', paths: entries.map(entry => entry.path).sort(), bytes };
    const store = storeFor(db, record);
    notify({ phase: 'validating' });
    await validatePack(store);
    await validate?.(store);
    signal?.throwIfAborted();
    const expired = await activate(db, record);
    await removeGeneration(db, expired).catch(() => {});
    notify({ phase: 'complete', done: entries.length, total: entries.length, bytes });
    return store;
  } catch (error) {
    await removeGeneration(db, id).catch(() => {});
    throw error;
  }
}
