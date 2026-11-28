// The menu, settings, backpack and outcome surfaces are native Egret views.
// Gameplay state and browser input remain owned by main/input.
import { createUiScreenStack } from '@egret/engine/ui';
import { TEXT } from '../text.mjs';
import { BACKPACK, MISSION } from '../data.mjs';

const C = {
  ink: 0x101b21, panel: 0x15252c, border: 0x34534f, text: 0xe5eee8,
  mint: 0x5fe8b0, muted: 0xa2b7b3, amber: 0xf8ce73,
  button: 0x243b40, active: 0x396d60, danger: 0xef7268,
};
const RARITY = [0xcccccc,0xd8d8d8,0x5bd16a,0x4d9bff,0xb868ff,0xffbf33,0xff4d40];
const SKIN = { text:C.text,panel:C.panel,panelAlpha:.94,button:C.button,buttonText:C.text,
  disabled:0x344147,accent:C.mint,track:0x263a3f,radius:6,size:16,dim:.52 };
const WEAPONS = ['rifle','pistol','marksman'];
const RANGE = {
  sensitivity:{min:.3,max:3,step:.05},
  adsSensitivity:{min:.2,max:1.5,step:.01},
  fov:{min:60,max:95,step:1},
  volume:{min:0,max:1,step:.05}
};
const copy = state => TEXT[state.settings.lang] ?? TEXT.en;
const local = (state, zh, en) => state.settings.lang==='zh' ? zh : en;
const money = v => Math.round(v||0).toLocaleString('en-US');
const clock = seconds => {
  const n=Math.max(0,Math.floor(seconds||0));
  return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
};
const row=(children,height=48,extra={})=>({type:'panel',layout:'row',gap:8,height,children,...extra});
const column=(children,height='fill',extra={})=>({type:'panel',layout:'column',gap:8,height,children,...extra});
const text=(name, height=24, size=16,extra={})=>({type:'text',name,height,size,...extra});
const button=(name,extra={})=>({type:'button',name,text:' ',height:48,width:'fill',
  size:16,border:{color:C.border,width:1},...extra});
const scroll=(name,children)=>column(children,'fill',{name,scroll:'vertical',gap:8});
const spacer=(height=8)=>({type:'space',height});
const card=(name,children,width,height,extra={})=>({type:'panel',name,anchor:'center',card:true,
  color:C.ink,alpha:.94,border:{color:C.border,width:1},layout:'column',
  gap:8,padding:12,width,height,children,...extra});
const outer=card=>({type:'panel',width:'fill',height:'fill',children:[card]});
const titleText=(name)=>text(name,46,30,{bold:true,color:C.mint,align:'center'});
const section=(name)=>text(name,24,13,{color:C.muted,bold:true});
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const formatSetting=(key,v)=>key==='volume'? Math.round(v*100)+'%':key==='fov'?v+'°':Number(v).toFixed(2)+'×';

/** Small authored text lines, using the engine's native single-line labels.
 * Keep all words (no truncation); rows use generous widths in all variants. */
function lines(value, width, limit) {
  const parts=[];
  let line='';
  const source=String(value??'');
  for(const token of source.match(/\S+\s*|\s+/gu)??[]){
    // CJK sentences lack spaces; divide their native code points into lines.
    const chunks=/[\u2e80-\u9fff]/u.test(token)?[...token]:[token];
    for(const part of chunks){
      const measure=s=>[...s].reduce((n,c)=>n+(/[\u2e80-\uffff]/u.test(c)?2:1),0);
      if(line&&measure(line+part)>width){parts.push(line.trim());line='';}
      line+=part;
    }
  }
  if(line.trim())parts.push(line.trim());
  // All full authored strings fit the allocated rows. When the browser gives
  // an unexpectedly long diagnostic, keep its final text in the last row.
  if(parts.length>limit)parts.splice(limit-1,parts.length-limit+1,parts.slice(limit-1).join(' '));
  return Array.from({length:limit},(_,i)=>parts[i]??'');
}
function amountChange(settings,key,direction) {
  const {min,max,step}=RANGE[key];
  const previous=Number(settings[key]), base=Number.isFinite(previous)?previous:min;
  const n=Number(clamp(min+Math.round((base-min)/step+direction)*step,min,max).toFixed(2));
  if(n===previous)return false;
  settings[key]=n;return true;
}
function layoutLabel(state,key) { return String(copy(state)[key]??key); }

