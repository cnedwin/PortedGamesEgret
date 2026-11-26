import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { get } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createAccount, createAdmin } from './server.mjs';
import { readCatalog } from './catalog.mjs';

const source = await readFile(new URL('../../showcase/games.js', import.meta.url));
const image = await readFile(new URL('../../showcase/media/nine/detail-1.webp', import.meta.url));
const base = 'a'.repeat(40), nextCommit = 'b'.repeat(40);

test('login, private persistent draft, validated image preview, and explicit publication', async t => {
  const dataDir = await mkdtemp(join(tmpdir(), 'showcase-admin-'));
  const commits = new Map([[base, new Map([['showcase/games.js', source]])]]);
  let latest = base, published = null;
  const publisher = {
    sync: async () => latest,
    read: async (revision, name) => commits.get(revision).get(name) ?? image,
    publish: async ({ base: previous, files }) => {
      assert.equal(previous, base);
      published = new Map(files);
      commits.set(nextCommit, new Map([...commits.get(previous), ...files]));
      latest = nextCommit;
      return { commit: latest, url: 'https://example.com/commit/' + latest };
    }
  };
  const account = await createAccount('editor', 'temporary-test-password');
  let server, origin, cookie, csrf;
  t.after(async () => {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  });
  async function start() {
    server = await createAdmin({ dataDir, account, publisher });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    origin = 'http://127.0.0.1:' + server.address().port;
  }
  const call = (path, method = 'GET', data, extras) => fetch(origin + path, {
    method, headers: { Origin: origin, Cookie: cookie ?? '', 'X-CSRF-Token': csrf ?? '',
      'Content-Type': 'application/json', ...extras },
    ...(data === undefined ? {} : { body: JSON.stringify(data) })
  });
  async function signIn() {
    const response = await call('/api/login', 'POST', { username: 'editor', password: 'temporary-test-password' });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    cookie = response.headers.get('set-cookie').split(';')[0];
    const state = await response.json();
    csrf = state.csrf;
    return state;
  }

  await start();
  assert.equal((await call('/api/state')).status, 401);
  assert.equal((await call('/api/media/nine/1')).status, 401);
  assert.equal((await call('/api/login', 'POST', { username: 'editor', password: 'wrong' })).status, 401);
  const state = await signIn();
  assert(state.games.length >= 20);
  assert.equal(state.games.find(game => game.id === 'nine').images.length, 3);
  const outsideHost = await new Promise((resolve, reject) => {
    get(origin + '/api/state', { headers: { Host: 'rebound.invalid' } }, incoming => {
      incoming.resume();
      resolve(incoming.statusCode);
    }).on('error', reject);
  });
  assert.equal(outsideHost, 403);
  const order = ['nine', ...state.games.map(game => game.id).filter(id => id !== 'nine')];
  const edit = { revision: state.revision, order, summaries: { nine: { zh: '九州新简介', en: 'New overview' } },
    uploads: [{ id: 'nine', index: 1, data: image.toString('base64') }] };
  assert.equal((await call('/api/draft', 'PUT', edit, { 'X-CSRF-Token': 'incorrect' })).status, 403);
  assert.equal((await call('/api/draft', 'PUT', edit, { Origin: 'https://elsewhere.invalid' })).status, 403);
  const invalid = { ...edit, uploads: [{ id: 'nine', index: 1, data: Buffer.from('not a picture').toString('base64') }] };
  assert.equal((await call('/api/draft', 'PUT', invalid)).status, 400);
  const savedResponse = await call('/api/draft', 'PUT', edit);
  assert.equal(savedResponse.status, 200);
  const saved = await savedResponse.json();
  assert(saved.dirty);
  assert.equal(saved.games[0].id, 'nine');
  assert.equal(saved.games[0].summary.zh, '九州新简介');
  assert.equal(published, null);
  assert.equal((await call('/api/draft', 'PUT', edit)).status, 409);
  assert.deepEqual(Buffer.from(await (await call(saved.games[0].images[1])).arrayBuffer()), image);

  await new Promise(resolve => server.close(resolve));
  await start();
  assert.equal((await call('/api/state')).status, 401);
  const restored = await signIn();
  assert.equal(restored.revision, saved.revision);
  assert.equal(restored.games[0].summary.en, 'New overview');
  const receiptResponse = await call('/api/publish', 'POST', { revision: restored.revision });
  assert.equal(receiptResponse.status, 200);
  const receipt = await receiptResponse.json();
  assert.equal(receipt.commit, nextCommit);
  assert.equal(receipt.state.dirty, false);
  assert.equal(receipt.state.games[0].id, 'nine');
  assert.equal(readCatalog(published.get('showcase/games.js').toString()).games[0].summary.en, 'New overview');
  assert.deepEqual([...published.keys()].sort(), ['showcase/games.js', 'showcase/media/nine/detail-1.webp']);
  assert.equal((await call('/api/logout', 'POST', {})).status, 200);
  assert.equal((await call('/api/state')).status, 401);
});
