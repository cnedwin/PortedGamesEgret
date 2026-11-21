// Egret draws the shared actor atlas, combat telegraphs and pooled effects. The view reads the run and events.
import { createBattleAtlas } from './actor-art.mjs';
import { ENEMIES } from './sim/data.mjs';
import { PLAYER, specOf, statsOf } from './sim/world.mjs';

export const RED = 0xd1342b, GOLD = 0xe8b84a, SKIN = 0xf2d0a4, INK = 0x14202b, PAPER = 0xffefd2, SEA = 0x0d2a3a;
export { PLAYER };

const TURN = 180 / Math.PI;
const TWO_PI = Math.PI * 2;
const UPRIGHT = new Set(['crab', 'jelly', 'puffer', 'conch', 'yaksha']);
const EFFECT_LIMIT = 44;
const POSE_RATE = { shrimp: 13, crab: 10, jelly: 5, shark: 9, puffer: 7, conch: 6, yaksha: 7, aoBing: 8 };
const clamp = (value) => Math.max(0, Math.min(1, value));

export function createView(game) {
  const layers = {
    warning: game.sprite(), drops: game.sprite(), body: game.sprite(), soldiers: game.sprite(),
    shots: game.sprite(), hero: game.sprite(), strokes: game.sprite(), words: game.sprite()
  };
  let atlas;
  const ready = createBattleAtlas(game).then((loaded) => { atlas = loaded; });
  const pools = new Map();
  const live = { soldiers: new Map(), drops: new Map(), shots: new Map(), spits: new Map() };
  const effects = [], numbers = [], textPool = [], wheels = [], body = [], trail = [];
  let stamp = 0, avatar = null, lastX = 0, lastY = 0, cast = 0, bodyClock = 0, dragonId = -1;

  function take(key, layer) {
    const slot = layer + ':' + key;
    if (!pools.has(slot)) pools.set(slot, []);
    const entry = pools.get(slot).pop() ?? { ...atlas.image(key, layers[layer]), key, slot };
    entry.node.visible = true;
    entry.node.alpha = 1;
    entry.node.rotation = 0;
    entry.hit = 0;
    entry.flip = 1;
    entry.warning = null;
    entry.frame(0);
    return entry;
  }

  function give(entry) {
    if (entry.warning) {
      give(entry.warning);
      entry.warning = null;
    }
    entry.node.visible = false;
    pools.get(entry.slot).push(entry);
  }

  function sync(map, objects, keyOf, layer, paint) {
    for (const data of objects) {
      let entry = map.get(data.id);
      if (!entry) {
        entry = take(keyOf(data), layer);
        map.set(data.id, entry);
      }
      entry.stamp = stamp;
      paint(entry, data);
    }
    for (const [id, entry] of map) if (entry.stamp !== stamp) {
      give(entry);
      map.delete(id);
    }
  }

  function pose(node, x, y, sx, sy = sx, rotation = 0) {
    node.x = x;
    node.y = y;
    node.scaleX = sx / atlas.density;
    node.scaleY = sy / atlas.density;
    node.rotation = rotation;
  }

  function renderHero(run, seconds, reduced) {
    const p = run.player;
    if (avatar?.key !== run.hero) {
      if (avatar) give(avatar);
      avatar = take(run.hero, 'hero');
      lastX = p.x;
      lastY = p.y;
    }
    const moving = Math.abs(p.x - lastX) + Math.abs(p.y - lastY) > 0.27;
    lastX = p.x;
    lastY = p.y;
    const face = Math.cos(p.facing);
    if (Math.abs(face) > 0.15) avatar.flip = face > 0 ? 1 : -1;
    cast = Math.max(0, cast - seconds * 5.6);
    const hover = reduced ? 0 : Math.sin(run.time * (moving ? 17 : 6)) * (moving ? 1.7 : 1);
    const lean = moving && !reduced ? Math.sin(run.time * 15) * 4 + avatar.flip * 5 : 0;
    if (!reduced) avatar.frame(Math.floor(run.time * (moving ? 11 : 4)));
    const lift = 1 + cast * 0.09;
    pose(avatar.node, p.x, p.y + hover, avatar.flip * lift, 1 - cast * 0.045, lean);
    avatar.node.alpha = p.guard > 0 ? 0.76 + 0.24 * clamp(1 - p.guard / PLAYER.guard) : 1;
  }

  function renderWheels(run, reduced) {
    let index = 0;
    const range = statsOf(run).range;
    const p = run.player;
    for (const weapon of run.weapons) {
      const spec = specOf(weapon);
      if (spec.kind !== 'orbit') continue;
      const key = weapon.divine ? 'heavenWheel' : 'wheel';
      const reach = spec.reach * (1 + range / 100);
      for (let k = 0; k < spec.count; k++, index++) {
        let wheel = wheels[index];
        if (wheel?.key !== key) {
          if (wheel) give(wheel);
          wheel = wheels[index] = take(key, 'shots');
        }
        const angle = weapon.angle + k / spec.count * TWO_PI;
        wheel.node.visible = true;
        const size = weapon.divine ? 1.13 : 0.92;
        pose(wheel.node, p.x + Math.cos(angle) * reach, p.y + Math.sin(angle) * reach, size, size, reduced ? angle * TURN : run.time * 690 + k * 45);
      }
    }
    for (let i = index; i < wheels.length; i++) wheels[i].node.visible = false;
  }

  function drawWarning(entry, enemy, run, reduced) {
    const spitting = enemy.kind === 'conch' && enemy.rising <= 0 && enemy.act > 0 && enemy.act < 0.28;
    const key = enemy.state === 'fuse' ? 'warning'
      : enemy.state === 'aim' ? 'aim'
      : enemy.state === 'cast' ? 'iceWake' : spitting ? 'spitAim' : null;
    if (entry.warning && entry.warning.key !== key) {
      give(entry.warning);
      entry.warning = null;
    }
    if (!key) return;
    entry.warning ??= take(key, 'warning');
    const { node } = entry.warning;
    const size = ENEMIES[enemy.kind].radius;
    if (key === 'aim') {
      const reach = ENEMIES[enemy.kind].speed * (enemy.kind === 'shark' ? 2.38 : 2.4);
      pose(node, enemy.x, enemy.y, reach / 84, size / 10, (enemy.dir ?? 0) * TURN);
      node.alpha = reduced ? 0.78 : 0.78 + Math.sin(run.time * 19) * 0.10;
    } else if (key === 'warning') {
      pose(node, enemy.x, enemy.y, 64 / 55);
      node.alpha = 0.67 + 0.21 * clamp(1 - enemy.stateLeft / 0.75);
    } else if (key === 'spitAim') {
      const p = run.player;
      const turn = Math.atan2(p.y - enemy.y, p.x - enemy.x) * TURN;
      pose(node, enemy.x, enemy.y, 0.54, 0.65, turn);
      node.alpha = 0.48 + 0.32 * clamp(1 - enemy.act / 0.28);
    } else {
      pose(node, enemy.x, enemy.y, 77 / 54);
      node.alpha = 0.42 * clamp(enemy.stateLeft * 2);
    }
  }

  function renderEnemy(entry, enemy, run, seconds, reduced) {
    const spec = ENEMIES[enemy.kind];
    const birth = clamp(1 - enemy.rising / (spec.boss ? 1.2 : 0.7));
    const fuse = enemy.state === 'fuse' ? clamp(1 - enemy.stateLeft / 0.75) : 0;
    const charging = enemy.state === 'charge';
    const aimed = enemy.state === 'aim';
    const moving = Boolean(enemy.vx || enemy.vy);
    entry.hit = Math.max(0, entry.hit - seconds * 5.5);
    if (enemy.vx) entry.flip = enemy.vx < 0 ? -1 : 1;
    const cycle = run.time * POSE_RATE[enemy.kind] + enemy.id * 0.83;
    if (!reduced) entry.frame(Math.floor(cycle));
    const height = reduced ? 0 : Math.sin(cycle * 1.44) * (enemy.kind === 'jelly' ? 2.8 : 1.1);
    const aim = aimed || charging ? enemy.dir : moving ? Math.atan2(enemy.vy, enemy.vx) : entry.node.rotation / TURN;
    const swelling = 1 + fuse * 0.3;
    const model = (0.64 + birth * 0.36) * swelling;
    const recoil = reduced ? 0 : entry.hit * 0.11;
    const baseAngle = UPRIGHT.has(enemy.kind) ? (reduced ? 0 : Math.sin(cycle) * 4 + entry.flip * (charging ? 12 : 0)) : (aim ?? 0) * TURN;
    pose(entry.node, enemy.x, enemy.y + height, (UPRIGHT.has(enemy.kind) ? entry.flip : 1) * model * (1 + recoil), model * (1 - recoil), baseAngle);
    entry.node.alpha = Math.max(0.12, birth) * (1 - entry.hit * 0.22);
    drawWarning(entry, enemy, run, reduced);
  }

  function renderDragon(run, seconds) {
    const boss = run.boss?.kind === 'aoBing' ? run.boss : null;
    if (boss?.id !== dragonId) {
      dragonId = boss?.id ?? -1;
      bodyClock = 0;
      trail.length = 0;
    }
    if (boss) {
      bodyClock += seconds;
      if (bodyClock >= 0.038 || trail.length === 0) {
        bodyClock %= 0.038;
        trail.unshift({ x: boss.x, y: boss.y });
        if (trail.length > 36) trail.length = 36;
      }
    }
    for (let i = 0; i < 6; i++) {
      const at = boss ? trail[(i + 1) * 4] : null;
      if (!at) {
        if (body[i]) body[i].node.visible = false;
        continue;
      }
      const entry = body[i] ??= take('dragonSegment', 'body');
      const ahead = trail[(i + 1) * 4 - 1];
      const rotate = Math.atan2(ahead.y - at.y, ahead.x - at.x) * TURN;
      const size = 1.22 - i * 0.13;
      pose(entry.node, at.x, at.y, size, size, rotate);
      entry.node.alpha = 0.91 - i * 0.05;
      entry.node.visible = true;
    }
  }

  function visual(key, x, y, sx, sy = sx, turn = 0, life = 0.28, priority = false) {
    if (effects.length >= EFFECT_LIMIT) {
      if (!priority) return;
      give(effects.shift().entry);
    }
    const entry = take(key, 'strokes');
    pose(entry.node, x, y, sx, sy, turn);
    effects.push({ entry, x, y, sx, sy, turn, life, age: 0, sinking: key in ENEMIES });
  }

  function float(x, y, words, color, crit = false) {
    if (numbers.length >= 12) return;
    const label = textPool.pop() ?? game.text('', {x: 0, y: 0, size: 15, color: PAPER, align: 'center', bold: true, layer: layers.words});
    label.text = words;
    label.color = color;
    label.size = crit ? 20 : 15;
    label.x = x;
    label.y = y - 17;
    label.alpha = 1;
    label.visible = true;
    numbers.push({ label, age: 0 });
  }

  function presentEvents(run, events, reduced) {
    let hits = 0, splashes = 0, pickup = false;
    for (const event of events) {
      switch (event.type) {
        case 'sweep':
          cast = 1;
          visual(event.weapon === 'bindDragon' ? 'dragonSweep' : 'sweep', event.x, event.y, event.reach / 56, event.reach / 56, event.angle * TURN, 0.22, true);
          break;
        case 'thrust':
          cast = 1;
          visual(event.weapon === 'fireSpear' ? 'fireThrust' : 'thrust', event.x, event.y, event.reach / 92, event.width / 16, event.angle * TURN, 0.18, true);
          break;
        case 'nova':
          cast = 1;
          visual(event.weapon === 'dragonBrick' ? 'dragonNova' : 'nova', event.x, event.y, event.reach / 55, event.reach / 55, 0, 0.32, true);
          break;
        case 'land':
          visual(event.weapon === 'dragonBrick' ? 'dragonImpact' : 'impact', event.x, event.y, event.splash / 55, event.splash / 55, 22, 0.33, true);
          if (!reduced) game.burst(event.x, event.y, { color: GOLD, count: 9, speed: 108, life: 0.26, size: 3 });
          break;
        case 'throw':
        case 'lob':
          cast = 1;
          break;
        case 'hit': {
          const hit = live.soldiers.get(event.id);
          if (hit) hit.hit = 1;
          if (event.crit || hits++ < 3) {
            visual('spark', event.x, event.y, event.crit ? 0.9 : 0.48, event.crit ? 0.9 : 0.48, event.id % 3 * 24, 0.16);
            float(event.x, event.y, String(event.damage), event.crit ? GOLD : PAPER, event.crit);
          }
          break;
        }
        case 'spawn':
        case 'sink':
        case 'kill': {
          const boss = ENEMIES[event.kind]?.boss;
          if (boss || splashes++ < 4) visual(boss ? 'iceWake' : 'waterWake', event.x, event.y, boss ? 1.45 : 0.36, boss ? 1.45 : 0.36, event.id % 3 * 18, boss ? 0.64 : 0.32, boss);
          if (event.type === 'kill' && (boss || splashes <= 2)) {
            visual(event.kind, event.x, event.y, 1, 1, 0, boss ? 0.54 : 0.23, boss);
            if (!reduced) game.burst(event.x, event.y, { color: boss ? GOLD : 0x80dfd6, count: boss ? 23 : 5, speed: boss ? 130 : 95, life: 0.3, size: 2.6 });
          }
          break;
        }
        case 'boss': {
          const boss = run.boss;
          if (boss) visual(boss.kind === 'aoBing' ? 'iceWake' : 'warning', boss.x, boss.y, 1.58, 1.58, 0, 0.6, true);
          break;
        }
        case 'summon':
        case 'spit':
        case 'ice': {
          const enemy = live.soldiers.get(event.id)?.node;
          if (enemy) visual(event.type === 'ice' ? 'iceWake' : event.type === 'spit' ? 'spark' : 'waterWake', enemy.x, enemy.y, event.type === 'spit' ? 0.56 : 0.94, event.type === 'spit' ? 0.56 : 0.94, 0, 0.31, event.type !== 'spit');
          break;
        }
        case 'burst':
          visual('warning', event.x, event.y, event.radius / 55, event.radius / 55, 0, 0.33, true);
          break;
        case 'hurt':
          visual('warning', event.x, event.y, 0.47, 0.47, 0, 0.23, true);
          if (!reduced) game.shake(2, 0.12);
          float(event.x, event.y - 13, '-' + event.amount, 0xff8b77, true);
          break;
        case 'dodge':
          visual('waterWake', event.x, event.y, 0.51, 0.51, 0, 0.30, true);
          break;
        case 'pearl':
          pickup = true;
          break;
        case 'level':
          visual('dragonNova', run.player.x, run.player.y, 0.79, 0.79, 0, 0.36, true);
          break;
      }
    }
    if (pickup) visual('spark', run.player.x + 12, run.player.y - 19, 0.44, 0.44, 22, 0.20);
  }

  function fadeEffects(seconds, reduced) {
    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i];
      effect.age += seconds;
      const fraction = clamp(effect.age / effect.life);
      if (fraction === 1) {
        give(effect.entry);
        effects.splice(i, 1);
        continue;
      }
      const zoom = reduced ? 1 : effect.sinking ? 1 - 0.40 * fraction : 0.88 + 0.15 * fraction;
      const sink = effect.sinking && !reduced ? fraction : 0;
      pose(effect.entry.node, effect.x, effect.y + 12 * sink, effect.sx * zoom, effect.sy * zoom, effect.turn + 22 * sink);
      effect.entry.node.alpha = (1 - fraction) ** 0.8;
    }
    for (let i = numbers.length - 1; i >= 0; i--) {
      const { label } = numbers[i];
      const age = numbers[i].age += seconds;
      if (age >= 0.66) {
        label.visible = false;
        textPool.push(label);
        numbers.splice(i, 1);
      } else {
        label.y -= seconds * (reduced ? 0 : 37);
        label.alpha = 1 - age / 0.66;
      }
    }
  }

  function clear() {
    for (const map of Object.values(live)) {
      for (const entry of map.values()) give(entry);
      map.clear();
    }
    for (const effect of effects) give(effect.entry);
    for (const { label } of numbers) {
      label.visible = false;
      textPool.push(label);
    }
    for (const entry of wheels) entry.node.visible = false;
    for (const entry of body) if (entry) entry.node.visible = false;
    if (avatar) { give(avatar); avatar = null; }
    cast = 0;
    bodyClock = 0;
    dragonId = -1;
    trail.length = effects.length = numbers.length = 0;
  }

  return {
    ready,
    clear,
    show(run, events, seconds) {
      if (!atlas) return;
      stamp++;
      const reduced = game.reducedMotion;
      renderHero(run, seconds, reduced);
      renderWheels(run, reduced);
      renderDragon(run, seconds);
      sync(live.soldiers, run.enemies, (enemy) => enemy.kind, 'soldiers', (entry, enemy) => renderEnemy(entry, enemy, run, seconds, reduced));
      sync(live.drops, run.drops, (drop) => drop.value > 2 ? 'largePearl' : 'pearl', 'drops', (entry, drop) => {
        const pulse = reduced ? 0 : Math.sin(run.time * 5 + drop.id) * 0.08;
        const size = entry.key === 'largePearl' ? 1.22 : 0.95;
        pose(entry.node, drop.x, drop.y, size + pulse);
      });
      sync(live.shots, run.shots, (shot) => shot.type === 'ring' ? (shot.weapon === 'bindDragon' ? 'dragonRing' : 'ring') : (shot.weapon === 'dragonBrick' ? 'dragonBrick' : 'brick'), 'shots', (entry, shot) => {
        if (shot.type === 'ring') {
          pose(entry.node, shot.x, shot.y, 1, 1, reduced ? shot.angle * TURN : run.time * 705 + shot.id * 23);
        } else {
          const t = clamp(shot.t / shot.flight);
          pose(entry.node, shot.x0 + (shot.x - shot.x0) * t, shot.y0 + (shot.y - shot.y0) * t - Math.sin(t * Math.PI) * 68, 0.94, 0.94, reduced ? 0 : t * 340);
        }
      });
      sync(live.spits, run.spits, (spit) => spit.ice ? 'ice' : 'spit', 'shots', (entry, spit) => {
        pose(entry.node, spit.x, spit.y, 0.84, 0.84, Math.atan2(spit.vy, spit.vx) * TURN);
      });
      presentEvents(run, events, reduced);
      fadeEffects(seconds, reduced);
    }
  };
}
