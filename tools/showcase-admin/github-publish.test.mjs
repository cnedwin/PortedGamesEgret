import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createGitHubPublisher } from './github-publish.mjs';

const REPO = 'cnedwin/PortedGamesEgret';
const API = `https://api.github.com/repos/${REPO}`;
const RAW = `https://raw.githubusercontent.com/${REPO}/`;
const CATALOG = 'showcase/games.js';
const BASE = 'a'.repeat(40), SUBMISSION = 'b'.repeat(48);
const TOKEN = 'ghu_fixture-only-do-not-persist';
const ACTOR = { id: 42, login: 'editor' };
const sha = value => createHash('sha1').update(value).digest('hex');
const blobHash = buffer => sha(Buffer.concat([Buffer.from(`blob ${buffer.length}\0`), buffer]));
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function fixture() {
  const blobs = new Map(), trees = new Map(), commits = new Map(), refs = new Map([['main', BASE]]);
  const calls = [], pulls = [];
  const store = bytes => { const value = Buffer.from(bytes), hash = blobHash(value); blobs.set(hash, value); return hash; };
  const saveTree = files => {
    const hash = sha(JSON.stringify([...files].sort())); trees.set(hash, files); return hash;
  };
  const firstTree = saveTree(new Map([
    [CATALOG, store('export const GAMES = ["原始展示"];\n')],
    ['OtherGame/code.mjs', store('old other game\n')]
  ]));
  commits.set(BASE, { sha: BASE, message: 'Fixture base', tree: { sha: firstTree }, parents: [] });
  const f = { calls, pulls, blobs, trees, commits, refs, main: () => refs.get('main'),
    file: (commit, path) => blobs.get(trees.get(commits.get(commit).tree.sha).get(path)),
    upstream(changes) {
      const parent = refs.get('main'), files = new Map(trees.get(commits.get(parent).tree.sha));
      for (const [path, bytes] of changes) files.set(path, store(bytes));
      const tree = saveTree(files), hash = sha(parent + tree + 'concurrent');
      commits.set(hash, { sha: hash, tree: { sha: tree }, parents: [{ sha: parent }], message: 'Other update' });
      refs.set('main', hash); return hash;
    }
  };
  const ancestor = (base, head) => base === head || commits.get(head)?.parents.some(parent => ancestor(base, parent.sha));
  f.fetchImpl = async (input, options = {}) => {
    const url = new URL(input), method = options.method ?? 'GET';
    const headers = new Headers(options.headers);
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ url: url.href, method, headers, body });
    if (f.override) {
      const overridden = await f.override({ url, method, headers, body });
      if (overridden) return overridden;
    }
    if (url.origin === 'https://raw.githubusercontent.com') {
      assert.equal(headers.has('authorization'), false);
      const [revision, ...pieces] = url.pathname.slice(`/${REPO}/`.length).split('/');
      const bytes = commits.has(revision) ? f.file(revision, pieces.join('/')) : null;
      return bytes ? new Response(bytes) : json({ message: 'not found' }, 404);
    }
    assert.equal(url.origin, 'https://api.github.com');
    if (url.pathname === '/user') return json(ACTOR);
    assert(url.pathname.startsWith(`/repos/${REPO}`));
    const route = url.pathname.slice(`/repos/${REPO}`.length);
    if (route === '') return json({ full_name: REPO, permissions: { push: true } });
    if (route.startsWith('/git/ref/heads/')) {
      const branch = decodeURIComponent(route.slice('/git/ref/heads/'.length)), commit = refs.get(branch);
      return commit ? json({ ref: `refs/heads/${branch}`, object: { sha: commit } }) : json({}, 404);
    }
    if (route.startsWith('/compare/')) {
      const [base, head] = route.slice('/compare/'.length).split('...');
      return json({ status: base === head ? 'identical' : ancestor(base, head) ? 'ahead' : 'diverged',
        merge_base_commit: { sha: ancestor(base, head) ? base : 'f'.repeat(40) } });
    }
    if (route.startsWith('/git/commits/') && method === 'GET') return json(commits.get(route.split('/').at(-1)) ?? {}, commits.has(route.split('/').at(-1)) ? 200 : 404);
    if (route === '/git/blobs' && method === 'POST') {
      assert.equal(body.encoding, 'base64');
      return json({ sha: store(Buffer.from(body.content, 'base64')) }, 201);
    }
    if (route === '/git/trees' && method === 'POST') {
      assert(trees.has(body.base_tree));
      const files = new Map(trees.get(body.base_tree));
      for (const entry of body.tree) {
        assert.equal(entry.mode, '100644'); assert.equal(entry.type, 'blob');
        assert(blobs.has(entry.sha)); files.set(entry.path, entry.sha);
      }
      return json({ sha: saveTree(files) }, 201);
    }
    if (route === '/git/commits' && method === 'POST') {
      const hash = sha(JSON.stringify(body));
      commits.set(hash, { sha: hash, tree: { sha: body.tree }, parents: body.parents.map(value => ({ sha: value })), message: body.message });
      return json({ sha: hash }, 201);
    }
    if (route === '/git/refs' && method === 'POST') {
      assert.notEqual(body.ref, 'refs/heads/main');
      const branch = body.ref.slice('refs/heads/'.length);
      if (refs.has(branch)) return json({}, 422);
      refs.set(branch, body.sha); return json({ object: { sha: body.sha } }, 201);
    }
    if (route === '/pulls' && method === 'GET') {
      const branch = url.searchParams.get('head')?.slice('cnedwin:'.length);
      return json(pulls.filter(pr => pr.head.ref === branch && pr.base.ref === url.searchParams.get('base')));
    }
    if (route === '/pulls' && method === 'POST') {
      assert.equal(body.base, 'main');
      if (pulls.some(pr => pr.head.ref === body.head)) return json({}, 422);
      const number = pulls.length + 1, pr = {
        number, html_url: `https://github.com/${REPO}/pull/${number}`, state: 'open', merged_at: null,
        base: { ref: 'main', repo: { full_name: REPO } },
        head: { ref: body.head, sha: refs.get(body.head), repo: { full_name: REPO } }
      };
      pulls.push(pr); return json(pr, 201);
    }
    if (/^\/pulls\/\d+$/.test(route)) {
      const pr = pulls.find(value => value.number === Number(route.split('/').at(-1)));
      return json(pr ?? {}, pr ? 200 : 404);
    }
    throw new Error(`Unexpected fixture endpoint: ${method} ${url.href}`);
  };
  f.publisher = createGitHubPublisher({ fetchImpl: f.fetchImpl });
  f.request = files => ({ base: BASE, files, accessToken: TOKEN, submissionId: SUBMISSION, actor: ACTOR });
  return f;
}

