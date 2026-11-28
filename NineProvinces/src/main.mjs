// 页面入口：设置与语言、3D 天下（地形、城池、军团和名牌；战斗就在这张图上打）、声音、界面；时间按所选的快慢一天天
// 推进（暂停、每秒半天到八天），每月一号自动存档；收件箱里的演义、交战、使者和俘虏一件件拿出来让玩家定夺。拖动平移、
// 滚轮或双指缩放、空格暂停、1–5 调速度、方向键移动、+/- 缩放、H 归城、Esc 关闭。
// The page's entry: settings and language, the 3D realm (land, cities, armies and name plates; battles are fought on
// this same map), sound and the interface; time moves on day by day at the chosen speed (paused, or half a day to eight
// days a second), with an autosave on the first of each month; the tale, battles, envoys and captives come out of the
// inbox one at a time for the player to decide. Drag to pan, the wheel or two fingers to zoom, Space to pause, 1–5 for
// speed, arrows to move, +/- to zoom, H to return to town, Esc to close.
import { browserSaveStorage, downloadBrowserTextFile, pickBrowserTextFile, prefersReducedMotion, watchReducedMotion } from '@egret/engine/web/kit';
import { NODES, PROVINCES } from './data/map.mjs';
import { createSound } from './audio/sound.mjs';
import {createMusicRecovery} from './ui/native-music-recovery.mjs';
import { getLanguage, setLanguage, t } from './i18n.mjs';
import { exportText, importSaveText, openOfficerRoster, openSettings, openSlot, SLOTS, writeSlot } from './saves.mjs';
import { captureCampaignView, createProgressCheckpoint, restoreCampaignView } from './save-view.mjs';
import { recordedAutoBattle } from './sim/battle-history.mjs';
import { createNanpiTrial } from './sim/nanpi-trial.mjs';
import { dateOf } from './sim/core.mjs';
import { answerEnvoy, breakTreaty, demandSurrender, gift, propose, askAttack } from './sim/diplomacy.mjs';
import { activeSiegeWait, cancelSiegeWait, disband, finishBattle, muster, nearestFriendly, order, route, waitForSiegeReinforcement } from './sim/military.mjs';
import { registerCustom } from './sim/newblood.mjs';
import { die, giveTreasure, issueTalentOrder, moveGeneral, persuade, release, searchCity } from './sim/people.mjs';
import { answerStory } from './sim/story.mjs';
import { advance, createGame, power, recruit, setGovernorDuty, setGovernorRecruitment, startWork, study, transfer } from './sim/world.mjs';
import { createNativeRealmHud, nativeTipFor as tipFor } from './ui/native-realm-hud.mjs';
import { createRealmDestinationPicker } from './ui/native-realm-destination.mjs';
import { createCampaignCoach } from './ui/native-campaign-coach.mjs';
import { eventOf, logLine, pair, treatyAt } from './ui/text.mjs';
import { startBattle } from './ui/battleui-native.mjs';
import {createNativeBattleLabRouter,createNativeNanpiResult} from './ui/native-battle-lab-router.mjs';
import { createNativeTitleScreens } from './ui/native-title.mjs';
import { createNativeDialogs } from './ui/native-dialogs.mjs';
import { createNativeTopbar, CAMPAIGN_SPEEDS as SPEEDS } from './ui/native-topbar.mjs';
import { createNativeMinimap } from './ui/native-minimap.mjs';
import { campaignAftermathView, captureCampaignBattle, campaignBattleAftermath, campaignBattlePresentation } from './ui/campaign-battle.mjs';
import { createRealmView } from './view3d/realm.mjs';
import {campaignMarkerTextContext} from './view3d/native-host-performance.mjs';
import { homeCity } from './view/home-city.mjs';
import { factionName, generalName, placeName } from './view/names.mjs';
import { TREASURES } from './data/treasures.mjs';
import { nm } from './i18n.mjs';

const params = new URLSearchParams(location.search);
const $=selector=>document.querySelector(selector);
const frame = $('#frame');

// ——— Settings and language ———
const problems = [];
const storage = browserSaveStorage();
const settingsStore = openSettings(storage, navigator.language?.startsWith('zh') ? 'zh' : 'en', (p) => problems.push(p.kind));
const slots = Object.fromEntries(SLOTS.map((slot) => [slot, openSlot(storage, slot, (p) => problems.push(p.kind))]));
const officerRoster = openOfficerRoster(storage, (problem) => problems.push(problem.kind));
const progress = createProgressCheckpoint();
setLanguage(params.get('lang') ?? settingsStore.data.settings.language);
document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';

