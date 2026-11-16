// Lantern Shadows: the page. It hangs the cloth, loads the puppets and the level, and runs the play.
//
//   rules/act.mjs    an act: the ground, the hero, the soldiers, arrows, and the count that is kept
//   rules/hero.mjs   how the Monkey King moves, fights and is hurt (no drawing)
//   rules/foes.mjs   the soldiers of heaven
//   rules/level.mjs  the ground, read from the level's Tiled map
//   puppets.mjs      Spine skeletons, loaded as the engine's manifest lists them
//   pictures.mjs     pictures read in the way every browser allows
//   input.mjs        keyboard, gamepad and touch as one answer a step
//   sound.mjs        the percussion, made from numbers
//
// Address options: ?backend=webgpu draws with WebGPU instead of WebGL2, ?stats shows what is being drawn,
// ?lang=en starts in English, and ?slow=0.25 plays at a quarter of the speed, to watch how he moves.
import { Bitmap, DisplayObjectContainer, Sprite } from '@egret/engine';
import { createCamera2D } from '@egret/engine/camera';
import { createParticleEmitter } from '@egret/engine/particles';
import { createTileMap, importTiledMap } from '@egret/engine/tilemap';
import { createBrowserGame } from '@egret/engine/web/game';
import { createInput } from './input.mjs';
import { createPictures } from './pictures.mjs';
import { createPuppet, loadPuppets } from './puppets.mjs';
import { createAct, remaining, stepAct } from './rules/act.mjs';
import { foeAnimation } from './rules/foes.mjs';
import { ATTACKS, TUNE, animationOf } from './rules/hero.mjs';
import { CELL, readLevel } from './rules/level.mjs';
import { createSound } from './sound.mjs';

const STAGE = { width: 960, height: 540 };
const query = new URLSearchParams(location.search),
  $ = id => document.getElementById(id);
const canvas = $('stage'),
  booth = $('booth'),
  status = $('status');

// ---- Words -----------------------------------------------------------------------------------------------------
let lang = query.get('lang') === 'en' || (!query.has('lang') && !navigator.language.startsWith('zh')) ? 'en' : 'zh';
const KEY_HINTS = {
  zh: [['A', 'D', '走'], ['K', '跳'], ['J', '棍，连按三下'], ['L', '筋斗云，可穿过枪尖'], ['P', '暂停']],
  en: [['A', 'D', 'move'], ['K', 'jump'], ['J', 'staff, three in a row'], ['L', 'cloud roll, through a spear'], ['P', 'pause']]
};
const WORDS = {
  zh: { soldiers: n => `天兵 ${n}`, barred: n => `南天门不开：还有 ${n} 名天兵`, rested: '歇脚处已记下', best: n => `最高连击 ${n}`, count: '最高连击', time: '用时', falls: '倒地', wounds: '受伤', felled: '击退天兵', times: n => `${n} 次`, none: '无', seconds: n => `${n} 秒` },
  en: { soldiers: n => `Soldiers ${n}`, barred: n => `The gate is shut: ${n} soldier${n === 1 ? '' : 's'} still standing`, rested: 'Resting place marked', best: n => `Best ${n}`, count: 'Best count', time: 'Time', falls: 'Falls', wounds: 'Wounds', felled: 'Soldiers felled', times: n => String(n), none: 'none', seconds: n => `${n} s` }
};
function speak() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  for (const element of document.querySelectorAll('[data-zh]')) element.textContent = element.dataset[lang];
  $('lang').textContent = lang === 'zh' ? 'EN' : '中文';
  $('keys').innerHTML = KEY_HINTS[lang].map(hint => hint.slice(0, -1).map(key => `<kbd>${key}</kbd>`).join('') + hint.at(-1)).join('');
  if (staged) (showCount(), showResult());
}
// The playbill is in the right language while the stage is still being set.
let staged = false;
speak();

// ---- The engine ------------------------------------------------------------------------------------------------
/** An error and what caused it, each by its code where it has one. */
const describe = cause => {
  const parts = [];
  for (let at = cause; at && parts.length < 4; at = at.cause) parts.push(String(at.code ?? at.message ?? at));
  return parts.join(' ← ');
};
const fail = cause => {
  status.textContent = (lang === 'zh' ? '戏台没搭起来：' : 'The booth could not be set up: ') + describe(cause);
  status.classList.add('is-error');
  // Once the curtain is up the playbill cannot be seen, so trouble during the play is told over the stage.
  $('trouble').textContent = (lang === 'zh' ? '戏演不下去了：' : 'The play cannot go on: ') + describe(cause);
  $('trouble').hidden = !$('curtain').classList.contains('is-up');
  console.error(cause);
};

