// 界面上的成句：日志的一行、特性和宝物的效果、年龄与身份、事件的标题——把规则里的标识换成当前语言的名字。
// Sentences of the interface: a line of the log, what a trait or treasure does, an age and a standing, the title of an
// event — the rules' ids turned into names in the current language.
import { EFFECTS, TRAITS } from '../data/traits.mjs';
import { KINDS, SHAPES, TACTICS } from '../data/tactics.mjs';
import { TECHS } from '../data/techs.mjs';
import { TREASURES } from '../data/treasures.mjs';
import { GENERALS } from '../data/generals.mjs';
import { NODES } from '../data/map.mjs';
import { UNITS } from '../data/battle.mjs';
import { dateOf } from '../sim/core.mjs';
import { activeTreaty } from '../sim/military.mjs';
import { EVENTS } from '../sim/story.mjs';
import { dateWords, getLanguage, nm, t } from '../i18n.mjs';
import { factionName, generalName, placeName } from '../view/names.mjs';

/** One of a [zh, en] pair. */
export const pair = (a) => (a ? (getLanguage() === 'en' ? a[1] : a[0]) : '');

/** What a set of effects does, as short lines. */
export function effectLines(effects) {
  return Object.entries(effects ?? {})
    .filter(([k, v]) => EFFECTS[k] && v)
    .map(([k, v]) => pair(EFFECTS[k]).replace('+{v}', v > 0 ? '+' + v : '−' + Math.abs(v)).replace('{v}', v));
}

export const traitText = (id) => effectLines(TRAITS[id]?.effects).join(getLanguage() === 'en' ? '; ' : '；');
export const treasureText = (id) => {
  const tr = TREASURES[id];
  if (!tr) return '';
  return [t(tr.ability) + ' +' + tr.amount, ...effectLines(tr.effects)].join(getLanguage() === 'en' ? '; ' : '；');
};
export const techText = (id) => effectLines(TECHS[id]?.effects).join(getLanguage() === 'en' ? '; ' : '；');

/** What a tactic does, in a line. */
export function tacticText(id) {
  const tc = TACTICS[id];
  if (!tc) return '';
  const what = pair(KINDS[tc.kind]),
    where = pair(SHAPES[tc.shape]);
  const sep = getLanguage() === 'en' ? ', ' : '，';
  return [where, what, ['atk', 'def', 'spd', 'heal', 'rage'].includes(tc.kind) ? `${tc.power}%` : t('powerOf', { n: (tc.power / 10).toFixed(1) })].join(sep);
}

export const ageOf = (state, id) => dateOf(state.day).year - GENERALS[id].born;

/** The date words of a game day. */
export function dayWords(day) {
  const { year, month } = dateOf(day);
  return dateWords(year, month);
}

export function treatyAt(state, faction, nodeId) {
  const treaty = activeTreaty(state, faction, state.nodes[nodeId]?.owner);
  if (!treaty) return null;
  return t('treaty_' + treaty.kind, { date: dayWords(treaty.until) });
}

const FACTION_KEYS = new Set(['faction', 'enemy', 'winner', 'loser', 'to', 'from']);
/** A line of the log in words. */
export function logLine(state, entry) {
  const values = {};
  for (const [k, v] of Object.entries(entry.values ?? {})) {
    if (v === null || v === undefined) values[k] = '';
    else if (k === 'place') values[k] = NODES[v] ? placeName(v) : v;
    else if (k === 'general') values[k] = GENERALS[v] ? generalName(v) : v;
    else if (FACTION_KEYS.has(k)) values[k] = factionName(state, v);
    else if (k === 'tech') values[k] = nm(TECHS[v]);
    else if (k === 'kind') values[k] = t(v);
    else if (k === 'event') values[k] = pair(EVENTS.find((e) => e.id === v)?.title);
    else if (k === 'unit') values[k] = nm(UNITS[v]);
    else values[k] = v;
  }
  return t(entry.key, values);
}

export const eventOf = (id) => EVENTS.find((e) => e.id === id);
