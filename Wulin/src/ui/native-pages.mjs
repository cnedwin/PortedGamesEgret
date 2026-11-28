// The native page descriptions do not own simulation state; every control invokes
// the same command used by the world controller. All layouts use the safe view box.
import { ART_BY_ID, ARTS, CLASSES, CLASS_KEYS, levelOf, unmetNeeds } from '../data/arts.mjs';
import { DIFFICULTIES, FOCUSES, RELICS, SCENARIOS } from '../data/extras.mjs';
import { BUILDINGS, ECONOMY } from '../data/goods.mjs';
import { HOUSE_RULES, TALENTS, WANDERERS } from '../data/jianghu.mjs';
import { PLACES, PLACE_BY_ID, RESOURCE_NAMES, RESOURCES } from '../data/places.mjs';
import { RANKS, SECTS, SECT_BY_ID } from '../data/sects.mjs';
import { chronicleEntries } from '../core/extras.mjs';
import { APT_NAMES, STAT_NAMES, prowess } from '../core/persons.mjs';
import { QUALITIES, RANKINGS, qualityOf, rankingLabel, rankingValue } from '../core/disciples.mjs';
import { TOURNEY, eligible as tourneyEligible, nextTourney } from '../core/tourney.mjs';
import { BOOK_LEVEL, TEACH_LEVEL, bookOffers, commonArts, heldArts } from '../core/library.mjs';
import { SEAT_PLOTS } from '../core/seat-layout.mjs';
import { SHOP_LIMIT, beds, ledger, membersOf, openingPeaceYears, openingProtection, placesOf, residents, strength, upgradeAvailability, usedCells } from '../core/world.mjs';
import { prologue } from './opening.mjs';
import { text, button, row, col, scroll, image, bar, field, choice, COLORS, TITLE_FONT, commandSeal } from './native-kit.mjs';

const C={...COLORS,red:COLORS.vermillion,green:COLORS.jade,line:COLORS.edge,night:COLORS.deep};
const SERIF=TITLE_FONT;
const n = value => Math.round(value ?? 0).toLocaleString('en-US');
const heading = (title, props={}) => text(title,{size:24,height:34,bold:true,fontFamily:SERIF,color:C.ink,...props});
const caption = (value, props={}) => text(value,{size:15,height:46,lines:2,color:C.muted,...props});
const copy = (value, lines=2, props={}) => text(value,{size:17,height:Math.max(30,Math.ceil((props.size??17)*1.5)*lines+2),lines,color:C.ink,...props});
const action = (label,act,data={},props={}) => button(label, act, data, {kind:'paper',height:48, ...props});
const tab = (label,act,data,active,props={}) => action(label,act,data,{role:'tab',selected:active,color:active?C.gold:C.wash,textColor:active?C.cream:C.ink,border:{color:active?C.goldLight:C.edge,width:active?2:1},...props});
const inkTab=(label,act,data,active,props={})=>tab(label,act,data,active,{color:active?C.gold:C.dark,textColor:C.cream,border:{color:active?C.goldLight:0x76865e,width:active?2:1},...props});
const sceneAction=(label,act,data={},props={})=>action(label,act,data,{kind:'scene',...props});
const primary = (label,act,data={},props={}) => action(label,act,data,{kind:'primary',color:C.gold,textColor:C.cream,border:{color:C.goldLight,width:2},...props});
const warn = (label,act,data={},props={}) => action(label,act,data,{kind:'danger',color:C.red,textColor:C.cream,...props});
const facts = (label,value) => row([text(label,{size:15,width:'40%',height:'fill',color:C.muted}),copy(String(value),2,{width:'fill',height:'fill',bold:true})],{height:48,gap:8});
const listRows = (items, empty='暂无记录。') => items.length?items:[caption(empty)];
const transparent = (children, props={}) => col(children,{layout:'free',width:'100%',height:'100%',...props});
const batches = (items, columns) => {
  const rows = [];
  for(let i=0;i<items.length;i+=columns) { const children=items.slice(i,i+columns); rows.push(row(children,{height:48,gap:6,...(children.every(item=>item.role==='tab')?{role:'tablist'}:{})})); }
  return rows;
};
const strip = (items, columns=2) => batches(items,columns);
const backdrop = (ctx, name, mode) => {
  const url=ctx.helpers.sceneUrl(name);
  return url?image(url,{width:mode==='portrait'?1500:mode==='tabletPortrait'?1850:'100%',height:mode==='wide'?640:'100%',anchor:'center'}):col([],{width:'100%',height:'100%',anchor:'center',color:C.dark});
};
const portrait = (ctx,p,view='bust',props={}) => {
  const url=ctx.helpers.faceUrl(p,view);
  return url?image(url,{label:p?.name??'',width:72,height:96,...props}):
    text(ctx.ui.language==='en'?'◇':p?.name?.slice(0,1)??'？',{size:30,fontFamily:SERIF,color:C.goldLight,width:64,height:64,...props});
};
const choiceRows=(label,change,value,options,props={}) => choice(label,change,{},value,options,{height:48,...props});
const qName=p=>QUALITIES[qualityOf(p)]?.name??'—';
const secNames=['全部','掌门','长老','亲传','内门','外门','杂役'];
const plotLabel=i=>'第 '+(i+1)+' 块地 · '+(SEAT_PLOTS[i].x<0?'西侧':'东侧');
function layouts(build){return {root:build('wide'),portrait:build('portrait'),tablet:build('tablet'),tabletPortrait:build('tabletPortrait')};}
const upright=mode=>mode==='portrait'||mode==='tabletPortrait';
const large=mode=>mode==='tablet'||mode==='tabletPortrait';
function framedHeading(part){
  return row([commandSeal({width:30,height:30}),{...part,width:'fill',height:38,color:C.cream,bold:true,fontWeight:700},col([],{width:5,height:27,color:C.vermillion,semantic:false})],
    {height:46,padding:4,gap:7,color:C.deep,card:true,border:{color:C.goldLight,width:1}});
}
function windowPanel(children, mode, {staged=false}={}) {
  const [first,...rest]=children;
  let content=children;
  if(first?.type==='text')content=[framedHeading(first),...rest];
  else if(first?.type==='panel'&&first.scroll&&first.children?.[0]?.type==='text'){
    content=[{...first,children:[framedHeading(first.children[0]),...first.children.slice(1)]},...rest];
  }
  return col(content,{card:true,color:C.paper,alpha:1,border:{color:C.goldLight,width:2},padding:9,gap:8,
    width:staged?(upright(mode)?'96%':large(mode)?440:350):upright(mode)?'96%':'94%',
    height:staged?(upright(mode)?'53%':large(mode)?'72%':'62%'):(large(mode)||upright(mode)?'72%':'64%'),
    anchor:staged&&!upright(mode)?'bottom-right':'bottom',y:61,x:staged&&!upright(mode)?8:0});
}
function scrollBody(children){return scroll(children,{width:'100%',height:'fill',name:'page-rows',gap:7,padding:3});}
function pageHeader(title,description,body,mode,{actions=[]}={}) {
  return windowPanel([heading(title),scrollBody([copy(description,2),...actions,...body])],mode);
}

