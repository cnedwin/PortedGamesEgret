import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/sim/world.mjs';
import {getLanguage,setLanguage} from '../src/i18n.mjs';
import {NODES} from '../src/data/map.mjs';
import {generalName,placeName} from '../src/view/names.mjs';
import {troopCap} from '../src/sim/military.mjs';
import {armyPlate,placePlate,plateExtent} from '../src/ui/native-map-plate-model.mjs';

test('native plate presentation preserves the actual localized city owner and garrison model',()=>{
  const lang=getLanguage();try{
    const state=createGame({seed:184,faction:'caocao',branch:'free'}),id=state.factions[state.player].capital;
    const before=JSON.stringify(state);setLanguage('zh');const zh=placePlate(state,id,{node:id},state.player,new Set([id]));
    assert.equal(zh.name,placeName(id));assert.equal(zh.seal,state.factions[state.player].flag);
    assert.ok(zh.selected&&zh.mine&&zh.capital&&zh.siege);assert.equal(zh.share,Math.min(1,state.nodes[id].troops/(6000+NODES[id].size*6000)));
    setLanguage('en');const en=placePlate(state,id,null,state.player,new Set());
    assert.equal(en.name,placeName(id));assert.notEqual(en.key,zh.key);assert.match(en.seal,/^[A-Z—]$/);assert.equal(en.selected,false);
    assert.equal(JSON.stringify(state),before);
  }finally{setLanguage(lang);}
});

test('native army plate uses the same commander, troops, portrait and compact far state',()=>{
  const state=createGame({seed:184,faction:'caocao',branch:'free'}),commander=state.factions[state.player].ruler;
  const id='test-nameplate-army';state.armies[id]={id,faction:state.player,commander,troops:1234};
  const before=JSON.stringify(state),near=armyPlate(state,id,{army:id},state.player,false),far=armyPlate(state,id,{army:id},state.player,true);
  assert.equal(near.name,generalName(commander));assert.ok(near.portrait.includes('/avatar/'));assert.equal(near.share,1234/troopCap(state,commander));
  assert.ok(near.selected&&near.mine);assert.notEqual(near.key,far.key);assert.ok(plateExtent(far).width<plateExtent(near).width);
  assert.equal(JSON.stringify(state),before);
});

test('real native atlas measurement can widen but never shrink an initial label footprint',()=>{
  const sample={type:'place',kind:'city',words:'Long translated name'},initial=plateExtent(sample);
  assert.equal(plateExtent(sample,{name:1}).width,initial.width);
  assert.ok(plateExtent(sample,{name:400}).width>initial.width);
});
