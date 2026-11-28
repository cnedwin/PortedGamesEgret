// Five Regiments' native Play menus. The simulator and the game's public screen
// callbacks do not depend on the presentation or the window's orientation.
import {createUiScreenStack} from '@egret/engine/ui';
import {createParagraphCache} from '@egret/engine/paragraph';
import {createCanvasParagraphProvider} from '@egret/engine/web/paragraph';
import { ARTS, ORDER, REGIMENTS, SKILLS, TALENTS, playerLoadout } from './sim/regiments.mjs';
import { PLACES } from './sim/road.mjs';
import { t, say, getLanguage } from './i18n.mjs';

const PLACE_WORD = {
  county: 'placeCounty', peach: 'placePeach', bamboo: 'placeBamboo', snow: 'placeSnow', palace: 'placePalace',
  pass: 'placePass', depot: 'placeDepot', citadel: 'placeCitadel'
};
export const placeName = (p) => t(PLACE_WORD[p]);

const ink=0x211310, paper=0xf6e8cf, muted=0xcfbca1, gold=0xe0bb76, bronze=0x795f3a,
  lacquer=0x38221b, selected=0x79512b, vermilion=0x891f1a;
const skin={text:paper,panel:ink,panelAlpha:.94,button:lacquer,buttonText:paper,disabled:0x62544a,accent:gold,track:0x483327,radius:3,size:16,dim:.52};
const bodyFont=()=>getLanguage()==='zh'?'Microsoft YaHei':'Arial';
const titleFont=()=>getLanguage()==='zh'?'SimSun':'Georgia';
const col=(children,props={})=>({type:'panel',name:props.name,layout:'column',width:'100%',height:'fill',gap:8,children,...props});
const row=(children,props={})=>({type:'panel',layout:'row',width:'100%',height:48,gap:6,children,...props});
const rule=()=>({type:'panel',color:bronze,width:'100%',height:1,semantic:false});
const text=(name,words,props={})=>({type:'text',name,text:words,width:'100%',height:25,size:16,color:paper,fontFamily:bodyFont(),...props});
const headline=(name,words,props={})=>text(name,words,{fontFamily:titleFont(),fontWeight:700,color:gold,size:26,height:38,...props});
const scroll=(children)=>col(children,{name:'page-scroll',scroll:'vertical',height:'fill',gap:8});
const labelFor=(label,words)=>label+' · '+words;
const roughUnits=(value)=>[...String(value)].reduce((n,c)=>n+(c.codePointAt(0)>255?1:.62),0);
const split=(arr,count)=>Array.from({length:Math.ceil(arr.length/count)},(_,i)=>arr.slice(i*count,(i+1)*count));

