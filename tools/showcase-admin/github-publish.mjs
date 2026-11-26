import { createHash } from 'node:crypto';

const REPO = 'cnedwin/PortedGamesEgret';
const API = `https://api.github.com/repos/${REPO}`;
const RAW = `https://raw.githubusercontent.com/${REPO}/`;
const SHA = /^[a-f0-9]{40}$/;
const MEDIA = /^showcase\/media\/[a-z0-9][a-z0-9-]{0,63}\/(?:cover|detail-[12])\.webp$/;

const fail = (code, message, extra = {}) => Object.assign(new Error(message), { code, ...extra });

function revision(value) {
  if (typeof value !== 'string' || !SHA.test(value)) throw fail('INVALID_REVISION', 'A complete lowercase commit SHA is required.');
  return value;
}

function allowedPath(value) {
  if (typeof value !== 'string' || (value !== 'showcase/games.js' && !MEDIA.test(value))) {
    throw fail('INVALID_PATH', 'Only the showcase catalog and approved WebP paths are allowed.');
  }
  return value;
}

function token(value) {
  if (typeof value !== 'string' || !value || value.length > 8192 || /[\s\0]/.test(value)) {
    throw fail('AUTH_REVOKED', 'Please sign in with GitHub again.');
  }
  return value;
}

function reviewNumber(value) {
  const match = typeof value === 'string' && /^https:\/\/github\.com\/cnedwin\/PortedGamesEgret\/pull\/([1-9]\d*)\/?$/.exec(value);
  if (!match) throw fail('INVALID_REVIEW', 'A review URL in the approved repository is required.');
  return match[1];
}