let systemReducedMotion=prefersReducedMotion();
const app = {
  game: null,
  stageSize: { width: 1600, height: 900 },
  settings: settingsStore.data.settings,
  sound: { play() {}, theme() {}, setSound() {}, setMusic() {} },
  state: null,
  demoState: null,
  map: null,
  hud: null,
  dialogs: null,
  battle: null,
  lab: null,
  atlas: null,
  dot: null,
  sel: null,
  lastOwnedCity: null,
  firstMonth: null,
  mode: null,
  paused: true,
  speed: Math.max(0, Math.min(4, settingsStore.data.settings.speed ?? 2)),
  dialogOpen: false,
  notice: problems.some((k) => k !== 'write-failed') ? t('saveReset') : null,
  screen: 'loading',
  rulerSet: new Set(),
  tales: [],
  language: () => getLanguage(),
  officerRoster: () => officerRoster.read(),
  saveOfficerRoster: list => officerRoster.write(list),
  openSandbox: () => openBattleLab(),
  openNanpi: () => openNanpiTrial(),
  openBattleReplay: tape => openBattleLab(tape),
  /** Whether to keep motion down: the setting, or the system's own preference. */
  calm: () => Boolean(app.settings.reducedMotion) || systemReducedMotion,
  rulers() {
    return app.rulerSet;
  },
  open: (name,args)=>{
    app.destinationPicker?.cancel();
    if(name==='chronicle'||name==='realm')app.game?.badges.clear('campaign/reports');
    if(name==='generals')app.game?.badges.clear('campaign/officers');
    return app.dialogs.open(name,args);
  },
  async confirmAction(prompt,proceed){
    if(app.game.asking)return false;
    const state=app.state;
    const accepted=await app.game.confirm(prompt,{title:pair(['请确认','Confirm action']),yes:pair(['确认','Confirm']),no:t('cancel'),skin:{panel:0x18272a,button:0x354747,text:0xf2e4c6,accent:0xe7c78b,buttonText:0xf2e4c6}});
    if(accepted&&app.state===state){proceed();return true;}
    return false;
  },
  homeCity: () => homeCity(app.state, app.lastOwnedCity),
  goHome() {
    if (app.screen !== 'play' || app.dialogOpen || app.lab) return;
    const city = app.homeCity();
    if (!city) return;
    app.map.showRoute(null);
    app.hud.showTip(null);
    app.map.jumpTo(city, app.stageSize.width < app.stageSize.height ? 48 : 52);
    app.select({ node: city });
    app.sound.play('tap');
  },
  select(sel) {
    if(sel?.army!==app.sel?.army)app.destinationPicker?.cancel();
    app.sel = sel && (sel.node || sel.army) ? sel : null;
    if (app.state && NODES[sel?.node]?.kind === 'city' && app.state.nodes[sel.node]?.owner === app.state.player) {
      app.lastOwnedCity = sel.node;
    }
    if (!sel?.army || app.mode?.army !== sel.army) app.mode = null;
    app.map?.select(app.sel ?? {});
    app.hud?.refresh();
  },
  setMode(mode) {
    app.mode = mode;
    if (!mode) app.map?.showRoute(null);
    app.hud.refresh(true);
    if (mode?.kind === 'march') app.hud.toast(t('pickTarget'));
  },
  setPaused(v) {
    app.paused = v;
    app.hud?.refresh();
    app.coach?.refreshFirst();
  },
  setSpeed(i) {
    app.speed = i;
    app.setSetting('speed', i);
    app.hud?.refresh();
  },
  setSetting(key, value) {
    const kept = settingsStore.update((data) => {
      data.settings[key] = value;
    });
    app.settings = settingsStore.data.settings;
    if (kept === false) app.hud?.toast(t('saveRefused'), 'bad');
    if (key === 'sound') app.sound.setSound(value);
    if (key === 'music') app.sound.setMusic(value);
    if (key === 'musicVolume') app.sound.setVolumes?.({ music: value });
    if (key === 'effectsVolume') app.sound.setVolumes?.({ effects: value });
    if (key === 'territoryMap') {
      app.map?.setTerritoryVisible(app.screen === 'play' && value);
      app.hud?.refresh();
    }
    if (key === 'reducedMotion') {
      app.map?.setReducedMotion?.(app.calm());
    }
  },
  setLanguage(language) {
    app.destinationPicker?.cancel();
    app.hud?.clearTransient?.();
    setLanguage(language);
    app.setSetting('language', language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = t('title');
    app.game?.canvas.setAttribute('aria-label',t('title'));
    app.map?.redraw();
    if (['title','setup','roster'].includes(app.screen)) app.nativeTitle?.refresh();
    if (app.dialogs?.name) app.dialogs.render();
    app.hud?.refresh(true);
    if (app.state) app.coach?.refreshFirst();
  },
  slotSummary(slot) {
    return slots[slot].data.summary;
  },
  act: (kind, ...args) => act(kind, ...args),
  newGame,
  loadSlot,
  wake: () => wake(),
  toTitle,
  keepWatching() {
    app.watching = true;
    app.dialogs.close(true);
  },
  exportFile() {
    downloadBrowserTextFile(`nine-provinces-${dateOf(app.state.day).year}.json`, exportText(app.state, captureCampaignView(app)), { mimeType: 'application/json' });
  },
  async pickImportFile() {
    try {
      const file = await pickBrowserTextFile({ accept: '.json,application/json' });
      if (file) await app.importFile({ text: async () => file.text });
    } catch {
      app.hud.toast(t('importBad'), 'bad');
    }
  },
  async importFile(file) {
    const saved = importSaveText(await file.text());
    if (!saved) return app.hud.toast(t('importBad'), 'bad');
    const proceed = () => { app.dialogs.close(true); play(saved.game, saved.view); };
    if (progress.changed(app.state)) app.open('confirmProgress', { reason: 'leave', backToSaves: true, proceed });
    else proceed();
  },
  startBattle(setup) {
    if (!app.state || app.battle || app.screen !== 'play') return;
    if (app.lastCampaignBattle?.state === app.state && app.lastCampaignBattle.id === setup.id) return;
    app.destinationPicker?.cancel();
    setup = campaignBattlePresentation(app.state, setup);
    app.campaignBattle = { state: app.state, id: setup.id, before: captureCampaignBattle(app.state, setup) };
    app.dialogs.close(true);
    app.screen = 'battle';
    app.hud.clearTransient?.();
    app.topbar?.setVisible(false);
    app.minimap?.setVisible?.(false);
    app.map.setTerritoryVisible(false);
    frame.dataset.screen = 'battle';
    app.battle = startBattle(app, setup);
  },
  waitForSiegeSupport(setup, armyIds) {
    if (!app.state || app.screen !== 'play' || app.battle || app.dialogs.name !== 'battle') return;
    if (!waitForSiegeReinforcement(app.state, setup, armyIds).ok) {
      app.hud.toast(pair(['援军或战况已有变化，请重新查看军议。', 'The reinforcements or battle have changed. Review the council again.']), 'bad');
      app.dialogs.render();
      return;
    }
    app.select({ node: setup.place.node });
    app.dialogs.close(true);
    app.setPaused(false);
    app.coach?.refreshWait(activeSiegeWait(app.state));
  },
  cancelSiegeSupport() {
    if (!app.state || app.screen !== 'play' || app.dialogOpen) return;
    if (!cancelSiegeWait(app.state)) return;
    app.setPaused(true);
    app.coach?.refreshWait(activeSiegeWait(app.state));
    nextInbox();
  },
  endBattle(done) {
    if (!app.state || !done?.setup || !done.result) return;
    if (app.lastCampaignBattle?.state === app.state && app.lastCampaignBattle.id === done.setup.id) return;
    const before = app.campaignBattle?.state === app.state && app.campaignBattle.id === done.setup.id
      ? app.campaignBattle.before : null;
    const aftermath = campaignBattleAftermath(app.state, done.setup, done.result, before);
    app.lastCampaignBattle = { state: app.state, id: done.setup.id, aftermath };
    app.campaignBattle = null;
    app.battle = null;
    app.paused = true;
    app.screen = 'play';
    frame.dataset.screen = 'play';
    app.map.setVisible(true);
    app.map.setTerritoryVisible(app.settings.territoryMap);
    app.map.refreshLands(true);
    app.rulerSet = new Set(Object.values(app.state.factions).map(faction => faction.ruler));
    app.minimap?.refresh();
    app.minimap?.draw();
    app.sound.theme('realm');
    app.dialogs.open('battleResult', { ...done, aftermath });
    app.hud.refresh(true);
  },
  returnFromBattle(done, action = null) {
    const settled = app.lastCampaignBattle;
    if (!settled || settled.state !== app.state || settled.id !== done.setup.id) return;
    app.paused = true;
    app.setMode(null);
    app.map.showRoute(null);
    // Apply the strategic destination after the result is confirmed. The 3D
    // battlefield may finish its own camera glide while this sheet is open.
    const target = campaignAftermathView(app.state, settled.aftermath, action);
    app.select(target.selection);
    if (target.camera) app.map.rig.jumpTo(target.camera.x, target.camera.z, target.camera.d);
    app.dialogs.close(true);
    app.hud.refresh(true);
    app.coach?.refreshFirst();
    // Losing the final town may settle the campaign during finishBattle. Do
    // not require an extra running world day to reveal an existing ending.
    if (app.state.over && !app.endingShown) {
      app.endingShown = true;
      app.sound.play(app.state.over.kind === 'fallen' ? 'gong' : 'win');
      app.dialogs.open('ending');
    }
  },
  afterDialog() {
    app.hud?.refresh(true);
    setTimeout(nextInbox, 0);
  }
};

let nanpiResult=null,nanpiView=null,labRouter=null;
function closeNanpiView(){nanpiView?.destroy();nanpiView=null;}
function getLabRouter(){return labRouter??=createNativeBattleLabRouter(app,{onError:error=>{console.error(error);if(app.screen==='title'){app.notice=t('battleLabFailed');app.nativeTitle?.showTitle();}else app.hud.toast(t('battleLabFailed'),'bad');}});}
function openNanpiTrial(){
  if(app.lab||app.battle||getLabRouter().loading||(app.screen!=='title'&&!nanpiResult))return;
  app.destinationPicker?.cancel();
  const {state,setup}=createNanpiTrial();closeNanpiView();nanpiResult=null;
  app.dialogs.close(true);app.nativeTitle?.close();app.screen='battle';frame.dataset.screen='battle';
  app.map.setDrift(null);app.map.setTerritoryVisible(false);
  // Supply the native World3D presentation adapter after B4 scene markers are integrated.
  app.battle=startBattle(app,setup,{state,onTrialExit:leaveNanpi,onTrialResult:showNanpiResult});
}
function leaveNanpi(){closeNanpiView();nanpiResult=null;app.battle=null;toTitle(true,'title-nanpi');}
function showNanpiResult(done){
  app.battle=null;closeNanpiView();nanpiResult=done;
  nanpiView=createNativeNanpiResult(app.uiHost,done,{onReplay:()=>openBattleLab(done.tape),onRetry:openNanpiTrial,onExit:leaveNanpi});
}
function openBattleLab(tape=null){
  app.destinationPicker?.cancel();
  const trial=nanpiResult?.tape===tape&&tape!==null;
  return getLabRouter().open(tape,{trial,trialView:trial?nanpiView:null,tab:'replay',validate:()=>trial?nanpiResult?.tape===tape:!tape||app.dialogs.name==='battleResult'});
}

/** Native campaign dialogs own their lifecycle; the old battle layer remains until battle migration. */
function bridgeDialogs(native) {
  return {
    open(name,args) {
      const opened=native.open(name,args);
      if(opened){app.hud?.refresh(true);app.coach?.refreshFirst();}
      return opened;
    },
    close(force){return native.close(force);},
    render(){return native.render();}, update(dt){native.update(dt);},
    get name(){return native.name;},get blocking(){return native.blocking;},
    get nativeActive(){return Boolean(native.name);},get view(){return native.view;}
  };
}
function reportUiError(cause) {
  console.error(cause);
}
function focusNativeTitle(name) {
  // The engine opens the named page in its screen stack on the following commit.
  let attempts = 0;
  const restore = () => {
    if (app.nativeTitle?.view?.focus(name) || ++attempts > 12) return;
    setTimeout(restore, 16);
  };
  restore();
}

// ——— Booting the engine and the views ———
async function boot() {
  const canvas=document.createElement('canvas');canvas.id='stage';canvas.tabIndex=-1;
  $('#stageHost').replaceChildren(canvas);
  app.demoState = createGame({ seed: 184, faction: 'caocao', branch: 'free' });
  app.canvas = canvas;
  app.tapNode = tapNode;
  app.tapArmy = tapArmy;
  app.map = await createRealmView({
    canvas,
    uiParent: $('#stageHost'),
    getState: () => app.state ?? app.demoState,
    getPlayer: () => app.state?.player,
    showMapMarkers: () => !app.lab && !app.dialogOpen && !app.game?.asking && ['setup','play'].includes(app.screen),
    // Native same-clock 3D submission and contextual map-label pacing. Keep
    // independent diagnostic opt-outs for matched comparisons.
    performanceOptions:{defer3d:params.get('perfDefer')!=='0',textBudget:params.get('perfText')!=='0',measure:params.get('perfMeasure')==='1',textBudgetWhen:()=>campaignMarkerTextContext(app),terrainWorker:params.get('perfTerrainWorker')!=='0',prepareGeometry:params.get('perfPrepareGeometry')!=='0'},
    quality: params.get('quality') ?? (app.settings.quality && app.settings.quality !== 'auto' ? app.settings.quality : undefined),
    tick: (seconds) => tick(seconds),
    onError: (cause) => console.error(cause),
    on: {
      tapNode,
      tapArmy,
      tapGround: (hit) => app.battle?.tapGround?.(hit),
      hover(info) {
        app.hoverInfo = info;
        hoverChanged();
      },
      move(e) {
        mouse = { x: e.clientX, y: e.clientY };
        if (app.hoverInfo) app.hud.showTip(tipFor(app, app.hoverInfo), mouse.x, mouse.y);
      }
    }
  });
  app.quality = app.map.app.quality;
  app.uiHost = app.map.uiHost;
  app.game = app.uiHost.game;
  app.destinationPicker=createRealmDestinationPicker(app,{nodes:NODES,provinces:PROVINCES,placeName,language:getLanguage,onError:reportUiError});
  app.game.scope.use(app.destinationPicker);
  app.game.scope.use({dispose:watchReducedMotion(value=>{systemReducedMotion=value;app.map.setReducedMotion?.(app.calm());})});
  app.map.setReducedMotion?.(app.calm());
  // The low-level canvas host owns the game; report real remaining boot work in its native loading UI.
  $('#loading')?.remove();
  const recovery=app.game.scope.use(createMusicRecovery({game:app.game,getSound:()=>app.sound,
    enabled:()=>app.settings.music!==false,words:(zh,en)=>pair([zh,en]),onError:reportUiError}));
  [app.sound] = await app.game.loading([() => createSound(app.map.app.scope, app.settings,{onThemeFailure:recovery.failed})], {
    label: pair(['准备配乐与界面','Preparing sound and interface'])
  });
  app.hud = createNativeRealmHud(app, app.uiHost);
  const nativeDialogs = createNativeDialogs(app, {
    game: app.game, stack: app.uiHost.stack, paragraphCache: app.uiHost.paragraphCache, semantics: app.uiHost.semantics,
    viewport: () => app.game.safe, onError: reportUiError
  });
  app.dialogs = bridgeDialogs(nativeDialogs);
  app.nativeTitle = createNativeTitleScreens(app.game, {
    app, stack: app.uiHost.stack, paragraphCache: app.uiHost.paragraphCache, onError: reportUiError
  });
  app.topbar = createNativeTopbar(app, app.uiHost, { onGeometry() {
    app.minimap?.relayout();
    app.hud?.refresh();app.coach?.refreshFirst();
  } });
  app.minimap = createNativeMinimap(app, app.uiHost, { topbar:app.topbar });
  app.coach = createCampaignCoach(app, app.uiHost);
  app.hints=app.game.hints([]);let hintKey='';
  app.updateHints=()=>{
    const active=app.screen==='play'&&!app.lab&&!app.dialogOpen&&!app.sel&&!app.coach.view&&!app.game.asking;
    const key=active?app.language()+':'+app.paused:'';
    if(key===hintKey)return;hintKey=key;
    app.hints.set(active?[{action:pair(['移动镜头','Camera']),key:'WASD',touch:pair(['拖动地图','Drag map'])},{action:pair(['缩放','Zoom']),key:'+ / −',touch:pair(['双指缩放','Pinch'])},{action:t(app.paused?'resume':'pause'),key:'Space'}]:[]);
  };
  const host=app.uiHost;
  host.addMapOcclusion(()=>{const m=app.minimap?.snapshot();return m?.visible?[m.box]:[];});
  host.addMapOcclusion(()=>app.hud.occlusionRects());
  host.addMapOcclusion(()=>app.coach.occlusionRects());
  host.addMapOcclusion(()=>{
    if(app.screen!=='setup')return [];
    const r=app.nativeTitle?.view?.visibleRect('painted-panel');
    if(!r)return [];
    const p=app.game.fromStage(r.x,r.y);return [{...p,width:r.width,height:r.height}];
  });
  const refreshHud=app.hud.refresh;
  app.hud.refresh=(...args)=>{
    const active=app.screen==='play'&&!app.lab;
    app.topbar.setVisible(active);
    app.minimap.setVisible(active);
    if(active)app.topbar.refresh(...args);
    refreshHud(...args);
    app.coach.refreshFirst();
    app.coach.refreshWait(app.state?activeSiegeWait(app.state):null);
    const inbox=app.state?.inbox??[];app.game.badges.set('campaign/inbox/story',inbox.filter(m=>m.kind==='story').length+app.tales.length);app.game.badges.set('campaign/inbox/envoy',inbox.filter(m=>m.kind==='envoy').length);
    app.game.badges.set('campaign/inbox/captive',inbox.filter(m=>m.kind==='captive').length);
  };
  const arrange = () => {
    const { width, height } = app.game.screen;
    app.stageSize = { width, height };
    nativeDialogs.resize?.();
  };
  arrange();
  app.uiHost.addLayout(arrange);
  // Who holds what changes the minimap's colours; the plates and flags follow the state each frame.
  const refreshLands = app.map.refreshLands;
  app.map.refreshLands = () => {
    refreshLands();
    app.minimap.refresh();
  };
  bindKeys();
  app.map.start();
  // Hidden, the world stops drawing and time stands still; shown again, both go on.
  // The engine's clock is paused too, so the first frame back does not count the time away (ENGINE-NOTES 7).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      app.map.app.stop();
    } else {
      app.map.app.start();
    }
  });
}

