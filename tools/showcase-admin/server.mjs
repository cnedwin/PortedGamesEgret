import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { readCatalog, writeCatalog } from './catalog.mjs';
import { MAX_IMAGE_BYTES, validWebP } from './webp.mjs';

const FILE = 'showcase/games.js';
const IMAGE_NAMES = ['cover.webp', 'detail-1.webp', 'detail-2.webp'];
const COOKIE = 'egret_showcase_session';
const SESSION_AGE = 8 * 60 * 60 * 1000;
const ONLINE_SESSION_AGE = 60 * 60 * 1000;
const LOGIN_PERIOD = 60 * 1000;
const LOGIN_LIMIT = 8;
const UPLOAD_LIMIT = 92 * 1024 * 1024;
const ONLINE_UPLOAD_LIMIT = 24 * 1024 * 1024;
const ONLINE_DRAFT_LIMIT = 40 * 1024 * 1024;
const hash = promisify(scrypt);
const token = () => randomBytes(24).toString('hex');
const jsonType = 'application/json; charset=utf-8';
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/admin.js', ['admin.js', 'text/javascript; charset=utf-8']],
  ['/admin.css', ['admin.css', 'text/css; charset=utf-8']]
]);

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const fail = (status, message) => { throw new RequestError(status, message); };
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const mediaPath = (id, index) => 'showcase/media/' + id + '/' + IMAGE_NAMES[index];

function reviewOf(value) {
  if (!/^[a-f0-9]{40}$/.test(value?.commit) ||
      !/^https:\/\/github\.com\/cnedwin\/PortedGamesEgret\/pull\/[1-9]\d*$/.test(value?.url)) {
    throw new Error('发布审阅记录无效。');
  }
  return { commit: value.commit, url: value.url };
}

function redirect(res, location, cookies) {
  res.writeHead(303, { Location: location, 'Set-Cookie': cookies });
  res.end();
}

export async function createAccount(username, password) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_-]{3,48}$/.test(username) ||
      typeof password !== 'string' || password.length < 8 || password.length > 1024) {
    throw new Error('账号需为 3–48 位字母、数字、下划线或短横线，密码需为 8–1024 个字符。');
  }
  const salt = randomBytes(24).toString('hex');
  return { username, salt, digest: (await hash(password, salt, 32)).toString('hex') };
}

function response(res, status, content, type = jsonType) {
  res.writeHead(status, { 'Content-Type': type });
  res.end(type === jsonType ? JSON.stringify(content) : content);
}

async function body(req, limit = 16 * 1024) {
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    fail(415, '请求格式无效。');
  }
  if (Number(req.headers['content-length']) > limit) {
    req.resume();
    fail(413, '这次上传太大，请分批保存。');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) {
      req.resume();
      fail(413, '这次上传太大，请分批保存。');
    }
    chunks.push(chunk);
  }
  let value;
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { fail(400, '请求内容无法读取。'); }
  if (!isObject(value)) fail(400, '请求内容无效。');
  return value;
}

function gameChanges(games, previous, edit) {
  const lookup = new Map(games.map(game => [game.id, game]));
  const { order, summaries, uploads } = edit;
  if (!Array.isArray(order) || order.length !== lookup.size ||
      new Set(order).size !== order.length || !order.every(id => lookup.has(id))) {
    fail(400, '排序必须包含每款游戏一次。');
  }
  if (!isObject(summaries) || !Array.isArray(uploads) || uploads.length > games.length * 3) {
    fail(400, '简介或截图的格式不正确。');
  }
  const text = { ...previous.summaries };
  for (const [id, summary] of Object.entries(summaries)) {
    const game = lookup.get(id);
    if (!game || !isObject(summary) || !['zh','en'].every(lang =>
      typeof summary[lang] === 'string' && summary[lang].trim() && summary[lang].length <= 1500)) {
      fail(400, '每款游戏的中英文简介都需要填写，最多各 1,500 个字符。');
    }
    const next = { zh: summary.zh.trim(), en: summary.en.trim() };
    if (next.zh === game.summary.zh && next.en === game.summary.en) delete text[id];
    else text[id] = next;
  }
  const photos = new Map(previous.uploads.map(item => [mediaPath(item.id, item.index), item]));
  const seen = new Set();
  for (const item of uploads) {
    if (!isObject(item) || !lookup.has(item.id) || !Number.isInteger(item.index) ||
        item.index < 0 || item.index >= IMAGE_NAMES.length || typeof item.data !== 'string' ||
        item.data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) fail(400, '截图位置或大小不正确。');
    const path = mediaPath(item.id, item.index);
    const buffer = Buffer.from(item.data, 'base64');
    if (seen.has(path) || buffer.toString('base64') !== item.data || !validWebP(buffer)) {
      fail(400, '截图必须是长宽均不超过 1,600 像素、大小不超过 1 MiB 的静态 WebP。');
    }
    seen.add(path);
    photos.set(path, { id: item.id, index: item.index, data: item.data });
  }
  return { order, summaries: text, uploads: [...photos.values()] };
}

