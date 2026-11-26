import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm, unlink } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { createPublisher } from './publish.mjs';

const CATALOG = 'showcase/games.js';
const INITIAL = Buffer.from('export const GAMES = ["initial"];\n');
const CHANGED = Buffer.from('export const GAMES = ["edited"];\n');

function git(cwd, ...args) {
  return new Promise((resolveResult, reject) => {
    const child = spawn('git', args, { cwd, windowsHide: true, env: {
      ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never'
    }});
    const output = [], errors = [];
    child.stdout.on('data', chunk => output.push(chunk));
    child.stderr.on('data', chunk => errors.push(chunk));
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolveResult(Buffer.concat(output))
      : reject(new Error(`Local fixture git failed (${args[0]}): ${Buffer.concat(errors).toString()}`)));
  });
}

async function put(repo, path, content) {
  const file = join(repo, path);
  await mkdir(join(file, '..'), { recursive: true });
  await writeFile(file, content);
}

async function fixture(t) {
  const parent = resolve(tmpdir());
  const root = await mkdtemp(join(parent, 'showcase-publish-test-'));
  t.after(async () => {
    const inside = relative(parent, resolve(root));
    assert(inside.startsWith('showcase-publish-test-') && !inside.startsWith('..'));
    await rm(root, { recursive: true, force: true });
  });
  const remote = join(root, 'upstream.git'), writer = join(root, 'writer');
  const linked = join(root, 'linked');
  await git(root, 'init', '--bare', remote);
  await git(root, 'init', '--initial-branch=main', writer);
  await git(writer, 'config', 'user.name', 'Showcase local tests');
  await git(writer, 'config', 'user.email', 'showcase-tests@example.invalid');
  await git(writer, 'config', 'core.autocrlf', 'false');
  await put(writer, CATALOG, INITIAL);
  await put(writer, 'OtherGame/notes.txt', 'original other game\n');
  await git(writer, 'add', '.');
  await git(writer, 'commit', '-m', 'Local fixture');
  await git(writer, 'remote', 'add', 'origin', remote);
  await git(writer, 'push', 'origin', 'HEAD:refs/heads/main');
  const base = (await git(writer, 'rev-parse', 'HEAD')).toString().trim();
  await git(writer, 'worktree', 'add', '--detach', linked, base);
  const publisher = createPublisher(linked, { expectedRemote: remote });
  return { root, remote, writer, linked, base, publisher };
}

async function updateUpstream(f, path, content) {
  await put(f.writer, path, content);
  await git(f.writer, 'add', path);
  await git(f.writer, 'commit', '-m', 'Concurrent upstream update');
  await git(f.writer, 'push', 'origin', 'HEAD:refs/heads/main');
  return (await git(f.writer, 'rev-parse', 'HEAD')).toString().trim();
}

const mainAt = f => git(f.root, '--git-dir', f.remote, 'rev-parse', 'refs/heads/main').then(buffer => buffer.toString().trim());

test('sync/read return committed binary data while rejecting revision and path injection', async t => {
  const f = await fixture(t);
  assert.equal(await f.publisher.sync(), f.base);
  assert.deepEqual(await f.publisher.read(f.base, CATALOG), INITIAL);
  for (const rev of ['HEAD', '--help', `${f.base}:OtherGame/notes.txt`, f.base.toUpperCase()]) {
    await assert.rejects(f.publisher.read(rev, CATALOG), error => error.code === 'INVALID_REVISION');
  }
  for (const path of ['../showcase/games.js', 'OtherGame/notes.txt', 'showcase\\games.js']) {
    await assert.rejects(f.publisher.read(f.base, path), error => error.code === 'INVALID_PATH');
  }
});

