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
import { command as simCommand, createBattle, outcome, stepBattle, useTactic, tacticPreview, combatPreview, canDeployBattle, deployBattleUnit, distance, previewBattleOrder, battleIntentOptions } from '../sim/battle.mjs';
import { createBattleRecorder } from '../sim/battle-history.mjs';
import { MAX_BATTLE_PLAN_ORDERS, previewBattleCommandPlan, commitBattleCommandPlan } from '../sim/battle-command-plan.mjs';
import { finishBattle } from '../sim/military.mjs';
import { getLanguage, nm, num, t } from '../i18n.mjs';
import { factionName, generalName, placeName } from '../view/names.mjs';
import { createBattle3D } from '../view3d/battle3d.mjs';
import { $, bar, clear, face, seal } from './dom.mjs';
import {hudElement as h, hudButton as button, updateBattleHud} from './battle-hud.mjs';
import {tacticPresentation,battleOutcomeReason} from './battle-copy.mjs';
import {createTempoMilestones,inspectTempoMilestones,beginTacticAim,selectTacticTarget,restoreTacticPause} from './battle-tempo.mjs';
import { renderBattleCommandPanel, battleCommandPlanReason } from './battle-command-panel.mjs';

const SPEEDS = [1, 2, 4];
const WIND = ['→', '↘', '↙', '←', '↖', '↗'];
const words = (zh, en) => getLanguage() === 'en' ? en : zh;
const armName = u => nm(UNITS[u.kind]);
const unitName = u => u.general ? generalName(u.general) : t('captain');
const intentLabel = kind => kind === 'guard' ? words('守住阵线', 'Guard line')
  : kind === 'range' ? words('保持射程', 'Keep range') : words('自由机动', 'Free movement');