function title(ctx,mode) {
  const {ui,music}=ctx, narrow=upright(mode), short=mode==='wide';
  const lang=row([inkTab('中文','language',{language:'zh'},ui.language!=='en'),inkTab('English','language',{language:'en'},ui.language==='en')],{height:48,gap:5,role:'tablist',width:'fill'});
  return transparent([backdrop(ctx,'title',mode),col([scroll([
    row([commandSeal({width:34,height:34}),text('大昭 · 承和元年',{size:15,height:34,color:C.goldLight,fontFamily:SERIF,width:'fill',bold:true})],{height:34,gap:8}),
    text('武林天下',{size:large(mode)?58:short?42:46,height:short?54:76,color:C.cream,fontFamily:SERIF,bold:true,fontWeight:700}),
    row([col([],{width:56,height:3,color:C.vermillion,semantic:false}),col([],{width:'fill',height:1,color:C.goldLight,semantic:false})],{height:3,gap:5}),
    text(ui.language==='en'?'The edict falls. The gate stands.':'禁武令已下。山门未闭。',{size:18,height:32,color:C.paper,lines:1}),
    row([primary('开创新局','page',{page:'prologue'}),sceneAction('载入存档','sheet',{kind:'load'})],{layout:short?'row':'column',height:short?48:101,gap:5}),
    row([sceneAction(music.on&&music.unlocked?'静音背景音乐':'开启背景音乐','title-music'),lang],{layout:short?'row':'column',height:short?48:101,gap:5}),
  ],{height:'fill',width:'100%',gap:7,justify:'center'})],
    {card:true,color:C.deep,alpha:0.91,border:{color:C.goldLight,width:1},padding:15,gap:7,width:narrow?'92%':short?390:340,
      height:narrow?420:large(mode)?430:'96%',anchor:narrow?'bottom':'left',x:narrow?0:18,y:narrow?14:0,justify:'center'})]);
}
function prologuePage(ctx,mode) {
  const {ui}=ctx;
  const chapter=prologue[ui.prologue];
  const last=ui.prologue===prologue.length-1;
  const english=ui.language==='en', compact=upright(mode), storyLines=english?(compact?13:9):6;
  const p={portraitId:chapter.portrait,name:chapter.speaker};
  return transparent([backdrop(ctx,chapter.scene,mode),col([
    heading(chapter.chapter,{size:29,color:C.goldLight,height:42}),
    scrollBody([row([portrait(ctx,p,'bust',{width:compact?64:84,height:118}),col([
      text(chapter.speaker,{size:20,bold:true,color:C.goldLight,height:30}),copy(chapter.line,storyLines,{color:C.paper})
    ],{width:'fill',height:'fill',gap:5})],{height:storyLines*26+42,gap:10})]),
    row([text('第 '+(ui.prologue+1)+' 幕 / '+prologue.length,{size:16,color:C.goldLight,width:'fill',height:48}),primary(last?'踏入江湖':'继续','prologue-next',{}, {width:'50%'})],{height:48,gap:6}),
    row([sceneAction('返回标题','page',{page:'title'}),sceneAction('跳过序章','skip-prologue')],{height:48,gap:6}),
  ],{card:true,color:C.dark,border:{color:C.gold,width:1},padding:12,gap:7,width:upright(mode)?'96%':large(mode)?760:'94%',height:upright(mode)?'56%':large(mode)?310:'94%',anchor:'bottom',y:8})]);
}

