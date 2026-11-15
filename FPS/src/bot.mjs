// A stand-in player. It walks the walking grid to each terminal and then to
// the helipad, shoots whoever it can see and bandages when hurt. The title
// screen uses nothing of it; automated checks use it to prove a run can be
// finished, and `?auto=1` lets it play in the browser.
import { ENEMY_BODY } from './data.mjs';
import { PLACES } from './level.mjs';
import { idleInput } from './sim.mjs';

const span = (x, z) => Math.sqrt(x * x + z * z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createBot(game, { skill = 1 } = {}) {
  const input = idleInput();
  let path = [],
    pathIn = 0,
    goalKey = '',
    stuck = 0;
  /** Where to go next: [x, z, what]. */
  function goal() {
    const p = game.player;
    let best;
    for (const terminal of game.terminals) {
      if (terminal.done) continue;
      const d = span(terminal.x - p.x, terminal.z - p.z);
      if (!best || d < best.d) best = { d, terminal };
    }
    if (best) {
      const t = best.terminal;
      return [t.x - Math.sin(t.facing) * 1.3, t.z - Math.cos(t.facing) * 1.3, t];
    }
    return [PLACES.helipad.x, PLACES.helipad.z, undefined];
  }
  return {
    input,
    /** Fill `input` for the next step of `dt` seconds. */
    think(dt) {
      const p = game.player;
      Object.assign(input, idleInput());
      if (game.state !== 'play') return input;
      const eyeY = p.y + p.eye;

      // Fight first: the nearest soldier in view.
      let foe,
        foeDistance = Infinity;
      for (const enemy of game.enemies) {
        if (enemy.dead) continue;
        const d = span(enemy.x - p.x, enemy.z - p.z);
        if (d < foeDistance && d < 60 && game.clearLine(p.x, eyeY, p.z, enemy.x, enemy.ducked ? 0.8 : 1.25, enemy.z)) {
          foe = enemy;
          foeDistance = d;
        }
      }
      const weapon = game.weapons[p.weapon];
      let wantYaw, wantPitch;
      if (foe) {
        const aimY = foe.ducked
          ? foeDistance < 14 * skill
            ? ENEMY_BODY.duckedHeadY
            : 0.7
          : foeDistance < 14 * skill
            ? ENEMY_BODY.headY
            : 1.15;
        wantYaw = Math.atan2(-(foe.x - p.x), -(foe.z - p.z));
        wantPitch = Math.atan2(aimY - eyeY, foeDistance) - p.kick;
      }

      // Otherwise walk the path to the goal.
      const [gx, gz, terminal] = goal();
      const key = gx + ',' + gz;
      pathIn -= dt;
      if (pathIn <= 0 || key !== goalKey) {
        pathIn = 0.5;
        goalKey = key;
        const found = game.navMesh.findPath([p.x, 0, p.z], [gx, 0, gz], { snapDistance: 3 });
        path = found ? found.points.slice(1) : [];
      }
      while (path.length > 1 && span(path[0][0] - p.x, path[0][2] - p.z) < 0.5) path.shift();
      const next = path[0] ?? [gx, 0, gz];
      const toGoal = span(gx - p.x, gz - p.z);
      let walkX = next[0] - p.x,
        walkZ = next[2] - p.z;
      const walkLength = span(walkX, walkZ) || 1;
      walkX /= walkLength;
      walkZ /= walkLength;

      const using = game.prompt && (!foe || foeDistance > 30);
      if (!foe) {
        // Look where it walks, or at the thing it is using.
        if (terminal && toGoal < 1.2) wantYaw = Math.atan2(-(terminal.x - p.x), -(terminal.z - p.z));
        else wantYaw = Math.atan2(-walkX, -walkZ);
        wantPitch = 0;
      }
      const turn = wrap(wantYaw - p.yaw),
        tilt = wantPitch - p.pitch,
        rate = dt * 9 * skill;
      input.lookYaw = Math.max(-rate, Math.min(rate, turn));
      input.lookPitch = Math.max(-rate, Math.min(rate, tilt));

      if (foe) {
        const onTarget = Math.abs(turn) < 0.02 + 0.25 / foeDistance && Math.abs(tilt) < 0.03 + 0.25 / foeDistance;
        input.aim = foeDistance > 8;
        input.fire = onTarget && weapon.ammo > 0;
        input.crouch = foeDistance > 12 && p.health < 70;
      }
      if (weapon.ammo === 0 || (!foe && weapon.ammo < weapon.def.mag * 0.4)) input.reload = true;
      if (p.health < 50 && p.bandages > 0 && (!foe || p.health < 25)) input.heal = true;

      // Keep moving unless busy shooting from a good spot.
      const hold = (foe && foeDistance < 28 && p.health > 30) || (terminal && toGoal < 0.5) || (!terminal && toGoal < 2);
      if (!hold) {
        const sin = Math.sin(p.yaw),
          cos = Math.cos(p.yaw);
        input.moveZ = -sin * walkX - cos * walkZ;
        input.moveX = cos * walkX - sin * walkZ;
        input.sprint = !foe && input.moveZ > 0.8;
        // Hop when something low is in the way.
        stuck = p.speed < 0.5 ? stuck + dt : 0;
        if (stuck > 0.6) {
          input.jump = true;
          stuck = 0;
        }
      }
      input.interact = Boolean(using);
      return input;
    },
  };
}
