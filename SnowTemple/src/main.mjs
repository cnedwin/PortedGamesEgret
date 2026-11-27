// Snow at the Mountain Temple: a top-down 3D action chapter from Water Margin. Lin Chong, spear in hand,
// goes up through the burnt fodder yard to the Mountain God's temple, where Lu Qian is waiting.
//
// Address options, for looking at one thing at a time:
//   ?auto        a rule-driven player takes the controls
//   ?at=yard | gate | boss | rage     begin further in
//   ?quality=low | mid | high         fix the picture quality for this visit
//   ?models=low | mid | high          fix the model detail for this visit
//   ?characters=original              compare the sculpted fallback bodies
//   ?tier=3      play this visit at a tier of the climb, whatever has been opened
//   ?mode=yard   with ?auto: hold the fodder yard instead of walking the chapter
//   ?seed=7      fix the dice (they are fixed anyway under ?auto)
//   ?lights=direct | tiled   leave fires without light of their own, or give it them, whatever the quality
//   ?noshadows   open with realtime shadows disabled
//   ?debug       show the state panel and the engine's performance readout (F3 toggles them)
import { createEngine } from '@egret/engine';
import { Scene3D, createPerspectiveCamera3D } from '@egret/engine/world3d';
import { createDynamicResolution3D, createWebGL2Renderer3D, createWorld3DHost, createWorld3DStats, createWorld3DView, startWorld3DLoop } from '@egret/engine/webgl2/world3d';
import { createAudio } from './audio.mjs';
import { DIALOGUE } from './dialogue.mjs';
import { captureTempleLoadout, createTempleReplay } from './chapter.mjs';
import { createHud } from './hud.mjs';
import { createSnowUiHost } from './ui/host.mjs';
import { createSnowBoot } from './ui/boot.mjs';
import { createSnowLocale, normalizeLanguage } from './i18n.mjs';
import { DEFAULT_KEYS, createInput } from './input.mjs';
import { createLessons } from './lessons.mjs';
import { openProgress, recordClear, recordStand } from './progress.mjs';
import { openSave, snowSaveStorage } from './saves.mjs';
import { PLACES } from './rules/arena.mjs';
import { begin, createGame, quiet, step } from './rules/game.mjs';
import { TIERS, grade, tierName } from './rules/tiers.mjs';
import { AFFIXES } from './rules/yard.mjs';
import { loadModels, loadStockCharacters } from './view/models.mjs';
import { loadCharacterGroup, loadOpeningCharacter } from './view/characters.mjs';
import { loadPropAtlas } from './view/prop-atlas.mjs';
import { createSnowLook } from './view/look.mjs';
import { createView } from './view/view.mjs';

const params = new URLSearchParams(location.search),
  canvas = document.querySelector('#stage'),
  status = { frames: 0, error: null };
let boot, uiHost, locale;
document.querySelector('#game').addEventListener('contextmenu', (event) => event.preventDefault());

function fail(cause) {
  status.error = cause;
  const message = /webgl/i.test(String(cause?.message ?? cause))
    ? (locale?.t('这台设备的浏览器不支持本游戏需要的 WebGL 2。请换一台较新的手机或电脑再试。', 'This browser does not support WebGL 2. Please try another device.') ?? '此浏览器不支持 WebGL 2。')
    : String(cause?.message ?? cause);
  if (boot) boot.failure(message, { onRetry: () => location.reload() });
  else {
    const box = document.querySelector('#error');
    box.hidden = false;
    box.textContent = message;
  }
  console.error(cause);
}

// Choices and progress are kept by the engine's save store in the page's storage. Where the page has none
// (a private window, a blocked site) they are kept in memory and last for this visit only.
const storage = snowSaveStorage(),
  settingsSave = openSave(storage, 'snow-temple-settings', { defaults: () => ({}) });
function loadSettings() {
  const defaults = { quality: 'auto', models: 'auto', particles: 'some', sound: 'on', lang: 'zh', keys: { ...DEFAULT_KEYS } },
    saved = settingsSave.data;
  return { ...defaults, ...saved, lang: normalizeLanguage(params.get('lang'), normalizeLanguage(saved.lang, defaults.lang)), keys: { ...DEFAULT_KEYS, ...(saved.keys ?? {}) }, ...(params.get('quality') ? { quality: params.get('quality') } : {}) };
}
const saveSettings = (settings) => settingsSave.save(settings);

