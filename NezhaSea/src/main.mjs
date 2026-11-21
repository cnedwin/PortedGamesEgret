// 页面入口：存档、语言、引擎的 play（画布、每帧、键盘手柄和手指的摇杆）、顶栏、升级、龙宫集市（买、留、换、卖、
// 合成）、暂停和结算。按钮都是页面自己的按钮；规则在 src/sim，这里只把操作交给它、把状态显示出来。
// The page's entry: the save, the language, the engine's play (the canvas, each frame, the keys, the gamepad and the
// finger's stick), the bar, the level-ups, the Dragon Palace market (buy, keep, restock, sell, merge), the pause and
// the end. Every control is a page button; the rules are in src/sim, and this only hands them what the player does
// and shows what they hold.
import { play } from '@egret/engine/play';
import { browserLanguages, browserSaveStorage, prefersReducedMotion } from '@egret/engine/web/kit';
import { getLanguage, onLanguage, setLanguage, startLanguage, t } from './i18n.mjs';
import { createSeaStick } from './sea-stick.mjs';
import { openSave, recordGame } from './saves.mjs';
import { DANGER, DIVINE, FIELD, HEROES, HERO_KINDS, ITEMS, WAVES, waveSeconds, xpToLevel } from './sim/data.mjs';
import * as rules from './sim/world.mjs';
import { createSound } from './sound.mjs';
import { createView } from './view.mjs';

const params = new URLSearchParams(location.search),
  $ = (selector) => document.querySelector(selector),
  field = $('#field'),
  panels = { title: $('#title'), guide: $('#guide'), options: $('#options'), levelUp: $('#levelUp'), shop: $('#shop'), menu: $('#menu'), end: $('#end') };
const stick = createSeaStick(field, $('#seaStick'), () => app.screen === 'play');
const compactMarket = matchMedia('(max-width: 480px), (max-height: 490px), (pointer: coarse) and (max-width: 900px)');
let marketNote = null;
let marketPane = 'offers';
let marketScroll = {};
const controlHint = () => t(matchMedia('(pointer: coarse)').matches ? 'controlTouch' : 'controlKeys');

let notice = null;
const save = openSave(browserSaveStorage(), startLanguage(browserLanguages()), (problem) => {
  notice = problem.kind === 'write-failed' ? 'saveRefused' : 'saveReset';
});
const settings = () => save.data.settings;
setLanguage(params.get('lang') ?? settings().language);
const setSetting = (key, value) => {
  if (!save.update((data) => void (data.settings[key] = value))) notice = 'saveRefused';
};

const app = {
  save,
  screen: 'title',
  hero: 'boy',
  danger: 0,
  run: null,
  picked: null,
  result: null,
  seed: Number(params.get('seed') ?? Date.now() % 100000),
  get notice() {
    return notice;
  }
};

// The input stays gated until the atlas and mixer are ready. Separate their startup work from the title layout.
const yieldStartup = () => globalThis.scheduler?.yield?.() ?? new Promise((resolve) => setTimeout(resolve, 0));
// ---- The engine. Frames begin as soon as play is set up; they do nothing until the page is ready. ----
let game,
  view,
  sound,
  ready = false;
await play({
  width: FIELD.width,
  height: FIELD.height,
  parent: field,
  transparent: true,
  seed: app.seed,
  async setup(made) {
    game = made;
    await yieldStartup();
    view = createView(game);
    await yieldStartup();
    sound = createSound(game, { on: settings().sound, music: settings().music });
    return view.ready;
  },
  update: (seconds) => frame(seconds),
  onError: (cause) => console.error(cause)
});
Object.assign(game.canvas.parentElement.style, { background: 'transparent', position: 'absolute', inset: '0', zIndex: '1' });
game.canvas.setAttribute('role', 'img');
game.canvas.tabIndex = -1;
game.canvas.setAttribute('aria-label', t('stage'));
if (settings().reducedMotion) game.reducedMotion = true;

// ---- Each frame: Nezha moves by the keys, the stick or the pad; the rules step; the view and the bar follow. ----
let sinceBar = 0;
function frame(seconds) {
  if (!ready || app.screen !== 'play' || !app.run) return;
  const run = app.run;
  const axis = stick.active ? stick.vector : game.keys.axis();
  const events = [];
  for (let left = seconds; left > 1e-6 && run.phase === 'wave'; left -= 1 / 30) events.push(...rules.step(run, Math.min(left, 1 / 30), axis));
  view.show(run, events, seconds);
  hear(events);
  sinceBar += seconds;
  if (sinceBar > 0.1 || events.some((e) => e.type === 'level' || e.type === 'hurt' || e.type === 'boss')) {
    sinceBar = 0;
    drawBar();
  }
  if (run.phase === 'levelUp') showLevelUp();
  else if (run.phase === 'shop') showShop();
  else if (run.phase === 'won' || run.phase === 'lost') finish();
}

