// Lantern Shadows: the page. It hangs the cloth, loads the puppets and the level, and runs the play.
//
//   rules/act.mjs    an act: the ground, the hero, the soldiers, arrows, and the count that is kept
//   rules/hero.mjs   how the Monkey King moves, fights and is hurt (no drawing)
//   rules/foes.mjs   the soldiers of heaven
//   rules/boss.mjs   Nezha, who bars the gate
//   rules/erlang.mjs Erlang and his hound, who hold the way out of the orchard
//   rules/laozi.mjs  Laozi, his snare and his furnace
//   rules/clones.mjs the hairs he blows into copies of himself
//   rules/level.mjs  the ground, read from the level's Tiled map
//   puppets.mjs      Spine skeletons, loaded as the engine's manifest lists them
//   pictures.mjs     pictures read in the way every browser allows
//   input.mjs        keyboard, gamepad and touch as one answer a step
//   sound.mjs        the percussion, made from numbers
//
// Address options: ?act=2 begins with the second act, ?backend=webgpu draws with WebGPU instead of WebGL2, ?stats shows what is being drawn,
// ?lang=en starts in English, ?slow=0.25 plays at a quarter of the speed, to watch how he moves, and ?from=nezha
// begins at the court before the gate (and ?from=erlang at the second act's). ?clones=200 sets how many copies a tuft of hair makes (a hundred unless
// said), and keeps them all on the stage however slowly it is then drawn.
import { Bitmap, DisplayObjectContainer, Sprite } from '@egret/engine';
import { createCamera2D } from '@egret/engine/camera';
import { createParticleEmitter } from '@egret/engine/particles';
import { createTileMap, importTiledMap } from '@egret/engine/tilemap';
import { createBrowserGame } from '@egret/engine/web/game';
import { createInput } from './input.mjs';
import { createPictures, readJson, watchReading } from './pictures.mjs';
import { createPuppet, loadPuppets } from './puppets.mjs';
import { FURNACE, createAct, remaining, stepAct, tuftReady } from './rules/act.mjs';
import { BOSS, bossAnimation, present } from './rules/boss.mjs';
import { ERLANG, bossAnimation as erlangAnimation, houndAnimation } from './rules/erlang.mjs';
import { LAOZI, bossAnimation as laoziAnimation, furnaceWalls } from './rules/laozi.mjs';
import { HAIRS, cloneAnimation, out } from './rules/clones.mjs';
import { FOES, foeAnimation } from './rules/foes.mjs';
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
  zh: [['A', 'D', '走'], ['K', '跳'], ['J', '棍，连按三下'], ['L', '筋斗云，可穿过枪尖'], ['I', '身外身'], ['P', '暂停']],
  en: [['A', 'D', 'move'], ['K', 'jump'], ['J', 'staff, three in a row'], ['L', 'cloud roll, through a spear'], ['I', 'clones'], ['P', 'pause']]
};
const WORDS = {
  zh: { titles: { act1: '第一幕　南天门', act2: '第二幕　蟠桃园', act3: '第三幕　兜率宫' }, curtain: title => `${title}　落幕`, tuft: '毫毛攒足了，可以使身外身', blown: '身外身！', crowd: (n, bones, rate) => `身外身 ${n}　骨骼 ${bones}　每秒 ${rate} 帧`, bosses: { nezha: { name: '哪吒', enter: '哪吒三太子踏风火轮到', phases: ['', '乾坤圈！一棍打回去', '三头六臂，风火轮！上云躲火'], opened: '哪吒败走，南天门开了' }, erlang: { name: '二郎神', enter: '二郎真君提三尖两刃刀到，哮天犬随后', phases: ['', '他要变化了：变成鹰时把他打下来', '法天象地！他落地的震波要跳过去'], opened: '二郎神收兵，月洞门开了' }, laozi: { name: '太上老君', enter: '太上老君拂尘一摆，金刚琢在手', phases: ['', '他取出扇子：三道火舌，一道一道跳过去'], opened: '老君罢手，兜率宫的门开了' } }, taken: '金刚琢套走了金箍棒！别打那个圈，去另一头把棒捡回来', regained: '金箍棒回来了', shut: n => `八卦炉合上了：撑过 ${n} 秒`, broken: '破炉而出，炼成火眼金睛！出手加倍', finale: '全剧终', unplayed: '未演', places: { act1: '南天门', act2: '蟠桃园', act3: '兜率宫' }, soldiers: n => `天兵 ${n}`, barred: n => `南天门不开：还有 ${n} 名天兵`, rested: '歇脚处已记下', best: n => `最高连击 ${n}`, count: '最高连击', time: '用时', falls: '倒地', wounds: '受伤', felled: '击退天兵', times: n => `${n} 次`, none: '无', seconds: n => `${n} 秒` },
  en: { titles: { act1: 'Act one: the Southern Gate', act2: 'Act two: the Peach Orchard', act3: 'Act three: the Tushita Palace' }, curtain: title => `${title}. Curtain`, tuft: 'Hairs enough for the body beyond the body', blown: 'The body beyond the body!', crowd: (n, bones, rate) => `${n} clones, ${bones} bones moving, ${rate} frames a second`, bosses: { nezha: { name: 'Nezha', enter: 'Prince Nezha comes down on his wheels of wind and fire', phases: ['', 'The Universe Ring! Knock it back with the staff', 'Three heads, six arms, wheels ablaze! Take to a cloud'], opened: 'Nezha is driven off, and the gate stands open' }, erlang: { name: 'Erlang', enter: 'Erlang comes with his three-pointed glaive, and his hound behind him', phases: ['', 'He changes his shape: strike the hawk out of the air', 'He grows to the size of the sky! Jump the wave when he lands'], opened: 'Erlang calls off the fight, and the moon gate stands open' }, laozi: { name: 'Laozi', enter: 'Laozi comes with his whisk, and the Diamond Snare in his hand', phases: ['', 'He takes out his fan: three flames, to be jumped one by one'], opened: 'Laozi stays his hand, and the door of the palace stands open' } }, taken: 'The Snare has taken the staff! Do not strike the ring; fetch the staff from the far end', regained: 'The staff is his again', shut: n => `The furnace is shut: last ${n} seconds`, broken: 'Out of the furnace with eyes of fire! Every blow counts double', finale: 'The play is done', unplayed: 'not played', places: { act1: 'The Gate', act2: 'The Orchard', act3: 'The Palace' }, soldiers: n => `Soldiers ${n}`, barred: n => `The gate is shut: ${n} soldier${n === 1 ? '' : 's'} still standing`, rested: 'Resting place marked', best: n => `Best ${n}`, count: 'Best count', time: 'Time', falls: 'Falls', wounds: 'Wounds', felled: 'Soldiers felled', times: n => String(n), none: 'none', seconds: n => `${n} s` }
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
const PICTURES = ['screen', 'frame', 'far', 'gate', 'wisp', 'spark', 'chaff', 'tiles', 'arrow', 'pennant', 'ring', 'far2', 'tree', 'peach', 'moongate', 'orchard', 'far3', 'furnace', 'pill', 'vent', 'door', 'palace', 'staff'],
  PUPPETS = ['wukong', 'dummy', 'spearman', 'archer', 'nezha', 'guard', 'crane', 'erlang', 'hawk', 'hound', 'fanner', 'alchemist', 'laozi'],
  /** The acts, in the order they are played. */
  ACTS = ['act1', 'act2', 'act3'];
// The line under the gong fills as the files come in: the pictures, three files for each puppet, the list of
// them, and the levels.
const awaited = PICTURES.length + PUPPETS.length * 3 + 1 + ACTS.length,
  filled = watchReading(count => ($('filling').firstElementChild.style.width = `${Math.min(100, (count / awaited) * 100)}%`));
let art, puppetOf, maps;
try {
  const [pictures, puppets, levelMaps] = await Promise.all([
    // The cloth is the one picture with nothing to see through, and is kept as a JPEG.
    Promise.all(PICTURES.map(name => loadPicture(asset(`scene/${name}.${name === 'screen' ? 'jpg' : 'png'}`).href))),
    loadPuppets(engine, scope, PUPPETS, asset('')),
    Promise.all(ACTS.map(name => readJson(asset(`levels/${name}.tmj`).href)))
  ]);
  art = Object.fromEntries(PICTURES.map((name, index) => [name, pictures[index]]));
  puppetOf = puppets;
  maps = Object.fromEntries(ACTS.map((name, index) => [name, levelMaps[index]]));
} catch (cause) {
  fail(cause);
  throw cause;
}
const levels = Object.fromEntries(ACTS.map(name => [name, readLevel(maps[name])]));
/** Which act is on the stage, and where it begins: at its beginning, or at the court before the gate. */
const asked = query.get('from');
let from = asked === 'nezha' || asked === 'erlang' || asked === 'laozi' ? 'boss' : undefined,
  onStage = asked === 'erlang' ? 'act2' : asked === 'laozi' ? 'act3' : !from && ACTS[Number(query.get('act')) - 1] ? ACTS[Number(query.get('act')) - 1] : 'act1',
  level = levels[onStage],
  mapSource = maps[onStage];
/** How many copies a tuft of hair makes; if the address says, that many are kept whatever it costs. */
const TUFT = Math.max(10, Math.min(400, Math.round(Number(query.get('clones'))) || HAIRS.count)),
  keepAll = query.has('clones');
let act = createAct(level, { from, clones: TUFT });

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

// From the lamp outward: the cloth, what hangs far behind it, the level and its puppets, and the front of the booth.
picture(engine.stage, art.screen, 0, 0, STAGE.width);
const far = layer(engine.stage),
  drift = layer(engine.stage),
  world = layer(engine.stage);
// Leather only darkens the light that comes through it.
const shadowBlend = query.get('blend') ?? 'multiply';
far.blendMode = drift.blendMode = shadowBlend;
const wisps = [[120, 96, 26], [620, 150, -18], [1100, 70, 14], [1680, 128, -22], [2300, 90, 20], [2900, 140, -16], [3500, 80, 18]].map(([x, y, speed]) => ({ bitmap: picture(drift, art.wisp, x, y, 150), speed }));

// What an act is dressed with goes into these, and is taken out again when the next act is set: the scenery, the
// ground, and (among the cast) the puppets of whoever stands in the way.
const scenery = layer(world),
  ground = layer(world);
scenery.blendMode = ground.blendMode = shadowBlend;
const cast = layer(world),
  flights = layer(world),
  effects = layer(world);
cast.blendMode = flights.blendMode = shadowBlend;

// The lamp is a flame: a wash over the cloth that is never quite steady.
const flicker = engine.stage.addChild(scope.use(new Sprite()));
flicker.graphics.beginFill(0x2a1208).drawRect(0, 0, STAGE.width, STAGE.height).endFill();
flicker.alpha = 0;
// And a white one, for the moment he breaks out of the furnace.
const glare = engine.stage.addChild(scope.use(new Sprite()));
glare.graphics.beginFill(0xfff6d2).drawRect(0, 0, STAGE.width, STAGE.height).endFill();
glare.alpha = 0;
let flash = 0;
picture(engine.stage, art.frame, 0, 0, STAGE.width);

// ---- The cast --------------------------------------------------------------------------------------------------
const troupe = layer(cast);
troupe.blendMode = shadowBlend;
/** What each act is dressed differently with: what hangs far behind, its way out, and its ground. */
const DRESS = {
  act1: { far: 'far', gate: ['gate', 420, 398], tiles: 'tiles' },
  act2: { far: 'far2', gate: ['moongate', 380, 378], tiles: 'orchard' },
  act3: { far: 'far3', gate: ['door', 340, 378], tiles: 'palace' }
};
let posts = [],
  soldiers = [],
  pennants = [],
  peachesShown = [],
  furnacesShown = [],
  tiles;
/** Everything that was put up for the act now on the stage, to be taken down with it. */
const dressed = [];
/** Dresses the stage for the act that is about to be played. */
function dress() {
  const look = DRESS[onStage],
    floor = level.things.find(thing => thing.type === 'spawn').y,
    hang = (parent, lease, x, y, width) => {
      const bitmap = parent.addChild(new Bitmap(lease));
      bitmap.x = x;
      bitmap.y = y;
      bitmap.scaleX = bitmap.scaleY = width / bitmap.naturalWidth;
      dressed.push({ node: bitmap, parent });
      return bitmap;
    };
  for (const x of [-80, 1240]) hang(far, art[look.far], x, floor - 344, 1400).alpha = 0.6;
  for (const thing of level.things) if (thing.type === 'tree') hang(scenery, art.tree, thing.x - 160, thing.y - 378, 320);
  const [gate, wide, tall] = look.gate;
  if (act.gate) hang(scenery, art[gate], act.gate.x - wide / 2, act.gate.y - tall, wide);
  pennants = act.checkpoints.map(point => hang(scenery, art.pennant, point.x - 14, point.y - 120, 56));
  // The ground is the level's tile map, drawn by the engine from the same file the rules read. The map is stored
  // at twice the size of a cell, so it is shown at half.
  tiles = createTileMap({ map: importTiledMap(mapSource), textures: { [level.set]: art[look.tiles] }, chunkSize: 16 });
  tiles.display.scaleX = tiles.display.scaleY = CELL / mapSource.tilewidth;
  tiles.display.blendMode = shadowBlend;
  ground.addChild(tiles.display);
  const stand = (name, bones, size = 1) => {
    const puppet = createPuppet(puppetOf(name), scope);
    puppet.bones = bones;
    puppet.scale(size);
    troupe.addChild(puppet.node);
    dressed.push({ node: puppet.node, parent: troupe, puppet });
    return puppet;
  };
  posts = act.posts.map(post => {
    const puppet = stand('dummy', 8);
    puppet.node.x = post.x;
    puppet.node.y = post.y;
    puppet.play('idle', { loop: true });
    return { puppet, blows: 0 };
  });
  soldiers = act.foes.map(foe => ({ puppet: foe.flies ? stand(foe.kind, 11, 1.2) : stand(foe.kind, 18) }));
  // Grates lie on the floor; a furnace stands on its feet, and is turned about them when it is knocked over.
  for (const vent of act.vents) hang(flights, art.vent, vent.x - 32, vent.y - 14, 64);
  furnacesShown = act.furnaces.map(furnace => {
    const shown = hang(scenery, art.furnace, furnace.x, furnace.y, 96);
    shown.anchorOffsetX = shown.naturalWidth / 2;
    shown.anchorOffsetY = shown.naturalHeight;
    return shown;
  });
  // Peaches hang in front of the scenery, each turned about its middle.
  peachesShown = act.peaches.map(peach => {
    const shown = hang(flights, art.peach, peach.x, peach.y, 30);
    shown.anchorOffsetX = shown.naturalWidth / 2;
    shown.anchorOffsetY = shown.naturalHeight / 2;
    return shown;
  });
}
/** Takes down what the last act was dressed with. */
function undress() {
  for (const { node, parent, puppet } of dressed.splice(0)) {
    parent.removeChild(node);
    if (puppet) puppet.dispose();
    else node.dispose();
  }
  ground.removeChild(tiles.display);
  tiles.dispose();
}
// Nezha waits out of sight until he is called down.
const nezha = createPuppet(puppetOf('nezha'), scope);
nezha.bones = 21;
nezha.node.visible = false;
// He is a boy, and drawn small; on the stage he is shown a quarter larger, as the rules measure him.
nezha.scale(1.25);
nezha.layer(1, 'calm', 0);
nezha.layer(2, 'held', 0);
cast.addChild(nezha.node);
// Erlang, the hawk he becomes, and his hound wait out of sight too.
const [erlang, hawk, hound] = [['erlang', 18], ['hawk', 11], ['hound', 15]].map(([name, bones]) => {
  const puppet = createPuppet(puppetOf(name), scope);
  puppet.bones = bones;
  puppet.node.visible = false;
  cast.addChild(puppet.node);
  return puppet;
});
hawk.scale(1.5);
hound.scale(1.3);
// Laozi, and the staff his snare may take, standing where it was flung.
const sage = createPuppet(puppetOf('laozi'), scope);
sage.bones = 18;
sage.scale(1.2);
sage.node.visible = false;
cast.addChild(sage.node);
const staffShown = flights.addChild(scope.use(new Bitmap(art.staff)));
staffShown.scaleX = staffShown.scaleY = 14 / staffShown.naturalWidth;
staffShown.anchorOffsetX = staffShown.naturalWidth / 2;
staffShown.anchorOffsetY = staffShown.naturalHeight;
staffShown.visible = false;
const ringShown = flights.addChild(scope.use(new Bitmap(art.ring)));
ringShown.scaleX = ringShown.scaleY = (BOSS.ring.radius * 2.2) / ringShown.naturalWidth;
ringShown.anchorOffsetX = ringShown.naturalWidth / 2;
ringShown.anchorOffsetY = ringShown.naturalHeight / 2;
ringShown.visible = false;
// The clones stand between the soldiers and the Monkey King himself. Their puppets are made a few a frame once
// the stage is up, so that a hundred skeletons are waiting by the time a tuft can be plucked.
const mob = layer(cast);
mob.blendMode = shadowBlend;
const crowd = [];
function warm(some) {
  for (; some > 0 && crowd.length < TUFT; some--) {
    const puppet = createPuppet(puppetOf('wukong'), scope);
    puppet.bones = 25;
    puppet.scale(HAIRS.scale);
    puppet.node.visible = false;
    mob.addChild(puppet.node);
    crowd.push(puppet);
  }
}
const wukong = createPuppet(puppetOf('wukong'), scope);
wukong.bones = 25;
cast.addChild(wukong.node);
wukong.play('idle', { loop: true });
wukong.layer(1, 'held', 0);
/** Arrows in the air, each with the picture that shows it; and the alchemists' pills likewise. */
const arrows = new Map(),
  pills = new Map();
dress();

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
// Fire: from his wheels when he is angered, and along the ground where they have been.
const flames = emitter(art.spark, { maxParticles: 700, lifetime: [0.25, 0.6], speed: [40, 190], angle: [245, 295], gravity: { x: 0, y: -320 }, drag: 1.2, size: 24, startScale: [0.6, 1.3], endScale: 0.15, startColor: 0xffe08a, endColor: 0xff3a10, startAlpha: 0.95, endAlpha: 0, shape: { kind: 'rectangle', width: 26, height: 6 }, seed: 73 }, 'add');
const burst = (made, x, y, count) => {
  if (count <= 0) return;
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
/** Where the camera looks: a little ahead of him, and nowhere outside the court once he is met there. */
function aim() {
  const boss = act.boss,
    x = act.hero.x + lead;
  return { x: boss && present(boss) ? Math.min(boss.arena.right - STAGE.width / 2, Math.max(boss.arena.left + STAGE.width / 2, x)) : x, y: STAGE.height / 2 };
}
camera.follow(aim, { smoothing: 0.1 });

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
  $('hairs-fill').style.width = `${(act.hairs / HAIRS.need) * 100}%`;
  $('hairs').classList.toggle('is-ready', tuftReady(act));
  document.querySelector('.pads').classList.toggle('has-tuft', tuftReady(act));
  $('boss').hidden = !(act.boss && present(act.boss));
  if (act.boss) {
    $('boss-name').textContent = words.bosses[act.boss.kind].name;
    $('boss-health').style.width = `${(act.boss.health / ({ erlang: ERLANG, laozi: LAOZI }[act.boss.kind] ?? BOSS).health) * 100}%`;
  }
}
let noticeUntil = 0;
function notice(text) {
  $('notice').textContent = text;
  $('notice').hidden = false;
  noticeUntil = clock + 2.6;
}
/** The seal each act was last given. */
let ranks = {};
try {
  ranks = JSON.parse(localStorage.getItem('lantern-shadows-ranks')) ?? {};
} catch {
  ranks = {};
}
function showResult() {
  const result = act.result,
    words = WORDS[lang];
  $('result').hidden = !result;
  if (!result) return;
  $('result-title').textContent = words.curtain(words.titles[onStage]);
  $('next').hidden = !ACTS[ACTS.indexOf(onStage) + 1];
  // The seal of each act is kept, and when the last curtain falls all three are told together.
  ranks[onStage] = result.rank;
  try {
    localStorage.setItem('lantern-shadows-ranks', JSON.stringify(ranks));
  } catch {
    // Without anywhere to keep them they last as long as the page does.
  }
  $('finale').hidden = !$('next').hidden ? true : false;
  $('finale').textContent = `${words.finale}　${ACTS.map(name => `${words.places[name]} ${ranks[name] ?? words.unplayed}`).join('　')}`;
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
      // A blow of the crowd's is lighter on the ear and on the booth than one of his own.
      if (event.crowd) (sound.play('clap', { volume: 0.45, rate: 1.2 + Math.random() * 0.5, pan: panOf(event.at.x) }), camera.shake({ trauma: event.attack.shake }));
      else land(event.attack, pan);
      counted = true;
    } else if (type === 'deflect') {
      burst(sparks, event.at.x, event.at.y, event.ring ? 30 : 14);
      sound.play(event.ring ? 'smallGong' : 'clap', { volume: 0.8, rate: 1.5, pan: panOf(event.at.x) });
      freeze = Math.max(freeze, event.ring ? 0.08 : 0.04);
    } else if (type.startsWith('boss') || type.startsWith('ring') || type.startsWith('hound') || type.startsWith('staff') || type.startsWith('furnace-') && type !== 'furnace-tipped' || type.startsWith('drop') || type === 'gate-open') (told(event), (counted = true));
    else if (type === 'hairs-full') (notice(WORDS[lang].tuft), sound.play('smallGong', { volume: 0.6, rate: 1.5 }), (counted = true));
    else if (type === 'conjure') (sound.play('whirl', { volume: 0.8, rate: 1.3, pan }), (counted = true));
    else if (type === 'clones') {
      notice(WORDS[lang].blown);
      sound.play('gong', { volume: 1, rate: 0.9 });
      burst(dust, hero.x, hero.y - 40, 40);
      burst(sparks, hero.x, hero.y - 80, 30);
      camera.shake({ trauma: 0.7 });
      input.gamepads?.rumble(0, { duration: 300, weak: 0.9, strong: 0.6 });
      counted = true;
    } else if (type === 'clones-gone') {
      // Each goes in a puff, as far as the puffs go round.
      event.at.slice(0, 48).forEach(at => burst(dust, at.x, at.y - 30, 4));
      sound.play('whirl', { volume: 0.6, rate: 0.8, pan });
      counted = true;
    } else if (type === 'foe-block') {
      // The shield takes it: a dull ring, and a few sparks where the staff met it.
      const { foe } = event;
      burst(sparks, foe.x + foe.facing * 28, foe.y - 62, 8);
      sound.play('tap', { volume: 0.9, rate: 0.45, pan: panOf(foe.x) });
      sound.play('smallGong', { volume: 0.3, rate: 2.2, pan: panOf(foe.x) });
      camera.shake({ trauma: 0.16 });
      freeze = Math.max(freeze, 0.03);
    } else if (type === 'foe-open') (burst(sparks, event.foe.x, event.foe.y - 70, 22), sound.play('smallGong', { volume: 0.7, rate: 1.2, pan: panOf(event.foe.x) }));
    else if (type === 'foe-dive') sound.play('swish', { volume: 0.6, rate: 1.7, pan: panOf(event.foe.x) });
    else if (type === 'gust') sound.play('whirl', { volume: 0.7, rate: 0.7, pan: panOf(event.foe.x) });
    else if (type === 'pill') sound.play('swish', { volume: 0.5, rate: 1.5, pan: panOf(event.foe.x) });
    else if (type === 'burst') {
      burst(sparks, event.at.x, event.at.y - 10, 44);
      burst(dust, event.at.x, event.at.y, 16);
      sound.play('drum', { volume: 0.9, rate: 0.8, pan: panOf(event.at.x) });
      sound.play('clap', { volume: 0.6, rate: 0.7, pan: panOf(event.at.x) });
      camera.shake({ trauma: 0.3 });
    } else if (type === 'furnace-tipped') {
      burst(sparks, event.furnace.x, event.furnace.y - 50, 30);
      sound.play('smallGong', { volume: 0.8, rate: 0.7, pan: panOf(event.furnace.x) });
      sound.play('drum', { volume: 0.8, rate: 0.6, pan: panOf(event.furnace.x) });
      camera.shake({ trauma: 0.35 });
      counted = true;
    } else if (type === 'vent-on') inView(event.vent.x, camera.snapshot().center.x) && sound.play('whirl', { volume: 0.25, rate: 0.5, pan: panOf(event.vent.x) });
    else if (type === 'peach-struck') (burst(dust, event.at.x, event.at.y, 5), sound.play('tap', { volume: 0.5, rate: 1.6, pan: panOf(event.at.x) }));
    else if (type === 'peach') (burst(sparks, event.at.x, event.at.y, 14), sound.play('smallGong', { volume: 0.5, rate: 1.9, pan }), (counted = true));
    else if (type === 'foe-windup') sound.play('tap', { volume: 0.7, rate: event.foe.kind === 'archer' ? 1.8 : 0.6, pan: panOf(event.foe.x) });
    else if (type === 'foe-strike' || type === 'arrow') sound.play('swish', { volume: 0.55, rate: type === 'arrow' ? 1.7 : 1.3, pan: panOf(type === 'arrow' ? event.arrow.x : event.foe.x) });
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

/** What whoever bars the gate does, as it is heard and felt. */
function told(event) {
  const boss = act.boss,
    pan = panOf(boss.x),
    words = WORDS[lang].bosses[boss.kind],
    { type, move } = event;
  if (type === 'boss-enter') (notice(words.enter), sound.play('gong', { volume: 1, rate: 0.7 }));
  // Erlang changes his shape in a puff of smoke; he lands from a leap with his whole weight; and his hound is
  // heard before it is seen to run.
  else if (type === 'boss-change') (burst(dust, boss.x, boss.y - boss.rise - 70, 36), burst(sparks, boss.x, boss.y - boss.rise - 70, 16), sound.play('whirl', { volume: 0.8, rate: event.form === 'hawk' ? 1.6 : 1, pan }));
  else if (type === 'boss-land') (burst(dust, boss.x, boss.y, 26), sound.play('drum', { volume: 1, rate: 0.5, pan }), camera.shake({ trauma: 0.4 + boss.size * 0.2 }), (freeze = Math.max(freeze, 0.05)));
  else if (type === 'hound-windup') (sound.play('tap', { volume: 0.9, rate: 0.38, pan: panOf(event.hound.x) }), sound.play('tap', { volume: 0.7, rate: 0.44, pan: panOf(event.hound.x) }));
  else if (type === 'hound-run') sound.play('swish', { volume: 0.6, rate: 0.7, pan: panOf(event.hound.x) });
  else if (type === 'hound-yelp') sound.play('clap', { volume: 0.7, rate: 1.9, pan: panOf(event.hound.x) });
  // Laozi: the snare carrying off the staff, the staff found again, and the furnace shut and broken out of.
  else if (type === 'staff-taken') (burst(sparks, event.at.x, event.at.y, 40), sound.play('gong', { volume: 0.8, rate: 1.6 }), camera.shake({ trauma: 0.5 }), (freeze = Math.max(freeze, 0.12)), notice(WORDS[lang].taken));
  else if (type === 'staff-thrown') sound.play('swish', { volume: 0.7, rate: 0.8, pan });
  else if (type === 'staff-back') (burst(sparks, act.hero.x, act.hero.y - 70, 26), sound.play('smallGong', { volume: 0.8, rate: 1.3 }), notice(WORDS[lang].regained));
  else if (type === 'furnace-shut') {
    sound.play('gong', { volume: 1, rate: 0.5 });
    sound.play('drum', { volume: 1, rate: 0.45 });
    camera.shake({ trauma: 1 });
    freeze = Math.max(freeze, 0.25);
    notice(WORDS[lang].shut(LAOZI.furnace.seconds));
  } else if (type === 'drop') sound.play('tap', { volume: 0.4, rate: 1.9, pan: panOf(event.drop.x) });
  else if (type === 'drop-landed') (burst(flames, event.at.x, event.at.y - 6, 16), burst(dust, event.at.x, event.at.y, 6), sound.play('drum', { volume: 0.5, rate: 1.1, pan: panOf(event.at.x) }));
  else if (type === 'furnace-broken') {
    sound.play('gong', { volume: 1, rate: 1 });
    sound.play('gong', { volume: 0.8, rate: 0.5 });
    burst(sparks, act.hero.x, act.hero.y - 70, 120);
    camera.shake({ trauma: 1 });
    camera.zoomTo(1.12, 0.08);
    zoomBack = 0.7;
    freeze = Math.max(freeze, 0.35);
    flash = 1;
    notice(WORDS[lang].broken);
  }
  else if (type === 'boss-ready' || type === 'boss-halt') (sound.play('drum', { volume: 0.9, rate: 0.6, pan }), camera.shake({ trauma: 0.3 }), burst(dust, boss.x, boss.y, 14));
  else if (type === 'boss-windup') sound.play(move === 'charge' ? 'whirl' : 'tap', { volume: 0.8, rate: move === 'charge' ? 0.55 : move === 'ring' ? 1.5 : 0.5, pan });
  else if (type === 'boss-strike') (sound.play(move === 'charge' ? 'whirl' : 'swish', { volume: 0.8, rate: move === 'sweep' ? 0.8 : 1.2, pan }), move === 'charge' && camera.shake({ trauma: 0.4 }));
  else if (type === 'ring') sound.play('whirl', { volume: 0.6, rate: 1.7, pan });
  else if (type === 'ring-caught') sound.play('tap', { volume: 0.6, rate: 1.4, pan });
  else if (type === 'ring-home') (burst(sparks, event.at.x, event.at.y, 36), (freeze = Math.max(freeze, 0.1)), camera.shake({ trauma: 0.6 }));
  else if (type === 'boss-stun') sound.play('smallGong', { volume: 0.9, rate: 0.8, pan });
  else if (type === 'boss-phase' || type === 'boss-down') {
    // The turn of the fight: everything holds its breath, and the booth shakes.
    const last = type === 'boss-down';
    sound.play('gong', { volume: 1, rate: last ? 0.5 : 0.62 });
    sound.play('drum', { volume: 1, rate: 0.5 });
    burst(sparks, boss.x, boss.y - 70, 60);
    freeze = Math.max(freeze, last ? 0.34 : 0.2);
    camera.shake({ trauma: 1 });
    camera.zoomTo(last ? 1.12 : 1.08, 0.08);
    zoomBack = last ? 0.7 : 0.4;
    input.gamepads?.rumble(0, { duration: 400, weak: 1, strong: 1 });
    if (!last) notice(words.phases[event.phase]);
  } else if (type === 'gate-open') (notice(words.opened), sound.play('smallGong', { volume: 0.7, rate: 1.1 }));
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
    puppet.play(shown.name, { loop: shown.name === 'idle' || shown.name === 'walk' || shown.name === 'fly' || shown.name === 'dive', key: shown.key, mix: shown.name === 'attack' || shown.name === 'block' ? 0.03 : 0.08 });
    puppet.face(foe.facing);
    puppet.node.x = foe.x;
    puppet.node.y = foe.y;
    // A fallen soldier fades from the cloth as he is cleared away.
    puppet.node.alpha = foe.state === 'down' ? Math.max(0, Math.min(1, (1.3 - foe.time) / 0.5)) : 1;
    puppet.speed(held);
    moving.push(puppet);
  });
  // The clones: each puppet of the crowd shows one of them, as many as the stage is drawn fast enough to carry.
  warm(2);
  let shown = 0;
  for (let index = 0; index < crowd.length; index++) {
    const puppet = crowd[index],
      clone = act.clones[index],
      visible = !!clone && out(clone) && index < carried;
    puppet.node.visible = visible;
    if (!visible) continue;
    shown++;
    const doing = cloneAnimation(clone);
    puppet.play(doing.name, { loop: doing.loop, key: doing.key, mix: 0.05 });
    puppet.face(clone.facing);
    puppet.node.x = clone.x;
    puppet.node.y = clone.y;
    puppet.speed(held);
    if (inView(clone.x, centre)) moving.push(puppet);
  }

  /** So many a second, as how many for this frame, whatever the frame's length. */
  const some = rate => Math.floor(rate * dt) + (Math.random() < (rate * dt) % 1 ? 1 : 0);
  // Nezha: what he is doing, with his rage and the ring in his hand each shown or put away on a track of its own.
  const boss = act.boss,
    met = !!boss && present(boss),
    here = met && boss.kind === 'nezha';
  nezha.node.visible = here;
  ringShown.visible = here && !!boss.ring;
  // Laozi; his snare in the air; the staff it took, in flight and then standing where it fell; and his furnace:
  // two walls of fire, and what falls between them, shown on the floor before it comes.
  const old = met && boss.kind === 'laozi';
  sage.node.visible = old && boss.state !== 'furnace';
  if (met && boss.kind !== 'nezha') ringShown.visible = !!boss.ring;
  staffShown.visible = old && !!boss.staff;
  wukong.layer(1, act.hero.bare ? 'bare' : 'held', 0);
  if (old) {
    const shown = laoziAnimation(boss);
    sage.play(shown.name, { loop: shown.loop, key: shown.key, mix: boss.state === 'attack' ? 0.03 : 0.1 });
    sage.face(boss.facing);
    sage.node.x = boss.x;
    sage.node.y = boss.y - boss.rise;
    sage.node.alpha = boss.state === 'yield' ? Math.max(0, Math.min(1, (LAOZI.yield - boss.time) / 0.5)) : 1;
    sage.speed(held);
    if (sage.node.visible) moving.push(sage);
    if (boss.ring) ((ringShown.x = boss.ring.x), (ringShown.y = boss.ring.y), (ringShown.rotation = (ringShown.rotation + (still ? 0 : dt * 1100)) % 360));
    if (boss.staff) {
      // Flung, it turns end over end along an arc; landed, it stands in the floor.
      const flown = 1 - Math.max(0, boss.staff.wait) / LAOZI.staff.flight;
      staffShown.x = boss.staff.from.x + (boss.staff.x - boss.staff.from.x) * flown;
      staffShown.y = boss.staff.from.y + (boss.staff.y - boss.staff.from.y) * flown - 220 * flown * (1 - flown);
      staffShown.rotation = flown < 1 ? flown * 720 : 8;
    }
    const walls = furnaceWalls(boss);
    if (walls && !still) {
      for (const [x, lean] of [[walls.left - 14, 1], [walls.right + 14, -1]]) for (let n = some(520); n > 0; n--) burst(flames, x + lean * Math.random() * 16, boss.y - Math.random() * 430, 1);
      for (const drop of boss.drops) drop.warn > 0 ? burst(sparks, drop.x + (Math.random() - 0.5) * 30, boss.y - 4, some(60)) : burst(flames, drop.x, drop.y - 20, some(260));
      const left = Math.ceil(LAOZI.furnace.seconds - boss.time);
      if (left !== told.left && left > 0 && left < LAOZI.furnace.seconds) ((told.left = left), notice(WORDS[lang].shut(left)));
    }
  }
  // Out of the furnace his eyes burn.
  if (act.keen && !still) burst(sparks, act.hero.x + act.hero.facing * 10, act.hero.y - 96, some(26));
  // Erlang: himself or the hawk, whichever he is; grown as he has grown; and his hound when it shows itself.
  const god = met && boss.kind === 'erlang';
  erlang.node.visible = god && boss.form === 'man';
  hawk.node.visible = god && boss.form === 'hawk';
  hound.node.visible = false;
  if (god) {
    const shown = erlangAnimation(boss),
      puppet = boss.form === 'man' ? erlang : hawk;
    // He is drawn a soldier's size, and stands a third taller; grown, as much again as the rules say.
    erlang.scale(1.3 * boss.size);
    puppet.play(shown.name, { loop: shown.loop, key: shown.key, mix: boss.state === 'attack' ? 0.03 : 0.1 });
    puppet.face(boss.facing);
    puppet.node.x = boss.x;
    puppet.node.y = boss.y - boss.rise;
    puppet.node.alpha = boss.state === 'yield' ? Math.max(0, Math.min(1, (ERLANG.yield - boss.time) / 0.5)) : 1;
    puppet.speed(held);
    moving.push(puppet);
    const running = houndAnimation(boss.hound);
    if (running) {
      hound.node.visible = true;
      hound.play(running.name, { loop: running.loop, key: running.key, mix: 0.05 });
      hound.face(boss.hound.facing);
      hound.node.x = boss.hound.x;
      hound.node.y = boss.hound.y;
      hound.speed(held);
      moving.push(hound);
    }
    // The waves his landing sends along the ground are dust thrown up, with sparks in it.
    if (!still) for (const wave of boss.waves) (burst(dust, wave.x, boss.y - 6, some(150)), burst(sparks, wave.x, boss.y - 18, some(70)));
  }
  if (here) {
    const shown = bossAnimation(boss);
    nezha.play(shown.name, { loop: shown.loop, key: shown.key, mix: boss.state === 'attack' ? 0.03 : 0.1 });
    nezha.layer(1, boss.phase === 2 && boss.state !== 'flee' ? 'wrath' : 'calm', 0.5);
    nezha.layer(2, boss.ring ? 'bare' : 'held', 0);
    nezha.face(boss.facing);
    nezha.node.x = boss.x;
    nezha.node.y = boss.y - boss.rise;
    nezha.node.alpha = boss.state === 'flee' ? Math.max(0, Math.min(1, (BOSS.flee - boss.time) / 0.4)) : 1;
    nezha.speed(held);
    moving.push(nezha);
    if (boss.ring) {
      ringShown.x = boss.ring.x;
      ringShown.y = boss.ring.y;
      ringShown.rotation = (ringShown.rotation + (still ? 0 : dt * 1100)) % 360;
    }
    if (!still) {
      // His wheels burn once he is angered, and harder as he rides them; the ground burns where they went.
      const riding = boss.state === 'attack' && boss.move === 'charge';
      if (boss.phase === 2 || riding) burst(flames, boss.x - boss.facing * 8, boss.y - boss.rise - 10, some(riding ? 240 : 50));
      for (const fire of boss.fires) {
        const span = Math.abs(fire.to - fire.from);
        for (let n = some(span * 0.24); n > 0; n--) burst(flames, Math.min(fire.from, fire.to) + Math.random() * span, boss.y - 4, 1);
      }
    }
  }
  const before = performance.now();
  if (tick) {
    for (const puppet of moving) puppet.advance(tick);
    tick = undefined;
  }
  measure(shown, moving, performance.now() - before);

  // The palace's fires. A grate sputters before its turn and stands alight in it; a furnace knocked over lies on
  // its side with its fire along the floor; a fan's wind is dust blown the way it blows, and what it sends along
  // the floor is a tongue of flame.
  if (!still) {
    for (const vent of act.vents) {
      if (!inView(vent.x, centre) || vent.state === 'off' || !vent.state) continue;
      const alight = vent.state === 'on';
      for (let n = some(alight ? 300 : 50); n > 0; n--) burst(flames, vent.x + (Math.random() - 0.5) * 30, vent.y - 8 - (alight ? Math.random() * 60 : 0), 1);
    }
    for (const furnace of act.furnaces) for (let n = furnace.life > 0 ? some(FURNACE.spill * 0.5) : 0; n > 0; n--) burst(flames, furnace.x + furnace.side * Math.random() * FURNACE.spill, furnace.y - 4, 1);
    for (const foe of act.foes) for (let n = foe.gust > 0 ? some(90) : 0; n > 0; n--) burst(dust, foe.x + foe.facing * (30 + Math.random() * FOES.fanner.gust.reach), foe.y - 16 - Math.random() * 80, 1);
    for (const arrow of act.arrows) if (arrow.kind === 'ember') (burst(flames, arrow.x, arrow.y + 8, some(160)), burst(sparks, arrow.x, arrow.y, some(30)));
  }
  act.furnaces.forEach((furnace, index) => {
    const shown = furnacesShown[index],
      lying = furnace.state === 'tipped' ? furnace.side * 84 : 0;
    shown.rotation += (lying - shown.rotation) * Math.min(1, dt * 14);
    // On its side it rests on its belly, not on the point it was turned about.
    shown.y = furnace.y - (Math.abs(shown.rotation) / 84) * 36;
  });
  // Pills: a picture for each, turning as it flies and winking as it lies lit.
  for (const pill of act.pills) {
    let shown = pills.get(pill);
    if (!shown) {
      shown = flights.addChild(new Bitmap(art.pill));
      shown.scaleX = shown.scaleY = 20 / shown.naturalWidth;
      shown.anchorOffsetX = shown.naturalWidth / 2;
      shown.anchorOffsetY = shown.naturalHeight / 2;
      pills.set(pill, shown);
    }
    shown.x = pill.x;
    shown.y = pill.y;
    shown.rotation = pill.state === 'fly' ? pill.time * 900 : 0;
    shown.alpha = pill.state === 'fuse' && Math.floor(pill.time * 18) % 2 ? 0.4 : 1;
  }
  for (const [pill, shown] of pills)
    if (!act.pills.includes(pill)) {
      shown.dispose();
      pills.delete(pill);
    }
  // Arrows: a picture for each one in the air, turned the way it flies.
  for (const arrow of act.arrows) {
    if (arrow.kind === 'ember') continue;
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
  // Peaches: one on its bough stirs a little; one that has been eaten is gone.
  act.peaches.forEach((peach, index) => {
    const shown = peachesShown[index];
    shown.visible = peach.state !== 'eaten';
    shown.x = peach.x;
    shown.y = peach.y;
    shown.rotation = peach.state === 'hung' ? Math.sin(clock * 1.7 + index * 2) * 7 : 0;
  });

  for (const made of [sparks, straw, dust, flames]) made.update(still ? 0 : dt);
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
  // Shut in the furnace the whole cloth darkens and shudders with the fire; breaking out of it is a white flash.
  const shutIn = act.boss?.state === 'furnace' ? 0.16 + 0.05 * Math.sin(clock * 11) : 0;
  flash = Math.max(0, flash - dt * 2.4);
  flicker.alpha = 0.05 + 0.02 * Math.sin(clock * 2.3) + 0.012 * Math.sin(clock * 7.9 + 1) + 0.01 * Math.sin(clock * 23.7) + shutIn;
  glare.alpha = flash * 0.85;

  if (!$('notice').hidden && clock > noticeUntil) $('notice').hidden = true;
  if (playing && act.state === 'play') {
    const total = Math.floor(act.time);
    $('clock').textContent = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }
  if (stats) showStats(moving.length);
}

