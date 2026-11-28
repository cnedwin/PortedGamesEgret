const KEY = 'wulin-music';
const TRACKS = {
  title: new URL('../../assets/audio/music/title.mp3', import.meta.url),
  explore: new URL('../../assets/audio/music/explore.mp3', import.meta.url),
  battle: new URL('../../assets/audio/music/battle.mp3', import.meta.url),
};

export const clampVolume = (value) => Math.max(0, Math.min(1, value));

export function createSoundtrack(storage, clips) {
  let on = true;
  let volume = .42;
  try {
    const saved = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (typeof saved?.on === 'boolean') on = saved.on;
    if (Number.isFinite(saved?.volume)) volume = clampVolume(saved.volume);
  } catch {
    // Settings remain available for the current visit.
  }
  let track = 'title';
  let ducked = false;
  let hidden = globalThis.document?.hidden ?? false;
  let current, bus, pending;
  const active = new Set();
  let revision = 0;

  function fadeOut(old, seconds) {
    const now = clips.context.currentTime;
    if (seconds === 0) { old.source.stop(now); return; }
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setTargetAtTime(0, now, seconds / 4);
    old.source.stop(now + seconds);
  }

  function applyVolume() {
    if (!bus) return;
    bus.setVolume(on && !hidden ? volume : 0, { timeConstant: .12 });
    bus.setDuck(ducked ? .38 : 1, { timeConstant: .12 });
  }

  async function sync() {
    if (!on || hidden || volume === 0) {
      revision++;
      pending = null;
      if (current) fadeOut(current, hidden ? 0 : .24);
      current = null;
      return;
    }
    if (!clips.ready) return;
    if (current?.track === track) {
      if (pending) revision++;
      pending = null;
      return;
    }
    if (pending === track) return;
    pending = track;
    const request = ++revision;
    try {
      const buffer = await clips.load(TRACKS[track]);
      if (request !== revision) return;
      const context = clips.context;
      if (!bus) {
        bus = clips.createInput('music', { volume: 0, duck: ducked ? .38 : 1 });
        applyVolume();
      }
      const source = context.createBufferSource();
      const gain = context.createGain();
      const now = context.currentTime;
      source.buffer = buffer;
      source.loop = true;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + .85);
      source.connect(gain).connect(bus.input);
      active.add(source);
      source.onended = () => { active.delete(source); source.disconnect(); gain.disconnect(); };
      source.start();
      if (current) fadeOut(current, .85);
      current = { source, gain, track };
    } catch {
      // A missing or interrupted track cannot prevent the game from running.
    } finally {
      if (request === revision) pending = null;
    }
  }

  return {
    get on() { return on; },
    get unlocked() { return clips.ready; },
    get volume() { return volume; },
    set(change) {
      if (typeof change.on === 'boolean') on = change.on;
      if (Number.isFinite(change.volume)) volume = clampVolume(change.volume);
      try { storage?.setItem(KEY, JSON.stringify({ on, volume })); } catch {}
      applyVolume();
      sync();
    },
    select(next) {
      if (next === track) return;
      track = next;
      sync();
    },
    unlock(event) {
      if (clips.unlock(event)) void sync();
    },
    refresh() { void sync(); },
    duck(active) {
      ducked = active;
      applyVolume();
    },
    setHidden(value) {
      hidden = value;
      if (hidden && clips.context) {
        for (const source of active) try { source.stop(clips.context.currentTime); } catch {}
        current = null;
      }
      applyVolume();
      sync();
    },
  };
}
