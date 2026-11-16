import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAudio } from '../src/audio.mjs';

test('project audio plays one loop per bus and skips cues missed during mute or pause', async (t) => {
  const scheduled = [];
  const requests = [];
  let missing, delay;
  const param = () => ({ value: 0, cancelScheduledValues() {}, setTargetAtTime() {} });
  const node = () => ({ gain: param(), pan: param(), connect(target) { return target; }, disconnect() {} });
  let clock;
  class FakeAudioContext {
    constructor() {
      clock = this;
      this.state = 'running';
      this.currentTime = 0;
      this.destination = node();
    }
    createBufferSource() {
      return {
        ...node(),
        start(time, offset, duration) { scheduled.push({ time, offset, duration, loop: this.loop }); },
        stop() {}
      };
    }
    createGain() { return node(); }
    createStereoPanner() { return node(); }
    createDynamicsCompressor() {
      return { ...node(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() };
    }
    decodeAudioData(file) { return Promise.resolve({ duration: new DataView(file).getUint32(40, true) / 44100 }); }
  }
  t.mock.method(globalThis, 'fetch', async (url) => {
    const name = url.pathname.split('/').at(-1);
    requests.push(name);
    if (name === missing) return { ok: false };
    if (delay?.name === name) await delay.wait;
    const bytes = await readFile(url);
    return {
      ok: true,
      json: () => JSON.parse(bytes.toString()),
      arrayBuffer: () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    };
  });
  const originalWindow = globalThis.window;
  globalThis.window = { AudioContext: FakeAudioContext };
  t.after(() => {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  });

  const audio = createAudio();
  await audio.setMood('title');
  await audio.start();
  assert.ok(requests.indexOf('foley-intro.wav') < requests.indexOf('foley.wav'), 'the responsive cue bank precedes combat effects');
  assert.ok(!requests.includes('boss2.wav') && !requests.includes('end.wav'), 'later stages do not load on entry');
  await audio.setMood('boss1');
  assert.equal(scheduled.filter((item) => item.loop).length, 4, 'both music and ambience switch once');

  scheduled.length = 0;
  audio.setOn(false);
  clock.currentTime += 120;
  audio.play({ type: 'parry' });
  audio.update();
  assert.equal(scheduled.length, 0);
  await audio.setOn(true);
  audio.update();
  assert.equal(scheduled.length, 0, 'live loops require no catch-up scheduling');
  audio.play({ type: 'parry' });
  assert.equal(scheduled.length, 1);
  assert.ok(scheduled[0].time >= clock.currentTime);
  assert.ok(scheduled[0].duration > 0);

  scheduled.length = 0;
  audio.setPaused(true);
  audio.play({ type: 'strike', kind: 'lu', move: { name: 'fire' } });
  assert.equal(scheduled.length, 0);
  audio.setPaused(false);
  audio.playUi('open');
  assert.equal(scheduled.length, 1);
  await audio.setMood('boss2');
  assert.equal(scheduled.filter((item) => item.loop).length, 1, 'the boss music changes without restarting its ambience');

  scheduled.length = 0;
  for (let i = 0; i < 26; i++) audio.play({ type: 'spear', x: 0, z: 0 });
  assert.equal(scheduled.length, 1, 'a simultaneous rain of spears leaves space for the warning cue');
  audio.play({ type: 'windup', kind: 'lu', move: { unblockable: true } });
  assert.equal(scheduled.length, 2);

  scheduled.length = 0;
  missing = 'yard.wav';
  await audio.setMood('yard');
  assert.equal(scheduled.filter((item) => item.loop).length, 1, 'ambience can switch while the old music fills in');
  missing = undefined;
  await audio.setMood('yard');
  assert.equal(scheduled.filter((item) => item.loop).length, 2, 'a failed network request can recover on return');

  const next = Promise.withResolvers();
  delay = { name: 'road.wav', wait: next.promise };
  const fading = audio.setMood('road');
  await audio.setMood('boss2');
  const starts = scheduled.length;
  next.resolve();
  await fading;
  assert.equal(scheduled.length, starts, 'a late decode cannot replace the current scene');
});