function sectPage(ctx,mode) {
  const {ui,helpers:h}=ctx;
  const sect=SECT_BY_ID[ui.chosen], seat=PLACE_BY_ID[sect.seat], own=ui.founding;
  const tall=upright(mode), spacious=large(mode)&&!tall;
  const selections=SECTS.map(s=>inkTab((own?PLACE_BY_ID[s.seat].name:s.name)+(ui.language==='en'?'':' · '+(own?CLASSES[s.main].name:PLACE_BY_ID[s.seat].name)),'choose-sect',{sect:s.id},s.id===sect.id,{
    size:15,border:{color:s.id===sect.id?C.goldLight:0x46554a,width:1}}));
  const founder=own?{portraitId:'founder-male',name:'开山掌门'}:h.founder(sect);
  const summary=scroll([
    row([portrait(ctx,founder,'full',{width:spacious?'100%':90,height:spacious?320:134}),
      col([heading(own?seat.name:sect.name,{color:C.goldLight,height:32,size:22}),
        caption(seat.name+' · '+(own?'立派之地':'总舵'),{color:C.goldLight,height:23,lines:1,size:14}),
        copy(own?'以此地的山门和武学为基础，另立门派。':'掌门 · '+sect.leader.name+'（'+sect.leader.age+' 岁）',2,{color:C.paper,size:15}),
        copy(sect.role+' · 主修'+CLASSES[sect.main].name+'，兼修'+CLASSES[sect.second].name,3,{color:C.paper,size:14})
      ],{width:'fill',height:spacious?206:'fill',gap:5})
    ],{layout:spacious?'column':'row',height:spacious?554:180,gap:8})
  ],{width:tall?'100%':'40%',height:tall?200:'fill',card:true,color:0x182823,border:{color:C.gold,width:1},padding:8,gap:5,name:'sect-profile'});
  const chooser=scroll([
    ...(own?[field('门派名号','own-name',ui.ownName,{maxLength:6}),field('掌门姓名','own-leader',ui.ownLeader,{maxLength:6}),caption('择一处山门作为起点',{color:C.goldLight})]:[]),
    ...strip(selections,2),
  ],{name:'sect-selection',width:'fill',height:'fill',padding:5,gap:7});
  const background=backdrop(ctx,'world',mode);
  return transparent([background,
    col([
      heading('立足江湖',{color:C.goldLight,size:30,height:40}),
      row([tab('接掌门派','choose-founding',{own:'false'},!own),tab('自立门户','choose-founding',{own:'true'},own)],{height:48,gap:8,role:'tablist'}),
      row([chooser,summary],{layout:tall?'column':'row',width:'fill',height:'fill',gap:10}),
      row([action('返回序章','page',{page:'prologue'}),primary('定下传承','sect-next')],{height:48,gap:8})
    ],{card:true,color:C.dark,border:{color:C.goldLight,width:2},padding:14,gap:9,width:tall?'96%':spacious?928:'92%',height:'95%',anchor:'center'})
  ]);
}
function legacyPage(ctx,mode) {
  const {ui}=ctx, sect=SECT_BY_ID[ui.chosen];
  const rules=[
    tab('一代宗师','succession',{enabled:'false'},!ui.succession),
    caption('人物年龄照常增长，年迈不会导致离世。'),
    tab('世代传承','succession',{enabled:'true'},ui.succession),
    caption('年迈的门人可能离世，掌门离世后由门中后继者继任。'),
    heading('天下局势与对手',{size:20,height:30}),
    choiceRows('开局局势','scenario',ui.scenario,Object.entries(SCENARIOS).map(([id,sc])=>[id,sc.name])),
    choiceRows('对手强弱','difficulty',ui.difficulty,DIFFICULTIES.map((d,i)=>[i,d.name])),
    copy(SCENARIOS[ui.scenario].does,2),
    copy('开局有 '+openingPeaceYears(ui.difficulty)+' 年立足期。若先对某派出兵，对方可反击。',3)
  ];
  return transparent([backdrop(ctx,'seat',mode),col([
    heading('山门传承'),caption([ui.founding?ui.ownName.trim():sect.name,ui.founding?ui.ownLeader.trim():sect.leader.name,PLACE_BY_ID[sect.seat].name].join(' · '),{height:44}),
    scrollBody(rules),row([action('重择门派','sect-back'),primary(ui.founding?'开山立派':'入主山门','new')],{height:48,gap:7})
  ],{card:true,color:C.paper,border:{color:C.gold,width:2},padding:13,gap:7,width:upright(mode)?'96%':large(mode)?610:'76%',height:'94%',anchor:'center'})]);
}
function zoomLine(act='zoom') {
  return row([sceneAction('＋',''+act,{dir:'in'},{label:'拉近',width:48}),sceneAction('−',act,{dir:'out'},{label:'拉远',width:48}),sceneAction('全景',act,{dir:'reset'},{width:60})],{height:48,gap:5});
}
function sceneTools(ctx,mode,label,children=[]) {
  // The safe width shrinks on a notched landscape display; command cards
  // occupy its right side. Keep all left controls inside that remaining strip.
  const beside = !upright(mode) && !ctx.ui.commandCollapsed;
  const buttons=children.map(child=>({...child,color:C.deep,textColor:C.cream,border:{color:0x516a51,width:1},...(beside?{width:'fill'}:{})}));
  return col([row([sceneAction(ctx.ui.commandCollapsed?label:'观景','command-toggle',{}, {width:96,color:C.jade,textColor:C.cream,border:{color:C.goldLight,width:1}}),...buttons],{height:48,gap:4})],
    {width:upright(mode)?'96%':large(mode)?(children.length>1?'32%':'25%'):(children.length>1?'46%':'34%'),height:48,anchor:'top-left',x:8,y:upright(mode)?148:112});
}
function seatScreen(ctx,mode) {
  const {world,ui,picture,helpers:h}=ctx, me=h.me(), b=h.books();
  const placeId=ui.place, place=world.places[placeId], spec=PLACE_BY_ID[placeId], sect=SECT_BY_ID[me];
  const here=residents(world,placeId), leader=h.leaderOf(me), accounting=ledger(world,me), mine=placesOf(world,me);
  ui.building=Math.max(0,Math.min(ui.building,place.buildings.length-1));
  const picked=place.buildings[ui.building], kind=BUILDINGS[picked?.kind]??BUILDINGS.hall;
  const expansion=upgradeAvailability(world,me,placeId,ui.building), protection=openingProtection(world);
  const lodging=Math.min(beds(world,placeId),ECONOMY.headcountCap);
  const seat=spec.id===sect.seat?'总舵':'分舵';
  const tabs=[['build','建筑'],['recruit','招贤'+(place.applicants.length?' '+place.applicants.length:'')],['here','此地'],['affairs','事务']].filter(([id])=>h.open(id));
  if(!tabs.some(([id])=>id===ui.seatTab))ui.seatTab='build';
  const build=()=>{
    const cost=kind.cost*((picked?.level??0)+1);
    return [
      row([text(kind.name+' · '+(picked?.level??0)+' 级',{width:'fill',height:48,size:15,lines:2,bold:true,fontFamily:SERIF}),
        picked?.level<kind.max?primary('升至 '+(picked.level+1)+' 级 '+n(cost)+' 两','upgrade',{index:ui.building},{disabled:!expansion.ok,width:'54%',size:14}):caption('已满级',{width:'40%',height:48})],{height:48,gap:5}),
      caption(kind.does+' · 占地 '+kind.cells+' 格'),
      primary('兴建建筑','sheet',{kind:'build'}),
      ...(!expansion.ok&&picked?.level<kind.max?[copy(expansion.why,2,{color:C.red})]:[]),
      ...(!['hall','gate'].includes(picked?.kind)?[choiceRows('迁建','plot',picked?.plot??'',[['','由管事安排'],...SEAT_PLOTS.map((_,i)=>[i,plotLabel(i)])])]:[]),
      caption(picture.stage?'点建筑可扩建，点空地上的「＋」可兴建。':'现有建筑'),
      ...strip(place.buildings.map((item,i)=>tab(BUILDINGS[item.kind].name+' '+item.level,'building',{index:i},i===ui.building)),2),
    ];
  };
  const recruit=()=>[
    heading('招贤榜'),copy((leader?'你是掌门「'+leader.name+'」'+(leader.place===placeId?'，可在此面试':'，现驻 '+(PLACE_BY_ID[leader.place]?.name??'外地')):'掌门暂缺')+' · 空铺 '+Math.max(0,lodging-here.length)+' 张',3),
    ...listRows(place.applicants.slice(0,4).map((p,i)=>{
      const [apt,score]=Object.entries(p.apt).sort((a,b)=>b[1]-a[1])[0];
      return row([portrait(ctx,p,'bust',{width:58,height:70}),col([
        text(p.name+' · '+qName(p),{height:27,size:18,bold:true}),caption(p.origin+' · '+p.age+'岁 · '+APT_NAMES[apt]+' '+score,{height:43})
      ],{width:'fill',height:'fill',gap:2}),action('会见','sheet',{kind:'applicant',index:i},{width:68})],{height:76,gap:6,card:true,color:0xe4d8bf,padding:5});
    }),'榜前无人。威望越高，来投的人越多、资质越好。')
  ];
  const local=()=>[
    heading('此地'),action('驻此 '+here.length+' 人 · 全派 '+accounting.members+' 人','page',{page:'disciples'}),
    facts('建筑用地',usedCells(world,placeId)+' / '+spec.cells),
    facts('厢房床位',here.length+' / '+beds(world,placeId)),
    facts('山下店铺',place.shops+' / '+SHOP_LIMIT),
    facts('掌门',leader?.place===placeId?'在此':PLACE_BY_ID[leader?.place]?.name??'在外'),
    ...RESOURCES.map(key=>facts(RESOURCE_NAMES[key],'●'.repeat(spec.resources[key])+'○'.repeat(3-spec.resources[key]))),
    ...strip([...here].sort((a,b)=>b.rank-a.rank||b.level-a.level).slice(0,14).map(p=>action(p.name,'person',{id:p.id})),2),
    ...(here.length>14?[action('其余 '+(here.length-14)+' 人','page',{page:'disciples'})]:[]),
    choiceRows('此处专精','focus',place.focus??'none',Object.entries(FOCUSES).map(([id,f])=>[id,f.name+'：'+f.does])),
    caption('每间每旬入银 '+ECONOMY.shopIncome.join('–')+' 两，并代售门中出产'),
    primary('开设店铺 '+n(ECONOMY.shopCost)+' 两','shop',{}, {disabled:place.shops>=SHOP_LIMIT})
  ];
  const affairs=()=>[
    heading('门派事务 · 每旬结算'),facts('全派薪俸',accounting.wages+' 两'),facts('商路进项',accounting.trade+' 两'),
    facts('上旬售货',n(b.sold?.goods)+' 两'),facts('朝廷关系',Math.round(b.court)),
    copy('库存　'+RESOURCES.map(key=>RESOURCE_NAMES[key]+' '+Math.round(b.res[key])).join(' · '),3),
    choiceRows('门规','rule',b.rule??'plain',Object.entries(HOUSE_RULES).map(([id,rule])=>[id,rule.name+'：'+rule.does])),
    action('职位 · 任命','sheet',{kind:'offices'}),action('丹房 · 炼药、服药','sheet',{kind:'pills'}),
    copy('散银 '+n(ECONOMY.donation)+' 两，威望 +'+ECONOMY.donationRenown+'（至 '+ECONOMY.donationCeiling+' 为止）',2),
    primary('布施','donate')
  ];
  const page=[heading(spec.name+' · '+seat),caption(h.b_status(place,here)+' · '+(h.hourText?.()??''),{height:30,lines:1}),
    ...strip(mine.length>1?mine.map(id=>tab(PLACE_BY_ID[id].name,'look',{place:id},id===placeId)):[],2),
    ...strip(tabs.map(([id,label])=>tab(label,'seat-tab',{tab:id},ui.seatTab===id)),2),
    ...({build,recruit,here:local,affairs}[ui.seatTab]??build)(),
    ...(protection?.active?[caption('立足期余 '+n(protection.daysLeft)+' 日',{color:C.green})]:[])
  ];
  return transparent([
    ...(!picture.stage&&!picture.loading?[backdrop(ctx,'seat')]:[]),sceneTools(ctx,mode,'山门指令',[...(picture.stage?[action(ui.tags?'隐藏建筑名':'显示建筑名','tags',{},{width:'fill',size:15})]:[]),action(ui.language==='en'?'Handbook':'掌门手札','guide-open',{},{label:'掌门手札',width:'fill',size:15})]),
    ...(picture.stage?[col([zoomLine()],{width:166,height:48,anchor:upright(mode)?'top-left':'bottom-left',x:8,y:upright(mode)?201:ctx.ui.commandCollapsed?104:64})]:[]),
    ...(!ui.commandCollapsed?[windowPanel([scrollBody(page)],mode,{staged:true})]:[])
  ]);
}