function tapArmy(id) {
  if(app.game?.asking)return;
  if (app.battle) return app.battle.tapArmy?.(id);
  if (app.screen !== 'play') return;
  const a = app.state.armies[id];
  if (app.mode?.kind === 'march' && a && a.faction !== app.state.player) return tapNode(a.link ? a.link.to : a.at);
  app.sound.play('tap');
  app.select({ army: id });
}

// ——— Taps on the map ———
function tapNode(id) {
  if(app.game?.asking)return;
  if (app.battle) return app.battle.tapNode?.(id);
  // On setup, a tap chooses a founding city or the power that already holds it.
  if (app.screen === 'setup') {
    if (app.pickCustomTown?.(id)) return;
    const owner = app.demoState.nodes[id].owner;
    if (owner) app.pickFaction?.(owner);
    return;
  }
  if (app.screen !== 'play') return;
  if (app.mode?.kind === 'march') {
    const armyId = app.mode.army;
    const r = order(app.state, armyId, id);
    if (r.ok) {
      app.sound.play('march');
      const ordered = r.days ? t('marchOrdered', { place: placeName(id), days: r.days }) : t('marchLater', { place: placeName(id) });
      const treaty = treatyAt(app.state, app.state.player, id);
      app.hud.toast(treaty ? ordered + ' · ' + t('marchTreatyNotice', { treaty }) : ordered);
      app.mode = null;
      app.map.showRoute(null);
      app.select({ army: armyId });
    } else app.hud.toast(t('why_' + r.why), 'bad');
    return;
  }
  app.sound.play('tap');
  app.select({ node: id });
}

