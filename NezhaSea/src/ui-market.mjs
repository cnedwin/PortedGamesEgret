import { DIVINE, HEROES, ITEMS, SHOP } from './sim/data.mjs';
import { getLanguage, t } from './i18n.mjs';
import { viewSpace, showView, textWidth, wrap as wrapText } from './ui-layout.mjs';

const GOLD = 0xffdfa0;
const INK = 0x102a28;
const QUIET = 0xbfdbc8;
const CTA = 0x9e4432;
const CTA_TEXT = 0xffefd2;
const DISABLED = 0x283c39;
const SKIN = { panel: INK, panelAlpha: 0.96, button: 0x275548, buttonText: 0xf6ede0, disabled: DISABLED, text: QUIET, dim: 0.42, radius: 6 };
const RELIC_MARKS = {
  ring: '◉', ribbon: '≋', spear: '↑', brick: '▰', wheels: '✺', dome: '♨',
  bindDragon: '◎', fireSpear: '✵', dragonBrick: '✦',
  lotusRoot: '❋', peach: '●', dragonScale: '◆', elixir: '✧', windCharm: '≈',
  conch: '◈', coral: '✿', shell: '▱', primordialPearl: '◐', seaPearl: '◉', goldLotus: '❀',
  demonMirror: '◇', drumOfWar: '▣', dragonPearl: '✶', heavenlyArmor: '⬒', skyRing: '◎'
};
const WARM_RELICS = new Set(['ribbon', 'spear', 'dome', 'dragonBrick']);
const SLOT_COUNT = Math.max(...Object.values(HEROES).map((hero) => hero.slots));
const markOf = (kind) => RELIC_MARKS[kind] ?? '✧';
const tierOf = (weapon) => weapon.divine ? t('divineTier') : t('tier', { n: weapon.tier + 1 });
const weaponLabel = (weapon) => `${t(weapon.kind)} · ${tierOf(weapon)}`;
const signed = (value) => `${value > 0 ? '+' : ''}${Math.round(value * 10) / 10}`;
const statistics = (stats) => Object.entries(stats).map(([key, value]) => t('statLine', { name: t(key), value: signed(value) }));

// Place measured lines in separate Egret text parts so cells can lay them out.
const wrap = (value, width, size, bold) => wrapText(value, width, size, bold).split('\n');

function metrics(game) {
  const { factor, width: w, height: h } = viewSpace(game);
  const orientation = game.orientation;
  return { factor, w, h, orientation, key: `${Math.round(w)}:${Math.round(h)}:${factor.toFixed(4)}:${orientation}:${getLanguage()}` };
}

function partsFor() {
  const bind = {};
  const box = (x, y, width, height) => ({ x, y, width, height });
  function panel(name, x, y, w, h, children, options = {}, binding) {
    if (binding) bind[name] = binding;
    return { type: 'panel', name, layout: 'free', ...box(x, y, w, h), ...options, children };
  }
  function text(name, value, x, y, w, h, size, options = {}) {
    const { paintColor, visible, ...display } = options;
    const dynamic = typeof value === 'function';
    if (dynamic || visible) bind[name] = {
      ...(dynamic ? { text: value } : {}), ...(paintColor ? { color: paintColor } : {}),
      ...(visible ? { visible } : dynamic ? { visible: (state) => Boolean(value(state).trim()) } : {})
    };
    return { type: 'text', name, text: dynamic ? '' : value, ...box(x, y, w, h), size, ...display };
  }
  function button(name, value, x, y, w, h, size, tap, options = {}) {
    const { disabled, visible, color, textColor, label } = options;
    bind[name] = { tap, ...(disabled ? { disabled } : {}), ...(visible ? { visible } : {}), ...(typeof color === 'function' ? { color } : {}),
      ...(label ? { label } : {}), ...(typeof value === 'function' ? { text: value } : {}) };
    return { type: 'button', name, text: typeof value === 'function' ? '' : value, ...box(x, y, w, h), size, ...(typeof color === 'number' ? { color } : {}), ...(textColor ? { textColor } : {}) };
  }
  // A single accessible card with native, separately positioned labels.
  function cardButton(name, x, y, w, h, children, tap, { disabled, visible, color, label } = {}) {
    return panel(name, x, y, w, h, children, { role: 'button', card: true, color: typeof color === 'number' ? color : SKIN.button }, {
      tap, ...(disabled ? { disabled } : {}), ...(visible ? { visible } : {}),
      ...(typeof color === 'function' ? { color } : {}), ...(label ? { label } : {})
    });
  }
  const caption = (name, value, x, y, w, size, options = {}) =>
    text(name, value, x, y - size, w, size * 2, size, { color: SKIN.buttonText, bold: true, align: 'center', ...options });
  return { panel, text, button, cardButton, caption, bind };
}

