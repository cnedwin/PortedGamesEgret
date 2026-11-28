// Exercise sheet descriptions against a real world without a browser or a renderer.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSheet, SHEET_KINDS } from '../src/ui/native-sheets.mjs';
import { createWorld, membersOf, placesOf } from '../src/core/world.mjs';
import { SECT_BY_ID } from '../src/data/sects.mjs';
import { RELICS } from '../src/data/extras.mjs';
import { startUnlocks } from '../src/core/unlocks.mjs';
import { createSlots } from '../src/core/save.mjs';
import { compile, col, scroll, text, row } from '../src/ui/native-kit.mjs';
import '../vendor/node-register.mjs';
const { checkView, planView } = await import('../vendor/engine/dist/web/view.js');
const { createLocale } = await import('../src/ui/locale.mjs');

function fixture(kind, data = {}) {
  const world = createWorld({ seed: 31, playerSect: 'shaolin' });
  const me = () => world.playerSect;
  const books = () => world.sects[me()];
  const leaderOf = (id) => world.persons[world.sects[id].leaderId];
  const picked = () => leaderOf(me());
  const ui = {
    place: placesOf(world, me())[0], buildPlot: null, batch: new Set(), language: 'zh',
    sheet: { kind, ...data }, lastFight: { title: '守山门', won: true, verdict: '此战告捷', lines: ['第一回合'] },
  };
  const local = new Map();
  const storage = { getItem: (k) => local.get(k) ?? null, setItem: (k,v) => local.set(k,v), get length(){return local.size;}, key:(i)=>[...local.keys()][i] };
  const audio = { on: true, volume: 0.5 };
  return {
    world, ui, storage, slots: createSlots(storage), picture: {}, art: null,
    music: audio, voice: audio, worldAmbience: audio, feedbackAudio: audio,
    helpers: {
      me, books, leaderOf, picked, open: () => true, dayText: String,
      founder: (sect) => ({ school: sect.id, name: sect.leader.name, female: sect.leader.female }),
      jobText: () => '休息', jobName: () => '休息', bestArtText: () => '—', jobChoices: () => [['rest','休息']],
      weaponText: () => '空手', waiting: () => [], marchParty: () => membersOf(world, me()).slice(0, 10),
      modNote: () => '', storedQuality: () => null, faceUrl: () => undefined,
    },
  };
}

test('each original Wulin sheet has a native description', () => {
  const kinds = 'guide guard goal load build applicant job batch wheel master move settle march event person assign moment unlock tourney duel season herald outcome siege gear pills meridian create offices retreat fight diplomacy teaching settings editor'.split(' ');
  assert.deepEqual(new Set(SHEET_KINDS), new Set(kinds));
  for (const kind of kinds) {
    const ctx = fixture(kind);
    const p = ctx.helpers.picked();
    const other = Object.keys(SECT_BY_ID).find(id => id !== ctx.helpers.me());
    Object.assign(ctx.ui.sheet, { index: 0, place: SECT_BY_ID[other].seat, person: p.id, sect: other, text: '待你定夺', title: '纪事', label: '告示', features: [{name:'武学',about:'修练'}], was:{silver:0,grain:0,renown:0,members:0,places:0},now:{silver:1,grain:2,renown:3,members:4,places:5},mine:[],abroad:[] });
    const view = createSheet(ctx);
    assert.equal(typeof view?.title, 'string', kind);
    assert.ok(Array.isArray(view.children), kind);
    assert.ok(Array.isArray(view.footer), kind);
    assert.ok(view.children.length || view.footer.length, kind);
    assert.doesNotMatch(JSON.stringify(view), /<(?:select|button|input|dialog|p|div)(?:[ >])/i, kind);
    const native = compile(col([scroll(view.children), ...view.footer], { height:'fill', width:'fill' }));
    assert.doesNotThrow(()=>checkView({root:native.root}),kind);
    const paragraphs=(node)=>Number(!!node.paragraph)+(node.children??[]).reduce((sum,c)=>sum+paragraphs(c),0);
    assert.ok(paragraphs(native.root)<=14,kind+': '+paragraphs(native.root)+' paragraphs');
    for (const rect of [{x:0,y:0,width:393,height:852},{x:0,y:0,width:844,height:390}]) {
      assert.doesNotThrow(()=>planView({root:native.root},{screen:rect,safe:rect,orientation:rect.height>rect.width?'portrait':'landscape',form:'phone'}),kind);
    }
  }
});

test('opening the construction sheet retains the selected kind and validates it against the world', () => {
  const ctx = fixture('build');
  ctx.ui.sheet.buildKind = 'dorm';
  const view = createSheet(ctx);
  assert.equal(ctx.ui.sheet.buildKind, 'dorm');
  assert.match(JSON.stringify(view), /厢房/);
  assert.match(JSON.stringify(view), /兴建/);
});

test('the editor exposes forms for its actual rule operations', () => {
  const ctx = fixture('editor', { sect: 'shaolin' });
  const view = createSheet(ctx);
  const serialized = JSON.stringify(view);
  for (const key of ['ed-silver','ed-grain','ed-art','ed-art-level','ed-item','ed-count','ed-owner','ed-building','ed-revert'])
    assert.ok(serialized.includes(key), key);
});