let mouse = { x: 0, y: 0 };
function hoverChanged() {
  const info = app.hoverInfo;
  if (app.screen === 'battle') return app.hud.showTip(null);
  if (app.screen !== 'play') return app.hud.showTip(null);
  app.hud.showTip(tipFor(app, info), mouse.x, mouse.y);
  if (app.mode?.kind === 'march' && info?.node) {
    const a = app.state.armies[app.mode.army];
    const r = a && route(app.state, a, a.link ? a.link.to : a.at, info.node);
    app.map.showRoute(r ? [a.link ? a.link.to : a.at, ...r.path] : null);
  }
}

// ——— Keys (dragging, the wheel and two fingers belong to the realm view) ———
function bindKeys() {
  const keys=app.game.keys;
  const worldActive=()=>app.screen==='play'&&!app.dialogOpen&&!app.game.asking&&!app.lab&&!app.battle;
  // Arrow navigation belongs to a focused native sheet, and the world when no
  // sheet has focus. WASD and the campaign shortcuts are explicitly claimed.
  const sheetFocus=()=>Boolean(app.hud?.view?.focused||app.coach?.view?.focused||app.topbar?.snapshot()?.focus);
  for(const code of ['KeyA','KeyD','KeyW','KeyS','Equal','Minus','NumpadAdd','NumpadSubtract','KeyH','Digit1','Digit2','Digit3','Digit4','Digit5'])keys.claim(code,worldActive);
  for(const code of ['ArrowLeft','ArrowRight'])keys.claim(code,()=>worldActive()&&(!sheetFocus()||app.hud.view?.focused?.startsWith('realm-tab-')));
  for(const code of ['ArrowUp','ArrowDown','Space'])keys.claim(code,()=>worldActive()&&!sheetFocus());
  // The same native Play input snapshot drives battle and independent replay.
  // Native view focus consumes its own buttons; no separate window key listener.
  const combatActive=()=>!!(app.lab||app.battle)&&!app.game.asking&&(!app.dialogOpen||Boolean(app.lab));
  for(const code of ['Digit1','Digit2','Digit3','Digit4','Escape'])keys.claim(code,combatActive);
  for(const code of ['Space','Enter'])keys.claim(code,()=>combatActive()&&!app.battle?.nativeHud?.focus&&!app.battle?.view?.markers?.ownsFocus?.());

}
let panHold=0;
function realmKeys(dt){
  const keys=app.game?.keys;
  if(!keys||app.lab||app.dialogOpen||app.game.asking||app.screen!=='play'||app.battle){panHold=0;return;}
  if(keys.pressed('Escape')){if(app.mode)app.setMode(null);else if(app.sel)app.select(null);return;}
  if(keys.pressed('KeyH'))app.goHome();
  if(keys.pressed('Space'))app.setPaused(!app.paused);
  for(let i=1;i<=5;i++)if(keys.pressed('Digit'+i))app.setSpeed(i-1);
  if(keys.pressed('Equal','NumpadAdd'))app.map.zoomBy(1.25);
  if(keys.pressed('Minus','NumpadSubtract'))app.map.zoomBy(1/1.25);
  if(app.hud.view?.focused?.startsWith('realm-tab-')){if(keys.pressed('ArrowRight'))app.hud.stepTab(1);if(keys.pressed('ArrowLeft'))app.hud.stepTab(-1);if(!keys.down('KeyA','KeyD','KeyW','KeyS')){panHold=0;return;}}
  const x=Number(keys.down('KeyD','ArrowRight'))-Number(keys.down('KeyA','ArrowLeft'));
  const y=Number(keys.down('KeyS','ArrowDown'))-Number(keys.down('KeyW','ArrowUp'));
  if(x||y){if(!panHold){app.map.panBy(x*140,y*140);panHold=0.22;}else{panHold-=dt;if(panHold<=0){app.map.panBy(x*140,y*140);panHold=0.075;}}}
  else panHold=0;
}
// ——— Time ———
let acc = 0,
  sinceHud = 0;
