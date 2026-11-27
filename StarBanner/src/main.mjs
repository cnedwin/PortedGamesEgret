// 页面入口：启动 3D 舞台、存档、声音和操作，在标题、出阵准备、战斗和战果之间切换。标题背后放着一局电脑对电脑的
// 战斗当背景。URL 参数：?quality=low|medium|high、?backend=webgpu、?lang=en、?seed=、?map=、?battle=（直接开打）。
// The page's entry: starts the 3D stage, the save, the sound and the input, and moves between the title, the
// preparation, the battle and the result. Behind the title a battle between two computer sides plays as a backdrop.
// URL parameters: ?quality=low|medium|high, ?backend=webgpu, ?lang=en, ?seed=, ?map=, ?battle= (straight into play).
import { browserSaveStorage } from '@egret/engine/web/kit';
import { createStage } from './view/stage.mjs';
import { startBattle } from './play.mjs';
import { createScreens } from './screens.mjs';
import { createInput } from './input.mjs';
import { createSound } from './audio/sound.mjs';
import { openSave, settingsOf, recordBattle, battleIsWhole, campaignProgressOf, campaignChapterUnlocked, campaignBattleOf, keepCampaignBattle, recordCampaignResult } from './saves.mjs';
import { setLanguage, getLanguage, t } from './i18n.mjs';
import { MAPS } from './sim/maps.mjs';
import { campaignChapter, campaignSetup } from './sim/campaign.mjs';
import { cloneGame } from './sim/rules.mjs';
import { loadProblems } from './view/assets.mjs';
import { createInterfaceHost } from './ui/host.mjs';
import { createKit } from './ui/kit.mjs';

const params = new URLSearchParams(location.search);
const canvas = document.querySelector('#stage');
const systemReduced = () => getComputedStyle(document.documentElement).getPropertyValue('--reduce-motion').trim()==='1';
const startup={module:performance.now()};

// ---- the save ----
const problems = [];
const save = openSave(browserSaveStorage(), navigator.language?.startsWith('zh') ? 'zh' : 'en', (p) => problems.push(p.kind));
const settings = settingsOf(save.data);
setLanguage(params.get('lang') ?? settings.language);
function showLanguage() {
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  document.title = t('pageTitle');
  canvas.setAttribute('aria-label', t('canvas'));
}
showLanguage();

const quiet = { play() {}, music() {}, setSound() {}, setMusic() {} };
const app = {
  stage: null,
  ui: null,
  canvas,
  settings,
  sound: quiet,
  touch: params.has('touch') || navigator.maxTouchPoints>0,
  reducedMotion: settings.reducedMotion || systemReduced(),
  notice: problems.some((k) => k !== 'write-failed') ? t('saveReset') : null,
  library: null,
  battle: null,
  screens: null,
  setSetting(key, value) {
    settings[key] = value;
    const kept = save.update((d) => void (d.settings = { ...settings }));
    if (!kept) app.notice = t('saveRefused');
    if (key === 'sound') app.sound.setSound(value);
    if (key === 'music') app.sound.setMusic(value);
    if (key === 'reducedMotion') app.reducedMotion = value || systemReduced();
  },
  switchLanguage() {
    setLanguage(getLanguage() === 'zh' ? 'en' : 'zh');
    app.setSetting('language', getLanguage());
    showLanguage();
    // Preserve the battle, screen stack and active dialog during a language change.
    app.ui.overlay.canvas.setAttribute('aria-label',t('canvas'));
    if (app.battle && !app.battle.attract) app.battle.relabel();
    return app.screens.relabel();
  },
  record: () => save.data.record ?? { won: 0, lost: 0 },
  hasBattle: () => battleIsWhole(save.data.battle),
  lastSetup: () => ({ map: 'wheat', you: 'seline', foe: 'garron', level: 'normal', first: true, fog: false, ...(save.data.lastSetup ?? {}) }),
  campaignProgress: () => campaignProgressOf(save.data),
  campaignBattle: () => campaignBattleOf(save.data),
  campaignUnlocked: (id) => campaignChapterUnlocked(save.data, id),
  keepBattle(kept) {
    save.update((d) => {
      if (kept.setup.campaign) keepCampaignBattle(d, kept);
      else d.battle = kept;
    });
  },
  async finishBattle({ won, why, game, setup }) {
    const chapter = campaignChapter(setup.campaign);
    save.update((d) => {
      if (chapter) recordCampaignResult(d, chapter.id, won);
      else recordBattle(d, setup.map, won);
    });
    await new Promise((r) => setTimeout(r, 900));
    app.screens.result({ won, why, game, human: setup.human, chapter });
  },
  overlay(name) {
    return name === 'help' ? app.screens.help() : app.screens.settings();
  },
  async startNew(choice) {
    save.update((d) => void (d.lastSetup = choice));
    const human = choice.first ? 0 : 1;
    const sides = [];
    sides[human] = { commander: choice.you, ai: false };
    sides[1 - human] = { commander: choice.foe, ai: true, level: choice.level };
    const setup = { map: choice.map, sides, human, seed: Number(params.get('seed') ?? Date.now() % 100000), fog: Boolean(choice.fog) };
    await play({ setup });
  },
  async resume() {
    const kept = save.data.battle;
    await play({ setup: kept.setup, saved: kept.game });
  },
  async startCampaign(id) {
    const setup = campaignSetup(id);
    if (!setup || !app.campaignUnlocked(id) || app.campaignBattle()) return;
    await play({ setup });
  },
  async resumeCampaign() {
    const kept = app.campaignBattle();
    if (kept) await play({ setup: kept.setup, saved: kept.game });
  },
  async toCampaign() {
    await app.toTitle();
    app.screens.campaign();
  },
  async toTitle() {
    await app.screens.closeAll();
    await backdrop();
    app.screens.title();
  }
};

