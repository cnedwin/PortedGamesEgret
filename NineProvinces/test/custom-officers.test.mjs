import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newRosterOfficer, normalizeRoster, validateOfficer } from '../src/custom-officers.mjs';
import { createGame } from '../src/sim/world.mjs';
import { GENERALS } from '../src/data/generals.mjs';
import { newGeneral, registerCustom } from '../src/sim/newblood.mjs';
const draft = { zh: '沈观澜', en: 'Shen Guanlan', age: 24, female: true, portrait: 18, service: 'player', stats: { lead: 70, war: 65, int: 75, pol: 70, cha: 70 }, trait: 'neizheng' };

test('officer roster enforces names, age, portrait, service and a real stat budget', () => {
  assert.ok(validateOfficer(draft).ok);
  for (const patch of [{zh:' '},{age:15},{age:61},{portrait:24},{service:'emperor'},{stats:{...draft.stats,war:91}},{stats:{lead:90,war:90,int:90,pol:90,cha:90}},{trait:'huoshen'}]) {
    assert.equal(validateOfficer({...draft,...patch}).ok,false,JSON.stringify(patch));
  }
});
test('roster is bounded, copied and cannot use historical/prototype/generated IDs', () => {
  const a = newRosterOfficer(draft,[]);assert.equal(a.officer.id,'u1');
  const b = newRosterOfficer({...draft,zh:'陈晚舟'},[a.officer]);assert.equal(b.officer.id,'u2');
  const copy=normalizeRoster([a.officer,a.officer,{...a.officer,id:'caocao'},{...a.officer,id:'__proto__'},{...a.officer,id:'n1'},b.officer]);
  assert.equal(copy.length,2);copy[0].stats.war=20;assert.equal(a.officer.stats.war,65);
  assert.equal(newRosterOfficer(draft,[a.officer]).ok,false);
  const many=Array.from({length:20},(_,i)=>({...a.officer,id:'u'+(i+1).toString(36)}));
  assert.equal(normalizeRoster(many).length,12);
});
test('new-game selection copies officers, starting age, portrait and service into the save only', () => {
  const entry=newRosterOfficer(draft,[]).officer;
  const free=newRosterOfficer({...draft,zh:'陆清商',service:'free'},[entry]).officer;
  const roster=[entry,free], before=JSON.stringify(roster);
  const s=createGame({scenario:'208',faction:'liubei',officers:roster});
  assert.equal(s.custom.length,2);assert.equal(GENERALS.u1.born,184);assert.equal(GENERALS.u1.portrait,18);
  assert.equal(s.generals.u1.faction,'liubei');assert.equal(s.generals.u1.status,'serving');
  assert.equal(s.generals.u2.status,'free');assert.equal(s.generals.u2.at,s.factions.liubei.capital);
  GENERALS.u1.stats.int=35;assert.equal(JSON.stringify(roster),before);
  const loaded=JSON.parse(JSON.stringify(s));createGame();registerCustom(loaded);
  assert.equal(GENERALS.u1.zh,draft.zh);assert.equal(GENERALS.u1.userCreated,true);assert.equal(GENERALS.u1.female,true);
  assert.equal(loaded.generals.u1.status,'serving');
  const generated=newGeneral(loaded,loaded.factions.liubei.capital,'liubei');
  assert.match(generated,/^n/);assert.notEqual(generated,'u1');
  createGame();assert.equal(GENERALS.u1,undefined);
});
test('legacy n-prefixed officers reload, collisions skip without replacing data', () => {
  const s=createGame();const id=newGeneral(s,'qiao','caocao');
  const original=JSON.stringify(GENERALS.caocao);
  s.custom.push({...s.custom[0],id:'caocao',zh:'恶意覆盖'});
  registerCustom(s);assert.equal(JSON.stringify(GENERALS.caocao),original);assert.ok(GENERALS[id]);
  s.nextId=1;const second=newGeneral(s,'qiao','caocao');assert.notEqual(second,id);
});
