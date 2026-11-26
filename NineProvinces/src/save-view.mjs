// Campaign presentation is optional save metadata. It never changes simulation
// entities or the rules/version of a campaign, so legacy files remain playable.
import { MAP, NODES } from './data/map.mjs';

function ownCity(game, id) {
  return NODES[id]?.kind === 'city' && game.nodes[id]?.owner === game.player;
}

/** Validate imported view data before using it for selection or camera state. */
export function restoreCampaignView(game, input = null) {
  const raw = input && typeof input === 'object' ? input : {};
  const capital = game.factions[game.player]?.capital;
  const lastOwnedCity = ownCity(game, raw.lastOwnedCity) ? raw.lastOwnedCity
    : ownCity(game, capital) ? capital : Object.keys(game.nodes).find(id => ownCity(game, id)) ?? null;
  let selection = null;
  if (NODES[raw.selection?.node] && game.nodes[raw.selection.node]) selection = { node: raw.selection.node };
  else if (game.armies?.[raw.selection?.army]) selection = { army: raw.selection.army };
  else if (raw.selection !== null && lastOwnedCity) selection = { node: lastOwnedCity };
  const c = raw.camera;
  const camera = c && [c.x, c.z, c.d].every(Number.isFinite) && c.x >= 0 && c.x <= MAP.width
    && c.z >= 0 && c.z <= MAP.height && c.d >= 20 && c.d <= 300 ? { x: c.x, z: c.z, d: c.d } : null;
  const guide = raw.firstMonth;
  const firstMonth = guide && Number.isInteger(guide.day) && guide.day >= 0 && guide.day <= game.day
    ? { day: guide.day, dismissed: Boolean(guide.dismissed) } : null;
  return {
    paused: typeof raw.paused === 'boolean' ? raw.paused : true,
    speed: Number.isInteger(raw.speed) && raw.speed >= 0 && raw.speed <= 4 ? raw.speed : null,
    selection, lastOwnedCity, camera, firstMonth
  };
}

/** Capture the point currently on screen, rather than an unfinished camera glide. */
export function captureCampaignView(app) {
  const view = app.map?.rig?.view;
  return restoreCampaignView(app.state, {
    paused: app.paused, speed: app.speed, selection: app.sel, lastOwnedCity: app.lastOwnedCity,
    camera: view ? { x: view.x, z: view.z, d: view.d } : null,
    firstMonth: app.firstMonth
  });
}

/** Only game progress counts as unsaved: panning, selection and settings do not. */
export function createProgressCheckpoint() {
  let snapshot = null;
  return {
    saved(game) { snapshot = JSON.stringify(game); },
    changed(game) { return Boolean(game && snapshot !== null && JSON.stringify(game) !== snapshot); },
    clear() { snapshot = null; }
  };
}