// What each quality level means: drawing scale, shadow map, grass, ambient occlusion.
const LEVELS = {
  low: { ratio: 1, shadows: false, density: 0.35, ssao: false },
  mid: { ratio: 1.25, shadows: 1024, density: 0.7, ssao: false },
  high: { ratio: 1.75, shadows: 2048, density: 1, ssao: true }
};

async function main() {
  const settings = loadSettings(),
    coarse = matchMedia('(pointer: coarse)').matches,
    level = LEVELS[settings.quality] ?? (coarse ? LEVELS.mid : LEVELS.high);
  locale = createSnowLocale(settings.lang);
  function syncLanguage() {
    document.documentElement.lang = locale.lang === 'en' ? 'en' : 'zh-CN';
    document.title = locale.t('风雪山神庙', 'Snow at the Mountain Temple');
    canvas.setAttribute('aria-label', locale.t('风雪山神庙：俯视角动作游戏。', 'Snow at the Mountain Temple: top-down action game.'));
    uiHost?.syncLocale();
  }
  syncLanguage();
  uiHost = await createSnowUiHost(canvas, { locale, onError: fail });
  boot = createSnowBoot(uiHost, { locale });
  // Startup diagnostics can inspect the admitted native retry before World3D exists.
  window.__snowLoading = { ui: uiHost, status, get active() { return boot.active; } };
  const progress = (k, note) => boot.progress(k, note);

  progress(0.2, '点灯');
  const engine = await createEngine({ host: createWorld3DHost(canvas) }),
    scope = engine.createScope(),
    renderer = createWebGL2Renderer3D({ canvas, antialias: true, toneMapping: 'aces' });
  scope.use(renderer);
  const scene = new Scene3D(),
    camera = createPerspectiveCamera3D({ fov: 36, near: 0.5, far: 260 });
  scene.addChild(camera);
  const updateLook = createSnowLook(renderer, level.ssao);
  // The engine now fixes the directional-shadow receiver on Windows WebGL2.
  // Keep a manual switch for an otherwise identical shadows-off diagnostic.
  const shadowDiagnostic = params.has('noshadows');
  renderer.shadowsEnabled = !!level.shadows && !shadowDiagnostic;
  // Past the eight point lights every pixel is lit by, the renderer lights more by screen tile, and only
  // the pixels near them pay. That is where fire on the ground and burning men get their light, and the
  // flashes of a crowded fight; with nothing burning it costs nothing. The lowest quality keeps to the eight.
  const manyLights = { direct: false, tiled: true }[params.get('lights')] ?? level !== LEVELS.low;
  renderer.tiledLights = manyLights;

  progress(0.45, '栽松，铺雪');
  await new Promise((done) => setTimeout(done));
  const amount = { few: 0.5, some: 1, many: 1.6 }[settings.particles] ?? 1,
    // Model detail is its own choice; left to itself, a phone takes the light set.
    detail = ['low', 'mid', 'high'].includes(params.get('models') ?? settings.models) ? (params.get('models') ?? settings.models) : coarse ? 'low' : 'high';
  const loadExternal = params.get('characters') !== 'original';
  const roleScope = engine.createScope();
  const roleLifetime = new AbortController();
  const characterStatus = { level: detail, phase: loadExternal ? 'opening' : 'disabled', loaded: [], failures: {} };
  status.characters = characterStatus;
  let view, loop;
  scope.use({
    dispose() {
      roleLifetime.abort();
      if (['opening', 'waiting', 'loading'].includes(characterStatus.phase)) characterStatus.phase = 'cancelled';
      try {
        view?.disposeCharacters();
      } finally {
        roleScope.dispose();
      }
    }
  });
  function onPageHide(event) {
    if (event.persisted) return;
    removeEventListener('pagehide', onPageHide);
    loop?.dispose();
    try {
      scope.dispose();
    } finally {
      void uiHost.dispose().catch(console.error);
      void engine.dispose().catch(console.error);
    }
  }
  addEventListener('pagehide', onPageHide);

  let stock;
  const loadStock = () => (stock ??= loadStockCharacters(undefined, roleLifetime.signal));
  const opening = loadExternal ? loadOpeningCharacter(engine, roleScope, detail, roleLifetime.signal) : Promise.resolve(null);
  const firstStock = opening.then(first => first?.hero?.parts ? null : loadStock());
  const [models, loadedAtlas, firstBody, stockBodies] = await Promise.all([loadModels(detail), loadPropAtlas(detail), opening, firstStock]);
  roleLifetime.signal.throwIfAborted();
  const hero = firstBody?.hero;
  if (hero?.parts) characterStatus.loaded.push('hero');
  else if (hero?.error) characterStatus.failures.hero = hero.error;
  if (stockBodies) {
    if (loadExternal) models.hero = stockBodies.hero;
    else Object.assign(models, stockBodies);
  }
  if (loadExternal) characterStatus.phase = 'waiting';
  const propAtlas = loadedAtlas ? scope.use(loadedAtlas).maps : undefined;
  view = createView(scene, camera, models, {
    detail, characters: hero?.parts ? { hero: hero.parts } : undefined,
    reflect: level === LEVELS.high && !params.has('noreflect'), density: level.density, particles: amount, shadowSize: level.shadows || 1024, propAtlas, manyLights });

  let yardReady = !loadExternal, templeReady = !loadExternal;
  async function prepareCharacters(requested, signal) {
    let values = new Map();
    let groupError;
    try {
      const { group } = await loadCharacterGroup(engine, roleScope, detail, signal, {
        requested,
        available: firstBody?.available
      });
      values = new Map((await group.ready).map(({ value }) => [value.kind, value]));
    } catch (cause) {
      groupError = String(cause?.message ?? cause);
    }
    for (const kind of requested) {
      signal.throwIfAborted();
      const { parts, error } = values.get(kind) ?? {};
      let failure = error ?? groupError;
      if (parts) {
        try {
          const programs = [];
          for (const { mesh, material } of parts) {
            for (const item of Array.isArray(material) ? material : [material]) {
              programs.push({ mesh, material: item, fog: Boolean(scene.fog), environment: Boolean(scene.environment),
                receiveShadows: renderer.shadowsEnabled });
              if (renderer.shadowsEnabled) programs.push({ mesh, material: item, pass: 'shadow' });
            }
          }
          await renderer.preparePrograms(programs);
          // Give input and presentation a turn between role installations.
          await new Promise(resolve => requestAnimationFrame(resolve));
          signal.throwIfAborted();
          view.useCharacterBody(kind, parts);
          characterStatus.loaded.push(kind);
          continue;
        } catch (cause) {
          failure = String(cause?.message ?? cause);
        }
      }
      signal.throwIfAborted();
      characterStatus.failures[kind] = failure ?? 'Character is missing from the character index';
      const fallback = (await loadStock())[kind];
      signal.throwIfAborted();
      if (!fallback) throw Error('Missing stock character: ' + kind);
      models[kind] = fallback;
    }
  }

  async function startBackgroundCharacters() {
    const signal = roleLifetime.signal;
    if (signal.aborted) return;
    characterStatus.phase = 'loading';
    try {
      await prepareCharacters(['blade', 'shield', 'bow'], signal);
      yardReady = true;
      await prepareCharacters(['lu'], signal);
      templeReady = true;
      characterStatus.phase = 'ready';
    } catch (cause) {
      if (signal.aborted) return;
      characterStatus.phase = 'failed';
      characterStatus.failures.group = String(cause?.message ?? cause);
      fail(cause);
    }
  }
  progress(0.9, '请陆虞候入座');
  await new Promise((done) => setTimeout(done));

  const input = createInput(canvas, settings.keys, {
      // A focused native menu action owns its navigation/confirmation keys.
      // A world-focused canvas continues to receive the original combat keys.
      uiOwnsKey: event => event.target !== canvas && Boolean(uiHost.keyboard?.getSnapshot().focusedId) &&
        /^(?:Space|Enter|Tab|Arrow(?:Up|Down|Left|Right))$/.test(event.code)
    }),
    audio = createAudio();
  view.onFoley = (event) => audio.play(event);
  audio.setOn(settings.sound === 'on');
  // The pose the title is looked at in. Starting puts the player back at the chapter's entrance.
  const TITLE_POSE = { x: -0.2, z: 24.2, face: -2.65 },
    { progress: saved, save: saveProgress } = openProgress(storage);
  let game = createGame(),
    mode = 'title',
    clock = 0,
    carry = 0,
    pick = -1, // the lesson chosen from an open page, until the rules have taken it
    debug = params.has('debug');
  let displayedLanguage = locale.lang;
  const hud = await createHud(uiHost, input, settings, {
    locale,
    onSettings(next) {
      saveSettings(next);
      audio.setOn(next.sound === 'on');
      locale.set(next.lang);
      syncLanguage();
      if (displayedLanguage !== locale.lang) {
        displayedLanguage = locale.lang;
        hud.setLanguage();
      }
    },
    onUiSound: (cue) => audio.playUi(cue),
    onStart: (way) => mode === 'title' && !hud.settingsOpen() && startGame(way === 'yard' ? 'yard' : ''),
    onTier(step) {
      saved.tier = Math.max(1, Math.min(saved.open, saved.tier + step));
      saveProgress();
      hud.entry(saved);
      audio.playUi('select');
    },
    onPick: (index) => (pick = index),
    onReplay: (replay) => mode === 'result' && startGame(replay)
  });
  input.setEnabled(false);
  hud.entry(saved);
  // The engine's readout: frame time, this game's share of it, and what the renderer drew. The numbers are
  // gathered either way; they are shown with the state panel.
  let stats = createWorld3DStats(renderer);
  input.on('any', (code, event) => {
    if (hud.handleKey(code, event)) return;
    if (code !== 'F3' || hud.settingsOpen() || Object.values(input.keys).includes(code)) return;
    event?.preventDefault();
    debug = !debug;
    stats.dispose();
    stats = createWorld3DStats(renderer);
  });
  const bot = params.has('auto') ? (await import('../test/bot.mjs')).createBot() : null;

  // ---- staged moments -----------------------------------------------------------------------
  const lerp3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k),
    smooth = (k) => k * k * (3 - 2 * k);
  const SHOTS = {
    // Start on Lin Chong's face, orbit outside the spear, then rise into the road camera.
    open: () => (k, { hero }) => {
      const side = 0.58;
      const close = [hero.x - 1.9, 2.04, hero.z - 3.25],
        shoulder = [hero.x - 3.95, 2.68, hero.z + 1.45],
        road = [hero.x - 2.5, 4.1, hero.z + 7],
        focus = [hero.x, 1.53, hero.z],
        trail = [hero.x, 1.25, hero.z - 3.5];
      return {
        eye: k < side ? lerp3(close, shoulder, smooth(Math.max(0, (k - 0.12) / (side - 0.12)))) : lerp3(shoulder, road, smooth((k - side) / (1 - side))),
        look: lerp3(focus, trail, smooth(k))
      };
    },
    // Along the forecourt to Lu Qian.
    meet: () => (k, { boss }) => ({
      eye: lerp3([boss.x + 4.5, 2.9, boss.z + 7.7], [boss.x + 2.4, 2.15, boss.z + 4.3], smooth(Math.min(1, k * 1.24))),
      look: [boss.x, 1.67, boss.z + 0.15]
    }),
    rage: () => (k, g) => ({ eye: [g.boss.x - 3 + k * 2, 2.2 + k, g.boss.z + 6.5], look: [g.boss.x, 1.6, g.boss.z] }),
    end: () => (k, g) => ({ eye: lerp3([g.hero.x + 4, 3, g.hero.z + 7], [g.hero.x + 10, 16, g.hero.z + 20], smooth(k)), look: [g.hero.x, 1.2, g.hero.z - k * 6] })
  };
  const LINES = {
    open: [[0.28, 'lin-opening']],
    meet: [[0.08, 'lu-meet'], [3.0, 'lu-demand']],
    rage: [[0.36, 'lu-rage']],
    end: [[0.62, 'lu-end']]
  };
  let pending = [],
    titleCardAt = Infinity,
    veilAt = Infinity,
    pendingHint = null,
    lesson = createLessons({ structured: true }),
    summary,
    templeLoadout,
    quickMeet = false;
  const freshSummary = () => ({ time: 0, parries: 0, ripostes: 0, falls: 0, hurts: 0, kills: 0 });
  // A full walk of the chapter by the player's own hands counts for the climb; a look at one part does not.
  let counted = false,
    duelOnly = false;
  const dice = () => (bot || params.get('seed') ? Number(params.get('seed') ?? 7) : (Math.random() * 2 ** 31) | 0);

  function speak(id) {
    const line = DIALOGUE[id];
    hud.say(line.text, line.who, line.seconds + 0.19);
    audio.speak(id);
  }

  function stage(id, time) {
    view.stage(time, SHOTS[id](), id === 'open' || id === 'meet');
    hud.stage(true);
    pending = LINES[id].map(([at, cue]) => ({ at: game.time + at, cue }));
    if (id === 'open') titleCardAt = game.time + 1.15;
  }

  /** Begin a run. `replay` says which: the chapter (again, or a tier higher), the duel alone, or the yard stand. */
  function startGame(replay = '') {
    if (replay === 'title') return toTitle();
    quickMeet = duelOnly = replay === 'temple';
    const yard = replay === 'yard' || (!replay && params.get('mode') === 'yard');
    if (replay === 'climb') {
      saved.tier = Math.min(saved.open, game.tier + 1);
      saveProgress();
    }
    const at = replay ? '' : params.get('at');
    // The yard is always held under the first tier's rules, so the farthest wave means the same every time.
    game = quickMeet ? createTempleReplay(templeLoadout, dice()) : createGame(dice(), yard ? { mode: 'yard' } : { tier: Number(params.get('tier')) || saved.tier });
    counted = !quickMeet && !yard && !at && !bot && !params.get('tier');
    pick = -1;
    hud.closeChoice();
    mode = 'play';
    summary = freshSummary();
    if (!quickMeet) templeLoadout = null;
    lesson = createLessons({ structured: true });
    carry = 0;
    pending = [];
    pendingHint = null;
    titleCardAt = veilAt = Infinity;
    hud.hideResult();
    hud.setMode(mode);
    input.setEnabled(true);
    audio.start();
    audio.stopDialogue();
    if (!yard) audio.prepareDialogue(...(quickMeet ? ['lu-rage', 'lu-end'] : ['lin-opening', 'lin-yard', 'lin-wave']));
    audio.setPaused(false);
    audio.setMood(yard ? 'yard' : quickMeet ? 'gate' : 'title');
    audio.playUi(replay ? 'confirm' : 'start');
    hud.hideTitle();
    hud.stage(false);
    hud.clearSpeech();
    hud.clearPickups();
    hud.clearHint();
    hud.veil(false);
    view.resetRound(game);
    canvas.focus({ preventScroll: true });
    if (yard) hud.card('守草料场', '一拨接一拨，倒下为止', 1.8);
    else if (at) {
      jump(at);
      audio.setMood(at === 'yard' ? 'yard' : 'gate');
    }
    else if (!quickMeet) {
      begin(game);
      game.events.forEach(onEvent);
    }
  }

  /** Back to the title, with whatever the last run opened. */
  function toTitle() {
    mode = 'title';
    game = createGame();
    Object.assign(game.hero, TITLE_POSE);
    hud.hideResult();
    hud.setMode(mode);
    input.setEnabled(false);
    hud.stage(false);
    hud.clearSpeech();
    hud.clearPickups();
    hud.clearHint();
    hud.closeChoice();
    hud.veil(false);
    view.resetRound(game);
    hud.entry(saved);
    hud.showTitle();
    audio.stopDialogue();
    audio.setMood('title');
    audio.playUi('back');
  }

  /** The closing sheet: of the chapter with its mark, or of a stand in the yard with the wave reached. */
  function showResult() {
    const yard = game.mode === 'yard';
    mode = 'result';
    input.setEnabled(false);
    hud.setMode(mode);
    hud.clearSpeech();
    hud.clearHint();
    hud.closeChoice();
    hud.veil(false);
    const seconds = Math.floor(summary.time);
    const data = {
      heading: yard ? '守草料场' : '风雪山神庙',
      time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
      parries: summary.parries, ripostes: summary.ripostes,
      lastName: yard ? '击倒' : '倒地', last: yard ? summary.kills : summary.falls,
      mark: null, news: '', actions: []
    };
    const marked = !yard && !duelOnly;
    if (yard) {
      data.line = `守到第 ${game.wave} 拨`;
      if (!bot && recordStand(saved, game.wave)) data.news = '这是守得最久的一回。';
    } else {
      data.line = game.tier > 1 ? `第一回　完　${tierName(game.tier)}` : '第一回　完';
      const { mark } = grade(summary);
      if (marked) data.mark = mark;
      if (counted) {
        const { improved, opened } = recordClear(saved, game.tier, mark);
        if (opened) data.news = `上面还有一重：${tierName(game.tier + 1)}。${(TIERS[game.tier] ?? { text: '所有人更耐打，下手更重。' }).text}`;
        else if (improved) data.news = '这一重里，这是最好的一回。';
      }
    }
    saveProgress();
    if (marked && counted && saved.open > game.tier) data.actions.push('climb');
    if (!yard && templeLoadout) data.actions.push('temple');
    data.actions.push(yard ? 'yard' : 'chapter', 'title');
    hud.showResult(data);
    audio.gong();
  }
  /** Begin further in, for looking at one part. */
  function jump(at) {
    const hero = game.hero;
    if (at === 'yard') (hero.z = 18), (hero.x = 0);
    else {
      game.foes = game.foes.filter((foe) => foe.kind === 'lu');
      game.party = 1;
      game.stage = 'gate';
      game.bars.gate = false;
      game.checkpoint = 'rest';
      hero.x = 0;
      hero.z = at === 'gate' ? -6 : -20.5;
      hero.will = 100;
      if (at === 'rage') game.boss.hp = game.boss.maxHp * 0.52;
    }
    view.snap(game);
  }

  // Fire, cover and the yard's waves borrow sounds the fight already has.
  const SOUNDS_LIKE = { ignite: { type: 'strike', move: { name: 'fire' } }, scorch: { type: 'hurt', heavy: false }, wave: { type: 'party' }, arrowStuck: { type: 'deflect' } };
  function sound(e) {
    // A burning man is heard when he catches, not at every bite; fire on the ground when it is the enemy's.
    if ((e.type === 'hit' && e.source === 'fire') || (e.type === 'fire' && e.harm !== 'hero')) return;
    if (e.type === 'fire') return audio.play({ ...e, type: 'strike', move: { name: 'fire' } });
    audio.play(SOUNDS_LIKE[e.type] ? { ...e, ...SOUNDS_LIKE[e.type] } : e);
  }

  function onEvent(e) {
    sound(e);
    const hint = lesson(e, game.hero.counter > 0, hud.hinting() || !!pendingHint);
    if (hint) {
      if (hud.staged) pendingHint = hint;
      else hud.hint(hint.text, hint.action);
    }
    switch (e.type) {
      case 'cine':
        if (e.id === 'rage') audio.setMood('boss2');
        if (e.id === 'meet' && quickMeet) {
          game.cine = 0;
          quickMeet = false;
        } else stage(e.id, e.time);
        break;
      case 'stage':
        audio.setMood(e.stage === 'boss' ? 'boss1' : e.stage === 'done' ? 'end' : e.stage);
        if (e.stage === 'yard') {
          speak('lin-yard');
          audio.prepareDialogue('lin-gate', 'lu-meet', 'lu-demand');
        }
        if (e.stage === 'gate') {
          speak('lin-gate');
          audio.prepareDialogue('lu-rage', 'lu-end');
        }
        if (e.stage === 'boss' && !templeLoadout) templeLoadout = captureTempleLoadout(game);
        break;
      case 'party':
        speak('lin-wave');
        break;
      case 'pickup':
        hud.note(e.note, e.grade);
        if (!hud.flyPickup(e.kind, e.grade, ...view.screen(e.x, 0.5, e.z))) hud.bump();
        break;
      case 'rest':
        hud.note('烤了烤火，伤口不疼了，葫芦也灌满了。', 1);
        break;
      case 'hurt':
      case 'scorch':
        summary.hurts++;
        hud.hurt();
        break;
      case 'death':
        summary.kills++;
        break;
      case 'choice':
        // A page lies open: the fight waits. Keys held stay held, so he walks on when it closes.
        hud.choose(e.options);
        audio.playUi('open');
        break;
      case 'boon':
        hud.closeChoice();
        hud.note(`习得　${e.name}`, 2);
        audio.playUi('confirm');
        break;
      case 'wave':
        hud.card(`第 ${e.wave} 拨`, e.elite ? `头目「${AFFIXES[e.elite].name}」　${AFFIXES[e.elite].text}` : '', 1.5);
        break;
      case 'waveDown':
        hud.note(e.wave % 2 ? '这一拨退了。' : '这一拨退了，地上落下一页枪谱。', 1);
        break;
      case 'over':
        showResult();
        break;
      case 'parry':
        summary.parries++;
        break;
      case 'riposte':
        summary.ripostes++;
        hud.clearHint();
        pendingHint = null;
        break;
      case 'fall':
        summary.falls++;
        hud.card('倒在雪里', game.mode === 'yard' ? `守到第 ${game.wave} 拨` : '', 2.6);
        veilAt = game.time + 1.7;
        break;
      case 'revive':
        veilAt = Infinity;
        view.snap(game);
        hud.veil(false);
        hud.note('在火盆边缓过一口气。', 1);
        audio.setMood(game.stage);
        break;
    }
  }

  // ---- one frame ----------------------------------------------------------------------------
  const STEP = 1 / 60,
    none = [];
  // Step the scale the canvas actually uses. A DPR cap must not absorb early downscales.
  const displayScale = () => Math.min(devicePixelRatio || 1, level.ratio);
  const resolutionPace = (max) => createDynamicResolution3D({
    min: Math.min(0.7, max), max, step: 0.25, lowFps: 42, highFps: 57, downAfter: 2.5, upAfter: 8
  });
  const autoResolution = settings.quality === 'auto';
  let scaleCap = displayScale(), ratio = scaleCap, pace = resolutionPace(scaleCap), slowFor = 0;
  function frame(dt) {
    stats.end();
    stats.begin();
    const nextCap = displayScale();
    if (nextCap !== scaleCap) {
      scaleCap = ratio = nextCap;
      pace = resolutionPace(scaleCap);
    }
    if (autoResolution && mode === 'play') ratio = pace.update(dt);
    status.frames++;
    if (status.frames === 2) {
      audio.prepareDialogue('lin-opening');
      // Release the loading surface only once the native title is ready to operate.
      Promise.resolve(hud.ready()).then(() => boot.finish()).then(() => {
        if (params.has('auto') || params.get('at')) startGame();
        if (loadExternal) requestAnimationFrame(startBackgroundCharacters);
      }).catch(fail);
    }
    dt = Math.min(dt, 0.1);
    clock += dt;
    // Keep the drawing size to the window, at the scale the quality asks for.
    if (renderer.resizeToDisplaySize(ratio)) {
      camera.aspect = canvas.width / canvas.height;
      camera.updateProjectionMatrix();
    }
    let events = none;
    if (status.hold) dt = 0;
    const waiting = mode === 'play' && (
      (!yardReady && (game.stage === 'yard' || (game.stage === 'road' && game.cine <= 0))) ||
      (!templeReady && (game.stage === 'boss' || (game.stage === 'gate' && game.hero.z <= PLACES.gate.z)))
    );
    hud.waitForCharacters(waiting);
    if (waiting) input.sample(game.hero, null);
    const active = mode === 'play' && !hud.settingsOpen() && !waiting;
    audio.setPaused(hud.settingsOpen());
    audio.setListener(game.hero.x, game.hero.z);
    if (active) {
      if (game.stage !== 'done' && !game.choice && !game.over) summary.time += dt;
      // A moment stretched: a slip past a blade or a riposte slows the fight, not the clock.
      slowFor = game.slow > 0 ? 0.32 : 1;
      carry += dt * slowFor;
      events = [];
      while (carry >= STEP) {
        carry -= STEP;
        const record = bot ? bot(game) : input.sample(game.hero, input.pointer.seen ? view.ground(input.pointer.x, input.pointer.y) : null),
          asked = game.cine > 0 ? quiet() : record;
        if (game.choice && !bot) (asked.pick = pick), (pick = -1);
        for (const e of step(game, asked, STEP)) {
          events.push({ ...e });
          onEvent(e);
        }
        if (mode !== 'play') break;
      }
      // A page left open with no sheet over it would hold the fight for ever: put the sheet back.
      if (game.choice && !bot && pick < 0 && !hud.choosing()) hud.choose(game.choice.options);
      for (const line of pending) if (!line.said && game.time >= line.at) (line.said = true), speak(line.cue);
      if (game.time >= titleCardAt) {
        titleCardAt = Infinity;
        hud.card('风雪山神庙', '第一回', 1.55);
        audio.gong();
      }
      if (game.time >= veilAt) {
        veilAt = Infinity;
        hud.veil(true);
      }
    }
    stats.lap('rules');
    view.update(game, events, mode === 'play' ? (active && !game.choice ? dt * slowFor : 0) : dt, clock);
    stats.lap('view');
    if (active && hud.staged && game.cine <= 0 && !view.cine) {
      hud.stage(false);
      hud.clearSpeech();
      pending = [];
      if (game.stage === 'road') audio.setMood('road');
      if (game.stage === 'done') showResult();
    }
    if (active && pendingHint && !hud.staged) {
      hud.hint(pendingHint.text, pendingHint.action);
      pendingHint = null;
    }
    stats.lap('overlay');
    view.mirror?.(renderer, game);
    stats.lap('reflection');
    if (mode === 'title') titleCamera();
    updateLook(camera, view.fogLights, mode === 'title' || !!view.cine, game.stage === 'boss' && !view.cine, dt);
    hud.setInteractive(active && !hud.staged && !hud.choosing());
    hud.update(game, view, dt);
    audio.update();
    stats.lap('present');

    hud.debug(debug ? (locale.lang === 'en' ? `State: ${game.hero.state} | Stage: ${game.stage} | Tier: ${game.tier} | Wave: ${game.wave}\nPosition: ${game.hero.x.toFixed(1)}, ${game.hero.z.toFixed(1)} | Health: ${game.hero.hp | 0} | Resolve: ${game.hero.will | 0}\nFPS: ${stats.fps.toFixed(0)} | Scale: ${ratio.toFixed(2)} | Lights: ${renderer.info.lightsTiled}/${renderer.info.lightsDropped} | Lu Qian: ${game.boss.state} ${game.boss.hp | 0}` : `状态: ${game.hero.state}  关: ${game.stage}  重: ${game.tier}  拨: ${game.wave}  过场: ${game.cine > 0 ? '是' : '否'}  所学: ${game.boons.join(' ') || '无'}\n位置: ${game.hero.x.toFixed(1)}, ${game.hero.z.toFixed(1)}  气血: ${game.hero.hp | 0}  枪意: ${game.hero.will | 0}\n帧率: ${stats.fps.toFixed(0)}  绘制比例: ${ratio.toFixed(2)}  灯: 分块 ${renderer.info.lightsTiled} 弃 ${renderer.info.lightsDropped}  陆谦: ${game.boss.state} ${game.boss.hp | 0}`) : null);
  }
  Object.assign(game.hero, TITLE_POSE);
  function titleCamera() {
    const drift = Math.sin(clock * 0.18) * 0.3;
    if (camera.aspect < 1) {
      camera.setPosition(-1.1 + drift, 3.6, 34);
      camera.lookAt(0, 1.8, 11);
    } else {
      camera.setPosition(-4.4 + drift, 3.15, 32.5);
      camera.lookAt(0.5, 1.7, 10.3);
    }
  }

  function renderFailed(cause) {
    loop?.dispose();
    fail(cause);
  }

  try {
    await view.preparePrograms(renderer);
  } catch (cause) {
    renderFailed(cause);
    return;
  }
  createWorld3DView(engine, scope, { renderer, scene, camera, autoResize: false, onUpdate: frame, onError: renderFailed });
  // For the console and for automated checks.
  window.__snow = {
    get game() {
      return game;
    },
    view,
    hud,
    ui: uiHost,
    input,
    settings,
    get mode() { return mode; },
    get bootActive() { return boot?.active ?? false; },
    status,
    renderer,
    get stats() {
      return stats;
    },
    progress: saved,
    places: PLACES,
    /** Play on by `seconds` at once, without waiting for frames; `until` may stop it early. */
    run(seconds, until) {
      for (let i = 0; i < seconds * 60; i++) {
        clock += STEP;
        const asked = game.cine > 0 || !bot ? quiet() : bot(game);
        // With nobody at the controls an open page takes its first lesson.
        if (game.choice) asked.pick = 0;
        const events = step(game, asked, STEP).map((e) => ({ ...e }));
        events.forEach(onEvent);
        view.update(game, events, STEP, clock);
        if (until?.(game, events)) return true;
      }
      return false;
    }
  };
  progress(1, shadowDiagnostic ? '起风 · 无阴影诊断' : '起风');
  loop = startWorld3DLoop(engine, renderFailed);
}

main().catch(fail);
