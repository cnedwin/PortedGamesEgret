import '../vendor/node-register.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPage } from '../src/ui/native-pages.mjs';
import { createWorld, residents, membersOf } from '../src/core/world.mjs';
import { SECT_BY_ID } from '../src/data/sects.mjs';
import { PLACE_BY_ID } from '../src/data/places.mjs';

const context = (name = 'seat') => {
  const world = createWorld({seed: 42, playerSect: 'shaolin'});
  const me = () => world.playerSect;
  const books = () => world.sects[me()];
  const leaderOf = id => world.persons[world.sects[id].leaderId];
  const ui = {page: name, place: 'songshan', building: 0, seatTab: 'build', commandCollapsed:false,
    tags:true, chosen:'shaolin', prologue:0, founding:false, ownName:'', ownLeader:'',
    scenario:'many', difficulty:1, succession:false, mapPlace:'songshan', map3d:true,
    batch:new Set(), rank:'全部', artTier:'全部', logFilter:'全部', book:'annals',
    sortKey:'rank', sortUp:false, rosterView:'cards'};
  return {world, ui, picture:{stage:{}}, art:null, slots:{list:()=>[]}, music:{on:true,unlocked:true},
    helpers:{me,books,open:()=>true,leaderOf,founder:s=>({...s.leader,school:s.id}), faceUrl:()=>null,sceneUrl:()=>null,
      dayText:d=>String(d), b_status:()=> '山门安定', hourText:()=> '午时', jobText:()=> '休息',bestArtText:()=> '—',
      picked:()=>leaderOf(me()), roster:()=>membersOf(world,me()), waiting:()=>[],
      artSource:()=> '本门绝学',marchParty:()=>membersOf(world,me()).slice(0,10),
      placeDeal:id=>({kind:world.places[id].owner===me()?'mine':PLACE_BY_ID[id].roads.some(other=>world.places[other].owner===me())?(world.places[id].owner?'foe':'open'):'far'}) }};
};

function descriptor(ctx) {
  const node = createPage(ctx);
  assert.equal(typeof node, 'object');
  const string = JSON.stringify(node);
  assert.doesNotMatch(string, /<(button|section|input|table|select|div)\b/);
  return string;
}

test('native screens keep the opening and every management branch reachable', () => {
  const ctx = context();
  for (const [page, actions] of Object.entries({
    seat:['upgrade','sheet','guide-open','zoom','command-toggle','seat-tab'],
    disciples:['person','picking','rank','assign','arts'],
    arts:['train-art','manual','art-tier'],
    world:['look','mapmode','place'],
    battle:['duel','march'],
    chronicle:['book','log-filter'],
    saves:['save','load','export','import','quit'],
  })) {
    ctx.ui.page=page;
    const desc=descriptor(ctx);
    for (const action of actions) assert.ok(desc.includes(action),page+': '+action);
  }
  ctx.world=null;
  for (const [page, action] of [['title','prologue'], ['prologue','prologue-next'],['sects','sect-next'],['legacy','new']]) {
    ctx.ui.page=page;
    assert.ok(descriptor(ctx).includes(action),page);
  }
  ctx.ui.page='sects'; ctx.ui.founding=true;
  assert.ok(descriptor(ctx).includes('own-name'));
  assert.ok(descriptor(ctx).includes('own-leader'));
});

test('a locked early realm is explorable but exposes no settlement or warfare orders',()=>{
  const ctx=context('world');
  const visit=node=>[node,...(node.children??[]).flatMap(visit)];
  ctx.helpers.open=id=>!['world','battle','diplomacy'].includes(id);
  const map=Object.keys(ctx.world.places);
  for(const place of map){
    ctx.ui.mapPlace=place;
    for(const root of Object.values(createPage(ctx))){
      const controls=visit(root);
      assert.ok(controls.some(x=>x._action==='place'),'stronghold browsing '+place);
      assert.ok(controls.some(x=>String(x.text??'').includes('先观览天下')));
      assert.ok(!controls.some(x=>['gift','settle','march'].includes(x._action)||x._action==='sheet'&&['settle','march','diplomacy'].includes(x._data?.kind)),'early commands '+place);
    }
  }
  ctx.helpers.open=()=>true;
  ctx.ui.mapPlace=map.find(id=>ctx.helpers.placeDeal(id).kind==='foe');
  assert.ok(ctx.ui.mapPlace);
  const unlocked=visit(createPage(ctx).root);
  assert.ok(unlocked.some(x=>x._action==='sheet'&&x._data?.kind==='march'));
  assert.ok(unlocked.some(x=>x._action==='gift'));
});

