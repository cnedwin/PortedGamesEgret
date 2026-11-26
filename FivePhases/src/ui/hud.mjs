// 五行牌阵的原生界面。战斗规则只读；HUD 的状态和操作由入口提供。
// All visible controls and overlays share the Play game's own display list and semantic tree.
import { createParagraphCache } from '@egret/engine/paragraph';
import { createCanvasParagraphProvider } from '@egret/engine/web/paragraph';
import { ELEMENT_INFO, ELEMENT_ORDER } from '../core/cards.mjs';
import { ENERGY_CAP, STEPS_PER_TURN } from '../core/battle.mjs';
import { ENERGY_SLOTS, STAGE } from '../view/layout.mjs';

const C = {
  ink: 0x101918, jade: 0x172923, dark: 0x0e1917, edge: 0x7c694b,
  gold: 0xd8b782, ivory: 0xf6e7c9, dim: 0xbeb09a, red: 0xd76b4f,
  green: 0x75b485, redDeep: 0x963e2b, goldDeep: 0xa5804d, track: 0x39443f,
};
const SKIN = {
  text: C.ivory, panel: C.jade, panelAlpha: 0.96, button: 0x263a30, buttonText: C.ivory,
  disabled: 0x43504a, accent: C.gold, track: C.track, radius: 6, size: 25, dim: 0.68,
};
const ENCOUNTER = { shanjiao: '第一阵 · 守林', chijiao: '第二阵 · 断桥', hundun: '第三阵 · 阵眼' };
const BOND_LABELS = { swordShield: '剑盾同源', samadhi: '三昧', echo: '残响', chainBody: '连锁体质', starlane: '星轨' };
const FONTS = ['Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', 'sans-serif'];
const paragraph = (lineHeight, maxLines) => ({ fontFamilies: FONTS, locale: 'zh-CN', lineHeight, maxLines });
const clamp = n => Math.max(0, Math.min(1, Number(n) || 0));
const hex = s => Number.parseInt(s.slice(1), 16);
function tint(a, b, n) {
  return [16, 8, 0].reduce((sum, bit) => sum + (Math.round(((a >> bit) & 255) * (1 - n) + ((b >> bit) & 255) * n) << bit), 0);
}
const box = (x,y,width,height,children=[],style={}) => ({type:'panel',x,y,width,height,children,...style});
const word = (name,x,y,width,height,text,size=25,style={}) =>
  ({type:'text',...(name ? {name} : {}),x,y,width,height,text,size,...style});
const button = (name,x,y,width,height,text,size=28,style={}) =>
  ({type:'button',name,x,y,width,height,text,size,color:0x263a30,border:{color:C.edge,width:1.5},...style});
const line = (x,y,width,color=C.edge) => box(x,y,width,2,[],{color});
const root = children => box(0,0,STAGE.width,STAGE.height,children);
const panelName = (name,x,y,w,h,style={}) => box(x,y,w,h,[],{name,...style});
const health = (shown, max) => `${Math.max(0,Math.ceil(shown?.hp ?? 0))} / ${max ?? 0}`;
const hpRatio = (shown,max) => clamp((shown?.hp ?? 0) / (max || 1));
const cardDetail = card => `${card.cost} · ${ELEMENT_INFO[card.element].name}能量\n${card.text}`;
const cardColor = (card, ready) => tint(C.dark, hex(ELEMENT_INFO[card.element].deep), ready ? .57 : .25);

const emblem = (element,x,y,size) => ({type:'image',x,y,width:size,height:size,
  src:new URL('../../assets/art/ui/'+element+'.png',import.meta.url).href});
/** Rich native card: the tappable, focusable panel is the only action; its image,
 * fee badge and wrapped words are decorative children, not extra hit targets. */