function hear(events) {
  let hits = 0;
  for (const event of events) {
    if (event.type === 'throw' || event.type === 'sweep' || event.type === 'thrust' || event.type === 'lob' || event.type === 'nova' || event.type === 'land') sound(event.type);
    else if (event.type === 'hit' && hits++ < 1) sound('hitSoft', { every: 0.06 });
    else if (event.type === 'kill') sound('splash', { every: 0.07 });
    else if (event.type === 'pearl') sound('pearl', { every: 0.08, volume: 0.6 });
    else if (event.type === 'hurt') sound('ouch', { every: 0.2 });
    else if (event.type === 'level') sound('levelUp');
    else if (event.type === 'boss') {
      sound('boss');
      say(t(event.kind === 'yaksha' ? 'bossYaksha' : 'bossAoBing'));
    } else if (event.type === 'waveEnd') sound('wave', { volume: 0.64 });
  }
  if (app.run && app.run.phase === 'wave') sound.music(app.run.boss ? 'boss' : 'battle', app.run.wave / WAVES);
}

// ---- The bar. ----
const put = (node, words) => node.textContent !== words && (node.textContent = words);
function drawBar() {
  const run = app.run;
  if (!run) return;
  const stats = rules.statsOf(run),
    hp = Math.ceil(run.player.hp);
  $('#hpBar span').style.transform = `scaleX(${Math.max(0, hp / stats.maxHp)})`;
  put($('#hpText'), t('hp', { hp, max: stats.maxHp }));
  const hpBar = $('#hpBar');
  hpBar.setAttribute('aria-valuemax', String(stats.maxHp));
  hpBar.setAttribute('aria-valuenow', String(hp));
  hpBar.setAttribute('aria-label', t('hpName'));
  const boss = run.boss;
  put($('#waveText'), t('wave', { n: run.wave, total: WAVES }));
  put($('#timerText'), boss ? t('bossLeft') : t('waveLeft', { s: Math.ceil(run.waveLeft) }));
  const hint = $('#battleHint');
  const elapsed = waveSeconds(run.wave) - run.waveLeft;
  hint.hidden = app.screen !== 'play' || !!boss || elapsed > (run.wave === 1 ? 4.5 : 1.6);
  if (!hint.hidden) put(hint, run.wave === 1 ? controlHint() + ' ' + t('visualTip') : t('wavePrepare', { n: run.wave }));
  $('#xpBar span').style.transform = `scaleX(${Math.min(1, run.xp / xpToLevel(run.level))})`;
  put($('#levelText'), t('level', { n: run.level }));
  put($('#pearlText'), t('pearls', { n: run.pearls }));
  put($('#pauseButton'), t('pause'));
  $('#bossBar').hidden = !boss;
  const announcement = $('#bossAnnouncement');
  announcement.hidden = !boss || app.screen !== 'play' || elapsed > 2.5;
  if (!announcement.hidden) put(announcement, t(boss.kind === 'yaksha' ? 'bossYaksha' : 'bossAoBing'));
  if (boss) {
    $('#bossBar span').style.transform = `scaleX(${Math.max(0, boss.hp / boss.max)})`;
    put($('#bossText'), t(boss.kind === 'yaksha' ? 'yaksha' : 'aoBing'));
  }
}
$('#pauseButton').addEventListener('click', () => openMenu());

