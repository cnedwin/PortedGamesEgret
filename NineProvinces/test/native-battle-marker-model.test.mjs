import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../vendor/node-register.mjs';
const {layoutBattlePlates} = await import('../src/view3d/battle-plate-layout.mjs');
const {battlePlateModel,battlePlateWidth,floatStyle,floatFrame,createFloatSlots,oldestOrdinaryFloat} = await import('../src/ui/native-battle-marker-model.mjs');
const {setLanguage} = await import('../src/i18n.mjs');
test('native plate preserves exact troop count, selected, targetable, routed and rage values without mutating units',()=>{
 const u={id:1,side:0,general:'caocao',kind:'spear',troops:2345.4,start:4000,rage:99,routed:true,pos:12};
 const initial=JSON.stringify(u);setLanguage('en');const data=battlePlateModel(u,{side:0,colours:[0x123456,0x654321],selected:1,targetable:new Set([1])});
 assert.equal(data.troops,'2,345');assert.equal(data.health,.59);assert.equal(data.rage,.99);assert.equal(data.chosen,true);assert.equal(data.targetable,true);assert.equal(data.routed,true);assert.equal(data.full,false);assert.equal(data.colour,0x123456);assert.equal(JSON.stringify(u),initial);assert(!/[㐀-鿿]/.test(data.name));assert(data.portrait.endsWith('.webp'));
 setLanguage('zh');assert.notEqual(battlePlateModel(u,{side:0,colours:[0x123456,0x654321]}).name,data.name);setLanguage('en');
});
test('a real long label and safe insets, not a fixed width guess, drive native battle placement',()=>{
 const data={title:'A remarkably long officer',troops:'12,345'},width=battlePlateWidth(data,{name:180,troops:52});assert(width>210);
 const layout=layoutBattlePlates([{id:0,x:207,y:100,fullWidth:width,visible:true,selected:true},{id:1,x:350,y:100,visible:true}],{width:430,height:240,safe:{left:24,top:20,right:390,bottom:210},obstacles:[{left:0,top:0,right:390,bottom:65}]});
 assert.equal(layout[0].mode,'full');for(const {box} of layout)if(box){assert(box.left>=24&&box.right<=390&&box.top>=65&&box.bottom<=210);assert(box.right-box.left>=44&&box.bottom-box.top>=44);}
});
test('battle effect lifetimes, sizes, visibility and 36-slot admission retain original animation',()=>{
 const styles=[floatStyle('hit',1280),floatStyle('hurt',1280),floatStyle('rout',1280),floatStyle('brush',390,{ours:true,signature:true})];
 assert.deepEqual(styles.map(s=>s.life),[1.15,1.15,1.15,1.9]);assert(styles[3].size>=30&&styles[3].size<=54);
 const f={...styles[0],age:0,x:1,y:2,z:3};assert.equal(floatFrame(f,.1).y,2.09);assert.equal(floatFrame(f,1.2),null);
 const slots=createFloatSlots(3);assert(slots.take()!==null);assert(slots.take()!==null);const last=slots.take();assert(last!==null);assert.equal(slots.take(),null);assert(slots.give(last));assert.equal(slots.take(),last);assert.equal(slots.active,3);
});
test('saturated effect slots yield an ordinary float before losing named calligraphy',()=>{
 assert.equal(oldestOrdinaryFloat([{id:0,brush:true,age:1.8},{id:1,brush:false,age:.2},{id:2,brush:false,age:.8}]),2);
 assert.equal(oldestOrdinaryFloat([{id:0,brush:true,age:1.8}]),null);
});
