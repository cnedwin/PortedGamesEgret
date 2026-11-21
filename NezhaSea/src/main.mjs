// 页面入口：存档、语言、引擎的 play（画布、每帧、键盘手柄和手指的摇杆）、顶栏、升级、龙宫集市（买、留、换、卖、
// 合成）、暂停和结算。按钮都是页面自己的按钮；规则在 src/sim，这里只把操作交给它、把状态显示出来。
// The page's entry: the save, the language, the engine's play (the canvas, each frame, the keys, the gamepad and the
// finger's stick), the bar, the level-ups, the Dragon Palace market (buy, keep, restock, sell, merge), the pause and
// the end. Every control is a page button; the rules are in src/sim, and this only hands them what the player does
// and shows what they hold.
import { play } from '@egret/engine/play';
import { browserLanguages, browserSaveStorage, prefersReducedMotion } from '@egret/engine/web/kit';
import { getLanguage, onLanguage, setLanguage, startLanguage, t } from './i18n.mjs';
import { paintSea } from './ground.mjs';
import { openSave, recordGame } from './saves.mjs';
import { DANGER, DIVINE, FIELD, HEROES, HERO_KINDS, ITEMS, WAVES, xpToLevel } from './sim/data.mjs';
import * as rules from './sim/world.mjs';
import { createSound } from './sound.mjs';
import { createView } from './view.mjs';

const params = new URLSearchParams(location.search),
  $ = (selector) => document.querySelector(selector),
  field = $('#field'),
  panels = { title: $('#title'), levelUp: $('#levelUp'), shop: $('#shop'), menu: $('#menu'), end: $('#end') };

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
  setup(made) {
    game = made;
    view = createView(game);
    sound = createSound(game, { on: settings().sound, music: settings().music });
    // A finger held anywhere on the sea and dragged moves Nezha; it counts in game.keys.axis().
    game.touchStick({ radius: 56 });
  },
  update: (seconds) => frame(seconds),
  onError: (cause) => console.error(cause)
});
paintSea($('#ground'));
Object.assign(game.canvas.parentElement.style, { background: 'transparent', position: 'absolute', inset: '0', zIndex: '1' });
game.canvas.setAttribute('role', 'img');
game.canvas.setAttribute('aria-label', t('stage'));
if (settings().reducedMotion) game.reducedMotion = true;

// ---- Each frame: Nezha moves by the keys, the stick or the pad; the rules step; the view and the bar follow. ----
let sinceBar = 0;
function frame(seconds) {
  if (!ready || app.screen !== 'play' || !app.run) return;
  const run = app.run;
  const axis = game.keys.axis();
  const events = [];
  for (let left = seconds; left > 1e-6 && run.phase === 'wave'; left -= 1 / 30) events.push(...rules.step(run, Math.min(left, 1 / 30), axis));
  view.show(run, events, seconds);
  hear(events);
  sinceBar += seconds;
  if (sinceBar > 0.1 || events.some((e) => e.type === 'level' || e.type === 'hurt')) {
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
      sound('gong');
      say(t(event.kind === 'yaksha' ? 'bossYaksha' : 'bossAoBing'));
      game.toast(t(event.kind === 'yaksha' ? 'bossYaksha' : 'bossAoBing'), { seconds: 2.5, color: 0xf4ecd8 });
    } else if (event.type === 'waveEnd') sound('gong', { volume: 0.6 });
  }
  if (app.run && app.run.phase === 'wave') sound.music('battle', app.run.wave / WAVES);
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
  put($('#waveText'), `${t('wave', { n: run.wave, total: WAVES })} · ${boss ? t('bossLeft') : t('waveLeft', { s: Math.ceil(run.waveLeft) })}`);
  $('#xpBar span').style.transform = `scaleX(${Math.min(1, run.xp / xpToLevel(run.level))})`;
  put($('#levelText'), t('level', { n: run.level }));
  put($('#pearlText'), t('pearls', { n: run.pearls }));
  put($('#pauseButton'), t('pause'));
  $('#bossBar').hidden = !boss;
  if (boss) {
    $('#bossBar span').style.transform = `scaleX(${Math.max(0, boss.hp / boss.max)})`;
    put($('#bossText'), t(boss.kind === 'yaksha' ? 'yaksha' : 'aoBing'));
  }
}
$('#pauseButton').addEventListener('click', () => openMenu());

