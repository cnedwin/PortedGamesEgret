// Rules and rendering share the original 960 × 540 canal. Native play views own every player control.
import { play } from '@egret/engine/play';
import { browserLanguages, browserSaveStorage, prefersReducedMotion } from '@egret/engine/web/kit';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { getLanguage, onLanguage, setLanguage, startLanguage, t } from './i18n.mjs';
import { openSave, recordGame } from './saves.mjs';
import { EARLY_BONUS, FIELD, PLOTS, RAIDERS, TOWERS, TOWER_KINDS, WAVES } from './sim/data.mjs';
import * as rules from './sim/world.mjs';
import { paintGround } from './ground.mjs';
import { createLandingPreview } from './landing-preview.mjs';
import { createSound } from './sound.mjs';
import { createView } from './view.mjs';
import { planCanalLayout, stageToField } from './native-layout.mjs';
import { createCanalUi } from './native-ui.mjs';
import { buildTitle, buildMenu, buildEnd, buildHelp } from './native-screens.mjs';
import { buildFieldUi, buildPicker } from './native-field-ui.mjs';
import { createHudTextGate } from './hud-text-gate.mjs';

const params = new URLSearchParams(location.search);
const frameElement = document.querySelector('#frame');
const ground = document.querySelector('#ground');
const firstPlot = 5;
let notice = null;
const save = openSave(browserSaveStorage(), startLanguage(browserLanguages()), problem => {
  notice = problem.kind === 'write-failed' ? 'saveRefused' : 'saveReset';
});
const settings = () => save.data.settings;
setLanguage(params.get('lang') ?? settings().language);
const app = {
  save, screen: 'title', mode: 'standard', difficulty: params.get('difficulty') === 'hard' ? 'hard' : 'normal',
  world: null, selected: null, speed: 1, result: null, seed: Number(params.get('seed') ?? Date.now() % 100000),
  get notice() { return notice; }
};
const uiState = {
  silver: '', lives: '', wave: '', call: '', waveText: '', callText: '', speed: '', menu: '', guide: '', guideColor: 0xf2e7cc,
  gates: [{text:'',label:''}, {text:'',label:''}], callReady: false, landingVisible: false, landingPressed: false,
  plots: PLOTS.map(() => ({label:'',text:'+',recommended:false,selected:false,built:false}))
};
const hudTextGate = createHudTextGate();
let hudTextStage;
let game, mapRoot, view, sound, ui, layout, projection, layoutSignature, helpOpen = false, ready = false;
let pickerState = null, feedback = null, previewBoat = null, mapPress = null, lastFocus = null, lastHover = null;
let pointerSource = 'keyboard';
const wavesOf = world => world.waves ?? WAVES;
const isIntercept = world => world?.mode === 'intercept';
const semantics = createUiSemantics({ maxNodes: 1024 });

function setSetting(key, value) {
  if (!save.update(data => { data.settings[key] = value; })) notice = 'saveRefused';
}
function screenLayout(made) {
  const screen = made.screen, safe = made.safe;
  return planCanalLayout({ width: screen.width, height: screen.height, safe: {
    x: safe.x - screen.x, y: safe.y - screen.y, width: safe.width, height: safe.height
  } });
}
function placeMap(made) {
  const f = layout.field, box = made.canvas.getBoundingClientRect(), host = frameElement.getBoundingClientRect();
  mapRoot.x = f.x + made.screen.x;
  mapRoot.y = f.y + made.screen.y;
  mapRoot.scaleX = mapRoot.scaleY = f.scale;
  Object.assign(ground.style, {
    left: box.left - host.left + f.x * box.width / layout.width + 'px',
    top: box.top - host.top + f.y * box.height / layout.height + 'px',
    width: f.width * box.width / layout.width + 'px',
    height: f.height * box.height / layout.height + 'px'
  });
}
function arrange(made) {
  const next = screenLayout(made);
  const signature = JSON.stringify([next.width,next.height,next.safe,next.mode,next.field]);
  const changed = signature !== layoutSignature, focus = ui?.focused;
  layout = next;
  layoutSignature = signature;
  placeMap(made);
  if (!ready) return;
  if (changed) {
    projection?.dispose();
    projection = createBrowserSemantics({ semantics, canvas: made.canvas,
      width: layout.width, height: layout.height, label: t('stage') });
    redrawAll(focus);
  } else projection?.sync();
}