/** View-local units, never CSS units or a hand-transformed stage. Phone modes page; tablets get two panes. */
export function planMarketLayout(w, h, variant, slots) {
  const compact = (variant !== 'tablet' && variant !== 'tabletPortrait') || w < 600;
  const short = h < 445;
  const width = Math.max(1, Math.min(w - 16, compact ? 920 : 1040));
  const height = Math.max(1, Math.min(h - 16, compact ? 740 : 720));
  const pad = width < 420 ? 10 : 14;
  const content = width - pad * 2;
  const split = compact ? content : Math.floor((content - 16) / 2);
  const offerX = pad, offerWidth = split;
  const gearX = compact ? pad : pad + split + 16;
  const gearWidth = compact ? content : content - split - 16;
  const headH = short ? 42 : 54;
  const bodyY = compact ? headH + 55 : headH + 8;
  const footerHeight = 54, barY = height - footerHeight - 2;
  const offerY = compact ? bodyY : bodyY + 30;
  const columns = compact && offerWidth >= 600 ? 4 : 2;
  const offerHeight = short ? 110 : 126;
  const offersEnd = Math.ceil(SHOP.offers / columns) * (offerHeight + 8) - 8;
  const offerViewportHeight = Math.max(1, barY - offerY - 8);
  const gearY = bodyY, actionsY = barY - 49;
  const gearViewportHeight = Math.max(1, actionsY - gearY - 6);
  const slotColumns = gearWidth >= 385 ? 4 : gearWidth >= 255 ? 3 : 2;
  const slotHeight = short ? 52 : 76;
  const slotsY = short ? 26 : 38;
  const gearEnd = slotsY + Math.ceil(slots / slotColumns) * (slotHeight + 6) - 6;
  const detailsWidth = Math.min(150, Math.floor(gearWidth * 0.40));
  const actionWidth = (gearWidth - detailsWidth - 16) / 2;
  const nextWidth = Math.min(120, Math.floor(content * 0.33));
  const detailRows = Math.max(1, Math.floor((gearViewportHeight - 8) / 17));
  return { compact, short, width, height, pad, content, headH, bodyY, barY, footerHeight, nextWidth,
    offerX, offerY, offerWidth, offerHeight, offersEnd, offerViewportHeight, columns,
    gearX, gearY, gearWidth, gearViewportHeight, gearEnd, slotsY, slotColumns, slotHeight,
    actionsY, detailsWidth, actionWidth, detailRows };
}

function cardSlot(index, cols, width, gap, height) {
  const span = (width - gap * (cols - 1)) / cols;
  return { x: (index % cols) * (span + gap), y: Math.floor(index / cols) * (height + gap), w: span, h: height };
}