test('all stationary pages compile to engine-valid responsive variants', async()=>{
  const {compile,SKIN}=await import('../src/ui/native-kit.mjs');
  const {checkView,planView}=await import('../vendor/engine/dist/web/view.js');
  const ctx=context();
  for(const page of ['seat','disciples','arts','world','battle','chronicle','saves','title','prologue','sects','legacy']){
    ctx.ui.page=page;
    const raw=createPage(ctx);
    const desc=Object.fromEntries(Object.entries(raw).map(([key,node])=>[key,compile(node).root]));
    desc.skin=SKIN;
    try {checkView(desc);} catch(e){throw new Error(page+': '+e.message);}
    for(const [width,height,form] of [[852,393,'phone'],[393,852,'phone'],[768,1024,'tablet'],[1280,800,'tablet']]){
      const rect={x:0,y:0,width,height};
      const p=planView(desc,{screen:rect,safe:rect,orientation:width>height?'landscape':'portrait',form});
      assert.ok(p.parts.length>0,page);
    }
  }
});


test('every paged sub-screen and active battle keep the same semantic names on rotation',async()=>{
  const {compile,SKIN}=await import('../src/ui/native-kit.mjs');
  const {checkView,planView}=await import('../vendor/engine/dist/web/view.js');
  const {createBattle}=await import('../src/core/battle.mjs');
  const ctx=context();
  const cases=[
    {page:'seat',seatTab:'recruit'}, {page:'seat',seatTab:'here'},{page:'seat',seatTab:'affairs'},
    {page:'seat',seatTab:'build',commandCollapsed:true},
    {page:'disciples',rosterView:'table'}, {page:'disciples',picking:true},
    {page:'world',map3d:false}, ...['arts','wanderers','relics'].map(book=>({page:'chronicle',book})),
    {page:'sects',founding:true}
  ];
  const sides=[membersOf(ctx.world,'shaolin').slice(0,10),membersOf(ctx.world,'huashan').slice(0,10)];
  const battle=createBattle({sides,seed:7});
  cases.push({page:'battle',fight:{arena:{battle,speed:1,paused:false},title:'山门守战',heads:[
    {name:'少林寺',person:sides[0][0]},{name:'华山派',person:sides[1][0]}],side:0,lines:['两军相向']}})
  for(const partial of cases){
    const next={...ctx,ui:{...context().ui,...partial}};
    const raw=createPage(next);
    const desc=Object.fromEntries(Object.entries(raw).map(([key,node])=>[key,compile(node).root]));
    desc.skin=SKIN;
    try {checkView(desc);} catch(e){throw new Error(partial.page+': '+e.message);}
    for(const [width,height,form] of [[873,325,'phone'],[393,852,'phone'],[768,1024,'tablet'],[1280,800,'tablet']]){
      const rect={x:0,y:0,width,height},p=planView(desc,{screen:rect,safe:rect,orientation:width>height?'landscape':'portrait',form});
      for(const part of p.parts) if(part.part.type==='button') {
        assert.ok(part.rect.width>=44&&part.rect.height>=44,partial.page+' '+part.part.text+' '+JSON.stringify(part.rect));
      }
    }
  }
});


test('English page text and accessible labels are translated at initial and advanced screens',async()=>{
  const {createLocale}=await import('../src/ui/locale.mjs');
  const locale=createLocale('en'), ctx=context();
  locale.registerNames([...Object.values(ctx.world.persons),...Object.values(ctx.world.places).flatMap(place=>place.applicants??[])].map(p=>p.name));
  const cases=[
    ...['title','prologue','sects','legacy','seat','disciples','arts','world','battle','chronicle','saves'].map(page=>({page})),
    {page:'seat',seatTab:'recruit'},{page:'seat',seatTab:'here'},{page:'seat',seatTab:'affairs'},
    {page:'disciples',rosterView:'table'}, {page:'world',map3d:false},
    ...['arts','wanderers','relics'].map(book=>({page:'chronicle',book})),
    {page:'sects',founding:true}
  ];
  const misses=[];
  const check=value=>{
    if(typeof value!=='string')return;
    const translated=locale.translate(value);
    if(/\p{Script=Han}/u.test(translated)) misses.push(value+' → '+translated);
  };
  const visit=node=>{
    check(node.text);check(node.label);check(node._detail);
    if(node._action==='@choice') for(const [,label] of node._data.options)check(label);
    for(const child of node.children??[])visit(child);
  };
  for(const part of cases)visit(createPage({...ctx,ui:{...context().ui,...part,language:'en'}}).root);
  assert.deepEqual([...new Set(misses)],[]);
});


