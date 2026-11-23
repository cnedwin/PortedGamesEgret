import { GENERALS } from '../data/generals.mjs';

const artRoot = new URL('../../assets/portraits/', import.meta.url);
const militia = [1, 3, 9, 13, 16, 22, 23];
const officials = [0, 4, 5, 8, 10, 11, 12, 14];
const women = [2, 18, 19, 20, 21];

/** Officer rolls use a close face crop; a dossier uses the larger painted figure. */
export function portrait(id, size = 96) {
  const general = GENERALS[id];
  const kind = size >= 72 ? 'panel' : 'avatar';
  let name = 'type-0';
  if (general?.made && Number.isInteger(general.portrait) && general.portrait >= 0 && general.portrait < 24) {
    name = 'type-' + general.portrait;
  } else if (general?.made) {
    const pools = general.female ? women : general.stats.war > general.stats.int + 6 ? militia : officials;
    const seed = Number.parseInt(id.slice(1), 36) || 0;
    name = 'type-' + pools[seed % pools.length];
  } else if (general) {
    name = id;
  }
  return new URL(kind + '/' + name + '.webp', artRoot).href;
}