export function snapshotDead(game) {
  return {time:clock(game.t),terminals:game.terminalsDone+'/'+game.terminals.length};
}
export function snapshotDebrief(game) {
  const s=game.stats;
  return {rating:game.rating(),time:clock(game.t),accuracy:s.shots?Math.round(100*s.hits/s.shots)+'%':'—',
    kills:String(s.kills),headshots:String(s.headshots),total:money(game.lootValue),
    rows:[{key:'intel',count:game.terminalsDone,value:money(game.terminalsDone*MISSION.intelValue),rarity:4},
      ...[...game.loot].sort((a,b)=>b.value-a.value).map(item=>({key:item.key,value:money(item.value),rarity:item.rarity}))]};
}
export function snapshotBag(game) {
  const loot=[...game.loot].sort((a,b)=>b.value-a.value);
  return {count:game.loot.length,total:money(game.lootValue),current:game.player.weapon,
    rows:Array.from({length:BACKPACK},(_,i)=>loot[i]?{key:loot[i].key,value:money(loot[i].value),rarity:loot[i].rarity}:null),
    weapons:WEAPONS.map(key=>{const w=game.weapons[key];return {key,ammo:w.ammo,reserve:Number.isFinite(w.reserve)?String(w.reserve):'∞'};}),
    attachments:[...game.attachments],bandages:game.player.bandages,grenades:game.player.grenades,
    terminals:game.terminalsDone,intel:money(game.terminalsDone*MISSION.intelValue)};
}

