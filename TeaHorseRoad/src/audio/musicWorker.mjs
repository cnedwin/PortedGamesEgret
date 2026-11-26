import { tune } from './synth.mjs';

// Rebuild the original loops off the gameplay thread and transfer each PCM buffer.
const scores = [
  { bars: 16, tempo: 84, seed: 3, mood: 0 },
  { bars: 8, tempo: 112, seed: 9, mood: 1 }
];
for (const score of scores) {
  const samples = tune(score);
  self.postMessage({ mood: score.mood, samples }, [samples.buffer]);
}
self.close();
