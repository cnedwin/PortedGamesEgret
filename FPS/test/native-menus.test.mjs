import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../vendor/node-register.mjs';
const {checkView,planView}=await import('@egret/engine/web/view');
const moduleUrl=new URL('../src/ui/menus.mjs',import.meta.url);
const menus=()=>import(moduleUrl);
const settings=()=>({quality:'high',sensitivity:1,adsSensitivity:.62,invertY:false,volume:.8,fov:74,lang:'zh'});
const states=['title','pause','dead','debrief','panel','bag','boot','error'];
const cases=[
  ['narrow',409,728,'portrait','phone',44/48],
  ['shortWide',824,354,'landscape','phone',44/48],
  ['notchWide',800,429,'landscape','phone',44/48],
  ['tablet',960,720,'landscape','tablet',1.066],
  ['tabletPortrait',614,819,'portrait','tablet',1.25],
  ['desktop',1536,864,'landscape','tablet',1.25]
];
const defaultState=()=>({mode:'title',settings:settings(),panel:'settings',mouseStatus:null,touch:false,
  dead:{time:'04:10',terminals:'1/3'},debrief:{rating:'A',time:'06:16',accuracy:'31%',kills:'8',headshots:'3',
    rows:[{label:'intel',value:'1000',rarity:4}],total:'1000'},bag:null,boot:{message:'Loading',loaded:5,total:10},
  error:'Network failed',full:{available:true,active:false,busy:false,failed:false}});
const nop=()=>{};
const actions={deploy:nop,resume:nop,restart:nop,openPanel:nop,closePanel:nop,selectWeapon:nop,closeBag:nop,
  'drag-look':nop,changed:nop,click:nop,toggleFullscreen:nop,reload:nop};
test('all menu layouts are validated native view data, with complete stable named variants',async()=>{
  const {buildMenuView}=await menus(),s=defaultState();
  for(const lang of ['zh','en']){
    s.settings.lang=lang;
    for(const kind of states){
      const {description,bind}=buildMenuView(kind,s,actions);
      const names=checkView(description);
      assert.ok(names.size,kind);
      for(const name of Object.keys(bind))assert.ok(names.has(name),kind+': '+name);
      for(const [profile,width,height,orientation,form,scale] of cases){
        const frame={screen:{x:0,y:0,width,height},safe:{x:0,y:0,width,height},orientation,form};
        const plan=planView(description,frame);
        assert.ok(plan.parts.length>0,profile+kind);
        const root=plan.parts[0].rect;
        assert.ok(root.width<=width+.01&&root.height<=height+.01,profile+kind);
        // The planner can leave offscreen children under deliberate native scroll;
        // their declared hit sizes must still meet the minimum.
        for(const part of plan.parts){
          const interactive=part.part?.type==='button'||part.part?.type==='toggle';
          if(interactive)assert.ok(part.rect.width*scale>=43.9&&part.rect.height*scale>=43.9,profile+' '+kind+' '+part.part.name);
          let ancestor=part.parent,scrolling=false;
          while(ancestor>=0){if(plan.parts[ancestor].part.scroll){scrolling=true;break;}ancestor=plan.parts[ancestor].parent;}
          if(!scrolling)assert.ok(part.rect.x>=0&&part.rect.y>=0&&part.rect.x+part.rect.width<=width+.05&&part.rect.y+part.rect.height<=height+.05,
            profile+' '+kind+' '+part.part.name+' outside screen '+JSON.stringify(part.rect));
        }
      }
    }
  }
});
test('setting steppers quantize all old ranges, bound values, and invoke changed only on actual change',async()=>{
  const {buildMenuView}=await menus(),s=defaultState(),changes=[];
  const {bind}=buildMenuView('panel',s,{...actions,changed:key=>changes.push(key)});
  bind.sensitivityPlus.tap(s); assert.equal(s.settings.sensitivity,1.05);
  bind.adsSensitivityMinus.tap(s); assert.equal(s.settings.adsSensitivity,.61);
  bind.fovPlus.tap(s); assert.equal(s.settings.fov,75);
  bind.volumeMinus.tap(s); assert.equal(s.settings.volume,.75);
  assert.equal(bind.adsSensitivityValue.text(s),'0.61×');
  s.settings.volume=1;
  bind.volumePlus.tap(s); assert.equal(s.settings.volume,1);
  assert.deepEqual(changes,['sensitivity','adsSensitivity','fov','volume']);
});
test('deploy and resume actions are called synchronously, and waiting disables capture',async()=>{
  const {buildMenuView}=await menus(),s=defaultState(),events=[];
  const callbacks={...actions,click:()=>events.push('click'),deploy:()=>events.push('deploy'),resume:()=>events.push('resume')};
  const title=buildMenuView('title',s,callbacks);
  title.bind.deploy.tap(s);
  assert.deepEqual(events,['click','deploy']);
  const pause=buildMenuView('pause',s,callbacks);
  pause.bind.resume.tap(s);
  assert.deepEqual(events,['click','deploy','click','resume']);
  s.mouseStatus='waiting';assert.equal(pause.bind.resume.disabled(s),true);
  assert.equal(pause.bind.dragLook.visible(s),false);
  s.mouseStatus='failed';assert.equal(pause.bind.retryLabel?.text?.(s)??pause.bind.resume.text(s),'重试鼠标锁定');
  assert.equal(pause.bind.dragLook.visible(s),true);
});
test('language, boot/result and backpack presentation do not mutate supplied game data',async()=>{
  const {snapshotDebrief,snapshotBag}=await menus();
  const game={t:376,stats:{shots:10,hits:3,kills:5,headshots:1},rating:()=> 'B',
    player:{weapon:'pistol',bandages:2,grenades:1},weapons:{rifle:{ammo:1,reserve:99},pistol:{ammo:4,reserve:Infinity},marksman:{ammo:2,reserve:16}},
    loot:[{key:'wire',value:4,rarity:1},{key:'chip',value:10,rarity:6}],lootValue:14,terminalsDone:1,terminals:[{}, {}, {}],attachments:['foregrip']};
  const d=snapshotDebrief(game),b=snapshotBag(game);
  assert.equal(d.time,'06:16');assert.equal(d.rows[1].key,'chip');assert.equal(d.rows[2].key,'wire');
  assert.equal(d.accuracy,'30%');assert.equal(b.rows.length,12);assert.equal(b.weapons[1].reserve,'∞');assert.equal(b.current,'pistol');
  assert.equal(game.loot[0].key,'wire');assert.equal(game.weapons.pistol.reserve,Infinity);
});




