import { NODES } from '../data/map.mjs';

/** A remembered city may have changed hands since the last time it was selected. */
export function homeCity(state, remembered) {
  if (!state?.player) return null;
  const owns = id => Boolean(NODES[id] && state.nodes[id]?.owner === state.player);
  const isCity = id => NODES[id]?.kind === 'city' && owns(id);
  if (isCity(remembered)) return remembered;
  const capital = state.factions[state.player]?.capital;
  if (isCity(capital)) return capital;
  const places = Object.keys(state.nodes);
  return places.find(isCity) ?? (owns(capital) ? capital : places.find(owns) ?? null);
}
