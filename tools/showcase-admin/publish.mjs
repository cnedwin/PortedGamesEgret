import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const EXPECTED_REMOTE = 'https://github.com/cnedwin/PortedGamesEgret.git';
const COMMIT_URL = 'https://github.com/cnedwin/PortedGamesEgret/commit/';
const REVISION = /^[a-f0-9]{40}$/;
const MEDIA = /^showcase\/media\/[a-z0-9][a-z0-9-]{0,63}\/(?:cover|detail-[12])\.webp$/;

function failure(code, message, extra = {}) {
  return Object.assign(new Error(message), { code, ...extra });
}

function safePath(path) {
  if (typeof path !== 'string' || (path !== 'showcase/games.js' && !MEDIA.test(path))) {
    throw failure('INVALID_PATH', 'Only the showcase catalog and approved media paths are allowed.');
  }
  return path;
}

function safeRevision(revision) {
  if (typeof revision !== 'string' || !REVISION.test(revision)) {
    throw failure('INVALID_REVISION', 'A complete lowercase commit SHA is required.');
  }
  return revision;
}

function remoteIdentity(value) {
  if (typeof value !== 'string' || !value || /[\r\n\0]/.test(value)) return null;
  if (isAbsolute(value)) return resolve(value).toLowerCase();
  const ssh = /^git@github\.com:([^?#]+)$/i.exec(value);
  if (ssh) return `github.com/${ssh[1].replace(/\/+$/, '').replace(/\.git$/i, '').toLowerCase()}`;
  try {
    const url = new URL(value);
    if (!['https:', 'ssh:'].includes(url.protocol) || url.hostname.toLowerCase() !== 'github.com' ||
        url.port || url.search || url.hash || url.password ||
        (url.username && !(url.protocol === 'ssh:' && url.username === 'git'))) return null;
    return `github.com${url.pathname.replace(/\/+$/, '').replace(/\.git$/i, '').toLowerCase()}`;
  } catch {
    return null;
  }
}

function gitEnvironment(indexFile) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^GIT_(?:DIR|WORK_TREE|COMMON_DIR|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|CONFIG.*|TRACE.*|CURL_VERBOSE)$/i.test(key)) delete env[key];
  }
  env.GIT_TERMINAL_PROMPT = '0';
  env.GCM_INTERACTIVE = 'never';
  if (indexFile) env.GIT_INDEX_FILE = indexFile;
  return env;
}