function makeCard(card, name, x, y, width, height, { reward = false } = {}) {
  const info=ELEMENT_INFO[card.element], color=hex(info.color);
  const emblemSize=reward?68:42, badge=reward?42:29, titleY=reward?85:48;
  const titleH=reward?43:32, elemY=titleY+titleH, elemH=reward?31:23, bodyY=elemY+elemH;
  const bodyH=height-bodyY-5;
  return box(x,y,width,height,[
    box(4,4,width-8,height-8,[],{border:{color:tint(C.edge,color,.45),width:1}}),
    box(9,6,width-18,2,[],{color}),
    box(8,10,badge,badge,[],{color:0x121a18,border:{color:C.gold,width:1.5}}),
    word(null,8,10,badge,badge,String(card.cost),reward?26:20,{bold:true,align:'center',color:C.gold}),
    emblem(card.element,(width-emblemSize)/2,reward?13:8,emblemSize),
    word(null,5,titleY,width-10,titleH,card.name,reward?33:28,{bold:true,align:'center'}),
    word(null,5,elemY,width-10,elemH,info.name+' · 能量',reward?22:17,{color,align:'center'}),
    word(null,8,bodyY,width-16,bodyH,card.text,reward?24:19,{
      paragraph:paragraph(reward?28:21,reward?7:3),align:'left',color:C.ivory,
    }),
  ],{name,role:'button',label:card.name+' · '+cardDetail(card).replaceAll('\n',' · '),
      color:cardColor(card,reward),alpha:.99,border:{color:card.ult?C.gold:tint(C.edge,color,.45),width:card.ult?3:2}});
}
const guideLines = [
  ['消除','拖动或点选相邻两格。三个同色即可消除，四连出消行块，五连出彩虹块，L 形出炸弹。'],
  ['出牌','消除积攒对应元素的能量。能量足够时，点牌施放。'],
  ['步数','每次有效交换消耗一步。敌人倒计时归零时出手。'],
  ['相生','连续打出相生元素的牌，后一张牌的伤害增加 50%。'],
];