const sound = createSound(),
  input = createInput();
let game;
try {
  game = await createBrowserGame({
    canvas,
    width: STAGE.width,
    height: STAGE.height,
    clearColor: 0x2a1208,
    pixelRatio: Math.min(2, Math.max(1, (devicePixelRatio || 1) * 0.75)),
    // WebGL2 unless WebGPU is asked for, as in the other demos of this collection.
    backend: query.get('backend') === 'webgpu' && navigator.gpu ? 'webgpu' : 'webgl2',
    fit: 'contain',
    fitTo: booth,
    pointer: false,
    keyboard: false,
    autoStart: false,
    update,
    onError: fail
  });
} catch (cause) {
  fail(cause);
  throw cause;
}
const { engine, scope } = game;

// ---- What is loaded --------------------------------------------------------------------------------------------
const loadPicture = createPictures(engine, scope),
  asset = path => new URL(`../assets/${path}`, import.meta.url);
const PICTURES = ['screen', 'frame', 'far', 'gate', 'wisp', 'spark', 'chaff', 'tiles', 'arrow', 'pennant'];
let art, puppetOf, mapSource;
try {
  const [pictures, puppets, map] = await Promise.all([
    Promise.all(PICTURES.map(name => loadPicture(asset(`scene/${name}.png`).href))),
    loadPuppets(engine, scope, ['wukong', 'dummy', 'spearman', 'archer'], asset('')),
    fetch(asset('levels/act1.tmj')).then(response => (response.ok ? response.json() : Promise.reject(Error('The level is missing: run tools/author.mjs.'))))
  ]);
  art = Object.fromEntries(PICTURES.map((name, index) => [name, pictures[index]]));
  puppetOf = puppets;
  mapSource = map;
} catch (cause) {
  fail(cause);
  throw cause;
}
const level = readLevel(mapSource);
let act = createAct(level);

// ---- The stage -------------------------------------------------------------------------------------------------
/** A picture placed by its top left corner and drawn `width` stage units wide. */
function picture(parent, lease, x, y, width) {
  const bitmap = parent.addChild(scope.use(new Bitmap(lease)));
  bitmap.x = x;
  bitmap.y = y;
  bitmap.scaleX = bitmap.scaleY = width / bitmap.naturalWidth;
  return bitmap;
}
const layer = parent => parent.addChild(scope.use(new DisplayObjectContainer()));
const GROUND = act.hero.y;

// From the lamp outward: the cloth, what hangs far behind it, the level and its puppets, and the front of the booth.
picture(engine.stage, art.screen, 0, 0, STAGE.width);
const far = layer(engine.stage),
  drift = layer(engine.stage),
  world = layer(engine.stage);
// Leather only darkens the light that comes through it.
const shadowBlend = query.get('blend') ?? 'multiply';
far.blendMode = drift.blendMode = shadowBlend;
for (const x of [-80, 1240]) picture(far, art.far, x, GROUND - 344, 1400).alpha = 0.6;
const wisps = [[120, 96, 26], [620, 150, -18], [1100, 70, 14], [1680, 128, -22], [2300, 90, 20], [2900, 140, -16], [3500, 80, 18]].map(([x, y, speed]) => ({ bitmap: picture(drift, art.wisp, x, y, 150), speed }));

const scenery = layer(world);
scenery.blendMode = shadowBlend;
if (act.gate) picture(scenery, art.gate, act.gate.x - 210, act.gate.y - 398, 420);
const pennants = act.checkpoints.map(point => picture(scenery, art.pennant, point.x - 14, point.y - 120, 56));

// The ground is the level's tile map, drawn by the engine from the same file the rules read. The map is stored
// at twice the size of a cell, so it is shown at half.
const tiles = scope.use(createTileMap({ map: importTiledMap(mapSource), textures: { terrace: art.tiles }, chunkSize: 16 }));
tiles.display.scaleX = tiles.display.scaleY = CELL / mapSource.tilewidth;
tiles.display.blendMode = shadowBlend;
world.addChild(tiles.display);

const cast = layer(world),
  flights = layer(world),
  effects = layer(world);
cast.blendMode = flights.blendMode = shadowBlend;

