#!/usr/bin/env node
// Measure a page on a real phone, then report what the numbers say.
//
//   node tools/feel-test.mjs --serve tools/feel-selftest
//
// It serves a folder, opens it in Chrome on the phone over adb, injects real
// touch drags through the DevTools protocol, and reads back the numbers the
// page's `feel` recorder collected. Nothing here decides whether the game is
// fun; it decides whether fun is still possible — input answered in time,
// frames steady, every clear reaching all four channels, no chain swallowed.
//
// Options
//   --serve <dir>      serve this folder over HTTP (default tools/feel-selftest)
//   --url <url>        page to open (default http://127.0.0.1:<port>/)
//   --port <n>         port for the local server and adb reverse (default 8000)
//   --device <serial>  adb serial, or "auto" for the only device (default auto)
//   --swipes <n>       drags to inject (default 60)
//   --gap <ms>         wait between drags (default 320)
//   --out <file>       report path (default feel-report.json)
//   --shot <file>      screenshot path (default feel-shot.png), "none" to skip
//   --cdp <port>       use an already-forwarded DevTools port instead of adb
//   --no-launch        do not start Chrome; attach to what is already open
//   --strict           exit 1 when the report fails its own thresholds

import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Write a report or a picture, making the folder it goes in if it is missing. */
async function writeOut(file, data) {
  await mkdir(path.dirname(path.resolve(file)), { recursive: true });
  await writeFile(file, data);
}

// --- options -----------------------------------------------------------------

function parseArgs(argv) {
  const options = {
    // Serving the repository root mirrors how the pages are published: a game
    // sits one level down and imports ../tools/feel/feel.mjs from there.
    serve: path.join(here, '..'),
    url: '',
    port: 8000,
    device: 'auto',
    swipes: 60,
    gap: 320,
    out: path.join('.feel', 'report.json'),
    shot: path.join('.feel', 'shot.png'),
    cdp: 0,
    launch: true,
    strict: false,
    probe: true,
  };
  let urlGiven = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      return value;
    };
    switch (arg) {
      case '--serve': options.serve = next(); break;
      case '--url': options.url = next(); urlGiven = true; break;
      case '--port': options.port = Number(next()); break;
      case '--device': options.device = next(); break;
      case '--swipes': options.swipes = Number(next()); break;
      case '--gap': options.gap = Number(next()); break;
      case '--out': options.out = next(); break;
      case '--shot': options.shot = next(); break;
      case '--cdp': options.cdp = Number(next()); break;
      case '--no-launch': options.launch = false; break;
      case '--no-probe': options.probe = false; break;
      case '--strict': options.strict = true; break;
      case '--help':
      case '-h':
        console.log(usage());
        process.exit(0);
        break;
      default:
        throw new Error(`unknown option ${arg}`);
    }
  }
  if (!urlGiven) options.url = `http://127.0.0.1:${options.port}/tools/feel-selftest/`;
  return options;
}

const usage = () =>
  [
    'node tools/feel-test.mjs [--serve <dir>] [--url <url>] [--device <serial>]',
    '                          [--swipes <n>] [--gap <ms>] [--out <file>]',
    '                          [--shot <file>|none] [--cdp <port>] [--no-launch]',
    '                          [--no-probe] [--strict]',
    '',
    'A page with tools/feel/feel.mjs loaded is judged on all four gates.',
    'A page without it is judged on frames and input only, by an injected probe.',
  ].join('\n');

// --- adb ---------------------------------------------------------------------

const ADB_CANDIDATES = [
  process.env.ADB,
  path.join(here, '..', '.tools', 'platform-tools', 'adb.exe'),
  path.join(here, '..', '..', '.tools', 'platform-tools', 'adb.exe'),
  path.join(here, '..', 'tools', 'platform-tools', 'adb.exe'),
  'adb',
].filter(Boolean);

async function findAdb() {
  for (const candidate of ADB_CANDIDATES) {
    if (candidate !== 'adb' && !existsSync(candidate)) continue;
    try {
      await run(candidate, ['version']);
      return candidate;
    } catch {
      /* try the next one */
    }
  }
  throw new Error(
    'adb not found. Install Android platform-tools and either put adb on PATH or set ADB=/path/to/adb.',
  );
}

