// Measurement for game feel: how long an input takes to show, how steady the
// frames are, and whether every clear really produced its feedback.
//
// It reports numbers, not taste. "Is it fun" stays a person's call; what this
// can prove is that nothing makes fun impossible — no dropped input, no
// swallowed chain, no missing feedback channel, no frame the eye would notice.
//
// Create it with { enabled: false } and every call returns at once, so a page
// that ships can pay nothing for it.

const DEFAULTS = {
  enabled: true,
  capacity: 2048,
  targetFrameMs: 16.7,
  longFrameMs: 33,
  inputTimeoutMs: 500,
  thresholds: { inputP95Ms: 50, frameP95Ms: 20, completeShare: 1, swallowed: 0 },
};

/** The four channels every clear should reach. Missing one is a bug, not a choice. */
export const CHANNELS = ['visual', 'audio', 'haptic', 'hitstop'];

const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function createSeries(capacity) {
  const values = new Float64Array(capacity);
  let head = 0;
  let count = 0;
  return {
    push(value) {
      values[head] = value;
      head = (head + 1) % capacity;
      if (count < capacity) count++;
    },
    get length() {
      return count;
    },
    sorted() {
      const out = new Float64Array(count);
      for (let i = 0; i < count; i++) out[i] = values[(head - count + i + capacity) % capacity];
      return out.sort();
    },
    clear() {
      head = 0;
      count = 0;
    },
  };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const at = (sorted.length - 1) * p;
  const low = Math.floor(at);
  const high = Math.ceil(at);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (at - low);
}