// ---- Screens. ----
function openPanel(name, focus) {
  for (const [key, panel] of Object.entries(panels)) panel.hidden = key !== name;
  field.inert = name !== null;
  $('#seaStick').hidden = name !== null || app.screen !== 'play';
  if (name) {
    stick.reset();
    $('#battleHint').hidden = true;
    $('#bossAnnouncement').hidden = true;
    const panel = panels[name];
    const target = (focus ? panel.querySelector(focus) : null) ?? panel.querySelector('[data-focus]') ?? panel.querySelector('button:not([aria-disabled="true"])');
    target?.focus({ preventScroll: true });
  }
}
const sheet = (panel, html) => {
  panel.innerHTML = `<div class="sheet">${html}</div>`;
  return panel.firstElementChild;
};
let lastSaid = '';
function say(words) {
  const live = $('#say');
  live.textContent = words === lastSaid ? `${words} ` : words;
  lastSaid = live.textContent;
}
const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const weaponName = (weapon) => t(weapon.kind);
const tierName = (weapon) => (weapon.divine ? t('divineTier') : t('tier', { n: weapon.tier + 1 }));
const RELIC_MARKS = {
  ring: '◉', ribbon: '≋', spear: '↑', brick: '▰', wheels: '✺', dome: '♨',
  bindDragon: '◎', fireSpear: '✵', dragonBrick: '✦',
  lotusRoot: '❋', peach: '●', dragonScale: '◆', elixir: '✧', windCharm: '≈',
  conch: '◈', coral: '✿', shell: '▱', primordialPearl: '◐', seaPearl: '◉', goldLotus: '❀',
  demonMirror: '◇', drumOfWar: '▣', dragonPearl: '✶', heavenlyArmor: '⬒', skyRing: '◎'
};
const relicMark = (kind) => `<span class="relic-mark" data-relic="${kind}" aria-hidden="true">${RELIC_MARKS[kind] ?? '✧'}</span>`;
const signed = (value) => `${value > 0 ? '+' : ''}${Math.round(value * 10) / 10}`;
const statsText = (stats) =>
  Object.entries(stats)
    .map(([key, value]) => t('statLine', { name: t(key), value: signed(value) }))
    .join(' · ');

function settingsHtml() {
  const s = settings();
  const toggle = (key, on) => `<button type="button" data-toggle="${key}" aria-pressed="${on}">${t('switchState', { name: t(key), state: t(on ? 'on' : 'off') })}</button>`;
  return `<div class="row">${toggle('sound', s.sound)}${toggle('music', s.music)}${toggle('reducedMotion', s.reducedMotion)}<button type="button" data-language aria-label="${t('languageName')}" lang="${getLanguage() === 'zh' ? 'en' : 'zh-CN'}">${t('language')}</button></div>`;
}
function wireSettings(root, redraw) {
  for (const button of root.querySelectorAll('[data-toggle]'))
    button.addEventListener('click', () => {
      const key = button.dataset.toggle,
        value = !settings()[key];
      setSetting(key, value);
      if (key === 'sound') sound.setOn(value);
      if (key === 'music') sound.setMusic(value);
      if (key === 'reducedMotion') game.reducedMotion = value || prefersReducedMotion();
      redraw(`[data-toggle="${key}"]`);
    });
  root.querySelector('[data-language]')?.addEventListener('click', () => {
    const next = getLanguage() === 'zh' ? 'en' : 'zh';
    setSetting('language', next);
    setLanguage(next);
  });
}

function showTitle(focus) {
  app.screen = 'title';
  app.run = null;
  view.clear();
  sound.music('title', 0.2);
  if (game.paused) game.resume();
  $('#hud').hidden = true;
  const unlocked = save.data.unlocked;
  if (!unlocked.includes(app.hero)) app.hero = 'boy';
  const best = save.data.best;
  const heroes = HERO_KINDS.map((hero) => {
    const open = unlocked.includes(hero), reached = best[hero]?.[app.danger];
    const record = !open ? t(HEROES[hero].unlock === 'win' ? 'unlockWin' : 'unlockWave10') : reached > WAVES ? t('bestWon') : reached ? t('bestWave', { n: reached }) : t('noBest');
    return `<button type="button" class="hero-card" data-hero="${hero}" aria-pressed="${app.hero === hero}" ${open ? '' : 'aria-disabled="true"'}>
        <img src="assets/${hero}.webp" width="440" height="587" alt="">
        <span class="hero-label"><strong>${t(hero)}</strong><small>${record}</small></span></button>`;
  }).join('');
  const dangers = DANGER.map((_, danger) => `<button type="button" data-danger="${danger}" aria-pressed="${app.danger === danger}">${t(`danger${danger}`)}</button>`).join('');
  const root = sheet(panels.title, `
    <div class="title-copy">
      <h1>${t('title')}</h1>
      <p class="title-line">${t('titleLine')}</p>
      ${notice ? `<p class="notice" role="status">${t(notice)}</p>` : ''}
      <div class="title-actions">
        <button type="button" class="strong" data-start data-focus>${t('start')}</button>
        <button type="button" data-open="guide">${t('howTitle')}</button>
        <button type="button" data-open="options">${t('settings')}</button>
      </div>
      <div class="title-picker">
        <h2>${t('chooseHero')}</h2>
        <div class="hero-deck">${heroes}</div>
        <p class="choice-note">${t(`${app.hero}Note`)}</p>
        <h2>${t('chooseDanger')}</h2>
        <div class="danger-picker">${dangers}</div>
        <p class="choice-note">${t(`danger${app.danger}Note`)}</p>
      </div>
    </div>`);
  root.querySelector('[data-start]').addEventListener('click', startGame);
  root.querySelector('[data-open=guide]').addEventListener('click', showGuide);
  root.querySelector('[data-open=options]').addEventListener('click', () => showOptions());
  for (const button of root.querySelectorAll('[data-hero]')) {
    button.addEventListener('click', () => {
      if (!unlocked.includes(button.dataset.hero)) return say(t('locked'));
      app.hero = button.dataset.hero;
      sound('select', { every: 0.13 });
      showTitle(`[data-hero="${app.hero}"]`);
    });
  }
  for (const button of root.querySelectorAll('[data-danger]')) {
    button.addEventListener('click', () => {
      app.danger = Number(button.dataset.danger);
      sound('select', { every: 0.13 });
      showTitle(`[data-danger="${app.danger}"]`);
    });
  }
  openPanel('title', focus);
}

