// What is drawn over the fight: the foes' health and breath along the top, his own at the bottom left, the two
// regiment skills with their waits, the cross in the middle that shows the line of his blow and of the blow coming,
// the words of the moment (deflected, guard broken, double kill), numbers where blows land, and the touch controls.
import { REGIMENTS, SKILLS } from './sim/regiments.mjs';
import { t, say } from './i18n.mjs';

const el = (tag, cls, parent, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  parent?.appendChild(e);
  return e;
};

// The cross: four blades round a point, one per line as seen on screen (right, left, top for overhead, bottom for a
// thrust).
const CROSS = `<svg viewBox="-60 -60 120 120" aria-hidden="true">
  <path data-l="R" d="M18 -9 L44 0 L18 9 Z"/>
  <path data-l="L" d="M-18 -9 L-44 0 L-18 9 Z"/>
  <path data-l="O" d="M-9 -18 L0 -44 L9 -18 Z"/>
  <path data-l="T" d="M-9 18 L0 44 L9 18 Z"/>
  <circle r="2.2"/>
  <circle class="ring" r="30"/>
</svg>`;

export function createHud(root, { touch = false } = {}) {
  const hud = el('div', 'hud', root);
  hud.hidden = true;
  const top = el('div', 'hud-foes', hud);
  const cross = el('div', 'hud-cross', hud, CROSS);
  const me = el('div', 'hud-me', hud);
  const meName = el('div', 'hud-name', me);
  const meHp = el('div', 'bar hp', me, '<i></i><b></b>');
  const meSt = el('div', 'bar st', me, '<i></i>');
  const skills = el('div', 'hud-skills', hud);
  const banner = el('div', 'hud-banner', hud);
  const toast = el('div', 'hud-toast', hud);
  const numbers = el('div', 'hud-numbers', hud);
  const hint = el('div', 'hud-hint', hud);
  let foeViews = [];
  let skillViews = [];
  let bannerTimer = 0,
    toastTimer = 0;
  const lines = Object.fromEntries([...cross.querySelectorAll('path')].map((p) => [p.dataset.l, p]));

  function setup(game) {
    top.innerHTML = '';
    foeViews = game.men
      .filter((m) => m.side === 'foe')
      .map((m) => {
        const box = el('div', 'hud-foe', top);
        el('div', 'hud-name', box, `<b>${say(REGIMENTS[m.regiment].name)}</b><span>${say(REGIMENTS[m.regiment].arms)}</span>`);
        const hp = el('div', 'bar hp', box, '<i></i><b></b>');
        const st = el('div', 'bar st thin', box, '<i></i>');
        return { man: m, box, hp, st, shown: m.hp };
      });
    const hero = game.hero;
    meName.innerHTML = `<b>${say(REGIMENTS[hero.regiment].name)}</b><span>${t('you')}</span>`;
    skills.innerHTML = '';
    skillViews = hero.skills.map((id, i) => {
      const s = el('div', 'hud-skill', skills, `<kbd>${i ? 'E' : 'Q'}</kbd><span>${say(SKILLS[id].name)}</span><i></i>`);
      s.title = say(SKILLS[id].text);
      return s;
    });
    for (const [key, word] of [['F', 'kick'], ['␣', 'step']]) el('div', 'hud-skill small', skills, `<kbd>${key}</kbd><span>${t(word)}</span>`);
    if (hero.regiment === 'archer') el('div', 'hud-skill small', skills, `<kbd>R</kbd><span>${t('swap')}</span>`);
    hud.dataset.regiment = hero.regiment;
  }

  function bar(view, man, shown) {
    const k = Math.max(0, man.hp / man.maxHp);
    view.querySelector('i').style.width = (k * 100).toFixed(1) + '%';
    view.querySelector('b').style.width = (Math.max(0, shown / man.maxHp) * 100).toFixed(1) + '%';
  }

  let meShown = 0;
  /** Each frame. `threat` is the line of the blow coming at him (as he must guard it), if any. */
  function update(dt, game, { line, threat, guard, locked }) {
    const hero = game.hero;
    meShown = meShown ? meShown + (hero.hp - meShown) * (1 - Math.exp(-dt * 3)) : hero.hp;
    bar(meHp, hero, meShown);
    meSt.querySelector('i').style.width = ((hero.st / hero.maxSt) * 100).toFixed(1) + '%';
    meSt.classList.toggle('low', hero.st < 25);
    for (const v of foeViews) {
      v.shown += (v.man.hp - v.shown) * (1 - Math.exp(-dt * 3));
      bar(v.hp, v.man, v.shown);
      v.st.querySelector('i').style.width = ((v.man.st / v.man.maxSt) * 100).toFixed(1) + '%';
      v.box.classList.toggle('down', !v.man.alive);
    }
    hero.skills.forEach((id, i) => {
      const wait = hero.cool[i],
        whole = SKILLS[id].cool;
      const view = skillViews[i];
      view.classList.toggle('wait', wait > 0);
      view.querySelector('i').style.setProperty('--k', String(wait / whole));
      view.querySelector('i').textContent = wait > 0 ? Math.ceil(wait) : '';
    });
    for (const [l, p] of Object.entries(lines)) {
      p.classList.toggle('on', l === line);
      p.classList.toggle('threat', l === threat);
    }
    cross.classList.toggle('guard', !!guard);
    cross.classList.toggle('locked', !!locked);
    cross.classList.toggle('bow', hero.regiment === 'archer' && !hero.knife);
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
    show(on) {
      hud.hidden = !on;
    },
    banner(text, sub = '', seconds = 2.2, kind = '') {
      banner.innerHTML = `<b>${text}</b>${sub ? `<span>${sub}</span>` : ''}`;
      banner.className = 'hud-banner show ' + kind;
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
      hint.textContent = text ?? '';
      hint.hidden = !text;
    },
    touch
  };
}

