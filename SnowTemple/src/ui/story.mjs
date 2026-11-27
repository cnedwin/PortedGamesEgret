// Native letterbox, spoken captions, chapter cards and veil. Only changing parts redraw.
import { DisplayObjectContainer, Sprite } from '@egret/engine';
import { createSnowKit, rect, clamp, INK, fontScript } from './kit.mjs';

export function createSnowStory(host,{locale}={}){
  const t=(zh,en)=>locale?.t(zh,en)??zh;
  const root=host.scope.use(new DisplayObjectContainer());host.menuLayer.addChild(root);
  const shade=host.scope.use(new Sprite()),speechLayer=host.scope.use(new DisplayObjectContainer()),
    cardLayer=host.scope.use(new DisplayObjectContainer()),veilLayer=host.scope.use(new Sprite()),
    waitLayer=host.scope.use(new DisplayObjectContainer());
  for(const node of [shade,speechLayer,cardLayer,veilLayer,waitLayer])root.addChild(node);
  const slots={speech:{root:speechLayer},card:{root:cardLayer},wait:{root:waitLayer}};
  let staged=false,shadeK=0,veiled=false,veilK=0,waiting=false,closed=false;
  const redraw=(name)=>{
    const slot=slots[name];slot.scope?.dispose();slot.scope=null;
    const data=slot.data;slot.root.visible=Boolean(data);if(!data)return;
    const scope=slot.scope=host.game.engine.createScope(),container=scope.use(new DisplayObjectContainer());
    slot.root.addChild(container);
    const {safe,screen}=host.metrics(),kit=createSnowKit(host,container,{scope,prefix:'snow-story-'+name,locale});
    const w=Math.min(safe.width-24,780),x=safe.x+(safe.width-w)/2,short=safe.height<420;
    if(name==='speech'){
      const height=short?66:84,y=safe.y+safe.height-Math.max(safe.height*.13,32)-height;
      kit.panel(rect(x,y,w,height),{fill:INK.ink,alpha:.42,border:null,radius:4});
      if(data.who)kit.label(t(data.who),rect(x+12,y+4,w-24,22),{size:17,min:13,color:INK.gold,family:fontScript,align:'center'});
      kit.label(t(data.text),rect(x+12,y+(data.who?26:5),w-24,height-(data.who?30:10)),{
        size:short?21:26,min:15,color:INK.snow,align:'center',family:fontScript,strokeWidth:.7,role:'status'});
    }else if(name==='card'){
      const cy=safe.y+safe.height/2,titleH=Math.min(98,safe.height*.21);
      kit.label(t(data.text),rect(x,cy-titleH-8,w,titleH),{size:short?42:66,min:26,weight:580,color:INK.ivory,
        family:fontScript,align:'center',strokeWidth:1.5,role:'heading'});
      kit.panel(rect(x+w*.35,cy,w*.30,1),{fill:INK.gold,border:null,alpha:.95,radius:0});
      kit.label(t(data.under),rect(x,cy+12,w,40),{size:20,min:13,color:INK.dim,family:fontScript,align:'center',strokeWidth:.7});
    }else{
      const width=Math.min(w,390),height=42,box=rect(x+(w-width)/2,safe.y+safe.height-Math.max(safe.height*.15,34)-height,width,height);
      kit.panel(box,{fill:INK.ink,alpha:.86,border:INK.line});
      kit.label(t('正在准备战斗角色…'),rect(box.x+7,box.y+2,box.width-14,box.height-4),{size:17,min:13,align:'center',role:'status'});
    }
    host.requestPublish();
  };
  function drawShade(){
    const {screen}=host.metrics(),h=screen.height*.11,g=shade.graphics;
    g.clear();if(shadeK>.001){g.beginFill(0x000000,1).drawRect(0,0,screen.width,h*shadeK)
      .drawRect(0,screen.height-h*shadeK,screen.width,h*shadeK).endFill();}
  }
  function drawVeil(){
    const {screen}=host.metrics();veilLayer.graphics.clear();
    veilLayer.graphics.beginFill(0x000000,1).drawRect(0,0,screen.width,screen.height).endFill();veilLayer.alpha=veilK;
  }
  function set(name,data){
    const slot=slots[name];slot.data=data;slot.root.alpha=data?0:1;redraw(name);
  }
  function expired(slot,ms){
    if(!slot.data)return;
    const began=slot.data.since,until=slot.data.until??Infinity;
    if(ms>=until){slot.data=null;slot.root.alpha=1;slot.scope?.dispose();slot.scope=null;slot.root.visible=false;host.requestPublish();return;}
    const alpha=Math.min(clamp((ms-began)/180,0,1),clamp((until-ms)/200,0,1));
    if(slot.root.alpha!==alpha)slot.root.alpha=alpha;
  }
  const stopUpdate=host.registerUpdate(dt=>{
    const target=staged?1:0,next=shadeK<target?Math.min(target,shadeK+dt/.7):Math.max(target,shadeK-dt/.7);
    if(next!==shadeK){shadeK=next;drawShade();}
    const v=veiled?1:0,n=veilK<v?Math.min(v,veilK+dt/1.2):Math.max(v,veilK-dt/1.2);
    if(n!==veilK){veilK=n;veilLayer.alpha=n;}
    const now=performance.now();for(const slot of Object.values(slots))expired(slot,now);
  });
  function refresh(){drawShade();drawVeil();for(const name of Object.keys(slots))redraw(name);}
  const stopLayout=host.registerLayout(refresh);refresh();
  return {
    get staged(){return staged;},stage(on){staged=Boolean(on);},
    say(text,who='',seconds=3){const now=performance.now();set('speech',{text,who,since:now,until:now+seconds*1000});},
    clearSpeech(){set('speech',null);},
    card(text,under='',seconds=3.2){const now=performance.now();set('card',{text,under,since:now,until:now+seconds*1000});},
    veil(on){veiled=Boolean(on);},
    waitForCharacters(on){on=Boolean(on);if(on===waiting)return;waiting=on;set('wait',on?{since:performance.now()}:null);},
    refresh,
    snapshot(){
      const active=name=>slots[name].data?{...slots[name].data,text:t(slots[name].data.text??''),
        who:t(slots[name].data.who??''),under:t(slots[name].data.under??''),alpha:slots[name].root.alpha}:null;
      return {staged,veiled,waiting,speech:active('speech'),card:active('card')};
    },
    dispose(){if(closed)return;closed=true;stopUpdate();stopLayout();for(const slot of Object.values(slots))slot.scope?.dispose();root.dispose();}
  };
}
