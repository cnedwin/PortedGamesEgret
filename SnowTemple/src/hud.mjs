// Everything written over the picture: the hero's bars, Lu Qian's, the row of deeds, the bag, the notes,
// speech and title cards, the settings and the controls for hands on glass.
import { DEEDS, DEFAULT_KEYS, keyName, createPointerOwner } from './input.mjs';
import { BOONS } from './rules/boons.mjs';
import { TIERS, tierName } from './rules/tiers.mjs';
import { GRADES, HERO, LOOT } from './rules/tune.mjs';
import { AFFIXES } from './rules/yard.mjs';

// Small line drawings for the deeds, each on a 40 by 40 field.
const ICONS = {
  attack: '<path d="m6 34 24-24M24 11l12-7-7 12-2-3z" fill="currentColor"/><path d="M23 17v6m-1-5-6 1"/>',
  counter: '<path d="M33 8A14 14 0 1 0 26 33M33 8v8m0-8h-8"/><path d="m12 27 15-15m-7 1 11-4-5 11"/>',
  guard: '<path d="M20 4 32 9v9c0 7-5 12-12 17C13 30 8 25 8 18V9z"/><path d="m12 21 15-10m-5 1 8-2-4 7m-13-1 4 5"/>',
  stars: '<path d="m21 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2z" fill="currentColor"/><path d="m11 16 2 5 5 2-5 2-2 5-2-5-5-2 5-2zm17 5 2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/>',
  rain: '<path d="M20 3v24M10 7v14m20-14v14M7 18l3 4 3-4m4 6 3 4 3-4m4-6 3 4 3-4"/><path d="M5 34c6-5 24-5 30 0"/>',
  dodge: '<path d="M10 28h10l7-4 6 1v5l-8 3H10zM16 28l3-11 7 2-1 6M4 23h8M5 16h9"/><path d="M27 8h9l-4-4m4 4-4 4"/>',
  glide: '<path d="M5 29c10 3 20 0 30-7M5 35c10 1 16-1 23-4M18 3v17m-7-13 14 9m0-9-14 9m16-3h6"/>',
  drink: '<path d="M17 4h6v5h-6zM17 9v3c-6 0-8 7-3 10-5 2-8 4-8 8 0 4 6 6 14 6s14-2 14-6c0-4-3-6-8-8 5-3 3-10-3-10V9m-9 14h12"/><path d="M12 30c3 2 6 2 7 2"/>'
};
const DEED_NAMES = { attack: '出枪', guard: '格挡（按住）', stars: '寒星', rain: '梨花枪雨', dodge: '闪避', glide: '踏雪（按住）', drink: '饮酒', up: '向上', down: '向下', left: '向左', right: '向右', bag: '行囊' };
const ACTION_LABELS = { attack: '出枪', guard: '格挡', stars: '寒星', rain: '枪雨', dodge: '闪避', glide: '踏雪', drink: '饮酒' };
const GOALS = { road: '往草料场去', yard: '清掉草料场里的人', gate: '上山神庙', boss: '', done: '' };
const LOOT_MARKS = { coin: '钱', silver: '银', salve: '药', tonic: '丹', page: '谱' };
const COUNT = '零一二三四五六七八九十';
/** A tier as it is written: 第三重　火箭. */
const tierLine = (tier) => `第${COUNT[tier] ?? tier}重　${tierName(tier)}`;

const el = (tag, attrs = {}, html = '') => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  node.innerHTML = html;
  return node;
};
const icon = (name, className = '') => `<svg class="${className}" viewBox="0 0 40 40" aria-hidden="true">${ICONS[name]}</svg>`;
const actionFace = (name) => `${icon(name, 'action-icon')}${name === 'attack' ? icon('counter', 'counter-icon') : ''}<span class="action-label">${ACTION_LABELS[name]}</span>`;
const bar = (kind) => `<div class="bar ${kind}">${kind === 'hp' ? '<i class="lag"></i>' : ''}<i class="fill"></i></div>`;

