import { createGame } from './rules/game.mjs';

export function captureTempleLoadout(game) {
  const { will, power } = game.hero;
  return { will, power, coins: game.coins, bag: { ...game.bag } };
}

export function createTempleReplay(loadout) {
  const game = createGame();
  // Start just inside the entrance and let the usual arena rule start the duel.
  game.hero.z = -22.25;
  game.hero.will = loadout.will;
  game.hero.power = loadout.power;
  game.coins = loadout.coins;
  game.bag = { ...loadout.bag };
  game.foes = [game.boss];
  game.stage = 'gate';
  game.party = 1;
  game.bars.gate = false;
  game.checkpoint = 'rest';
  return game;
}