function showGuide() {
  app.screen = 'guide';
  const root = sheet(panels.guide, `<h2 id="guideHeading">${t('howTitle')}</h2>
    <p class="lead">${controlHint()}</p>
    <ol><li>${t('how1')}</li><li>${t('how2')}</li><li>${t('how3')}</li></ol>
    <p class="quietText">${t('keysLine')}</p>
    <div class="row sheet-actions">
      <button type="button" class="strong" data-start>${t('start')}</button>
      <button type="button" data-close>${t('closed')}</button>
    </div>`);
  panels.guide.setAttribute('aria-labelledby', 'guideHeading');
  root.querySelector('[data-start]').addEventListener('click', startGame);
  root.querySelector('[data-close]').addEventListener('click', () => showTitle('[data-open=guide]'));
  openPanel('guide');
}

function showOptions(focus) {
  app.screen = 'options';
  const root = sheet(panels.options, `<h2 id="optionsHeading">${t('settings')}</h2>
    ${settingsHtml()}<div class="row sheet-actions"><button type="button" class="strong" data-close>${t('closed')}</button></div>`);
  panels.options.setAttribute('aria-labelledby', 'optionsHeading');
  root.querySelector('[data-close]').addEventListener('click', () => showTitle('[data-open=options]'));
  wireSettings(root, showOptions);
  openPanel('options', focus);
}

function startGame() {
  app.seed = (app.seed * 7 + 13) % 100000;
  app.run = rules.createRun({ seed: app.seed, hero: app.hero, danger: app.danger });
  app.result = null;
  app.picked = null;
  marketNote = null;
  app.screen = 'play';
  stick.reset();
  view.clear();
  sound('wave');
  sound.music('battle', 1 / WAVES);
  $('#hud').hidden = false;
  drawBar();
  openPanel(null);
  if (game.paused) game.resume();
  game.canvas.focus?.({ preventScroll: true });
  say(t('wave', { n: 1, total: WAVES }));
}

// ---- Level-ups: one of four raises, as many times as levels were gained. ----
function showLevelUp() {
  const run = app.run;
  if (app.screen === 'levelUp') return;
  app.screen = 'levelUp';
  drawBar();
  const root = sheet(
    panels.levelUp,
    `<h2 id="levelHeading">${t('levelUpTitle', { n: run.pending })}</h2>
     <p class="lead">${t('levelUpHow')}</p>
     <div class="cards levelling">${run.choices.map((choice, i) => `<button type="button" class="card" data-choice="${i}">
       <kbd>${i + 1}</kbd>${Object.entries(choice.stats).map(([name, value]) => `<b class="raise-value">${signed(value)}</b><strong>${t(name)}</strong>`).join('')}
     </button>`).join('')}</div>`
  );
  panels.levelUp.setAttribute('aria-labelledby', 'levelHeading');
  for (const button of root.querySelectorAll('[data-choice]')) button.addEventListener('click', () => chooseLevel(Number(button.dataset.choice)));
  sound.music('market', 0.3);
  openPanel('levelUp');
}
function chooseLevel(index) {
  const run = app.run;
  if (!rules.chooseLevelUp(run, index).ok) return;
  sound('confirm', { every: 0.12 });
  app.screen = 'between';
  if (run.phase === 'levelUp') showLevelUp();
  else showShop();
}

