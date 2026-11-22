// Keep short original cues aligned with their triggering event, even on a cold load.
const maxCueDelayMs = 300;

const cuePath = (group, id) => (group === 'wave' || group === 'hit') && Number.isInteger(id) && id >= 0 && id <= 99
  ? `/audio/${group}/${id}.wav` : undefined;

async function readBytes(path, { signal }) {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error(`Unable to load WAV (${response.status})`);
  // Both game servers use 204 for original sample IDs without a WAV.
  if (response.status === 204) return undefined;
  return response.arrayBuffer();
}

function untilAbort(promise, signal) {
  if (signal.aborted) return Promise.resolve();
  return new Promise(resolve => {
    const cancel = () => finish();
    function finish(value) {
      signal.removeEventListener('abort', cancel);
      resolve(value);
    }
    signal.addEventListener('abort', cancel, { once: true });
    promise.then(finish, cancel);
  });
}

async function waitForUnlock(mixer, signal) {
  if (mixer.state === 'running') return true;
  if (mixer.state !== 'locked' || signal.aborted) return false;
  let unsubscribe;
  try {
    return await untilAbort(new Promise(resolve => {
      unsubscribe = mixer.subscribe(state => {
        if (state !== 'locked') resolve(state === 'running');
      });
    }), signal);
  } finally {
    unsubscribe?.();
  }
}

/** All original WAV effects in one game session share the engine's effects bus. */
export function createWavEffects({ createAudio, enabled = true, fetchBytes = readBytes }) {
  const sounds = new Map(), pending = new Map(), lifetime = new AbortController();
  let audio;

  function setup() {
    if (!enabled || lifetime.signal.aborted) return;
    try {
      audio ??= createAudio({ buses: ['effects'], onError() {} });
      return audio;
    } catch {
      // Audio availability does not affect the event or battle rules.
    }
  }

  function decoded(path, mixer) {
    let promise = sounds.get(path);
    if (!promise) {
      const { signal } = lifetime;
      promise = (async () => {
        const bytes = await fetchBytes(path, { signal });
        if (bytes !== undefined && !signal.aborted) return mixer.decode(bytes);
      })().catch(() => {
        sounds.delete(path);
      });
      sounds.set(path, promise);
    }
    return promise;
  }

  function activate() {
    const output = setup();
    if (output?.mixer.state !== 'locked') return;
    // Call inside a trusted gesture. The engine also listens for later gestures if the host refuses.
    try {
      void output.context.resume().catch(() => {});
    } catch {}
  }

  async function preload(group, id) {
    const path = cuePath(group, id);
    const mixer = path && setup()?.mixer;
    return Boolean(mixer && await decoded(path, mixer));
  }

  async function play(group, id, { signal } = {}) {
    const requestedAt = performance.now();
    const path = cuePath(group, id);
    const mixer = path && !signal?.aborted && setup()?.mixer;
    if (!mixer) return false;
    pending.get(path)?.abort();
    const request = new AbortController();
    pending.set(path, request);
    const waiting = signal ? AbortSignal.any([signal, request.signal]) : request.signal;
    const timer = setTimeout(() => request.abort(), maxCueDelayMs);
    try {
      const sound = await untilAbort(decoded(path, mixer), waiting);
      if (!sound || waiting.aborted || !await waitForUnlock(mixer, waiting) || waiting.aborted) return false;
      if (performance.now() - requestedAt >= maxCueDelayMs) return false;
      const voice = mixer.play(sound, { bus: 'effects', maxInstances: 1 });
      if (voice.state === 'ended') return false;
      if (signal) {
        const cancel = () => { try { voice.stop(); } catch {} };
        signal.addEventListener('abort', cancel, { once: true });
        void voice.ended.then(() => signal.removeEventListener('abort', cancel));
      }
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
      if (pending.get(path) === request) pending.delete(path);
    }
  }

  function stop() {
    for (const request of pending.values()) request.abort();
    pending.clear();
    try { audio?.mixer.stopAll({ bus: 'effects' }); } catch {}
  }

  function dispose() {
    if (lifetime.signal.aborted) return;
    lifetime.abort();
    stop();
    sounds.clear();
    try { audio?.dispose(); } catch {}
    audio = undefined;
  }

  return { activate, preload, play, dispose };
}
