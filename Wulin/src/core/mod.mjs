// Data packs. A pack is a JSON file that changes the game's numbers and adds
// events, without touching the program:
//   {
//     "name": "my pack",
//     "economy":   { "startSilver": 5000 },
//     "buildings": { "dorm": { "cost": 200 } },
//     "sects":     { "huashan": { "color": "#446688", "role": "..." } },
//     "arts":      { "sword1": { "name": "...", "power": 1.1 } },
//     "events":    [ { "id": "x", "title": "...", "text": "...", "choices": [ { "label": "...", "hint": "...", "gives": { "silver": 50 }, "text": "..." } ] } ]
//   }
// Only the keys that already exist are changed, and numbers stay numbers, so a
// bad pack cannot break the rules. `power` under an art scales all its moves.
import { ART_BY_ID } from '../data/arts.mjs';
import { BUILDINGS, ECONOMY } from '../data/goods.mjs';
import { EVENT_BY_ID, EVENTS } from '../data/jianghu.mjs';
import { SECT_BY_ID } from '../data/sects.mjs';

/** Copies the values of `patch` onto `target` where the key exists and the kind of value matches. */
function patchInto(target, patch) {
  let changed = 0;
  for (const [key, value] of Object.entries(patch ?? {})) if (key in target && typeof target[key] === typeof value && typeof value !== 'object') (target[key] = value), changed++;
  return changed;
}

const GIVES = ['silver', 'grain', 'renown', 'virtue', 'court', 'loyalty', 'relations'];
/** Keeps of an event only what the rules understand. */
function cleanEvent(event) {
  if (typeof event?.id !== 'string' || typeof event.title !== 'string' || !Array.isArray(event.choices) || event.choices.length < 2) return null;
  const choices = event.choices.slice(0, 4).map((choice) => ({
    label: String(choice.label ?? '').slice(0, 20),
    hint: String(choice.hint ?? '').slice(0, 60),
    cost: Number.isFinite(choice.cost) ? Math.max(0, choice.cost) : undefined,
    gives: Object.fromEntries(GIVES.filter((key) => Number.isFinite(choice.gives?.[key])).map((key) => [key, choice.gives[key]])),
    text: String(choice.text ?? '').slice(0, 120),
  }));
  return { id: 'mod-' + event.id.slice(0, 24), title: event.title.slice(0, 16), text: String(event.text ?? '').slice(0, 200), choices };
}

/**
 * Applies a pack to the game's data. Call before a world is made or loaded.
 * @returns how many values were changed and how many events added
 */
export function applyMod(pack) {
  if (!pack || typeof pack !== 'object') return { ok: false, why: '不是有效的数据包' };
  let changed = patchInto(ECONOMY, pack.economy);
  for (const [kind, patch] of Object.entries(pack.buildings ?? {})) if (BUILDINGS[kind]) changed += patchInto(BUILDINGS[kind], patch);
  for (const [id, patch] of Object.entries(pack.sects ?? {})) if (SECT_BY_ID[id]) changed += patchInto(SECT_BY_ID[id], { color: patch.color, role: patch.role });
  for (const [id, patch] of Object.entries(pack.arts ?? {})) {
    const art = ART_BY_ID[id];
    if (!art) continue;
    if (typeof patch.name === 'string') (art.name = patch.name.slice(0, 8)), changed++;
    if (Number.isFinite(patch.power) && patch.power > 0.2 && patch.power < 5) art.moves.forEach((move) => (move.power *= patch.power)), changed++;
  }
  let added = 0;
  for (const raw of pack.events ?? []) {
    const event = cleanEvent(raw);
    if (!event || EVENT_BY_ID[event.id]) continue;
    EVENTS.push(event);
    EVENT_BY_ID[event.id] = event;
    added++;
  }
  return { ok: true, changed, added, name: String(pack.name ?? '未命名').slice(0, 20) };
}