export function createHud(root, input, settings, { onSettings, onStart, onUiSound, onTier, onPick }) {
  root.innerHTML = `
    <div class="shade top"></div><div class="shade low"></div>
    <div id="hurt"></div>
    <div class="pips hud"></div>
    <div id="me" class="hud">${bar('hp')}${bar('st')}${bar('will')}<div class="row"><div class="purse"><span>银钱</span><b>0</b></div><div class="state"><span data-chip="wine" hidden></span><span data-chip="edge" hidden>乘隙</span><span data-chip="full" title="葫芦一口未动，枪意涨得快" hidden>满壶<i>养气</i></span></div></div><div class="lore"></div></div>
    <div id="goal" class="hud"></div>
    <div id="lord" class="hud"><div class="who"><b></b><span></span></div>${bar('hp')}<div class="bar posture"><i class="fill"></i></div></div>
    <div id="notes" class="hud"></div>
    <div id="battle-hint" class="hud" role="status"><div class="hint-symbol" hidden></div><div class="hint-copy"><kbd></kbd><span></span></div></div>
    <div id="deeds" class="hud"></div>
    <div id="pack" class="hud"><ul></ul><button class="tag" type="button">行囊<b>0</b><kbd></kbd></button></div>
    <div id="stick" class="touch hud"><i></i></div><div id="pads" class="touch hud"></div>
    <div id="speech"></div>
    <div id="card"><b></b><i></i><span></span></div>
    <div id="veil"></div>
    <div id="title"><h1 class="name">风雪山神庙</h1><div class="seal">水浒　第一回</div><div class="entry"><div class="climb" hidden><button type="button" data-tier="-1" aria-label="低一重">‹</button><div class="tier"><b></b><small></small></div><button type="button" data-tier="1" aria-label="高一重">›</button></div><div class="ways"><button class="go" type="button" data-way="chapter" disabled>踏雪上路<span aria-hidden="true">›</span></button><button class="stand" type="button" data-way="yard" disabled>守草料场<small></small></button></div><div class="keys"><span class="key"></span><span class="tap">左手移动　右手出枪、格挡和闪避</span></div></div></div>
    <div id="page" role="dialog" aria-label="枪谱残页" hidden><div class="leaf"><h2>枪谱残页</h2><p>还认得出三行，择一而习。</p><div class="lessons"></div></div></div>
    <div class="corner"><button type="button" data-do="full">全屏</button><button type="button" data-do="set">设置</button></div>
    <div class="panel" id="settings" role="dialog" aria-label="设置" tabindex="-1"></div>
    <div id="debug"></div>`;
  const $ = (selector) => root.querySelector(selector);
  const hud = { staged: false };

  // ---- the row of deeds, for keys and for thumbs ---------------------------------------------
  const deeds = {},
    pads = {},
    padOwners = [];
  const order = DEEDS;
  for (const name of order) {
    const node = el('div', { class: 'deed', 'data-deed': name, title: DEED_NAMES[name] }, `<i class="wait"></i>${actionFace(name)}<kbd></kbd>${name === 'drink' ? '<em>3</em>' : ''}`);
    $('#deeds').append(node);
    deeds[name] = node;
  }
  const PAD_PLACES = { attack: [0, 0], dodge: [96, 6], guard: [66, 92], stars: [0, 98], rain: [8, 170], drink: [136, 112], glide: [164, 40] };
  for (const name of order) {
    const node = el('button', { class: 'pad', 'data-deed': name, type: 'button', 'aria-label': DEED_NAMES[name] }, `${actionFace(name)}${name === 'drink' ? '<em>3</em>' : ''}`);
    if (name === 'attack') node.classList.add('main');
    node.style.setProperty('--pad-right', PAD_PLACES[name][0]);
    node.style.setProperty('--pad-bottom', PAD_PLACES[name][1]);
    const owner = createPointerOwner();
    padOwners.push(owner);
    node.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (!owner.claim(event.pointerId)) return;
      node.setPointerCapture(event.pointerId);
      input.hold(name, true);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) node.addEventListener(type, (event) => {
      if (owner.release(event.pointerId)) input.hold(name, false);
    });
    $('#pads').append(node);
    pads[name] = node;
  }
  const attackLabels = [deeds.attack, pads.attack].map(node => node.querySelector('.action-label'));
  function labelKeys() {
    for (const name of order) deeds[name].querySelector('kbd').textContent = keyName(input.keys[name]);
    $('#pack kbd').textContent = keyName(input.keys.bag);
    const k = (name) => keyName(input.keys[name]);
    $('#title .key').textContent = `${k('up')} ${k('left')} ${k('down')} ${k('right')} 移动　${k('attack')}出枪　按住${k('guard')}格挡　${k('dodge')}闪避`;
  }
  labelKeys();

  // The stick appears where the thumb comes down.
  const stick = $('#stick'),
    knob = stick.querySelector('i');
  const stickOwner = createPointerOwner();
  let stickFrom = null;
  stick.addEventListener('pointerdown', (event) => {
    if (!stickOwner.claim(event.pointerId)) return;
    stick.setPointerCapture(event.pointerId);
    stickFrom = [event.clientX, event.clientY];
    const box = stick.getBoundingClientRect();
    knob.style.left = event.clientX - box.left + 'px';
    knob.style.top = event.clientY - box.top + 'px';
    stick.classList.add('on');
  });
  stick.addEventListener('pointermove', (event) => {
    if (!stickFrom || !stickOwner.owns(event.pointerId)) return;
    let dx = (event.clientX - stickFrom[0]) / 48,
      dy = (event.clientY - stickFrom[1]) / 48;
    const d = Math.hypot(dx, dy);
    if (d > 1) (dx /= d), (dy /= d);
    knob.style.setProperty('--x', dx * 34 + 'px');
    knob.style.setProperty('--y', dy * 34 + 'px');
    input.setStick(d < 0.2 ? 0 : dx, d < 0.2 ? 0 : dy);
  });
  const resetStick = () => {
    stickOwner.reset();
    stickFrom = null;
    stick.classList.remove('on');
    knob.style.setProperty('--x', '0px');
    knob.style.setProperty('--y', '0px');
    input.setStick(0, 0);
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(type, (event) => {
    if (stickOwner.release(event.pointerId)) resetStick();
  });
  input.on('reset', () => {
    resetStick();
    for (const owner of padOwners) owner.reset();
    if (hud.settingsOpen?.()) drawSettings();
  });

  // ---- bag ----------------------------------------------------------------------------------
  const pack = $('#pack');
  const flights = new Map();
  const toggleBag = () => onUiSound(pack.classList.toggle('open') ? 'open' : 'close');
  pack.querySelector('.tag').addEventListener('click', toggleBag);
  input.on('bag', toggleBag);
  hud.clearPickups = () => {
    for (const animation of flights.values()) animation.cancel();
    for (const node of flights.keys()) node.remove();
    flights.clear();
  };
  hud.flyPickup = (kind, grade, x, y) => {
    if (![x, y].every(value => Number.isFinite(value) && value >= 0 && value <= 1) ||
      matchMedia('(prefers-reduced-motion: reduce)').matches || !Element.prototype.animate) return false;
    const bounds = root.getBoundingClientRect(), target = pack.querySelector('.tag').getBoundingClientRect();
    if (!bounds.width || !target.width) return false;
    if (flights.size >= 8) {
      const [node, old] = flights.entries().next().value;
      old.cancel();
      node.remove();
      flights.delete(node);
    }
    const startX = x * bounds.width, startY = y * bounds.height,
      dx = target.left - bounds.left + target.width / 2 - startX,
      dy = target.top - bounds.top + target.height / 2 - startY;
    const node = el('span', { class: 'loot-flight', 'data-grade': grade, 'aria-hidden': 'true' });
    node.textContent = LOOT_MARKS[kind] ?? '物';
    node.style.left = startX + 'px';
    node.style.top = startY + 'px';
    root.append(node);
    const animation = node.animate([
      { transform: 'translate(-50%, -50%) scale(.7)', opacity: 0.65 },
      { offset: 0.42, transform: `translate(calc(-50% + ${dx * 0.4}px), calc(-50% + ${dy * 0.42 - 37}px)) scale(1.1)`, opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.3)`, opacity: 0.12 }
    ], { duration: 445, easing: 'cubic-bezier(.24,.4,.45,1)' });
    flights.set(node, animation);
    animation.onfinish = () => {
      if (flights.delete(node)) hud.bump();
      node.remove();
    };
    return true;
  };
  function fillBag(game) {
    const rows = Object.keys(LOOT)
      .filter((kind) => game.bag[kind] > 0)
      .map((kind) => `<li data-grade="${LOOT[kind].grade}"><span>${LOOT[kind].name}　${GRADES[LOOT[kind].grade]}</span><b>${game.bag[kind]}</b></li>`);
    const learned = game.boons.map((id) => `<li class="learned"><span>${BOONS[id].name}</span><small>${BOONS[id].text}</small></li>`);
    pack.querySelector('ul').innerHTML = (rows.join('') || '<li><span>空</span></li>') + learned.join('');
    pack.querySelector('.tag b').textContent = Object.values(game.bag).reduce((a, b) => a + b, 0);
  }

  // ---- notes, speech, cards -----------------------------------------------------------------
  hud.note = (text, grade = 0) => {
    const node = el('div', { class: 'note', 'data-grade': grade });
    node.textContent = text;
    $('#notes').append(node);
    setTimeout(() => node.remove(), 3700);
    while ($('#notes').children.length > 5) $('#notes').firstChild.remove();
  };
  const battleHint = $('#battle-hint');
  const hintSymbol = battleHint.querySelector('.hint-symbol');
  const hintKey = battleHint.querySelector('kbd');
  const hintText = battleHint.querySelector('span');
  const coarse = matchMedia('(pointer: coarse)');
  let now = 0, hintUntil = 0, hintAction = null;
  hud.hint = (text, action = null) => {
    hintUntil = now + 4.2;
    hintAction = action;
    const mark = action === 'attack' ? 'counter' : action;
    const label = mark === 'counter' ? '反击' : ACTION_LABELS[action];
    hintKey.hidden = !mark;
    hintKey.textContent = mark ? `${label}${coarse.matches ? '' : ` · ${keyName(input.keys[action])}`}` : '';
    hintSymbol.hidden = !mark;
    hintSymbol.innerHTML = mark ? icon(mark) : '';
    battleHint.dataset.action = mark ?? '';
    hintText.textContent = text;
    battleHint.classList.add('on');
  };
  hud.clearHint = () => {
    hintAction = null;
    hintUntil = 0;
    battleHint.classList.remove('on');
    hintText.textContent = '';
    hintKey.hidden = true;
    hintSymbol.hidden = true;
  };
  hud.hinting = () => hintUntil > now;
  let speechTimer = 0;
  hud.say = (text, who = '', time = 3) => {
    const node = $('#speech');
    node.innerHTML = '';
    if (who) node.append(el('small', {}, who));
    node.append(document.createTextNode(text));
    node.classList.add('on');
    clearTimeout(speechTimer);
    speechTimer = setTimeout(() => node.classList.remove('on'), time * 1000);
  };
  hud.clearSpeech = () => {
    clearTimeout(speechTimer);
    $('#speech').classList.remove('on');
  };
  let cardTimer = 0;
  hud.card = (title, under = '', time = 3.2) => {
    const node = $('#card');
    node.querySelector('b').textContent = title;
    node.querySelector('span').textContent = under;
    node.classList.add('on');
    clearTimeout(cardTimer);
    cardTimer = setTimeout(() => node.classList.remove('on'), time * 1000);
  };
  hud.veil = (on) => $('#veil').classList.toggle('on', on);
  hud.stage = (on) => {
    hud.staged = on;
    root.classList.toggle('staged', on);
  };
  hud.bump = () => {
    pack.classList.add('bump');
    setTimeout(() => pack.classList.remove('bump'), 220);
  };
  hud.hurt = () => {
    const node = $('#hurt');
    node.animate([{ opacity: 0.75 }, { opacity: 0 }], { duration: 520, easing: 'ease-out' });
  };

  // ---- title and settings -------------------------------------------------------------------
  // A click anywhere on the title takes the road; the two small arrows choose how high to climb, and the
  // second button holds the yard instead.
  $('#title').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button?.dataset.tier) return onTier(Number(button.dataset.tier));
    onStart(button?.dataset.way ?? 'chapter');
  });
  root.classList.add('idle');
  hud.hideTitle = () => {
    $('#title').classList.add('gone');
    $('#title').inert = true;
    root.classList.remove('idle');
  };
  hud.showTitle = () => {
    $('#title').classList.remove('gone');
    $('#title').inert = false;
    root.classList.add('idle');
  };
  hud.ready = () => {
    for (const button of root.querySelectorAll('#title [data-way]')) button.disabled = false;
  };
  /** What the title offers: the tier chosen, how high the climb is open, the best marks, the farthest wave. */
  hud.entry = ({ tier, open, marks, wave }) => {
    const climb = $('#title .climb');
    climb.hidden = open <= 1;
    climb.querySelector('b').textContent = tierLine(tier) + (marks[tier] ? `　${marks[tier]}等` : '');
    climb.querySelector('small').textContent = tier > TIERS.length ? '所有人更耐打，下手更重。' : TIERS[tier - 1].text;
    climb.querySelector('[data-tier="-1"]').disabled = tier <= 1;
    climb.querySelector('[data-tier="1"]').disabled = tier >= open;
    $('#title .stand small').textContent = wave > 0 ? `最远第 ${wave} 拨` : '一拨接一拨，倒下为止';
  };

  // ---- a page of the manual: three lessons, one to take ---------------------------------------
  const page = $('#page');
  let pageSince = 0;
  const pick = (index) => {
    // Hands still busy with the fight must not choose by accident.
    if (page.hidden || performance.now() - pageSince < 420 || !page.querySelector(`[data-pick="${index}"]`)) return;
    page.hidden = true;
    onPick(index);
  };
  hud.choose = (options) => {
    page.querySelector('.lessons').innerHTML = options
      .map((id, i) => `<button type="button" data-pick="${i}"><kbd>${i + 1}</kbd><b>${BOONS[id].name}</b><span>${BOONS[id].text}</span></button>`)
      .join('');
    page.hidden = false;
    pageSince = performance.now();
  };
  hud.closeChoice = () => (page.hidden = true);
  hud.choosing = () => !page.hidden;
  page.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pick]');
    if (button) pick(Number(button.dataset.pick));
  });
  addEventListener('keydown', (event) => {
    const digit = /^(?:Digit|Numpad)([1-3])$/.exec(event.code);
    if (digit && !page.hidden && !event.repeat) pick(Number(digit[1]) - 1);
  });

  const panel = $('#settings');
  const CHOICES = {
    quality: ['画质', '自动会按帧率升降；选定后固定不变。高档草更密、阴影更清晰、分辨率更高。', [['auto', '自动'], ['low', '低'], ['mid', '中'], ['high', '高']]],
    models: ['模型', '人物、兵器和建筑的精细程度。高档约 23MB，脸和手最细，带布纹和皮肤细节；低档适合手机。重新载入后生效。', [['auto', '自动'], ['low', '低'], ['mid', '中'], ['high', '高']]],
    particles: ['粒子', '枪光火星、雪尘和飘雪的数量。', [['few', '少'], ['some', '标准'], ['many', '多']]],
    sound: ['声音', '风声、配乐和兵刃声。', [['off', '关'], ['on', '开']]]
  };
  function drawSettings() {
    const rows = Object.entries(CHOICES)
      .map(([key, [name, hint, options]]) => `<div class="row"><div>${name}<small>${hint}</small></div><div class="pick">${options.map(([value, label]) => `<button type="button" data-set="${key}" data-value="${value}" class="${settings[key] === value ? 'on' : ''}">${label}</button>`).join('')}</div></div>`)
      .join('');
    const keys = Object.keys(DEFAULT_KEYS)
      .map((action) => `<div class="row"><div>${DEED_NAMES[action]}</div><button type="button" class="key" data-key="${action}">${keyName(input.keys[action])}</button></div>`)
      .join('');
    panel.innerHTML = `<h2>设置</h2>${rows}<div class="row"><small>模型、画质里的草和粒子里的飘雪在重新载入后生效。</small><button type="button" class="act" data-do="reload">重新载入</button></div><h3>按键</h3>${keys}<div class="foot"><button type="button" class="act" data-do="defaults">恢复默认</button><button type="button" class="act" data-do="close">关闭</button></div>`;
  }
  root.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    const { set, value, key } = target.dataset,
      act = target.dataset.do;
    if (set) {
      settings[set] = value;
      onSettings(settings);
      onUiSound('select');
      drawSettings();
    } else if (key) {
      onUiSound('select');
      target.classList.add('asking');
      target.textContent = '请按键…';
      input.ask((code) => {
        // A key already in use changes places with the one it displaces.
        const other = Object.keys(input.keys).find((action) => input.keys[action] === code);
        if (other) input.keys[other] = input.keys[key];
        input.keys[key] = code;
        onSettings(settings);
        onUiSound('confirm');
        labelKeys();
        drawSettings();
      });
    } else if (act === 'set') {
      drawSettings();
      const open = panel.classList.toggle('on');
      input.setEnabled(!open);
      onUiSound(open ? 'open' : 'close');
      // Once settings opens, Space must not activate the toolbar toggle a second time.
      if (open) panel.focus({ preventScroll: true });
    } else if (act === 'close') {
      panel.classList.remove('on');
      input.setEnabled(true);
      onUiSound('close');
    } else if (act === 'reload') location.reload();
    else if (act === 'defaults') {
      Object.assign(input.keys, DEFAULT_KEYS);
      onSettings(settings);
      onUiSound('confirm');
      labelKeys();
      drawSettings();
    } else if (act === 'full') {
      onUiSound('select');
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    }
  });
  hud.settingsOpen = () => panel.classList.contains('on');

  // ---- every frame --------------------------------------------------------------------------
  const scale = (node, k) => (node.style.transform = `scaleX(${Math.max(0, Math.min(1, k))})`);
  const me = { hp: $('#me .hp .fill'), lag: $('#me .hp .lag'), st: $('#me .st .fill'), will: $('#me .will .fill'), willBar: $('#me .will'), purse: $('#me .purse b') },
    lord = { box: $('#lord'), hp: $('#lord .hp .fill'), lag: $('#lord .hp .lag'), posture: $('#lord .posture .fill'), name: $('#lord .who b'), title: $('#lord .who span') },
    pips = $('.pips'),
    pipNodes = new Map();
  const chips = Object.fromEntries([...root.querySelectorAll('#me [data-chip]')].map((node) => [node.dataset.chip, node])),
    lore = $('#me .lore');
  let bagCount = -1,
    goal = null,
    loreOf = null,
    loreCount = -1,
    wine = -1;
  hud.update = (game, view) => {
    now = game.time;
    const hero = game.hero;
    scale(me.hp, hero.hp / HERO.hp);
    scale(me.lag, hero.hp / HERO.hp);
    scale(me.st, hero.stamina / HERO.stamina);
    scale(me.will, hero.will / HERO.will);
    me.willBar.classList.toggle('full', hero.will >= HERO.will);
    me.purse.textContent = game.coins;
    // What he is to do: in the yard stand, which wave; on the climb, how high.
    // The wave or the tier goes on a line of its own, so the goal stays short beside the bars on a narrow screen.
    const what = game.mode === 'yard' ? '守住草料场' : GOALS[game.stage],
      under = game.mode === 'yard' ? (game.wave ? `第 ${game.wave} 拨` : '') : what && game.tier > 1 ? tierLine(game.tier) : '';
    if (goal !== what + under) {
      goal = what + under;
      const node = $('#goal');
      node.textContent = what;
      if (under) node.append(el('small', {}, under));
      node.hidden = !what;
    }
    // Wine in him, an opening after a slip, a gourd not yet touched; and what the pages have taught.
    const tipsy = Math.ceil(hero.tipsy);
    if (wine !== tipsy) {
      wine = tipsy;
      chips.wine.hidden = tipsy <= 0;
      chips.wine.textContent = `酒意 ${tipsy}`;
    }
    chips.edge.hidden = hero.edge <= 0;
    chips.full.hidden = hero.gourd < hero.maxGourd;
    if (loreOf !== game || loreCount !== game.boons.length) {
      loreOf = game;
      loreCount = game.boons.length;
      lore.innerHTML = game.boons.map((id) => `<span title="${BOONS[id].text}">${BOONS[id].name}</span>`).join('');
      bagCount = -1; // the bag lists them too
    }
    const lu = game.boss,
      fighting = game.stage === 'boss' && lu.state !== 'dead';
    lord.box.classList.toggle('on', fighting);
    if (fighting) {
      lord.name.textContent = lu.sheet.name;
      lord.title.textContent = lu.sheet.title;
      scale(lord.hp, lu.hp / lu.maxHp);
      scale(lord.lag, lu.hp / lu.maxHp);
      lord.posture.style.transform = `scaleX(${lu.state === 'down' ? 1 : lu.posture / lu.sheet.posture})`;
      lord.posture.style.background = lu.state === 'down' ? '#fff' : '';
    }
    // The deeds: what is spent, what waits, what is ready.
    const set = (name, { wait = 0, charge, off = false, ready = false, now = false, count } = {}) => {
      for (const node of [deeds[name], pads[name]]) {
        node.classList.toggle('off', off);
        node.classList.toggle('ready', ready);
        node.classList.toggle('now', now);
        const mask = node.querySelector('.wait');
        if (mask) mask.style.setProperty('--wait', wait);
        if (count !== undefined) node.querySelector('em').textContent = count;
      }
      if (charge !== undefined) pads[name].style.setProperty('--charge', charge.toFixed(3));
    };
    const counter = hero.counter > 0 && hero.state !== 'dead';
    const attackLabel = counter ? '反击' : ACTION_LABELS.attack;
    if (attackLabels[0].textContent !== attackLabel) {
      for (const label of attackLabels) label.textContent = attackLabel;
      const full = counter ? '回马枪' : DEED_NAMES.attack;
      deeds.attack.title = full;
      pads.attack.setAttribute('aria-label', full);
    }
    if (hintUntil && (now >= hintUntil || (hintAction === 'attack' && hero.state === 'riposte'))) hud.clearHint();
    set('attack', { ready: counter, now: hero.state === 'cut' || hero.state === 'riposte', charge: Math.min(1, hero.counter / HERO.guard.counter) });
    set('guard', { off: hero.stamina <= 0, now: hero.state === 'guard' });
    set('stars', { wait: hero.starsWait / HERO.stars.cooldown, off: hero.starsWait > 0, charge: 1 - hero.starsWait / HERO.stars.cooldown });
    set('rain', { off: hero.will < HERO.will, ready: hero.will >= HERO.will, wait: 1 - hero.will / HERO.will, charge: hero.will / HERO.will });
    set('dodge', { off: hero.stamina < HERO.dodge.cost * 0.5, now: hero.state === 'dodge' });
    set('glide', { off: hero.stamina <= 1, now: hero.state === 'glide' });
    set('drink', { off: hero.gourd <= 0, count: hero.gourd });
    const total = Object.values(game.bag).reduce((a, b) => a + b, 0);
    if (total !== bagCount) {
      bagCount = total;
      fillBag(game);
    }
    // A small bar over each hired man who has been hurt.
    const seen = new Set();
    for (const foe of game.foes) {
      // A leader is named from the moment he walks in.
      if (foe.kind === 'lu' || foe.state === 'dead' || (foe.hp >= foe.maxHp && !foe.elite)) continue;
      const [sx, sy, depth] = view.screen(foe.x, 2.25, foe.z);
      if (depth > 1 || sx < 0 || sx > 1) continue;
      let node = pipNodes.get(foe.id);
      if (!node) {
        node = el('div', { class: foe.elite ? 'pip lead' : 'pip', ...(foe.elite ? { 'data-name': AFFIXES[foe.elite].name } : {}) }, '<i></i>');
        pips.append(node);
        pipNodes.set(foe.id, node);
      }
      node.style.left = sx * 100 + '%';
      node.style.top = sy * 100 + '%';
      scale(node.firstChild, foe.hp / foe.maxHp);
      seen.add(foe.id);
    }
    for (const [id, node] of pipNodes)
      if (!seen.has(id)) {
        node.remove();
        pipNodes.delete(id);
      }
  };
  hud.debug = (text) => {
    const node = $('#debug');
    node.style.display = text ? 'block' : 'none';
    node.textContent = text ?? '';
  };
  return hud;
}