/** Keep long lists modest even for a large realm, without hiding any records. */
function paginate(ctx,key,items,make,pageSize=10){
  const count=Math.max(1,Math.ceil(items.length/pageSize));
  const index=Math.min(count-1,Math.max(0,Math.floor(ctx.ui.listPages?.[key]??0)));
  const rendered=items.slice(index*pageSize,(index+1)*pageSize).map((item,i)=>make(item,index*pageSize+i));
  if(count===1)return rendered;
  const nav=()=>row([
    action('上一页','list-page',{key,page:index-1},{disabled:index===0,width:84}),
    text((index+1)+' / '+count,{size:15,height:48,width:'fill',align:'center'}),
    action('下一页','list-page',{key,page:index+1},{disabled:index===count-1,width:84})
  ],{height:48,gap:5});
  return [nav(),...rendered,nav()];
}

const TABLE_KEYS=RANKINGS.map(([key])=>key).filter(key=>!key.startsWith('apt:')&&key!=='age');
function disciples(ctx,mode){
  const {world,ui,helpers:h}=ctx, all=membersOf(world,h.me()), list=h.roster();
  for(const id of ui.batch) if(world.persons[id]?.school!==h.me())ui.batch.delete(id);
  const many=placesOf(world,h.me()).length>1, chips=h.waiting().filter(([, ,people])=>people.length);
  if(ui.only&&!chips.some(([key])=>key===ui.only))ui.only='';
  const ranking=ui.sortKey!=='rank';
  const common=[
    ...(!ui.picking?[row([tab('名牌','roster-view',{view:'cards'},ui.rosterView==='cards'),tab('榜单','roster-view',{view:'table'},ui.rosterView==='table'),action('多选改派','picking')],{height:48,gap:5})]:[]),
    row([primary('一键安排差事','sheet',{kind:'assign'}),action('武学名录','page',{page:'arts'})],{height:48,gap:6}),
    ...strip(chips.map(([key,label,people])=>tab(label+' '+people.length+' 人','only',{only:key},ui.only===key)),2),
    ...(!chips.length?[caption('门中诸事停当，无人待你发落。')]:[]),
    ...(ui.only==='promotable'?[primary('全部晋升','promote-all')]:[]),
    ...(ui.only==='idle'?[primary('为他们安排差事','sheet',{kind:'assign',idle:'true'})]:[]),
    row([field('查找弟子','search-person',ui.search??'',{maxLength:30,width:'56%',size:14}),
      choiceRows('身份','rank-filter',ui.rank,secNames.map(rank=>[rank,rank]),{width:'fill',size:14})],{height:48,gap:6}),
    ...(ui.picking?[
      caption('已选 '+ui.batch.size+' 人 · 点名牌增减'),
      ...strip([action('全选所列','batch-all'),primary('改派差事','sheet',{kind:'batch'},{disabled:!ui.batch.size}),action('清空已选','batch-clear'),action('完成','picking')],2)
    ]:[
      choiceRows('排行','sort',ui.sortKey,[['rank','按身份'],...RANKINGS.map(([key,label])=>[key,'按'+label])]),
      ...(ranking?[action(ui.sortUp?'低 → 高':'高 → 低','sort-dir')]:[]),
      ...(ui.rosterView==='table'?[copy('榜单可按以下指标排行；点击姓名查看完整人物履历。',2,{size:15})]:[])
    ]),
  ];
  const card=(p,i)=>{
    const suffix=(ranking?(i+1)+' · ':'')+p.name+' · '+qName(p)+(p.wounds>.05?' · 伤':'');
    const job=h.jobText(p), art=h.bestArtText(p);
    const line=RANKS[p.rank].name+' · '+p.level+' 级'+(many?' · '+PLACE_BY_ID[p.place].name:'');
    const values=ui.rosterView==='table'&&!ui.picking?TABLE_KEYS.map(key=>rankingLabel(key)+' '+n(rankingValue(p,key))).join(' · '):
      '战力 '+n(prowess(p))+(ranking&&ui.sortKey!=='prowess'?' · '+rankingLabel(ui.sortKey)+' '+n(rankingValue(p,ui.sortKey)):'');
    const selected=ui.picking&&ui.batch.has(p.id),table=ui.rosterView==='table'&&!ui.picking,tall=upright(mode);
    const spacious=large(mode)&&!tall,english=ui.language==='en';
    const detailLines=table?(english?(tall?5:spacious?3:4):(tall?4:spacious?2:3)):(spacious&&!english?1:2);
    const detailHeight=detailLines*23+2,nameHeight=46,summaryHeight=spacious&&!english?28:48,jobHeight=27;
    const cardHeight=nameHeight+summaryHeight+detailHeight+jobHeight+8+4*4+4+12;
    return row([
      portrait(ctx,p,'bust',{width:tall?64:76,height:tall?92:112,border:{color:C.goldLight,width:1}}),
      col([action((selected?'✓ ':'')+suffix,ui.picking?'batch-toggle':'person',{id:p.id},{name:'disciple-'+p.id,selected,color:selected?C.gold:C.panel,textColor:selected?C.cream:C.ink,border:{color:selected?C.goldLight:C.edge,width:selected?2:1},height:nameHeight,size:17}),
        caption(line+' · '+art,{height:summaryHeight,lines:summaryHeight>28?2:1}),
        copy(values,detailLines,{height:detailHeight,color:C.ink,size:15}),
        caption(job+' · 忠诚 '+n(p.loyalty)+' %',{height:jobHeight,lines:1}),
        bar(Math.max(0,Math.min(1,p.loyalty/100)),{height:8,label:'忠诚',color:p.loyalty<30?C.red:C.green})],
      {width:'fill',height:'fill',gap:4,padding:2})
    ],{height:cardHeight,card:true,color:C.wash,border:{color:C.edge,width:1},gap:8,padding:6,name:'disciple-row-'+p.id});
  };
  const filters=scroll([...common],{name:'roster-controls',width:upright(mode)?'100%':'40%',height:upright(mode)?'45%':'100%',gap:6,padding:4,color:C.wash,card:true,border:{color:C.edge,width:1}});
  const entries=scrollBody([text(list.length+' / '+all.length+' 人',{size:16,height:27,bold:true,color:C.gold}),
    ...listRows(paginate(ctx,'roster',list,card,5),'暂无符合条件的弟子。')]);
  return windowPanel([heading('门中弟子',{height:30,size:22}),
    row([filters,{...entries,width:'fill',height:'fill'}],{layout:upright(mode)?'column':'row',height:'fill',gap:8})
  ],mode);
}

