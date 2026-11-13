// A fight on screen. The rules in core/battle.mjs decide everything; this
// module plays what they decide: figures run to where their fighters are,
// strike when a move lands, flinch, and fall.
//
// The player's orders go straight to the battle: tap an enemy to have the
// whole side set on them, and the page's buttons pause, hurry or break off.
import { Mesh3D, Object3D, Scene3D, createPerspectiveCamera3D } from '@egret/engine/world3d';
import { RULES } from '../core/battle.mjs';
import { ARTS } from '../data/arts.mjs';
import { createBuilding, treeParts } from './buildings.mjs';
import { STRIKE_OF, createFigure } from './figure.mjs';
import { BALL, BOX, ROD, TOON, glow, heightSurface, mix, model, scatter } from './shapes.mjs';
import { lightScene } from './stage.mjs';

const KLASS_BY_ART_NAME = Object.fromEntries(ARTS.map((art) => [art.name, art.klass]));
const HALF_W = RULES.width / 2,
  HALF_D = RULES.depth / 2;

/** The ground of a fight: a paved square with the defenders' gate behind them. */
function field(colors, random) {
  const node = new Object3D();
  const height = (x, z) => {
    const far = Math.max(Math.abs(x) - HALF_W - 10, Math.abs(z) - HALF_D - 12);
    return far <= 0 ? 0 : Math.min(30, far * far * 0.02 * (0.6 + 0.4 * Math.sin(x * 0.07) * Math.cos(z * 0.09) + 0.4));
  };
  const colour = (x, z, y) => {
    if (y > 0.2) return mix(0x6f8a4e, 0x7d7a66, Math.min(1, y / 18));
    if (Math.abs(x) < HALF_W + 2 && Math.abs(z) < HALF_D + 2) return (Math.round(x / 2.75) + Math.round(z / 2.6)) % 2 ? 0x8f8a7a : 0x98927f;
    return 0x7f8a55;
  };
  const ground = new Mesh3D(heightSurface(260, 220, 52, 44, height, colour), TOON);
  ground.receiveShadow = true;
  node.addChild(ground);
  const parts = [];
  // Each side's banners stand behind it.
  for (const side of [0, 1])
    for (const z of [-9, -3, 3, 9]) {
      const x = (side ? 1 : -1) * (HALF_W + 3);
      parts.push([BOX, [x, 2.4, z], [0.1, 4.8, 0.1], 0x5a4632], [BOX, [x, 3.6, z + 0.5], [0.04, 2, 0.9], colors[side]]);
    }
  // Stone posts mark the edge of the square.
  for (let i = -4; i <= 4; i++) for (const side of [-1, 1]) parts.push([BOX, [i * 5.5, 0.45, side * (HALF_D + 2)], [0.5, 0.9, 0.5], 0xa9a69c]);
  for (let i = 0; i < 46; i++) {
    const angle = random() * 6.28,
      radius = 38 + random() * 50,
      x = Math.cos(angle) * radius * 1.2,
      z = Math.sin(angle) * radius;
    if (Math.abs(z) < HALF_D + 6 && Math.abs(x) < HALF_W + 16) continue;
    for (const part of treeParts(x, z, 1.5 + random() * 1.5, random() < 0.3)) parts.push([part[0], [part[1][0], part[1][1] + height(x, z), part[1][2]], part[2], part[3]]);
  }
  node.addChild(model(parts));
  const gate = createBuilding('gate', 1);
  gate.setPosition(HALF_W + 9, 0, 0);
  gate.setRotation(0, -Math.PI / 2, 0);
  gate.setScale(1.5);
  node.addChild(gate);
  return node;
}

/**
 * @param stage   the stage from stage.mjs
 * @param battle  a battle from core/battle.mjs, not yet run
 * @param options.colors  the two sides' colours, 0xRRGGBB
 * @param options.layer   an element over the canvas for numbers and names
 * @param options.onEvent called with every event of the battle as it is played
 * @param options.onEnd   called once, a moment after the fight is decided
 */