// ---- The market. ----
function marketMessage(key, values, warning = false) {
  marketNote = { key, values, warning };
  say(t(key, values));
}

function showShop(focus) {
  const run = app.run;
  const panel = panels.shop;
  const continuing = app.screen === 'shop';
  const detailOpen = continuing && Boolean(panel.querySelector('details')?.open);
  if (continuing) {
    const previousPane = panel.dataset.marketPane;
    if (previousPane) marketScroll[previousPane] = panel.querySelector('.market-content').scrollTop;
    else marketScroll.desktop = panel.scrollTop;
  } else {
    marketNote = null;
    marketPane = 'offers';
    marketScroll = {};
  }
  const compact = compactMarket.matches;
  if (compact) panel.dataset.marketPane = marketPane;
  else delete panel.dataset.marketPane;
  app.screen = 'shop';
  drawBar();
  const stats = rules.statsOf(run);
  const offers = run.shop.offers
    .map((offer, i) => {
      const name = t(offer.kind),
        label = offer.type === 'weapon' ? `${name} · ${t('tier', { n: offer.tier + 1 })}` : name,
        note = offer.type === 'weapon' ? t(`${offer.kind}Note`) : statsText(ITEMS[offer.kind].stats),
        poor = run.pearls < offer.price;
      return `<article class="offer ${offer.type}${offer.sold ? ' sold' : ''}${offer.locked ? ' reserved' : ''}">
        <div class="offer-heading">${relicMark(offer.kind)}<span class="name">${escape(label)}</span></div>
        <small class="quietText">${escape(note)}</small>
        <div class="row"><button type="button" data-buy="${i}" ${offer.sold || poor ? 'aria-disabled="true"' : ''} aria-label="${escape(offer.sold ? t('sold') : t('buyName', { name: label, price: offer.price }))}">${offer.sold ? t('sold') : t('buy', { price: offer.price })}</button>
        <button type="button" data-lock="${i}" aria-pressed="${offer.locked}" ${offer.sold ? 'aria-disabled="true"' : ''} aria-label="${escape(t('lockName', { name: label }))}">${offer.locked ? t('unlock') : t('lock')}</button></div></article>`;
    })
    .join('');
  const picked = app.picked;
  let mergePreview;
  const slots = Array.from({ length: run.slots }, (_, i) => {
    const weapon = run.weapons[i];
    if (!weapon) return `<button type="button" class="slot empty" aria-disabled="true" tabindex="-1">${t('emptySlot')}</button>`;
    const partner = picked !== null && picked !== i && rules.mergeResult(run, picked, i);
    const label = `${weaponName(weapon)} · ${tierName(weapon)}`;
    const resultName = partner ? `${t(partner.kind)} · ${tierName(partner)}` : '';
    if (partner) mergePreview = resultName;
    const name = partner ? t('mergeInto', { name: resultName }) : label;
    return `<button type="button" class="slot${weapon.divine ? ' divine' : ''}${partner ? ' partner' : ''}" data-slot="${i}" aria-pressed="${picked === i}" aria-label="${escape(name)}">${relicMark(weapon.kind)}<span class="slot-name">${escape(weaponName(weapon))}</span><small>${escape(tierName(weapon))}</small>
      ${partner ? `<small class="merge-label">${escape(compact ? t('mergeWith') : name)}</small>` : ''}</button>`;
  }).join('');
  const pickedWeapon = picked !== null ? run.weapons[picked] : null;
  const recipes = Object.entries(DIVINE)
    .map(([name, recipe]) => `${t(recipe.from[0])} + ${t(recipe.from[1])} → <b>${t(name)}</b>`)
    .join('　');
  const items = Object.entries(run.items)
    .map(([kind, count]) => `<span><b>${t(kind)}</b>${count > 1 ? ` ×${count}` : ''}</span>`)
    .join('');
  const statRows = Object.entries(stats)
    .map(([key, value]) => `<span class="${value > 0 && key !== 'maxHp' && key !== 'crit' ? 'up' : value < 0 ? 'down' : ''}">${t(key)} ${Math.round(value * 10) / 10}</span>`)
    .join('');
  const previewingMerge = compact && marketPane === 'gear' && Boolean(mergePreview);
  const feedback = previewingMerge
    ? t('mergePreview', { name: mergePreview })
    : marketNote ? t(marketNote.key, marketNote.values) : t(compact && marketPane === 'offers' ? 'reserveHint' : 'tapToMerge');
  const bar = `<div class="market-bar">
       <p class="market-feedback${previewingMerge ? ' merge-preview' : marketNote?.warning ? ' warning' : ''}" role="status">${feedback}</p>
       <button type="button" class="strong" data-next aria-label="${t('nextWaveName', { n: run.wave + 1 })}">${t('nextWave')}</button>
     </div>`;
  const treasureCount = { n: run.weapons.length, max: run.slots };
  const tabs = compact ? `<div class="market-tabs" role="group" aria-label="${t('marketSections')}">
       <button type="button" data-market-tab="offers" aria-controls="marketOffers" aria-pressed="${marketPane === 'offers'}" ${marketPane === 'offers' ? 'data-focus' : ''}>${t('offers')}</button>
       <button type="button" data-market-tab="gear" aria-controls="marketGear" aria-pressed="${marketPane === 'gear'}" ${marketPane === 'gear' ? 'data-focus' : ''}>${t('marketGear', treasureCount)}</button>
     </div>` : '';
  const root = sheet(
    panel,
    `<header class="market-head">
       <h2 id="shopHeading">${t(compact ? 'shopTitleCompact' : 'shopTitle', { n: run.wave })}</h2>
       <span class="pearl-wallet">${t('pearls', { n: run.pearls })}</span>
     </header>
     ${compact ? tabs : bar}
     <div class="market-content">
     <div id="marketOffers" data-market-pane="offers"${compact && marketPane !== 'offers' ? ' hidden' : ''}>
     ${compact ? '' : `<h3>${t('offers')}</h3>`}
     <div class="cards market-offers">${offers}</div>
     <div class="row"><button type="button" data-reroll aria-label="${t('rerollName', { price: rules.rerollPrice(run) })}" ${run.pearls < rules.rerollPrice(run) ? 'aria-disabled="true"' : ''}>${t('reroll', { price: rules.rerollPrice(run) })}</button></div>
     </div>
     <div id="marketGear" data-market-pane="gear"${compact && marketPane !== 'gear' ? ' hidden' : ''}>
     ${compact ? '' : `<h3>${t('yourTreasures', treasureCount)}</h3>`}
     <p class="quietText">${pickedWeapon ? t('selected', { name: `${weaponName(pickedWeapon)} · ${tierName(pickedWeapon)}` }) : t('mergeAdvice')}</p>
     <div class="slots">${slots}</div>
     ${pickedWeapon ? `<div class="row"><button type="button" data-sell ${run.weapons.length <= 1 ? 'aria-disabled="true"' : ''} aria-label="${escape(t('sellName', { name: weaponName(pickedWeapon), price: rules.sellPrice(run, picked) }))}">${t('sell', { price: rules.sellPrice(run, picked) })}</button><button type="button" data-cancel>${t('cancelPick')}</button></div>` : ''}
     <details class="market-details"${detailOpen ? ' open' : ''}><summary>${t('details')}</summary>
       <p class="quietText">${t('recipes')}${recipes}</p>
       <h3>${t('items')}</h3><div class="chips">${items || t('noItems')}</div>
       <h3>${t('stats')}</h3><div class="stats">${statRows}</div>
     </details>
     </div>
     </div>
     ${compact ? bar : ''}`
  );
  panel.setAttribute('aria-labelledby', 'shopHeading');
  for (const button of root.querySelectorAll('[data-market-tab]'))
    button.addEventListener('click', () => {
      if (marketPane === button.dataset.marketTab) return;
      marketPane = button.dataset.marketTab;
      sound('select');
      showShop(`[data-market-tab="${marketPane}"]`);
    });
  for (const button of root.querySelectorAll('[data-buy]'))
    button.addEventListener('click', () => {
      const result = rules.buy(run, Number(button.dataset.buy));
      const focus = `[data-buy="${button.dataset.buy}"]`;
      if (!result.ok) {
        marketMessage(result.why === 'pearls' ? 'notEnough' : result.why === 'full' ? 'full' : 'sold', undefined, true);
      } else if (result.merged) {
        sound('merge');
        marketMessage('merged', { name: weaponName(run.weapons[result.slot]) });
      } else {
        sound('acquire');
        marketMessage('boughtGood', { name: t(run.shop.offers[Number(button.dataset.buy)].kind) });
      }
      showShop(focus);
    });
  for (const button of root.querySelectorAll('[data-lock]'))
    button.addEventListener('click', () => {
      const index = Number(button.dataset.lock);
      if (run.shop.offers[index].sold) return;
      rules.toggleLock(run, index);
      sound('select');
      marketMessage(run.shop.offers[index].locked ? 'preserveOffer' : 'releaseOffer');
      showShop(`[data-lock="${button.dataset.lock}"]`);
    });
  root.querySelector('[data-reroll]').addEventListener('click', () => {
    if (rules.reroll(run).ok) {
      sound('select');
      marketMessage('restocked');
    } else marketMessage('notEnough', undefined, true);
    showShop('[data-reroll]');
  });
  root.querySelector('[data-next]').addEventListener('click', () => {
    app.picked = null;
    rules.nextWave(run);
    app.screen = 'play';
    openPanel(null);
    game.canvas.focus({ preventScroll: true });
    sound('wave');
    sound.music(run.boss ? 'boss' : 'battle', run.wave / WAVES);
    drawBar();
    say(t('wave', { n: run.wave, total: WAVES }));
  });
  for (const button of root.querySelectorAll('[data-slot]'))
    button.addEventListener('click', () => {
      const slot = Number(button.dataset.slot);
      if (app.picked === null || app.picked === slot) {
        app.picked = app.picked === slot ? null : slot;
        return showShop(`[data-slot="${slot}"]`);
      }
      const result = rules.merge(run, app.picked, slot);
      if (!result.ok) {
        app.picked = slot;
        return showShop(`[data-slot="${slot}"]`);
      }
      app.picked = null;
      sound(result.divine ? 'divine' : 'merge');
      marketMessage(result.divine ? 'divineMade' : 'merged', { name: t(result.kind) });
      if (result.divine && !game.reducedMotion) game.flash(0xe8b84a, 0.25);
      showShop(`[data-slot="${Math.min(result.slot, run.weapons.length - 1)}"]`);
    });
  root.querySelector('[data-sell]')?.addEventListener('click', () => {
    const slot = app.picked;
    const name = weaponName(run.weapons[app.picked]);
    if (!rules.sell(run, app.picked).ok) return;
    app.picked = null;
    sound('sell');
    marketMessage('soldGood', { name });
    showShop(`[data-slot="${Math.min(slot, run.weapons.length - 1)}"]`);
  });
  root.querySelector('[data-cancel]')?.addEventListener('click', () => {
    const slot = app.picked;
    app.picked = null;
    showShop(`[data-slot="${slot}"]`);
  });
  sound.music('market', 0.3);
  openPanel('shop', focus);
  if (compact) root.querySelector('.market-content').scrollTop = marketScroll[marketPane] ?? 0;
  else panel.scrollTop = marketScroll.desktop ?? 0;
}

