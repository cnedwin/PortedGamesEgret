import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE = '__Host-showcase-oauth';
const STATE_SECONDS = 10 * 60;
const MAX_PENDING_LOGINS = 256;
const MAX_TOKEN_SECONDS = 8 * 60 * 60;
const AUTHORIZE = 'https://github.com/login/oauth/authorize';
const TOKEN = 'https://github.com/login/oauth/access_token';
const USER = 'https://api.github.com/user';
const RANDOM_VALUE = /^[A-Za-z0-9_-]{43}$/;
const randomToken = () => randomBytes(32).toString('base64url');

function cookieHeader(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
}

function readCookie(header) {
  if (typeof header !== 'string') return null;
  const prefix = COOKIE + '=';
  const matches = header.split(';').map(pair => pair.trim()).filter(pair => pair.startsWith(prefix));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(prefix.length);
  return RANDOM_VALUE.test(value) ? value : null;
}

function oauthError(status, text) {
  return Object.assign(new Error(text), { status });
}

function invalidFlow() {
  return oauthError(400, '登录已失效，请重新登录。');
}

function providerError() {
  return oauthError(502, 'GitHub 登录暂时不可用，请稍后重试。');
}

function positiveId(value) {
  const id = typeof value === 'string' && /^[1-9][0-9]*$/.test(value) ? Number(value) : value;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function callbackUrl(origin) {
  if (typeof origin !== 'string' || !URL.canParse(origin)) {
    throw new Error('GitHub 登录需要独立的 HTTPS 站点地址。');
  }
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('GitHub 登录需要独立的 HTTPS 站点地址。');
  }
  return new URL('/auth/github/callback', url).href;
}

async function githubJson(fetchImpl, url, options) {
  try {
    const response = await fetchImpl(url, {
      ...options,
      redirect: 'error',
      signal: AbortSignal.timeout(10_000)
    });
    if (response.ok) return await response.json();
  } catch {
    // Provider errors may contain credentials or request details.
  }
  throw providerError();
}

export function createGitHubAuth({ origin, clientId, clientSecret, repositoryId, allowedUserIds, fetchImpl = fetch }) {
  const redirectUri = callbackUrl(origin);
  const repository = positiveId(repositoryId);
  const userIds = Array.isArray(allowedUserIds) || allowedUserIds instanceof Set ? [...allowedUserIds] : [];
  const allowed = new Set(userIds.map(positiveId));
  if (typeof clientId !== 'string' || !clientId.trim() || typeof clientSecret !== 'string' || !clientSecret.trim() ||
      !repository || !allowed.size || allowed.has(null)) {
    throw new Error('GitHub 登录配置缺少应用、仓库或允许登录的账号。');
  }
  const pending = new Map();

  function begin() {
    const now = Date.now();
    for (const [state, flow] of pending) {
      if (flow.expires <= now) pending.delete(state);
    }
    if (pending.size >= MAX_PENDING_LOGINS) throw oauthError(429, '正在登录的请求过多，请稍后重试。');

    const state = randomToken();
    const verifier = randomToken();
    const browser = randomToken();
    pending.set(state, { verifier, browser, expires: now + STATE_SECONDS * 1000 });

    const url = new URL(AUTHORIZE);
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
      scope: 'offline_access',
      allow_signup: 'false'
    });
    return { url: url.href, cookie: cookieHeader(browser, STATE_SECONDS) };
  }

  async function finish({ cookie, state, code }) {
    const browser = readCookie(cookie);
    const flow = typeof state === 'string' && RANDOM_VALUE.test(state) ? pending.get(state) : null;
    const requestedAt = Date.now();
    if (!browser || !flow || flow.expires <= requestedAt ||
        !timingSafeEqual(Buffer.from(browser), Buffer.from(flow.browser))) throw invalidFlow();
    // Consume the state before awaiting the provider so only one callback can exchange its code.
    pending.delete(state);
    if (typeof code !== 'string' || !/^[!-~]{1,2048}$/.test(code)) throw invalidFlow();

    const token = await githubJson(fetchImpl, TOKEN, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        repository_id: String(repository),
        code,
        code_verifier: flow.verifier
      })
    });
    if (!token || token.error || typeof token.access_token !== 'string' ||
        !/^ghu_[A-Za-z0-9_]+$/.test(token.access_token) ||
        typeof token.token_type !== 'string' || token.token_type.toLowerCase() !== 'bearer' ||
        !Number.isInteger(token.expires_in) || token.expires_in <= 0 || token.expires_in > MAX_TOKEN_SECONDS) {
      throw providerError();
    }
    const accessToken = token.access_token;
    const expires = requestedAt + token.expires_in * 1000;
    const actor = await githubJson(fetchImpl, USER, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'X-GitHub-Api-Version': '2026-03-10'
      }
    });
    if (!actor || !allowed.has(actor.id) || typeof actor.login !== 'string' || !actor.login) {
      throw oauthError(403, '这个 GitHub 账号没有管理权限。');
    }
    if (expires <= Date.now()) throw invalidFlow();
    return { accessToken, actor: { id: actor.id, login: actor.login }, expires };
  }

  return { begin, finish, clearCookie: cookieHeader('', 0) };
}
