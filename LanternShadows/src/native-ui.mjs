// Native Lantern Shadows UI. The shadow-puppet world and the interface both
// live in the same Play game; this layer only reads state and invokes commands.
import { Bitmap } from '@egret/engine';
import { HUD_SKIN } from './hud-skin-layout.mjs';
import { createParagraphCache } from '@egret/engine/paragraph';
import { createCanvasParagraphProvider } from '@egret/engine/web/paragraph';

const C={ink:0x27130d, deep:0x360e0b, red:0x711914, plaque:0x8f2119,
  cream:0xffe5aa, gold:0xe3b455, pale:0xf7dba0, muted:0xc9a67c,
  bronze:0x92632e, edge:0xb77b3c, peach:0xffa184, green:0x287b55};
const SKIN={text:C.cream,panel:C.deep,panelAlpha:.94,button:0x57321c,buttonText:C.cream,
  disabled:0x553632,accent:C.gold,track:0x3d2119,radius:12,size:22,dim:.55};
const ACTS=['act1','act2','act3'];
const TOUCH=['stick','jump','attack','dodge','special'];
const FONTS=['Microsoft YaHei','PingFang SC','Noto Sans CJK SC','serif'];
const nonempty=value=>value!=null&&String(value).trim().length>0;
const safeText=value=>nonempty(value)?String(value):'—';
const clamp=(value,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number(value)||0));
const box=(x,y,width,height,children=[],style={})=>({type:'panel',x,y,width,height,children,...style});
const text=(name,x,y,width,height,value,size=23,style={})=>({type:'text',...(name?{name}:{}),x,y,width,height,text:safeText(value),size,...style});
const button=(name,x,y,width,height,value,size=23,style={})=>({type:'button',name,x,y,width,height,text:safeText(value),size,
  border:{color:C.edge,width:1.5},color:0x5d331d,...style});
const line=(x,y,width,color=C.gold)=>box(x,y,width,2,[],{color});
const paragraph=(lineHeight,maxLines)=>({fontFamilies:FONTS,locale:'zh-CN',lineHeight,maxLines});
const arr=value=>Array.isArray(value)?value:[];
const mix=(a,b,t)=>[16,8,0].reduce((n,bit)=>n+(Math.round(((a>>bit)&255)*(1-t)+((b>>bit)&255)*t)<<bit),0);
function sample(stops,t){
  let i=1;while(i<stops.length-1&&t>stops[i][0])i++;
  const [x,c]=stops[i-1],[y,d]=stops[i];return mix(c,d,clamp((t-x)/(y-x)));
}
function paintCurtain(g,w,h){
  // Match the original silk folds: continuous highlights across the red cloth,
  // then a soft fall into shadow toward the lower hem. One native Sprite.
  const colors=[[0,0x5c100d],[.32,0x5c100d],[.54,0x7c1711],[.62,0x8f1d16],[.84,0x6a120e],[1,0x5c100d]];
  const strips=300;
  for(let i=0;i<strips;i++){
    const x=i*w/strips,next=(i+1)*w/strips,t=((i+.5)*10/strips)%1;
    g.beginFill(sample(colors,t)).drawRect(x,0,next-x,h).endFill();
  }
  for(let i=0;i<42;i++){
    const start=i*h/42,end=(i+1)*h/42,t=(i+.5)/42;
    const dim=.05+.40*Math.pow(clamp((t-.53)/.47),1.35);
    g.beginFill(0x170302,dim).drawRect(0,start,w,end-start).endFill();
  }
}
function paintGong(g,size){
  const c=size/2,r=c-3;
  g.beginFill(0x623b0e).drawCircle(c,c,r).endFill();
  g.beginFill(0xf6d68d).drawCircle(c,c,r-2).endFill();
  g.beginFill(0x8a581a).drawCircle(c,c,r-5).endFill();
  const face=r-10,stops=[[0,0xb57921],[.45,0xc99631],[.72,0xf3c85b],[1,0xffefa6]];
  for(let i=0;i<28;i++){
    const t=i/27,rad=face*(1-.78*t);
    g.beginFill(sample(stops,t)).drawCircle(c-face*.24*t,c-face*.30*t,rad).endFill();
  }
}
function paintPeach(g,size){
  const x=size/2,y=size*.56,r=size*.39;
  g.beginFill(0x4a251b).drawCircle(x,y,r+1.3).endFill();
  const stops=[[0,0xe98269],[.50,0xffb496],[1,0xffdbb8]];
  for(let i=0;i<13;i++){
    const t=i/12;g.beginFill(sample(stops,t)).drawCircle(x-r*.24*t,y-r*.28*t,r*(1-.79*t)).endFill();
  }
  g.beginFill(0x243a28).drawEllipse(x-1,0,size*.39,size*.23).endFill();
  g.beginFill(0x2b8a55).drawEllipse(x+1,1,size*.29,size*.16).endFill();
}
function paintTrack(g,w,h){
  g.beginFill(0x9a8050).drawRoundRect(0,0,w,h,h,h).endFill();
  g.beginFill(0x2b170f).drawRoundRect(2,2,w-4,h-4,h-4,h-4).endFill();
  g.beginFill(0x3d2417).drawRoundRect(8,8,w-16,h-16,h-16,h-16).endFill();
}
function paintKnob(g,size){
  const c=size/2,r=c-2;
  g.beginFill(C.cream).drawCircle(c,c,r).endFill();
  g.beginFill(0x652a18).drawCircle(c,c,r-1.5).endFill();
  g.beginFill(0x8f3b23).drawCircle(c,c,r*.78).endFill();
  g.beginFill(0xb75a30).drawCircle(c,c,r*.55).endFill();
  g.beginFill(0xe5a05a).drawCircle(c,c,r*.25).endFill();
  g.beginFill(0x9d4b29).drawCircle(c,c,r*.13).endFill();
}
function paintAction(g,size,name,held){
  const c=size/2,r=size*(name==='attack'?.49:.455),rim=name==='attack'?C.gold:C.muted;
  g.beginFill(rim).drawCircle(c,c,r).endFill();
  g.beginFill(held?0xa45c23:name==='attack'?0x95251a:0x321b12).drawCircle(c,c,r-3).endFill();
  if(held)g.beginFill(0xe2b06a,.12).drawCircle(c,c,r-7).endFill();
}
const titleLine=value=>arr(value).filter(nonempty).map(v=>Array.isArray(v)?v.join('　'):String(v)).join('　');