test('publish is a fast-forward isolated from a dirty linked worktree, its HEAD, and its real index', async t => {
  const f = await fixture(t);
  await put(f.linked, 'OtherGame/notes.txt', 'staged local work\n');
  await git(f.linked, 'add', 'OtherGame/notes.txt');
  await put(f.linked, 'local-untracked.txt', 'do not touch\n');
  const beforeHead = (await git(f.linked, 'rev-parse', 'HEAD')).toString();
  const beforeStatus = await git(f.linked, 'status', '--porcelain=v1', '-z');
  const indexFile = (await git(f.linked, 'rev-parse', '--path-format=absolute', '--git-path', 'index')).toString().trim();
  const beforeIndex = await readFile(indexFile);
  const media = Buffer.from([0, 1, 0, 255, 10, 13]);
  const result = await f.publisher.publish({ base: f.base, files: new Map([
    [CATALOG, CHANGED], ['showcase/media/test-case/cover.webp', media],
    ['showcase/media/test-case/detail-1.webp', media], ['showcase/media/test-case/detail-2.webp', media]
  ]) });
  assert.match(result.commit, /^[a-f0-9]{40}$/);
  assert.equal(result.url, `https://github.com/cnedwin/PortedGamesEgret/commit/${result.commit}`);
  assert.equal(await mainAt(f), result.commit);
  assert.equal((await git(f.linked, 'rev-parse', `${result.commit}^`)).toString().trim(), f.base);
  assert.equal((await git(f.linked, 'show', '-s', '--format=%an|%ae', result.commit)).toString().trim(),
    'Showcase local tests|showcase-tests@example.invalid');
  assert.deepEqual(await f.publisher.read(result.commit, CATALOG), CHANGED);
  assert.deepEqual(await f.publisher.read(result.commit, 'showcase/media/test-case/cover.webp'), media);
  assert.deepEqual(await readFile(indexFile), beforeIndex);
  assert.deepEqual(await git(f.linked, 'status', '--porcelain=v1', '-z'), beforeStatus);
  assert.equal((await git(f.linked, 'rev-parse', 'HEAD')).toString(), beforeHead);
  assert.equal((await git(f.root, '--git-dir', f.remote, 'tag')).toString(), '');
  assert.equal((await git(f.linked, 'for-each-ref', 'refs/showcase-admin')).toString(), '');
});

test('latest upstream changes to another project survive the independent showcase commit', async t => {
  const f = await fixture(t);
  const upstream = await updateUpstream(f, 'OtherGame/notes.txt', 'new unrelated game content\n');
  const result = await f.publisher.publish({ base: f.base, files: new Map([[CATALOG, CHANGED]]) });
  assert.equal((await git(f.linked, 'rev-parse', `${result.commit}^`)).toString().trim(), upstream);
  assert.equal((await git(f.linked, 'show', `${result.commit}:OtherGame/notes.txt`)).toString(), 'new unrelated game content\n');
});

test('same edited path conflicts are explained and never overwrite upstream', async t => {
  const f = await fixture(t);
  const upstream = await updateUpstream(f, CATALOG, 'export const GAMES = ["someone else"];\n');
  await assert.rejects(f.publisher.publish({ base: f.base, files: new Map([[CATALOG, CHANGED]]) }), error => {
    assert.equal(error.code, 'CONFLICT');
    assert.deepEqual(error.paths, [CATALOG]);
    return true;
  });
  assert.equal(await mainAt(f), upstream);
});

test('only approved paths and buffers can publish, and the real default refuses local/unexpected remotes', async t => {
  const f = await fixture(t);
  for (const path of ['index.html', 'showcase/media/../cover.webp', 'showcase/media/Test/cover.webp',
    'showcase/media/good/detail-3.webp', 'showcase/media/good/nested/cover.webp', '-evil', 'showcase/media/good/cover.webp\0']) {
    await assert.rejects(f.publisher.publish({ base: f.base, files: new Map([[path, CHANGED]]) }), error => error.code === 'INVALID_PATH');
  }
  await assert.rejects(f.publisher.publish({ base: f.base, files: new Map([[CATALOG, 'not a buffer']]) }), error => error.code === 'INVALID_FILES');
  await assert.rejects(createPublisher(f.linked).sync(), error => error.code === 'REMOTE_MISMATCH');
  await assert.rejects(createPublisher(f.linked).read(f.base, CATALOG), error => error.code === 'REMOTE_MISMATCH');
  assert.throws(() => createPublisher(f.linked, { remote: '--upload-pack=evil' }), error => error.code === 'INVALID_REMOTE');
  await git(f.linked, 'remote', 'set-url', '--push', 'origin', join(f.root, 'wrong.git'));
  await assert.rejects(f.publisher.sync(), error => error.code === 'REMOTE_MISMATCH');
  assert.equal(await mainAt(f), f.base);
});