/**
 * Touch controls: a stick on the left, looking on the right, and buttons. A swipe on Strike chooses the line.
 * They write into `input.state.touch` and the input's presses.
 */
export function createTouchControls(root, input) {
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
    step = make('step', 'step'),
    s0 = make('s0', 'skills'),
    s1 = make('s1', 'skills');
  const st = input.state;
  let stickId = null,
    stickAt = [0, 0],
    lookId = null,
    lookAt = [0, 0],
    swipe = null;
  stick.addEventListener('pointerdown', (e) => {
    stickId = e.pointerId;
    stickAt = [e.clientX, e.clientY];
    stick.setPointerCapture(e.pointerId);
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
    stickId = null;
    st.touch.move = [0, 0];
    stick.querySelector('i').style.transform = '';
  };
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);
  look.addEventListener('pointerdown', (e) => {
    lookId = e.pointerId;
    lookAt = [e.clientX, e.clientY];
    look.setPointerCapture(e.pointerId);
  });
  look.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookId) return;
    st.yaw -= (e.clientX - lookAt[0]) * 0.006;
    st.pitch = Math.max(-0.35, Math.min(0.75, st.pitch + (e.clientY - lookAt[1]) * 0.004));
    lookAt = [e.clientX, e.clientY];
  });
  look.addEventListener('pointerup', () => (lookId = null));
  attack.addEventListener('pointerdown', (e) => {
    swipe = [e.clientX, e.clientY];
    attack.setPointerCapture(e.pointerId);
    st.lastDevice = 'touch';
  });
  attack.addEventListener('pointermove', (e) => {
    if (!swipe) return;
    const dx = e.clientX - swipe[0],
      dy = e.clientY - swipe[1];
    if (Math.hypot(dx, dy) > 22) st.line = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy < 0 ? 'O' : 'T';
  });
  attack.addEventListener('pointerup', () => {
    swipe = null;
    st.touch.attack = true;
    setTimeout(() => (st.touch.attack = false), 60);
  });
  guard.addEventListener('pointerdown', () => (st.touch.guard = true));
  guard.addEventListener('pointerup', () => (st.touch.guard = false));
  guard.addEventListener('pointercancel', () => (st.touch.guard = false));
  kick.addEventListener('pointerdown', () => (st.once.kick = true));
  step.addEventListener('pointerdown', () => (st.once.step = true));
  s0.addEventListener('pointerdown', () => (st.once.skill0 = true));
  s1.addEventListener('pointerdown', () => (st.once.skill1 = true));
  return {
    show(on, hero) {
      pad.hidden = !on;
      if (hero) {
        s0.textContent = say(SKILLS[hero.skills[0]].name);
        s1.textContent = say(SKILLS[hero.skills[1]].name);
      }
    }
  };
}
