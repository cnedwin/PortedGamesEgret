// A real 7×7 match-3, small enough to read, that exists so `feel-test` has
// something honest to measure: input latency, frame gaps, the four feedback
// channels of every clear, and whether any chain the rules found went unshown.
//
// The rules here are the seed of the game's board — a plain array, no display
// objects, so the same code runs under `node --test` later.

import { createFeel } from '#feel';
import { createFeelOverlay } from '#feel-overlay';

const SIZE = 7;
const KINDS = 5;
const CLEAR_MS = 120;
const SETTLE_MS = 60;

const feel = createFeel();
const overlay = createFeelOverlay(feel, { visible: !new URLSearchParams(location.search).has('nooverlay') });

const board = new Int8Array(SIZE * SIZE);
const boardEl = document.getElementById('board');
const chainEl = document.getElementById('chain');
const cells = [];
for (let i = 0; i < SIZE * SIZE; i++) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.dataset.index = String(i);
  boardEl.appendChild(cell);
  cells.push(cell);
}

const randomKind = () => Math.floor(Math.random() * KINDS);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fillBoard() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      let kind = 0;
      for (let guard = 0; guard < 40; guard++) {
        kind = randomKind();
        const across = c >= 2 && board[r * SIZE + c - 1] === kind && board[r * SIZE + c - 2] === kind;
        const down = r >= 2 && board[(r - 1) * SIZE + c] === kind && board[(r - 2) * SIZE + c] === kind;
        if (!across && !down) break;
      }
      board[r * SIZE + c] = kind;
    }
  }
}

/** Every cell that is part of a run of three or more, across or down. */
function findMatches() {
  const hit = new Set();
  for (let r = 0; r < SIZE; r++) {
    let run = 1;
    for (let c = 1; c <= SIZE; c++) {
      const same = c < SIZE && board[r * SIZE + c] >= 0 && board[r * SIZE + c] === board[r * SIZE + c - 1];
      if (same) {
        run++;
      } else {
        if (run >= 3) for (let k = c - run; k < c; k++) hit.add(r * SIZE + k);
        run = 1;
      }
    }
  }
  for (let c = 0; c < SIZE; c++) {
    let run = 1;
    for (let r = 1; r <= SIZE; r++) {
      const same = r < SIZE && board[r * SIZE + c] >= 0 && board[r * SIZE + c] === board[(r - 1) * SIZE + c];
      if (same) {
        run++;
      } else {
        if (run >= 3) for (let k = r - run; k < r; k++) hit.add(k * SIZE + c);
        run = 1;
      }
    }
  }
  return hit;
}

function collapse() {
  for (let c = 0; c < SIZE; c++) {
    const column = [];
    for (let r = SIZE - 1; r >= 0; r--) {
      const kind = board[r * SIZE + c];
      if (kind >= 0) column.push(kind);
    }
    for (let r = SIZE - 1, i = 0; r >= 0; r--, i++) {
      board[r * SIZE + c] = i < column.length ? column[i] : randomKind();
    }
  }
}

function paint() {
  for (let i = 0; i < board.length; i++) {
    const kind = board[i];
    const name = kind >= 0 ? `cell e${kind}` : 'cell';
    if (cells[i].className !== name) cells[i].className = name;
  }
}

// --- feedback channels -------------------------------------------------------

let audio = null;
const wakeAudio = () => {
  if (audio) return;
  try {
    audio = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    audio = null;
  }
};

/** Two semitones higher per chain step, the cheapest way to make a cascade heard. */
function blip(chain) {
  if (!audio || audio.state !== 'running') return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 440 * 2 ** (Math.min(chain - 1, 6) / 6);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
  osc.connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.14);
}

const buzz = (ms) => navigator.vibrate?.(ms);

/** A real freeze: the game does nothing for this long, so the blow lands. */
const hitstopMs = (chain) => Math.min(40 + chain * 15, 110);
const hitstop = (ms) => sleep(ms);

