import test from 'node:test';import assert from 'node:assert/strict';import {register} from 'node:module';
register('../tools/egret-resolve.mjs',import.meta.url);
const {nativeSlots}=await import('../src/ui/native-save.mjs');
const {createWorld}=await import('../src/core/world.mjs');
const {serialize}=await import('../src/core/save.mjs');
test('engine storage adapter keeps legacy file bytes and quarantines corrupt slots',()=>{
 const map=new Map();const storage={persistent:true,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const world=createWorld({seed:23,playerSect:'shaolin'});
 map.set('wulin-slot-1',serialize(world,'old'));
 const slots=nativeSlots(storage);assert.equal(slots.read('1').state.day,world.day);assert.equal(slots.list()[0].label,'old');
 assert(slots.write('2',world,'new'));assert.equal(map.get('wulin-slot-2'),serialize(world,'new'));
 map.set('wulin-slot-auto','broken');assert.equal(slots.read('auto').ok,false);assert.equal(map.get('wulin-slot-auto.unread'),'broken');
});
