import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { Scene3D, createBoxGeometry3D, createPerspectiveCamera3D } = await import('@egret/engine/world3d');
const { createGame }=await import('../src/rules/game.mjs');
const { FOES }=await import('../src/rules/tune.mjs');
const { foePose }=await import('../src/view/figures.mjs');
const { createView }=await import('../src/view/view.mjs');
const { createEffects, impactCue }=await import('../src/view/effects.mjs');

const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const body=root=>root.children.find(node=>node.skeleton);
const emitted=root=>{const m=body(root).material;return [...m.emissive].map(v=>v*m.emissiveIntensity);};
const ruleState=game=>({time:game.time,stage:game.stage,cine:game.cine,events:game.events.length,
  hero:[game.hero.x,game.hero.z,game.hero.hp,game.hero.stamina,game.hero.will,game.hero.safe,game.hero.state],
  boss:[game.boss.x,game.boss.z,game.boss.hp,game.boss.phase,game.boss.state,game.boss.t]});

test('top-down hero retains a cool readable silhouette through the existing protection state',()=>{
  const scene=new Scene3D(),camera=createPerspectiveCamera3D({}),stock=createBoxGeometry3D({}),
    models=new Proxy({}, {get:()=>stock}),game=createGame(7);
  scene.addChild(camera);
  const view=createView(scene,camera,models,{detail:'low',density:.015,particles:.1}),hero=scene.children.find(node=>node.name==='hero');
  try{
    game.hero.state='free';game.hero.safe=0;
    const before=ruleState(game);
    view.update(game,[],1/60,.5);
    const normal=emitted(hero);
    assert.ok(normal[1]>.018&&normal[2]>.026,'separate character-only fill lifts the silhouette, not the snow');
    assert.deepEqual(ruleState(game),before,'view does not alter gameplay state');
    game.hero.safe=.7;
    const protectedState=ruleState(game);
    for(const clock of [1,1.07,1.15,1.25]){
      view.update(game,[],1/60,clock);
      assert.equal(hero.visible,true,'protection feedback cannot hide the entire character');
      const tint=emitted(hero);
      assert.ok(tint[2]>=normal[2]&&tint[2]-normal[2]<.05,'gentle visible pulse with no full-body flash');
    }
    assert.deepEqual(ruleState(game),protectedState);
  }finally{view.disposeCharacters();stock.dispose();}
});

test('the existing Lu Qian rage cinematic has continuous expression rather than a static abrupt spread pose',()=>{
  const sample=t=>{
    const foe={id:2,kind:'lu',sheet:FOES.lu,state:'rage',t,x:0,z:0,face:0,walking:false};
    const [target,rate]=foePose(foe,t,0,undefined,1/60);
    assert.equal(foe.state,'rage');assert.equal(foe.t,t);assert.equal(foe.x,0);assert.equal(foe.z,0);
    assert.ok(rate>0);
    for(const part of ['spine','head','cloak'])assert.ok(target[part].every(Number.isFinite),part);
    return target;
  };
  const prior=sample(.79),next=sample(.82);
  assert.ok(dist(prior.spine,next.spine)<.25,'smooth stand transition at the former abrupt 0.8-second boundary');
  const lifted=sample(1.38),later=sample(1.85),settled=sample(2.56);
  assert.ok(dist(lifted.head,later.head)+dist(lifted.cloak,later.cloak)>.10,'dramatic expression varies through the cinematic');
  const ready=foePose({id:2,kind:'lu',sheet:FOES.lu,state:'roam',t:0,x:0,z:0,face:0,walking:false},2.6,0)[0];
  assert.ok(dist(settled.spine,ready.spine)<.24,'presentation returns toward the established idle silhouette');
});

test('light, heavy, counter and fantasy hit accents reuse one prepared FX program and the existing ring pool',()=>{
  const scene=new Scene3D(),camera=createPerspectiveCamera3D({});scene.addChild(camera);
  const fx=createEffects(scene,camera,{particles:.15});
  const prepared=fx.programs()[0],styles=[impactCue('cut',false),impactCue('cut',true),impactCue('riposte',false),impactCue('star',false)];
  assert.equal(new Set(styles.map(style=>style.k)).size,4,'four distinct retained visual styles');
  assert.ok(styles.every(style=>style.mode===8&&style.life<=.3&&style.power>0));
  assert.ok(styles[3].tint[2]>styles[3].tint[0]&&styles[2].tint[0]>styles[2].tint[2],'blue and gold remain distinguishable');
  let saved,count;
  for(const [i,style] of styles.entries()){
    const cue=fx.spawn('ring',{...style,from:[.2,1,.2],to:[style.radius,1,style.radius]});
    if(i===0){saved=cue.mesh;count=scene.children.length;}
    assert.equal(cue.mesh,saved,'reuse the same effect mesh after previous lifetime');
    assert.equal(cue.shader.key,prepared.material.shader.key);assert.equal(cue.shader.glsl,prepared.material.shader.glsl);
    assert.equal(scene.children.length,count,'no extra GPU pass or accumulating meshes');
    assert.equal(cue.shader.uniforms[3],8);
    fx.update(style.life+.01,i+1);
    assert.equal(cue.mesh.visible,false);
  }
  fx.clear();
});
