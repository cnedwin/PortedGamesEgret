// Batch3 draft: direct native data for the realm's business dialogs.
// No DOM construction; all game state, rule queries and commands remain the original app calls.
import { FORMATIONS, UNITS } from '../data/battle.mjs';
import { GENERALS } from '../data/generals.mjs';
import { ADJACENT, NODES } from '../data/map.mjs';
import { TACTICS } from '../data/tactics.mjs';
import { TECHS } from '../data/techs.mjs';
import { TRAITS } from '../data/traits.mjs';
import { TREASURES } from '../data/treasures.mjs';
import { FACTIONS } from '../data/factions.mjs';
import { dateOf, serving, stat as statOf } from '../sim/core.mjs';
import { regard } from '../sim/diplomacy.mjs';
import { allied, hostile, troopCap, unitAllowed } from '../sim/military.mjs';
import { persuadeChance } from '../sim/people.mjs';
import { ARMS, aptitudes, mobility } from '../sim/aptitude.mjs';
import { EVENTS } from '../sim/story.mjs';
import { income, power, researchRate, upkeep, canStudy } from '../sim/world.mjs';
import { getLanguage, nm, num, t } from '../i18n.mjs';
import { factionName, generalName, placeName } from '../view/names.mjs';
import { portrait } from '../view/portrait.mjs';
import { ageOf, dayWords, eventOf, logLine, pair, tacticText, techText, traitText, treasureText, treatyAt } from './text.mjs';
const STATS=['lead','war','int','pol','cha'];
const totalHeight=(children,gap=10,pad=0)=>children.filter(Boolean).reduce((n,x)=>n+Number(x.height),0)+Math.max(0,children.filter(Boolean).length-1)*gap+pad*2;
const group=(b,children)=>{children=children.filter(Boolean);return b.panel(children,totalHeight(children,10,10));};
const close=b=>b.act('dialog-close',t('close'),()=>b.app.dialogs.close());
const cancel=b=>b.act('dialog-cancel',t('cancel'),()=>b.app.dialogs.close());
const choices=(b,prefix,items,current,choose,columns=3)=>{
 columns=Math.max(1,Math.min(columns,Math.floor(b.width/140)));const out=[];for(let i=0;i<items.length;i+=columns){out.push(b.row(items.slice(i,i+columns).map(([id,label,reason])=>b.act(prefix+'-'+id,label,()=>choose(id),{selected:id===current,disabled:Boolean(reason),...(reason?{semanticLabel:label+' · '+reason}:{})}))));}return out;
};
const tabs=(b,prefix,items,current,choose)=>{
 const columns=Math.max(1,Math.min(4,Math.floor(b.width/140))),rows=[];
 for(let i=0;i<items.length;i+=columns)rows.push(b.row(items.slice(i,i+columns).map(([id,label])=>b.act(prefix+'-'+id,label,()=>choose(id),{role:'tab',selected:id===current}))));
 return b.column(rows,totalHeight(rows,8),{name:prefix+'-tabs',role:'tablist',gap:8});
};const fields=(b,label,notes)=>[b.section(label),...notes.map(x=>b.note(x))];
const image=(id,size,name)=>({type:'image',name,src:portrait(id,size),width:size,height:Math.round(size*(size>=72?4/3:1.25)),label:generalName(id)});
function officer(b,app,id,{mark,extra,disabled,selected,action}){
 const s=app.state,lines=[generalName(id)+(mark?' · '+mark:''),STATS.map(k=>t(k)+' '+Math.round(statOf(s,id,k))).join(' · '),extra].filter(Boolean);
 const words=b.paragraph(lines.join('\n'),15,{width:'fill',maxWidth:b.width-100}),button=b.act('officer-'+id,generalName(id),action,{selected,disabled});
 return group(b,[b.row([image(id,42,'portrait-'+id),words],Math.max(58,words.height)),button]);
}
const readouts=(b,rows)=>rows.map(([k,value])=>b.row([b.small(k,28),b.txt(value,28,18,{align:'right',bold:true})],28));
const describeReasons=(b,reason)=>reason?b.note(reason):null;
const final=(title,body,actions,initialFocus)=>({title,body:body.flat(Infinity).filter(Boolean),actions:actions.filter(Boolean),initialFocus});