function tick(dt) {
  app.frames = (app.frames ?? 0) + 1;
  app.dialogs?.update(dt);
  app.updateHints?.();
  if (frame.dataset.screen !== app.screen) frame.dataset.screen = app.screen;
  if(app.lab||app.battle){
    const controller=app.lab?.controller??app.battle,keys=app.game.keys;
    if(!app.game.asking)for(const code of ['Escape','Enter','Space','Digit1','Digit2','Digit3','Digit4','ArrowLeft','ArrowRight','Home','End'])if(keys.pressed(code))controller.key?.(code);
    // A key may have closed or replaced the active controller this update.
    if((app.lab?.controller??app.battle)===controller)controller.update(dt);
    return;
  }
  realmKeys(dt);
  if (app.screen === 'play' && app.state && !app.paused && !app.dialogOpen && !app.game.asking && (!app.state.over || app.watching)) {
    acc += dt * SPEEDS[app.speed];
    let steps = 0;
    while (acc >= 1 && steps < 12) {
      acc -= 1;
      steps++;
      if (!day()) {
        acc = 0;
        break;
      }
    }
  } else acc = Math.min(acc, 0.99);
  if (app.map) app.map.setDayShare(app.paused || app.dialogOpen ? 0 : acc);
  sinceHud += dt;
  if (sinceHud > 0.2 && (app.screen === 'play' || app.screen === 'battle')) {
    sinceHud = 0;
    if (app.screen === 'play') app.hud.refresh();
    if (app.screen === 'play') {
      app.coach?.refreshFirst();
      app.coach?.refreshWait(activeSiegeWait(app.state));
    }
    app.minimap?.draw();
  }
}