async function pickDevice(adb, wanted) {
  const { stdout } = await run(adb, ['devices', '-l']);
  const rows = stdout
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state, ...rest] = line.split(/\s+/);
      const model = rest.find((part) => part.startsWith('model:'))?.slice(6) ?? '';
      return { serial, state, model };
    });
  const ready = rows.filter((row) => row.state === 'device');
  if (ready.length === 0) {
    const other = rows.filter((row) => row.state !== 'device');
    throw new Error(
      other.length
        ? `no device ready: ${other.map((row) => `${row.serial} is ${row.state}`).join(', ')}. Accept the debugging prompt on the phone.`
        : 'no device connected. Plug the phone in with USB debugging on.',
    );
  }
  if (wanted && wanted !== 'auto') {
    const found = ready.find((row) => row.serial === wanted);
    if (!found) throw new Error(`device ${wanted} is not ready. Ready: ${ready.map((r) => r.serial).join(', ')}`);
    return found;
  }
  if (ready.length > 1) {
    throw new Error(`several devices ready: ${ready.map((r) => r.serial).join(', ')}. Pass --device <serial>.`);
  }
  return ready[0];
}

// --- static server -----------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

function serveFolder(folder, port) {
  const root = path.resolve(folder);
  const server = createServer(async (request, response) => {
    const requested = decodeURIComponent(new URL(request.url, 'http://local').pathname);
    const relative = requested.endsWith('/') ? `${requested}index.html` : requested;
    const full = path.join(root, relative);
    if (!full.startsWith(root)) {
      response.writeHead(403).end('outside the served folder');
      return;
    }
    try {
      const bytes = await readFile(full);
      response.writeHead(200, {
        'content-type': MIME[path.extname(full)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(bytes);
    } catch {
      response.writeHead(404).end(`not found: ${relative}`);
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

// --- DevTools protocol -------------------------------------------------------

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.waiting = new Map();
    socket.addEventListener('message', (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      const entry = this.waiting.get(message.id);
      if (!entry) return;
      this.waiting.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    });
    socket.addEventListener('close', () => {
      for (const entry of this.waiting.values()) entry.reject(new Error('DevTools connection closed'));
      this.waiting.clear();
    });
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.socket.close();
    } catch {
      /* already gone */
    }
  }
}

async function connectCdp(port, matchUrl, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const pages = targets.filter((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      const target = pages.find((page) => page.url.startsWith(matchUrl)) ?? pages[0];
      if (target) {
        const socket = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          socket.addEventListener('open', resolve, { once: true });
          socket.addEventListener('error', () => reject(new Error('DevTools socket refused')), { once: true });
        });
        return new Cdp(socket);
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(400);
  }
  throw new Error(
    `no DevTools page on 127.0.0.1:${port}. Check "adb forward tcp:${port} localabstract:chrome_devtools_remote" and that Chrome has the page open.` +
      (lastError ? ` Last error: ${lastError.message}` : ''),
  );
}

async function evaluate(cdp, expression) {
  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

async function waitForRecorder(cdp, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await evaluate(cdp, 'Boolean(window.__feel && window.__feel.report)').catch(() => false);
    if (ready) return true;
    await sleep(300);
  }
  return false;
}

// --- standalone probe --------------------------------------------------------
//
// A page that carries no recorder can still be asked about the two gates that
// belong to the platform rather than the game: how steady the frames are, and
// how long an input waits for the next one. This injects its own frame loop and
// its own listener, so it needs nothing from the page.
//
// It cannot see the other two gates. Feedback completeness and swallowed chains
// are facts about the game's own bookkeeping; only the game can report them.

const PROBE_INSTALL = `(() => {
  if (window.__feelProbe) return true;
  const probe = { gaps: [], latencies: [], dispatch: [], longFrames: [], start: performance.now() };
  window.__feelProbe = probe;
  let last = 0;
  const tick = (t) => {
    if (last) {
      const gap = t - last;
      probe.gaps.push(gap);
      if (gap > 33) probe.longFrames.push({ at: Math.round(t - probe.start), ms: Math.round(gap) });
      if (probe.gaps.length > 8192) probe.gaps.shift();
      if (probe.longFrames.length > 40) probe.longFrames.shift();
    }
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const onDown = (event) => {
    const at = event.timeStamp;
    probe.dispatch.push(performance.now() - at);
    requestAnimationFrame((t) => probe.latencies.push(t - at));
  };
  window.addEventListener('pointerdown', onDown, true);
  return true;
})()`;

const PROBE_RESET = `(() => {
  const p = window.__feelProbe;
  p.gaps.length = 0; p.latencies.length = 0; p.dispatch.length = 0; p.longFrames.length = 0;
  p.start = performance.now();
  return true;
})()`;

const PROBE_REPORT = `(() => {
  const p = window.__feelProbe;
  const stats = (arr) => {
    if (!arr.length) return { samples: 0, mean: 0, p50: 0, p95: 0, p99: 0, max: 0 };
    const s = [...arr].sort((a, b) => a - b);
    const at = (q) => { const i = (s.length - 1) * q; const lo = Math.floor(i); const hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
    return { samples: s.length, mean: s.reduce((a, b) => a + b, 0) / s.length, p50: at(0.5), p95: at(0.95), p99: at(0.99), max: s[s.length - 1] };
  };
  const gaps = stats(p.gaps);
  const latency = stats(p.latencies);
  const dispatch = stats(p.dispatch);
  let dropped = 0;
  for (const gap of p.gaps) if (gap > 25) dropped++;
  return {
    mode: 'probe',
    uptimeMs: performance.now() - p.start,
    frames: p.gaps.length,
    fps: { p95: gaps.p95 > 0 ? 1000 / gaps.p95 : 0 },
    frameGapMs: gaps,
    droppedFrames: { count: dropped, share: p.gaps.length ? dropped / p.gaps.length : 0 },
    longFrames: p.longFrames.slice(-10),
    input: {
      sent: p.dispatch.length,
      samples: latency.samples,
      lost: 0,
      p50: latency.p50, p95: latency.p95, p99: latency.p99, max: latency.max,
      dispatchP95: dispatch.p95,
    },
  };
})()`;

async function probeViewport(cdp) {
  return evaluate(cdp, '({ w: window.innerWidth, h: window.innerHeight })');
}

async function measureProbe(cdp, { swipes, gap }) {
  await evaluate(cdp, PROBE_INSTALL);
  const { w, h } = await probeViewport(cdp);
  await evaluate(cdp, PROBE_RESET);

  // Drag inside a central box, away from the edges, so the gesture lands on the
  // game rather than on a browser edge swipe.
  const box = { x: w * 0.25, y: h * 0.3, w: w * 0.5, h: h * 0.4 };
  let sent = 0;
  for (let i = 0; i < swipes; i++) {
    const from = { x: box.x + Math.random() * box.w, y: box.y + Math.random() * box.h };
    const angle = Math.random() * Math.PI * 2;
    const reach = 30 + Math.random() * 40;
    const to = { x: from.x + Math.cos(angle) * reach, y: from.y + Math.sin(angle) * reach };
    await drag(cdp, from, to);
    sent++;
    await sleep(gap);
  }
  return sent;
}

// --- measuring ---------------------------------------------------------------

async function cellCentres(cdp) {
  const cells = await evaluate(
    cdp,
    `(() => {
      const board = document.getElementById('board');
      if (!board) return null;
      return [...board.children].map((el) => {
        const r = el.getBoundingClientRect();
        return { index: Number(el.dataset.index), x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
    })()`,
  );
  if (!cells?.length) throw new Error('no #board with data-index children on the page.');
  return cells;
}

function neighbours(index, width) {
  const row = Math.floor(index / width);
  const column = index % width;
  const out = [];
  if (row > 0) out.push(index - width);
  if (row < width - 1) out.push(index + width);
  if (column > 0) out.push(index - 1);
  if (column < width - 1) out.push(index + 1);
  return out;
}

async function drag(cdp, from, to, steps = 5, stepMs = 10) {
  const point = (x, y) => [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from.x, from.y) });
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: point(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t),
    });
    await sleep(stepMs);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function waitIdle(cdp, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const busy = await evaluate(cdp, 'Boolean(window.__selftest && window.__selftest.busy)').catch(() => false);
    if (!busy) return;
    await sleep(40);
  }
}

