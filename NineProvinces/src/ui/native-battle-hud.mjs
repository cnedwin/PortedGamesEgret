// Native data view for the fictional battle screen. All commands are provided
// by the existing controller. This module performs no simulation or decisions.
import { getLanguage } from '../i18n.mjs';
const C={ink:0x17272b,panel:0x23373a,paper:0xf1e7cf,gold:0xdeb77b,muted:0xb9c6b6,edge:0x9c8155,selected:0x715538,card:0xe9dec4,cardSelected:0xf4e8c8,cardText:0x31483f,cardMuted:0x6b715e,good:0x9ad7a9,bad:0xe9a18a,blue:0x7cabc9};
const skin={panel:C.ink,panelAlpha:.94,text:C.paper,button:C.panel,buttonText:C.paper,disabled:0x556061,accent:C.gold,track:0x41504d,radius:3,size:14,dim:.55};
const words=(zh,en)=>getLanguage()==='en'?en:zh;
const toneColor=tone=>tone==='bad'?C.bad:tone==='good'?C.good:tone==='gold'?C.gold:tone==='dim'?C.muted:C.paper;
const clamp=(n,low=0,high=1)=>Math.max(low,Math.min(high,Number.isFinite(n)?n:low));
const k=id=>'battle-'+id;
export const makeBattleControl=(id,text,action,opts={})=>({kind:'button',id,text,action,...opts});
export const makeBattleText=(id,text,opts={})=>({kind:'text',id,text,...opts});
export const makeBattleToggle=(id,text,checked,action)=>({kind:'toggle',id,text,checked,action});
export const makeBattleRow=(id,children)=>({kind:'row',id,children:children.flat(Infinity).filter(Boolean)});
export const makeBattleGroup=(id,children)=>({kind:'column',id,children:children.flat(Infinity).filter(Boolean)});

export function layoutBattleHud(width,height,scale=1,content={}){
  // Keep the actual world visible: the desktop uses compact side rosters and
  // one bottom-center command card, not three full-height opaque columns.
  const css=1/Math.max(.001,scale),gap=8*css,portrait=height>width,short=height*scale<520,wide=!portrait&&!short&&width*scale>=900,topH=Math.min(height*.34,(wide?86:102)*css),box=(x,y,width,height)=>({x,y,width:Math.max(0,width),height:Math.max(0,height)}),top=box(0,0,width,topH),railTop=topH+gap;
  const rosterH=(count,actions,limit,enemy=false)=>Math.min(limit,Math.max((enemy?142:150)*css,((count??1)*140+Math.max(0,actions??0)*67+24)*css));
  if(portrait){
    const commandH=Math.min(204*css,height*.27),railH=Math.min(130*css,height*.18),railY=height-commandH-railH-gap*2,ownW=(width-gap)/2,feedH=28*css;
    return {portrait,short,wide,top,own:box(0,railY,ownW,railH),enemy:box(ownW+gap,railY,ownW,railH),command:box(0,height-commandH,width,commandH),feed:box(0,Math.max(railTop,railY-feedH-gap),width,feedH)};
  }
  const ownW=Math.min((wide?226:168)*css,width*.27),railLimit=height-railTop-8*css;
  if(wide){
    const enemyW=Math.min(204*css,width*.24),commandW=Math.min(590*css,Math.max(300*css,width-ownW-enemyW-5*gap)),feedH=30*css,commandH=Math.min(280*css,height*.40),middleX=(width-commandW)/2;
    return {portrait,short,wide,top,own:box(gap,railTop,ownW,rosterH(content.owned,content.actions,railLimit)),enemy:box(width-enemyW-gap,railTop,enemyW,rosterH(content.enemy,0,railLimit,true)),command:box(middleX,height-commandH-feedH-gap,commandW,commandH),feed:box(middleX,height-feedH-gap*.45,commandW,feedH)};
  }
  const commandW=Math.min(255*css,width*.34),midX=ownW+gap,midW=Math.max(0,width-ownW-commandW-2*gap),enemyW=Math.min(182*css,midW),enemyH=Math.min(78*css,(height-railTop)*.38),feedH=30*css;
  return {portrait,short,wide,top,own:box(0,railTop,ownW,rosterH(content.owned,content.actions,height-railTop)),enemy:box(midX+(midW-enemyW)/2,railTop,enemyW,enemyH),command:box(width-commandW,railTop,commandW,height-railTop),feed:box(midX,height-feedH,midW,feedH)};
}
function walkRows(rows,map){for(const item of rows??[]){if(!item)continue;if(item.id)map.set(item.id,item);walkRows(item.children,map);}}
export function createBattleHudModelStore(){
  let model=null,rows=new Map(),units=new Map();
  function update(value){model=value;rows=new Map();units=new Map();walkRows(model.controls,rows);walkRows(model.command?.tools,rows);walkRows(model.command?.rows,rows);walkRows(model.footer?.actions,rows);for(const u of [...(model.owned??[]),...(model.enemy??[])]){units.set(u.id,u);walkRows(u.actions,rows);}}
  return {update,get model(){return model},row:id=>rows.get(id),unit:id=>units.get(id),act(id){const r=rows.get(id);if(!r||r.disabled)return false;r.action?.();return true;}};
}