/** One day of the realm; false when something must be decided first. */
function day() {
  const s = app.state;
  const logBefore = s.log[0];
  const month = dateOf(s.day).month;
  // After the ending the realm may be watched on: the day moves on although the game is over.
  let went;
  if (s.over && app.watching) {
    const over = s.over;
    s.over = null;
    went = advance(s);
    s.over = over;
  } else went = advance(s);
  if (!went) {
    nextInbox();
    return false;
  }
  if (dateOf(s.day).month !== month) {
    autosave();
    app.rulerSet = new Set(Object.values(s.factions).map((f) => f.ruler));
  }
  newsSince(logBefore);
  app.minimap.refresh();
  if (s.over && !app.endingShown) {
    app.endingShown = true;
    app.setPaused(true);
    app.sound.play(s.over.kind === 'fallen' ? 'gong' : 'win');
    app.dialogs.open('ending');
    return false;
  }
  if (s.inbox.length || app.tales.length) {
    nextInbox();
    return !app.dialogOpen;
  }
  return true;
}

/** Notices for the lines of the log that concern the player. */
function newsSince(before) {
  const s = app.state;
  const fresh = [];
  for (const l of s.log) {
    if (l === before) break;
    fresh.push(l);
  }
  for (const l of fresh.reverse()) {
    const v = l.values ?? {};
    const mine = v.faction === s.player || v.from === s.player || v.to === s.player || v.enemy !== undefined || (v.general && s.generals[v.general]?.faction === s.player) || ['logTech', 'logWorkDone', 'logHunger', 'logUnrest', 'logAnswered', 'logDebutJoin'].includes(l.key);
    if (l.key === 'logStory') {
      // The player's own tale unrolls as a scroll; the rest of the age passes as a notice.
      const e = eventOf(v.event);
      if (e && e.branch === s.branch && !e.choices?.length) app.tales.push(v.event);
      else {
        app.sound.play('event');
        app.hud.toast(logLine(s, l), 'tale');
      }
      continue;
    }
    if (!mine) continue;
    if(['logDebutJoin','logGovernorFind'].includes(l.key))app.game.badges.set('campaign/officers',app.game.badges.count('campaign/officers')+1);
    if(['logGovernorFind','logWorkDone','logTech'].includes(l.key))app.game.badges.set('campaign/reports',app.game.badges.count('campaign/reports')+1);
    if (l.key === 'logTaken') app.sound.play(v.faction === s.player ? 'seal' : 'gong');
    else if (l.key === 'logWorkDone') app.sound.play('build');
    else if (l.key === 'logTech') app.sound.play('coin');
    else if (l.key === 'logFall' && v.faction !== s.player) app.sound.play('gong');
    app.hud.toast(logLine(s, l), v.from === s.player || l.key === 'logHunger' || l.key === 'logUnrest' || l.key === 'logRevolt' ? 'bad' : '');
  }
  if (fresh.some((l) => l.key === 'logTaken' || l.key === 'logRevolt' || l.key === 'logFall')) app.map.refreshLands();
}

/** Take the next thing from the inbox that waits for the player. */
function nextInbox() {
  const s = app.state;
  if (!s || app.dialogOpen || app.game?.asking || app.battle || app.screen !== 'play') return;
  const m = s.inbox.find((x) => x.blocks) ?? (app.tales.length ? null : s.inbox[0]);
  if (!m && app.tales.length) {
    app.sound.play('event');
    app.dialogs.open('story', { event: app.tales.shift(), told: true });
    return;
  }
  if (!m) return;
  if (m.kind === 'story') app.dialogs.open('story', { event: m.event });
  else if (m.kind === 'battle') {
    app.sound.play('horn');
    app.dialogs.open('battle', { setup: m.setup });
  } else if (m.kind === 'envoy') app.dialogs.open('envoy', { message: m });
  else if (m.kind === 'captive') {
    if (s.generals[m.general]?.status !== 'captive' || s.generals[m.general].captor !== s.player) {
      s.inbox = s.inbox.filter((x) => x !== m);
      return nextInbox();
    }
    app.dialogs.open('captive', { general: m.general });
  } else s.inbox = s.inbox.filter((x) => x !== m);
}

