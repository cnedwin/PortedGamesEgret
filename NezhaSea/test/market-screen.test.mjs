import test from 'node:test';
import assert from 'node:assert/strict';
import '../vendor/node-register.mjs';
const { planMarketLayout } = await import('../src/ui-market.mjs');

const screens = [
  ['phone-small', 375, 667, 'portrait'],
  ['phone-notch', 393, 759, 'portrait'],
  ['phone-tall', 360, 776, 'portrait'],
  ['phone-wide', 734, 372, 'landscape'],
  ['tablet upright', 768, 1024, 'tabletPortrait'],
  ['tablet wide', 1024, 768, 'tablet'],
  ['unfolded', 884, 1104, 'tabletPortrait'],
  ['desktop', 1669, 939, 'tablet']
];

test('market layouts retain a fixed bottom action bar and accessible two-page or dual-pane controls', () => {
  for (const [name, w, h, variant] of screens) {
    for (const slots of [6, 8]) {
      const l = planMarketLayout(w, h, variant, slots);
      assert.equal(l.compact, variant === 'portrait' || variant === 'landscape', name);
      assert.ok(l.width <= w && l.height <= h, name);
      assert.equal(l.barY + l.footerHeight, l.height - 2, name);
      assert.ok(l.nextWidth >= 44 && l.actionWidth >= 44 && l.detailsWidth >= 44, name);
      assert.ok(l.offerWidth / l.columns - 8 >= 100, name);
      assert.ok((l.offerWidth - (l.columns - 1) * 8) / l.columns / 2 - 8 >= 44, name);
      assert.ok((l.gearWidth - (l.slotColumns - 1) * 6) / l.slotColumns >= 44, name);
      assert.ok(l.slotHeight >= 44, name);
      assert.ok(l.offerY + l.offerViewportHeight < l.barY, name);
      assert.ok(l.gearY + l.gearViewportHeight < l.actionsY, name);
      assert.ok(l.actionsY + 44 < l.barY, name);
      if (!l.compact) assert.ok(l.offerX + l.offerWidth < l.gearX, name);
      else assert.equal(l.offerX, l.gearX, name);
      assert.ok(l.offerX + l.offerWidth <= l.width - l.pad, name);
      assert.ok(l.gearX + l.gearWidth <= l.width - l.pad, name);
    }
  }
});

const { createMarketUi } = await import('../src/ui-market.mjs');
const { checkView, planView } = await import('../vendor/engine/dist/web/view.js');
const rules = await import('../src/sim/world.mjs');
const { setLanguage } = await import('../src/i18n.mjs');

test('actual vendor view planner accepts all market variants and keeps the named bottom button between the pages', () => {
  const oldDocument = globalThis.document;
  // Only the SKU label wrap needs a canvas; this verifies layout and bindings, not font rendering.
  globalThis.document = { createElement: () => ({ getContext: () => ({
    font: '', measureText(words) { return { width: String(words).length * 7 }; }
  }) }) };
  try {
    for (const lang of ['zh', 'en']) {
      setLanguage(lang);
      for (const [name, w, h, variant] of screens) {
        const box = { x: 0, y: 0, width: w, height: h }, orientation = variant.endsWith('Portrait') || variant === 'portrait' ? 'portrait' : 'landscape';
        const form = variant.startsWith('tablet') ? 'tablet' : 'phone';
        let last;
        const game = {
          uiScale: 1, browser: { screen: { width: w, height: h, scale: 1 } },
          screen: box, safe: box, orientation,
          show(description, options) {
            checkView(description);
            const plan = planView(description, { screen: box, safe: box, orientation, form });
            last = { plan, options };
            const view = { variant: plan.variant, visible: true, get: () => ({}), refresh() {}, close() { this.visible = false; } };
            options.built?.(view);
            return view;
          },
          dragAndDrop: () => ({ source: () => () => {}, target: () => () => {} })
        };
        const run = rules.createRun({ hero: 'sixArms', seed: 12 });
        run.phase = 'shop';
        run.pearls = 1;
        run.shop.offers = [
          { type: 'weapon', kind: 'ring', tier: 0, price: 20, locked: false },
          { type: 'weapon', kind: 'spear', tier: 2, price: 30, locked: true },
          { type: 'item', kind: 'elixir', price: 10, locked: false },
          { type: 'weapon', kind: 'brick', tier: 1, price: 40, locked: false }
        ];
        const app = { screen: 'shop', run, picked: null };
        const ui = createMarketUi({ game, app, rules, sound() {}, say() {}, present() {}, chooseLevel() {}, nextWave() {} });
        ui.showShop({ fresh: true });
        const where = id => last.plan.parts.find(item => item.part.name === id);
        const showing = item => {
          if (!item) return false;
          const visible = last.options.bind[item.part.name]?.visible;
          return (!visible || visible(last.options.state())) &&
            (item.parent == null || item.parent < 0 || showing(last.plan.parts[item.parent]));
        };
        const partVisible = id => showing(where(id));
        assert.equal(last.plan.variant, variant, name + ' ' + lang);
        const compact = variant === 'portrait' || variant === 'landscape';
        assert.equal(partVisible('offersTab'), compact, name);
        assert.equal(partVisible('gearTab'), compact, name);
        assert.equal(partVisible('offerBuy0'), true, name);
        assert.equal(partVisible('relic0'), !compact, name);
        assert.equal(last.options.bind.offerBuy0.disabled(last.options.state()), true, name);
        const next = { ...where('next').rect };
        assert.ok(next.width >= 44 && next.height >= 44, name);
        if (compact) {
          last.options.bind.gearTab.tap();
          assert.equal(partVisible('offerBuy0'), false, name);
          assert.equal(partVisible('relic0'), true, name);
          assert.deepEqual(where('next').rect, next, name);
          last.options.bind.offersTab.tap();
          assert.equal(partVisible('offerBuy0'), true, name);
        }
      }
    }
  } finally {
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});