function arts(ctx,mode){
  const {world,ui,helpers:h}=ctx, me=h.me(), held=heldArts(world,me), p=h.picked();
  if(!p)return pageHeader('藏经阁','尚无人可修练武学。',[action('返回弟子','page',{page:'disciples'})],mode);
  const shelf=ARTS.filter(a=>held.has(a.id)||p.arts[a.id]>0);
  const list=shelf.filter(a=>ui.artTier==='全部'||a.tier===Number(ui.artTier));
  const chosen=shelf.find(a=>a.id===ui.art)??list[0]??shelf[0];
  const common=commonArts(),got=common.filter(a=>held.has(a.id)).length, offers=bookOffers(world,me);
  const missing=CLASS_KEYS.map(key=>[key,common.filter(a=>a.klass===key&&!held.has(a.id))]).filter(([,entries])=>entries.length);
  const controls=[
    action('返回弟子','page',{page:'disciples'}),
    choiceRows('为谁择艺','arts-person',p.id,membersOf(world,me).sort((a,b)=>b.rank-a.rank||b.level-a.level).map(person=>[person.id,person.name+'（'+RANKS[person.rank].name+'）'])),
    heading('阁中所藏'),
    ...strip(['全部',1,2,3,4,5].map(t=>tab(t==='全部'?t:t+'阶','art-tier',{tier:t},String(ui.artTier)===String(t))),3)
  ];
  const detail=chosen?(()=>{
    const needs=unmetNeeds(p,chosen,held).filter(need=>!(chosen.tier===5&&need==='需闭关领悟'));
    const klass=CLASSES[chosen.klass];
    return [
      heading(chosen.name),facts('阶位',chosen.tier+'阶'),facts('类别',klass.name),
      facts('来历',held.has(chosen.id)?h.artSource(chosen):p.name+'自带，尚不能传授'),
      facts('倚重',klass.attrs.map(key=>STAT_NAMES[key]).join('、')),
      facts(p.name+'已练',levelOf(p.arts[chosen.id]??0)+' 重'),
      ...chosen.moves.map(move=>copy(move.name+'：威力 '+Math.round(move.power)+'，耗内力 '+move.nei+'（'+move.level+' 重解锁）',2)),
      ...(needs.length?[copy(p.name+'尚不能修练：'+needs.join('、'),3,{color:C.red})]:[]),
      primary(chosen.tier===5?'让'+p.name+'闭关领悟':'让'+p.name+'修练','train-art',{id:chosen.id},{disabled:needs.length>0}),
      action('由'+p.name+'著成秘笈','manual',{id:chosen.id},{disabled:levelOf(p.arts[chosen.id]??0)<7}),
      copy((chosen.custom?chosen.founder+'所创。':'')+(h.books().manuals[chosen.id]?'藏经阁有 '+h.books().manuals[chosen.id]+' 重抄本，在有藏经阁之处修练此艺更快。':'练到 '+TEACH_LEVEL+' 重便能传授他人；练至七重可著成秘笈，人不在了书还在。'),4)
    ];
  })():[caption('这一阶阁中尚无所藏。')];
  const offered=offers.map(offer=>{
    const a=ART_BY_ID[offer.id];
    return row([col([text('《'+a.name+'》',{size:18,height:28,bold:true}),caption(CLASSES[a.klass].name+' · '+a.tier+'阶 · 抄本 '+BOOK_LEVEL+' 重',{height:38,size:13,lines:1})],{width:'fill',height:'fill'}),
      action(n(offer.price)+' 两','buy-book',{id:a.id},{width:116,disabled:h.books().silver<offer.price})],{height:76,padding:4,gap:6,card:true,color:0xe4d9c4});
  });
  return pageHeader('藏经阁','通用武学已得 '+got+' / '+common.length+' 门，本门绝学 '+ARTS.filter(a=>a.sect===me||a.custom&&held.has(a.id)).length+' 门。未得之艺，要从江湖上寻来。',[
    ...controls,...detail,
    ...listRows(paginate(ctx,'arts',list,a=>tab(a.name+' · '+CLASSES[a.klass].name+' · '+a.tier+'阶','art',{id:a.id},a.id===chosen?.id,{name:'art-'+a.id})),'这一阶阁中尚无所藏。'),
    heading('书贩 · 每季换一批'),...listRows(offered,'这一季书贩手里没有本派用得上的书。'),
    copy('别的门路：友好门派肯代为传授（江湖 · 门派往来 · 求授）；攻下有藏经阁的据点能带走几部；带艺投师的人练到 '+TEACH_LEVEL+' 重即可授徒；江湖奇遇偶有所得。',5),
    heading('未得之艺 · 尚缺 '+(common.length-got)+' 门'),
    ...listRows(missing.map(([key,entries])=>col([text(CLASSES[key].name,{size:18,bold:true,height:28,color:C.gold}),
      ...entries.map(a=>caption(a.tier+'阶 '+a.name,{height:26,lines:1}))],{height:31+entries.length*28,gap:2})), '天下通用的武学，本派已尽数收齐。')
  ],mode);
}

