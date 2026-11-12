import { enginePackages, makeGameImports } from './src/browser-imports.mjs';
import { createPackData } from './browser/pack-data.mjs';
import { createPackFetch } from './browser/pack-api.mjs';
import { openPackStore } from './browser/pack-import.mjs';

const root = new URL('./', self.location.href);
const play = new URL('play/', root);
const library = 'third-party/spessasynth_lib/spessasynth_processor.min.js';
const rules = new Set(['cifa-opening', 'cifa-trainer', 'cifa-recruit', 'cifa-game',
  'game-events', 'kys-navigation', 'classic-battle', 'battle-progression'].map(name => name + '.mjs'));
let gameImports;
let active;
const sessions = new Map();

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type === 'pack-replaced') active = undefined;
});

function importedModules() {
  gameImports ??= Promise.all(enginePackages.map(async folder => {
    const response = await fetch(new URL(`vendor/${folder}/package.json`, root));
    if (!response.ok) throw Error('Cannot load the engine package manifest.');
    return [folder, await response.json()];
  })).then(manifests => makeGameImports(manifests,
    (folder, name) => new URL(`vendor/${folder}/${name}`, root).href,
    name => new URL(`third-party/${name}/index.js`, root).href)).catch(error => {
    gameImports = undefined;
    throw error;
  });
  return gameImports;
}

async function openActivePack() {
  const store = await openPackStore();
  if (!store) {
    active = undefined;
    return;
  }
  if (active?.id !== store.id) {
    // The generation is tied to a full-game page. A replaced pack cannot be mixed into an open game.
    const state = { id: store.id, store };
    active = state;
  }
  return active;
}

function responseText(message, status) {
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

async function gameShell(url, clientId) {
  const pack = await openActivePack();
  if (!pack || url.searchParams.has('pack') && url.searchParams.get('pack') !== pack.id) {
    return Response.redirect(new URL('#4in1', root), 302);
  }
  if (!url.searchParams.has('pack')) {
    url.searchParams.set('pack', pack.id);
    return Response.redirect(url, 302);
  }
  if (clientId) {
    // Client URLs provide the same generation if the browser restarts this worker.
    sessions.set(clientId, pack.id);
    if (sessions.size > 32) sessions.delete(sessions.keys().next().value);
  }
  const [shell, imports] = await Promise.all([fetch(new URL('web/index.html', root)), importedModules()]);
  if (!shell.ok) return responseText('无法载入游戏客户端。', 503);
  const head = '<script type="importmap">' + JSON.stringify({ imports }) + '</script>'
    + '<meta name="jy-music-processor" content="' + new URL(library, root).href + '">';
  const html = (await shell.text()).replace(/<head\b[^>]*>/i, value => value + head);
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function sessionPack(clientId, request) {
  let id = sessions.get(clientId);
  if (!id) {
    const client = clientId && await self.clients.get(clientId);
    const page = client?.url || request.referrer;
    if (page && page !== 'about:client') id = new URL(page).searchParams.get('pack');
  }
  if (!id) return;
  const pack = active ?? await openActivePack();
  return pack?.id === id ? pack : undefined;
}

function packHandler(pack) {
  pack.handler ??= createPackData(pack.store).then(data => createPackFetch(pack.store, data, fetch)).catch(error => {
    pack.handler = undefined;
    throw error;
  });
  return pack.handler;
}

function shippedPath(path) {
  if (path === 'idb-keyval.mjs') return 'third-party/idb-keyval/index.mjs';
  if (rules.has(path)) return 'src/' + path;
  if (path.startsWith('music-lib/')) return 'third-party/' + path.slice('music-lib/'.length);
  if (path.startsWith('vendor/')) return path;
  return 'web/' + path;
}

async function shippedResponse(path, request) {
  if (!/^[a-z0-9_./-]+$/i.test(path) || path.split('/').some(part => part === '.' || part === '..')) {
    return responseText('Invalid game resource path.', 400);
  }
  const response = await fetch(new URL(shippedPath(path), root), { method: request.method, signal: request.signal });
  if (!response.ok) return responseText('Game resource not found.', response.status);
  const headers = new Headers(response.headers);
  headers.delete('Content-Encoding');
  headers.delete('Content-Length');
  // A synthetic response keeps relative imports on the virtual play path.
  return new Response(response.body, { status: response.status, headers });
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== root.origin) return;
  const inGame = url.pathname.startsWith(play.pathname);
  const route = inGame ? url.pathname.slice(play.pathname.length) : url.pathname.slice(1);
  const privateData = /^(?:api|art|audio)\//.test(route);
  const gameAsset = /^(?:jyx2|music-lib|vendor)\//.test(route);
  if (!inGame && !privateData && !gameAsset) return;
  event.respondWith((async () => {
    if (inGame && request.mode === 'navigate' && (route === '' || route === 'index.html')) {
      return gameShell(url, event.resultingClientId);
    }
    if (privateData) {
      const pack = await sessionPack(event.clientId, request);
      if (!pack) return responseText('请从试玩首页导入 4in1，再进入完整版。', 409);
      const serve = await packHandler(pack);
      // Original data and save bodies are resolved here without a network fallback.
      return serve('/' + route + url.search, request);
    }
    if (!['GET', 'HEAD'].includes(request.method)) return responseText('Method not allowed.', 405);
    return shippedResponse(route, request);
  })().catch(error => {
    console.error('JY browser runtime', error);
    return responseText('读取游戏数据失败。请回到试玩首页检查导入的 4in1。', 500);
  }));
});
