import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const resolver=registerHooks({resolve(name,context,next){
  if(name==='@egret/engine/web/audio')return {url:'data:text/javascript,export const createBrowserAudio = options => globalThis.testBrowserAudio(options)',shortCircuit:true};
  if(name==='@egret/engine/kit')return {url:'data:text/javascript,export const encodeWav = bytes => bytes',shortCircuit:true};
  return next(name,context);
}});
const {createSound}=await import('../src/audio/sound.mjs');
resolver.deregister();

test('an unavailable browser audio host does not prevent the game loading',async()=>{
  globalThis.testBrowserAudio=()=>{throw Object.assign(new Error('No browser audio'),{code:'AUDIO_HOST_UNAVAILABLE'});};
  const scope={use(){throw Error('Cannot register anything which was never created');}};
  const sound=await createSound(scope,{sound:true,music:true,musicVolume:.4});
  assert.equal(sound.state,'unavailable');
  assert.equal(sound.play('tap'),null);
  assert.equal(await sound.theme('title'),null);
  assert.equal(sound.music,'title');
  sound.setSound(false);sound.setMusic(false);sound.setVolumes({effects:.2});
  assert.equal(sound.snapshot().levels.effects,.2);
  assert.deepEqual(sound.snapshot().errors,['AUDIO_HOST_UNAVAILABLE']);
});

test('an unexpected application/mixer error is not silently absorbed',async()=>{
  const cause=Object.assign(new Error('bad options'),{code:'AUDIO_OPTIONS_INVALID'});
  globalThis.testBrowserAudio=()=>{throw cause};
  await assert.rejects(createSound({use:()=>{}}),error=>error===cause);
});