await play({
  width: 1120, height: 680, portrait: { width: 540, height: 960 }, fit: 'expand',
  parent: frameElement, transparent: true, seed: app.seed, semantics,
  // The richer score already opens its own host after a gesture. Avoid requiring
  // the optional native SFX host before the game can even display its title.
  audio: typeof globalThis.AudioContext === 'function',
  setup(made) {
    game = made;
    sound = createSound(game, { on: settings().sound, music: settings().music });
    mapRoot = game.sprite();
    view = createView(game, { sound, parent: mapRoot });
  },
  arrange: made => arrange(made),
  update: seconds => frame(seconds),
  onError: cause => console.error(cause)
});
paintGround(ground);
game.canvas.parentElement.style.zIndex = '1';
game.canvas.setAttribute('aria-label', t('stage'));
game.reducedMotion = settings().reducedMotion || prefersReducedMotion();
ui = createCanalUi(game, app, semantics);
layout = screenLayout(game);
layoutSignature = JSON.stringify([layout.width,layout.height,layout.safe,layout.mode,layout.field]);
placeMap(game);
projection = createBrowserSemantics({ semantics, canvas: game.canvas,
  width: layout.width, height: layout.height, label: t('stage') });

// Keep the map's raw press pairing and mouse hover source separate from native
// control activations; tower cards receive their own activation context.
function clientOnMap(event) {
  const box = game.canvas.getBoundingClientRect();
  if (!box.width || !box.height) return null;
  const x = (event.clientX - box.left) * layout.width / box.width;
  const y = (event.clientY - box.top) * layout.height / box.height;
  if (ui.hit(x + game.screen.x, y + game.screen.y)) return null;
  return stageToField(layout, x, y);
}
const recordPointer = event => {
  const onCanvas = event.target === game.canvas || game.canvas.contains(event.target);
  if (onCanvas) pointerSource = event.pointerType || 'mouse';
  if (event.type === 'pointerdown') {
    mapPress = onCanvas && app.screen === 'play' && event.isPrimary && event.button === 0 && clientOnMap(event)
      ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
  } else if (event.type === 'pointerup' && mapPress?.id === event.pointerId) {
    const start = mapPress;
    mapPress = null;
    if (!onCanvas || app.screen !== 'play' || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
    const point = clientOnMap(event);
    if (!point) return;
    if (pickerState) closePicker();
    if (isIntercept(app.world)) landingPreview.selectAt(point.x, point.y);
  }
};
window.addEventListener('pointerdown', recordPointer, true);
window.addEventListener('pointerup', recordPointer, true);
window.addEventListener('pointercancel', event => {
  if (mapPress?.id === event.pointerId) mapPress = null;
  pointerSource = 'keyboard';
}, true);

function showReachOf(plot, kind, level) {
  const tower = app.world?.towers[plot];
  if (kind) view.showReach(plot, kind, level ?? 0);
  else if (tower) view.showReach(plot, tower.kind, tower.level);
  else view.showReach(null);
}
function towerStats(kind, level) {
  const stats = TOWERS[kind].levels[level];
  if (kind === 'gong') return t('towerRange', stats) + ' · ' + t('gongStats', {
    slow: Math.round(stats.slow * 100), haste: Math.round(stats.haste * 100), aura: stats.aura });
  return stats.minRange
    ? t('rangeBand', {min:stats.minRange,max:stats.range}) + ' · ' + t('impact',stats)
    : t('towerStats',stats);
}
function buildPreview(kind) {
  if (!pickerState || pickerState.tower) return;
  pickerState.previewKind = kind;
  pickerState.stats = towerStats(kind, 0);
  showReachOf(pickerState.plot, kind);
  ui.view('picker')?.refresh();
}
function showPicker(focus) {
  if (!pickerState) return;
  const built = buildPicker({ layout, app, uiState, picker: pickerState, actions: fieldActions });
  ui.show('picker', built, {focus:focus ?? (pickerState.tower ? (TOWERS[pickerState.tower.kind].levels[pickerState.tower.level+1] ? 'upgrade' : 'sell') : 'kind-crossbow')});
}
function openPicker(plot) {
  if (app.screen !== 'play' || !app.world) return;
  app.selected = plot;
  const tower = app.world.towers[plot];
  const kind = tower?.kind ?? TOWER_KINDS[0], level = tower?.level ?? 0;
  pickerState = { plot, tower, previewKind: kind, stats: towerStats(kind, level) };
  showReachOf(plot, kind, level);
  refreshPlots();
  showPicker();
}
function closePicker(refocus = false) {
  if (!pickerState) return;
  const plot = pickerState.plot;
  pickerState = null;
  ui.close('picker');
  view.showReach(null);
  refreshPlots();
  if (refocus) ui.focus('plot-' + plot);
}
function act(what, kind) {
  const world = app.world, plot = app.selected;
  if (app.screen !== 'play' || !world || plot === null) return;
  const result = what === 'build' ? rules.build(world,plot,kind) : what === 'upgrade' ? rules.upgrade(world,plot) : rules.sell(world,plot);
  if (!result.ok) {
    if (result.why === 'silver') showFeedback('needSilver',{n:rules.priceOf(world,plot,kind)-world.silver});
    return;
  }
  sound(what === 'sell' ? 'down' : 'build');
  view.show(world, []);
  refreshPlots();
  closePicker(true);
  showReachOf(plot);
  const tower = world.towers[plot];
  if (what === 'sell') showFeedback('sold',{n:result.silver});
  else showFeedback(what === 'build' ? 'built' : 'upgraded',{tower:t(tower.kind),n:tower.level+1});
}
function previewWords(boat) {
  return t('landingSelected',{ship:t(boat.kind === 'flagship' ? 'shipFlagship' : 'shipJunk'),n:RAIDERS[boat.kind].crew});
}
const landingPreview = createLandingPreview({
  view, world: () => app.screen === 'play' && isIntercept(app.world) ? app.world : null,
  onSelect(boat) {
    const changed = previewBoat?.id !== boat?.id;
    previewBoat = boat;
    if (app.screen !== 'play' || !app.world) return;
    if (changed && boat) feedback = null;
    if (changed) say(boat ? previewWords(boat) : t('landingCleared'));
    refreshBar();
  }
});
function showFeedback(key, values) {
  feedback = { key, values, expires: performance.now() + 2400 };
  say(t(key, values));
  refreshBar();
}
function nextRoute(world, wave) {
  const raiders = wavesOf(world)[wave]?.map(({kind}) => RAIDERS[kind]) ?? [];
  const routes = new Set(raiders.map(({way}) => way));
  const route = t(routes.size > 1 ? 'routeBoth' : routes.has('water') ? 'routeWater' : 'routeRoad');
  return isIntercept(world) && raiders.some(({crew}) => crew) ? t('routeWithCrew',{route}) : route;
}
function gateReadiness(world) {
  const [upper,lower] = world.gates.map(({cooldownLeft}) => cooldownLeft <= 0);
  if (upper && lower) return t('gatesBothReady');
  if (upper || lower) return t('gateOneReady',{gate:t(upper?'gateUpper':'gateLower')});
  return t('gatesCooling');
}
function incomingBoats(world, gate) {
  if (!isIntercept(world) || gate.cooldownLeft > 0 || gate.shutLeft > 0) return 0;
  let count = 0;
  for (const boat of world.raiders) {
    if (boat.way !== 'water' || boat.hp <= 0 || boat.s > gate.at) continue;
    const speed = RAIDERS[boat.kind].speed * (1 - boat.slow);
    if (gate.at - 14 - boat.s <= speed * 2) count++;
  }
  return count;
}
function refreshGuide(world) {
  const preparing = world.state === 'ready', firstBuild = preparing && !world.towers.some(Boolean);
  uiState.plots[firstPlot].recommended = firstBuild;
  let message = '', color = 0xe4d6b7;
  if (feedback?.expires > performance.now()) { message=t(feedback.key,feedback.values); color=0xffd28b; }
  else if (isIntercept(world) && previewBoat) { message=previewWords(previewBoat);color=0x8fdfd1; }
  else if (isIntercept(world) && preparing) {
    const route = nextRoute(world,0);
    message = firstBuild ? t('interceptSetup',{route}) : t('interceptReady',{route,gates:gateReadiness(world)});
  } else if (isIntercept(world) && (world.state === 'break' || world.state === 'wave')) {
    const waiting = world.state === 'break', wave = world.wave + Number(waiting);
    message=t(waiting?'interceptBetween':'interceptActive',{n:wave+1,route:nextRoute(world,wave),gates:gateReadiness(world)});
  } else if (preparing) message=t(firstBuild?'prepareFirst':'prepareDefence');
  else if (world.state==='break' && world.wave+1<wavesOf(world).length) message=t('nextWaveRoute',{n:world.wave+2,route:nextRoute(world,world.wave+1)});
  else if (world.state==='wave') message=world.wave===0?t('firstWaveActive'):t('activeWaveRoute',{n:world.wave+1,route:nextRoute(world,world.wave)});
  uiState.guide=message; uiState.guideColor=color;
}
function refreshPlots() {
  const world=app.world;
  uiState.plots.forEach((item,plot)=>{
    const tower=world?.towers[plot];
    item.label=tower?t('plotTower',{n:plot+1,tower:t(tower.kind),level:tower.level+1}):t('plotEmpty',{n:plot+1});
    item.text=tower?String(tower.level+1):'+';
    item.built=Boolean(tower); item.selected=pickerState?.plot===plot;
    item.recommended=Boolean(world && plot===firstPlot && world.state==='ready' && !world.towers.some(Boolean));
  });
}
function refreshBar() {
  const world=app.world;
  if(!world)return;
  uiState.silver=t('silver',{n:world.silver});uiState.lives=t('lives',{n:world.lives});
  const seconds=Math.ceil(Math.max(0,world.breakLeft)), waiting=world.state==='ready'||world.state==='break';
  const bonus=Math.floor(Math.max(0,world.breakLeft)*EARLY_BONUS);
  uiState.wave=world.state==='ready'?t('waveReady',{s:seconds}):world.state==='break'?t('waveBreak',{n:world.wave+2,s:seconds}):t('wave',{n:Math.max(1,world.wave+1),total:wavesOf(world).length});
  uiState.call=waiting?t(world.state==='ready'?'callFirst':'callWaveBonus',{n:bonus}):t('waveUnderway');
  if (hudTextStage !== world.state) { hudTextGate.clear(); hudTextStage = world.state; }
  if (!hudTextGate.holding) { uiState.waveText = uiState.wave; uiState.callText = uiState.call; }
  uiState.callReady=waiting;uiState.speed=t('speed',{n:app.speed});uiState.menu=t('pause');
  world.gates.forEach((gate,index)=>{
    const name=t(index?'gateLower':'gateUpper'),near=incomingBoats(world,gate);
    const words=gate.shutLeft>0?t('gateShut',{gate:name,s:Math.ceil(gate.shutLeft)}):gate.cooldownLeft>0?t('gateCooling',{gate:name,s:Math.ceil(gate.cooldownLeft)}):near?t('gateNear',{gate:name,n:near}):t('gateReady',{gate:name});
    Object.assign(uiState.gates[index],{text:words,label:near?t('gateNearName',{gate:name,n:near}):words,near,shut:gate.shutLeft>0,cooling:gate.shutLeft===0&&gate.cooldownLeft>0});
  });
  uiState.landingVisible=app.screen==='play'&&isIntercept(world)&&world.raiders.some(boat=>boat.hp>0&&RAIDERS[boat.kind].crew);
  uiState.landingPressed=uiState.landingVisible&&Boolean(previewBoat);
  refreshGuide(world);
  ui?.refresh();
}
function callWave(){
  if(app.screen!=='play'||!app.world)return;
  const result=rules.callWave(app.world);
  if(result.ok){announceWave(app.world.wave);refreshBar();}else showFeedback('waveUnderway');
}
function shutGate(index){
  const world=app.world;if(app.screen!=='play'||!world)return;
  const result=rules.shutGate(world,index),gate=t(index?'gateLower':'gateUpper');
  if(result.ok){sound('gate');showFeedback('gateBoatHint',{gate});view.show(world,[{type:'gate',gate:index,open:false}]);}
  else if(result.why==='cooling'){const {shutLeft,cooldownLeft}=world.gates[index];showFeedback(shutLeft>0?'gateShut':'gateCooling',{gate,s:Math.ceil(shutLeft||cooldownLeft)});}
}
function setSpeed(speed){app.speed=speed;game.timeScale=speed;refreshBar();}
let lastSaid='';
function say(words){const live=document.querySelector('#say');live.textContent=words===lastSaid?words+' ':words;lastSaid=live.textContent;}
function announceWave(wave){
  feedback=null;const flagship=wavesOf(app.world)[wave].some(group=>group.kind==='flagship');
  sound(flagship?'flagship':'wave');const words=flagship?t('flagship'):t('waveStarts',{n:wave+1});say(words);game.toast(words,{seconds:2.2,color:0xf1e7cf});
}

const fieldActions = {
  plot: i => pickerState?.plot===i?closePicker(true):openPicker(i),
  gate: i => { closePicker();shutGate(i); },
  call: () => {closePicker();callWave();}, speed:()=>{closePicker();setSpeed(app.speed===3?1:app.speed+1);},
  menu:()=>openMenu(), landing:()=>{closePicker();landingPreview.cycle();},
  choose: (kind, activation) => ['touch', 'pen'].includes(activation.source) ? buildPreview(kind) : act('build', kind),
  confirm:()=>{if(pickerState)act('build',pickerState.previewKind);},
  upgrade:()=>act('upgrade'),sell:()=>act('sell'),cancel:()=>closePicker(true)
};
const screenActions={
  start:(difficulty,mode='standard')=>startGame(difficulty,mode),toggle:key=>toggleSetting(key),
  language:()=>{const next=getLanguage()==='zh'?'en':'zh';setSetting('language',next);setLanguage(next);},
  help:()=>{helpOpen=true;renderHelp();}, closeHelp:()=>{helpOpen=false;ui.close('help');ui.focus('help');},
  resume:()=>closeMenu(),restart:()=>startGame(app.difficulty,app.mode),quit:()=>showTitle(),again:()=>startGame(app.difficulty,app.mode)
};
const screenArgs=()=>({layout,app,settings,actions:screenActions});
function renderField(focus){
  hudTextGate.clear();
  uiState.waveText = uiState.wave; uiState.callText = uiState.call;
  const field = ui.show('field',buildFieldUi({layout,app,uiState,actions:fieldActions}),{...(focus?{focus}:{})});
  if (uiState.callReady) hudTextGate.hold(field);
}
function renderTitle(focus='start-normal'){ui.show('title',buildTitle(screenArgs()),{focus});}
function renderHelp(){ui.show('help',buildHelp(screenArgs()),{dismiss:screenActions.closeHelp});}
function renderMenu(focus){ui.show('menu',buildMenu(screenArgs()),{dismiss:closeMenu,resume:closeMenu,...(focus?{focus}:{})});}
function renderEnd(focus){if(app.result)ui.show('end',buildEnd(screenArgs()),{...(focus?{focus}:{})});}
function redrawAll(focus){
  ui.clear();
  if(app.screen==='title'){renderTitle(helpOpen?'help':focus??'start-normal');if(helpOpen)renderHelp();return;}
  refreshPlots();refreshBar();renderField(app.screen==='play'&&!pickerState?focus:undefined);
  if(app.screen==='play'&&pickerState)showPicker(focus);
  if(app.screen==='menu')renderMenu(focus);
  if(app.screen==='end')renderEnd(focus);
}
function toggleSetting(key){
  const value=!settings()[key];setSetting(key,value);
  if(key==='sound')sound.setOn(value);
  if(key==='music')sound.setMusic(value);
  if(key==='reducedMotion')game.reducedMotion=value||prefersReducedMotion();
  if(app.screen==='title')renderTitle('setting-'+key);
  if(app.screen==='menu')renderMenu('setting-'+key);
}
function showTitle(){
  hudTextGate.clear(); hudTextStage = undefined;
  closePicker();ui.clear();app.screen='title';app.mode='standard';app.world=null;app.selected=null;helpOpen=false;
  landingPreview.clear();previewBoat=null;view.clear();sound.stopMusic();game.timeScale=1;
  if(game.paused)game.resume();
  frameElement.dataset.screen='title';mapRoot.visible=false;ground.hidden=true;
  renderTitle();
}
function startGame(difficulty=app.difficulty,mode='standard'){
  closePicker();ui.clear();landingPreview.clear();previewBoat=null;helpOpen=false;
  app.difficulty=difficulty;if(mode==='standard')app.seed=(app.seed*7+13)%100000;
  app.world=rules.createWorld(mode==='intercept'?1:app.seed,difficulty,{mode});app.mode=mode;
  app.screen='play';app.selected=null;app.result=null;feedback=null;mapPress=null;
  frameElement.dataset.screen='play';frameElement.dataset.mode=mode;ground.hidden=false;mapRoot.visible=true;
  view.clear();view.show(app.world,[]);setSpeed(1);
  if(game.paused)game.resume();refreshPlots();refreshBar();renderField('plot-'+firstPlot);
}
function openMenu(){
  if(app.screen!=='play')return;
  closePicker();game.pause();sound.pauseMusic();app.screen='menu';landingPreview.clear();refreshBar();renderMenu();
}
function closeMenu(){
  if(app.screen!=='menu')return;
  app.screen='play';ui.close('menu');game.resume();refreshBar();ui.focus('menu');
}
function finish(world){
  const stars=rules.starsOf(world),intercept=isIntercept(world)?{...world.intercept,held:world.intercept.held.slice()}:null;
  let best=false;const kept=intercept!==null||save.update(data=>{best=recordGame(data,app.difficulty,stars);});
  if(!kept)notice='saveRefused';
  app.result={won:world.state==='won',stars,best,lives:world.lives,wave:world.wave+1,waves:wavesOf(world).length,kills:world.kills,kept,intercept};
  sound.stopMusic();sound(world.state==='won'?'win':'lose');app.screen='end';closePicker();landingPreview.clear();refreshBar();
  game.after(game.reducedMotion ? 0.2 : 1,()=>{say(t(intercept?(app.result.won?'interceptWon':'interceptLost'):app.result.won?'won':'lost'));renderEnd();});
}

function updateViewInput(){
  if(app.screen!=='play')return;
  const focused=ui.focused;
  if(focused!==lastFocus){
    lastFocus=focused;
    const p=/^plot-(\d+)$/.exec(focused??'');
    if(p&&!pickerState){app.selected=Number(p[1]);showReachOf(app.selected);}
    if(pickerState&&focused?.startsWith('kind-'))buildPreview(focused.slice(5));
    if(pickerState?.tower&&['upgrade','sell'].includes(focused)){
      const tower=pickerState.tower,level=focused==='upgrade'?tower.level+1:tower.level;
      if(TOWERS[tower.kind].levels[level]){pickerState.stats=towerStats(tower.kind,level);showReachOf(pickerState.plot,tower.kind,level);}
    }
  }
  const pointer=game.pointer,hit=ui.hit(pointer.x,pointer.y);
  if(pointerSource==='mouse'&&!pointer.down&&hit!==lastHover){
    lastHover=hit;
    if(pickerState&&hit?.startsWith('kind-'))buildPreview(hit.slice(5));
    else if(!pickerState&&/^plot-\d+$/.test(hit??''))showReachOf(Number(hit.slice(5)));
  }
}
let sinceBar=0;
function frame(seconds){
  if(!ready||app.screen!=='play'||!app.world)return;
  updateViewInput();const world=app.world,events=[];
  for(let left=seconds;left>1e-6;left-=.05)events.push(...rules.step(world,Math.min(left,.05)));
  if(isIntercept(world))landingPreview.update();view.show(world,events);
  for(const event of events){
    if(event.type==='wave')announceWave(event.wave);
    else if(event.type==='leak')say(t('leak',{n:event.lives}));
    else if(event.type==='gate'&&event.open)say(t('gateOpenSay',{gate:t(event.gate?'gateLower':'gateUpper')}));
    else if(event.type==='won'||event.type==='lost')finish(world);
  }
  if(app.screen==='play'){
    const total=wavesOf(world).length,flagship=world.wave===total-1&&(world.queue.some(raider=>raider.kind==='flagship')||world.raiders.some(raider=>raider.kind==='flagship'));
    const preparing=world.state==='ready'||(world.state==='break'&&!world.raiders.length);
    sound.music((world.wave+1)/total,flagship?'boss':preparing?'ready':'battle');
  }
  sinceBar+=seconds/Math.max(1,app.speed);
  if(sinceBar>.1||events.length){sinceBar=0;refreshBar();}
}

window.addEventListener('keydown',event=>{
  pointerSource='keyboard';
  if(event.ctrlKey||event.metaKey||event.altKey)return;
  const key=event.key.toLowerCase();
  const handle=fn=>{event.preventDefault();event.stopPropagation();if(!event.repeat)fn();};
  if(app.screen==='menu'&&key==='p')return handle(closeMenu);
  if(app.screen!=='play'||!app.world)return;
  if(key==='escape')return handle(()=>pickerState?closePicker(true):openMenu());
  const digit=Number(key);
  if(digit>=1&&digit<=TOWER_KINDS.length&&app.selected!==null&&!app.world.towers[app.selected])return handle(()=>act('build',TOWER_KINDS[digit-1]));
  if(key==='u'&&app.selected!==null)return handle(()=>act('upgrade'));
  if(key==='x'&&app.selected!==null)return handle(()=>act('sell'));
  if(key==='q'||key==='e')return handle(()=>shutGate(key==='q'?0:1));
  if(key==='n'||(key===' '&&!ui.focused))return handle(callWave);
  if(key==='f')return handle(()=>setSpeed(app.speed===3?1:app.speed+1));
  if(key==='p')return handle(openMenu);
  if(key==='enter'&&!ui.focused&&app.selected!==null)return handle(()=>openPicker(app.selected));
},true);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&app.screen==='play')openMenu();});
onLanguage(()=>{
  document.documentElement.lang=getLanguage()==='zh'?'zh-CN':'en';document.title=t('pageTitle');
  game.canvas.setAttribute('aria-label',t('stage'));redrawAll('setting-language');
});
document.documentElement.lang=getLanguage()==='zh'?'zh-CN':'en';document.title=t('pageTitle');
document.querySelector('#loading')?.remove();
ready=true;showTitle();
window.canalWatch={app,rules,game,ui,semantics,get layout(){return layout;},start:startGame,
  get screen(){return app.screen;},get ready(){return ready;}};