function describe(series) {
  const sorted = series.sorted();
  if (sorted.length === 0) return { samples: 0, mean: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 };
  let sum = 0;
  for (let i = 0; i < sorted.length; i++) sum += sorted[i];
  return {
    samples: sorted.length,
    mean: sum / sorted.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

const round = (value) => Math.round(value * 100) / 100;

/**
 * @param {object} [options]
 * @param {boolean} [options.enabled] false makes every call a no-op
 * @param {number} [options.capacity] samples kept per series
 * @param {number} [options.targetFrameMs] a longer frame gap counts as dropped
 * @param {number} [options.longFrameMs] a longer gap is listed by itself
 * @param {number} [options.inputTimeoutMs] an input unanswered this long is lost
 * @param {object} [options.thresholds] what `report().verdict` compares against
 */
export function createFeel(options = {}) {
  const config = { ...DEFAULTS, ...options, thresholds: { ...DEFAULTS.thresholds, ...options.thresholds } };
  const enabled = config.enabled !== false;

  const inputLatency = createSeries(config.capacity);
  const dispatchLatency = createSeries(config.capacity);
  const frameGaps = createSeries(config.capacity);
  const longFrames = [];

  let startedAt = clock();
  let lastFrameAt = 0;
  let frames = 0;
  let nextToken = 1;
  let inputs = 0;
  let lostInputs = 0;
  const pending = [];

  const clears = { total: 0, complete: 0, byChannel: Object.fromEntries(CHANNELS.map((name) => [name, 0])), incomplete: [] };
  const chains = { expected: 0, played: 0, swallowed: 0 };

  const feel = {
    enabled,
    get frames() {
      return frames;
    },

    /**
     * Call once at the start of a frame, before anything is drawn.
     * Closes the input samples whose change was applied since the last call.
     */
    frame(timestamp) {
      if (!enabled) return;
      const now = timestamp ?? clock();
      if (lastFrameAt !== 0) {
        const gap = now - lastFrameAt;
        frameGaps.push(gap);
        if (gap > config.longFrameMs) {
          longFrames.push({ at: round(now - startedAt), ms: round(gap) });
          if (longFrames.length > 40) longFrames.shift();
        }
      }
      lastFrameAt = now;
      frames++;

      for (let i = pending.length - 1; i >= 0; i--) {
        const entry = pending[i];
        if (entry.appliedAt === 0) {
          if (now - entry.at > config.inputTimeoutMs) {
            lostInputs++;
            pending.splice(i, 1);
          }
          continue;
        }
        inputLatency.push(now - entry.at);
        pending.splice(i, 1);
      }
    },

    /**
     * Call when the game can first act on an input — which is not always the
     * first event. A drag-to-swap decides at pointerup; a tap decides at
     * pointerdown. Open the sample at the event that lets you decide, or the
     * number will include the gesture itself.
     *
     * Pass the event's own `timeStamp`: it is closer to the hardware than
     * anything this module can read, and it is in the same time base.
     * @returns {number} a token for `consumed`
     */
    input(x, y, timestamp) {
      if (!enabled) return 0;
      const token = nextToken++;
      const at = timestamp ?? clock();
      // The gap between the event and this call is the browser's own handoff,
      // before any game code ran. Worth its own number: it is not ours to fix,
      // but it is ours to report. Clamped, because an event stamped slightly
      // ahead of our clock is skew, not a negative cost.
      dispatchLatency.push(Math.max(0, clock() - at));
      inputs++;
      pending.push({ token, x, y, at, appliedAt: 0 });
      return token;
    },

    /**
     * Call once the change that input asked for has been applied to the scene.
     * The sample is taken at the next `frame()`, which is the first moment the
     * eye could see it.
     */
    consumed(token) {
      if (!enabled || !token) return;
      for (let i = 0; i < pending.length; i++) {
        if (pending[i].token === token) {
          pending[i].appliedAt = clock();
          return;
        }
      }
    },

    /**
     * Call once per resolved clear.
     * @param {{chain?: number, cells?: number, channels?: string[]}} record
     *        `channels` lists what actually fired for this clear.
     */
    clear(record = {}) {
      if (!enabled) return;
      const fired = record.channels ?? [];
      clears.total++;
      for (const name of fired) if (name in clears.byChannel) clears.byChannel[name]++;
      const missing = CHANNELS.filter((name) => !fired.includes(name));
      if (missing.length === 0) clears.complete++;
      else if (clears.incomplete.length < 20) {
        clears.incomplete.push({ chain: record.chain ?? 0, cells: record.cells ?? 0, missing });
      }
    },

    /**
     * Call once per turn or per cascade to check that the solver's chain count
     * and the number of animations actually played agree. A chain the rules
     * counted but the view never showed is a swallowed chain.
     */
    chain(expected, played) {
      if (!enabled) return;
      chains.expected += expected;
      chains.played += played;
      if (played < expected) chains.swallowed += expected - played;
    },

    report() {
      const gaps = describe(frameGaps);
      const latency = describe(inputLatency);
      const dispatch = describe(dispatchLatency);
      const dropped = (() => {
        const sorted = frameGaps.sorted();
        let count = 0;
        for (let i = 0; i < sorted.length; i++) if (sorted[i] > config.targetFrameMs * 1.5) count++;
        return { count, share: sorted.length ? round(count / sorted.length) : 0 };
      })();
      const completeShare = clears.total ? round(clears.complete / clears.total) : 1;
      const t = config.thresholds;
      const verdict = {
        inputP95: latency.samples > 0 && latency.p95 <= t.inputP95Ms,
        frameP95: gaps.samples > 0 && gaps.p95 <= t.frameP95Ms,
        feedbackComplete: completeShare >= t.completeShare,
        noSwallowedChain: chains.swallowed <= t.swallowed,
      };
      return {
        enabled,
        uptimeMs: round(clock() - startedAt),
        frames,
        fps: {
          mean: gaps.mean > 0 ? round(1000 / gaps.mean) : 0,
          p50: gaps.p50 > 0 ? round(1000 / gaps.p50) : 0,
          p95: gaps.p95 > 0 ? round(1000 / gaps.p95) : 0,
        },
        frameGapMs: { ...gaps, mean: round(gaps.mean), p50: round(gaps.p50), p95: round(gaps.p95), p99: round(gaps.p99) },
        droppedFrames: dropped,
        longFrames: longFrames.slice(-10),
        input: {
          sent: inputs,
          samples: latency.samples,
          lost: lostInputs,
          p50: round(latency.p50),
          p95: round(latency.p95),
          p99: round(latency.p99),
          max: round(latency.max),
          // Of the figure above, this much was the browser handing us the
          // event. The rest is the game.
          dispatchP50: round(dispatch.p50),
          dispatchP95: round(dispatch.p95),
        },
        clears: { total: clears.total, complete: clears.complete, completeShare, byChannel: clears.byChannel, incomplete: clears.incomplete },
        chains,
        thresholds: t,
        verdict,
        pass: Object.values(verdict).every(Boolean),
      };
    },

    reset() {
      inputLatency.clear();
      dispatchLatency.clear();
      frameGaps.clear();
      longFrames.length = 0;
      pending.length = 0;
      startedAt = clock();
      lastFrameAt = 0;
      frames = 0;
      inputs = 0;
      lostInputs = 0;
      clears.total = 0;
      clears.complete = 0;
      clears.incomplete.length = 0;
      for (const name of CHANNELS) clears.byChannel[name] = 0;
      chains.expected = 0;
      chains.played = 0;
      chains.swallowed = 0;
    },
  };

  return feel;
}