export function startBattle(app, setup, { state: s = app.state, onTrialResult, onTrialExit } = {}) {
  const trial = Boolean(onTrialResult);
  const nanpi = setup.presentation === 'nanpi-sunset';
  const b = createBattle(setup, s);
  const record = createBattleRecorder(b);
  const side = setup.factions.indexOf(s.player);
  const fieldCommand = !trial && setup.kind === 'field' && !setup.special && side >= 0;
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
  let ending=null,executionLeft=null,milestones=createTempoMilestones(b),milestonePauses=true,tempoNotice='',commandNotice='',commandBad=false;
  let pendingOrder = null;
  let draft = null, reviewedPlan = null, observedOrders = null;
  let planReceipt = '';
  let occupiedKeep = false;
  let heldControl=false,pendingHud=false,releaseTimer=0;
  const pointers=new Set();
  const holdHud=event=>{if(event.target.closest('button,input,select')){clearTimeout(releaseTimer);pointers.add(event.pointerId);heldControl=true;}};
  const releaseHud=event=>{pointers.delete(event.pointerId);clearTimeout(releaseTimer);releaseTimer=setTimeout(()=>{if(pointers.size||ended)return;heldControl=false;if(pendingHud){pendingHud=false;draw(true);}},0);};
  const blurHud=()=>{pointers.clear();releaseHud({pointerId:null});};
  hud.addEventListener('pointerdown',holdHud,true);window.addEventListener('pointerup',releaseHud,true);window.addEventListener('pointercancel',releaseHud,true);window.addEventListener('blur',blurHud);
  // Manual command retains ordinary movement/attacks; only the player's tactics are delegated explicitly.
  for(const u of b.units)if(u.side===side){
    simCommand(b,u.id,'autoTactic',false);record.action('autoTactic',{unit:u.id,arg:false});
    if (trial) { simCommand(b, u.id, 'hold'); record.action('hold', {unit: u.id}); }
  }
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
        activateUnit(i);
      },
      tapHex(hex) {
        if(ending||ended)return;
        if (hex < 0) return;
        const u = selected !== null ? b.units[selected] : null;
        const there = b.units.findIndex((o) => !o.gone && o.pos === hex);
        if (there >= 0) return this.tapUnit(there);
        if (!u || u.gone || u.routed) return;
        if(armed){commandNotice=words('请选择敌军目标，或取消施策','Choose an enemy target, or cancel the tactic');commandBad=true;draw(true);return;}
        if (phase === 'deploy') {
          if (deployBattleUnit(b,u.id,hex)) {
            record.action('deploy',{unit:u.id,hex});record.capture('deploy',{force:true});
            app.sound.play('tap');
          } else app.hud.toast(words('选择己方亮起的空格布阵', 'Deploy on a highlighted empty hex on your side'));
        } else {
          requestOrder(selected, 'move', hex);
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
        else if (ev.kind === 'flankContact') {
          const target = unitName(b.units[ev.target]);
          say(target + (ev.side === side ? words(' 遭我军两翼夹击', ' caught in our pincer') : words(' 遭敌军两翼夹击', ' caught in the enemy pincer')), ev.side === side ? 'good' : 'bad');
        }
        else if (ev.kind === 'gateOpen') {
          app.sound.play('drum');
          say(t('feedGate'), side === 0 ? 'good' : 'bad');
        } else if (ev.kind === 'depotBurnt') {
          app.sound.play('fire');
          say(t('feedDepot'), side === 0 ? 'good' : 'bad');
        } else if (nanpi && ev.kind === 'structureHit' && ev.structure === 'gate') {
          app.sound.play('gateImpact');
        }
      },
      attack(ev) {
        if (!nanpi && !fieldCommand) return;
        const unit = b.units[ev.unit];
        if (unit.kind === 'catapult') return;
        app.sound.play(UNITS[unit.kind].group === 'bow' ? 'arrows' : 'clash', {volume: 0.5});
      },
      siegeImpact() {
        app.sound.play('stoneImpact', { volume: .7 });
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
    clearAim(true);
    clearOrder(true);
    selected = i;
    commandNotice='';commandBad=false;
    view.select(i);
    record.action('select',{unit:i});
    app.sound.play('tap');
  }
  function activateUnit(i){
    if(ending||ended)return;const u=b.units[i];if(!u)return;
    if(u.side===side)select(i);
    else if(armed)chooseTarget(i);
    else if(selected!==null&&phase==='fight')requestOrder(selected,'attack',i);
    draw(true);
  }
  function clearOrder(restorePause) {
    if (!pendingOrder) return;
    if (restorePause) {
      paused = pendingOrder.timing.paused;
      executionLeft = pendingOrder.timing.executionLeft;
      tempoNotice = pendingOrder.timing.tempoNotice;
    }
    pendingOrder = null;
    view.orderPreview?.(null);
  }
  function requestOrder(unit, kind, target) {
    if (!nanpi && !draft) {
      if (issue(unit, kind, target)) {
        view.goal(kind === 'move' ? target : b.units[target].pos);
        app.sound.play('tap');
      }
      return;
    }
    const plan = draft
      ? previewBattleCommandPlan(b, side, [{ unit, kind, arg: target }]).orders[0]
      : previewBattleOrder(b, unit, kind, target);
    if (!plan) return;
    const timing = pendingOrder?.timing ?? {paused, executionLeft, tempoNotice};
    pendingOrder = { plan, target, timing };
    paused = true;
    acc = 0;
    executionLeft = null;
    tempoNotice = '';
    commandNotice = '';
    commandBad = false;
    view.orderPreview?.(plan);
    draw(true);
  }
  function confirmOrder() {
    if (!pendingOrder?.plan.valid) return;
    const {plan, target} = pendingOrder;
    clearOrder(true);
    if (issue(plan.unit, plan.kind, target)) {
      view.goal(plan.hex);
      app.sound.play('tap');
    }
    draw(true);
  }
  function cancelOrder() {
    clearOrder(true);
    draw(true);
  }

  function refreshPlan() {
    reviewedPlan = draft ? previewBattleCommandPlan(b, side, draft) : null;
    view.commandPlan(reviewedPlan?.orders ?? []);
  }

  function changePlanMode(enabled) {
    clearAim(true);
    clearOrder(true);
    draft = enabled ? [] : null;
    refreshPlan();
    if (enabled) {
      planReceipt = '';
      paused = true;
      acc = 0;
      executionLeft = null;
      observedOrders = null;
      tempoNotice = '';
    }
    commandNotice = '';
    commandBad = false;
  }

  function queueOrder() {
    if (!draft || !pendingOrder?.plan.valid) return;
    const { plan, target: arg } = pendingOrder;
    if (!draft.some(order => order.unit === plan.unit) && draft.length >= MAX_BATTLE_PLAN_ORDERS) {
      commandNotice = words('待发军令已满。先移除一条，或执行这一轮。', 'The plan is full. Remove an order or dispatch this group.');
      commandBad = true;
      draw(true);
      return;
    }
    draft = [...draft.filter(order => order.unit !== plan.unit), { unit: plan.unit, kind: plan.kind, arg }];
    clearOrder(true);
    refreshPlan();
    commandNotice = '';
    commandBad = false;
    draw(true);
  }

  function removeOrder(id) {
    if (!draft) return;
    draft = draft.filter(order => order.unit !== id);
    refreshPlan();
    draw(true);
  }

  function planSummary() {
    const orders = reviewedPlan?.orders.filter(order => order.valid) ?? [];
    const attacks = orders.filter(order => order.kind === 'attack');
    const focus = attacks.find(order => attacks.some(other => other !== order && other.target === order.target));
    if (focus) return words('集火 ', 'Focus fire: ') + unitName(b.units[focus.target]);
    if (attacks.length && orders.some(order => order.kind === 'move')) {
      return words('进攻与走位同时起令。到位后可继续下令。', 'Attack and reposition together. Give the next orders as units reach their positions.');
    }
    return '';
  }

  function finishAdvanceNote() {
    if (!observedOrders) return '';
    const arrived = observedOrders.filter(order => order.what === 'move' && b.units[order.unit]?.pos === order.arg).length;
    const moved = observedOrders.filter(order => b.units[order.unit]?.pos !== order.from).length;
    const hits = observedOrders.reduce((sum, order) => sum + Math.max(0, (b.units[order.unit]?.record?.hits ?? 0) - order.hits), 0);
    observedOrders = null;
    const details = [
      moved ? words('前出 ', 'Advanced: ') + moved + words(' 部', '') : '',
      arrived ? words('到位 ', 'In position: ') + arrived + words(' 部', '') : '',
      hits ? words('命中 ', 'Hits: ') + hits : '',
    ].filter(Boolean);
    return details.length ? ' · ' + details.join(' · ') : '';
  }

  function dispatchPlan(observe) {
    if (!draft?.length || pendingOrder || !paused) return;
    const result = commitBattleCommandPlan(b, side, draft);
    if (!result.ok) {
      refreshPlan();
      commandNotice = battleCommandPlanReason(result.reason) || words('军令无法执行，请重新选择。', 'Order unavailable. Review the plan again.');
      commandBad = true;
      draw(true);
      return;
    }
    for (const action of result.actions) record.action(action.what, { unit: action.unit, arg: action.arg, coordinated: true });
    record.capture(phase, { force: true });
    changePlanMode(false);
    observedOrders = observe ? result.actions.map(action => {
      const unit = b.units[action.unit];
      return { ...action, from: unit.pos, hits: unit.record?.hits ?? 0 };
    }) : null;
    planReceipt = result.actions.length + words(' 部已同时受令', ' units received orders together');
    app.sound.play('horn', { volume: .5 });
    if (observe) observeThree();
    else setPaused(false);
  }
  function fire(unit, tactic, target) {
    const u = b.units[unit];
    const eventStart=b.events.length;
    const ok = useTactic(b, u, tactic, target === null ? null : b.units[target]);
    if(ok){const failed=b.events.slice(eventStart).some(event=>event.kind==='tacticFailed'&&event.unit===unit&&event.tactic===tactic);record.action('tactic',{unit,tactic,target});record.capture(phase,{force:true});paused=restoreTacticPause(armed,paused);armed=null;milestones={...milestones,tactic:true};tempoNotice='';commandNotice=nm(TACTICS[tactic])+(failed?words(' · 谋略被识破',' · Scheme resisted'):words(' 已施展',' used'));commandBad=failed;}
    else {commandNotice=t('tacticNoTarget');commandBad=true;app.hud.toast(t('tacticNoTarget'));}
    if (ok && draft) refreshPlan();
    draw(true);
  }
  function clearAim(restore){
    if(!armed)return;if(restore)paused=restoreTacticPause(armed,paused);
    record.action('cancelAim',{unit:armed.unit,tactic:armed.tactic});armed=null;
  }
  function cancelAim(){clearAim(true);tempoNotice='';commandNotice=words('已取消施策','Tactic cancelled');commandBad=false;draw(true);}
  function armTactic(unit,id){
    clearOrder(true);
    if(isHelp(id))return fire(unit,id,null);
    armed=beginTacticAim(armed,{unit,tactic:id},paused);selected=unit;paused=true;acc=0;
    view.select(unit);record.action('aim',{unit,tactic:id,target:null});
    tempoNotice=words('已暂停 · 选择目标并确认施策','Paused · Choose a target, then confirm');commandNotice='';draw(true);
  }
  function chooseTarget(id){
    armed=selectTacticTarget(armed,id);record.action('aim',{unit:armed.unit,tactic:armed.tactic,target:id});
    const preview=tacticPreview(b,b.units[armed.unit],armed.tactic,b.units[id]);
    commandNotice=preview.valid?words('目标有效 · 覆盖','Valid target · Covers ')+preview.targets.length+words('部敌军',' enemy units'):words('目标超出范围或不可用','Target is out of reach or unavailable');commandBad=!preview.valid;draw(true);
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
    const el=button(label,()=>{clearOrder(true);issue(u.id,what,arg);draw(true);},{kind:active?'on':''});
    el.dataset.k='order-'+u.id+'-'+what;el.setAttribute('aria-pressed',String(Boolean(active)));return el;
  }
  function issue(unit,what,arg) {
    const ok=simCommand(b,unit,what,arg),u=b.units[unit];
    if(ok){record.action(what,{unit,arg:arg??null});record.capture(phase,{force:true});commandBad=false;
      const order=what==='attack'?words('追击 ','Pursue ')+unitName(b.units[arg]):what==='move'?words('移动至指定位置','Move to the chosen position'):what==='hold'?words('坚守','Hold'):what==='autoTactic'?(arg?words('战法交给部下','Delegate tactics'):words('战法由你施展','Use tactics manually')):what==='formation'?nm(FORMATIONS[arg]):what==='intent'?intentLabel(arg):words('自动作战','Automatic combat');
      commandNotice=unitName(u)+words(' 已受令：',' accepted: ')+order;
    }else{commandBad=true;commandNotice=what==='move'?words('无法抵达所选位置，请更换道路或目标','Cannot reach that position. Choose another route or target'):words('当前无法执行该军令','That order is unavailable now');app.hud.toast(commandNotice);}
    return ok;
  }
  function setSpeed(i){speed=i;record.action('speed',{speed:SPEEDS[i]});draw(true);}
  function keyButton(key,label,action,options){const el=button(label,action,options);el.dataset.k=key;return el;}
  function nanpiInstructions(unit) {
    if (phase === 'deploy') return trial
      ? words('布阵后鸣鼓。让枪兵接应、弓兵压制、冲车撞门。', 'Deploy, then sound the drums. Screen with spears, suppress with bows, and drive the ram into the gate.')
      : words('调整已到场部队的位置，再鸣鼓开战。点选目标可以先看军令路线。', 'Deploy the armies that have arrived, then sound the drums. Select a target to preview its order.');
    if (!b.gate?.open && unit?.kind === 'ram') return words('选「撞城门」查看路线并确认。', 'Choose “Ram the gate” to inspect and confirm the route.');
    if (!b.gate?.open) {
      const ram = b.units.some(army => army.side === side && army.kind === 'ram' && !army.gone && !army.routed);
      return ram
        ? words('有冲车时，由冲车破门。其他部队可移动接应，或进攻射程内的守军。', 'Use the ram to breach the gate. Other units can move up in support or attack defenders in reach.')
        : words('可用步兵破门。点空地预览移动，点守军预览进攻路线。', 'Infantry can batter the gate. Select a hex to preview movement or a defender to preview an attack.');
    }
    return words('城门已破。清理本营附近的守军，进驻并守满10秒。', 'The gate is open. Clear the defenders around the keep, then occupy it for 10 seconds.');
  }
  function nanpiOrders(unit) {
    if (phase !== 'fight' || !unit || unit.gone || unit.routed) return null;
    const foes = b.units.filter(foe => foe.side !== side && !foe.gone && !foe.routed);
    const keeper = foes.find(foe => foe.pos === b.keep) ?? foes.find(foe => !foe.onWall) ?? foes[0];
    const occupied = b.units.some(other => other !== unit && !other.gone && other.pos === b.keep);
    return h('div.bTrialOrders',
      !b.gate.open && unit.kind === 'ram' && keeper
        ? keyButton('trial-gate', words('撞城门','Ram the gate'), () => requestOrder(unit.id,'attack',keeper.id), {kind:'main'})
        : null,
      b.gate.open
        ? keyButton('trial-keep', words('占据本营','Move to the keep'), () => requestOrder(unit.id,'move',b.keep),
          {kind:'main', why:occupied?words('本营有部队，请先清理或让路','Clear the unit occupying the keep first'):null})
        : null,
      ...foes.map(foe => keyButton('trial-foe-'+foe.id, words('进攻 ','Attack ')+unitName(foe),
        () => requestOrder(unit.id,'attack',foe.id),{small:true})));
  }
  function orderConfirmation() {
    if (!pendingOrder) return null;
    const {plan} = pendingOrder;
    const distanceText = plan.path.length + words(' 格',' hexes');
    const behindGate = plan.kind === 'attack' && !b.gate?.open && b.gate &&
      ['town', 'wall', 'gate'].includes(b.tiles[b.units[plan.target]?.pos]);
    const blocked = behindGate
      ? words('目前无法进攻城内目标。可以等破门，或选其他目标。', 'This target is beyond reach. Breach the gate or choose another target.')
      : words('目前没有可用路线，请换一个目标。', 'No route is available. Choose another destination.');
    const message = !plan.valid ? blocked
      : plan.gate ? words('先沿标线破门，门开后再追击。','Follow the marked approach and breach the gate before pursuing.')
      : plan.kind === 'attack' ? words('进攻 ','Attack ')+unitName(b.units[plan.target])+' · '+distanceText
      : words('移动至标记地格','Move to the marked hex')+' · '+distanceText;
    return h('div.bTrialPreview',
      h('p',{role:'status'},message),
      h('div.bTrialOrders',
        keyButton('confirm-order',words('确认军令','Confirm order'),confirmOrder,
          {kind:'main',why:plan.valid?null:message}),
        keyButton('cancel-order',words('取消预览','Cancel preview'),cancelOrder)));
  }
  function orderStatus(u){
    if(!u||u.gone)return words('选择己方部队下达军令','Select your unit to issue an order');
    if(u.routed)return words('部队正在溃退，暂不能受令','This unit is routing and cannot accept orders');
    const waiting=paused?words(' · 暂停待执行',' · Waiting while paused'):'';
    if(u.atGate&&b.gate&&!b.gate.open)return words('正在破门，随后追击','Breaking the gate, then pursuing')+waiting;
    if(u.order==='attack'&&u.target&&!u.target.gone)return (u.path.length?words('行军追击：','Marching toward: '):words('接敌攻击：','Engaging: '))+unitName(u.target)+waiting;
    if(u.order==='move')return (u.goal!==null?words('正在向指定位置移动','Moving to the ordered position'):words('已抵达，等待新令','Arrived; ready for another order'))+waiting;
    if(u.order==='hold')return words('坚守阵地，自动反击射程内敌军','Holding; attacks enemies within reach')+waiting;
    if(u.intent==='guard')return words('守住蓝圈内的阵地','Guarding the area shown in blue')+waiting;
    if(u.intent==='range')return words('射击接近的敌军，被贴身时尽量拉开','Firing at approaching units and trying to pull back from melee')+waiting;
    return words('自动寻敌与基础作战','Automatic movement and ordinary attacks')+waiting;
  }
  const signed=n=>(n>=0?'+':'')+Math.round(n*100)+'%';
  function battleIntentControls(u) {
    const options = battleIntentOptions(b, u.id);
    return h('section.bIntent', {'aria-label':words('作战意图','Battle intent')},
      h('p.bFormationInfo', words('作战意图','Battle intent') + ' · ' + intentLabel(u.intent)),
      h('div.bOrderRow', options.filter(option => option.available).map(option =>
        keyButton('intent-' + option.kind, intentLabel(option.kind), () => { issue(u.id, 'intent', option.kind); draw(true); },
          {kind:option.active?'on':'',small:true}))));
  }
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
            const explanation=tacticPresentation(tc,tacticPreview(b,u,id).reach,{language:getLanguage()});
            const ready = u.rage >= 100 && !u.routed && !u.gone && phase === 'fight' && !(u.status.stun > 0);
            return h(
              'button.tac',
              {
                type: 'button',
                disabled: !ready,
                'aria-pressed': armed?.unit === u.id && armed.tactic === id ? 'true' : 'false',
                className: tc.general ? 'tac sig' : 'tac',
                title: nm(tc) + ' — ' + explanation.detail + (!ready ? ' · '+(phase==='deploy'?words('开战后可用','Available after deployment'):u.routed?t('routed'):u.status.stun>0?t('st_stun'):t('rage')+' '+Math.floor(u.rage)+'/100') : ''),
                dataset: { k: 'tac' + u.id + id },
                onclick: (e) => {
                  e.stopPropagation();
                  armTactic(u.id,id);
                }
              },
              h('span.tacName',nm(tc)),h('small.tacEffect',explanation.effect),h('small.tacCost',explanation.cost)
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
        onkeydown: e => {if(e.target===e.currentTarget&&e.key==='Enter'){e.preventDefault();e.stopPropagation();activateUnit(u.id);}},
        onclick: () => {
          activateUnit(u.id);
        }
      },
      h('div.uh', u.general ? face(u.general, 30, app.rulers()) : h('span.face.blank'), h('span.un', unitName(u), h('small', armName(u) + (mine ? ' · ' + nm(FORMATIONS[u.formation]) : ''))), h('b.ut', u.gone ? (u.end === 'fled' ? t('fled') : t('destroyed')) : num(u.troops))),
      h('div.ub', bar(share, share > 0.5 ? 'good' : share > 0.25 ? 'gold' : 'bad', t('troops')), bar(Math.max(0, u.morale) / 100, 'blue', t('morale')), bar(u.rage / 100, u.rage >= 100 ? 'fire' : 'rage', t('rage'))),
      h('div.uVitals',h('span',t('morale')+' ',h('b',Math.round(u.morale))),h('span'+(u.rage>=100?'.ready':''),t('rage')+' ',h('b',Math.floor(u.rage)+'/100'))),
      marks.length || u.routed ? h('div.marks', u.routed ? h('span.mark.rout', t('routed')) : null, marks) : null,
      tactics,
      mine && phase === 'fight' && !u.gone && !u.routed && !draft
        ? h(
            'div.uo',
            keyButton('card-order-'+u.id+'-hold',t('hold'), (e) => (e.stopPropagation(), issue(u.id, u.order === 'hold' ? 'auto' : 'hold'), draw(true)), { small: true, kind: u.order === 'hold' ? 'on' : '' }),
            keyButton('card-order-'+u.id+'-auto',t('auto'), (e) => (e.stopPropagation(), issue(u.id, 'auto'), draw(true)), { small: true, kind: u.order === 'auto' ? 'on' : '' }),
            keyButton('card-order-'+u.id+'-autoTactic',t('autoTactic'), (e) => (e.stopPropagation(), issue(u.id, 'autoTactic', !u.autoTactic), draw(true)), { small: true, kind: u.autoTactic ? 'on' : '' })
          )
        : null,
      mine && phase === 'deploy'
        ? h(
            'div.uo',
            Object.values(FORMATIONS)
              .filter((f) => formationAllowed(u.kind,f.id))
              .map((f) => keyButton('formation-'+u.id+'-'+f.id,nm(f), (e) => (e.stopPropagation(), issue(u.id, 'formation', f.id), draw(true)), { small: true, title:formationText(f),kind: u.formation === f.id ? 'on' : '' }))
          )
        : null
    );
  }

  function draw(force = false) {
    if(heldControl){pendingHud=true;return;}
    if(ending){renderEnding();return;}
    const key = JSON.stringify([phase, paused, speed, selected, armed,commandNotice,planReceipt,tempoNotice,milestonePauses,Math.ceil(executionLeft??-1), Math.floor(b.time), b.units.map((u) => [Math.round(u.troops / 50), Math.round(u.morale / 4), Math.floor(u.rage / 10), u.order, u.autoTactic, u.formation, u.intent, u.intentAnchor, Object.keys(u.status).join(), u.gone, u.routed]), Math.round(b.gate?.hp ?? 0), Math.round(b.depot?.hp ?? 0), Math.round(b.keepHeld), feed.length && feed[0].at]);
    if (!force && key === shownKey) return;
    shownKey = key;
    const place = setup.place.node ? placeName(setup.place.node) : placeName(setup.place.link[0]);
    const left = Math.max(0, b.limit - b.time);
    view.preview(phase, armed);
    hud.dataset.phase=phase;hud.classList.toggle('is-paused',paused&&phase==='fight');
    hud.classList.toggle('is-nanpi-trial', nanpi);
    const chosen = selected !== null ? b.units[selected] : null;
    const active = chosen && !chosen.gone && chosen.side===side;
    const readyCount = b.units.filter(u=>u.side===side&&!u.gone&&!u.routed&&u.rage>=100).length;
    const aimPreview=armed?tacticPreview(b,b.units[armed.unit],armed.tactic,armed.target==null?null:b.units[armed.target]):null;
    const commandText = armed ? nm(TACTICS[armed.tactic])+' · '+tacticPresentation(TACTICS[armed.tactic],aimPreview.reach,{language:getLanguage()}).detail : phase==='deploy' ? words('基础作战照旧；战法由你施展，也可交还自动。','Ordinary combat continues automatically. Use tactics yourself, or delegate them.') : orderStatus(chosen);
    updateBattleHud(hud,
      h(
        'header.bTop',
        h('div.bTitle', h('span.bPhase',phase==='deploy'?words('部署 · 战鼓未鸣','DEPLOYMENT'):paused?words('暂停 · 运筹帷幄','TACTICAL PAUSE'):executionLeft!==null?words('观察执行 · 余','OBSERVE · ')+Math.ceil(executionLeft)+words('秒','s'):words('交战 · 将令已下','BATTLE IN PROGRESS')),h('b', trial?words('夕照南皮','Nanpi at sunset'):t('battleAt', { place })), h('small', factionName(s, setup.factions[0]) + ' ⚔ ' + (setup.factions[1] ? factionName(s, setup.factions[1]) : t('noOwner')))),
        h('div.bTime', h('span', t('sunset') + ' ' + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0')), bar(left / b.limit, 'gold'), h('span.wind', { title: t('windLabel') }, t('windLabel') + ' ' + WIND[b.wind % 6])),
        b.gate ? h('div.bObj', h('span', t('gate')), bar(Math.max(0, b.gate.hp) / (1500 + setup.wall * 60), 'stone'), h('small', b.gate.open ? t('gateOpen') : num(b.gate.hp))) : null,
        b.depot ? h('div.bObj', h('span', t('depot')), bar(Math.max(0, b.depot.hp) / 1000, 'fire'), h('small', b.depot.burnt ? t('depotBurnt') : num(b.depot.hp))) : null,
        b.keep !== null ? h('div.bObj', h('span', t('keepHold')), bar(b.keepHeld / 10, 'gold'),
          nanpi && b.gate?.open ? h('small',Math.min(10,Math.floor(b.keepHeld))+' / 10 '+words('秒','s')) : null) : null,
        phase === 'fight'
          ? h(
              'div.clock',
              h('button.pause', { type: 'button', 'aria-label':paused?t('resume'):t('pause'),'aria-pressed': paused ? 'true' : 'false', dataset: { k: 'bpause' }, title: (paused ? t('resume') : t('pause')) + ' (Space)', onclick: () => setPaused(!paused) }, paused ? '▶' : '❚❚'),
              SPEEDS.map((v, i) => h('button.spd', { type: 'button', 'aria-pressed': speed === i ? 'true' : 'false', dataset: { k: 'bs' + i }, title: v + '×', onclick: () => setSpeed(i) }, v + '×'))
            )
          : null,
        trial ? keyButton('leave-trial',words('离开演武','Leave trial'),leaveTrial,{small:true})
          : phase === 'fight' ? keyButton('retreat',t('retreat'), () => end({ winner: 1 - side, why: 'retreat' }), { kind: 'danger', small: true }) : null
      ),
      h('aside.bSide.ours',{'aria-label':words('己方部队','Your army')},h('div.bSideTitle',words('我军','YOUR ARMY'),h('small',b.units.filter(u=>u.side===side&&!u.gone).length+' '+words('部','units'))),b.units.filter((u) => u.side === side).map(card)),
      h('aside.bSide.theirs',{'aria-label':words('敌方部队','Enemy army')},h('div.bSideTitle',words('敌军','OPPOSITION'),h('small',b.units.filter(u=>u.side!==side&&!u.gone).length+' '+words('部','units'))),b.units.filter((u) => u.side !== side).map(card)),
      h('section.bCommand'+(armed?'.aiming':'')+(draft?'.planning':''),{'aria-label':words('战场指挥','Battlefield command')},
        h('div.bCommandHeading',h('span.bCommandSeal',phase==='deploy'?words('阵','Ⅰ'):words('令','Ⅱ')),h('div',h('small',armed?words('选择战法目标','CHOOSE A TACTIC TARGET'):words('当前指挥','BATTLEFIELD COMMAND')),h('strong',active?unitName(chosen)+' · '+armName(chosen):words('点选己方部队','Select one of your units'))),
          h('div.bViewTools',keyButton('locate',words('定位','Locate'),()=>{if(active)view.lookAtHex(chosen.pos);},{small:true,why:active?null:words('先选择己方部队','Select your unit first')}),keyButton('overview',words('俯视','Overview'),()=>view.overview(),{small:true})),
          fieldCommand && phase === 'fight' && !armed ? h('div.bPlanToggle',
            keyButton('plan-mode', draft ? words('退出拟令', 'Leave planning') : words('协同下令', 'Plan orders'),
              () => { changePlanMode(!draft); draw(true); }, {kind: draft ? 'on' : 'main', small:true})) : null,
          planReceipt ? h('small.bCommandStickyNotice', {role:'status'}, planReceipt) : null),
        tempoNotice?h('p.bTempoCue',{role:'status'},tempoNotice):null,
        h('p.bCommandHint',commandText),
        commandNotice?h('p.bOrderFeedback'+(commandBad?'.bad':''),{role:'status'},commandNotice):null,
        active&&!armed?h('p.bFormationInfo',nm(FORMATIONS[chosen.formation])+' · '+formationText(FORMATIONS[chosen.formation])):null,
        fieldCommand && phase==='fight' && active && !chosen.routed && !armed && !draft ? battleIntentControls(chosen) : null,
        active&&!armed&&!pendingOrder&&chosen.target&&!chosen.target.gone?(()=>{const p=combatPreview(b,chosen,chosen.target);return p?h('p.bMatchupInfo',words('兵种修正','Weapon match ')+p.weaponMultiplier.toFixed(2)+'× · '+words('射程内普通命中约','Ordinary hit in reach: ')+p.minLoss+'–'+p.maxLoss+words(' 人（不含暴击）',' troops (before criticals)')):null;})():null,
        nanpi&&!armed&&!pendingOrder?h('p.bTrialGuide',nanpiInstructions(chosen)):null,
        nanpi&&!armed&&!pendingOrder?nanpiOrders(chosen):null,
        !draft ? orderConfirmation() : null,
        draft && !armed ? renderBattleCommandPanel({
          preview: pendingOrder?.plan, plans: reviewedPlan?.orders, unitName: id => unitName(b.units[id]),
          summary: planSummary(), reason: draft.length ? reviewedPlan?.reason : '',
          onQueue: queueOrder, onCancel: cancelOrder, onRemove: removeOrder,
          onAdvance: () => dispatchPlan(true), onContinue: () => dispatchPlan(false)
        }) : null,
        armed?h('div.bAimControls',
          h('p#battleAimSummary',armed.target==null?words('选择敌军目标，查看覆盖后确认。','Choose an enemy target, review the area, then confirm.'):unitName(b.units[armed.target])+' · '+words('覆盖 ','Covers ')+aimPreview.targets.length+words(' 部敌军',' enemy units')),
          h('div.bAimTargets',b.units.filter(u=>u.side!==side&&!u.gone).map(u=>keyButton('target-'+u.id,unitName(u)+' · '+distance(b.units[armed.unit].pos,u.pos)+words('格',' hexes'),()=>chooseTarget(u.id),{kind:armed.target===u.id?'on':'',why:tacticPreview(b,b.units[armed.unit],armed.tactic,u).reason==='range'?words('超出战法范围','Outside tactic reach'):null,small:true}))),
          h('div.bAimActions',keyButton('confirm-tactic',words('确认施策','Confirm tactic'),()=>fire(armed.unit,armed.tactic,armed.target),{kind:'main',why:aimPreview.valid?null:words('先选择有效目标','Choose a valid target first')}),keyButton('cancel-tactic',words('取消施策','Cancel tactic'),cancelAim)))
        :phase==='fight'&&!draft?h('div.bOrderRow',
          active&&!chosen.routed?orderButton(chosen,'hold',t('hold'),chosen.order==='hold'):null,
          active&&!chosen.routed?orderButton(chosen,'auto',t('auto'),chosen.order==='auto'):null,
          active&&!chosen.routed?orderButton(chosen,'autoTactic',chosen.autoTactic?words('战法：自动','Tactics: auto'):words('战法：手动','Tactics: manual'),chosen.autoTactic,!chosen.autoTactic):null,
          keyButton('execute',paused?words('继续执行','Continue'):words('暂停','Pause'),()=>setPaused(!paused),{kind:paused?'main':''}),
          paused&&!pendingOrder?keyButton('observe',words('推进3秒','Observe 3s'),observeThree,{title:words('按当前速度执行3秒战场时间，然后暂停；可随时再停。','Run 3 battle seconds at the current speed, then pause. You may pause sooner.')}):null):null,
        !armed?h('div.bTempoOptions',h('label',h('input',{type:'checkbox',checked:milestonePauses,dataset:{k:'milestones'},onchange:e=>{milestonePauses=e.target.checked;draw(true);}}),words('关键时刻暂停','Pause at milestones')),
          phase==='deploy'&&active?orderButton(chosen,'autoTactic',chosen.autoTactic?words('战法：自动','Tactics: auto'):words('战法：手动','Tactics: manual'),chosen.autoTactic,!chosen.autoTactic):phase==='fight'?h('small',readyCount?words(readyCount+' 部战法可施展',readyCount+' units can use tactics'):words('部队基础作战持续执行','Ordinary combat remains automatic')):null):null),
      h('div.bFeed', { 'aria-live': 'polite' }, feed.map((f) => h(`p.${f.kind}`, f.text))),
      phase === 'deploy'
        ? h('div.bDeploy', h('h3', t('deploy')), h('p', t('deployHelp')), h('div.row', trial?null:keyButton('entrust',t('battleEntrust'), () => autoFinish()), keyButton('begin',trial?words('鸣鼓开战','Sound the drums'):t('fight'), () => begin(), { kind: 'main' })))
        : h('p.bHelp',armed?t('tacticPick'):paused?words('已暂停 · 空格继续 · 可继续下达指令','Paused · Space to resume · Orders remain available'):words('空格 暂停  /  1–3 倍速  /  Esc 取消选择','Space pause  /  1–3 speed  /  Esc clear selection'))
    );
  }

  function setPaused(v) {
    if (!v && draft) {
      if (draft.length || pendingOrder) {
        commandNotice = words('先确认或退出拟令，再继续交战。', 'Dispatch the plan or leave planning before resuming.');
        commandBad = true;
        draw(true);
        return;
      }
      changePlanMode(false);
    }
    clearAim(false);clearOrder(false);executionLeft=null;acc=0;tempoNotice='';
    observedOrders = null;
    paused = v;
    record.action(v?'pause':'resume');
    draw(true);
  }
  function observeThree(){
    if(phase!=='fight'||!paused||armed||pendingOrder||draft)return;
    executionLeft=3;paused=false;acc=0;tempoNotice=words('执行3秒战场时间后暂停','Observing 3 battle seconds, then pausing');record.action('resume',{seconds:3,observe:true});draw(true);
  }
  function inspectMilestones(){
    const cue=inspectTempoMilestones(b,side,milestones);milestones=cue.next;
    if ((nanpi || fieldCommand) && cue.reasons.includes('contact')) {
      record.action('contact',{at:cue.contactKind==='gate'?b.gate?.at:undefined});
      record.capture(phase,{force:true});
    }
    if(!milestonePauses||!cue.reasons.length)return false;
    paused=true;executionLeft=null;acc=0;
    const contact=cue.contactKind==='gate'?(side===0?words('攻城开始','Siege contact'):words('城门遭攻','Gate under attack')):cue.contactKind==='depot'?words('粮仓受袭','Depot under attack'):words('初次接敌','First contact');
    tempoNotice=(cue.reasons.includes('contact')?contact:'')+(cue.reasons.length>1?' · ':'')+(cue.reasons.includes('tactic')?words('战法可施展','Tactic available'):'')+words(' · 已暂停，本场不再重复提示',' · Paused; this prompt occurs once per battle')+finishAdvanceNote();
    if(cue.opportunity){selected=cue.opportunity.unitId;view.select(selected);}
    record.action('pause',{reason:cue.reasons.join('+')});draw(true);return true;
  }
  function begin() {
    phase = 'fight';
    paused = trial || fieldCommand;
    if (trial) tempoNotice = words('战鼓已鸣 · 暂停中可先布置军令','Drums sounded · Give orders while paused');
    else if (fieldCommand) tempoNotice = words('战鼓已鸣 · 可先协同下令，或直接继续','Drums sounded · Plan your opening orders or continue');
    record.action('begin');record.capture(phase,{force:true});
    app.sound.play('horn');
    draw(true);
  }
  /** Let the officers fight it from here, at once. */
  function autoFinish() {
    phase = 'fight';
    for(const u of b.units)if(u.side===side){simCommand(b,u.id,'autoTactic',true);record.action('autoTactic',{unit:u.id,arg:true});}
    record.action('entrust');record.capture(phase,{force:true});
    for (let i = 0; i < 2400 && !b.over; i++){stepBattle(b, 0.25, -1);record.capture(phase);}
    if (!b.over) b.over = { winner: 1, why: 'sunset' };
    end(b.over);
  }
  function end(over) {
    if (ended||ending) return;
    b.over = over;
    const result = outcome(b);
    record.action('result',{winner:over.winner,why:over.why});
    const tape=record.finish(),report=tape.report;
    const won = result.winner === side;
    app.sound.play(won ? 'win' : 'lose');
    phase='result';paused=true;armed=null;clearOrder(false);executionLeft=null;view.select(null);view.preview(phase,null);
    ending={result,tape,report,left:app.calm()?0.65:1.6};renderEnding();
  }
  function renderEnding(){
    if(!ending)return;
    hud.dataset.phase='result';
    clear(hud).append(h('section.bOutcomeHold',{'aria-label':words('战斗结束','Battle ended')},h('small',words('战局已定','THE BATTLE IS DECIDED')),h('h2',ending.result.winner===side?t('victory'):t('defeat')),h('p',battleOutcomeReason(ending.result,side,getLanguage())),keyButton('finish-result',words('查看战果','View results'),completeEnding,{kind:'main'}),h('small',words('片刻后进入战果 · 可立即跳过','Results follow shortly · Skip at any time'))));
  }
  function completeEnding(){
    if(ended||!ending)return;
    ended=true;const {result,tape,report}=ending;ending=null;
    if (!trial) finishBattle(s, setup, result);
    cleanBattle();
    if (trial) return onTrialResult({ setup, result, tape, report });
    app.endBattle({ setup, result, tape, report });
  }
  function cleanBattle() {
    clearTimeout(releaseTimer);hud.removeEventListener('pointerdown',holdHud,true);window.removeEventListener('pointerup',releaseHud,true);window.removeEventListener('pointercancel',releaseHud,true);window.removeEventListener('blur',blurHud);
    view.destroy();
    clear(hud);
    clear(fx);
    hud.classList.remove('is-nanpi-trial');
  }
  function leaveTrial() {
    if (!trial || ended) return;
    ended = true;
    cleanBattle();
    onTrialExit();
  }

  selected=b.units.find(u=>u.side===side&&!u.gone)?.id??null;
  view.select(selected);
  draw(true);
  app.sound.theme('battle');
  return {
    update(dt) {
      if (ended) return;
      if(ending){ending.left-=dt;if(ending.left<=0)completeEnding();return;}
      if (phase === 'fight' && !paused) {
        acc += dt * SPEEDS[speed];
        let before = 0;
        for (const u of b.units) before += u.troops;
        while (acc >= 0.1 && !b.over) {
          const gateWasOpen = b.gate?.open;
          stepBattle(b, 0.1, side);
          if (nanpi && b.keepHeld > 0 && !occupiedKeep) {
            occupiedKeep = true;
            record.action('occupy',{at:b.keep,unit:b.units.find(u=>u.side===side&&u.pos===b.keep&&!u.gone)?.id});
            record.capture(phase,{force:true});
          }
          record.capture(phase);
          acc -= 0.1;
          if(executionLeft!==null)executionLeft-=0.1;
          if (nanpi && milestonePauses && !b.over && !gateWasOpen && b.gate?.open) {
            paused = true;
            executionLeft = null;
            acc = 0;
            tempoNotice = words('城门已破 · 可下令夺取本营','Gate breached · You can order the advance on the keep');
            record.capture(phase,{force:true});
            draw(true);
            break;
          }
          if(!b.over&&inspectMilestones())break;
          if(executionLeft!==null&&executionLeft<=1e-6){executionLeft=null;paused=true;acc=0;tempoNotice=words('观察执行已完成 · 已暂停，可继续下令','Observation complete · Paused and ready for orders')+finishAdvanceNote();record.action('pause',{reason:'observe'});break;}
        }
        let after = 0;
        for (const u of b.units) after += u.troops;
        clash -= dt;
        if (!nanpi && !fieldCommand && after < before - 20 && clash <= 0) {
          app.sound.play(Math.random() < 0.3 ? 'arrows' : 'clash', { volume: 0.5 });
          clash = 0.8;
        }
        if (b.over) return end(b.over);
      }
      draw();
    },
    key(code) {
      if(ending){if(['Enter','Space','Escape'].includes(code)){completeEnding();return true;}return false;}
      // The global listener runs in capture: focused controls own their native
      // Enter/Space action, so a selection must not also start/pause the battle.
      // A group card uses Enter only; Space keeps the battle pause shortcut.
      if ((code === 'Space' || code === 'Enter') && document.activeElement?.closest?.('#battleHud button, #plates .plate.unit[role="button"]')) return false;
      if (code === 'Enter' && document.activeElement?.closest?.('#battleHud .ucard[tabindex]')) return false;
      if (code === 'Space' && phase === 'fight') setPaused(!paused);
      else if (/^Digit[1-3]$/.test(code) && phase === 'fight') {
        setSpeed(+code.slice(5)-1);
      } else if (code === 'Escape') {
        if(armed){cancelAim();return true;}
        if(pendingOrder){cancelOrder();return true;}
        if(draft){changePlanMode(false);draw(true);return true;}
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
    get tempo(){return {paused,speed:SPEEDS[speed],armed:armed?{...armed}:null,milestonePauses,milestones:{...milestones},executionLeft,ending:!!ending,commandNotice:commandNotice || planReceipt,orderPreview:pendingOrder?.plan??null};},
    begin,
    autoFinish,
    select,
    command: (...a) => issue(...a)
  };
}

export { seal };
