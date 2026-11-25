// 画面（DOM）：标题、遭遇战的出阵准备（战场、双方指挥官、难度、先后手）、设置、玩法说明和战果。每个画面都是一组按钮，
// 鼠标、触屏、键盘和手柄都能操作：方向键在按钮间移动焦点，确定按下，取消返回。
// The screens (DOM): the title, skirmish preparation (battlefield, both commanders, difficulty, who moves first), the
// settings, how to play, and the result. Each is a set of buttons for mouse, touch, keys and gamepad alike: the
// arrows move the focus between them, confirm presses, cancel goes back.
import { t, say, getLanguage } from './i18n.mjs';
import { MAPS } from './sim/maps.mjs';
import { CAMPAIGN } from './sim/campaign.mjs';
import { COMMANDERS, COMMANDER_ORDER, FACTIONS } from './sim/commanders.mjs';
import { TERRAIN } from './sim/terrain.mjs';

const PORTRAIT = (id) => new URL(`../assets/portraits/${id}.webp`, import.meta.url).href;
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const btn = (label, cls = '', onClick) => {
  const b = el('button', 'btn ' + cls, label);
  b.type = 'button';
  if (onClick) b.addEventListener('click', onClick);
  return b;
};

/** Moves the keyboard focus to the nearest button in a direction, among those inside `root`. */
export function moveFocus(root, dir) {
  const all = [...root.querySelectorAll('button:not([disabled]), [tabindex="0"]')].filter((e) => e.offsetParent !== null);
  if (!all.length) return;
  const current = document.activeElement && root.contains(document.activeElement) ? document.activeElement : null;
  if (!current) return all[0].focus();
  const a = current.getBoundingClientRect();
  const ax = a.left + a.width / 2,
    ay = a.top + a.height / 2;
  let best = null;
  for (const e of all) {
    if (e === current) continue;
    const b = e.getBoundingClientRect();
    const dx = b.left + b.width / 2 - ax,
      dy = b.top + b.height / 2 - ay;
    const along = dir === 'up' ? -dy : dir === 'down' ? dy : dir === 'left' ? -dx : dx;
    const across = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy);
    if (along <= 4) continue;
    const score = along + across * 2.2;
    if (!best || score < best.score) best = { e, score };
  }
  best?.e.focus();
}

/** A small picture of a map, drawn tile by tile. */
function mapThumb(map, size = 120) {
  const c = el('canvas', 'thumb');
  const k = Math.floor(size / Math.max(map.w, map.h));
  c.width = map.w * k;
  c.height = map.h * k;
  const g = c.getContext('2d');
  const COLOURS = { plains: '#7cae4c', road: '#d8b77d', forest: '#3f7a35', mountain: '#8b8677', bridge: '#a77a48', river: '#5ab3d6', beach: '#ecd9a0', sea: '#3d8fc4', ocean: '#2a5f9e', reef: '#5d7f8f', floor: '#b8b3a8', dock: '#3d8fc4' };
  for (let y = 0; y < map.h; y++)
    for (let x = 0; x < map.w; x++) {
      g.fillStyle = COLOURS[map.terrain[y * map.w + x]] ?? '#888';
      g.fillRect(x * k, y * k, k, k);
    }
  for (const b of map.buildings) {
    g.fillStyle = b.owner === 0 ? '#3d7bff' : b.owner === 1 ? '#e8384a' : '#f4f1e8';
    g.fillRect(x0(b.x), x0(b.y), k - 2, k - 2);
    g.strokeStyle = '#1b2340';
    g.strokeRect(x0(b.x), x0(b.y), k - 2, k - 2);
  }
  function x0(v) {
    return v * k + 1;
  }
  return c;
}

