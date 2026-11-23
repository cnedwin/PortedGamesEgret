// The pages between fights, drawn over the 3D picture: the title, choosing a regiment (the five stand on the field
// behind), fitting skills and talents, the card before each fight, the result after it, pause, settings and the free
// duel. Every page works with keys (arrows, Enter, Esc), the mouse and touch.
import { ARTS, ORDER, REGIMENTS, SKILLS, TALENTS, loadout } from './sim/regiments.mjs';
import { PLACES } from './sim/road.mjs';
import { t, say, getLanguage } from './i18n.mjs';

const PLACE_WORD = { county: 'placeCounty', peach: 'placePeach', bamboo: 'placeBamboo', snow: 'placeSnow', palace: 'placePalace' };
export const placeName = (p) => t(PLACE_WORD[p]);

function node(html) {
  const box = document.createElement('div');
  box.innerHTML = html.trim();
  return box.firstElementChild;
}

export function createScreens(root, { onLanguage }) {
  const layer = document.createElement('div');
  layer.className = 'screens';
  root.appendChild(layer);
  let current = null;
  let keyHandler = null;

  function show(page, keys) {
    layer.innerHTML = '';
    if (keyHandler) removeEventListener('keydown', keyHandler);
    keyHandler = null;
    current = page;
    if (!page) {
      layer.hidden = true;
      return;
    }
    layer.hidden = false;
    layer.appendChild(page);
    if (keys) {
      keyHandler = (e) => {
        if (e.repeat) return;
        if (keys(e) !== false) e.preventDefault?.();
      };
      addEventListener('keydown', keyHandler);
    }
    page.querySelector('[autofocus]')?.focus({ preventScroll: true });
  }

  const langButton = () => `<button class="lang" type="button" data-act="lang">${t('language')}</button>`;
  function wire(page, actions) {
    page.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'lang') return onLanguage();
      actions[act]?.(b.dataset.arg, b);
    });
  }

  return {
    hide: () => show(null),
    get current() {
      return current;
    },

    title({ onRoad, onFree, onSettings, best, note = '' }) {
      const page = node(`<section class="page title">
        <header><h1>${t('title')}</h1><p>${t('tagline')}</p></header>
        <nav class="menu">
          <button type="button" data-act="road" autofocus>${t('road')}</button>
          <button type="button" data-act="free">${t('free')}</button>
          <button type="button" data-act="settings">${t('settings')}</button>
        </nav>
        ${best ? `<p class="best">${best}</p>` : ''}
        ${note ? `<p class="note" role="status">${note}</p>` : ''}
        <p class="howto">${t('controlsText')}</p>
        ${langButton()}
      </section>`);
      wire(page, { road: onRoad, free: onFree, settings: onSettings });
      show(page, (e) => {
        if (e.code === 'Enter') onRoad();
        else return false;
      });
    },

    /** Choose a regiment; `onLook(regiment)` turns the field to him. */
    choose({ selected = 'yulin', onPick, onLook, onBack, title = t('chooseRegiment') }) {
      let i = ORDER.indexOf(selected);
      const page = node(`<section class="page choose">
        <h2>${title}</h2>
        <div class="tabs">${ORDER.map((r, k) => `<button type="button" data-act="look" data-arg="${k}">${say(REGIMENTS[r].name)}</button>`).join('')}</div>
        <article class="regiment"></article>
        <footer><button type="button" data-act="back">${t('back')}</button><button type="button" class="go" data-act="pick" autofocus>${t('next')}</button></footer>
        <p class="hint">${t('chooseHint')}</p>
      </section>`);
      const card = page.querySelector('.regiment');
      const draw = () => {
        const r = REGIMENTS[ORDER[i]];
        card.innerHTML = `<h3>${say(r.name)}</h3><p class="arms">${t('arms')}：${say(r.arms)}</p><p>${say(r.way)}</p>
          <p class="stat">${t('health')} ${r.health}</p>
          <ul>${r.skills.map((s) => `<li><b>${say(SKILLS[s].name)}</b> ${say(SKILLS[s].text)}</li>`).join('')}</ul>`;
        page.querySelectorAll('.tabs button').forEach((b, k) => b.classList.toggle('on', k === i));
        onLook?.(ORDER[i]);
      };
      draw();
      wire(page, {
        look: (k) => {
          i = Number(k);
          draw();
        },
        pick: () => onPick(ORDER[i]),
        back: onBack
      });
      show(page, (e) => {
        if (e.code === 'ArrowRight' || e.code === 'KeyD') (i = (i + 1) % 5), draw();
        else if (e.code === 'ArrowLeft' || e.code === 'KeyA') (i = (i + 4) % 5), draw();
        else if (e.code === 'Enter') onPick(ORDER[i]);
        else if (e.code === 'Escape') onBack();
        else return false;
      });
    },

    /** Two skills, up to four talents; the weapon art shown beside them. */
    loadout({ regiment, chosen, onDone, onBack }) {
      const r = REGIMENTS[regiment];
      let pick = loadout(regiment, chosen);
      const page = node(`<section class="page loadout">
        <h2>${say(r.name)} · ${t('loadout')}</h2><p class="hint">${t('loadoutHint')}</p>
        ${[['X', r.art, ''], ['Z', r.offArt, ''], ['X', r.mountedArt, t('mountedArt')]]
          .filter(([, id]) => ARTS[id])
          .map(([key, id, note]) => `<p class="hint art-line"><kbd>${key}</kbd> ${note || t('art')} · <b>${say(ARTS[id].name)}</b>${t('paren', { w: say(ARTS[id].weapon) })}${say(ARTS[id].text)} ${t('artCost', { s: ARTS[id].cool, r: ARTS[id].rage })}</p>`)
          .join('')}
        <div class="cols"><div><h3>${t('skills')} <small class="n-s"></small></h3><div class="cards skills"></div></div>
        <div><h3>${t('talents')} <small class="n-t"></small></h3><div class="cards talents"></div></div></div>
        <footer><button type="button" data-act="back">${t('back')}</button><button type="button" class="go" data-act="done" autofocus>${t('begin')}</button></footer>
      </section>`);
      const draw = () => {
        page.querySelector('.skills').innerHTML = r.skills
          .map((id) => `<button type="button" class="card ${pick.skills.includes(id) ? 'on' : ''}" data-act="skill" data-arg="${id}"><b>${say(SKILLS[id].name)}</b><span>${say(SKILLS[id].text)}</span><small>${t('cool', { s: SKILLS[id].cool })}</small>${pick.skills.includes(id) ? `<kbd>${pick.skills.indexOf(id) ? 'T' : 'R'}</kbd>` : ''}</button>`)
          .join('');
        page.querySelector('.talents').innerHTML = r.talents.length
          ? r.talents.map((id) => `<button type="button" class="card ${pick.talents.includes(id) ? 'on' : ''}" data-act="talent" data-arg="${id}"><b>${say(TALENTS[id].name)}</b><span>${say(TALENTS[id].text)}</span></button>`).join('')
          : `<p class="hint">${t('noTalents')}</p>`;
        page.querySelector('.n-s').textContent = t('picked', { n: pick.skills.length, max: 2 });
        page.querySelector('.n-t').textContent = r.talents.length ? t('picked', { n: pick.talents.length, max: Math.min(4, r.talents.length) }) : '';
      };
      const toggle = (list, id, max) => {
        const at = list.indexOf(id);
        if (at >= 0) list.splice(at, 1);
        else {
          if (list.length >= max) list.shift();
          list.push(id);
        }
      };
      draw();
      wire(page, {
        skill: (id) => (toggle(pick.skills, id, 2), draw()),
        talent: (id) => (toggle(pick.talents, id, 4), draw()),
        done: () => onDone(loadout(regiment, pick)),
        back: onBack
      });
      show(page, (e) => {
        if (e.code === 'Enter') onDone(loadout(regiment, pick));
        else if (e.code === 'Escape') onBack();
        else return false;
      });
    },

    /** The card before a fight. */
    stageCard({ stage, total, onGo }) {
      const foes = stage.foes.map((f) => say(REGIMENTS[f].name)).join(` ${t('and')} `);
      const page = node(`<section class="page card-stage">
        <p class="small">${stage.double ? t('finale') : t('stage', { n: stage.index + 1 })} / ${total}</p>
        <h2>${placeName(stage.place)}</h2>
        <p class="vs">${t('versus')} <b>${foes}</b></p>
        <button type="button" class="go" data-act="go" autofocus>${t('fight')}</button>
        <p class="hint click">${t('clickToFight')}</p>
      </section>`);
      wire(page, { go: onGo });
      show(page, (e) => {
        if (e.code === 'Enter' || e.code === 'Space') onGo();
        else return false;
      });
    },

    result({ won, double, stats, last, onNext, onRetry, onTitle, runMark }) {
      const mark = runMark ? t('marks')[['jia', 'yi', 'bing', 'ding'].indexOf(runMark)] : null;
      const page = node(`<section class="page result ${won ? 'won' : 'lost'}">
        <h2>${won ? (double ? t('double') : t('won')) : t('lost')}</h2>
        ${last && won ? `<p class="small">${t('runDone')}</p>` : ''}
        ${mark ? `<p class="mark"><span>${t('mark')}</span><b>${mark}</b></p>` : ''}
        <dl>
          <div><dt>${t('time')}</dt><dd>${t('seconds', { s: stats.time.toFixed(1) })}</dd></div>
          <div><dt>${t('deflects')}</dt><dd>${stats.deflects}</dd></div>
          <div><dt>${t('breaks')}</dt><dd>${stats.broken}</dd></div>
          <div><dt>${t('taken')}</dt><dd>${stats.taken}</dd></div>
          ${won ? `<div><dt>${t('score')}</dt><dd>${stats.score}</dd></div>` : ''}
        </dl>
        <footer>
          ${won && !last ? `<button type="button" class="go" data-act="next" autofocus>${t('goOn')}</button>` : ''}
          ${!won ? `<button type="button" class="go" data-act="retry" autofocus>${t('retry')}</button>` : ''}
          <button type="button" data-act="title" ${won && last ? 'autofocus' : ''}>${t('toTitle')}</button>
        </footer>
      </section>`);
      wire(page, { next: onNext, retry: onRetry, title: onTitle });
      show(page, (e) => {
        if (e.code === 'Enter') (won && !last ? onNext : !won ? onRetry : onTitle)();
        else if (e.code === 'Escape') onTitle();
        else return false;
      });
    },

    pause({ onResume, onSettings, onLeave }) {
      const page = node(`<section class="page pause">
        <h2>${t('paused')}</h2>
        <nav class="menu"><button type="button" data-act="resume" autofocus>${t('resume')}</button>
        <button type="button" data-act="settings">${t('settings')}</button>
        <button type="button" data-act="leave">${t('giveUp')}</button></nav>
        <p class="howto">${t('controlsText')}</p>
      </section>`);
      wire(page, { resume: onResume, settings: onSettings, leave: onLeave });
      show(page, (e) => {
        if (e.code === 'Escape' || e.code === 'Enter') onResume();
        else return false;
      });
    },

    settings({ settings, onChange, onDone }) {
      const row = (key, label, options) => `<div class="row"><span>${t(label)}</span><div class="seg">${options.map(([v, w]) => `<button type="button" data-act="set" data-arg="${key}:${v}" class="${String(settings[key]) === String(v) ? 'on' : ''}">${t(w)}</button>`).join('')}</div></div>`;
      const page = node(`<section class="page settings">
        <h2>${t('settings')}</h2>
        ${row('quality', 'quality', [['low', 'qualityLow'], ['medium', 'qualityMedium'], ['high', 'qualityHigh']])}
        ${row('control', 'control', [['directional', 'directional'], ['classic', 'classic']])}
        ${row('assist', 'assist', [[true, 'on'], [false, 'off']])}
        ${row('blood', 'blood', [[true, 'on'], [false, 'off']])}
        ${row('sound', 'sound', [[true, 'on'], [false, 'off']])}
        ${row('invertY', 'invert', [[true, 'on'], [false, 'off']])}
        ${row('sensitivity', 'sensitivity', [[0.6, 'qualityLow'], [1, 'qualityMedium'], [1.6, 'qualityHigh']])}
        <footer>${langButton()}<button type="button" class="go" data-act="done" autofocus>${t('done')}</button></footer>
      </section>`);
      wire(page, {
        set: (arg) => {
          const [key, raw] = arg.split(':');
          const value = raw === 'true' ? true : raw === 'false' ? false : /^[\d.]+$/.test(raw) ? Number(raw) : raw;
          onChange(key, value);
        },
        done: onDone
      });
      show(page, (e) => {
        if (e.code === 'Escape' || e.code === 'Enter') onDone();
        else return false;
      });
    },

    free({ state, onGo, onBack, onLook }) {
      const page = node(`<section class="page free">
        <h2>${t('free')}</h2><p class="hint">${t('freeHint')}</p>
        <div class="row"><span>${t('you')}</span><div class="seg" data-k="me"></div></div>
        <div class="row"><span>${t('foes')}</span><div class="seg" data-k="foes"></div></div>
        <div class="row"><span>${t('place')}</span><div class="seg" data-k="place"></div></div>
        <footer><button type="button" data-act="back">${t('back')}</button><button type="button" class="go" data-act="go" autofocus>${t('begin')}</button></footer>
      </section>`);
      const draw = () => {
        page.querySelector('[data-k=me]').innerHTML = ORDER.map((r) => `<button type="button" data-act="me" data-arg="${r}" class="${state.me === r ? 'on' : ''}">${say(REGIMENTS[r].name)}</button>`).join('');
        page.querySelector('[data-k=foes]').innerHTML = ORDER.filter((r) => r !== state.me).map((r) => `<button type="button" data-act="foe" data-arg="${r}" class="${state.foes.includes(r) ? 'on' : ''}">${say(REGIMENTS[r].name)}</button>`).join('');
        page.querySelector('[data-k=place]').innerHTML = PLACES.map((p) => `<button type="button" data-act="place" data-arg="${p}" class="${state.place === p ? 'on' : ''}">${placeName(p)}</button>`).join('');
        onLook?.(state.me);
      };
      draw();
      wire(page, {
        me: (r) => {
          state.me = r;
          state.foes = state.foes.filter((f) => f !== r);
          if (!state.foes.length) state.foes = [ORDER.find((x) => x !== r)];
          draw();
        },
        foe: (r) => {
          const at = state.foes.indexOf(r);
          if (at >= 0) {
            if (state.foes.length > 1) state.foes.splice(at, 1);
          } else {
            if (state.foes.length >= 2) state.foes.shift();
            state.foes.push(r);
          }
          draw();
        },
        place: (p) => ((state.place = p), draw()),
        go: () => onGo(state),
        back: onBack
      });
      show(page, (e) => {
        if (e.code === 'Enter') onGo(state);
        else if (e.code === 'Escape') onBack();
        else return false;
      });
    },

    loading(text) {
      show(node(`<section class="page loading"><p>${text}</p><div class="bar"><i></i></div></section>`));
    },
    progress(k) {
      const i = layer.querySelector('.loading .bar i');
      if (i) i.style.width = Math.round(k * 100) + '%';
    },
    lang: getLanguage
  };
}