test('public sync and immutable binary reads use only fixed hosts and validated SHA/paths without credentials', async () => {
  const f = fixture();
  assert.equal(await f.publisher.sync(), BASE);
  assert.deepEqual(await f.publisher.read(BASE, CATALOG), f.file(BASE, CATALOG));
  assert(f.calls.every(call => !call.headers.has('authorization')));
  const before = f.calls.length;
  for (const revision of ['main', '--bad', BASE.toUpperCase()]) await assert.rejects(f.publisher.read(revision, CATALOG), error => error.code === 'INVALID_REVISION');
  for (const path of ['index.html', '../showcase/games.js', 'showcase/media/Bad/cover.webp']) await assert.rejects(f.publisher.read(BASE, path), error => error.code === 'INVALID_PATH');
  assert.equal(f.calls.length, before);
});

test('publication preserves concurrent other-game changes and sends exact bilingual and binary blobs only to a PR branch', async () => {
  const f = fixture(), upstream = f.upstream(new Map([['OtherGame/code.mjs', Buffer.from('new game logic\n')]]));
  const text = Buffer.from('export const GAMES = ["中文", "English"];\n'), image = Buffer.from([0, 1, 255, 0, 13, 10]);
  const result = await f.publisher.publish(f.request(new Map([[CATALOG, text], ['showcase/media/safe-id/cover.webp', image]])));
  assert.equal(result.pending, true);
  assert.equal(f.main(), upstream);
  assert.deepEqual(f.file(result.commit, CATALOG), text);
  assert.deepEqual(f.file(result.commit, 'showcase/media/safe-id/cover.webp'), image);
  assert.deepEqual(f.file(result.commit, 'OtherGame/code.mjs'), Buffer.from('new game logic\n'));
  assert.equal(f.commits.get(result.commit).parents[0].sha, upstream);
  assert.equal(f.pulls.length, 1);
  assert.match(result.url, /^https:\/\/github\.com\/cnedwin\/PortedGamesEgret\/pull\/1$/);
  assert(f.calls.filter(call => call.method === 'POST' && call.url.endsWith('/git/trees')).every(call =>
    call.body.tree.every(entry => entry.path === CATALOG || entry.path === 'showcase/media/safe-id/cover.webp')));
  assert.equal(f.calls.some(call => call.method === 'PATCH' || call.method === 'DELETE'), false);
});

