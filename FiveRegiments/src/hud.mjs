// What is drawn over the fight, laid out as a sandbox-war PC game lays it out: a compass along the top with the foes
// marked on it; a nameplate over each foe with his health (and his horse's); his own health and stamina with their
// numbers at the bottom left, with his horse's when he rides; the bar along the bottom (1 to 0: weapons, wound
// dressings) with the R and T skills and the X weapon art beside it; at the bottom right the attack mode and the view, and the key hints
// (Ctrl+H); the cross in the middle that shows the line of his blow and of the blow coming; the words of the moment,
// and numbers where blows land. Tab hides it all but the cross.
import { ARTS, REGIMENTS, SKILLS } from './sim/regiments.mjs';
import { recoveryGuardWindow } from './sim/fight.mjs';
import { t, say, getLanguage } from './i18n.mjs';

const el = (tag, cls, parent, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  parent?.appendChild(e);
  return e;
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const GUARD_ARROW = { R: '→', L: '←', O: '↑', T: '↓' };

// The cross: four blades round a point, one per line as seen on screen (right, left, top for overhead, bottom for a
// thrust).
const CROSS = `<svg viewBox="-60 -60 120 120" aria-hidden="true">
  <path data-l="R" d="M18 -9 L44 0 L18 9 Z"/>
  <path data-l="L" d="M-18 -9 L-44 0 L-18 9 Z"/>
  <path data-l="O" d="M-9 -18 L0 -44 L9 -18 Z"/>
  <path data-l="T" d="M-9 18 L0 44 L9 18 Z"/>
  <polyline data-prep="R" points="56,-8 47,0 56,8"/>
  <polyline data-prep="L" points="-56,-8 -47,0 -56,8"/>
  <polyline data-prep="O" points="-8,-56 0,-47 8,-56"/>
  <polyline data-prep="T" points="-8,56 0,47 8,56"/>
  <circle r="2.2"/>
  <circle class="ring" r="30"/>
</svg>`;

// Small line drawings for the bar, in a 40 × 40 box.
const ICON = {
  sabre: '<path d="M8 33 L11 30 M11 30 Q22 22 33 7 Q30 18 13 32 Z" /><circle cx="7" cy="34" r="2.4" fill="none"/>',
  jian: '<path d="M9 31 L31 9 L33 7 L31 11 L11 33 Z"/><path d="M7 27 L13 33" /><path d="M5 35 L9 31"/>',
  zhanma: '<path d="M6 36 L20 22"/><path d="M18 24 Q27 13 34 5 Q31 16 22 26 Z"/><path d="M16 20 L24 28"/>',
  axe: '<path d="M8 36 L30 8"/><path d="M24 10 Q34 8 36 18 Q30 20 26 16 Z"/><path d="M24 14 L18 12"/>',
  ji: '<path d="M6 36 L28 12"/><path d="M28 12 L34 6 L31 13 Z"/><path d="M24 10 Q20 13 25 18 Q30 21 32 17"/><path d="M26 8 Q31 4 34 9"/>',
  spear: '<path d="M6 36 L29 11"/><path d="M29 11 L34 5 L31 13 Z"/>',
  bow: '<path d="M12 5 Q34 20 12 35" fill="none"/><path d="M12 5 L12 35" stroke-width="1"/><path d="M8 20 L33 20"/>',
  knife: '<path d="M12 28 L27 13 L30 11 L28 15 L15 31 Z"/><path d="M9 31 L13 27"/>',
  shield: '<circle cx="20" cy="20" r="13" fill="none"/><circle cx="20" cy="20" r="3"/>',
  dressing: '<path d="M14 8 h12 v6 h-12 z" fill="none"/><path d="M12 14 h16 v18 a3 3 0 0 1 -3 3 h-10 a3 3 0 0 1 -3 -3 z" fill="none"/><path d="M20 19 v10 M15 24 h10"/>'
};
const icon = (name) => `<svg viewBox="0 0 40 40" aria-hidden="true">${ICON[name] ?? ''}</svg>`;

export function createHud(root, { touch = false } = {}) {
  const hud = el('div', 'hud', root);
  hud.hidden = true;
  const compass = el('div', 'hud-compass', hud, '<div class="strip"></div><i class="needle"></i>');
  const strip = compass.querySelector('.strip');
  const plates = el('div', 'hud-plates', hud);
  const cross = el('div', 'hud-cross', hud, CROSS);
  const tell = el('div', 'hud-tell', cross);
  const cover = el('div', 'hud-cover', cross);
  tell.hidden = cover.hidden = true;
  const me = el('div', 'hud-me', hud);
  const meName = el('div', 'hud-name', me);
  const meHp = el('div', 'bar hp', me, '<i></i><b></b><em></em>');
  const meSt = el('div', 'bar st', me, '<i></i><em></em>');
  const horseBox = el('div', 'hud-horse', me, `<span>${t('horse')}</span><div class="bar hhp"><i></i><em></em></div><div class="bar hst"><i></i></div>`);
  const horsePace = el('small', 'horse-pace', horseBox);
  horsePace.hidden = true;
  const bar = el('div', 'hud-bar', hud);
  const slots = el('div', 'slots', bar);
  const skills = el('div', 'hud-skills', bar);
  const modes = el('div', 'hud-modes', hud);
  const keys = el('div', 'hud-keys', hud);
  const banner = el('div', 'hud-banner', hud);
  const toast = el('div', 'hud-toast', hud);
  const numbers = el('div', 'hud-numbers', hud);
  const hint = el('div', 'hud-hint', hud);
  const objective = el('div', 'hud-objective', hud);
  objective.hidden = true;
  let plateViews = [],
    slotViews = [],
    skillViews = [];
  let bannerTimer = 0,
    toastTimer = 0;
  let modeKey = '';
  const lines = Object.fromEntries([...cross.querySelectorAll('[data-l]')].map((p) => [p.dataset.l, p]));
  const preparations = cross.querySelectorAll('[data-prep]');

  // The compass: a strip of marks every fifteen degrees, the four quarters named, slid under a fixed needle.
  const names = t('compass').split(',');
  const marks = [];
  for (let d = -360; d <= 720; d += 15) {
    const q = ((d % 360) + 360) % 360;
    const quarter = q % 90 === 0 ? names[q / 90] : null;
    marks.push(`<b style="left:${(d + 360) * 2}px" class="${quarter ? 'q' : q % 45 === 0 ? 'h' : ''}"></b>`);
    if (quarter) marks.push(`<span style="left:${(d + 360) * 2}px">${quarter}</span>`);
  }
  strip.innerHTML = marks.join('') + '<div class="foes"></div>';
  const foeMarks = strip.querySelector('.foes');

  function setup(game) {
    objective.hidden = true;
    objective.textContent = '';
    const hero = game.hero;
    const r = REGIMENTS[hero.regiment];
    meName.innerHTML = `<b>${say(r.name)}</b><span>${say(r.arms)}</span>`;
    horseBox.hidden = !hero.horse;
    // Nameplates.
    plates.innerHTML = '';
    plateViews = game.men
      .filter((m) => m.side === 'foe')
      .map((m) => {
        const name = say(REGIMENTS[m.regiment].name);
        const box = el('div', 'plate', plates, `<b>${m.rank === 'troop' ? t('expeditionTroop', { name }) : name}</b>`);
        const hp = el('div', 'bar hp', box, '<i></i><b></b>');
        const hhp = m.horse ? el('div', 'bar hhp', box, '<i></i>') : null;
        return { man: m, box, hp, hhp, shown: m.hp };
      });
    foeMarks.innerHTML = plateViews.map(() => '<i></i>').join('');
    // The bar: 1 and 2 his weapons, 3 the dressings, the rest empty.
    slots.innerHTML = '';
    const arms = { yulin: ['sabre', 'shield'], tiger: ['jian', null], vanguard: ['axe', null], plume: ['ji', null], archer: ['bow', 'knife'] }[hero.regiment];
    slotViews = SLOT_LABELS.map((label, i) => {
      const item = i === 0 ? arms[0] : i === 1 ? arms[1] : i === 2 ? 'dressing' : null;
      const s = el('div', 'slot' + (item ? '' : ' empty'), slots, `<kbd>${label}</kbd>${item ? icon(item) : ''}<em></em>`);
      if (item) s.title = item === 'dressing' ? t('dressing') : '';
      return s;
    });
    // R and T the profession skills; X the main hand's weapon art (from the saddle, the mounted one) and Z the shield's,
    // each with his rage under it against what the art costs.
    skills.innerHTML = '';
    const slotsShown = [0, 1, 'art', ...(ARTS[hero.r.offArt] ? ['off'] : [])];
    skillViews = slotsShown.map((slot) => {
      const art = slot === 'art' || slot === 'off';
      const key = slot === 'art' ? 'X' : slot === 'off' ? 'Z' : slot === 0 ? 'R' : 'T';
      const v = el('div', 'hud-skill' + (art ? ' art' : ''), skills, `<kbd>${key}</kbd><span></span><small></small><i></i>${art ? '<b class="rage"><u></u></b>' : ''}`);
      return { slot, art, v, name: v.querySelector('span'), note: v.querySelector('small'), shade: v.querySelector('i'), rage: v.querySelector('.rage u'), shown: null };
    });
    hud.dataset.regiment = hero.regiment;
  }

  function fill(view, value, whole, shown = value) {
    const k = Math.max(0, value / whole);
    view.querySelector('i').style.width = (k * 100).toFixed(1) + '%';
    const b = view.querySelector('b');
    if (b) b.style.width = (Math.max(0, shown / whole) * 100).toFixed(1) + '%';
    const em = view.querySelector('em');
    if (em) em.textContent = `${Math.max(0, Math.round(value))}/${Math.round(whole)}`;
  }

  let meShown = 0;
  /**
   * `preparedLine` is the PC player's committed direction while the mouse is held. `incoming` is the enemy wind-up
   * that can reach him soon. `project(point)` gives a point's place on the screen, or null behind the camera.
   */
  function update(dt, game, { line, preparedLine, incoming, guard, locked, project, yaw = 0, input = {} }) {
    const hero = game.hero;
    hud.classList.toggle('bare', !!input.hidePanels);
    meShown = meShown ? meShown + (hero.hp - meShown) * (1 - Math.exp(-dt * 3)) : hero.hp;
    fill(meHp, hero.hp, hero.maxHp, meShown);
    fill(meSt, hero.st, hero.maxSt);
    meSt.classList.toggle('low', hero.st < 25);
    if (hero.horse) {
      fill(horseBox.querySelector('.hhp'), hero.horse.hp, hero.horse.maxHp);
      horseBox.querySelector('.hst i').style.width = hero.horse.st.toFixed(1) + '%';
      horseBox.classList.toggle('off', !hero.mounted);
      horseBox.classList.toggle('dead', !hero.horse.alive);
      const pace = !hero.mounted || !hero.horse.alive ? ''
        : hero.horse.speed < -0.12 ? 'horseReverse' : hero.horse.galloping ? 'horseGallop' : '';
      if (horsePace.dataset.pace !== pace) {
        horsePace.dataset.pace = pace;
        horsePace.textContent = pace ? t(pace) : '';
        horsePace.hidden = !pace;
      }
    }
    // The compass turns with the camera: north is heading 0 (+Z), east to its right; a heading in degrees sits at
    // (heading + 360) × 2 pixels along the strip, whose left end is under the middle of the compass.
    const camHeading = ((((-yaw * 180) / Math.PI) % 360) + 360) % 360;
    strip.style.transform = `translateX(${(-(camHeading + 360) * 2).toFixed(1)}px)`;
    // Nameplates over the foes, and their marks on the compass.
    const fm = foeMarks.children;
    plateViews.forEach((v, i) => {
      v.shown += (v.man.hp - v.shown) * (1 - Math.exp(-dt * 3));
      fill(v.hp, v.man.hp, v.man.maxHp, v.shown);
      if (v.hhp) {
        fill(v.hhp, v.man.horse.hp, v.man.horse.maxHp);
        v.hhp.hidden = !v.man.mounted;
      }
      const at = project?.([v.man.x, v.man.mounted ? 3.05 : 2.15, v.man.z]);
      v.box.hidden = !at || !v.man.alive;
      if (at) v.box.style.transform = `translate(${at[0].toFixed(1)}px, ${at[1].toFixed(1)}px) translate(-50%, -100%)`;
      const bearing = Math.atan2(v.man.x - hero.x, v.man.z - hero.z);
      const off = wrap(bearing - yaw);
      if (fm[i]) {
        // The mark at his heading, on the copy of the strip nearest the camera's.
        fm[i].style.left = ((camHeading + 360 - (off * 180) / Math.PI) * 2).toFixed(1) + 'px';
        fm[i].hidden = !v.man.alive;
        fm[i].classList.toggle('behind', Math.abs(off) > Math.PI / 2);
      }
    });
    // The bar: the weapon in hand lit; dressings counted.
    const inHand = hero.regiment === 'archer' ? (hero.knife ? 1 : 0) : 0;
    slotViews.forEach((s, i) => s.classList.toggle('on', i === inHand));
    if (slotViews[2]) {
      slotViews[2].querySelector('em').textContent = hero.dressings;
      slotViews[2].classList.toggle('spent', hero.dressings <= 0);
      slotViews[2].classList.toggle('busy', hero.act?.kind === 'mend');
    }
    // Skills: R and T wait for his feet when he rides; an art wants its rage (the couched ji, a running horse).
    for (const s of skillViews) {
      const id = s.slot === 'art' ? (hero.mounted ? hero.r.mountedArt : hero.r.art) : s.slot === 'off' ? hero.r.offArt : hero.skills[s.slot];
      const table = s.art ? ARTS : SKILLS;
      const item = table[id];
      if (s.shown !== id) {
        s.shown = id;
        s.name.textContent = item ? say(item.name) : t('noArt');
        s.v.title = item ? say(item.text) : t('noArtHint');
        s.v.classList.toggle('none', !item);
      }
      if (!item) continue;
      const wait = s.art ? hero.artCool[id] ?? 0 : hero.cool[s.slot];
      let note = '';
      if (s.art) {
        const k = item.rage > 0 ? Math.min(1, hero.rage / item.rage) : 1;
        s.rage.style.width = (k * 100).toFixed(1) + '%';
        s.v.classList.toggle('full', k >= 1 && wait <= 0);
        if (item.mounted && (hero.horse?.speed ?? 0) < item.run) note = t('needRun');
      } else if (hero.mounted) note = t('needFoot');
      s.note.textContent = note;
      s.v.classList.toggle('wait', wait > 0);
      s.v.classList.toggle('locked', !!note);
      s.shade.style.setProperty('--k', String(Math.max(0, wait / item.cool)));
      s.shade.textContent = wait > 0 ? Math.ceil(wait) : '';
    }
    // Modes and key hints.
    if (!touch) {
      const nextMode = `${input.combo}:${input.view}:${locked}:${getLanguage()}`;
      if (modeKey !== nextMode) {
        modeKey = nextMode;
        modes.innerHTML = `<span><kbd>B</kbd>${input.combo ? t('combo') : t('single')}</span><span><kbd>V</kbd>${input.view === 'first' ? t('viewFirst') : t('viewThird')}</span>${locked ? `<span class="lock">${t('lock')}</span>` : ''}`;
      }
    }
    keys.hidden = !input.keyHints;
    if (!keys.hidden) {
      const movement = hero.mounted
        ? [['W S', t('horseRein')], ['A D', t('horseSteer')], ['Shift', t('horseGallop')]]
        : [['F', t('kick')], ['␣', t('jump')], ['Shift', t('sprint')]];
      const rows = [['X', t('art')], ...(ARTS[hero.r.offArt] ? [['Z', t('artShield')]] : []), ['R T', t('skills')], ...movement, ['1 2', t('weapons')], ['3', t('dressing')]];
      if (hero.horse) rows.unshift(['E', hero.mounted ? t('getDown') : t('mountUp')], ['U', t('callHorse')]);
      rows.push(['Tab', t('hidePanels')], ['Esc', t('menu')]);
      const html = `<b>${t('keysTitle')} <small>Ctrl+H</small></b>` + rows.map(([k, w]) => `<span><kbd>${k}</kbd>${w}</span>`).join('');
      if (keys.dataset.html !== html) {
        keys.innerHTML = html;
        keys.dataset.html = html;
      }
    }
    const bowOut = hero.regiment === 'archer' && !hero.knife;
    const guardLine = bowOut ? null : incoming?.line;
    const guardWindow = recoveryGuardWindow(hero);
    for (const [l, p] of Object.entries(lines)) {
      p.classList.toggle('on', l === (preparedLine ?? line));
      p.classList.toggle('threat', l === guardLine);
    }
    tell.hidden = !incoming;
    if (incoming) {
      // The opening card yields to a live attack cue on short mobile viewports.
      if (bannerTimer > 0 && banner.classList.contains('start')) {
        banner.hidden = true;
        bannerTimer = 0;
      }
      const skill = SKILLS[incoming.id] ?? ARTS[incoming.id];
      const action = guardLine ? t('guard') + ' ' + GUARD_ARROW[guardLine] : t('evade');
      const name = skill ? say(skill.name) : incoming.kind === 'kick' ? t('kick') : '';
      const message = name ? action + ' · ' + name : action;
      if (tell.textContent !== message) tell.textContent = message;
      tell.classList.toggle('urgent', incoming.progress >= 0.68);
    }
    cover.hidden = !guardWindow;
    if (guardWindow) {
      const message = t(hero.prev?.guard ? 'guardRecoveryRetry' : 'guardRecovery');
      if (cover.textContent !== message) cover.textContent = message;
    }
    for (const p of preparations) p.classList.toggle('show', p.dataset.prep === preparedLine);
    cross.classList.toggle('guard', !!guard);
    cross.classList.toggle('guard-window', guardWindow);
    cross.classList.toggle('locked', !!locked);
    cross.classList.toggle('bow', bowOut);
    cross.style.setProperty('--draw', hero.draw ? Math.min(1, hero.draw.t / hero.r.bow.draw).toFixed(2) : '0');
    if (bannerTimer > 0 && (bannerTimer -= dt) <= 0) banner.classList.remove('show');
    if (toastTimer > 0 && (toastTimer -= dt) <= 0) toast.classList.remove('show');
    for (const n of [...numbers.children]) {
      n.life -= dt;
      if (n.life <= 0) n.remove();
    }
  }

  return {
    root: hud,
    setup,
    update,
    objective(text) {
      if (objective.textContent !== text) objective.textContent = text;
      objective.hidden = !text;
    },
    show(on) {
      hud.hidden = !on;
    },
    banner(text, sub = '', seconds = 2.2, kind = '') {
      banner.innerHTML = `<b>${text}</b>${sub ? `<span>${sub}</span>` : ''}`;
      banner.className = 'hud-banner show ' + kind;
      banner.hidden = false;
      bannerTimer = seconds;
    },
    toast(text, kind = '') {
      toast.textContent = text;
      toast.className = 'hud-toast show ' + kind;
      toastTimer = 0.9;
    },
    /** A number where a blow landed: `at` is a screen point [x, y] in CSS pixels. */
    number(at, value, kind = '') {
      if (!at) return;
      const n = el('div', 'num ' + kind, numbers, String(value));
      n.style.left = at[0] + 'px';
      n.style.top = at[1] + 'px';
      n.life = 0.9;
    },
    hint(text) {
      if (hint.textContent !== (text ?? '')) hint.textContent = text ?? '';
      if (hint.hidden !== !text) hint.hidden = !text;
    },
    touch
  };
}

const SLOT_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

/**
 * Touch controls: a stick on the left, looking on the right, and buttons. A swipe on Strike chooses the line.
 * They write into `input.state.touch` and the input's presses.
 */
export function createTouchControls(root, input, { onPause = () => {} } = {}) {
  const pad = el('div', 'touch', root);
  pad.hidden = true;
  const stick = el('div', 'stick', pad, '<i></i>');
  const look = el('div', 'look', pad);
  const buttons = el('div', 'buttons', pad);
  const make = (name, word) => {
    const b = el('button', 'tb ' + name, buttons, t(word));
    b.type = 'button';
    return b;
  };
  const attack = make('attack', 'attack'),
    guard = make('guard', 'guard'),
    kick = make('kick', 'kick'),
    step = make('step', 'jump'),
    s0 = make('s0', 'skills'),
    s1 = make('s1', 'skills'),
    artBtn = make('s1 art', 'art'),
    offBtn = make('s1 art off', 'artShield'),
    swap = make('swap', 'swap'),
    mount = make('mount', 'mountUp'),
    heal = make('heal', 'dressing');
  const pause = el('button', 'tb halt', pad, t('paused'));
  let shownArt = null;
  let mountAction = 'mount';
  pause.type = 'button';
  pause.setAttribute('aria-label', t('paused'));
  const st = input.state;
  const release = (target, id) => {
    if (id !== null && target.hasPointerCapture(id)) target.releasePointerCapture(id);
  };
  // Keep a finger's moves on the control it pressed; a pointer the browser no longer counts as down cannot be held.
  const capture = (target, e) => {
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      /* the press goes on without the capture */
    }
  };
  let stickId = null,
    stickAt = [0, 0],
    lookId = null,
    lookAt = [0, 0],
    attackId = null,
    guardId = null,
    attackAt = [0, 0],
    strikeLine = null;
  function resetStick() {
    const id = stickId;
    stickId = null;
    st.touch.move = [0, 0];
    stick.querySelector('i').style.transform = '';
    release(stick, id);
  }
  function resetLook() {
    const id = lookId;
    lookId = null;
    release(look, id);
  }
  stick.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    stickAt = [e.clientX, e.clientY];
    capture(stick, e);
    st.lastDevice = 'touch';
  });
  stick.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    const dx = (e.clientX - stickAt[0]) / 50,
      dy = (e.clientY - stickAt[1]) / 50;
    const l = Math.hypot(dx, dy);
    st.touch.move = l > 1 ? [dx / l, dy / l] : [dx, dy];
    stick.querySelector('i').style.transform = `translate(${st.touch.move[0] * 36}px, ${st.touch.move[1] * 36}px)`;
  });
  const endStick = (e) => {
    if (e.pointerId !== stickId) return;
    resetStick();
  };
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);
  stick.addEventListener('lostpointercapture', endStick);
  look.addEventListener('pointerdown', (e) => {
    if (lookId !== null) return;
    lookId = e.pointerId;
    lookAt = [e.clientX, e.clientY];
    capture(look, e);
    st.lastDevice = 'touch';
  });
  look.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookId) return;
    st.yaw -= (e.clientX - lookAt[0]) * 0.006;
    st.pitch = Math.max(-0.35, Math.min(0.75, st.pitch + (e.clientY - lookAt[1]) * 0.004));
    lookAt = [e.clientX, e.clientY];
  });
  const endLook = (e) => {
    if (e.pointerId === lookId) resetLook();
  };
  look.addEventListener('pointerup', endLook);
  look.addEventListener('pointercancel', endLook);
  look.addEventListener('lostpointercapture', endLook);
  // Strike: a swipe on the button sets the line and the lift strikes; a press held still is a held blow (a heavy
  // cut, or the draw of the bow) let go on the lift. A rider can swipe and hold
  // a direction, keeping the blade chambered until the same finger lifts.
  let holdTimer = 0,
    holding = false;
  function resetAttack(commit = false) {
    const id = attackId;
    attackId = null;
    strikeLine = null;
    clearTimeout(holdTimer);
    holding = st.touch.attack = false;
    input.endHeldTouchAttack(commit);
    release(attack, id);
  }
  attack.addEventListener('pointerdown', (e) => {
    if (attackId !== null) return;
    attackId = e.pointerId;
    attackAt = [e.clientX, e.clientY];
    capture(attack, e);
    st.lastDevice = 'touch';
    holdTimer = setTimeout(() => {
      holding = true;
      st.touch.attack = true;
      input.beginHeldTouchAttack(strikeLine);
    }, 200);
  });
  attack.addEventListener('pointermove', (e) => {
    // A deliberate swipe can choose a line after the default preparation starts.
    if (e.pointerId !== attackId || (holding && strikeLine !== null)) return;
    const dx = e.clientX - attackAt[0],
      dy = e.clientY - attackAt[1];
    if (Math.hypot(dx, dy) > 22) {
      if (st.touch.bow && !holding) clearTimeout(holdTimer);
      strikeLine = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy < 0 ? 'O' : 'T';
      if (holding) input.aimHeldTouchAttack(strikeLine);
    }
  });
  const endAttack = (e) => {
    if (e.pointerId !== attackId) return;
    if (e.type === 'pointerup' && !holding) {
      st.touch.tapAttack = true;
      st.touch.strikeLine = strikeLine;
    }
    resetAttack(e.type === 'pointerup');
  };
  attack.addEventListener('pointerup', endAttack);
  attack.addEventListener('pointercancel', endAttack);
  attack.addEventListener('lostpointercapture', endAttack);
  function resetGuard() {
    const id = guardId;
    guardId = null;
    st.touch.guard = false;
    release(guard, id);
  }
  const endGuard = (e) => {
    if (e.pointerId !== guardId) return;
    if (e.type !== 'pointerup') st.touch.tapGuard = false;
    resetGuard();
  };
  guard.addEventListener('pointerdown', (e) => {
    if (guardId !== null) return;
    guardId = e.pointerId;
    capture(guard, e);
    st.lastDevice = 'touch';
    st.touch.guard = st.touch.tapGuard = true;
  });
  guard.addEventListener('pointerup', endGuard);
  guard.addEventListener('pointercancel', endGuard);
  guard.addEventListener('lostpointercapture', endGuard);
  kick.addEventListener('pointerdown', () => (st.once.kick = true));
  step.addEventListener('pointerdown', () => (st.once.step = true));
  s0.addEventListener('pointerdown', () => (st.once.skill0 = true));
  s1.addEventListener('pointerdown', () => (st.once.skill1 = true));
  artBtn.addEventListener('pointerdown', () => (st.once.art = true));
  offBtn.addEventListener('pointerdown', () => (st.once.offArt = true));
  swap.addEventListener('pointerdown', () => (st.once.swap = true));
  mount.addEventListener('pointerdown', () => (st.once[mountAction] = true));
  heal.addEventListener('pointerdown', () => (st.once.heal = true));
  pause.addEventListener('click', () => onPause('touch'));
  return {
    show(on, hero) {
      if (!on) {
        resetStick();
        resetLook();
        resetAttack();
        resetGuard();
        st.touch.tapAttack = st.touch.tapGuard = false;
        st.touch.strikeLine = null;
      }
      pad.hidden = !on;
      // The keyboard's key row gives way to the buttons on a touch screen.
      root.classList.toggle('touching', on);
      if (hero) {
        swap.hidden = hero.regiment !== 'archer';
        mount.hidden = !hero.horse;
        artBtn.hidden = !ARTS[hero.r.art];
        offBtn.hidden = !ARTS[hero.r.offArt];
        [s0, s1].forEach((b, i) => {
          const name = el('span');
          name.textContent = say(SKILLS[hero.skills[i]].name);
          b.replaceChildren(b.querySelector('i') ?? el('i'), name, el('small', 'foot-only', null, t('footOnly')));
        });
        shownArt = null;
      }
    },
    /** The skills' waits, shown as a shade going round each skill button. */
    cool(hero) {
      if (pad.hidden) return;
      guard.classList.toggle('guard-window', recoveryGuardWindow(hero));
      if (hero.horse) {
        const dead = !hero.horse.alive;
        const mounting = hero.act?.kind === 'mount';
        const queued = hero.mountOnRecovery;
        const distant = !hero.mounted && Math.hypot(hero.x - hero.horse.x, hero.z - hero.horse.z) > hero.r.horse.near;
        const calling = distant && hero.horse.called;
        mountAction = distant && !queued && !mounting ? 'call' : 'mount';
        const label = t(dead ? 'mountLost' : mounting ? 'mounting' : queued ? 'mountQueued'
          : hero.mounted ? 'getDown' : calling ? 'horseComing' : distant ? 'callHorseTouch' : 'mountUp');
        if (mount.textContent !== label) mount.textContent = label;
        const disabled = dead || mounting || queued || calling;
        if (mount.disabled !== disabled) mount.disabled = disabled;
        mount.classList.toggle('queued', queued);
      }
      heal.classList.toggle('wait', hero.dressings <= 0);
      [s0, s1].forEach((b, i) => {
        const wait = hero.cool[i] ?? 0;
        b.style.setProperty('--k', String(Math.max(0, wait / SKILLS[hero.skills[i]].cool)));
        b.classList.toggle('wait', wait > 0);
        if (b.classList.contains('needs-foot') !== hero.mounted) {
          b.classList.toggle('needs-foot', hero.mounted);
          b.setAttribute('aria-disabled', String(hero.mounted));
        }
      });
      // X is the mounted art in the saddle; each art button lit when its rage is there and it is ready.
      const artId = hero.mounted ? hero.r.mountedArt : hero.r.art;
      if (shownArt !== artId) {
        shownArt = artId;
        const name = el('span');
        name.textContent = ARTS[artId] ? say(ARTS[artId].name) : t('noArt');
        artBtn.replaceChildren(artBtn.querySelector('i') ?? el('i'), name);
        if (ARTS[hero.r.offArt]) {
          const off = el('span');
          off.textContent = say(ARTS[hero.r.offArt].name);
          offBtn.replaceChildren(offBtn.querySelector('i') ?? el('i'), off);
        }
      }
      for (const [b, id] of [[artBtn, artId], [offBtn, hero.r.offArt]]) {
        const a = ARTS[id];
        if (!a) continue;
        const wait = hero.artCool[id] ?? 0;
        b.style.setProperty('--k', String(Math.max(0, wait / a.cool)));
        const ready = wait <= 0 && hero.rage >= a.rage;
        b.classList.toggle('wait', !ready);
        b.classList.toggle('full', ready);
      }
    }
  };
}
