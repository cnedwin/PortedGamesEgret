// The presentation boundary keeps rules, saves, chapter sequencing and audio
// independent of the native 2D overlay.
import { createCombatHud } from './ui/combat-hud.mjs';
import { createSnowMenus } from './ui/menus.mjs';

export async function createHud(host, input, settings, options) {
  const combat = await createCombatHud(host, input, options);
  const menus = createSnowMenus(host, input, settings, {
    ...options,
    onKeysChanged: () => combat.labelKeys(),
  });
  let mode = 'title', interactive = false, waiting = false;
  combat.setVisible(false);
  input.on('bag', () => { if (interactive) combat.toggleBag(); });
  input.on('reset', () => combat.releaseTouch());
  function setInteractive(value) {
    const next = !!value && mode === 'play';
    if (interactive !== next) {
      interactive = next;
      combat.setInteractive(next);
    }
  }
  return {
    ...menus,
    get staged() { return menus.staged; },
    get combat() { return combat; },
    async ready() { menus.ready(); await host.ready(); },
    setMode(value) {
      mode = value;
      combat.setVisible(value === 'play');
      if (mode !== 'play') setInteractive(false);
    },
    setInteractive,
    stage(on) { menus.stage(on); combat.setStaged(on); if (on) setInteractive(false); },
    choose(options) { setInteractive(false); menus.choose(options); },
    waitForCharacters(on) {
      if (on !== waiting) { waiting = on; menus.waitForCharacters(on); if (on) setInteractive(false); }
    },
    setLanguage() { combat.setLanguage(); },
    update(game, view, dt) { combat.update(game, view, dt); },
    labelKeys: () => combat.labelKeys(),
    note: (...args) => combat.note(...args),
    hint: (...args) => combat.hint(...args),
    clearHint: () => combat.clearHint(),
    hinting: () => combat.hinting(),
    clearPickups: () => combat.clearPickups(),
    flyPickup: (...args) => combat.flyPickup(...args),
    bump: () => combat.bump(),
    hurt: () => combat.hurt(),
    debug: value => combat.debug(value),
    snapshot: () => combat.snapshot(),
    dispose() { combat.dispose?.(); menus.dispose?.(); }
  };
}