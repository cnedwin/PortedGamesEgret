import { palette as C, skin } from './theme.mjs';

const text=(name,size,extra={})=>({type:'text',name,text:'',width:'fill',height:size+8,size,color:C.cream,align:'left',...extra});
const card=(name,children,extra={})=>({type:'panel',name,width:'fill',height:76,layout:'column',padding:7,gap:2,color:C.night,alpha:.91,border:{color:C.line,width:1},children,...extra});
const layout=(upright,tablet=false)=>({type:'panel',width:'fill',height:'fill',children:[
 card('scene-card',[text('scene-location',tablet?20:16,{bold:true,color:C.gold,height:tablet?25:20}),text('coordinates',tablet?17:14,{color:C.muted,height:tablet?22:18})],{anchor:'top-left',x:7,y:7,width:upright?'70%':tablet?245:200,height:tablet?56:47,padding:4,gap:1}),
 card('notice-card',[text('scene-notice',20,{align:'center'})],{anchor:'top',y:85,width:upright?'94%':'80%',height:48,padding:5}),
 // Instruction and event marker remain one compact safe-area strip.
 card('context-card',[text('scene-hint',18),text('scene-event',16,{color:C.gold})],{anchor:'bottom',y:8,width:upright?'94%':'82%',height:62,padding:5})
]});
const staticUi = Object.freeze({
 "點選移動、武學或其他回合指令":"Choose movement, skill or another command",
 "選擇移動、武學或其他指令 · 滑鼠選格，或用方向鍵與 Enter":"Choose a command · point or use arrow keys and Enter",
 "這格不在可選範圍 · 請選高亮格":"Outside range · select a highlighted tile",
 "點高亮格選擇 · 預覽後點「確定」":"Tap a highlighted tile, then Confirm",
 "點選高亮格子 · 方向鍵選格 · Enter 確認 · Esc 取消":"Select a highlighted tile · Enter confirms · Esc cancels",
 "自動戰鬥中 · 再點「自動」恢復手動":"Automatic · tap Auto to resume manual play",
 "自動戰鬥中 · Tab 恢復手動":"Automatic · Tab resumes manual play",
 "等待行動完成":"Waiting for the action to complete",
 '江湖大地图':'World map', '江湖大地圖':'World map',
 '劇情完成 · 在江湖選單可返回主選單':'Story complete · return through the travel menu',
 '黑帝斯 · 點「對話」可開始試煉':'黑帝斯 · Tap Talk to begin training',
 '黑帝斯 · 按 Enter 開始試煉':'黑帝斯 · Enter to begin training',
 '面向黑帝斯，對話可開始試煉':'Face 黑帝斯 and talk to begin training',
 '點「對話」與面前人物交談':'Tap Talk to speak', 'Enter / 空格與 NPC 對話':'Enter / Space to talk',
 '已到达原作出口':'Reached the exit', '點選地圖尋路，或使用方向鍵移動':'Tap terrain or use arrow keys to travel',
 '點擊「繼續」或按 Enter / 空格':'Tap Continue or press Enter / Space',
 '選擇是否邀請加入':'Decide whether to invite the companion', '選擇藥品或暗器':'Choose an item',
 '原作動畫播放中':'Animation playing', '正在寫入自動存檔…':'Saving progress…',
 '正在讀取原作戰場與人物動畫…':'Loading battlefield and character animation…',
 '正在读取原作地图与贴图…':'Loading map and textures…', '正在切换原作场景…':'Changing scene…',
 '正在载入原作地形、建筑和人物贴图…':'Loading terrain, buildings and character art…',
 '經典回合制':'Classic turn-based combat', '點選隊友，再點「確定出戰」':'Select companions and confirm team',
 '選擇出戰隊友 · O 確認':'Select companions · O confirms',
});
export function mapHudWords(name,source,language){
 if(language!=='en')return source;
 if(staticUi[source])return staticUi[source];
 if(name==='coordinates')return source.replace(/^格[點点]\s*/u,'Tile ').replace(/^第 (\d+) 回合 · 剩餘敵人 (\d+\/\d+)/u,'Round $1 · Remaining enemies $2').replace(' · 自動戰鬥',' · Auto');
 if(name==='notice')return source.replace(/^正在載入(.+)的 3D 場景…$/u,'Loading $1 in 3D…').replace(/^遊戲暫停 · /u,'Game paused · ');
 if(name==='hint')return source.replace(/^無法通行 · /u,'Blocked · ').replace(/^點畫面或按繼續 · /u,'Tap or press Continue · ').replace(/^點擊畫面 \/ Enter 繼續 · /u,'Tap or Enter to continue · ');
 if(name==='marker')return source.replace(/^事件 (\d+) 暫停$/u,'Event $1 paused').replace(/^经过事件 (\d+)$/u,'Event $1');
 return source;
}
export function createMapHud(game,{signal,language=()=> 'zh',initial={}}={}) {
 let closed=false,view,covered=false,battleMode=false;
 const fields={};
 const update=()=>{if(!closed&&view){view.refresh();game.invalidate?.();}};
 function slot(name,defaultHidden=false){
  let value=String(initial[name]?.textContent??initial[name]??'');
  let hidden=initial[name]?.hidden??defaultHidden;
  return Object.freeze({get textContent(){return value},set textContent(next){const s=String(next??'');if(s!==value){value=s;update()}},get hidden(){return hidden},set hidden(next){const v=Boolean(next);if(v!==hidden){hidden=v;update()}}});
 }
 for(const name of ['sceneName','coordinates','hint','notice','marker'])fields[name]=slot(name,name==='notice'&&initial.notice===undefined);
 const shown=name=>()=>!fields[name].hidden&&Boolean(fields[name].textContent);
 const words=(name)=>()=>{
  const source=fields[name].textContent;
  // Dynamic source names and narrative are never translated by the UI layer.
  return mapHudWords(name,source,language());
 };
 const bind={
  'scene-card':{visible:()=>!battleMode&&(shown('sceneName')()||shown('coordinates')())},
  'scene-location':{visible:shown('sceneName'),text:words('sceneName')},coordinates:{visible:shown('coordinates'),text:words('coordinates')},
  'notice-card':{visible:shown('notice')},'scene-notice':{text:words('notice')},
  'context-card':{visible:()=>!battleMode&&!covered&&(shown('hint')()||shown('marker')())},'scene-hint':{visible:shown('hint'),text:words('hint')},'scene-event':{visible:shown('marker'),text:words('marker')}
 };
 view=game.show({label:'Travel status',area:'safe',skin,root:layout(false),portrait:layout(true),tablet:layout(false,true),tabletPortrait:layout(true,true)},{bind});
 const close=()=>{if(!closed){closed=true;view.close();signal?.removeEventListener('abort',close);}};
 if(signal?.aborted)close();else signal?.addEventListener('abort',close,{once:true});
 return Object.freeze({...fields,close,refresh:update,setBattleMode(value){const next=Boolean(value);if(next!==battleMode){battleMode=next;update();}},setCovered(value){const next=Boolean(value);if(next!==covered){covered=next;update();}}});
}
