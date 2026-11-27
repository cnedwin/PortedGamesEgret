// Trusted local scene preparation for Egret's official --screens verifier.
// The game is opened at its ordinary index.html. This module selects the
// requested language through the shipped settings UI. The accelerated first
// wave and two-treasure fixture are the same bounded setup as test/accept.mjs;
// this is not a natural playthrough or a physical-device test.
const state = process.env.NEZHA_VERIFY_SCREEN_STATE ?? 'title';
const language = process.env.NEZHA_VERIFY_SCREEN_LANG ?? 'zh';
const scenes = ['title', 'battle', 'shop', 'confirm', 'pause'];
if (!scenes.includes(state) || !['zh', 'en'].includes(language)) throw Error('Unknown Nezha screen fixture or language');

export default async function prepare(player, screen) {
  const page = player.page;
  const until = (predicate, arg) => page.waitForFunction(predicate, arg, { timeout: 8000, polling: 50 });
  const waitScreen = wanted => until(wanted => window.nezhaSea?.screen === wanted, wanted);
  const byPart = part => player.read(part => window.nezhaSea.ui.tree.publish().nodes
    .find(node => !node.inert && !node.hidden && node.id.endsWith(':' + part)), part);
  const waitPart = part => until(part => window.nezhaSea?.ui.tree.publish().nodes
    .some(node => !node.inert && !node.hidden && node.id.endsWith(':' + part)), part);
  async function press(part) {
    await waitPart(part);
    const node = await byPart(part);
    player.expect(!!node && !node.disabled, screen.name + ': enabled ' + part);
    await player.read(({ role, name }) => window.nezhaSea.tester.press(role + ':' + name), node);
  }
  // Cold startup may consume most of the official preparation deadline.
  await page.waitForFunction(() => window.nezhaSea?.ready && window.nezhaSea.screen === 'title',
    undefined, { timeout: 15000, polling: 50 });

  const htmlLang = language === 'zh' ? 'zh-CN' : 'en';
  if (await player.read(() => document.documentElement.lang) !== htmlLang) {
    await press('options');
    await waitScreen('options');
    await press('language');
    await until(wanted => document.documentElement.lang === wanted, htmlLang);
    await press('close');
    await waitScreen('title');
  }
  player.expect(await player.read(lang => window.nezhaSea.app.save.data.settings.language === lang, language),
    screen.name + ': requested language is stored by the actual settings UI');
  const start = await byPart('start');
  player.expect(language === 'zh' ? /出海/.test(start?.name ?? '') : /Set out/.test(start?.name ?? ''),
    screen.name + ': localized title action');
  const label = async () => {
    const actual = await player.read(() => window.nezhaSea.screen);
    const actualLang = await player.read(() => document.documentElement.lang);
    player.expect(actualLang === htmlLang, screen.name + ': requested language remains active');
    return actual + (state === 'confirm' ? '/confirm' : '') + ':' + language;
  };
  if (state === 'title') return label();

  // Deterministic seed reproduces the existing seed=11 browser fixture.
  await player.read(() => { window.nezhaSea.app.seed = 11; });
  await press('start');
  await waitScreen('play');
  await waitPart('pause');
  if (state === 'battle') return label();
  if (state === 'pause') {
    await press('pause');
    await until(() => window.nezhaSea.screen === 'menu' && window.nezhaSea.game.paused);
    await waitPart('resume');
    return label();
  }

  // Accelerate the first wave, never skip the real upgrade/market commands.
  await player.read(() => {
    const run = window.nezhaSea.app.run;
    run.waveLeft = Math.min(run.waveLeft, 2);
    run.pending = Math.max(run.pending, 1);
  });
  await until(() => ['levelUp', 'shop'].includes(window.nezhaSea.screen));
  for (let i = 0; i < 8 && await player.read(() => window.nezhaSea.screen === 'levelUp'); i++) {
    await press('upgrade0');
    await page.waitForTimeout(100);
  }
  await waitScreen('shop');
  await waitPart('offerBuy0');

  // All four phone sizes use pages; the four larger displays use both panes.
  const phone = Math.min(screen.width, screen.height) < 600;
  async function assertTabs(selected) {
    await until(({ selected }) => {
      const nodes = window.nezhaSea.ui.tree.publish().nodes.filter(n => !n.hidden && !n.inert && n.role === 'tab');
      return nodes.length === 2 && ['offersTab', 'gearTab'].every(part =>
        nodes.some(n => n.id.endsWith(':' + part) && n.selected === (part === selected))) &&
        nodes.every(node => [...document.querySelectorAll('[role="tab"]')].some(el =>
          el.getAttribute('aria-label') === node.name && el.getAttribute('aria-selected') === String(node.selected)));
    }, { selected });
    const tabs = await player.read(() => {
      const nodes = window.nezhaSea.ui.tree.publish().nodes.filter(n => !n.hidden && !n.inert && n.role === 'tab');
      return nodes.map(node => ({
        name: node.name, selected: node.selected,
        projected: [...document.querySelectorAll('[role="tab"]')].some(el =>
          el.getAttribute('aria-label') === node.name && el.getAttribute('aria-selected') === String(node.selected))
      }));
    });
    player.expect(tabs.length === 2 && tabs.every(tab => tab.projected),
      screen.name + ': actual browser aria-selected matches both native tabs');
  }
  if (phone) await assertTabs('offersTab');
  else {
    const tabs = await player.read(() => window.nezhaSea.ui.tree.publish().nodes
      .filter(n => !n.hidden && !n.inert && n.role === 'tab'));
    player.expect(tabs.length === 0, screen.name + ': dual pane has no phone tabs');
    await waitPart('relic0');
  }
  if (state === 'shop') return label();

  // Ensure a sale is reachable without grinding, but never accept or save it.
  await player.read(() => {
    const { app, refresh } = window.nezhaSea;
    app.picked = null;
    app.run.weapons = [['ring', 0], ['ribbon', 0]].map(([kind, tier]) =>
      ({ kind, tier, divine: false, cooldown: 0, angle: 0, also: 0 }));
    refresh();
  });
  if (phone) {
    await press('gearTab');
    await assertTabs('gearTab');
  }
  await press('relic0');
  await until(() => window.nezhaSea.app.picked === 0);
  await waitPart('sell');
  // Supplemental picture of the selected treasure/gear page, not an official
  // red-band screenshot. The official capture below verifies the actual modal.
  await until(() => {
    const controls = globalThis.__egretScreens?.controls ?? [];
    return controls.some(c => c.name === 'sell') && controls.some(c => c.name === 'relic0');
  });
  // Semantic state may arrive before the new GPU frame. Use the same visual
  // settling period as the official screen capture, without an HTML/CSS gate.
  await page.waitForTimeout(1500);
  await player.picture('gear-selected');

  await press('sell');
  await until(() => window.nezhaSea.game.asking === true);
  await waitPart('yes');
  await waitPart('no');
  const confirmation = await player.read(() => {
    const { app, rules, game, ui } = window.nezhaSea;
    const nodes = ui.tree.publish().nodes.filter(n => !n.hidden && !n.inert);
    const part = name => nodes.find(n => n.id.endsWith(':' + name));
    return {
      asking: game.asking, focus: ui.part, question: part('question')?.name,
      yes: part('yes')?.name, no: part('no')?.name,
      fallback: !!part('sellConfirm'), price: rules.sellPrice(app.run, 0)
    };
  });
  const expected = language === 'zh' ? '卖掉乾坤圈，得 ' + confirmation.price + ' 珍珠'
    : 'Sell Universe Ring for ' + confirmation.price + ' pearls';
  player.expect(confirmation.asking && !confirmation.fallback && confirmation.focus === 'no' &&
    confirmation.question === expected && confirmation.yes && confirmation.no,
    screen.name + ': actual native long sale confirmation and cancel focus: ' + JSON.stringify(confirmation));
  return label();
}