async function measure(cdp, { swipes, gap, width = 7 }) {
  const cells = await cellCentres(cdp);
  if (cells.length !== width * width) {
    throw new Error(`expected ${width * width} cells on the board, found ${cells.length}. Pass the right board size.`);
  }
  const byIndex = new Map(cells.map((cell) => [cell.index, cell]));
  await evaluate(cdp, 'window.__feel.reset(), true');

  let sent = 0;
  for (let i = 0; i < swipes; i++) {
    // Ask the page for a swap that will actually clear, so the feedback
    // channels get exercised. Fall back to a random neighbour when it has none.
    const planned = await evaluate(
      cdp,
      'window.__selftest && window.__selftest.findMatchSwap ? window.__selftest.findMatchSwap() : null',
    ).catch(() => null);

    let from;
    let to;
    if (planned && byIndex.has(planned.from) && byIndex.has(planned.to)) {
      from = byIndex.get(planned.from);
      to = byIndex.get(planned.to);
    } else {
      from = cells[Math.floor(Math.random() * cells.length)];
      const options = neighbours(from.index, width);
      to = cells[options[Math.floor(Math.random() * options.length)]];
    }

    await drag(cdp, from, to);
    sent++;
    // A drag that lands while the board is still resolving is answered with
    // "not now", which is honest but says nothing about latency. Wait it out.
    await waitIdle(cdp);
    await sleep(gap);
  }
  return sent;
}