function worldPage(ctx,mode){
  const {world,ui,picture,helpers:h}=ctx,me=h.me();
  const unlocked=h.open('world');
  ui.mapPlace??=SECT_BY_ID[me].seat;
  const spec=PLACE_BY_ID[ui.mapPlace], place=world.places[spec.id], owner=SECT_BY_ID[place.owner], deal=h.placeDeal(spec.id);
  const guard=place.owner?residents(world,spec.id):[], relation=owner&&owner.id!==me?Math.round(h.books().relations[owner.id]):null;
  const actionsFor=unlocked?{
    mine:[primary('前往此处山门','look',{place:spec.id,go:'1'})],
    far:[caption('不与本派据点相邻，鞭长莫及。')],
    open:[primary('开设分舵（'+n(ECONOMY.settleCost??1500)+'两）','sheet',{kind:'settle',place:spec.id})],
    foe:[primary('商议出兵','sheet',{kind:'march',place:spec.id}),action('馈赠 500 两','gift',{sect:place.owner})]
  }[deal.kind]:deal.kind==='mine'?[primary('前往此处山门','look',{place:spec.id,go:'1'})]:[];
  const detail=[
    heading(spec.name+' · '+(owner?.name??'无主')),copy(spec.note,3),
    ...(!unlocked?[copy(ui.language==='en'?'Browse only. Branches, gifts and campaigns unlock after the first 10 days or first objective.':'先观览天下：首旬或完成首项要务后，开放分舵、馈赠和出兵。',4,{color:C.gold})]:[]),
    facts('地块容量',spec.cells+' 格'),facts('物产',RESOURCES.filter(key=>spec.resources[key]>=2).map(key=>RESOURCE_NAMES[key]).join('、')||'平平'),
    ...(owner?[facts('守卫',guard.length+' 人 · 战力 '+n(strength(guard)))]:[]),
    ...(relation!==null?[facts('与本派关系',relation)]:[]),
    facts('与本派',{mine:spec.id===SECT_BY_ID[me].seat?'本派总舵':'本派分舵',far:'未接壤',open:'接壤',foe:'接壤'}[deal.kind]),
    ...actionsFor,heading('通达据点'),
    ...spec.roads.map(id=>action(PLACE_BY_ID[id].name+' · '+(SECT_BY_ID[world.places[id].owner]?.name??'无主'),'place',{place:id})),
    heading('天下据点'),
    ...paginate(ctx,'strongholds',PLACES,s=>tab(s.name+' · '+(SECT_BY_ID[world.places[s.id].owner]?.name??'无主'),'place',{place:s.id},s.id===ui.mapPlace,{name:'stronghold-'+s.id}))
  ];
  const model=(picture.stage||picture.loading)&&ui.map3d;
  if(!model){
    const url=ctx.helpers.sceneUrl('world');
    const zoom=Math.max(1,Math.min(3,ui.map?.zoom??1));
    const map=url?image(url,{name:'map-painting',width:zoom>1?(upright(mode)?393:large(mode)?1280:873)*zoom:'100%',height:zoom>1?(upright(mode)?852:large(mode)?800:393)*zoom:'100%',anchor:'center',x:ui.map?.x??0,y:ui.map?.y??0}):backdrop(ctx,'world');
    // Picture-based fallback is selectable via the same stronghold controls. The
    // painting itself stays underneath, leaving room for the native commands.
    return transparent([map,sceneTools(ctx,mode,'据点详情',[
      ...(picture.stage?[action('改看沙盘','mapmode',{}, {width:112})]:[]),
      ...(unlocked&&h.open('diplomacy')?[action('门派往来','sheet',{kind:'diplomacy'},{width:112})]:[])
    ]),
    col([zoomLine('mapzoom')],{width:166,height:48,anchor:upright(mode)?'top-left':'bottom-left',x:8,y:upright(mode)?201:ctx.ui.commandCollapsed?104:64}),
    ...(!ui.commandCollapsed?[windowPanel([scrollBody(detail)],mode,{staged:true})]:[])]);
  }
  return transparent([
    sceneTools(ctx,mode,'据点详情',[action('画卷','mapmode',{},{width:78}),...(unlocked&&h.open('diplomacy')?[action('门派往来','sheet',{kind:'diplomacy'},{width:130})]:[])]),
    col([zoomLine()],{width:166,height:48,anchor:upright(mode)?'top-left':'bottom-left',x:8,y:upright(mode)?201:ctx.ui.commandCollapsed?104:64}),
    ...(!ui.commandCollapsed?[windowPanel([scrollBody(detail)],mode,{staged:true})]:[])
  ]);
}

