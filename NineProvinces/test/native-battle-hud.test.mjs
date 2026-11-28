import '../vendor/node-register.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { buildBattleHudDescription, layoutBattleHud, createBattleHudModelStore, makeBattleControl, makeBattleText } = await import('../src/ui/native-battle-hud.mjs');

const fixture=()=>({title:'Battle title',subtitle:'Faction A · Faction B',phase:'deploy',phaseTitle:'Deployment',clock:'1:07',wind:'Wind',timeShare:.7,objectives:[{id:'keep',label:'Objective',text:'0/10',share:0,color:0xc5a95c}],controls:[makeBattleControl('pause','Pause',()=>{}),makeBattleControl('speed-1','1×',()=>{})],owned:[{id:0,name:'Unit A',type:'Unit',portrait:'a.png',troops:'6000',morale:75,rage:30,share:.8,status:['Ready'],selected:true,select:()=>{},actions:[makeBattleControl('formation-0','Formation A',()=>{})]}],enemy:[{id:1,name:'Unit B',type:'Unit',troops:'5000',morale:68,rage:0,share:.7,status:[],selected:false,select:()=>{},actions:[]}],command:{title:'Command',selection:'Unit A',tools:[makeBattleControl('overview','Overview',()=>{})],rows:[makeBattleText('instruction','An existing game instruction.'),makeBattleControl('begin','Begin',()=>{})]},feed:[{text:'A note',tone:'good'}],footer:{text:'Help',actions:[]}});
const names=(node,out=new Map())=>{if(node.name){assert(!out.has(node.name),node.name);out.set(node.name,node.type)}node.children?.forEach(n=>names(n,out));return out;};

test('Native battle layout reserves a clear center, all panels stay in safe area across phone and desktop',()=>{
 for(const [width,height] of [[568,320],[873,325],[852,393],[390,844],[768,1024],[1280,720]]){
   const m=layoutBattleHud(width,height,1), panels=[m.top,m.own,m.enemy,m.command,m.feed];for(const p of panels){assert(p.x>=0&&p.y>=0&&p.x+p.width<=width+1e-7&&p.y+p.height<=height+1e-7);}
   if(width>height){const x=width/2,y=height*(m.wide ? .40 : .64);assert(![m.own,m.command,m.enemy].some(p=>x>p.x&&x<p.x+p.width&&y>p.y&&y<p.y+p.height),`${width}x${height}`);}else assert(m.command.y>height*.5);
 }
});
test('Battle controls are named, dynamic values bind to latest model and disabled old callbacks do not fire',()=>{
 const store=createBattleHudModelStore(),model=fixture();let calls=0;model.controls[0].action=()=>calls++;store.update(model);
 const {description,bind}=buildBattleHudDescription(store,layoutBattleHud(873,325,1));const all=names(description.root);for(const id of Object.keys(bind))assert(all.has(id),id);assert(all.has('battle-overview'));
 bind['battle-pause'].tap();assert.equal(calls,1);model.controls[0].disabled=true;store.update(model);assert(bind['battle-pause'].disabled());bind['battle-pause'].tap();assert.equal(calls,1);
 model.controls[0].disabled=false;model.controls[0].text='Resume';model.controls[0].action=()=>calls+=10;store.update(model);assert.equal(bind['battle-pause'].text(),'Resume');bind['battle-pause'].tap();assert.equal(calls,11);
});
test('UI-only update does not alter simulation input or recreate authored fixed layout',()=>{
 const store=createBattleHudModelStore(),m=fixture();store.update(m);const a=buildBattleHudDescription(store,layoutBattleHud(1280,720,1));
 m.owned[0].troops='5930';m.owned[0].rage=42;store.update(m);const b=buildBattleHudDescription(store,layoutBattleHud(1280,720,1));
 assert.deepEqual(a.description,b.description);assert.equal(b.bind['battle-unit-0-troops'].text(),'5930');assert.equal(b.bind['battle-unit-0-rage'].value(),.42);
});

test('Pinned engine planner validates the authored parts and native touch target geometry',  async()=>{
 const {checkView,planView}=await import('@egret/engine/web/view');const store=createBattleHudModelStore();store.update(fixture());
 for(const [width,height] of [[568,320],[873,325],[852,393],[390,844],[768,1024],[1280,720]]){
   const {description}=buildBattleHudDescription(store,layoutBattleHud(width,height,1));checkView(description);const safe={x:0,y:0,width,height};const plan=planView(description,{screen:safe,safe,orientation:height>width?'portrait':'landscape'});assert(plan.names.has('battle-unit-0'));assert(plan.names.has('battle-begin'));
   for(const {part,rect}of plan.parts.filter(p=>p.part.type==='button'||p.part.type==='toggle'||p.part.role==='button')){assert(rect.width>=44-1e-6&&rect.height>=44-1e-6,`${width}x${height} ${part.name} ${rect.width}x${rect.height}`);}
 }
});
test('Retired native controls retain a valid semantic name while disabled until structural commit',()=>{
 const store=createBattleHudModelStore(),m=fixture();store.update(m);const old=buildBattleHudDescription(store,layoutBattleHud(1280,720,1));const calls=[];m.controls[0].action=()=>calls.push(1);m.controls.shift();store.update(m);assert.equal(old.bind['battle-pause'].label(),'Pause');assert.equal(old.bind['battle-pause'].text(),'Pause');assert.equal(old.bind['battle-pause'].disabled(),true);old.bind['battle-pause'].tap();assert.deepEqual(calls,[]);
});

test('five portrait battle header actions keep 44 CSS px on a tall 360px phone',async()=>{
 const {planView}=await import('@egret/engine/web/view');
 const store=createBattleHudModelStore(),m=fixture(),scale=44/48,width=360/scale,height=776/scale;
 m.controls=['bpause','bs0','bs1','bs2','leave-trial'].map((id,i)=>makeBattleControl(id,['Continue','1×','2×','4×','Leave'][i],()=>{}));store.update(m);
 const {description}=buildBattleHudDescription(store,layoutBattleHud(width,height,scale)),safe={x:0,y:0,width,height};
 const plan=planView(description,{screen:safe,safe,orientation:'portrait'});
 for(const id of m.controls.map(c=>'battle-'+c.id)){const item=plan.parts.find(x=>x.part.name===id);assert(item&&item.rect.width*scale>=44-.01&&item.rect.height*scale>=44-.01,id);}
});
