// The page around the 3D view: title screen, health and experience bars,
// level-up cards, boss bar, damage numbers and the end screen, in English or
// Chinese. Built from plain elements over the canvas.
import { CHARMS, RUN, SKINS, TEXT, TOYS } from './data.mjs';

const hex = (value) => '#' + value.toString(16).padStart(6, '0');
const el = (tag, className, parent, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  parent?.appendChild(node);
  return node;
};
const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** What one level of a toy adds, in words. */
const DELTA = {
  damage: (v, zh) => (zh ? `伤害 +${v}` : `+${v} damage`),
  cooldown: (v, zh) => (zh ? `冷却 ${v} 秒` : `Fires ${-v} s sooner`),
  amount: (v, zh) => (zh ? `数量 +${v}` : `+${v} more`),
  area: (v, zh) => (zh ? `范围 +${Math.round(v * 100)}%` : `${Math.round(v * 100)}% bigger`),
  duration: (v, zh) => (zh ? `持续 +${v} 秒` : `Lasts ${v} s longer`),
  range: (v, zh) => (zh ? `射程 +${v}` : `Reaches ${v} m farther`),
  speed: (v, zh) => (zh ? `速度 +${v}` : `Faster`),
  knock: (v, zh) => (zh ? `击退 +${v}` : `Harder shove`),
  pierce: (v, zh) => (zh ? `穿透 +${v}` : `Passes through ${v} more`),
  extra: (v, zh) => (zh ? '效果增强' : 'Stronger effect'),
};

