import { clampVolume } from './soundtrack.mjs';

const AMBIENCE_KEY = 'wulin-ambience';
const WORLD_AUDIO = new URL('../../assets/audio/world/', import.meta.url);
const LOOP_LEVELS = {
  courtyard: 1, 'courtyard-dusk': .94, 'courtyard-night': .90, realm: .94, march: 1,
};
const STRIKES = ['sword', 'saber', 'fist', 'palm', 'kick', 'point', 'spear', 'staff', 'dart'];
const EFFECTS = [...STRIKES, 'hit', 'heal', 'miss'];
const STRIKE_LIMIT = 3;
// These offsets skip the quiet lead-in of the decoded samples. Attack character stays in the clip.
const ATTACK_OFFSET = {
  sword: .024, saber: .028, fist: .017, palm: .056, kick: .019, point: .007,
  spear: .022, staff: .028, dart: .017, hit: 0, heal: .043, miss: .028,
};
const HIT_TAIL = .16;

/** Match the seat's visual clock, including the twilight before sunrise. */
export function courtyardTrack(hour) {
  if (hour < 5.1 || hour >= 19.4) return 'courtyard-night';
  if (hour < 6.8 || hour >= 17) return 'courtyard-dusk';
  return 'courtyard';
}

function createLoopLayer(clips, fadeSeconds, getLevel) {
  let wanted, pending, playing, retiring;
  let retryAfter = 0;

  function retire() {
    if (!playing) return;
    const now = clips.context.currentTime;
    if (retiring) retiring.source.stop(now);
    const { source, gain } = playing;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0, now, fadeSeconds / 4);
    source.stop(now + fadeSeconds);
    retiring = playing;
    playing = undefined;
  }

  function select(track) {
    if (wanted !== track) retryAfter = 0;
    wanted = track;
    if (!track) {
      pending = undefined;
      retire();
      return;
    }
    if (playing?.track === track || pending?.track === track || clips.context.currentTime < retryAfter) return;
    const request = { track };
    pending = request;
    void clips.load(new URL(track + '.mp3', WORLD_AUDIO)).then(buffer => {
      if (request !== pending || wanted !== track) return;
      const context = clips.context;
      const source = context.createBufferSource();
      const gain = context.createGain();
      const now = context.currentTime;
      source.buffer = buffer;
      source.loop = true;
      gain.gain.setValueAtTime(0, now);
      gain.gain.setTargetAtTime(getLevel(track), now, fadeSeconds / 4);
      source.connect(gain).connect(context.destination);
      retire();
      const entry = { source, gain, track };
      playing = entry;
      source.onended = () => {
        if (retiring === entry) retiring = undefined;
        source.disconnect();
        gain.disconnect();
      };
      source.start();
    }).catch(() => {
      if (pending === request) retryAfter = clips.context.currentTime + 2;
    }).finally(() => {
      if (pending === request) pending = undefined;
    });
  }

  function mix() {
    const now = clips.context.currentTime;
    if (playing) {
      playing.gain.gain.cancelScheduledValues(now);
      playing.gain.gain.setTargetAtTime(getLevel(playing.track), now, .075);
    }
    if (retiring) {
      const param = retiring.gain.gain;
      param.cancelScheduledValues(now);
      param.setTargetAtTime(Math.min(param.value, getLevel(retiring.track)), now, .025);
      param.setTargetAtTime(0, now + .035, fadeSeconds / 4);
    }
  }

  return { select, mix };
}