// ---- Screens. ----
function openPanel(name) {
  for (const [key, panel] of Object.entries(panels)) panel.hidden = key !== name;
  field.inert = name !== null;
  if (name) panels[name].querySelector('button:not([aria-disabled="true"])')?.focus();
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
  sound.music('calm', 0.2);
  if (game.paused) game.resume();
  $('#hud').hidden = true;
  const unlocked = save.data.unlocked;
  if (!unlocked.includes(app.hero)) app.hero = 'boy';
  const best = save.data.best;
  const heroes = HERO_KINDS.map((hero) => {
    const open = unlocked.includes(hero),
      reached = best[hero]?.[app.danger];
    const record = !open ? t(HEROES[hero].unlock === 'win' ? 'unlockWin' : 'unlockWave10') : reached > WAVES ? t('bestWon') : reached ? t('bestWave', { n: reached }) : t('noBest');
    return `<button type="button" class="card" data-hero="${hero}" aria-pressed="${app.hero === hero}" ${open ? '' : 'aria-disabled="true"'}><strong>${t(hero)}${open ? '' : ` · ${t('locked')}`}</strong><small>${t(`${hero}Note`)}</small><small class="price">${record}</small></button>`;
  }).join('');
  const dangers = DANGER.map((_, danger) => `<button type="button" class="card" data-danger="${danger}" aria-pressed="${app.danger === danger}"><strong>${t(`danger${danger}`)}</strong><small>${t(`danger${danger}Note`)}</small></button>`).join('');
  const root = sheet(
    panels.title,
    `<h1>${t('title')}</h1>
     <p>${t('tagline')}</p>
     <p class="quietText">${t('demo')}</p>
     ${notice ? `<p class="notice" role="status">${t(notice)}</p>` : ''}
     <div class="row"><button type="button" class="strong" data-start>${t('start')}</button></div>
     <h2>${t('chooseHero')}</h2><div class="cards">${heroes}</div>
     <h2>${t('chooseDanger')}</h2><div class="cards">${dangers}</div>
     <h2>${t('howTitle')}</h2>
     <ul><li>${t('how1')}</li><li>${t('how2')}</li><li>${t('how3')}</li></ul>
     <p class="quietText">${t('keysLine')}</p>
     <h2>${t('settings')}</h2>${settingsHtml()}`
  );
  root.querySelector('[data-start]').addEventListener('click', () => startGame());
  for (const button of root.querySelectorAll('[data-hero]'))
    button.addEventListener('click', () => {
      if (!unlocked.includes(button.dataset.hero)) return say(t('locked'));
      app.hero = button.dataset.hero;
      showTitle(`[data-hero="${app.hero}"]`);
    });
  for (const button of root.querySelectorAll('[data-danger]'))
    button.addEventListener('click', () => {
      app.danger = Number(button.dataset.danger);
      showTitle(`[data-danger="${app.danger}"]`);
    });
  wireSettings(root, (selector) => showTitle(selector));
  openPanel('title');
  if (focus) root.querySelector(focus)?.focus();
}