/** Build the interface inside `root`. `options.lang` is "en" or "zh"; the browser's language is used otherwise. */
export function createHud(root, options = {}) {
  let lang = options.lang ?? ((navigator.language ?? 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en');
  const zh = () => lang === 'zh';
  const t = (key) => TEXT[key]?.[lang] ?? key;
  const name = (def) => def[lang] ?? def.en;
  const describe = (def) => (zh() ? def.dzh : def.den);
  let touchMode = window.matchMedia('(pointer: coarse)').matches;
  const controlGuide = () => t(touchMode ? 'touchControls' : 'controls');
  const hud = {
    get lang() {
      return lang;
    },
  };

  root.textContent = '';
  // ---- in-game layer ---------------------------------------------------------------------
  const play = el('div', 'layer play', root);
  const top = el('div', 'top', play);
  const xpBar = el('div', 'xp', top),
    xpFill = el('i', '', xpBar),
    levelText = el('b', 'lvl', xpBar);
  const timer = el('div', 'timer', top, '0:00'),
    kills = el('div', 'kills', top, '0');
  const bossBar = el('div', 'boss', play),
    bossName = el('span', '', bossBar),
    bossTrack = el('div', 'track', bossBar),
    bossFill = el('i', '', bossTrack);
  // A red edge that flashes when the player is hurt and pulses while health is low.
  const vignette = el('div', 'vignette', play);
  const announce = el('div', 'announce', play);
  const party = el('div', 'party', play),
    toyRow = el('div', 'toys', play),
    hint = el('div', 'hint', play);
  const numbers = el('div', 'numbers', play),
    numberPool = Array.from({ length: 40 }, () => el('span', '', numbers));
  const markers = el('div', 'markers', play),
    markerPool = [];
  let numberNext = 0,
    announceUntil = 0,
    toySignature = '',
    partySignature = '';
  const partyRows = [];

  const touch = el('div', 'touch hidden', play);
  const joystick = el('div', 'touch-joystick', touch);
  joystick.dataset.touch = 'move';
  joystick.setAttribute('role', 'group');
  el('span', 'touch-stick', joystick).setAttribute('aria-hidden', 'true');
  const actionRow = el('div', 'touch-actions', touch);
  const touchButton = (action, parent) => {
    const button = el('button', 'touch-button', parent);
    button.type = 'button';
    button.dataset.touch = action;
    return button;
  };
  const actions = Object.fromEntries(['jump', 'slam', 'roll'].map((action) => [action, touchButton(action, actionRow)]));
  const pause = touchButton('pause', touch);
  hud.touch = { joystick, actions, pause };
  hud.setTouchControls = (active, onTouchDevice) => {
    touchMode = onTouchDevice;
    play.classList.toggle('touch-play', active);
    touch.classList.toggle('hidden', !active);
    if (active) {
      joystick.setAttribute('aria-label', t('touchMove'));
      for (const [action, button] of Object.entries({ ...actions, pause })) {
        button.textContent = t(action);
      }
    }
  };

  // ---- overlays ---------------------------------------------------------------------------
  const cards = el('div', 'layer cards hidden', root),
    title = el('div', 'layer title', root),
    menu = el('div', 'layer menu hidden', root),
    end = el('div', 'layer end hidden', root);
  const show = (node, on) => node.classList.toggle('hidden', !on);

  /** Small panda face built from styled elements, tinted like the skin. */
  const face = (skin, parent) => {
    const node = el('span', 'face', parent);
    node.style.setProperty('--body', hex(skin.body));
    node.style.setProperty('--patch', hex(skin.patch));
    return node;
  };

  // ---- title -------------------------------------------------------------------------------
  const portraitTitle = matchMedia('(orientation: portrait) and (max-width: 760px)');
  const preview = el('div', 'title-preview hidden', title);
  let titlePanel, previewCanvas, previewLayoutChanged;
  function updateTitlePreview() {
    if (!previewCanvas) return;
    const embedded = portraitTitle.matches && !title.classList.contains('hidden');
    show(preview, embedded);
    title.classList.toggle('portrait-preview', embedded);
    if (embedded) {
      if (previewCanvas.parentElement !== preview) preview.append(previewCanvas);
    } else if (previewCanvas.parentElement === preview) {
      root.before(previewCanvas);
    }
    if (previewCanvas.inert !== embedded) {
      previewCanvas.inert = embedded;
      previewLayoutChanged(embedded);
    }
  }
  hud.setTitlePreview = (canvas, onLayoutChange) => {
    previewCanvas = canvas;
    previewLayoutChanged = onLayoutChange;
    portraitTitle.addEventListener('change', updateTitlePreview);
  };
  hud.showTitle = (state, handlers) => {
    show(title, true);
    show(play, false);
    show(end, false);
    show(menu, false);
    show(cards, false);
    updateTitlePreview();
    titlePanel?.remove();
    const panel = (titlePanel = el('div', 'panel', title));
    el('h1', '', panel, t('title'));
    el('p', 'tag', panel, t('tagline'));
    el('h2', '', panel, t('pick'));
    const grid = el('div', 'skins', panel);
    SKINS.forEach((skin, index) => {
      const button = el('button', 'skin' + (index === state.skin ? ' on' : ''), grid);
      button.type = 'button';
      face(skin, button);
      el('span', '', button, name(skin));
      el(
        'small',
        '',
        button,
        TOYS.find((toy) => toy.key === skin.start).icon + ' ' + name(TOYS.find((toy) => toy.key === skin.start)),
      );
      button.addEventListener('click', () => {
        state.skin = index;
        handlers.onChange?.();
        hud.showTitle(state, handlers);
      });
    });
    const row = el('div', 'row', panel);
    el('span', '', row, t('party'));
    for (let size = 1; size <= 4; size++) {
      const button = el(
        'button',
        'pill' + (size === state.party ? ' on' : ''),
        row,
        size === 1 ? t('solo') : `+${size - 1} ${size === 2 ? t('friend') : t('friends')}`,
      );
      button.type = 'button';
      button.addEventListener('click', () => {
        state.party = size;
        handlers.onChange?.();
        hud.showTitle(state, handlers);
      });
    }
    const go = el('button', 'go', panel, t('play'));
    go.type = 'button';
    go.addEventListener('click', () => handlers.onPlay());
    el('p', 'controls', panel, controlGuide());
    const foot = el('div', 'row foot', panel);
    const language = el('button', 'pill', foot, zh() ? 'English' : '中文');
    language.type = 'button';
    language.addEventListener('click', () => {
      lang = zh() ? 'en' : 'zh';
      document.documentElement.lang = zh() ? 'zh-CN' : 'en';
      hud.showTitle(state, handlers);
    });
    const sound = el('button', 'pill', foot, state.muted ? '🔇' : '🔊');
    sound.type = 'button';
    sound.addEventListener('click', () => {
      state.muted = !state.muted;
      handlers.onChange?.();
      hud.showTitle(state, handlers);
    });
    // Picture quality cycles high, medium, low; lower settings run faster.
    const quality = el('button', 'pill', foot, `${t('quality')}${t('quality_' + state.quality)}`);
    quality.type = 'button';
    quality.addEventListener('click', () => {
      state.quality = { high: 'medium', medium: 'low', low: 'high' }[state.quality] ?? 'high';
      handlers.onChange?.();
      hud.showTitle(state, handlers);
    });
  };
  /** Switch from the title to the in-game layer. */
  hud.startPlay = () => {
    show(title, false);
    updateTitlePreview();
    show(end, false);
    show(menu, false);
    show(cards, false);
    show(play, true);
    toySignature = '';
    partySignature = '';
    announce.textContent = '';
    hint.textContent = touchMode ? '' : t('clickToPlay');
  };

  // ---- cards ---------------------------------------------------------------------------------
  const cardInfo = (card) => {
    if (card.type === 'heal') return { icon: '🎋', title: t('heal'), tag: '', text: t('healDesc') };
    if (card.type === 'bonus') return { icon: '✨', title: t('bonus'), tag: '', text: t('bonusDesc') };
    if (card.type === 'charm') {
      const def = CHARMS[card.id];
      return {
        icon: def.icon,
        title: name(def),
        tag: card.level === 1 ? t('newCharm') : `${t('level')} ${card.level}`,
        text: describe(def),
      };
    }
    const def = TOYS[card.id];
    if (card.type === 'evo')
      return { icon: def.icon, title: name(def.evo), tag: t('evolve'), text: describe(def.evo), evo: true };
    if (card.level === 1) return { icon: def.icon, title: name(def), tag: t('newToy'), text: describe(def) };
    const delta = def.levels[card.level - 2],
      text = Object.entries(delta)
        .map(([key, value]) => DELTA[key]?.(value, zh()) ?? key)
        .join(zh() ? '，' : ', ');
    return {
      icon: def.icon,
      title: name(def),
      tag: `${t('level')} ${card.level}${card.level === RUN.maxToyLevel ? ' · ' + t('toyMax') : ''}`,
      text,
    };
  };
  /** Show the panda's current offer; `handlers` are `onPick(index)` and `onReroll()`. */
  hud.showCards = (panda, handlers) => {
    cards.textContent = '';
    show(cards, true);
    el('h2', '', cards, t('levelUp'));
    const row = el('div', 'deck', cards);
    panda.offer.forEach((card, index) => {
      const info = cardInfo(card),
        button = el('button', 'card' + (info.evo ? ' evo' : ''), row);
      button.type = 'button';
      el('kbd', '', button, String(index + 1));
      el('span', 'icon', button, info.icon);
      el('b', '', button, info.title);
      if (info.tag) el('em', '', button, info.tag);
      el('p', '', button, info.text);
      button.addEventListener('click', () => handlers.onPick(index));
    });
    const reroll = el('button', 'pill', cards, `${t('reroll')} ×${panda.rerolls}`);
    reroll.type = 'button';
    reroll.disabled = panda.rerolls <= 0;
    reroll.addEventListener('click', () => handlers.onReroll());
  };
  hud.hideCards = () => show(cards, false);

  // ---- menu and end ---------------------------------------------------------------------------
  hud.showMenu = (on, handlers) => {
    show(menu, on);
    if (!on) return;
    menu.textContent = '';
    const panel = el('div', 'panel small', menu);
    el('h2', '', panel, t('paused'));
    for (const [label, action] of [
      [t('resume'), handlers.onResume],
      [t('restart'), handlers.onRestart],
      [t('quit'), handlers.onQuit],
    ]) {
      const button = el('button', 'go small', panel, label);
      button.type = 'button';
      button.addEventListener('click', action);
    }
    el('p', 'controls', panel, controlGuide());
  };
  /** Show the result of a finished run with the player's build. */
  hud.showEnd = (game, handlers) => {
    show(end, true);
    show(cards, false);
    end.textContent = '';
    const panel = el('div', 'panel small', end),
      won = game.state === 'won',
      human = game.pandas.find((panda) => panda.human) ?? game.pandas[0];
    el('h1', won ? 'won' : 'lost', panel, t(won ? 'victory' : 'defeat'));
    const stats = el('div', 'stats', panel);
    for (const [label, value] of [
      [t('survived'), clock(game.t)],
      [t('level'), game.level],
      [t('kills'), game.kills],
    ]) {
      const row = el('div', '', stats);
      el('span', '', row, label);
      el('b', '', row, String(value));
    }
    const build = el('div', 'build', panel);
    for (const toy of human.toys) el('span', toy.evo ? 'evo' : '', build, `${TOYS[toy.id].icon}${toy.level}`);
    for (const [id, level] of human.charms) el('span', '', build, `${CHARMS[id].icon}${level}`);
    for (const [label, action] of [
      [t('again'), handlers.onRestart],
      [t('quit'), handlers.onQuit],
    ]) {
      const button = el('button', 'go small', panel, label);
      button.type = 'button';
      button.addEventListener('click', action);
    }
  };

  // ---- per-frame --------------------------------------------------------------------------------
  /** `project(x, y, z)` returns the page position of a world point, or undefined when it is off screen. */
  hud.update = (game, project, now, captured) => {
    const human = game.pandas.find((panda) => panda.human) ?? game.pandas[0];
    timer.textContent = clock(game.t);
    kills.textContent = '🍬 ' + game.kills;
    xpFill.style.width = `${Math.min(100, (game.xp / game.xpNeed) * 100)}%`;
    levelText.textContent = `${t('level')} ${game.level}`;
    hint.classList.toggle('hidden', captured || game.t > 6);
    vignette.classList.toggle('low', !human.down && human.hp < human.maxHp * 0.3);
    // The clock turns red in the ten seconds before a boss.
    const untilBoss = RUN.bossTimes[game.bossIndex] - game.t;
    timer.classList.toggle('warn', untilBoss > 0 && untilBoss < 10);
    // Party bars are rebuilt only when the line-up changes.
    const signature = game.pandas.map((panda) => panda.skin).join(',') + lang;
    if (signature !== partySignature) {
      partySignature = signature;
      party.textContent = '';
      partyRows.length = 0;
      for (const panda of game.pandas) {
        const row = el('div', 'member', party);
        face(SKINS[panda.skin], row);
        const bars = el('div', 'bars', row);
        el('span', '', bars, name(SKINS[panda.skin]) + (panda.human ? ' ★' : ''));
        const hp = el('div', 'hp', bars),
          fill = el('i', '', hp),
          text = el('b', '', hp);
        const stamina = panda.human ? el('i', '', el('div', 'stamina', bars)) : undefined;
        partyRows.push({ row, fill, text, stamina });
      }
    }
    game.pandas.forEach((panda, index) => {
      const row = partyRows[index];
      row.fill.style.width = `${panda.down ? (panda.revive / 3.5) * 100 : Math.max(0, (panda.hp / panda.maxHp) * 100)}%`;
      row.row.classList.toggle('down', panda.down);
      row.text.textContent = panda.down ? '…' : `${Math.ceil(panda.hp)}`;
      if (row.stamina) row.stamina.style.width = `${(panda.stamina / 2.5) * 100}%`;
    });
    const toys =
      human.toys.map((toy) => `${toy.id}:${toy.level}:${toy.evo}`).join('|') +
      '/' +
      [...human.charms].map(([id, level]) => `${id}:${level}`).join('|');
    if (toys !== toySignature) {
      toySignature = toys;
      toyRow.textContent = '';
      for (const toy of human.toys) {
        const chip = el('span', 'chip' + (toy.evo ? ' evo' : ''), toyRow, TOYS[toy.id].icon);
        el('sub', '', chip, toy.evo ? '★' : String(toy.level));
        chip.title = name(TOYS[toy.id]);
      }
      el('span', 'gap', toyRow);
      for (const [id, level] of human.charms) {
        const chip = el('span', 'chip charm', toyRow, CHARMS[id].icon);
        el('sub', '', chip, String(level));
        chip.title = name(CHARMS[id]);
      }
    }
    const boss = game.boss;
    show(bossBar, !!boss);
    if (boss) {
      bossName.textContent = name(boss.def);
      bossFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
    }
    if (now > announceUntil) announce.classList.remove('on');
    // Arrows over fallen friends.
    let used = 0;
    for (const panda of game.pandas) {
      if (!panda.down) continue;
      const at = project(panda.x, panda.y + 2.2, panda.z);
      if (!at) continue;
      const marker = markerPool[used] ?? (markerPool[used] = el('span', '', markers, '🆘'));
      marker.style.transform = `translate(${at[0]}px, ${at[1]}px)`;
      marker.style.display = '';
      used++;
    }
    for (let i = used; i < markerPool.length; i++) markerPool[i].style.display = 'none';
  };
  /** Show a line of text across the middle of the screen for a few seconds. */
  const say = (text, now, seconds = 2.6, kind = '') => {
    announce.textContent = text;
    announce.className = 'announce on ' + kind;
    announceUntil = now + seconds;
  };
  hud.say = say;

  /** Show damage numbers and announcements for this frame's events. */
  hud.consume = (events, game, project, now) => {
    let shown = 0;
    for (const event of events) {
      switch (event.type) {
        case 'hit': {
          if (shown >= 5 || (event.amount < 4 && !event.crit)) break;
          const at = project(event.x, event.y, event.z);
          if (!at) break;
          shown++;
          const node = numberPool[numberNext++ % numberPool.length];
          node.textContent = String(event.amount);
          node.className = '';
          // Reading a layout value restarts the float-up animation on a reused element.
          void node.offsetWidth;
          node.className = event.crit ? 'pop crit' : 'pop';
          node.style.left = `${at[0] + (Math.random() - 0.5) * 24}px`;
          node.style.top = `${at[1]}px`;
          break;
        }
        case 'announce':
          if (event.key === 'bossIncoming') say(`${name(event.name)} ${t('bossIncoming')}`, now, 3.5, 'danger');
          else if (event.key === 'bossDown') say(`${name(event.name)} ✔`, now, 3, 'good');
          else say(t(event.key), now, 2.6, event.key === 'surge' ? 'danger' : '');
          break;
        case 'hurt':
          if (game.pandas[event.panda].human) {
            vignette.classList.remove('hit');
            void vignette.offsetWidth;
            vignette.classList.add('hit');
          }
          break;
        case 'down':
          say(`${name(SKINS[game.pandas[event.panda].skin])} ${t('down')}`, now, 3, 'danger');
          break;
        case 'revived':
          say(`${name(SKINS[game.pandas[event.panda].skin])} ${t('revived')}`, now, 2, 'good');
          break;
        case 'chest':
          say(t('chest'), now, 2, 'good');
          break;
        case 'evolve': {
          const toy = TOYS[event.toy];
          say(`${toy.icon} ${name(toy.evo)}!`, now, 2.6, 'good');
          break;
        }
        default:
          break;
      }
    }
  };
  return hud;
}