/** Keep scene beds separate from the short march overlay and from the combat mixer. */
export function createWorldAmbience(storage, clips) {
  let on = true, volume = .36, ducked = false;
  let sceneTrack, marching = false, hidden = globalThis.document?.hidden ?? false;
  let marchWarm;
  try {
    const saved = JSON.parse(storage?.getItem(AMBIENCE_KEY) ?? 'null');
    if (typeof saved?.on === 'boolean') on = saved.on;
    if (Number.isFinite(saved?.volume)) volume = clampVolume(saved.volume);
  } catch {
    // Play with the defaults when settings storage is unavailable.
  }
  const sceneLayer = createLoopLayer(clips, .85, track => volume * LOOP_LEVELS[track] * (ducked ? .38 : 1));
  const marchLayer = createLoopLayer(clips, .23, track => volume * LOOP_LEVELS[track] * (ducked ? .25 : 1));

  function sync() {
    const enabled = clips.ready && on && volume > 0 && !hidden;
    sceneLayer.select(enabled ? sceneTrack : undefined);
    marchLayer.select(enabled && sceneTrack === 'realm' && marching ? 'march' : undefined);
    if (enabled && sceneTrack === 'realm' && !marchWarm) {
      marchWarm = clips.load(new URL('march.mp3', WORLD_AUDIO)).catch(() => { marchWarm = undefined; });
    }
  }

  function mix() {
    if (!clips.context) return;
    sceneLayer.mix();
    marchLayer.mix();
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
    select(track, march = false) { sceneTrack = track; marching = march; sync(); },
    setHidden(value) { hidden = value; sync(); },
    duck(value) { ducked = value; mix(); },
  };
}

/** Three strike voices and one reserved impact voice. A faster battle never queues extra audio. */
export function createCombatAudio(clips, settings) {
  let engaged = false;
  let hidden = globalThis.document?.hidden ?? false;
  let ducked = false;
  let bus;
  const buffers = new Map();
  const active = new Set();
  const lastCue = new Map();
  let hitActive = false;
  let detailActive = false;
  let loaded = false;

  function mix() {
    if (!bus) return;
    const now = clips.context.currentTime;
    const gain = bus.gain;
    gain.cancelScheduledValues(now);
    const level = settings.on && !hidden ? settings.volume * .54 : 0;
    gain.setTargetAtTime(level * (ducked ? .22 : 1), now, ducked ? .015 : .10);
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
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, .008);
      source.stop(now + .04);
    }
  }

  function emit(cue, pan, level) {
    const buffer = buffers.get(cue);
    if (!buffer) return;
    const context = clips.context;
    const now = context.currentTime;
    if (now - (lastCue.get(cue) ?? -Infinity) < .095) return;
    // Keep room for one material impact when a whole line attacks on the same frame.
    const hit = cue === 'hit';
    const detail = cue === 'miss' || cue === 'heal';
    const strikes = active.size - Number(hitActive);
    if (hit ? hitActive : strikes >= STRIKE_LIMIT || (detail && (detailActive || strikes >= STRIKE_LIMIT - 1))) return;
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
    // A short ramp avoids a click when starting from a nonzero sample.
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + .004);
    if (hit) {
      gain.gain.setValueAtTime(level, now + HIT_TAIL - .04);
      gain.gain.linearRampToValueAtTime(0, now + HIT_TAIL);
    }
    source.connect(gain);
    if (spatial) {
      spatial.pan.value = pan;
      gain.connect(spatial).connect(bus);
    } else gain.connect(bus);
    const voice = { source, gain, stopping: false };
    if (hit) hitActive = true;
    if (detail) detailActive = true;
    active.add(voice);
    source.onended = () => {
      active.delete(voice);
      if (hit) hitActive = false;
      if (detail) detailActive = false;
      source.disconnect();
      gain.disconnect();
      spatial?.disconnect();
    };
    const offset = Math.min(ATTACK_OFFSET[cue], Math.max(0, buffer.duration - .01));
    if (hit) source.start(now, offset, HIT_TAIL);
    else source.start(now, offset);
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
        const strike = STRIKES.includes(klass) ? klass : 'fist';
        const level = strike === 'dart' || strike === 'point' ? 1.22 : 1;
        emit(strike, pan, level * (critical ? .88 : .72));
        emit('hit', pan, critical ? .65 : .46);
      }
    },
  };
}