// ——— What the player does ———
function act(kind, ...args) {
  const s = app.state;
  const P = s?.player;
  const say = (r, okText, sound = 'tap') => {
    if (r?.why) {
      app.hud.toast(t('why_' + r.why), 'bad');
      return false;
    }
    if (okText) app.hud.toast(okText);
    if (sound) app.sound.play(sound);
    return true;
  };
  const dropInbox = (pred) => (s.inbox = s.inbox.filter((m) => !pred(m)));
  let r;
  switch (kind) {
    case 'work':
      r = startWork(s, P, args[0], args[1]);
      say(r, null, 'build');
      break;
    case 'recruit':
      r = recruit(s, P, args[0], args[1]);
      say(r, r.ok ? t('recruited', { n: r.got }) : null, 'drum');
      break;
    case 'governorRecruit':
      r = setGovernorRecruitment(s, P, args[0], args[1]);
      say(r, t(args[1] ? 'governorRecruitStarted' : 'governorRecruitStopped'), 'seal');
      break;
    case 'governorDuty':
      r = setGovernorDuty(s, P, args[0], args[1], args[2]);
      say(r, t(args[2] ? 'governorDutyStarted' : 'governorDutyStopped'), 'seal');
      break;
    case 'muster': {
      r = muster(s, P, args[0], { ...args[1], attack: Boolean(args[1].target) });
      if (say(r, null, 'march')) {
        app.dialogs.close(true);
        app.select({ army: r.army });
        if (!args[1].target) app.setMode({ kind: 'march', army: r.army });
        else {
          const a = s.armies[r.army];
          app.hud.toast(a?.path.length ? t('marchOrdered', { place: placeName(args[1].target), days: route(s, a, a.at, args[1].target)?.days ?? '?' }) : t('why_noWay'), a?.path.length ? '' : 'bad');
        }
      }
      break;
    }
    case 'search': {
      r = searchCity(s, P, args[0], args[1]);
      if (say(r, null, 'open')) {
        app.dialogs.close(true);
        const found = r.found.map((x) => (x.general ? generalName(x.general) : nm(TREASURES[x.treasure])));
        app.hud.toast(found.length ? t('found', { what: found.join(getLanguage() === 'en' ? ', ' : '、') }) : t('foundNothing'), found.length ? 'good' : '');
        if (found.length) app.sound.play('coin');
      }
      break;
    }
    case 'persuade': {
      const [by, target, captive] = args;
      r = persuade(s, P, by, target);
      if (r.why) say(r);
      else {
        app.sound.play(r.joined ? 'win' : 'close');
        app.hud.toast(r.joined ? t('joined', { name: generalName(target) }) : t('notJoined', { name: generalName(target) }), r.joined ? 'good' : '');
        if (r.joined || captive) dropInbox((m) => m.kind === 'captive' && m.general === target);
        app.dialogs.close(true);
      }
      break;
    }
    case 'moveGeneral':
      r = moveGeneral(s, P, args[0], args[1]);
      if (say(r, t('movedTo', { name: generalName(args[0]), place: placeName(args[1]) }))) app.dialogs.close(true);
      break;
    case 'transfer':
      r = transfer(s, P, args[0], args[1], args[2]);
      if (say(r, r.ok ? t('moved', { n: r.moved }) : null, 'drum')) app.dialogs.close(true);
      break;
    case 'give':
      r = giveTreasure(s, P, args[0], args[1]);
      say(r, null, 'coin');
      break;
    case 'release':
      release(s, args[0]);
      dropInbox((m) => m.kind === 'captive' && m.general === args[0]);
      app.hud.toast(t('released', { name: generalName(args[0]) }));
      app.dialogs.close(true);
      break;
    case 'execute':
      die(s, args[0], 'executed');
      dropInbox((m) => m.kind === 'captive' && m.general === args[0]);
      app.sound.play('gong');
      app.hud.toast(t('logExecuted', { general: generalName(args[0]) }), 'bad');
      app.dialogs.close(true);
      break;
    case 'keepCaptive':
      dropInbox((m) => m.kind === 'captive' && m.general === args[0]);
      app.dialogs.close(true);
      break;
    case 'return': {
      const a = s.armies[args[0]];
      const home = a && (s.nodes[a.home]?.owner === P ? a.home : nearestFriendly(s, P, a.link ? a.link.to : a.at));
      r = home ? order(s, args[0], home) : { why: 'noWay' };
      say(r, r.ok ? t('marchOrdered', { place: placeName(home), days: r.days ?? '?' }) : null, 'march');
      break;
    }
    case 'disband': {
      const at = s.armies[args[0]]?.at;
      r = disband(s, args[0]);
      if (say(r, null, 'drum')) app.select({ node: at });
      break;
    }
    case 'gift':
      r = gift(s, P, args[0], args[1]);
      say(r, r.ok ? t('giftDone', { n: r.by }) : null, 'coin');
      break;
    case 'propose':
      r = propose(s, P, args[0], args[1]);
      if (!r.why) {
        app.hud.toast(r.accepted ? t('accepted') : t('refused'), r.accepted ? 'good' : 'bad');
        app.sound.play(r.accepted ? 'seal' : 'close');
      } else say(r);
      break;
    case 'breakTreaty':
      r = breakTreaty(s, P, args[0]);
      say(r, t('treatyBroken'), 'gong');
      break;
    case 'demand':
      r = demandSurrender(s, P, args[0]);
      if (!r.why) {
        app.hud.toast(r.accepted ? t('submitted', { faction: factionName(s, args[0]) }) : t('refused'), r.accepted ? 'good' : 'bad');
        app.sound.play(r.accepted ? 'win' : 'close');
        if (r.accepted) app.map.refreshLands(true);
      } else say(r);
      break;
    case 'askAttack':
      r = askAttack(s, P, args[0], args[1]);
      say(r, t('askSent'));
      break;
    case 'study':
      r = study(s, P, args[0]);
      say(r, null, 'coin');
      break;
    case 'tax':
      s.factions[P].tax = args[0];
      app.sound.play('tap');
      break;
    case 'talentOrder':
      r = issueTalentOrder(s, P);
      say(r, t('talentActive'), 'seal');
      break;
    case 'told':
      app.dialogs.close(true);
      break;
    case 'story':
      answerStory(s, args[0], args[1]);
      app.sound.play('seal');
      app.dialogs.close(true);
      app.map.refreshLands(true);
      break;
    case 'envoy':
      answerEnvoy(s, args[0], args[1]);
      app.sound.play(args[1] ? 'seal' : 'close');
      app.dialogs.close(true);
      break;
    case 'entrust': {
      const setup = campaignBattlePresentation(s, args[0]);
      if (app.lastCampaignBattle?.state === s && app.lastCampaignBattle.id === setup.id) break;
      app.campaignBattle = { state: s, id: setup.id, before: captureCampaignBattle(s, setup) };
      const { result, tape, report } = recordedAutoBattle(setup, s);
      app.dialogs.close(true);
      app.sound.play(result.winner === setup.factions.indexOf(P) ? 'win' : 'lose');
      finishBattle(s, setup, result);
      app.endBattle({ setup, result, tape, report });
      break;
    }
    case 'saveSlot':
      saveSlot(args[0]);
      break;
  }
  if (app.dialogs.name && !['story', 'battle', 'battleResult', 'ending'].includes(app.dialogs.name)) app.dialogs.render();
  app.hud.refresh(true);
  return r;
}

// ——— Saves ———
function autosave() {
  if (!app.state || app.state.over) return;
  if (!writeSlot(slots.auto, app.state, power(app.state, app.state.player).cities, captureCampaignView(app))) {
    if (!app.saveWarned) app.hud.toast(t('saveRefused'), 'bad');
    app.saveWarned = true;
  } else progress.saved(app.state);
}
function saveSlot(slot, confirmed = false) {
  if (!app.state || slot === 'auto' || !slots[slot]) return;
  const previous = slots[slot].data.game;
  if (!confirmed && previous && JSON.stringify(previous) !== JSON.stringify(app.state)) {
    void app.confirmAction(pair(['覆盖存档位 ','Replace save slot '])+slot+pair(['？其他档位不会受影响。','? Other slots are unchanged.']),()=>saveSlot(slot,true));
    return;
  }
  if (writeSlot(slots[slot], app.state, power(app.state, app.state.player).cities, captureCampaignView(app))) {
    progress.saved(app.state);
    app.hud.toast(t('saved'));
  } else app.hud.toast(t('saveRefused'), 'bad');
  app.sound.play('seal');
  if (confirmed) app.open('saves');
}
function loadSlot(slot, confirmed = false) {
  const saved = slots[slot]?.data;
  const game = saved?.game;
  if (!game) return;
  if (!confirmed && progress.changed(app.state)) {
    app.open('confirmProgress', { reason: 'leave', backToSaves: true, proceed: () => loadSlot(slot, true) });
    return;
  }
  app.dialogs.close(true);
  // Loading itself never writes the autosave. The next ordinary monthly save
  // only happens if the restored running/paused state allows time to advance.
  play(JSON.parse(JSON.stringify(game)), saved.view);
}