// --- report ------------------------------------------------------------------

const bar = (value, limit, width = 18) => {
  const filled = Math.max(0, Math.min(width, Math.round((value / limit) * width)));
  return `${'#'.repeat(filled)}${'.'.repeat(width - filled)}`;
};

function printReport(report, context) {
  const line = (label, value, note = '') => console.log(`  ${label.padEnd(22)}${String(value).padStart(9)}  ${note}`);
  console.log(`\ndevice   ${context.device.model || 'unknown'} (${context.device.serial})`);
  console.log(`page     ${context.url}`);
  console.log(`mode     ${report.mode === 'probe' ? 'standalone probe — gates 1 and 2 only' : 'in-page recorder — all four gates'}`);
  console.log(`drags    ${context.sent} sent, ${report.input.samples} measured, ${report.input.lost} lost`);
  console.log(`window   ${(report.uptimeMs / 1000).toFixed(1)} s, ${report.frames} frames\n`);

  const targetInput = report.thresholds?.inputP95Ms ?? 50;
  const targetFrame = report.thresholds?.frameP95Ms ?? 20;

  console.log('input latency (ms)');
  line('p50', report.input.p50.toFixed(1));
  line('p95', report.input.p95.toFixed(1), `target <= ${targetInput}  ${bar(report.input.p95, targetInput)}`);
  line('p99', report.input.p99.toFixed(1));
  line('max', report.input.max.toFixed(1));
  line('  of which browser', report.input.dispatchP95.toFixed(1), 'handoff before game code runs');

  console.log('\nframes');
  line('fps p95', report.fps.p95.toFixed(0));
  line('gap p50 (ms)', report.frameGapMs.p50.toFixed(1));
  line('gap p95 (ms)', report.frameGapMs.p95.toFixed(1), `target <= ${targetFrame}  ${bar(report.frameGapMs.p95, targetFrame)}`);
  line('gap p99 (ms)', report.frameGapMs.p99.toFixed(1));
  line('dropped', `${report.droppedFrames.count}`, `${(report.droppedFrames.share * 100).toFixed(1)}% of frames`);
  if (report.longFrames.length) {
    const worst = report.longFrames.slice().sort((a, b) => b.ms - a.ms)[0];
    line('worst frame', `${worst.ms.toFixed(0)} ms`, `at ${worst.at.toFixed(0)} ms`);
  }

  if (report.mode === 'probe') {
    console.log('\nverdict');
    console.log(`  ${report.input.p95 <= targetInput ? 'PASS' : 'FAIL'}  inputP95`);
    console.log(`  ${report.frameGapMs.p95 <= targetFrame ? 'PASS' : 'FAIL'}  frameP95`);
    console.log('  n/a   feedbackComplete    (the page must report its own clears)');
    console.log('  n/a   noSwallowedChain    (the page must report its own chains)');
    console.log('\n  this page carries no recorder, so only the two platform gates could be judged\n');
    return;
  }

  console.log('\nfeedback');
  line('clears', report.clears.total);
  line('complete', `${(report.clears.completeShare * 100).toFixed(0)}%`, `target 100%  ${bar(report.clears.completeShare * 100, 100)}`);
  for (const [name, count] of Object.entries(report.clears.byChannel)) {
    line(`  ${name}`, count);
  }
  line('chain swallowed', report.chains.swallowed, `expected ${report.chains.expected}, played ${report.chains.played}`);
  for (const miss of report.clears.incomplete.slice(0, 3)) {
    console.log(`    chain ${miss.chain} (${miss.cells} cells) missing ${miss.missing.join(', ')}`);
  }

  console.log('\nverdict');
  for (const [name, ok] of Object.entries(report.verdict)) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  }
  console.log(`\n  ${report.pass ? 'all four gates passed' : 'some gates failed — see above'}\n`);
}