// The lamp is a flame: a wash over the cloth that is never quite steady.
const flicker = engine.stage.addChild(scope.use(new Sprite()));
flicker.graphics.beginFill(0x2a1208).drawRect(0, 0, STAGE.width, STAGE.height).endFill();
flicker.alpha = 0;
picture(engine.stage, art.frame, 0, 0, STAGE.width);

// ---- The cast --------------------------------------------------------------------------------------------------
const posts = act.posts.map(post => {
  const puppet = createPuppet(puppetOf('dummy'), scope);
  puppet.node.x = post.x;
  puppet.node.y = post.y;
  puppet.play('idle', { loop: true });
  cast.addChild(puppet.node);
  return { puppet, blows: 0 };
});
const soldiers = act.foes.map(foe => {
  const puppet = createPuppet(puppetOf(foe.kind), scope);
  cast.addChild(puppet.node);
  return { puppet, bones: 18 };
});
const wukong = createPuppet(puppetOf('wukong'), scope);
cast.addChild(wukong.node);
wukong.play('idle', { loop: true });
/** Arrows in the air, each with the picture that shows it. */
const arrows = new Map();

// Sparks from the staff, straw from the posts, and dust from his feet.
const emitter = (lease, options, blend) => {
  const made = scope.use(createParticleEmitter({ texture: lease, running: false, ...options }));
  made.display.blendMode = blend;
  effects.addChild(made.display);
  return made;
};
const sparks = emitter(art.spark, { maxParticles: 400, lifetime: [0.18, 0.42], speed: [160, 520], angle: [0, 360], gravity: { x: 0, y: 500 }, drag: 2.4, size: 14, startScale: [0.6, 1.3], endScale: 0.1, startColor: 0xfff3c0, endColor: 0xff6a1a, startAlpha: 1, endAlpha: 0, shape: { kind: 'circle', radius: 6 }, seed: 31 }, 'add');
const straw = emitter(art.chaff, { maxParticles: 300, lifetime: [0.5, 1], speed: [120, 420], angle: [200, 340], gravity: { x: 0, y: 1300 }, drag: 1.2, size: { width: 15, height: 5 }, startColor: 0x7a4a14, endColor: 0x5a3410, startAlpha: 0.95, endAlpha: 0, rotation: [0, 360], spin: [-900, 900], shape: { kind: 'circle', radius: 10 }, seed: 47 }, 'normal');
const dust = emitter(art.spark, { maxParticles: 200, lifetime: [0.3, 0.6], speed: [30, 150], angle: [180, 360], gravity: { x: 0, y: -60 }, drag: 2, size: 26, startScale: [0.5, 1], endScale: 1.8, startColor: 0x6a4424, endColor: 0x6a4424, startAlpha: 0.34, endAlpha: 0, shape: { kind: 'rectangle', width: 30, height: 4 }, seed: 59 }, 'normal');
const burst = (made, x, y, count) => {
  made.x = x;
  made.y = y;
  made.burst(count);
};

// ---- The camera ------------------------------------------------------------------------------------------------
let lead = 0;
const camera = scope.use(
  createCamera2D({ world, width: STAGE.width, height: STAGE.height, center: { x: act.hero.x, y: STAGE.height / 2 }, bounds: { x: 0, y: 0, width: level.width, height: STAGE.height }, shakeOffset: 11, shakeRotation: 0.5, seed: 5 })
);
camera.addLayer(far, { factor: 0.3 });
camera.addLayer(drift, { factor: 0.55 });
camera.follow(() => ({ x: act.hero.x + lead, y: STAGE.height / 2 }), { smoothing: 0.1 });

// ---- What is told in front of the cloth ------------------------------------------------------------------------
const combo = $('combo'),
  peaches = [...$('peaches').children];
