import { BANNER_COLOURS, customFactionOptions } from '../sim/custom-faction.mjs';
import { pair } from './text.mjs';

export const foundingSubmission = config => ({ ...config, companions: config.companions.filter(Boolean) });

const searchKey = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[\s'’\-·]/g, '');
/** Retain the current choice while filtering; no synthetic choice is made. */
export function filterFoundingOfficers(officers, query = '', current = '', excluded = []) {
  const needle = searchKey(query);
  const taken = new Set(excluded);
  return officers.filter(g => !taken.has(g.ref) && (g.ref === current || !needle || [g.zh, g.en, g.id].some(value => searchKey(value).includes(needle))));
}

export function freshFounding() {
  return { zh: '新义军', en: '', flag: '义', colour: BANNER_COLOURS[0], town: '', ruler: '', companions: [], search: '' };
}

/** Refresh eligibility after a year/roster change without silently taking a ruler. */
export function reconcileFounding(state, roster, config) {
  const options = customFactionOptions(state, roster);
  const available = new Set(options.officers.map(g => g.ref));
  if (!options.towns.some(n => n.id === config.town)) config.town = options.towns[0]?.id ?? '';
  if (!available.has(config.ruler)) config.ruler = options.officers.find(g => g.source === 'roster')?.ref
    ?? (available.has('history:zhaoyun') ? 'history:zhaoyun' : options.officers[0]?.ref ?? '');
  config.companions = config.companions.map(ref => available.has(ref) && ref !== config.ruler ? ref : '');
  return options;
}

const validationWords = {
  name: ['势力名称须为1–12字，英文名最多48字符。', 'Use a name of 1–12 characters and an English name of at most 48.'],
  flag: ['请填写一个旗号字。', 'Use one banner character.'],
  colour: ['请选择旗帜颜色。', 'Choose a banner colour.'],
  town: ['请选择本年代提供的起家城。', 'Choose a founding town available in this era.'],
  ruler: ['主公须已成年、在世，且不是其他势力的现任君主。', 'The ruler must be living, of age and not already ruling another faction.'],
  companions: ['同行最多三人，不能重复或与主公相同。', 'Choose up to three distinct companions, excluding the ruler.']
};
export const foundingErrorText = errors => errors.map(key => pair(validationWords[key] ?? validationWords.ruler)).join(' ');
