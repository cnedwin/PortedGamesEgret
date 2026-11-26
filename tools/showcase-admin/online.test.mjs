import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createAdmin } from './server.mjs';

const origin = 'https://editor.example.test', host = new URL(origin).host;
const base = 'a'.repeat(40), proposed = 'b'.repeat(40);
const pr = 'https://github.com/cnedwin/PortedGamesEgret/pull/901';
const source = await readFile(new URL('../../showcase/games.js', import.meta.url));
const image = await readFile(new URL('../../showcase/media/nine/detail-1.webp', import.meta.url));

test('public mode requires GitHub login and locks the saved draft pending PR review', async t => {
  const dataDir = await mkdtemp(join(tmpdir(), 'showcase-online-'));
  let server;
  t.after(async () => {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  });
  let attempts = 0, review = 'open', ref = base, conflict = false;
  const submissions = [], proposedAgain = 'd'.repeat(40), prAgain = pr.replace('/901', '/902');
  const publisher = {
    sync: async () => ref,
    read: async () => source,
    publish: async ({ base: draftBase, files, accessToken, submissionId, actor }) => {
      assert.equal(draftBase, base);
      assert.deepEqual([...files.keys()].sort(), ['showcase/games.js', 'showcase/media/nine/detail-1.webp']);
      assert.deepEqual(files.get('showcase/media/nine/detail-1.webp'), image);
      assert.equal(accessToken, 'temporary-test-user-token');
      assert.match(submissionId, /^[0-9a-f]{48}$/);
      assert.deepEqual(actor, { id: 42, login: 'editor' });
      if (conflict) throw Object.assign(new Error('edited path changed on main'), { code: 'CONFLICT' });
      submissions.push(submissionId);
      attempts++;
      return attempts === 1
        ? { commit: proposed, url: pr, pending: true }
        : { commit: proposedAgain, url: prAgain, pending: true };
    },
    reviewStatus: async ({ url, commit, accessToken }) => {
      assert.equal(url, attempts === 1 ? pr : prAgain);
      assert.equal(commit, attempts === 1 ? proposed : proposedAgain);
      assert.equal(accessToken, 'temporary-test-user-token');
      return review;
    }
  };
  const auth = {
    begin: () => ({ url: 'https://github.com/login/oauth/authorize?state=test',
      cookie: '__Host-test=nonce; Path=/; Secure; HttpOnly; SameSite=Lax' }),
    clearCookie: '__Host-test=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0',
    finish: async ({ cookie, state, code }) => {
      if (cookie !== '__Host-test=nonce' || state !== 'test' || code !== 'ready') throw new Error('denied');
      return { accessToken: 'temporary-test-user-token', actor: { id: 42, login: 'editor' },
        expires: Date.now() + 3_600_000 };
    }
  };
  const start = async () => {
    server = await createAdmin({ online: { origin, auth }, publisher, dataDir });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
  };
  const call = (path, method = 'GET', data, headers = {}) => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: server.address().port, path, method,
      headers: { Host: host, Origin: origin, 'Content-Type': 'application/json', ...headers } }, reply => {
      const chunks = [];
      reply.on('data', chunk => chunks.push(chunk));
      reply.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve({ status: reply.statusCode, headers: reply.headers, raw,
          json: reply.headers['content-type']?.startsWith('application/json') && raw ? JSON.parse(raw) : null });
      });
    });
    req.on('error', reject);
    req.end(data === undefined ? undefined : JSON.stringify(data));
  });
  await start();
  assert.equal((await call('/healthz', 'GET', undefined, { Host: 'internal' })).status, 204);
  assert.equal((await call('/', 'GET', undefined, { Host: 'rebind.test' })).status, 403);
  const unauth = await call('/api/state');
  assert.equal(unauth.status, 401);
  assert.equal(unauth.json.authMode, 'github');
  assert.equal((await call('/api/login', 'POST', { username: 'editor', password: 'wrong' })).status, 404);
  assert.equal((await call('/api/media/nine/0')).status, 401);
  const challenge = await call('/auth/github');
  assert.equal(challenge.status, 303);
  assert.match(challenge.headers.location, /^https:\/\/github\.com\//);
  const rejected = await call('/auth/github/callback?state=bad&code=ready', 'GET', undefined,
    { Cookie: '__Host-test=nonce' });
  assert.equal(rejected.headers.location, '/?login=denied');

  async function login() {
    const success = await call('/auth/github/callback?state=test&code=ready', 'GET', undefined,
      { Cookie: '__Host-test=nonce' });
    assert.equal(success.headers.location, '/');
    const session = success.headers['set-cookie'].find(value => value.startsWith('__Host-egret_showcase_session='));
    assert.match(session, /HttpOnly; SameSite=Strict; Secure/);
    const headers = { Cookie: session.split(';')[0] };
    const signedIn = await call('/api/state', 'GET', undefined, headers);
    assert.equal(signedIn.status, 200);
    assert.equal(signedIn.json.authMode, 'github');
    assert.equal(signedIn.json.actor.id, 42);
    assert(!signedIn.raw.includes('temporary-test-user-token'));
    return { state: signedIn.json, headers: { ...headers, 'X-CSRF-Token': signedIn.json.csrf } };
  }
  const { state, headers } = await login();
  const order = ['nine', ...state.games.map(game => game.id).filter(id => id !== 'nine')];
  const update = { revision: state.revision, order,
    summaries: { nine: { zh: '新简介', en: 'New overview' } },
    uploads: [{ id: 'nine', index: 1, data: image.toString('base64') }] };
  assert.equal((await call('/api/draft', 'PUT', update, { ...headers, Origin: 'http://' + host })).status, 403);
  const saved = await call('/api/draft', 'PUT', update, headers);
  assert.equal(saved.status, 200);
  const result = await call('/api/publish', 'POST', { revision: saved.json.revision }, headers);
  assert.equal(result.status, 200);
  assert.equal(result.json.pending, true);
  assert.equal(result.json.state.review.url, pr);
  const reviewing = result.json.state.revision;
  assert.equal((await call('/api/publish', 'POST', { revision: reviewing }, headers)).status, 409);
  assert.equal((await call('/api/refresh', 'POST', { revision: reviewing }, headers)).status, 409);
  assert.equal(attempts, 1);
  assert(!(await readFile(join(dataDir, 'draft.json'), 'utf8')).includes('temporary-test-user-token'));

  await new Promise(resolve => server.close(resolve));
  await start();
  const resumed = await login();
  assert.equal(resumed.state.review.commit, proposed);
  // A closed review is not a published edit. Even when main has advanced,
  // keep its basis and all saved content so conflict checks can run again.
  ref = 'c'.repeat(40);
  review = 'closed';
  const closed = await call('/api/refresh', 'POST', { revision: resumed.state.revision }, resumed.headers);
  assert.equal(closed.status, 200);
  assert.equal(closed.json.base, base);
  assert.equal(closed.json.reviewOutcome, 'closed-unmerged');
  assert.equal(closed.json.review, null);
  assert.equal(closed.json.dirty, true);
  assert.notEqual(closed.json.revision, resumed.state.revision);
  assert.deepEqual(closed.json.games.map(game => game.id), order);
  assert.deepEqual(closed.json.games[0].summary, update.summaries.nine);
  const keptDraft = JSON.parse(await readFile(join(dataDir, 'draft.json'), 'utf8'));
  assert.equal(keptDraft.base, base);
  assert.equal(keptDraft.review, undefined);
  assert.deepEqual(keptDraft.uploads, update.uploads);

  await new Promise(resolve => server.close(resolve));
  await start();
  const reopened = await login();
  assert.equal(reopened.state.revision, closed.json.revision);
  assert.equal(reopened.state.dirty, true);
  assert.equal(reopened.state.base, base);
  assert.deepEqual(reopened.state.games[0].summary, update.summaries.nine);
  conflict = true;
  const refused = await call('/api/publish', 'POST', { revision: reopened.state.revision }, reopened.headers);
  assert.equal(refused.status, 409);
  assert.equal((await call('/api/state', 'GET', undefined, reopened.headers)).json.revision, reopened.state.revision);
  conflict = false;
  review = 'open';
  const resubmitted = await call('/api/publish', 'POST', { revision: reopened.state.revision }, reopened.headers);
  assert.equal(resubmitted.status, 200);
  assert.equal(resubmitted.json.state.review.url, prAgain);
  assert.equal(attempts, 2);
  assert.notEqual(submissions[0], submissions[1], 'a new review has a new submission ID');

  ref = proposedAgain;
  review = 'merged';
  const refreshed = await call('/api/refresh', 'POST', { revision: resubmitted.json.state.revision }, reopened.headers);
  assert.equal(refreshed.status, 200);
  assert.equal(refreshed.json.base, proposedAgain);
  assert.equal(refreshed.json.review, null);
  assert.equal(refreshed.json.dirty, false);
});
