// Campaign guidance and waiting receipts use the same native view stack as the realm.
import { dayWords, pair } from './text.mjs';
import { placeName, generalName } from '../view/names.mjs';
import { num,t } from '../i18n.mjs';
import { arrivedArmies } from '../sim/siege-council.mjs';
const p=(zh,en)=>pair([zh,en]);
const palette={panel:0x223834,panelAlpha:.97,button:0x39504b,buttonText:0xf1e2c4,text:0xf1e2c4,accent:0xd8b77c,radius:4,size:15};
const txt=(text,height=42,extra={})=>({type:'text',text,width:'fill',height,size:15,color:0xe6dcbc,...extra});
const note=(text,lines=3)=>txt(text,lines*20,{size:14,paragraph:{fontFamilies:['sans-serif'],locale:'zh-CN',lineHeight:20,maxLines:lines,density:2}});
const b=(name,text,extra={})=>({type:'button',name,text,width:'fill',height:48,size:14,...extra});
const col=(children,extra={})=>({type:'panel',layout:'column',width:'100%',height:'fill',gap:5,children:children.filter(Boolean),...extra});
const row=(children,extra={})=>({type:'panel',layout:'row',width:'100%',height:48,gap:5,children,...extra});
function geometry(host,app) {
  const m=host.metrics(),unit=m.uiScale,sw=m.safe.width/unit,sh=m.safe.height/unit;
  const top=(host.topInset??0)/(m.scale*unit);
  const mini=app.minimap?.snapshot()?.box,miniW=mini?.width/unit||0;
  // Right/bottom anchors measure positive offsets inward. Fit the guide in
  // the gap between the city panel and minimap, never under either.
  const side=app.sel?(m.portrait?0:Math.min(355,sw*.43)):0;
  const sideHeight=app.sel&&m.portrait?Math.max(210,Math.min(sh*.39,430)):0;
  const x=miniW+14,y=top+8;
  const width=Math.max(175,Math.min(365,sw-x-side-20));
  const height=Math.max(108,Math.min(340,sh-y-sideHeight-12));
  return {width,height,x,y};
}
export function createCampaignCoach(app,host){
  const {game}=host;let first=null,waiting=null,firstKey='',waitKey='',expanded=true;
  function closeFirst(){first?.close();first=null;firstKey='';}
  function closeWaiting(){waiting?.close();waiting=null;waitKey='';}
  function refreshFirst(){
    const guide=app.firstMonth,s=app.state;
    if(!s||!guide||guide.dismissed||app.screen!=='play'||app.lab||s.day>=guide.day+30||app.dialogOpen){closeFirst();return;}
    const g=geometry(host,app),key=JSON.stringify([s.factions[s.player].capital,app.paused,guide.day,app.language(),g]);
    if(key===firstKey)return;firstKey=key;
    const capital=s.factions[s.player].capital,nanpi=s.player==='liubei'&&capital==='pingyuan'&&!s.founding;
    const dismiss=()=>{guide.dismissed=true;queueMicrotask(closeFirst);};
    const words=p('起家城池：','Starting town: ')+placeName(capital)+p('。查看城中命令后，再开始推演。','. Review its orders before starting time.');
    first?.close();
    first=game.show({label:p('首月建议','First-month advice'),skin:palette,
      root:col([row([txt(app.paused?p('开局准备 · 已暂停','Prepare your campaign · Paused'):p('首月建议','Your first month'),42,{bold:true,color:0xe9bc82}),b('coach-dismiss',p('收起','Dismiss'),{width:76})]),
        col([note(words,3),note(p('先看钱粮月收支，再择一扩建农田或市场。','Check monthly coin and grain income, then improve a farm or market.'),3),
          note(p('查看本城武将；寻访、调任和出征都从城中命令开始。','Review local officers. Search, transfer and muster orders begin in a town.'),3),
          note(nanpi?p('南皮军议会显示能立即出战的部队和援军到达时间。','The Nanpi council displays forces and their arrival times.'):p('留足守军和粮食，查看盟约，再决定目地。','Keep a garrison and provisions; review treaties before choosing a destination.'),4),
          s.founding?.withdrawalTruceUntil?note(p('与原领主停战至','Withdrawal truce expires: ')+dayWords(s.founding.withdrawalTruceUntil),3):null,
          note(p('随时可暂停。PC：空格暂停／继续，H归城；手机：点顶部暂停。','Pause at any time. PC: Space pauses/resumes; H returns home. Phone: tap Pause.'),3)],{name:'coach-body',scroll:'vertical'}),
        row([b('coach-home',p('查看本城','Review town')),b('coach-start',p('开始推演','Start time'),{color:0x9b4b3c})])],
      {name:'coach-shell',card:true,anchor:'top-right',x:g.x,y:g.y,width:g.width,height:g.height,color:0x223834,border:{color:0xb69962,width:1},padding:5})},
      {paragraphCache:host.paragraphCache,bind:{'coach-shell':{pointerOnly:true,tapTargetOnly:true,tap:(_s,a)=>a?.stopPropagation()},
        'coach-dismiss':{label:()=>p('收起首月建议','Dismiss first-month advice'),tap:dismiss},'coach-home':{tap:()=>app.goHome()},'coach-start':{tap:()=>{dismiss();app.setPaused(false)}}}});
  }
  function refreshWait(wait){
    if(!wait||app.screen!=='play'||app.lab||app.dialogOpen){closeWaiting();return;}
    const arrived=arrivedArmies(app.state,wait.faction,wait.nodeId).map(r=>generalName(r.commander)||t('captain')),incoming=wait.incoming.map(r=>generalName(r.commander)||t('captain'));
    const time=Number.isFinite(wait.etaDays)&&wait.etaDays>0?p('约 ','About ')+num(wait.etaDays)+p(' 天会师',' days until rendezvous'):p('重新核对军情','Checking the siege');
    const status=p('南皮等援 · ','Nanpi reinforcements · ')+(app.paused?p('已暂停 · ','Paused · '):'')+time;
    const key=JSON.stringify([status,arrived,incoming,expanded,geometry(host,app)]);if(key===waitKey)return;waitKey=key;
    const g=geometry(host,app),names=a=>a.length?a.join(p('、',', ')):t('none');
    waiting?.close();waiting=game.show({label:status,skin:palette,
      root:col([b('wait-detail',status),expanded?note(p('已到阵 ','At the siege: ')+names(arrived),2):null,expanded?note(p('尚在途 ','On the way: ')+names(incoming),2):null,expanded?b('wait-cancel',p('取消等援','Stop waiting')):null],
        {name:'wait-shell',anchor:'top-right',width:g.width,height:expanded?Math.min(192,g.height):58,x:g.x,y:g.y,padding:6,card:true,color:0x223834,border:{color:0xb69962,width:1}})},
      {paragraphCache:host.paragraphCache,bind:{'wait-detail':{tap:()=>{expanded=!expanded;refreshWait(wait)}},'wait-cancel':{tap:()=>app.cancelSiegeSupport()}}});
  }
  const off=host.addLayout(()=>{firstKey='';waitKey='';refreshFirst()});
  const occlusionRects=()=>[[first,'coach-shell'],[waiting,'wait-shell']].flatMap(([view,name])=>{
    const rect=view?.visibleRect(name);if(!rect)return [];
    const p=game.fromStage(rect.x,rect.y);return [{x:p.x,y:p.y,width:rect.width,height:rect.height}];
  });
  return {refreshFirst,refreshWait,occlusionRects,get view(){return first;},get waiting(){return waiting;},dispose(){off();closeFirst();closeWaiting();}};
}