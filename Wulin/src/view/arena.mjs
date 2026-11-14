// A fight on screen. The rules in core/battle.mjs decide everything; this
// module plays what they decide: figures run to where their fighters are,
// strike when a move lands, flinch, and fall.
//
// The player's orders go straight to the battle: tap an enemy to have the
// whole side set on them, and the page's buttons pause, hurry or break off.
import { Object3D, Scene3D, createPerspectiveCamera3D } from '@egret/engine/world3d';
import { RULES } from '../core/battle.mjs';
import { ARTS } from '../data/arts.mjs';
import { createArenaEffects, createContactShadows, createFocusHalo } from './arena-effects.mjs';
import { createArenaStage } from './arena-stage.mjs';
import { STRIKE_OF, createFigure } from './figure.mjs';
import { STRIKE_CONTACT } from './figure-motion.mjs';
import { BOX, glow, model, scatter } from './shapes.mjs';
import { lightScene } from './stage.mjs';

const KLASS_BY_ART_NAME = new Map(ARTS.map((art) => [art.name, art.klass]));
const KLASS_BY_MOVE_NAME = new Map(ARTS.flatMap((art) => art.moves.map((move) => [move.name, art.klass])));
const HALF_W = RULES.width / 2,
  HALF_D = RULES.depth / 2;

/**
 * @param stage   the stage from stage.mjs
 * @param battle  a battle from core/battle.mjs, not yet run
 * @param options.colors  the two sides' colours, 0xRRGGBB
 * @param options.layer   an element over the canvas for numbers and names
 * @param options.onEvent called with every event of the battle as it is played
 * @param options.onContact called when a move reaches its visible contact frame
 * @param options.onClearSounds called when contact sounds should stop
 * @param options.onEnd   called once, a moment after the fight is decided
 * @param options.playerSide which side the player commands: 0 attacks, 1 defends
 */
