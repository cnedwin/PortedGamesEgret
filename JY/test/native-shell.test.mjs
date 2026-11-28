import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../vendor/node-register.mjs';

const {createMemorySaveStorage}=await import('@egret/engine/kit');
const {createPreferencesStore,normalizePreferences}=await import('../web/jyx2/ui/native/preferences.mjs');
const {createShellWords}=await import('../web/jyx2/ui/native/words.mjs');
const {preparationPolicy,normalizeSlots,buildTitle,slotCopy}=await import('../web/jyx2/ui/native/screens.mjs');

test('legacy preferences migrate once into the native versioned store without deleting legacy data',()=>{
  const storage=createMemorySaveStorage();
  const old=JSON.stringify({visual:'classic',sound:false});
  storage.setItem('kys-game-preferences',old);
  const migrated=createPreferencesStore(storage);
  assert.deepEqual(migrated.data,{visual:'classic',sound:false,language:'zh'});
  assert.equal(storage.getItem('kys-game-preferences'),old);
  assert.equal(migrated.save({visual:'enhanced',sound:true,language:'en'}),true);
  assert.deepEqual(createPreferencesStore(storage).data,{visual:'enhanced',sound:true,language:'en'});
});
test('malformed or unsupported preferences fall back safely',()=>{
  const storage=createMemorySaveStorage();
  storage.setItem('kys-game-preferences','not-json');
  assert.deepEqual(createPreferencesStore(storage).data,{visual:'jyx2',sound:true,language:'zh'});
  assert.deepEqual(normalizePreferences({visual:'unknown',sound:false,language:'xx'}),{visual:'jyx2',sound:false,language:'zh'});
  storage.setItem('kys-game-preferences-v1','not-json');
  assert.deepEqual(createPreferencesStore(storage).data,{visual:'jyx2',sound:true,language:'zh'});
  assert.equal(storage.getItem('kys-game-preferences-v1.unread'),'not-json');
});
test('native title copy is bilingual and preparation gates only valid starts',()=>{
  const words=createShellWords({language:'zh'});
  assert.deepEqual(words.missing(),{zh:[],en:[]});
  assert.equal(words.text('title.new'),'開始新旅程');
  words.setLanguage('en');
  assert.equal(words.text('title.new'),'New journey');
  assert.equal(preparationPolicy({phase:'downloading'}).ready,false);
  assert.equal(preparationPolicy({phase:'downloading'}).cancel,true);
  assert.equal(preparationPolicy({phase:'error'}).retry,true);
  assert.equal(preparationPolicy({phase:'ready'}).ready,true);
  const desc=buildTitle({words,showPreparation:false});
  const names=[];
  function visit(part){if(part.name)names.push(part.name);for(const child of part.children??[])visit(child)}
  for(const variant of ['root','portrait','tablet','tabletPortrait'])visit(desc[variant]);
  assert.ok(names.includes('new'));
  assert.ok(!names.includes('data-progress'));
});
test('save-row stable identity and localized names cannot make bad slots actionable',()=>{
  const words=createShellWords({language:'en'});
  const [auto,bad]=normalizeSlots([{id:'auto',title:'Trail',detail:'Today'},{id:4,incompatible:true}]);
  assert.equal(auto.name,'slot-auto');
  assert.equal(slotCopy(auto,words).complete,'Auto record · Trail · Today');
  assert.equal(bad.eligible,false);
  assert.throws(()=>normalizeSlots([{id:4},{id:'4'}]),/slot/i);
});
