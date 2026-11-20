// HUD：血条、能量、手牌、步数、连锁、飘字。
//
// 全部走 DOM 而不是画在画布里。理由有三条：
//   1. 中文排版交给浏览器，字最清楚，也不用为每个数字生成一张纹理；
//   2. 卡面是重排版的东西（费用、名字、两行描述），CSS 一行能搞定的事，
//      用画布要写一堆断行逻辑；
//   3. 手指点在按钮上就是按钮，不用自己做命中判定。
//
// 代价是 HUD 和画布必须严格对齐——坐标统一从 layout.mjs 来。

import { ELEMENT_INFO, ELEMENT_ORDER } from '../core/cards.mjs';
import { ENERGY_CAP, STEPS_PER_TURN } from '../core/battle.mjs';
import { ENERGY_SLOTS, STAGE } from '../view/layout.mjs';

const pct = (value, total) => `${(value / total) * 100}%`;
const at = (point) => ({ left: pct(point.x, STAGE.width), top: pct(point.y, STAGE.height) });

function sigil(element, sizeClass = '') {
  return `<svg class="sigil ${sizeClass}" aria-hidden="true"><use href="#sigil-${element}"></use></svg>`;
}

/** 手牌与奖励使用同一套面板和元素符纹。 */
export function cardMarkup(card) {
  return `<span class="card-cost">${card.cost}</span>
    ${sigil(card.element, 'card-sigil')}
    <span class="card-name">${card.name}</span>
    <span class="card-elem">${ELEMENT_INFO[card.element].name}</span>
    <span class="card-text">${card.text.replaceAll('\n', '<br>')}</span>`;
}

