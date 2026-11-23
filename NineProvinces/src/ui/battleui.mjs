// 亲自指挥的战斗，就在天下图上打：先布阵（每支部队的阵型，可在己方阵地内换位置），再开战。顶上是日落前的时间、
// 风向、城门或粮仓的耐久、暂停与快慢、撤退；左边是己方各部的牌子（兵力、士气、怒气、异常、战法按钮、坚守与自动），
// 右边是敌军。点己方部队选中，再点格子移动、点敌军进攻；怒气满时点战法，或交给自动。
// A battle under the player's command, fought on the realm's own map: first deployment (each unit's formation, and its
// place within its own ground), then the fighting. At the top, the time to sunset, the wind, the strength of the gate
// or the granary, pause and speed, and retreat; on the left a card for each of our units (troops, morale, rage,
// ailments, tactic buttons, hold and auto), on the right the enemy. Tap one of ours to choose it, then a hex to move or
// an enemy to attack; tap a tactic when rage is full, or leave it to auto.
import { FORMATIONS, TERRAIN, UNITS } from '../data/battle.mjs';
import { TACTICS } from '../data/tactics.mjs';
import { command, createBattle, outcome, stepBattle, useTactic } from '../sim/battle.mjs';
import { finishBattle } from '../sim/military.mjs';
import { nm, num, t } from '../i18n.mjs';
import { factionName, generalName, placeName } from '../view/names.mjs';
import { createBattle3D } from '../view3d/battle3d.mjs';
import { $, bar, button, clear, face, h, seal } from './dom.mjs';
import { tacticText } from './text.mjs';

const SPEEDS = [1, 2, 4];
const WIND = ['→', '↘', '↙', '←', '↖', '↗'];

