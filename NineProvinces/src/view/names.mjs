// 名字：势力（改过国号的用新名）、武将、地点，按当前语言。
// Names: of powers (a new name once a power has taken one), generals and places, in the current language.
import { FACTIONS, LATER } from '../data/factions.mjs';
import { GENERALS } from '../data/generals.mjs';
import { NODES } from '../data/map.mjs';
import { nm } from '../i18n.mjs';

export const factionName = (state, id) => (id ? nm(state?.factions[id]?.name ?? FACTIONS[id] ?? LATER[id]) : '');
export const generalName = (id) => (id ? nm(GENERALS[id]) : '');
export const placeName = (id) => nm(NODES[id]);
