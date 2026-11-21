import { renderWavs } from './audio-synth.mjs';

self.addEventListener('message', ({ data: { phase } }) => {
  const tracks = renderWavs(phase);
  self.postMessage(tracks, Object.values(tracks).map((wav) => wav.buffer));
});