function showCombo(struck) {
  combo.hidden = act.combo < 2;
  $('combo-count').textContent = String(act.combo);
  if (struck && !combo.hidden) {
    combo.classList.remove('is-struck');
    void combo.offsetWidth;
    combo.classList.add('is-struck');
  }
}
function showCount() {
  const words = WORDS[lang];
  $('best').hidden = act.best < 3;
  $('best').textContent = words.best(act.best);
  $('soldiers').textContent = words.soldiers(remaining(act));
  peaches.forEach((peach, index) => peach.classList.toggle('is-eaten', index >= act.hero.health));
}
let noticeUntil = 0;
function notice(text) {
  $('notice').textContent = text;
  $('notice').hidden = false;
  noticeUntil = clock + 2.6;
}
function showResult() {
  const result = act.result,
    words = WORDS[lang];
  $('result').hidden = !result;
  if (!result) return;
  $('rank').textContent = result.rank;
  $('tally').innerHTML = [
    [words.time, words.seconds(Math.round(result.time))],
    [words.felled, String(result.felled)],
    [words.count, String(result.best)],
    [words.wounds, result.wounds ? words.times(result.wounds) : words.none],
    [words.falls, result.falls ? words.times(result.falls) : words.none]
  ]
    .map(([name, value]) => `<dt>${name}</dt><dd>${value}</dd>`)
    .join('');
}

// ---- One frame -------------------------------------------------------------------------------------------------
const STEP = 1 / 120,
  PACE = Math.min(1, Math.max(0.02, Number(query.get('slow')) || 1));
let carry = 0,
  freeze = 0,
  clock = 0,
  tick,
  zoomBack = 0,
  playing = false,
  paused = false;
engine.clock.onTick(scope, value => {
  tick = value;
});

const panOf = x => (x - camera.snapshot().center.x) / (STAGE.width / 2);
/** The beat, the held breath and the shudder of the booth that a blow of the staff brings. */
function land(attack, pan) {
  sound.play({ hit: 'clap', lift: 'smallGong', slam: 'gong' }[attack.kind], { volume: 0.9, pan });
  freeze = Math.max(freeze, attack.stop);
  camera.shake({ trauma: attack.shake });
  input.gamepads?.rumble(0, { duration: 90 + attack.power * 60, weak: 0.4, strong: 0.3 * attack.power });
  if (attack.kind === 'slam') (camera.zoomTo(1.07, 0.06), (zoomBack = 0.16));
}

function happen(events) {
  const hero = act.hero,
    pan = panOf(hero.x);
  let counted = false;
  for (const event of events) {
    const { type } = event;
    if (type === 'jump') (sound.play('drum', { volume: 0.5, rate: 1.5, pan }), burst(dust, hero.x, hero.y, 6));
    else if (type === 'land') (sound.play('drum', { volume: Math.min(0.9, event.speed / 1300), rate: 0.9, pan }), burst(dust, hero.x, hero.y, event.speed > 500 ? 12 : 5));
    else if (type === 'dash') (sound.play('whirl', { volume: 0.7, pan }), burst(dust, hero.x, hero.y - 20, 10));
    else if (type === 'step') sound.play('tap', { volume: 0.28, rate: 0.9 + Math.random() * 0.25, pan });
    else if (type === 'swing') sound.play('swish', { volume: 0.5, rate: [1.1, 0.95, 0.75][ATTACKS.indexOf(event.attack)], pan });
    else if (type === 'met') {
      burst(sparks, event.at.x, event.at.y, 10 + event.attack.power * 10);
      if (event.post) {
        const seat = posts[event.post.index];
        seat.puppet.face(event.side);
        seat.puppet.play(event.attack.kind, { key: ++seat.blows, mix: 0.03 });
        seat.puppet.then('idle');
        burst(straw, event.at.x, event.at.y, 4 + event.attack.power * 5);
      }
      land(event.attack, pan);
      counted = true;
    } else if (type === 'deflect') {
      burst(sparks, event.arrow.x, event.arrow.y, 14);
      sound.play('clap', { volume: 0.8, rate: 1.5, pan: panOf(event.arrow.x) });
      freeze = Math.max(freeze, 0.04);
    } else if (type === 'foe-windup') sound.play('tap', { volume: 0.7, rate: event.foe.kind === 'archer' ? 1.8 : 0.6, pan: panOf(event.foe.x) });
    else if (type === 'foe-strike' || type === 'arrow') sound.play('swish', { volume: 0.55, rate: type === 'arrow' ? 1.7 : 1.3, pan: panOf(event.foe.x) });
    else if (type === 'foe-down') (sound.play('drum', { volume: 0.8, rate: 0.7, pan: panOf(event.foe.x) }), (counted = true));
    else if (type === 'hurt') {
      sound.play('drum', { volume: 1, rate: 0.55, pan });
      burst(sparks, hero.x, hero.y - 60, 16);
      freeze = Math.max(freeze, 0.09);
      camera.shake({ trauma: 0.6 });
      input.gamepads?.rumble(0, { duration: 220, weak: 0.8, strong: 0.8 });
      counted = true;
    } else if (type === 'revive') (burst(dust, hero.x, hero.y, 14), (counted = true));
    else if (type === 'lapse') counted = true;
    else if (type === 'checkpoint') (notice(WORDS[lang].rested), sound.play('smallGong', { volume: 0.5, rate: 1.3 }));
    else if (type === 'barred') notice(WORDS[lang].barred(event.left));
    else if (type === 'clear') {
      sound.play('gong', { volume: 1, rate: 0.8 });
      showResult();
    }
  }
  if (counted) (showCombo(events.some(event => event.type === 'met')), showCount());
}