export function buildMenuView(kind, state, actions) {
  const bind={};
  const t=(key)=>s=>layoutLabel(s,key);
  const tx=(name,get, height=24,size=16,extra={})=>{
    bind[name]={text:get};return text(name,height,size,extra);
  };
  const act=(name,get,callback,extra={},binding={})=>{
    bind[name]={text:get,tap:(s,activation)=>{actions.click?.();callback?.(s,activation);},...binding};
    return button(name,extra);
  };
  const rootLabel = () => {
    const labels={title:'title',pause:'paused',dead:'dead',debrief:'debrief',panel:'settings',
      bag:'bag',boot:'loading',error:'dead'};
    return kind==='error'?local(state,'載入失敗','Loading failed'):layoutLabel(state,labels[kind]);
  };
  const full=(name,hideTouch=false)=>act(name,s=>s.full.active?copy(s).exitFullscreen:copy(s).enterFullscreen,
    ()=>actions.toggleFullscreen(),{},{
      disabled:s=>s.full.busy||!s.full.available,...(hideTouch?{visible:s=>!s.touch}:{})
    });
  const fullNote=(name)=>wrapped(name,s=>s.full.failed?copy(s).fullscreenFailed:'',3,36,13,12,{color:C.amber});
  function wrapped(name,get,count,width,height=22,size=15,extra={}) {
    let previous, laidOut=[];
    const line=(s,i)=>{
      const current=get(s);
      if(current!==previous){previous=current;laidOut=lines(current,width,count);}
      return laidOut[i]??'';
    };
    return Array.from({length:count},(_,i)=>tx(name+i,s=>line(s,i),height,size,extra));
  }
  function header(label,key,extra={}) {return tx(label,t(key),36,26,{bold:true,color:C.mint,align:'center',...extra});}
  function pair(a,b){return row([a,b]);}
  function metric(name,label,value) {return column([tx(name+'Label',label,20,13,{color:C.muted,align:'center'}),
    tx(name+'Value',value,30,23,{bold:true,align:'center'})],54,{gap:2});}
  function title(variant) {
    // A dossier anchored to the left keeps the station view as the other
    // half of the title screen. On upright screens it becomes a center card.
    const compact=variant==='landscape', upright=variant==='portrait'||variant==='tabletPortrait',
      w=variant==='portrait'?'96%':variant==='tabletPortrait'?464:compact?420:440;
    const deploy=act('deploy',t('deploy'),()=>actions.deploy(),{color:C.active});
    const settings=act('settings',t('settings'),()=>actions.openPanel('settings'));
    const controls=act('controls',t('controls'),()=>actions.openPanel('controls'));
    const fullscreen=full('fullscreen',true);
    const eyebrow=tx('eyebrow',t('eyebrow'),18,13,{color:C.mint,bold:true});
    const place=tx('place',t('place'),18,13,{color:C.muted,align:upright?'left':'right'});
    const accents={type:'panel',width:'fill',height:3,color:C.mint,alpha:.9};
    const premise=wrapped('premise',t('premise'),4,44,compact?16:21,compact?14:16,{color:C.text});
    return outer(card('mainCard',[
      accents,
      ...(upright?[eyebrow,place]:[row([eyebrow,place],18)]),
      tx('title',t('title'),compact?40:53,compact?29:35,{bold:true,color:C.text,align:'left'}),
      ...premise,
      ...(compact?[pair(deploy,settings),pair(controls,fullscreen)]:[deploy,pair(settings,controls),fullscreen]),
      ...wrapped('note',t('note'),2,44,compact?14:18,12,{color:C.muted}),
      ...fullNote('fullscreenNote'),
    ],w,compact?344:variant==='portrait'?450:436,{
      anchor:upright?'center':'left',x:upright?0:compact?12:28,
      gap:compact?2:4,padding:compact?10:18,justify:'center',alpha:.92
    }));
  }
  function pause(variant) {
    const w=variant==='portrait'?'94%':variant==='tabletPortrait'?520:560;
    const resume=act('resume',s=>s.mouseStatus==='failed'?copy(s).retryPointerLock:copy(s).resume,
      ()=>actions.resume(),{color:C.active},{disabled:s=>s.mouseStatus==='waiting'});
    const drag=act('dragLook',t('dragLook'),()=>actions['drag-look'](),{}, {visible:s=>s.mouseStatus==='failed'});
    return outer(card('mainCard',[
      tx('sub',t('paused'),18,13,{color:C.amber,align:'center'}),
      header('headline','title'),
      ...wrapped('pointerNote',s=>copy(s).pointerLock[s.mouseStatus]??'',3,38,16,13,{align:'center',color:C.amber}),
      pair(resume,drag),
      pair(act('settings',t('settings'),()=>actions.openPanel('settings')),act('controls',t('controls'),()=>actions.openPanel('controls'))),
      pair(act('restart',t('restart'),()=>actions.restart()),full('fullscreen',true)),
      ...fullNote('fullscreenNote')
    ],w,variant==='portrait'?390:344,{gap:2,padding:8,justify:'center'}));
  }
  function dead(variant) {
    return outer(card('mainCard',[
      tx('sub',t('deadSub'),24,15,{color:C.danger,align:'center'}),
      header('headline','dead',{color:C.danger}),
      row([metric('time',t('survived'),s=>s.dead?.time??'00:00'),
        metric('count',t('terminals'),s=>s.dead?.terminals??'0/3')],60),
      pair(act('restart',t('retry'),()=>actions.restart(),{color:C.active}),
        act('settings',t('settings'),()=>actions.openPanel('settings')))
    ],variant==='portrait'?'94%':490,236,{gap:10}));
  }
  function debrief(variant) {
    const loot=Array.from({length:Math.max(1,state.debrief?.rows?.length??1)},(_,i)=>{
      const name='loot'+i;
      const a=tx(name+'Key',s=>{
        const item=s.debrief?.rows[i];
        return item?(item.key==='intel'?copy(s).intel+' ×'+item.count:copy(s).items[item.key]??item.label??item.key):'';
      },30,15);
      bind[a.name].color=s=>RARITY[s.debrief?.rows[i]?.rarity]??C.text;
      return row([a,tx(name+'Value',s=>s.debrief?.rows[i]?.value??'',30,15,{width:104,align:'right'})],32);
    });
    const m=[
      metric('time',t('time'),s=>s.debrief?.time??'00:00'),
      metric('accuracy',t('accuracy'),s=>s.debrief?.accuracy??'—'),
      metric('kills',t('kills'),s=>s.debrief?.kills??'0'),
      metric('headshots',t('headshots'),s=>s.debrief?.headshots??'0')
    ];
    const narrow=variant==='portrait';
    return outer(card('mainCard',[
      row([tx('sub',t('debriefSub'),20,14,{color:C.muted}),tx('ratingLabel',t('rating'),20,14,{width:70,align:'right'}),
        tx('rating',s=>s.debrief?.rating??'—',35,28,{color:C.mint,bold:true,width:48,align:'right'})],35),
      header('headline','debrief'),
      ...(narrow?[row(m.slice(0,2),54),row(m.slice(2),54)]:[row(m,54)]),
      tx('carried',t('carried'),19,13,{color:C.muted,bold:true}),
      scroll('lootList',loot),
      row([tx('totalLabel',t('total'),28,15),tx('total',s=>s.debrief?.total??'0',32,24,{bold:true,color:C.mint,align:'right'})],34),
      pair(act('restart',t('redeploy'),()=>actions.restart(),{color:C.active}),
        act('settings',t('settings'),()=>actions.openPanel('settings')))
    ],narrow?'96%':variant==='tabletPortrait'?580:640,'94%',{gap:5}));
  }
  function panel(variant) {
    const w=variant==='portrait'?'96%':variant==='tabletPortrait'?580:660;
    const tabs={
      type:'panel',role:'tablist',name:'tabs',label:local(state,'设置与操作说明','Settings and controls'),
      layout:'row',height:48,gap:6,children:['settings','controls'].map(key=>{
        const name=key+'Tab';
        return act(name,t(key),()=>actions.openPanel(key),{role:'tab'},{
          selected:s=>s.panel===key,color:s=>s.panel===key?C.active:C.button});
      })
    };
    const range=(key)=>{
      const n=key;
      const label=tx(n+'Label',t(n),22,14,{color:C.muted});
      function step(direction,suffix){
        const name=n+suffix;
        return act(name,()=>direction>0?'+':'−',s=>{
          if(amountChange(s.settings,key,direction))actions.changed?.(key);
        },{width:48},{
          label:s=>local(s, direction>0?'增加'+copy(s)[key]:'减少'+copy(s)[key],
            (direction>0?'Increase ':'Decrease ')+copy(s)[key]),
          disabled:s=>direction>0?s.settings[key]>=RANGE[key].max:s.settings[key]<=RANGE[key].min
        });
      }
      let result=column([label,row([step(-1,'Minus'),tx(n+'Value',s=>formatSetting(key,s.settings[key]),48,17,
        {align:'center',bold:true}),step(1,'Plus')])],76,{gap:4});
      if(n==='adsSensitivity'){
        // Hybrid touch/mouse devices may change their active input device
        // without rebuilding the menu. Keep the mouse-specific setting visible.
        result.name='desktopRange';
      }
      return result;
    };
    const select=(key,options,labels,label=t(key==='invertY'?'invert':key==='lang'?'language':key))=>{
      // Older saved choices have no explicit mouse or motion preference.
      const selected=s=>key==='invertY'?(s.settings[key]?'on':'off'):
        key==='mouseMode'?(s.settings[key]??'lock'):
        key==='reducedMotion'?(s.settings[key]??'system'):s.settings[key];
      const b=options.map(o=>act(key+(o[0].toUpperCase()+o.slice(1)),s=>labels(s,o),s=>{
        const value=key==='invertY'?o==='on':o;
        if(selected(s)===o)return;
        if(key==='lang') { actions.setLanguage(value);actions.changed?.(key); }
        else {s.settings[key]=value;actions.changed?.(key);}
      },{},{
        color:s=>selected(s)===o?C.active:C.button
      }));
      return column([tx(key+'Label',label,22,14,{color:C.muted}),row(b)],76,{gap:4});
    };
    const categories=[
      ['display','画面','Display'],['input','输入','Input'],['general','通用','General']
    ];
    const currentPage=s=>s.settingsPage??'display';
    const categoryTabs={type:'panel',role:'tablist',name:'settingsCategories',height:48,
      layout:'row',gap:6,children:categories.map(([key,zh,en])=>
        act('settings'+key[0].toUpperCase()+key.slice(1)+'Tab',s=>local(s,zh,en),
          s=>{s.settingsPage=key;},{role:'tab',size:15},
          {selected:s=>currentPage(s)===key,color:s=>currentPage(s)===key?C.active:C.button}))};
    const groups={
      display:[
        select('quality',['low','medium','high'],(s,o)=>copy(s).qualityNames[o]),
        range('fov'),
        select('reducedMotion',['system','reduce','normal'],(s,o)=>({
          system:local(s,'跟随系统','System'),reduce:local(s,'减少','Reduced'),normal:local(s,'正常','Normal')
        })[o],s=>local(s,'动效偏好','Motion preference')),
      ],
      input:[
        select('mouseMode',['lock','drag'],(s,o)=>o==='lock'?local(s,'锁定','Lock'):local(s,'拖动','Drag'),
          s=>local(s,'鼠标模式','Mouse mode')),
        range('sensitivity'),range('adsSensitivity'),
        select('invertY',['off','on'],(s,o)=>copy(s)[o]),
      ],
      general:[
        range('volume'),select('lang',['zh','en'],(_,o)=>o==='zh'?'中文':'English'),
        column([tx('fullscreenLabel',t('fullscreen'),22,14,{color:C.muted}),full('fullscreenPanel')],76,{gap:4}),
        column(fullNote('settingsFullscreenNote'),76,{gap:4})
      ]
    };
    // Each category has at most four groups. Landscape uses two columns;
    // portrait uses one, so no interactive selection is authored off screen.
    // Only the active category is painted or receives input.
    const narrow=variant==='portrait'||variant==='tabletPortrait';
    const categoryViews=Object.entries(groups).map(([key,children])=>{
      const name=key+'Page';bind[name]={visible:s=>currentPage(s)===key};
      const arranged=narrow?children:Array.from({length:Math.ceil(children.length/2)},(_,i)=>{
        const pair=children.slice(i*2,i*2+2);
        if(pair.length===1)pair.push({type:'space',width:'fill'});
        return row(pair,76,{gap:16});
      });
      return column(arranged,'fill',{name,gap:8});
    });
    const keyRows=copy(state).keys.map((_,i)=>row([
      tx('key'+i,s=>copy(s).keys[i][0],38,14,{width:variant==='portrait'?122:176,color:C.mint,bold:true}),
      tx('description'+i,s=>copy(s).keys[i][1],38,15)
    ],40));
    const padKeys=[
      ['L Stick','移动','Move'],['R Stick','转动视角','Look'],
      ['LT / RT','瞄准 · 开火','Aim · Fire'],['X','换弹','Reload'],
      ['A','跳跃','Jump'],['B','按住使用','Hold to use'],
      ['Y','手雷','Grenade'],['D-pad ↑','绷带','Bandage'],
      ['LB / RB','切换武器','Switch equipment'],
      ['L3 / R3','奔跑 · 蹲下','Sprint · Crouch'],
      ['Select','背包','Backpack'],['Start','暂停','Pause']
    ];
    const padRows=padKeys.map(([key,zh,en],i)=>row([
      tx('padKey'+i,()=>key,36,14,{width:variant==='portrait'?122:176,color:C.mint,bold:true}),
      tx('padDesc'+i,s=>local(s,zh,en),36,15)
    ],38));
    const helpRows=[
      tx('keyboardHeader',s=>local(s,'键盘与鼠标','Keyboard and mouse'),28,16,{bold:true,color:C.mint}),
      ...keyRows,
      tx('touchHeader',s=>local(s,'触屏','Touchscreen'),28,16,{bold:true,color:C.mint}),
      ...wrapped('touchHelp',t('touchHelp'),4,38,20,14),
      tx('padHeader',s=>local(s,'手柄','Gamepad'),28,16,{bold:true,color:C.mint}),
      ...padRows,
      ...wrapped('padHelp',s=>local(s,'菜单：Tab / Shift+Tab 或手柄方向键选项；Enter / Space 或 A 确认；Esc / B 返回。',
        'Menus: Tab / Shift+Tab or gamepad D-pad; Enter / Space or A selects; Esc / B returns.'),4,38,20,13,{color:C.muted})
    ];
    const settingsPane=column([categoryTabs,{type:'panel',height:'fill',width:'fill',children:categoryViews}],
      'fill',{name:'settingsList',gap:10});
    const controlsPane=scroll('controlsList',helpRows);
    bind.settingsList={visible:s=>s.panel==='settings'};
    bind.controlsList={visible:s=>s.panel==='controls'};
    const body={type:'panel',height:'fill',width:'fill',children:[settingsPane,controlsPane]};
    return outer(card('panelCard',[
      row([tabs,act('close',t('close'),()=>actions.closePanel(),{width:92})]),
      body
    ],w,'94%',{gap:10}));
  }
  function bag(variant) {
    const w=variant==='portrait'?'96%':variant==='tabletPortrait'?580:680;
    const bagRows=Array.from({length:BACKPACK},(_,i)=>{
      const name='bagItem'+i, item=tx(name,s=>{
        const v=s.bag?.rows[i];return v?copy(s).items[v.key]??v.key:'·';
      },16,12);
      bind[name].color=s=>RARITY[s.bag?.rows[i]?.rarity]??C.muted;
      return column([
        row([tx(name+'No',()=>String(i+1).padStart(2,'0'),16,10,{width:20,color:C.muted}),item],16,{gap:2}),
        tx(name+'Value',s=>s.bag?.rows[i]?.value??'',13,11,{align:'right',color:C.muted})
      ],35,{gap:0,padding:2,card:true,color:0x203139,border:{color:C.border,width:1}});
    });
    const guns=WEAPONS.map((key,i)=>{
      const label=s=>{
        const w=s.bag?.weapons[i];
        return (i+1)+'  '+copy(s).weapons[key]+'  '+(w?.ammo??'–')+' / '+(w?.reserve??'–');
      };
      return act('bagWeapon'+i,label,()=>{actions.selectWeapon?.(key);actions.closeBag();},{size:13},{
        disabled:s=>!s.bag,
        label:s=>copy(s).weapons[key],
        color:s=>s.bag?.current===key?C.active:C.button
      });
    });
    const attachments=[
      tx('fitted',t('fitted'),20,13,{color:C.muted}),
      tx('attachmentA',s=>{const v=s.bag?.attachments?.[0];return v?copy(s).items[v]:copy(s).none;},25,14),
      tx('attachmentB',s=>{const v=s.bag?.attachments?.[1];return v?copy(s).items[v]:'';},25,14),
    ];
    const supplies=[
      tx('supplies',t('supplies'),20,13,{color:C.muted}),
      tx('bandages',s=>copy(s).items.bandage+' ×'+(s.bag?.bandages??0),25,14),
      tx('grenades',s=>copy(s).items.grenade+' ×'+(s.bag?.grenades??0),25,14),
      tx('intel',s=>copy(s).intel+' ×'+(s.bag?.terminals??0)+' ('+(s.bag?.intel??'0')+')',25,14)
    ];
    const tab=s=>s.bagTab??'weapons';
    const gearTabs={type:'panel',role:'tablist',name:'bagTabs',height:48,layout:'row',gap:5,
      children:[['weapons','武器','Weapons'],['attachments','配件','Attachments'],['supplies','补给','Supplies']]
        .map(([key,zh,en])=>act('bag'+key[0].toUpperCase()+key.slice(1)+'Tab',s=>local(s,zh,en),
          s=>{s.bagTab=key;},{role:'tab',size:13},
          {selected:s=>tab(s)===key,color:s=>tab(s)===key?C.active:C.button}))};
    const gearPages=Object.entries({weapons:guns,attachments,supplies}).map(([key,children])=>{
      const name='bag'+key[0].toUpperCase()+key.slice(1)+'Page';
      bind[name]={visible:s=>tab(s)===key};
      return column(children,'fill',{name,gap:5});
    });
    const narrow=variant==='portrait'||variant==='tabletPortrait';
    const itemGrid=column(Array.from({length:6},(_,i)=>row(bagRows.slice(i*2,i*2+2),35,{gap:4})),
      narrow?230:'fill',{name:'bagItems',gap:4});
    const gear=column([gearTabs,{type:'panel',height:'fill',width:'fill',children:gearPages}],
      'fill',{name:'bagGear',gap:8});
    const contents=narrow?column([itemGrid,gear],'fill',{name:'bagBody',gap:8})
      :row([itemGrid,gear],'fill',{name:'bagBody',gap:12});
    const body=card('bagCard',[
      row([tx('headline',t('bag'),36,24,{bold:true,color:C.mint}),
        tx('count',s=>(s.bag?.count??0)+' / '+BACKPACK,34,14,{width:84,align:'center'}),
        act('closeBag',t('close'),()=>actions.closeBag(),{width:94})]),
      row([tx('bagValue',s=>'◈ '+(s.bag?.total??'0'),24,18,{color:C.mint,bold:true}),
        tx('bagHint',s=>!s.touch?copy(s).bagHint:'',24,13,{align:'right',color:C.muted})],25),
      contents
    ],w,'94%',{gap:5});
    return outer(body);
  }
  function boot(variant) {
    return outer(card('mainCard',[
      header('headline','title'),tx('loading',s=>s.boot?.message??copy(s).loading,36,16,{align:'center'}),
      {type:'bar',name:'loadProgress',height:14,label:local(state,'载入进度','Loading progress'),color:C.mint},
      tx('loadCount',s=>s.boot?.total?(s.boot.loaded??0)+' / '+s.boot.total:'',26,15,{align:'center',color:C.muted})
    ],variant==='portrait'?'94%':500,170,{gap:10}));
  }
  function error(variant) {
    return outer(card('mainCard',[
      tx('headline',s=>local(s,'载入失败','Loading failed'),36,25,{bold:true,color:C.danger,align:'center'}),
      ...wrapped('errorText',s=>s.error??'',5,38,19,14,{align:'center'}),
      act('reload',s=>local(s,'重新加载','Reload'),()=>actions.reload(),{color:C.active})
    ],variant==='portrait'?'94%':520,260,{gap:8}));
  }

  const builder={title,pause,dead,debrief,panel,bag,boot,error}[kind];
  if(!builder)throw new TypeError('Unknown FPS menu kind '+kind);
  const description={label:rootLabel(),area:'safe',modal:true,skin:kind==='title'?{...SKIN,dim:.18}:kind==='bag'?{...SKIN,dim:.26}:SKIN,
    root:builder('landscape'),portrait:builder('portrait'),tablet:builder('tablet'),tabletPortrait:builder('tabletPortrait')};
  // Structural groups with stable code names must still have meaningful,
  // localized accessible names. Their identifiers are not player-facing copy.
  const labels={
    title:{mainCard:['行动概要','Operation overview']},
    pause:{mainCard:['暂停选项','Pause options']},
    dead:{mainCard:['结果摘要','Result summary']},
    debrief:{mainCard:['任务简报','Mission debrief'],lootList:['带出物资','Carried items']},
    panel:{panelCard:['设置与操作说明','Settings and controls'],tabs:['设置分页','Preference tabs'],
      settingsList:['设置项目','Preferences'],controlsList:['操作列表','Control list'],
      settingsCategories:['设置分类','Preference categories'],displayPage:['画面设置','Display preferences'],
      inputPage:['输入设置','Input preferences'],generalPage:['通用设置','General preferences'],
      desktopRange:['鼠标瞄准倍率设置','Mouse aim setting']},
    bag:{bagCard:['背包内容','Backpack contents'],bagBody:['物品与装备','Items and equipment'],
      bagItems:['物品栏','Items'],bagGear:['装备与补给','Equipment and supplies'],
      bagTabs:['装备分类','Equipment categories'],bagWeaponsPage:['武器选择','Weapon choices'],
      bagAttachmentsPage:['已安装配件','Fitted attachments'],bagSuppliesPage:['随身补给','Carried supplies']},
    boot:{mainCard:['载入进度','Loading progress']},
    error:{mainCard:['恢复操作','Recovery options']}
  }[kind];
  for(const [name,[zh,en]] of Object.entries(labels))bind[name]={...bind[name],label:s=>local(s,zh,en)};
  if(kind==='boot')bind.loadProgress={value:s=>s.boot?.total?clamp((s.boot.loaded??0)/s.boot.total,0,1):0};
  return {description,bind};
}

