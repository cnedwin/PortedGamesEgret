import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../vendor/node-register.mjs';
import {masterOneShot} from '../src/audio-mastering.mjs';
const {SOUNDS,RATE}=await import('../src/audio.mjs');

test('quiet, already-ended one-shots and silence preserve their exact samples',()=>{
  const quiet=Float32Array.of(0,.12,-.22,0), silence=new Float32Array(40);
  assert.equal(masterOneShot(quiet,1000),quiet);
  assert.equal(masterOneShot(silence,1000),silence);
  assert.equal(masterOneShot(new Float32Array(),1000).length,0);
});

test('only an excessive peak is attenuated; an abrupt ending fades without changing length or input',()=>{
  const source=Float32Array.from({length:40},(_,i)=>i===4?1.1:.2);
  const copy=source.slice(), result=masterOneShot(source,1000);
  assert.deepEqual(source,copy);
  assert.equal(result.length,source.length);
  assert.ok(Math.abs(result[4]-.88)<1e-6);
  assert.equal(result.at(-1),0);
  assert.ok(result[36]<result[20]&&result[36]>0);
  const tailOnly=new Float32Array(40).fill(.1);
  const faded=masterOneShot(tailOnly,1000);
  assert.equal(faded[0],tailOnly[0],'no gain rise for quiet samples');
  assert.equal(faded[20],tailOnly[20],'short fade changes only the tail');
  assert.equal(faded.at(-1),0);
});

test('all existing synthesized one-shot cues encode with headroom and a zero ending',()=>{
  const samples=Object.values(SOUNDS).map(make=>make());
  assert.ok(samples.length>0);
  for(const input of samples){
    const output=masterOneShot(input,RATE);
    assert.equal(output.length,input.length);
    assert.ok(output.every(v=>Number.isFinite(v)&&Math.abs(v)<=.880001));
    assert.equal(Math.abs(output.at(-1)),0);
  }
});