export function createArena(stage, battle, {
  colors, layer, onEvent = () => {}, onContact = () => {}, onClearSounds = () => {}, onEnd = () => {}, playerSide = 0,
}) {
  const scene = new Scene3D();
  const fov = 40;
  const camera = createPerspectiveCamera3D({ fov, near: 0.5, far: 500 });
  scene.addChild(camera);
  // A fight is fought in the light of the hour it falls at: morning, noon, afternoon or dusk.
  const light = lightScene(scene, 'day', stage.quality);
  light.setHour([7.5, 10.5, 15.5, 16.8][battle.units.length % 4]);
  light.aim(0, 0, 0);
  const random = scatter(battle.units.length * 977 + 13);
  const defendingSchool = battle.units.find(unit => unit.side === 1)?.person.school;
  scene.addChild(createArenaStage(colors, random, defendingSchool, stage.quality));

  const fillMaterial = playerSide ? [glow(0xd8503c, 1), glow(0x58c06a, 1)] : [glow(0x58c06a, 1), glow(0xd8503c, 1)],
    backMaterial = glow(0x1c1a18, 1);
  const lineup = [0, 0];
  let inspected;
  const cast = battle.units.map((unit) => {
    const person = unit.person;
    const figure = createFigure({
      color: colors[unit.side], school: person.school, female: person.female, rank: person.rank,
      age: person.age, portraitId: person.portraitId, seed: person.id, weapon: person.gear?.weapon?.slot ?? null,
      quality: stage.quality,
      monk: person.school === 'shaolin' || person.school === 'chongsheng',
    });
    figure.play('guard');
    scene.addChild(figure.node);
    // A health bar over the head, turned to the camera each frame.
    const bar = new Object3D(),
      fill = model([[BOX, [0, 0, 0], [1, 0.09, 0.02], 0xffffff]], fillMaterial[unit.side], false),
      back = model([[BOX, [0, 0, -0.012], [1.04, 0.13, 0.02], 0xffffff]], backMaterial, false);
    bar.addChild(back);
    bar.addChild(fill);
    scene.addChild(bar);
    const actor = { unit, figure, bar, fill, rank: ++lineup[unit.side], x: unit.x - HALF_W, z: unit.y - HALF_D, heading: unit.side ? -Math.PI / 2 : Math.PI / 2, shown: 1, tag: null, fallAt: null };
    return actor;
  });
  const byId = new Map(cast.map((actor) => [actor.unit.id, actor]));
  // Frame both starting lines on a narrow canvas while keeping manual zoom relative to the framing.
  const startingWidth = Math.max(0, ...cast.map((actor) => Math.abs(actor.x))) * 2 + 5;
  const startingDepth = Math.max(0, ...cast.map((actor) => actor.z));
  let fit = 24;
  let entryGesture;
  function fitDistance() {
    if (!stage.canvas?.clientHeight || !stage.canvas.clientWidth) return 24;
    const aspect = stage.canvas.clientWidth / stage.canvas.clientHeight;
    const halfAngle = Math.tan(fov * Math.PI / 360) * Math.max(0.3, aspect);
    return Math.min(85, Math.max(24, startingWidth / (2 * halfAngle) + startingDepth + (aspect < 1 ? 3.5 : 0)));
  }

  const ring = createFocusHalo();
  scene.addChild(ring);
  const effects = createArenaEffects(scene, stage.quality);
  const shadows = stage.quality === 'low' ? createContactShadows(scene, cast.length) : null;

  /** Numbers that rise from a fighter and fade. */
  const floaters = [];
  function float(actor, text, kind) {
    if (!layer || floaters.length >= 20) return;
    const compact = cast.length > 8 && layer.clientWidth < 720;
    const lifeSpan = compact && kind !== 'crit' && kind !== 'heal' ? .64 : .9;
    const element = document.createElement('span');
    element.className = 'float ' + kind;
    element.textContent = text;
    layer.append(element);
    floaters.push({ element, x: actor.x + (random() - 0.5) * (compact ? 1.1 : .6), y: 2, z: actor.z, life: 0, lifeSpan });
  }

  // These cues follow the animation, while reports, HP, orders and outcome follow the original simulation clock.
  let visualTime = 0;
  const contacts = [];
  function play(event) {
    onEvent(event);
    if (arena.skipping) return;
    const from = byId.get(event.from),
      to = byId.get(event.to);
    if (event.type === 'hit' || event.type === 'miss') {
      // Miss events carry the move name only. Check newly authored arts when the initial index has no match.
      const klass = (event.type === 'miss'
        ? KLASS_BY_MOVE_NAME.get(event.move) ?? ARTS.find((art) => art.moves.some((move) => move.name === event.move))?.klass
        : KLASS_BY_ART_NAME.get(event.art) ?? (event.art && ARTS.find((art) => art.name === event.art)?.klass)) || 'fist';
      const action = STRIKE_OF[klass] ?? 'punch';
      from?.figure.play(action, { base: 'guard' });
      if (to) contacts.push({ at: visualTime + STRIKE_CONTACT[action], event, klass, from, to });
    } else if (event.type === 'heal' && to) {
      if (from && !from.figure.busy) from.figure.play('mend', { base: 'guard' });
      contacts.push({ at: visualTime + STRIKE_CONTACT.mend, event, klass: 'heal', from, to });
    } else if (event.type === 'down') {
      const actor = byId.get(event.id);
      const impact = contacts.findLast((cue) => cue.event.type === 'hit' && cue.event.time === event.time && cue.event.from === event.by && cue.to === actor);
      if (impact) actor.fallAt = impact.at;
      else actor?.figure.play('down');
    }
  }

  function showContacts() {
    // A wide exchange can have several hits in flight at once, in arbitrary contact-frame order.
    let kept = 0;
    for (const cue of contacts) {
      if (cue.at > visualTime) {
        contacts[kept++] = cue;
        continue;
      }
      const { event, klass, from, to } = cue;
      onContact({ type: event.type, klass, x: to.x, critical: !!event.crit });
      if (event.type === 'miss') {
        if (!to.unit.down && !to.figure.busy) to.figure.play('evade', { base: 'guard' });
        float(to, '闪', 'miss');
        continue;
      }
      if (event.type === 'heal') float(to, '+' + event.amount, 'heal');
      else {
        // A glancing reaction should not cut off a fighter's own weapon swing.
        if (!to.unit.down && !to.figure.busy) to.figure.play('hit', { base: 'guard' });
        float(to, String(event.damage), event.crit ? 'crit' : to.unit.side !== playerSide ? 'dealt' : 'taken');
      }
      effects.emit(klass, from, to, event.crit);
    }
    contacts.length = kept;
  }

  let clock = 0,
    ended = 0,
    told = false;
  const arena = {
    scene,
    camera,
    light,
    mist: 0.0032,
    lowPixelRatio: 1.25,
    battle,
    effects,
    paused: false,
    /** Game seconds for each real second. */
    speed: 1,
    skipping: false,
    /** Runs the rest of the fight at once. */
    skip() {
      arena.skipping = true;
      effects.clear();
      contacts.length = 0;
      onClearSounds();
      while (!battle.done) {
        battle.update();
        for (const event of battle.events) play(event);
        battle.events.length = 0;
      }
      arena.skipping = false;
      for (const actor of cast) if (actor.unit.down) {
        actor.fallAt = null;
        actor.figure.play('down');
      }
    },
    enter() {
      fit = fitDistance();
      scene.fog = { ...scene.fog, near: fit + 9, far: fit + 108 };
      stage.orbit.set({ target: [0, 3.9, -2.6], yaw: -.09, pitch: .42, distance: fit, minDistance: 7, maxDistance: Math.max(70, fit + 12), minPitch: 0.15, maxPitch: 1.35, reach: 24, drift: 0, dragPans: false });
      entryGesture = stage.orbit.gestureVersion;
      // A tap on an enemy sets the player's side on them; a second tap lets them choose for themselves again.
      stage.orbit.onTap = (x, y) => {
        let best;
        let nearest = 46;
        for (const actor of cast) {
          if (actor.unit.down || actor.unit.fled || (!arena.paused && actor.unit.side === playerSide)) continue;
          const body = stage.orbit.project(actor.x, 1.35, actor.z);
          const head = stage.orbit.project(actor.x, 2.9, actor.z);
          const distanceTo = (at) => at ? Math.hypot(at.x - x, at.y - y) : Infinity;
          const gap = Math.min(distanceTo(body), arena.paused ? distanceTo(head) : Infinity);
          if (gap < nearest) {
            nearest = gap;
            best = actor;
          }
        }
        if (arena.paused) inspected = best;
        if (best && best.unit.side !== playerSide) {
          battle.focus(playerSide, battle.orders[playerSide].focus === best.unit.id ? null : best.unit.id);
        }
      };
    },
    leave() {
      onClearSounds();
      for (const floater of floaters) floater.element.remove();
      for (const actor of cast) actor.tag?.remove();
      floaters.length = 0;
      effects.clear();
    },
    update(dt) {
      const still = arena.paused && !battle.done ? 0 : dt * Math.min(arena.speed, 2);
      if (!arena.paused && !battle.done) {
        clock += dt * arena.speed;
        while (clock >= RULES.step && !battle.done) {
          clock -= RULES.step;
          battle.update();
          for (const event of battle.events) play(event);
          battle.events.length = 0;
        }
      }
      visualTime += still;
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
        if (actor.fallAt !== null && visualTime >= actor.fallAt) {
          actor.fallAt = null;
          figure.play('down');
        }
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
        figure.node.setScale(1.35 * figure.height);
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
      shadows?.update(cast);
      if (still) showContacts();
      const marked = byId.get(battle.orders[playerSide].focus);
      ring.visible = !!marked && !marked.unit.down && !marked.unit.fled;
      if (ring.visible) {
        const radius = 1 + .065 * Math.sin(battle.time * 6 + clock * 20);
        ring.setPosition(marked.x, .055, marked.z).setScale(radius, 1, radius);
      }
      effects.update(dt);
      const nextFit = fitDistance();
      if (Math.abs(nextFit - fit) > 0.5) {
        stage.orbit.maxDistance = Math.max(70, nextFit + 12);
        stage.orbit.distance = Math.min(stage.orbit.maxDistance, Math.max(stage.orbit.minDistance, stage.orbit.distance + nextFit - fit));
        fit = nextFit;
        scene.fog = { ...scene.fog, near: fit + 9, far: fit + 108 };
      }
      const canvas = stage.canvas;
      if (still && !battle.done && canvas?.clientWidth < canvas?.clientHeight && stage.orbit.gestureVersion === entryGesture) {
        // Start wide enough for both lines, then ease in as the surviving fighters close.
        // A drag, pinch or wheel gesture leaves the camera under the player's control.
        let spread = 0;
        let front = 0;
        for (const { unit, x, z } of cast) {
          if (unit.down || unit.fled) continue;
          spread = Math.max(spread, Math.abs(x) + .1 * Math.abs(z));
          front = Math.max(front, z);
        }
        const halfAngle = Math.tan(fov * Math.PI / 360) * Math.max(.3, canvas.clientWidth / canvas.clientHeight);
        const distance = Math.min(fit, Math.max(fit * .69, (spread + 2.2) / halfAngle + front + 5));
        stage.orbit.distance += (distance - stage.orbit.distance) * (1 - Math.exp(-dt * 1.5));
      }
      stage.orbit.apply(camera, dt);

      // Numbers and names are laid over the canvas where their fighters are.
      for (let i = floaters.length - 1; i >= 0; i--) {
        const floater = floaters[i];
        floater.life += dt;
        const at = stage.orbit.project(floater.x, floater.y + floater.life * 1.6, floater.z);
        if (floater.life > floater.lifeSpan || !at) {
          floater.element.remove();
          floaters.splice(i, 1);
          continue;
        }
        floater.element.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px) translate(-50%, -50%)`;
        floater.element.style.opacity = String(Math.min(1, (floater.lifeSpan - floater.life) * 3));
      }
      // Number close formations on narrow screens and show the captain or inspected name in full.
      const compactTags = cast.length > 8 && (layer?.clientWidth ?? Infinity) < 720;
      const selectedTag = inspected && !inspected.unit.down && !inspected.unit.fled ? inspected : undefined;
      for (const actor of cast) {
        const show = layer && arena.paused && !actor.unit.down && !actor.unit.fled;
        if (!show) {
          if (actor.tag) actor.tag.remove(), (actor.tag = null);
          continue;
        }
        if (!actor.tag) {
          actor.tag = document.createElement('span');
          actor.tag.className = 'nametag side' + (actor.unit.side === playerSide ? 0 : 1);
          actor.tag.title = actor.unit.name;
          actor.tag.setAttribute('aria-label', actor.unit.name);
          layer.append(actor.tag);
        }
        const emphasized = actor === selectedTag || actor === marked;
        const compact = compactTags && !emphasized && actor.rank !== 1;
        const label = compact ? String(actor.rank) : actor.unit.name;
        if (actor.tag.textContent !== label) {
          actor.tag.textContent = label;
          actor.tag.classList.toggle('is-compact', compact);
        }
        actor.tag.classList.toggle('is-inspected', emphasized);
        const at = stage.orbit.project(actor.x, 3.0, actor.z);
        actor.tag.style.transform = at ? `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px) translate(-50%, -100%)` : 'translate(-999px, 0)';
      }

      if (battle.done && !told) {
        ended += dt;
        for (const actor of cast) if (!actor.unit.down && !actor.figure.busy && actor.figure.action !== 'idle') actor.figure.play('idle');
        if (ended > 1.6) (told = true), onEnd();
      }
    },
  };
  return arena;
}