// ---- the stage ----
let stage, ui;
try {
  // Both canvases have independent hosts; prepare the overlay and the 3D scene concurrently.
  [stage,ui]=await Promise.all([
    createStage(canvas,{quality:params.get('quality')??(settings.quality==='auto'?undefined:settings.quality),backend:params.get('backend')??'webgl2'}).then(value=>{startup.world=performance.now();return value;}),
    createInterfaceHost(canvas,{label:t('canvas')}).then(value=>{startup.overlay=performance.now();return value;})
  ]);
} catch (cause) {
  const error=document.querySelector('#fatal');error.textContent=t('fatal',{why:cause?.message??cause});error.hidden=false;
  throw cause;
}
stage.canvas = canvas;
app.stage = stage;
app.ui = ui;
app.screens = createScreens(ui, app);
const loading = createKit(ui,ui.game.stage,{prefix:'loading'});
const loadingNote = loading.label({text:t('loading'),x:0,y:0,width:240,height:50,size:20,weight:800,color:0xffffff,align:'center'});
const placeLoading=()=>{const {safe,unit}=ui.metrics();loadingNote.setRect({x:safe.x+(safe.width-240*unit)/2,y:safe.y+(safe.height-50*unit)/2,width:240*unit,height:50*unit});};
const stopLoadingLayout=ui.registerLayout(placeLoading);placeLoading();

// Sound starts with the first key or touch, as browsers ask.
const startSound = async () => {
  removeEventListener('pointerdown', startSound);
  removeEventListener('keydown', startSound);
  try {
    app.sound = await createSound(stage.app.scope, { sound: settings.sound, music: settings.music });
    const b = app.battle;
    app.sound.music(b && !b.attract ? (b.game.current === b.human ? 'dawn' : 'raven') : 'title');
  } catch (cause) {
    console.warn('sound', cause);
  }
};
addEventListener('pointerdown', startSound);
addEventListener('keydown', startSound);

/** When models failed to arrive: say so once, offer to load the page again, or play on with stand-in shapes. */
let toldProblems = false;
function tellLoadProblems() {
  if (toldProblems || !loadProblems.count) return;
  toldProblems = true;
  void app.screens.loadFailure(()=>location.reload(),()=>{});
}

async function play({ setup, saved = null, attract = false }) {
  await app.screens.closeAll();
  app.battle?.dispose();
  app.battle = null;
  const battle = await startBattle(app, { setup, saved, attract });
  battle.attract = attract;
  battle.human = setup.human;
  app.battle = battle;
  if (setup.campaign && !battle.game.over) app.keepBattle({ setup, game: cloneGame(battle.game) });
  if(!attract)tellLoadProblems();
  return battle;
}

/** The title's backdrop: two computer commanders on one of the maps. */
async function backdrop() {
  const map = params.get('map') ?? MAPS[Math.floor(Math.random() * MAPS.length)].id;
  await play({ setup: { map, sides: [{ commander: 'seline', ai: true, level: 'normal' }, { commander: 'vireta', ai: true, level: 'normal' }], human: -1, seed: 5 }, attract: true });
  app.sound.music('title');
}

// ---- input ----
const input = createInput(canvas, {
  frame: document.querySelector('#frame'),
  bridge: ui.overlay.canvas,
  on(command, detail) {
    if (app.screens.open) return void app.screens.command(command, detail);
    if (app.battle && !app.battle.attract) app.battle.command(command, detail);
    else if (command === 'confirm' || command === 'cancel' || command === 'menu') app.screens.title();
  },
  point: (x, y) => app.battle && !app.battle.attract && !app.screens.open && app.battle.point(x, y),
  tap: (x, y, detail) => app.battle && !app.battle.attract && !app.screens.open && app.battle.tap(x, y, detail),
  canNavigate: () => Boolean(app.battle && !app.battle.attract && !app.screens.open && app.battle.canNavigate),
  pan: (dx, dy) => stage.rig.panBy(-dx * 0.045 * (stage.rig.view.d / 60), dy * 0.045 * (stage.rig.view.d / 60)),
  zoom: (f, at) => at ? stage.rig.zoomAt(f, at[0], at[1], canvas.clientWidth, canvas.clientHeight) : stage.rig.zoomBy(f)
});

// ---- the frame ----
const status = { frames: 0, startup };
stage.app.show(stage.scene, stage.camera, {
  onUpdate(dt) {
    status.frames++;
    dt = Math.min(dt, 0.1);
    input.update(dt);
    if (app.battle) app.battle.update(dt);
    else stage.rig.update(dt);
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) input.release();
});

// ---- begin ----
const straight = params.get('battle');
if (straight) {
  await app.startNew({ ...app.lastSetup(), map: straight, ...(params.get('you') ? { you: params.get('you') } : {}), ...(params.get('foe') ? { foe: params.get('foe') } : {}) });
} else {
  await backdrop();
  startup.backdrop=performance.now();
  app.screens.title();
  await ui.ready();
  tellLoadProblems();
}
stopLoadingLayout();loading.dispose();await ui.ready();
startup.ready=performance.now();

// For tests and for anyone curious, from the console.
window.egretGame = {
  app,
  status,
  stage,
  ui,
  get battle() {
    return app.battle;
  },
  get screen() {
    return app.screens.open ? 'screen' : app.battle?.attract ? 'title' : 'battle';
  },
  ready: true
};
