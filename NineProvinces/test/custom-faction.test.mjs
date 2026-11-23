import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, advance } from '../src/sim/world.mjs';
import { GENERALS } from '../src/data/generals.mjs';
import { NODES } from '../src/data/map.mjs';
import { registerCustom } from '../src/sim/newblood.mjs';

test('a new playable banner has one vacant town, an eligible historical ruler and three unique companions', () => {
  const state=createGame({scenario:'184',seed:27,branch:'liubei',customFaction:{zh:'青岚义军',en:'Azure Banner',flag:'岚',colour:0x93643c,town:'hedong',ruler:'history:guanyu',companions:['history:zhangfei','history:zhaoyun']}});
  assert.equal(state.player,'player');assert.equal(state.branch,'free');
  assert.equal(state.factions.player.name.zh,'青岚义军');assert.equal(state.nodes.hedong.owner,'player');
  assert.equal(state.factions.player.ruler,'guanyu');
  for(const id of ['guanyu','zhangfei','zhaoyun']){assert.equal(state.generals[id].faction,'player');assert.equal(state.generals[id].at,'hedong');}
  assert.equal(state.generals.guanyu.loyalty,100);assert.equal(state.factions.liubei.ruler,'liubei');
  assert.ok(state.nodes.hedong.troops>=6000);assert.ok(state.factions.player.coin>=5000);
});

test('every era offers towns and eligible historical officers without changing the ordinary snapshot', async () => {
  const {customFactionOptions}=await import('../src/sim/custom-faction.mjs');
  for(const scenario of ['184','190','200','208','219']){
    const state=createGame({scenario});const before=JSON.stringify(state);
    const options=customFactionOptions(state,[]);
    assert.ok(options.towns.length>0,scenario);assert.ok(options.officers.length>20,scenario);
    assert.equal(JSON.stringify(state),before);
    for(const town of options.towns){assert.equal(NODES[town.id].kind,'city');if(town.formerOwner)assert.notEqual(state.factions[town.formerOwner].capital,town.id);}
    for(const row of options.officers){assert.ok(GENERALS[row.id].born+15<=+scenario);assert.ok(!Object.values(state.factions).some(f=>f.alive&&f.ruler===row.id));}
  }
});

test('late alternate-history founding detaches only the selected town and returns its original garrison', async () => {
  const {customFactionOptions}=await import('../src/sim/custom-faction.mjs');
  for(const scenario of ['200','219']){
    const normal=createGame({scenario,seed:31}),options=customFactionOptions(normal,[]),town=options.towns[0];
    const owner=normal.nodes[town.id].owner,capital=normal.factions[owner].capital;
    const state=createGame({scenario,seed:31,customFaction:{zh:'清川军',en:'Clear River',flag:'清',colour:0x4a8880,town:town.id,ruler:'history:guanyu',companions:[]}});
    assert.equal(state.founding.formerOwner,owner);assert.equal(state.founding.alternateHistory,true);
    assert.equal(state.nodes[town.id].owner,'player');
    assert.equal(state.nodes[capital].troops,normal.nodes[capital].troops+normal.nodes[town.id].troops);
    for(const [id,n]of Object.entries(normal.nodes))if(id!==town.id)assert.equal(state.nodes[id].owner,n.owner,scenario+':'+id);
    for(const [id,g]of Object.entries(state.generals))if(g.faction===owner)assert.notEqual(g.at,town.id,id);
  }
});

test('invalid/dead/underage/active-ruler/duplicate selections fail without a half-created campaign', async () => {
  const {validateCustomFaction}=await import('../src/sim/custom-faction.mjs');
  const state=createGame({scenario:'184'}),base={zh:'青岚军',en:'Azure',flag:'岚',colour:0x93643c,town:'hedong',ruler:'history:guanyu',companions:[]};
  const before=JSON.stringify(state);
  for(const patch of [{ruler:'history:caocao'},{ruler:'history:zhugeliang'},{town:'qiao'},{companions:['history:guanyu']},{companions:['history:zhangfei','history:zhangfei']},{companions:['history:zhangfei','history:zhaoyun','history:xiahoudun','history:caoren']},{zh:''}]){
    assert.equal(validateCustomFaction(state,{...base,...patch},[]).ok,false,JSON.stringify(patch));
  }
  assert.equal(JSON.stringify(state),before);
  assert.throws(()=>createGame({customFaction:{...base,ruler:'history:caocao'}}),/CUSTOM_FACTION_INVALID/);
});

