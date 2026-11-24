import { createGame } from './world.mjs';
import { fieldOf } from './military.mjs';

export const NANPI_TRIAL = {
  id: 'nanpi-sunset',
  title: { zh: '夕照南皮', en: 'Nanpi at sunset' },
};

export function createNanpiTrial() {
  const state = createGame({ faction: 'liubei', seed: 184 });
  const place = { node: 'nanpi' };
  const approach = { armies: { column: { cameFrom: 'pingyuan' } } };
  const factions = ['liubei', 'yuanshao'];
  const unit = (side, general, kind, troops, formation) => ({
    side, general, unit: kind, troops, formation, faction: factions[side],
    deputies: [], morale: 85, training: 60,
  });
  const setup = {
    id: NANPI_TRIAL.id,
    presentation: NANPI_TRIAL.id,
    place,
    kind: 'siege',
    special: null,
    seed: 311,
    wall: state.nodes.nanpi.wall,
    factions,
    ...fieldOf(approach, place, ['column']),
    units: [
      unit(0, 'guanyu', 'spear', 7500, 'fishscale'),
      unit(0, 'huangzhong', 'archer', 5400, 'geese'),
      unit(0, null, 'ram', 3500, 'square'),
      unit(1, 'qianzhao', 'sword', 5500, 'square'),
      unit(1, 'yuanshao', 'archer', 5200, 'geese'),
    ],
  };
  // This detached state supplies normal officer and technology lookups. It is never saved.
  return { state, setup };
}