function battlePage(ctx,mode){
  const {world,ui,helpers:h}=ctx, me=h.me();
  if(!ui.fight){
    const targets=PLACES.filter(spec=>h.placeDeal(spec.id).kind==='foe');
    const party=h.marchParty(), next=nextTourney(world), hopeful=tourneyEligible(world,me)[0], last=ui.lastFight;
    const body=[
      heading('可攻之敌'),caption('我方可战 '+party.length+' 人 · 战力 '+n(strength(party))),
      ...listRows(targets.map(spec=>action(spec.name+' · '+SECT_BY_ID[world.places[spec.id].owner].name+' · 守 '+residents(world,spec.id).length+' 人 · 战力 '+n(strength(residents(world,spec.id))),'sheet',{kind:'march',place:spec.id},{size:15})), '四邻皆无他派据点。'),
      heading('擂台 · 每三十日一开'),copy('让一名弟子登擂，与过路的好手单打独斗。胜则扬名，负则带伤。',3),
      primary('选人登擂','duel'),heading('论剑大会 · 每 '+TOURNEY.every+' 年一届'),
      copy('第 '+next.edition+' 届定于'+h.dayText(next.day)+'，还有 '+n(next.day-world.day)+' 日。各派遣一名弟子出战（亲传及以下，掌门、长老与江湖奇人不得下场），夺魁者门派威望 +'+TOURNEY.renown[0]+'、得银 '+n(TOURNEY.silver[0])+' 两，另赠一部本派所缺的秘笈。',6),
      ...(hopeful?[copy('眼下门中最有望者：'+hopeful.name+'（'+RANKS[hopeful.rank].name+' · 战力 '+n(prowess(hopeful))+'）。',3)]:[]),
      ...paginate(ctx,'tourney-history',[...(world.tourneys??[])].reverse(),r=>copy('第 '+r.edition+' 届 · 魁首 '+SECT_BY_ID[r.champion.sect].name+' '+r.champion.name+(r.mine?' · 本派 '+r.mine.name+'：'+r.mine.place:' · 本派未出战'),3),3),
      ...(last?[heading('上一战 · '+last.title),copy(last.verdict,4),...paginate(ctx,'battle-report',last.lines.slice(-8),line=>copy(line,3),4)]:[])
    ];
    return pageHeader('眼下无战事','可出兵攻打与本派据点相邻的他派据点。出战最多十人，伤重者不上阵。',body,mode);
  }
  const {arena,title,heads,lines,side:mine}=ui.fight,battle=arena.battle;
  const army=i=>{
    const units=battle.units.filter(unit=>unit.side===i),left=units.filter(unit=>!unit.down&&!unit.fled);
    const hp=units.reduce((sum,unit)=>sum+(unit.down||unit.fled?0:unit.hp),0),max=units.reduce((sum,unit)=>sum+unit.hpMax,0);
    return row([portrait(ctx,heads[i].person,'bust',{width:44,height:44}),
      col([text(heads[i].name+' '+left.length+' / '+units.length,{size:15,height:23,color:C.paper,bold:true}),bar(max?hp/max:0,{height:10,label:heads[i].name+'兵力',color:i===mine?0x5fad87:0xca5d46})],
      {width:'fill',height:'fill',gap:2})],{width:'fill',height:46,gap:5,padding:2});
  };
  const clock=String(Math.floor(battle.time/60)).padStart(2,'0')+':'+String(Math.floor(battle.time%60)).padStart(2,'0');
  const marked=battle.units.find(u=>u.id===battle.orders[mine].focus&&!u.down);
  const controls=[
    inkTab(arena.paused?'继续':'暂停','fight-pause',{},arena.paused),
    ...[1,2,4].map(s=>inkTab(s+'×','fight-speed',{speed:s},s===arena.speed&&!arena.paused,{width:48})),
    primary(battle.rallied[mine]>0?'号令中':'号令','fight-rally',{}, {disabled:battle.rallied[mine]!==0})
  ];
  const secondary=[
    ...[['attack','攻'],['even','衡'],['defend','守']].map(([id,label])=>inkTab(label,'fight-stance',{stance:id},battle.stances[mine]===id,
      {label:({attack:'攻势加一成，防御减一成',even:'攻守均衡',defend:'防御加一成，攻势减一成'})[id],width:50})),
    sceneAction('速决','fight-skip'),warn('撤退','sheet',{kind:'retreat'},{disabled:battle.orders[mine].retreat})
  ];
  const portraitMode=upright(mode);
  return transparent([
    col([row([army(0),text(clock,{width:58,height:44,size:17,color:C.goldLight,bold:true,align:'center'}),army(1),sceneAction('战报','battle-log',{}, {width:64,height:44,size:14})],{height:46,gap:4}),
      text(title+' · '+(battle.done?'胜负已分':arena.paused?'已暂停':'交战中'),{height:18,size:13,color:C.paper,bold:true,align:'center'})],
      {width:'98%',height:70,anchor:'top',y:4,padding:3,gap:0,color:C.dark,card:true}),
    col([caption(marked?'集火：'+marked.name+'（再点一次取消）':'点选敌人下令集火',{color:C.paper,height:17,lines:1}),
      row([row(controls,{height:48,gap:3,width:'fill'}),row(secondary,{height:48,gap:3,width:'fill'})],{layout:portraitMode?'column':'row',height:portraitMode?100:48,gap:4})],
      {width:'98%',height:portraitMode?130:72,anchor:'bottom',y:4,padding:3,gap:1,color:C.dark,card:true}),
    col([scroll(listRows(lines.slice(-6).reverse().map(line=>copy(line,2,{size:14,color:C.paper})), '两军正在接近。'),{name:'battle-report',width:'100%',height:'fill',gap:4})],
      {width:portraitMode?'92%':large(mode)?'32%':'42%',height:portraitMode?'34%':'43%',anchor:'top-left',x:6,y:79,padding:5,gap:3,color:C.dark,card:true,visible:!!ui.battleLog})
  ]);
}