// How fast the stage is being drawn, by the clock on the wall; and, while the clones are out, the line that
// tells how many there are and how many bones are being moved for them all.
let lastFrame = performance.now(),
  frameMs = 16.7,
  poseMs = 0,
  slowFor = 0,
  toldAt = 0,
  carried = TUFT;
function measure(shown, moving, posing) {
  const now = performance.now(),
    took = Math.min(500, now - lastFrame);
  lastFrame = now;
  frameMs += (took - frameMs) * 0.1;
  poseMs += (posing - poseMs) * 0.1;
  $('crowd').hidden = shown === 0;
  if (shown === 0) return void (slowFor = 0);
  // A stage that cannot carry them all sends some of the hairs back, unless the address asked for every one.
  slowFor = frameMs > 45 && !paused ? slowFor + took : 0;
  if (!keepAll && slowFor > 700 && carried > 20) ((carried = Math.max(20, Math.floor(carried * 0.7))), (slowFor = 0));
  if (now - toldAt < 200) return;
  toldAt = now;
  $('crowd').textContent = WORDS[lang].crowd(shown, moving.reduce((sum, puppet) => sum + puppet.bones, 0), Math.round(1000 / frameMs));
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
  stats.textContent = `${game.backend}  ${rate.toFixed(0)} fps\npuppets moving ${moved} of ${posts.length + soldiers.length + 2 + crowd.length}, posed in ${poseMs.toFixed(1)} ms\n${animationOf(act.hero).name}  x ${act.hero.x.toFixed(0)}  y ${act.hero.y.toFixed(0)}`;
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
  act = createAct(level, { from, clones: TUFT });
  for (const shown of [...arrows.values(), ...pills.values()]) shown.dispose();
  arrows.clear();
  pills.clear();
  for (const shown of furnacesShown) shown.rotation = 0;
  freeze = carry = lead = 0;
  camera.zoomTo(1, 0);
  camera.lookAt(act.hero.x, STAGE.height / 2);
  camera.follow(aim, { smoothing: 0.1 });
  showResult();
  showCombo(false);
  showCount();
  canvas.focus();
}
$('again').addEventListener('click', again);