function runGit(repo, args, { input, indexFile, allowFailure = false } = {}) {
  return new Promise((resolveResult, reject) => {
    const child = spawn('git', ['-c', `safe.directory=${resolve(repo).replaceAll('\\', '/')}`, ...args], {
      cwd: repo, windowsHide: true, shell: false, env: gitEnvironment(indexFile)
    });
    const output = [], errors = [];
    let bytes = 0, tooLarge = false;
    child.stdout.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 128 * 1024 * 1024) { tooLarge = true; child.kill(); }
      else output.push(chunk);
    });
    // Never print a Git error: transports and credential helpers may include
    // private URLs. Callers receive a stable, deliberately limited error.
    child.stderr.on('data', chunk => { if (errors.length < 32) errors.push(chunk); });
    child.on('error', () => reject(failure('GIT_UNAVAILABLE', 'Git could not be started.')));
    child.on('close', code => {
      if (tooLarge) return reject(failure('OUTPUT_TOO_LARGE', 'The requested Git object is too large.'));
      const result = { code, stdout: Buffer.concat(output), stderr: Buffer.concat(errors).toString() };
      if (code !== 0 && !allowFailure) return reject(failure('GIT_FAILED', 'The Git operation could not complete.'));
      resolveResult(result);
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

/** Server-side only. expectedRemote can be overridden explicitly by local tests. */
export function createPublisher(repo, { remote = 'origin', branch = 'main', expectedRemote = EXPECTED_REMOTE } = {}) {
  if (typeof remote !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(remote)) {
    throw failure('INVALID_REMOTE', 'A safe configured remote name is required.');
  }
  if (typeof branch !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(branch) ||
      branch.includes('..') || branch.includes('//') || branch.endsWith('/') || branch.endsWith('.lock')) {
    throw failure('INVALID_BRANCH', 'A safe target branch name is required.');
  }
  const expected = remoteIdentity(expectedRemote);
  if (!expected) throw failure('INVALID_REMOTE', 'The expected repository is invalid.');
  const directory = resolve(repo);
  const git = (args, options) => runGit(directory, args, options);
  let pending = Promise.resolve();
  const exclusive = action => {
    const result = pending.then(action);
    pending = result.catch(() => {});
    return result;
  };

  async function verifyRemote() {
    for (const flags of [[], ['--push']]) {
      const result = await git(['remote', 'get-url', ...flags, '--all', remote], { allowFailure: true });
      const urls = result.stdout.toString().trim().split(/\r?\n/).filter(Boolean);
      if (result.code !== 0 || urls.length !== 1 || remoteIdentity(urls[0]) !== expected) {
        throw failure('REMOTE_MISMATCH', 'The configured fetch and push repositories must match the approved repository.');
      }
    }
  }

  async function fetchLatest() {
    await verifyRemote();
    const ref = `refs/showcase-admin/fetch-${randomUUID()}`;
    try {
      const fetched = await git(['fetch', '--no-tags', '--no-write-fetch-head', remote,
        `refs/heads/${branch}:${ref}`], { allowFailure: true });
      if (fetched.code !== 0) throw failure('SYNC_FAILED', 'The latest main branch could not be fetched. Please retry.', { retryable: true });
      const result = await git(['rev-parse', '--verify', `${ref}^{commit}`]);
      return safeRevision(result.stdout.toString().trim());
    } finally {
      await git(['update-ref', '-d', ref], { allowFailure: true }).catch(() => {});
    }
  }

  async function treeEntry(revision, path) {
    const result = await git(['ls-tree', '-z', revision, '--', path]);
    if (!result.stdout.length) return null;
    const match = /^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})\t[^\0]+\0$/.exec(result.stdout.toString());
    if (!match) throw failure('INVALID_OBJECT', 'The requested path is not a regular repository file.');
    return { mode: match[1], type: match[2], hash: match[3] };
  }

  async function read(revision, path) {
    safeRevision(revision); safePath(path);
    await verifyRemote();
    const entry = await treeEntry(revision, path);
    if (!entry) throw failure('NOT_FOUND', 'The requested showcase file does not exist at this commit.');
    if (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) {
      throw failure('INVALID_OBJECT', 'Symbolic links and non-file objects are not supported.');
    }
    return (await git(['cat-file', 'blob', entry.hash])).stdout;
  }

  async function publish({ base, files } = {}) {
    safeRevision(base);
    if (!(files instanceof Map) || !files.size) throw failure('INVALID_FILES', 'A nonempty map of file buffers is required.');
    const contents = [...files].map(([path, buffer]) => {
      safePath(path);
      if (!Buffer.isBuffer(buffer)) throw failure('INVALID_FILES', 'Every published file must be a Buffer.');
      return [path, Buffer.from(buffer)];
    }).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

    return exclusive(async () => {
      const latest = await fetchLatest();
      const ancestry = await git(['merge-base', '--is-ancestor', base, latest], { allowFailure: true });
      if (ancestry.code !== 0) throw failure('INVALID_BASE', 'The editing base is not an ancestor of the latest main branch. Reload before publishing.');
      const prepared = [];
      const conflicts = [];
      let alreadyPublished = true;
      for (const [path, buffer] of contents) {
        const hash = (await git(['hash-object', '-w', '--stdin', '--no-filters'], { input: buffer })).stdout.toString().trim();
        const previous = await treeEntry(base, path), current = await treeEntry(latest, path);
        if (JSON.stringify(previous) !== JSON.stringify(current)) conflicts.push(path);
        if (current?.hash !== hash || current.mode !== '100644') alreadyPublished = false;
        prepared.push({ path, hash });
      }
      // A lost successful push response can be retried without making another
      // commit, but only after exact read-back of every requested file.
      if (alreadyPublished) return { commit: latest, url: COMMIT_URL + latest };
      if (conflicts.length) throw failure('CONFLICT', 'Some edited files changed on main. Reload and review these paths before publishing.', { paths: conflicts });

      const parent = resolve(tmpdir());
      const temporary = await mkdtemp(join(parent, 'showcase-admin-index-'));
      let commit;
      try {
        const indexFile = join(temporary, 'index');
        await git(['read-tree', latest], { indexFile });
        for (const { path, hash } of prepared) {
          await git(['update-index', '--add', '--cacheinfo', `100644,${hash},${path}`], { indexFile });
        }
        const tree = (await git(['write-tree'], { indexFile })).stdout.toString().trim();
        const identity = [];
        for (const [key, fallback] of [['name', 'Showcase Local Editor'], ['email', 'showcase-editor@localhost']]) {
          const configured = await git(['config', '--get', `user.${key}`], { allowFailure: true });
          identity.push('-c', `user.${key}=${configured.stdout.toString().trim() || fallback}`);
        }
        const result = await git([...identity, 'commit-tree', tree, '-p', latest], {
          input: Buffer.from('Update showcase from local administration\n')
        });
        commit = safeRevision(result.stdout.toString().trim());
      } finally {
        const inside = relative(parent, resolve(temporary));
        if (inside.startsWith('showcase-admin-index-') && !inside.startsWith('..') && !isAbsolute(inside)) {
          await rm(temporary, { recursive: true, force: true });
        }
      }
      await verifyRemote();
      const pushed = await git(['push', '--porcelain', '--no-force', '--no-mirror', '--no-follow-tags',
        '--recurse-submodules=no', remote, `${commit}:refs/heads/${branch}`], { allowFailure: true });
      if (pushed.code !== 0) {
        const code = /non-fast-forward|fetch first|stale info/i.test(pushed.stderr + pushed.stdout.toString())
          ? 'NOT_FAST_FORWARD' : 'PUSH_FAILED';
        throw failure(code, 'Publication was not confirmed. Your edits are retained; retry after checking the connection or reviewing an updated main branch.', { retryable: true });
      }
      return { commit, url: COMMIT_URL + commit };
    });
  }

  return { sync: () => exclusive(fetchLatest), read, publish };
}
