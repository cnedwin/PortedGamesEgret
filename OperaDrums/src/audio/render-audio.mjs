// The expensive score render runs off the render thread. Transfer the samples instead of cloning them.
import { backingOf, effectsOf } from './synth.mjs';

self.addEventListener('message', ({ data: { song } }) => {
  const samples = song ? { score: backingOf(song).samples } : effectsOf();
  self.postMessage(samples, Object.values(samples).map((channel) => channel.buffer));
});
