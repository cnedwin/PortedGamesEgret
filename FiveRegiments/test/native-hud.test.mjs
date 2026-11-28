import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const { hudMetrics, touchLayout } = await import('../src/hud.mjs');

test('native HUD CSS projection and safe rectangle share the engine screen plan',()=>{
  const game={screen:{x:-30,y:0,width:960,height:360},safe:{x:20,y:10,width:850,height:330},browser:{screen:{scale:1.2}}};
  const m=hudMetrics(game);
  assert.equal(m.scale,1.2);
  assert.deepEqual(m.screen,{left:0,top:0,right:1152,bottom:432,width:1152,height:432});
  assert.deepEqual(m.safe,{left:60,top:12,right:1080,bottom:408,width:1020,height:396});
  assert.deepEqual(m.project(120,60),[70,50]);
});
test('all native touch targets fit short landscape, phone portrait and tablet safe areas',()=>{
  const ids=['attack','guard','kick','step','skill0','skill1','art','offArt','swap','mount','heal'];
  for(const [w,h,l,t,r,b] of [[873,325,50,0,50,18],[852,393,59,0,59,16],[844,390,0,0,0,0],[390,844,0,0,0,0],[393,852,0,24,0,28],[768,1024,0,24,0,28],[1024,768,0,0,0,0],[768,720,0,0,0,0],[1280,800,0,0,0,0]]){
    const safe={left:l,top:t,right:w-r,bottom:h-b,width:w-l-r,height:h-t-b};
    const box=touchLayout(safe,ids);
    const entries=Object.entries(box);
    for(const [id,a] of entries){assert(a.width>=44&&a.height>=44,id+' too small');assert(a.x>=l&&a.y>=t&&a.x+a.width<=w-r+.01&&a.y+a.height<=h-b+.01,id+' out of safe area');}
    for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
      const [ia,a]=entries[i],[ib,b]=entries[j];
      assert(a.x+a.width<=b.x+.01||b.x+b.width<=a.x+.01||a.y+a.height<=b.y+.01||b.y+b.height<=a.y+.01,ia+'/'+ib+' overlaps');
    }
    assert(box.look.width>=44&&box.look.height>=44);
  }
});
const { Sprite }=await import('@egret/engine');
const { createHud }=await import('../src/hud.mjs');
const { createFight }=await import('../src/sim/fight.mjs');
const { createUiSemantics }=await import('@egret/engine/ui/semantics');
test('battle HUD builds native shapes and named status for old duel data',()=>{
  const ui=new Sprite(),semantics=createUiSemantics(),screen={x:0,y:0,width:1280,height:720};
  const game={ui,screen,safe:screen,browser:{screen:{scale:1},onScreenChange:()=>()=>{}},
    text(value,o){const n=new Sprite();n.text=String(value);Object.assign(n,{x:o.x??0,y:o.y??0,size:o.size??16,color:o.color});o.layer.addChild(n);return n;}};
  const hud=createHud(game,{semantics});
  const f=createFight({hero:{regiment:'tiger'},foes:[{regiment:'archer'},{regiment:'plume'}]});
  hud.setup(f);hud.show(true);
  hud.update(1/60,f,{line:'R',preparedLine:'R',incoming:{line:'O',kind:'kick',progress:.7},project:()=>[640,240],input:{keyHints:true}});
  hud.number([640,240],10,'crit');hud.toast('OK');hud.banner('Fight');
  assert.deepEqual(hud.snapshot(),{visible:true,skillCount:3,slotCount:10,compass:true,plates:2});
  const published=semantics.publish();assert(published.nodes.some(n=>n.id==='battle-hp'&&!n.hidden));
  hud.show(false);assert.equal(semantics.publish().nodes.some(n=>n.id==='battle-hp'),false);
  hud.dispose();semantics.dispose();ui.dispose();
});

test('HUD labels rasterize at matching stage density without changing CSS size',()=>{
  const ui=new Sprite(),screen={x:0,y:0,width:1280,height:720};let scale=.45;const labels=[];
  const browser={get screen(){return {scale};},onScreenChange:()=>()=>{}};
  const game={ui,screen,safe:screen,browser,text(value,o){
    const n=new Sprite();n.text=String(value);Object.assign(n,{x:o.x??0,y:o.y??0,size:o.size??16,color:o.color});o.layer.addChild(n);labels.push(n);return n;}};
  const hud=createHud(game);
  const f=createFight({hero:{regiment:'tiger'},foes:[{regiment:'archer'}]});
  hud.setup(f);hud.show(true);
  const title=labels.find(n=>n.text==='虎步营'||n.text==='Tiger Step');
  // The exact role name can differ by localization; the self name is the nonempty 16-CSS-pixel label.
  const self=title??labels.find(n=>n.text&&Math.abs(n.size*n.scaleX-16)<.01);
  assert(self);
  assert(Math.abs(self.size-16/scale)<.01);
  assert(Math.abs(self.scaleX-scale)<.001);
  assert(Math.abs(self.size*self.scaleX-16)<.01);
  scale=.75;hud.show(true);
  assert(Math.abs(self.size-16/scale)<.01);
  assert(Math.abs(self.size*self.scaleX-16)<.01);
  hud.dispose();ui.dispose();
});
test('opening banner, objective, self status and pause lane do not overlap on narrow touch screens',()=>{
  const fight=createFight({hero:{regiment:'plume'},foes:[{regiment:'tiger'}]});
  for(const [w,h,left,top,right,bottom] of [[375,667,0,0,0,0],[393,852,0,59,0,34],[852,393,59,0,59,21],[873,325,0,0,0,18],[768,1024,0,0,0,0]]){
    const ui=new Sprite(),screen={x:0,y:0,width:w,height:h},safe={x:left,y:top,width:w-left-right,height:h-top-bottom};
    const game={ui,screen,safe,browser:{screen:{scale:1},onScreenChange:()=>()=>{}},
      text(value,o){const n=new Sprite();n.text=String(value);Object.assign(n,{x:o.x??0,y:o.y??0,size:o.size??16,color:o.color});o.layer.addChild(n);return n;}};
    const hud=createHud(game,{touch:true});hud.setup(fight);hud.show(true);hud.objective('Objective');hud.banner('Fight','County',2,'start');
    const panels=hud.root.getChildByName('battle-panels'),me=panels.getChildByName('fighter-status'),compass=panels.getChildByName('compass'),
      objective=panels.getChildByName('objective'),banner=hud.root.getChildByName('banner');
    const bound=(n)=>{const r=n.getChildByName('frame');return {x:n.x+r.x,y:n.y+r.y,w:r.width,h:r.height};};
    const overlaps=(a,b)=>a.x<b.x+b.w-.01&&b.x<a.x+a.w-.01&&a.y<b.y+b.h-.01&&b.y<a.y+a.h-.01;
    const a=bound(me),b=bound(banner),c=bound(compass),d=bound(objective);
    const pause={x:w-right-56,y:top+6,w:48,h:48};
    for(const [x,y] of [[a,b],[a,c],[a,d],[c,pause],[b,pause],[b,d]])assert(!overlaps(x,y),JSON.stringify({w,h,x,y}));
    hud.dispose();ui.dispose();
  }
});
