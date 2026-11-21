import { effectSamples, loopOf } from './audio-synth.mjs';

self.addEventListener('message', ({ data: { phase } }) => {
  const made = phase ? { track: loopOf(phase) } : effectSamples();
  self.postMessage(made, Object.values(made).map((samples) => samples.buffer));
});
