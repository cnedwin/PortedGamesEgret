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
import { openSave, settingsOf, recordBattle, battleIsWhole } from './saves.mjs';
import { setLanguage, getLanguage, t } from './i18n.mjs';
import { MAPS } from './sim/maps.mjs';

const params = new URLSearchParams(location.search);
const canvas = document.querySelector('#stage');
const ui = document.querySelector('#ui');

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
  ui,
  canvas,
  settings,
  sound: quiet,
  touch: params.has('touch') || matchMedia('(pointer: coarse)').matches,
  reducedMotion: settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches,
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
    if (key === 'reducedMotion') app.reducedMotion = value || matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  switchLanguage() {
    setLanguage(getLanguage() === 'zh' ? 'en' : 'zh');
    app.setSetting('language', getLanguage());
    showLanguage();
    // A battle keeps going; the title is drawn again in the new language.
    if (app.battle && !app.battle.attract) return;
    app.screens.title();
  },
  record: () => save.data.record ?? { won: 0, lost: 0 },
  hasBattle: () => battleIsWhole(save.data.battle),
  lastSetup: () => ({ map: 'wheat', you: 'seline', foe: 'garron', level: 'normal', first: true, ...(save.data.lastSetup ?? {}) }),
  keepBattle(kept) {
    save.update((d) => void (d.battle = kept));
  },
  async finishBattle({ won, why, game, setup }) {
    save.update((d) => recordBattle(d, setup.map, won));
    await new Promise((r) => setTimeout(r, 900));
    app.screens.result({ won, why, game, human: setup.human });
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
    const setup = { map: choice.map, sides, human, seed: Number(params.get('seed') ?? Date.now() % 100000) };
    await play({ setup });
  },
  async resume() {
    const kept = save.data.battle;
    await play({ setup: kept.setup, saved: kept.game });
  },
  async toTitle() {
    app.screens.closeAll();
    await backdrop();
    app.screens.title();
  }
};

// ---- the stage ----
let stage;
try {
  stage = await createStage(canvas, { quality: params.get('quality') ?? (settings.quality === 'auto' ? undefined : settings.quality), backend: params.get('backend') ?? 'webgl2' });
} catch (cause) {
  document.querySelector('#loading').textContent = t('fatal', { why: cause?.message ?? cause });
  throw cause;
}
stage.canvas = canvas;
app.stage = stage;
app.screens = createScreens(ui, app);

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

async function play({ setup, saved = null, attract = false }) {
  app.screens.closeAll();
  app.battle?.dispose();
  app.battle = null;
  ui.classList.toggle('in-battle', !attract);
  const battle = await startBattle(app, { setup, saved, attract });
  battle.attract = attract;
  battle.human = setup.human;
  app.battle = battle;
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
  on(command, detail) {
    if (app.screens.open) return void app.screens.command(command);
    if (app.battle && !app.battle.attract) app.battle.command(command, detail);
    else if (command === 'confirm' || command === 'cancel' || command === 'menu') app.screens.title();
  },
  point: (x, y) => app.battle && !app.battle.attract && !app.screens.open && app.battle.point(x, y),
  tap: (x, y, b) => app.battle && !app.battle.attract && !app.screens.open && app.battle.tap(x, y, b),
  pan: (dx, dy) => stage.rig.panBy(-dx * 0.045 * (stage.rig.view.d / 60), dy * 0.045 * (stage.rig.view.d / 60)),
  zoom: (f) => stage.rig.zoomBy(f)
});

// ---- the frame ----
const status = { frames: 0 };
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
  app.screens.title();
}
document.querySelector('#loading')?.remove();

// For tests and for anyone curious, from the console.
window.egretGame = {
  app,
  status,
  stage,
  get battle() {
    return app.battle;
  },
  get screen() {
    return app.screens.open ? 'screen' : app.battle?.attract ? 'title' : 'battle';
  },
  ready: true
};