/** Whether something at `x` is near enough to what the camera shows to be worth moving. */
const inView = (x, centre) => Math.abs(x - centre) < STAGE.width * 0.75;

function update(seconds) {
  // The rules and the puppets keep the same time: the engine's tick, slowed if the address asks for it.
  const dt = Math.min(tick?.deltaSeconds ?? seconds, 0.1) * PACE;
  clock += dt;
  input.poll(performance.now());
  if (playing && !paused) {
    if (freeze > 0) freeze -= dt;
    else {
      carry += dt;
      let asked;
      while (carry >= STEP && freeze <= 0) {
        carry -= STEP;
        // Presses belong to the first step of a frame; what is held lasts through all of them.
        asked = asked ? { ...asked, jump: false, attack: false, dash: false } : input.read();
        happen(stepAct(act, asked, STEP));
      }
    }
  }
  // While a blow is being felt, or the play is paused, every puppet holds its pose.
  const still = paused || freeze > 0,
    held = still ? 0 : PACE,
    hero = act.hero,
    centre = camera.snapshot().center.x;

  // The puppets follow the rules.
  const { name, key } = animationOf(hero);
  wukong.play(name, { loop: name === 'idle' || name === 'run' || name === 'fall', key, mix: name.startsWith('attack') ? 0.04 : name === 'dash' ? 0.03 : 0.08 });
  wukong.face(hero.facing);
  wukong.node.x = hero.x;
  wukong.node.y = hero.y;
  // For the moment after a blow in which nothing can hurt him, he flickers.
  wukong.node.alpha = hero.safe > 0 && hero.state === 'move' && Math.floor(clock * 14) % 2 ? 0.45 : 1;
  wukong.speed(held);
  const moving = [wukong];
  posts.forEach(({ puppet }, index) => {
    if (!inView(act.posts[index].x, centre)) return;
    puppet.speed(held);
    moving.push(puppet);
  });
  soldiers.forEach(({ puppet }, index) => {
    const foe = act.foes[index];
    puppet.node.visible = !foe.gone;
    if (foe.gone || !inView(foe.x, centre)) return;
    const shown = foeAnimation(foe);
    puppet.play(shown.name, { loop: shown.name === 'idle' || shown.name === 'walk', key: shown.key, mix: shown.name === 'attack' ? 0.03 : 0.08 });
    puppet.face(foe.facing);
    puppet.node.x = foe.x;
    puppet.node.y = foe.y;
    // A fallen soldier fades from the cloth as he is cleared away.
    puppet.node.alpha = foe.state === 'down' ? Math.max(0, Math.min(1, (1.3 - foe.time) / 0.5)) : 1;
    puppet.speed(held);
    moving.push(puppet);
  });
  if (tick) {
    for (const puppet of moving) puppet.advance(tick);
    tick = undefined;
  }

  // Arrows: a picture for each one in the air, turned the way it flies.
  for (const arrow of act.arrows) {
    let shown = arrows.get(arrow);
    if (!shown) {
      shown = flights.addChild(new Bitmap(art.arrow));
      shown.scaleX = shown.scaleY = 46 / shown.naturalWidth;
      shown.anchorOffsetX = shown.naturalWidth / 2;
      shown.anchorOffsetY = shown.naturalHeight / 2;
      shown.rotation = (Math.atan2(arrow.vy, arrow.vx) * 180) / Math.PI;
      arrows.set(arrow, shown);
    }
    shown.x = arrow.x;
    shown.y = arrow.y;
  }
  for (const [arrow, shown] of arrows)
    if (!act.arrows.includes(arrow)) {
      shown.dispose();
      arrows.delete(arrow);
    }
  act.checkpoints.forEach((point, index) => (pennants[index].alpha = point.reached ? 1 : 0.4));

  for (const made of [sparks, straw, dust]) made.update(still ? 0 : dt);
  for (const wisp of wisps) {
    wisp.bitmap.x += wisp.speed * (paused ? 0 : dt);
    if (wisp.bitmap.x > level.width) wisp.bitmap.x = -160;
    else if (wisp.bitmap.x < -160) wisp.bitmap.x = level.width;
  }
  lead += (hero.facing * 90 - lead) * Math.min(1, dt * 3);
  if (zoomBack > 0 && (zoomBack -= dt) <= 0) camera.zoomTo(1, 0.35);
  camera.update(paused ? 0 : dt);
  // A shake that has all but died away can leave the stage moved or turned by a number too small to be told
  // from nothing, and the renderer refuses a frame with such a number in it. What is that small is made nothing.
  for (const node of [world, far, drift]) for (const key of ['x', 'y', 'rotation']) if (node[key] !== 0 && Math.abs(node[key]) < 1e-6) node[key] = 0;
  // Two slow waves and a quick one make a flame's unevenness.
  flicker.alpha = 0.05 + 0.02 * Math.sin(clock * 2.3) + 0.012 * Math.sin(clock * 7.9 + 1) + 0.01 * Math.sin(clock * 23.7);

  if (!$('notice').hidden && clock > noticeUntil) $('notice').hidden = true;
  if (playing && act.state === 'play') {
    const total = Math.floor(act.time);
    $('clock').textContent = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }
  if (stats) showStats(moving.length);
}

