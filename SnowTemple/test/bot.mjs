// A player made of rules, for the tests and for looking at the game without hands: it walks the chapter,
// cuts at whoever is nearest, and guards or steps aside when a blow is coming.
import { PLACES } from '../src/rules/arena.mjs';
import { quiet } from '../src/rules/game.mjs';
import { HERO } from '../src/rules/tune.mjs';

export function createBot({ skill = 1 } = {}) {
  let wasAttack = false,
    tick = 0;
  return function think(game) {
    const input = quiet(),
      hero = game.hero;
    tick++;
    const foes = game.foes.filter((foe) => foe.state !== 'dead' && foe.state !== 'wait');
    let near = null,
      best = 1e9;
    for (const foe of foes) {
      const d = Math.hypot(foe.x - hero.x, foe.z - hero.z);
      if (d < best) (best = d), (near = foe);
    }
    const toward = (x, z) => ((input.mx = x - hero.x), (input.mz = z - hero.z));
    if (!near) {
      // Nobody about: pick up what fell, then go on up the road.
      const drop = game.drops.find((d) => d.landed);
      if (drop) toward(drop.x, drop.z);
      else if (game.stage === 'gate' && hero.z > -8 && game.checkpoint !== 'rest') toward(PLACES.rest.x + 1.2, PLACES.rest.z + 1.2);
      else if (game.stage === 'road' || game.stage === 'yard') toward(0, 6);
      else if (game.stage === 'gate') toward(0, -26);
      return input;
    }
    input.ax = near.x - hero.x;
    input.az = near.z - hero.z;
    // Someone is winding up at us.
    const threat = foes.find((foe) => foe.state === 'windup' && foe.move && foe.t > foe.move.windup - 0.3 && (foe.move.shape === 'disc' ? Math.hypot(foe.aim.x - hero.x, foe.aim.z - hero.z) < foe.move.range + 1 : Math.hypot(foe.x - hero.x, foe.z - hero.z) < foe.move.range + 1.5));
    if (threat && skill > 0) {
      if (threat.move.unblockable || threat.move.shape === 'line') {
        if (threat.t > threat.move.windup - 0.12) {
          input.dodge = true;
          input.mx = -(threat.z - hero.z) || 1;
          input.mz = threat.x - hero.x;
        }
      } else {
        input.guard = true;
        input.ax = threat.x - hero.x;
        input.az = threat.z - hero.z;
      }
      return input;
    }
    if (hero.hp < HERO.hp * 0.4 && hero.gourd > 0 && best > 4) input.drink = true;
    else if (hero.will >= HERO.will && best < 7) input.rain = true;
    else if (hero.starsWait <= 0 && best < 12 && best > 3) input.stars = true;
    else if (best > 2.6) toward(near.x, near.z);
    else {
      input.attack = !wasAttack && tick % 2 === 0;
    }
    wasAttack = input.attack;
    return input;
  };
}
