import { createInputGroup } from './audio-graph.mjs';

const DIRECTORY = new URL('../../assets/audio/world/', import.meta.url);
// Ranges are in each scene's world units. The bell carries farther than the work yards.
const VOICES = {
  drill: { reach: 80, level: .76 },
  forge: { reach: 72, level: .69 },
  bell: { reach: 106, level: .68 },
  river: { reach: 128, level: .68 },
  caravan: { reach: 96, level: .76 },
};

export function spatialPlacement(source, orbit) {
  const { reach, level } = VOICES[source.kind];
  const [x, y, z] = orbit.target;
  const dx = source.x - x;
  const dz = source.z - z;
  // The camera is an overhead view. Blend ground focus and camera zoom into an acoustic distance.
  const distance = Math.hypot(dx, dz, (source.y - y) * .5, orbit.distance * .48);
  const proximity = Math.max(0, 1 - distance / reach);
  const side = dx * Math.cos(orbit.yaw) - dz * Math.sin(orbit.yaw);
  const pan = Math.max(-.85, Math.min(.85, side / (Math.max(7, orbit.distance * .48) + Math.hypot(dx, dz) * .25)));
  return {
    pan,
    gain: (source.activity ?? 1) * level * proximity * proximity * (3 - 2 * proximity),
    cutoff: 650 + 5650 * proximity,
  };
}

/** Play the visible landmarks over the scene bed, with their own narration duck. */
export function createSpatialAudio(clips, settings) {
  const voices = new Map();
  const pending = new Map();
  const retryAfter = new Map();
  let scene, ducked = false, hidden = globalThis.document?.hidden ?? false;

  const enabled = () => !!scene && clips.ready && settings.on && settings.volume > 0 && !hidden;
  const mixLevel = () => enabled() ? settings.volume * .72 * (ducked ? .30 : 1) : 0;
  const group = createInputGroup(clips, 'ambience', mixLevel, () => ducked ? .025 : .12);
  const mix = () => group.refresh();

  function stop(kind, immediate = false) {
    pending.delete(kind);
    const voice = voices.get(kind);
    if (!voice || (voice.stopping && !immediate)) return;
    voice.stopping = true;
    const now = clips.context.currentTime;
    if (!immediate) voice.input.setVolume(0, { timeConstant: .055 });
    try { voice.source.stop(now + (immediate ? 0 : .24)); } catch {}
  }

  function updateVoice(voice, { gain, pan, cutoff }) {
    voice.input.setVolume(gain, { timeConstant: .085 });
    voice.input.setLowpass?.(cutoff, { timeConstant: .12 });
    voice.input.setPan?.(pan, { timeConstant: .075 });
  }

  function play(kind, placement) {
    const existing = voices.get(kind);
    if (existing) {
      if (!existing.stopping) updateVoice(existing, placement);
      return;
    }
    const context = clips.context;
    const request = pending.get(kind);
    if (request) {
      request.placement = placement;
      return;
    }
    if (placement.gain <= .003 || context.currentTime < (retryAfter.get(kind) ?? 0)) return;
    const next = { placement };
    pending.set(kind, next);
    void clips.load(new URL('spatial-' + kind + '.mp3', DIRECTORY)).then(buffer => {
      if (pending.get(kind) !== next || !enabled() || next.placement.gain <= .003) return;
      const source = context.createBufferSource();
      const { cutoff, pan } = next.placement;
      const input = group.add({ volume: 0, lowpass: cutoff, pan });
      source.buffer = buffer;
      source.loop = true;
      source.connect(input.input);
      const voice = { source, input, stopping: false };
      voices.set(kind, voice);
      source.onended = () => {
        if (voices.get(kind) === voice) voices.delete(kind);
        source.disconnect();
        group.remove(input);
      };
      updateVoice(voice, next.placement);
      source.start();
    }).catch(() => {
      if (pending.get(kind) === next) retryAfter.set(kind, context.currentTime + 2);
    }).finally(() => {
      if (pending.get(kind) === next) pending.delete(kind);
    });
  }

  function clear(immediate = false) {
    pending.clear();
    for (const kind of voices.keys()) stop(kind, immediate);
  }

  return {
    select(next) {
      if (scene === next) return;
      clear();
      scene = next;
      mix();
    },
    update(orbit) {
      if (!enabled()) return;
      const sources = scene.soundSources();
      const kinds = new Set(sources.map(source => source.kind));
      for (const kind of voices.keys()) if (!kinds.has(kind)) stop(kind);
      for (const kind of pending.keys()) if (!kinds.has(kind)) stop(kind);
      for (const source of sources) play(source.kind, spatialPlacement(source, orbit));
    },
    refresh() { mix(); },
    settingsChanged() { if (!enabled()) clear(); mix(); },
    setHidden(value) { hidden = value; if (hidden) clear(true); mix(); },
    duck(value) { ducked = value; mix(); },
  };
}
