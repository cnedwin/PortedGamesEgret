// 浏览器验收的公用部分：在本机起一个静态服务、开无头 Chromium、记下控制台错误、按截图基线比对。每个游戏的
// test/accept.mjs 用它写自己的固定流程。只依赖 Playwright（根目录 package.json 的开发依赖）。
// The shared part of browser acceptance: a static server on this machine, headless Chromium, the console errors
// collected, and screenshots compared with a baseline. Each game's test/accept.mjs writes its own fixed walk with it.
// It depends only on Playwright (a development dependency in the root package.json).
import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wasm': 'application/wasm',
  '.atlas': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

/** Serve the repository on a free port of this machine. `throttle` delays each response by that many milliseconds. */
export async function serve({ root = ROOT, throttle = 0 } = {}) {
  const server = createServer(async (request, reply) => {
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://x').pathname),
        file = normalize(join(root, path.endsWith('/') ? path + 'index.html' : path));
      if (!file.startsWith(root)) throw new Error('outside');
      const info = await stat(file);
      const body = info.isDirectory() ? await readFile(join(file, 'index.html')) : await readFile(file);
      if (throttle) await new Promise((done) => setTimeout(done, throttle));
      reply.writeHead(200, { 'content-type': TYPES[extname(info.isDirectory() ? 'index.html' : file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      reply.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      reply.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((done) => server.close(done)) };
}

/**
 * Headless Chromium. Without a GPU it draws through SwiftShader, which every result here says. `CHROMIUM_PATH` names a
 * Chromium or Chrome already on the machine, for where Playwright's own download is not available.
 */
export async function launch() {
  return chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']
  });
}

/** Messages that say nothing about the game: a missing page icon. */
const HARMLESS = [/favicon\.ico/, /GPU stall due to ReadPixels/, /Automatic fallback to software WebGL/];

/**
 * A page of the game at `url`, with its console errors and page errors collected in `page.problems`. `touch` makes a
 * touch screen; `reducedMotion` asks for less motion, which also makes screenshots steady; `before(page)` runs before
 * the page is opened.
 */
export async function openPage(browser, url, { width = 960, height = 540, touch = false, reducedMotion = true, scale = 1, before } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, hasTouch: touch, isMobile: touch, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  page.problems = [];
  page.on('pageerror', (error) => page.problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !HARMLESS.some((pattern) => pattern.test(message.text()))) page.problems.push(`console: ${message.text().slice(0, 300)}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !HARMLESS.some((pattern) => pattern.test(response.url()))) page.problems.push(`http ${response.status()}: ${response.url()}`);
  });
  // `before(page)` runs ahead of the first request: init scripts, network or CPU throttling.
  if (before) await before(page);
  await page.goto(url);
  return page;
}

/**
 * Compare a screenshot of `page` with `test/baseline/<name>.png` of the game. A missing baseline, or `update`, writes
 * it. Otherwise the two are compared in the page (no image library needed): a pixel differs when any channel differs
 * by more than `tolerance`; the share of differing pixels must stay under `limit`. A picture of the differences is
 * written to `test/baseline/diff/<name>.png`.
 */
export async function matchBaseline(page, gameDir, name, { update = process.argv.includes('--update'), tolerance = 40, limit = 0.02 } = {}) {
  const dir = join(gameDir, 'test', 'baseline'),
    file = join(dir, `${name}.png`),
    shot = await page.screenshot();
  let previous = null;
  try {
    previous = await readFile(file);
  } catch {
    /* no baseline yet */
  }
  if (update || !previous) {
    await mkdir(dir, { recursive: true });
    await writeFile(file, shot);
    return { name, written: true, share: 0 };
  }
  const result = await page.evaluate(
    async ([a, b, tolerance]) => {
      const load = (data) => new Promise((done, fail) => {
        const image = new Image();
        image.onload = () => done(image);
        image.onerror = fail;
        image.src = 'data:image/png;base64,' + data;
      });
      const [left, right] = await Promise.all([load(a), load(b)]);
      if (left.width !== right.width || left.height !== right.height) return { share: 1, size: [left.width, left.height, right.width, right.height] };
      const canvas = document.createElement('canvas');
      canvas.width = left.width;
      canvas.height = left.height;
      const context = canvas.getContext('2d');
      context.drawImage(left, 0, 0);
      const one = context.getImageData(0, 0, canvas.width, canvas.height);
      context.drawImage(right, 0, 0);
      const two = context.getImageData(0, 0, canvas.width, canvas.height),
        diff = context.createImageData(canvas.width, canvas.height);
      let differing = 0;
      for (let i = 0; i < one.data.length; i += 4) {
        const off = Math.max(Math.abs(one.data[i] - two.data[i]), Math.abs(one.data[i + 1] - two.data[i + 1]), Math.abs(one.data[i + 2] - two.data[i + 2])) > tolerance;
        if (off) differing++;
        diff.data[i] = off ? 255 : two.data[i] * 0.3;
        diff.data[i + 1] = off ? 0 : two.data[i + 1] * 0.3;
        diff.data[i + 2] = off ? 64 : two.data[i + 2] * 0.3;
        diff.data[i + 3] = 255;
      }
      context.putImageData(diff, 0, 0);
      return { share: differing / (one.data.length / 4), picture: canvas.toDataURL('image/png').split(',')[1] };
    },
    [previous.toString('base64'), shot.toString('base64'), tolerance]
  );
  if (result.picture) {
    await mkdir(join(dir, 'diff'), { recursive: true });
    await writeFile(join(dir, 'diff', `${name}.png`), Buffer.from(result.picture, 'base64'));
  }
  return { name, written: false, share: result.share, passed: result.share <= limit };
}

/** Wait until `test` (run in the page) is true, polling; fails after `seconds`. */
export async function until(page, test, seconds = 60) {
  await page.waitForFunction(test, null, { timeout: seconds * 1000, polling: 100 });
}

/** Print a walk's result and set the exit code: every check must hold and no problems may have been seen. */
export function report(title, checks, problems) {
  let failed = 0;
  console.log(`# ${title}`);
  for (const [ok, words] of checks) {
    if (!ok) failed++;
    console.log(`${ok ? 'ok' : 'not ok'} - ${words}`);
  }
  for (const problem of problems) console.log(`not ok - ${problem}`);
  failed += problems.length;
  console.log(failed ? `# ${failed} failed` : '# all passed');
  process.exitCode = failed ? 1 : 0;
  return failed === 0;
}
