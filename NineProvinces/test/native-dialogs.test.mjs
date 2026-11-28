import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const {buildDialog,nativeBuilders}=await import('../src/ui/native-dialog-builders.mjs');
const {createNativeDialogs}=await import('../src/ui/native-dialogs.mjs');
const {createNativeRangeSemantics}=await import('../src/ui/native-range-semantics.mjs');
const {createUiSemantics}=await import('@egret/engine/ui/semantics');
const {setLanguage,t}=await import('../src/i18n.mjs');
const samples=[{width:1280,height:720},{width:390,height:844},{width:873,height:325}];
function setup(){
 const calls=[];const app={settings:{sound:true,music:true,reducedMotion:false,musicVolume:.55,effectsVolume:.8},state:{player:'han'},
  sound:{play(...x){calls.push(['sound',...x]);},setVolumes(...x){calls.push(['preview',...x]);}},
  setSetting(k,v){this.settings[k]=v;calls.push(['setting',k,v]);},setLanguage(v){setLanguage(v);calls.push(['lang',v]);},
  slotSummary(slot){return slot==='2'?{name:{zh:'自建势力',en:'Custom Banner'},faction:'player',colour:0x446633,flag:'義',day:30,cities:2,savedAt:'2026-01-28T00:00:00Z'}:null;},
  act(...x){calls.push(['act',...x]);},loadSlot(...x){calls.push(['load',...x]);},exportFile(){calls.push(['export']);},pickImportFile(){calls.push(['import']);},toTitle(){calls.push(['title']);},open(...x){calls.push(['open',...x]);},afterDialog(){calls.push(['after']);},dialogs:{close(...x){calls.push(['close',...x]);}}};
 return {app,calls};
}
const build=(name,app,args={},size=samples[0])=>buildDialog(name,app,args,()=>{},{...size},{importSave:()=>app.pickImportFile()});
const nodes=(tree)=>{const result=[];function walk(part){result.push(part);for(const c of part.children??[])walk(c);}walk(tree);return result;};

test('three B2 native modal descriptions validate and remain in the safe area in both languages and short screens',()=>{
 const {app}=setup();assert(['confirmProgress','saves','settings'].every(name=>Object.hasOwn(nativeBuilders,name)));
 for(const lang of ['zh','en']){setLanguage(lang);for(const size of samples){for(const [name,args] of [['settings',{}],['saves',{}],['confirmProgress',{reason:'leave',proceed(){}}]]){
   const spec=build(name,app,args,size),parts=nodes(spec.description.root),names=new Set(parts.map(n=>n.name).filter(Boolean));
   assert(spec.description.modal&&spec.description.uiScale);assert(names.has(spec.initialFocus));assert(names.has('dialog-body'));
   const root=spec.description.root;assert(root.anchor==='center'&&root.width<=size.width&&root.height<=size.height);
   const body=parts.find(n=>n.name==='dialog-body');assert.equal(body.scroll,'vertical');assert.equal(body.height,'fill');
   for(const name of Object.keys(spec.bind))assert(names.has(name));
   for(const part of parts.filter(x=>x.type==='button'||x.name?.endsWith('-slider')))assert(part.height>=48&&(part.width==='fill'||part.width>=44),part.name+' retains its authored hit target');
 }}}
});

test('settings retain independent sliders with exact original integer range and volume actions',()=>{
 setLanguage('zh');const {app,calls}=setup(),spec=build('settings',app);
 assert.deepEqual(spec.ranges.map(x=>[x.name,x.min,x.max,x.step,x.value]),[['musicVolume-slider',0,100,1,55],['effectsVolume-slider',0,100,1,80]]);
 const vol=spec.ranges[0];vol.preview(0);vol.commit(0);assert.equal(app.settings.musicVolume,0);assert.equal(app.settings.effectsVolume,.8);
 spec.bind['setting-sound-off'].tap();assert.equal(app.settings.sound,false);assert.equal(app.settings.music,true);
 assert.equal(spec.bind['setting-sound-off'].label(),t('sound')+' · '+t('off'));
 assert(calls.some(x=>x[0]==='preview'));
 assert(nodes(spec.description.root).some(n=>n.name==='musicVolume-slider'&&n.semantic!==false&&n.role==='button'));
 assert(nodes(spec.description.root).some(n=>n.name==='musicVolume-meter'&&n.semantic===false));
});