function blobHash(bytes) {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

/** Fixed-repository PR broker. Credentials are supplied per request, never retained. */
export function createGitHubPublisher({ fetchImpl = fetch } = {}) {
  let pending = Promise.resolve();
  const exclusive = action => {
    const result = pending.then(action);
    pending = result.catch(() => {});
    return result;
  };

  async function response(url, { accessToken, method = 'GET', body, missing = false, raw = false } = {}) {
    const headers = {
      Accept: raw ? 'application/octet-stream' : 'application/vnd.github+json',
      'User-Agent': 'PortedGamesEgret-Showcase-Editor',
      ...(raw ? {} : { 'X-GitHub-Api-Version': '2026-03-10' })
    };
    if (accessToken) headers.Authorization = `Bearer ${token(accessToken)}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let result;
    try {
      result = await fetchImpl(url, {
        method, headers, redirect: 'error', signal: AbortSignal.timeout(30000),
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
    } catch {
      throw fail('NETWORK', 'GitHub could not be reached. The saved draft is retained; please retry.', { retryable: true });
    }
    if (missing && result.status === 404) return null;
    if (result.status === 401) throw fail('AUTH_REVOKED', 'GitHub sign-in has expired or been revoked. Please sign in again.');
    if (result.status === 429 || (result.status === 403 && result.headers.get('x-ratelimit-remaining') === '0')) {
      throw fail('RATE_LIMIT', 'GitHub is temporarily limiting requests. Please retry later.', { retryable: true });
    }
    if (result.status === 403) throw fail('FORBIDDEN', 'This GitHub account or app does not have the required repository permission.');
    if (result.status === 404) throw fail('NOT_FOUND', 'The requested repository file or review was not found.');
    if (result.status === 409) throw fail('CONFLICT', 'The repository changed during submission. The saved draft is retained.');
    if (result.status === 422) throw fail('GITHUB_VALIDATION', 'GitHub could not accept this branch or review request.');
    if (!result.ok) throw fail('GITHUB_FAILED', 'GitHub did not confirm the request. Please retry.', { retryable: true });
    try {
      return raw ? Buffer.from(await result.arrayBuffer()) : await result.json();
    } catch {
      throw fail('NETWORK', 'GitHub returned an incomplete response. Please retry.', { retryable: true });
    }
  }

  const api = (path, options) => response(API + path, options);
  const syncWith = async accessToken => revision((await api('/git/ref/heads/main', { accessToken })).object?.sha);

  async function read(commit, path) {
    revision(commit); allowedPath(path);
    return response(RAW + commit + '/' + path, { raw: true });
  }

  async function optionalRead(commit, path) {
    try { return await read(commit, path); }
    catch (error) { if (error.code === 'NOT_FOUND') return null; throw error; }
  }

  async function requireAncestor(base, head, accessToken) {
    if (base === head) return;
    const compared = await api(`/compare/${base}...${head}`, { accessToken });
    if (compared.merge_base_commit?.sha !== base || !['ahead', 'identical'].includes(compared.status)) {
      throw fail('INVALID_BASE', 'The editing base is not an ancestor of main. Reload before submitting.');
    }
  }

  function receipt(pr, commit, branch) {
    reviewNumber(pr.html_url);
    if (pr.base?.ref !== 'main' || pr.base.repo?.full_name !== REPO ||
        pr.head?.sha !== commit || pr.head.ref !== branch || pr.head.repo?.full_name !== REPO) {
      throw fail('CONFLICT', 'The review no longer matches the submitted commit. The draft is retained.');
    }
    return { commit, url: pr.html_url, pending: true };
  }

  async function findReview(branch, accessToken) {
    const query = new URLSearchParams({ state: 'all', head: `cnedwin:${branch}`, base: 'main', per_page: '100' });
    const reviews = await api('/pulls?' + query, { accessToken });
    if (!Array.isArray(reviews)) throw fail('INVALID_RESPONSE', 'GitHub returned an invalid review list.');
    if (reviews.length > 1) throw fail('CONFLICT', 'More than one review matches this submission. Review the existing requests.');
    return reviews[0] ?? null;
  }

  async function commitData(commit, accessToken) {
    const data = await api('/git/commits/' + revision(commit), { accessToken });
    revision(data.tree?.sha);
    return data;
  }

  async function verifyExisting(commit, expectedMessage, entries, latest, accessToken) {
    revision(commit);
    const existing = await commitData(commit, accessToken);
    if (existing.message?.trimEnd() !== expectedMessage.trimEnd() || existing.parents?.length !== 1) {
      throw fail('CONFLICT', 'This submission ID already belongs to different content or an edited review.');
    }
    const parent = revision(existing.parents[0].sha);
    await requireAncestor(parent, latest, accessToken);
    for (const { path, bytes } of entries) {
      const current = await optionalRead(commit, path);
      if (!current?.equals(bytes)) throw fail('CONFLICT', 'The submitted files no longer match this saved draft.', { paths: [path] });
    }
    // Reconstruct the exact expected tree from its immutable parent. Comparing
    // tree IDs also catches extra paths without a truncated recursive listing.
    const parentData = await commitData(parent, accessToken);
    const expected = await api('/git/trees', {
      method: 'POST', accessToken,
      body: { base_tree: parentData.tree.sha, tree: entries.map(({ path, hash }) => ({ path, mode: '100644', type: 'blob', sha: hash })) }
    });
    if (revision(expected.sha) !== existing.tree.sha) {
      throw fail('CONFLICT', 'The existing submission contains changes outside this draft.');
    }
    return commit;
  }

  async function publish({ base, files, accessToken, submissionId, actor } = {}) {
    revision(base); token(accessToken);
    if (typeof submissionId !== 'string' || !/^[a-f0-9]{48}$/.test(submissionId)) {
      throw fail('INVALID_SUBMISSION', 'A saved 48-character draft revision is required.');
    }
    if (!actor || !/^[1-9]\d*$/.test(String(actor.id)) || typeof actor.login !== 'string' ||
        !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(actor.login)) {
      throw fail('ACTOR_MISMATCH', 'A verified GitHub session identity is required.');
    }
    const actorId = String(actor.id);
    if (!(files instanceof Map) || !files.size) throw fail('INVALID_FILES', 'A nonempty map of file buffers is required.');
    const entries = [...files].map(([path, value]) => {
      allowedPath(path);
      if (!Buffer.isBuffer(value)) throw fail('INVALID_FILES', 'Every submitted file must be a Buffer.');
      const bytes = Buffer.from(value);
      return { path, bytes, hash: blobHash(bytes) };
    }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    const digest = createHash('sha256').update(base + '\0' + actorId);
    for (const { path, hash } of entries) digest.update('\0' + path + '\0' + hash);
    const fingerprint = digest.digest('hex');
    const branch = 'showcase-admin/' + submissionId;
    const message = `Update showcase via online editor\n\nShowcase-Submission: ${submissionId}\nShowcase-Actor-ID: ${actorId}\nShowcase-Base: ${base}\nShowcase-Payload: ${fingerprint}\n`;

    return exclusive(async () => {
      const who = await response('https://api.github.com/user', { accessToken });
      if (String(who.id) !== actorId) throw fail('ACTOR_MISMATCH', 'The GitHub account no longer matches this signed-in session.');
      const repository = await api('', { accessToken });
      if (repository.full_name !== REPO || repository.permissions?.push !== true) {
        throw fail('FORBIDDEN', 'This account must have write access to the approved repository.');
      }
      const latest = await syncWith(accessToken);
      await requireAncestor(base, latest, accessToken);
      const previousReview = await findReview(branch, accessToken);
      if (previousReview) {
        const commit = await verifyExisting(previousReview.head?.sha, message, entries, latest, accessToken);
        return receipt(previousReview, commit, branch);
      }
      const existingRef = await api('/git/ref/heads/' + branch, { accessToken, missing: true });
      let commit;
      if (existingRef) {
        commit = await verifyExisting(existingRef.object?.sha, message, entries, latest, accessToken);
      } else {
        const conflicts = [];
        for (const { path } of base === latest ? [] : entries) {
          const before = await optionalRead(base, path), current = await optionalRead(latest, path);
          if (before === null ? current !== null : !current?.equals(before)) conflicts.push(path);
        }
        if (conflicts.length) throw fail('CONFLICT', 'Some edited paths changed on main. Reload and review before submitting.', { paths: conflicts });
        for (const { bytes, hash } of entries) {
          const blob = await api('/git/blobs', { method: 'POST', accessToken, body: { encoding: 'base64', content: bytes.toString('base64') } });
          if (blob.sha !== hash) throw fail('INVALID_RESPONSE', 'GitHub did not confirm the exact uploaded file bytes.');
        }
        const latestData = await commitData(latest, accessToken);
        const tree = await api('/git/trees', { method: 'POST', accessToken,
          body: { base_tree: latestData.tree.sha, tree: entries.map(({ path, hash }) => ({ path, mode: '100644', type: 'blob', sha: hash })) } });
        const created = await api('/git/commits', { method: 'POST', accessToken,
          body: { tree: revision(tree.sha), parents: [latest], message } });
        commit = revision(created.sha);
        try {
          await api('/git/refs', { method: 'POST', accessToken, body: { ref: 'refs/heads/' + branch, sha: commit } });
        } catch (error) {
          if (error.code !== 'GITHUB_VALIDATION') throw error;
          const raced = await api('/git/ref/heads/' + branch, { accessToken, missing: true });
          if (!raced) throw error;
          commit = await verifyExisting(raced.object?.sha, message, entries, latest, accessToken);
        }
      }
      let review = await findReview(branch, accessToken);
      if (!review) {
        try {
          review = await api('/pulls', { method: 'POST', accessToken, body: {
            title: 'Review showcase content update', base: 'main', head: branch,
            body: `Submitted through the online showcase editor by @${who.login}.\n\nDraft: \`${submissionId}\`\nCommit: \`${commit}\`\n\nThis request updates only the approved showcase catalog and media. Review and merge to publish through the existing Pages workflow.`
          } });
        } catch (error) {
          if (error.code !== 'GITHUB_VALIDATION') throw error;
          review = await findReview(branch, accessToken);
          if (!review) throw error;
        }
      }
      return receipt(review, commit, branch);
    });
  }

  async function reviewStatus({ url, commit, accessToken } = {}) {
    const number = reviewNumber(url);
    revision(commit); token(accessToken);
    const review = await api('/pulls/' + number, { accessToken });
    if (review.base?.ref !== 'main' || review.base.repo?.full_name !== REPO || review.head?.sha !== commit) {
      throw fail('CONFLICT', 'The review target or head changed. The submitted draft is retained.');
    }
    if (review.merged_at || review.merged === true) return 'merged';
    if (review.state === 'open') return 'open';
    if (review.state === 'closed') return 'closed';
    throw fail('INVALID_RESPONSE', 'GitHub returned an unknown review state.');
  }

  return { sync: () => syncWith(), read, publish, reviewStatus };
}