export function startBattle(app, setup) {
  const s = app.state;
  const b = createBattle(setup, s);
  const side = setup.factions.indexOf(s.player);
  const colours = setup.factions.map((f, i) => (f ? s.factions[f].colour : i ? 0x8a7d66 : 0x6a5a4a));
  const hud = $('#battleHud');
  const fx = $('#battleFx');
  let selected = null,
    armed = null,
    phase = 'deploy',
    paused = true,
    speed = 0,
    acc = 0,
    clash = 0,
    feed = [],
    shownKey = '',
    ended = false;
  const view = createBattle3D(app.map, b, {
    colours,
    side,
    fx,
    plates: $('#plates'),
    rulers: app.rulers(),
    on: {
      tapUnit(i) {
        const u = b.units[i];
        if (u.side === side) {
          if (armed && armed.unit !== i && isHelp(armed.tactic)) return fire(armed.unit, armed.tactic, null);
          select(i);
        } else if (armed) fire(armed.unit, armed.tactic, i);
        else if (selected !== null && phase === 'fight') {
          command(b, selected, 'attack', i);
          app.sound.play('tap');
        }
        draw(true);
      },
      tapHex(hex) {
        if (hex < 0) return;
        const u = selected !== null ? b.units[selected] : null;
        const there = b.units.findIndex((o) => !o.gone && o.pos === hex);
        if (there >= 0) return this.tapUnit(there);
        if (!u) return;
        if (phase === 'deploy') {
          if (canDeploy(u, hex)) {
            u.pos = hex;
            u.onWall = b.tiles[hex] === 'wall';
            app.sound.play('tap');
          }
        } else {
          command(b, selected, 'move', hex);
          view.goal(hex);
          app.sound.play('tap');
        }
        draw(true);
      },
      event(ev) {
        const u = b.units[ev.unit];
        if (ev.kind === 'tactic') {
          const tc = TACTICS[ev.tactic];
          app.sound.play(tc.kind === 'burn' ? 'fire' : 'tactic');
          say(t('feedTactic', { name: u?.general ? generalName(u.general) : t('captain'), tactic: nm(tc) }), u?.side === side ? 'ours' : 'theirs');
          if (tc.general) flash(nm(tc), u.side === side);
        } else if (ev.kind === 'tacticFailed') say(t('feedFailed', { name: u?.general ? generalName(u.general) : t('captain'), tactic: nm(TACTICS[ev.tactic]) }), 'dim');
        else if (ev.kind === 'rout') say(t('feedRout', { name: u?.general ? generalName(u.general) : t('captain') }), u?.side === side ? 'bad' : 'good');
        else if (ev.kind === 'gateOpen') {
          app.sound.play('drum');
          say(t('feedGate'), side === 0 ? 'good' : 'bad');
        } else if (ev.kind === 'depotBurnt') {
          app.sound.play('fire');
          say(t('feedDepot'), side === 0 ? 'good' : 'bad');
        }
      }
    }
  });

  function isHelp(id) {
    return ['atk', 'def', 'spd', 'heal', 'rally', 'rage'].includes(TACTICS[id].kind);
  }
  function canDeploy(u, hex) {
    if (b.units.some((o) => o !== u && !o.gone && o.pos === hex)) return false;
    const tile = b.tiles[hex];
    // Each side forms up within five hexes of its own end of the field; defenders of walls within them.
    let lo = Infinity,
      hi = -Infinity;
    for (const v of b.along) (lo = Math.min(lo, v)), (hi = Math.max(hi, v));
    const town = tile === 'town' || tile === 'wall';
    if (u.side === 0 ? b.along[hex] > lo + 5 || town : setup.kind === 'siege' ? !town : b.along[hex] < hi - 5) return false;
    if (tile === 'gate') return false;
    if (tile === 'wall') return u.side === 1 && UNITS[u.kind].range > 1;
    const water = TERRAIN[tile].water;
    const navy = UNITS[u.kind].group === 'navy' || u.afloat;
    return water ? navy || tile === 'ship' : !navy || tile === 'river';
  }
  function select(i) {
    selected = i;
    armed = null;
    view.select(i);
    app.sound.play('tap');
  }
  function fire(unit, tactic, target) {
    const u = b.units[unit];
    const ok = useTactic(b, u, tactic, target === null ? null : b.units[target]);
    armed = null;
    if (!ok) app.hud.toast(t('tacticNoTarget'));
    draw(true);
  }
  function say(text, kind) {
    feed.unshift({ text, kind, at: b.time });
    feed = feed.slice(0, 5);
    shownKey = '';
  }
  function flash(name, ours) {
    if (app.calm()) return;
    const el = h(`div.callout${ours ? '.ours' : ''}`, name);
    fx.append(el);
    setTimeout(() => el.remove(), 1700);
  }

  // ——— The HUD ———
  function card(u) {
    const share = u.troops / u.start;
    const mine = u.side === side;
    const tactics = mine
      ? h(
          'div.tactics',
          u.tactics.map((id) => {
            const tc = TACTICS[id];
            const ready = u.rage >= 100 && !u.routed && !u.gone && phase === 'fight' && !(u.status.stun > 0);
            return h(
              'button.tac',
              {
                type: 'button',
                disabled: !ready,
                'aria-pressed': armed?.unit === u.id && armed.tactic === id ? 'true' : 'false',
                className: tc.general ? 'tac sig' : 'tac',
                title: nm(tc) + ' — ' + tacticText(id),
                dataset: { k: 'tac' + u.id + id },
                onclick: (e) => {
                  e.stopPropagation();
                  if (isHelp(id) || tc.shape === 'self' || tc.shape === 'all') return fire(u.id, id, null);
                  armed = { unit: u.id, tactic: id };
                  selected = u.id;
                  view.select(u.id);
                  app.hud.toast(t('tacticPick'));
                  draw(true);
                }
              },
              nm(tc)
            );
          })
        )
      : null;
    const marks = Object.keys(u.status).map((m) => h('span.mark.' + m, t('st_' + m)));
    return h(
      `div.ucard${u.side === side ? '.ours' : '.theirs'}${selected === u.id ? '.on' : ''}${u.gone ? '.gone' : ''}${u.routed ? '.routed' : ''}`,
      {
        dataset: { k: 'u' + u.id },
        onclick: () => {
          if (u.side === side) select(u.id);
          if (u.pos >= 0) view.lookAtHex(u.pos);
          draw(true);
        }
      },
      h('div.uh', u.general ? face(u.general, 30, app.rulers()) : h('span.face.blank'), h('span.un', u.general ? generalName(u.general) : t('captain'), h('small', nm(UNITS[u.kind]) + (mine ? ' · ' + nm(FORMATIONS[u.formation]) : ''))), h('b.ut', u.gone ? (u.end === 'fled' ? t('fled') : t('destroyed')) : num(u.troops))),
      h('div.ub', bar(share, share > 0.5 ? 'good' : share > 0.25 ? 'gold' : 'bad', t('troops')), bar(Math.max(0, u.morale) / 100, 'blue', t('morale')), bar(u.rage / 100, u.rage >= 100 ? 'fire' : 'rage', t('rage'))),
      marks.length || u.routed ? h('div.marks', u.routed ? h('span.mark.rout', t('routed')) : null, marks) : null,
      tactics,
      mine && phase === 'fight' && !u.gone && !u.routed
        ? h(
            'div.uo',
            button(t('hold'), (e) => (e.stopPropagation(), command(b, u.id, u.order === 'hold' ? 'auto' : 'hold'), draw(true)), { small: true, kind: u.order === 'hold' ? 'on' : '' }),
            button(t('auto'), (e) => (e.stopPropagation(), command(b, u.id, 'auto'), draw(true)), { small: true, kind: u.order === 'auto' ? 'on' : '' }),
            button(t('autoTactic'), (e) => (e.stopPropagation(), command(b, u.id, 'autoTactic', !u.autoTactic), draw(true)), { small: true, kind: u.autoTactic ? 'on' : '' })
          )
        : null,
      mine && phase === 'deploy'
        ? h(
            'div.uo',
            Object.values(FORMATIONS)
              .filter((f) => f.group === 'any' || f.group === UNITS[u.kind].group || (UNITS[u.kind].group === 'navy' && f.group === 'inf'))
              .map((f) => button(nm(f), (e) => (e.stopPropagation(), command(b, u.id, 'formation', f.id), draw(true)), { small: true, kind: u.formation === f.id ? 'on' : '' }))
          )
        : null
    );
  }

  function draw(force = false) {
    const key = JSON.stringify([phase, paused, speed, selected, armed, Math.floor(b.time), b.units.map((u) => [Math.round(u.troops / 50), Math.round(u.morale / 4), Math.floor(u.rage / 10), u.order, u.autoTactic, u.formation, Object.keys(u.status).join(), u.gone, u.routed]), Math.round(b.gate?.hp ?? 0), Math.round(b.depot?.hp ?? 0), Math.round(b.keepHeld), feed.length && feed[0].at]);
    if (!force && key === shownKey) return;
    shownKey = key;
    const focused = document.activeElement?.dataset?.k && hud.contains(document.activeElement) ? document.activeElement.dataset.k : null;
    const place = setup.place.node ? placeName(setup.place.node) : placeName(setup.place.link[0]);
    const left = Math.max(0, b.limit - b.time);
    clear(hud).append(
      h(
        'header.bTop',
        h('div.bTitle', h('b', t('battleAt', { place })), h('small', factionName(s, setup.factions[0]) + ' ⚔ ' + (setup.factions[1] ? factionName(s, setup.factions[1]) : t('noOwner')))),
        h('div.bTime', h('span', t('sunset') + ' ' + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0')), bar(left / b.limit, 'gold'), h('span.wind', { title: t('windLabel') }, t('windLabel') + ' ' + WIND[b.wind % 6])),
        b.gate ? h('div.bObj', h('span', t('gate')), bar(Math.max(0, b.gate.hp) / (1500 + setup.wall * 60), 'stone'), h('small', b.gate.open ? t('gateOpen') : num(b.gate.hp))) : null,
        b.depot ? h('div.bObj', h('span', t('depot')), bar(Math.max(0, b.depot.hp) / 1000, 'fire'), h('small', b.depot.burnt ? t('depotBurnt') : num(b.depot.hp))) : null,
        b.keep !== null ? h('div.bObj', h('span', t('keepHold')), bar(b.keepHeld / 10, 'gold')) : null,
        phase === 'fight'
          ? h(
              'div.clock',
              h('button.pause', { type: 'button', 'aria-pressed': paused ? 'true' : 'false', dataset: { k: 'bpause' }, title: (paused ? t('resume') : t('pause')) + ' (Space)', onclick: () => setPaused(!paused) }, paused ? '▶' : '❚❚'),
              SPEEDS.map((v, i) => h('button.spd', { type: 'button', 'aria-pressed': speed === i ? 'true' : 'false', dataset: { k: 'bs' + i }, title: v + '×', onclick: () => ((speed = i), draw(true)) }, v + '×'))
            )
          : null,
        phase === 'fight' ? button(t('retreat'), () => end({ winner: 1 - side, why: 'retreat' }), { kind: 'danger', small: true }) : null
      ),
      h('aside.bSide.ours', b.units.filter((u) => u.side === side).map(card)),
      h('aside.bSide.theirs', b.units.filter((u) => u.side !== side).map(card)),
      h('div.bFeed', { 'aria-live': 'polite' }, feed.map((f) => h(`p.${f.kind}`, f.text))),
      phase === 'deploy'
        ? h('div.bDeploy', h('h3', t('deploy')), h('p', t('deployHelp')), h('div.row', button(t('battleEntrust'), () => autoFinish()), button(t('fight'), () => begin(), { kind: 'main' })))
        : h('p.bHelp', armed ? t('tacticPick') : t('battleHelp'))
    );
    if (focused) hud.querySelector(`[data-k="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
  }

  function setPaused(v) {
    paused = v;
    draw(true);
  }
  function begin() {
    phase = 'fight';
    paused = false;
    app.sound.play('horn');
    draw(true);
  }
  /** Let the officers fight it from here, at once. */
  function autoFinish() {
    phase = 'fight';
    for (let i = 0; i < 2400 && !b.over; i++) stepBattle(b, 0.25, -1);
    if (!b.over) b.over = { winner: 1, why: 'sunset' };
    end(b.over);
  }
  function end(over) {
    if (ended) return;
    ended = true;
    b.over = over;
    const result = outcome(b);
    const won = result.winner === side;
    app.sound.play(won ? 'win' : 'lose');
    finishBattle(s, setup, result);
    view.destroy();
    clear(hud);
    clear(fx);
    app.endBattle({ setup, result });
    if (setup.place.node) app.map.focus(setup.place.node, 70);
  }

  draw(true);
  app.sound.theme('battle');
  return {
    update(dt) {
      if (ended) return;
      if (phase === 'fight' && !paused) {
        acc += dt * SPEEDS[speed];
        let before = 0;
        for (const u of b.units) before += u.troops;
        while (acc >= 0.1 && !b.over) {
          stepBattle(b, 0.1, side);
          acc -= 0.1;
        }
        let after = 0;
        for (const u of b.units) after += u.troops;
        clash -= dt;
        if (after < before - 20 && clash <= 0) {
          app.sound.play(Math.random() < 0.3 ? 'arrows' : 'clash', { volume: 0.5 });
          clash = 0.8;
        }
        if (b.over) return end(b.over);
      }
      draw();
    },
    key(code) {
      if (code === 'Space' && phase === 'fight') setPaused(!paused);
      else if (/^Digit[1-3]$/.test(code) && phase === 'fight') {
        speed = +code.slice(5) - 1;
        draw(true);
      } else if (code === 'Escape') {
        armed = null;
        selected = null;
        view.select(null);
        draw(true);
      } else if (code === 'Enter' && phase === 'deploy') begin();
      else return false;
      return true;
    },
    zoomBy: (f) => app.map.zoomBy(f),
    panBy: (x, y) => app.map.panBy(x, y),
    get battle() {
      return b;
    },
    get view() {
      return view;
    },
    get phase() {
      return phase;
    },
    begin,
    autoFinish,
    select,
    command: (...a) => command(b, ...a)
  };
}

export { seal };