const LOG_TYPES = { moment: '弟子', tourney: '论剑', 'tourney-call': '论剑', start: '立派', conquer: '征伐', repel: '守御', fallback: '退守', fall: '覆灭', settle: '分舵', death: '讣告', desert: '叛离', insight: '领悟', succession: '传位', summit: '大会', event: '奇遇', intel: '情报', hostilities: '交战', court: '朝廷', join: '来投' };
function chronicle(ctx,mode){
  const {world,ui,helpers:h}=ctx,me=h.me();
  const records=chronicleEntries(world).filter(r=>ui.logFilter==='全部'||(ui.logFilter==='本派')===(r.sect===me||r.type==='start')).slice(-160).reverse();
  const held=heldArts(world,me),shelf=ARTS.filter(a=>!a.sect||a.sect===me||a.custom&&held.has(a.id)),met=world.met??{};
  const relicHome=id=>Object.entries(world.sects).find(([,b])=>b.relics?.includes(id))?.[0];
  const counts={arts:shelf.filter(a=>held.has(a.id)).length+' / '+shelf.length,wanderers:WANDERERS.filter(w=>met[w.id]==='joined').length+' / '+WANDERERS.length,relics:RELICS.filter(r=>relicHome(r.id)===me).length+' / '+RELICS.length};
  const tabs=[['annals','编年'],['arts','武学谱 '+counts.arts],['wanderers','奇人录 '+counts.wanderers],['relics','神兵谱 '+counts.relics]];
  // Short entries need not occupy an entire four-line paragraph. The longer
  // entries retain a real native paragraph and generous room on narrow screens.
  const journalCopy=value=>{
    const units=[...String(value)].reduce((n,ch)=>n+((ch.codePointAt(0)??0)>=0x2e80?1:.55),0);
    const across=upright(mode)?18:large(mode)?56:33;
    const lines=Math.max(ui.language==='en'?2:1,Math.min(6,Math.ceil(units*(ui.language==='en'?1.8:1)/across)));
    return copy(value,lines,{size:16,height:lines*24+3,color:C.ink});
  };
  const entry=(got,title,about)=>{
    const body=journalCopy(about);
    return col([text(got?title:'？？？',{size:18,height:31,bold:true,color:got?C.ink:C.muted}),body],
      {height:31+body.height+18,gap:4,card:true,color:C.wash,border:{color:C.edge,width:1},padding:6});
  };
  let lastYear=null;
  const book={
    annals:()=>[
      ...strip(['全部','本派','江湖'].map(filter=>tab(filter,'log-filter',{filter},ui.logFilter===filter)),3),
      ...listRows(paginate(ctx,'annals',records,r=>{
        const y=1+Math.floor(r.day/360);
        const head=y!==lastYear?'承和 '+y+' 年 · ':'';
        lastYear=y;
        const body=journalCopy(r.text);
        return col([row([col([],{width:4,height:22,color:r.sect===me?C.vermillion:C.jade,semantic:false}),text(head+h.dayText(r.day).replace(/^承和\d+年/,'')+' · '+(LOG_TYPES[r.type]??'江湖'),{size:16,width:'fill',height:28,color:C.ink,bold:true})],{height:30,gap:7}),body],
          {height:30+body.height+15,card:true,color:C.panel,border:{color:C.edge,width:1},padding:6,gap:3});
      }), '暂无记录。')
    ],
    arts:()=>[
      heading('已得 '+counts.arts),
      ...paginate(ctx,'art-book',shelf.slice().sort((a,b)=>CLASS_KEYS.indexOf(a.klass)-CLASS_KEYS.indexOf(b.klass)||a.tier-b.tier),a=>entry(true,CLASSES[a.klass].name+' · '+a.tier+'阶 '+a.name,held.has(a.id)?h.artSource(a):'未得 · '+(a.tier<=3?'书贩、求授、攻下藏经阁、奇遇或论剑夺魁可得':'须有人带艺来投')))
    ],
    wanderers:()=>[
      heading('已入门 '+counts.wanderers),copy('三十位江湖奇人各怀一项惠及全派的天赋。威望越高，来访越勤；以诚相邀或重金延揽，方可留下。',4),
      ...paginate(ctx,'wanderers',WANDERERS,w=>met[w.id]==='joined'?entry(true,w.name,'已入门 · '+TALENTS[w.talent].name+'：'+TALENTS[w.talent].does):met[w.id]?entry(true,w.name,'曾来访，未能留下 · 身负「'+TALENTS[w.talent].name+'」'):entry(false,'','尚未谋面'))
    ],
    relics:()=>[
      heading('本派所藏 '+counts.relics),copy('神兵不可打造，只在江湖事件中现世；得了之后，可赐予所长武学用得上的弟子。',4),
      ...paginate(ctx,'relics',RELICS,r=>{
        const home=relicHome(r.id);
        return home===me?entry(true,r.name,r.tale+' · 攻 '+r.power):home?entry(true,r.name,'已现世，现藏于'+SECT_BY_ID[home].name):entry(false,'','尚未现世');
      })
    ]
  }[ui.book]??(()=>[]);
  return pageHeader('门派纪事','年年岁岁，山门与江湖的大小事；所得的武学、奇人与神兵，也都记在这里。',[
    ...strip(tabs.map(([id,label])=>tab(label,'book',{book:id},ui.book===id)),2),...book()
  ],mode);
}
function savesPage(ctx,mode){
  const {world,slots}=ctx,saved=Object.fromEntries(slots.list().map(s=>[String(s.slot),s]));
  const cards=['1','2','3','auto'].map(slot=>col([heading(slot==='auto'?'自动存档':'存档位 '+slot,{size:22}),
    copy(saved[slot]?.label??'空卷',2),
    row([...(slot!=='auto'?[primary('保存','save',{slot})]:[]),action('读取','load',{slot},{disabled:!saved[slot]})],{height:48,gap:5})],
    {height:159,padding:9,gap:5,color:0xe6dac2,card:true}));
  return pageHeader('江湖卷宗','三个手动存档位和一个自动存档，保存在这个浏览器里。',[
    ...cards,heading('存档文件'),
    copy('清除浏览器数据会一并清掉存档，重要的进度请导出为文件。'+(world.flags.editorUsed?'此存档使用过修改器。':''),4),
    row([action('导出存档','export'),action('导入存档','import')],{height:48,gap:6}),warn('回到标题','quit')
  ],mode);
}
const screens={title,prologue:prologuePage,sects:sectPage,legacy:legacyPage,seat:seatScreen,disciples,arts,world:worldPage,battle:battlePage,chronicle,saves:savesPage};
export function createPage(ctx){
  const screen=screens[ctx.ui.page]??(ctx.world?seatScreen:title);
  return layouts(mode=>screen(ctx,mode));
}
