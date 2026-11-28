import '../vendor/node-register.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { showWorldMenu } = await import('../web/world-menu.mjs');
test('English world menu translates interface labels without changing action identifiers',async()=>{
 const calls=[];const game={language:'en',party:[],roleState:[],inventory:new Map()};const menu={async choose(title,rows){calls.push({title,rows});return 'save'}};
 let saved=false;await showWorldMenu({menu,game,catalog:{roles:[]},actions:{save(){saved=true}},canUseGear:()=>false});
 assert.equal(calls[0].title,'Travel menu');assert.equal(calls[0].rows.find(row=>row.value==='save').label,'Save progress');assert(saved);
});
test('original role and item names remain unchanged in English inventory',async()=>{
 const calls=[]; const menu={async choose(title,rows){calls.push({title,rows});return undefined}};
 const game={language:'en',party:[],roleState:[],inventory:new Map([[7,2]])};
 await showWorldMenu({menu,game,catalog:{items:{7:{name:'測試物品',description:'既有資料說明',type:3}}},actions:{},bagOnly:true,canUseGear:()=>false});
 assert.equal(calls[0].title,'Inventory');assert.equal(calls[0].rows[0].title,'測試物品');assert.equal(calls[0].rows[0].detail,'Medicine');assert.equal(calls[0].rows[0].description,'既有資料說明');
});
