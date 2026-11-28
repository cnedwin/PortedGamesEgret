import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../vendor/node-register.mjs';
const {createEngine,createAssetType,createAssetRef,createTexture,createImageData2D,DisplayObjectContainer}
  =await import('@egret/engine');
const {createPointerInput,createKeyboardInput}=await import('@egret/engine/input');
const {createUiSemantics}=await import('@egret/engine/ui/semantics');
const {createUiRoot,createActionControl}=await import('@egret/engine/ui');
const {createCombatHud,combatPadLayout}=await import('../src/ui/combat-hud.mjs');
const {combatGlyphs}=await import('../src/ui/combat-font.mjs');
const {createSnowLocale,SNOW_WORDS}=await import('../src/i18n.mjs');
const {createGame,spawn}=await import('../src/rules/game.mjs');
const {DEFAULT_KEYS,DEEDS}=await import('../src/input.mjs');

const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
test('all seven action boxes meet native safe-target geometry on phone, notch, tablet and desktop designs',()=>{
  for(const [w,h,scale,insets] of [
    [953,354,44/48,[0,0,0,0]],[929,429,44/48,[0,64.4,0,64.4]],[429,930,44/48,[64,0,37,0]],
    [409,728,44/48,[0,0,0,0]],[768,1024,1,[0,0,0,0]],[1024,768,1,[0,0,0,0]]
  ]){
    const [top,right,bottom,left]=insets,safe={x:left,y:top,width:w-left-right,height:h-top-bottom};
    const {cells}=combatPadLayout(safe,scale),boxes=Object.values(cells);
    assert.equal(boxes.length,7);
    for(const [i,b] of boxes.entries()){
      assert.ok(b.width*scale>=44-1e-8&&b.height*scale>=44-1e-8);
      assert.ok(b.x>=safe.x&&b.y>=safe.y&&b.x+b.width<=safe.x+safe.width&&b.y+b.height<=safe.y+safe.height);
      for(const c of boxes.slice(i+1))assert.equal(overlap(b,c),false);
    }
  }
});

test('combat glyph page contains the complete bilingual vocabulary without per-value sources',()=>{
  const glyphs=new Set(combatGlyphs());
  for(const phrase of [...Object.keys(SNOW_WORDS),...Object.values(SNOW_WORDS),'0:12.34 +25 ×3','←↑→↓'])
    for(const ch of phrase)if(ch.codePointAt(0)>=32)assert.ok(glyphs.has(ch),'Missing glyph '+ch+' in '+phrase);
});