test('native pages keep the shared paragraph cache bounded',async()=>{
  const {compile}=await import('../src/ui/native-kit.mjs');
  const ctx=context();
  const count=node=>(node.paragraph?1:0)+(node.children??[]).reduce((sum,child)=>sum+count(child),0);
  const cases=[
    ...['title','prologue','sects','legacy','seat','disciples','arts','world','battle','chronicle','saves'].map(page=>({page})),
    ...['recruit','here','affairs'].map(seatTab=>({page:'seat',seatTab})),
    {page:'disciples',rosterView:'table'},{page:'disciples',picking:true},{page:'world',map3d:false},
    ...['arts','wanderers','relics'].map(book=>({page:'chronicle',book})),
    {page:'battle',lastFight:{title:'守山门',verdict:'此战告捷',lines:Array.from({length:8},(_,i)=>'第 '+i+' 条战报')}}
  ];
  const offenders=[];
  for(const part of cases)for(const [mode,node] of Object.entries(createPage({...ctx,ui:{...context().ui,...part}}))) {
    const pages=count(compile(node).root);
    if(pages>14)offenders.push([part.page,part.book??part.rosterView??part.seatTab??'',mode,pages]);
  }
  assert.deepEqual(offenders,[]);
});


test('dynamic English summaries preserve actual date, requirement and rewards',async()=>{
  const {createLocale}=await import('../src/ui/locale.mjs');
  const locale=createLocale('en');
  assert.match(locale.translate('开局有 5 年立足期。若先对某派出兵，对方可反击。'),/\b5\b/);
  assert.match(locale.translate('练到 6 重便能传授他人；练至七重可著成秘笈，人不在了书还在。'),/\b6\b/);
  const meet=locale.translate('第 4 届定于承和9年1月1日，还有 960 日。各派遣一名弟子出战（亲传及以下，掌门、长老与江湖奇人不得下场），夺魁者门派威望 +30、得银 1,000 两，另赠一部本派所缺的秘笈。');
  assert.match(meet,/\b960\b/); assert.match(meet,/\b30\b/); assert.match(meet,/\b1,000\b/);
});

// A clipped list can report an authored rectangle outside the viewport, but
// the fixed scene tools must never be covered by the right command card.
test('notched landscape leaves scene tools clear of the command card', async () => {
  const {compile,SKIN}=await import('../src/ui/native-kit.mjs');
  const {planView}=await import('../vendor/engine/dist/web/view.js');
  for(const [width,height,inset,form] of [[852,393,59,'phone'],[873,325,0,'phone'],[1024,768,0,'tablet']]){
    for(const partial of [{page:'seat',seatTab:'recruit'},{page:'world',map3d:true},{page:'world',map3d:false}]){
      const ctx=context(partial.page); Object.assign(ctx.ui,partial);
      const raw=createPage(ctx),desc=Object.fromEntries(Object.entries(raw).map(([key,node])=>[key,compile(node).root]));
      const screen={x:0,y:0,width,height},safe={x:inset,y:0,width:width-2*inset,height:height-(inset?21:0)};
      const planned=planView({...desc,skin:SKIN},{screen,safe,orientation:'landscape',form});
      const parts=planned.parts;
      const tools=parts.find(({part})=>part.type==='panel'&&part.children?.some(row=>row.children?.some(child=>child.name?.startsWith('act_command-toggle_'))));
      const commands=parts.find(({part})=>part.type==='panel'&&part.children?.some(child=>child.name==='page-rows'));
      assert.ok(tools&&commands,'scene tools and command card');
      assert.ok(tools.rect.x+tools.rect.width+4<=commands.rect.x,
        partial.page+' '+width+'×'+height+' tools '+JSON.stringify(tools.rect)+' overlap commands '+JSON.stringify(commands.rect));
      for(const {part,rect} of parts)if(tools.part.children[0].children.some(child=>child.name===part.name))
        assert.ok(rect.width>=44&&rect.height>=44,part.name+' must remain a real touch target');
    }
  }
});
