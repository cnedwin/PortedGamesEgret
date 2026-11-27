import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const {
  createEngine, createAssetType, createAssetRef, createTexture, createImageData2D, DisplayObjectContainer
}=await import('@egret/engine');
const {raceGlyphs,glyphText,createRaceFont}=await import('../src/ui/race-font.mjs');
const {createRaceMinimap,mapProjection,MAP_SIZE}=await import('../src/ui/race-map.mjs');
const {raceClock}=await import('../src/ui/race-hud.mjs');
const {TEXT,ITEMS,RACERS}=await import('../src/data.mjs');
const {createTrack}=await import('../src/track.mjs');

const hostAdapter=()=>({surface:{},start(){},stop(){},async close(){},setTimeout(){return()=>{};}});
test('race glyph page covers countdowns, both languages, every item and all drift and boost feedback',()=>{
  const available=new Set(raceGlyphs()),values=['0:59.99','12:00.00','×3','1/10','?'];
  for(const t of Object.values(TEXT)){
    values.push(t.lap,...t.place,t.go,t.finalLap,t.wrongWay,t.finish,t.kmh,t.coins,t.driftBuild,...t.driftTiers,t.driftRelease,
      ...Object.values(t.popups).flat());
  }
  for(const item of Object.values(ITEMS))values.push(item.icon,item.name.zh,item.name.en);
  for(const text of values)for(const ch of glyphText(text))assert.ok(available.has(ch),'Missing glyph '+ch+' in '+text);
  assert.equal(available.has('\uFE0F'),false,'emoji variation selectors are not standalone atlas tiles');
  assert.equal(raceClock(59.999),'1:00.00');
  assert.equal(raceClock(83.456),'1:23.46');
});

test('the native race bitmap label accepts first text before placement, changes geometry without any new atlas lease',async()=>{
  // Deliberately use synthetic glyph measurements/pixels for this pure lifecycle test.
  // Visual raster and GPU upload checks live in the browser acceptance.
  const before=globalThis.OffscreenCanvas;
  class FixtureCanvas {
    constructor(width,height){this.width=width;this.height=height;}
    getContext(){
      return {measureText(ch){return {width:/^[\x00-\x7f]$/.test(ch)?38:66,actualBoundingBoxLeft:0,actualBoundingBoxRight:40};},
        strokeText(){},fillText(){}};
    }
  }
  globalThis.OffscreenCanvas=FixtureCanvas;
  const engine=await createEngine({host:hostAdapter()});
  const scope=engine.createScope();
  try{
    let uploads=0;
    const game={async textureFromCanvas(canvas){
      uploads++;
      const {width,height}=canvas,type=createAssetType('rally-fixture-hud-atlas',()=>true);
      const value=createTexture(createImageData2D({width,height,pixels:new Uint8Array(width*height*4)}));
      engine.assets.register(type,{load:async()=>value,dispose:()=>value.dispose()});
      return scope.use(await engine.assets.acquire(createAssetRef(type,'glyphs')));
    }};
    const font=await createRaceFont({scope,game}),parent=scope.use(new DisplayObjectContainer());
    engine.stage.addChild(parent);
    const label=font.label(parent);
    // A countdown event may be received before the label first has a layout rect.
    label.setText('3');
    assert.ok(Number.isFinite(label.root.x)&&Number.isFinite(label.root.y));
    label.rect(10,20,100,60,42);
    for(const text of ['出发！','最后一圈！','Release drift to boost','0:12.34',ITEMS.cuju.icon,'×3']){
      label.setText(text);assert.equal(label.missing,0,text);assert.ok(Number.isFinite(label.root.x));assert.ok(label.width<=100.01);
    }
    const count=font.info().geometryChanges;
    label.setText('×3');
    assert.equal(font.info().geometryChanges,count,'unchanged text is not laid out again');
    assert.equal(uploads,1,'one lease created for all labels and updates');
    assert.equal(font.info().pages,1);
  }finally{await engine.dispose();if(before===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=before;}
});

test('native minimap keeps one circuit shape and a stable marker pool with bounded projection',async()=>{
  const track=createTrack(),project=mapProjection(track);
  for(let i=0;i<track.count;i++){
    assert.ok(project.x(track.px[i])>=5.99&&project.x(track.px[i])<=MAP_SIZE-5.99);
    assert.ok(project.y(track.pz[i])>=5.99&&project.y(track.pz[i])<=MAP_SIZE-5.99);
  }
  const engine=await createEngine({host:hostAdapter()});
  const scope=engine.createScope(),parent=scope.use(new DisplayObjectContainer());
  engine.stage.addChild(parent);
  try{
    const map=createRaceMinimap(parent,scope,track),root=map.root,oldCount=root.numChildren;
    const children=Array.from({length:oldCount},(_,i)=>root.getChildAt(i));
    const karts=RACERS.map((_,i)=>({racer:i,x:track.px[i],z:track.pz[i],heading:0}));
    map.rect(8,8,96);
    for(let frame=0;frame<120;frame++){
      karts.forEach((kart,i)=>{const n=(frame*4+i)%track.count;kart.x=track.px[n];kart.z=track.pz[n];kart.heading=frame*.03;});
      map.update({human:karts[0],karts});
      assert.equal(root.numChildren,oldCount);
    }
    assert.deepEqual(Array.from({length:oldCount},(_,i)=>root.getChildAt(i)),children);
    assert.deepEqual(map.info(),{trackShapes:1,markerPool:RACERS.length+1,updates:120});
    map.reset();for(const child of children.slice(1))assert.equal(child.visible,false);
  }finally{await engine.dispose();}
});