export function createHud({ root, onCard, onEndTurn }) {
  const enemyName = root.querySelector('#enemy-name');
  const encounter = root.querySelector('#encounter');
  const enemyHp = root.querySelector('#enemy-hp');
  const enemyHpText = root.querySelector('#enemy-hp-text');
  const enemyShield = root.querySelector('#enemy-shield');
  const intent = root.querySelector('#enemy-intent');
  const heroHp = root.querySelector('#hero-hp');
  const heroHpText = root.querySelector('#hero-hp-text');
  const heroShield = root.querySelector('#hero-shield');
  const stepsEl = root.querySelector('#steps');
  const endTurn = root.querySelector('#end-turn');
  const handEl = root.querySelector('#hand');
  const energyEl = root.querySelector('#energy');
  const chainEl = root.querySelector('#chain');
  const floaters = root.querySelector('#floaters');
  const bannerEl = root.querySelector('#banner');
  const bondsEl = root.querySelector('#bonds');
  const turnEl = root.querySelector('#turn');
  const showDetails = root.querySelector('#show-hand-details');
  const details = root.parentElement.querySelector('#hand-details');
  const detailList = details.querySelector('#hand-detail-list');
  const encounterLabels = { shanjiao: '第一阵 · 守林', chijiao: '第二阵 · 断桥', hundun: '第三阵 · 阵眼' };

  endTurn.addEventListener('click', () => onEndTurn());
  let visibleHand = [];
  let handSignature = '';
  let bondSignature = '';

  function renderDetails() {
    detailList.replaceChildren();
    for (const card of visibleHand) {
      const info = ELEMENT_INFO[card.element];
      const line = document.createElement('li');
      line.style.setProperty('--tint', info.color);
      line.innerHTML = `${sigil(card.element)}<div class="detail-heading"><strong>${card.name}</strong><span>${card.cost} ${info.name}能量</span></div><p></p>`;
      line.querySelector('p').textContent = card.text;
      detailList.append(line);
    }
  }

  showDetails.addEventListener('click', () => {
    if (!visibleHand.length || details.open) return;
    renderDetails();
    details.showModal();
  });

  const dots = Array.from({ length: STEPS_PER_TURN }, () => {
    const dot = document.createElement('i');
    dot.className = 'dot';
    dot.setAttribute('aria-hidden', 'true');
    stepsEl.append(dot);
    return dot;
  });

  // 能量：五个坑一次建好，之后只改数字
  const energyChips = new Map();
  for (const [index, element] of ELEMENT_ORDER.entries()) {
    const info = ELEMENT_INFO[element];
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.element = element;
    chip.style.setProperty('--tint', info.color);
    const slot = ENERGY_SLOTS[index];
    Object.assign(chip.style, at(slot));
    chip.innerHTML = `${sigil(element)}<b>${info.name}</b><i>0</i>`;
    energyEl.append(chip);
    energyChips.set(element, chip);
  }

  function renderHand(battle) {
    visibleHand = battle.hand;
    showDetails.disabled = !visibleHand.length;
    const signature = battle.hand.map((card) => `${card.uid}:${card.cost}`).join('|');
    if (signature === handSignature) {
      for (const button of handEl.children) {
        const card = battle.hand.find((item) => item.uid === button.dataset.uid);
        button.classList.toggle('is-ready', Boolean(card) && battle.energy[card.element] >= card.cost);
      }
      return;
    }
    handSignature = signature;
    handEl.replaceChildren();
    if (details.open) renderDetails();

    for (const card of battle.hand) {
      const info = ELEMENT_INFO[card.element];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'card';
      button.dataset.uid = card.uid;
      button.dataset.element = card.element;
      button.style.setProperty('--tint', info.color);
      button.style.setProperty('--deep', info.deep);
      const affordable = battle.energy[card.element] >= card.cost;
      button.classList.toggle('is-ready', affordable);
      if (card.ult) button.classList.add('is-ult');
      button.innerHTML = cardMarkup(card);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        onCard(card.uid);
      });
      handEl.append(button);
    }
  }

  function render(battle, vitals = battle) {
    const enemy = battle.enemy;
    const { enemy: shownEnemy, hero: shownHero } = vitals;
    encounter.textContent = encounterLabels[enemy.id] ?? enemy.title;
    enemyName.textContent = enemy.name;
    enemyHp.style.width = pct(Math.max(0, shownEnemy.hp), enemy.maxHp);
    enemyHpText.textContent = `${Math.max(0, Math.ceil(shownEnemy.hp))} / ${enemy.maxHp}`;
    enemyShield.textContent = shownEnemy.shield > 0 ? `护盾 ${Math.ceil(shownEnemy.shield)}` : '';
    enemyShield.classList.toggle('is-on', shownEnemy.shield > 0);

    const next = enemy.moves[enemy.moveIndex % enemy.moves.length];
    if (battle.over) intent.textContent = '';
    else if (enemy.countdown <= 0) intent.innerHTML = `<b class="is-now">${next.name}</b> ${next.damage}`;
    else intent.innerHTML = `<b>${enemy.countdown}</b> 步后 ${next.name} ${next.damage}`;

    heroHp.style.width = pct(Math.max(0, shownHero.hp), battle.hero.maxHp);
    heroHpText.textContent = `${Math.max(0, Math.ceil(shownHero.hp))} / ${battle.hero.maxHp}`;
    heroShield.textContent = shownHero.shield > 0 ? `盾 ${Math.ceil(shownHero.shield)}` : '';
    heroShield.classList.toggle('is-on', shownHero.shield > 0);

    turnEl.textContent = `第 ${battle.turn} 回合`;
    stepsEl.setAttribute('aria-label', `剩余 ${battle.steps} 步`);
    dots.forEach((dot, index) => dot.classList.toggle('is-on', index < battle.steps));

    for (const [element, chip] of energyChips) {
      const value = battle.energy[element];
      chip.querySelector('i').textContent = String(value);
      chip.classList.toggle('is-full', value >= ENERGY_CAP);
      chip.classList.toggle('is-empty', value === 0);
    }

    const bonds = battle.bonds.join('|');
    if (bonds !== bondSignature) {
      bondSignature = bonds;
      bondsEl.replaceChildren();
      for (const id of battle.bonds) {
        const tag = document.createElement('span');
        tag.className = 'bond';
        tag.textContent = BOND_LABELS[id] ?? id;
        bondsEl.append(tag);
      }
    }

    renderHand(battle);
    endTurn.disabled = battle.phase !== 'player' || battle.over !== null;
  }

  const BOND_LABELS = {
    swordShield: '剑盾同源',
    samadhi: '三昧',
    echo: '残响',
    chainBody: '连锁体质',
    starlane: '星轨',
  };

  /** 飘字：伤害数字、治疗、护盾，从指定位置往上飘。 */
  function floater(text, { x, y, kind = 'damage', element = null } = {}) {
    const node = document.createElement('span');
    node.className = `floater floater-${kind}`;
    if (element) node.style.color = ELEMENT_INFO[element].color;
    node.textContent = text;
    node.style.left = pct(x, STAGE.width);
    node.style.top = pct(y, STAGE.height);
    floaters.append(node);
    node.addEventListener('animationend', () => node.remove());
    // 兜底：万一动画没触发（比如标签页切走了），也别把节点留一辈子
    setTimeout(() => node.remove(), 2000);
  }

  let chainTimer = 0;
  function chain(count) {
    if (count < 2) return;
    chainEl.textContent = `连锁 ×${count}`;
    chainEl.dataset.count = String(Math.min(count, 6));
    chainEl.classList.remove('is-on');
    void chainEl.offsetWidth;
    chainEl.classList.add('is-on');
    clearTimeout(chainTimer);
    chainTimer = setTimeout(() => chainEl.classList.remove('is-on'), 900);
  }

  function banner(text, ms = 1400) {
    bannerEl.textContent = text;
    bannerEl.classList.add('is-on');
    setTimeout(() => bannerEl.classList.remove('is-on'), ms);
  }

  function pulse(element) {
    const chip = energyChips.get(element);
    if (!chip) return;
    chip.classList.remove('is-pulse');
    void chip.offsetWidth;
    chip.classList.add('is-pulse');
  }

  return {
    render, floater, chain, banner, pulse,
    resetHand: () => { handSignature = ''; },
    closeDetails: () => { if (details.open) details.close(); },
  };
}
