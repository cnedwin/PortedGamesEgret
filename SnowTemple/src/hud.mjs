// Everything written over the picture: the hero's bars, Lu Qian's, the row of deeds, the bag, the notes,
// speech and title cards, the settings and the controls for hands on glass.
import { DEEDS, DEFAULT_KEYS, keyName } from './input.mjs';
import { GRADES, HERO, LOOT } from './rules/tune.mjs';

// Small line drawings for the deeds, each on a 40 by 40 field.
const ICONS = {
  attack: '<path d="M7 33 30 10"/><path d="M30 10l5-6-1.5 8.5z" fill="currentColor"/><circle cx="27" cy="13" r="2.6"/>',
  guard: '<path d="M6 14 34 26"/><path d="M12 30c8-2 14-8 16-20"/><path d="M9 21l3 3M27 15l3 3"/>',
  stars: '<path d="M6 30 20 16M12 34 26 20M4 22 18 8"/><path d="M20 16l4-5M26 20l5-4M18 8l3-5"/>',
  rain: '<circle cx="20" cy="22" r="13"/><path d="M20 3v19M11 7v12M29 7v12M14 31l6-9 6 9"/>',
  dodge: '<path d="M8 28c8 2 14-2 18-10"/><path d="M26 18l-6 1M26 18l1 6"/><path d="M6 20h7M4 14h9"/>',
  glide: '<path d="M5 26c10-2 20-8 30-18"/><path d="M8 32h18M12 20h6"/><path d="M35 8l-7 1M35 8l-1 7"/>',
  drink: '<circle cx="20" cy="26" r="9"/><circle cx="20" cy="13" r="5"/><path d="M20 8V4M17 4h6"/>'
};
const DEED_NAMES = { attack: '出枪', guard: '格挡（按住）', stars: '寒星', rain: '梨花枪雨', dodge: '闪避', glide: '踏雪（按住）', drink: '饮酒', up: '向上', down: '向下', left: '向左', right: '向右', bag: '行囊' };
const GOALS = { road: '往草料场去', yard: '清掉草料场里的人', gate: '上山神庙', boss: '', done: '' };

const el = (tag, attrs = {}, html = '') => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  node.innerHTML = html;
  return node;
};
const icon = (name) => `<svg viewBox="0 0 40 40" color="currentColor">${ICONS[name]}</svg>`;
const bar = (kind) => `<div class="bar ${kind}">${kind === 'hp' ? '<i class="lag"></i>' : ''}<i class="fill"></i></div>`;