const emptyDraft = (base, games) => ({
  base, revision: token(), order: games.map(game => game.id), summaries: {}, uploads: []
});

/** Local password and public GitHub authorization are mutually exclusive. */
export async function createAdmin({ publisher, account, dataDir, online }) {
  const authMode = online ? 'github' : 'local';
  const publicURL = online && new URL(online.origin);
  if (online && (publicURL.protocol !== 'https:' || publicURL.origin !== online.origin || !online.auth)) {
    throw new Error('线上后台必须配置完整的 HTTPS 地址与 GitHub 登录。');
  }
  if (!online && (!account?.username || !/^[0-9a-f]{48}$/.test(account.salt) ||
      !/^[0-9a-f]{64}$/.test(account.digest))) {
    throw new Error('本机登录设置无法读取。');
  }
  const cookieName = online ? '__Host-' + COOKIE : COOKIE;
  const cookieSettings = '; Path=/; HttpOnly; SameSite=Strict' + (online ? '; Secure' : '');
  await mkdir(dataDir, { recursive: true });
  const draftFile = join(dataDir, 'draft.json');
  const files = new Map();
  for (const [path, [name, type]] of routes) {
    files.set(path, [await readFile(new URL('public/' + name, import.meta.url)), type]);
  }
  async function readBase(base) {
    const source = (await publisher.read(base, FILE)).toString('utf8');
    const { games } = readCatalog(source);
    return { source, games };
  }
  async function save(draft) {
    const tmp = join(dataDir, 'draft-' + token() + '.tmp');
    try {
      await writeFile(tmp, JSON.stringify(draft), { mode: 0o600, flag: 'wx' });
      await rename(tmp, draftFile);
    } finally {
      await rm(tmp, { force: true });
    }
  }

  let draft;
  try { draft = JSON.parse(await readFile(draftFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const base = draft ? draft.base : await publisher.sync();
  let catalog = await readBase(base);
  if (draft) {
    if (!/^[0-9a-f]{48}$/.test(draft.revision)) throw new Error('本地草稿无法读取。');
    const review = draft.review && reviewOf(draft.review);
    draft = { base, revision: draft.revision, ...gameChanges(catalog.games, { summaries: {}, uploads: [] }, draft),
      ...(review ? { review } : {}) };
  } else draft = emptyDraft(base, catalog.games);

  const sessions = new Map();
  let attempts = [], queue = Promise.resolve();
  function exclusively(action) {
    const result = queue.then(action);
    queue = result.catch(() => {});
    return result;
  }
  function dirty() {
    return draft.uploads.length > 0 || Object.keys(draft.summaries).length > 0 ||
      draft.order.some((id, index) => id !== catalog.games[index].id);
  }
  function view(session) {
    const games = new Map(catalog.games.map(game => [game.id, game]));
    return {
      authMode, actor: session.actor ?? null, csrf: session.csrf, revision: draft.revision,
      base: draft.base, dirty: dirty(), review: draft.review ?? null,
      games: draft.order.map(id => {
        const { zh, en, summary } = games.get(id);
        return { id, zh, en, summary: draft.summaries[id] ?? summary,
          images: IMAGE_NAMES.map((_, i) => '/api/media/' + id + '/' + i + '?v=' + draft.revision) };
      })
    };
  }

  function newSession(previous, now, oauth) {
    sessions.delete(previous);
    if (sessions.size >= 64) sessions.delete(sessions.keys().next().value);
    const id = token();
    const expiry = oauth ? Math.min(oauth.expires, now + ONLINE_SESSION_AGE) : now + SESSION_AGE;
    if (!Number.isFinite(expiry) || expiry <= now) fail(401, '登录已过期，请重试。');
    const session = { expires: expiry, csrf: token(), accessToken: oauth?.accessToken, actor: oauth?.actor };
    sessions.set(id, session);
    return { session, cookie: cookieName + '=' + id + cookieSettings +
      '; Max-Age=' + Math.floor((expiry - now) / 1000) };
  }

  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' blob: data:; frame-ancestors 'none'; form-action 'self'; object-src 'none'; base-uri 'none'");
    let sessionId;
    try {
      if (req.method === 'GET' && req.url === '/healthz') {
        res.writeHead(204);
        return res.end();
      }
      const { port } = server.address();
      const host = req.headers.host;
      if (online ? host !== publicURL.host : host !== '127.0.0.1:' + port && host !== 'localhost:' + port) {
        fail(403, online ? '请从配置的 HTTPS 地址打开后台。' : '请从本机地址打开后台。');
      }
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const path = url.pathname;
      const key = req.method + ' ' + path;
      if (req.method === 'GET' && files.has(path)) {
        const [content, type] = files.get(path);
        return response(res, 200, content, type);
      }
      if (req.method !== 'GET' && req.headers.origin !== (publicURL?.origin ?? 'http://' + host)) {
        fail(403, '请从后台页面提交此操作。');
      }
      sessionId = req.headers.cookie?.split(';').map(item => item.trim()).find(item =>
        item.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
      const now = Date.now();
      for (const [id, session] of sessions) if (session.expires <= now) sessions.delete(id);
      if (online && key === 'GET /auth/github') {
        try {
          const challenge = online.auth.begin();
          return redirect(res, challenge.url, challenge.cookie);
        } catch (error) {
          if (error.status === 429) fail(429, '登录请求太多了，请稍后再试。');
          throw error;
        }
      }
      if (online && key === 'GET /auth/github/callback') {
        try {
          const oauth = await online.auth.finish({ cookie: req.headers.cookie,
            state: url.searchParams.get('state'), code: url.searchParams.get('code') });
          const signed = newSession(sessionId, Date.now(), oauth);
          return redirect(res, '/', [online.auth.clearCookie, signed.cookie]);
        } catch {
          return redirect(res, '/?login=denied', online.auth.clearCookie);
        }
      }
      if (key === 'POST /api/login') {
        if (online) fail(404, '此后台使用 GitHub 登录。');
        attempts = attempts.filter(time => time > now - LOGIN_PERIOD);
        if (attempts.length >= LOGIN_LIMIT) fail(429, '尝试次数过多，请一分钟后重试。');
        attempts.push(now);
        const { username, password } = await body(req);
        if (username !== account.username || typeof password !== 'string' || password.length > 1024 ||
            !timingSafeEqual(await hash(password, account.salt, 32), Buffer.from(account.digest, 'hex'))) {
          fail(401, '账号或密码不正确。');
        }
        attempts = [];
        const signed = newSession(sessionId, now);
        res.setHeader('Set-Cookie', signed.cookie);
        return response(res, 200, view(signed.session));
      }
      const session = sessions.get(sessionId);
      if (!session) fail(401, '请先登录。');
      if (key === 'GET /api/state') return response(res, 200, view(session));
      const image = /^\/api\/media\/([a-z0-9-]+)\/([012])$/.exec(path);
      if (req.method === 'GET' && image) {
        const [, id, slot] = image, index = Number(slot), current = draft;
        if (!current.order.includes(id)) fail(404, '找不到这张截图。');
        const upload = current.uploads.find(item => item.id === id && item.index === index);
        const bytes = upload ? Buffer.from(upload.data, 'base64') : await publisher.read(current.base, mediaPath(id, index));
        return response(res, 200, bytes, 'image/webp');
      }
      if (req.headers['x-csrf-token'] !== session.csrf) fail(403, '页面已过期，请重新打开后台。');
      if (key === 'POST /api/logout') {
        sessions.delete(sessionId);
        res.setHeader('Set-Cookie', cookieName + '=' + cookieSettings + '; Max-Age=0');
        return response(res, 200, { ok: true });
      }
      if (!['PUT /api/draft','POST /api/publish','POST /api/refresh'].includes(key)) fail(404, '找不到这个操作。');
      const result = await exclusively(async () => {
        const maxSize = online ? ONLINE_UPLOAD_LIMIT : UPLOAD_LIMIT;
        const edit = await body(req, key === 'PUT /api/draft' ? maxSize : undefined);
        if (edit.revision !== draft.revision) fail(409, '草稿已在另一个页面更新。请先备份未保存的内容，再重新打开后台。');
        if (draft.review) {
          if (key !== 'POST /api/refresh') fail(409, '草稿正在 GitHub 审阅。处理 PR 后再同步主干。');
          const status = await publisher.reviewStatus({ ...draft.review, accessToken: session.accessToken });
          if (status !== 'merged' && status !== 'closed') fail(409, '审阅请求尚未处理，草稿已保留。');
        }
        if (key === 'PUT /api/draft') {
          const next = { base: draft.base, revision: token(), ...gameChanges(catalog.games, draft, edit) };
          if (online && next.uploads.reduce((total, image) => total + image.data.length, 0) > ONLINE_DRAFT_LIMIT) {
            fail(413, '这份草稿里的新截图已达容量上限，请分批提交审核。');
          }
          await save(next);
          draft = next;
          return view(session);
        }
        let receipt;
        if (key === 'POST /api/publish') {
          if (!dirty()) fail(400, '当前没有要发布的改动。');
          const outgoing = new Map(draft.uploads.map(item => [
            mediaPath(item.id, item.index), Buffer.from(item.data, 'base64')
          ]));
          const source = writeCatalog(catalog.source, draft.order, draft.summaries);
          if (source !== catalog.source) outgoing.set(FILE, Buffer.from(source, 'utf8'));
          receipt = await publisher.publish({ base: draft.base, files: outgoing,
            submissionId: draft.revision, accessToken: session.accessToken, actor: session.actor });
          if (online) {
            if (!receipt.pending) fail(502, '无法确认已创建审阅请求，草稿已保留。');
            const next = { ...draft, revision: token(), review: reviewOf(receipt) };
            await save(next);
            draft = next;
            return { ...next.review, pending: true, state: view(session) };
          }
        }
        const nextBase = receipt?.commit ?? await publisher.sync();
        const nextCatalog = await readBase(nextBase);
        const nextDraft = emptyDraft(nextBase, nextCatalog.games);
        await save(nextDraft);
        catalog = nextCatalog;
        draft = nextDraft;
        const state = view(session);
        return receipt ? { ...receipt, state } : state;
      });
      return response(res, 200, result);
    } catch (error) {
      if (res.destroyed) return;
      if (error instanceof RequestError) return response(res, error.status, { error: error.message, authMode });
      if (error.code === 'AUTH_REVOKED') {
        sessions.delete(sessionId);
        res.setHeader('Set-Cookie', cookieName + '=' + cookieSettings + '; Max-Age=0');
        return response(res, 401, { error: 'GitHub 登录已失效，请重新登录。', authMode });
      }
      if (error.code === 'FORBIDDEN') {
        return response(res, 403, { error: 'GitHub 应用或账号缺少此仓库的编辑权限，草稿已保留。' });
      }
      if (['CONFLICT', 'NOT_FAST_FORWARD', 'INVALID_BASE'].includes(error.code)) {
        return response(res, 409, { error: '展示站有新的改动，草稿已保留。请先核对线上变更，再同步主干或重试。' });
      }
      if (error.code === 'PUSH_FAILED') {
        return response(res, 502, { error: 'GitHub 接收失败，草稿已保留。请检查网络和仓库写入权限，再重试。' });
      }
      if (error.code === 'SYNC_FAILED') {
        return response(res, 502, { error: '暂时无法同步 GitHub，当前草稿已保留。请检查网络后重试。' });
      }
      if (error.code === 'RATE_LIMIT') {
        return response(res, 429, { error: 'GitHub 暂时限制了请求次数，草稿已保留。' });
      }
      console.error('Showcase admin request failed:', error.code ?? error.name);
      return response(res, 500, { error: '后台操作失败，当前草稿仍保留。' });
    }
  });
  return server;
}