compactMarket.addEventListener('change', () => {
  if (app.screen !== 'shop') return;
  const visiblePane = document.activeElement?.closest('[data-market-pane]');
  if (visiblePane) marketPane = visiblePane.dataset.marketPane;
  showShop();
});

// ---- Pause. ----
function openMenu(focus) {
  if (app.screen !== 'play') return;
  game.pause();
  sound.pause();
  app.screen = 'menu';
  const root = sheet(
    panels.menu,
    `<h2 id="menuHeading">${t('paused')}</h2>
     <p class="lead">${t('wave', { n: app.run.wave, total: WAVES })}</p>
     <div class="row sheet-actions"><button type="button" class="strong" data-do="resume">${t('resume')}</button><button type="button" data-do="quit">${t('quit')}</button></div>
     <h2>${t('settings')}</h2>${settingsHtml()}`
  );
  panels.menu.setAttribute('aria-labelledby', 'menuHeading');
  root.querySelector('[data-do=resume]').addEventListener('click', closeMenu);
  root.querySelector('[data-do=quit]').addEventListener('click', () => {
    game.resume();
    sound.resume();
    showTitle();
  });
  wireSettings(root, (selector) => {
    app.screen = 'play';
    openMenu(selector);
  });
  openPanel('menu', focus);
}
function closeMenu() {
  app.screen = 'play';
  openPanel(null);
  game.canvas.focus({ preventScroll: true });
  sound.resume();
  game.resume();
}

