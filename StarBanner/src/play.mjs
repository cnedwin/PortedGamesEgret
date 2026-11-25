// 一局战斗：把规则的状态摆到 3D 棋盘上，接收玩家的操作（选单位 → 选格子移动 → 选行动 → 选目标），把规则返回的
// 事件一件件演出来（走、出手、飞行道具、伤害数字、暴击、倒下、占领、招募……），轮到电脑时一步步替它下，再在每次
// 行动后把整盘存下来。
// One battle: the rules' state set out on the 3D board, the player's orders taken (pick a unit → pick a tile → pick an
// action → pick a target), the events the rules return played out one by one (walks, blows, missiles, damage
// figures, criticals, falls, captures, recruits…), the computer's turns played a step at a time, and the whole board
// saved after every action.
import { projectToViewport3D } from '@egret/engine/world3d';
import { createGame, act, reach, stops, pathTo, targetsFrom, forecast, actionsAt, unitAt, buildingAt, unitById, buildingById, terrainAt, recruitSpots, reinforcePlan, unloadSpots, distance, commanderOf, cloneGame, artReady } from './sim/rules.mjs';
import { createBrain, nextOrder } from './sim/ai.mjs';
import { UNITS, BUILDINGS, recruitsOf, isAir } from './sim/units.mjs';
import { COMMANDERS } from './sim/commanders.mjs';
import { mapById } from './sim/maps.mjs';
import { buildBoard } from './view/board.mjs';
import { createOverlay } from './view/overlay.mjs';
import { createEffects } from './view/effects.mjs';
import { createLibrary, makeFigure, makeBuilding, modelOf, BUILDING_BODY, BODY } from './view/figures.mjs';
import { loadModel, propFrom, SET_OF } from './view/assets.mjs';
import { TEAMS } from './view/toon.mjs';
import { TILE } from './view/stage.mjs';
import { createHud } from './hud.mjs';
import { t, say } from './i18n.mjs';

const WATER = new Set(['sea', 'ocean', 'reef', 'river', 'dock']);
const MISSILE = { archer: 'arrow', ballista: 'bolt', trebuchet: 'stone', mage: 'magic', witch: 'magic', harpoonship: 'harpoon', warship: 'shell', wyvern: 'fire' };
const STRIKE_SOUND = { swordsman: 'slash', commander: 'slash', pikeman: 'thrust', hound: 'bite', knight: 'thrust', giant: 'thud', archer: 'bow', ballista: 'bolt', trebuchet: 'catapult', mage: 'magic', witch: 'magic', wyvern: 'fire', griffin: 'slash', turtle: 'bite', harpoonship: 'bolt', warship: 'catapult', merfolk: 'thrust' };
const HIT_SOUND = { stone: 'crash', shell: 'crash', bolt: 'thud', magic: 'magic', fire: 'fire' };

/** An interface that shows nothing, for the title's background battle. */
function quietHud() {
  const nothing = () => {};
  return new Proxy(
    { menuOpen: false, buttons: {}, menu: async () => null, banner: async () => {} },
    { get: (target, key) => (key in target ? target[key] : nothing) }
  );
}

/** The props every board uses, loaded once per page and quality. */
const propCache = new Map();
export async function boardProps(set) {
  if (!propCache.has(set))
    propCache.set(
      set,
      Promise.all(['oak', 'pine', 'crag', 'rocks'].map((n) => loadModel(n, set))).then(([oak, pine, crag, rocks]) => ({
        oak: propFrom(oak, 1.75),
        pine: propFrom(pine, 2.1),
        crag: propFrom(crag, 2.3, { by: 'width' }),
        rocks: propFrom(rocks, 1.0, { by: 'width' })
      }))
    );
  return propCache.get(set);
}

/**
 * Start a battle on the app's stage. `setup` = { map, sides: [{ commander, ai, level }], human, seed }; `saved` is a
 * kept game to resume. Returns { dispose, update, command }.
 */