export function createHud(root, input, settings, { onSettings, onStart }) {
  root.innerHTML = `
    <div class="shade top"></div><div class="shade low"></div>
    <div id="hurt"></div>
    <div class="pips hud"></div>
    <div id="me" class="hud">${bar('hp')}${bar('st')}${bar('will')}<div class="purse">银钱<b>0</b></div></div>
    <div id="goal" class="hud"></div>
    <div id="lord" class="hud"><div class="who"><b></b><span></span></div>${bar('hp')}<div class="bar posture"><i class="fill"></i></div></div>
    <div id="notes" class="hud"></div>
    <div id="deeds" class="hud"></div>
    <div id="pack" class="hud"><ul></ul><button class="tag" type="button">行囊<b>0</b><kbd></kbd></button></div>
    <div id="stick" class="touch hud"><i></i></div><div id="pads" class="touch hud"></div>
    <div id="speech"></div>
    <div id="card"><b></b><i></i><span></span></div>
    <div id="veil"></div>
    <div id="title"><div class="name">风雪山神庙</div><div class="seal">水浒　第一回</div><div class="go">点击开始</div><div class="keys"><span class="key"></span><span class="tap">左侧拖动移动　右侧按钮出枪、格挡、闪避</span></div></div>
    <div class="corner"><button type="button" data-do="full">全屏</button><button type="button" data-do="set">设置</button></div>
    <div class="panel" id="settings"></div>
    <div id="debug"></div>`;
  const $ = (selector) => root.querySelector(selector);
  const hud = { staged: false };

  // ---- the row of deeds, for keys and for thumbs ---------------------------------------------
  const deeds = {},
    pads = {};
  const order = ['attack', 'guard', 'stars', 'rain', 'dodge', 'glide', 'drink'];
  for (const name of order) {
    const node = el('div', { class: 'deed' + (name === 'rain' ? ' big' : ''), title: DEED_NAMES[name] }, `${icon(name)}<i class="wait"></i><kbd></kbd>${name === 'drink' ? '<em>3</em>' : ''}`);
    $('#deeds').append(node);
    deeds[name] = node;
  }
  const PAD_PLACES = { attack: [0, 0], dodge: [96, 6], guard: [66, 92], stars: [0, 98], rain: [8, 170], drink: [136, 112], glide: [164, 40] };
  for (const name of order) {
    const node = el('button', { class: 'pad' + (name === 'attack' ? ' main' : ''), type: 'button', 'aria-label': DEED_NAMES[name] }, `${icon(name)}${name === 'drink' ? '<em>3</em>' : ''}`);
    node.style.right = PAD_PLACES[name][0] + 'px';
    node.style.bottom = PAD_PLACES[name][1] + 'px';
    node.addEventListener('pointerdown', (event) => (event.preventDefault(), node.setPointerCapture(event.pointerId), input.hold(name, true)));
    for (const type of ['pointerup', 'pointercancel']) node.addEventListener(type, () => input.hold(name, false));
    $('#pads').append(node);
    pads[name] = node;
  }
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
  let stickFrom = null;
  stick.addEventListener('pointerdown', (event) => {
    stick.setPointerCapture(event.pointerId);
    stickFrom = [event.clientX, event.clientY];
    const box = stick.getBoundingClientRect();
    knob.style.left = event.clientX - box.left + 'px';
    knob.style.top = event.clientY - box.top + 'px';
    stick.classList.add('on');
  });
  stick.addEventListener('pointermove', (event) => {
    if (!stickFrom) return;
    let dx = (event.clientX - stickFrom[0]) / 48,
      dy = (event.clientY - stickFrom[1]) / 48;
    const d = Math.hypot(dx, dy);
    if (d > 1) (dx /= d), (dy /= d);
    knob.style.setProperty('--x', dx * 34 + 'px');
    knob.style.setProperty('--y', dy * 34 + 'px');
    input.setStick(d < 0.2 ? 0 : dx, d < 0.2 ? 0 : dy);
  });
  for (const type of ['pointerup', 'pointercancel'])
    stick.addEventListener(type, () => {
      stickFrom = null;
      stick.classList.remove('on');
      knob.style.setProperty('--x', '0px');
      knob.style.setProperty('--y', '0px');
      input.setStick(0, 0);
    });

  // ---- bag ----------------------------------------------------------------------------------
  const pack = $('#pack');
  const toggleBag = () => pack.classList.toggle('open');
  pack.querySelector('.tag').addEventListener('click', toggleBag);
  input.on('bag', toggleBag);
  function fillBag(game) {
    const rows = Object.keys(LOOT)
      .filter((kind) => game.bag[kind] > 0)
      .map((kind) => `<li data-grade="${LOOT[kind].grade}"><span>${LOOT[kind].name}　${GRADES[LOOT[kind].grade]}</span><b>${game.bag[kind]}</b></li>`);
    pack.querySelector('ul').innerHTML = rows.join('') || '<li><span>空</span></li>';
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
  hud.card = (title, under = '', time = 3.2) => {
    const node = $('#card');
    node.querySelector('b').textContent = title;
    node.querySelector('span').textContent = under;
    node.classList.add('on');
    setTimeout(() => node.classList.remove('on'), time * 1000);
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
  $('#title').addEventListener('pointerdown', () => onStart());
  root.classList.add('idle');
  hud.hideTitle = () => ($('#title').classList.add('gone'), root.classList.remove('idle'));
  hud.ready = () => ($('#title .go').textContent = matchMedia('(pointer: coarse)').matches ? '轻点开始' : '点击开始');

  const panel = $('#settings');
  const CHOICES = {
    quality: ['画质', '自动会按帧率升降；选定后固定不变。高档草更密、阴影更清晰、分辨率更高。', [['auto', '自动'], ['low', '低'], ['mid', '中'], ['high', '高']]],
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
    panel.innerHTML = `<h2>设置</h2>${rows}<div class="row"><small>画质里的草和粒子里的飘雪在重新载入后生效。</small><button type="button" class="act" data-do="reload">重新载入</button></div><h3>按键</h3>${keys}<div class="foot"><button type="button" class="act" data-do="defaults">恢复默认</button><button type="button" class="act" data-do="close">关闭</button></div>`;
  }
  root.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    const { set, value, key } = target.dataset,
      act = target.dataset.do;
    if (set) {
      settings[set] = value;
      onSettings(settings);
      drawSettings();
    } else if (key) {
      target.classList.add('asking');
      target.textContent = '请按键…';
      input.ask((code) => {
        // A key already in use changes places with the one it displaces.
        const other = Object.keys(input.keys).find((action) => input.keys[action] === code);
        if (other) input.keys[other] = input.keys[key];
        input.keys[key] = code;
        onSettings(settings);
        labelKeys();
        drawSettings();
      });
    } else if (act === 'set') {
      drawSettings();
      panel.classList.toggle('on');
    } else if (act === 'close') panel.classList.remove('on');
    else if (act === 'reload') location.reload();
    else if (act === 'defaults') {
      Object.assign(input.keys, DEFAULT_KEYS);
      onSettings(settings);
      labelKeys();
      drawSettings();
    } else if (act === 'full') {
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
  let bagCount = -1,
    goal = null;
  hud.update = (game, view) => {
    const hero = game.hero;
    scale(me.hp, hero.hp / HERO.hp);
    scale(me.lag, hero.hp / HERO.hp);
    scale(me.st, hero.stamina / HERO.stamina);
    scale(me.will, hero.will / HERO.will);
    me.willBar.classList.toggle('full', hero.will >= HERO.will);
    me.purse.textContent = game.coins;
    if (goal !== game.stage) {
      goal = game.stage;
      $('#goal').textContent = GOALS[goal];
      $('#goal').hidden = !GOALS[goal];
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
    const set = (name, { wait = 0, off = false, ready = false, now = false, count } = {}) => {
      for (const node of [deeds[name], pads[name]]) {
        node.classList.toggle('off', off);
        node.classList.toggle('ready', ready);
        node.classList.toggle('now', now);
        const mask = node.querySelector('.wait');
        if (mask) mask.style.setProperty('--wait', wait);
        if (count !== undefined) node.querySelector('em').textContent = count;
      }
    };
    set('attack', { ready: hero.counter > 0, now: hero.state === 'cut' });
    set('guard', { off: hero.stamina <= 0, now: hero.state === 'guard' });
    set('stars', { wait: hero.starsWait / HERO.stars.cooldown, off: hero.starsWait > 0 });
    set('rain', { off: hero.will < HERO.will, ready: hero.will >= HERO.will, wait: 1 - hero.will / HERO.will });
    set('dodge', { off: hero.stamina < HERO.dodge.cost * 0.5 });
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
      if (foe.kind === 'lu' || foe.state === 'dead' || foe.hp >= foe.maxHp) continue;
      const [sx, sy, depth] = view.screen(foe.x, 2.25, foe.z);
      if (depth > 1 || sx < 0 || sx > 1) continue;
      let node = pipNodes.get(foe.id);
      if (!node) {
        node = el('div', { class: 'pip' }, '<i></i>');
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
