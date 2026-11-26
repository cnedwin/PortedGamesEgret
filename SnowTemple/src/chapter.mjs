import { createGame, grant } from './rules/game.mjs';

/** What Lin Chong carries into the temple, kept so the duel can be fought again from its door. */
export function captureTempleLoadout(game) {
  const { will, power } = game.hero;
  return { will, power, coins: game.coins, bag: { ...game.bag }, boons: [...game.boons], tier: game.tier };
}

export function createTempleReplay(loadout, seed = 7) {
  const game = createGame(seed, { tier: loadout.tier ?? 1 });
  // Start just inside the entrance and let the usual arena rule start the duel.
  game.hero.z = -22.25;
  for (const boon of loadout.boons ?? []) grant(game, boon);
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
