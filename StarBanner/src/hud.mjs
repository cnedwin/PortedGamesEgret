// 战斗界面（DOM）：顶部的回合与双方指挥官卡（头像、生命、金币、战意槽），左下的地形卡，右下的单位卡，行动菜单，
// 招募面板，战斗预测，回合横幅，飘字，单位头顶的生命数字，以及屏幕角上的几个按钮。菜单能用鼠标、触屏，也能由
// 控制器转来的方向键和确定/取消操作。
// The battle interface (DOM): the turn and both commanders at the top (portrait, health, gold, rally meter), the
// terrain card at the lower left, the unit card at the lower right, the action menu, the recruit panel, the battle
// forecast, the turn banner, floating figures, the health number over each unit, and a few buttons in the corner.
// Menus answer the mouse and touch, and the arrows and confirm/cancel the controller passes on.
import { t, say } from './i18n.mjs';
import { UNITS, BUILDINGS } from './sim/units.mjs';
import { TERRAIN } from './sim/terrain.mjs';
import { COMMANDERS } from './sim/commanders.mjs';
import { TEAMS } from './view/toon.mjs';

const PORTRAIT = (id) => new URL(`../assets/portraits/${id}.webp`, import.meta.url).href;
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const stars = (n) => (n >= 0 ? '★'.repeat(n) + '☆'.repeat(Math.max(0, 4 - n)) : '☠'.repeat(-n));