function pickOfficer(app,args,again,b){
 const s=app.state,purpose=args.purpose;let list;
 if(purpose==='persuade')list=serving(s,s.player).filter(g=>g!==args.target&&!(s.generals[g].busyUntil>s.day));
 else if(purpose==='bring')list=serving(s,s.player).filter(g=>{const {at,busyUntil}=s.generals[g];return at!==args.at&&s.nodes[at]?.owner===s.player&&!(busyUntil>s.day);});
 else list=serving(s,s.player,args.at);
 const score=g=>purpose==='persuade'?persuadeChance(s,s.player,g,args.target):purpose==='search'?statOf(s,g,'int')+statOf(s,g,'cha'):statOf(s,g,'pol');list.sort((a,z)=>score(z)-score(a));
 const titles={search:t('searchTitle',{place:placeName(args.at)}),move:t('moveTitle'),bring:t('bringOfficerTitle',{place:placeName(args.at)}),persuade:t('persuadeTitle',{name:generalName(args.target)})};
 if(purpose==='move'&&args.picked){
  const ours=Object.keys(s.nodes).filter(id=>s.nodes[id].owner===s.player&&id!==args.at).sort((a,z)=>Math.hypot(NODES[a].x-NODES[args.at].x,NODES[a].y-NODES[args.at].y)-Math.hypot(NODES[z].x-NODES[args.at].x,NODES[z].y-NODES[args.at].y));
  return final(t('moveWhere',{name:generalName(args.picked)}),ours.map(id=>b.act('move-to-'+id,placeName(id),()=>app.act('moveGeneral',args.picked,id))),[b.act('dialog-back',t('back'),()=>{args.picked=null;again();})],'dialog-back');
 }
 const body=list.length?list.map(g=>{const busy=s.generals[g].busyUntil>s.day;
  const extra=purpose==='bring'?t('bringOfficerFrom',{place:placeName(s.generals[g].at)}):purpose==='persuade'?Math.round(score(g)*100)+'%':busy?t('busy'):null;
  return officer(b,app,g,{extra,disabled:busy&&purpose!=='move',action(){if(purpose==='search')app.act('search',g,args.at);else if(purpose==='persuade')app.act('persuade',g,args.target);else if(purpose==='bring')app.act('moveGeneral',g,args.at);else{args.picked=g;again();}}});}):[b.note(t(purpose==='bring'?'bringOfficerEmpty':'why_generals'))];
 return final(titles[purpose],body,[cancel(b)],'dialog-cancel');
}
function transfer(app,args,again,b){
 const s=app.state,from=args.from,node=s.nodes[from],near=ADJACENT[from].map(l=>l.to).filter(id=>s.nodes[id].owner===s.player);
 args.to=near.includes(args.to)?args.to:near[0];args.amount=Math.min(args.amount??Math.floor(node.troops/2/100)*100,node.troops);
 const body=near.length?[b.section(t('transferTo')),...choices(b,'transfer-to',near.map(id=>[id,placeName(id)+' · '+num(s.nodes[id].troops)]),args.to,id=>{args.to=id;again();}),b.section(t('troops')),
  b.range('transfer-amount',t('troops'),{min:0,max:node.troops,step:100,value:args.amount,format:v=>num(v)+' / '+num(node.troops),preview:v=>{args.amount=v;},commit:v=>{args.amount=v;}})]:[b.note(t('noNeighbour'))];
 return final(t('transferTitle',{place:placeName(from)}),body,[cancel(b),near.length?b.act('transfer-confirm',t('transfer'),()=>app.act('transfer',from,args.to,args.amount),{main:true,disabled:()=>args.amount<100}):null],'dialog-cancel');
}
function general(app,args,again,b){
 const s=app.state,id=args.id,g=GENERALS[id],gs=s.generals[id];if(!g||!gs)return null;
 const mine=gs.status==='serving'&&gs.faction===s.player,f=gs.faction?s.factions[gs.faction]:null,where=gs.at?(s.nodes[gs.at]?placeName(gs.at):s.armies[gs.at]?t('inArmyOf'):'—'):'—';
 const signature=Object.values(TACTICS).filter(tc=>tc.general===id),schemes=Object.values(TACTICS).filter(tc=>tc.mind&&statOf(s,id,'int')>=tc.mind).sort((a,z)=>z.power-a.power).slice(0,4),store=s.factions[s.player].store??[];
 const description=[nm(g)+(getLanguage()==='zh'?' · '+g.en:''),t('status_'+gs.status)+(f?' · '+factionName(s,gs.faction):'')+(gs.status==='captive'?' · '+t('heldBy',{faction:factionName(s,gs.captor)}):''),t('age')+' '+(gs.status==='unborn'?'—':ageOf(s,id))+' · '+t('location')+' '+where,
  gs.status==='serving'?t('loyalty')+' '+Math.round(gs.loyalty):null,g.userCreated&&gs.status!=='dead'?t('birthYear',{born:g.born}):t('lifeYears',{born:g.born,died:gs.status==='dead'?(gs.deathDay!==undefined?dateOf(gs.deathDay).year:g.died):s.options.lifespan==='fiction'?'?':g.died})].filter(Boolean).join('\n');
 const hero=b.paragraph(description,17,{width:'fill'}),apt=aptitudes(id),body=[b.row([image(id,112,'general-portrait'),hero],Math.max(150,hero.height)),
  ...STATS.map(k=>b.row([b.small(t(k),30),b.txt(Math.round(statOf(s,id,k)),30,18,{width:64,align:'right'}),{type:'bar',name:'ability-'+k,value:Math.min(1,statOf(s,id,k)/120),height:16,width:'fill'}],32)),
  b.note(t('mob')+' '+Math.round(mobility(id))+' · '+t('aptitude')+' '+ARMS.map(a=>t('arm_'+a)+' '+apt[a]).join(' · ')),
  ...(g.traits.length?fields(b,t('traits'),g.traits.map(tr=>nm(TRAITS[tr])+' — '+traitText(tr))):[]),
  ...fields(b,t('tactics'),[...signature,...schemes].map(tc=>nm(tc)+(tc.general?' · '+t('signature'):'')+' — '+tacticText(tc.id)).concat(t('weaponTactics'))),
  ...(gs.treasures?.length?fields(b,t('treasures'),gs.treasures.map(tr=>nm(TREASURES[tr])+' — '+treasureText(tr))):[])];
 if(mine&&store.length)body.push(b.section(t('give')),...store.map(tr=>group(b,[b.note(treasureText(tr)),b.act('give-'+tr,nm(TREASURES[tr]),()=>app.act('give',tr,id))])));
 const actions=[];if(mine&&s.nodes[gs.at])actions.push(b.act('general-move',t('moveTo'),()=>app.dialogs.open('pickOfficer',{at:gs.at,purpose:'move',picked:id})));
 const canAsk=(gs.status==='free'&&gs.known)||(gs.status==='captive'&&gs.captor===s.player)||(gs.status==='serving'&&gs.faction!==s.player&&s.factions[gs.faction]?.ruler!==id);
 if(canAsk)actions.push(b.act('general-persuade',t('persuade'),()=>app.dialogs.open('pickOfficer',{purpose:'persuade',target:id}),{main:true}));
 if(gs.status==='captive'&&gs.captor===s.player)actions.push(b.act('general-release',t('release'),()=>app.act('release',id)),b.act('general-execute',t('execute'),()=>app.act('execute',id),{danger:true}));
 actions.push(close(b));return final(nm(g),body,actions,'dialog-close');
}
function generals(app,args,again,b,host){
 const s=app.state;args.tab??='ours';args.sort??='lead';args.page??=0;args.find??='';let list=Object.keys(s.generals);
 if(args.tab==='ours')list=serving(s,s.player);else if(args.tab==='free')list=list.filter(g=>s.generals[g].status==='free'&&s.generals[g].known);else if(args.tab==='captives')list=list.filter(g=>s.generals[g].status==='captive'&&s.generals[g].captor===s.player);else list=list.filter(g=>['serving','free','captive'].includes(s.generals[g].status));
 if(args.find){const q=args.find.toLowerCase();list=list.filter(g=>GENERALS[g].zh.includes(args.find)||GENERALS[g].en.toLowerCase().includes(q));}
 const key=g=>args.sort==='name'?0:args.sort==='loyalty'?s.generals[g].loyalty??0:args.sort==='age'?-GENERALS[g].born:statOf(s,g,args.sort);
 list.sort((a,z)=>args.sort==='name'?GENERALS[a].en.localeCompare(GENERALS[z].en):key(z)-key(a));const per=40,pages=Math.max(1,Math.ceil(list.length/per));args.page=Math.min(args.page,pages-1);const shown=list.slice(args.page*per,args.page*per+per);
 const body=[tabs(b,'roster-tab',[['ours',t('rosterOurs')],['free',t('rosterFree')],['captives',t('rosterCaptives')],['all',t('rosterAll')]],args.tab,id=>{args.tab=id;args.page=0;again();}),
  b.row([b.act('roster-search',args.find||t('findName'),()=>host.edit('roster-search',{value:args.find,placeholder:t('findName'),onCommit:value=>{args.find=value.trim();args.page=0;again();}})),args.find?b.act('roster-reset',t('resetSearch'),()=>{args.find='';args.page=0;again();}):null].filter(Boolean)),
  ...choices(b,'roster-sort',[['name',t('nameCol')],...STATS.map(k=>[k,t(k)]),['loyalty',t('loyalty')],['age',t('age')]],args.sort,k=>{args.sort=k;args.page=0;again();},4),
  ...shown.map(g=>{const gs=s.generals[g],where=gs.at?(s.nodes[gs.at]?placeName(gs.at):t('inArmyOf')):'—',extra=(gs.faction&&args.tab!=='ours'?factionName(s,gs.faction)+' · ':'')+t('loyalty')+' '+(gs.status==='serving'?Math.round(gs.loyalty):'—')+' · '+t('age')+' '+ageOf(s,g)+' · '+where;
   return officer(b,app,g,{extra,action:()=>app.dialogs.open('general',{id:g})});}),shown.length?null:b.note(t('rosterEmpty')),
  pages>1?b.row([b.act('roster-prev','‹',()=>{args.page--;again();},{disabled:args.page===0}),b.txt(`${args.page+1} / ${pages}`,48,18,{align:'center'}),b.act('roster-next','›',()=>{args.page++;again();},{disabled:args.page>=pages-1})]):null,b.note(t('rosterCount',{n:list.length}))];
 return final(t('menuGenerals'),body,[close(b)],'dialog-close');
}
function diplomacy(app,args,again,b){
 const s=app.state,me=s.factions[s.player],others=Object.values(s.factions).filter(f=>f.alive&&f.id!==s.player);others.sort((a,z)=>power(s,z.id).cities-power(s,a.id).cities);
 const body=[b.note(t('diploHelp')),...others.map(f=>{const p=power(s,f.id),r=regard(s,s.player,f.id),tr=me.treaties[f.id],active=tr&&tr.until>s.day,ally=active&&tr.kind==='ally',treaty=active?t('treaty_'+tr.kind,{date:dayWords(tr.until)}):t('noTreaty');
  return group(b,[b.section(factionName(s,f.id)),b.note(t('ruler')+' '+generalName(f.ruler)+' · '+t('factionCities',{n:p.cities})+' · '+t('factionTroops',{n:num(p.troops)})+' · '+t('factionGenerals',{n:p.generals})),b.note(t('regard')+' '+Math.round(r)+' · '+treaty),{type:'bar',name:'regard-'+f.id,value:(r+100)/200,height:16,width:'fill'},
   b.row([b.act('gift-'+f.id,t('gift',{coin:500}),()=>app.act('gift',f.id,500),{disabled:me.coin<500}),b.act('ally-'+f.id,t('proposeAlly'),()=>app.act('propose',f.id,'ally'),{disabled:ally})]),
   b.row([b.act('truce-'+f.id,t('proposeTruce'),()=>app.act('propose',f.id,'truce'),{disabled:active}),active?b.act('break-'+f.id,t('breakTreaty'),()=>app.confirmAction(pair(['确定解除与 ','End the treaty with '])+factionName(s,f.id)+'?',()=>app.act('breakTreaty',f.id)),{danger:true}):null].filter(Boolean)),
   b.row([b.act('demand-'+f.id,t('demandSurrender'),()=>app.confirmAction(pair(['确定向 ','Send the surrender request to '])+factionName(s,f.id)+'?',()=>app.act('demand',f.id))),ally?b.act('joint-'+f.id,t('jointAttack'),()=>{args.ask=f.id;again();}):null].filter(Boolean)),
   ...(args.ask===f.id?[b.note(t('jointWho')),...others.filter(o=>o.id!==f.id&&!allied(s,s.player,o.id)).slice(0,10).map(o=>b.act('joint-target-'+f.id+'-'+o.id,factionName(s,o.id),()=>{args.ask=null;app.act('askAttack',f.id,o.id);}))]:[])]);
 })];return final(t('menuDiplomacy'),body,[close(b)],'dialog-close');
}
function tech(app,args,again,b){
 const s=app.state,f=s.factions[s.player],rate=researchRate(s,s.player),cur=f.research.current,all=Object.values(TECHS);
 const body=[b.note((cur?t('studying',{tech:nm(TECHS[cur]),p:Math.floor(f.research.points/TECHS[cur].cost*100)}):t('studyNone'))+' · '+t('perMonth',{n:Math.round(rate)})+(f.way?' · '+t('wayChosen',{way:t(f.way==='ba'?'wayBa':'wayWang')}):'')),b.note(t('wayNote'))];
 const wide=b.width>=900,positions=new Map(),children=[],paths=[],W=wide?Math.floor((b.width-28)/6):b.width-58,H=96,edge=wide?14:34;
 let y=40;
 const head=(name,yy,x=0,w=b.width)=>({...b.section(name),x,y:yy,width:w});
 const locate=(x,xx,yy)=>positions.set(x.id,{x:xx,y:yy,w:W-10,h:H});
 if(wide){const bands=[];
  for(const way of ['ba','wang']){bands.push(y);children.push(head(t(way==='ba'?'wayBa':'wayWang'),y-35,edge+W,W*5));let longest=0;
   for(let tier=1;tier<=5;tier++){const list=all.filter(x=>x.way===way&&x.tier===tier);list.forEach((x,i)=>locate(x,edge+tier*W,y+i*(H+14)));longest=Math.max(longest,list.length);}
   y+=Math.max(1,longest)*(H+14)+54;
  }
  const base=all.filter(x=>x.way==='base'),middle=Math.round((bands[0]+bands[1])/2);children.push(head(t('wayBase'),Math.max(0,middle-35-base.length*(H+14)/2),edge,W));base.forEach((x,i)=>locate(x,edge,middle+Math.round((i-(base.length-1)/2)*(H+14))));
 }else{for(const way of ['base','ba','wang']){children.push(head(t(way==='base'?'wayBase':way==='ba'?'wayBa':'wayWang'),y-31));
  for(const x of all.filter(x=>x.way===way).sort((a,z)=>a.tier-z.tier)){locate(x,edge,y);y+=H+14;}y+=55;}}
 const info=x=>{const done=f.techs.includes(x.id),can=canStudy(s,s.player,x.id),needs=x.needs.filter(n=>!f.techs.includes(n)).map(n=>nm(TECHS[n])),why=done||can?null:needs.length?t('needTech',{tech:needs.join(getLanguage()==='en'?', ':'、')}):t('wayShut');return{done,can,why,pct:cur===x.id?Math.min(1,f.research.points/x.cost):done?1:0};};
 args.techSelected??=cur??all[0]?.id;
 for(const x of all){const p=positions.get(x.id);if(!p)continue;const v=info(x),label=nm(x)+' · '+(v.done?'✓':cur===x.id?Math.floor(v.pct*100)+'%':x.cost);
  const click=()=>{args.techSelected=x.id;if(v.can&&cur!==x.id)app.act('study',x.id);else again();};
  const node=b.act('tech-node-'+x.id,label,click,{selected:args.techSelected===x.id||cur===x.id,height:48,semanticLabel:label+(v.why?' · '+v.why:'')+' · '+techText(x.id)});
  // Locked/completed nodes can still be focused to read their details; their
  // primary action never issues a study unless the original rule allows it.
  children.push({...b.panel([node,{type:'bar',name:'tech-progress-'+x.id,width:'fill',height:12,value:v.pct}],H),x:p.x,y:p.y,width:p.w});
  for(const need of x.needs){const a=positions.get(need);if(!a)continue;let points;
   if(wide){const start=[a.x+a.w,a.y+a.h/2],end=[p.x,p.y+p.h/2],mid=(start[0]+end[0])/2;points=[start,[mid,start[1]],[mid,end[1]],end];}
   else{const lane=12+((all.findIndex(z=>z.id===need)%3)*5);points=[[a.x,a.y+a.h/2],[lane,a.y+a.h/2],[lane,p.y+p.h/2],[p.x,p.y+p.h/2]];}
   paths.push({points,color:f.techs.includes(need)?0xc9a463:0x776a59,alpha:f.techs.includes(need)?1:.64,width:2});}
 }
 const selected=TECHS[args.techSelected];if(selected){const v=info(selected);body.push(group(b,[b.section(nm(selected)),b.paragraph(techText(selected.id)),selected.needs.length?b.note(pair(['前置：','Requires: '])+selected.needs.map(n=>nm(TECHS[n])).join(' · ')):null,v.why?b.note(v.why):null]));}
 body.push(b.graph('tech-tree',Math.max(y,...[...positions.values()].map(p=>p.y+p.h))+14,children,paths));
 return final(t('menuTech'),body,[close(b)],'dialog-close');
}
function realm(app,args,again,b){
 const s=app.state,f=s.factions[s.player];let coin=0,grain=0;const places=Object.keys(s.nodes).filter(id=>s.nodes[id].owner===s.player);
 for(const id of places){const i=income(s,id);coin+=i.coin;grain+=i.grain;}const u=upkeep(s,s.player);places.sort((a,z)=>(NODES[z].kind==='city')-(NODES[a].kind==='city')||s.nodes[z].people-s.nodes[a].people);const store=f.store??[];
 const body=[...readouts(b,[[t('ruler'),generalName(f.ruler)],[t('income'),`${t('coin')} ${num(coin)} · ${t('grain')} ${num(grain)}`],[t('upkeep'),`${t('coin')} ${num(u.coin)} · ${t('grain')} ${num(u.grain)}`],[t('fame'),num(f.fame)]]),b.section(t('tax')),
  ...choices(b,'tax',['low','normal','high'].map(k=>[k,t('tax_'+k)]),f.tax,k=>app.act('tax',k)),b.note(t('taxNote')),b.section(t('talentOrderTitle')),
  f.talentOrder>s.day?b.note(t('talentActive')+' · '+dayWords(f.talentOrder)):b.act('talent-order',t('talentOrder'),()=>app.act('talentOrder'),{disabled:f.coin<300}),b.section(t('store')),
  ...(store.length?store.map(tr=>b.note(nm(TREASURES[tr])+' — '+treasureText(tr))):[b.note(t('noTreasureStore'))]),b.section(t('cities')+` (${places.length})`),
  ...places.map(id=>{const n=s.nodes[id];return group(b,[b.note(`${t('people')} ${num(n.people)} · ${t('support')} ${Math.round(n.support)} · ${t('order')} ${Math.round(n.order)} · ${t('garrison')} ${num(n.troops)} · ${t('governor')} ${n.governor?generalName(n.governor):'—'}`),b.act('realm-city-'+id,placeName(id),()=>{app.dialogs.close();app.select({node:id});app.map.focus(id);})]);})];
 return final(factionName(s,s.player),body,[close(b)],'dialog-close');
}
function chronicle(app,args,again,b){
 const s=app.state;args.tab??='log';const fired=Object.entries(s.fired).filter(([,d])=>d!=='missed').sort((a,z)=>z[1]-a[1]);
 const body=[tabs(b,'chronicle-tab',[['log',t('chronicleLog')],['tale',t('chronicleTale')],['tree',t('chronicleTree')]],args.tab,id=>{args.tab=id;again();})];
 if(args.tab==='tree'){
  const list=EVENTS.filter(e=>e.branch===s.branch).sort((a,z)=>a.at[0]-z.at[0]||a.at[1]-z.at[1]);
  if(!list.length)body.push(b.note(t('noTale')));else{
   const per=Math.max(1,Math.min(5,Math.floor(b.width/150))),W=Math.floor((b.width-16)/per),H=106,positions=[],children=[],paths=[];
   args.taleSelected??=list[0].id;
   for(const [i,e] of list.entries()){const r=Math.floor(i/per),col=r%2?per-1-i%per:i%per,p={x:8+col*W,y:10+r*(H+20),w:W-10,h:H};positions.push(p);
    const fired=s.fired[e.id],state=typeof fired==='number'?'done':fired==='missed'?'missed':'pending',window=t('taleWindow',{from:e.at[0],month:e.at[1],until:e.until??'—'}),title=pair(e.title);
    children.push({...b.panel([b.act('tale-node-'+e.id,(state==='done'?'✓ ':state==='missed'?'× ':'◇ ')+title,()=>{args.taleSelected=e.id;again();},{selected:args.taleSelected===e.id}),b.small(state==='done'?dayWords(fired):state==='missed'?t('taleMissed'):window,24)],H),x:p.x,y:p.y,width:p.w});
    if(i){const a=positions[i-1],lit=typeof s.fired[list[i-1].id]==='number'&&state==='done';const ax=a.x+a.w/2,ay=a.y+a.h/2,bx=p.x+p.w/2,by=p.y+p.h/2;paths.push({points:[[ax,ay],[bx,ay],[bx,by]],color:lit?0xc9a463:0x776a59,alpha:lit?1:.6,width:2});}
   }
   const selected=list.find(e=>e.id===args.taleSelected);if(selected){const f=s.fired[selected.id];body.push(group(b,[b.section(pair(selected.title)),b.note(typeof f==='number'?dayWords(f):f==='missed'?t('taleMissed'):t('taleWindow',{from:selected.at[0],month:selected.at[1],until:selected.until??'—'})),typeof f==='number'?b.paragraph(pair(selected.text)):null]));}
   body.push(b.graph('tale-tree',Math.ceil(list.length/per)*(H+20)+10,children,paths));
  }
 } else if(args.tab==='log')body.push(...s.log.map(l=>group(b,[b.small(dayWords(l.day)),b.paragraph(logLine(s,l))])));
 else if(fired.length)body.push(...fired.map(([id,d])=>{const e=eventOf(id);return e?group(b,[b.small(dayWords(d)),b.section(pair(e.title)),b.paragraph(pair(e.text))]):null;}));
 else body.push(b.note(s.branch==='free'?t('freeNoTale'):t('noTaleYet')));
 return final(t('menuStory'),body,[close(b)],'dialog-close');
}
export const campaignBuilders={pickOfficer,transfer,general,generals,diplomacy,tech,realm,chronicle};
