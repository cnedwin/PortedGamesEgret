// Game screens share the engine's managed roots, native control focus and screen stack.
// A page's model survives a responsive layout change; its native root and layer are retained.
import { DisplayObjectContainer } from '@egret/engine';
import { createUiLayerManager, createUiRoot, createUiScreenStack } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { createKit, FONT } from './ui/kit.mjs';
import { t, say } from './i18n.mjs';
import { MAPS } from './sim/maps.mjs';
import { CAMPAIGN } from './sim/campaign.mjs';
import { COMMANDERS, COMMANDER_ORDER, FACTIONS } from './sim/commanders.mjs';
import { TERRAIN } from './sim/terrain.mjs';

const C = { navy: 0x1b2340, navy2: 0x344363, paper: 0xf4f7fb, pale: 0xe4ebf5, gold: 0xf5c542, goldDeep: 0xc99d38, blue: 0x355ea3, red: 0xa33950, soft: 0x52637b, white: 0xffffff };
const PORTRAIT = id => new URL(`../assets/portraits/${id}.webp`, import.meta.url).href;
const thumbs = new Map();
const COLORS = { plains: '#7cae4c', road: '#d8b77d', forest: '#3f7a35', mountain: '#8b8677', bridge: '#a77a48', river: '#5ab3d6', beach: '#ecd9a0', sea: '#3d8fc4', ocean: '#2a5f9e', reef: '#5d7f8f', floor: '#b8b3a8', dock: '#3d8fc4' };
function mapThumb(map) {
  if (thumbs.has(map.id)) return thumbs.get(map.id);
  const k = Math.max(1, Math.floor(150 / Math.max(map.w, map.h)));
  const canvas = new OffscreenCanvas(map.w * k, map.h * k), g = canvas.getContext('2d');
  for (let y=0; y<map.h; y++) for (let x=0; x<map.w; x++) {
    g.fillStyle=COLORS[map.terrain[y*map.w+x]] ?? '#888'; g.fillRect(x*k,y*k,k,k);
  }
  for (const b of map.buildings) {
    g.fillStyle=b.owner===0?'#3d7bff':b.owner===1?'#e8384a':'#f4f1e8';
    g.fillRect(b.x*k+1,b.y*k+1,k-2,k-2);g.strokeStyle='#1b2340';g.strokeRect(b.x*k+1,b.y*k+1,k-2,k-2);
  }
  thumbs.set(map.id,canvas); return canvas;
}

/** Screen geometry is local to the engine-owned safe rectangle. No page CSS or window-size fitting. */
function geometry(host, entry) {
  const m=host.metrics(), u=m.unit, pad=Math.max(4,Math.round(6*u)), tap=Math.ceil(m.tap);
  const limit=entry.kind==='title'?(m.portrait?360:430):entry.kind==='setup'?(m.portrait?420:760):entry.kind==='pause'?(m.portrait?380:660):(m.portrait?420:650);
  const width=Math.max(1,Math.floor(Math.min(m.safe.width-2*pad,limit)));
  const maxHeight=Math.max(1,Math.floor(m.safe.height-2*pad));
  return { ...m,u,pad,tap,width,maxHeight,head:Math.round(33*u)+pad,foot:tap+2*pad,bodyFont:Math.max(12,Math.round(17*u)),small:Math.max(11,Math.round(14*u)) };
}
const segments=(w,n,gap) => (w-(n-1)*gap)/n;
const rows=(items,n) => Array.from({length:Math.ceil(items.length/n)},(_,i)=>items.slice(i*n,i*n+n));
const textProbe=new OffscreenCanvas(1,1).getContext('2d');
function textHeight(words,width,size,weight=400){
  textProbe.font=weight+' '+size+'px '+FONT;let lines=0;
  for(const paragraph of String(words).split('\n')){let line='';const parts=paragraph.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|\s+|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu)??[''];
    for(const part of parts){if(line&&textProbe.measureText(line+part).width>width){lines++;line=part.trimStart();}else line+=part;
      if(textProbe.measureText(line).width>width){let head='';for(const ch of line){if(head&&textProbe.measureText(head+ch).width>width){lines++;head=ch;}else head+=ch;}line=head;}}
    lines++;}
  return Math.ceil(lines*size*1.25+2);
}