test('native stack menu lifecycle preserves the active modal, live bag and synchronous fullscreen call',async()=>{
  const {createMenus}=await menus(),s=settings(),opened=new Map(),calls=[],errors=[];
  const play={browser:{pointer:{cancelAll(reason){assert.equal(reason,'suspended');}}},show(description,options){
    const label=description.label;
    const v={description,options,focused:options.initialFocus,show(){},hide(){},refresh(){},
      close(){opened.delete(label);},focus(name){this.focused=name;return true;}};
    opened.set(label,v);return v;
  }};
  const doc=new EventTarget();
  doc.fullscreenEnabled=true;doc.exitFullscreen=()=>{calls.push('exit');doc.fullscreenElement=null;};
  const area={ownerDocument:doc,requestFullscreen(){calls.push('enter');doc.fullscreenElement=area;}};
  const menu=createMenus(play,area,s,{...actions,closeBag:undefined,onError:e=>errors.push(e)});
  const settle=()=>new Promise(r=>setTimeout(r,20));
  try{
    menu.show('title');await settle();
    const title=opened.get('断流行动');assert.ok(title);
    title.options.bind.fullscreen.tap(title.options.state);
    assert.deepEqual(calls,['enter']);await settle();
    assert.equal(menu.snapshot().fullscreen.active,true);
    title.options.bind.settings.tap(title.options.state);await settle();
    assert.equal(menu.snapshot().screens.modal,'fps-panel');
    const panel=opened.get('设置');panel.options.bind.controlsTab.tap(panel.options.state);await settle();
    assert.equal(menu.snapshot().panel,'controls');
    panel.options.bind.langEn.tap(panel.options.state);await settle();
    assert.equal(s.lang,'en');assert.equal(menu.snapshot().panel,'controls');
    assert.equal(menu.handleBack(),true);await settle();
    assert.equal(menu.snapshot().panel,null);assert.equal(menu.snapshot().screens.active,'fps-title');
    menu.show('none');await settle();assert.equal(menu.snapshot().screens.active,undefined);
    assert.equal(menu.toggleBag(true),true);await settle();assert.equal(menu.bagOpen,true);
    assert.equal(menu.snapshot().screens.active,'fps-bag');
    assert.equal(menu.handleBack(),true);await settle();assert.equal(menu.bagOpen,false);
    menu.setBoot({message:'Loading',loaded:3,total:9});await settle();
    assert.equal(menu.snapshot().screens.active,'fps-boot');
    menu.hideBoot();await settle();assert.equal(menu.snapshot().screens.active,undefined);
    menu.setError('Loading failed');await settle();assert.equal(menu.snapshot().screens.active,'fps-error');
    assert.deepEqual(errors,[]);
  }finally {await menu.dispose();}
});


