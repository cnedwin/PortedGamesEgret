import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
import { createBattle, stepBattle, command, combatPreview, battleReport, idx } from '../src/sim/battle.mjs';
import { FORMATIONS, formationAllowed } from '../src/data/battle.mjs';

const setup = (a='spear', d='lightcav', formation='craneswing') => ({id:'depth',kind:'field',seed:731,wall:0,place:{link:['pingyuan','nanpi']},factions:['liubei','yuanshao'],terrain:{hills:0,woods:0,water:0,marsh:0},units:[a,d].map((unit,side)=>({side,unit,general:null,faction:side?'yuanshao':'liubei',troops:6000,morale:80,training:60,formation}))});
function adjacent(a,d,f='craneswing') { const b=createBattle(setup(a,d,f));b.units[0].pos=idx(8,7);b.units[1].pos=idx(9,7);for(const u of b.units){command(b,u.id,'hold');command(b,u.id,'autoTactic',false);}return b; }

test('shared combat preview exposes actual counters without consuming randomness',()=>{
 const b=adjacent('spear','lightcav');const p=combatPreview(b,b.units[0],b.units[1]);assert(p.weaponMultiplier>1.3);assert(p.tags.includes('counter'));assert(p.maxLoss>p.minLoss&&p.minLoss>0);
 const a=adjacent('sword','archer'),c=adjacent('sword','archer');combatPreview(a,a.units[0],a.units[1]);for(let i=0;i<100;i++){stepBattle(a,.1);stepBattle(c,.1);}assert.deepEqual(a.units.map(u=>[u.troops,u.pos,u.rage]),c.units.map(u=>[u.troops,u.pos,u.rage]));
 const shield=adjacent('archer','sword');assert(combatPreview(shield,shield.units[0],shield.units[1]).tags.includes('shield'));
});
test('formations have real tradeoffs and only eligible arms can select them',()=>{
 assert(FORMATIONS.longsnake.spd>0&&FORMATIONS.longsnake.atk<0&&FORMATIONS.longsnake.def<0);assert(FORMATIONS.geese.atk>0&&FORMATIONS.geese.def<0);assert(FORMATIONS.crescent.spd<0);
 assert(formationAllowed('lightcav','arrowhead'));assert(!formationAllowed('spear','arrowhead'));
 const b=adjacent('spear','halberd');assert.equal(command(b,0,'formation','arrowhead'),false);assert.equal(command(b,0,'formation','square'),true);
 const square=combatPreview(b,b.units[1],b.units[0]).maxLoss;command(b,0,'formation','longsnake');assert(combatPreview(b,b.units[1],b.units[0]).minLoss>square*.9);
});
test('invalid orders cannot attack allies, escape the board, or mutate formations',()=>{
 const b=adjacent('spear','archer');const before=JSON.stringify(b.units[0]);for(const [what,arg]of[['attack',0],['attack',999],['move',-1],['move',999],['move',1.5],['nonsense',null],['formation','missing']])assert.equal(command(b,0,what,arg),false);assert.equal(JSON.stringify(b.units[0]),before);
});
test('normal combat reports actual losses, matched counters and unit contributions',()=>{
 const b=adjacent('spear','lightcav');for(let i=0;i<300&&!b.over;i++)stepBattle(b,.1);
 const report=battleReport(b);assert.equal(report.units.length,2);assert(report.units[0].damage>0);assert(report.units[0].counterHits>0);assert.equal(report.sides[0].losses,6000-Math.round(b.units[0].troops));assert(report.units.every(u=>u.damage>=0&&u.taken>=0));assert.equal(report.sides[0].damage,report.units[0].damage);
});
test('a cavalry charge is an opening contact, not a permanent every-hit bonus',()=>{
 const b=createBattle(setup('cavalry','archer','square'));for(const u of b.units)command(b,u.id,'autoTactic',false);for(let i=0;i<1000&&!b.over;i++)stepBattle(b,.1);
 assert(b.units[0].record.hits>5);assert(b.units[0].record.charges>=1);assert(b.units[0].record.charges<b.units[0].record.hits/2,'standing contact must consume the charge');
});
test('cavalry terrain strengths and penalties in the data actually change the damage preview',()=>{
 const b=adjacent('cavalry','archer','square'),u=b.units[0],foe=b.units[1];b.tiles[u.pos]='plain';const plain=combatPreview(b,u,foe);b.tiles[u.pos]='forest';const forest=combatPreview(b,u,foe);
 assert(forest.attack<plain.attack*.7);assert.equal(plain.weaponMultiplier,1.25);assert(forest.tags.includes('cavalryTerrain'));assert.equal(b.units[0].record.hits,0);
});