export function createMarketUi({ game, app, rules, sound, say, present, chooseLevel, nextWave, focusPart }) {
  let pane = 'offers';
  let note;
  let detailsOpen = false;
  let detailPage = 0;
  let shop;
  let upgrades;
  let sale;
  let drag;
  let ghost;
  let ghostMark;
  let dragOff = [];

  function report(key, values, warning = false) {
    note = { key, values, warning };
    say(t(key, values));
  }

  function buy(index) {
    const run = app.run;
    const offer = run.shop.offers[index];
    const result = rules.buy(run, index);
    if (!result.ok) report(result.why === 'pearls' ? 'notEnough' : result.why === 'full' ? 'full' : 'sold', undefined, true);
    else if (result.merged) {
      sound('merge');
      report('merged', { name: t(run.weapons[result.slot].kind) });
    } else {
      sound('acquire');
      report('boughtGood', { name: t(offer.kind) });
    }
    const nextBuy = run.shop.offers.findIndex((entry) => !entry.sold && entry.price <= run.pearls);
    showShop({ focus: !offer.sold ? `offerBuy${index}` : nextBuy < 0 ? 'reroll' : `offerBuy${nextBuy}` });
  }

  function lock(index) {
    const run = app.run;
    if (run.shop.offers[index]?.sold) return;
    rules.toggleLock(run, index);
    sound('select');
    report(run.shop.offers[index].locked ? 'preserveOffer' : 'releaseOffer');
    showShop({ focus: `offerLock${index}` });
  }

  function reroll() {
    if (rules.reroll(app.run).ok) {
      sound('select');
      report('restocked');
    } else report('notEnough', undefined, true);
    showShop({ focus: 'reroll', renew: true });
  }

  function merge(first, second) {
    const result = rules.merge(app.run, first, second);
    if (!result.ok) return false;
    app.picked = null;
    sound(result.divine ? 'divine' : 'merge');
    report(result.divine ? 'divineMade' : 'merged', { name: t(result.kind) });
    if (result.divine && !game.reducedMotion) game.flash(0xe8b84a, 0.25);
    showShop({ focus: `relic${Math.min(result.slot, app.run.weapons.length - 1)}` });
    return true;
  }

  function select(index) {
    const picked = app.picked;
    if (picked !== null && picked !== index && merge(picked, index)) return;
    app.picked = picked === index ? null : index;
    showShop({ focus: `relic${index}` });
  }

  async function sell() {
    const { run, picked } = app;
    const weapon = run.weapons[picked];
    if (sale || !weapon || run.weapons.length <= 1) return;
    const price = rules.sellPrice(run, picked);
    const question = t('sellName', { name: t(weapon.kind), price });
    const yes = t('sell', { price });
    const no = t('cancelPick');
    const accepted = await askSale(question, yes, no);
    if (app.screen !== 'shop' || app.run !== run) return;
    if (!accepted || run.weapons[picked] !== weapon || !rules.sell(run, picked).ok) {
      showShop({ focus: 'sell' });
      return;
    }
    app.picked = null;
    sound('sell');
    report('soldGood', { name: t(weapon.kind) });
    showShop({ focus: `relic${Math.min(picked, run.weapons.length - 1)}` });
  }

  async function askSale(question, yes, no) {
    const { w } = metrics(game);
    const innerConfirmWidth = Math.min(440, Math.max(240, w - 32)) - 40;
    // Native confirm now shares uiScale. It still uses one line and its own fixed skin.
    if (textWidth(question, 24) <= innerConfirmWidth && [yes, no].every((label) => textWidth(label, 24) <= (innerConfirmWidth - 12) / 2)) {
      sale = { native: true };
      try {
        const asked = game.confirm(question, { yes, no });
        queueMicrotask(() => focusPart?.('no'));
        return await asked;
      }
      finally { sale = undefined; }
    }
    // Long bilingual labels need the wrapped themed native view; confirm has no wrapping/skin options.
    return new Promise((resolve) => {
      const { panel, text, button, bind } = partsFor();
      const width = Math.min(400, w - 24);
      const rows = wrap(question, width - 36, 17);
      const height = 94 + rows.length * 22;
      const answer = (accepted) => {
        sale.view.close();
        sale = undefined;
        resolve(accepted);
      };
      const view = game.show({ label: question, modal: true, skin: SKIN,
        root: { ...panel(undefined, 0, 0, width, height, [
          ...rows.map((row, i) => text(`sellQuestion${i}`, row, 16, 13 + i * 22, width - 32, 22, 17, { align: 'center', color: GOLD, bold: true })),
          button('sellCancel', no, 14, height - 58, (width - 36) / 2, 44, 14, () => answer(false)),
          button('sellConfirm', yes, width / 2 + 4, height - 58, (width - 36) / 2, 44, 14, () => answer(true), { color: CTA, textColor: CTA_TEXT })
        ], { color: INK }), anchor: 'center' }
      }, { bind, dismiss: dismissSale, initialFocus: 'sellCancel' });
      sale = { view, answer };
      focusPart?.('sellCancel', view);
    });
  }

  function dismissSale() {
    if (!sale?.answer) return false;
    sale.answer(false);
    return true;
  }

  function deselect() {
    if (sale || app.picked === null) return false;
    const index = app.picked;
    app.picked = null;
    showShop({ focus: `relic${index}` });
    return true;
  }

  function detailsRows(run, width) {
    const recipes = Object.entries(DIVINE).map(([name, recipe]) => `${t(recipe.from[0])} + ${t(recipe.from[1])} → ${t(name)}`);
    const items = Object.entries(run.items).map(([kind, count]) => `${t(kind)}${count > 1 ? ` ×${count}` : ''}`);
    const stats = Object.entries(rules.statsOf(run)).map(([key, value]) => `${t(key)} ${Math.round(value * 10) / 10}`);
    return [t('recipes'), ...recipes.flatMap((entry) => wrap(entry, width, 13)), t('items'),
      ...wrap(items.length ? items.join('  ·  ') : t('noItems'), width, 13), t('stats'), ...wrap(stats.join('  ·  '), width, 13)];
  }

  function state(layout) {
    const run = app.run;
    const picked = run.weapons[app.picked];
    const offerWidth = (layout.offerWidth - 8 * (layout.columns - 1)) / layout.columns;
    const offers = run.shop.offers.map((offer) => {
      const name = t(offer.kind);
      const tier = offer.type === 'weapon' ? tierOf(offer) : '';
      const note = offer.type === 'weapon' ? t(`${offer.kind}Note`) : statistics(ITEMS[offer.kind].stats).join(' · ');
      return { ...offer, name, tier, titleLines: wrap(name, offerWidth - 43, 13, true), noteLines: wrap([tier, note].filter(Boolean).join(' · '), offerWidth - 12, 11) };
    });
    const slotWidth = (layout.gearWidth - 6 * (layout.slotColumns - 1)) / layout.slotColumns;
    const vertical = slotWidth < 126 && layout.slotHeight >= 64;
    const weapons = run.weapons.map((weapon, i) => {
      const partner = picked && i !== app.picked ? rules.mergeResult(run, app.picked, i) : null;
      const tier = tierOf(weapon);
      return { weapon, name: t(weapon.kind), tier, partner, titleText: wrap(t(weapon.kind), slotWidth - (vertical ? 10 : 40), 12, true).join('\n'),
        tierText: !vertical && partner && slotWidth >= 150 ? `${tier} · ${t('mergeWith')}` : tier };
    });
    const partner = weapons.find((slot) => slot.partner)?.partner;
    const gearShowing = !layout.compact || pane === 'gear';
    const feedback = gearShowing && partner ? t('mergePreview', { name: weaponLabel(partner) }) : note ? t(note.key, note.values) : t(gearShowing ? 'tapToMerge' : 'reserveHint');
    const detailLines = detailsOpen ? detailsRows(run, layout.gearWidth - 12) : [];
    const gearTitle = wrap(layout.compact ? picked ? t('selected', { name: weaponLabel(picked) }) : t('mergeAdvice') : t('yourTreasures', { n: weapons.length, max: run.slots }), layout.gearWidth, layout.short ? 13 : 15, true).join('\n');
    const detailPages = Math.max(1, Math.ceil(detailLines.length / layout.detailRows));
    detailPage = Math.min(detailPage, detailPages - 1);
    return { run, picked, offers, weapons, compact: layout.compact, gearTitle, feedbackLines: wrap(feedback, layout.content - layout.nextWidth - 8, 12), feedbackColor: gearShowing && partner ? GOLD : note?.warning ? 0xffb7a3 : QUIET,
      cost: rules.rerollPrice(run), count: { n: weapons.length, max: run.slots }, gearShowing, detailPages,
      detailLines: detailLines.slice(detailPage * layout.detailRows, (detailPage + 1) * layout.detailRows) };
  }

  function disposeDrag() {
    for (const remove of dragOff) remove();
    dragOff = [];
  }

  function registerDrag(view, factor) {
    disposeDrag();
    drag ??= game.dragAndDrop();
    for (let index = 0; index < SLOT_COUNT; index++) {
      const node = view.get(`relic${index}`);
      const source = drag.source(node, {
        data: () => !sale && app.screen === 'shop' && app.run.weapons[index] ? { index, weapon: app.run.weapons[index] } : undefined,
        ghost: ({ weapon }) => {
          if (!ghost) {
            ghost = game.sprite();
            ghostMark = game.text('', { align: 'center', baseline: 'middle', bold: true, color: GOLD, layer: ghost });
          }
          ghost.graphics.clear().beginFill(0x616144, 0.95).drawRoundRect(-22 * factor, -22 * factor, 44 * factor, 44 * factor, 9 * factor).endFill();
          ghostMark.text = markOf(weapon.kind);
          ghostMark.size = 23 * factor;
          return ghost;
        }
      });
      const target = drag.target(node, {
        accepts: (source) => !sale && app.screen === 'shop' && source.index !== index && app.run.weapons[source.index] === source.weapon && Boolean(rules.mergeResult(app.run, source.index, index)),
        hover: (_, over) => { node.alpha = over ? 0.65 : 1; },
        drop: (source) => { merge(source.index, index); }
      });
      dragOff.push(source, target);
    }
  }

  function makeShop(frame) {
    // The engine chooses the actual phone/tablet variant. A provisional snapshot is replaced in built() before drawing.
    let activeLayout = planMarketLayout(frame.w, frame.h, frame.orientation, app.run.slots);
    let snapshot = state(activeLayout);
    const title = t('shopTitle', { n: app.run.wave });
    const variants = {}, layouts = new Map();
    let activeBind;
    for (const [key, variant] of [['root', 'landscape'], ['portrait', 'portrait'], ['tablet', 'tablet'], ['tabletPortrait', 'tabletPortrait']]) {
      const layout = planMarketLayout(frame.w, frame.h, variant, app.run.slots);
      layouts.set(variant, layout);
      const { compact, short, width, height, pad, content, headH, bodyY, barY, footerHeight, nextWidth,
        offerX, offerY, offerWidth, offerHeight, offersEnd, offerViewportHeight, columns,
        gearX, gearY, gearWidth, gearViewportHeight, gearEnd, slotsY, slotColumns, slotHeight,
        actionsY, detailsWidth, actionWidth } = layout;
      const { panel, text, button, cardButton, bind } = partsFor();
      const ownTitle = t(compact ? 'shopTitleCompact' : 'shopTitle', { n: app.run.wave });
      const titleSize = width < 440 ? 17 : 24;
      const titleRows = wrap(ownTitle, content - 108, titleSize, true);
      const body = [
        panel(undefined, 1, 1, width - 2, height - 2, [], { color: INK, alpha: 1 }),
        text('marketTitle', titleRows.join('\n'), pad, 3, content - 108, headH - 6, titleSize, { color: GOLD, bold: true }),
        panel(undefined, width - pad - 103, (headH - 30) / 2, 103, 30, [text('wallet', '', 0, 0, 103, 30, 13, { color: GOLD, align: 'center', bold: true })], { color: 0x263e34 }),
        panel(undefined, pad, headH, content, 1, [], { color: 0x688568 })
      ];
      bind.wallet = { pick: (s) => s.run.pearls, format: (n) => t('pearls', { n }), roll: 0.14 };
      const tab = (to, id) => () => {
        if (to === pane) return;
        pane = to;
        sound('select');
        showShop({ focus: id });
      };
      body.push(
        button('offersTab', t('offers'), pad, headH + 5, content / 2 - 4, 44, 14, tab('offers', 'offersTab'),
          { visible: (s) => s.compact, color: () => pane === 'offers' ? 0x5b6041 : 0x21443a }),
        button('gearTab', (s) => t('marketGear', s.count), pad + content / 2 + 4, headH + 5, content / 2 - 4, 44, 14, tab('gear', 'gearTab'),
          { visible: (s) => s.compact, color: () => pane === 'gear' ? 0x5b6041 : 0x21443a }),
        text('offersTitle', t('offers'), offerX, bodyY, offerWidth, 26, 17, { color: GOLD, bold: true, visible: (s) => !s.compact })
      );

      const cards = [];
      for (let i = 0; i < SHOP.offers; i++) {
        const get = (s) => s.offers[i];
        const { x, y, w, h } = cardSlot(i, columns, offerWidth, 8, offerHeight);
        const children = [
          panel(`offerMarkPlate${i}`, 6, 7, 27, 27, [text(`offerMark${i}`, (s) => markOf(get(s)?.kind), 0, 0, 27, 27, 19, { color: GOLD, align: 'center', bold: true })], {}, { color: (s) => WARM_RELICS.has(get(s)?.kind) ? 0x5b382e : 0x405541 }),
          text(`offerName${i}_0`, (s) => get(s)?.titleLines.join('\n') ?? '', 39, 4, w - 44, 30, 13, { color: GOLD, bold: true }),
          text(`offerNote${i}_0`, (s) => get(s)?.noteLines.join('\n') ?? '', 6, 34, w - 12, h - 84, 11),
          button(`offerBuy${i}`, (s) => get(s)?.sold ? t('sold') : t('buy', { price: get(s)?.price }), 5, h - 48, (w - 15) / 2, 44, 13,
            () => buy(i), { disabled: (s) => !get(s) || get(s).sold || s.run.pearls < get(s).price,
              label: (s) => get(s)?.sold ? t('sold') : t('buyName', { name: [get(s)?.name, get(s)?.tier].filter(Boolean).join(' · '), price: get(s)?.price }) }),
          button(`offerLock${i}`, (s) => get(s)?.locked ? t('unlock') : t('lock'), w / 2 + 2.5, h - 48, (w - 15) / 2, 44, 13,
            () => lock(i), { disabled: (s) => !get(s) || get(s).sold,
              color: (s) => get(s)?.sold ? DISABLED : get(s)?.locked ? 0x716047 : 0x20483c,
              label: (s) => get(s)?.locked ? t('unlock') : t('lockName', { name: [get(s)?.name, get(s)?.tier].filter(Boolean).join(' · ') }) })
        ];
        cards.push(panel(`offer${i}`, x, y, w, h, children, {}, {
          visible: (s) => Boolean(get(s)),
          color: (s) => get(s)?.sold ? 0x243c37 : get(s)?.locked ? 0x4e5039 : get(s)?.type === 'weapon' ? 0x29483c : 0x183c34
        }));
      }
      cards.push(button('reroll', (s) => t('reroll', { price: s.cost }), 0, offersEnd + 8, Math.min(180, offerWidth), 44, 13, reroll,
        { disabled: (s) => s.run.pearls < s.cost, label: (s) => t('rerollName', { price: s.cost }) }));
      body.push(panel('offerShelf', offerX, offerY, offerWidth, offerViewportHeight, cards,
        offersEnd + 52 > offerViewportHeight ? { scroll: 'vertical' } : {}, { visible: (s) => !s.compact || pane === 'offers' }));

      const gear = [text('gearHeading', (s) => s.gearTitle, 0, 0, gearWidth, slotsY - 3, short ? 13 : 15, { color: GOLD, bold: true })];
      for (let i = 0; i < SLOT_COUNT; i++) {
        const get = (s) => s.weapons[i];
        const { x, y, w, h } = cardSlot(i, slotColumns, gearWidth, 6, slotHeight);
        const vertical = w < 126 && h >= 64;
        const relicName = `relic${i}`;
        const relicCaptions = [
          text(relicName + 'Empty', s => get(s) ? '' : t('emptySlot'), 0, 0, w, h, 12, { color: 0x97aa9d, align: 'center' }),
          text(relicName + 'Mark', s => get(s) ? markOf(get(s).weapon.kind) : '', 0, vertical ? 2 : 0, vertical ? w : 34, vertical ? 24 : h, vertical ? 18 : 22, { color: GOLD, align: 'center', bold: true }),
          text(relicName + 'Title', s => get(s)?.titleText ?? '', vertical ? 5 : 35, vertical ? 24 : 3, w - (vertical ? 10 : 40), vertical ? 31 : h - 19, 12, { align: vertical ? 'center' : 'left', color: SKIN.buttonText, bold: true }),
          text(relicName + 'Tier', s => get(s)?.tierText ?? '', vertical ? 0 : 35, h - 16, vertical ? w : w - 37, 15, 11, { color: GOLD, align: vertical ? 'center' : 'left' })
        ];
        gear.push(cardButton(relicName, x, slotsY + y, w, h, relicCaptions, () => select(i), {
          disabled: (s) => !get(s), visible: (s) => i < s.run.slots,
          color: (s) => !get(s) ? DISABLED : app.picked === i ? 0x806542 : get(s).partner ? 0x4e6040 : get(s).weapon.divine ? 0x654334 : 0x234c41,
          label: (s) => !get(s) ? t('emptySlot') : get(s).partner ? t('mergeInto', { name: weaponLabel(get(s).partner) }) : weaponLabel(get(s).weapon)
        }));
      }
      body.push(panel('gearShelf', gearX, gearY, gearWidth, gearViewportHeight, gear,
        gearEnd > gearViewportHeight ? { scroll: 'vertical' } : {}, { visible: (s) => s.gearShowing && !detailsOpen }));

      const toggleDetails = () => {
        detailsOpen = !detailsOpen;
        detailPage = 0;
        showShop({ focus: 'details' });
      };
      const sellLabel = (s) => s.picked ? t('sellName', { name: t(s.picked.kind), price: rules.sellPrice(s.run, app.picked) }) : '';
      body.push(
        button('sell', (s) => t('sell', { price: rules.sellPrice(s.run, app.picked) }), gearX, actionsY, actionWidth, 44, 13, () => { void sell(); },
          { label: sellLabel, visible: (s) => s.gearShowing && !detailsOpen && Boolean(s.picked), disabled: (s) => s.weapons.length <= 1 }),
        button('cancel', t('cancelPick'), gearX + actionWidth + 8, actionsY, actionWidth, 44, 13, deselect,
          { visible: (s) => s.gearShowing && !detailsOpen && Boolean(s.picked) }),
        button('details', t('details'), gearX + gearWidth - detailsWidth, actionsY, detailsWidth, 44, 13, toggleDetails,
          { visible: (s) => s.gearShowing })
      );
      const changeDetailsPage = (step, focus) => () => {
        detailPage += step;
        showShop({ focus });
      };
      for (const [i, [name, label, step]] of [['detailPrevious', 'marketPrevious', -1], ['detailNext', 'marketMore', 1]].entries()) {
        body.push(button(name, t(label), gearX + i * (actionWidth + 8), actionsY, actionWidth, 44, 13, changeDetailsPage(step, name), {
          visible: (s) => s.gearShowing && detailsOpen && s.detailPages > 1,
          disabled: (s) => step < 0 ? detailPage === 0 : detailPage + 1 >= s.detailPages
        }));
      }
      const details = [text('detailLine0', (s) => s.detailLines.join('\n'), 6, 3, gearWidth - 12, gearViewportHeight - 6, 13)];
      body.push(panel('gearDetails', gearX, gearY, gearWidth, gearViewportHeight, details, { color: 0x17352e }, { visible: (s) => s.gearShowing && detailsOpen }));

      const feedbackWidth = content - nextWidth - 8;
      body.push(panel(undefined, 1, barY, width - 2, footerHeight, [
        text('marketFeedback0', (s) => s.feedbackLines.join('\n'), pad, 4, feedbackWidth, 46, 12, { paintColor: (s) => s.feedbackColor }),
        button('next', t('nextWave'), width - pad - nextWidth - 1, 5, nextWidth, 44, 15, () => {
          disposeDrag();
          nextWave();
        }, { label: (s) => t('nextWaveName', { n: s.run.wave + 1 }), color: CTA, textColor: CTA_TEXT })
      ], { color: 0x1a3930 }));
      variants[key] = { ...panel('marketSurface', 0, 0, width, height, body, { color: 0x9f895c, label: ownTitle }), anchor: 'center' };
      if (key === 'root') activeBind = bind;
    }
    const view = showView(game, title, variants, { modal: true, skin: SKIN, bind: activeBind, state: () => snapshot, dismiss: deselect,
      built: (view) => {
        activeLayout = layouts.get(view.variant);
        snapshot = state(activeLayout);
        view.refresh();
        registerDrag(view, game.uiScale);
      }
    });
    return { view, key: frame.key, wave: app.run.wave, get compact() { return activeLayout.compact; },
      refresh() { snapshot = state(activeLayout); view.refresh(); }
    };
  }

  function showShop({ focus, fresh = false, renew = false } = {}) {
    if (fresh || shop?.wave !== app.run.wave) {
      pane = 'offers';
      note = undefined;
      detailsOpen = false;
      detailPage = 0;
    }
    const frame = metrics(game);
    if (!renew && shop?.view.visible && shop.key === frame.key && shop.wave === app.run.wave) shop.refresh();
    else {
      shop?.view.close();
      shop = makeShop(frame);
    }
    present('shop', shop.view, focus ?? (shop.compact ? `${pane}Tab` : 'next'));
    return shop.view;
  }

  function showLevelUp({ focus = 'upgrade0' } = {}) {
    const { w, h, key } = metrics(game);
    const width = Math.min(w - 24, 650);
    const { panel, text, cardButton, caption, bind } = partsFor();
    const run = app.run;
    const short = h < 365;
    const cardHeight = short ? 68 : 94;
    const title = t('levelUpTitle', { n: run.pending });
    const cards = run.choices.map((choice, index) => {
      const { x, y, w, h } = cardSlot(index, 2, width - 28, 8, cardHeight);
      const stats = Object.entries(choice.stats);
      const label = `${index + 1}. ${statistics(choice.stats).join(' · ')}`;
      const key = `upgrade${index}`;
      return cardButton(key, x + 14, y + 74, w, h, [
        caption(key + 'Index', `${index + 1}`, 0, 15, 30, 12, { color: QUIET }),
        ...stats.flatMap(([name, value], statIndex) => [
          caption(key + 'Gain' + statIndex, signed(value), 0, short ? 29 : 39, w, short ? 20 : 25, { color: GOLD }),
          caption(key + 'Stat' + statIndex, t(name), 0, h - 15, w, 15)
        ])
      ], () => chooseLevel(index), { color: 0x235045, label: () => label });
    });
    const height = 88 + Math.ceil(cards.length / 2) * (cardHeight + 8);
    const view = game.show({ label: title, modal: true, skin: SKIN,
      root: { ...panel(undefined, 0, 0, width, height, [
        text('upgradeTitle', title, 14, 8, width - 28, 36, width < 420 ? 23 : 29, { color: GOLD, bold: true }),
        text('upgradeHelp', t('levelUpHow'), 14, 46, width - 28, 22, 15), ...cards
      ], { color: INK }), anchor: 'center' }
    }, { bind });
    upgrades = { key, view };
    present('levelUp', view, focus);
    return view;
  }

  function layout() {
    const key = metrics(game).key;
    if (app.screen === 'shop' && shop?.key !== key) {
      if (sale?.view) dismissSale();
      showShop();
    } else if (app.screen === 'levelUp' && upgrades?.key !== key) showLevelUp();
  }

  function reset() {
    disposeDrag();
    dismissSale();
    pane = 'offers';
    note = undefined;
    detailsOpen = false;
    detailPage = 0;
    shop = undefined;
    upgrades = undefined;
  }

  return { showShop, showLevelUp, layout, reset, deselect, dismissSale, disposeDrag, get dragging() { return drag?.dragging; } };
}