export function createLanternUi(play,state,cb) {
  const provider=play.scope.use(createCanvasParagraphProvider({buildIdentity:'lantern-system-fonts'}));
  const paragraphCache=play.scope.use(createParagraphCache(play.engine.assets,{
    provider,maxEntries:32,maxImageBytes:16*1024*1024,maxPendingJobs:24,
  }));
  let mainView=null,touchView=null,modalView=null,modalKind=null,layoutKey='',currentScreen='',closed=false;
  let stickBase=0,stickTravel=0,comboBaseX=0,comboW=0,comboPulseAt=0;
  let peachNodes=[],touchDecor=new Map(),hudSkin=null;
  const info=new Map();
  const tr=(zh,en)=>state.lang==='en'?en:zh;
  const english=()=>state.lang==='en';
  const areas=()=>{
    const screen=play.screen,safe=play.safe;
    const scale=Math.max(.12,play.browser.screen.scale); // The fitted stage already knows the CSS-pixel scale.
    const target=Math.min(116,Math.max(46,Math.ceil(44/scale)+1));
    return {w:screen.width,h:screen.height,left:safe.x-screen.x,top:safe.y-screen.y,
      sw:safe.width,sh:safe.height,clothX:-screen.x,clothY:-screen.y,target,portrait:screen.height>screen.width};
  };
  function root(parts){const a=areas();return box(0,0,a.w,a.h,parts);}
  function make(label,parts,bind={},options={}) {
    const {modal=false,dim=SKIN.dim,initialFocus,dismiss,gamepad=true,skin={}}=options;
    const description={label,area:'screen',root:root(parts),skin:{...SKIN,dim,...skin},modal};
    const bindings={...bind},actions=[];
    // Optional status lines disappear when blank; Play now excludes empty
    // bound text from the semantic tree without a synthetic visual label.
    function visit(part) {
      const original=bind[part.name];
      if(part.name&&part.type==='text'&&original?.text) {
        const read=original.text,visible=original.visible;
        bindings[part.name]={...original,text:s=>String(read(s)??''),
          visible:s=>nonempty(read(s))&&(!visible||Boolean(visible(s)))};
      }
      if(part.type==='button'||part.type==='toggle'||(part.type==='panel'&&original?.tap))actions.push(part);
      (part.children??[]).forEach(visit);
    }
    visit(description.root);
    const view=play.show(description,{state,bind:bindings,paragraphCache,gamepad,
      ...(initialFocus?{initialFocus}:{}),...(dismiss?{dismiss}:{})});
    info.set(view,{actions,bindings,decor:[]});
    return view;
  }
  function decorate(view,name,paint){
    const parent=view.get(name),node=play.sprite(paint,parent);
    node.touchEnabled=false;parent.setChildIndex(node,0);info.get(view).decor.push(node);return node;
  }
  // The view still owns the native focus/touch nodes. Only its static art uses the
  // shared texture; all crops borrow the one scope-owned lease.
  function decorateSkin(view,name,key,width,height,paint){
    if(!hudSkin)return decorate(view,name,paint);
    const parent=view.get(name),node=play.scope.use(new Bitmap(hudSkin)),crop=HUD_SKIN[key];
    node.sourceRect=crop;node.scaleX=width/crop.width;node.scaleY=height/crop.height;
    node.touchEnabled=false;parent.addChild(node);parent.setChildIndex(node,0);
    info.get(view).decor.push(node);return node;
  }
  function destroy(view){if(view){for(const node of info.get(view)?.decor??[])if(!node.isDisposed)play.remove(node);info.delete(view);view.close();}}
  function closeModal(){const old=modalView;modalView=null;modalKind=null;destroy(old);}
  function curtain(a,name) {
    return [
      box(0,0,a.w,a.h,[],{name,color:C.deep}),      box(10,10,Math.max(0,a.w-20),Math.max(0,a.h-20),[],{border:{color:C.gold,width:1}}),
      box(0,a.h-7,a.w,7,[],{color:C.gold}),
    ];
  }
  const ready=s=>Boolean(s.ready&&!s.error);
  const labels=()=>[
    [tr('直接会哪吒','Straight to Nezha'),'start-boss','act1','boss'],
    [tr('从第二幕蟠桃园演起','Begin with act two, the Peach Orchard'),'start-act2','act2',undefined],
    [tr('直接会二郎神','Straight to Erlang'),'start-erlang','act2','boss'],
    [tr('从第三幕兜率宫演起','Begin with act three, the Tushita Palace'),'start-act3','act3',undefined],
    [tr('直接会太上老君','Straight to Laozi'),'start-laozi','act3','boss'],
  ];
  function buildTitle() {
    const a=areas(),p=a.portrait,target=a.target;
    const width=Math.min(a.sw-32,p?850:920),left=a.left+(a.sw-width)/2;
    const rowH=p?Math.max(target,78):Math.min(Math.max(target,48),70);
    const cols=p?1:3,gap=p?12:10,entryH=Math.ceil(5/cols)*rowH+(Math.ceil(5/cols)-1)*gap;
    const head=p?205:114,gongH=p?Math.max(208,target*1.65):106;
    const extra=p?44:12,foot=p?180:94;
    const total=head+gongH+entryH+rowH+foot+gap*3+extra;
    const top=a.top+Math.max(8,(a.sh-total)/2),cx=a.left+a.sw/2;
    const startY=top+head,entryY=startY+gongH+gap,trialY=entryY+entryH+gap;
    const parts=[...curtain(a,'curtain'),
      text(null,left,top,width,p?58:33,tr('灯影','Lantern Shadows'),p?45:29,{align:'center',color:C.gold,bold:true}),
      text(null,left,top+(p?58:30),width,p?94:56,tr('闹天宫','Havoc in Heaven'),p?(english()?67:88):(english()?60:66),{bold:true,align:'center'}),
      text(null,left,top+(p?152:86),width,p?46:28,
        tr('南天门　蟠桃园　兜率宫','The Southern Gate · The Peach Orchard · The Tushita Palace'),
        p?(english()?27:33):20,{align:'center',color:C.pale}),
      button('start',cx-gongH/2,startY,gongH,gongH,tr('开锣','Begin'),p?52:36,
        {color:0xa66a23,textColor:0x261409,border:undefined}),
      button('lang',a.left+a.sw-target-13,a.top+10,target,target,tr('EN','中文'),p?32:23,{color:C.deep}),
    ];
    const bindings={
      start:{visible:s=>!s.error,disabled:s=>!ready(s),tap:()=>cb.start?.(state.openingAct||'act1',state.openingFrom)},
      lang:{tap:()=>cb.lang?.()},
    };
    const bw=(width-(cols-1)*gap)/cols;
    labels().forEach(([label,name,act,from],i)=>{
      const row=Math.floor(i/cols),count=Math.min(cols,5-row*cols),dx=(width-count*bw-(count-1)*gap)/2;
      parts.push(button(name,left+dx+(i%cols)*(bw+gap),entryY+row*(rowH+gap),bw,rowH,label,
        p?(english()?32:35):(english()?Math.max(15,label.length>31?16:19):23),
        {color:C.deep,border:{color:0xad7340,width:1}}));
      bindings[name]={disabled:s=>!ready(s),tap:()=>cb.start?.(act,from)};
    });
    parts.push(button('trial-picker',cx-Math.min(width, p?430:260)/2,trialY,Math.min(width,p?430:260),rowH,
      tr('单棒试演','Staff Trial'),p?37:25,{color:0x4d2418,border:{color:C.gold,width:1.5}}));
    bindings['trial-picker']={visible:s=>s.recordsEnabled!==false,disabled:s=>!ready(s),tap:openTrials};
    const recordY=trialY+rowH+6;
    parts.push(text('show-records',left,recordY,width,p?72:36,'—',p?32:20,{align:'center',color:C.gold,
      paragraph:paragraph(p?37:25,p?2:1)}));
    bindings['show-records']={text:s=>titleLine(s.records),visible:s=>s.recordsEnabled!==false};
    const statusY=recordY+(p?68:30);
    parts.push({type:'bar',name:'loading-progress',label:tr('加载进度','Loading progress'),x:cx-width*.3,y:statusY+5,width:width*.6,height:p?12:6,value:0,color:C.gold},
      text('status',left,statusY+(p?16:11),width,p?55:42,'—',p?30:19,{align:'center',color:C.cream,
        paragraph:paragraph(p?32:21,2)}),
      button('reload',cx-gongH/2,startY,gongH,gongH,tr('重新加载','Reload'),p?32:24,{color:0x8e3226}));
    bindings['loading-progress']={visible:s=>!s.ready&&!s.error,value:s=>clamp(s.progress)};
    bindings.status={text:s=>s.error||(!s.ready?tr('正在挂灯、理线……','Hanging the lamp…'):''),visible:s=>!s.ready||Boolean(s.error)};
    bindings.reload={visible:s=>Boolean(s.error),tap:()=>cb.reload?.()};
    const native=make(tr('戏单','Playbill'),parts,bindings,{modal:true,dim:0,skin:{radius:gongH/2}});
    decorate(native,'curtain',g=>paintCurtain(g,a.w,a.h));
    decorate(native,'start',g=>paintGong(g,gongH));
    return native;
  }
  function openTrials() {
    if(modalView||state.screen!=='title'||!ready(state)||state.recordsEnabled===false)return;
    const a=areas(),p=a.portrait,w=Math.min(a.sw-40,p?790:760),h=Math.min(a.sh-30,p?710:440);
    const x=a.left+(a.sw-w)/2,y=a.top+(a.sh-h)/2,buttonH=p?Math.max(86,a.target):Math.max(54,Math.min(a.target,64));
    const parts=[
      box(x,y,w,h,[],{color:C.deep,border:{color:C.gold,width:2.5}}),
      text(null,x+20,y+12,w-40,p?90:56,tr('单棒试演','Staff Trial'),p?55:38,{bold:true,align:'center'}),
      text(null,x+26,y+(p?105:69),w-52,p?90:60,
        tr('仅凭金箍棒过关，本幕不能使用身外身。试演成绩单独保存。','Clear the act with your staff and no clones. Trials keep their own records.'),
        p?33:22,{align:'center',paragraph:paragraph(p?41:26,2)}),
    ];
    const bindings={};
    const defaults=[tr('南天门','The Gate'),tr('蟠桃园','The Orchard'),tr('兜率宫','The Palace')];
    const by=p?215:121;
    ACTS.forEach((act,index)=>{
      const name='trial-'+act;
      parts.push(button(name,x+46,y+by+index*(buttonH+10),w-92,buttonH,defaults[index],p?35:25,{color:0x6a2618}));
      bindings[name]={text:s=>safeText(arr(s.trialRecords)[index]||defaults[index]),tap:()=>{closeModal();cb.trial?.(act);}};
    });
    parts.push(button('close',x+w/2-(p?150:115),y+h-buttonH-15,p?300:230,buttonH,tr('返回戏单','Back to playbill'),p?32:24,{color:C.deep}));
    bindings.close={tap:closeModal};
    modalKind='trial';
    modalView=make(tr('单棒试演','Staff Trial'),parts,bindings,{modal:true,initialFocus:'trial-act1',dismiss:closeModal});
  }
  function actionTool(name,zh,en,cbName,x,y,w,h,size,bind,parts,visible) {
    parts.push(button(name,x,y,w,h,tr(zh,en),size,{color:C.ink}));
    bind[name]={tap:()=>cb[cbName]?.(),...(visible?{visible}:{}),
      ...(name==='mute'?{color:s=>s.muted?0x54312a:0x4c3822}:{}),
      ...(name==='music'?{color:s=>s.musicMuted?0x54312a:0x4c3822}:{}),
      ...(name==='screen-controls'?{color:s=>s.controls?0x796032:C.ink}:{}),
    };
  }
  function buildHud() {
    const a=areas(),p=a.portrait,parts=[],bind={},cx=a.clothX,cy=a.clothY;
    const target=a.target,size=p?Math.max(28,Math.round(target*.32)):20;
    const toolDefs=[
      ['back','返回','Back','showcase',70],['lang','EN','中文','lang',61],
      ['mute','音效','Effects','mute',80],['music','配乐','Music','music',80],
      ['screen-controls','屏幕按键','On-screen','controls',114],['pause-play','暂停','Pause','pause',80],
      ['full','全屏','Full screen','full',114],
    ];
    let toolbarLeft=a.left+a.sw;
    const toolVis={full:s=>Boolean(s.fullAvailable),'pause-play':s=>!s.paused};
    if(p){
      for(const [i,[name,zh,en,cbName]] of toolDefs.entries()){
        const row=i<4?0:1,col=i<4?i:i-4,cols=row===0?4:3,w=(a.sw-28-(cols-1)*10)/cols;
        actionTool(name,zh,en,cbName,a.left+14+col*(w+10),a.top+12+row*(target+11),w,target,['mute','music','screen-controls'].includes(name)?Math.max(25,size-3):size,bind,parts,toolVis[name]);
      }
    }else{
      const widths=toolDefs.map(t=>Math.max(target,t[4])),total=widths.reduce((n,x)=>n+x,0)+6*5;
      let x=a.left+a.sw-total-10;toolbarLeft=x;
      toolDefs.forEach(([name,zh,en,cbName],i)=>{actionTool(name,zh,en,cbName,x,a.top+8,widths[i],target,['mute','music','screen-controls'].includes(name)?(english()?16:17):english()&&name==='full'?18:size,bind,parts,toolVis[name]);x+=widths[i]+5;});
    }
    bind['lang'].text=()=>tr('EN','中文');
    bind.mute.text=s=>s.muted?tr('音效 关','Effects off'):tr('音效 开','Effects on');
    bind.music.text=s=>s.musicMuted?tr('配乐 关','Music off'):tr('配乐 开','Music on');
    bind['screen-controls'].text=s=>s.controls?tr('屏幕按键 开','On-screen on'):tr('屏幕按键 关','On-screen off');
    bind['full'].text=s=>s.full?tr('退出全屏','Exit full'):tr('全屏','Full screen');

    const bannerX=p?a.left+18:cx+19,bannerY=p?Math.max(a.top+target*2+35,cy-250):cy+12;
    const bannerW=p?a.sw-36:Math.min(300,Math.max(165,toolbarLeft-bannerX-8)),bannerH=p?64:42;
    const healthX=p?a.left+27:cx+22,healthY=p?bannerY+78:cy+64;
    const healthSize=p?47:31,healthW=p?455:316;
    const maxHealth=Math.min(8,Math.max(1,Number(state.maxHealth)||5));
    const healthParts=[text('health-label',0,0,p?154:110,healthSize,tr('桃','Health'),p?31:20,{bold:true,color:p?C.pale:0x512414})];
    const healthBind={text:s=>tr('桃','Health')+' '+Math.max(0,s.health??0)+'/'+(s.maxHealth??maxHealth)};
    for(let i=0;i<maxHealth;i++){
      const name='peach-'+i,x=(p?164:116)+i*(healthSize+4);
      healthParts.push(box(x,0,healthSize,healthSize,[],{name}));
    }
    parts.push(box(bannerX,bannerY,bannerW,bannerH,[],{color:C.plaque,border:{color:C.gold,width:1.5}}),
      text('act-banner',bannerX+6,bannerY,bannerW-12,bannerH,'—',p?35:(english()?Math.min(18,bannerW/15):22),{align:'center',bold:true}),
      box(healthX,healthY,healthW,healthSize+6,healthParts,{name:'peaches',label:tr('桃','Health peaches')}));
    bind['act-banner']={text:s=>s.actTitle};
    bind['health-label']=healthBind;
    const hairsY=healthY+healthSize+(p?20:9),hairW=p?Math.min(480,a.sw*.54):295;
    parts.push(box(healthX,hairsY,hairW,p?58:37,[
      text(null,0,0,p?110:59,p?58:37,tr('毫毛','Hairs'),p?27:19,{color:p?C.pale:0x512414,bold:true}),
      {type:'bar',name:'hairs-fill',label:tr('毫毛','Hairs'),x:p?115:66,y:p?19:13,width:p?220:138,height:p?18:12,value:0,color:C.gold},
      text('hair-ready',p?343:210,0,p?128:81,p?58:37,'—',p?23:16,{color:C.gold,bold:true}),
    ],{name:'hairs',label:tr('毫毛','Hairs')}));
    bind.hairs={visible:s=>!s.solo};
    bind['hairs-fill']={value:s=>clamp(s.hairs),color:s=>s.tuftReady?0xffd76a:C.gold};
    bind['hair-ready']={text:s=>s.tuftReady?tr('身外身！','Ready!'):'',visible:s=>!s.controls};

    const tallyX=p?a.left+a.sw*.56:cx+730,tallyY=p?healthY:cy+target+22,tallyW=p?a.sw*.40:182;
    if(!p)parts.push(box(tallyX-8,tallyY-4,tallyW+16,57,[],{color:C.ink,alpha:.76,border:{color:C.edge,width:1}}));
    parts.push(text('soldiers',tallyX,tallyY,tallyW,p?50:28,'—',p?31:22,{align:'right',color:C.pale,bold:true}),
      text('clock',tallyX,tallyY+(p?45:26),tallyW,p?45:27,'0:00',p?29:20,{align:'right',color:C.pale}));
    bind.soldiers={text:s=>s.soldiers};
    bind.clock={text:s=>s.clock||'0:00'};
    const bossX=p?a.left+38:cx+307,bossY=p?Math.max(hairsY+68,cy-91):cy+88,bossW=p?a.sw-76:422,bossH=p?68:40;
    parts.push(box(bossX,bossY,bossW,bossH,[
      text('boss-name',9,0,p?196:107,bossH,'—',p?31:23,{bold:true,color:C.cream}),
      {type:'bar',name:'boss-health',label:tr('首领气血','Boss health'),x:p?210:118,y:p?23:13,width:bossW-(p?226:132),height:p?20:13,color:0xdc4d35,value:1},
    ],{name:'boss',color:0x4e2118,alpha:.94,border:{color:C.gold,width:1.5},label:tr('首领气血','Boss health')}));
    bind.boss={visible:s=>nonempty(s.bossName)};
    bind['boss-name']={text:s=>s.bossName};
    bind['boss-health']={value:s=>clamp(s.bossRatio)};

    const noticeW=p?Math.min(a.sw-24,850):570,noticeX=p?a.left+(a.sw-noticeW)/2:cx+84,noticeY=p?cy+11:cy+144,noticeH=p?76:56;
    parts.push(box(noticeX,noticeY,noticeW,noticeH,[],{name:'notice-panel',color:C.plaque,alpha:.94,border:{color:C.gold,width:1.5}}),
      text('notice',noticeX+8,noticeY+2,noticeW-16,noticeH-4,'—',p?29:20,{color:C.cream,bold:true,align:'center',paragraph:paragraph(p?35:24,2)}));
    bind['notice-panel']={visible:s=>nonempty(s.notice)};
    bind.notice={text:s=>s.notice};

    const comboX=p?a.left+a.sw*.55:cx+718,comboY=p?cy+105:cy+Math.max(126,target+84),comboWidth=p?a.sw*.41:202;
    comboBaseX=comboX;comboW=comboWidth;
    parts.push(text('combo',comboX,comboY,comboWidth,p?68:50,'—',p?48:37,{align:'right',bold:true,color:0xf4b75b}),
      text('best',comboX,comboY+(p?76:62),comboWidth,p?43:31,'—',p?29:20,{align:'right',color:C.gold}));
    bind.combo={text:s=>typeof s.combo==='number'?(s.combo>=2?s.combo+' '+tr('连击','hits'):''):s.combo};
    bind.best={text:s=>s.best};
    // Put the compact readout on the wooden apron, not over actors' bodies.
    const crowdW=p?Math.min(a.sw-60,700):395,crowdX=p?a.left+(a.sw-crowdW)/2:cx+195;
    const crowdY=p?cy+548:cy+455,crowdH=p?50:28;
    parts.push(box(crowdX,crowdY,crowdW,crowdH,[],{name:'crowd-shade',color:C.ink,alpha:.60}),
      text('crowd',crowdX+5,crowdY,crowdW-10,crowdH,'—',p?25:(english()?16:19),{align:'center',bold:true,color:C.pale}));
    bind['crowd-shade']={visible:s=>nonempty(s.crowd)};
    bind.crowd={text:s=>s.crowd};
    parts.push(text('keys',a.left+12,p?cy+622:cy+497,a.sw-24,p?56:30,
      tr('A D 走　空格 跳　J 棍，连按三下　L 闪避　I 身外身　P 暂停','A D Move · Space Jump · J Staff, three in a row · L Dodge · I Clones · P Pause'),
      p?29:20,{align:'center',color:C.pale}));
    bind.keys={visible:s=>!s.controls};
    parts.push(text('stats',a.left+16,p?cy+690:cy+468,a.sw-32,p?50:30,'—',p?23:16,{color:C.pale}));
    bind.stats={text:s=>String(s.stats??'').replaceAll('\n','  ·  ')};
    const native=make(tr('战斗界面','Battle HUD'),parts,bind,{gamepad:false});
    peachNodes=Array.from({length:maxHealth},(_,i)=>decorateSkin(native,'peach-'+i,p?'peachLarge':'peachSmall',healthSize,healthSize,g=>paintPeach(g,healthSize)));
    return native;
  }
  function buildTouch() {
    const a=areas(),p=a.portrait;
    const size=Math.max(a.target,p?100:74),stickW=Math.max(152,size*2.05),stickH=size,
      bottom=p?a.top+a.sh-65:a.top+a.sh-15,y=bottom-stickH;
    const stickX=a.left+24,knob=Math.max(45,size*.62),baseX=(stickW-knob)/2;
    stickBase=baseX;stickTravel=stickW*.27;
    const bind={},parts=[
      box(stickX,y,stickW,stickH,[
        line(stickW*.15,stickH*.5,stickW*.7,C.edge),
        text(null,6,0,36,stickH,'‹',p?43:32,{bold:true,align:'center'}),
        text(null,stickW-42,0,36,stickH,'›',p?43:32,{bold:true,align:'center'}),
        box(baseX,(stickH-knob)/2,knob,knob,[],{name:'stick-knob'}),
      ],{name:'stick',label:tr('左右移动摇杆','Horizontal movement stick')}),
    ];
    const enabled=s=>s.controls&&s.screen==='play'&&!s.paused&&!s.error;
    bind.stick={tap:()=>{},pointerOnly:true,visible:enabled};
    const actionDefs=[['special',tr('变','Hairs')],['dodge',tr('闪','Roll')],['attack',tr('棍','Staff')],['jump',tr('跳','Jump')]];
    const gap=p?12:10,total=4*size+3*gap,actionX=a.left+a.sw-total-23;
    actionDefs.forEach(([name,label],i)=>{
      const w=size,h=size,x=actionX+i*(size+gap),color=name==='attack'?0x902b1b:0x412417;
      parts.push(box(x,y,w,h,[text(null,3,0,w-6,h,label,p?Math.max(28,Math.round(size*.35)):26,{align:'center',bold:true})],
        {name,label}));
      bind[name]={tap:()=>{},pointerOnly:true,visible:enabled};
    });
    const native=make(tr('屏幕按键','On-screen controls'),parts,bind,{gamepad:false});
    decorateSkin(native,'stick','track',stickW,stickH,g=>paintTrack(g,stickW,stickH));
    decorateSkin(native,'stick-knob','knob',knob,knob,g=>paintKnob(g,knob));
    touchDecor=new Map();
    for(const [name] of actionDefs){
      const key=name==='attack'?'attack':'action';
      const normal=decorateSkin(native,name,key,size,size,g=>paintAction(g,size,name,false));
      if(hudSkin) {
        // Normal and held share the same crop dimensions. Change the crop only on
        // an input/status transition, instead of drawing two superposed faces.
        touchDecor.set(name,{bitmap:normal,key,glowing:false});
      } else {
        const hot=decorate(native,name,g=>paintAction(g,size,name,true));
        native.get(name).setChildIndex(normal,0);
        hot.alpha=0;touchDecor.set(name,{hot});
      }
    }
    return native;
  }
  function buildPause() {
    const a=areas(),w=Math.min(a.sw-32,a.portrait?430:270),h=Math.max(a.target,a.portrait?110:74);
    modalKind='pause';
    modalView=make(tr('暂停','Pause'),[
      button('paused',a.left+(a.sw-w)/2,a.top+(a.sh-h)/2,w,h,tr('继续演出','Resume'),a.portrait?42:30,
        {color:C.plaque,border:{color:C.gold,width:2.5}}),
    ],{paused:{tap:()=>cb.pause?.()}},{modal:true,dim:.06,initialFocus:'paused',dismiss:()=>cb.pause?.()});
  }
  function buildError() {
    const a=areas(),p=a.portrait,w=Math.min(a.sw-42,p?830:760),h=p?360:230,x=a.left+(a.sw-w)/2,y=a.top+(a.sh-h)/2;
    modalKind='error';
    modalView=make(tr('戏演不下去了','The play cannot go on'),[
      box(x,y,w,h,[],{color:C.deep,border:{color:C.gold,width:2}}),
      text(null,x+16,y+8,w-32,p?72:53,tr('戏演不下去了','The play cannot go on'),p?45:31,{bold:true,align:'center'}),
      text('trouble',x+22,y+(p?90:62),w-44,p?145:91,'—',p?31:22,{paragraph:paragraph(p?38:27,3)}),
      button('reload',x+w/2-(p?160:120),y+h-Math.max(a.target,p?100:60)-14,p?320:240,Math.max(a.target,p?100:60),tr('重新加载','Reload'),p?33:24),
    ],{trouble:{text:s=>s.error},reload:{tap:()=>cb.reload?.()}},{modal:true,initialFocus:'reload',dim:.7});
  }
  function buildResult() {
    const a=areas(),p=a.portrait,w=Math.min(a.sw-28,p?850:920),h=Math.min(a.sh-22,p?960:500),
      x=a.left+(a.sw-w)/2,y=a.top+(a.sh-h)/2,target=Math.min(p?128:75,Math.max(a.target,p?102:52));
    const rankSize=Math.min(p?168:115,h*.24),statsX=x+rankSize+42,statsW=x+w-24-statsX;
    const rowH=h*.052;
    const titleH=h*.12,statY=y+h*.14,replayY=y+h*.43,replayH=h*.31,finalY=y+h*.76,
      actionY=y+h-target-10;
    const parts=[...curtain(a,'result'),
      box(x,y,w,h,[],{name:'result-sheet',color:0x4e140f,alpha:.94,border:{color:C.gold,width:2.5}}),
      text('result-title',x+14,y+3,w-28,titleH,'—',p?48:33,{bold:true,align:'center',color:C.pale}),
      line(x+18,y+titleH,w-36),
      box(x+24,statY,rankSize,rankSize,[],{color:0xb52a21,border:{color:C.cream,width:3}}),
      text('rank',x+24,statY,rankSize,rankSize,'S',rankSize*.67,{bold:true,align:'center',color:C.cream}),
    ],bindings={
      'result-title':{text:s=>s.result?.title},rank:{text:s=>s.result?.rank||'S'},
    };
    const tallyRows=[];
    for(let i=0;i<5;i++){
      const id='tally-'+i;tallyRows.push(text(id,0,i*rowH,statsW,rowH,'—',p?34:23,{color:C.pale}));
      bindings[id]={text:s=>{const v=arr(s.result?.tally)[i];return Array.isArray(v)?v.join('　'):v;}};
    }
    parts.push(box(statsX,statY,statsW,rowH*5,tallyRows,{name:'tally',label:tr('结算统计','Result statistics')}));
    const replayParts=[
      text('personal-best',5,0,w-58,replayH*.25,'—',p?32:23,{align:'center',color:C.gold,bold:true}),
    ];
    for(let i=0;i<3;i++){
      const id='goal-'+i,gw=(w-62)/3;
      replayParts.push(text(id,3+i*gw,replayH*.29,gw-4,replayH*.29,'—',p?27:20,{align:'center',color:C.pale}));
      bindings[id]={text:s=>arr(s.result?.goals)[i]};
    }
    const rw=Math.min(w-50,p?440:300),rh=Math.min(target,replayH*.36);
    replayParts.push(button('try-trial',(w-46-rw)/2,replayH-rh-1,rw,rh,tr('单棒试演本幕','Play the Staff Trial'),p?31:22,{color:0x70451d}));
    bindings['try-trial']={text:s=>typeof s.result?.trialEntry==='string'&&s.result.trialEntry?s.result.trialEntry:tr('单棒试演本幕','Play the Staff Trial'),
      visible:s=>Boolean(s.result?.trialEntry),tap:()=>cb.trial?.(state.result?.act||state.currentAct||state.openingAct||'act1')};
    parts.push(box(x+23,replayY,w-46,replayH,replayParts,{name:'replay',label:tr('个人最好','Personal best'),
      color:0x39110e,alpha:.8,border:{color:C.edge,width:1.5}}),
      text('finale',x+20,finalY,w-40,Math.min(h*.09,actionY-finalY),'—',p?31:20,{align:'center',color:C.gold}));
    bindings.replay={visible:s=>Boolean(nonempty(s.result?.personalBest)||arr(s.result?.goals).length||s.result?.trialEntry)};
    bindings['personal-best']={text:s=>s.result?.personalBest};
    bindings.finale={text:s=>s.result?.finale};
    const aw=(w-58)/3;
    parts.push(button('again',x+19,actionY,aw,target,tr('再演','Again'),p?38:28,{color:0xa06422}),
      button('next',x+29+aw,actionY,aw,target,tr('下一幕','Next act'),p?38:28,{color:0xa06422}),
      button('playbill-back',x+39+2*aw,actionY,aw,target,tr('回戏单','Playbill'),p?35:25,{color:0x5b2c1a}));
    bindings.again={tap:()=>cb.again?.()};
    bindings.next={visible:s=>Boolean(s.result?.hasNext),tap:()=>cb.next?.()};
    bindings['playbill-back']={tap:()=>cb.playbill?.()};
    const native=make(tr('落幕','Curtain'),parts,bindings,{modal:true,dim:0,initialFocus:'again'});
    decorate(native,'result',g=>paintCurtain(g,a.w,a.h));return native;
  }
  function refresh() {
    if(closed)return;
    const a=areas(),key=[state.screen,state.lang,a.w,a.h,a.left,a.top,a.sw,a.sh,a.target].map(v=>typeof v==='number'?Math.round(v*10)/10:v).join('|');
    if(key!==layoutKey){
      const reopen=modalKind==='trial'&&state.screen==='title'&&currentScreen==='title';
      closeModal();destroy(touchView);destroy(mainView);touchView=null;mainView=null;
      currentScreen=state.screen;layoutKey=key;peachNodes=[];touchDecor.clear();comboPulseAt=0;
      if(state.screen==='title')mainView=buildTitle();
      else if(state.screen==='result')mainView=buildResult();
      else {mainView=buildHud();touchView=buildTouch();}
      if(reopen)openTrials();
    }
    const wanted=state.screen==='play'?(state.error?'error':state.paused?'pause':null):null;
    if(modalKind!=='trial'&&wanted!==modalKind){closeModal();if(wanted==='pause')buildPause();if(wanted==='error')buildError();}
    if(state.screen==='play'&&mainView){
      peachNodes.forEach((node,i)=>{const alpha=i<Number(state.health)?1:.24;if(node.alpha!==alpha)node.alpha=alpha;});
      const node=mainView.get('combo'),remaining=comboPulseAt?Math.max(0,1-(performance.now()-comboPulseAt)/155):0;
      const scale=1+.24*remaining;
      if(Math.abs(node.scaleX-scale)>.001){node.scaleX=node.scaleY=scale;node.x=comboBaseX-comboW*(scale-1);}
      if(!remaining)comboPulseAt=0;
    }
    if(touchView){
      const knob=touchView.get('stick-knob'),x=stickBase+clamp(state.stickAxis,-1,1)*stickTravel;
      if(Math.abs(knob.x-x)>.1)knob.x=x;
      for(const [name,decor] of touchDecor){
        const held=Boolean(state.heldActions?.[name]||(name==='special'&&state.heldActions?.special));
        const glowing=held||(name==='special'&&state.tuftReady&&!state.solo);
        const alpha=name==='special'&&(state.solo||!state.tuftReady)&&!held?.46:1;
        if(decor.bitmap) {
          if(decor.glowing!==glowing){decor.bitmap.sourceRect=HUD_SKIN[decor.key+(glowing?'Hot':'')];decor.glowing=glowing;}
        } else if(decor.hot.alpha!==(glowing?1:0))decor.hot.alpha=glowing?1:0;
        const target=touchView.get(name);if(target.alpha!==alpha)target.alpha=alpha;
      }
    }
  }
  const alias={ 'move-stick':'stick','dash':'dodge','combo-count':'combo','filling':'loading-progress','hud':'act-banner','trial-close':'close' };
  function visibleViews(){return [modalView,touchView,mainView].filter(Boolean);}
  function rect(name) {
    const id=alias[name]||name;
    for(const view of visibleViews()){
      try{if(!view.shows(id))continue;const bounds=view.rect(id),at=play.toStage(bounds.x,bounds.y);return {...bounds,x:at.x,y:at.y};}catch{/* another view owns it */}
    }
    return null;
  }
  function touchTarget(target) {
    if(!touchView||state.screen!=='play'||!state.controls||state.paused||state.error||modalView)return null;
    for(const name of TOUCH){
      if(name==='special'&&state.solo)continue;
      const node=touchView.get(name);
      for(let at=target,depth=0;at&&depth<25;at=at.parent,depth++)if(at===node)return name;
    }
    return null;
  }
  function buttons(){
    const found=[];
    for(const view of visibleViews()){
      const spec=info.get(view);if(!spec)continue;
      for(const part of spec.actions){
        try{
          if(!view.shows(part.name))continue;
          const binding=spec.bindings[part.name]??{},bounds=rect(part.name);
          found.push({name:part.name,rect:bounds,text:safeText(binding.text?.(state)??part.text??part.label),
            disabled:Boolean(binding.disabled?.(state)||(part.name==='special'&&state.solo)),
            pointerOnly:Boolean(binding.pointerOnly)});
        }catch{/* The layout may just have rotated. */}
      }
    }
    return found;
  }
  function close(){if(closed)return;closed=true;closeModal();destroy(touchView);destroy(mainView);touchView=mainView=null;}
  function setHudSkin(lease){
    if(hudSkin===lease)return;
    hudSkin=lease??null;
    if(state.screen==='play'){layoutKey='';refresh();}
  }
  refresh();
  return {refresh,close,touchTarget,rect,buttons,setHudSkin,pulseCombo:()=>{if(!play.reducedMotion)comboPulseAt=performance.now();},get modalOpen(){return modalView!==null;},
    get views(){return {main:mainView,touch:touchView,modal:modalView};}};
}
