import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../vendor/node-register.mjs';

const {normalizeChoiceRows,choiceFilters,choiceLabels,choicePage,createTeamSelection}=
  await import('../web/jyx2/ui/native/choice-menu.mjs');
const {createBattleMenu}=await import('../web/battle-menu.mjs');

test('native choices retain caller values, stable IDs and optional image fallbacks',()=>{
  const token={id:42};
  const rows=normalizeChoiceRows([
    {label:'Synthetic object',value:token,icon:'/sample/image.png',fallbackIcon:'/sample/fallback.png',itemType:1},
    {label:'Zero',value:0,itemType:2},{label:'No',value:false,itemType:1},{label:'No',value:undefined}
  ]);
  assert.equal(rows[0].value,token);
  assert.equal(rows[0].fallbackImage,'/sample/fallback.png');
  assert.equal(rows[1].value,0);
  assert.equal(rows[2].value,false);
  assert.notEqual(rows[2].name,rows[3].name);
  const filters=choiceFilters(rows,choiceLabels('en'),[{type:1,label:'Sample group'}]);
  assert.deepEqual(choicePage(rows,{filter:filters[1],size:2}).rows.map(r=>r.value),[token,false]);
});
test('team selection only returns permitted supplied IDs and enforces the minimum',()=>{
  const rows=normalizeChoiceRows([{label:'A',value:7},{label:'B',value:9},{label:'C',value:12,disabled:true}]);
  const team=createTeamSelection(rows,{initial:[9,12],minimum:1});
  assert.deepEqual([...team.values()],[9]);
  team.toggle(rows[1]);assert.equal(team.canConfirm,false);
  team.toggleAll();assert.deepEqual([...team.values()],[7,9]);
});
test('the existing visual-mode icon and portrait resolver contract remains stable',async()=>{
  let visual='jyx2';
  const menu=createBattleMenu({invalidate(){}},undefined,{
    visualStyle:()=>visual,portraitUrl:id=>'/synthetic/portrait/'+id+'.png',
    itemIconUrl:id=>'/synthetic/item/'+id+'.png'
  });
  assert.equal(menu.portraitUrl(3),'/synthetic/portrait/3.png');
  assert.equal(menu.itemIconUrl(2),'/synthetic/item/2.png');
  visual='enhanced';
  assert.equal(menu.portraitUrl(3),'/synthetic/portrait/3.png');
  assert.equal(menu.itemIconUrl(2),'/art/item/2.png');
  visual='classic';
  assert.equal(menu.portraitUrl(3),'/art/head/3.png');
  await menu.dispose();
});

// Pure adapter-contract test: the real engine screen stack is used; a
// minimal view substitute allows callback contracts to be checked without a
// device. Layout, text and actual input are covered by browser acceptance.
function fixture(){
  const calls={focus:0,active:[]};
  const game={invalidate(){},show(description,options){
    this.last={description,options};
    return {show(){},hide(){},activate(){},deactivate(){},close(){},refresh(){},focus(){}};
  }};
  const menu=createBattleMenu(game,{focus(){calls.focus++}},{onActiveChange:active=>calls.active.push(active)});
  async function binding(name){
    for(let i=0;i<20;i++){
      if(game.last?.options.bind[name])return game.last.options.bind[name];
      await new Promise(resolve=>setImmediate(resolve));
    }
    throw new Error('binding did not open: '+name);
  }
  return {menu,game,calls,binding};
}
test('selection settlement preserves false, zero, explicit cancellation and abort reasons',async()=>{
  const {menu,game,calls,binding}=fixture();
  const signal=new AbortController().signal;
  const zero=menu.choose('Synthetic choice',[{label:'Zero',value:0}],signal);
  (await binding('choice-0')).tap();
  assert.equal(await zero,0);assert.equal(menu.active,false);
  game.last=undefined;
  const no=menu.askJoin(signal,'Synthetic confirmation');
  (await binding('choice-1')).tap();assert.equal(await no,false);
  const aborted=new AbortController(),reason=new Error('Synthetic cancellation');
  game.last=undefined;
  const pending=menu.choose('Synthetic choice',[{label:'Pending',value:1}],aborted.signal);
  await binding('choice-0');aborted.abort(reason);
  await assert.rejects(pending,error=>error===reason);
  assert.equal(menu.active,false);assert.ok(calls.focus>=3);
  assert.deepEqual(calls.active,[true,false,true,false,true,false]);
  await menu.dispose();
});
test('host-driven item close is not mistaken for a player cancel callback',async()=>{
  const {menu,game,binding}=fixture();
  let used=0,cancelled=0;
  const items=[{id:4,name:'Synthetic item',count:1,type:0}];
  const external=menu.showItems(items,()=>used++,()=>cancelled++);
  await binding('back');menu.close();await external;
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(cancelled,0);
  game.last=undefined;
  const user=menu.showItems(items,()=>used++,()=>cancelled++);
  (await binding('back')).tap();await user;
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(cancelled,1);assert.equal(used,0);
  await menu.dispose();
});
