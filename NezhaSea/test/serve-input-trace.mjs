import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as wait } from 'node:timers/promises';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const delayed = 'vendor/robust-predicates/esm/util.js';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.wasm': 'application/wasm'
};

// The two lanes serve identical bytes. Only the selected dependency's response time differs.
const server = createServer(async (request, reply) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return reply.writeHead(405).end();
  try {
    const url = new URL(request.url, 'http://localhost');
    const lane = /^\/(normal|slow)\/(.*)$/.exec(url.pathname);
    if (!lane) return reply.writeHead(404).end();
    const name = decodeURIComponent(lane[2] || 'index.html');
    const file = resolve(root, name);
    if (!file.startsWith(root + sep)) return reply.writeHead(404).end();
    const body = await readFile(file);
    if (lane[1] === 'slow' && file === resolve(root, delayed)) await wait(5000);
    reply.writeHead(200, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    reply.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    reply.writeHead(404).end();
  }
});

server.listen(Number(process.argv[2] ?? 0), '127.0.0.1', () => {
  const origin = 'http://127.0.0.1:' + server.address().port;
  for (const lane of ['normal', 'slow']) console.log(`${origin}/${lane}/?lang=zh&seed=1`);
});
