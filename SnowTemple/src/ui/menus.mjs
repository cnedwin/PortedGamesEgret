// Native title, settings, manual fragments and closing sheets. Gameplay and save rules live outside this view.
import { DisplayObjectContainer, Sprite } from '@egret/engine';
import { createActionControl, createControlKeys, createScrollControl, createUiLayerManager, createUiRoot, createUiScreenStack } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { DEFAULT_KEYS,keyName } from '../input.mjs';
import { BOONS } from '../rules/boons.mjs';
import { TIERS,tierName } from '../rules/tiers.mjs';
import { createSnowKit,guardMenuRelease,INK,rect,clamp,fontScript } from './kit.mjs';
import { createSnowStory } from './story.mjs';

const DEED_NAMES={attack:'出枪',guard:'格挡（按住）',stars:'寒星',rain:'梨花枪雨',dodge:'闪避',glide:'踏雪（按住）',drink:'饮酒',
  up:'向上',down:'向下',left:'向左',right:'向右',bag:'行囊'};
const CHOICES={
  quality:['画质','自动按帧率调整分辨率。高档草更密，阴影更清晰。',[['auto','自动'],['low','低'],['mid','中'],['high','高']]],
  models:['模型','人物、兵器和建筑的精细程度。高档约 23MB，脸和手最细，带布纹和皮肤细节；低档适合手机。重新载入后生效。',[['auto','自动'],['low','低'],['mid','中'],['high','高']]],
  particles:['粒子','枪光火星、雪尘和飘雪的数量。',[['few','少'],['some','标准'],['many','多']]],
  sound:['声音','风声、配乐和兵刃声。',[['off','关'],['on','开']]],
  lang:['语言','界面文字，语音仍为原版中文。',[['zh','中文'],['en','English']]]
};
const REPLAY={climb:'更上一重',temple:'重战陆谦',chapter:'重走此章',yard:'再守一回',title:'回到卷首'};
const COUNT='零一二三四五六七八九十';
const tierLine=n=>'第'+(COUNT[n]??n)+'重　'+tierName(n);
const split=(box,n,gap=5)=>Array.from({length:n},(_,i)=>{const w=(box.width-gap*(n-1))/n;return rect(box.x+i*(w+gap),box.y,w,box.height);});
function centered(w,h,width,height){return rect((w-width)/2,(h-height)/2,width,height);}
function framed(k,box,fill=INK.panel){
  k.panel(box,{fill,alpha:.95,border:INK.gold,radius:2});
  if(box.width>14&&box.height>14)k.panel(rect(box.x+5,box.y+5,box.width-10,box.height-10),{alpha:0,border:INK.line,radius:1});
}
function heading(ctx,k,value,box,size=28){
  k.label(ctx.t(value),box,{size,min:18,weight:600,family:fontScript,color:INK.ivory,align:'center',role:'heading'});
}
function buttonsToolbar(ctx,k,box,disabled=false){
  const [full,settings]=split(box,2,6);
  k.button({id:'full',text:ctx.t(document.fullscreenElement?'退出全屏':'全屏'),box:full,size:15,disabled,onActivate:ctx.fullscreen});
  return k.button({id:'settings',text:ctx.t('设置'),box:settings,size:16,disabled,onActivate:ctx.openSettings}).id;
}
function title(ctx,k,entry,size,scope,container){
  const {width:w,height:h}=size,short=h<410,portrait=h>w,en=ctx.locale?.lang==='en';
  const p=entry.progress,unlocked=p.open>1,marg=short?16:Math.max(18,Math.min(70,w*.07));
  // The old title also accepts a click on its painting. This background is behind the explicit named controls.
  const background=k.shape(rect(0,0,w,h));background.touchEnabled=true;background.touchChildren=false;
  background.hitArea=rect(0,0,w,h);guardMenuRelease(scope,ctx.host.pointer,background);
  const backgroundAction=scope.use(createActionControl({input:ctx.host.pointer,target:background,onActivate:()=>{if(ctx.startReady)ctx.start('chapter');}}));
  backgroundAction.setEnabled(ctx.startReady);
  // Native gradients preserve the original cinematic dark edges, without dimming the character.
  background.graphics.beginLinearGradientFill(0,0,w,0,[{offset:0,color:INK.ink,alpha:.83},
    {offset:.33,color:INK.ink,alpha:.36},{offset:.58,color:INK.ink,alpha:0}]).drawRect(0,0,w,h).endFill();
  background.graphics.beginLinearGradientFill(0,h,0,0,[{offset:0,color:INK.ink,alpha:.78},
    {offset:.42,color:INK.ink,alpha:.10},{offset:.63,color:INK.ink,alpha:0}]).drawRect(0,0,w,h).endFill();
  const toolW=Math.min(192,w*.53),toolY=short?8:Math.min(40,h*.055);
  buttonsToolbar(ctx,k,rect(w-toolW-8,toolY,toolW,48),!ctx.startReady);
  const entryW=Math.min(w-2*marg,portrait?w-2*marg:Math.max(280,Math.min(en?510:388,w*.54)));
  const tierH=unlocked?(short?58:68):0,waysH=short?58:66,hintsH=short?31:39;
  const entryH=tierH+(unlocked?8:0)+waysH+hintsH+8;
  const startY=h-marg-entryH,headlineY=short?62:Math.max(32,h*.065);
  if(!en&&startY-headlineY>(short?162:210)){
    const glyphs=Array.from('风雪山神庙'),font=clamp(Math.floor((startY-headlineY-10)/(glyphs.length*1.22)),24,short?34:78);
    k.label(glyphs.join('\n'),rect(marg,headlineY,font+13,font*1.22*glyphs.length),
      {size:font,min:font,weight:400,color:INK.snow,family:fontScript,align:'center',strokeWidth:.5,role:'heading'});
    const stamp=rect(marg+font+21,headlineY+3,short?25:30,short?118:143);
    k.panel(stamp,{fill:0xb3221c,alpha:.98,border:null,radius:0});
    k.label(['水','浒','','第','一','回'].join('\n'),rect(stamp.x+2,stamp.y+4,stamp.width-4,stamp.height-8),
      {size:16,min:12,weight:400,align:'center',family:fontScript,color:INK.ivory});
  }else{
    const hw=Math.min(w-marg*2,portrait?w-2*marg:Math.max(330,w*.62)),hh=Math.max(48,Math.min(120,startY-headlineY-14));
    k.label(ctx.t('风雪山神庙'),rect(marg,headlineY,hw,hh),{size:short?43:58,min:24,
      weight:en?600:400,color:INK.ivory,family:fontScript,role:'heading',strokeWidth:1});
    if(startY>headlineY+hh+14)k.label(ctx.t('水浒　第一回'),rect(marg,headlineY+hh,Math.min(290,hw),29),
      {size:18,min:13,color:INK.gold,family:fontScript});
  }
  let y=startY;
  if(unlocked){
    const aW=48,gap=6;
    k.button({id:'lower',text:'‹',name:ctx.t('低一重'),box:rect(marg,y,aW,48),disabled:!ctx.startReady||p.tier<=1,onActivate:()=>ctx.tier(-1),size:30});
    k.button({id:'higher',text:'›',name:ctx.t('高一重'),box:rect(marg+entryW-aW,y,aW,48),disabled:!ctx.startReady||p.tier>=p.open,onActivate:()=>ctx.tier(1),size:30});
    const title=tierLine(p.tier)+(p.marks?.[p.tier]?'　'+p.marks[p.tier]+'等':'');
    k.label(ctx.t(title),rect(marg+aW+gap,y,entryW-2*(aW+gap),25),{size:19,min:14,color:INK.ivory,align:'center',family:fontScript});
    k.label(ctx.t(TIERS[p.tier-1]?.text??'所有人更耐打，下手更重。'),rect(marg+aW+gap,y+25,entryW-2*(aW+gap),tierH-25),
      {size:13,min:11,align:'center',color:INK.dim});y+=tierH+8;
  }
  const [road,yard]=split(rect(marg,y,entryW,waysH),2,9);
  const start=k.button({id:'chapter',text:ctx.t('踏雪上路')+' ›',name:ctx.t('踏雪上路'),box:road,primary:true,
    disabled:!ctx.startReady,onActivate:()=>ctx.start('chapter'),size:22});
  k.button({id:'yard',text:ctx.t('守草料场'),detail:p.wave>0?ctx.t('最远第 '+p.wave+' 拨','Best: wave '+p.wave):ctx.t('一拨接一拨，倒下为止'),
    box:yard,disabled:!ctx.startReady,onActivate:()=>ctx.start('yard'),size:19});
  y+=waysH+8;
  const key=a=>ctx.t(keyName(ctx.input.keys[a]));
  const hint=ctx.host.metrics().touch?ctx.t('左手移动　右手出枪、格挡和闪避'):
    ctx.locale?.lang==='en'?key('up')+' '+key('left')+' '+key('down')+' '+key('right')+' Move · '+key('attack')+' Strike · Hold '+key('guard')+' Guard · '+key('dodge')+' Dodge':
      key('up')+' '+key('left')+' '+key('down')+' '+key('right')+' 移动　'+key('attack')+'出枪　按住'+key('guard')+'格挡　'+key('dodge')+'闪避';
  k.label(hint,rect(marg,y,entryW,hintsH),{size:15,min:11,color:INK.dim,weight:500});
  entry.primary=ctx.startReady?start.id:null;
}
function drawSettings(ctx,k,entry,size,scope,container){
  const {width:w,height:h}=size,short=h<410;
  const width=Math.min(650,w-16),height=Math.min(h-12,760),box=centered(w,h,width,height);
  framed(k,box);heading(ctx,k,'设置',rect(box.x+14,box.y+5,box.width-28,short?32:42),30);
  const vx=box.x+12,vy=box.y+(short?42:53),bottom=box.y+box.height-60;
  const vw=box.width-76,vh=Math.max(70,bottom-vy-6);
  const viewport=scope.use(new Sprite());viewport.x=vx;viewport.y=vy;viewport.clipRect=rect(0,0,vw,vh);
  viewport.touchEnabled=true;viewport.hitArea=rect(0,0,vw,vh);container.addChild(viewport);
  const content=scope.use(new DisplayObjectContainer());viewport.addChild(content);
  const origin=()=>{const q=viewport.localToGlobal(0,0);return rect(q.x,q.y,vw,vh);};
  const controls=new Map(),body=createSnowKit(ctx.host,content,{scope,prefix:entry.id+'-body',semanticParent:entry.semanticId,locale:ctx.locale,
    clip:origin,onControl:(id,node)=>controls.set(id,node)});
  let y=0,scroll;
  const wide=vw>=490,pad=5;
  for(const [key,[name,description,options]] of Object.entries(CHOICES)){
    const label=ctx.t(name),optionW=wide?Math.max(194,vw*.43):vw-2*pad,gap=5;
    const labelW=wide?vw-optionW-16:vw-2*pad,descH=key==='models'?(wide?66:57):key==='quality'?45:34;
    const labelH=22+descH,rowH=wide?Math.max(52,labelH):labelH+52;
    body.panel(rect(0,y,vw,rowH),{fill:INK.ink,alpha:.32,border:null,radius:1});
    body.label(label,rect(pad,y+1,labelW,23),{size:18,min:14,color:INK.ivory,weight:650});
    body.label(ctx.t(description,key==='lang'?'Interface text; voices retain the original Chinese.':undefined),
      rect(pad,y+23,labelW,descH-1),{size:13,min:11,color:INK.dim,weight:500});
    const controlBox=rect(wide?vw-optionW-pad:pad,wide?y+(rowH-48)/2:y+labelH,optionW,48);
    const boxes=split(controlBox,options.length,3);
    body.selection({id:key,name:label,value:key==='lang'?(ctx.locale?.lang??ctx.settings.lang??'zh'):ctx.settings[key],
      items:options.map(([value,word],i)=>({key:value,text:ctx.t(word),name:label+'：'+ctx.t(word),box:boxes[i]})),
      onChange:value=>ctx.changeSetting(key,value)});
    y+=rowH+gap;
  }
  const reloadW=Math.min(150,vw*.42);
  body.label(ctx.t('画质、模型和粒子设置在重新载入后生效。'),rect(pad,y,vw-reloadW-12,52),{size:13,min:11,color:INK.dim});
  body.button({id:'reload',text:ctx.t('重新载入'),box:rect(vw-reloadW-pad,y+2,reloadW,48),onActivate:()=>location.reload(),size:15});y+=62;
  body.label(ctx.t('按键'),rect(pad,y,vw-2*pad,30),{size:21,min:16,color:INK.gold,family:fontScript,role:'heading'});y+=33;
  for(const key of Object.keys(DEFAULT_KEYS)){
    const bindW=Math.max(92,Math.min(165,vw*.44)),name=ctx.t(DEED_NAMES[key]);
    body.panel(rect(0,y,vw,52),{fill:INK.ink,alpha:.28,border:null,radius:1});
    body.label(name,rect(pad,y,vw-bindW-16,52),{size:16,min:13});
    body.button({id:'key-'+key,name,text:ctx.asking===key?ctx.t('请按键…'):ctx.t(keyName(ctx.input.keys[key])),
      box:rect(vw-bindW-pad,y+2,bindW,48),onActivate:()=>ctx.bindKey(key),size:15,primary:ctx.asking===key});y+=55;
  }
  const trackX=box.x+box.width-59,trackY=vy,trackW=48;
  k.panel(rect(trackX,trackY,trackW,vh),{fill:INK.ink,alpha:.92,border:INK.line,radius:4});
  const thumb=scope.use(new Sprite());thumb.x=trackX;thumb.y=trackY;container.addChild(thumb);thumb.touchEnabled=true;
  function move(offset){
    entry.scrollOffset=offset;content.y=-offset;
    body.syncClip();
    const part=scroll?.thumb;if(part){thumb.y=trackY+part.start;thumb.hitArea=rect(0,0,trackW,part.length);
      thumb.graphics.clear();thumb.graphics.beginFill(0x6a5639,1).drawRoundRect(3,0,trackW-6,part.length,7).endFill();
      thumb.graphics.lineStyle(1,INK.gold,.9).drawRoundRect(3.5,.5,trackW-7,part.length-1,7);
      const mid=part.length/2;for(let i=-1;i<=1;i++)thumb.graphics.moveTo(15,mid+i*4).lineTo(trackW-15,mid+i*4);}
    ctx.host.requestPublish();
  }
  scroll=scope.use(createScrollControl({viewportLength:vh,contentLength:y,offset:entry.scrollOffset??0,
    wheel:ctx.host.hover?{hover:ctx.host.hover,target:viewport,lineLength:45}:undefined,
    thumb:{input:ctx.host.pointer,target:thumb,trackLength:vh,minimumLength:48},onScroll:move}));
  entry.scroll=scroll;move(scroll.offset);
  // All child buttons use the native focus channel; if focus enters a clipped row, reveal that row.
  if(ctx.host.keyboard){
    scope.use(createControlKeys({keyboard:ctx.host.keyboard,target:viewport,kind:'scroll',control:scroll}));
    let former;
    scope.use({dispose:ctx.host.registerPainter(()=>{
      const id=ctx.host.keyboard.getSnapshot().focusedId;if(former===id)return;former=id;
      const node=controls.get(id);if(!node)return;
      const b=semanticBoundsOf(node),v=origin();
      if(b.y<v.y)scroll.scrollBy(b.y-v.y-2);
      else if(b.y+b.height>v.y+v.height)scroll.scrollBy(b.y+b.height-v.y-v.height+2);
    })});
  }
  const footer=rect(box.x+12,box.y+box.height-54,box.width-24,48),gap=5;
  const pgup=k.button({id:'page-up',text:'▲',name:ctx.t('上一页','Previous page'),box:rect(footer.x,footer.y,48,48),onActivate:()=>scroll.page(-1)});
  k.button({id:'page-down',text:'▼',name:ctx.t('下一页','Next page'),box:rect(footer.x+48+gap,footer.y,48,48),onActivate:()=>scroll.page(1)});
  const rem=rect(footer.x+96+2*gap,footer.y,footer.width-96-2*gap,48),[defaults,close]=split(rem,2,5);
  k.button({id:'defaults',text:ctx.t('恢复默认'),box:defaults,onActivate:ctx.defaults,size:15});
  const closeButton=k.button({id:'close',text:ctx.t('关闭'),box:close,primary:true,onActivate:ctx.closeSettings,size:17});
  entry.primary=ctx.asking?entry.id+'-body:key-'+ctx.asking:closeButton.id;
  entry.firstScroll=pgup.id;
}
function choice(ctx,k,entry,size){
  const {width:w,height:h}=size,options=entry.options,cols=w>=650?3:1,gap=8,short=h<420,
    vertical=cols===3&&h>=470&&ctx.locale?.lang!=='en';
  const width=Math.min(w-16,cols===3?(vertical?528:650):560),rows=Math.ceil(options.length/cols),
    cardH=cols===3?(vertical?clamp(h*.40,220,285):Math.min(short?140:162,h-120)):Math.min(105,Math.max(66,(h-126)/rows-gap));
  const header=short?67:80,height=header+rows*cardH+(rows-1)*gap+14,box=centered(w,h,width,height);
  // The old folded paper is retained as a native, translucent irregular sheet; the story scene shows through.
  const paper=k.shape(box),g=paper.graphics;
  g.beginFill(INK.paper,.87).moveTo(4,5).lineTo(box.width*.46,1).lineTo(box.width-4,3)
    .lineTo(box.width,box.height-4).lineTo(box.width*.51,box.height-1).lineTo(3,box.height-5).lineTo(4,5).endFill();
  g.lineStyle(1,INK.line,.6).moveTo(8,10).lineTo(box.width-9,9).lineTo(box.width-8,box.height-10)
    .lineTo(8,box.height-9).lineTo(8,10);
  k.label(ctx.t('枪谱残页'),rect(box.x+10,box.y+8,box.width-20,36),{size:30,min:20,family:fontScript,role:'heading',color:INK.written,align:'center'});
  k.label(ctx.t('还认得出三行，择一而习。'),rect(box.x+12,box.y+44,box.width-24,22),{size:15,min:12,color:0x5b4f3c,align:'center'});
  const cw=(box.width-28-(cols-1)*gap)/cols;
  options.forEach((id,i)=>{
    const boon=BOONS[id],column=vertical?cols-1-(i%cols):i%cols,
      cell=rect(box.x+14+column*(cw+gap),box.y+header+Math.floor(i/cols)*(cardH+gap),cw,cardH);
    const decorate=vertical?node=>{
      const seal=rect((cw-27)/2,9,27,27);
      k.panel(seal,{fill:INK.red,alpha:1,border:null,radius:0,container:node});
      k.label(String(i+1),seal,{size:17,min:14,color:INK.ivory,weight:750,align:'center',role:null,container:node});
      const titleChars=Array.from(boon.name),font=24,titleH=titleChars.length*font*1.22,
        start=seal.y+seal.height+8;
      k.label(titleChars.join('\n'),rect(6,start,cw-12,titleH),{size:font,min:font,family:fontScript,
        color:INK.written,align:'center',weight:400,role:null,container:node});
      // Keep the fragile-manual calligraphic title vertical; use compact horizontal
      // descriptions for readability and avoid one raster acquisition per glyph.
      const descY=start+titleH+4,available=Math.max(34,cardH-descY-9);
      k.label(boon.text,rect(8,descY,cw-16,available),{size:16,min:12,color:0x5b4f3c,family:fontScript,
        weight:400,align:'center',role:null,container:node});
    }:undefined;
    const control=k.button({id:'pick-'+i,name:ctx.t(boon.name),text:String(i+1)+' · '+ctx.t(boon.name),
      detail:ctx.t(boon.text),box:cell,decorate,size:21,onActivate:()=>ctx.pick(i)});
    if(i===0)entry.primary=control.id;
  });
}
function result(ctx,k,entry,size){
  const {width:w,height:h}=size,m=entry.result,short=h<420;
  const width=Math.min(590,w-16),cols=width>=460?3:2,gap=7,rows=Math.ceil(m.actions.length/cols),pad=short?10:18;
  const newsH=m.news?40:0,header=short?70:96,statH=54,buttonH=rows*48+(rows-1)*gap;
  const height=Math.min(h-10,2*pad+header+statH+newsH+buttonH+12),box=centered(w,h,width,height);framed(k,box);
  const x=box.x+pad,y=box.y+pad,inner=width-2*pad,sealW=short?62:80;
  k.panel(rect(x+(inner-sealW)/2,y,sealW,22),{fill:INK.red,alpha:1,border:INK.gold});
  k.label(ctx.t('水浒'),rect(x+(inner-sealW)/2,y,sealW,22),{size:15,min:12,family:fontScript,color:INK.ivory,align:'center'});
  const titleW=m.mark?inner-70:inner;
  k.label(ctx.t(m.heading),rect(x,y+24,titleW,short?30:43),{size:short?24:36,min:18,family:fontScript,color:INK.ivory,align:'center',role:'heading'});
  k.label(ctx.t(m.line),rect(x,y+(short?54:70),titleW,22),{size:15,min:12,color:INK.gold,family:fontScript,align:'center'});
  if(m.mark){
    const sizeMark=short?50:62,b=rect(x+inner-sizeMark,y+17,sizeMark,sizeMark);
    k.panel(b,{fill:INK.red,alpha:1,border:INK.gold,radius:1});
    k.label(ctx.t(String(m.mark)),rect(b.x,b.y+2,b.width,b.height-17),{size:33,min:21,color:INK.ivory,family:fontScript,align:'center'});
    k.label(ctx.t('等'),rect(b.x+5,b.y+b.height-19,b.width-10,15),{size:11,min:10,color:INK.ivory,align:'right'});
  }
  const statY=y+header,statBox=rect(x,statY,inner,statH),stats=[['用时',m.time],['弹反',m.parries],['回马枪',m.ripostes],[m.lastName,m.last]];
  k.panel(statBox,{fill:INK.ink,alpha:.55,border:INK.line,radius:1});
  split(statBox,4,3).forEach((b,i)=>{
    k.label(ctx.t(stats[i][0]),rect(b.x+2,b.y+2,b.width-4,23),{size:13,min:10,color:INK.dim,align:'center'});
    k.label(String(stats[i][1]??''),rect(b.x+2,b.y+24,b.width-4,28),{size:20,min:15,color:INK.ivory,align:'center'});
  });
  let actionY=statY+statH+6;
  if(m.news){k.label(ctx.t(m.news),rect(x,actionY,inner,newsH),{size:14,min:11,color:INK.dim,align:'center'});actionY+=newsH;}
  for(let row=0;row<rows;row++){
    const list=m.actions.slice(row*cols,row*cols+cols),bs=split(rect(x,actionY+row*(48+gap),inner,48),list.length,gap);
    list.forEach((id,i)=>{const b=k.button({id:'replay-'+id,text:ctx.t(REPLAY[id]),box:bs[i],size:16,
      primary:row===0&&i===0,onActivate:()=>ctx.replay(id)});if(row===0&&i===0)entry.primary=b.id;});
  }
}

