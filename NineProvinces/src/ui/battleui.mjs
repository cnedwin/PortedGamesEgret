// 亲自指挥的战斗，就在天下图上打：先布阵（每支部队的阵型，可在己方阵地内换位置），再开战。顶上是日落前的时间、
// 风向、城门或粮仓的耐久、暂停与快慢、撤退；左边是己方各部的牌子（兵力、士气、怒气、异常、战法按钮、坚守与自动），
// 右边是敌军。点己方部队选中，再点格子移动、点敌军进攻；怒气满时点战法，或交给自动。
// A battle under the player's command, fought on the realm's own map: first deployment (each unit's formation, and its
// place within its own ground), then the fighting. At the top, the time to sunset, the wind, the strength of the gate
// or the granary, pause and speed, and retreat; on the left a card for each of our units (troops, morale, rage,
// ailments, tactic buttons, hold and auto), on the right the enemy. Tap one of ours to choose it, then a hex to move or
// an enemy to attack; tap a tactic when rage is full, or leave it to auto.
import { FORMATIONS, TERRAIN, UNITS, formationAllowed } from '../data/battle.mjs';
import { TACTICS } from '../data/tactics.mjs';
import { command as simCommand, createBattle, outcome, stepBattle, useTactic, combatPreview, canDeployBattle, deployBattleUnit } from '../sim/battle.mjs';
import { createBattleRecorder } from '../sim/battle-history.mjs';
import { finishBattle } from '../sim/military.mjs';
import { getLanguage, nm, num, t } from '../i18n.mjs';
import { factionName, generalName, placeName } from '../view/names.mjs';
import { createBattle3D } from '../view3d/battle3d.mjs';
import { $, bar, button, clear, face, h, seal } from './dom.mjs';
import { tacticText } from './text.mjs';

const SPEEDS = [1, 2, 4];
const WIND = ['→', '↘', '↙', '←', '↖', '↗'];
const words = (zh, en) => getLanguage() === 'en' ? en : zh;
const armName = u => nm(UNITS[u.kind]);
const unitName = u => u.general ? generalName(u.general) : t('captain');