async function fixture(t){
  const original=globalThis.OffscreenCanvas;
  // Measurements and pixels in this Node test are synthetic. The real engine
  // still owns the texture lease, BitmapText nodes, hit testing and semantics.
  globalThis.OffscreenCanvas=class{
    constructor(width,height){this.width=width;this.height=height;}
    getContext(){return{measureText(ch){return{width:/^[\x00-\x7f]$/.test(ch)?28:48,actualBoundingBoxLeft:0,actualBoundingBoxRight:30};},strokeText(){},fillText(){}};}
  };
  const engine=await createEngine({host:{surface:{},start(){},stop(){},async close(){},setTimeout(){return()=>{};}}});
  const scope=engine.createScope(),combatLayer=scope.use(new DisplayObjectContainer());engine.stage.addChild(combatLayer);
  let screen={width:953,height:354,scale:44/48,safe:{x:0,y:0,width:953,height:354}},
    inputs={stick:[0,0],held:new Set(),edges:[]},layout,uploads=0;
  const semantics=createUiSemantics(),locale=createSnowLocale('zh'),pointer=createPointerInput({engine,scope,width:953,height:354,size:()=>screen,capacity:16}),
    keyboard=createKeyboardInput({engine,scope});
  const host={scope,combatLayer,pointer,keyboard,semantics,game:{async textureFromCanvas(canvas){
    uploads++;const type=createAssetType('test-snow-hud-font',()=>true),{width,height}=canvas,
      value=createTexture(createImageData2D({width,height,pixels:new Uint8Array(width*height*4)}));
    engine.assets.register(type,{load:async()=>value,dispose:()=>value.dispose()});
    return scope.use(await engine.assets.acquire(createAssetRef(type,'glyphs')));
  }},metrics:()=>({screen,safe:screen.safe,scale:screen.scale,touch:true,portrait:screen.height>screen.width}),
    registerLayout(fn){layout=fn;return()=>{layout=undefined;};},requestPublish(){},
    addSemantic(def){const node=semantics.add(def);scope.use({dispose:()=>node.remove()});return node;}};
  const input={keys:{...DEFAULT_KEYS},hold(name,on){if(on){inputs.held.add(name);inputs.edges.push(name);}else inputs.held.delete(name);},setStick(x,y){inputs.stick=[x,y];}};
  let time=0;
  const begin=(id,x,y)=>pointer.begin({pointerId:id,pointerType:'touch',globalX:x,globalY:y,buttons:1,timestamp:++time*10});
  const move=(held,x,y)=>pointer.move(held,{globalX:x,globalY:y,buttons:1,timestamp:++time*10});
  const end=(held,x,y)=>pointer.end(held,{globalX:x,globalY:y,buttons:0,timestamp:++time*10});
  const cancel=held=>pointer.cancel(held,'lostcapture');
  t.after(async()=>{await engine.dispose();semantics.dispose();if(original===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=original;});
  const hud=await createCombatHud(host,input,{locale}),game=createGame(7),view={screen:(x,y,z)=>[.5,.5,.9]};
  return{engine,hud,game,view,host,locale,inputs,begin,move,end,cancel,get uploads(){return uploads;},resize(next){screen=next;layout();}};
}

test('combat meters have clearly labeled native glyphs in both languages without new texture leases', async t=>{
  const {hud,game,view,locale,host,...f}=await fixture(t);
  hud.setVisible(true);hud.setInteractive(true);hud.update(game,view);
  assert.deepEqual(hud.snapshot().statLabels,['气血','气力','枪意']);
  locale.set('en');hud.setLanguage();hud.update(game,view);
  assert.deepEqual(hud.snapshot().statLabels,['Health','Stamina','Resolve']);
  assert.equal(hud.snapshot().font.pages,1);
  assert.equal(f.uploads,1);
});

test('a late visibilitychange reset after native HUD scope teardown is harmless', async t=>{
  const {hud,game,view,host,inputs}=await fixture(t);
  hud.setVisible(true);hud.setInteractive(true);hud.update(game,view);
  const controls=hud.snapshot();
  assert.equal(controls.pads.guard.available,true);
  // pagehide disposes the overlay before the browser can deliver its final
  // visibilitychange; the same reset callback still clears the gameplay input.
  host.scope.dispose();
  assert.doesNotThrow(()=>hud.releaseTouch());
  assert.equal(inputs.held.size,0);
});

test('native HUD honors and watches the system reduced-motion preference',async t=>{
  const original=globalThis.matchMedia;let listener;
  globalThis.matchMedia=query=>{
    assert.equal(query,'(prefers-reduced-motion: reduce)');
    return {matches:true,addEventListener(type,fn){assert.equal(type,'change');listener=fn;},
      removeEventListener(){listener=undefined;}};
  };
  t.after(()=>{if(original===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=original;});
  const {hud,game,view}=await fixture(t);
  hud.setVisible(true);hud.setInteractive(true);hud.update(game,view);
  assert.equal(hud.flyPickup('coin',0,.5,.5),false,'decorative flight omitted under reduced motion');
  assert.equal(typeof listener,'function');
  listener({matches:false});
  assert.equal(hud.flyPickup('coin',0,.5,.5),true,'the native system preference changes without reloading');
});

test('production native stick and guard maintain separate contact owners, original analogue amplitude, cancel/reset and turn',async t=>{
  const f=await fixture(t),{hud,game,view,inputs}=f;
  const idle=hud.snapshot().font.geometryChanges;hud.update(game,view);assert.equal(hud.snapshot().font.geometryChanges,idle,'title HUD is not updated');
  hud.setVisible(true);hud.setInteractive(true);hud.update(game,view);
  const s=hud.snapshot(),b=s.stick.box,x=b.x+b.width*.5,y=b.y+b.height*.5,g=s.pads.guard.box;
  const stick=f.begin(1,x,y);
  f.move(stick,x+s.stick.radius*.5,y);assert.ok(Math.abs(inputs.stick[0]-.5)<1e-6&&inputs.stick[1]===0);
  const guard=f.begin(2,g.x+g.width/2,g.y+g.height/2);assert.equal(inputs.held.has('guard'),true);
  const refused=f.begin(3,x,y);f.move(refused,x-s.stick.radius,y);f.end(refused,x,y);
  assert.ok(Math.abs(inputs.stick[0]-.5)<1e-6);
  f.move(stick,s.pads.attack.box.x+s.pads.attack.box.width/2,y);
  assert.ok(inputs.stick[0]>.99);assert.equal(inputs.held.has('guard'),true);
  f.end(stick,950,350);assert.deepEqual(inputs.stick,[0,0]);assert.equal(inputs.held.has('guard'),true);
  f.cancel(guard);assert.equal(inputs.held.has('guard'),false);
  const attack=s.pads.attack.box,held=f.begin(4,attack.x+attack.width/2,attack.y+attack.height/2);
  assert.equal(inputs.held.has('attack'),true);hud.setInteractive(false);assert.equal(inputs.held.size,0);
  hud.setInteractive(true);f.end(held,940,340);assert.equal(inputs.held.size,0);
  const next=f.begin(5,x,y);f.move(next,x+s.stick.radius,y);assert.ok(inputs.stick[0]>.9);
  f.resize({width:429,height:920,scale:44/48,safe:{x:0,y:59,width:429,height:820}});
  assert.deepEqual(inputs.stick,[0,0]);assert.equal(hud.snapshot().stick.active,false);
  assert.equal(hud.snapshot().pads.guard.available,true);
  f.end(next,x,y);assert.deepEqual(inputs.stick,[0,0]);
});

test('combat bindings update retained bars, cooldown, counter, bag, loot and projected native marker without another glyph lease',async t=>{
  const f=await fixture(t),{hud,game,view,host,locale}=f;
  hud.setVisible(true);hud.setInteractive(true);hud.update(game,view);
  game.hero.counter=.4;game.hero.starsWait=3;game.hero.will=100;game.hero.gourd=2;game.bag.coin=4;game.boons=['fiveStars'];
  const foe=spawn(game,'blade',0,0,'swift');foe.hp=foe.maxHp/2;
  hud.update(game,view);hud.hint('金环亮起，出枪接回马枪。','attack');hud.note('铜钱 ×4',0);hud.flyPickup('coin',0,.5,.5);
  const s=hud.snapshot();assert.equal(s.pads.attack.label,'回马枪');assert.equal(s.pads.stars.off,true);assert.equal(s.pads.rain.ready,true);
  assert.equal(s.pads.drink.count,2);assert.equal(s.pips.active,1);assert.equal(s.bag.total,4);assert.equal(s.font.pages,1);assert.equal(f.uploads,1);
  host.semantics.publish();
  const tag=host.semantics.snapshot.nodes.find(n=>n.id==='snow-combat:bag').bounds,px=tag.x+tag.width/2,py=tag.y+tag.height/2;
  const swipe=f.begin(1,px,py);f.move(swipe,px+30,py);f.end(swipe,px,py);assert.equal(hud.snapshot().bag.open,false,'swipe is not bag activation');
  const tap=f.begin(2,px,py);f.end(tap,px,py);assert.equal(hud.snapshot().bag.open,true);
  host.semantics.publish();
  assert.ok(host.semantics.snapshot.nodes.some(n=>n.id==='snow-combat:bag-next'));
  host.keyboard.focus('snow-combat:bag-next',{visible:true});
  host.keyboard.keyDown({code:'Enter',key:'Enter'});host.keyboard.keyUp({code:'Enter',key:'Enter'});
  assert.equal(hud.snapshot().bag.page,1);
  assert.equal(host.keyboard.getSnapshot().focusedId,'snow-combat:bag-previous','focus moves to a still-available page arrow');
  locale.set('en');hud.setLanguage();hud.update(game,view);host.semantics.publish();
  assert.equal(hud.snapshot().pads.attack.label,'Returning Spear');assert.equal(hud.snapshot().bag.rows[1].name,'Five Stars');
  assert.equal(hud.snapshot().font.missing,0);assert.equal(f.uploads,1);
  host.keyboard.focus('snow-combat:bag',{visible:true});
  host.keyboard.keyDown({code:'Enter',key:'Enter'});host.keyboard.keyUp({code:'Enter',key:'Enter'});
  assert.equal(hud.snapshot().bag.open,false);
  hud.setStaged(true);assert.equal(hud.snapshot().stick.available,false);assert.equal(Object.values(hud.snapshot().pads).some(p=>p.available),false);
});

test('a fresh native modal must retire physical combat contacts before creating its managed root',async t=>{
  const f=await fixture(t),{engine,hud,game,view,host,inputs}=f;
  hud.setVisible(true);hud.setInteractive(true);hud.update(game,view);
  const state=hud.snapshot(),box=state.stick.box,guard=state.pads.guard.box;
  const x=box.x+box.width/2,y=box.y+box.height/2;
  const oldStick=f.begin(1,x,y);f.move(oldStick,x+state.stick.radius*.5,y);
  const oldGuard=f.begin(2,guard.x+guard.width/2,guard.y+guard.height/2);
  assert.equal(host.pointer.contacts.length,2);
  assert.equal(inputs.held.has('guard'),true);

  // This is the same takeover used when a manual fragment opens the choice
  // modal during combat. Disabling controls clears intentions, not sessions.
  hud.setInteractive(false);
  assert.deepEqual(inputs.stick,[0,0]);assert.equal(inputs.held.size,0);
  assert.equal(host.pointer.contacts.length,2);
  let picked=0;
  const options={engine,scope:host.scope,id:'held-combat-choice',origin:{x:x-32,y:y-24},
    viewport:{width:64,height:48},density:1,input:host.pointer,keyboard:{input:host.keyboard,idPrefix:'held-combat-choice'},
    tree:{id:'choice',kind:'leaf',explicitWidth:64,explicitHeight:48,content:{
      revision:1,
      prepare(context){
        const content=context.scope.use(new DisplayObjectContainer());
        content.touchEnabled=true;content.hitArea={x:0,y:0,width:64,height:48};
        return {content,measuredHeight:48};
      },
      onAttach(context){context.scope.use(createActionControl({input:host.pointer,target:context.content,onActivate:()=>picked++}));}
    }}};
  assert.throws(()=>createUiRoot(options),error=>error?.code==='UI_INPUT_BUSY');
  host.pointer.cancelAll('suspended');
  assert.equal(host.pointer.contacts.length,0);
  assert.equal(host.pointer.state,'active');
  const root=createUiRoot(options);
  try{
    const result=root.commit(await root.prepare());
    assert.equal(result.kind,'committed');assert.deepEqual(result.postCommitErrors,[]);
    assert.equal(f.end(oldStick,x,y),false);assert.equal(f.end(oldGuard,x,y),false);
    assert.equal(picked,0,'old releases cannot choose an option on the new modal');
    const fresh=f.begin(3,x,y);assert.ok(fresh);
    f.end(fresh,x,y);assert.equal(picked,1,'a genuinely new contact activates the visible option');
  }finally{root.dispose();}
});
