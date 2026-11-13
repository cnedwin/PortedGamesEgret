// The page around the canvas: title, racer choice, the in-race display
// (place, lap, clock, item, speed, map, banners), the pause menu and the
// results. Text comes from data.mjs in the chosen language.
import { CLASSES, DRIVE, ITEMS, ITEM_KEYS, LAP_CHOICES, RACERS, TEXT } from './data.mjs';

const css = (hex) => '#' + hex.toString(16).padStart(6, '0');
/** 83.456 seconds as 1:23.45. */
export const clock = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;

/** Create an element with a class, optional text and children. */
function el(tag, className, text, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  node.append(...children);
  return node;
}
function button(className, text, onClick) {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}
/** A racer's badge: a seal character on the kart's colour. */
const seal = (racer) => {
  const node = el('span', 'seal', racer.seal);
  node.style.background = css(racer.body);
  node.style.borderColor = css(racer.trim);
  return node;
};

export function createHud(root, track, options = {}) {
  const hud = {
    lang: options.lang === 'en' || options.lang === 'zh' ? options.lang : navigator.language?.startsWith('zh') ? 'zh' : 'en',
  };
  const t = () => TEXT[hud.lang];
  document.documentElement.lang = hud.lang;

  const screen = el('div', 'screen');
  const race = el('div', 'race');
  race.hidden = true;
  root.append(race, screen);
  const stage = options.stage;
  const preview = stage ? el('div', 'select-preview') : undefined;
  const selection = preview ? el('div', 'select-layout', undefined, [preview]) : undefined;
  const show = (...nodes) => {
    if (preview && stage.parentElement === preview) root.before(stage);
    screen.replaceChildren(...nodes);
    screen.hidden = nodes.length === 0;
  };
  show();

  /** Buttons for sound, picture quality and language, shared by the title and pause menus. */
  function settingsRow(settings, onChange) {
    const cycle = { high: 'medium', medium: 'low', low: 'high' };
    return el('div', 'options', undefined, [
      button('ghost', `${t().sound}: ${settings.muted ? t().off : t().on}`, () => {
        settings.muted = !settings.muted;
        onChange();
      }),
      button('ghost', `${t().quality}: ${t().qualities[settings.quality]}`, () => {
        settings.quality = cycle[settings.quality];
        onChange();
      }),
      button('ghost', t().language, () => {
        hud.lang = hud.lang === 'zh' ? 'en' : 'zh';
        settings.lang = hud.lang;
        document.documentElement.lang = hud.lang;
        onChange();
      }),
    ]);
  }

  // ---- title ---------------------------------------------------------------------------
  hud.showTitle = (settings, handlers) => {
    race.hidden = true;
    const redraw = () => {
      handlers.onChange();
      hud.showTitle(settings, handlers);
    };
    show(
      el('div', 'title', undefined, [
        el('p', 'kicker', t().subtitle),
        el('h1', undefined, t().title),
        el('p', 'tagline', t().tagline),
        button('primary', t().start, handlers.onStart),
        el('p', 'hint', t().pressStart),
        settingsRow(settings, redraw),
        el('p', 'help', t().help),
      ]),
    );
  };

  // ---- choosing a racer -----------------------------------------------------------------
  hud.showSelect = (settings, handlers) => {
    race.hidden = true;
    const redraw = () => {
      handlers.onChange();
      hud.showSelect(settings, handlers);
    };
    const racer = RACERS[settings.racer];
    const cards = RACERS.map((entry, index) => {
      const card = button(index === settings.racer ? 'card chosen' : 'card', undefined, () => {
        settings.racer = index;
        redraw();
      });
      card.append(seal(entry), el('span', 'card-name', entry.name[hud.lang]));
      return card;
    });
    const stat = (label, value) => {
      const bar = el('span', 'bar');
      for (let k = 1; k <= 5; k++) bar.append(el('i', k <= value ? 'on' : ''));
      return el('div', 'stat', undefined, [el('span', undefined, label), bar]);
    };
    const choice = (label, values, current, name, set) =>
      el('div', 'choice', undefined, [
        el('span', 'choice-label', label),
        ...values.map((value, index) =>
          button(index === current ? 'pill chosen' : 'pill', name(value), () => {
            set(index);
            redraw();
          }),
        ),
      ]);
    const panel = el('div', 'select', undefined, [
      el('h2', undefined, t().choose),
      el('div', 'cards', undefined, cards),
      el('div', 'detail', undefined, [
        el('div', 'who', undefined, [
          seal(racer),
          el('div', undefined, undefined, [
            el('strong', undefined, racer.name[hud.lang]),
            el('p', undefined, racer.blurb[hud.lang]),
          ]),
        ]),
        el('div', 'stats', undefined, [
          stat(t().speed, racer.stats.speed),
          stat(t().accel, racer.stats.accel),
          stat(t().handling, racer.stats.handling),
          stat(t().weight, racer.stats.weight),
        ]),
      ]),
      choice(
        t().klass,
        CLASSES,
        settings.klass,
        (value) => value.name[hud.lang],
        (index) => (settings.klass = index),
      ),
      choice(
        t().laps,
        LAP_CHOICES,
        LAP_CHOICES.indexOf(settings.laps),
        (value) => String(value),
        (index) => (settings.laps = LAP_CHOICES[index]),
      ),
      el('div', 'row', undefined, [button('ghost', t().back, handlers.onBack), button('primary', t().race, handlers.onRace)]),
      el('p', 'help', t().tip),
    ]);
    if (!selection) return show(panel);
    if (screen.firstElementChild === selection) {
      selection.lastElementChild.replaceWith(panel);
    } else {
      selection.replaceChildren(preview, panel);
      show(selection);
      preview.append(stage);
      screen.scrollTop = 0;
    }
  };

  // ---- in the race -----------------------------------------------------------------------
  const place = el('div', 'place'),
    lap = el('div', 'lap'),
    time = el('div', 'clock'),
    itemIcon = el('span', 'item-icon'),
    itemCount = el('span', 'item-count'),
    coinCount = el('strong'),
    coins = el('div', 'coins', undefined, [el('span', 'coin'), coinCount]),
    driftFill = el('i'),
    drift = el('div', 'drift', undefined, [driftFill]),
    popups = el('div', 'popups'),
    // Ink thrown by a rival: blots that cover part of the view until they fade.
    inkBlots = el(
      'div',
      'ink',
      undefined,
      [
        [18, 30, 34],
        [62, 22, 40],
        [40, 58, 46],
        [78, 62, 30],
        [12, 70, 26],
        [52, 36, 22],
      ].map(([left, top, size]) => {
        const blot = el('i');
        blot.style.cssText = `left:${left}%;top:${top}%;width:${size}vmin;height:${size}vmin`;
        return blot;
      }),
    ),
    hurt = el('div', 'hurt'),
    item = el('div', 'item', undefined, [itemIcon, itemCount]),
    speedValue = el('strong'),
    speedUnit = el('span'),
    speedFill = el('i'),
    speed = el('div', 'speed', undefined, [speedValue, speedUnit, el('div', 'speed-bar', undefined, [speedFill])]),
    map = el('canvas', 'map'),
    banner = el('div', 'banner'),
    wrong = el('div', 'wrong'),
    flash = el('div', 'flash'),
    lines = el('div', 'lines'),
    pause = button('race-pause', undefined, options.onPause),
    touch = el('div', 'touch', undefined, [
      el('div', 'touch-side', undefined, [touchButton('left', '◀'), touchButton('right', '▶')]),
      el('div', 'touch-side', undefined, [touchButton('brake', '▼'), touchButton('item', '★'), touchButton('drift', '⤴')]),
    ]);
  function touchButton(name, label) {
    const node = el('button', 'touch-button', label);
    node.type = 'button';
    node.dataset.touch = name;
    return node;
  }
  pause.hidden = true;
  pause.append(el('span', 'pause-icon'));
  const labelRaceControls = () => {
    pause.setAttribute('aria-label', t().pause);
    for (const control of touch.querySelectorAll('[data-touch]')) {
      control.setAttribute('aria-label', t().touchControls[control.dataset.touch]);
    }
  };
  hud.setRacePauseAvailable = (available) => {
    pause.hidden = !available;
  };
  race.append(
    lines,
    hurt,
    inkBlots,
    flash,
    place,
    el('div', 'top', undefined, [lap, time]),
    item,
    coins,
    speed,
    map,
    drift,
    popups,
    banner,
    wrong,
    touch,
    pause,
  );
  /** The element holding the touch buttons, for the input module. */
  hud.touchRoot = touch;

  // The map: the circuit drawn once, kart dots on top each frame. World +X is right and +Z is down.
  const MAP = 168,
    pad = 12;
  map.width = map.height = MAP * 2;
  const pen = map.getContext('2d'),
    outline = document.createElement('canvas');
  outline.width = outline.height = MAP * 2;
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (let i = 0; i < track.count; i++) {
    minX = Math.min(minX, track.px[i]);
    maxX = Math.max(maxX, track.px[i]);
    minZ = Math.min(minZ, track.pz[i]);
    maxZ = Math.max(maxZ, track.pz[i]);
  }
  const zoom = (MAP * 2 - pad * 2) / Math.max(maxX - minX, maxZ - minZ),
    mapX = (x) => pad + (x - minX) * zoom + (MAP * 2 - pad * 2 - (maxX - minX) * zoom) / 2,
    mapY = (z) => pad + (z - minZ) * zoom + (MAP * 2 - pad * 2 - (maxZ - minZ) * zoom) / 2;
  {
    const c = outline.getContext('2d');
    c.lineJoin = c.lineCap = 'round';
    for (const [width, color] of [
      [15, 'rgba(20,24,32,.75)'],
      [8, '#f6efe0'],
    ]) {
      c.beginPath();
      for (let i = 0; i <= track.count; i++) c.lineTo(mapX(track.px[i % track.count]), mapY(track.pz[i % track.count]));
      c.lineWidth = width;
      c.strokeStyle = color;
      c.stroke();
    }
    // The start line.
    c.fillStyle = '#d8262c';
    c.fillRect(mapX(track.px[0]) - 3, mapY(track.pz[0]) - 9, 6, 18);
  }

  let bannerUntil = 0,
    now = 0,
    tick = 0;
  /** Show a line of large text for `seconds`. */
  const announce = (text, seconds, kind = '') => {
    banner.textContent = text;
    banner.className = 'banner show ' + kind;
    // Restart the pop-in animation.
    void banner.offsetWidth;
    banner.classList.add('pop');
    bannerUntil = now + seconds;
  };

  hud.startRace = () => {
    show();
    race.hidden = false;
    banner.className = 'banner';
    bannerUntil = 0;
    speedUnit.textContent = t().kmh;
    labelRaceControls();
  };

  /** Refresh the display from the race; `view` supplies the screen flash. */
  hud.update = (game, view, dt, audio) => {
    now += dt;
    const kart = game.human;
    if (!kart) return;
    place.textContent = t().place[kart.place - 1];
    if (place.dataset.place !== String(kart.place)) {
      // The place jumps when it changes.
      place.classList.remove('bump');
      void place.offsetWidth;
      place.classList.add('bump');
    }
    place.dataset.place = kart.place;
    coinCount.textContent = `${kart.coins}/${DRIVE.coinLimit}`;
    coins.className = kart.coins >= DRIVE.coinLimit ? 'coins full' : 'coins';
    // The drift meter fills toward the next mini-turbo and takes its colour.
    drift.className = kart.drifting ? `drift on level${kart.driftLevel}` : 'drift';
    if (kart.drifting) {
      const levels = DRIVE.driftLevels,
        from = kart.driftLevel ? levels[kart.driftLevel - 1] : 0,
        to = levels[Math.min(kart.driftLevel, levels.length - 1)];
      driftFill.style.width = `${kart.driftLevel >= levels.length ? 100 : Math.min(100, ((kart.driftCharge - from) / (to - from)) * 100)}%`;
    }
    inkBlots.style.opacity = Math.min(1, kart.inked / 0.8);
    hurt.style.opacity = Math.max(0, Number(hurt.style.opacity || 0) - dt * 1.6);
    lap.textContent = `${t().lap} ${Math.max(1, kart.lap)}/${game.laps}`;
    time.textContent = clock(kart.finished ? kart.finishTime : game.time);
    const kmh = Math.round(Math.abs(kart.speed) * 3.6);
    speedValue.textContent = kmh;
    speedFill.style.width = `${Math.min(100, (Math.abs(kart.speed) / 55) * 100)}%`;
    speedFill.className = kart.boost > 0 ? 'boost' : '';

    // The item slot spins through the icons while the box is being opened.
    if (kart.roulette > 0) {
      const next = Math.floor(now * 12);
      if (next !== tick) {
        tick = next;
        audio?.play('roulette', { tick });
      }
      itemIcon.textContent = ITEMS[ITEM_KEYS[tick % ITEM_KEYS.length]].icon;
      item.className = 'item rolling';
      itemCount.textContent = '';
    } else if (kart.item) {
      itemIcon.textContent = ITEMS[kart.item].icon;
      item.className = 'item ready';
      itemCount.textContent = kart.itemCount > 1 ? `×${kart.itemCount}` : '';
    } else {
      itemIcon.textContent = '';
      itemCount.textContent = '';
      item.className = 'item';
    }

    wrong.textContent = kart.wrongWay ? t().wrongWay : '';
    flash.style.opacity = view.flash;
    lines.style.opacity = kart.boost > 0 || kart.cloud > 0 ? 0.6 : kart.draft > 0.3 ? 0.25 : 0;
    if (bannerUntil && now > bannerUntil) {
      banner.className = 'banner';
      bannerUntil = 0;
    }

    pen.clearRect(0, 0, MAP * 2, MAP * 2);
    pen.drawImage(outline, 0, 0);
    // Rivals first, the player on top.
    for (const other of [...game.karts].sort((a, b) => Number(a.human) - Number(b.human))) {
      pen.beginPath();
      pen.arc(mapX(other.x), mapY(other.z), other.human ? 9 : 6, 0, Math.PI * 2);
      pen.fillStyle = css(RACERS[other.racer].body);
      pen.fill();
      pen.lineWidth = other.human ? 4 : 2;
      pen.strokeStyle = other.human ? '#ffffff' : 'rgba(20,24,32,.8)';
      pen.stroke();
    }
  };

  /** Banners for what just happened to the player. */
  /** A short cheer that floats up and fades: `kind` picks its colour. */
  const popup = (text, kind = '') => {
    const node = el('div', 'popup ' + kind, text);
    popups.append(node);
    node.addEventListener('animationend', () => node.remove());
    while (popups.children.length > 4) popups.firstChild.remove();
  };

  hud.consume = (events, game) => {
    const mine = game.human?.index;
    for (const event of events) {
      if (event.type === 'count') announce(String(event.n), 0.9, 'count');
      else if (event.type === 'go') announce(t().go, 1.1, 'go');
      else if (event.kart !== mine) continue;
      else if (event.type === 'lap' && event.final) announce(t().finalLap, 2.2, 'final');
      else if (event.type === 'lap') announce(`${t().lap} ${event.lap}/${game.laps}`, 1.6);
      else if (event.type === 'finish') announce(t().finish, 3, 'go');
      else if (event.type === 'item') announce(ITEMS[event.item].name[hud.lang], 1.1, 'small');
      else if (event.type === 'turbo') popup(t().popups.turbo[event.level - 1], 'level' + event.level);
      else if (event.type === 'boost' && t().popups[event.source]) popup(t().popups[event.source], 'gold');
      else if (event.type === 'overtake') popup(`${t().popups.overtake} ${t().place[event.place - 1]}`, 'green');
      else if (event.type === 'coin' && event.full) popup(t().popups.purse, 'gold');
      else if (event.type === 'blocked') popup(t().popups.blocked, 'green');
      else if (event.type === 'mud') popup(t().popups.mud, 'brown');
      else if (event.type === 'hit') hurt.style.opacity = 1;
    }
  };

  // ---- pause and results -----------------------------------------------------------------
  hud.showPause = (on, settings, handlers) => {
    if (!on) return show();
    const redraw = () => {
      handlers.onChange();
      speedUnit.textContent = t().kmh;
      labelRaceControls();
      hud.showPause(true, settings, handlers);
    };
    show(
      el('div', 'panel', undefined, [
        el('h2', undefined, t().paused),
        button('primary', t().resume, handlers.onResume),
        button('ghost', t().restart, handlers.onRestart),
        button('ghost', t().quit, handlers.onQuit),
        settingsRow(settings, redraw),
        el('p', 'help', t().help),
      ]),
    );
  };

  hud.showResults = (game, handlers) => {
    const rows = game.results().map((row) => {
      const racer = RACERS[row.kart.racer],
        line = el('tr', row.kart.human ? 'me' : '', undefined, [
          el('td', 'rank', String(row.place)),
          el('td', undefined, undefined, [
            seal(racer),
            el('span', undefined, ` ${racer.name[hud.lang]}${row.kart.human ? ` (${t().you})` : ''}`),
          ]),
          el('td', 'num', row.time === undefined ? '—' : clock(row.time)),
          el('td', 'num', row.bestLap === undefined ? '—' : clock(row.bestLap)),
        ]);
      return line;
    });
    const head = el('tr', undefined, undefined, [el('th'), el('th'), el('th', 'num', t().time), el('th', 'num', t().bestLap)]);
    show(
      el('div', 'panel wide', undefined, [
        el('h2', undefined, `${t().results} · ${t().place[game.human.place - 1]}`),
        el('table', 'results', undefined, [head, ...rows]),
        el('div', 'row', undefined, [
          button('ghost', t().menu, handlers.onQuit),
          button('primary', t().again, handlers.onRestart),
        ]),
      ]),
    );
  };

  /** Hide the in-race display (back on the menus). */
  hud.endRace = () => {
    race.hidden = true;
  };
  return hud;
}