export function createScreens(root, app) {
  let current = null;
  const layer = el('div', 'screens');
  root.append(layer);

  function open(node, { modal = false, onCancel } = {}) {
    const wrap = el('div', 'screen' + (modal ? ' modal' : ''));
    wrap.setAttribute('role', 'dialog');
    wrap.append(node);
    layer.append(wrap);
    const entry = { wrap, onCancel, prev: current, priorFocus: document.activeElement };
    current = entry;
    requestAnimationFrame(() => wrap.querySelector('button:not([disabled])')?.focus({ preventScroll: true }));
    return entry;
  }
  function close(entry) {
    entry.wrap.remove();
    if (current === entry) {
      current = entry.prev;
      if (current?.wrap.contains(entry.priorFocus)) entry.priorFocus.focus({ preventScroll: true });
    }
  }

  const screens = {
    get open() {
      return !!current;
    },
    /** Input from the app while a screen is up. Returns true when it was used. */
    command(name, { reverse = false } = {}) {
      if (!current) return false;
      if (['up', 'down', 'left', 'right'].includes(name)) {
        moveFocus(current.wrap, name);
        app.sound.play('cursor', { volume: 0.6 });
      } else if (name === 'next') {
        const buttons = [...current.wrap.querySelectorAll('button:not([disabled])')].filter((button) => button.offsetParent !== null);
        if (buttons.length) {
          const index = buttons.indexOf(document.activeElement);
          const step = reverse ? -1 : 1;
          const next = index < 0 ? (reverse ? buttons.length - 1 : 0) : (index + step + buttons.length) % buttons.length;
          buttons[next].focus();
        }
      } else if (name === 'confirm') {
        const f = document.activeElement;
        if (f && current.wrap.contains(f)) f.click();
      } else if (name === 'cancel' || name === 'menu') current.onCancel?.();
      return true;
    },
    closeAll() {
      while (current) close(current);
    },

    title() {
      screens.closeAll();
      const box = el('div', 'title-screen');
      const logo = el('div', 'logo');
      logo.append(el('div', 'logo-star', '✦'), el('h1', '', t('title')), el('div', 'logo-sub', t('logoSub')));
      box.append(logo, el('p', 'tagline', t('tagline')));
      const menu = el('div', 'title-menu');
      if (app.hasBattle())
        menu.append(
          btn(t('resume'), 'primary', () => {
            app.sound.play('confirm');
            app.resume();
          })
        );
      menu.append(
        btn(t('newBattle'), app.hasBattle() ? '' : 'primary', () => {
          app.sound.play('confirm');
          screens.setup();
        }),
        btn(t('campaign'), '', () => {
          app.sound.play('select');
          screens.campaign();
        }),
        btn(t('howTo'), '', () => {
          app.sound.play('select');
          screens.help();
        }),
        btn(t('settings'), '', () => {
          app.sound.play('select');
          screens.settings();
        }),
        btn(t('language'), 'quiet', () => app.switchLanguage())
      );
      box.append(menu);
      const r = app.record();
      const foot = el('div', 'title-foot');
      foot.append(el('span', '', t('demoNote')), el('span', '', t('records', { w: r.won, l: r.lost })));
      box.append(foot);
      if (app.notice) {
        box.append(el('div', 'notice', app.notice));
        app.notice = null;
      }
      return open(box);
    },

    campaign() {
      screens.closeAll();
      const box = el('div', 'panel campaign');
      const progress = app.campaignProgress();
      const active = app.campaignBattle()?.setup.campaign;
      box.append(el('h2', '', t('campaign')), el('p', 'lead', t(progress.complete ? 'campaignComplete' : 'campaignLead', { n: progress.completed.length })));
      const chapters = el('div', 'campaign-chapters');
      for (const chapter of CAMPAIGN) {
        const card = el('article', 'campaign-chapter');
        const complete = progress.completed.includes(chapter.id);
        const unlocked = app.campaignUnlocked(chapter.id);
        const resumed = active === chapter.id;
        const action = btn(t(resumed ? 'resumeChapter' : complete ? 'replayChapter' : 'startChapter'), resumed || chapter.id === progress.next ? 'primary' : '', () => {
          app.sound.play('confirm');
          if (resumed) app.resumeCampaign();
          else app.startCampaign(chapter.id);
        });
        action.disabled = !unlocked || Boolean(active && !resumed);
        card.append(
          el('h3', '', say(chapter.title)),
          el('small', 'campaign-status', t(resumed ? 'chapterActive' : complete ? 'chapterDone' : unlocked ? 'chapterReady' : 'chapterLocked')),
          el('p', '', say(chapter.brief)),
          el('p', 'campaign-objective', say(chapter.objective)),
          action
        );
        chapters.append(card);
      }
      box.append(chapters);
      const foot = el('div', 'foot');
      foot.append(btn(t('back'), 'quiet', () => screens.title()));
      box.append(foot);
      return open(box, { onCancel: () => screens.title() });
    },

    setup() {
      screens.closeAll();
      const choice = { ...app.lastSetup() };
      const box = el('div', 'setup-screen');
      box.append(el('h2', '', t('newBattle')));
      // Battlefield.
      const maps = el('div', 'pick-row maps');
      const mapButtons = MAPS.map((m) => {
        const b = el('button', 'pick map-card');
        b.type = 'button';
        b.append(mapThumb(m), el('b', '', say(m.name)), el('small', '', `${m.w}×${m.h}`), el('p', '', say(m.blurb)));
        b.addEventListener('click', () => {
          choice.map = m.id;
          app.sound.play('select');
          paint();
        });
        b.dataset.id = m.id;
        maps.append(b);
        return b;
      });
      // Commanders.
      const commanderRow = (key) => {
        const row = el('div', 'pick-row commanders');
        const list = COMMANDER_ORDER.map((id) => {
          const c = COMMANDERS[id];
          const b = el('button', 'pick cmd');
          b.type = 'button';
          const img = el('img');
          img.src = PORTRAIT(id);
          img.alt = '';
          b.append(img, el('b', '', say(c)), el('small', '', `${say(FACTIONS[c.faction])}`));
          b.title = `${say(c.title)} — ${say(c.blurb)}\n${t('art')}：${say(c.art)} — ${say(c.art.text)}`;
          b.addEventListener('click', () => {
            choice[key] = id;
            app.sound.play('select');
            paint();
          });
          b.dataset.id = id;
          row.append(b);
          return b;
        });
        return { row, list };
      };
      const you = commanderRow('you'),
        foe = commanderRow('foe');
      const detail = el('div', 'cmd-detail');
      const seg = (key, options) => {
        const row = el('div', 'seg');
        const list = options.map(([value, label]) => {
          const b = btn(label, 'seg-btn', () => {
            choice[key] = value;
            app.sound.play('select');
            paint();
          });
          b.dataset.value = value;
          row.append(b);
          return b;
        });
        return { row, list };
      };
      const level = seg('level', [
        ['easy', t('easy')],
        ['normal', t('normal')],
        ['hard', t('hard')]
      ]);
      const order = seg('first', [
        [true, t('goFirst')],
        [false, t('goSecond')]
      ]);
      const fog = seg('fog', [[false, t('off')], [true, t('on')]]);
      const section = (label, node) => {
        const s = el('section', 'setup-section');
        s.append(el('h3', '', label), node);
        return s;
      };
      const sidesRow = el('div', 'setup-sides');
      sidesRow.append(section(t('pickYou'), you.row), section(t('pickFoe'), foe.row));
      box.append(section(t('pickMap'), maps), sidesRow, detail);
      const opts = el('div', 'setup-opts');
      opts.append(section(t('level'), level.row), section('', order.row), section(t('warFog'), fog.row));
      box.append(opts);
      const go = el('div', 'setup-go');
      go.append(
        btn(t('back'), 'quiet', () => {
          app.sound.play('cancel');
          screens.title();
        }),
        btn(t('start'), 'primary big', () => {
          app.sound.play('confirm');
          app.startNew(choice);
        })
      );
      box.append(go);
      function paint() {
        for (const b of mapButtons) b.classList.toggle('on', b.dataset.id === choice.map);
        for (const b of you.list) b.classList.toggle('on', b.dataset.id === choice.you);
        for (const b of foe.list) b.classList.toggle('on', b.dataset.id === choice.foe);
        for (const b of level.list) b.classList.toggle('on', b.dataset.value === choice.level);
        for (const b of order.list) b.classList.toggle('on', b.dataset.value === String(choice.first));
        for (const b of fog.list) b.classList.toggle('on', b.dataset.value === String(choice.fog));
        detail.innerHTML = '';
        for (const [key, id] of [
          ['you', choice.you],
          ['foe', choice.foe]
        ]) {
          const c = COMMANDERS[id];
          const card = el('div', 'detail-card ' + key);
          card.append(el('b', '', `${say(c)} · ${say(c.title)}`), el('p', '', say(c.blurb)), el('p', 'art', `${t('art')}「${say(c.art)}」${say(c.art.text)}`));
          detail.append(card);
        }
      }
      paint();
      return open(box, { onCancel: () => screens.title() });
    },

    settings() {
      return new Promise((resolve) => {
        const box = el('div', 'panel settings');
        box.append(el('h2', '', t('settings')));
        const rows = el('div', 'rows');
        const toggle = (key, label) => {
          const row = el('div', 'row');
          row.append(el('span', '', label));
          const b = btn('', 'toggle', () => {
            app.setSetting(key, !app.settings[key]);
            app.sound.play('select');
            paint();
          });
          row.append(b);
          rows.append(row);
          return () => {
            b.textContent = app.settings[key] ? t('on') : t('off');
            b.classList.toggle('on', !!app.settings[key]);
            b.setAttribute('aria-pressed', String(!!app.settings[key]));
          };
        };
        const choices = (key, label, options, note) => {
          const row = el('div', 'row');
          row.append(el('span', '', label));
          const seg = el('div', 'seg');
          const list = options.map(([value, text]) => {
            const b = btn(text, 'seg-btn', () => {
              app.setSetting(key, value);
              app.sound.play('select');
              paint();
            });
            seg.append(b);
            return [value, b];
          });
          row.append(seg);
          rows.append(row);
          if (note) rows.append(el('div', 'note', note));
          return () => list.forEach(([v, b]) => b.classList.toggle('on', app.settings[key] === v));
        };
        const painters = [
          toggle('sound', t('sound')),
          toggle('music', t('music')),
          choices('speed', t('speed'), [
            [1, t('speed1')],
            [2, t('speed2')],
            [3, t('speed3')]
          ]),
          choices(
            'quality',
            t('quality'),
            [
              ['auto', t('qAuto')],
              ['low', t('qLow')],
              ['medium', t('qMedium')],
              ['high', t('qHigh')]
            ],
            t('qualityNote')
          ),
          toggle('reducedMotion', t('reducedMotion'))
        ];
        const paint = () => painters.forEach((p) => p());
        paint();
        box.append(rows);
        const done = () => {
          app.sound.play('cancel');
          close(entry);
          resolve();
        };
        const foot = el('div', 'foot');
        foot.append(btn(t('language'), 'quiet', () => app.switchLanguage()), btn(t('close'), 'primary', done));
        box.append(foot);
        const entry = open(box, { modal: true, onCancel: done });
      });
    },

    help() {
      return new Promise((resolve) => {
        const box = el('div', 'panel help');
        box.append(el('h2', '', t('helpTitle')));
        const list = el('ol');
        for (const k of ['help1', 'help2', 'help3', 'help4', 'help5', 'help6']) list.append(el('li', '', t(k)));
        box.append(list);
        // The ground and its cover, as the board shows it.
        const legend = el('div', 'legend');
        for (const id of ['plains', 'road', 'forest', 'mountain', 'river', 'beach', 'sea', 'reef']) {
          const d = TERRAIN[id].defence;
          legend.append(el('span', 'chip ' + id, `${say(TERRAIN[id])} ${d >= 0 ? '★'.repeat(d) || '·' : '☠'.repeat(-d)}`));
        }
        box.append(legend);
        box.append(el('h3', '', t('keysTitle')));
        for (const k of ['keysMouse', 'keysKeyboard', 'keysPad', 'keysTouch']) box.append(el('p', 'keys', t(k)));
        const done = () => {
          app.sound.play('cancel');
          close(entry);
          resolve();
        };
        const foot = el('div', 'foot');
        foot.append(btn(t('close'), 'primary', done));
        box.append(foot);
        const entry = open(box, { modal: true, onCancel: done });
      });
    },

    result({ won, why, game, human, chapter }) {
      screens.closeAll();
      const box = el('div', 'panel result ' + (won ? 'won' : 'lost'));
      box.append(el('h2', 'big', won ? t('victory') : t('defeat')));
      box.append(el('p', 'why', t((won ? 'winWhy_' : 'loseWhy_') + why)));
      if (chapter) {
        box.append(el('h3', '', say(chapter.title)));
        if (won) box.append(el('p', 'campaign-aftermath', say(chapter.after)));
      }
      const table = el('div', 'stats');
      const me = game.stats[human],
        them = game.stats[1 - human];
      for (const [key, a, b] of [
        ['turns', game.turn, game.turn],
        ['kills', me.kills, them.kills],
        ['lost', me.lost, them.lost],
        ['recruited', me.recruited, them.recruited],
        ['captured', me.captured, them.captured]
      ]) {
        const row = el('div', 'stat');
        row.append(el('span', 'k', t(key)), el('b', 'a', String(a)), el('b', 'b', key === 'turns' ? '' : String(b)));
        table.append(row);
      }
      box.append(table);
      const foot = el('div', 'foot');
      if (chapter) {
        const next = won && app.campaignProgress().next;
        foot.append(btn(t('campaign'), 'quiet', () => app.toCampaign()));
        if (next) foot.append(btn(t('nextChapter'), 'primary', () => app.startCampaign(next)));
        else foot.append(btn(t('replayChapter'), 'primary', () => app.startCampaign(chapter.id)));
      } else {
        foot.append(btn(t('toTitle'), 'quiet', () => app.toTitle()), btn(t('again'), 'primary', () => app.startNew(app.lastSetup())));
      }
      box.append(foot);
      return open(box, { onCancel: () => app.toTitle() });
    }
  };
  return screens;
}
