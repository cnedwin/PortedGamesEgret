// Exercise the game's native marker pool on real Egret display objects; the
// controlled canvas port and fixtures do not claim GPU/browser performance.
import assert from 'node:assert/strict';
import test from 'node:test';
import { register } from 'node:module';
register('../vendor/node-resolve.mjs', import.meta.url);
const { createEngine, createAssetType, createAssetRef, createTexture, createImageData2D }=await import('@egret/engine');
const {createPerspectiveCamera3D}=await import('@egret/engine/world3d');
const {parseBitmapFont}=await import('@egret/engine/bitmapfont');
const {createJellyMarkers}=await import('../src/ui/markers.mjs');

const walk=(node,name,out=[])=>{
  if(node.name===name)out.push(node);
  for(let i=0;i<(node.numChildren??0);i++)walk(node.getChildAt(i),name,out);
  return out;
};
const shown=node=>{
  for(let n=node;n;n=n.parent)if(!n.visible)return false;
  return true;
};
const center=node=>{
  const b=node.getBounds();return node.localToGlobal(b.x+b.width/2,b.y+b.height/2);
};
async function fixture(t){
  const engine=await createEngine({host:{
    surface:{},start(){},stop(){},async close(){},setTimeout(){return()=>{};}
  }});
  const scope=engine.createScope();
  let calls=0,invalidations=0;
  const rect={left:0,top:0,width:800,height:400,right:800,bottom:400};
  const canvas={getBoundingClientRect:()=>rect};
  const camera=createPerspectiveCamera3D({fov:90,near:.1,far:100});
  camera.aspect=2;
  const screen={width:800,height:400,scale:1,safe:{x:20,y:20,width:760,height:360}};
  const game={stage:engine.stage,scope,screen,invalidate(){invalidations++;},
    async createGlyphFont({characters,fontSize}){
      calls++;const cw=32,ch=56,w=cw*characters.length;
      const font=parseBitmapFont({info:{face:'test glyphs',size:fontSize},common:{lineHeight:ch,base:42,scaleW:w,scaleH:ch},
        pages:['fixture'],chars:[...characters].map((c,i)=>({id:c.codePointAt(0),x:i*cw,y:0,width:cw,height:ch,xoffset:0,yoffset:0,xadvance:cw,page:0}))});
      const type=createAssetType('marker-page',()=>true),value=createTexture(createImageData2D({width:w,height:ch,pixels:new Uint8Array(w*ch*4)}));
      engine.assets.register(type,{load:async()=>value,dispose:()=>value.dispose()});
      const lease=scope.use(await engine.assets.acquire(createAssetRef(type,'digits')));
      return {font,pages:[lease],dispose:()=>lease.release()};
    }
  };
  let markers;t.after(async()=>{markers?.dispose();await engine.dispose();});
  markers=await createJellyMarkers({game,canvas},camera,canvas);
  markers.layout(screen);
  return {engine,markers,screen,calls:()=>calls,invalidations:()=>invalidations};
}
const hit=(amount,crit=false)=>({type:'hit',amount,crit,x:0,y:0,z:-10});
test('native damage and down pools reuse one immutable font, cap each hit batch and let every marker pass scene input',async t=>{
  const {engine,markers,calls}=await fixture(t);
  const damage=walk(engine.stage,'jelly-damage-marker'),down=walk(engine.stage,'jelly-down-marker');
  assert.equal(markers.size,40);assert.equal(damage.length,40);assert.equal(down.length,4);assert.equal(calls(),1);
  markers.setVisible(true);
  markers.consume([hit(1),hit(2,true),hit(9),hit(10),hit(11),hit(12),hit(13)],0);
  markers.update({pandas:[{down:true,x:0,y:-2.2,z:-10}]},0,[]);
  assert.equal(damage.filter(shown).length,5); assert.equal(down.filter(shown).length,1);
  assert.equal(engine.stage.hitTest(400,200),undefined,'native display marker has no gameplay input hit');
  const set=new Set(damage);
  for(let i=1;i<15;i++){
    markers.consume([hit(6),hit(40,true),hit(18),hit(19),hit(20)],i/10);
    markers.update({pandas:[]},i/10,[]);
  }
  assert.deepEqual(new Set(walk(engine.stage,'jelly-damage-marker')),set);
  assert.equal(calls(),1,'no per-hit glyph raster/page creation');
  markers.reset();assert.equal(damage.filter(shown).length,0);assert.equal(down.filter(shown).length,0);
});
test('the native glyph retains screen-space rise and fade, hides at safe edges/protected HUD, then expires without idle invalidation',async t=>{
  const {engine,markers,screen,invalidations}=await fixture(t);
  const glyph=walk(engine.stage,'jelly-marker-glyph')[0];
  const sim={pandas:[]};markers.setVisible(true);markers.consume([hit(12,true)],0);
  markers.update(sim,0,[]);
  assert.ok(shown(glyph));
  const start=center(glyph);assert.ok(Math.abs(start.x-400)<.01&&Math.abs(start.y-200)<.01);
  markers.update(sim,.38,[]);
  const middle=center(glyph);assert.ok(middle.y<start.y-5,'rise survives the native projection anchoring');
  markers.update(sim,.70,[]);
  assert.ok(glyph.alpha<1,'near-expiry glyph has faded');
  markers.update(sim,.71,[{x:0,y:0,width:800,height:400}]);assert.equal(shown(glyph),false);
  markers.update(sim,.72,[]);assert.ok(shown(glyph));
  markers.update(sim,.80,[]);assert.equal(shown(glyph),false);
  const n=invalidations();markers.update(sim,.85,[]);assert.equal(invalidations(),n,'no idle marker invalidation');
  screen.safe={x:0,y:0,width:100,height:100};markers.layout(screen);markers.consume([hit(9)],1);
  markers.update(sim,1,[]);assert.equal(walk(engine.stage,'jelly-damage-marker').filter(shown).length,0);
});

test('closing the native overlay engine directly retires the marker layer and its resources',async t=>{
  const {engine,markers}=await fixture(t);
  markers.setVisible(true);markers.consume([hit(18,true)],0);
  markers.update({pandas:[]},0,[]);
  await engine.dispose();
  assert.doesNotThrow(()=>markers.dispose());
});