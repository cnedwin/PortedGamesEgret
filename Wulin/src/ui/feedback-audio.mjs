const KEY = 'wulin-feedback-audio';
const DEFAULT_VOLUME = 0.55;

// Frequency ratio, level and decay of each partial. The uneven spacing in
// the wood and bell makes their attacks distinct from the plucked string.
const WOOD = [[1, 1, 1], [1.61, .33, .58], [2.74, .21, .32]];
const STRING = [[1, 1, 1], [2, .27, .64], [3.01, .17, .37], [4.03, .07, .25]];
const BRONZE = [[1, 1, 1], [2.02, .28, .74], [2.76, .16, .52], [4.08, .06, .33]];

// Notes are [timbre, Hz, delay, decay, level]. A brushed attack is
// [center Hz, Q, delay, decay, level]. All times are in seconds.
const CUES = Object.freeze({
  nav:     { priority: 0, gap: .09, notes: [[WOOD, 289, 0, .071, .096]], brush: [980, .8, 0, .038, .072] },
  pick:    { priority: 0, gap: .09, notes: [[STRING, 466, .011, .136, .086]], brush: [2050, .63, 0, .071, .115] },
  confirm: { priority: 1, gap: .20, notes: [[WOOD, 245, 0, .081, .09], [STRING, 349, .029, .172, .110], [BRONZE, 523, .074, .33, .118]], brush: [1120, 1.1, 0, .041, .055] },
  reject:  { priority: 1, gap: .20, notes: [[WOOD, 231, 0, .093, .112], [WOOD, 155, .074, .159, .106]], brush: [660, 1, .065, .057, .072] },
  notice:  { priority: 1, gap: .26, notes: [[BRONZE, 440, 0, .31, .109], [BRONZE, 659, .083, .41, .086]] },
  victory: { priority: 2, gap: .52, notes: [[WOOD, 147, 0, .133, .118], [STRING, 294, .029, .24, .107], [STRING, 392, .132, .27, .105], [BRONZE, 587, .232, .56, .135]], brush: [1300, .77, .207, .091, .067] },
  defeat:  { priority: 2, gap: .52, notes: [[STRING, 349, 0, .202, .091], [WOOD, 220, .125, .215, .107], [BRONZE, 147, .229, .49, .111]] },
});

const limitVolume = value => Math.max(0, Math.min(1, value));

function connectStrike(context, master, source, start, duration, level, attack) {
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(.0001, start);
  envelope.gain.exponentialRampToValueAtTime(level, start + attack);
  envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
  envelope.connect(master);
  source.connect(envelope);
  return envelope;
}

function createBrush(context) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .12), context.sampleRate);
  const samples = buffer.getChannelData(0);
  let random = 1163;
  for (let i = 0; i < samples.length; i++) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    samples[i] = random / 2147483648 - 1;
  }
  return buffer;
}

export function createFeedbackAudio(storage, Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext) {
  let on = true;
  let volume = DEFAULT_VOLUME;
  try {
    const saved = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (typeof saved?.on === 'boolean') on = saved.on;
    if (Number.isFinite(saved?.volume)) volume = limitVolume(saved.volume);
  } catch {
    // Unavailable storage leaves the default sound setting in effect.
  }

  let context, master, resuming, brushBuffer;
  let last = { at: -Infinity, priority: -1, gap: 0 };

  function applyVolume() {
    if (!master) return;
    const gain = master.gain;
    const now = context.currentTime;
    if (typeof gain.setTargetAtTime === 'function' && now > 0) {
      gain.cancelScheduledValues(now);
      gain.setTargetAtTime(on ? volume : 0, now, .009);
    } else gain.setValueAtTime(on ? volume : 0, now);
  }

  return {
    get on() { return on; },
    get volume() { return volume; },
    set(change) {
      if (typeof change.on === 'boolean') on = change.on;
      if (Number.isFinite(change.volume)) volume = limitVolume(change.volume);
      applyVolume();
      try {
        storage?.setItem(KEY, JSON.stringify({ on, volume }));
      } catch {
        // Preferences can still be changed for this session.
      }
    },
    unlock(event) {
      if (!event?.isTrusted || typeof Audio !== 'function') return false;
      try {
        if (!context) {
          context = new Audio();
          master = context.createGain();
          master.connect(context.destination);
          applyVolume();
        }
        if (context.state !== 'running' && !resuming) {
          resuming = context.resume().catch(() => {}).finally(() => { resuming = undefined; });
        }
        return context.state === 'running' || !!resuming;
      } catch {
        return false;
      }
    },
    play(cue, { preview = false } = {}) {
      const sound = Object.hasOwn(CUES, cue) && CUES[cue];
      if (!on || !volume || !sound || !context || !master || (context.state !== 'running' && !resuming)) return false;
      const now = context.currentTime;
      // A result can follow a selection immediately, but repeated actions and notices stay quiet.
      if (!preview && now - last.at < last.gap && sound.priority <= last.priority) return false;
      last = { at: now, priority: sound.priority, gap: sound.gap };

      for (const [timbre, frequency, delay, decay, level] of sound.notes) {
        const start = now + delay + .007;
        for (const [ratio, strength, life] of timbre) {
          const note = context.createOscillator();
          const duration = decay * life;
          note.frequency.setValueAtTime(frequency * ratio, start);
          const envelope = connectStrike(context, master, note, start, duration, level * strength, ratio === 1 ? .006 : .003);
          note.onended = () => { note.disconnect(); envelope.disconnect(); };
          note.start(start);
          note.stop(start + duration + .004);
        }
      }
      if (sound.brush && context.createBufferSource && context.createBiquadFilter) {
        const [frequency, q, delay, duration, level] = sound.brush;
        const start = now + delay + .007;
        const source = context.createBufferSource();
        source.buffer = brushBuffer ??= createBrush(context);
        const filter = context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = frequency;
        filter.Q.value = q;
        source.connect(filter);
        const envelope = connectStrike(context, master, filter, start, duration, level, .003);
        source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
        source.start(start);
        source.stop(start + duration + .005);
      }
      return true;
    },
  };
}
