import { DIVINE, HEROES, ITEMS, SHOP } from './sim/data.mjs';
import { getLanguage, t } from './i18n.mjs';
import { layoutFor, textWidth, wrap as wrapText } from './ui-layout.mjs';

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
  const { u: factor, width: w, height: h } = layoutFor(game);
  return { factor, w, h, key: `${Math.round(w)}:${Math.round(h)}:${factor.toFixed(4)}:${getLanguage()}` };
}

function partsFor(game, scale) {
  const bind = {};
  const box = (x, y, width, height) => ({ x: x * scale, y: y * scale, width: width * scale, height: height * scale });
  function panel(name, x, y, w, h, children, options = {}, binding) {
    if (binding) bind[name] = binding;
    return { type: 'panel', name, layout: 'free', ...box(x, y, w, h), ...options, children };
  }
  function text(name, value, x, y, w, h, size, options = {}) {
    const { paintColor, ...display } = options;
    if (typeof value === 'function') bind[name] = { text: value, ...(paintColor ? { color: paintColor } : {}), visible: (state) => Boolean(value(state).trim()) };
    return { type: 'text', name, text: typeof value === 'function' ? '' : value, ...box(x, y, w, h), size: size * scale, ...display };
  }
  function button(name, value, x, y, w, h, size, tap, options = {}) {
    const { disabled, visible, color, textColor, label } = options;
    bind[name] = { tap, ...(disabled ? { disabled } : {}), ...(visible ? { visible } : {}), ...(typeof color === 'function' ? { color } : {}),
      ...(label ? { label } : {}), ...(typeof value === 'function' ? { text: value } : {}) };
    return { type: 'button', name, text: typeof value === 'function' ? '' : value, ...box(x, y, w, h), size: size * scale, ...(typeof color === 'number' ? { color } : {}), ...(textColor ? { textColor } : {}) };
  }
  // One accessible button with independently positioned native text children.
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

function shopLayout(w, h, touch, slots) {
  const compact = w <= 560 || h <= 570 || (touch && w <= 900);
  const stacked = !compact && h >= 745;
  const width = Math.min(w - 16, 780);
  const height = compact ? h - 16 : Math.min(h - 24, stacked ? 775 : 605);
  const pad = compact ? 12 : (stacked ? 34 : 20);
  const content = width - 2 * pad;
  const columns = width < 560 || stacked ? 2 : 4;
  const slotColumns = width < 440 ? 3 : 4;
  const headH = compact ? (width < 440 ? 53 : 44) : (stacked ? 98 : 55);
  const barY = compact ? height - 55 : headH + 1;
  const contentEnd = compact ? barY : height - 4;
  const offerHeight = width < 560 || stacked ? 117 : 111;
  const offersY = compact ? headH + 56 : barY + 81;
  const offersEnd = offersY + Math.ceil(SHOP.offers / columns) * (offerHeight + 8) - 8;
  const gearY = compact ? headH + 55 : offersEnd + 54;
  const slotHeight = h <= 510 ? 54 : stacked || slotColumns === 3 ? 71 : 65;
  const slotsY = gearY + (compact && content < 450 ? 44 : 28);
  const gearActionsY = slotsY + Math.ceil(slots / slotColumns) * (slotHeight + 6) - 2;
  const detailsY = compact ? Math.min(contentEnd - 47, gearActionsY + 48) : contentEnd - 47;
  const detailRows = Math.max(1, Math.floor((detailsY - gearY - 8) / 17));
  return { compact, stacked, width, height, pad, content, columns, slotColumns, headH, barY, offerHeight, offersY, offersEnd, gearY, slotHeight, slotsY, gearActionsY, detailsY, detailRows };
}

function cardSlot(index, cols, width, gap, height) {
  const span = (width - gap * (cols - 1)) / cols;
  return { x: (index % cols) * (span + gap), y: Math.floor(index / cols) * (height + gap), w: span, h: height };
}

export function createMarketUi({ game, app, rules, sound, say, present, chooseLevel, nextWave, focusPart }) {
  const touch = game.device === 'touch';
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
    const { factor, w } = metrics(game);
    const innerConfirmWidth = Math.min(440, Math.max(240, game.safe.width - 32)) - 40;
    if (48 / factor >= 44 && textWidth(question, 24) <= innerConfirmWidth) {
      sale = { native: true };
      try {
        const asked = game.confirm(question, { yes, no });
        queueMicrotask(() => focusPart?.('no'));
        return await asked;
      }
      finally { sale = undefined; }
    }
    // The built-in dialog uses a fixed 48-unit row, which is less than 44 CSS
    // pixels on scaled phone canvases. This dialog keeps native modal semantics.
    return new Promise((resolve) => {
      const { panel, text, button, bind } = partsFor(game, factor);
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
    const offerWidth = (layout.content - 8 * (layout.columns - 1)) / layout.columns;
    const offers = run.shop.offers.map((offer) => {
      const name = t(offer.kind);
      const tier = offer.type === 'weapon' ? tierOf(offer) : '';
      const note = offer.type === 'weapon' ? t(`${offer.kind}Note`) : statistics(ITEMS[offer.kind].stats).join(' · ');
      return { ...offer, name, tier, titleLines: wrap(name, offerWidth - 43, 13, true), noteLines: wrap([tier, note].filter(Boolean).join(' · '), offerWidth - 12, 11) };
    });
    const weapons = run.weapons.map((weapon, i) => ({ weapon, name: t(weapon.kind), tier: tierOf(weapon),
      partner: picked && i !== app.picked ? rules.mergeResult(run, app.picked, i) : null }));
    const partner = weapons.find((slot) => slot.partner)?.partner;
    const gearShowing = !layout.compact || pane === 'gear';
    const feedback = gearShowing && partner ? t('mergePreview', { name: weaponLabel(partner) }) : note ? t(note.key, note.values) : t(gearShowing ? 'tapToMerge' : 'reserveHint');
    const detailLines = detailsOpen ? detailsRows(run, layout.content - 12) : [];
    const detailPages = Math.max(1, Math.ceil(detailLines.length / layout.detailRows));
    detailPage = Math.min(detailPage, detailPages - 1);
    return { run, picked, offers, weapons, feedbackLines: wrap(feedback, layout.content - 118, 12), feedbackColor: gearShowing && partner ? GOLD : note?.warning ? 0xffb7a3 : QUIET,
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
    const layout = shopLayout(frame.w, frame.h, touch, app.run.slots);
    const { compact, stacked, width, height, pad, content, columns, slotColumns, headH, barY, offerHeight, offersY, offersEnd, gearY, slotHeight, slotsY, gearActionsY, detailsY } = layout;
    let snapshot = state(layout);
    const { panel, text, button, cardButton, caption, bind } = partsFor(game, frame.factor);
    const title = t(compact ? 'shopTitleCompact' : 'shopTitle', { n: app.run.wave });
    const titleSize = width < 440 ? 17 : stacked ? 35 : 24;
    const titleRows = wrap(title, content - 108, titleSize, true);
    const body = [
      panel(undefined, 1, 1, width - 2, height - 2, [], { color: INK, alpha: 1 }),
      text('marketTitle', titleRows.join('\n'), pad, 3, content - 108, headH - 6, titleSize, { color: GOLD, bold: true }),
      panel(undefined, width - pad - 103, (headH - 30) / 2, 103, 30, [text('wallet', '', 0, 0, 103, 30, 13, { color: GOLD, align: 'center', bold: true })], { color: 0x263e34 }),
      panel(undefined, pad, headH, content, 1, [], { color: 0x688568 }),
    ];
    bind.wallet = { pick: (s) => s.run.pearls, format: (n) => t('pearls', { n }), roll: 0.14 };
    const nextWidth = 110;
    const feedbackWidth = content - nextWidth - 8;
    const actionBar = panel(undefined, 1, barY, width - 2, 54, [
      text('marketFeedback0', (s) => s.feedbackLines.join('\n'), pad, 4, feedbackWidth, 46, 12, { paintColor: (s) => s.feedbackColor }),
      button('next', t('nextWave'), width - pad - nextWidth - 1, 5, nextWidth, 44, 15, () => {
        disposeDrag();
        nextWave();
      }, { label: (s) => t('nextWaveName', { n: s.run.wave + 1 }), color: CTA, textColor: CTA_TEXT })
    ], { color: 0x1a3930 });

    if (compact) {
      const tab = (to, id) => () => {
        if (to === pane) return;
        pane = to;
        sound('select');
        showShop({ focus: id });
      };
      body.push(
        button('offersTab', t('offers'), pad, headH + 5, content / 2 - 4, 44, 14, tab('offers', 'offersTab'), { color: () => pane === 'offers' ? 0x5b6041 : 0x21443a }),
        button('gearTab', (s) => t('marketGear', s.count), pad + content / 2 + 4, headH + 5, content / 2 - 4, 44, 14, tab('gear', 'gearTab'), { color: () => pane === 'gear' ? 0x5b6041 : 0x21443a })
      );
    } else body.push(actionBar, text('offersTitle', t('offers'), pad, offersY - 25, content, 24, 17, { color: GOLD, bold: true }));

    const cards = [];
    for (let i = 0; i < SHOP.offers; i++) {
      const get = (s) => s.offers[i];
      const { x, y, w, h } = cardSlot(i, columns, content, 8, offerHeight);
      const children = [
        panel(`offerMarkPlate${i}`, 6, 7, 27, 27, [text(`offerMark${i}`, (s) => markOf(get(s)?.kind), 0, 0, 27, 27, 19, { color: GOLD, align: 'center', bold: true })], {}, { color: (s) => WARM_RELICS.has(get(s)?.kind) ? 0x5b382e : 0x405541 }),
        text(`offerName${i}_0`, (s) => get(s)?.titleLines.join('\n') ?? '', 39, 3, w - 44, 31, 13, { color: GOLD, bold: true }),
        text(`offerNote${i}_0`, (s) => get(s)?.noteLines.join('\n') ?? '', 6, 31, w - 12, h - 80, 11),
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
    cards.push(button('reroll', (s) => t('reroll', { price: s.cost }), 0, offersEnd - offersY + 7, 153, 44, 13, reroll,
      { disabled: (s) => s.run.pearls < s.cost, label: (s) => t('rerollName', { price: s.cost }) }));
    body.push(panel('offerShelf', pad, offersY, content, offersEnd - offersY + 54, cards, {}, { visible: () => !compact || pane === 'offers' }));

    const heading = (s) => wrap(compact ? s.picked ? t('selected', { name: weaponLabel(s.picked) }) : t('mergeAdvice') : t('yourTreasures', s.count), content, 13, true);
    const gear = [text('gearHeading', (s) => heading(s).join('\n'), 0, 0, content, slotsY - gearY - 4, 13, { color: GOLD, bold: true })];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const get = (s) => s.weapons[i];
      const { x, y, w, h } = cardSlot(i, slotColumns, content, 6, slotHeight);
      const vertical = slotColumns === 3 || stacked;
      const relicName = `relic${i}`;
      const relicCaptions = [
        caption(relicName + 'Empty', s => get(s) ? '' : t('emptySlot'), 0, h / 2, w, 12, { color: 0x97aa9d }),
        caption(relicName + 'Mark', s => get(s) ? markOf(get(s).weapon.kind) : '', 0, vertical ? 17 : h / 2, vertical ? w : 40, vertical ? 18 : 22, { color: GOLD }),
        caption(relicName + 'Title', s => get(s) ? wrap(get(s).name, w - (vertical ? 10 : 47), 12, true).join('\n') : '', vertical ? 5 : 39, vertical ? 39 : 18, vertical ? w - 10 : w - 39, 12, { align: vertical ? 'center' : 'left' }),
        caption(relicName + 'Tier', s => {
          const slot = get(s);
          if (!slot) return '';
          return !vertical && slot.partner && w >= 130 ? `${slot.tier} · ${t('mergeWith')}` : slot.tier;
        }, vertical ? 0 : 39, h - (vertical ? 11 : 13), vertical ? w : w - 39, 11, { color: GOLD, align: vertical ? 'center' : 'left' })
      ];
      gear.push(cardButton(relicName, x, slotsY - gearY + y, w, h, relicCaptions, () => select(i), {
        disabled: (s) => !get(s), visible: (s) => i < s.run.slots,
        color: (s) => !get(s) ? DISABLED : app.picked === i ? 0x806542 : get(s).partner ? 0x4e6040 : get(s).weapon.divine ? 0x654334 : 0x234c41,
        label: (s) => !get(s) ? t('emptySlot') : get(s).partner ? t('mergeInto', { name: weaponLabel(get(s).partner) }) : weaponLabel(get(s).weapon)
      }));
    }
    const sellLabel = (s) => s.picked ? t('sellName', { name: t(s.picked.kind), price: rules.sellPrice(s.run, app.picked) }) : '';
    const actionsY = gearActionsY - gearY;
    gear.push(
      button('sell', (s) => t('sell', { price: rules.sellPrice(s.run, app.picked) }), 0, actionsY, 88, 44, 13, () => { void sell(); },
        { label: sellLabel, visible: (s) => Boolean(s.picked), disabled: (s) => s.weapons.length <= 1 }),
      button('cancel', t('cancelPick'), 94, actionsY, 75, 44, 13, deselect, { visible: (s) => Boolean(s.picked) })
    );
    body.push(panel('gearShelf', pad, gearY, content, actionsY + 44, gear, {}, { visible: (s) => s.gearShowing && !detailsOpen }));

    const toggleDetails = () => {
      detailsOpen = !detailsOpen;
      detailPage = 0;
      showShop({ focus: 'details' });
    };
    const detailsWidth = width < 440 ? 174 : 190;
    body.push(button('details', t('details'), content + pad - detailsWidth, detailsY, detailsWidth, 44, 13, toggleDetails, { visible: (s) => s.gearShowing }));
    const detailsHeight = Math.max(1, detailsY - gearY - 5);
    const details = [text('detailLine0', (s) => s.detailLines.join('\n'), 6, 3, content - 12, detailsHeight - 6, 13)];
    const changeDetailsPage = (step, focus) => () => {
      detailPage += step;
      showShop({ focus });
    };
    const shifts = [ ['detailPrevious', 'marketPrevious', -1], ['detailNext', 'marketMore', 1] ];
    for (const [i, [name, label, step]] of shifts.entries()) {
      body.push(button(name, t(label), pad + i * 80, detailsY, 76, 44, 13, changeDetailsPage(step, name), {
        visible: (s) => s.gearShowing && detailsOpen && s.detailPages > 1,
        disabled: (s) => step < 0 ? detailPage === 0 : detailPage + 1 >= s.detailPages
      }));
    }
    body.push(panel('gearDetails', pad, gearY, content, detailsHeight, details, { color: 0x17352e }, { visible: (s) => s.gearShowing && detailsOpen }));

    if (compact) body.push(actionBar);
    const view = game.show({ label: title, modal: true, skin: SKIN,
      root: { ...panel('marketSurface', 0, 0, width, height, body, { color: 0x9f895c, label: title }), anchor: compact ? 'center' : 'top', y: compact ? 0 : 12 * frame.factor }
    }, { bind, state: () => snapshot, dismiss: deselect,
      built: (view) => {
        registerDrag(view, frame.factor);
      }
    });
    return { view, key: frame.key, wave: app.run.wave,
      refresh() { snapshot = state(layout); view.refresh(); }
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
    present('shop', shop.view, focus ?? (shopLayout(frame.w, frame.h, touch, app.run.slots).compact ? `${pane}Tab` : 'next'));
    return shop.view;
  }

  function showLevelUp({ focus = 'upgrade0' } = {}) {
    const { w, h, key, factor } = metrics(game);
    const width = Math.min(w - 24, 650);
    const { panel, text, cardButton, caption, bind } = partsFor(game, factor);
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