export function createHud(root, { onButton, touch = false }) {
  root.innerHTML = '';
  const hud = el('div', 'hud');
  root.append(hud);
  if (touch) hud.classList.add('touch');

  // ---- top: turn and commanders ----
  const top = el('div', 'hud-top');
  const turnChip = el('div', 'turn-chip');
  const cards = [el('div', 'cmd-card'), el('div', 'cmd-card')];
  top.append(cards[0], turnChip, cards[1]);
  hud.append(top);

  // ---- lower cards ----
  const tileCard = el('div', 'tile-card hidden');
  const unitCard = el('div', 'unit-card hidden');
  hud.append(tileCard, unitCard);

  // ---- buttons ----
  const bar = el('div', 'hud-bar');
  const button = (key, label, icon) => {
    const b = el('button', 'hud-btn b-' + key);
    b.type = 'button';
    b.innerHTML = `<span class="ico">${icon}</span><span class="lbl"></span>`;
    b.querySelector('.lbl').textContent = label;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', () => onButton(key));
    return b;
  };
  const buttons = {
    endTurn: button('endTurn', t('endTurn'), '⚑'),
    next: button('next', t('next'), '➜'),
    threat: button('threat', t('threat'), '◎'),
    turnLeft: button('turnLeft', t('turnLeft'), '↺'),
    turnRight: button('turnRight', t('turnRight'), '↻'),
    zoomIn: button('zoomIn', t('zoomIn'), '＋'),
    zoomOut: button('zoomOut', t('zoomOut'), '－'),
    menu: button('menu', t('menu'), '☰')
  };
  bar.append(...Object.values(buttons));
  hud.append(bar);

  // ---- hint, banner, toasts, floats, badges ----
  const hint = el('div', 'hint hidden');
  const banner = el('div', 'banner hidden');
  const toasts = el('div', 'toasts');
  const floats = el('div', 'floats');
  const badges = el('div', 'badges');
  hud.append(badges, floats, hint, banner, toasts);

  let menu = null;

  function commanderCard(card, p, side, current, human) {
    const c = COMMANDERS[p.commander];
    const team = TEAMS[side];
    card.style.setProperty('--team', team.css);
    card.classList.toggle('active', current);
    card.classList.toggle('right', side === 1);
    card.innerHTML = '';
    const face = el('img', 'face');
    face.src = PORTRAIT(p.commander);
    face.alt = say(c);
    const info = el('div', 'info');
    const name = el('div', 'name', `${say(c)}${human ? ` · ${t('you')}` : ''}`);
    const row = el('div', 'row');
    row.append(el('span', 'gold', t('gold', { n: p.gold })), el('span', 'hp', `♥ ${p.hp ?? '—'}`));
    const meter = el('div', 'meter');
    const fill = el('i');
    fill.style.width = `${Math.round((100 * p.meter) / c.meter)}%`;
    meter.append(fill);
    meter.classList.toggle('full', p.meter >= c.meter);
    meter.title = `${t('meter')} ${p.meter}/${c.meter} · ${say(c.art)}`;
    info.append(name, row, meter);
    card.append(face, info);
    if (!p.alive) card.classList.add('out');
  }

  const api = {
    /** The top bar: turn number and the two commanders. */
    top({ turn, current, players, human }) {
      turnChip.innerHTML = '';
      turnChip.style.setProperty('--team', TEAMS[current].css);
      turnChip.append(el('b', '', t('turn', { n: turn })), el('span', '', current === human ? t('yourTurn') : t('foeTurn')));
      players.forEach((p, i) => commanderCard(cards[i], p, i, current === i, i === human));
    },
    /** The terrain card for a tile; `building` and the stars as the rules see them. */
    tile(info) {
      if (!info) return tileCard.classList.add('hidden');
      tileCard.classList.remove('hidden');
      tileCard.innerHTML = '';
      const name = info.building ? say(BUILDINGS[info.building.kind]) : say(TERRAIN[info.terrain]);
      tileCard.append(el('div', 'name', name));
      const def = info.building ? 0 : TERRAIN[info.terrain].defence;
      const s = el('div', 'stars' + (def < 0 ? ' skull' : ''), stars(def));
      s.title = `${t('defence')} ${def}`;
      tileCard.append(s);
      if (info.building) {
        const b = info.building;
        const who = b.owner < 0 ? t('neutral') : b.owner === info.human ? t('you') : t('foe');
        const line = el('div', 'line', `${t('owner')}：${who}${b.owner >= 0 ? ` · ${t('hp')} ${b.hp}` : ''}`);
        if (b.owner >= 0) line.style.color = TEAMS[b.owner].css;
        tileCard.append(line);
        if (BUILDINGS[b.kind].income) tileCard.append(el('div', 'line small', t('income', { n: BUILDINGS[b.kind].income })));
      }
    },
    /** The unit card: portrait, health, movement, range and when it lands a critical. */
    unit(info) {
      if (!info) return unitCard.classList.add('hidden');
      const u = info.unit;
      const spec = UNITS[u.type];
      unitCard.classList.remove('hidden');
      unitCard.innerHTML = '';
      unitCard.style.setProperty('--team', TEAMS[u.owner].css);
      const face = el('img', 'face');
      const model = u.type === 'commander' ? u.commander : u.type;
      face.src = PORTRAIT(model);
      face.alt = '';
      const body = el('div', 'body');
      const title = u.type === 'commander' ? say(COMMANDERS[u.commander]) : say(spec);
      body.append(el('div', 'name', title));
      const hpBar = el('div', 'hpbar');
      const fill = el('i');
      fill.style.width = `${u.hp}%`;
      hpBar.append(fill);
      body.append(hpBar);
      const stats = el('div', 'stats');
      stats.append(el('span', '', `♥ ${u.hp}`), el('span', '', `${t('move')} ${spec.steps}`));
      if (spec.weapon) stats.append(el('span', '', `${t('range')} ${spec.weapon.min === spec.weapon.max ? spec.weapon.max : `${spec.weapon.min}-${spec.weapon.max}`}`));
      body.append(stats);
      if (spec.crit) body.append(el('div', 'crit', `${t('critRule')}：${t('rule_' + spec.crit.rule)}（×${spec.crit.power}）`));
      else if (u.type === 'commander') body.append(el('div', 'crit', `${t('art')}：${say(COMMANDERS[u.commander].art)}`));
      if (u.cargo?.length) body.append(el('div', 'crit', u.cargo.map((c) => say(UNITS[c.type])).join('、')));
      unitCard.append(face, body);
    },
    hint(text) {
      hint.classList.toggle('hidden', !text);
      hint.textContent = text ?? '';
    },
    /** The action menu near (x, y) on screen; `items` are { key, label, note, disabled }. */
    menu(items, at, { title } = {}) {
      api.closeMenu();
      const box = el('div', 'menu');
      box.setAttribute('role', 'menu');
      if (title) box.append(el('div', 'menu-title', title));
      const rows = items.map((item, i) => {
        const b = el('button', 'menu-item' + (item.disabled ? ' disabled' : ''));
        b.type = 'button';
        b.setAttribute('role', 'menuitem');
        b.innerHTML = `<span class="l"></span><span class="n"></span>`;
        b.querySelector('.l').textContent = item.label;
        b.querySelector('.n').textContent = item.note ?? '';
        if (item.icon) {
          const img = el('img', 'mi');
          img.src = PORTRAIT(item.icon);
          img.alt = '';
          b.prepend(img);
        }
        b.addEventListener('pointerenter', () => menu && menu.focus(i));
        b.addEventListener('click', () => menu && menu.pick(i));
        box.append(b);
        return b;
      });
      hud.append(box);
      const r = hud.getBoundingClientRect();
      const w = box.offsetWidth,
        h = box.offsetHeight;
      const x = Math.max(8, Math.min(r.width - w - 8, (at?.x ?? r.width / 2) + 36));
      const y = Math.max(64, Math.min(r.height - h - 70, (at?.y ?? r.height / 2) - h / 2));
      box.style.left = `${x}px`;
      box.style.top = `${y}px`;
      return new Promise((resolve) => {
        let index = items.findIndex((i) => !i.disabled);
        if (index < 0) index = 0;
        menu = {
          items,
          focus(i) {
            index = i;
            rows.forEach((row, k) => row.classList.toggle('focus', k === index));
            items[index]?.onFocus?.();
          },
          move(step) {
            let i = index;
            for (let n = 0; n < items.length; n++) {
              i = (i + step + items.length) % items.length;
              if (!items[i].disabled || items[i].focusable) break;
            }
            menu.focus(i);
          },
          pick(i = index) {
            if (items[i]?.disabled) {
              items[i].onRefuse?.();
              return;
            }
            api.closeMenu();
            resolve(items[i]?.key ?? null);
          },
          cancel() {
            api.closeMenu();
            resolve(null);
          },
          box
        };
        menu.focus(index);
      });
    },
    get menuOpen() {
      return !!menu;
    },
    menuCommand(command) {
      if (!menu) return false;
      if (command === 'up' || command === 'left') menu.move(-1);
      else if (command === 'down' || command === 'right') menu.move(1);
      else if (command === 'confirm') menu.pick();
      else if (command === 'cancel') menu.cancel();
      return true;
    },
    closeMenu() {
      if (!menu) return;
      menu.box.remove();
      menu = null;
    },
    /** The forecast panel: attacker against defender, damage ranges, criticals, the counter. */
    forecast(f) {
      hud.querySelector('.forecast')?.remove();
      if (!f) return;
      const box = el('div', 'forecast');
      const side = (who, dmg, crit, team, label) => {
        const s = el('div', 'fc-side');
        s.style.setProperty('--team', team);
        const img = el('img', 'face');
        img.src = PORTRAIT(who.model);
        img.alt = '';
        s.append(img, el('div', 'fc-name', who.name), el('div', 'fc-hp', `♥ ${who.hp}`));
        const d = el('div', 'fc-dmg' + (crit ? ' crit' : ''));
        d.append(el('small', '', label), el('b', '', dmg));
        if (crit) d.append(el('em', '', t('critical')));
        s.append(d);
        return s;
      };
      box.append(side(f.attacker, `${f.min}-${f.max}%`, f.critical, f.attackerTeam, t('deal')));
      box.append(el('div', 'fc-vs', 'VS'));
      box.append(side(f.defender, f.counter ? `${f.counter.min}-${f.counter.max}%` : '—', f.counterCritical && !!f.counter, f.defenderTeam, f.counter ? t('take') : t('noCounter')));
      hud.append(box);
    },
    /** A big banner across the screen; resolves when it has gone. */
    banner(title, sub, team, seconds = 1.3) {
      banner.innerHTML = '';
      banner.style.setProperty('--team', team);
      banner.append(el('b', '', title), el('span', '', sub ?? ''));
      banner.classList.remove('hidden', 'go');
      void banner.offsetWidth;
      banner.classList.add('go');
      return new Promise((r) =>
        setTimeout(() => {
          banner.classList.add('hidden');
          banner.classList.remove('go');
          r();
        }, seconds * 1000)
      );
    },
    toast(text, kind = '') {
      const tst = el('div', 'toast ' + kind, text);
      toasts.append(tst);
      setTimeout(() => tst.classList.add('out'), 2200);
      setTimeout(() => tst.remove(), 2700);
    },
    /** A figure rising from a point of the screen (damage, healing, gold). */
    float(text, x, y, kind = 'dmg') {
      const f = el('div', 'float ' + kind, text);
      f.style.left = `${x}px`;
      f.style.top = `${y}px`;
      floats.append(f);
      setTimeout(() => f.remove(), 1100);
    },
    /** The health numbers over the units: [{ id, x, y, hp, team, done, cargo }], placed each frame. */
    badges(list) {
      const seen = new Set();
      for (const b of list) {
        seen.add(String(b.id));
        let e = badges.querySelector(`[data-id="${b.id}"]`);
        if (!e) {
          e = el('div', 'badge');
          e.dataset.id = b.id;
          badges.append(e);
        }
        e.style.transform = `translate(${b.x}px, ${b.y}px)`;
        e.style.setProperty('--team', b.team);
        const text = b.hp < 100 ? String(b.hp) : '';
        if (e.textContent !== text + (b.cargo ? '▣' : '')) e.textContent = text + (b.cargo ? '▣' : '');
        e.classList.toggle('empty', !text && !b.cargo);
        e.classList.toggle('done', !!b.done);
        e.style.display = b.visible === false ? 'none' : '';
      }
      for (const e of [...badges.children]) if (!seen.has(e.dataset.id)) e.remove();
    },
    buttons,
    setBusy(busy) {
      hud.classList.toggle('busy', busy);
    },
    dispose() {
      root.innerHTML = '';
    }
  };
  return api;
}