/** Sets the stage for an act: from its beginning, or (the first act) from the court before the gate. */
function setAct(name, where) {
  from = where;
  if (name !== onStage) {
    undress();
    onStage = name;
    level = levels[name];
    mapSource = maps[name];
    act = createAct(level, { from, clones: TUFT });
    dress();
    camera.setBounds({ x: 0, y: 0, width: level.width, height: STAGE.height });
  }
  again();
}
$('next').addEventListener('click', () => {
  setAct(ACTS[ACTS.indexOf(onStage) + 1]);
  notice(WORDS[lang].titles[onStage]);
  sound.play('gong', { volume: 0.9 });
});

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
const start = $('start'),
  startBoss = $('start-boss');
start.disabled = startBoss.disabled = false;
filled();
$('filling').hidden = true;
status.textContent = '';
status.removeAttribute('data-zh');
/** Raises the curtain on an act, from its beginning or (the first act) from the court before the gate. */
function raise(name, where) {
  if (name !== onStage || where !== from) setAct(name, where);
  playing = true;
  $('curtain').classList.add('is-up');
  $('hud').hidden = false;
  showCount();
  sound.begin().then(() => sound.play('gong', { volume: 0.9 }));
  canvas.focus();
}
// The gong begins wherever the address says, the first act if it says nothing; the lines under it choose for themselves.
const [openingAct, openingFrom] = [onStage, from];
start.addEventListener('click', () => raise(openingAct, openingFrom));
startBoss.addEventListener('click', () => raise('act1', 'boss'));
$('start-act2').disabled = $('start-erlang').disabled = false;
$('start-act2').addEventListener('click', () => raise('act2'));
$('start-erlang').addEventListener('click', () => raise('act2', 'boss'));
$('start-act3').disabled = $('start-laozi').disabled = false;
$('start-laozi').addEventListener('click', () => raise('act3', 'boss'));
$('start-act3').addEventListener('click', () => raise('act3'));

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
  begin: where => (where === 'nezha' ? startBoss : where === 'act2' ? $('start-act2') : where === 'erlang' ? $('start-erlang') : where === 'act3' ? $('start-act3') : where === 'laozi' ? $('start-laozi') : start).click(),
  get stage() {
    return onStage;
  },
  next: () => $('next').click(),
  get boss() {
    return act.boss;
  },
  crowd: () => ({ made: crowd.length, carried, frameMs, poseMs }),
  tap: action => input.tap(action),
  hold: (action, down) => input.hold(action, down),
  sounds: () => sound.ready,
  pause,
  again,
  health: TUNE.health
};