test('native settings expose explicit pointer mode and reduced-motion choices with reliable defaults',async()=>{
  const {buildMenuView}=await menus(),s=defaultState(),changed=[];
  const buttons=buildMenuView('panel',s,{...actions,changed:key=>changed.push(key)}).bind;
  assert.equal(buttons.mouseModeLabel.text(s),'鼠标模式');
  assert.equal(buttons.mouseModeLock.text(s),'锁定');
  assert.equal(buttons.mouseModeDrag.text(s),'拖动');
  assert.equal(buttons.reducedMotionSystem.text(s),'跟随系统');
  assert.equal(buttons.reducedMotionReduce.text(s),'减少');
  assert.equal(buttons.reducedMotionNormal.text(s),'正常');
  assert.notEqual(buttons.mouseModeLock.color(s),buttons.mouseModeDrag.color(s));
  assert.notEqual(buttons.reducedMotionSystem.color(s),buttons.reducedMotionReduce.color(s));
  // Selecting the effective default is a no-op, even for old saved settings.
  buttons.mouseModeLock.tap(s);buttons.reducedMotionSystem.tap(s);
  assert.deepEqual(changed,[]);
  buttons.mouseModeDrag.tap(s);buttons.reducedMotionReduce.tap(s);
  assert.equal(s.settings.mouseMode,'drag');assert.equal(s.settings.reducedMotion,'reduce');
  buttons.reducedMotionNormal.tap(s);assert.equal(s.settings.reducedMotion,'normal');
  buttons.reducedMotionSystem.tap(s);assert.equal(s.settings.reducedMotion,'system');
  buttons.mouseModeLock.tap(s);assert.equal(s.settings.mouseMode,'lock');
  assert.deepEqual(changed,['mouseMode','reducedMotion','reducedMotion','reducedMotion','mouseMode']);
  s.settings.lang='en';
  assert.equal(buttons.mouseModeLabel.text(s),'Mouse mode');
  assert.equal(buttons.mouseModeLock.text(s),'Lock');
  assert.equal(buttons.mouseModeDrag.text(s),'Drag');
  assert.equal(buttons.reducedMotionSystem.text(s),'System');
  assert.equal(buttons.reducedMotionReduce.text(s),'Reduced');
  assert.equal(buttons.reducedMotionNormal.text(s),'Normal');
});

test('title is a left-aligned native dossier on wide screens and a centered card on portrait',async()=>{
  const {buildMenuView}=await menus(),s=defaultState();
  const {description,bind}=buildMenuView('title',s,actions);
  for(const [profile,w,h,orientation,form] of cases){
    const frame={screen:{x:0,y:0,width:w,height:h},safe:{x:0,y:0,width:w,height:h},orientation,form};
    const plan=planView(description,frame),card=plan.parts.find(p=>p.part.name==='mainCard');
    assert.ok(card,profile);
    if(orientation==='landscape'){
      assert.ok(card.rect.x<Math.max(40,w*.08),profile+' left margin');
      assert.ok(card.rect.width<w*.57,profile+' preserves right scene preview');
    }else assert.ok(Math.abs(card.rect.x+card.rect.width*.5-w*.5)<1,profile+' centered portrait');
  }
  assert.ok(description.skin.dim<=.32,'title preview has less dim than pause');
  assert.equal(bind.mainCard.label(s),'行动概要');
});
test('named structural menu groups have localized semantic labels rather than internal ids',async()=>{
  const {buildMenuView}=await menus(),s=defaultState();
  for(const lang of ['zh','en']){
    s.settings.lang=lang;
    for(const kind of states){
      const {description,bind}=buildMenuView(kind,s,actions);
      for(const [name,type] of checkView(description)){
        if(type!=='panel')continue;
        const actual=bind[name]?.label?.(s);
        assert.ok(typeof actual==='string'&&actual.trim()&&actual!==name,kind+' '+lang+' '+name);
      }
    }
  }
});