test('range semantic adapter keeps the native focus target and modal ancestry, without duplicating nodes',()=>{
 const tree=createUiSemantics(),{semantics,sliderSemanticMeta}=createNativeRangeSemantics(tree);
 const rect={x:10,y:20,width:100,height:48};let focus=false,hidden=false,activations=0;
 tree.add({id:'settings-view',role:'dialog',describe:()=>({name:'Settings',bounds:rect,modal:true})});
 const meta={label:'Music volume',min:0,max:100,value:55};sliderSemanticMeta.set('musicVolume-slider',meta);
 const id='settings-view:musicVolume-slider';semantics.add({id,role:'button',parent:'settings-view',
  describe:()=>({name:'placeholder',bounds:rect,focused:focus,disabled:false,hidden}),onActivate(){activations++;},onFocus(){focus=true;}});
 const unrelated='settings-view:close';semantics.add({id:unrelated,role:'button',parent:'settings-view',describe:()=>({name:'Close',bounds:rect})});
 let snap=semantics.publish(),node=snap.nodes.find(n=>n.id===id);
 assert.equal(node.role,'slider');assert.equal(node.parent,'settings-view');assert.equal(node.range.now,55);assert.equal(node.inert,false);
 assert.equal(snap.nodes.filter(n=>n.role==='slider').length,1);assert.equal(snap.nodes.find(n=>n.id===unrelated).role,'button');
 assert(semantics.perform(id,'focus'));assert.equal(semantics.perform(id,'activate'),false);assert.equal(activations,0);
 meta.value=0;snap=semantics.publish();node=snap.nodes.find(n=>n.id===id);assert(node.focused);assert.equal(node.range.now,0);assert.deepEqual(node.bounds,rect);
 hidden=true;focus=false;assert(!semantics.publish().nodes.some(n=>n.id===id));tree.dispose();
});

test('save slot actions name the exact slot, preserve custom save banner, import/export and confirmation business calls',()=>{
 setLanguage('en');const {app,calls}=setup(),spec=build('saves',app);
 assert(!spec.bind['slot-auto-save']);assert(!spec.bind['slot-1-load']);assert(spec.bind['slot-2-load']);
 for(const n of [1,2,3])assert(spec.bind[`slot-${n}-save`].label().includes(String(n)));
 assert(spec.bind['slot-2-load'].label().includes('2'));
 const flat=nodes(spec.description.root);assert(flat.some(n=>n.text?.includes('Custom Banner')));
 spec.bind['slot-3-save'].tap();spec.bind['slot-2-load'].tap();spec.bind['save-export'].tap();spec.bind['save-import'].tap();
 let ran=0;const conf=build('confirmProgress',app,{reason:'leave',backToSaves:true,proceed(){ran++;}});
 conf.bind['dialog-cancel'].tap();conf.bind['confirm-proceed'].tap();assert.equal(ran,1);
 assert.deepEqual(calls.filter(x=>['act','load','export','import','open','close'].includes(x[0])),[['act','saveSlot','3'],['load','2'],['export'],['import'],['open','saves'],['close',true]]);
});

test('controller opens a single native modal, replaces it and retires old handle without duplicated close or stale names',async()=>{
 const {app,calls}=setup(),views=[];let active=null;
 const game={safe:samples[0],uiScale:1,show(description,opts){
   const v={description,opts,visible:true,focused:opts.initialFocus,offset:0,disposed:false,scroll(){return {offset:v.offset,scrollTo(n){v.offset=n;}};},focus(n){v.focused=n;return true;},show(){v.visible=true;},hide(){v.visible=false;},cover(){v.hide();},reveal(){v.show();},activate(){active=v;},deactivate(){if(active===v)active=null;},dispose(){assert(!v.disposed,'disposed once');v.disposed=true;}};views.push(v);return v;
 }};const errors=[];const d=createNativeDialogs(app,{game,onError:e=>errors.push(e)});app.dialogs=d;
 assert.equal(d.open('not-a-dialog'),false);assert.equal(d.open('saves'),true);await new Promise(r=>setTimeout(r,0));assert.equal(d.name,'saves');assert.equal(active,views[0]);
 views[0].offset=42;d.render();assert(views[0].disposed);assert.equal(d.view.offset,42);
 d.open('confirmProgress',{reason:'overwrite',proceed(){}});await new Promise(r=>setTimeout(r,0));assert.equal(d.name,'confirmProgress');assert(d.view&&!d.view.disposed);
 d.close();await new Promise(r=>setTimeout(r,0));assert.equal(d.name,null);assert.equal(app.dialogOpen,false);assert(views.every(v=>v.disposed));assert.equal(errors.length,0);d.dispose();
});