export function createScreens(game,{onLanguage,coarse=false,paragraphCache}={}) {
  // Keep one cache for menu lifetimes. All prepared borrows are owned by the views.
  if(paragraphCache===undefined){
    const provider=createCanvasParagraphProvider(game.browser.scheduleTextWork?{schedule:game.browser.scheduleTextWork}:{});
    const cache=createParagraphCache(game.engine.assets,{provider,maxEntries:64,maxPendingJobs:64,maxImageBytes:32*1024*1024});
    game.scope.use({dispose(){cache.dispose();provider.dispose();}});
    paragraphCache=cache;
  }
  const stack=createUiScreenStack();
  let current=null,view=null,mountedModel=null,slot=null,pending=Promise.resolve(),revision=0;
  let bind={},partWidth=480,paragraphDensity=1.5,backingDensity=1.5;
  function heading(name,words,props={}){
    const size=props.size??26, fitting=Math.floor((partWidth-6)/Math.max(1,roughUnits(words)));
    return headline(name,words,{...props,size:Math.max(14,Math.min(size,fitting))});
  }
  function dims(){
    const s=game.safe??game.screen,scale=game.uiScale||1;
    const width=s.width/scale,height=s.height/scale;
    const frame=game.browser?.frame??game.screen;
    const px=game.canvas?.width/frame.width,py=game.canvas?.height/frame.height;
    // While a resize is pending, retain the last consistent canvas density.
    if(px>=.5&&py>=.5&&Math.abs(px-py)<=1/frame.width+1/frame.height)backingDensity=Math.min(px,py);
    paragraphDensity=Math.max(.5,Math.min(2,Math.round(backingDensity*scale*1000)/1000));
    return {width,height,portrait:width<height,short:height<440};
  }
  function paragraph(name,words,width=partWidth,props={}){
    const size=props.size??15,lineHeight=props.lineHeight??Math.ceil(size*1.5);
    const logicalLines=String(words).split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil(roughUnits(line)*size/Math.max(50,width-18))),0);
    const height=Math.max(lineHeight+3,Math.ceil(logicalLines*lineHeight+7));
    const style={fontFamilies:[bodyFont(),'Noto Sans CJK SC','sans-serif'],locale:getLanguage()==='zh'?'zh-CN':'en',lineHeight,density:paragraphDensity};
    const {lineHeight:_lineHeight,...rest}=props;
    return text(name,words,{size,height,color:muted,...(paragraphCache?{paragraph:style}:{}),...rest});
  }
  const read=value=>typeof value==='function'?value():value;
  function button(id,words,action,props={}){
    const {chosen=false,primary=false,label=words,...rest}=props;
    const shade=()=>primary?vermilion:read(chosen)?selected:lacquer;
    bind[id]={tap:action,label:()=>read(label),...(typeof words==='function'?{text:words}:{}),
      ...(typeof chosen==='function'?{color:shade}:{})};
    return {type:'button',name:id,text:read(words),height:48,width:'fill',size:15,fontFamily:bodyFont(),fontWeight:primary?700:500,
      color:shade(),textColor:paper,
      border:{color:primary?0xd46c53:typeof chosen==='function'?bronze:read(chosen)?gold:bronze,width:read(chosen)&&typeof chosen!=='function'?2:1},...rest};
  }
  function tab(id,words,action,chosen,props={}){
    const result=button(id,words,action,{chosen,...props,role:'tab',selected:read(chosen)});
    bind[id].selected=()=>read(chosen);
    return result;
  }
  function toggleControl(id,words,action,checked,props={}){
    const {label=words,...rest}=props;
    bind[id]={tap:action,checked:()=>read(checked),label:()=>read(label),...(typeof words==='function'?{text:words}:{})};
    return {type:'toggle',name:id,text:read(words),checked:read(checked),height:48,width:'fill',size:15,fontFamily:bodyFont(),border:{color:bronze,width:1},...rest};
  }
  function buttons(items,count=2){
    return split(items,count).map(group=>{
      const cell=(partWidth-6*(group.length-1))/group.length;
      const parts=group.map(item=>({...item,size:Math.max(13,Math.min(item.size??15,Math.floor((cell-(item.type==='toggle'?62:12))/Math.max(1,roughUnits(item.text)))))}));
      return row(parts,{height:Math.max(...parts.map(x=>x.height))});
    });
  }
  function nativeTabs(name,label,items,count){
    const rows=buttons(items,count);
    return col(rows,{name,role:'tablist',label,height:rows.length*48+Math.max(0,rows.length-1)*6,gap:6});
  }
  function footer(back,go,backId='back',goId='go',backLabel=t('back'),goLabel=t('begin')){
    return row([...(back?[button(backId,backLabel,back)]:[]),...(go?[button(goId,goLabel,go,{primary:true})]:[])],{name:'page-footer',height:48});
  }
  function pane(kind,d,body,actions,props={}){
    const lateral=kind==='title'||kind==='choose',titleSide=kind==='title';
    const max=kind==='loadout'?960:kind==='free'?820:kind==='result'?680:kind==='settings'?740:lateral?480:640;
    const width=Math.max(200,Math.min(max,d.width-12,lateral&&!d.portrait?Math.max(320,d.width*.55):d.width-12));
    const height=lateral?(d.portrait?Math.min(d.height-10,Math.max(300,d.height*(titleSide?.64:.73))):d.height-10)
      :Math.min(d.height-10,kind==='loadout'?780:kind==='free'||kind==='settings'?700:kind==='result'?510:430);
    return col([...body,...(actions?[rule(),actions]:[])],{name:'menu-panel',width,height,
      anchor:lateral?(d.portrait?'bottom':titleSide?'left':'right'):'center',padding:d.short?8:14,gap:d.short?5:8,
      color:ink,alpha:.94,border:{color:bronze,width:1},...props});
  }
  function paneWidth(kind,d){
    const cap={title:480,choose:480,loadout:960,free:820,result:680,settings:740}[kind]??640;
    return Math.max(200,Math.min(cap,d.width-12,(kind==='title'||kind==='choose')&&!d.portrait?Math.max(320,d.width*.55):d.width-12))-(d.short?16:28);
  }
  function sectionTitle(words){return heading('screen-title',words,{height:34,size:25});}
  function render(){
    if(!current||!slot)return;
    const d=dims(),model=current;
    const old=view,focus=old?.focused;
    let offset=0;
    if(old){try{offset=old.scroll('page-scroll').offset;}catch{} old.close();}
    bind={};partWidth=paneWidth(model.kind,d);
    const root=model.draw(d);
    const desc={label:model.label,root,skin,...(model.modal?{modal:true}:{})};
    const options={bind,state:model,gamepad:true,...(paragraphCache?{paragraphCache}:{}),
      ...(model.modal&&model.back?{dismiss:model.back}:{}),
      ...(model.kind==='pause'?{resume:model.primary}:{}),
      ...(model.modal&&model.initial?{initialFocus:model.initial}:{})};
    view=game.show(desc,options);mountedModel=model;
    try{view.scroll('page-scroll').scrollTo(offset);}catch{}
    if(focus)try{view.focus(focus);}catch{}
    if(!view.focused&&model.initial)try{view.focus(model.initial);}catch{}
    // A genuine menu transition takes keyboard focus; on gameplay hide the
    // owner of the scene canvas takes it back and can request pointer lock.
    if(!old)game.canvas?.focus({preventScroll:true});
    game.invalidate?.();
  }
  function show(model){
    // Settings resend the same page when a choice changes; retain the scroll
    // viewport and keyboard focus rather than returning to Done each time.
    if(model&&current?.kind===model.kind&&slot?.id==='menu-'+model.kind&&view){
      if(model.kind==='settings'&&model.settings===current.settings&&model.language===current.language){updateView();return;}
      current=model;refresh();return;
    }
    current=model;
    const token=++revision;
    pending=pending.then(async()=>{
      if(token!==revision)return;
      if(slot){
        await stack.closeAll();
        slot=null;
      }
      if(token!==revision||!model)return;
      slot={id:'menu-'+model.kind,layer:'page',back:'none',open(){
        if(token!==revision)return {close(){}};
        render();
        return {show(){view?.show();},hide(){view?.hide();},cover(){view?.cover();},reveal(){view?.reveal();},
          activate(){view?.activate();},deactivate(){view?.deactivate();},
          close(){view?.close();view=null;mountedModel=null;}};
      }};
      void stack.open(slot).catch(cause=>{model.onError?.(cause);console.error(cause);});
    });
  }
  function refresh(){if(slot&&current)render();}
  function updateView(){view?.refresh();game.invalidate?.();}
  const onScreen=()=>{if(current&&slot)refresh();};
  const unlisten=game.browser?.onScreenChange?.(onScreen)??game.onScreenChange?.(onScreen);
  game.scope.use({dispose(){unlisten?.();void stack.dispose();}});
  function update(){
    const m=current;if(!m)return;
    if(m.kind==='choose'){
      if(game.keys.pressed('right','d'))m.cycle(1);
      else if(game.keys.pressed('left','a'))m.cycle(-1);
    }
    // Focused native buttons get Enter/Space themselves. This is the original
    // default action only when no actionable menu is focused.
    if(!m.modal&&game.keys.pressed('escape','pad:b')&&m.back)m.back();
    if(!view?.focused&&game.keys.pressed('enter')&&m.primary)m.primary();
  }
  const artRows=(r,d)=>{
    const rows=[];
    for(const [key,id,note] of [['X',r.art,''],['Z',r.offArt,''],['X',r.mountedArt,t('mountedArt')]]){
      if(!ARTS[id])continue;const art=ARTS[id];
      rows.push(paragraph('art-'+id,key+'  '+(note||t('art'))+' · '+say(art.name)+t('paren',{w:say(art.weapon)})+say(art.text)+' '+t('artCost',{s:art.cool,r:art.rage}),partWidth));
    }return rows;
  };
  const chooseCards=(m,r)=>{
    const a=[heading('regiment-name',say(r.name)),paragraph('regiment-arms',t('arms')+': '+say(r.arms)),
      paragraph('regiment-way',say(r.way)),text('regiment-health',t('health')+'  '+r.health,{color:gold})];
    for(const id of r.skills)a.push(paragraph('regiment-skill-'+id,say(SKILLS[id].name)+' · '+say(SKILLS[id].text)));
    return a;
  };
  return {
    hide:()=>show(null), get current(){return current?.kind??null;},get view(){return mountedModel===current?view:null;},update,
    snapshot(){
      if(!current)return {kind:null};
      const {kind,selected,veteran,pick,series,choice,progress,text:message,arts}=current;
      return {kind,...(selected?{selected}:{}),...(veteran!==undefined?{veteran}:{}),
        ...(pick?{skills:[...pick.skills],talents:[...pick.talents],arts}:{}),
        ...(choice?{me:choice.me,foes:[...choice.foes],place:choice.place,series:!!series}:{}),
        ...(progress!==undefined?{progress,text:message}:{})};
    },
    title({onRoad,onExpedition,onFree,onSeries,onSettings,best,note=''}) {
      const m={kind:'title',label:t('title'),initial:'road',primary:onRoad,draw(d){
        const choices=[button('road',t('road'),onRoad,{primary:true}),button('expedition',t('expedition'),onExpedition),
          button('free',t('free'),onFree),button('series',t('duelSeries'),onSeries),button('settings',t('settings'),onSettings)];
        return pane(m.kind,d,[heading('title-heading',t('title'),{color:paper,size:d.short?32:43,height:d.short?42:60}),rule(),
          scroll([paragraph('tagline',t('tagline'),partWidth,{color:gold,size:16}),...buttons(choices,d.short?3:d.portrait?2:1),
            ...(best?[paragraph('best',best)]:[]),...(note?[paragraph('title-note',note)]:[]),
            paragraph('controls',t(coarse?'touchText':'controlsText'),partWidth,{size:13})])],
          row([button('lang',t('language'),onLanguage,{width:120}),{type:'space',width:'fill',height:48}],{height:48}));
      }};
      show(m);
    },
    choose({selected:regiment='yulin',onPick,onLook,onBack,title=t('chooseRegiment'),veteran=null,onDifficulty}) {
      const m={kind:'choose',label:title,initial:'pick',selected:regiment,veteran,back:onBack,
        primary:()=>onPick(m.selected),cycle(delta){m.selected=ORDER[(ORDER.indexOf(m.selected)+delta+ORDER.length)%ORDER.length];onLook?.(m.selected);refresh();},
        draw(d){
          const difficulty=m.veteran===null?[]:[nativeTabs('difficulty',t('expeditionDifficulty'),['march','veteran'].map(id=>tab('difficulty-'+id,t(id==='march'?'expeditionMarch':'expeditionVeteran'),()=>{
            m.veteran=id==='veteran';onDifficulty?.(m.veteran);updateView();
          },()=>m.veteran===(id==='veteran'))),2)];
          const tabs=ORDER.map(id=>tab('look-'+id,say(REGIMENTS[id].name),()=>{m.selected=id;onLook?.(id);refresh();},m.selected===id,{size:14}));
          return pane(m.kind,d,[sectionTitle(title),scroll([...difficulty,nativeTabs('regiments',t('chooseRegiment'),tabs,d.short&&partWidth>=420?3:2),rule(),
            ...chooseCards(m,REGIMENTS[m.selected]),paragraph('choose-hint',t('chooseHint'))])],footer(onBack,m.primary,'back','pick',t('back'),t('next')));
        }};
      onLook?.(m.selected);show(m);
    },
    loadout({regiment,chosen,onDone,onBack}) {
      const r=REGIMENTS[regiment],pick=playerLoadout(regiment,chosen);
      const toggle=(list,id,max)=>{const n=list.indexOf(id);if(n>=0)list.splice(n,1);else{if(list.length>=max)list.shift();list.push(id);}updateView();};
      const m={kind:'loadout',label:t('loadout'),initial:'done',pick,arts:[r.art,r.offArt,r.mountedArt].filter(id=>ARTS[id]).length,back:onBack,
        primary:()=>onDone(playerLoadout(regiment,pick)),
        draw(d){
          const wide=partWidth>620,detailWidth=wide?(partWidth-12)/2:partWidth;
          const card=(type,id,item,chosen,action,detail)=>{
            const marker=()=>chosen()?(type==='skill'?'  ['+(pick.skills.indexOf(id)?'T':'R')+']':'  ✓'):'';
            const title=()=>say(item.name)+marker(), words=say(item.text)+(detail?' · '+detail:'');
            const p=paragraph('details-'+id,words,detailWidth-14,{size:13});
            bind['choice-card-'+id]={color:()=>chosen()?0x492c1b:0x281b17};
            return col([toggleControl(type+'-'+id,title,action,chosen,{label:say(item.name)}),p],{
              name:'choice-card-'+id,color:chosen()?0x492c1b:0x281b17,border:{color:bronze,width:1},
              height:48+p.height+20,padding:8,gap:4});
          };
          const skills=[heading('skills-label',t('skills')+' · '+t('picked',{n:pick.skills.length,max:2}),{size:18,height:30}),
            ...r.skills.map(id=>card('skill',id,SKILLS[id],()=>pick.skills.includes(id),()=>toggle(pick.skills,id,2),t('cool',{s:SKILLS[id].cool})))];
          const talents=[heading('talents-label',t('talents')+(r.talents.length?' · '+t('picked',{n:pick.talents.length,max:Math.min(4,r.talents.length)}):''),{size:18,height:30}),
            ...(r.talents.length?r.talents.map(id=>card('talent',id,TALENTS[id],()=>pick.talents.includes(id),()=>toggle(pick.talents,id,4)))
              :[paragraph('no-talents',t('noTalents'),detailWidth)])];
          bind['skills-label']={text:()=>t('skills')+' · '+t('picked',{n:pick.skills.length,max:2})};
          bind['talents-label']={text:()=>t('talents')+(r.talents.length?' · '+t('picked',{n:pick.talents.length,max:Math.min(4,r.talents.length)}):'')};
          const contentHeight=a=>a.reduce((n,x)=>n+x.height,0)+8*Math.max(0,a.length-1);
          const lists=wide?[row([col(skills,{height:contentHeight(skills),width:'fill'}),col(talents,{height:contentHeight(talents),width:'fill'})],
            {height:Math.max(contentHeight(skills),contentHeight(talents)),gap:12,align:'start'})]:[...skills,...talents];
          return pane(m.kind,d,[sectionTitle(partWidth<550?t('loadout'):say(r.name)+' · '+t('loadout')),scroll([...(partWidth<550?[heading('regiment-name',say(r.name),{size:20,height:28})]:[]),paragraph('loadout-hint',t('loadoutHint')),
            ...artRows(r,d),rule(),...lists])],footer(onBack,m.primary,'back','done',t('back'),t('begin')));
        }};
      show(m);
    },
    stageCard({stage,total,series,onBack,onGo}) {
      const foes=stage.foes.map(f=>say(REGIMENTS[f].name)).join(' '+t('and')+' ');
      const round=series?t('seriesRound',{n:stage.index+1}):stage.expedition?t('expeditionStage',{n:stage.index+1}):stage.double?t('finale'):t('stage',{n:stage.index+1});
      const m={kind:'card',label:round,initial:'go',primary:onGo,back:onBack,modal:true,draw(d){
        return pane(m.kind,d,[scroll([text('round',round+' / '+total+(stage.expedition?' · '+t(stage.veteran?'expeditionVeteran':'expeditionMarch'):''),{align:'center',color:gold}),
          heading('arena',placeName(stage.place),{size:d.short?32:40,height:d.short?44:58,align:'center',color:paper}),
          paragraph('adversaries',t('versus')+' · '+foes,partWidth,{align:'center',color:gold,size:20}),
          ...(series?[text('standing',t('seriesStanding',series),{align:'center'})]:[]),
          paragraph('fight-tip',t(coarse?'touchFightTip':'clickToFight'),partWidth,{align:'center',size:13})])],
          footer(onBack,onGo,'back','go',t('toTitle'),t('fight')),{height:Math.min(d.height-10,320)});
      }};show(m);
    },
    result({won,double,stats,last,onNext,onRetry,onTitle,runMark,expedition=false,series}){
      const mark=runMark?t('marks')[['jia','yi','bing','ding'].indexOf(runMark)]:null;
      const advance=series?!series.finished:won&&!last,retry=series?series.finished:!won;
      const primary=advance?onNext:retry?onRetry:onTitle,title=won?(double?t('double'):t('won')):t('lost');
      const primaryId=advance?'next':retry?'retry':'title';
      const seriesStatus=series?.finished?t(series.wins===2?'seriesWon':'seriesLost'):series?t('seriesRound',{n:series.wins+series.losses}):'';
      const m={kind:'result',label:title,modal:true,initial:primaryId,primary,back:onTitle,draw(d){
        const statsItems=[['time',t('seconds',{s:stats.time.toFixed(1)})],['deflects',stats.deflects],['breaks',stats.broken],['taken',stats.taken],
          ...(won&&!series?[['score',stats.score]]:[])];
        const tiles=statsItems.map(([id,val])=>col([text('stat-label-'+id,t(id),{color:muted,align:'center',size:13}),heading('stat-value-'+id,val,{color:paper,align:'center',size:20,height:26})],
          {name:'stat-'+id,height:62,color:lacquer,width:'fill',padding:4,gap:0,border:{color:bronze,width:1}}));
        const actions=row([...(advance?[button('next',t(series?'seriesNext':expedition?'expeditionNext':'goOn'),onNext,{primary:true})]:[]),
          ...(retry?[button('retry',t(series?'seriesRematch':'retry'),onRetry,{primary:true})]:[]),button('title',t('toTitle'),onTitle,{primary:!advance&&!retry})],{name:'page-footer'});
        return pane(m.kind,d,[heading('result-heading',title,{color:won?gold:muted,size:d.short?38:58,height:d.short?52:78,align:'center'}),
          scroll([...(series?[paragraph('series-status',seriesStatus+' · '+t('seriesStanding',series),partWidth,{align:'center'})]:
            (last&&won?[paragraph('run-won',t(expedition?'expeditionWon':'runDone'),partWidth,{align:'center'})]:[])),
          ...(mark?[heading('mark',t('mark')+'  '+mark,{align:'center',color:gold})]:[]),
          ...split(tiles,partWidth>520?5:2).map(items=>row(items,{height:62}))])],actions,{height:Math.min(d.height-10,196+Math.ceil(tiles.length/(partWidth>520?5:2))*70+(series||last&&won?42:0)+(mark?42:0))});
      }};show(m);
    },
    pause({onResume,onSettings,onLeave}) {
      const m={kind:'pause',label:t('paused'),modal:true,initial:'resume',back:onResume,primary:onResume,draw(d){
        return pane(m.kind,d,[sectionTitle(t('paused')),scroll([button('resume',t('resume'),onResume,{primary:true,width:'100%'}),
          button('settings',t('settings'),onSettings,{width:'100%'}),button('leave',t('giveUp'),onLeave,{width:'100%'}),
          paragraph('controls',t(coarse?'touchText':'controlsText'),partWidth,{size:13})])],null);
      }};show(m);
    },
    settings({settings,onChange,onDone}) {
      const m={kind:'settings',label:t('settings'),language:getLanguage(),settings,modal:true,initial:'done',back:onDone,primary:onDone,draw(d){
        const lines=[['quality','quality',[['low','qualityLow'],['medium','qualityMedium'],['high','qualityHigh']]],
          ['control','control',[['directional','directional'],['classic','classic']]],
          ['assist','assist',[[true,'on'],[false,'off']]],['blood','blood',[[true,'on'],[false,'off']]],
          ['sound','sound',[[true,'on'],[false,'off']]],['invertY','invert',[[true,'on'],[false,'off']]],
          ['sensitivity','sensitivity',[[0.6,'qualityLow'],[1,'qualityMedium'],[1.6,'qualityHigh']]]];
        const children=[];
        for(const [key,label,choices] of lines){
          children.push(text('setting-label-'+key,t(label),{color:gold,height:22,fontWeight:700}));
          const items=choices.map(([value,word])=>tab('set-'+key+'-'+String(value),t(word),()=>{onChange(key,value);},()=>String(settings[key])===String(value),{label:labelFor(t(label),t(word)),size:14}));
          children.push(nativeTabs('setting-'+key,t(label),items,key==='control'&&partWidth<520?1:choices.length));
        }
        return pane(m.kind,d,[sectionTitle(t('settings')),scroll(children)],
          row([button('lang',t('language'),onLanguage),button('done',t('done'),onDone,{primary:true})],{name:'page-footer'}));
      }};show(m);
    },
    free({state,series,onGo,onBack,onLook}) {
      const m={kind:'free',label:t(series?'duelSeries':'free'),choice:state,series,initial:'go',back:onBack,primary:()=>onGo(state),modal:true,draw(d){
        const me=ORDER.map(r=>tab('me-'+r,say(REGIMENTS[r].name),()=>{
          state.me=r;state.foes=state.foes.filter(f=>f!==r);if(!state.foes.length)state.foes=[ORDER.find(x=>x!==r)];
          onLook?.(r);refresh();
        },state.me===r,{label:labelFor(t('you'),say(REGIMENTS[r].name)),size:14}));
        const foes=ORDER.filter(r=>r!==state.me).map(r=>(series?tab:toggleControl)('foe-'+r,say(REGIMENTS[r].name),()=>{
          if(series)state.foes=[r];else{const at=state.foes.indexOf(r);if(at>=0){if(state.foes.length>1)state.foes.splice(at,1);}
            else{if(state.foes.length>=2)state.foes.shift();state.foes.push(r);}}
          updateView();
        },()=>state.foes.includes(r),{label:labelFor(t('foes'),say(REGIMENTS[r].name)),size:14}));
        const places=PLACES.map(p=>tab('place-'+p,placeName(p),()=>{state.place=p;updateView();},()=>state.place===p,{size:14}));
        const count=partWidth>620?3:2,foeCount=!series&&partWidth<520?1:count,placeCount=getLanguage()==='en'&&partWidth<520?1:count;
        return pane(m.kind,d,[sectionTitle(m.label),scroll([paragraph('free-hint',t(series?'seriesHint':'freeHint')),
          text('you-label',t('you'),{color:gold}),nativeTabs('your-regiment',t('you'),me,count),
          text('foes-label',t('foes'),{color:gold}),(series?nativeTabs('foe-regiment',t('foes'),foes,count):col(buttons(foes,foeCount),{name:'foe-regiment',label:t('foes'),height:Math.ceil(foes.length/foeCount)*54-6,gap:6})),
          text('places-label',t(series?'seriesPlace':'place'),{color:gold}),nativeTabs('arenas',t(series?'seriesPlace':'place'),places,placeCount)])],
          footer(onBack,m.primary,'back','go'));
      }};onLook?.(state.me);show(m);
    },
    loading(words) {
      const m={kind:'loading',label:words,text:words,progress:.1,modal:true,draw(d){
        const title=text('loading-message',m.text,{size:20,fontFamily:titleFont(),align:'center',height:42});
        bind['loading-message']={text:()=>m.text};
        bind['loading-progress']={value:()=>m.progress};
        return pane(m.kind,d,[title,{type:'bar',name:'loading-progress',label:m.label,value:m.progress,color:gold,height:10,width:'100%'}],null,
          {width:Math.min(360,d.width-12),height:100});
      }};show(m);
    },
    progress(k,words) {
      if(current?.kind!=='loading')return;
      current.progress=Math.max(0,Math.min(1,k));if(words)current.text=words;view?.refresh();game.invalidate?.();
    },
    error(words,onRetry){
      const m={kind:'error',label:t('error'),modal:true,initial:'retry',primary:onRetry,draw(d){
        return pane(m.kind,d,[scroll([paragraph('error-message',words,partWidth,{color:paper,size:16})])],
          row([button('retry',t('reload'),onRetry,{primary:true})],{name:'page-footer'}));
      }};show(m);
    },
    lang:getLanguage
  };
}






