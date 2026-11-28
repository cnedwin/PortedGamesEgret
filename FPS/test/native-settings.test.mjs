import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const {createMemorySaveStorage}=await import('@egret/engine/kit');
const {createSettingsStore, SETTINGS_KEY}=await import('../src/native-settings.mjs');

test('legacy raw settings load unchanged and convert on explicit save',()=>{
  const raw={quality:'medium',sensitivity:1.6,adsSensitivity:.91,invertY:true,volume:.35,fov:82,lang:'zh',futureChoice:'keep'};
  const storage=createMemorySaveStorage();
  storage.setItem(SETTINGS_KEY,JSON.stringify(raw));
  const store=createSettingsStore({storage});
  assert.deepEqual(store.load(new URLSearchParams()),raw);
  assert.deepEqual(JSON.parse(storage.getItem(SETTINGS_KEY)),raw,'loading does not overwrite legacy record');
  assert.equal(store.save({...raw,volume:.45}),true);
  const envelope=JSON.parse(storage.getItem(SETTINGS_KEY));
  assert.equal(envelope.version,1);assert.equal(envelope.data.futureChoice,'keep');
  assert.equal(createSettingsStore({storage}).load(new URLSearchParams()).volume,.45);
});
test('defaults, requested language/quality, and old ADS clamp are retained',()=>{
  const storage=createMemorySaveStorage();const store=createSettingsStore({storage});
  assert.deepEqual(store.load(new URLSearchParams('lang=en')),{quality:'high',sensitivity:1,adsSensitivity:.62,invertY:false,volume:.8,fov:74,lang:'en'});
  storage.setItem(SETTINGS_KEY,JSON.stringify({quality:'low',lang:'zh',adsSensitivity:9,sensitivity:1.4}));
  assert.deepEqual(store.load(new URLSearchParams('lang=en&quality=medium')),{quality:'medium',sensitivity:1.4,adsSensitivity:1.5,invertY:false,volume:.8,fov:74,lang:'en'});
});
test('malformed and newer settings records are preserved aside, with a usable fallback',()=>{
  const storage=createMemorySaveStorage(),problems=[];
  const store=createSettingsStore({storage,onProblem:p=>problems.push(p.kind)});
  const invalid='{not-json';storage.setItem(SETTINGS_KEY,invalid);
  assert.equal(store.load(new URLSearchParams('lang=en')).quality,'high');
  assert.equal(storage.getItem(SETTINGS_KEY+'.unread'),invalid);
  assert.deepEqual(problems,['unreadable']);
  const future=JSON.stringify({version:999,data:{quality:'low'}});
  storage.setItem(SETTINGS_KEY,future);
  assert.equal(store.load(new URLSearchParams('lang=en')).quality,'high');
  assert.equal(storage.getItem(SETTINGS_KEY+'.unread'),future);
  assert.equal(problems.at(-1),'too-new');
});
test('storage refusal does not break settings UI',()=>{
  const storage={getItem(){return null},setItem(){throw Error('denied')},removeItem(){}};
  const problems=[];const store=createSettingsStore({storage,onProblem:p=>problems.push(p.kind)});
  const defaults=store.load(new URLSearchParams('lang=en'));
  assert.equal(store.save({...defaults,volume:.2}),false);
  assert.equal(problems.at(-1),'write-failed');
});

test('ordinary, raw and drag pointer preferences persist without rewriting older settings',()=>{
  const storage=createMemorySaveStorage(),store=createSettingsStore({storage});
  const defaults=store.load(new URLSearchParams('lang=en'));
  assert.equal(Object.hasOwn(defaults,'mouseMode'),false,'absence retains historical ordinary lock default');
  for(const mouseMode of ['lock','raw','drag']){
    assert.ok(store.save({...defaults,mouseMode,futureChoice:'keep'}));
    const loaded=createSettingsStore({storage}).load();
    assert.equal(loaded.mouseMode,mouseMode);assert.equal(loaded.futureChoice,'keep');
  }
  const original=JSON.stringify({quality:'medium',mouseMode:'unknown',futureChoice:'keep'});
  storage.setItem(SETTINGS_KEY,original);
  assert.equal(store.load().mouseMode,'lock','unknown explicit mode falls back to ordinary lock');
  assert.equal(storage.getItem(SETTINGS_KEY),original,'load does not alter old storage');
});