function startGame() {
  app.seed = (app.seed * 7 + 13) % 100000;
  app.run = rules.createRun({ seed: app.seed, hero: app.hero, danger: app.danger });
  app.result = null;
  app.picked = null;
  app.screen = 'play';
  view.clear();
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
     <p class="quietText">${t('levelUpHow')}</p>
     <div class="cards">${run.choices.map((choice, i) => `<button type="button" class="card" data-choice="${i}"><strong>${i + 1} · ${statsText(choice.stats)}</strong></button>`).join('')}</div>`
  );
  panels.levelUp.setAttribute('aria-labelledby', 'levelHeading');
  for (const button of root.querySelectorAll('[data-choice]')) button.addEventListener('click', () => chooseLevel(Number(button.dataset.choice)));
  sound.music('calm', 0.3);
  openPanel('levelUp');
}
function chooseLevel(index) {
  const run = app.run;
  if (!rules.chooseLevelUp(run, index).ok) return;
  app.screen = 'between';
  if (run.phase === 'levelUp') showLevelUp();
  else showShop();
}

// ---- The market. ----
function showShop(focus) {
  const run = app.run;
  app.screen = 'shop';
  drawBar();
  const stats = rules.statsOf(run);
  const offers = run.shop.offers
    .map((offer, i) => {
      const name = t(offer.kind),
        label = offer.type === 'weapon' ? `${name} · ${t('tier', { n: offer.tier + 1 })}` : name,
        note = offer.type === 'weapon' ? t(`${offer.kind}Note`) : statsText(ITEMS[offer.kind].stats),
        poor = run.pearls < offer.price;
      return `<div class="offer ${offer.type}${offer.sold ? ' sold' : ''}"><span class="name">${escape(label)}</span><small class="quietText">${escape(note)}</small>
        <div class="row"><button type="button" data-buy="${i}" ${offer.sold || poor ? 'aria-disabled="true"' : ''} aria-label="${escape(offer.sold ? t('sold') : t('buyName', { name: label, price: offer.price }))}">${offer.sold ? t('sold') : t('buy', { price: offer.price })}</button>
        <button type="button" data-lock="${i}" aria-pressed="${offer.locked}" ${offer.sold ? 'aria-disabled="true"' : ''} aria-label="${escape(t('lockName', { name: label }))}">${offer.locked ? t('unlock') : t('lock')}</button></div></div>`;
    })
    .join('');
  const picked = app.picked;
  const slots = Array.from({ length: run.slots }, (_, i) => {
    const weapon = run.weapons[i];
    if (!weapon) return `<button type="button" class="slot empty" aria-disabled="true">${t('emptySlot')}</button>`;
    const partner = picked !== null && picked !== i && rules.mergeResult(run, picked, i);
    const label = `${weaponName(weapon)} · ${tierName(weapon)}`;
    const name = partner ? t('mergeInto', { name: `${t(partner.kind)} · ${partner.divine ? t('divineTier') : t('tier', { n: partner.tier + 1 })}` }) : label;
    return `<button type="button" class="slot${weapon.divine ? ' divine' : ''}${partner ? ' partner' : ''}" data-slot="${i}" aria-pressed="${picked === i}" aria-label="${escape(name)}">${escape(weaponName(weapon))}<small>${escape(tierName(weapon))}</small></button>`;
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
  const root = sheet(
    panels.shop,
    `<h2 id="shopHeading">${t('shopTitle', { n: run.wave })} · ${t('pearls', { n: run.pearls })}</h2>
     <h2>${t('offers')}</h2><div class="cards">${offers}</div>
     <div class="row"><button type="button" data-reroll aria-label="${t('rerollName', { price: rules.rerollPrice(run) })}" ${run.pearls < rules.rerollPrice(run) ? 'aria-disabled="true"' : ''}>${t('reroll', { price: rules.rerollPrice(run) })}</button>
       <button type="button" class="strong" data-next aria-label="${t('nextWaveName', { n: run.wave + 1 })}">${t('nextWave')}</button></div>
     <h2>${t('yourTreasures', { n: run.weapons.length, max: run.slots })}</h2>
     <p class="quietText">${pickedWeapon ? t('selected', { name: `${weaponName(pickedWeapon)} · ${tierName(pickedWeapon)}` }) : t('tapToMerge')}</p>
     <div class="slots">${slots}</div>
     ${pickedWeapon ? `<div class="row"><button type="button" data-sell ${run.weapons.length <= 1 ? 'aria-disabled="true"' : ''} aria-label="${escape(t('sellName', { name: weaponName(pickedWeapon), price: rules.sellPrice(run, picked) }))}">${t('sell', { price: rules.sellPrice(run, picked) })}</button><button type="button" data-cancel>${t('cancelPick')}</button></div>` : ''}
     <p class="quietText">${t('recipes')}${recipes}</p>
     <h2>${t('items')}</h2><div class="chips">${items || t('noItems')}</div>
     <h2>${t('stats')}</h2><div class="stats">${statRows}</div>`
  );
  panels.shop.setAttribute('aria-labelledby', 'shopHeading');
  for (const button of root.querySelectorAll('[data-buy]'))
    button.addEventListener('click', () => {
      const result = rules.buy(run, Number(button.dataset.buy));
      if (!result.ok) return say(t(result.why === 'pearls' ? 'notEnough' : result.why === 'full' ? 'full' : 'sold'));
      if (result.merged) {
        sound('merge');
        say(t('merged', { name: weaponName(run.weapons[result.slot]) }));
      } else sound('pearl');
      showShop(`[data-buy="${button.dataset.buy}"]`);
    });
  for (const button of root.querySelectorAll('[data-lock]'))
    button.addEventListener('click', () => {
      rules.toggleLock(run, Number(button.dataset.lock));
      showShop(`[data-lock="${button.dataset.lock}"]`);
    });
  root.querySelector('[data-reroll]').addEventListener('click', () => {
    if (!rules.reroll(run).ok) return say(t('notEnough'));
    showShop('[data-reroll]');
  });
  root.querySelector('[data-next]').addEventListener('click', () => {
    app.picked = null;
    rules.nextWave(run);
    app.screen = 'play';
    openPanel(null);
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
      say(t(result.divine ? 'divineMade' : 'merged', { name: t(result.kind) }));
      if (result.divine && !game.reducedMotion) game.flash(0xe8b84a, 0.25);
      showShop(`[data-slot="${Math.min(result.slot, run.weapons.length - 1)}"]`);
    });
  root.querySelector('[data-sell]')?.addEventListener('click', () => {
    if (!rules.sell(run, app.picked).ok) return;
    app.picked = null;
    sound('pearl');
    showShop('[data-next]');
  });
  root.querySelector('[data-cancel]')?.addEventListener('click', () => {
    app.picked = null;
    showShop('[data-next]');
  });
  sound.music('calm', 0.3);
  openPanel('shop');
  if (focus) root.querySelector(focus)?.focus();
}

// ---- Pause. ----
function openMenu(focus) {
  if (app.screen !== 'play') return;
  game.pause();
  app.screen = 'menu';
  const root = sheet(
    panels.menu,
    `<h2 id="menuHeading">${t('paused')}</h2>
     <div class="row"><button type="button" class="strong" data-do="resume">${t('resume')}</button><button type="button" data-do="quit">${t('quit')}</button></div>
     <h2>${t('settings')}</h2>${settingsHtml()}`
  );
  panels.menu.setAttribute('aria-labelledby', 'menuHeading');
  root.querySelector('[data-do=resume]').addEventListener('click', closeMenu);
  root.querySelector('[data-do=quit]').addEventListener('click', () => {
    game.resume();
    showTitle();
  });
  wireSettings(root, (selector) => {
    app.screen = 'play';
    openMenu(selector);
  });
  openPanel('menu');
  if (focus) root.querySelector(focus)?.focus();
}
function closeMenu() {
  app.screen = 'play';
  openPanel(null);
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
  sound.stopMusic();
  game.sfx.play(won ? 'win' : 'lose');
  game.after(game.reducedMotion ? 0.2 : 1.2, showEnd);
}
function showEnd() {
  const r = app.result;
  if (!r || app.screen !== 'end') return;
  $('#hud').hidden = true;
  view.clear();
  const root = sheet(
    panels.end,
    `<h2 id="endHeading" class="bigResult">${t(r.won ? 'won' : 'lost')}</h2>
     <p>${r.won ? t('wonNote') : t('lostNote', { wave: r.wave })}</p>
     <p>${t('runNote', { kills: r.kills, level: r.level, merges: r.merges, divines: r.divines })}</p>
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
    if (onButton && KEPT.has(event.key)) event.stopPropagation();
    const key = event.key.toLowerCase();
    if (app.screen === 'play' && (key === 'escape' || key === 'p')) {
      event.preventDefault();
      openMenu();
    } else if (app.screen === 'menu' && key === 'escape') {
      event.preventDefault();
      closeMenu();
    } else if (app.screen === 'levelUp' && /^[1-4]$/.test(key)) {
      event.preventDefault();
      chooseLevel(Number(key) - 1);
    } else if (app.screen === 'shop' && key === 'escape' && app.picked !== null) {
      app.picked = null;
      showShop('[data-next]');
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
  if (app.screen === 'title') showTitle('[data-language]');
  else if (app.screen === 'menu') {
    app.screen = 'play';
    openMenu('[data-language]');
  }
});
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