const para=(lines,lineHeight=18)=>({fontFamilies:['Microsoft YaHei','sans-serif'],locale:getLanguage()==='en'?'en':'zh-CN',lineHeight,maxLines:lines,density:2});
const text=(name,props={})=>({type:'text',name,text:'',width:'fill',height:24,size:13,color:C.paper,...props});
const panel=(name,children,props={})=>({type:'panel',name,children:children.filter(Boolean),layout:'column',width:'100%',height:'fill',gap:3,...props});
const positioned=(box,children,name)=>panel(name,children,{anchor:'top-left',x:box.x,y:box.y,width:box.width,height:box.height,color:C.ink,alpha:.93,padding:4,border:{color:C.edge,width:1},gap:4});
const row=(name,children,height=48)=>panel(name,children,{layout:'row',height,width:'100%',gap:3});
const scroll=(name,children)=>panel(name,children,{height:'fill',scroll:'vertical',padding:2,gap:4});
const heightOf=node=>typeof node.height==='number'?node.height:48;
const total=(children,gap=3,padding=0)=>children.reduce((n,c)=>n+heightOf(c),0)+Math.max(0,children.length-1)*gap+padding*2;

export function buildBattleHudDescription(store,layout){
  const m=store.model,bind={}; if(!m)throw new TypeError('Battle presentation model required');
  const live=()=>store.model;
  function txt(id,get,props={}){const name=k(id);bind[name]={text:()=>String(get()??'')};return text(name,props);}
  function meter(id,get,label,color=C.gold,props={}){const name=k(id);bind[name]={value:()=>clamp(get())};return {type:'bar',name,label,value:0,color,width:'fill',height:6,...props};}
  function part(item){
    const name=k(item.id),get=()=>store.row(item.id);
    if(item.kind==='button'){
      bind[name]={text:()=>item.compactLabel??get()?.text??item.text,label:()=>get()?.accessible??get()?.text??item.accessible??item.text,disabled:()=>!get()||Boolean(get().disabled),color:()=>get()?.active?C.selected:C.panel,tap:()=>store.act(item.id)};
      return {type:'button',name,text:'—',width:'fill',height:item.detail?Math.max(48,50+(item.lines??2)*14):48,size:item.size??13,color:C.panel,border:{color:C.edge,width:1},...(item.detail?{description:item.detail,paragraph:para(item.lines??2,16)}:{})};
    }
    if(item.kind==='toggle'){
      bind[name]={text:()=>get()?.text??item.text,checked:()=>Boolean(get()?.checked??item.checked),disabled:()=>!get(),tap:()=>store.act(item.id)};return {type:'toggle',name,text:'—',width:'fill',height:48,size:12};
    }
    if(item.kind==='text'){
      const limit=item.lines??2,weighted=[...String(item.text??'')].reduce((sum,c)=>sum+(c.codePointAt(0)>255?1:.56),0),lines=Math.min(limit,Math.max(1,Math.ceil(weighted/Math.max(8,(layout.command.width-20)/(item.size??12)*.84))));bind[name]={text:()=>get()?.text??'',color:()=>toneColor(get()?.tone)};return text(name,{height:lines*18,size:item.size??12,paragraph:para(lines)});
    }
    const children=(item.children??[]).map(part),isRow=item.kind==='row',maxPerRow=Math.max(1,Math.floor((layout.command.width-18)/54));
    if(isRow&&children.length>maxPerRow){const rows=Array.from({length:Math.ceil(children.length/maxPerRow)},(_,i)=>{const group=children.slice(i*maxPerRow,(i+1)*maxPerRow);return panel(name+'-wrap-'+i,group,{layout:'row',height:Math.max(48,...group.map(heightOf)),gap:3});});return panel(name,rows,{layout:'column',height:total(rows),gap:3});}
    return panel(name,children,{layout:isRow?'row':'column',height:isRow?Math.max(48,...children.map(heightOf)):total(children),gap:3});
  }
  function blockRows(name,rows){return scroll(name,(rows??[]).map(part));}
  function absorb(name){bind[name]={pointerOnly:true,tapTargetOnly:true,tap:(_s,a)=>a?.stopPropagation?.()};}
  function unitCard(u,compact){
    const id=u.id,key='unit-'+id,read=()=>store.unit(id)??u,name=k(key);
    const headChildren=[];if(u.portrait){const imageName=k(key+'-portrait');bind[imageName]={src:()=>read()?.portrait};headChildren.push({type:'image',name:imageName,src:u.portrait,width:30,height:40,semantic:false});}
    headChildren.push(panel(k(key+'-labels'),[txt(key+'-name',()=>read()?.name,{height:compact?15:23,size:compact?12:17,bold:true,color:C.cardText}),txt(key+'-type',()=>read()?.type,{height:compact?12:18,size:compact?9:12,color:C.cardMuted}),txt(key+'-troops',()=>read()?.troops,{height:compact?15:19,size:compact?11:15,color:C.cardText,bold:true})],{width:'fill',height:compact?42:57,gap:0}));
    bind[name]={label:()=>[read()?.name,read()?.type,read()?.troops].filter(Boolean).join(' · '),tap:()=>store.unit(id)?.select?.(),disabled:()=>!store.unit(id),color:()=>read()?.selected?C.cardSelected:C.card};
    const head=panel(name,headChildren,{role:'button',label:'Unit',layout:'row',height:compact?50:66,gap:4,padding:3,color:C.card,border:{color:C.edge,width:1},align:'center'});
    const bars=[meter(key+'-strength',()=>read()?.share,words('兵力','Strength'),C.good),meter(key+'-morale',()=>read()?.morale/100,words('士气','Morale'),C.blue),meter(key+'-rage',()=>read()?.rage/100,words('怒气','Rage'),C.gold)];
    const vitals=txt(key+'-vitals',()=>words('士气 ','Morale ')+Math.round(read()?.morale??0)+' · '+words('怒气 ','Rage ')+Math.floor(read()?.rage??0)+'/100',{height:20,size:11,color:C.cardText});
    const statuses=txt(key+'-status',()=>read()?.status?.join(' · ')??'',{height:18,size:10,color:C.cardMuted});
    const actions=(u.selected&&!compact?(u.actions??[]):[]).map(part);
    const children=[head,...bars,vitals,statuses,...actions];
    return panel(k(key+'-card'),children,{height:total(children,3,2),padding:2,gap:3,border:{color:C.edge,width:1},color:C.card,alpha:.95});
  }
  function objective(obj){const id='objective-'+obj.id,read=()=>live().objectives?.find(x=>x.id===obj.id);
    const rows=[txt(id+'-label',()=>read()?.label,{height:14,size:10,color:C.muted,align:'center'}),meter(id,()=>read()?.share,obj.label,obj.color??C.gold),txt(id+'-value',()=>read()?.text,{height:17,size:11,align:'center'})];
    return panel(k(id+'-card'),rows,{width:'fill',height:38,gap:0});
  }
  const mainTitle=panel(k('title'),[txt('phase',()=>live().phaseTitle,{size:12,height:17,color:C.gold}),txt('heading',()=>live().title,{size:layout.wide?24:17,height:layout.wide?30:23,bold:true,fontFamily:getLanguage()==='en'?'Georgia':'KaiTi'}),txt('sides',()=>live().subtitle,{size:11,height:16,color:C.muted})],{width:layout.wide?190:'fill',height:layout.wide?64:56,gap:0});
  const headerControls=panel(k('header-controls'),(m.controls??[]).map(item=>part(layout.portrait&&item.id==='leave-trial'?{...item,compactLabel:words('离开','Exit')}:item)),{layout:'row',width:Math.min(layout.top.width*(layout.wide ? .34 : .62),(m.controls??[]).length*60),height:48,gap:4});
  const clock=panel(k('clock'),[txt('clock-text',()=>live().clock,{height:17,size:13,align:'left'}),meter('clock-progress',()=>live().timeShare,words('至日落','Until sunset')),txt('wind',()=>live().wind,{height:15,size:11,color:C.muted,align:'left'})],{width:layout.wide?126:100,height:40,gap:0});
  const objectives=panel(k('objective-rows'),(m.objectives??[]).map(objective),{layout:'row',width:'fill',height:40,gap:7});
  const top=positioned(layout.top,layout.wide?[row(k('header-wide'),[mainTitle,clock,panel(k('objective-block'),[objectives],{width:Math.max(145,Math.min(420,layout.top.width-190-126-headerControls.width-42)),height:40}),{type:'space',width:'fill',height:1},headerControls],72)]:[row(k('header-first'),[mainTitle,headerControls],55),row(k('header-second'),[clock,objectives],37)],k('top'));
  const own=positioned(layout.own,[txt('own-count',()=>words('我军 ','Your army ')+(live().owned??[]).filter(u=>!u.gone).length,{height:20,bold:true,color:C.gold}),scroll(k('own-rows'),(m.owned??[]).map(u=>unitCard(u,false)))],k('own'));
  const compact=layout.short&&!layout.portrait;const enemy=positioned(layout.enemy,[...(!compact?[txt('enemy-count',()=>words('敌军 ','Enemy army ')+(live().enemy??[]).filter(u=>!u.gone).length,{height:20,bold:true,color:C.gold})]:[]),scroll(k('enemy-rows'),(m.enemy??[]).map(u=>unitCard(u,compact)))],k('enemy'));
  const commandHeading=panel(k('command-heading'),[txt('command-title',()=>live().command?.title,{height:17,size:11,color:C.gold}),txt('command-selection',()=>live().command?.selection,{height:24,bold:true,size:16})],{width:'fill',height:44,gap:0});
  const tools=(m.command?.tools??[]).map(item=>part({...item,detail:undefined}));
  const commandToolbar=panel(k('command-tools'),tools,{layout:'row',width:Math.min(layout.command.width*.58,tools.length*58),height:48,gap:3});
  const command=positioned(layout.command,[row(k('command-headrow'),[commandHeading,commandToolbar],48),blockRows(k('command-rows'),m.command?.rows),...(m.footer?.actions?.length?[panel(k('footer-controls'),m.footer.actions.map(part),{layout:'row',height:48,gap:3})]:[])],k('command'));
  // All five recent entries remain available on narrow screens. The native
  // scroll owns its own clip; no invisible controls or truncated log state.
  const notes=[...(m.feed??[]).map((f,i)=>txt('feed-'+i,()=>live().feed?.[i]?.text,{height:30,size:11,color:C.muted,paragraph:para(2)})),txt('feed-help',()=>live().footer?.text,{height:30,size:11,color:C.muted,paragraph:para(2)})];
  const feed=positioned(layout.feed,[scroll(k('feed-rows'),notes)],k('feed'));
  [k('top'),k('own'),k('enemy'),k('command'),k('feed')].forEach(absorb);
  return {description:{label:words('战场指挥','Battlefield command'),root:{type:'panel',name:k('root'),layout:'free',width:'100%',height:'100%',children:[top,own,enemy,command,feed]},skin},bind,sections:[k('header-controls'),k('objective-rows'),k('own-rows'),k('enemy-rows'),k('command-tools'),k('command-rows'),k('footer-controls'),k('feed-rows')]};
}