function createLayout(g) {
  const blocks=[];
  const add=(height,paint,{fill=C.paper}={}) => blocks.push({height:Math.max(1,Math.round(height)),fill,paint});
  const text=(k,words,x,y,w,h,options={})=>k.label({text:String(words),x,y,width:w,height:h,size:g.bodyFont,color:C.navy,weight:400,align:'left',wrap:true,...options});
  const heading=(title,subtitle) => add(g.head+(subtitle?g.bodyFont*2:0),(k,w,h)=> {
    k.panel({x:0,y:0,width:w,height:h,fill:C.navy,border:C.goldDeep,radius:7});
    text(k,title,g.pad,Math.round(4*g.u),w-2*g.pad,g.head-6*g.u,{size:Math.max(g.bodyFont+2,Math.round(25*g.u)),color:C.gold,weight:700,align:'center',wrap:false});
    if(subtitle) text(k,subtitle,g.pad,g.head-3*g.u,w-2*g.pad,h-g.head,{color:C.white,size:g.small,align:'center'});
  },{fill:C.navy});
  const buttons=(items,{height=g.tap+2*g.pad}={})=>add(height,(k,w,h)=> {
    const gap=g.pad,bw=segments(w-2*gap,items.length,gap);
    items.forEach((a,i)=>k.button({id:a.id,text:a.text,name:a.name??a.text,sub:a.sub,icon:a.icon,x:gap+i*(bw+gap),y:(h-g.tap)/2,width:bw,height:g.tap,primary:a.primary,enabled:a.enabled!==false,onActivate:a.action,onRefuse:a.onRefuse,onFocus:a.onFocus}));
  });
  const choice=(id,items,selected,onChange,{height=g.tap+2*g.pad,label}={})=>add(height+(label&&g.portrait?g.bodyFont*1.4:0),(k,w,h)=>{
    const oy=label&&g.portrait?Math.round(g.bodyFont*1.4):0, ox=label&&!g.portrait?Math.floor(w*.26):0;
    if(label) text(k,label,g.pad,oy?1:g.pad,ox?ox-g.pad:w-2*g.pad,oy||g.tap,{size:g.small,weight:700});
    k.choice({id,items,selected,onChange,x:g.pad+ox,y:oy+g.pad,width:w-2*g.pad-ox,height:g.tap,size:Math.max(13,Math.round(17*g.u))});
  });
  const copy=(words,{height,weight=400,color=C.navy,align='left',size=g.bodyFont,fill=C.paper}={})=>{
    const need=textHeight(words,g.width-4*g.pad,size,weight)+2*g.pad;
    add(Math.max(height??0,need),(k,w,h)=>text(k,words,g.pad*2,g.pad,w-4*g.pad,h-2*g.pad,{weight,color,align,size}),{fill});
  };
  const foot=items=>buttons(items,{height:g.foot});
  return {g,blocks,add,text,heading,buttons,choice,copy,foot,get remaining(){return g.maxHeight-blocks.reduce((sum,b)=>sum+b.height,0);}};
}

