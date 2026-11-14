// Short pentatonic cues, synthesized on demand so no audio asset is fetched.
const KEY = 'wulin-feedback-audio';
const DEFAULT_VOLUME = 0.55;

// Each note is [frequency, delay, duration, level, oscillator type].
const CUES = Object.freeze({
  nav:     { priority: 0, gap: .09, notes: [[196, 0, .072, .15, 'triangle'], [402, 0, .024, .035]] },
  pick:    { priority: 0, gap: .09, notes: [[392, 0, .095, .14, 'triangle'], [784, 0, .038, .045]] },
  confirm: { priority: 1, gap: .20, notes: [[294, 0, .14, .15, 'triangle'], [440, .04, .23, .13], [880, .04, .075, .04]] },
  reject:  { priority: 1, gap: .20, notes: [[220, 0, .095, .16, 'triangle'], [147, .065, .16, .13, 'triangle']] },
  notice:  { priority: 1, gap: .26, notes: [[440, 0, .20, .12], [587, .07, .27, .10], [1174, .07, .095, .026]] },
  victory: { priority: 2, gap: .50, notes: [[294, 0, .23, .13, 'triangle'], [392, .072, .25, .12], [587, .156, .42, .15], [1174, .156, .135, .04]] },
  defeat:  { priority: 2, gap: .50, notes: [[392, 0, .19, .11], [294, .085, .25, .12], [196, .19, .35, .13, 'triangle']] },
});

const limitVolume = value => Math.max(0, Math.min(1, value));

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

  let context, master, resuming;
  let last = { at: -Infinity, priority: -1, gap: 0 };

  function applyVolume() {
    master?.gain.setValueAtTime(on ? volume : 0, context.currentTime);
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

      for (const [frequency, delay, duration, level, type = 'sine'] of sound.notes) {
        const start = now + delay + .006;
        const envelope = context.createGain();
        envelope.gain.setValueAtTime(.0001, start);
        envelope.gain.exponentialRampToValueAtTime(level, start + .009);
        envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
        envelope.connect(master);

        const note = context.createOscillator();
        note.type = type;
        note.frequency.setValueAtTime(frequency, start);
        note.connect(envelope);
        note.onended = () => {
          note.disconnect();
          envelope.disconnect();
        };
        note.start(start);
        note.stop(start + duration + .008);
      }
      return true;
    },
  };
}