test('a roster ruler and mixed companions are copied once, retain their chosen appearance and reload independently', () => {
  const roster=[{id:'u1',zh:'沈观澜',en:'Shen Guanlan',age:24,female:true,portrait:18,service:'free',stats:{lead:70,war:65,int:75,pol:70,cha:70},trait:'neizheng'},
    {id:'u2',zh:'陈听雨',en:'Chen Tingyu',age:29,female:false,portrait:14,service:'player',stats:{lead:70,war:70,int:70,pol:70,cha:70},trait:null}];
  const before=JSON.stringify(roster);
  const state=createGame({scenario:'184',officers:roster,customFaction:{zh:'清川军',en:'Clear River',flag:'清',colour:0x4a8880,town:'hedong',ruler:'roster:u1',companions:['roster:u2','history:guanyu']}});
  assert.equal(state.factions.player.ruler,'u1');assert.equal(state.custom.length,2);assert.equal(state.generals.u1.faction,'player');
  assert.equal(state.custom[0].portrait,18);assert.equal(state.custom[0].female,true);assert.equal(JSON.stringify(roster),before);
  const saved=JSON.parse(JSON.stringify(state));createGame();registerCustom(saved);assert.equal(GENERALS.u1.zh,'沈观澜');assert.equal(saved.factions.player.ruler,'u1');
  assert.equal(saved.generals.guanyu.treasures.filter(id=>id==='qinglong').length,1);
});

test('a custom faction can advance and save without corrupting later ordinary campaigns', () => {
  const run=()=>{const s=createGame({scenario:'184',seed:44,command:false,customFaction:{zh:'清川军',en:'Clear River',flag:'清',colour:0x4a8880,town:'hedong',ruler:'history:guanyu',companions:['history:zhangfei','history:zhaoyun']}});for(let day=0;day<120;day++){s.inbox=[];advance(s);}return JSON.parse(JSON.stringify(s));};
  assert.deepEqual(run(),run());
  const normal=createGame({scenario:'184',seed:44});assert.equal(normal.factions.player,undefined);assert.equal(normal.nodes.hedong.owner,null);assert.equal(normal.generals.guanyu.faction,'liubei');
});

test('184 fictional lifetime cannot remove a historically living selectable founder before the campaign starts', () => {
  const state = createGame({ seed: 0, lifespan: 'fiction', customFaction: {
    zh: '青岚军', en: 'Azure', flag: '岚', colour: 0x85643f, town: 'hedong', ruler: 'history:zhangrang', companions: []
  } });
  assert.equal(state.factions.player.ruler, 'zhangrang');
  assert.equal(state.generals.zhangrang.status, 'serving');
  assert.ok(state.generals.zhangrang.died >= 187);
});

test('historical ruler affinity is persisted in each campaign roster companion and save summary', async () => {
  const roster = [{ id: 'u1', zh: '沈观澜', en: 'Shen Guanlan', age: 24, female: true, portrait: 18, service: 'free',
    stats: { lead: 70, war: 65, int: 75, pol: 70, cha: 70 }, trait: 'neizheng' }];
  const state = createGame({ officers: roster, customFaction: { zh: '青岚军', en: 'Azure', flag: '岚', colour: 0x85643f,
    town: 'hedong', ruler: 'history:guanyu', companions: ['roster:u1'] } });
  const saved = JSON.parse(JSON.stringify(state));
  assert.equal(saved.custom[0].camp, GENERALS.guanyu.camp);
  createGame();
  registerCustom(saved);
  assert.equal(GENERALS.u1.camp, GENERALS.guanyu.camp);
  await import('../vendor/node-register.mjs');
  const { summarize } = await import('../src/saves.mjs');
  const summary = summarize(saved, 1);
  assert.equal(summary.faction, 'player');
  assert.deepEqual(summary.name, { zh: '青岚军', en: 'Azure' });
  assert.equal(summary.colour, 0x85643f);
  assert.equal(summary.flag, '岚');
  saved.factions.player.name.zh = '另一局';
  assert.equal(summary.name.zh, '青岚军');
});
