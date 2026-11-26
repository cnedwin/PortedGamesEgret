import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

// The engine is found under the names the page uses: the vendored copy brings its own Node loader.
const { loadModels, loadStockCharacters } = await import('../src/view/models.mjs');

test('shared fallback cancels both reads when the page closes', async t => {
  const reads = [];
  t.mock.method(globalThis, 'fetch', (url, { signal }) => {
    reads.push(url.pathname);
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  });
  const page = new AbortController();
  const failure = assert.rejects(loadStockCharacters(base, page.signal), { name: 'AbortError' });
  page.abort();
  await failure;
  assert.deepEqual(reads.map(path => path.split('/').pop()).sort(), [
    'models-stock-characters.bin', 'models-stock-characters.json'
  ]);
});

const base = new URL('https://snowtemple.example.invalid/assets/');
const roles = ['hero', 'blade', 'shield', 'bow', 'lu'];
const fullBodies = Object.fromEntries(roles.map(name => [name, [{}]]));
const stock = new Uint8Array(208);
const index = Object.fromEntries([...roles, 'spear'].map((name, i) => [name, {
  count: 1, indices: 3, lo: [0, 0, 0], size: [1, 1, 1],
  offset: i * 36, bytes: i < roles.length ? 36 : 28, skinned: i < roles.length
}]));

async function withPack(scenario, { rangeSupport = true, manifest = index, breakStart, truncate } = {}) {
  const realFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    if (url.pathname.endsWith('.json')) return Response.json(manifest);
    const range = options?.headers?.Range;
    requests.push(range ?? 'full');
    if (!range || !rangeSupport) return new Response(stock);
    const [, first, last] = range.match(/^bytes=(\d+)-(\d+)$/);
    const start = Number(first), end = Number(last);
    if (start === breakStart) return new Response(null, { status: 416 });
    return new Response(stock.slice(start, end + (start === truncate ? 0 : 1)), {
      status: 206, headers: { 'Content-Range': `bytes ${first}-${last}/${stock.length}` }
    });
  };
  try {
    await scenario(requests);
  } finally {
    globalThis.fetch = realFetch;
  }
}

test('stock scene begins transfer before external bodies have finished', async () => {
  await withPack(async (requests) => {
    const external = Promise.withResolvers();
    const models = loadModels('low', base, external.promise);
    try {
      await new Promise(resolve => setImmediate(resolve));
      assert.deepEqual(requests, ['bytes=180-207']);
    } finally {
      external.resolve(fullBodies);
      await models;
    }
    assert.deepEqual(Object.keys(await models), ['spear']);
  });
});

test('missing adjacent external bodies refill only their contiguous stock span', async () => {
  await withPack(async (requests) => {
    const models = await loadModels('low', base, Promise.resolve({ hero: [{}], bow: [{}] }));
    assert.deepEqual(requests, ['bytes=180-207', 'bytes=36-107', 'bytes=144-179']);
    assert.deepEqual(Object.keys(models), ['blade', 'shield', 'lu', 'spear']);
  });
});

test('a host that ignores Range returns one reusable full download', async () => {
  await withPack(async (requests) => {
    const models = await loadModels('low', base, Promise.resolve({ hero: [{}], lu: [] }));
    assert.deepEqual(requests, ['bytes=180-207']);
    assert.deepEqual(Object.keys(models), ['blade', 'shield', 'bow', 'lu', 'spear']);
  }, { rangeSupport: false });
});

test('an explicitly stock run requests the full pack without waiting for character bodies', async () => {
  await withPack(async (requests) => {
    const models = await loadModels('low', base);
    assert.deepEqual(requests, ['full']);
    assert.deepEqual(Object.keys(models), [...roles, 'spear']);
  });
});

test('rejected suffix recovers through exactly one full request', async () => {
  await withPack(async (requests) => {
    const models = await loadModels('low', base, Promise.resolve({ hero: [{}] }));
    assert.deepEqual(requests, ['bytes=180-207', 'full']);
    assert.deepEqual(Object.keys(models), ['blade', 'shield', 'bow', 'lu', 'spear']);
  }, { breakStart: 180 });
});

test('truncated stock refill uses a single full fallback', async () => {
  await withPack(async (requests) => {
    const models = await loadModels('low', base, Promise.resolve({ hero: [{}], bow: [{}] }));
    assert.deepEqual(requests, ['bytes=180-207', 'bytes=36-107', 'full']);
    assert.deepEqual(Object.keys(models), ['blade', 'shield', 'lu', 'spear']);
  }, { truncate: 36 });
});

test('an out-of-order body layout disables speculation without changing valid external roles', async () => {
  const manifest = { ...index, lu: { ...index.spear, skinned: false }, spear: index.lu };
  await withPack(async (requests) => {
    const models = await loadModels('low', base, Promise.resolve(fullBodies));
    assert.deepEqual(requests, ['full']);
    assert.deepEqual(Object.keys(models), ['spear']);
  }, { manifest });
});