// ——— Screens ———
function newGame(pick) {
  const state = createGame({ ...pick, seed: Number(params.get('seed') ?? Date.now() % 1000000) });
  play(state, { paused: true, firstMonth: { day: state.day, dismissed: false } });
  // Events of the player's tale that open the game unroll at once.
  for (const l of state.log.slice().reverse()) {
    const e = l.key === 'logStory' && eventOf(l.values.event);
    if (e && e.branch === state.branch && !e.choices?.length) app.tales.push(e.id);
  }
  autosave();
}
function play(state, savedView = null) {
  app.destinationPicker?.cancel();
  const resume = restoreCampaignView(state, savedView);
  wake();
  app.map.setDrift(null);
  registerCustom(state);
  app.state = state;
  app.game.badges.clear('campaign');
  app.lastOwnedCity = resume.lastOwnedCity;
  app.firstMonth = resume.firstMonth;
  app.tales = [];
  app.rulerSet = new Set(Object.values(state.factions).map((f) => f.ruler));
  app.endingShown = Boolean(state.over);
  app.watching = false;
  app.screen = 'play';
  frame.dataset.screen = 'play';
  app.nativeTitle?.close();

  app.select(resume.selection);
  app.mode = null;
  app.map.showRoute(null);
  app.map.refreshLands(true);
  // Saved campaigns can reuse the same city, army and custom faction IDs with different names and banners.
  app.map.redraw();
  app.map.setTerritoryVisible(app.settings.territoryMap);
  if (resume.camera) app.map.rig.jumpTo(resume.camera.x, resume.camera.z, resume.camera.d);
  else app.map.jumpTo(resume.lastOwnedCity ?? state.factions[state.player].capital, app.stageSize.width < app.stageSize.height ? 48 : 52);
  app.paused = resume.paused;
  if (resume.speed !== null) app.speed = resume.speed;
  progress.saved(state);
  app.hud.refresh(true);
  app.coach?.refreshFirst();
  app.coach?.refreshWait(activeSiegeWait(state));
  app.sound.theme('realm');
  setTimeout(nextInbox, 300);
}
function toTitle(confirmed = false, focusName = null) {
  app.destinationPicker?.cancel();
  if (!confirmed && app.state && !app.state.over && progress.changed(app.state)) {
    app.open('confirmProgress', { reason: 'leave', proceed: () => toTitle(true,focusName) });
    return;
  }
  app.lab?.close();
  closeNanpiView();nanpiResult=null;
  app.dialogs.close(true);
  if (app.battle) app.battle = null;
  app.state = null;
  app.firstMonth = null;
  progress.clear();
  if (app.demoState?.scenario !== '184') app.demoState = createGame({ seed: 184 });
  app.screen = 'title';
  app.coach?.refreshFirst();
  app.coach?.refreshWait(null);
  frame.dataset.screen = 'title';

  app.topbar?.setVisible(false);
  app.minimap?.setVisible?.(false);
  app.select(null);
  app.map.setVisible(true);
  app.map.setTerritoryVisible(false);
  app.map.refreshLands(true);
  app.map.jumpTo('luoyang', 95);
  // The view drifts slowly over the land, unless motion is to be kept down.
  app.map.setDrift(app.calm() ? null : { speed: 2.2, from: NODES.luoyang.x - 160, to: NODES.luoyang.x + 260 });
  app.nativeTitle?.showTitle(focusName);
  app.sound.theme('title');
}
/** Kept for callers from before the realm was 3D: the 3D view always draws. */
function wake() {}

try {
  await boot();
} catch (cause) {
  reportUiError(cause);
  app.screen = 'error';
  if (app.game) {
    app.game.show({
      label: pair(['载入失败','Loading failed']), modal: true,
      root: { type:'panel',anchor:'center',width:'90%',height:160,layout:'column',
        padding:12,gap:8,color:0x18272a,
        children:[
          {type:'text',text:pair(['载入失败，请重试。','Loading failed. Please retry.']),height:38,size:22},
          {type:'button',name:'retry',text:pair(['重新载入','Reload']),height:48}
        ] }
      },{bind:{retry:{tap:()=>location.reload()}}});
  } else {
    const loading = $('#loading');
    if (loading) loading.textContent = pair(['载入失败，请刷新后重试。','Loading failed. Reload to retry.']);
  }
}
document.title = t('title');
if (app.screen !== 'error') $('#loading')?.remove();
if (app.screen === 'error') { /* Keep the retry screen available. */ }
else if (params.get('slot') && slots[params.get('slot')]?.data.game) loadSlot(params.get('slot'));
else if (params.get('faction')) newGame({ faction: params.get('faction'), scenario: params.get('scenario') ?? '184',
  branch: params.get('branch') ?? 'free', lifespan: 'history', command: params.get('command') !== 'off', difficulty: 'normal' });
else {
  toTitle();
  if (params.get('screen') === 'setup') {
    app.screen = 'setup';
    app.nativeTitle?.showSetup(params.get('branch'));
  }
}

// For tests and for anyone curious, from the console.
window.egretGame = {
  app,
  get ui() { return app.uiHost?.tester; },
  get screen() {
    return app.screen;
  },
  get ready() {
    return app.screen !== 'loading' && app.screen !== 'error';
  },
  get state() {
    return app.state;
  },
  /** Move the realm on by days at once (stops at anything to decide). */
  days(n) {
    for (let i = 0; i < n; i++) if (!day()) break;
    app.hud.refresh(true);
    return app.state.day;
  },
  nodeAt(id) {
    const n = NODES[id];
    return app.map.pagePoint(n.x, n.y);
  },
  /** Bring a place into the middle of the view at once (for tests and the console). */
  look(id, d = 70) {
    app.map.jumpTo(id, d);
  },
  get frames() {
    return app.frames ?? 0;
  },
  get battle() {
    return app.battle;
  }
};
