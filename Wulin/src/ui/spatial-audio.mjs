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
  let scene, bus, ducked = false, hidden = globalThis.document?.hidden ?? false;

  const enabled = () => !!scene && clips.ready && settings.on && settings.volume > 0 && !hidden;
  function mix() {
    if (!bus) return;
    const now = clips.context.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(enabled() ? settings.volume * .72 * (ducked ? .30 : 1) : 0, now, ducked ? .025 : .12);
  }

  function stop(kind) {
    pending.delete(kind);
    const voice = voices.get(kind);
    if (!voice || voice.stopping) return;
    voice.stopping = true;
    const now = clips.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, .055);
    voice.source.stop(now + .24);
  }

  function updateVoice(voice, { gain, pan, cutoff }) {
    const now = clips.context.currentTime;
    voice.gain.gain.setTargetAtTime(gain, now, .085);
    voice.filter.frequency.setTargetAtTime(cutoff, now, .12);
    voice.panner?.pan.setTargetAtTime(pan, now, .075);
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
      if (!bus) {
        bus = context.createGain();
        bus.gain.value = 0;
        bus.connect(context.destination);
        mix();
      }
      const source = context.createBufferSource();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const panner = context.createStereoPanner?.();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0;
      filter.type = 'lowpass';
      filter.frequency.value = next.placement.cutoff;
      source.connect(filter).connect(gain);
      if (panner) {
        panner.pan.value = next.placement.pan;
        gain.connect(panner).connect(bus);
      } else gain.connect(bus);
      const voice = { source, gain, filter, panner, stopping: false };
      voices.set(kind, voice);
      source.onended = () => {
        if (voices.get(kind) === voice) voices.delete(kind);
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
        panner?.disconnect();
      };
      updateVoice(voice, next.placement);
      source.start();
    }).catch(() => {
      if (pending.get(kind) === next) retryAfter.set(kind, context.currentTime + 2);
    }).finally(() => {
      if (pending.get(kind) === next) pending.delete(kind);
    });
  }

  function clear() {
    pending.clear();
    for (const kind of voices.keys()) stop(kind);
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
    settingsChanged() { if (!enabled()) clear(); mix(); },
    setHidden(value) { hidden = value; if (hidden) clear(); mix(); },
    duck(value) { ducked = value; mix(); },
  };
}