test('same-path edits and non-ancestor bases stop before any repository write', async () => {
  const f = fixture();
  f.upstream(new Map([[CATALOG, Buffer.from('someone else edited this\n')]]));
  await assert.rejects(f.publisher.publish(f.request(new Map([[CATALOG, Buffer.from('mine\n')]]))), error => error.code === 'CONFLICT' && error.paths.includes(CATALOG));
  assert.equal(f.calls.some(call => call.method !== 'GET'), false);
  const request = f.request(new Map([[CATALOG, Buffer.from('mine\n')]]));
  request.base = 'e'.repeat(40);
  await assert.rejects(f.publisher.publish(request), error => error.code === 'INVALID_BASE');
});

test('submission retries and parallel identical submissions reuse one commit-bound branch and one review', async () => {
  const f = fixture(), request = f.request(new Map([[CATALOG, Buffer.from('retry safe\n')]]));
  const [a, b] = await Promise.all([f.publisher.publish(request), f.publisher.publish(request)]);
  assert.deepEqual(a, b);
  assert.deepEqual(await f.publisher.publish(request), a);
  assert.equal(f.pulls.length, 1);
  assert.equal([...f.refs.keys()].filter(key => key.startsWith('showcase-admin/')).length, 1);
  await assert.rejects(f.publisher.publish({ ...request, files: new Map([[CATALOG, Buffer.from('changed after submitting\n')]]) }), error => error.code === 'CONFLICT');
  assert.equal(f.main(), BASE);
});

test('two independent brokers racing the same submission recover GitHub ref/PR uniqueness without force updates', async () => {
  const f = fixture(), other = createGitHubPublisher({ fetchImpl: f.fetchImpl });
  const request = f.request(new Map([[CATALOG, Buffer.from('two server instances\n')]]));
  const [a, b] = await Promise.all([f.publisher.publish(request), other.publish(request)]);
  assert.deepEqual(a, b);
  assert.equal(f.pulls.length, 1);
  assert.equal(f.main(), BASE);
  assert.equal(f.calls.some(call => call.method === 'PATCH'), false);
});

test('input, revoked permissions, actor mismatch and network failures produce safe actionable errors', async () => {
  const f = fixture(), valid = f.request(new Map([[CATALOG, Buffer.from('x')]]));
  await assert.rejects(f.publisher.publish({ ...valid, submissionId: '../bad' }), error => error.code === 'INVALID_SUBMISSION');
  await assert.rejects(f.publisher.publish({ ...valid, files: new Map([['.github/workflows/deploy.yml', Buffer.from('x')]]) }), error => error.code === 'INVALID_PATH');
  await assert.rejects(f.publisher.publish({ ...valid, actor: { id: 99, login: 'other' } }), error => error.code === 'ACTOR_MISMATCH');
  f.override = ({ url }) => url.pathname === '/user' ? json({ message: TOKEN }, 401) : null;
  await assert.rejects(f.publisher.publish(valid), error => error.code === 'AUTH_REVOKED' && !JSON.stringify(error).includes(TOKEN) && !error.message.includes(TOKEN));
  f.override = ({ url }) => url.href === API ? json({ message: TOKEN }, 403) : null;
  await assert.rejects(f.publisher.publish(valid), error => error.code === 'FORBIDDEN');
  f.override = () => { throw new Error(TOKEN); };
  await assert.rejects(f.publisher.publish(valid), error => error.code === 'NETWORK' && !error.message.includes(TOKEN));
});