export function createArena(stage, battle, { colors, layer, onEvent = () => {}, onEnd = () => {} }) {
  const scene = new Scene3D();
  const camera = createPerspectiveCamera3D({ fov: 40, near: 0.5, far: 500 });
  scene.addChild(camera);
  const { aim } = lightScene(scene, 'dusk', stage.quality);
  aim(0, 0, 0);
  const random = scatter(battle.units.length * 977 + 13);
  scene.addChild(field(colors, random));

  const fillMaterial = [glow(0x58c06a, 1), glow(0xd8503c, 1)],
    backMaterial = glow(0x1c1a18, 1);
  const cast = battle.units.map((unit) => {
    const person = unit.person;
    const figure = createFigure({ color: colors[unit.side], female: person.female, rank: person.rank, weapon: person.gear?.weapon?.slot ?? null, monk: person.school === 'shaolin' || person.school === 'chongsheng', seed: person.id });
    figure.play('guard');
    scene.addChild(figure.node);
    // A health bar over the head, turned to the camera each frame.
    const bar = new Object3D(),
      fill = model([[BOX, [0, 0, 0], [1, 0.09, 0.02], 0xffffff]], fillMaterial[unit.side], false),
      back = model([[BOX, [0, 0, -0.012], [1.04, 0.13, 0.02], 0xffffff]], backMaterial, false);
    bar.addChild(back);
    bar.addChild(fill);
    scene.addChild(bar);
    const actor = { unit, figure, bar, fill, x: unit.x - HALF_W, z: unit.y - HALF_D, heading: unit.side ? -Math.PI / 2 : Math.PI / 2, shown: 1, tag: null };
    return actor;
  });
  const byId = new Map(cast.map((actor) => [actor.unit.id, actor]));

  // A ring under whoever the player's side has been set on.
  const ring = model([[ROD, [0, 0.03, 0], [0.75, 0.03, 0.75], 0xffffff]], glow(0xe8503c, 1.4), false);
  ring.visible = false;
  scene.addChild(ring);
  // A few flashes to reuse where blows land.
  const sparks = Array.from({ length: 6 }, () => {
    const mesh = model([[BALL, [0, 0, 0], 1, 0xffffff]], glow(0xfff0b0, 2.2), false);
    mesh.visible = false;
    scene.addChild(mesh);
    return { mesh, life: 0 };
  });
  let nextSpark = 0;

  /** Numbers that rise from a fighter and fade. */
  const floaters = [];
  function float(actor, text, kind) {
    if (!layer || floaters.length > 20) return;
    const element = document.createElement('span');
    element.className = 'float ' + kind;
    element.textContent = text;
    layer.append(element);
    floaters.push({ element, x: actor.x + (random() - 0.5) * 0.6, y: 2, z: actor.z, life: 0 });
  }

  function play(event) {
    onEvent(event);
    if (arena.skipping) return;
    const from = byId.get(event.from),
      to = byId.get(event.to);
    if (event.type === 'hit' || event.type === 'miss') {
      from?.figure.play(STRIKE_OF[KLASS_BY_ART_NAME[event.art]] ?? 'punch', { base: 'guard' });
      if (!to) return;
      if (event.type === 'miss') return float(to, '闪', 'miss');
      to.figure.play('hit', { base: 'guard' });
      float(to, String(event.damage), event.crit ? 'crit' : to.unit.side ? 'dealt' : 'taken');
      const spark = sparks[nextSpark++ % sparks.length];
      spark.life = 0.22;
      spark.mesh.visible = true;
      spark.mesh.setPosition(to.x, 1.2, to.z);
      spark.size = event.crit ? 0.45 : 0.26;
    } else if (event.type === 'heal') to && float(to, '+' + event.amount, 'heal');
    else if (event.type === 'down') byId.get(event.id)?.figure.play('down');
  }

  let clock = 0,
    ended = 0,
    told = false;
  const arena = {
    scene,
    camera,
    battle,
    paused: false,
    /** Game seconds for each real second. */
    speed: 1,
    skipping: false,
    /** Runs the rest of the fight at once. */
    skip() {
      arena.skipping = true;
      while (!battle.done) {
        battle.update();
        for (const event of battle.events) play(event);
        battle.events.length = 0;
      }
      arena.skipping = false;
      for (const actor of cast) if (actor.unit.down) actor.figure.play('down');
    },
    enter() {
      stage.orbit.set({ target: [0, 0.8, 0], yaw: 0, pitch: 0.62, distance: 30, minDistance: 7, maxDistance: 70, minPitch: 0.15, maxPitch: 1.35, reach: 24, drift: 0 });
      // A tap on an enemy sets the player's side on them; a second tap lets them choose for themselves again.
      stage.orbit.onTap = (x, y) => {
        let best = null,
          nearest = 46;
        for (const actor of cast) {
          if (actor.unit.side !== 1 || actor.unit.down || actor.unit.fled) continue;
          const at = stage.orbit.project(actor.x, 1, actor.z);
          const gap = at ? Math.hypot(at.x - x, at.y - y) : Infinity;
          if (gap < nearest) (nearest = gap), (best = actor);
        }
        if (best) battle.focus(0, battle.orders[0].focus === best.unit.id ? null : best.unit.id);
      };
    },
    leave() {
      for (const floater of floaters) floater.element.remove();
      for (const actor of cast) actor.tag?.remove();
      floaters.length = 0;
    },
    update(dt) {
      if (!arena.paused && !battle.done) {
        clock += dt * arena.speed;
        while (clock >= RULES.step && !battle.done) {
          clock -= RULES.step;
          battle.update();
          for (const event of battle.events) play(event);
          battle.events.length = 0;
        }
      }
      const still = arena.paused ? 0 : dt * Math.min(arena.speed, 2);
      for (const actor of cast) {
        const { unit, figure } = actor;
        const tx = unit.x - HALF_W,
          tz = unit.y - HALF_D,
          gap = Math.hypot(tx - actor.x, tz - actor.z);
        if (gap > 0.02 && still) {
          const k = 1 - Math.exp(-dt * 12 * arena.speed);
          actor.x += (tx - actor.x) * k;
          actor.z += (tz - actor.z) * k;
        }
        const moving = gap > 0.12 && !unit.down;
        if (moving && !figure.busy && figure.action !== 'run') figure.play('run');
        if (!moving && figure.action === 'run') figure.play(battle.done ? 'idle' : 'guard');
        // Face the way they run, or the one they are fighting.
        const foe = unit.target && !unit.target.down ? unit.target : null;
        const want = moving && !foe ? Math.atan2(tx - actor.x, tz - actor.z) : foe ? Math.atan2(foe.x - unit.x, foe.y - unit.y) : actor.heading;
        let turn = want - actor.heading;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        actor.heading += turn * Math.min(1, dt * 10);
        figure.node.setPosition(actor.x, 0, actor.z);
        figure.node.setRotation(0, actor.heading, 0);
        figure.node.setScale(1.25);
        figure.node.visible = !unit.fled;
        figure.update(still);
        const share = unit.down || unit.fled ? 0 : unit.hp / unit.hpMax;
        actor.shown += (share - actor.shown) * Math.min(1, dt * 8);
        actor.bar.visible = share > 0;
        actor.bar.setPosition(actor.x, 2.7, actor.z);
        actor.bar.setRotation(0, stage.orbit.yaw, 0);
        actor.fill.setScale(Math.max(0.001, actor.shown), 1, 1);
        actor.fill.setPosition(-(1 - actor.shown) / 2, 0, 0);
      }
      const marked = byId.get(battle.orders[0].focus);
      ring.visible = !!marked && !marked.unit.down && !marked.unit.fled;
      if (ring.visible) ring.setPosition(marked.x, 0, marked.z), ring.setScale(1 + 0.08 * Math.sin(battle.time * 6 + clock * 20));
      for (const spark of sparks) {
        if (spark.life <= 0) continue;
        spark.life -= dt;
        spark.mesh.setScale(spark.size * (1.2 - spark.life / 0.22));
        if (spark.life <= 0) spark.mesh.visible = false;
      }
      stage.orbit.apply(camera, dt);

      // Numbers and names are laid over the canvas where their fighters are.
      for (let i = floaters.length - 1; i >= 0; i--) {
        const floater = floaters[i];
        floater.life += dt;
        const at = stage.orbit.project(floater.x, floater.y + floater.life * 1.6, floater.z);
        if (floater.life > 0.9 || !at) {
          floater.element.remove();
          floaters.splice(i, 1);
          continue;
        }
        floater.element.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px) translate(-50%, -50%)`;
        floater.element.style.opacity = String(Math.min(1, (0.9 - floater.life) * 3));
      }
      // Names show while the fight is held, when there is time to read them.
      for (const actor of cast) {
        const show = layer && arena.paused && !actor.unit.down && !actor.unit.fled;
        if (!show) {
          if (actor.tag) actor.tag.remove(), (actor.tag = null);
          continue;
        }
        if (!actor.tag) {
          actor.tag = document.createElement('span');
          actor.tag.className = 'nametag side' + actor.unit.side;
          actor.tag.textContent = actor.unit.name;
          layer.append(actor.tag);
        }
        const at = stage.orbit.project(actor.x, 3.0, actor.z);
        actor.tag.style.transform = at ? `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px) translate(-50%, -100%)` : 'translate(-999px, 0)';
      }

      if (battle.done && !told) {
        ended += dt;
        if (ended === dt) for (const actor of cast) if (!actor.unit.down) actor.figure.play('idle');
        if (ended > 1.6) (told = true), onEnd();
      }
    },
  };
  return arena;
}