// Native view lifecycle: keep display objects for authored rows, replace only
// structural membership and defer those changes while a real pointer is held.
export function createNativeBattleHud(host,{onError=console.error}={}){
  const {game}=host,store=createBattleHudModelStore();let view=null,model=null,pending=false,closed=false,lock=false,last=null,sectionKeys=new Map(),ending=null,callout=null,offFlash=null;
  const find=(node,name)=>node?.name===name?node:node?.children?.map(x=>find(x,name)).find(Boolean);
  const strip=(node,sections)=>sections.includes(node.name)?{...node,children:[]}:node.children?{...node,children:node.children.map(x=>strip(x,sections))}:node;
  const collect=(node,keys)=>{if(node.name)keys.add(node.name);node.children?.forEach(x=>collect(x,keys));};
  const held=()=>Boolean(game.browser.pointer?.contacts?.length);
  function rebuild(){
    if(closed||ending||!model)return;if(held()){pending=true;return;}pending=false;
    const m=host.metrics(),scale=m.scale*(game.uiScale??1),layout=layoutBattleHud(m.safe.width/(game.uiScale??1),m.safe.height/(game.uiScale??1),scale,{owned:model.owned?.length,enemy:model.enemy?.length,actions:model.owned?.find(u=>u.selected)?.actions?.length}),next=buildBattleHudDescription(store,layout),outer=JSON.stringify(strip(next.description.root,next.sections));
    if(view&&last===outer&&view.replaceChildren){
      for(const name of next.sections){const rows=find(next.description.root,name)?.children;if(!rows)continue;const key=JSON.stringify(rows);if(sectionKeys.get(name)===key)continue;
        const ids=new Set();rows.forEach(r=>collect(r,ids));const bind=Object.fromEntries(Object.entries(next.bind).filter(([n])=>ids.has(n)));view.replaceChildren(name,rows,bind);sectionKeys.set(name,key);}
      view.refresh();return;
    }
    const old=view,scrolls={},focus=old?.focused;for(const n of next.sections)try{scrolls[n]=old?.scroll(n).offset;}catch{}old?.close();
    view=game.show(next.description,{bind:next.bind,paragraphCache:host.paragraphCache,gamepad:true});last=outer;sectionKeys=new Map();for(const name of next.sections){const rows=find(next.description.root,name)?.children;if(rows)sectionKeys.set(name,JSON.stringify(rows));}
    for(const [name,offset]of Object.entries(scrolls))try{if(offset)view.scroll(name).scrollTo(offset);}catch{}
    if(focus)try{view.focus(focus);}catch{}
  }
  function request(){if(lock)return;lock=true;queueMicrotask(()=>{lock=false;try{rebuild();}catch(error){onError(error);}});}
  const offPointer=game.browser.pointer?.observe(note=>{if(pending&&['end','cancel'].includes(note.kind))request();});
  const occlusionRects=()=>{if(closed||!view?.visibleRect)return[];return (ending?['battle-result']:[k('top'),k('own'),k('enemy'),k('command'),k('feed')]).flatMap(name=>{try{const r=view.visibleRect(name);if(!r||r.width<=0||r.height<=0)return[];const p=game.fromStage(r.x,r.y);return [{...p,width:r.width,height:r.height}];}catch{return[];}});};
  const offOcclusion=host.addMapOcclusion?.(occlusionRects);
  const offLayout=host.addLayout(request);
  function render(next){if(closed||ending)return;model=next;store.update(next);request();}
  function flash(name,ours){if(closed)return;offFlash?.();callout?.close();callout=game.show({root:{type:'panel',layout:'free',width:'100%',height:'100%',children:[{type:'text',name:'battle-flash',text:name,height:42,width:'75%',anchor:'top',y:104,size:28,bold:true,color:ours?0xffd887:0xe5a28b,align:'center',semantic:false}]}},{paragraphCache:host.paragraphCache});offFlash=game.after(1.7,()=>{callout?.close();callout=null;});}
  function finish({title,reason,label,help,action}){if(closed||ending)return;ending=true;pending=false;game.browser.pointer?.cancelAll?.('owner');view?.close();view=null;const bind={'battle-finish-result':{tap:action}};
    view=game.show({label:title,modal:true,skin,root:{type:'panel',name:'battle-result',layout:'column',card:true,anchor:'center',width:'86%',height:230,padding:12,gap:8,children:[{type:'text',text:title,height:45,size:27,color:C.gold,align:'center',bold:true},{type:'text',text:reason,height:62,size:15,paragraph:para(3),align:'center'},{type:'button',name:'battle-finish-result',text:label,height:48},{type:'text',text:help,height:22,size:12,align:'center',color:C.muted}]}},{bind,paragraphCache:host.paragraphCache,initialFocus:'battle-finish-result'});
  }
  function close(){if(closed)return;closed=true;offOcclusion?.();offLayout?.();offPointer?.();offFlash?.();callout?.close();view?.close();view=null;}
  return {render,flash,finish,close,occlusionRects,get view(){return view},snapshot:()=>({phase:model?.phase,ending:Boolean(ending),focus:view?.focused,pending,units:[...(model?.owned??[]),...(model?.enemy??[])].map(u=>({id:u.id,troops:u.troops,selected:u.selected}))})};
}
