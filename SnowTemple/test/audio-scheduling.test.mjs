import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/audio.mjs';

test('music resumes at the present after muting or a stalled browser clock', (t) => {
  const scheduled = [];
  const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} });
  const node = () => ({
    frequency: param(), gain: param(), Q: param(), connect(target) { return target; },
    start() {}, stop() {}
  });
  let clock;
  class FakeAudioContext {
    constructor() {
      clock = this;
      this.currentTime = 0;
      this.sampleRate = 100;
      this.destination = node();
    }
    createGain() { return node(); }
    createDynamicsCompressor() { return node(); }
    createBuffer(channels, size) { return { getChannelData: () => new Float32Array(size) }; }
    createBufferSource() { return node(); }
    createBiquadFilter() { return node(); }
    createOscillator() {
      return { ...node(), start(time) { if (time !== undefined) scheduled.push(time); } };
    }
  }
  const originalWindow = globalThis.window;
  globalThis.window = { AudioContext: FakeAudioContext };
  t.after(() => {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  });

  const audio = createAudio();
  audio.start();
  audio.setMood('boss');
  audio.setOn(false);
  clock.currentTime += 120;
  audio.update();
  assert.equal(scheduled.length, 0);
  audio.setOn(true);
  audio.update();
  assert.ok(scheduled.length > 0 && scheduled.length <= 4, 'schedule at most the upcoming beat');
  assert.ok(scheduled.every((time) => time >= clock.currentTime));

  scheduled.length = 0;
  clock.currentTime += 30;
  audio.update();
  assert.ok(scheduled.length > 0 && scheduled.length <= 4, 'skip missed beats after an inactive tab');
  assert.ok(scheduled.every((time) => time >= clock.currentTime));

  scheduled.length = 0;
  audio.setOn(false);
  audio.gong();
  assert.equal(scheduled.length, 0);
});