// --- main --------------------------------------------------------------------

/**
 * Measure whatever is on the page and print it. Returns the report so the
 * caller can write it and decide the exit code.
 */
async function runMeasurement(cdp, options, device) {
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  let report;
  let sent;
  if (await waitForRecorder(cdp)) {
    console.log('recorder found, measuring all four gates…');
    sent = await measure(cdp, { swipes: options.swipes, gap: options.gap });
    report = await evaluate(cdp, 'window.__feel.report()');
  } else if (options.probe) {
    console.log('no recorder on this page — injecting a standalone probe (gates 1 and 2 only)…');
    sent = await measureProbe(cdp, { swipes: options.swipes, gap: options.gap });
    report = await evaluate(cdp, PROBE_REPORT);
  } else {
    throw new Error(
      'the page has no window.__feel. Load tools/feel/feel.mjs in the page, or allow the standalone probe (drop --no-probe).',
    );
  }

  printReport(report, { device, url: options.url, sent });
  return { report, sent };
}

async function finish(cdp, options, device, result) {
  if (options.shot !== 'none') {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await writeOut(options.shot, Buffer.from(shot.data, 'base64'));
    console.log(`screenshot ${path.resolve(options.shot)}`);
  }
  await writeOut(
    options.out,
    JSON.stringify(
      { measuredAt: new Date().toISOString(), device, url: options.url, sent: result.sent, report: result.report },
      null,
      2,
    ),
  );
  console.log(`report   ${path.resolve(options.out)}`);

  const passed = result.report.mode === 'probe'
    ? result.report.input.p95 <= 50 && result.report.frameGapMs.p95 <= 20
    : result.report.pass;
  if (options.strict && !passed) process.exitCode = 1;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let server = null;

  if (options.cdp) {
    const cdp = await connectCdp(options.cdp, options.url);
    try {
      const device = { serial: 'cdp', model: `port ${options.cdp}` };
      const result = await runMeasurement(cdp, options, device);
      await finish(cdp, options, device, result);
    } finally {
      cdp.close();
    }
    return;
  }

  const adb = await findAdb();
  const device = await pickDevice(adb, options.device);
  console.log(`adb      ${adb}`);
  console.log(`device   ${device.model || 'unknown'} (${device.serial})`);

  if (options.serve) {
    server = await serveFolder(options.serve, options.port);
    console.log(`serving  ${path.resolve(options.serve)} on 127.0.0.1:${options.port}`);
    await run(adb, ['-s', device.serial, 'reverse', `tcp:${options.port}`, `tcp:${options.port}`]);
    console.log(`reverse  tcp:${options.port} -> phone 127.0.0.1:${options.port}`);
  }

  if (options.launch) {
    const chromePackages = ['com.android.chrome', 'com.chrome.beta', 'com.chrome.dev'];
    let launched = false;
    for (const pkg of chromePackages) {
      try {
        await run(adb, [
          '-s', device.serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW',
          '-d', options.url, '-p', pkg,
        ]);
        launched = true;
        console.log(`chrome   opened ${options.url} in ${pkg}`);
        break;
      } catch {
        /* try the next package */
      }
    }
    if (!launched) {
      throw new Error('could not start Chrome on the phone. Open the URL by hand, then rerun with --no-launch.');
    }
    await sleep(3000);
  }

  await run(adb, ['-s', device.serial, 'forward', 'tcp:9222', 'localabstract:chrome_devtools_remote']);
  console.log('forward  tcp:9222 -> chrome_devtools_remote');

  const cdp = await connectCdp(9222, options.url);
  try {
    const result = await runMeasurement(cdp, options, device);
    await finish(cdp, options, device, result);
  } finally {
    cdp.close();
    server?.close();
  }
}

main().catch((error) => {
  console.error(`\nfeel-test: ${error.message}\n`);
  process.exitCode = 1;
});