test('a rejected push leaves current work untouched and can retry against fresh unrelated changes', async t => {
  const f = await fixture(t), hook = join(f.remote, 'hooks', 'pre-receive');
  await writeFile(hook, '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  const files = new Map([[CATALOG, CHANGED]]);
  await assert.rejects(f.publisher.publish({ base: f.base, files }), error => error.code === 'PUSH_FAILED' && error.retryable);
  assert.equal(await mainAt(f), f.base);
  assert.equal((await git(f.linked, 'rev-parse', 'HEAD')).toString().trim(), f.base);
  await unlink(hook);
  const upstream = await updateUpstream(f, 'OtherGame/notes.txt', 'arrived while publication failed\n');
  const result = await f.publisher.publish({ base: f.base, files });
  assert.equal((await git(f.linked, 'rev-parse', `${result.commit}^`)).toString().trim(), upstream);
  assert.equal(await mainAt(f), result.commit);
});

test('retry after an already successful publication is read-back idempotent', async t => {
  const f = await fixture(t), files = new Map([[CATALOG, CHANGED]]);
  const first = await f.publisher.publish({ base: f.base, files });
  const second = await f.publisher.publish({ base: f.base, files });
  assert.deepEqual(second, first);
  assert.equal((await git(f.root, '--git-dir', f.remote, 'rev-list', '--count', 'main')).toString().trim(), '2');
});

test('an upstream move during push is never forced and an explicit retry preserves that move', async t => {
  const f = await fixture(t);
  await put(f.writer, 'OtherGame/notes.txt', 'a concurrent publisher won the race\n');
  await git(f.writer, 'add', 'OtherGame/notes.txt');
  await git(f.writer, 'commit', '-m', 'Race candidate');
  const ahead = (await git(f.writer, 'rev-parse', 'HEAD')).toString().trim();
  await git(f.writer, 'push', 'origin', 'HEAD:refs/heads/race-candidate');
  const hook = join(f.writer, '.git', 'hooks', 'pre-push');
  const quotedRemote = `'${f.remote.replaceAll('\\', '/').replaceAll("'", "'\\''")}'`;
  await writeFile(hook, `#!/bin/sh\ngit --git-dir=${quotedRemote} update-ref refs/heads/main ${ahead}\n`, { mode: 0o755 });
  const request = { base: f.base, files: new Map([[CATALOG, CHANGED]]) };
  await assert.rejects(f.publisher.publish(request), error => error.retryable && ['NOT_FAST_FORWARD', 'PUSH_FAILED'].includes(error.code));
  assert.equal(await mainAt(f), ahead);
  await unlink(hook);
  const result = await f.publisher.publish(request);
  assert.equal((await git(f.linked, 'rev-parse', `${result.commit}^`)).toString().trim(), ahead);
  assert.equal((await git(f.linked, 'show', `${result.commit}:OtherGame/notes.txt`)).toString(), 'a concurrent publisher won the race\n');
});

test('deleting an edited path upstream is a conflict, while empty changes are never published', async t => {
  const f = await fixture(t);
  await assert.rejects(f.publisher.publish({ base: f.base, files: new Map() }), error => error.code === 'INVALID_FILES');
  await git(f.writer, 'rm', CATALOG);
  await git(f.writer, 'commit', '-m', 'Delete catalog upstream');
  await git(f.writer, 'push', 'origin', 'HEAD:refs/heads/main');
  const upstream = await mainAt(f);
  await assert.rejects(f.publisher.publish({ base: f.base, files: new Map([[CATALOG, CHANGED]]) }),
    error => error.code === 'CONFLICT' && error.paths.includes(CATALOG));
  assert.equal(await mainAt(f), upstream);
});

test('a linked repository with no configured identity gets a clear local-editor fallback without config writes', async t => {
  const f = await fixture(t);
  await git(f.linked, 'config', 'user.name', '');
  await git(f.linked, 'config', 'user.email', '');
  const keys = ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  t.after(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
  const result = await f.publisher.publish({ base: f.base, files: new Map([[CATALOG, CHANGED]]) });
  assert.equal((await git(f.linked, 'show', '-s', '--format=%an|%ae|%cn|%ce', result.commit)).toString().trim(),
    'Showcase Local Editor|showcase-editor@localhost|Showcase Local Editor|showcase-editor@localhost');
  assert.equal((await git(f.linked, 'config', '--get', 'user.name')).toString(), '\n');
  assert.equal((await git(f.linked, 'config', '--get', 'user.email')).toString(), '\n');
});
