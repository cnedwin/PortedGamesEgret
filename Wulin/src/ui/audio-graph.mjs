// One native browser mixer is shared by the recordings, synthesized cues and world sound.
// The source modules own their precise clip schedules; the mixer owns routing and its output clock.
const BUSES = ['music', 'effects', 'voice', 'ambience'];

export function createAudioGraph({ create, request = globalThis.fetch } = {}) {
  let audio, resuming = false, closed = false, unsubscribe, previousState;
  const buffers = new Map();
  const runningListeners = new Set();
  function changed(state) {
    if (state === previousState) return;
    previousState = state;
    if (state === 'running') for (const listener of runningListeners) listener();
  }
  const graph = {
    get context() { return audio?.context; },
    get mixer() { return audio?.mixer; },
    get ready() {
      const state = audio?.mixer.state;
      return !closed && (state === 'running' || (state === 'locked' && resuming));
    },
    unlock(event) {
      if (closed || !event?.isTrusted || typeof create !== 'function') return false;
      try {
        if (!audio) {
          // Defer construction until the player's first action, not the title's cold load.
          audio = create({ buses: BUSES, pauseWhenHidden: true, onError() {} });
          unsubscribe = audio.mixer.subscribe(changed);
          changed(audio.mixer.state);
          // The new mixer's capture listener did not see the event that constructed it.
          // Resume that first gesture here; subsequent unlocking and visibility belong to the engine.
          if (audio.mixer.state === 'locked') {
            resuming = true;
            Promise.resolve(audio.context.resume()).catch(() => {}).finally(() => { resuming = false; });
          }
        }
        return graph.ready;
      } catch {
        resuming = false;
        return false;
      }
    },
    onRunning(listener) {
      runningListeners.add(listener);
      if (audio?.mixer.state === 'running') listener();
      return () => runningListeners.delete(listener);
    },
    createInput(bus, options) { return audio.createInput(bus, options); },
    load(url) {
      const key = String(url);
      if (!buffers.has(key)) {
        buffers.set(key, request(url).then(response => {
          if (!response.ok) throw new Error('Audio file unavailable');
          return response.arrayBuffer();
        }).then(bytes => audio.context.decodeAudioData(bytes)).catch(error => {
          buffers.delete(key);
          throw error;
        }));
      }
      return buffers.get(key);
    },
    dispose() {
      if (closed) return;
      closed = true;
      unsubscribe?.();
      runningListeners.clear();
      buffers.clear();
      audio?.dispose();
    },
  };
  return graph;
}


/** The old shared sublayer attenuation continues at its current level as a new input joins.
 * Native input strips perform the actual glide; only their shared target/initial value is kept here. */
export function createInputGroup(clips, bus, level, timeConstant) {
  let line;
  const inputs = new Set();
  const at = now => line ? line.to + (line.from - line.to) * Math.exp(-Math.max(0, now - line.at) / line.tau) : 0;
  return {
    add(options) {
      const now = clips.context.currentTime;
      line ??= { from: 0, to: level(), at: now, tau: timeConstant() };
      const input = clips.createInput(bus, { ...options, duck: at(now) });
      input.setDuck(line.to, { timeConstant: line.tau });
      inputs.add(input);
      return input;
    },
    refresh() {
      if (!clips.context || !line) return;
      const now = clips.context.currentTime;
      line = { from: at(now), to: level(), at: now, tau: timeConstant() };
      for (const input of inputs) input.setDuck(line.to, { timeConstant: line.tau });
    },
    remove(input) { inputs.delete(input); input.dispose(); },
  };
}
