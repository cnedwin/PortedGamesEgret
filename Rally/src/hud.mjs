// Native racing interface: one responsive overlay and independent menu/race services.
import { createRallyUiHost } from './ui/host.mjs';
import { createRallyMenus } from './ui/menus.mjs';
import { createRaceHud } from './ui/race-hud.mjs';

/** Format a race time without rounding whole minutes into the wrong minute. */
export function clock(seconds) {
  const hundredths = Math.max(0, Math.round(seconds * 100));
  return String(Math.floor(hundredths / 6000)) + ':' + String(Math.floor(hundredths / 100) % 60).padStart(2, '0') + '.' + String(hundredths % 100).padStart(2, '0');
}

export async function createHud(canvas, track, options = {}) {
  const host = await createRallyUiHost(canvas, { lang: options.lang, onError: options.onError });
  const menus = createRallyMenus(host, {
    lang: options.lang,
    onPreviewRect: rect => options.onPreviewRect?.(rect, host.game.screen),
  });
  const race = await createRaceHud(host, track, {
    language: options.lang,
    onTouch: options.onTouch,
    onPause: options.onPause,
  });
  const hud = {
    host, menus, race,
    get lang() { return menus.lang; },
    set lang(lang) {
      if (lang !== 'zh' && lang !== 'en') return;
      menus.lang = lang;
      race.setLanguage(lang);
    },
    showTitle: (settings, handlers) => menus.showTitle(settings, handlers),
    showSelect: (settings, handlers) => menus.showSelect(settings, handlers),
    showPause: (on, settings, handlers) => menus.showPause(on, settings, handlers),
    showResults: (game, handlers) => menus.showResults(game, handlers),
    showFailure: details => menus.showFailure(details),
    startRace() {
      menus.hide();
      race.startRace();
      host.blurToScene();
    },
    endRace() { race.endRace(); },
    setTouchAvailable: available => race.setTouchAvailable(available),
    setRacePauseAvailable: available => race.setRacePauseAvailable(available),
    setSuspended: suspended => race.setSuspended(suspended),
    releaseTouch: () => race.releaseTouch(),
    consume: (events, game) => race.consume(events, game),
    update: (game, view, dt, audio) => race.update(game, view, dt, audio),
    menuActive: () => menus.active,
    command: (name, detail) => menus.command(name, detail),
    refresh: () => menus.refresh(),
    ready: () => host.ready(),
  };
  return hud;
}