export function createSnowMenus(host,input,settings,handlers){
  const {locale}=handlers,story=createSnowStory(host,{locale}),{game,scope,keyboard,semantics}=host;
  const t=(zh,en)=>locale?.t(zh,en)??zh;
  const stack=createUiScreenStack({onError:host.onError});
  const manager=createUiLayerManager({engine:game.engine,scope,input:host.pointer,keyboard,viewport:host.metrics().safe,
    onInvalidate:()=>host.requestPublish()});
  host.setScreenStack(stack);
  let closed=false,fatal=false,work=Promise.resolve(),startReady=false,titleWanted=true,settingsWanted=false,choiceWanted=false,resultWanted=false,
    asking=null,pageSince=Infinity,entryProgress={tier:1,open:1,marks:{},wave:0},choiceOptions=[],resultData=null,cornerScope;
  const entries=new Map(),corner=scope.use(new DisplayObjectContainer());host.menuLayer.addChild(corner);
  function syncLayers(){
    const r=manager.sync();if(r.postCommitErrors?.length)throw r.postCommitErrors[0];
    host.requestPublish();
  }
  function schedule(fn){const task=work.catch(()=>{}).then(()=>{if(!closed)return fn();});work=task;host.track(task);return task;}
  function remember(entry){
    const k=keyboard?.getSnapshot();if(k&&entry.focusIds.has(k.focusedId)){entry.lastFocus=k.focusedId;entry.focusVisible=k.focusVisible;}
  }
  function focus(entry,preferred){
    if(!entry?.active||asking||entry.kind==='title'&&!startReady)return;
    const key=[preferred,entry.lastFocus,entry.primary].find(id=>entry.focusIds.has(id))??entry.primary;
    if(key){keyboard?.focus(key,{visible:entry.focusVisible??true});host.focus();host.requestPublish();}
  }
  const ctx={host,input,settings,locale,t,get startReady(){return startReady;},get asking(){return asking;},
    start(way){if(startReady&&!settingsWanted&&titleWanted)handlers.onStart?.(way);},
    tier(delta){handlers.onTier?.(delta);},
    fullscreen(){handlers.onUiSound?.('select');if(document.fullscreenElement)void document.exitFullscreen?.().catch(()=>{});
      else void document.documentElement.requestFullscreen?.().catch(()=>{});},
    openSettings,closeSettings,
    changeSetting(key,value){
      if(key==='lang'){settings.lang=value;locale?.set(value);host.syncLocale();}
      else settings[key]=value;
      handlers.onSettings?.(settings);handlers.onUiSound?.('select');menus.refresh();
    },
    bindKey(key){
      asking=key;handlers.onUiSound?.('select');
      input.ask(code=>{
        const other=Object.keys(input.keys).find(action=>input.keys[action]===code);
        if(other)input.keys[other]=input.keys[key];input.keys[key]=code;
        asking=null;handlers.onSettings?.(settings);handlers.onUiSound?.('confirm');handlers.onKeysChanged?.();
        const e=entries.get('snow-settings');if(e)e.lastFocus=e.id+'-body:key-'+key;menus.refresh();
      },()=>{
        asking=null;const e=entries.get('snow-settings');if(e)e.lastFocus=e.id+'-body:key-'+key;menus.refresh();
      });
      host.blurToScene();menus.refresh();
    },
    defaults(){
      input.ask();asking=null;Object.assign(input.keys,DEFAULT_KEYS);handlers.onSettings?.(settings);handlers.onUiSound?.('confirm');
      handlers.onKeysChanged?.();menus.refresh();
    },
    pick(index){
      const active=entries.get('snow-choice');
      // A digit pressed while content is still preparing is not a choice. Start
      // the original 420ms protection when the native modal is first active.
      if(!choiceWanted||!active?.active||!active.visible||active.covered||
        !Number.isFinite(pageSince)||performance.now()-pageSince<420||!choiceOptions[index])return;
      menus.closeChoice();handlers.onPick?.(index);
    },
    replay(id){if(resultWanted)handlers.onReplay?.(id);}
  };
  function drawCorner(){
    cornerScope?.dispose();cornerScope=null;
    const visible=!fatal&&!titleWanted&&!resultWanted;
    corner.visible=visible;if(!visible)return;
    cornerScope=game.engine.createScope();
    const {safe}=host.metrics(),group='snow-tools';
    host.addSemantic({id:group,role:'group',describe:()=>({name:t('设置'),bounds:semanticBoundsOf(corner),inert:settingsWanted||choiceWanted})},cornerScope);
    const k=createSnowKit(host,corner,{scope:cornerScope,prefix:'snow-tools',semanticParent:group,locale});
    const width=Math.min(228,safe.width*.55),y=safe.y+Math.min(48,Math.max(6,safe.height*.07));
    buttonsToolbar(ctx,k,rect(safe.x+safe.width-width-8,y,width,48));
    host.requestPublish();
  }
  async function render(entry,deferLayers=false){
    if(entry.closed)return;
    const safe=host.metrics().safe,size={width:safe.width,height:safe.height},ids=new Set();remember(entry);
    const tree={kind:'leaf',id:'sheet',explicitWidth:size.width,explicitHeight:size.height,content:{
      revision:++entry.revision,
      prepare(c){return {content:c.scope.use(new DisplayObjectContainer()),measuredHeight:size.height};},
      onAttach(c){
        entry.primary=null;entry.content=c.content;
        const k=createSnowKit(host,c.content,{scope:c.scope,prefix:entry.id,semanticParent:entry.semanticId,locale,
          parchment:entry.kind==='choice',onControl:(id,node,disabled)=>{if(!disabled)ids.add(id);}});
        entry.progress=entryProgress;entry.options=choiceOptions;entry.result=resultData;
        if(entry.kind==='title')title(ctx,k,entry,size,c.scope,c.content);
        else if(entry.kind==='settings')drawSettings(ctx,k,entry,size,c.scope,c.content);
        else if(entry.kind==='choice')choice(ctx,k,entry,size);
        else result(ctx,k,entry,size);
        entry.content.visible=!entry.covered;
      }}};
    // Settings' clipped body uses its own kit, so remember its registered control ids as well.
    if(!entry.root){
      // A lesson may arrive while a physical finger still owns the stick.
      // Release the native pointer sessions before associating a new modal
      // root; the layer manager cannot cancel them until that root exists.
      // engine-note: createUiRoot admits only an idle, contact-free input.
      // The browser may suspend the input while the tab is hidden. Wait
      // for its native resume instead of forcing it active from the game.
      while(host.pointer.state==='suspended'&&!closed&&!entry.closed)
        await new Promise(resolve=>requestAnimationFrame(resolve));
      if(closed||entry.closed)return;
      if(host.pointer.contacts.length)host.pointer.cancelAll('suspended');
      entry.root=createUiRoot({id:entry.id,engine:game.engine,scope,viewport:size,density:1,tree,
        input:host.pointer,keyboard:{input:keyboard,idPrefix:entry.id}});
    }
    else{entry.root.setViewport(size,1);entry.root.setTree(tree,{responsive:true});}
    let prepared;for(let i=0;i<8;i++){prepared=await entry.root.prepare();if(prepared.status!=='pending')break;}
    if(entry.closed)return;
    if(!prepared||prepared.status==='pending')throw Error('Snow UI preparation incomplete: '+entry.kind);
    const committed=entry.root.commit(prepared);
    if(!['committed','unchanged'].includes(committed.kind)||committed.postCommitErrors.length)
      throw Error('Snow UI commit '+entry.kind+': '+committed.kind+' '+committed.postCommitErrors.map(String).join(', '));
    if(entry.kind==='settings'){
      for(const key of Object.keys(DEFAULT_KEYS))ids.add(entry.id+'-body:key-'+key);
      for(const key of Object.keys(CHOICES))ids.add(entry.id+'-body:'+key);
      ids.add(entry.id+'-body:reload');
    }
    entry.focusIds=ids;
    if(!entry.registration)entry.registration=manager.register({id:entry.id,root:entry.root,kind:'modal',closeOnEscape:false,
      closeOnOutside:false,backdropColor:INK.ink,backdropAlpha:entry.kind==='title'?.08:entry.kind==='choice'?.62:.7});
    if(entry.visible)manager.open(entry.id);
    if(!deferLayers){manager.setViewport(safe);syncLayers();focus(entry);}
  }
  function definition(kind,layer){
    const id='snow-'+kind;
    return {id,layer,back:kind==='settings'?()=>closeSettings():'none',async open(context){
      const {activated}=context.params,entry={id,kind,revision:0,visible:false,covered:false,active:false,focusIds:new Set(),semanticId:id+'-dialog'};
      entries.set(id,entry);
      const semantic=semantics.add({id:entry.semanticId,role:'dialog',describe:()=>({
        name:t(kind==='title'?'风雪山神庙':kind==='settings'?'设置':kind==='choice'?'枪谱残页':resultData?.heading??'风雪山神庙'),
        bounds:host.metrics().safe,hidden:host.loading||entry.closed||!entry.visible||entry.covered,modal:entry.active})});
      try{await render(entry);}catch(cause){entry.closed=true;entry.root?.dispose();semantic.remove();entries.delete(id);activated.reject(cause);throw cause;}
      return {
        show(){entry.visible=true;manager.open(id);syncLayers();},
        hide(){entry.visible=false;manager.close(id);syncLayers();},
        cover(){entry.covered=true;if(entry.content)entry.content.visible=false;host.requestPublish();},
        reveal(){entry.covered=false;if(entry.content)entry.content.visible=true;host.requestPublish();},
        activate(){entry.active=true;try{focus(entry);if(entry.kind==='choice'&&!Number.isFinite(pageSince))pageSince=performance.now();activated.resolve();}catch(cause){activated.reject(cause);throw cause;}},
        deactivate(){remember(entry);entry.active=false;host.requestPublish();},
        close(){entry.closed=true;entry.visible=false;entry.registration?.dispose();entry.root?.dispose();semantic.remove();entries.delete(id);syncLayers();}
      };
    }};
  }
  const defs={title:definition('title','page'),settings:definition('settings','modal'),choice:definition('choice','modal'),result:definition('result','page')};
  async function open(kind){
    const def=defs[kind],existing=entries.get(def.id);
    if(existing&&!existing.closed){await render(existing);return;}
    const active=entries.get(stack.active?.id);if(active)remember(active);
    if(kind==='title'||kind==='result')await stack.closeAll();
    let resolve,reject;const ready=new Promise((yes,no)=>{resolve=yes;reject=no;});
    stack.open(def,{activated:{resolve,reject}}).catch(reject);await ready;
  }
  function openSettings(){
    if(settingsWanted||choiceWanted||resultWanted)return;settingsWanted=true;input.setEnabled(false);
    handlers.onUiSound?.('open');drawCorner();schedule(()=>open('settings'));
  }
  function closeSettings(){
    if(!settingsWanted)return;settingsWanted=false;input.ask();asking=null;
    input.setEnabled(!titleWanted&&!resultWanted);handlers.onUiSound?.('close');
    schedule(async()=>{await stack.close(defs.settings);drawCorner();if(!titleWanted)host.blurToScene();});
  }
  const stopLayout=host.registerLayout(()=>{drawCorner();schedule(async()=>{
    const active=entries.get(stack.active?.id),previous=keyboard?.getSnapshot().focusedId;
    for(const entry of entries.values())await render(entry,true);
    manager.setViewport(host.metrics().safe);syncLayers();focus(active,previous);
  });});
  let fullscreenChanged=()=>{drawCorner();if(titleWanted)menus.refresh();};
  document.addEventListener('fullscreenchange',fullscreenChanged);
  stack.onChange(()=>host.requestPublish());
  const menus={
    get staged(){return story.staged;},get asking(){return asking;},
    ready(){startReady=true;const e=entries.get("snow-title");if(e)e.lastFocus="snow-title:chapter";menus.refresh();},
    entry(data){entryProgress=data;const e=entries.get('snow-title');if(e)schedule(()=>render(e));},
    showTitle(){titleWanted=true;resultWanted=false;drawCorner();return schedule(()=>open('title'));},
    hideTitle(){titleWanted=false;drawCorner();return schedule(async()=>{await stack.close(defs.title);host.blurToScene();});},
    settingsOpen(){return settingsWanted;},
    choosing(){return choiceWanted;},
    choose(options){choiceOptions=[...options];choiceWanted=true;pageSince=Infinity;drawCorner();return schedule(async()=>{
      await open('choice');if(choiceWanted&&entries.get('snow-choice')?.active&&!Number.isFinite(pageSince))pageSince=performance.now();
    });},
    closeChoice(){if(!choiceWanted)return;choiceWanted=false;pageSince=Infinity;return schedule(async()=>{await stack.close(defs.choice);drawCorner();if(!titleWanted&&!resultWanted)host.blurToScene();});},
    stage:on=>story.stage(on),say:(...args)=>story.say(...args),clearSpeech:()=>story.clearSpeech(),card:(...args)=>story.card(...args),
    veil:on=>story.veil(on),waitForCharacters:on=>story.waitForCharacters(on),
    showResult(data){resultData=data;resultWanted=true;titleWanted=false;choiceWanted=false;drawCorner();return schedule(()=>open('result'));},
    hideResult(){resultWanted=false;drawCorner();return schedule(async()=>{await stack.close(defs.result);if(!titleWanted)host.blurToScene();});},
    refresh(){host.syncLocale();drawCorner();story.refresh();return schedule(async()=>{
      for(const entry of entries.values())await render(entry,true);
      manager.setViewport(host.metrics().safe);syncLayers();focus(entries.get(stack.active?.id));
    });},
    handleKey(code,event){
      if(asking)return false;
      if(settingsWanted&&code==='Escape'){event?.preventDefault();closeSettings();return true;}
      if(choiceWanted){const match=/^(?:Digit|Numpad)([1-3])$/.exec(code);
        if(match&&!event?.repeat){event?.preventDefault();ctx.pick(Number(match[1])-1);return true;}}
      return Boolean(event?.defaultPrevented);
    },
    menuSnapshot(){return {stack:stack.snapshot(),layers:manager.snapshot(),settings:settingsWanted,choice:choiceWanted,result:resultWanted,
      title:titleWanted,ready:startReady,scroll:entries.get('snow-settings')?.scroll?.offset??0,
      resultData:resultWanted&&resultData?{...resultData,actions:[...resultData.actions]}:null,
      choices:choiceWanted?choiceOptions.map(id=>({id,name:t(BOONS[id].name),text:t(BOONS[id].text)})):[]};},
    storySnapshot:()=>story.snapshot(),
    snapshot(){return menus.menuSnapshot();},
    async dispose(){
      if(closed)return;closed=true;host.retireScreensForFailure=undefined;stopLayout();document.removeEventListener('fullscreenchange',fullscreenChanged);
      input.ask();cornerScope?.dispose();story.dispose();await stack.dispose();manager.dispose();corner.dispose();
    }
  };
  // A fatal resource or host error is displayed by the loading/failure surface.
  // Release managed modal focus before the scene-independent Retry button receives focus.
  host.retireScreensForFailure=()=>{
    if(fatal)return work;
    fatal=true;titleWanted=settingsWanted=choiceWanted=resultWanted=false;
    input.ask();asking=null;input.setEnabled(false);drawCorner();story.clearSpeech();
    return schedule(()=>stack.closeAll());
  };
  drawCorner();schedule(()=>open('title'));return menus;
}