/** Each UI surface is opened/closed by the native screen stack, not by a
 * browser element. No callback that requires a browser gesture is queued:
 * only the later screen-stack lifecycle is serialized. */
export function createMenus(play, gameArea, settings, actions) {
  const doc=gameArea.ownerDocument ?? globalThis.document;
  const state={mode:'title',settings,panel:null,settingsPage:'display',bagTab:'weapons',mouseStatus:null,touch:false,dead:null,debrief:null,bag:null,
    boot:null,error:null,full:{available:false,active:false,busy:false,failed:false}};
  let closed=false,bagOpen=false,queue=Promise.resolve(),lastBagKey='',lastFullKey='',views=new Map(),locale=settings.lang,restorePending;
  const stack=createUiScreenStack({onError:error=>actions.onError?.(error)});
  const nativeActions={...actions,openPanel,closePanel,toggleFullscreen,setLanguage,closeBag:requestCloseBag,
    reload:actions.reload??(()=>doc.defaultView?.location.reload())};
  const definitions=new Map();
  const sync=()=>{ for(const view of views.values())view.refresh?.(); };
  const cancelContacts=()=>play.browser?.pointer?.cancelAll?.('suspended');
  const report=error=>actions.onError?.(error);
  function next(task) {
    queue=queue.then(()=>{if(!closed)return task();}).catch(report);
    return queue;
  }
  function definition(kind,layer) {
    if(definitions.has(kind))return definitions.get(kind);
    const def={id:'fps-'+kind,layer,back:kind==='panel'||kind==='bag'?'close':'none',open(){
      cancelContacts();
      const {description,bind}=buildMenuView(kind,state,nativeActions);
      const options={state,bind,
        ...(['title','pause','dead','debrief','panel','bag','error'].includes(kind)?{initialFocus:
          ({title:'deploy',pause:'resume',dead:'restart',debrief:'restart',panel:state.panel==='controls'?'controlsTab':'settingsTab',bag:'bagWeaponsTab',error:'reload'})[kind]}:{}),
        ...(kind==='panel'?{dismiss:closePanel}:kind==='bag'?{dismiss:requestCloseBag}:{}),
        ...(kind==='pause'?{resume:()=>{if(state.mouseStatus!=='waiting')actions.resume();}}:{})
      };
      const view=play.show(description,options);
      views.set(kind,view);
      return {show:()=>view.show(),hide:()=>view.hide(),cover:()=>view.hide(),
        reveal:()=>view.show(),activate:()=>view.activate?.(),deactivate:()=>view.deactivate?.(),
        close:()=>{views.delete(kind);view.close();}};
    }};
    definitions.set(kind,def);return def;
  }
  const open=(kind,layer)=>{
    const promise=stack.open(definition(kind,layer));
    void promise.catch(report);
  };
  async function rebuild({restore}={}) {
    cancelContacts();
    await stack.closeAll();
    if(closed)return;
    if(state.error)open('error','page');
    else if(state.boot)open('boot','page');
    else {
      if(state.mode!=='none')open(state.mode,'page');
      if(state.panel)open('panel','modal');
      if(bagOpen&&state.mode==='none')open('bag','popup');
    }
    if(restore)restorePending=restore;
  }
  // Native stack activation means the rebuilt view can safely restore its
  // previous eligible focus and scroll offset.
  const stopObserve=stack.onChange(snapshot=>{
    if(!restorePending||snapshot.active!=='fps-'+restorePending.kind)return;
    const restore=restorePending;restorePending=undefined;
    const view=views.get(restore.kind);
    if(!view)return;
    if(restore.scroll) {
      try{view.scroll(restore.scroll.name).scrollTo(restore.scroll.offset);}catch{/* Different active variant. */}
    }
    if(restore.name)view.focus(restore.name);
  });
  function show(mode) {
    if(!['title','pause','dead','debrief','none'].includes(mode))throw new TypeError('Invalid FPS menu mode '+mode);
    state.mode=mode;state.panel=null;bagOpen=false;state.boot=null;state.error=null;
    lastBagKey='';next(()=>rebuild());
  }
  function openPanel(tab) {
    if(tab==='settings'||tab==='controls') {
      const already=Boolean(state.panel);state.panel=tab;
      if(!already)state.settingsPage='display';
      if(already){sync();return;}
      next(()=>{if(state.panel)open('panel','modal');});
    }
  }
  function closePanel() {
    if(!state.panel)return false;
    state.panel=null;next(()=>{cancelContacts();return stack.close(definition('panel','modal'));});
    return true;
  }
  function toggleBag(on=!bagOpen) {
    on=Boolean(on)&&state.mode==='none';
    if(on===bagOpen)return bagOpen;
    bagOpen=on;lastBagKey='';
    if(on)state.bagTab='weapons';
    if(on)next(()=>{if(bagOpen)open('bag','popup');});
    else next(()=>{cancelContacts();return stack.close(definition('bag','popup'));});
    return bagOpen;
  }
  function requestCloseBag(){
    if(!bagOpen)return false;
    // A desktop close may reacquire native pointer lock in this same trusted
    // button activation; the game owns that browser lifecycle.
    if(actions.requestCloseBag)actions.requestCloseBag();
    else if(actions.closeBag)actions.closeBag();
    else toggleBag(false);
    return true;
  }
  function updateBag(game) {
    if(!bagOpen||!game)return;
    const player=game.player,key=[game.loot.length,game.lootValue,game.terminalsDone,
      player.weapon,player.bandages,player.grenades,...game.attachments,
      ...WEAPONS.flatMap(name=>[game.weapons[name].ammo,game.weapons[name].reserve])].join('|');
    if(key!==lastBagKey){lastBagKey=key;state.bag=snapshotBag(game);views.get('bag')?.refresh();}
  }
  function setLanguage(lang) {
    if(lang!=='zh'&&lang!=='en')return;
    if(locale===lang&&settings.lang===lang)return;
    const kind=state.panel?'panel':bagOpen?'bag':state.mode,current=views.get(kind);
    const restore={kind,name:current?.focused};
    if(kind==='panel'||kind==='bag'||kind==='debrief'){
      const candidates=kind==='panel'&&state.panel==='controls'?['controlsList']:
        kind==='debrief'?['lootList']:[];
      for(const name of candidates)try{
        const scroll=current?.scroll?.(name);
        if(scroll){restore.scroll={name,offset:scroll.offset};break;}
      }catch{/* The other orientation owns the scroll. */}
    }
    settings.lang=lang;locale=lang;next(()=>rebuild({restore}));
  }
  function updateFullscreen() {
    state.full.active=doc.fullscreenElement===gameArea;
    state.full.available=Boolean(doc.fullscreenEnabled&&gameArea.requestFullscreen&&doc.exitFullscreen);
    const key=JSON.stringify(state.full);
    if(key!==lastFullKey){lastFullKey=key;sync();}
  }
  const changeFullscreen=()=>{state.full.failed=false;updateFullscreen();};
  doc.addEventListener('fullscreenchange',changeFullscreen);
  updateFullscreen();
  function toggleFullscreen() {
    if(state.full.busy||!state.full.available)return;
    state.full.busy=true;state.full.failed=false;updateFullscreen();
    // Call inside the tap, before any await or queued screen change.
    let request;
    try{request=state.full.active?doc.exitFullscreen():gameArea.requestFullscreen();}
    catch {state.full.failed=true;state.full.busy=false;updateFullscreen();return;}
    void Promise.resolve(request).catch(()=>{state.full.failed=true;})
      .finally(()=>{state.full.busy=false;updateFullscreen();});
  }
  return {
    show,setMouseStatus(reason){state.mouseStatus=reason??null;views.get('pause')?.refresh();},
    setDead(game){state.dead=snapshotDead(game);views.get('dead')?.refresh();},
    setDebrief(game){state.debrief=snapshotDebrief(game);views.get('debrief')?.refresh();},
    toggleBag,updateBag,setLanguage,
    setTouch(on){if(state.touch!==Boolean(on)){state.touch=Boolean(on);sync();}},
    get bagOpen(){return bagOpen;},
    handleBack(){if(closePanel())return true;return requestCloseBag();},
    setBoot({message,loaded=0,total=0}){const was=Boolean(state.boot);state.boot={message,loaded,total};
      if(was)views.get('boot')?.refresh();else next(()=>rebuild());},
    hideBoot(){if(state.boot){state.boot=null;next(()=>rebuild());}},
    setError(message){state.error=String(message);state.boot=null;next(()=>rebuild());},
    snapshot(){return {mode:state.mode,panel:state.panel,settingsPage:state.settingsPage,bagTab:state.bagTab,mouseStatus:state.mouseStatus,bagOpen,
      boot:Boolean(state.boot),error:state.error,fullscreen:{...state.full},screens:stack.snapshot()};},
    async dispose(){if(closed)return;closed=true;doc.removeEventListener('fullscreenchange',changeFullscreen);
      cancelContacts();stopObserve();await stack.dispose();},
  };
}
