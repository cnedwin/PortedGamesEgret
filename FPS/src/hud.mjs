// The screen furniture: the heads-up display during a run, and the menus
// around it. All of it is ordinary page elements laid over the canvas.
import { MISSION, PLAYER } from './data.mjs';
import { BACKPACK, MISSION as RULES } from './data.mjs';
import { BOUNDS, BOXES, PLACES } from './level.mjs';
import { TEXT } from './text.mjs';

const RARITY_CSS = ['#ccc', '#d8d8d8', '#5bd16a', '#4d9bff', '#b868ff', '#ffbf33', '#ff4d40'];
const PX_PER_DEGREE = 4;
const money = (value) => Math.round(value).toLocaleString('en-US');
const clock = (seconds) => {
  const s = Math.max(0, Math.floor(seconds));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};
const el = (tag, className, html) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
};

/**
 * Build the interface inside `root`. `settings` is the saved choices object
 * (quality, sensitivity, invertY, volume, fov, lang); `actions` are called
 * when a menu button is pressed: deploy, resume, restart, and `changed(key)`
 * after a setting moved.
 */
export function createHud(root, settings, actions) {
  let t = TEXT[settings.lang] ?? TEXT.en;
  const hud = { screen: 'title', touch: undefined };

  // ---- the heads-up display ----------------------------------------------------------------
  const play = el('div', 'hud');
  play.hidden = true;
  play.innerHTML = `
    <div class="compass"><div class="tape"></div><div class="cmarks"></div><i class="needle"></i></div>
    <div class="objective"><div class="obj-head"><b class="obj-title"></b><span class="obj-clock">00:00</span></div><ul class="obj-list"></ul></div>
    <div class="cross"><i class="l"></i><i class="r"></i><i class="u"></i><i class="d"></i><b></b></div>
    <div class="hitmark"><i></i><i></i><i></i><i></i></div>
    <div class="marks"></div>
    <div class="hurt"></div>
    <div class="vignette"></div>
    <div class="prompt" hidden><span></span><i><b></b></i></div>
    <div class="status" hidden><span></span><i><b></b></i></div>
    <div class="comms" hidden><b></b><span></span></div>
    <div class="scope" hidden><i></i><i></i><b></b></div>
    <canvas class="minimap" width="176" height="176"></canvas>
    <div class="warn" hidden></div>
    <div class="bag" hidden></div>
    <div class="feed"></div>
    <div class="lootlist"></div>
    <div class="vitals">
      <div class="bar armor"><i></i><span></span></div>
      <div class="bar health"><i></i><span></span></div>
      <div class="kit"><span class="k-bandage"><em>✚</em><b>0</b><kbd>Q</kbd></span><span class="k-grenade"><em>●</em><b>0</b><kbd>G</kbd></span><span class="k-value"><em>◈</em><b>0</b></span></div>
    </div>
    <div class="ammo"><div class="a-name"></div><div class="a-count"><b>30</b><span>/ 120</span></div><div class="a-note"></div><div class="a-slots"><span data-w="rifle">1</span><span data-w="pistol">2</span><span data-w="marksman">3</span></div></div>`;
  root.appendChild(play);
  const q = (selector, from = play) => from.querySelector(selector);
  const tape = q('.tape'),
    compassMarks = q('.cmarks'),
    marks = q('.marks'),
    hurt = q('.hurt'),
    vignette = q('.vignette'),
    prompt = q('.prompt'),
    status = q('.status'),
    comms = q('.comms'),
    feed = q('.feed'),
    lootList = q('.lootlist'),
    cross = q('.cross'),
    hitmark = q('.hitmark');

  function buildTape() {
    const names =
      settings.lang === 'zh'
        ? ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
        : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    let html = '';
    // Three turns of the dial side by side, so it can slide without a seam.
    for (let turn = 0; turn < 3; turn++)
      for (let degree = 0; degree < 360; degree += 15) {
        const label = degree % 45 === 0 ? `<b>${names[degree / 45]}</b>` : `<span>${degree}</span>`;
        html += `<i style="left:${(turn * 360 + degree) * PX_PER_DEGREE}px">${label}</i>`;
      }
    tape.innerHTML = html;
  }

  // Markers that sit over things in the world, and their twins on the compass.
  const markerFor = new Map();
  function marker(key, className, letter) {
    let item = markerFor.get(key);
    if (!item) {
      item = {
        node: el('div', 'mark ' + className, `<i>${letter}</i><span></span>`),
        onCompass: el('i', 'cmark ' + className, letter),
      };
      marks.appendChild(item.node);
      compassMarks.appendChild(item.onCompass);
      markerFor.set(key, item);
    }
    return item;
  }

  // ---- menus -------------------------------------------------------------------------------
  const menu = el('div', 'menu');
  root.appendChild(menu);
  function buildMenu() {
    const keys = t.keys.map(([key, what]) => `<li><kbd>${key}</kbd><span>${what}</span></li>`).join('');
    const seg = (name, options, labels) =>
      `<div class="seg" data-seg="${name}">${options.map((o) => `<button data-v="${o}">${labels[o] ?? o}</button>`).join('')}</div>`;
    menu.innerHTML = `
      <section class="m-screen m-title" data-s="title">
        <div class="m-eyebrow"><span>${t.eyebrow}</span><span class="m-dim">${t.place}</span></div>
        <h1 class="m-word">${t.title}</h1>
        <p class="m-premise">${t.premise}</p>
        <div class="m-actions"><button class="btn primary" data-act="deploy">${t.deploy}</button><button class="btn" data-act="settings">${t.settings}</button><button class="btn" data-act="controls">${t.controls}</button></div>
        <p class="m-note">${t.note}</p>
      </section>
      <section class="m-screen m-card" data-s="pause">
        <div class="m-k">${t.paused}</div><h2>${t.title}</h2>
        <div class="m-actions col"><button class="btn primary" data-act="resume">${t.resume}</button><button class="btn" data-act="settings">${t.settings}</button><button class="btn" data-act="controls">${t.controls}</button><button class="btn" data-act="restart">${t.restart}</button></div>
      </section>
      <section class="m-screen m-card" data-s="dead">
        <div class="m-k bad">${t.deadSub}</div><h2>${t.dead}</h2>
        <dl class="m-stats"><div><dt>${t.survived}</dt><dd data-f="dead-time">00:00</dd></div><div><dt>${t.terminals}</dt><dd data-f="dead-terminals">0/3</dd></div></dl>
        <div class="m-actions col"><button class="btn primary" data-act="restart">${t.retry}</button><button class="btn" data-act="settings">${t.settings}</button></div>
      </section>
      <section class="m-screen m-card wide" data-s="debrief">
        <div class="m-k">${t.debriefSub}</div><h2>${t.debrief}</h2>
        <div class="m-rating"><span>${t.rating}</span><b data-f="rating">A</b></div>
        <dl class="m-stats four"><div><dt>${t.time}</dt><dd data-f="time">00:00</dd></div><div><dt>${t.accuracy}</dt><dd data-f="accuracy">0%</dd></div><div><dt>${t.kills}</dt><dd data-f="kills">0</dd></div><div><dt>${t.headshots}</dt><dd data-f="headshots">0</dd></div></dl>
        <div class="m-k">${t.carried}</div><ul class="m-loot" data-f="loot"></ul>
        <div class="m-total"><span>${t.total}</span><b data-f="total">0</b></div>
        <div class="m-actions"><button class="btn primary" data-act="restart">${t.redeploy}</button><button class="btn" data-act="settings">${t.settings}</button></div>
      </section>
      <div class="panel" hidden>
        <div class="panel-h"><button class="tab" data-tab="settings">${t.settings}</button><button class="tab" data-tab="controls">${t.controls}</button><button class="btn small" data-act="close">${t.close}</button></div>
        <div class="panel-b" data-pane="settings">
          <label><span>${t.quality}</span>${seg('quality', ['low', 'medium', 'high'], t.qualityNames)}</label>
          <label><span>${t.sensitivity}</span><input type="range" data-set="sensitivity" min="0.3" max="3" step="0.05"><output data-o="sensitivity"></output></label>
          <label><span>${t.fov}</span><input type="range" data-set="fov" min="60" max="95" step="1"><output data-o="fov"></output></label>
          <label><span>${t.volume}</span><input type="range" data-set="volume" min="0" max="1" step="0.05"><output data-o="volume"></output></label>
          <label><span>${t.invert}</span>${seg('invertY', ['off', 'on'], { off: t.off, on: t.on })}</label>
          <label><span>${t.language}</span>${seg('lang', ['zh', 'en'], { zh: '中文', en: 'English' })}</label>
          <label><span>${t.fullscreen}</span><button class="btn small" data-act="fullscreen">⛶</button></label>
        </div>
        <div class="panel-b" data-pane="controls" hidden><ul class="keys">${keys}</ul><p class="m-note">${t.touchHelp}</p></div>
      </div>`;
    menu.dataset.screen = hud.screen;
    syncSettings();
    q('.a-name').textContent = '';
    cache.weapon = '';
    cache.objective = '';
  }
  const field = (name) => menu.querySelector(`[data-f="${name}"]`);
  function syncSettings() {
    for (const group of menu.querySelectorAll('.seg')) {
      const key = group.dataset.seg,
        value = key === 'invertY' ? (settings.invertY ? 'on' : 'off') : settings[key];
      for (const button of group.children) button.setAttribute('aria-pressed', String(button.dataset.v === String(value)));
    }
    for (const input of menu.querySelectorAll('input[data-set]')) {
      const key = input.dataset.set;
      input.value = settings[key];
      const out = menu.querySelector(`[data-o="${key}"]`);
      out.textContent =
        key === 'volume'
          ? Math.round(settings.volume * 100) + '%'
          : key === 'fov'
            ? settings.fov + '°'
            : settings.sensitivity.toFixed(2) + '×';
    }
  }
  function openPanel(tab) {
    const panel = menu.querySelector('.panel');
    panel.hidden = false;
    for (const pane of panel.querySelectorAll('.panel-b')) pane.hidden = pane.dataset.pane !== tab;
    for (const button of panel.querySelectorAll('.tab')) button.setAttribute('aria-selected', String(button.dataset.tab === tab));
  }
  menu.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    actions.click?.();
    if (button.dataset.tab) return openPanel(button.dataset.tab);
    const group = button.closest('.seg');
    if (group) {
      const key = group.dataset.seg;
      settings[key] = key === 'invertY' ? button.dataset.v === 'on' : button.dataset.v;
      if (key === 'lang') hud.setLanguage(settings.lang);
      syncSettings();
      actions.changed?.(key);
      return;
    }
    const act = button.dataset.act;
    if (act === 'settings' || act === 'controls') openPanel(act);
    else if (act === 'close') menu.querySelector('.panel').hidden = true;
    else if (act === 'fullscreen') {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    } else actions[act]?.();
  });
  menu.addEventListener('input', (event) => {
    const key = event.target.dataset?.set;
    if (!key) return;
    settings[key] = Number(event.target.value);
    syncSettings();
    actions.changed?.(key);
  });

  // ---- touch controls ----------------------------------------------------------------------
  const touch = el('div', 'touch');
  touch.hidden = true;
  root.appendChild(touch);
  function buildTouch() {
    const b = t.touch;
    touch.innerHTML = `<div class="stick"><i></i></div>
      <button data-t="fire" class="t-fire">${b.fire}</button><button data-t="aim" class="t-aim">${b.aim}</button>
      <button data-t="jump" class="t-jump">${b.jump}</button><button data-t="reload" class="t-reload">${b.reload}</button>
      <button data-t="crouch" class="t-crouch">${b.crouch}</button><button data-t="interact" class="t-use">${b.use}</button>
      <button data-t="heal" class="t-heal">${b.heal}</button><button data-t="grenade" class="t-nade">${b.grenade}</button>
      <button data-t="swap" class="t-swap">${b.swap}</button><button data-t="pause" class="t-pause">${b.pause}</button>`;
  }
  hud.touch = touch;

  // ---- language ----------------------------------------------------------------------------
  hud.setLanguage = (lang) => {
    settings.lang = lang;
    t = TEXT[lang] ?? TEXT.en;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = lang === 'zh' ? '断流行动 / Operation Cutoff' : 'Operation Cutoff / 断流行动';
    buildTape();
    buildMenu();
    buildTouch();
    for (const item of markerFor.values()) {
      item.node.remove();
      item.onCompass.remove();
    }
    markerFor.clear();
  };

  /** Which menu shows: 'title', 'pause', 'dead', 'debrief', or 'none' while playing. */
  hud.show = (screen) => {
    hud.screen = screen;
    menu.dataset.screen = screen;
    menu.querySelector('.panel').hidden = true;
    play.hidden = screen === 'title';
    play.classList.toggle('dim', screen !== 'none');
  };
  hud.setTouch = (on) => {
    touch.hidden = !on || hud.screen !== 'none';
    play.classList.toggle('touching', on);
  };
  hud.setDead = (game) => {
    field('dead-time').textContent = clock(game.t);
    field('dead-terminals').textContent = `${game.terminalsDone}/${game.terminals.length}`;
  };
  hud.setDebrief = (game) => {
    const s = game.stats;
    field('rating').textContent = game.rating();
    field('time').textContent = clock(game.t);
    field('accuracy').textContent = s.shots ? Math.round((100 * s.hits) / s.shots) + '%' : '—';
    field('kills').textContent = s.kills;
    field('headshots').textContent = s.headshots;
    const lines = [
      `<li style="--c:${RARITY_CSS[4]}"><span>${t.intel} ×${game.terminalsDone}</span><b>${money(game.terminalsDone * MISSION.intelValue)}</b></li>`,
    ];
    for (const item of [...game.loot].sort((a, b) => b.value - a.value))
      lines.push(`<li style="--c:${RARITY_CSS[item.rarity]}"><span>${t.items[item.key]}</span><b>${money(item.value)}</b></li>`);
    field('loot').innerHTML = lines.join('');
    field('total').textContent = money(game.lootValue);
  };

  // ---- what happened -----------------------------------------------------------------------
  const timed = (node, seconds) => setTimeout(() => node.remove(), seconds * 1000);
  const feedLine = (html, className = '') => {
    const line = el('div', 'feed-line ' + className, html);
    feed.prepend(line);
    while (feed.children.length > 5) feed.lastChild.remove();
    timed(line, 4.5);
  };
  let commsLeft = 0,
    hitLeft = 0,
    hurtPulse = 0;
  hud.handle = (event) => {
    switch (event.type) {
      case 'shot':
        if (event.enemy) {
          hitmark.className = 'hitmark on' + (event.killed ? ' kill' : '') + (event.head ? ' head' : '');
          hitLeft = event.killed ? 0.32 : 0.16;
        }
        break;
      case 'enemyDown':
        feedLine(
          `<b>${t.killed}</b> ${t.enemies[event.enemy.kind]}${event.head ? ` <em>${t.headshot}</em>` : ''}`,
          event.head ? 'head' : '',
        );
        break;
      case 'bark':
        feedLine(`<b>${t.enemies[event.enemy.kind]}</b> ${t.barks[event.key] ?? ''}`, 'enemy');
        if (event.key === 'grenade') {
          warn.hidden = false;
          warn.textContent = t.grenadeWarn;
          warnLeft = 2.6;
        }
        break;
      case 'lootLeft':
        feedLine(`${t.bagFull} <em>${t.items[event.item.key]}</em>`);
        break;
      case 'loot':
        for (const item of event.items) {
          const line = el(
            'div',
            'loot-line',
            `<i></i><span>${t.items[item.key]}</span>${item.value ? `<b>${money(item.value)}</b>` : ''}`,
          );
          line.style.setProperty('--c', RARITY_CSS[item.rarity]);
          lootList.prepend(line);
          timed(line, 5);
        }
        break;
      case 'terminal':
        feedLine(`<b>${t.places[event.terminal.key]}</b> ✓ <em>+${money(MISSION.intelValue)}</em>`, 'good');
        break;
      case 'comms':
        comms.hidden = false;
        comms.firstElementChild.textContent = t.speaker;
        comms.lastElementChild.textContent = t.comms[event.key] ?? '';
        commsLeft = 5.5;
        break;
      case 'playerHit': {
        const arc = el('i', 'arc' + (event.armor ? ' armor' : ''));
        // Bearing is counted to the left; the page turns clockwise.
        arc.style.transform = `rotate(${-event.bearing}rad)`;
        hurt.appendChild(arc);
        timed(arc, 0.9);
        hurtPulse = Math.min(1, hurtPulse + 0.25 + event.amount / 40);
        break;
      }
      default:
    }
  };

  // ---- every frame -------------------------------------------------------------------------
  const cache = {
    weapon: '',
    objective: '',
    ammo: -1,
    reserve: -1,
    health: -1,
    armor: -1,
    bandages: -1,
    grenades: -1,
    value: -1,
    clock: '',
    note: '',
    gap: -1,
  };
  const letters = ['A', 'B', 'C'];
  /**
   * Refresh the display. `eye` is where the camera is and how it looks:
   * { x, y, z, yaw, pitch, fov (vertical, degrees), aspect }.
   */
  // ---- minimap: the station from above, turned so that ahead is up -------------------------------
  const MAP_SCALE = 2.6, // pixels per metre
    minimap = q('.minimap'),
    pen = minimap.getContext('2d'),
    plan = document.createElement('canvas');
  plan.width = Math.ceil((BOUNDS.maxX - BOUNDS.minX + 8) * MAP_SCALE);
  plan.height = Math.ceil((BOUNDS.maxZ - BOUNDS.minZ + 8) * MAP_SCALE);
  {
    // The plan is drawn once: ground, then every solid box by height.
    const c = plan.getContext('2d'),
      at = (v, min) => (v - min + 4) * MAP_SCALE;
    c.fillStyle = 'rgba(20, 28, 30, 0.9)';
    c.fillRect(0, 0, plan.width, plan.height);
    for (const b of BOXES) {
      if (!b.solid || b.kind === 'roof' || b.y - b.h / 2 > 2.5 || b.w > 60 || b.d > 60) continue;
      c.fillStyle = b.h > 3 ? 'rgba(170, 182, 176, 0.9)' : b.h > 1.6 ? 'rgba(120, 132, 128, 0.9)' : 'rgba(86, 96, 94, 0.9)';
      c.fillRect(
        at(b.x - b.w / 2, BOUNDS.minX),
        at(b.z - b.d / 2, BOUNDS.minZ),
        Math.max(1.5, b.w * MAP_SCALE),
        Math.max(1.5, b.d * MAP_SCALE),
      );
    }
    c.strokeStyle = 'rgba(200, 210, 204, 0.8)';
    c.lineWidth = 2;
    c.strokeRect(
      at(BOUNDS.minX, BOUNDS.minX),
      at(BOUNDS.minZ, BOUNDS.minZ),
      (BOUNDS.maxX - BOUNDS.minX) * MAP_SCALE,
      (BOUNDS.maxZ - BOUNDS.minZ) * MAP_SCALE,
    );
  }
  function drawMinimap(game, yaw, time) {
    const p = game.player,
      size = minimap.width,
      half = size / 2;
    pen.clearRect(0, 0, size, size);
    pen.save();
    pen.beginPath();
    pen.arc(half, half, half - 2, 0, Math.PI * 2);
    pen.clip();
    pen.translate(half, half);
    pen.rotate(yaw);
    pen.translate(-(p.x - BOUNDS.minX + 4) * MAP_SCALE, -(p.z - BOUNDS.minZ + 4) * MAP_SCALE);
    pen.drawImage(plan, 0, 0);
    const dot = (x, z, colour, radius) => {
      pen.fillStyle = colour;
      pen.beginPath();
      pen.arc((x - BOUNDS.minX + 4) * MAP_SCALE, (z - BOUNDS.minZ + 4) * MAP_SCALE, radius, 0, Math.PI * 2);
      pen.fill();
    };
    for (const terminal of game.terminals) if (!terminal.done) dot(terminal.x, terminal.z, '#58e0ff', 5);
    if (game.terminalsDone === game.terminals.length) dot(PLACES.helipad.x, PLACES.helipad.z, '#5fe8b0', 7);
    for (const crate of game.crates) if (!crate.opened) dot(crate.x, crate.z, '#ffbf33', 2.5);
    // Soldiers show only while in view or just after firing, as on a real threat display.
    for (const enemy of game.enemies)
      if (!enemy.dead && (enemy.sees || enemy.firedAgo < 2.5)) dot(enemy.x, enemy.z, '#ff5a4a', 3.5);
    for (const grenade of game.grenades) if (Math.floor(time * 8) % 2) dot(grenade.x, grenade.z, '#ffffff', 3);
    pen.restore();
    // The operator: an arrow at the centre, always pointing up. Then the rim and a north mark.
    pen.fillStyle = '#e9efe9';
    pen.beginPath();
    pen.moveTo(half, half - 8);
    pen.lineTo(half + 5.5, half + 6);
    pen.lineTo(half, half + 3);
    pen.lineTo(half - 5.5, half + 6);
    pen.closePath();
    pen.fill();
    pen.strokeStyle = 'rgba(233, 239, 233, 0.45)';
    pen.lineWidth = 1.5;
    pen.beginPath();
    pen.arc(half, half, half - 2, 0, Math.PI * 2);
    pen.stroke();
    pen.fillStyle = '#5fe8b0';
    pen.font = 'bold 11px sans-serif';
    pen.textAlign = 'center';
    pen.textBaseline = 'middle';
    pen.fillText('N', half + Math.sin(yaw) * (half - 10), half - Math.cos(yaw) * (half - 10));
  }

  // ---- backpack: a grid of what has been found, with the weapons and kit beside it ----------------
  const bag = q('.bag'),
    warn = q('.warn');
  let warnLeft = 0,
    bagKey = '',
    mapTime = 0;
  function fillBag(game) {
    const p = game.player,
      cells = [];
    const loot = [...game.loot].sort((a, b) => b.value - a.value);
    for (let i = 0; i < BACKPACK; i++) {
      const item = loot[i];
      cells.push(
        item
          ? `<li style="--c:${RARITY_CSS[item.rarity]}"><span>${t.items[item.key]}</span><b>${money(item.value)}</b></li>`
          : '<li class="empty"></li>',
      );
    }
    const guns = Object.keys(game.weapons)
      .map((key, i) => {
        const w = game.weapons[key];
        return `<li class="${key === p.weapon ? 'on' : ''}"><kbd>${i + 1}</kbd><span>${t.weapons[key]}</span><b>${w.ammo} / ${Number.isFinite(w.reserve) ? w.reserve : '∞'}</b></li>`;
      })
      .join('');
    const fitted = game.attachments.length
      ? game.attachments.map((key) => `<i>${t.items[key]}</i>`).join('')
      : `<i class="dim">${t.none}</i>`;
    bag.innerHTML = `
      <div class="bag-h"><b>${t.bag}</b><span>${game.loot.length} / ${BACKPACK}</span><em>◈ ${money(game.lootValue)}</em><small>${t.bagHint}</small></div>
      <div class="bag-b">
        <ul class="bag-grid">${cells.join('')}</ul>
        <div class="bag-side">
          <ul class="bag-guns">${guns}</ul>
          <div class="bag-k">${t.fitted}</div><div class="bag-tags">${fitted}</div>
          <div class="bag-k">${t.supplies}</div>
          <div class="bag-tags"><i>✚ ${t.items.bandage} ×${p.bandages}</i><i>● ${t.items.grenade} ×${p.grenades}</i><i>${t.intel} ×${game.terminalsDone}（${money(game.terminalsDone * RULES.intelValue)}）</i></div>
        </div>
      </div>`;
  }
  /** Open or close the backpack; with no argument it flips. The run goes on while it is open. */
  hud.toggleBag = (open = bag.hidden) => {
    bag.hidden = !open;
    bagKey = '';
  };

  hud.update = (game, dt, eye) => {
    // Through the marksman rifle's scope the view is a lit circle with a fine cross.
    q('.scope').hidden = !(game.player.weapon === 'marksman' && game.player.aim > 0.8);
    mapTime += dt;
    drawMinimap(game, eye.yaw, mapTime);
    if (warnLeft > 0 && (warnLeft -= dt) <= 0) warn.hidden = true;
    if (!bag.hidden) {
      const key = `${game.loot.length}|${game.lootValue}|${game.attachments.length}|${game.player.weapon}|${game.weapons[game.player.weapon].ammo}|${game.player.bandages}|${game.player.grenades}`;
      if (key !== bagKey) {
        bagKey = key;
        fillBag(game);
      }
    }
    const p = game.player,
      weapon = game.weapons[p.weapon];
    // Vitals.
    const health = Math.ceil(p.health),
      armor = Math.ceil(p.armor);
    if (health !== cache.health) {
      cache.health = health;
      const bar = q('.health');
      bar.firstElementChild.style.width = (100 * p.health) / PLAYER.health + '%';
      bar.lastElementChild.textContent = health;
      bar.classList.toggle('low', health <= 30);
    }
    if (armor !== cache.armor) {
      cache.armor = armor;
      const bar = q('.armor');
      bar.firstElementChild.style.width = (100 * p.armor) / PLAYER.armor + '%';
      bar.lastElementChild.textContent = armor;
    }
    if (p.bandages !== cache.bandages) q('.k-bandage b').textContent = cache.bandages = p.bandages;
    if (p.grenades !== cache.grenades) q('.k-grenade b').textContent = cache.grenades = p.grenades;
    if (game.lootValue !== cache.value) {
      cache.value = game.lootValue;
      q('.k-value b').textContent = money(game.lootValue);
      const node = q('.k-value');
      node.classList.remove('bump');
      void node.offsetWidth;
      node.classList.add('bump');
    }
    // Weapon.
    if (p.weapon !== cache.weapon) {
      cache.weapon = p.weapon;
      q('.a-name').textContent = t.weapons[p.weapon];
      for (const slot of play.querySelectorAll('.a-slots span')) slot.classList.toggle('on', slot.dataset.w === p.weapon);
    }
    if (weapon.ammo !== cache.ammo || weapon.reserve !== cache.reserve) {
      cache.ammo = weapon.ammo;
      cache.reserve = weapon.reserve;
      q('.a-count b').textContent = weapon.ammo;
      q('.a-count span').textContent = '/ ' + (Number.isFinite(weapon.reserve) ? weapon.reserve : '∞');
      q('.a-count').classList.toggle('low', weapon.ammo <= weapon.mag * 0.25);
    }
    const note =
      weapon.ammo === 0 && weapon.reserve === 0
        ? t.noAmmo
        : weapon.ammo <= weapon.mag * 0.25 && weapon.reloading <= 0
          ? t.lowAmmo
          : '';
    if (note !== cache.note) q('.a-note').textContent = cache.note = note;

    // Crosshair: the gap follows how wide the shot will scatter; it goes away behind the sight.
    const spread = weapon.def.spread[0] + (weapon.def.spread[1] - weapon.def.spread[0]) * p.aim,
      gap = Math.round(5 + spread * (1 + weapon.heat * 1.4) * (p.speed > 1 ? 1.5 : 1) * (p.grounded ? 1 : 2.2) * 620);
    if (gap !== cache.gap) cross.style.setProperty('--gap', (cache.gap = gap) + 'px');
    cross.style.opacity = p.sprinting || p.healing > 0 ? 0.25 : p.weapon === 'pistol' ? 1 - p.aim * 0.6 : 1 - p.aim;
    if (hitLeft > 0 && (hitLeft -= dt) <= 0) hitmark.className = 'hitmark';

    // Objective and clock.
    const extract = game.terminalsDone === game.terminals.length,
      eta = extract ? Math.ceil(game.heliEta) : 0,
      objectiveKey = (extract ? 'x' + eta : 'o') + game.terminalsDone + settings.lang;
    if (objectiveKey !== cache.objective) {
      cache.objective = objectiveKey;
      q('.obj-title').textContent = extract
        ? t.objectiveExtract + (eta > 0 ? `  ·  ${t.eta} ${clock(eta)}` : '')
        : `${t.objective}  ${game.terminalsDone}/${game.terminals.length}`;
      q('.obj-list').innerHTML = game.terminals
        .map((terminal, i) => `<li class="${terminal.done ? 'done' : ''}"><i>${letters[i]}</i>${t.places[terminal.key]}</li>`)
        .join('');
    }
    const time = clock(game.t);
    if (time !== cache.clock) q('.obj-clock').textContent = cache.clock = time;

    // Compass: the dial slides so that the bearing looked along sits under the needle.
    const bearing = ((((-eye.yaw * 180) / Math.PI) % 360) + 360) % 360;
    tape.style.transform = `translateX(${-(360 + bearing) * PX_PER_DEGREE}px)`;

    // Markers: terminals still to do, the helipad once it is time, crates close by.
    const sinYaw = Math.sin(eye.yaw),
      cosYaw = Math.cos(eye.yaw),
      sinPitch = Math.sin(eye.pitch),
      cosPitch = Math.cos(eye.pitch),
      tanV = Math.tan((eye.fov * Math.PI) / 360),
      tanH = tanV * eye.aspect;
    const place = (item, x, y, z, visible, label) => {
      item.node.hidden = item.onCompass.hidden = !visible;
      if (!visible) return;
      const dx = x - eye.x,
        dy = y - eye.y,
        dz = z - eye.z,
        distance = Math.sqrt(dx * dx + dz * dz);
      // Into the camera's own axes: right, up, forward.
      const right = dx * cosYaw - dz * sinYaw,
        flat = -dx * sinYaw - dz * cosYaw,
        forward = flat * cosPitch + dy * sinPitch,
        up = dy * cosPitch - flat * sinPitch;
      let sx = right / (Math.abs(forward) * tanH || 1e-6),
        sy = up / (Math.abs(forward) * tanV || 1e-6);
      const behind = forward <= 0.05,
        off = behind || Math.abs(sx) > 0.94 || Math.abs(sy) > 0.9;
      if (off) {
        // Pin it to the edge of the screen, on the side to turn towards.
        const angle = Math.atan2(behind ? -Math.abs(sy) - 0.5 : sy, behind ? (right >= 0 ? 1 : -1) * (Math.abs(sx) + 1) : sx),
          reach = Math.min(0.94 / Math.abs(Math.cos(angle) || 1e-6), 0.86 / Math.abs(Math.sin(angle) || 1e-6));
        sx = Math.cos(angle) * reach;
        sy = Math.sin(angle) * reach;
      }
      item.node.style.transform = `translate(${(50 + sx * 50).toFixed(2)}vw, ${(50 - sy * 50).toFixed(2)}vh)`;
      item.node.classList.toggle('edge', off);
      item.node.lastElementChild.textContent = label ?? Math.round(distance) + ' m';
      let turn = (Math.atan2(dx, -dz) * 180) / Math.PI - bearing;
      turn = ((turn + 540) % 360) - 180;
      item.onCompass.style.transform = `translateX(${turn * PX_PER_DEGREE}px)`;
      item.onCompass.style.opacity = Math.abs(turn) > 80 ? 0 : 1;
    };
    game.terminals.forEach((terminal, i) =>
      place(marker('t' + i, 'terminal', letters[i]), terminal.x, 1.7, terminal.z, !terminal.done),
    );
    const pad = PLACES.helipad;
    place(marker('pad', 'pad', '▲'), pad.x, 1.2, pad.z, extract);
    game.crates.forEach((crate, i) => {
      const near = !crate.opened && Math.hypot(crate.x - p.x, crate.z - p.z) < 13;
      const item = marker('c' + i, 'crate', '');
      place(item, crate.x, 0.9, crate.z, near, '');
      item.onCompass.hidden = true;
    });

    // Prompts and progress.
    const use = game.prompt;
    prompt.hidden = !use;
    if (use) {
      prompt.firstElementChild.textContent = (hud.touchMode ? t.useTouch : t.use)[use.kind];
      prompt.lastElementChild.firstElementChild.style.width = Math.round((use.progress ?? 0) * 100) + '%';
    }
    let busy = '',
      share = 0;
    if (game.extracting > 0) {
      busy = t.extracting;
      share = game.extracting / MISSION.extractSeconds;
    } else if (p.healing > 0) {
      busy = t.healing;
      share = 1 - p.healing / PLAYER.bandageTime;
    } else if (weapon.reloading > 0) {
      busy = t.reloading;
      share = 1 - weapon.reloading / weapon.reloadTime;
    }
    status.hidden = !busy;
    if (busy) {
      status.firstElementChild.textContent = busy;
      status.lastElementChild.firstElementChild.style.width = Math.round(Math.min(1, share) * 100) + '%';
    }
    if (commsLeft > 0 && (commsLeft -= dt) <= 0) comms.hidden = true;

    // The edges of the screen redden when hit and stay dark when badly hurt.
    hurtPulse = Math.max(0, hurtPulse - dt * 1.6);
    const low = Math.max(0, 1 - p.health / 45);
    vignette.style.opacity = Math.min(1, hurtPulse * 0.8 + low * 0.55);
  };

  hud.reset = () => {
    bag.hidden = true;
    warn.hidden = true;
    feed.innerHTML = lootList.innerHTML = hurt.innerHTML = '';
    comms.hidden = true;
    commsLeft = 0;
    hurtPulse = 0;
    cache.objective = '';
  };

  hud.setLanguage(settings.lang);
  hud.show('title');
  return hud;
}