function announce(chain) {
  chainEl.textContent = `CHAIN ×${chain}`;
  chainEl.classList.add('show');
  setTimeout(() => chainEl.classList.remove('show'), 380);
}

async function resolve() {
  let chains = 0;
  let played = 0;
  for (;;) {
    const hit = findMatches();
    if (hit.size === 0) break;
    chains++;
    played++;
    const freeze = hitstopMs(chains);
    await hitstop(freeze);
    for (const index of hit) cells[index].className += ' clearing';
    blip(chains);
    buzz(freeze);
    if (chains > 1) announce(chains);
    feel.clear({ chain: chains, cells: hit.size, channels: ['visual', 'audio', 'haptic', 'hitstop'] });
    for (const index of hit) board[index] = -1;
    collapse();
    await sleep(CLEAR_MS);
    paint();
    await sleep(SETTLE_MS);
  }
  feel.chain(chains, played);
  return chains;
}

// --- input -------------------------------------------------------------------

const indexAt = (x, y) => {
  const el = document.elementFromPoint(x, y);
  const index = el?.dataset?.index;
  return index === undefined ? -1 : Number(index);
};
const adjacent = (a, b) => {
  if (a < 0 || b < 0) return false;
  const [ra, ca] = [Math.floor(a / SIZE), a % SIZE];
  const [rb, cb] = [Math.floor(b / SIZE), b % SIZE];
  return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
};

const neighboursOf = (index) => {
  const row = Math.floor(index / SIZE);
  const column = index % SIZE;
  const out = [];
  if (row > 0) out.push(index - SIZE);
  if (row < SIZE - 1) out.push(index + SIZE);
  if (column > 0) out.push(index - 1);
  if (column < SIZE - 1) out.push(index + 1);
  return out;
};

/**
 * A swap that would clear something. Random adjacent swaps almost never match,
 * so a test that wants to watch the feedback channels has to ask for a real one.
 */
function findMatchSwap() {
  for (let a = 0; a < board.length; a++) {
    for (const b of neighboursOf(a)) {
      if (b < a) continue;
      const left = board[a];
      const right = board[b];
      board[a] = right;
      board[b] = left;
      const matches = findMatches().size > 0;
      board[a] = left;
      board[b] = right;
      if (matches) return { from: a, to: b };
    }
  }
  return null;
}

let busy = false;
let firstCell = -1;

boardEl.addEventListener('pointerdown', (event) => {
  wakeAudio();
  firstCell = indexAt(event.clientX, event.clientY);
});

boardEl.addEventListener('pointercancel', () => {
  firstCell = -1;
});

boardEl.addEventListener('pointerup', async (event) => {
  const from = firstCell;
  firstCell = -1;
  if (from < 0) return;

  // A drag decides at the lift: only then does the game know what was asked
  // for. Opening the sample here measures the game's answer, not the gesture.
  const token = feel.input(event.clientX, event.clientY, event.timeStamp);

  const target = indexAt(event.clientX, event.clientY);
  if (busy || !adjacent(from, target)) {
    feel.consumed(token);
    return;
  }

  busy = true;
  const a = board[from];
  const b = board[target];
  board[from] = b;
  board[target] = a;
  paint();
  feel.consumed(token);
  const chains = await resolve();
  if (chains === 0) {
    board[from] = a;
    board[target] = b;
    paint();
  }
  busy = false;
});

// --- frame loop --------------------------------------------------------------

function frame(timestamp) {
  feel.frame(timestamp);
  overlay.update();
  requestAnimationFrame(frame);
}

fillBoard();
paint();
requestAnimationFrame(frame);

// The harness reads these; a person playing does not need them.
window.__feel = feel;
window.__selftest = {
  get busy() {
    return busy;
  },
  get board() {
    return Array.from(board);
  },
  resolve,
  findMatchSwap,
};
