import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createGitHubAuth } from './github-auth.mjs';

const origin = 'https://manage.example.test';
const callback = origin + '/auth/github/callback';
const accessToken = 'ghu_fixtureOnly';
const goodToken = {
  access_token: accessToken,
  token_type: 'bearer',
  expires_in: 28800,
  refresh_token: 'ghr_notRetained'
};
const goodUser = { id: 77, login: 'editor-fake' };
const cookiePair = cookie => cookie.split(';')[0];

function fixture(token = goodToken, user = goodUser) {
  const requests = [];
  const auth = createGitHubAuth({
    origin,
    clientId: 'fixture-app-id',
    clientSecret: 'testSecret',
    repositoryId: '101',
    allowedUserIds: [77],
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), ...options });
      const payload = requests.length === 1 ? token : user;
      return Response.json(payload);
    }
  });
  return { auth, requests };
}

function flow(auth) {
  const { url, cookie } = auth.begin();
  return { cookie, params: new URL(url), finish: {
    cookie: `unrelated=value; ${cookiePair(cookie)}`,
    state: new URL(url).searchParams.get('state'),
    code: 'test-code'
  } };
}

test('authorizes via fixed GitHub endpoints, PKCE, a scoped expiring token and matching numeric account', async () => {
  const { auth, requests } = fixture();
  const { params, cookie, finish } = flow(auth);
  assert.equal(params.origin + params.pathname, 'https://github.com/login/oauth/authorize');
  assert.equal(params.searchParams.get('client_id'), 'fixture-app-id');
  assert.equal(params.searchParams.get('redirect_uri'), callback);
  assert.equal(params.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(params.searchParams.get('scope'), 'offline_access');
  assert.match(finish.state, /^[A-Za-z0-9_-]{43}$/);
  assert.match(cookie, /^__Host-showcase-oauth=[A-Za-z0-9_-]{43}; Path=\/; Max-Age=600; Secure; HttpOnly; SameSite=Lax$/);
  assert.notEqual(cookiePair(cookie).split('=')[1], finish.state);
  assert.match(auth.clearCookie, /^__Host-showcase-oauth=; Path=\/; Max-Age=0; Secure; HttpOnly; SameSite=Lax$/);

  const before = Date.now();
  const result = await auth.finish(finish);
  assert.deepEqual(Object.keys(result).sort(), ['accessToken', 'actor', 'expires']);
  assert.equal(result.accessToken, accessToken);
  assert.deepEqual(result.actor, goodUser);
  assert.ok(result.expires >= before + 28_800_000 && result.expires <= Date.now() + 28_800_000);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'https://github.com/login/oauth/access_token');
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].redirect, 'error');
  const form = new URLSearchParams(requests[0].body);
  assert.equal(form.get('client_id'), 'fixture-app-id');
  assert.equal(form.get('client_secret'), 'testSecret');
  assert.equal(form.get('redirect_uri'), callback);
  assert.equal(form.get('code'), finish.code);
  assert.equal(form.get('repository_id'), '101');
  const verifier = form.get('code_verifier');
  assert.match(verifier, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(params.searchParams.get('code_challenge'), createHash('sha256').update(verifier).digest('base64url'));
  assert.equal(requests[1].url, 'https://api.github.com/user');
  assert.equal(requests[1].redirect, 'error');
  assert.equal(new Headers(requests[1].headers).get('authorization'), `Bearer ${accessToken}`);
  await assert.rejects(auth.finish(finish), { status: 400 });
  assert.equal(requests.length, 2);
});

test('mismatched or ambiguous browser cookie cannot use or consume state', async () => {
  const { auth, requests } = fixture();
  const original = flow(auth).finish;
  const other = flow(auth).finish;
  await assert.rejects(auth.finish({ ...original, cookie: other.cookie }), { status: 400 });
  await assert.rejects(auth.finish({ ...original, cookie: original.cookie + '; ' + other.cookie }), { status: 400 });
  await assert.rejects(auth.finish({ ...original, state: other.state }), { status: 400 });
  assert.equal(requests.length, 0);
  await auth.finish(original);
  assert.equal(requests.length, 2);
});

test('one callback atomically consumes matched state before making network requests', async () => {
  const { auth, requests } = fixture();
  const { finish } = flow(auth);
  const first = auth.finish(finish);
  await assert.rejects(auth.finish(finish), { status: 400 });
  await first;
  assert.equal(requests.length, 2);
});

test('expired state is refused and pending logins use bounded memory', async t => {
  let now = 4_000_000;
  t.mock.method(Date, 'now', () => now);
  const { auth, requests } = fixture();
  const { finish } = flow(auth);
  let blocked = false;
  for (let i = 0; i < 1000; i += 1) {
    try { auth.begin(); }
    catch (error) {
      assert.equal(error.status, 429);
      blocked = true;
      break;
    }
  }
  assert.equal(blocked, true);
  now += 600_000;
  await assert.rejects(auth.finish(finish), { status: 400 });
  assert.equal(requests.length, 0);
  assert.ok(auth.begin().url);
});

test('allows numeric GitHub IDs only and rejects permanent or non-GitHub-App tokens', async () => {
  for (const user of [{ id: 88, login: goodUser.login }, { id: '77', login: goodUser.login }]) {
    const { auth } = fixture(goodToken, user);
    await assert.rejects(auth.finish(flow(auth).finish), { status: 403 });
  }
  for (const token of [
    { access_token: accessToken, token_type: 'bearer' },
    { ...goodToken, expires_in: 0 },
    { ...goodToken, expires_in: 28_801 },
    { ...goodToken, access_token: 'ghp_fixture' }
  ]) {
    const { auth, requests } = fixture(token);
    await assert.rejects(auth.finish(flow(auth).finish), { status: 502 });
    assert.equal(requests.length, 1);
  }
});

test('errors do not echo GitHub response details and rejected exchanges consume their state', async () => {
  const { auth, requests } = fixture({ error: 'provider-user-token-and-client-secret' });
  const { finish } = flow(auth);
  await assert.rejects(auth.finish(finish), error => error.status === 502 && !error.message.includes('secret'));
  await assert.rejects(auth.finish(finish), { status: 400 });
  assert.equal(requests.length, 1);
});

test('rejects origins with no HTTPS or with redirect path and incomplete allowlists', () => {
  const options = { clientId: 'app', clientSecret: 'secret', repositoryId: 10, allowedUserIds: [1] };
  for (const value of ['http://admin.example.test', 'https://admin.example.test/here', 'https://name:pass@admin.example.test']) {
    assert.throws(() => createGitHubAuth({ ...options, origin: value }));
  }
  assert.throws(() => createGitHubAuth({ ...options, origin, allowedUserIds: [] }));
  assert.throws(() => createGitHubAuth({ ...options, origin, repositoryId: 0 }));
});
