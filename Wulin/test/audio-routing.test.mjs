import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundtrack } from '../src/ui/soundtrack.mjs';
import { createFeedbackAudio } from '../src/ui/feedback-audio.mjs';
import { createSpatialAudio, spatialPlacement } from '../src/ui/spatial-audio.mjs';
import { createCombatAudio } from '../src/ui/world-audio.mjs';
import { createVoice } from '../src/ui/voice.mjs';

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function rig() {
  const sources = [], inputs = [], connections = [];
  const param = () => ({ value: 0, cancelScheduledValues() {}, setValueAtTime(value) { this.value = value; }, setTargetAtTime(value) { this.target = value; }, linearRampToValueAtTime(value) { this.target = value; }, exponentialRampToValueAtTime(value) { this.target = value; } });
  const node = (kind, props = {}) => ({ kind, ...props, connect(to) { assert.ok(to); connections.push([this, to]); return to; }, disconnect() {} });
  const source = kind => node(kind, { frequency: param(), starts: [], stops: [], start(...args){this.starts.push(args);sources.push(this);}, stop(...args){this.stops.push(args);} });
  const context = {
    currentTime: 10, state: 'running', sampleRate: 44100,
    createGain: () => node('gain', { gain: param() }),
    createBufferSource: () => source('buffer'), createOscillator: () => source('oscillator'),
    createStereoPanner: () => node('panner', { pan: param() }),
    createBiquadFilter: () => node('filter', { frequency: param(), Q: param() }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(10) }),
  };
  const clips = {
    ready: true, context,
    unlock: () => true,
    load: async url => ({ file: url.pathname.split('/').at(-1), duration: 2 }),
    createInput(bus, options = {}) {
      const track = { bus, options, input: node('input'), calls: [], setVolume(...args) { this.calls.push(['volume', ...args]); }, setDuck(...args) { this.calls.push(['duck', ...args]); }, setPan(...args) { this.calls.push(['pan', ...args]); }, setLowpass(...args) { this.calls.push(['lowpass', ...args]); }, dispose() { this.disposed=true; } };
      inputs.push(track); return track;
    },
  };
  return { clips, sources, inputs, connections, context };
}

test('music retains crossfade and native named route; hide removes both current and retiring sources', async () => {
  const r = rig(), music = createSoundtrack(null, r.clips);
  music.unlock({ isTrusted: true }); await flush();
  assert.deepEqual(r.sources.map(source => source.buffer.file), ['title.mp3']);
  assert.equal(r.inputs[0].bus, 'music');
  music.duck(true);
  assert.deepEqual(r.inputs[0].calls.at(-1), ['duck', .38, { timeConstant: .12 }]);
  music.select('battle'); await flush();
  assert.deepEqual(r.sources.map(source => source.buffer.file), ['title.mp3', 'battle.mp3']);
  assert.equal(r.sources[0].stops[0][0], 10.85);
  music.setHidden(true);
  assert.deepEqual(r.sources.map(source => source.stops.at(-1)[0]), [10, 10]);
  assert.equal(r.inputs.length, 1);
});

test('synthesized cues share effects input and do not replay scheduled notes when hidden', () => {
  const r = rig(), feedback = createFeedbackAudio(null, r.clips);
  assert.equal(feedback.play('confirm'), true);
  assert.equal(r.inputs[0].bus, 'effects');
  assert.ok(r.sources.some(source => source.kind === 'oscillator'));
  assert.ok(r.connections.some(([, to]) => to === r.inputs[0].input));
  feedback.set({ volume: .4 });
  assert.deepEqual(r.inputs[0].calls.at(-1), ['volume', .4, { timeConstant: .009 }]);
  feedback.setHidden(true);
  assert.ok(r.sources.every(source => source.stops.at(-1)[0] === 10));
  assert.equal(feedback.play('confirm'), false);
});

test('a recorded line uses the native voice input and retains start/end duck events', async () => {
  const r = rig(), speaking = [], voice = createVoice(null, undefined, { clips: r.clips, onSpeaking: value => speaking.push(value) });
  assert.equal(voice.say('开局', { clip: 'prologue-decree' }), true);
  await flush();
  assert.equal(r.inputs[0].bus, 'voice');
  assert.deepEqual(r.inputs[0].options, { volume: .82 });
  assert.deepEqual(speaking, [true]);
  voice.set({ volume: .5 });
  assert.deepEqual(r.inputs[0].calls.at(-1), ['volume', .5, { timeConstant: .04 }]);
  voice.stop(); r.sources[0].onended();
  assert.deepEqual(speaking, [true, false]);
  assert.equal(r.inputs[0].disposed, true);
});

test('spatial motion supplies the old computed gain, equal-power pan and cutoff to a native input', async () => {
  const r = rig(), source = { kind: 'bell', x: 10, y: 1, z: 0 }, scene = { soundSources: () => [source] };
  const orbit = { target: [0, 0, 0], distance: 18, yaw: 0 }, settings = { on: true, volume: .36 };
  const audio = createSpatialAudio(r.clips, settings);
  audio.select(scene);audio.update(orbit); await flush();
  const placement = spatialPlacement(source, orbit), track = r.inputs[0];
  assert.deepEqual(track.options, { volume: 0, duck: 0, lowpass: placement.cutoff, pan: placement.pan });
  assert.deepEqual(track.calls[0], ['duck', .36 * .72, { timeConstant: .12 }]);
  assert.deepEqual(track.calls.slice(1), [['volume', placement.gain, { timeConstant: .085 }], ['lowpass', placement.cutoff, { timeConstant: .12 }], ['pan', placement.pan, { timeConstant: .075 }]]);
  audio.duck(true);
  assert.deepEqual(track.calls.at(-1), ['duck', .36 * .72 * .30, { timeConstant: .025 }]);
  audio.update({ ...orbit, yaw: Math.PI });
  assert.deepEqual(track.calls.at(-1), ['pan', -placement.pan, { timeConstant: .075 }]);
  audio.setHidden(true); assert.equal(r.sources[0].stops.at(-1)[0], 10);
  r.sources[0].onended(); assert.equal(track.disposed, true);
});

test('combat preserves strike offset, impact tail, native pan, duck and voice cap', async () => {
  const r=rig(), settings={on:true,volume:.55}, combat=createCombatAudio(r.clips, settings);
  combat.setEngaged(true); await flush();
  combat.contact({type:'hit',klass:'sword',x:14.5,critical:false});
  assert.deepEqual(r.sources.map(s=>s.buffer.file), ['sword.mp3','hit.mp3']);
  assert.deepEqual(r.sources.map(s=>s.starts[0]), [[10,.024],[10,0,.16]]);
  assert.deepEqual(r.inputs.map(t=>[t.bus,t.options.pan]), [['effects',.46],['effects',.46]]);
  combat.duck(true);
  assert.ok(r.inputs.every(t=>JSON.stringify(t.calls.at(-1))===JSON.stringify(['duck',.55*.54*.22,{timeConstant:.015}])));
  r.context.currentTime+=.2;
  combat.contact({type:'hit',klass:'saber',x:0,critical:false});
  combat.contact({type:'hit',klass:'fist',x:0,critical:false});
  combat.contact({type:'hit',klass:'palm',x:0,critical:false});
  assert.equal(r.sources.length,4,'three strike voices and one impact');
  combat.setHidden(true); assert.ok(r.sources.every(s=>s.stops.at(-1)[0]===10.2));
  r.sources.forEach(s=>s.onended()); assert.ok(r.inputs.every(t=>t.disposed));
});