export function startBattle(app, setup) {
  const s = app.state;
  const b = createBattle(setup, s);
  const record = createBattleRecorder(b);
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
    calm: () => app.calm(),
    canDeploy,
    on: {
      tapUnit(i) {
        const u = b.units[i];
        if (u.side === side) {
          if (armed && armed.unit !== i && isHelp(armed.tactic)) return fire(armed.unit, armed.tactic, null);
          select(i);
        } else if (armed) fire(armed.unit, armed.tactic, i);
        else if (selected !== null && phase === 'fight') {
          if(issue(selected, 'attack', i)){view.goal(u.pos);app.sound.play('tap');}
        }
        draw(true);
      },
      tapHex(hex) {
        if (hex < 0) return;
        const u = selected !== null ? b.units[selected] : null;
        const there = b.units.findIndex((o) => !o.gone && o.pos === hex);
        if (there >= 0) return this.tapUnit(there);
        if (!u || u.gone || u.routed) return;
        if (phase === 'deploy') {
          if (deployBattleUnit(b,u.id,hex)) {
            record.action('deploy',{unit:u.id,hex});record.capture('deploy',{force:true});
            app.sound.play('tap');
          } else app.hud.toast(words('选择己方亮起的空格布阵', 'Deploy on a highlighted empty hex on your side'));
        } else {
          if(issue(selected, 'move', hex)){view.goal(hex);app.sound.play('tap');}
        }
        draw(true);
      },
      event(ev) {
        const u = b.units[ev.unit];
        if (ev.kind === 'tactic') {
          const tc = TACTICS[ev.tactic];
          app.sound.play(tc.kind === 'burn' ? 'fire' : tc.kind === 'heal' ? 'heal' : ['rally','atk','def','spd','rage'].includes(tc.kind) ? 'rally' : 'tactic');
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
    return canDeployBattle(b,u,hex);
  }
  function select(i) {
    selected = i;
    armed = null;
    view.select(i);
    record.action('select',{unit:i});
    app.sound.play('tap');
  }
  function fire(unit, tactic, target) {
    const u = b.units[unit];
    const ok = useTactic(b, u, tactic, target === null ? null : b.units[target]);
    if(ok){record.action('tactic',{unit,tactic,target});record.capture(phase,{force:true});}
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
  function orderButton(u, what, label, active, arg) {
    const el=button(label,()=>{issue(u.id,what,arg);draw(true);},{kind:active?'on':''});
    el.dataset.k='order-'+u.id+'-'+what;el.setAttribute('aria-pressed',String(Boolean(active)));return el;
  }
  function issue(unit,what,arg) {const ok=simCommand(b,unit,what,arg);if(ok){record.action(what,{unit,arg:arg??null});record.capture(phase,{force:true});}return ok;}
  function setSpeed(i){speed=i;record.action('speed',{speed:SPEEDS[i]});draw(true);}
  const signed=n=>(n>=0?'+':'')+Math.round(n*100)+'%';
  function formationText(f){return words('攻','ATK ')+signed(f.atk)+' · '+words('守','DEF ')+signed(f.def)+' · '+words('速','SPD ')+signed(f.spd)+(f.front?' · '+words('正面','Front ')+signed(f.front):'')+(f.flank?' · '+words('夹击','Flank ')+signed(f.flank):'');}

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
                title: nm(tc) + ' — ' + tacticText(id) + (!ready ? ' · '+(phase==='deploy'?words('开战后可用','Available after deployment'):u.routed?t('routed'):u.status.stun>0?t('st_stun'):t('rage')+' '+Math.floor(u.rage)+'/100') : ''),
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
        tabIndex: 0,
        role: 'group',
        'aria-label': unitName(u)+' · '+armName(u)+' · '+num(u.troops)+' '+t('troops'),
        onkeydown: e => {if(e.target===e.currentTarget&&e.key==='Enter'){e.preventDefault();e.stopPropagation();if(mine)select(u.id);if(u.pos>=0)view.lookAtHex(u.pos);draw(true);}},
        onclick: () => {
          if (u.side === side) select(u.id);
          if (u.pos >= 0) view.lookAtHex(u.pos);
          draw(true);
        }
      },
      h('div.uh', u.general ? face(u.general, 30, app.rulers()) : h('span.face.blank'), h('span.un', unitName(u), h('small', armName(u) + (mine ? ' · ' + nm(FORMATIONS[u.formation]) : ''))), h('b.ut', u.gone ? (u.end === 'fled' ? t('fled') : t('destroyed')) : num(u.troops))),
      h('div.ub', bar(share, share > 0.5 ? 'good' : share > 0.25 ? 'gold' : 'bad', t('troops')), bar(Math.max(0, u.morale) / 100, 'blue', t('morale')), bar(u.rage / 100, u.rage >= 100 ? 'fire' : 'rage', t('rage'))),
      h('div.uVitals',h('span',t('morale')+' ',h('b',Math.round(u.morale))),h('span'+(u.rage>=100?'.ready':''),t('rage')+' ',h('b',Math.floor(u.rage)+'/100'))),
      marks.length || u.routed ? h('div.marks', u.routed ? h('span.mark.rout', t('routed')) : null, marks) : null,
      tactics,
      mine && phase === 'fight' && !u.gone && !u.routed
        ? h(
            'div.uo',
            button(t('hold'), (e) => (e.stopPropagation(), issue(u.id, u.order === 'hold' ? 'auto' : 'hold'), draw(true)), { small: true, kind: u.order === 'hold' ? 'on' : '' }),
            button(t('auto'), (e) => (e.stopPropagation(), issue(u.id, 'auto'), draw(true)), { small: true, kind: u.order === 'auto' ? 'on' : '' }),
            button(t('autoTactic'), (e) => (e.stopPropagation(), issue(u.id, 'autoTactic', !u.autoTactic), draw(true)), { small: true, kind: u.autoTactic ? 'on' : '' })
          )
        : null,
      mine && phase === 'deploy'
        ? h(
            'div.uo',
            Object.values(FORMATIONS)
              .filter((f) => formationAllowed(u.kind,f.id))
              .map((f) => button(nm(f), (e) => (e.stopPropagation(), issue(u.id, 'formation', f.id), draw(true)), { small: true, title:formationText(f),kind: u.formation === f.id ? 'on' : '' }))
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
    view.preview(phase, armed);
    hud.dataset.phase=phase;hud.classList.toggle('is-paused',paused&&phase==='fight');
    const chosen = selected !== null ? b.units[selected] : null;
    const active = chosen && !chosen.gone && chosen.side===side;
    const readyCount = b.units.filter(u=>u.side===side&&!u.gone&&!u.routed&&u.rage>=100).length;
    const commandText = armed ? nm(TACTICS[armed.tactic])+' · '+tacticText(armed.tactic) : phase==='deploy' ? words('青色格可部署；点部队切换阵型。','Cyan hexes are valid deployment. Select a unit to change its formation.') : chosen?.order==='attack'&&chosen.target ? words('正在进攻：','Attacking: ')+unitName(chosen.target) : t('battleHelp');
    clear(hud).append(
      h(
        'header.bTop',
        h('div.bTitle', h('span.bPhase',phase==='deploy'?words('部署 · 战鼓未鸣','DEPLOYMENT'):paused?words('暂停 · 运筹帷幄','TACTICAL PAUSE'):words('交战 · 将令已下','BATTLE IN PROGRESS')),h('b', t('battleAt', { place })), h('small', factionName(s, setup.factions[0]) + ' ⚔ ' + (setup.factions[1] ? factionName(s, setup.factions[1]) : t('noOwner')))),
        h('div.bTime', h('span', t('sunset') + ' ' + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0')), bar(left / b.limit, 'gold'), h('span.wind', { title: t('windLabel') }, t('windLabel') + ' ' + WIND[b.wind % 6])),
        b.gate ? h('div.bObj', h('span', t('gate')), bar(Math.max(0, b.gate.hp) / (1500 + setup.wall * 60), 'stone'), h('small', b.gate.open ? t('gateOpen') : num(b.gate.hp))) : null,
        b.depot ? h('div.bObj', h('span', t('depot')), bar(Math.max(0, b.depot.hp) / 1000, 'fire'), h('small', b.depot.burnt ? t('depotBurnt') : num(b.depot.hp))) : null,
        b.keep !== null ? h('div.bObj', h('span', t('keepHold')), bar(b.keepHeld / 10, 'gold')) : null,
        phase === 'fight'
          ? h(
              'div.clock',
              h('button.pause', { type: 'button', 'aria-label':paused?t('resume'):t('pause'),'aria-pressed': paused ? 'true' : 'false', dataset: { k: 'bpause' }, title: (paused ? t('resume') : t('pause')) + ' (Space)', onclick: () => setPaused(!paused) }, paused ? '▶' : '❚❚'),
              SPEEDS.map((v, i) => h('button.spd', { type: 'button', 'aria-pressed': speed === i ? 'true' : 'false', dataset: { k: 'bs' + i }, title: v + '×', onclick: () => setSpeed(i) }, v + '×'))
            )
          : null,
        phase === 'fight' ? button(t('retreat'), () => end({ winner: 1 - side, why: 'retreat' }), { kind: 'danger', small: true }) : null
      ),
      h('aside.bSide.ours',{'aria-label':words('己方部队','Your army')},h('div.bSideTitle',words('我军','YOUR ARMY'),h('small',b.units.filter(u=>u.side===side&&!u.gone).length+' '+words('部','units'))),b.units.filter((u) => u.side === side).map(card)),
      h('aside.bSide.theirs',{'aria-label':words('敌方部队','Enemy army')},h('div.bSideTitle',words('敌军','OPPOSITION'),h('small',b.units.filter(u=>u.side!==side&&!u.gone).length+' '+words('部','units'))),b.units.filter((u) => u.side !== side).map(card)),
      h('section.bCommand'+(armed?'.aiming':''),{'aria-label':words('战场指挥','Battlefield command')},
        h('div.bCommandHeading',h('span.bCommandSeal',phase==='deploy'?words('阵','Ⅰ'):words('令','Ⅱ')),h('div',h('small',armed?words('选择战法目标','CHOOSE A TACTIC TARGET'):words('当前指挥','BATTLEFIELD COMMAND')),h('strong',active?unitName(chosen)+' · '+armName(chosen):words('点选己方部队','Select one of your units'))),
          armed?button(words('取消战法','Cancel tactic'),()=>{armed=null;draw(true);},{small:true}):phase==='fight'?h('span.bReady',readyCount?words(readyCount+' 部可施战法',readyCount+' tactics ready'):words('怒气满时可施战法','Tactics unlock at full rage')):null),
        h('p.bCommandHint',commandText),
        active?h('p.bFormationInfo',nm(FORMATIONS[chosen.formation])+' · '+formationText(FORMATIONS[chosen.formation])):null,
        active&&chosen.target&&!chosen.target.gone?(()=>{const p=combatPreview(b,chosen,chosen.target);return p?h('p.bMatchupInfo',words('兵种修正','Weapon match ')+p.weaponMultiplier.toFixed(2)+'× · '+words('射程内普通命中约','Ordinary hit in reach: ')+p.minLoss+'–'+p.maxLoss+words(' 人（不含暴击）',' troops (before criticals)')):null;})():null,
        phase==='fight'&&active&&!chosen.routed?h('div.bOrderRow',
          orderButton(chosen,'hold',t('hold'),chosen.order==='hold'),
          orderButton(chosen,'auto',t('auto'),chosen.order==='auto'),
          orderButton(chosen,'autoTactic',t('autoTactic'),chosen.autoTactic,!chosen.autoTactic),
          button(words('镜头跟随','Follow unit'),()=>view.lookAtHex(chosen.pos))):null),
      h('div.bFeed', { 'aria-live': 'polite' }, feed.map((f) => h(`p.${f.kind}`, f.text))),
      phase === 'deploy'
        ? h('div.bDeploy', h('h3', t('deploy')), h('p', t('deployHelp')), h('div.row', button(t('battleEntrust'), () => autoFinish()), button(t('fight'), () => begin(), { kind: 'main' })))
        : h('p.bHelp',armed?t('tacticPick'):paused?words('已暂停 · 空格继续 · 可继续下达指令','Paused · Space to resume · Orders remain available'):words('空格 暂停  /  1–3 倍速  /  Esc 取消选择','Space pause  /  1–3 speed  /  Esc clear selection'))
    );
    if (focused) hud.querySelector(`[data-k="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
  }

  function setPaused(v) {
    paused = v;
    record.action(v?'pause':'resume');
    draw(true);
  }
  function begin() {
    phase = 'fight';
    paused = false;
    record.action('begin');record.capture(phase,{force:true});
    app.sound.play('horn');
    draw(true);
  }
  /** Let the officers fight it from here, at once. */
  function autoFinish() {
    phase = 'fight';
    record.action('entrust');record.capture(phase,{force:true});
    for (let i = 0; i < 2400 && !b.over; i++){stepBattle(b, 0.25, -1);record.capture(phase);}
    if (!b.over) b.over = { winner: 1, why: 'sunset' };
    end(b.over);
  }
  function end(over) {
    if (ended) return;
    ended = true;
    b.over = over;
    const result = outcome(b);
    record.action('result',{winner:over.winner,why:over.why});
    const tape=record.finish(),report=tape.report;
    const won = result.winner === side;
    app.sound.play(won ? 'win' : 'lose');
    finishBattle(s, setup, result);
    view.destroy();
    clear(hud);
    clear(fx);
    app.endBattle({ setup, result, tape, report });
    if (setup.place.node) app.map.focus(setup.place.node, 70);
  }

  selected=b.units.find(u=>u.side===side&&!u.gone)?.id??null;
  view.select(selected);
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
          record.capture(phase);
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
      // The global listener runs in capture: focused controls own their native
      // Enter/Space action, so a selection must not also start/pause the battle.
      // A group card uses Enter only; Space keeps the battle pause shortcut.
      if ((code === 'Space' || code === 'Enter') && document.activeElement?.closest?.('#battleHud button, #plates .plate.unit[role="button"]')) return false;
      if (code === 'Enter' && document.activeElement?.closest?.('#battleHud .ucard[tabindex]')) return false;
      if (code === 'Space' && phase === 'fight') setPaused(!paused);
      else if (/^Digit[1-3]$/.test(code) && phase === 'fight') {
        setSpeed(+code.slice(5)-1);
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
    command: (...a) => issue(...a)
  };
}

export { seal };
