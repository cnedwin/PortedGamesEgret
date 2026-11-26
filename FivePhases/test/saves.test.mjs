// FivePhases has no campaign save: the existing local sound preference is its only persisted state.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createAudio} from '../src/view/audio.mjs';
const KEY='fivephases.audio.muted';
function withStorage(storage,run){
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
  try{return run()}finally{
    if(original)Object.defineProperty(globalThis,'localStorage',original);
    else delete globalThis.localStorage;
  }
}
test('the old mute save is read and the setting survives a fresh audio controller',()=>{
  const values=new Map([[KEY,'1']]);
  withStorage({getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,String(value))},()=>{
    const audio=createAudio();
    assert.equal(audio.muted,true);
    assert.equal(audio.toggleMute(),false);
    assert.equal(values.get(KEY),'0');
    assert.equal(createAudio().muted,false);
    assert.equal(createAudio().toggleMute(),true);
    assert.equal(createAudio().muted,true);
  });
});
test('a malformed or refused save does not prevent the game or mute toggle from opening',()=>{
  withStorage({getItem:()=>'{bad',setItem:()=>{}},()=>assert.equal(createAudio().muted,false));
  withStorage({getItem(){throw Error('refused')},setItem(){throw Error('refused')}},()=>{
    const audio=createAudio();
    assert.equal(audio.muted,false);
    assert.equal(audio.toggleMute(),true);
  });
});