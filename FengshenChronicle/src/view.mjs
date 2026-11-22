// Native Egret 2D battlefield. Only texture preparation uses a canvas; the
// moving view is an Egret display list with pooled sprites and a depth lane.
import { Bitmap, DisplayObjectContainer, Sprite, createSharedMaterial2D } from '@egret/engine';
import { MAPS } from './sim/data.mjs';
import { buildArt } from './art/paint.mjs';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const HURT=createSharedMaterial2D({light:[1,1,1,1],dark:[.5,.16,.1]});
const GOLD=createSharedMaterial2D({light:[1,.95,.72,1],dark:[.27,.12,.02]});
const WHITE=createSharedMaterial2D({light:[1,1,1,1],dark:[.55,.5,.35]});
const HIT_TTL=.16, FX_LIMIT=56;

export async function createView(game,scope,{width=1280,height=720,reducedMotion=false}={}){
  const art=await buildArt(game,scope,MAPS),use=x=>scope.use(x);
  const root=use(new DisplayObjectContainer()),world=root.addChild(use(new DisplayObjectContainer()));
  const groundLane=world.addChild(use(new DisplayObjectContainer())),underLane=world.addChild(use(new DisplayObjectContainer())),
    depthLane=world.addChild(use(new DisplayObjectContainer())),fxLane=world.addChild(use(new DisplayObjectContainer()));
  const warning=underLane.addChild(use(new Sprite())),pathLine=underLane.addChild(use(new Sprite()));
  const camera={x:0,y:0,zoom:1,width,height,mapId:null};
  const scenery={},grounds={},actors=new Map(),drops=new Map(),flashes=new Map(),effects=[],effectPool=[],numbers=[],numberPool=[];
  let time=0,lastState,activeMap=null,hitShake=0,disposed=false,fxMade=0,numberMade=0;
  const frameStats={actors:0,scenery:0,effects:0,textures:3+Object.values(art.structures).reduce((n,a)=>n+a.length,0),native2D:true};

  function setFrame(bitmap,key){
    if(bitmap.frameKey===key)return;
    const f=art.frames[key];if(!f)return;
    bitmap.sourceRect={x:f.x,y:f.y,width:f.width,height:f.height};
    bitmap.anchorOffsetX=f.width/2;bitmap.anchorOffsetY=f.pivotY*art.res;
    bitmap.scaleX=bitmap.scaleY=1/art.res;bitmap.frameKey=key;
  }
  function sprite(key,parent){const b=parent.addChild(use(new Bitmap(art.atlas)));setFrame(b,key);return b;}
  for(const [id,map] of Object.entries(MAPS)){
    const b=groundLane.addChild(use(new Bitmap(art.grounds[id].lease)));b.visible=false;grounds[id]=b;
    scenery[id]=art.structures[id].map((s,index)=>{
      const b=depthLane.addChild(use(new Bitmap(s.lease)));b.anchorOffsetX=s.pivotX;b.anchorOffsetY=s.pivotY;b.x=s.x;b.y=s.y;b.visible=false;
      return {node:b,y:s.y,id:'scenery:'+id+':'+index};
    });
  }
  const portal=sprite('portal',underLane),hero=sprite('heroBack:0',depthLane),heroSelection=underLane.addChild(use(new Sprite())),
    artifact=sprite('ring',fxLane),charm=sprite('seal',depthLane),quest=sprite('quest',fxLane),
    weaponAura=sprite('sword',depthLane),weaponBlade=sprite('sword',depthLane);
  hero.id='hero';artifact.visible=charm.visible=quest.visible=weaponAura.visible=weaponBlade.visible=false;

  function updateCamera(state,dt,snap=false){
    const map=MAPS[state.mapId],z=width<700?.92:width>1400?1.12:1.04;
    const cx=clamp(state.hero.x-width/(2*z),0,Math.max(0,map.width-width/z)),
      cy=clamp(state.hero.y-height*.64/z,0,Math.max(0,map.height-height/z));
    camera.zoom=z;const ease=snap||reducedMotion?1:1-Math.exp(-9*Math.max(0,dt));
    camera.x+=(cx-camera.x)*ease;camera.y+=(cy-camera.y)*ease;
    const sx=reducedMotion?0:Math.sin(time*79)*hitShake,sy=reducedMotion?0:Math.cos(time*63)*hitShake*.6;
    world.scaleX=world.scaleY=z;world.x=-camera.x*z+sx;world.y=-camera.y*z+sy;
    hitShake=Math.max(0,hitShake-dt*18);
  }
  function changeMap(state){
    activeMap=state.mapId;camera.mapId=activeMap;
    for(const [id,b] of Object.entries(grounds))b.visible=id===activeMap;
    for(const [id,list] of Object.entries(scenery))for(const s of list)s.node.visible=id===activeMap;
    for(const a of actors.values()){a.body.visible=false;a.bar.visible=false;}
    for(const d of drops.values())d.body.visible=d.glow.visible=false;
    for(const fx of effects){fx.body.visible=false;effectPool.push(fx);}effects.length=0;
    for(const n of numbers){n.root.visible=false;numberPool.push(n);}numbers.length=0;
    flashes.clear();const p=MAPS[activeMap].portal;portal.x=p.x;portal.y=p.y;
    updateCamera(state,0,true);
  }
  function actorEntry(id,kind){
    let a=actors.get(id);if(a)return a;
    const body=sprite(kind+':0',depthLane),bar=fxLane.addChild(use(new Sprite()));
    a={id,body,bar,kind,hp:-1,maxHp:0};actors.set(id,a);return a;
  }
  function bodyFrame(body,kind,who){
    const angle=Number.isFinite(who.facing)?who.facing:Math.PI/2,
      back=Math.sin(angle)<-.36,walking=who.action==='walk'||who.state==='walk',f=walking?Math.floor(time*8)%4:0;
    setFrame(body,kind+(back?'Back':'')+':'+f);
    body.scaleX=(Math.cos(angle)<-.22?-1:1)/art.res;
    body.x=who.x;body.y=who.y;
    const dead=who.dead||who.action==='dead';body.alpha=dead?.28:1;
    body.rotation=dead?-68:who.action==='attack'?Math.sin((who.actionTimer??.1)*20)*5:0;
  }
  function health(entry,who){
    const visible=!who.dead&&(who.hp<who.maxHp||who.boss||who.state==='windup');
    entry.bar.visible=visible;if(!visible)return;
    const size=who.boss?82:45;
    if(entry.hp!==who.hp||entry.maxHp!==who.maxHp){
      entry.hp=who.hp;entry.maxHp=who.maxHp;
      entry.bar.graphics.clear().lineStyle(1,0x152d2c,1).beginFill(0x152d2c,.9).drawRoundRect(-size/2-2,-2,size+4,9,4,4).endFill().lineStyle(0)
        .beginFill(who.boss?0xc98960:0xbd6c58,1).drawRoundRect(-size/2,0,Math.max(0,size*clamp(who.hp/who.maxHp,0,1)),5,2,2).endFill();
    }
    entry.bar.x=who.x;entry.bar.y=who.y-(who.boss?126:96);
  }
  function spawnFx(kind,x,y,{life=.35,scale=1,rotation=0,vx=0,vy=0,tint=null}={}){
    let fx=effectPool.pop();
    if(!fx){if(fxMade>=FX_LIMIT)return;fx={body:sprite(kind,fxLane)};fxMade++;}
    setFrame(fx.body,kind);Object.assign(fx,{kind,x,y,age:0,life,scale,rotation,vx,vy});fx.body.visible=true;fx.body.material=tint??undefined;effects.push(fx);
  }
  function number(amount,x,y){
    if(!Number.isFinite(amount)||amount<=0)return;
    let n=numberPool.pop();
    if(!n){if(numberMade>=18)return;const node=fxLane.addChild(use(new DisplayObjectContainer()));n={root:node,digits:Array.from({length:4},()=>sprite('digit:0',node))};numberMade++;}
    const text=String(Math.round(amount)).slice(0,4);n.root.visible=true;n.root.alpha=1;n.x=x;n.y=y-76;n.age=0;
    for(let i=0;i<4;i++){const b=n.digits[i];b.visible=i<text.length;if(b.visible){setFrame(b,'digit:'+text[i]);b.x=(i-(text.length-1)/2)*14;b.y=0;}}
    numbers.push(n);
  }
  function events(state,list){
    for(const e of list){
      const x=Number.isFinite(e.x)?e.x:state.hero.x,y=Number.isFinite(e.y)?e.y:state.hero.y;
      switch(e.type){
        case 'attack':spawnFx('slash',x+Math.cos(e.direction??state.hero.facing)*25,y-23+Math.sin(e.direction??state.hero.facing)*20,{life:.25,rotation:(e.direction??state.hero.facing)*180/Math.PI+45,scale:1.15});break;
        case 'hit':flashes.set(e.id,HIT_TTL);spawnFx('impact',x,y-35,{scale:e.id==='hero'?.7:.9});number(e.amount,x,y);if(e.id==='hero')hitShake=3;break;
        case 'artifactHit':spawnFx('impact',x,y-30,{life:.35,scale:1.35,tint:GOLD});break;
        case 'enemyAttack':spawnFx(e.kind==='bolt'?'impact':'slash',e.targetX??x,e.targetY??y,{life:.35,scale:e.kind==='slam'?1.9:1.1,rotation:time*40,tint:GOLD});if(e.kind==='slam')hitShake=3;break;
        case 'kill':spawnFx('dust',x,y,{life:.65,scale:e.boss?3:1.5,vy:-15});if(e.boss){spawnFx('level',x,y-20,{life:1.1,scale:2.8});hitShake=5;}break;
        case 'heal':spawnFx('heal',x,y-8,{life:.9,scale:1.2,vy:-18});break;
        case 'level':spawnFx('level',x,y-5,{life:1,scale:1.7,vy:-18});break;
        case 'equip':spawnFx('level',state.hero.x,state.hero.y-15,{life:.8,scale:1.4});break;
        case 'artifactCast':spawnFx('ring',x,y-25,{life:.3,scale:1.7,rotation:time*90,tint:GOLD});break;
        case 'artifactCatch':spawnFx('impact',x,y-30,{life:.35,scale:.8,tint:GOLD});break;
        case 'pickup':spawnFx('impact',x,y-8,{life:.5,scale:.5,vy:-15,tint:GOLD});break;
        case 'bossSpawn':spawnFx('dust',x,y,{life:1.2,scale:3});break;
      }
    }
  }
  function drawWarnings(state){
    const g=warning.graphics;g.clear();
    for(const foe of state.enemies){
      const t=foe.telegraph;if(!t||foe.dead)continue;
      const p=clamp(1-t.remaining/Math.max(.01,t.total),0,1),r=t.radius;
      g.lineStyle(2.5,0xf5c480,.95).beginFill(0x9d402e,.12+p*.19).drawCircle(t.x,t.y,r).endFill();
      g.lineStyle(3,0xe39855,1).drawArc(t.x,t.y,r-4,-Math.PI/2,-Math.PI/2+p*Math.PI*2).lineStyle(0);
      if(t.kind==='bolt')g.lineStyle(2,0xe8b86d,.7).moveTo(foe.x,foe.y-30).lineTo(t.x,t.y).lineStyle(0);
      const d=8;g.lineStyle(1,0xffd796,.8).moveTo(t.x-d,t.y-d*.5).lineTo(t.x+d,t.y+d*.5).moveTo(t.x+d,t.y-d*.5).lineTo(t.x-d,t.y+d*.5).lineStyle(0);
    }
  }
  function drawPath(state){
    const g=pathLine.graphics;g.clear();
    if(state.moveTarget){g.lineStyle(1.4,0xe3c78b,.65).drawEllipse(state.moveTarget.x-10,state.moveTarget.y-5,20,10).lineStyle(0);}
    const p=MAPS[activeMap].portal;
    portal.alpha=.55+Math.sin(time*1.4)*.15;portal.rotation=0;
    heroSelection.graphics.clear().lineStyle(1.2,0xe5cf92,.6).drawEllipse(state.hero.x-21,state.hero.y-9,42,18).lineStyle(0);
    if(state.targetId){const foe=state.enemies.find(e=>e.id===state.targetId&&!e.dead);if(foe)g.lineStyle(1.8,0xe2a66c,.9).drawEllipse(foe.x-foe.radius-5,foe.y-foe.radius*.4,foe.radius*2+10,foe.radius*.8).lineStyle(0);}
    if(activeMap==='trail'){
      const elderReturn=['return','complete'].includes(state.quest?.stage);portal.alpha=elderReturn?.85:portal.alpha;
    }
  }
  function update(state,dt=1/60,list=[]){
    if(disposed||!state||!MAPS[state.mapId])return;
    dt=clamp(Number.isFinite(dt)?dt:0,0,.2);time+=dt;lastState=state;
    if(activeMap!==state.mapId)changeMap(state);
    updateCamera(state,dt);events(state,list);drawWarnings(state);drawPath(state);
    for(const [id,left]of flashes){if(left<=dt)flashes.delete(id);else flashes.set(id,left-dt);}
    const armor=state.inventory?.find(i=>i.uid===state.equipment?.armor)?.itemId,
      heroKind=armor==='scale-armor'?'heroElite':'hero';
    bodyFrame(hero,heroKind,state.hero);hero.material=flashes.has('hero')?HURT:undefined;
    const depth=[...scenery[activeMap],{node:hero,y:state.hero.y,id:'hero'}],seen=new Set();
    const rareWeapon=state.inventory?.find(i=>i.uid===state.equipment?.weapon)?.itemId==='iron-sword';
    weaponAura.visible=weaponBlade.visible=rareWeapon&&state.hero.action!=='dead';
    if(weaponBlade.visible){
      const mirror=hero.scaleX<0?-1:1,step=state.hero.action==='walk'?Math.sin(Math.floor(time*8)%4*Math.PI/2)*2:0;
      for(const b of [weaponAura,weaponBlade]){b.x=state.hero.x+27*mirror;b.y=state.hero.y-37+step;b.rotation=hero.rotation;b.material=GOLD;}
      weaponAura.scaleX=mirror*.72;weaponAura.scaleY=.85;weaponAura.alpha=reducedMotion?.15:.15+Math.sin(time*3)*.04;
      weaponBlade.scaleX=mirror*.55;weaponBlade.scaleY=.68;weaponBlade.alpha=1;
      depth.push({node:weaponAura,y:state.hero.y+.1,id:'weapon-aura'},{node:weaponBlade,y:state.hero.y+.2,id:'weapon-blade'});
    }
    for(const npc of MAPS[activeMap].npcs){
      const kind=npc.id==='elder'?'elder':'smith',entry=actorEntry('npc:'+npc.id,kind);seen.add(entry.id);entry.body.visible=true;entry.bar.visible=false;
      bodyFrame(entry.body,kind,{...npc,facing:Math.PI/2});depth.push({node:entry.body,y:npc.y,id:entry.id});
    }
    for(const foe of state.enemies){
      const entry=actorEntry(foe.id,foe.kind);seen.add(entry.id);entry.body.visible=true;bodyFrame(entry.body,foe.kind,foe);entry.body.material=flashes.has(foe.id)?WHITE:undefined;
      health(entry,foe);depth.push({node:entry.body,y:foe.y,id:entry.id});
    }
    for(const [id,a]of actors)if(!seen.has(id)){a.body.visible=false;a.bar.visible=false;}
    const liveDrops=new Set();
    for(const d of state.drops){
      let entry=drops.get(d.id);const kind=d.itemId==='gold'?'gold':d.itemId==='potion'?'potion':d.itemId.includes('armor')?'armor':d.itemId.includes('sword')?'sword':'seal';
      if(!entry){entry={body:sprite(kind,depthLane),glow:sprite('portal',underLane)};drops.set(d.id,entry);}
      liveDrops.add(d.id);entry.body.visible=entry.glow.visible=true;entry.body.x=d.x;entry.body.y=d.y-8+Math.sin(time*2.2+d.x)*2;
      entry.glow.x=d.x;entry.glow.y=d.y;entry.glow.scaleX=entry.glow.scaleY=.19;entry.glow.alpha=.35;
      depth.push({node:entry.body,y:d.y,id:'drop:'+d.id});
    }
    for(const [id,d]of drops)if(!liveDrops.has(id))d.body.visible=d.glow.visible=false;
    charm.visible=Boolean(state.equipment?.charm);if(charm.visible){charm.x=state.hero.x+26;charm.y=state.hero.y-48;charm.scaleX=charm.scaleY=.3;charm.alpha=.8;depth.push({node:charm,y:state.hero.y+1,id:'charm'});}
    depth.sort((a,b)=>a.y-b.y||a.id.localeCompare(b.id));for(const item of depth)depthLane.setChildIndex(item.node,depthLane.numChildren-1);
    const p=state.artifact;artifact.visible=Boolean(p&&p.phase!=='idle');if(artifact.visible){artifact.x=p.x;artifact.y=p.y-22;artifact.rotation=time*600;artifact.material=GOLD;
      if(!reducedMotion&&Math.floor(time*30)%3===0)spawnFx('ring',p.x,p.y-22,{life:.15,scale:.65,rotation:artifact.rotation});}
    const elder=MAPS[activeMap].npcs.find(n=>n.id==='elder');quest.visible=Boolean(elder&&['unaccepted','return'].includes(state.quest?.stage));if(quest.visible){quest.x=elder.x;quest.y=elder.y-107+Math.sin(time*2)*3;}
    for(let i=effects.length-1;i>=0;i--){const f=effects[i];f.age+=dt;if(f.age>=f.life){f.body.visible=false;effects.splice(i,1);effectPool.push(f);continue;}
      const p=f.age/f.life;f.body.x=f.x+f.vx*f.age;f.body.y=f.y+f.vy*f.age;f.body.alpha=Math.pow(1-p,.8);f.body.rotation=f.rotation;
      const scale=f.scale*(f.kind==='slash'?1:f.kind==='ring'?1+p*.5: .8+p*.65);f.body.scaleX=f.body.scaleY=scale/art.res;
    }
    for(let i=numbers.length-1;i>=0;i--){const n=numbers[i];n.age+=dt;if(n.age>.8){n.root.visible=false;numbers.splice(i,1);numberPool.push(n);continue;}n.root.x=n.x;n.root.y=n.y-n.age*40;n.root.alpha=clamp((.8-n.age)/.3,0,1);}
    frameStats.actors=seen.size+1;frameStats.scenery=scenery[activeMap].length;frameStats.effects=effects.length;
  }
  function resize(w,h){if(disposed)return;width=Math.max(1,w);height=Math.max(1,h);camera.width=width;camera.height=height;if(lastState)updateCamera(lastState,0,true);}
  // A caller may close its scope before detaching its update callback.
  scope.use({dispose(){disposed=true;}});
  return {root,update,resize,camera,stats:frameStats,
    worldAt:(x,y)=>({x:x/camera.zoom+camera.x,y:y/camera.zoom+camera.y}),
    screenAt:(x,y)=>({x:(x-camera.x)*camera.zoom,y:(y-camera.y)*camera.zoom}),
    dispose(){if(disposed)return;disposed=true;root.visible=false;}
  };
}
