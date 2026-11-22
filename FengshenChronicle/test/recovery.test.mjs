import test from 'node:test';
import assert from 'node:assert/strict';
import {RECOVERY_ITEMS,createSession,createSaveSnapshot,dispatch,update} from '../src/sim/world.mjs';

test('the bag and combat share immutable recovery definitions',()=>{
 assert(Object.isFrozen(RECOVERY_ITEMS));assert(RECOVERY_ITEMS.every(Object.isFrozen));
 assert.deepEqual(RECOVERY_ITEMS.map(({itemId,key,heal})=>({itemId,key,heal})),[
  {itemId:'potion',key:'potions',heal:45},{itemId:'recovery-pill',key:'tonics',heal:65}
 ]);
});

test('explicit recovery spends only the selected medicine and reports actual healing across saves',()=>{
 for(const [itemId,hp,nextHp,potions,tonics,amount]of [
  ['potion',40,85,4,2,45],['recovery-pill',90,100,5,1,10]
 ]){
  const state=createSession();state.hero.hp=hp;state.hero.tonics=2;
  assert(dispatch(state,{type:'potion',itemId}));assert.equal(state.hero.hp,nextHp);
  assert.equal(state.hero.potions,potions);assert.equal(state.hero.tonics,tonics);
  const [event]=update(state,0);assert.deepEqual(event,{type:'heal',x:state.hero.x,y:state.hero.y,amount,itemId});
  const restored=createSession(createSaveSnapshot(state));assert.equal(restored.hero.hp,nextHp);
  assert.equal(restored.hero.potions,potions);assert.equal(restored.hero.tonics,tonics);
 }
});

test('full health, absent selected stock and unknown recovery IDs leave the complete state unchanged',()=>{
 for(const setup of [
  {hp:100,potions:5,tonics:2,itemId:'potion'},
  {hp:100,potions:5,tonics:2,itemId:'recovery-pill'},
  {hp:40,potions:0,tonics:2,itemId:'potion'},
  {hp:40,potions:5,tonics:0,itemId:'recovery-pill'},
  {hp:40,potions:5,tonics:2,itemId:'unknown'},
  {hp:40,potions:5,tonics:2,itemId:null}
 ]){
  const state=createSession();Object.assign(state.hero,{hp:setup.hp,potions:setup.potions,tonics:setup.tonics});
  const before=structuredClone(state);assert.equal(dispatch(state,{type:'potion',itemId:setup.itemId}),false);
  assert.deepEqual(state,before);
 }
});

test('combat potion without an ID retains automatic minimum-cover selection',()=>{
 const state=createSession();state.hero.hp=40;state.hero.tonics=2;
 assert(dispatch(state,{type:'potion'}));assert.equal(state.hero.hp,100);
 assert.equal(state.hero.potions,5);assert.equal(state.hero.tonics,1);
 assert.equal(update(state,0)[0].itemId,'recovery-pill');
});