// ---- The end. ----
function finish() {
  const run = app.run;
  if (app.screen === 'end') return;
  const won = run.phase === 'won';
  let record = { best: false, unlocked: [] };
  const kept = save.update((data) => void (record = recordGame(data, run.hero, run.danger, run.wave, won)));
  if (!kept) notice = 'saveRefused';
  app.result = { won, wave: run.wave, kills: run.kills, level: run.level, merges: run.merges, divines: run.divines, ...record, kept };
  app.screen = 'end';
  stick.reset();
  $('#seaStick').hidden = true;
  $('#battleHint').hidden = true;
  sound.stopMusic();
  sound(won ? 'win' : 'lose');
  game.after(game.reducedMotion ? 0.2 : 1.2, showEnd);
}
function showEnd() {
  const r = app.result;
  if (!r || app.screen !== 'end') return;
  $('#hud').hidden = true;
  view.clear();
  const root = sheet(
    panels.end,
    `<div class="end-hero"><img src="assets/${app.hero}.webp" alt=""><div>
       <h2 id="endHeading" class="bigResult">${t(r.won ? 'won' : 'lost')}</h2>
       <p>${r.won ? t('wonNote') : t('lostNote', { wave: r.wave })}</p>
     </div></div>
     <dl class="run-totals">${[['wavesStat', r.wave], ['killsStat', r.kills], ['mergesStat', r.merges], ['divineStat', r.divines]].map(([label, count]) =>
       `<div><dt>${t(label)}</dt><dd>${count}</dd></div>`).join('')}</dl>
     ${r.best ? `<p><strong>${t('newBest')}</strong></p>` : ''}
     ${r.unlocked.map((hero) => `<p class="notice">${t('unlocked', { name: t(hero) })}</p>`).join('')}
     ${r.kept ? '' : `<p class="notice" role="status">${t('saveRefused')}</p>`}
     <div class="row"><button type="button" class="strong" data-do="again">${t('again')}</button><button type="button" data-do="title">${t('toTitle')}</button></div>`
  );
  panels.end.setAttribute('aria-labelledby', 'endHeading');
  root.querySelector('[data-do=again]').addEventListener('click', () => startGame());
  root.querySelector('[data-do=title]').addEventListener('click', () => showTitle());
  say(t(r.won ? 'won' : 'lost'));
  openPanel('end');
}

