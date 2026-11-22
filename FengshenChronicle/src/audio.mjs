const cues = {
  attack: [[175, 76, .12, .035, 'triangle']],
  hit: [[126, 64, .10, .044, 'triangle']],
  pickup: [[523, 660, .13, .034, 'sine']],
  equip: [[311, 466, .15, .036, 'triangle']],
  quest: [[392, 587, .28, .042, 'sine']],
  artifactCast: [[293, 720, .28, .058, 'triangle'], [702, 1053, .32, .025, 'sine']],
  artifactHit: [[262, 92, .21, .071, 'triangle']],
  heal: [[440, 698, .24, .032, 'sine']],
  death: [[392, 98, .42, .045, 'triangle']],
  victory: [[330, 330, .48, .035, 'sine'], [495, 495, .55, .032, 'sine'], [660, 880, .64, .029, 'sine']]
};

export function createSound() {
  let context, muted = false;
  const last = new Map();
  return {
    unlock() {
      if (muted || !globalThis.AudioContext) return;
      try {
        context ??= new AudioContext();
        if (context.state === 'suspended') context.resume().catch(() => {});
      } catch { /* Muting remains available on devices without Web Audio. */ }
    },
    setMute(value) {
      muted = value;
      if (muted && context?.state === 'running') context.suspend().catch(() => {});
    },
    play(type) {
      const notes = cues[type];
      if (muted || !notes || context?.state !== 'running') return;
      const start = context.currentTime;
      if (start - (last.get(type) ?? -1) < .085) return;
      last.set(type, start);
      for (const [f1, f2, length, volume, shape] of notes) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = shape;
        oscillator.frequency.setValueAtTime(f1, start);
        oscillator.frequency.exponentialRampToValueAtTime(f2, start + length);
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + .017);
        gain.gain.exponentialRampToValueAtTime(.0001, start + length);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start); oscillator.stop(start + length);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      }
    }
  };
}