export async function startBattle(app, { setup, saved = null, attract = false }) {
  const { stage, ui } = app;
  // The title's background is a battle between two computer sides with no interface and no sound of its own.
  const sound = attract ? { play() {}, music() {} } : app.sound;
  const map = mapById(setup.map);
  const game = saved ? { ...saved, events: [] } : createGame(map, setup.sides, setup.seed ?? 1);
  const human = setup.human ?? 0;
  const brains = setup.sides.map((s) => (s.ai ? createBrain(s.level ?? 'normal') : null));
  const speedOf = () => (attract ? 1.4 : [1, 1, 1.8, 3.2][app.settings.speed] ?? Number(app.settings.speed) ?? 1.8);
  const reduce = () => app.reducedMotion;

  // ---- the board ----
  stage.setLook(map.look);
  const set = SET_OF[stage.quality] ?? 'mid';
  const bounds = { w: game.w, h: game.h, water: (x, y) => WATER.has(game.terrain[y * game.w + x]) };
  const [props, library] = await Promise.all([boardProps(set), Promise.resolve(app.library ?? (app.library = createLibrary(set)))]);
  const board = buildBoard(stage.scene, game, { look: map.look, props, quality: stage.quality, seed: map.id.length * 97 });
  const wanted = new Set([...Object.values(BUILDING_BODY).map((b) => b.model), ...game.players.map((p) => p.commander)]);
  for (const u of game.units) wanted.add(modelOf(u));
  // The units the sides can recruit on this map load in the background after the first picture.
  await library.want([...wanted]);
  const later = new Set();
  for (const b of game.buildings) for (const type of recruitsOf(b.kind)) later.add(type);
  void library.want([...later]);

  const overlay = createOverlay(stage.scene, bounds);
  const fx = createEffects(stage.scene, { amount: stage.quality === 'low' ? 0.5 : 1 });
  const figures = new Map();
  const pieces = new Map();
  const addFigure = (unit) => {
    const f = makeFigure(library, unit, bounds, TEAMS[unit.owner]);
    f.setSpeed(speedOf());
    f.setDone(unit.done && unit.owner === game.current);
    stage.scene.addChild(f.holder);
    figures.set(unit.id, f);
    return f;
  };
  for (const u of game.units) addFigure(u);
  for (const u of game.units) for (const c of u.cargo) addFigure(c).holder.visible = false;
  for (const b of game.buildings) {
    const piece = makeBuilding(library, b, bounds);
    stage.scene.addChild(piece.holder);
    pieces.set(b.id, piece);
  }

  stage.rig.setBounds(game.w, game.h);
  const home = commanderOf(game, human) ?? game.units.find((u) => u.owner === human);
  const cursor = { x: home?.x ?? 0, y: home?.y ?? 0 };
  stage.rig.focus(cursor.x, cursor.y);
  stage.rig.snap();

  // ---- interface ----
  const hud = attract ? quietHud() : createHud(ui, { onButton: (key) => command(key, { device: 'button' }), touch: app.touch });
  const s = { mode: 'busy', sel: null, reached: null, dest: null, targets: [], ti: 0, threat: false, over: false, disposed: false, dropQueue: null, drops: [], aiRunning: false };
  const isHumanTurn = () => game.current === human && !game.over;

  const worldOf = (x, y, h = 0) => [(x + 0.5 - game.w / 2) * TILE, h, (y + 0.5 - game.h / 2) * TILE];
  const screenOf = (p) => {
    const w = stage.canvas.clientWidth,
      h = stage.canvas.clientHeight;
    const v = projectToViewport3D(stage.camera, p, w, h);
    return { x: v.x, y: v.y, ok: v.inFront };
  };
  const heightAt = (x, y) => {
    const u = unitAt(game, x, y);
    if (u) return (BODY[modelOf(u)]?.h ?? 1.6) + (BODY[modelOf(u)]?.hover ?? 0);
    const b = buildingAt(game, x, y);
    if (b) return BUILDING_BODY[b.kind].h;
    return 0.6;
  };
  const wait = (seconds) => new Promise((r) => setTimeout(r, (seconds * 1000) / speedOf()));

  function refreshTop() {
    hud.top({
      turn: game.turn,
      current: game.current,
      human,
      players: game.players.map((p, i) => ({ ...p, hp: commanderOf(game, i)?.hp ?? 0 }))
    });
  }
  function refreshCards() {
    const u = unitAt(game, cursor.x, cursor.y) ?? (s.sel && s.dest && s.dest.x === cursor.x && s.dest.y === cursor.y ? unitById(game, s.sel) : null);
    const b = buildingAt(game, cursor.x, cursor.y);
    hud.tile({ terrain: terrainAt(game, cursor.x, cursor.y), building: b, human });
    hud.unit(u ? { unit: u } : null);
  }
  function setCursor(x, y, { focus = false } = {}) {
    cursor.x = Math.max(0, Math.min(game.w - 1, x));
    cursor.y = Math.max(0, Math.min(game.h - 1, y));
    overlay.cursor(cursor.x, cursor.y, heightAt(cursor.x, cursor.y));
    if (focus) stage.rig.focus(cursor.x, cursor.y);
    else keepInView();
    refreshCards();
    hoverChanged();
  }
  /** Pans when the cursor nears the edge of the screen. */
  function keepInView() {
    const p = screenOf(worldOf(cursor.x, cursor.y));
    const w = stage.canvas.clientWidth,
      h = stage.canvas.clientHeight;
    const mx = w * 0.16,
      my = h * 0.2;
    if (p.x < mx || p.x > w - mx || p.y < my + 30 || p.y > h - my) stage.rig.focus(cursor.x, cursor.y);
  }

  // ---- marks ----
  function idleMarks() {
    const marks = [];
    if (s.threat) for (const k of threatTiles()) marks.push({ x: k % 1000, y: Math.floor(k / 1000), kind: 'threat' });
    const u = unitAt(game, cursor.x, cursor.y);
    if (u && s.mode === 'idle') {
      // Hovering a unit shows where it could go and strike.
      const r = reach(game, u);
      const can = stops(game, u, r);
      for (const n of can) marks.push({ x: n.x, y: n.y, kind: 'move' });
      for (const k of strikeRing(u, can)) marks.push({ x: k % 1000, y: Math.floor(k / 1000), kind: 'attack' });
    }
    overlay.tiles(marks);
    overlay.path([]);
  }
  function strikeRing(u, can) {
    const w = UNITS[u.type].weapon;
    const out = new Set();
    if (!w) return out;
    const from = w.mobile ? can : [{ x: u.x, y: u.y }];
    const inside = new Set(can.map((n) => n.y * 1000 + n.x));
    for (const n of from)
      for (let dy = -w.max; dy <= w.max; dy++)
        for (let dx = -w.max; dx <= w.max; dx++) {
          const d = Math.abs(dx) + Math.abs(dy);
          const x = n.x + dx,
            y = n.y + dy;
          if (d < w.min || d > w.max || x < 0 || y < 0 || x >= game.w || y >= game.h) continue;
          if (!inside.has(y * 1000 + x)) out.add(y * 1000 + x);
        }
    return out;
  }
  function threatTiles() {
    const all = new Set();
    for (const foe of game.units) {
      if (foe.owner === human) continue;
      const can = stops(game, { ...foe, done: false });
      for (const k of strikeRing(foe, can)) all.add(k);
      for (const n of can) if (UNITS[foe.type].weapon?.mobile && UNITS[foe.type].weapon.min === 1) all.add(n.y * 1000 + n.x);
    }
    return all;
  }
  function moveMarks() {
    const u = unitById(game, s.sel);
    const can = stops(game, u, s.reached);
    const marks = can.map((n) => ({ x: n.x, y: n.y, kind: 'move' }));
    for (const k of strikeRing(u, can)) marks.push({ x: k % 1000, y: Math.floor(k / 1000), kind: 'attack' });
    overlay.tiles(marks);
    const node = s.reached.get(cursor.y * 1000 + cursor.x);
    overlay.path(node ? pathTo(s.reached, cursor.x, cursor.y) : []);
  }
  function hoverChanged() {
    if (s.mode === 'idle') idleMarks();
    else if (s.mode === 'move') moveMarks();
    else if (s.mode === 'target') {
      const i = s.targets.findIndex((v) => v.x === cursor.x && v.y === cursor.y);
      if (i >= 0 && i !== s.ti) {
        s.ti = i;
        showForecast();
      }
    } else if (s.mode === 'dir') {
      const u = unitById(game, s.sel);
      const dx = cursor.x - s.dest.x,
        dy = cursor.y - s.dest.y;
      if (dx || dy) s.dir = Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
      artMarks(u);
    } else if (s.mode === 'tile') tileMarks();
  }

  // ---- the turn of the human ----
  function beginIdle() {
    s.mode = 'idle';
    s.sel = null;
    s.reached = null;
    s.dest = null;
    hud.forecast(null);
    hud.hint(null);
    hud.setBusy(false);
    overlay.showCursor(true);
    setCursor(cursor.x, cursor.y);
  }
  function selectUnit(u) {
    s.sel = u.id;
    s.reached = reach(game, u);
    s.mode = 'move';
    sound.play('select');
    moveMarks();
  }
  async function chooseDest(x, y) {
    const u = unitById(game, s.sel);
    const node = s.reached.get(y * 1000 + x);
    const ok = stops(game, u, s.reached).some((n) => n.x === x && n.y === y);
    if (!node || !ok) return sound.play('error');
    sound.play('confirm');
    s.dest = { x, y };
    s.mode = 'busy';
    overlay.tiles([]);
    overlay.path([]);
    const path = pathTo(s.reached, x, y);
    const fig = figures.get(u.id);
    playSteps(path.length);
    await fig.walk(path, reduce() ? 0.05 : 0.15);
    openActions();
  }
  function playSteps(n) {
    for (let i = 0; i < Math.min(n, 6); i++) setTimeout(() => sound.play('step', { volume: 0.5 }), (i * 150) / speedOf());
  }
  async function openActions() {
    const u = unitById(game, s.sel);
    s.mode = 'act';
    const actions = actionsAt(game, u, s.dest.x, s.dest.y);
    const items = actions.map((a) => {
      const item = { key: a, label: t(a.kind === 'art' ? 'artAction' : a.kind) };
      if (a.kind === 'reinforce') {
        const plan = reinforcePlan(game, u, s.dest.x, s.dest.y);
        item.note = `+${plan.heal} · ${t('cost', { n: plan.cost })}`;
      }
      if (a.kind === 'heal') item.note = t('cost', { n: UNITS[u.type].heal.price });
      if (a.kind === 'hex') item.note = t('cost', { n: UNITS[u.type].hex.price });
      if (a.kind === 'art') item.note = say(COMMANDERS[game.players[u.owner].commander].art);
      if (a.kind === 'capture') item.note = say(BUILDINGS[buildingById(game, a.building).kind]);
      return item;
    });
    items.push({ key: { kind: 'cancel' }, label: t('cancel') });
    const p = screenOf(worldOf(s.dest.x, s.dest.y, 1));
    setCursor(s.dest.x, s.dest.y);
    const choice = await hud.menu(items, p);
    if (s.disposed) return;
    if (!choice || choice.kind === 'cancel') return undoMove();
    sound.play('confirm');
    const then = { kind: choice.kind };
    if (choice.kind === 'attack') return beginTargeting();
    if (choice.kind === 'capture') then.building = choice.building;
    if (choice.kind === 'heal') return beginTile('heal');
    if (choice.kind === 'unload') return beginDrop();
    if (choice.kind === 'art') {
      const art = COMMANDERS[game.players[u.owner].commander].art;
      if (art.kind === 'line') return beginDir();
      if (art.kind === 'blast') return beginTile('art');
    }
    commit(then);
  }
  function undoMove() {
    const u = unitById(game, s.sel);
    figures.get(u.id).snap(u.x, u.y);
    sound.play('cancel');
    s.mode = 'move';
    s.dest = null;
    setCursor(u.x, u.y);
    moveMarks();
  }
  // Attack targets.
  function beginTargeting() {
    const u = unitById(game, s.sel);
    s.targets = targetsFrom(game, u, s.dest.x, s.dest.y, s.dest.x !== u.x || s.dest.y !== u.y);
    s.ti = 0;
    s.mode = 'target';
    hud.hint(t('pickTarget'));
    overlay.tiles(s.targets.map((v) => ({ x: v.x, y: v.y, kind: 'attack' })));
    setCursor(s.targets[0].x, s.targets[0].y);
    showForecast();
  }
  function showForecast() {
    const u = unitById(game, s.sel);
    const target = s.targets[s.ti];
    const moved = s.dest.x !== u.x || s.dest.y !== u.y;
    const f = forecast(game, u, s.dest.x, s.dest.y, target, moved);
    const nameOf = (v) => (v.kind ? say(BUILDINGS[v.kind]) : v.type === 'commander' ? say(COMMANDERS[v.commander]) : say(UNITS[v.type]));
    const modelFor = (v) => (v.kind ? 'stronghold' : modelOf(v));
    hud.forecast({
      ...f,
      attacker: { name: nameOf(u), hp: u.hp, model: modelOf(u) },
      defender: { name: nameOf(target), hp: target.hp, model: target.kind ? null : modelFor(target) },
      attackerTeam: TEAMS[u.owner].css,
      defenderTeam: target.owner >= 0 ? TEAMS[target.owner].css : '#999'
    });
    figures.get(u.id).face(target.x, target.y);
  }
  // A tile within reach: the mage's healing, a blast art.
  function beginTile(kind) {
    const u = unitById(game, s.sel);
    s.mode = 'tile';
    s.tileKind = kind;
    const reachN = kind === 'heal' ? UNITS[u.type].heal.reach : COMMANDERS[game.players[u.owner].commander].art.reach;
    s.tileReach = reachN;
    hud.hint(t('pickTile'));
    tileMarks();
  }
  function tileMarks() {
    const u = unitById(game, s.sel);
    const marks = [];
    for (let y = 0; y < game.h; y++) for (let x = 0; x < game.w; x++) if (distance(x, y, s.dest.x, s.dest.y) <= s.tileReach) marks.push({ x, y, kind: 'move' });
    const radius = s.tileKind === 'heal' ? UNITS[u.type].heal.radius : COMMANDERS[game.players[u.owner].commander].art.radius;
    if (distance(cursor.x, cursor.y, s.dest.x, s.dest.y) <= s.tileReach)
      for (let y = 0; y < game.h; y++) for (let x = 0; x < game.w; x++) if (distance(x, y, cursor.x, cursor.y) <= radius) marks.push({ x, y, kind: s.tileKind === 'heal' ? 'drop' : 'art' });
    overlay.tiles(marks);
  }
  // A direction: Seline's lance.
  function beginDir() {
    s.mode = 'dir';
    s.dir = [1, 0];
    hud.hint(t('pickDir'));
    artMarks(unitById(game, s.sel));
  }
  function artMarks(u) {
    const art = COMMANDERS[game.players[u.owner].commander].art;
    const marks = [];
    for (let i = 1; i <= art.length; i++) {
      const x = s.dest.x + s.dir[0] * i,
        y = s.dest.y + s.dir[1] * i;
      if (x >= 0 && y >= 0 && x < game.w && y < game.h) marks.push({ x, y, kind: 'art' });
    }
    overlay.tiles(marks);
  }
  // Dropping off a carrier's cargo, one passenger at a time.
  function beginDrop() {
    const u = unitById(game, s.sel);
    s.dropQueue = u.cargo.map((c) => c.id);
    s.drops = [];
    s.mode = 'drop';
    hud.hint(t('pickDrop'));
    dropMarks();
  }
  function dropSpots() {
    const u = unitById(game, s.sel);
    const cargo = u.cargo.find((c) => c.id === s.dropQueue[0]);
    return unloadSpots(game, u, s.dest.x, s.dest.y, cargo).filter((p) => !s.drops.some((d) => d.x === p.x && d.y === p.y));
  }
  function dropMarks() {
    const spots = dropSpots();
    overlay.tiles(spots.map((p) => ({ ...p, kind: 'drop' })));
    if (spots[0]) setCursor(spots[0].x, spots[0].y);
  }

  async function commit(then) {
    const u = unitById(game, s.sel);
    s.mode = 'busy';
    hud.setBusy(true);
    hud.hint(null);
    hud.forecast(null);
    overlay.tiles([]);
    overlay.path([]);
    let events;
    try {
      events = act(game, { kind: 'move', unit: u.id, to: s.dest, then });
    } catch (cause) {
      console.warn(cause);
      sound.play('error');
      return undoMove();
    }
    await playEvents(events, { walked: true });
    afterAction();
  }
  function afterAction() {
    keep();
    refreshTop();
    if (s.over || s.disposed) return;
    for (const [id, f] of figures) {
      const u = unitById(game, id);
      if (u) f.setDone(u.done && u.owner === game.current);
    }
    if (isHumanTurn()) beginIdle();
  }

  async function recruitAt(b) {
    const types = recruitsOf(b.kind);
    const gold = game.players[human].gold;
    const items = types.map((type) => {
      const u = UNITS[type];
      const spots = recruitSpots(game, b, type);
      return {
        key: type,
        icon: type,
        label: say(u),
        note: t('cost', { n: u.cost }),
        disabled: u.cost > gold || !spots.length,
        focusable: true,
        onFocus: () => hud.unit({ unit: { type, owner: human, hp: 100, cargo: [] } }),
        onRefuse: () => sound.play('error')
      };
    });
    items.push({ key: null, label: t('cancel') });
    s.mode = 'menu';
    const p = screenOf(worldOf(b.x, b.y, 1));
    sound.play('select');
    const type = await hud.menu(items, p, { title: `${t('recruit')} · ${t('gold', { n: gold })}` });
    if (s.disposed) return;
    if (!type) {
      sound.play('cancel');
      return beginIdle();
    }
    const spots = recruitSpots(game, b, type);
    const foes = game.units.filter((u) => u.owner !== human);
    const at = spots.sort((p, q) => Math.min(...foes.map((f) => distance(p.x, p.y, f.x, f.y)), 99) - Math.min(...foes.map((f) => distance(q.x, q.y, f.x, f.y)), 99))[0];
    s.mode = 'busy';
    await library.want([type]);
    const events = act(game, { kind: 'recruit', building: b.id, type, at });
    await playEvents(events);
    afterAction();
  }

  async function mapMenu() {
    s.mode = 'menu';
    sound.play('menu');
    const choice = await hud.menu(
      [
        { key: 'end', label: t('endTurn') },
        { key: 'threat', label: `${t('threat')}：${s.threat ? t('on') : t('off')}` },
        { key: 'help', label: t('howTo') },
        { key: 'settings', label: t('settings') },
        { key: 'concede', label: t('surrender') },
        { key: null, label: t('back') }
      ],
      null,
      { title: t('menu') }
    );
    if (s.disposed) return;
    if (choice === 'end') return endHumanTurn();
    if (choice === 'threat') s.threat = !s.threat;
    if (choice === 'help') await app.overlay('help');
    if (choice === 'settings') {
      await app.overlay('settings');
      for (const f of figures.values()) f.setSpeed(speedOf());
    }
    if (choice === 'concede') {
      const sure = await hud.menu(
        [
          { key: 'yes', label: t('yes') },
          { key: 'no', label: t('no') }
        ],
        null,
        { title: t('surrenderAsk') }
      );
      if (sure === 'yes') return finish(1 - human, 'commander');
    }
    beginIdle();
  }

  async function endHumanTurn() {
    s.mode = 'busy';
    hud.setBusy(true);
    overlay.tiles([]);
    sound.play('confirm');
    const events = act(game, { kind: 'end' });
    await playEvents(events);
    keep();
    runTurns();
  }

  // ---- the computer's turns ----
  async function runTurns() {
    if (s.aiRunning) return;
    s.aiRunning = true;
    try {
      while (!game.over && !s.disposed && brains[game.current]) {
        if (s.until && game.turn >= s.until && game.current === human) {
          brains[human] = null;
          break;
        }
        hud.setBusy(true);
        overlay.showCursor(false);
        hud.hint(t('thinking'));
        const order = nextOrder(game, brains[game.current]);
        if (order.kind === 'move') {
          const u = unitById(game, order.unit);
          stage.rig.focus(u.x, u.y);
          await wait(reduce() ? 0.05 : 0.25);
        }
        if (order.kind === 'recruit') {
          await library.want([order.type]);
          const b = buildingById(game, order.building);
          stage.rig.focus(b.x, b.y);
          await wait(0.2);
        }
        hud.hint(null);
        const events = act(game, order);
        await playEvents(events);
        refreshTop();
        if (order.kind === 'end') keep();
        await new Promise((r) => setTimeout(r, 0));
      }
    } finally {
      s.aiRunning = false;
    }
    if (game.over || s.disposed) return;
    overlay.showCursor(true);
    beginIdle();
  }

  // ---- playing the events ----
  async function playEvents(events, { walked = false } = {}) {
    for (const e of events) {
      if (s.disposed) return;
      switch (e.type) {
        case 'move': {
          if (walked) break;
          const f = figures.get(e.unit);
          playSteps(e.path.length);
          await f.walk(e.path, reduce() ? 0.05 : 0.13);
          break;
        }
        case 'strike':
          await playStrike(e);
          break;
        case 'fall': {
          const f = figures.get(e.unit);
          sound.play('fall');
          fx.burst(worldOf(e.x, e.y, 0.6), [0.9, 0.85, 0.8], 18, 2.5, 0.7);
          await f?.fall();
          f?.dispose();
          figures.delete(e.unit);
          for (const c of e.cargo) {
            figures.get(c)?.dispose();
            figures.delete(c);
          }
          refreshCards();
          break;
        }
        case 'capture': {
          const b = buildingById(game, e.building);
          sound.play('capture');
          pieces.get(b.id).setOwner(b.owner);
          fx.ring(worldOf(b.x, b.y), TEAMS[b.owner].ring, 1.6);
          fx.rise(worldOf(b.x, b.y, 0.5), [1, 0.9, 0.4], 18, 0.8);
          hud.toast(t('captureDone', { name: say(BUILDINGS[b.kind]) }), b.owner === human ? 'good' : 'bad');
          await wait(0.6);
          break;
        }
        case 'neutral':
        case 'razed': {
          const b = buildingById(game, e.building);
          pieces.get(b.id).setOwner(b.owner);
          fx.burst(worldOf(b.x, b.y, 1), [0.8, 0.75, 0.7], 24, 3.5, 0.9);
          hud.toast(t('neutralised', { name: say(BUILDINGS[b.kind]) }), e.owner === human ? 'bad' : 'good');
          await wait(0.5);
          break;
        }
        case 'recruit': {
          const u = unitById(game, e.unit);
          const f = addFigure(u);
          f.face(u.x + (u.owner === 0 ? 1 : 0), u.y + (u.owner === 0 ? 0 : 1));
          sound.play('coin');
          fx.ring(worldOf(u.x, u.y), TEAMS[u.owner].ring, 1.2);
          fx.rise(worldOf(u.x, u.y, 0.3), [1, 0.95, 0.6], 14, 0.6);
          refreshTop();
          await wait(0.45);
          break;
        }
        case 'reinforce': {
          const u = unitById(game, e.unit);
          sound.play('heal');
          fx.rise(worldOf(u.x, u.y, 0.2), [0.5, 1, 0.6], 18);
          floatAt(u.x, u.y, `+${e.heal}`, 'heal');
          await wait(0.6);
          break;
        }
        case 'heal': {
          const u = unitById(game, e.unit);
          await figures.get(u.id)?.strike();
          sound.play('heal');
          fx.ring(worldOf(e.at.x, e.at.y), [0.4, 1, 0.6], 2.6);
          for (const h of e.healed) {
            const v = unitById(game, h.unit);
            if (!v) continue;
            fx.rise(worldOf(v.x, v.y, 0.2), [0.5, 1, 0.6], 14);
            floatAt(v.x, v.y, `+${h.add}`, 'heal');
          }
          await wait(0.7);
          break;
        }
        case 'hex': {
          const u = unitById(game, e.unit);
          await figures.get(u.id)?.strike();
          sound.play('hex');
          fx.ring(worldOf(u.x, u.y), [0.7, 0.3, 1], 8);
          for (const h of e.hit) {
            const v = unitById(game, h.unit);
            if (!v) continue;
            fx.burst(worldOf(v.x, v.y, 1), [0.7, 0.3, 1], 10, 2, 0.6);
            floatAt(v.x, v.y, `-${h.lose}`, 'dmg');
            void figures.get(v.id)?.hurt();
          }
          await wait(0.7);
          break;
        }
        case 'load': {
          sound.play('step');
          const f = figures.get(e.unit);
          if (f) f.holder.visible = false;
          await wait(0.2);
          break;
        }
        case 'unload': {
          const u = unitById(game, e.unit);
          const f = figures.get(e.unit) ?? addFigure(u);
          f.snap(u.x, u.y);
          f.holder.visible = true;
          f.setDone(true);
          sound.play('step');
          fx.ring(worldOf(u.x, u.y), [0.6, 1, 0.7], 1);
          await wait(0.3);
          break;
        }
        case 'art':
          await playArt(e);
          break;
        case 'endTurn':
          break;
        case 'startTurn': {
          refreshTop();
          for (const [id, f] of figures) {
            const u = unitById(game, id);
            if (u) f.setDone(false);
          }
          const mine = e.owner === human;
          sound.music(mine ? 'dawn' : 'raven');
          sound.play('banner');
          if (!reduce()) await hud.banner(t('turn', { n: e.turn }), mine ? t('yourTurn') : t('foeTurn'), TEAMS[e.owner].css, 1.2 / Math.sqrt(speedOf()));
          if (e.income) hud.toast(`${say(COMMANDERS[game.players[e.owner].commander])} · ${t('income', { n: e.income })}`, mine ? 'good' : '');
          if (mine && artReady(game, human)) hud.toast(t('artReady'), 'gold');
          if (mine) {
            const c = commanderOf(game, human);
            if (c) setCursor(c.x, c.y, { focus: true });
          }
          break;
        }
        case 'defeat':
          break;
        case 'victory':
          await finish(e.owner, events.find((d) => d.type === 'defeat')?.why ?? 'commander');
          return;
        default:
          break;
      }
    }
  }

  function floatAt(x, y, text, kind) {
    const h = heightAt(x, y);
    const p = screenOf(worldOf(x, y, h + 0.2));
    if (p.ok) hud.float(text, p.x, p.y, kind);
  }

  async function playStrike(e) {
    const from = e.fromBuilding ? buildingById(game, e.from) : unitById(game, e.from) ?? null;
    const to = e.building ? buildingById(game, e.to) : unitById(game, e.to);
    const fromFig = !e.fromBuilding ? figures.get(e.from) : null;
    const toFig = e.building ? pieces.get(e.to) : figures.get(e.to);
    if (!from || !to) return;
    if (!e.counter) stage.rig.focus((from.x + to.x) / 2, (from.y + to.y) / 2);
    fromFig?.face(to.x, to.y);
    if (!e.building && !e.fromBuilding) toFig?.face?.(from.x, from.y);
    const type = e.fromBuilding ? 'archer' : from.type;
    const d = distance(from.x, from.y, to.x, to.y);
    let kind = MISSILE[type];
    if (!kind && type === 'merfolk' && d > 1) kind = 'harpoon';
    if (e.fromBuilding) kind = 'arrow';
    sound.play(STRIKE_SOUND[type] ?? 'slash');
    if (fromFig) await fromFig.strike();
    if (kind) {
      const a = worldOf(from.x, from.y, (BODY[modelOf(from)]?.hover ?? 0) + 1.1);
      const b = worldOf(to.x, to.y, (to.kind ? 1.2 : (BODY[modelOf(to)]?.hover ?? 0) + 0.8));
      if (e.fromBuilding) a[1] = 2;
      await fx.missile(kind, a, b, (kind === 'stone' || kind === 'shell' ? 0.7 : kind === 'fire' ? 0.35 : 0.42) / Math.sqrt(speedOf()));
      if (HIT_SOUND[kind]) sound.play(HIT_SOUND[kind]);
    } else if (type === 'swordsman' || type === 'commander' || type === 'knight' || type === 'pikeman') sound.play('clang', { volume: 0.6 });
    const hitAt = worldOf(to.x, to.y, to.kind ? 1.2 : (BODY[modelOf(to)]?.hover ?? 0) + 0.9);
    if (e.critical) {
      sound.play('critical');
      fx.burst(hitAt, [1, 0.8, 0.25], 30, 5, 0.7);
      floatAt(to.x, to.y, t('criticalHit'), 'crit');
      if (!reduce()) shake(0.25);
    } else fx.burst(hitAt, [1, 0.9, 0.6], 14, 3.2, 0.5);
    floatAt(to.x, to.y, `-${e.damage}`, e.critical ? 'dmg big' : 'dmg');
    await toFig?.hurt();
    refreshCards();
    await wait(0.15);
  }

  async function playArt(e) {
    const u = unitById(game, e.unit);
    const fig = figures.get(e.unit);
    stage.rig.focus(u.x, u.y);
    sound.play('art');
    const c = COMMANDERS[e.commander];
    if (!reduce()) await hud.banner(say(c.art), say(c), TEAMS[u.owner].css, 1.1);
    fx.ring(worldOf(u.x, u.y), [1, 0.85, 0.3], 3);
    fx.rise(worldOf(u.x, u.y, 0.3), [1, 0.85, 0.3], 26, 1);
    if (e.dir) fig.face(u.x + e.dir[0], u.y + e.dir[1]);
    if (e.at) fig.face(e.at.x, e.at.y);
    await fig?.strike();
    if (e.at) {
      for (let i = 0; i < 5; i++) {
        const tx = e.at.x + (Math.random() - 0.5) * 2,
          ty = e.at.y + (Math.random() - 0.5) * 2;
        void fx.missile('magic', worldOf(tx, ty, 9), worldOf(tx, ty, 0.3), 0.5).then(() => fx.burst(worldOf(tx, ty, 0.4), [0.7, 0.85, 1], 18, 4, 0.6));
      }
      await wait(0.5);
      sound.play('crash');
    }
    for (const h of e.hits) {
      const target = h.building ? buildingById(game, h.id) : unitById(game, h.id);
      const tx = target?.x ?? u.x,
        ty = target?.y ?? u.y;
      if (h.heal !== undefined) {
        fx.rise(worldOf(tx, ty, 0.2), h.guard ? [0.6, 0.7, 1] : [0.5, 1, 0.6], 14);
        if (h.heal) floatAt(tx, ty, `+${h.heal}`, 'heal');
      } else {
        fx.burst(worldOf(tx, ty, 1), [1, 0.6, 0.3], 16, 3.5, 0.6);
        floatAt(tx, ty, `-${h.damage}`, 'dmg');
        if (h.building) void pieces.get(h.id)?.hurt();
        else void figures.get(h.id)?.hurt();
      }
    }
    if (!reduce()) shake(0.3);
    await wait(0.8);
    refreshTop();
  }

  let shakeLeft = 0;
  const shake = (seconds) => (shakeLeft = Math.max(shakeLeft, seconds));

  async function finish(winner, why) {
    if (s.over) return;
    s.over = true;
    s.mode = 'over';
    hud.setBusy(true);
    overlay.showCursor(false);
    overlay.tiles([]);
    if (attract) return;
    const won = winner === human;
    sound.music(won ? 'victory' : 'defeat');
    app.finishBattle({ won, why, game: cloneGame(game), setup });
  }

  function keep() {
    if (game.over || attract) return;
    app.keepBattle({ setup, game: cloneGame(game) });
  }

  // ---- input routed from the app ----
  function command(name, { device } = {}) {
    if (s.disposed || s.over) return;
    if (hud.menuOpen) {
      if (hud.menuCommand(name)) sound.play(name === 'confirm' ? 'confirm' : name === 'cancel' ? 'cancel' : 'cursor');
      return;
    }
    if (name === 'zoomIn') return stage.rig.zoomBy(1.2);
    if (name === 'zoomOut') return stage.rig.zoomBy(1 / 1.2);
    if (name === 'turnLeft' || name === 'turnRight') {
      stage.rig.turn(name === 'turnLeft' ? -1 : 1);
      return;
    }
    if (!isHumanTurn() || s.mode === 'busy') return;
    const steps = stage.rig.screenSteps();
    const dirIndex = ['up', 'right', 'down', 'left'].indexOf(name);
    if (dirIndex >= 0) {
      const [dx, dy] = steps[dirIndex];
      if (s.mode === 'target') {
        s.ti = (s.ti + (dirIndex === 1 || dirIndex === 2 ? 1 : -1) + s.targets.length) % s.targets.length;
        setCursor(s.targets[s.ti].x, s.targets[s.ti].y);
        showForecast();
        sound.play('cursor');
        return;
      }
      if (s.mode === 'dir') {
        s.dir = [dx, dy];
        artMarks(unitById(game, s.sel));
        setCursor(s.dest.x + dx, s.dest.y + dy);
        sound.play('cursor');
        return;
      }
      setCursor(cursor.x + dx, cursor.y + dy);
      sound.play('cursor', { volume: 0.6 });
      return;
    }
    if (name === 'confirm') return confirmAt(cursor.x, cursor.y);
    if (name === 'cancel') return cancel();
    if (name === 'next') return nextReady();
    if (name === 'threat') {
      s.threat = !s.threat;
      sound.play('menu');
      if (s.mode === 'idle') idleMarks();
      return;
    }
    if (name === 'menu') return s.mode === 'idle' ? mapMenu() : undefined;
    if (name === 'endTurn') return s.mode === 'idle' ? endHumanTurn() : undefined;
  }

  function confirmAt(x, y) {
    if (s.mode === 'idle') {
      const u = unitAt(game, x, y);
      if (u && u.owner === human && !u.done) return selectUnit(u);
      const b = buildingAt(game, x, y);
      if (b && b.owner === human && BUILDINGS[b.kind].takes && !b.recruited) return recruitAt(b);
      if (u) return sound.play('error');
      return mapMenu();
    }
    if (s.mode === 'move') {
      const u = unitById(game, s.sel);
      if (x === u.x && y === u.y) return chooseDest(x, y);
      return chooseDest(x, y);
    }
    if (s.mode === 'target') {
      const i = s.targets.findIndex((v) => v.x === x && v.y === y);
      if (i < 0) return sound.play('error');
      const target = s.targets[i];
      return commit({ kind: 'attack', target: target.kind ? { building: target.id } : { unit: target.id } });
    }
    if (s.mode === 'dir') return commit({ kind: 'art', dir: s.dir });
    if (s.mode === 'tile') {
      if (distance(x, y, s.dest.x, s.dest.y) > s.tileReach) return sound.play('error');
      return commit({ kind: s.tileKind, at: { x, y } });
    }
    if (s.mode === 'drop') {
      if (!dropSpots().some((p) => p.x === x && p.y === y)) return sound.play('error');
      s.drops.push({ unit: s.dropQueue.shift(), x, y });
      sound.play('confirm');
      if (s.dropQueue.length && dropSpots().length) return dropMarks();
      return commit({ kind: 'unload', drops: s.drops });
    }
  }

  function cancel() {
    if (s.mode === 'move') {
      sound.play('cancel');
      const u = unitById(game, s.sel);
      setCursor(u.x, u.y);
      return beginIdle();
    }
    if (s.mode === 'target' || s.mode === 'dir' || s.mode === 'tile' || s.mode === 'drop') {
      sound.play('cancel');
      hud.forecast(null);
      hud.hint(null);
      overlay.tiles([]);
      const u = unitById(game, s.sel);
      figures.get(u.id).face(s.dest.x + (u.owner === 0 ? 1 : 0), s.dest.y + (u.owner === 0 ? 0 : 1));
      return openActions();
    }
    if (s.mode === 'idle' && s.threat) {
      s.threat = false;
      idleMarks();
    }
  }

  function nextReady() {
    const ready = game.units.filter((u) => u.owner === human && !u.done);
    if (!ready.length) return sound.play('error');
    const i = ready.findIndex((u) => u.x === cursor.x && u.y === cursor.y);
    const u = ready[(i + 1) % ready.length];
    sound.play('cursor');
    setCursor(u.x, u.y, { focus: true });
  }

  // ---- pointer ----
  function point(px, py) {
    if (!isHumanTurn() || s.mode === 'busy' || s.mode === 'menu' || hud.menuOpen) return;
    const tile = stage.rig.tileAt(px, py, stage.canvas.clientWidth, stage.canvas.clientHeight);
    if (!tile || (tile.x === cursor.x && tile.y === cursor.y)) return;
    cursor.x = tile.x;
    cursor.y = tile.y;
    overlay.cursor(cursor.x, cursor.y, heightAt(cursor.x, cursor.y));
    refreshCards();
    hoverChanged();
  }
  function tap(px, py, button) {
    if (button === 2) return command('cancel');
    if (!isHumanTurn() || s.mode === 'busy' || hud.menuOpen) return;
    const tile = stage.rig.tileAt(px, py, stage.canvas.clientWidth, stage.canvas.clientHeight);
    if (!tile) return;
    if (s.mode === 'target') {
      const i = s.targets.findIndex((v) => v.x === tile.x && v.y === tile.y);
      if (i < 0) return cancel();
      if (i !== s.ti || cursor.x !== tile.x || cursor.y !== tile.y) {
        s.ti = i;
        setCursor(tile.x, tile.y);
        showForecast();
        if (app.touch) return;
      }
    }
    if (s.mode === 'dir') {
      const dx = tile.x - s.dest.x,
        dy = tile.y - s.dest.y;
      if (!dx && !dy) return;
      s.dir = Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
      artMarks(unitById(game, s.sel));
    }
    // On touch, the first tap on a tile in move mode shows the path; a second tap goes.
    if (app.touch && s.mode === 'move' && (tile.x !== cursor.x || tile.y !== cursor.y)) {
      setCursor(tile.x, tile.y);
      return;
    }
    setCursor(tile.x, tile.y);
    confirmAt(tile.x, tile.y);
  }

  // ---- each frame ----
  const badgeList = [];
  function update(seconds) {
    if (attract) {
      // The backdrop circles the board slowly instead of following the fighting.
      stage.rig.view.tyaw += seconds * 0.06;
      stage.rig.focus(game.w / 2 - 0.5, game.h / 2 - 0.5);
    }
    board.update(seconds);
    overlay.update(seconds);
    fx.update(seconds);
    for (const f of figures.values()) f.update(seconds);
    stage.rig.update(seconds);
    if (shakeLeft > 0) {
      shakeLeft -= seconds;
      const k = shakeLeft * 0.6;
      stage.camera.position[0] += (Math.random() - 0.5) * k;
      stage.camera.position[1] += (Math.random() - 0.5) * k;
    }
    badgeList.length = 0;
    for (const [id, f] of figures) {
      const u = unitById(game, id);
      if (!u || !f.holder.visible) continue;
      const p = screenOf(f.head());
      badgeList.push({ id, x: p.x, y: p.y, hp: u.hp, team: TEAMS[u.owner].css, done: u.done && u.owner === game.current, cargo: u.cargo.length > 0, visible: p.ok });
    }
    hud.badges(badgeList);
  }

  // ---- begin ----
  refreshTop();
  sound.music(game.current === human ? 'dawn' : 'raven');
  overlay.showCursor(true);
  setCursor(cursor.x, cursor.y, { focus: true });
  if (!saved && !attract) {
    sound.play('banner');
    if (!reduce()) await hud.banner(say(map.name), `${say(COMMANDERS[game.players[0].commander])} VS ${say(COMMANDERS[game.players[1].commander])}`, '#f5c542', 1.6);
  }
  if (isHumanTurn()) beginIdle();
  else void runTurns();

  return {
    update,
    command,
    point,
    tap,
    get game() {
      return game;
    },
    get mode() {
      return s.mode;
    },
    figures,
    /** For checks: play the human side with the computer's brain until the battle ends or `turns` pass. */
    async autoplay(turns = 60, level = 'normal') {
      brains[human] = createBrain(level);
      s.until = game.turn + turns;
      if (s.mode === 'idle') await runTurns();
      while (!game.over && !s.disposed && (s.aiRunning || brains[human])) await new Promise((r) => setTimeout(r, 100));
      s.until = 0;
    },
    dispose() {
      s.disposed = true;
      hud.closeMenu();
      hud.dispose();
      board.dispose();
      overlay.dispose();
      for (const f of figures.values()) f.dispose();
      for (const p of pieces.values()) p.dispose();
      fx.dispose?.();
    }
  };
}