test('English sheet labels preserve dynamic numbers and proper character names', () => {
  const locale=createLocale('zh');
  assert.equal(locale.translate('掌门手札'),'掌门手札');
  locale.setLanguage('en-US');
  locale.registerNames(['赵山峰']);
  assert.equal(locale.translate('赵山峰'),'Zhao Shanfeng');
  assert.equal(locale.translate('掌门手札'),'Leader’s Handbook');
  assert.match(locale.translate('领赏 银两 +100'),/100/);
  assert.doesNotMatch(locale.translate('招贤榜 · 赵山峰'),/\p{Script=Han}/u);
  const ctx=fixture('guide');
  locale.registerNames(Object.values(ctx.world.persons).map(p=>p.name));
  const view=createSheet(ctx);
  const native=compile(col(view.children),{translate:locale.translate});
  assert.doesNotMatch(JSON.stringify(native.root),/\p{Script=Han}/u,JSON.stringify(locale.missing()));
});

test('representative English sheets have no untranslated authored Chinese text', () => {
  const locale=createLocale('en');
  for(const kind of SHEET_KINDS){
    const ctx=fixture(kind); ctx.ui.language='en';
    locale.registerNames([...Object.values(ctx.world.persons),...Object.values(ctx.world.places).flatMap(p=>p.applicants??[])].map(p=>p.name));
    const p=ctx.helpers.picked(), other=Object.keys(SECT_BY_ID).find(id=>id!==ctx.helpers.me());
    Object.assign(ctx.ui.sheet, { index:0, place:SECT_BY_ID[other].seat, person:p.id, sect:other, text:'待你定夺',title:'纪事',label:'告示',features:[{name:'武学',about:'修练'}],was:{silver:0,grain:0,renown:0,members:0,places:0},now:{silver:1,grain:2,renown:3,members:4,places:5},mine:[],abroad:[] });
    const view=createSheet(ctx);
    locale.translate(view.title);
    compile(col([...view.children,...view.footer]),{translate:locale.translate});
  }
  assert.deepEqual(locale.missing(), []);
});

test('long catalogues, biography, season and tournament stay inside the paragraph budget',()=>{
  const checks=[
    ['guide',ctx=>startUnlocks(ctx.world)],
    ['gear',ctx=>ctx.helpers.books().relics=RELICS.map(r=>r.id)],
    ['person',ctx=>{const p=ctx.helpers.picked();p.talent='heal';p.life=Array.from({length:12},(_,day)=>({day,text:'修练快一成'}));}],
    ['season',ctx=>Object.assign(ctx.ui.sheet,{was:{silver:0,grain:0,renown:0,members:0,places:0},now:{silver:1,grain:2,renown:3,members:4,places:5},title:'纪事',mine:Array.from({length:30},()=>({type:'event',text:'此战告捷'})),abroad:Array.from({length:30},()=>({type:'event',text:'此战告捷'})),growth:Array.from({length:30},()=>['赵山峰','修练快一成'])})],
    ['fight',ctx=>ctx.ui.lastFight.lines=Array.from({length:50},()=> '第一回合')],
    ['tourney',ctx=>{ctx.world.tourney={stage:'call',edition:1,others:Object.values(ctx.world.persons).filter(p=>p.school!==ctx.helpers.me()).slice(0,7).map(p=>p.id)};}],
  ];
  const count=node=>Number(!!node.paragraph)+(node.children??[]).reduce((sum,c)=>sum+count(c),0);
  for(const [kind,prepare] of checks){
    const ctx=fixture(kind);prepare(ctx);
    const view=createSheet(ctx);
    const native=compile(col([...view.children,...view.footer]));
    assert.ok(count(native.root)<=14,kind+': '+count(native.root));
  }
});

test('the handbook exposes its first step and both footer actions without scrolling at 873×325',()=>{
  const ctx=fixture('guide');
  const view=createSheet(ctx);
  assert.equal(view.children[0]._action,'guide-go');
  assert.equal(view.children[0]._data.tab,'build');
  // Actual short-landscape shell: title, scrollable content and a 54-unit footer.
  for(const [width,height] of [[873,325],[393,852]]){
    const locale=createLocale(width===393?'en':'zh');
    const raw=col([text(view.title,{height:44}),scroll(view.children,{name:'guide-body',height:'fill',padding:3,gap:7}),scroll(view.footer,{name:'guide-footer',height:54,padding:2,gap:5})],{width:'94%',height:'96%',anchor:'center',padding:8,gap:6});
    const frame={x:0,y:0,width,height};
    const plan=planView({root:compile(raw,{translate:locale.translate}).root},{screen:frame,safe:frame,orientation:height>width?'portrait':'landscape',form:'phone'});
    const part=name=>plan.parts.find(p=>p.part.name===name);
    const contains=(a,b)=>b.x>=a.x-0.01&&b.y>=a.y-0.01&&b.x+b.width<=a.x+a.width+0.01&&b.y+b.height<=a.y+a.height+0.01;
    assert.ok(contains(part('guide-body').rect,part('guide-first-step').rect),'first step should be fully visible');
    for(const name of ['guide-defence','guide-close']){
      const r=part(name).rect;
      assert.ok(r.width>=44&&r.height>=44,name);
      assert.ok(contains(part('guide-footer').rect,r),name);
    }
  }
});