// ---- Keys. Play keeps Tab, Space and the arrows from the page; on the page's buttons they are let through to the
// browser first. Elsewhere the keys go on to play, which moves Nezha. ----
const KEPT = new Set(['Tab', ' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
window.addEventListener(
  'keydown',
  (event) => {
    const onButton = event.target instanceof HTMLElement && event.target.closest('button, .panel');
    if ((onButton || app.screen !== 'play') && KEPT.has(event.key)) event.stopPropagation();
    const key = event.key.toLowerCase();
    if (app.screen === 'play' && (key === 'escape' || key === 'p')) {
      event.preventDefault();
      openMenu();
    } else if ((app.screen === 'guide' || app.screen === 'options') && key === 'escape') {
      event.preventDefault();
      showTitle(`[data-open="${app.screen}"]`);
    } else if (app.screen === 'menu' && key === 'escape') {
      event.preventDefault();
      closeMenu();
    } else if (app.screen === 'levelUp' && /^[1-4]$/.test(key)) {
      event.preventDefault();
      chooseLevel(Number(key) - 1);
    } else if (app.screen === 'shop' && key === 'escape' && app.picked !== null) {
      const slot = app.picked;
      app.picked = null;
      showShop(marketPane === 'gear' || !compactMarket.matches ? `[data-slot="${slot}"]` : undefined);
    }
  },
  true
);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && app.screen === 'play') openMenu();
});

onLanguage(() => {
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  document.title = t('pageTitle');
  game.canvas.setAttribute('aria-label', t('stage'));
  if (app.screen === 'options') showOptions('[data-language]');
  else if (app.screen === 'title') showTitle();
  else if (app.screen === 'menu') {
    drawBar();
    app.screen = 'play';
    openMenu('[data-language]');
  }
});
await yieldStartup();
document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
document.title = t('pageTitle');
$('#loading').remove();
showTitle();
ready = true;

// For tests and for anyone curious, from the console.
window.nezhaSea = {
  app,
  rules,
  game,
  start: startGame,
  /** Draw the market again, after a test has changed the run by hand. */
  refresh: () => app.screen === 'shop' && showShop(),
  get screen() {
    return app.screen;
  },
  get ready() {
    return ready;
  }
};