test('settings uses three visible native pages without offscreen interactive rows, with all choices retained',async()=>{
  const {buildMenuView}=await menus(),s=defaultState(),{description,bind}=buildMenuView('panel',s,actions);
  for(const [key,label] of [['display','画面'],['input','输入'],['general','通用']]){
    const suffix=key[0].toUpperCase()+key.slice(1),tab=bind['settings'+suffix+'Tab'];
    assert.equal(tab.text(s),label);tab.tap(s);assert.equal(s.settingsPage,key);assert.equal(tab.selected(s),true);
    for(const other of ['display','input','general'])assert.equal(bind[other+'Page'].visible(s),other===key);
  }
  assert.equal(bind.desktopRange.visible?.(s)??true,true);
  const names=checkView(description);
  for(const key of ['qualityHigh','mouseModeLock','sensitivityPlus','adsSensitivityPlus','fovPlus','volumePlus','reducedMotionReduce','invertYOn','langEn','fullscreenPanel'])assert.equal(names.get(key),'button',key);
  s.settings.lang='en';assert.equal(bind.settingsDisplayTab.text(s),'Display');assert.equal(bind.settingsInputTab.text(s),'Input');assert.equal(bind.settingsGeneralTab.text(s),'General');
});
test('backpack keeps 12 slots and exposes weapon, attachment and supply tabs on PC and touch',async()=>{
  const {buildMenuView}=await menus(),s=defaultState(),picked=[],calls=[];
  s.bag={rows:Array(12).fill(null),weapons:Array(3).fill({ammo:5,reserve:'9'}),current:'rifle',attachments:[]};
  const {description,bind}=buildMenuView('bag',s,{...actions,selectWeapon:k=>picked.push(k),closeBag:()=>calls.push('close')});
  const names=checkView(description);
  for(let i=0;i<12;i++)assert.equal(names.get('bagItem'+i),'text');
  for(const [key,label] of [['weapons','武器'],['attachments','配件'],['supplies','补给']]){
    const suffix=key[0].toUpperCase()+key.slice(1),tab=bind['bag'+suffix+'Tab'];
    assert.equal(tab.text(s),label);tab.tap(s);assert.equal(s.bagTab,key);assert.equal(tab.selected(s),true);
    for(const other of ['weapons','attachments','supplies'])assert.equal(bind['bag'+other[0].toUpperCase()+other.slice(1)+'Page'].visible(s),other===key);
  }
  bind.bagWeaponsTab.tap(s);
  for(const touch of [false,true]){
    s.touch=touch;assert.ok(bind.bagWeapon1.visible?.(s)??true);assert.equal(bind.bagWeapon1.label(s),'P-17 手枪');bind.bagWeapon1.tap(s);
  }
  assert.deepEqual(picked,['pistol','pistol']);assert.deepEqual(calls,['close','close']);
});

test('backpack delegates Close inside the native action before any asynchronous work',async()=>{
  const {createMenus}=await menus(),s=settings(),opened=new Map(),calls=[];
  const play={browser:{pointer:{cancelAll(){}}},show(description,options){
    const view={description,options,show(){},hide(){},refresh(){},close(){opened.delete(description.label)}};
    opened.set(description.label,view);return view;
  }};
  const doc=new EventTarget();doc.fullscreenEnabled=false;
  let menu;
  menu=createMenus(play,{ownerDocument:doc},s,{...actions,requestCloseBag(){calls.push('gesture');menu.toggleBag(false);}});
  const settle=()=>new Promise(r=>setTimeout(r,20));
  try{
    menu.show('none');await settle();menu.toggleBag(true);await settle();
    const bag=opened.get('背包');
    assert.equal(bag.options.initialFocus,'bagWeaponsTab');
    assert.equal(menu.snapshot().bagTab,'weapons');
    bag.options.bind.bagAttachmentsTab.tap(bag.options.state);
    assert.equal(menu.snapshot().bagTab,'attachments');
    bag.options.bind.closeBag.tap(bag.options.state);
    assert.deepEqual(calls,['gesture']);assert.equal(menu.bagOpen,false);
  }finally{await menu.dispose();}
});
test('help separates keyboard, touchscreen and mapped gamepad descriptions in both languages',async()=>{
  const {buildMenuView}=await menus(),s=defaultState(),{bind}=buildMenuView('panel',s,actions);
  assert.equal(bind.keyboardHeader.text(s),'键盘与鼠标');assert.equal(bind.touchHeader.text(s),'触屏');assert.equal(bind.padHeader.text(s),'手柄');
  assert.equal(bind.padKey0.text(s),'L Stick');assert.equal(bind.padKey11.text(s),'Start');
  s.settings.lang='en';assert.equal(bind.padHeader.text(s),'Gamepad');assert.equal(bind.padDesc11.text(s),'Pause');
  assert.match([0,1,2,3].map(i=>bind['padHelp'+i].text(s)).join(' '),/Tab \/ Shift\+Tab/);
});
