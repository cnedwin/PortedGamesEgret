// The built-in editor: change a sect's books, a person's numbers or the
// stores of the game in progress. The page opens it when F8 is pressed twice
// quickly (see doublePress below) and pauses the game while it is open.
//
// Opening it keeps a copy of the world, so one press puts everything back.
// A world that has been edited carries a mark in `flags.editorUsed`; the mark
// only helps when looking into a problem and switches nothing off.
import { ART_BY_ID, MAX_LEVEL, POINTS_PER_LEVEL } from '../data/arts.mjs';
import { GRADES, PILLS, WEAPONS } from '../data/goods.mjs';
import { PLACE_BY_ID, RESOURCES } from '../data/places.mjs';
import { RANKS, SECT_BY_ID } from '../data/sects.mjs';
import { LEVEL_CAP, STAT_CAP, STAT_KEYS, autoWheel } from './persons.mjs';

/** The usual range of each field; a value outside it is flagged, not refused. */
export const RANGES = {
  silver: [0, 9_999_999],
  grain: [0, 99_999],
  resource: [0, 99_999],
  virtue: [-1000, 1000],
  renown: [0, 1000],
  court: [-100, 100],
  relation: [-100, 100],
  level: [1, LEVEL_CAP],
  loyalty: [0, 100],
  aptitude: [20, 100],
  age: [10, 120],
  mastery: [0, MAX_LEVEL],
  grade: [0, 7],
};

const outside = (kind, value) => value < RANGES[kind][0] || value > RANGES[kind][1];

/**
 * @param getState returns the world in play
 * @param setState replaces it (used when putting the copy back)
 */
export function createEditor(getState, setState) {
  let backup = null;
  const mark = () => (getState().flags.editorUsed = true);
  const sect = (id) => getState().sects[id];
  const person = (id) => getState().persons[id];
  /** Every change answers with whether the value was unusual, so the panel can tint it. */
  const result = (kind, value) => (mark(), { ok: true, unusual: outside(kind, value) });
  const missing = { ok: false, why: '找不到要修改的对象' };

  return {
    /** Call when the panel opens. */
    open() {
      backup = structuredClone(getState());
    },
    /** Puts the world back as it was when the panel opened. */
    revert() {
      if (!backup) return false;
      setState(structuredClone(backup));
      return true;
    },
    close() {
      backup = null;
    },

    // ---- sect ----
    setSilver: (id, value) => (sect(id) ? ((sect(id).silver = value), result('silver', value)) : missing),
    setGrain: (id, value) => (sect(id) ? ((sect(id).grain = value), result('grain', value)) : missing),
    setResource: (id, key, value) => (sect(id) && RESOURCES.includes(key) ? ((sect(id).res[key] = value), result('resource', value)) : missing),
    setVirtue: (id, value) => (sect(id) ? ((sect(id).virtue = value), result('virtue', value)) : missing),
    setRenown: (id, value) => (sect(id) ? ((sect(id).renown = value), result('renown', value)) : missing),
    setCourt: (id, value) => (sect(id) ? ((sect(id).court = value), result('court', value)) : missing),
    setRelation(a, b, value) {
      if (!sect(a) || !sect(b) || a === b) return missing;
      sect(a).relations[b] = value;
      sect(b).relations[a] = value;
      return result('relation', value);
    },
    setOwner(placeId, sectId) {
      const place = getState().places[placeId];
      if (!place || (sectId && !SECT_BY_ID[sectId])) return missing;
      place.owner = sectId || null;
      mark();
      return { ok: true, unusual: false };
    },
    setBuildingLevel(placeId, index, level) {
      const building = getState().places[placeId]?.buildings[index];
      if (!building) return missing;
      building.level = level;
      mark();
      return { ok: true, unusual: level < 1 || level > 7 };
    },

    // ---- person ----
    setName: (id, name) => (person(id) ? ((person(id).name = String(name).slice(0, 12)), mark(), { ok: true, unusual: false }) : missing),
    setAge: (id, value) => (person(id) ? ((person(id).age = value), result('age', value)) : missing),
    setRank: (id, rank) => (person(id) && RANKS[rank] ? ((person(id).rank = rank), mark(), { ok: true, unusual: false }) : missing),
    setLevel: (id, value) => (person(id) ? ((person(id).level = value), (person(id).xp = 0), result('level', value)) : missing),
    setLoyalty: (id, value) => (person(id) ? ((person(id).loyalty = value), result('loyalty', value)) : missing),
    setStat(id, key, value) {
      if (!person(id) || !STAT_KEYS.includes(key)) return missing;
      person(id).stats[key] = value;
      mark();
      return { ok: true, unusual: value < 1 || value > STAT_CAP[key] };
    },
    setAptitude(id, key, value) {
      if (!person(id) || !(key in person(id).apt)) return missing;
      person(id).apt[key] = value;
      return result('aptitude', value);
    },
    /** Sets an art's mastery level; 0 takes the art away. Also grants a tier-five art's insight. */
    setArt(id, artId, level) {
      const who = person(id),
        art = ART_BY_ID[artId];
      if (!who || !art) return missing;
      if (level <= 0) delete who.arts[artId];
      else {
        who.arts[artId] = level * POINTS_PER_LEVEL;
        if (art.tier === 5 && !who.insights.includes(artId)) who.insights.push(artId);
      }
      who.wheel = autoWheel(who);
      return result('mastery', level);
    },
    setPlace(id, placeId) {
      if (!person(id) || !PLACE_BY_ID[placeId]) return missing;
      person(id).place = placeId;
      mark();
      return { ok: true, unusual: false };
    },
    healWounds: (id) => (person(id) ? ((person(id).wounds = 0), mark(), { ok: true, unusual: false }) : missing),
    setWeapon(id, slot, grade) {
      if (!person(id) || (slot && !WEAPONS[slot])) return missing;
      person(id).gear.weapon = slot && grade > 0 ? { slot, grade } : null;
      return result('grade', grade);
    },
    setArmor: (id, grade) => (person(id) ? ((person(id).gear.armor = grade), result('grade', grade)) : missing),

    // ---- goods ----
    /** Sets how many of an item a sect holds; items are `pill:<id>`, `weapon:<slot>:<grade>` or `armor:<grade>`. */
    setStock(sectId, itemId, count) {
      if (!sect(sectId) || !describeItem(itemId)) return missing;
      if (count <= 0) delete sect(sectId).stock[itemId];
      else sect(sectId).stock[itemId] = count;
      mark();
      return { ok: true, unusual: count > 9999 };
    },
  };
}

/** What an item id stands for, or null if there is no such item. */
export function describeItem(itemId) {
  const [kind, a, b] = itemId.split(':');
  if (kind === 'pill' && PILLS[a]) return { kind, name: PILLS[a].name };
  if (kind === 'weapon' && WEAPONS[a] && GRADES[Number(b)]) return { kind, name: GRADES[Number(b)].name + WEAPONS[a] };
  if (kind === 'armor' && GRADES[Number(a)]) return { kind, name: GRADES[Number(a)].name + '衣' };
  return null;
}

/**
 * Watches for a key pressed twice within a short time.
 * @param key     KeyboardEvent.key to watch, 'F8' for the editor
 * @param onTwice called on the second press
 * @param within  the longest gap between the two presses, in milliseconds
 * @returns a handler for `keydown` events
 */
export function doublePress(key, onTwice, within = 400) {
  let last = -Infinity;
  return (event) => {
    if (event.key !== key || event.repeat) return;
    const now = event.timeStamp;
    if (now - last <= within) {
      last = -Infinity;
      event.preventDefault?.();
      onTwice();
    } else last = now;
  };
}