test('review status is read-only, validates the fixed repository and rejects a changed head', async () => {
  const f = fixture(), result = await f.publisher.publish(f.request(new Map([[CATALOG, Buffer.from('review\n')]])));
  const query = { ...result, accessToken: TOKEN };
  const count = f.calls.length;
  assert.equal(await f.publisher.reviewStatus(query), 'open');
  f.pulls[0].state = 'closed';
  assert.equal(await f.publisher.reviewStatus(query), 'closed');
  f.pulls[0].merged_at = '2026-11-25T00:00:00Z';
  assert.equal(await f.publisher.reviewStatus(query), 'merged');
  assert(f.calls.slice(count).every(call => call.method === 'GET'));
  f.pulls[0].head.sha = 'd'.repeat(40);
  await assert.rejects(f.publisher.reviewStatus(query), error => error.code === 'CONFLICT');
  await assert.rejects(f.publisher.reviewStatus({ ...query, url: 'https://github.com/evil/repo/pull/1' }), error => error.code === 'INVALID_REVIEW');
});

test('lost branch and PR responses recover their confirmed objects without duplicate reviews', async () => {
  for (const stage of ['branch', 'review']) {
    const f = fixture(), request = f.request(new Map([[CATALOG, Buffer.from('lost response\n')]]));
    let held = false;
    f.override = ({ url, method, body }) => {
      if (method !== 'POST' || held) return null;
      if (stage === 'branch' && url.href === API + '/git/refs') {
        held = true; f.refs.set(body.ref.slice('refs/heads/'.length), body.sha);
        throw new Error(TOKEN);
      }
      if (stage === 'review' && url.href === API + '/pulls') {
        held = true;
        f.pulls.push({ number: 1, html_url: `https://github.com/${REPO}/pull/1`, state: 'open', merged_at: null,
          base: { ref: 'main', repo: { full_name: REPO } },
          head: { ref: body.head, sha: f.refs.get(body.head), repo: { full_name: REPO } } });
        throw new Error(TOKEN);
      }
      return null;
    };
    await assert.rejects(f.publisher.publish(request), error => error.code === 'NETWORK');
    f.override = null;
    const result = await f.publisher.publish(request);
    assert.equal(result.commit, f.refs.get('showcase-admin/' + SUBMISSION));
    assert.equal(f.pulls.length, 1);
    assert.equal(f.main(), BASE);
  }
});

test('a review commit with an extra non-showcase path cannot be reused even if its message and submitted files match', async () => {
  const f = fixture(), request = f.request(new Map([[CATALOG, Buffer.from('same submitted content\n')]]));
  const result = await f.publisher.publish(request);
  const original = f.commits.get(result.commit), files = new Map(f.trees.get(original.tree.sha));
  const badBytes = Buffer.from('unexpected project rewrite\n'), badBlob = blobHash(badBytes);
  f.blobs.set(badBlob, badBytes); files.set('OtherGame/unexpected.mjs', badBlob);
  const badTree = sha(JSON.stringify([...files].sort())), badCommit = sha('tampered ' + result.commit);
  f.trees.set(badTree, files);
  f.commits.set(badCommit, { ...original, sha: badCommit, tree: { sha: badTree } });
  f.refs.set('showcase-admin/' + SUBMISSION, badCommit); f.pulls[0].head.sha = badCommit;
  await assert.rejects(f.publisher.publish(request), error => error.code === 'CONFLICT');
  assert.equal(f.main(), BASE);
  assert.equal(f.pulls.length, 1);
});

test('rate limits and reduced repository permission stop submission before writes, with no raw error reflection', async () => {
  const f = fixture(), request = f.request(new Map([[CATALOG, Buffer.from('x')]]));
  f.override = ({ url }) => url.href === API ? json({ full_name: REPO, permissions: { push: false } }) : null;
  await assert.rejects(f.publisher.publish(request), error => error.code === 'FORBIDDEN');
  assert.equal(f.calls.some(call => call.method !== 'GET'), false);
  f.override = () => new Response(TOKEN, { status: 429 });
  await assert.rejects(f.publisher.sync(), error => error.code === 'RATE_LIMIT' && error.retryable && !error.message.includes(TOKEN));
});
