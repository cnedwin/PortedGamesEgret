// Native World3D overlay markers. Every number and rescue sign borrows one
// immutable glyph page; a hit only updates a bounded, retained display.
import { DisplayObjectContainer, Sprite } from '@egret/engine';
import { createBitmapText } from '@egret/engine/bitmapfont';
import { createOverlayScreenMarkers3D } from '@egret/engine/webgl2/world3d';

const LIFE=.76, FAR=[1e5,1e5,1e5];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const intersects=(a,b,pad)=>a.x<b.x+b.width+pad&&a.x+a.width>b.x-pad&&a.y<b.y+b.height+pad&&a.y+a.height>b.y-pad;
const assign=(object,key,value)=>{if(object[key]===value)return false;object[key]=value;return true;};

export async function createJellyMarkers(overlay,camera,sceneCanvas) {
  const {game}=overlay,scope=game.scope,own=node=>scope.use(node);
  // The glyph page lease is already registered with this scope by BrowserGame.
  const font=await game.createGlyphFont({
    characters:'0123456789.-+eE?SO',fontFamilies:['Arial','sans-serif'],fontSize:48,fontWeight:900,
    strokeWidth:3,strokeColor:0x2a1838,scope
  });
  const layer=createOverlayScreenMarkers3D({overlay,sceneCanvas,camera});
  let next=0,visible=false,closed=false,dirty=false,screen=game.screen,shortSide=400;
  const mark=()=>{dirty=true;};
  const flush=()=>{if(dirty){dirty=false;game.invalidate();}};
  function make(damage){
    const art=own(new DisplayObjectContainer());
    art.name=damage?'jelly-damage-marker':'jelly-down-marker';
    // Egret measures logical content even when hidden. Keep the full vertical
    // travel/pulse envelope stable so the projection doesn't cancel the rise.
    const plate=art.addChild(new Sprite());
    plate.visible=!damage;
    const text=own(createBitmapText({font:font.font,pages:font.pages,text:damage?'0':'SOS',color:0xfff5cd,letterSpacing:damage?Math.min(0,Math.round(font.font.size*.62)-font.font.glyph(48).xAdvance):-4}));
    const glyph=art.addChild(text.display);
    glyph.name=damage?'jelly-marker-glyph':'jelly-rescue-glyph';
    const marker=layer.add(art,{target:FAR,maxDistance:180,area:'safe',anchor:{x:.5,y:damage?.75:.5}});
    marker.setVisible(false);
    return {art,plate,text,glyph,marker,damage,active:false,expires:0,began:0,point:[0,0,0],crit:false,base:1,bounds:glyph.getBounds(),rect:{x:0,y:0,width:0,height:0},screenRect:{x:0,y:0,width:0,height:0},envelopeW:0,envelopeH:0,wasVisible:false,lastX:0,lastY:0};
  }
  const damage=Array.from({length:40},()=>make(true));
  const down=Array.from({length:4},()=>make(false)),all=damage.concat(down);
  function damageFrame(e,age,paint){
    const b=e.bounds,k=e.base*(1+.2*Math.sin(Math.min(1,age*3)*Math.PI));
    const width=b.width*k,height=b.height*k,rise=1.1*age*b.height*e.base;
    const x=-width/2,y=-height/2-rise;
    const r=e.rect;
    r.x=x;r.y=y;r.width=width;r.height=height;
    if(!paint)return false;
    // The marker's retained invisible envelope is centered on its native
    // projection; only the glyph moves relative to that stable anchor.
    let changed=assign(e.glyph,'scaleX',k)|assign(e.glyph,'scaleY',k);
    changed|=assign(e.glyph,'x',x-b.x*k)|assign(e.glyph,'y',y-b.y*k);
    changed|=assign(e.glyph,'alpha',Math.min(1,(1-age)*4));
    return !!changed;
  }
  function refreshArt(e){
    const scale=screen.scale||1;
    if(e.damage){
      const pixels=e.crit?clamp(shortSide*.034,18,35):clamp(shortSide*.024,14,26);
      e.base=pixels/(font.font.size*scale);
      e.bounds=e.glyph.getBounds();
      const w=Math.max(1,e.bounds.width*e.base*1.2),h=Math.max(1,e.bounds.height*e.base);
      // Anchor y=.75 of [-2h,+2h/3] is exactly zero. The whole rise and pulse
      // fit the measured safe footprint, even while the glyph is invisible.
      if(w!==e.envelopeW||h!==e.envelopeH){
        e.envelopeW=w;e.envelopeH=h;
        e.plate.graphics.clear().beginFill(0xffffff).drawRect(-w/2,-2*h,w,8*h/3).endFill();
      }
      damageFrame(e,0,true);
    }else{
      const size=clamp(shortSide*.04,20,40)/scale;
      const origin=-size/2;
      e.plate.graphics.clear().lineStyle(Math.max(1,size*.035),0xffc3b9,1)
        .beginFill(0xbb304d).drawRoundRect(origin,origin,size,size,size*.24,size*.24).endFill();
      const b=e.glyph.getBounds(),k=Math.min(size*.82/Math.max(1,b.width),size*.58/Math.max(1,b.height));
      e.glyph.scaleX=e.glyph.scaleY=k;e.glyph.x=-(b.x+b.width/2)*k;e.glyph.y=-(b.y+b.height/2)*k;
      Object.assign(e.rect,{x:origin,y:origin,width:size,height:size});
    }
  }
  function off(e){
    if(!e.active)return;
    if(e.marker.visible&&e.art.visible)mark();
    e.active=false;e.marker.setVisible(false);
  }
  function on(e,p){
    const changed=e.point[0]!==p[0]||e.point[1]!==p[1]||e.point[2]!==p[2];
    if(changed||!e.active){
      e.point[0]=p[0];e.point[1]=p[1];e.point[2]=p[2];e.marker.retarget(e.point);
    }
    if(!e.active){e.active=true;e.marker.setVisible(true);}
  }
  function setVisible(value){
    const state=!!value;if(state===visible)return;
    visible=state;if(!visible){all.forEach(off);flush();}
  }
  function consume(events,now){
    if(!visible)return;
    let used=0;
    for(const ev of events){
      if(ev.type!=='hit'||(ev.amount<4&&!ev.crit)||used>=5)continue;
      used++;
      const e=damage[next++%damage.length];
      e.began=now;e.expires=now+LIFE;e.crit=!!ev.crit;
      if(e.marker.visible&&e.art.visible)mark();
      e.text.text=String(ev.amount);e.text.color=e.crit?0xffe05c:0xfff5cd;
      refreshArt(e);on(e,[ev.x,ev.y,ev.z]);
    }
  }
  function layout(nextScreen){
    screen=nextScreen;
    const css=sceneCanvas.getBoundingClientRect();
    shortSide=Math.min(css.width,css.height)||Math.min(screen.width,screen.height)*(screen.scale||1);
    for(const e of damage){if(e.active){refreshArt(e);if(e.marker.visible&&e.art.visible)mark();}}
    for(const e of down){refreshArt(e);if(e.marker.visible&&e.art.visible)mark();}
    flush();
  }
  function update(sim,now,protectedRects=[]){
    if(!visible)return;
    let n=0;
    for(const panda of sim.pandas){if(panda.down&&n<down.length)on(down[n++],[panda.x,panda.y+2.2,panda.z]);}
    for(;n<down.length;n++)off(down[n]);
    for(const e of damage){if(e.active&&now>=e.expires)off(e);}
    // The native helper owns the sole world-to-screen projection and safety
    // clipping. Skip its work entirely when all 44 pooled markers are asleep.
    let activeCount=0;
    for(const e of all){
      if(!e.active)continue;
      activeCount++;
      e.wasVisible=e.marker.visible&&e.art.visible;e.lastX=e.marker.point.x;e.lastY=e.marker.point.y;
    }
    if(!activeCount){flush();return;}
    layer.update();
    const pad=8/(screen.scale||1);
    for(const e of all){
      if(!e.active)continue;
      const p=e.marker.point;
      if(!e.marker.visible){if(e.wasVisible)mark();continue;}
      const age=e.damage?clamp((now-e.began)/LIFE,0,1):0;
      if(e.damage)damageFrame(e,age,false);
      const box=e.screenRect;
      box.x=p.x+e.rect.x;box.y=p.y+e.rect.y;box.width=e.rect.width;box.height=e.rect.height;
      const blocked=protectedRects.some(r=>intersects(box,r,pad));
      if(assign(e.art,'visible',!blocked))mark();
      if(!blocked){
        if(e.damage&&damageFrame(e,age,true))mark();
        if(!e.wasVisible||e.lastX!==p.x||e.lastY!==p.y)mark();
      }
    }
    flush();
  }
  function reset(){damage.forEach(e=>{e.expires=0;off(e);});down.forEach(off);flush();}
  function dispose(){
    if(closed)return;closed=true;
    layer.dispose();
    // On Scope shutdown native ownership retires the display objects and
    // shared lease in order. A manual close should release them immediately.
    if(scope.state==='open'){
      for(const e of all){e.text.dispose();e.art.dispose();}
      font.dispose();
    }
  }
  layout(screen);
  return {consume,update,layout,setVisible,reset,dispose,get size(){return damage.length;}};
}