// ---- Around the play -------------------------------------------------------------------------------------------
const stats = query.has('stats') ? $('stats') : undefined;
let frames = 0,
  since = performance.now(),
  rate = 0;
function showStats(moved) {
  frames++;
  const now = performance.now();
  if (now - since >= 500) (rate = (frames * 1000) / (now - since)), (frames = 0), (since = now);
  stats.textContent = `${game.backend}  ${rate.toFixed(0)} fps\npuppets moving ${moved} of ${posts.length + soldiers.length + 1}\n${animationOf(act.hero).name}  x ${act.hero.x.toFixed(0)}  y ${act.hero.y.toFixed(0)}`;
}
if (stats) stats.hidden = false;

function pause(value = !paused) {
  if (!playing || act.state !== 'play') return;
  paused = value;
  $('paused').hidden = !paused;
}
addEventListener('keydown', event => (event.code === 'KeyP' || event.code === 'Escape') && !event.repeat && pause());
addEventListener('blur', () => pause(true));
$('paused').addEventListener('click', () => pause(false));

/** Puts the act back to its beginning. */
function again() {
  act = createAct(level);
  for (const shown of arrows.values()) shown.dispose();
  arrows.clear();
  freeze = carry = 0;
  camera.follow(() => ({ x: act.hero.x + lead, y: STAGE.height / 2 }), { smoothing: 0.1 });
  showResult();
  showCombo(false);
  showCount();
  canvas.focus();
}
$('again').addEventListener('click', again);

$('lang').addEventListener('click', () => ((lang = lang === 'zh' ? 'en' : 'zh'), speak()));
$('mute').addEventListener('click', event => {
  sound.muted = !sound.muted;
  event.currentTarget.setAttribute('aria-pressed', String(sound.muted));
});
// An iPhone's browsers cannot make a page fill the screen, and there the button would do nothing.
$('full').hidden = !document.fullscreenEnabled || !booth.requestFullscreen;
$('full').addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : booth.requestFullscreen?.().catch(() => {})));
for (const button of document.querySelectorAll('.tools button')) button.addEventListener('keydown', event => event.code === 'Space' && event.preventDefault());

staged = true;
speak();
game.loop.start();
const start = $('start');
start.disabled = false;
status.textContent = '';
status.removeAttribute('data-zh');
start.addEventListener('click', () => {
  playing = true;
  $('curtain').classList.add('is-up');
  $('hud').hidden = false;
  sound.begin().then(() => sound.play('gong', { volume: 0.9 }));
  canvas.focus();
});

// What a check reads; the play does not need it.
globalThis.__lantern = {
  get act() {
    return act;
  },
  get hero() {
    return act.hero;
  },
  get playing() {
    return playing;
  },
  backend: game.backend,
  camera: () => camera.snapshot(),
  begin: () => start.click(),
  tap: action => input.tap(action),
  hold: (action, down) => input.hold(action, down),
  sounds: () => sound.ready,
  pause,
  again,
  health: TUNE.health
};