export function createHud({
  game, audio, onCard, onEndTurn, onStart, onReward, onSkip, onRestart, onToggleMute, onGuide,
}) {
  const provider = game.scope.use(createCanvasParagraphProvider({buildIdentity:'fivephases-system-cjk'}));
  const paragraphCache = game.scope.use(createParagraphCache(game.engine.assets,{
    provider,maxEntries:32,maxImageBytes:16*1024*1024,maxPendingJobs:24,
  }));
  const state = {
    battle:null,vitals:null,enemyStrike:null,resolving:false,hand:[],
    ready:false,progress:0,loadingLabel:'正在备阵…',
    bannerText:'',bannerLeft:0,chainText:'',chainLeft:0,
    cue:'',cueBoss:'',pulse:new Map(),
  };
  let active = 'loading', handSignature = '', handView = null, overlay = null, sub = null, subKind = null;
  let handActive = null;
  const floats = [], specs = new Map();

  function show(label, children, bindings={}, { modal=false, dim=SKIN.dim, initialFocus, dismiss, meta={}, gamepad=true }={}) {
    const description = {label,area:'screen',modal,skin:{...SKIN,dim},root:root(children)};
    const parts=[];
    function visit(part) {
      if(part.type==='button'||part.type==='toggle'||(part.type==='panel'&&bindings[part.name]?.tap))parts.push(part);
      (part.children??[]).forEach(visit);
    }
    visit(description.root);
    const options={state,bind:bindings,paragraphCache,gamepad,
      ...(initialFocus?{initialFocus}:{}),...(dismiss?{dismiss}:{})};
    const view=game.show(description,options);
    specs.set(view,{parts,bindings,meta});
    return view;
  }
  function close(view) {
    if (!view) return;
    specs.delete(view);
    view.close();
  }
  function releaseFloats() {
    for (const item of floats) game.remove(item.node);
    floats.length = 0;
  }
  function closeDetails() {
    const previous = sub;
    sub = null;
    subKind = null;
    close(previous);
  }
  function clearFeedback() {
    state.bannerLeft = state.chainLeft = 0;
    state.cue = '';
    state.pulse.clear();
    releaseFloats();
  }
  function hideCombat() {
    combat.hide();
    handView?.hide();
    syncHandAction();
    clearFeedback();
  }
  function opening(kind) {
    closeDetails();
    close(overlay);
    overlay = null;
    active = kind;
    hideCombat();
  }
  function muteControl() {
    return button('mute',630,27,88,88,'声音',24,{color:0x1b2c25,border:{color:C.gold,width:1.5}});
  }
  const muteBind = {text:() => audio?.muted ? '静音' : '声音',tap:() => onToggleMute?.()};
  const actionLocked = s => !s.battle || s.resolving || s.battle.phase !== 'player' || s.battle.over !== null;
  const currentEnemy = s => s.battle?.enemy;
  const shownEnemy = s => s.vitals?.enemy ?? s.battle?.enemy;
  const shownHero = s => s.vitals?.hero ?? s.battle?.hero;
  const stepCount = s => (s.enemyStrike ? s.vitals : s.battle)?.steps ?? 0;
  const turn = s => (s.enemyStrike ? s.vitals : s.battle)?.turn ?? 1;
  function intentOf(s) {
    const enemy = currentEnemy(s);
    if (!enemy || s.battle.over) return '';
    if (s.enemyStrike) return `${s.enemyStrike.name} ${s.enemyStrike.damage} · 出手中`;
    const next = enemy.moves[enemy.moveIndex % enemy.moves.length];
    return enemy.countdown <= 0 ? `${next.name} ${next.damage}` : `${enemy.countdown} 步后 ${next.name} ${next.damage}`;
  }
  function bonds(s, start, end) {return (s.battle?.bonds ?? []).slice(start,end).map(x => BOND_LABELS[x] ?? x).join(' · ');}

  const combatParts = [
    box(30,27,323,183,[],{color:C.ink,alpha:.9,border:{color:C.edge,width:1}}),
    word('encounter',48,31,288,41,'',22,{color:C.gold}),
    word('enemy-name',47,64,292,57,'',48,{bold:true}),
    {type:'bar',name:'enemy-hp',label:'首领气血',x:49,y:125,width:278,height:12,value:1,color:C.red},
    word('enemy-hp-text',48,138,288,31,'',24),
    word('enemy-shield',203,138,124,30,'',20,{color:C.gold,align:'right'}),
    word('enemy-intent',48,165,294,36,'',23,{color:C.gold,bold:true}),
    box(493,40,131,55,[],{color:C.dark,alpha:.94,border:{color:C.edge,width:1.5}}),
    word('turn',493,40,131,55,'',25,{align:'center'}),
    muteControl(),
    box(31,386,294,78,[],{color:C.jade,alpha:.93,border:{color:0x638a6d,width:1.5}}),
    word('hero-hp-text',44,389,265,36,'',25,{color:0xc5e5bd}),
    word('hero-shield',216,391,92,32,'',20,{color:C.gold,align:'right'}),
    {type:'bar',name:'hero-hp',label:'主角气血',x:46,y:433,width:263,height:12,value:1,color:C.green},
    word('energy-label',440,310,249,36,'五行能量',22,{align:'center',color:C.gold}),
    word('bond-a',345,570,376,30,'',20,{color:C.gold,align:'right'}),
    word('bond-b',345,601,376,28,'',20,{color:C.gold,align:'right'}),
    button('hand-details',31,563,255,90,'查看手牌',28,{color:0x23372b}),
    box(31,1530,688,90,[],{color:C.jade,alpha:.94,border:{color:C.edge,width:1}}),
    word('steps',43,1530,405,86,'',28,{bold:true,color:C.gold}),
    button('end-turn',472,1530,247,90,'结束回合',31,{color:C.goldDeep,textColor:0x241a12,border:{color:0xe6ca96,width:2}}),
    panelName('banner-panel',31,334,405,45,{color:C.dark,alpha:.94,border:{color:C.edge,width:1}}),
    word('banner',44,335,379,43,'',25,{color:C.gold,bold:true}),
    panelName('attack-cue-panel',31,223,420,70,{color:0x59261e,alpha:.94,border:{color:C.gold,width:2}}),
    word('attack-cue',45,224,392,68,'',27,{color:0xffde9d,bold:true}),
    panelName('chain-panel',226,1073,298,83,{color:C.dark,alpha:.9,border:{color:C.gold,width:2}}),
    word('chain',226,1073,298,83,'',39,{color:0xffdc8a,bold:true,align:'center'}),
  ];
  const combatBindings = {
    'encounter':{text:s=>ENCOUNTER[currentEnemy(s)?.id] ?? currentEnemy(s)?.title ?? ''},
    'enemy-name':{text:s=>currentEnemy(s)?.name ?? ''},
    'enemy-hp':{value:s=>hpRatio(shownEnemy(s),currentEnemy(s)?.maxHp)},
    'enemy-hp-text':{text:s=>health(shownEnemy(s),currentEnemy(s)?.maxHp)},
    'enemy-shield':{text:s=>shownEnemy(s)?.shield>0?`盾 ${Math.ceil(shownEnemy(s).shield)}`:'',visible:s=>shownEnemy(s)?.shield>0},
    'enemy-intent':{text:intentOf,color:s=>s.enemyStrike||currentEnemy(s)?.countdown<=0?0xffa274:C.gold},
    turn:{text:s=>`第 ${turn(s)} 回合`}, mute:muteBind,
    'hero-hp':{value:s=>hpRatio(shownHero(s),s.battle?.hero.maxHp)},
    'hero-hp-text':{text:s=>`气血 ${health(shownHero(s),s.battle?.hero.maxHp)}`},
    'hero-shield':{text:s=>shownHero(s)?.shield>0?`盾 ${Math.ceil(shownHero(s).shield)}`:'',visible:s=>shownHero(s)?.shield>0},
    'bond-a':{text:s=>bonds(s,0,3),visible:s=>Boolean(bonds(s,0,3))},
    'bond-b':{text:s=>bonds(s,3,6),visible:s=>Boolean(bonds(s,3,6))},
    'hand-details':{disabled:s=>!s.hand.length,tap:()=>openDetails()},
    steps:{text:s=>`剩余步数 ${'◆'.repeat(Math.max(0,Math.min(STEPS_PER_TURN,stepCount(s))))}${'◇'.repeat(Math.max(0,STEPS_PER_TURN-stepCount(s)))}`},
    'end-turn':{disabled:actionLocked,tap:()=>onEndTurn?.()},
    'banner-panel':{visible:s=>s.bannerLeft>0},
    banner:{text:s=>s.bannerText,visible:s=>s.bannerLeft>0},
    'attack-cue-panel':{visible:s=>Boolean(s.cue),color:s=>({shanjiao:0x593b26,chijiao:0x21456b,hundun:0x5c3e23})[s.cueBoss]??0x59261e},
    'attack-cue':{text:s=>s.cue,visible:s=>Boolean(s.cue)},
    'chain-panel':{visible:s=>s.chainLeft>0},
    chain:{text:s=>s.chainText,visible:s=>s.chainLeft>0},
  };
  for (const [i, element] of ELEMENT_ORDER.entries()) {
    const info = ELEMENT_INFO[element], pos = ENERGY_SLOTS[i];
    const x=pos.x-58,y=pos.y-29, bg='energy-bg-'+element,name='energy-'+element;
    combatParts.push(panelName(bg,x,y,116,62,{color:tint(C.dark,hex(info.deep),.3),border:{color:hex(info.deep),width:1.5}}),
      word(name,x,y,116,62,'',30,{align:'center',bold:true,color:hex(info.color)}));
    combatBindings[bg] = {color:s=>s.pulse.has(element)?tint(C.dark,hex(info.color),.55):
      tint(C.dark,hex(info.deep),(s.battle?.energy[element]??0)>=ENERGY_CAP?.85:.28)};
    combatBindings[name] = {text:s=>`${info.name} ${s.battle?.energy[element]??0}`,
      color:s=>(s.battle?.energy[element]??0)>=ENERGY_CAP?C.ivory:hex(info.color)};
  }
  const combat = show('战斗界面',combatParts,combatBindings);
  combat.hide();

  function syncHandAction() {
    if (!handView) return;
    const next = active==='battle' && !actionLocked(state);
    if (next===handActive) return;
    handActive=next;
    if (next) handView.activate(); else handView.deactivate();
  }

  function rebuildHand() {
    if (!state.hand.length) {
      close(handView);handView=null;handActive=null;return;
    }
    const width=130,height=169,gap=8,left=(STAGE.width-(state.hand.length*width+(state.hand.length-1)*gap))/2;
    const parts=[], bindings={}, meta={};
    state.hand.forEach((card,index)=>{
      const name='hand-'+card.uid;
      parts.push(makeCard(card,name,left+index*(width+gap),658,width,height));
      bindings[name]={color:s=>actionLocked(s)?cardColor(card,false):cardColor(card,(s.battle?.energy[card.element]??0)>=card.cost),
        tap:()=>{if(active==='battle' && !sub && !actionLocked(state))onCard?.(card.uid);}};
      meta[name]={uid:card.uid,card:{...card}};
    });
    if(handView){
      // The engine retains rows whose key and authored geometry remain unchanged.
      handView.replaceChildren('hand-collection',parts,bindings);
      specs.set(handView,{parts,bindings,meta});
    }else{
      handView=show('手牌',[box(0,0,STAGE.width,STAGE.height,parts,{name:'hand-collection',label:'当前手牌'})],bindings,{meta});
      handActive=null;
      if(active!=='battle')handView.hide();
    }
    syncHandAction();
  }

  function openDetails() {
    if (!state.hand.length || sub || active!=='battle') return;
    const height=180+state.hand.length*111;
    const top=Math.round((STAGE.height-height)/2);
    const pieces=[
      box(37,top,676,height,[],{color:C.jade,border:{color:C.gold,width:2}}),
      word(null,63,top+24,497,76,'当前手牌',38,{bold:true}),
      button('close',600,top+18,90,90,'×',45),
      line(62,top+112,626),
    ];
    state.hand.forEach((card,index)=>{
      const info=ELEMENT_INFO[card.element], y=top+121+index*111;
      pieces.push(emblem(card.element,65,y,46),
        word('detail-name-'+index,130,y,375,42,card.name,30,{bold:true}),
        word('detail-cost-'+index,477,y,209,42,`${card.cost} ${info.name}能量`,24,{color:C.gold,align:'right'}),
        word('detail-'+index,130,y+43,545,61,card.text,23,{paragraph:paragraph(27,3)}));
      if(index<state.hand.length-1) pieces.push(line(62,y+105,626));
    });
    subKind='details';
    sub = show('当前手牌',pieces,{close:{tap:closeDetails}},{modal:true,initialFocus:'close',dismiss:closeDetails});
  }
  function openGuide() {
    if (sub || active!=='title') return;
    onGuide?.();
    const pieces=[
      box(36,361,678,902,[],{color:C.jade,border:{color:C.gold,width:2}}),
      word(null,70,389,610,75,'阵法说明',47,{bold:true,align:'center'}),
      line(73,477,604),
    ];
    guideLines.forEach(([heading,body],i)=>{
      const y=505+i*153;
      pieces.push(word('guide-heading-'+i,71,y,608,38,heading,28,{color:C.gold,bold:true}),
        word('guide-body-'+i,71,y+41,608,90,body,27,{paragraph:paragraph(35,3)}));
    });
    pieces.push(button('close',235,1132,280,91,'返回',32,{color:C.goldDeep,textColor:0x241a12}));
    subKind='guide';
    sub = show('阵法说明',pieces,{close:{tap:closeDetails}},{modal:true,initialFocus:'close',dismiss:closeDetails});
  }
  function render(battle,{vitals=battle,resolving=false,enemyStrike=null}={}) {
    state.battle=battle;state.vitals=vitals;state.resolving=resolving;state.enemyStrike=enemyStrike;state.hand=battle.hand;
    const next=battle.hand.map(card=>card.uid+':'+card.cost).join('|');
    if(next!==handSignature){
      const reopen=subKind==='details';
      if(reopen)closeDetails();
      handSignature=next;rebuildHand();
      if(reopen)openDetails();
    }
    syncHandAction();
  }

  function hideOverlays() {
    closeDetails();close(overlay);overlay=null;active='battle';
    combat.show();handView?.show();syncHandAction();clearFeedback();
  }
  function showLoading(progress=0,label='正在备阵…') {
    state.ready=false;state.progress=clamp(progress>1?progress/100:progress);state.loadingLabel=String(label);
    if(active==='loading'&&overlay)return;
    opening('loading');
    overlay=show('正在加载',[
      box(42,1080,666,409,[],{color:C.dark,alpha:.97,border:{color:C.edge,width:2}}),
      word(null,68,1100,614,114,'五行牌阵',72,{bold:true,align:'center'}),
      word('loading-label',85,1233,580,70,'',31,{align:'center',color:C.gold}),
      {type:'bar',name:'loading-progress',label:'加载进度',x:108,y:1328,width:534,height:19,value:0,color:C.gold},
      word('loading-percent',85,1360,580,80,'0%',28,{align:'center'}),
    ],{'loading-label':{text:s=>s.loadingLabel},'loading-progress':{value:s=>s.progress},
      'loading-percent':{text:s=>Math.floor(s.progress*100)+'%'}},{modal:true,dim:0});
  }
  function showTitle() {
    opening('title');
    overlay=show('五行牌阵',[
      // The title artwork remains in the world layer; this view supplies only border and lower title sheet.
      box(16,16,718,1592,[],{border:{color:C.edge,width:1.5}}),
      box(18,1100,714,506,[],{color:C.dark,alpha:.94}),
      line(233,1120,42,C.gold),
      ...ELEMENT_ORDER.map((element,index)=>emblem(element,288+index*38,1101,37)),
      line(491,1120,42,C.gold),
      word(null,27,1147,696,116,'五行牌阵',88,{bold:true,align:'center'}),
      word(null,40,1262,670,55,'F I V E   P H A S E S',27,{color:C.gold,bold:true,align:'center'}),
      word(null,40,1311,670,59,'消除聚灵，出牌破阵。',30,{color:C.gold,align:'center'}),
      button('start',253,1378,244,88,'开阵',37,{color:C.redDeep,border:{color:0xdfa97e,width:2.5}}),
      button('guide',239,1481,272,88,'阵法说明',28),
      muteControl(),
    ],{start:{disabled:s=>!s.ready,text:s=>s.ready?'开阵':'正在备阵…',tap:()=>onStart?.()},
      guide:{tap:openGuide},mute:muteBind},{modal:true,dim:0,...(state.ready?{initialFocus:'start'}:{})});
  }
  function showReward({enemyName,heroHp,cards}) {
    opening('reward');
    const pieces=[
      box(36,392,678,852,[],{color:C.jade,border:{color:C.gold,width:2}}),
      word('reward-status',61,418,628,64,`${enemyName}已破　气血 ${heroHp}`,30,{color:C.gold,align:'center'}),
      word(null,60,482,630,94,'择一张牌',65,{align:'center',bold:true}),
      word('reward-explanation',60,582,630,55,'所选牌将加入下一阵的牌组。',27,{align:'center'}),
      line(64,650,622),
      button('skip-reward',196,1098,358,90,'不拿了，继续',31),muteControl(),
    ];
    const bindings={'skip-reward':{tap:()=>onSkip?.()},mute:muteBind},meta={};
    const width=192,gap=15,left=(STAGE.width-(cards.length*width+(cards.length-1)*gap))/2;
    cards.forEach((card,index)=>{
      const name='reward-'+index;
      pieces.push(makeCard(card,name,left+index*(width+gap),670,width,388,{reward:true}));
      bindings[name]={tap:()=>onReward?.(card.id,card)};
      meta[name]={card:{...card}};
    });
    overlay=show('择一张牌',pieces,bindings,{modal:true,meta,initialFocus:cards.length?'reward-0':'skip-reward'});
  }
  function showOver({result,index,enemyName,heroHp,bestChain}) {
    opening('over');
    const won=result==='win',detail=won?`三关全破，剩余气血 ${Math.round(heroHp)}，最高连锁 ${bestChain} 层。`:
      `倒在第 ${index+1} 关·${enemyName}，最高连锁 ${bestChain} 层。`;
    overlay=show(won?'三关皆破':'倒下了',[
      box(55,543,640,541,[],{color:C.jade,border:{color:won?C.gold:0xc57b55,width:2.5}}),
      word(null,75,589,600,75,won?'✦ 阵成 ✦':'阵破',35,{color:C.gold,align:'center'}),
      word(null,72,668,606,126,won?'三关皆破':'倒下了',70,{bold:true,align:'center'}),
      word('result-detail',92,813,566,117,detail,31,{align:'center',paragraph:paragraph(41,3)}),
      button('restart',200,956,350,97,'再来一局',36,{color:C.redDeep,border:{color:0xdfa97e,width:2}}),muteControl(),
    ],{restart:{tap:()=>onRestart?.()},mute:muteBind},{modal:true,initialFocus:'restart'});
  }
  function setReady(ready=true) {
    state.ready=Boolean(ready);
    if(state.ready)state.progress=1;
    overlay?.refresh();
  }
  function showError(reason,retry) {
    opening('error');
    const error=String(reason?.message??reason??'资源加载失败').slice(0,140);
    overlay=show('加载失败',[
      box(45,573,660,478,[],{color:C.jade,border:{color:C.gold,width:2}}),
      word(null,72,617,606,91,'备阵失败',48,{bold:true,align:'center'}),
      word('error-detail',89,729,572,151,error,28,{paragraph:paragraph(38,4)}),
      button('retry',205,923,340,90,'重新加载',32,{color:C.redDeep}),
    ],{retry:{tap:()=>retry?.()}},{modal:true,initialFocus:'retry',dim:0});
  }
  function floater(value,{x=STAGE.width/2,y=780,kind='damage',element=null}={}) {
    if(active!=='battle')return;
    const color=element?hex(ELEMENT_INFO[element].color):({damage:0xffc99a,heal:0x9de4a2,shield:0xf5d59d,info:C.ivory})[kind]??C.ivory;
    while(floats.length>=18)game.remove(floats.shift().node);
    const node=game.text(String(value),{x,y,size:kind==='info'?27:37,color,align:'center',bold:true});
    floats.push({node,y,left:1.05});
  }
  function tick(dt) {
    if(!Number.isFinite(dt)||dt<=0)return;
    state.bannerLeft=Math.max(0,state.bannerLeft-dt);
    state.chainLeft=Math.max(0,state.chainLeft-dt);
    for(const [key,time] of state.pulse)if(time<=dt)state.pulse.delete(key);else state.pulse.set(key,time-dt);
    for(let i=floats.length-1;i>=0;i--){
      const item=floats[i];item.left-=dt;
      if(item.left<=0){game.remove(item.node);floats.splice(i,1);continue;}
      item.node.y=item.y-(1.05-item.left)*67;
      item.node.alpha=clamp(item.left/.4);
    }
  }
  function visibleViews() {
    if(sub)return [sub];
    if(overlay)return [overlay];
    return [handView,combat].filter(Boolean);
  }
  function rect(name) {
    for(const view of visibleViews()){
      try {
        if(!view.shows(name))continue;
        const bounds=view.rect(name);
        const at=game.toStage(bounds.x,bounds.y);
        return {...bounds,x:at.x,y:at.y};
      }catch{ /* another active view may own the name */ }
    }
    return null;
  }
  function buttons() {
    return visibleViews().flatMap(view=>{
      const info=specs.get(view);
      return (info?.parts??[]).filter(part=>view.shows(part.name)).map(part=>{
        const binding=info.bindings[part.name],bounds=rect(part.name);
        return {name:part.name,rect:bounds,text:String(binding?.text?.(state)??part.text??part.label??part.name),
          disabled:part.type==='panel'&&part.name.startsWith('hand-')?actionLocked(state):Boolean(binding?.disabled?.(state)),...(info.meta[part.name]??{})};
      });
    });
  }

  return {
    render,resetHand:()=>{handSignature='';},closeDetails,
    floater,chain(count){if(count>=2){state.chainText=`连锁 ×${count}`;state.chainLeft=.9;}},
    banner(text,ms=1400){state.bannerText=String(text);state.bannerLeft=ms/1000;},
    pulse(element){state.pulse.set(element,.42);},
    attackCue(text,boss){state.cue=String(text);state.cueBoss=boss;},
    clearAttackCue(){state.cue='';},
    showLoading,showTitle,showReward,showOver,hideOverlays,setReady,showError,tick,rect,buttons,
    get active(){return active;},get modalOpen(){return sub!==null;},
    get views(){return {combat,hand:handView,overlay,sub};},
  };
}
