import { clampVolume } from './soundtrack.mjs';

const AMBIENCE_KEY = 'wulin-ambience';
const WORLD_AUDIO = new URL('../../assets/audio/world/', import.meta.url);
const COURTYARD = new URL('courtyard.mp3', WORLD_AUDIO);
const STRIKES = ['sword', 'saber', 'fist', 'palm', 'kick', 'point', 'spear', 'staff', 'dart'];
const EFFECTS = [...STRIKES, 'hit', 'heal', 'miss'];
const STRIKE_LIMIT = 3;

/** Wind, bamboo and birds belong to the visible seat. Settings can be adjusted while it plays. */
export function createCourtyardAudio(storage, clips) {
  let on = true, volume = .36, ducked = false;
  let inSeat = false, hidden = globalThis.document?.hidden ?? false;
  let buffer, pending, active;
  try {
    const saved = JSON.parse(storage?.getItem(AMBIENCE_KEY) ?? 'null');
    if (typeof saved?.on === 'boolean') on = saved.on;
    if (Number.isFinite(saved?.volume)) volume = clampVolume(saved.volume);
  } catch {
    // Play with the defaults when settings storage is unavailable.
  }
  const enabled = () => clips.ready && on && volume > 0 && inSeat && !hidden;
  const level = () => volume * (ducked ? .38 : 1);

  function sync() {
    if (!enabled()) {
      if (!active) return;
      const { source, gain } = active;
      const now = clips.context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, .12);
      source.stop(now + .55);
      active = undefined;
      return;
    }
    if (active) return;
    if (!buffer) {
      pending ??= clips.load(COURTYARD).then(decoded => { buffer = decoded; }).catch(() => {}).finally(() => {
        pending = undefined;
        if (buffer) sync();
      });
      return;
    }
    const context = clips.context;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const now = context.currentTime;
    source.buffer = buffer;
    source.loop = true;
    gain.gain.setValueAtTime(0, now);
    gain.gain.setTargetAtTime(level(), now, .20);
    source.connect(gain).connect(context.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    active = { source, gain };
    source.start();
  }

  function mix() {
    if (!active) return;
    const now = clips.context.currentTime;
    active.gain.gain.cancelScheduledValues(now);
    active.gain.gain.setTargetAtTime(level(), now, .075);
  }

  return {
    get on() { return on; },
    get volume() { return volume; },
    set(change) {
      if (typeof change.on === 'boolean') on = change.on;
      if (Number.isFinite(change.volume)) volume = clampVolume(change.volume);
      try { storage?.setItem(AMBIENCE_KEY, JSON.stringify({ on, volume })); } catch {}
      sync();
      mix();
    },
    select(seat) { inSeat = seat; sync(); },
    setHidden(value) { hidden = value; sync(); },
    duck(value) { ducked = value; mix(); },
  };
}

/** Three weapon voices and a reserved hit voice. A faster battle never queues extra audio. */
export function createCombatAudio(clips, settings) {
  let engaged = false;
  let hidden = globalThis.document?.hidden ?? false;
  let ducked = false;
  let bus;
  const buffers = new Map();
  const active = new Set();
  const lastCue = new Map();
  let hitActive = false;
  let loaded = false;

  function mix() {
    if (!bus) return;
    const now = clips.context.currentTime;
    const gain = bus.gain;
    gain.cancelScheduledValues(now);
    const level = settings.on && !hidden ? settings.volume * .46 : 0;
    gain.setTargetAtTime(level * (ducked ? .20 : 1), now, ducked ? .025 : .10);
  }

  function prepare() {
    if (!clips.ready || loaded || !settings.on) return;
    loaded = true;
    for (const cue of EFFECTS) {
      void clips.load(new URL(cue + '.mp3', WORLD_AUDIO)).then(buffer => buffers.set(cue, buffer), () => { loaded = false; });
    }
  }

  function silence() {
    if (!active.size) return;
    const now = clips.context.currentTime;
    for (const voice of active) {
      if (voice.stopping) continue;
      voice.stopping = true;
      const { source, gain } = voice;
      gain.gain.setTargetAtTime(0, now, .008);
      source.stop(now + .04);
    }
  }

  function emit(cue, pan, level, delay = 0) {
    const buffer = buffers.get(cue);
    if (!buffer) return;
    const context = clips.context;
    const now = context.currentTime;
    if (now - (lastCue.get(cue) ?? -Infinity) < (cue === 'hit' ? .12 : .095)) return;
    // Keep room for one material impact when a whole line attacks on the same frame.
    const hit = cue === 'hit';
    if (hit ? hitActive : active.size - Number(hitActive) >= STRIKE_LIMIT) return;
    if (!bus) {
      bus = context.createGain();
      bus.gain.value = 0;
      bus.connect(context.destination);
      mix();
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    const spatial = context.createStereoPanner?.();
    source.buffer = buffer;
    gain.gain.value = level;
    source.connect(gain);
    if (spatial) {
      spatial.pan.value = pan;
      gain.connect(spatial).connect(bus);
    } else gain.connect(bus);
    const voice = { source, gain, stopping: false };
    if (hit) hitActive = true;
    active.add(voice);
    source.onended = () => {
      active.delete(voice);
      if (hit) hitActive = false;
      source.disconnect();
      gain.disconnect();
      spatial?.disconnect();
    };
    source.start(now + delay);
    lastCue.set(cue, now);
  }

  return {
    prepare,
    setEngaged(value) {
      if (engaged === value) return;
      engaged = value;
      if (value) prepare();
      else {
        silence();
        lastCue.clear();
      }
    },
    setHidden(value) { hidden = value; mix(); if (hidden) silence(); },
    settingsChanged() { mix(); if (!settings.on || !settings.volume) silence(); else if (engaged) prepare(); },
    duck(value) { ducked = value; mix(); },
    silence,
    contact({ type, klass, x, critical }) {
      if (!engaged || hidden || !settings.on || !settings.volume || clips.context?.state !== 'running') return;
      const pan = Math.max(-.46, Math.min(.46, x / 29));
      if (type === 'miss' || type === 'heal') {
        emit(type, pan, type === 'miss' ? .38 : .58);
      } else {
        emit(STRIKES.includes(klass) ? klass : 'fist', pan, critical ? .88 : .72);
        emit('hit', pan, critical ? .65 : .46, .055);
      }
    },
  };
}