export function createScreens(host, app) {
  const {game,semantics}=host, {engine,pointer,keyboard}=game;
  const entries=new Map();
  const stack=createUiScreenStack({onError:cause=>console.error('screen stack',cause)});
  let opening=0,managerSyncQueued=false,closed=false,relayout=false,layoutWork=Promise.resolve();
  const viewport=()=>{const {x,y,width,height}=host.metrics().safe;return {x,y,width,height};};
  const publish=()=>host.requestPublish?.();
  const manager=createUiLayerManager({engine,scope:game.scope,input:pointer,keyboard,viewport:viewport(),onInvalidate(){
    if(managerSyncQueued||closed||relayout)return;managerSyncQueued=true;
    queueMicrotask(()=>{managerSyncQueued=false;if(closed||relayout)return;try{manager.sync();publish();}catch(cause){console.error('screen layers',cause);}});
  }});
  const focusId=()=>keyboard.getSnapshot().focusedId;
  const focusEntry=(entry,preferred)=>{
    const desired=preferred??entry.lastFocus;
    if(desired&&entry.focusIds.has(desired)) keyboard.focus(desired,{visible:true});
    else if(entry.focusIds.size&&!entry.focusIds.has(focusId())) keyboard.focus(entry.focusIds.values().next().value,{visible:true});
  };
  const updatePublished=()=>{manager.sync();publish();};
  function setCovered(entry,covered) {
    entry.covered=covered;
    for(const s of entry.liveSlots) s.node.visible=!covered;
    publish();
  }
  function scenePlan(entry,g) {
    const L=createLayout(g), {add,text,heading,buttons,choice,copy,foot}=L;
    const act=(key,fn,primary=false,enabled=true,name)=>({id:key,text:t(key),action:fn,primary,enabled,name});
    const play=(cue,fn)=>()=>{app.sound.play(cue);fn();};
    const back=act('back',()=>screens.command('cancel'));
    const refresh=()=>requestRender(entry);
    const choose=(key,val)=>{entry.state[key]=val;app.sound.play('select');refresh();};
    const item=(key,word)=>({key,text:word,name:word});
    const kind=entry.kind, state=entry.state;
    if (kind==='title') {
      const all=[];
      if(app.hasBattle())all.push(act('resume',play('confirm',()=>app.resume()),true));
      all.push(act('newBattle',play('confirm',()=>screens.setup()),!app.hasBattle()),act('campaign',play('select',()=>screens.campaign())),act('howTo',play('select',()=>screens.help())),act('settings',play('select',()=>screens.settings())),act('language',()=>app.switchLanguage()));
      const noticeH=state.notice?textHeight(state.notice,g.width-4*g.pad,g.bodyFont,700)+2*g.pad:0;
      const fullHeight=90*g.u+g.bodyFont*2.2+g.pad+all.length*(g.tap+g.pad)+g.small*2.6+2*g.pad+noticeH;
      const full=fullHeight<=g.maxHeight;
      // The logo and floating menu preserve the original title's board backdrop, instead of covering it in a paper form.
      const hero=Math.round((full?90:80)*g.u);
      add(hero,(k,w,h)=>{
        k.panel({x:g.pad,y:g.pad,width:w-2*g.pad,height:h-2*g.pad,fill:C.navy,border:C.gold,radius:15});
        // The atlas label preserves its line height even when its rectangle is shorter. Reserve independent
        // logo rows and bound the title font by its actual row height so short widescreens cannot overlap them.
        const starSize=Math.max(8,Math.round(13*g.u));
        const subtitleSize=Math.max(9,Math.round(15*g.u)),subtitleHeight=Math.ceil(subtitleSize*1.25)+1;
        const subtitleY=h-g.pad-subtitleHeight,titleY=Math.round(13*g.u),titleHeight=subtitleY-titleY-Math.max(2,Math.round(2*g.u));
        const titleSize=Math.max(12,Math.min(Math.round(42*g.u),Math.floor(titleHeight/1.25)));
        text(k,'✦',w*.39,1,w*.22,Math.ceil(starSize*1.25),{size:starSize,color:C.gold,align:'center',weight:700,wrap:false});
        text(k,t('title'),g.pad*2,titleY,w-4*g.pad,titleHeight,{size:titleSize,color:C.white,weight:800,align:'center',wrap:false});
        text(k,t('logoSub'),g.pad*2,subtitleY,w-4*g.pad,subtitleHeight,{size:subtitleSize,color:C.gold,weight:700,align:'center',wrap:false});
      },{fill:null});
      add(Math.round(g.bodyFont*2.2+g.pad),(k,w,h)=>{k.panel({x:g.pad,y:0,width:w-2*g.pad,height:h,fill:C.navy,alpha:.64,border:false,radius:9});text(k,t('tagline'),g.pad*2,0,w-4*g.pad,h,{color:C.white,weight:700,align:'center'});},{fill:null});
      for(const row of rows(all,full?1:g.portrait?2:3))add(g.tap+g.pad,(k,w)=>{
        const bw=full?Math.min(w-2*g.pad,Math.max(218*g.u,g.tap*3)):segments(w-2*g.pad,row.length,g.pad);
        row.forEach((a,i)=>k.button({id:a.id,text:a.text,x:full?(w-bw)/2:g.pad+i*(bw+g.pad),y:g.pad/2,width:bw,height:g.tap,primary:a.primary,enabled:a.enabled!==false,onActivate:a.action}));
      },{fill:null});
      const r=app.record();const rec=`${t('records',{w:r.won,l:r.lost})} · ${t('demoNote')}`;
      add(g.small*2.6+2*g.pad,(k,w,h)=>{k.panel({x:g.pad,y:0,width:w-2*g.pad,height:h,fill:C.navy,alpha:.6,border:false,radius:6});text(k,rec,g.pad*2,g.pad,w-4*g.pad,h-2*g.pad,{size:g.small,color:C.white,weight:600,align:'center'});},{fill:null});
      if(state.notice)add(noticeH,(k,w,h)=>{k.panel({x:g.pad,y:0,width:w-2*g.pad,height:h,fill:C.paper,border:C.red,radius:8});text(k,state.notice,g.pad*2,g.pad,w-4*g.pad,h-2*g.pad,{color:C.red,weight:700,semanticRole:'alert'});},{fill:null});
    } else if(kind==='campaign') {
      const progress=app.campaignProgress(),active=app.campaignBattle()?.setup.campaign;
      const chapter=CAMPAIGN.find(c=>c.id===state.chapter)??CAMPAIGN[0];
      heading(t('campaign'),t(progress.complete?'campaignComplete':'campaignLead',{n:progress.completed.length}));
      choice('chapters',CAMPAIGN.map((c,i)=>({key:c.id,text:['I','II','III'][i],name:say(c.title)})),chapter.id,k=>choose('chapter',k));
      const completed=progress.completed.includes(chapter.id),unlocked=app.campaignUnlocked(chapter.id),resumed=active===chapter.id;
      copy(`${say(chapter.title)}  ·  ${t(resumed?'chapterActive':completed?'chapterDone':unlocked?'chapterReady':'chapterLocked')}`,{size:g.small,color:C.blue,weight:700});
      copy(say(chapter.brief),{height:Math.max(g.bodyFont*3.6+2*g.pad,Math.min(115,L.remaining-g.foot-g.bodyFont*3.6-3*g.pad))});
      copy(say(chapter.objective),{weight:700,height:Math.max(g.bodyFont*2.8+2*g.pad,Math.min(95,L.remaining-g.foot))});
      foot([back,act(resumed?'resumeChapter':completed?'replayChapter':'startChapter',play('confirm',()=>resumed?app.resumeCampaign():app.startCampaign(chapter.id)),true,unlocked&&!Boolean(active&&!resumed))]);
    } else if(kind==='setup') {
      const ch=state.choice,tab=state.tab;
      heading(t('newBattle'));
      const tabs=[item('map',t('pickMap')),item('you',t('pickYou')),item('foe',t('pickFoe')),item('options',t('level'))];
      // Two-line section navigation on narrow screens; every section still edits the same setup model.
      if(g.portrait) for(const row of rows(tabs,2))buttons(row.map(a=>({id:`tab-${a.key}`,text:a.text,primary:tab===a.key,action:()=>choose('tab',a.key)})));
      else buttons(tabs.map(a=>({id:`tab-${a.key}`,text:a.text,primary:tab===a.key,action:()=>choose('tab',a.key)})));
      if(tab==='map'){
        const m=MAPS.find(a=>a.id===ch.map)??MAPS[0];
        const picturesH=Math.max(g.tap,Math.min(Math.round(96*g.u),L.remaining-g.foot-g.tap-7*g.pad-g.bodyFont*3.2));
        add(picturesH,(k,w,h)=>{const bw=w/MAPS.length;MAPS.forEach((a,i)=>{const image=mapThumb(a),s=Math.min((bw-2*g.pad)/image.width,(h-2*g.pad)/image.height),iw=image.width*s,ih=image.height*s;k.panel({x:i*bw+g.pad,y:g.pad,width:bw-2*g.pad,height:h-2*g.pad,fill:a.id===ch.map?C.gold:C.pale,radius:5});k.image({source:image,x:i*bw+(bw-iw)/2,y:(h-ih)/2,width:iw,height:ih});});});
        choice('map',MAPS.map(a=>item(a.id,say(a.name))),m.id,v=>{ch.map=v;app.sound.play('select');refresh();});
        copy(`${say(m.name)}  ·  ${m.w} × ${m.h}\n${say(m.blurb)}`,{height:Math.max(g.bodyFont*3.5+2*g.pad,Math.min(90,L.remaining-g.foot))});
      } else if(tab==='you'||tab==='foe'){
        const selected=ch[tab],c=COMMANDERS[selected],picsH=Math.max(g.tap,Math.min(Math.round(92*g.u),L.remaining-g.foot-g.tap-6*g.pad-g.bodyFont*5));
        add(picsH,(k,w,h)=>{const bw=w/COMMANDER_ORDER.length;COMMANDER_ORDER.forEach((id,i)=>{const iw=Math.min(bw-2*g.pad,h-2*g.pad);k.panel({x:i*bw+g.pad,y:g.pad,width:bw-2*g.pad,height:h-2*g.pad,fill:id===selected?C.gold:C.pale,radius:6});k.image({source:PORTRAIT(id),x:i*bw+(bw-iw)/2,y:(h-iw)/2,width:iw,height:iw});});});
        choice(tab,COMMANDER_ORDER.map(id=>item(id,say(COMMANDERS[id]))),selected,v=>{ch[tab]=v;app.sound.play('select');refresh();});
        const fields=[
          {words:`${say(c)} · ${say(c.title)} · ${say(FACTIONS[c.faction])}`,weight:700,color:tab==='you'?C.blue:C.red},
          {words:say(c.blurb),weight:400,color:C.navy},
          {words:`${t('art')} · ${say(c.art)} — ${say(c.art.text)}`,weight:700,color:C.blue}
        ];
        const p=g.pad,limit=L.remaining-g.foot;
        let font=g.bodyFont,heights=fields.map(f=>textHeight(f.words,g.width-4*p,font,f.weight));
        while(font>12&&heights.reduce((a,b)=>a+b,0)+4*p>limit){font--;heights=fields.map(f=>textHeight(f.words,g.width-4*p,font,f.weight));}
        const needed=heights.reduce((a,b)=>a+b,0)+4*p;
        add(needed,(k,w)=>{let y=p;fields.forEach((f,i)=>{text(k,f.words,p*2,y,w-4*p,heights[i],{size:font,weight:f.weight,color:f.color});y+=heights[i]+p;});});
      } else {
        choice('level',[item('easy',t('easy')),item('normal',t('normal')),item('hard',t('hard'))],ch.level,v=>{ch.level=v;app.sound.play('select');},{label:t('level')});
        choice('order',[item('first',t('goFirst')),item('second',t('goSecond'))],ch.first?'first':'second',v=>{ch.first=v==='first';app.sound.play('select');});
        choice('fog',[item('off',t('off')),item('on',t('on'))],ch.fog?'on':'off',v=>{ch.fog=v==='on';app.sound.play('select');},{label:t('warFog')});
      }
      foot([back,act('start',play('confirm',()=>app.startNew({...ch})),true)]);
    } else if(kind==='settings') {
      heading(t('settings'));
      const toggle=(k,key,x,y,w)=>k.toggle({id:key,text:t(key),x,y,width:w,height:g.tap,checked:!!app.settings[key],onChange:v=>{app.setSetting(key,v);app.sound.play('select');}});
      add(g.tap+2*g.pad,(k,w)=>{const keys=g.portrait?['sound','music']:['sound','music','reducedMotion'];const bw=segments(w-2*g.pad,keys.length,g.pad);keys.forEach((key,i)=>toggle(k,key,g.pad+i*(bw+g.pad),g.pad,bw));});
      choice('speed',[item(1,t('speed1')),item(2,t('speed2')),item(3,t('speed3'))],app.settings.speed,v=>{app.setSetting('speed',v);app.sound.play('select');},{label:t('speed')});
      choice('quality',['auto','low','medium','high'].map((v,i)=>item(v,t(['qAuto','qLow','qMedium','qHigh'][i]))),app.settings.quality,v=>{app.setSetting('quality',v);app.sound.play('select');},{label:t('quality')});
      copy(t('qualityNote'),{size:g.small,color:C.soft,align:'center',height:g.small*1.6+g.pad});
      if(g.portrait)add(g.tap+2*g.pad,(k,w)=>toggle(k,'reducedMotion',g.pad,g.pad,w-2*g.pad));
      foot([act('language',()=>app.switchLanguage()),act('close',play('cancel',()=>entry.context.close()),true)]);
    } else if(kind==='help') {
      heading(state.page<=2?t('helpTitle'):t('keysTitle'));
      const page=state.page,number=5;
      if(page===0||page===1) {
        const keys=page===0?['help1','help2','help3']:['help4','help5','help6'];
        const lineH=Math.max(g.bodyFont*2.7+g.pad,Math.min(80,(L.remaining-2*g.foot)/3));
        keys.forEach((key,i)=>copy(`${page*3+i+1} · ${t(key)}`,{height:lineH}));
      } else if(page===2) {
        for(const list of rows(['plains','road','forest','mountain','river','beach','sea','reef'],g.portrait?2:4))add(Math.max(g.tap*.9,g.bodyFont*2.7),(k,w,h)=>{const bw=w/list.length;list.forEach((id,i)=>{const d=TERRAIN[id].defence;const dLabel=d>=0?'★'.repeat(d)||'·':'☠'.repeat(-d);k.panel({x:i*bw+g.pad,y:g.pad,width:bw-2*g.pad,height:h-2*g.pad,fill:Number.parseInt(COLORS[id].slice(1),16),alpha:.35,radius:5});text(k,`${say(TERRAIN[id])}\n${dLabel}`,i*bw+g.pad,g.pad,bw-2*g.pad,h-2*g.pad,{align:'center',weight:700,size:g.small});});});
      } else {
        const keys=page===3?['keysMouse','keysKeyboard']:['keysPad','keysTouch'];
        const lineH=Math.max(g.bodyFont*4+g.pad,Math.min(135,(L.remaining-2*g.foot)/2));
        keys.forEach(key=>copy(t(key),{height:lineH}));
      }
      buttons([{id:'help-prev',text:'‹',name:`${t('back')} ${Math.max(1,page)}/${number}`,action:()=>choose('page',Math.max(0,page-1)),enabled:page>0},{id:'help-index',text:`${page+1} / ${number}`,enabled:false},{id:'help-next',text:'›',name:`${t('next')} ${Math.min(number,page+2)}/${number}`,action:()=>choose('page',Math.min(number-1,page+1)),enabled:page<number-1}]);
      foot([act('close',play('cancel',()=>entry.context.close()),true)]);
    } else if(kind==='result') {
      const {won,why,game:match,human,chapter}=state;
      heading(won?t('victory'):t('defeat'),t((won?'winWhy_':'loseWhy_')+why));
      if(chapter){copy(say(chapter.title),{color:C.blue,weight:700,align:'center',height:g.bodyFont*1.8+g.pad});if(won)copy(say(chapter.after),{height:g.bodyFont*3+2*g.pad});}
      const me=match.stats[human],them=match.stats[1-human], stats=[['turns',match.turn,''],['kills',me.kills,them.kills],['lost',me.lost,them.lost],['recruited',me.recruited,them.recruited],['captured',me.captured,them.captured]];
      const rowH=Math.max(g.bodyFont*1.35,Math.min(g.bodyFont*2.3,(L.remaining-g.foot-2*g.pad)/(stats.length+1)));
      add(rowH,(k,w)=>{text(k,t('you'),w*.5,1,w*.22,rowH,{weight:700,color:C.blue,align:'center'});text(k,t('foe'),w*.74,1,w*.22,rowH,{weight:700,color:C.red,align:'center'});});
      stats.forEach(([key,a,b],i)=>add(rowH,(k,w)=>{k.panel({x:g.pad,y:0,width:w-2*g.pad,height:rowH-1,fill:i%2?C.paper:C.pale});text(k,t(key),g.pad*2,0,w*.47,rowH);text(k,String(a),w*.5,0,w*.22,rowH,{align:'center',color:C.blue,weight:700});text(k,String(b),w*.74,0,w*.22,rowH,{align:'center',color:C.red,weight:700});}));
      if(chapter){const next=won&&app.campaignProgress().next;foot([act('campaign',()=>app.toCampaign()),act(next?'nextChapter':'replayChapter',()=>app.startCampaign(next||chapter.id),true)]);}
      else foot([act('toTitle',()=>app.toTitle()),act('again',()=>app.startNew(app.lastSetup()),true)]);
    } else if(kind==='pause') {
      heading(state.title??t('menu'));
      for(const row of rows(state.items,g.portrait?1:state.items.length>4?3:2))buttons(row.map((a,i)=>({id:`pause-${a.key??'back'}`,text:a.label,sub:a.note,enabled:!a.disabled,primary:a.key==='end',action:()=>entry.context.close(a.key)})));
    } else if(kind==='load-failure'){
      heading(t('loadErrorTitle'));copy(t('loadFailed'),{align:'center',height:g.bodyFont*3+2*g.pad});
      foot([act('dismiss',()=>entry.context.close('dismiss')),act('retry',()=>entry.context.close('retry'),true)]);
    }
    return L;
  }

  async function render(entry, deferLayer=false) {
    if(entry.closed)return;
    const g=geometry(host,entry), plan=scenePlan(entry,g), height=plan.blocks.reduce((a,b)=>a+b.height,0), version=++entry.version;
    // A managed root's tree shape is fixed. Reserve a bounded set of content leaves and reflow their
    // dimensions/data; unused leaves have zero height. Turning a phone therefore never replaces the root.
    if(plan.blocks.length>16)throw new Error('screen layout has too many blocks: '+entry.id);
    while(plan.blocks.length<16)plan.blocks.push({height:0,paint:null});
    const size={width:g.width,height};
    if(height>g.maxHeight+1)console.warn('screen layout extends beyond safe viewport',entry.id,height,g.maxHeight);
    const fresh=new Map(), previous=focusId();
    // A managed content leaf is detached during prepare. Keyboard registration requires an attached display object;
    // materialize its ordinary scoped container immediately after the engine publishes the empty leaf. The root,
    // stack, backdrop and screen model keep their identities across a viewport change.
    const tree={id:'layout',kind:'column',explicitWidth:size.width,explicitHeight:size.height,gap:0,children:plan.blocks.map((block,i)=>({
      id:`block-${i}`,kind:'leaf',explicitWidth:size.width,explicitHeight:block.height,content:{revision:version,prepare(context){
        const node=context.scope.use(new DisplayObjectContainer());
        fresh.set(i,{node,scope:context.scope,block,width:context.width});return {content:node,measuredHeight:block.height};
      }}
    }))};
    if(!entry.root){
      entry.root=createUiRoot({engine,scope:game.scope,id:entry.id,viewport:size,density:1,tree,input:pointer,keyboard:{input:keyboard,idPrefix:entry.id}});
    }else{
      entry.root.setViewport(size,1);entry.root.setTree(tree);
    }
    let prepared;
    for(let i=0;i<8;i++){prepared=await entry.root.prepare();if(prepared.status!=='pending')break;}
    if(entry.closed)return;
    if(!prepared||prepared.status==='pending')throw new Error(`incomplete layout: ${entry.id}`);
    const result=entry.root.commit(prepared);
    if(!['committed','unchanged'].includes(result.kind)||result.postCommitErrors.length)throw new Error(`screen layout ${entry.id}: ${result.kind} ${result.postCommitErrors.map(String).join(', ')}`);
    entry.focusIds.clear();entry.liveSlots=[...fresh.values()];
    for(const [slotIndex,slot] of entry.liveSlots.entries()) {
      if(!slot.block.paint)continue;
      const k=createKit(host,slot.node,{prefix:entry.id,semanticParent:entry.semanticId,scope:slot.scope});
      // The screen retains a stable focus target id across content/layout replacement. Capture the native kit ids.
      slot.scope.use({dispose:()=>k.dispose()});
      const wrapped={...k};
      let labelIndex=0;
      wrapped.label=options=>{const h=k.label(options);if(!String(options.text).trim())return h;const id=entry.id+':text-'+slotIndex+'-'+(++labelIndex);slot.scope.use({dispose:()=>semantic.remove()});const semantic=semantics.add({id,parent:entry.semanticId,role:options.semanticRole??'text',describe:()=>({name:String(options.text),bounds:semanticBoundsOf(h.root),hidden:entry.covered||!entry.visible})});return h;};
      const collect=(h,enabled=true)=>{if(h?.id&&enabled)entry.focusIds.add(h.id);return h;};
      wrapped.button=options=>collect(k.button(options),options.enabled!==false);
      wrapped.toggle=options=>collect(k.toggle(options));
      wrapped.choice=options=>collect(k.choice({...options,items:options.items.map(a=>({...a,key:String(a.key)})),selected:String(options.selected),onChange:v=>options.onChange(options.items.find(a=>String(a.key)===String(v))?.key??v)}));
      if(slot.block.fill!==null)k.panel({x:0,y:0,width:slot.width,height:slot.block.height,fill:slot.block.fill,alpha:1,border:false,radius:0});
      slot.block.paint(wrapped,slot.width,slot.block.height);
      slot.node.visible=!entry.covered;
    }
    entry.size=size;
    if(!entry.registration)entry.registration=manager.register({id:entry.id,root:entry.root,kind:'modal',closeOnEscape:false,closeOnOutside:false,backdropColor:C.navy,backdropAlpha:entry.kind==='title'?.08:.56});
    if(entry.visible)manager.open(entry.id);
    if(!deferLayer){manager.setViewport(viewport());updatePublished();}
    if(entry.active&&!deferLayer){
      if(previous&&entry.focusIds.has(previous))entry.lastFocus=previous;
      // Choices have radio targets too, registered by the kit; the layer's native fallback finds them if needed.
      focusEntry(entry,entry.lastFocus);
    }
  }
  function requestRender(entry,deferLayer=false){
    if(entry.closed)return Promise.resolve();
    // Queue one publication after routed input and any previous content preparation have settled.
    entry.pending=entry.pending.catch(()=>{}).then(()=>render(entry,deferLayer));
    host.track(entry.pending);return entry.pending;
  }
  function definition(kind,layer,stateFactory) {
    const id=`screen-${kind}`;
    return {id,layer,back:kind==='title'?'none':kind==='result'?()=>app.toTitle():'close',async open(context){
      opening=Math.max(0,opening-1);
      const entry={id,kind,context,state:stateFactory(context.params),version:0,closed:false,covered:false,visible:false,active:false,pending:Promise.resolve(),liveSlots:[],focusIds:new Set(),semanticId:`${id}-dialog`,size:{width:0,height:0}};
      entries.set(id,entry);
      const semantic=semantics.add({id:entry.semanticId,role:'dialog',describe:()=>{
        const safe=viewport(),size=entry.size;
        return {bounds:{x:safe.x+(safe.width-size.width)/2,y:safe.y+(safe.height-size.height)/2,width:size.width,height:size.height},name:kind==='title'?t('title'):kind==='result'?t(entry.state.won?'victory':'defeat'):kind==='setup'?t('newBattle'):kind==='help'?t('helpTitle'):kind==='pause'?entry.state.title??t('menu'):kind==='load-failure'?t('loadErrorTitle'):t(kind),hidden:entry.closed||!entry.visible||entry.covered,modal:entry.active};
      }});
      try{await requestRender(entry);}catch(cause){entry.closed=true;entry.root?.dispose();semantic.remove();entries.delete(id);throw cause;}
      return {
        show(){entry.visible=true;manager.open(id);updatePublished();},
        hide(){entry.visible=false;manager.close(id);updatePublished();},
        cover(){setCovered(entry,true);},
        reveal(){setCovered(entry,false);},
        activate(){entry.active=true;host.focus?.();focusEntry(entry);publish();},
        deactivate(){entry.lastFocus=focusId();entry.active=false;publish();},
        close(){entry.closed=true;entry.visible=false;entry.registration?.dispose();entry.root?.dispose();semantic.remove();entries.delete(id);updatePublished();}
      };
    }};
  }
  const defs={
    title:definition('title','page',()=>{const notice=app.notice;app.notice=null;return {notice};}),
    campaign:definition('campaign','page',()=>({chapter:app.campaignBattle()?.setup.campaign??app.campaignProgress().next??CAMPAIGN[0].id})),
    setup:definition('setup','page',()=>({choice:{...app.lastSetup()},tab:'map'})),
    settings:definition('settings','modal',()=>({})),help:definition('help','modal',()=>({page:0})),
    result:definition('result','page',v=>v),pause:definition('pause','modal',v=>v),
    loadFailure:definition('load-failure','modal',()=>({}))
  };
  function open(def,params) {
    if(stack.isOpen(def))return stack.open(def,params);
    opening++;
    const result=stack.open(def,params);
    result.catch(cause=>{opening=Math.max(0,opening-1);console.error('screen open',cause);});
    return result;
  }
  const trackWork=p=>{host.track(p);return p;};
  // Screen opening promises resolve only on close; track the actual root publication separately.
  const screens={
    get open(){return opening>0||Boolean(stack.active);},
    get active(){return stack.active?.id;},
    command(name,detail={}){
      if(!screens.open)return false;
      if(name==='cancel'||name==='menu'){trackWork(stack.back());app.sound.play('cancel');}
      else if(['up','down','left','right','next','confirm'].includes(name)){host.commandKeys(name,detail);if(name!=='confirm')app.sound.play('cursor',{volume:.6});}
      return true;
    },
    closeAll(){return trackWork(stack.closeAll().then(()=>{opening=0;host.blurToBoard?.();publish();}));},
    title(){
      if(stack.isOpen(defs.title)){const work=stack.popTo(defs.title).then(()=>{const e=entries.get(defs.title.id);if(e)return requestRender(e);});trackWork(work);return;}
      if(stack.active){trackWork(stack.closeAll().then(()=>{void open(defs.title);}));return;}
      return open(defs.title);
    },
    campaign(){return open(defs.campaign);},setup(){return open(defs.setup);},
    settings(){return open(defs.settings);},help(){return open(defs.help);},
    result(params){trackWork(stack.closeAll().then(()=>{void open(defs.result,params);}));},
    pause(items,{title}={}){return open(defs.pause,{items,title}).then(value=>value??null);},
    loadFailure(onRetry,onDismiss){return open(defs.loadFailure).then(value=>value==='retry'?onRetry?.():onDismiss?.());},
    relabel(){return screens.arrange();},
    arrange(){
      const work=layoutWork.catch(()=>{}).then(async()=>{
        relayout=true;
        try{const active=entries.get(stack.active?.id),oldFocus=focusId();for(const entry of entries.values())await requestRender(entry,true);
          manager.setViewport(viewport());updatePublished();if(active?.active)focusEntry(active,oldFocus);
        }finally{relayout=false;publish();}
      });layoutWork=work;return trackWork(work);
    },
    snapshot(){return {stack:stack.snapshot(),layers:manager.snapshot(),roots:[...entries.values()].map(e=>({id:e.id,viewport:e.root?.snapshot().viewport,visible:e.visible,active:e.active}))};},
    dispose(){closed=true;return stack.dispose().finally(()=>manager.dispose());}
  };
  host.registerLayout?.(()=>{void screens.arrange();});
  stack.onChange(s=>{if(!s.active&&!opening)host.blurToBoard?.();publish();});
  return screens;
}
