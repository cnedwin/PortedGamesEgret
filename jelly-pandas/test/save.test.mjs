import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSettings,saveSettings,DEFAULT_SETTINGS,STORAGE_KEY} from '../src/save.mjs';
const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v)}};
test('save settings uses the original flat record, with skin party mute and picture quality',()=>{
  const store=memory(),value={skin:7,party:4,muted:true,quality:'low'};
  assert.deepEqual(loadSettings(store),DEFAULT_SETTINGS);assert.equal(saveSettings(store,value),true);
  assert.deepEqual(JSON.parse(store.getItem(STORAGE_KEY)),value);assert.deepEqual(loadSettings(store),value);
});
test('save falls back independently for missing and corrupted settings',()=>{
  const store=memory();store.setItem(STORAGE_KEY,'{bad');assert.deepEqual(loadSettings(store),DEFAULT_SETTINGS);
  store.setItem(STORAGE_KEY,'null');assert.deepEqual(loadSettings(store),DEFAULT_SETTINGS);
  store.setItem(STORAGE_KEY,JSON.stringify({skin:-3,party:9,muted:'false',quality:'medium'}));
  assert.deepEqual(loadSettings(store),{...DEFAULT_SETTINGS,quality:'medium'});
  store.setItem(STORAGE_KEY,JSON.stringify({skin:3,muted:true}));
  assert.deepEqual(loadSettings(store),{...DEFAULT_SETTINGS,skin:3,muted:true});
});
test('save handles a refused storage without breaking the game',()=>{
  const refused={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
  assert.deepEqual(loadSettings(refused),DEFAULT_SETTINGS);assert.equal(saveSettings(refused,DEFAULT_SETTINGS),false);
});
