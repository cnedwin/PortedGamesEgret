import { AFFIX_LABELS, PROFESSIONS, canEquip, equipmentStats, professionStats } from './sim/arsenal.mjs';
import { EQUIPMENT_SLOTS, ITEMS } from './sim/data.mjs';
import { bagSize } from './sim/progression.mjs';
import { RECOVERY_ITEMS } from './sim/world.mjs';
import { affixText, gearUrl, professionPortrait, slotNames, tierNames } from './rpg-ui.mjs';

const $ = id => document.getElementById(id);
const pages = ['equipment', 'stats', 'items'];
const emptyArt = {
  offhand:'bronze-shield', armor:'linen-armor', boots:'cloth-boots', ring:'bronze-ring', skill:'qiankun-ring'
};
const materialArt = {herb:'qingxin-herb', parts:'scale-armor', survivors:'jade-seal', beacons:'wind-banner'};
const attributes = Object.entries({...AFFIX_LABELS, maxHp:'气血上限'});

function text(tag, content, className = '') {
  const element = document.createElement(tag);
  element.textContent = content;
  if (className) element.className = className;
  return element;
}

function itemImage(itemId, className = 'gear-mark') {
  const image = new Image();
  image.src = gearUrl(itemId);
  image.alt = '';
  image.className = className;
  return image;
}

function action(label, className = '') {
  const button = text('button', label, className);
  button.type = 'button';
  return button;
}

function row(item, description, art = item.id) {
  const element = document.createElement('li');
  const title = text('b', item.name);
  const details = text('small', description);
  const summary = document.createElement('div');
  summary.append(title, details);
  element.dataset.tier = item.tier;
  element.append(itemImage(art), summary);
  return {element, summary, title};
}

function signed(value) {
  return value > 0 ? '+' + value : String(value);
}

export function createInventoryPanel({current, command}) {
  let page = 'equipment';
  let filter = null;
  const tabs = pages.map(name => $('bag-tab-' + name));
  const feedback = $('bag-feedback');

  function render(events = []) {
    const state = current();
    const hero = state.hero;
    const role = PROFESSIONS[state.profession] ?? PROFESSIONS.guard;
    $('inventory-profession').textContent = role.name + ' · Lv.' + hero.level;
    $('bag-capacity').textContent = '装备 ' + bagSize(state) + ' / 30';
    if (page === 'equipment') renderEquipment(state, role);
    if (page === 'stats') renderStats(state, role);
    if (page === 'items') renderItems(state);
    for (const event of events) {
      if (event.type === 'equip') showFeedback('已装备 ' + event.name);
      if (event.type === 'unequip') showFeedback('已卸下' + slotNames[event.slot]);
      if (event.type === 'heal') showFeedback(ITEMS[event.itemId].name + '恢复 ' + event.amount + ' 点气血');
    }
  }

  function renderEquipment(state, role) {
    const {hero, inventory, equipment} = state;
    $('equipment-stats').replaceChildren(
      text('span','攻击 ' + hero.attack), text('span','防御 ' + hero.defense),
      text('span','气血 ' + Math.ceil(hero.hp) + ' / ' + hero.maxHp)
    );
    $('equipment-slots').replaceChildren(...EQUIPMENT_SLOTS.map(slot => {
      const equipped = inventory.find(entry => entry.uid === equipment[slot]);
      const button = action('', 'equipment-slot');
      const label = document.createElement('span');
      label.append(text('small',slotNames[slot]), text('strong',equipped ? ITEMS[equipped.itemId].name : '空位'));
      button.dataset.filter = slot;
      button.dataset.empty = String(!equipped);
      button.setAttribute('aria-pressed', String(filter === slot));
      button.append(itemImage(equipped?.itemId ?? (slot === 'weapon' ? role.starterWeapon : emptyArt[slot]), 'bag-slot-icon'), label);
      return button;
    }));
    $('bag-list-title').textContent = filter ? slotNames[filter] : '全部装备';
    $('bag-show-all').hidden = !filter;
    const gear = inventory.filter(instance => !filter || ITEMS[instance.itemId].slot === filter);
    const worn = new Set(Object.values(equipment));
    gear.sort((a, b) => Number(worn.has(b.uid)) - Number(worn.has(a.uid)));
    $('equipment-list').replaceChildren(...(gear.length ? gear.map(instance => renderGearRow(state, instance)) : [
      text('li', '行囊中没有' + (filter ? slotNames[filter] : '装备') + '。', 'bag-empty')
    ]));
  }

  function renderGearRow(state, instance) {
    const {inventory, equipment, artifact, profession, hero} = state;
    const item = ITEMS[instance.itemId];
    const equipped = equipment[item.slot] === instance.uid;
    const current = inventory.find(entry => entry.uid === equipment[item.slot]);
    const stats = equipmentStats(item, instance.affixes);
    const bonuses = attributes.filter(([key]) => stats[key] > 0)
      .map(([key,label]) => label + ' +' + stats[key]);
    const affixes = affixText(instance);
    const description = item.slot === 'skill'
      ? item.description
      : [tierNames[item.tier] ?? '装备', ...bonuses, affixes && '词条 ' + affixes].filter(Boolean).join(' · ');
    const {element, title, summary} = row(item, description);
    if (equipped) {
      title.append(' ', text('span','已穿戴','bag-worn-mark'));
      element.classList.add('bag-equipped');
    } else if (item.slot !== 'skill') {
      const baseline = equipmentStats(ITEMS[current?.itemId], current?.affixes);
      const changes = document.createElement('small');
      changes.className = 'bag-comparison';
      const differences = attributes.filter(([key]) => stats[key] !== baseline[key]);
      changes.append('换装后 ', ...differences.map(([key,label]) => {
        const difference = stats[key] - baseline[key];
        return text('span', label + ' ' + signed(difference), difference > 0 ? 'gain' : 'loss');
      }));
      if (!differences.length) changes.append('属性持平');
      summary.append(changes);
    }
    let unavailable = '';
    if (item.slot === 'skill' && artifact.phase !== 'idle') unavailable = '法宝飞行中';
    else if (!equipped && !canEquip(item, profession, hero.level)) {
      unavailable = hero.level < item.requiredLevel ? '需 Lv.' + item.requiredLevel : '职业不符';
    }
    const label = unavailable || (equipped ? '卸下' : '装备');
    const button = action(label, equipped ? 'unequip' : 'equip');
    button.disabled = Boolean(unavailable);
    button.dataset.uid = instance.uid;
    button.dataset.slot = item.slot;
    button.setAttribute('aria-label', label + ' ' + item.name);
    element.append(button);
    return element;
  }

  function renderStats(state, role) {
    const {hero, equipment, inventory} = state;
    const portrait = $('bag-portrait');
    const portraitUrl = professionPortrait(role.id);
    if (portrait.src !== portraitUrl) portrait.src = portraitUrl;
    $('bag-profile-name').textContent = role.name + ' · Lv.' + hero.level;
    $('bag-profile-role').textContent = role.description;
    $('bag-hp').textContent = Math.ceil(hero.hp) + ' / ' + hero.maxHp;
    $('bag-hp-meter').max = hero.maxHp;
    $('bag-hp-meter').value = hero.hp;
    $('bag-xp').textContent = hero.level >= 20 ? '已满级' : hero.xp + ' / ' + hero.needXp;
    $('bag-xp-meter').max = hero.needXp;
    $('bag-xp-meter').value = hero.level >= 20 ? hero.needXp : hero.xp;
    const base = professionStats(role.id, hero.level);
    $('bag-attributes').replaceChildren(...attributes.map(([key,label]) => {
      const entry = document.createElement('div');
      const total = text('strong', hero[key]);
      const contribution = hero[key] - base[key];
      const value = document.createElement('dd');
      value.append(total, text('small', '基础 ' + base[key] + ' · 装备 ' + signed(contribution)));
      entry.dataset.stat = key;
      entry.append(text('dt',label), value);
      return entry;
    }));
    const artifact = ITEMS[inventory.find(instance => instance.uid === equipment.skill)?.itemId];
    const abilities = [
      ['普攻', '攻击距离 ' + role.reach + ' · 间隔 ' + role.attackCooldown + ' 秒'],
      [role.active.name, role.active.description + ' 冷却 ' + role.active.cooldown + ' 秒。', 'X'],
      [role.rage.name, role.rage.description + ' 怒气满后可用。', 'R'],
      [artifact?.name ?? '主动法宝', artifact?.description ?? '当前法宝栏为空。', 'Q']
    ];
    $('bag-abilities').replaceChildren(...abilities.map(([name, description, key]) => {
      const entry = document.createElement('li');
      const title = text('b',name);
      if (key) title.append(' ',text('kbd',key));
      entry.append(title,text('small',description));
      return entry;
    }));
  }

  function renderItems({hero, resources}) {
    $('bag-item-health').textContent = '气血 ' + Math.ceil(hero.hp) + ' / ' + hero.maxHp;
    $('bag-item-coins').textContent = '铜钱 ' + hero.gold + ' 文';
    const missing = Math.max(0, hero.maxHp - hero.hp);
    $('bag-consumables').replaceChildren(...RECOVERY_ITEMS.map(recovery => {
      const item = ITEMS[recovery.itemId];
      const count = hero[recovery.key] ?? 0;
      const {element, title} = row(item,'每份最多恢复 ' + recovery.heal + ' 点气血。');
      title.append(' ',text('span','×' + count,'bag-item-count'));
      const label = count < 1 ? '无库存' : missing <= 0 ? '气血已满' : '使用';
      const button = action(label, label === '使用' ? 'primary' : '');
      button.dataset.useItem = recovery.itemId;
      button.disabled = label !== '使用';
      button.setAttribute('aria-label', item.name + ' · ' + label);
      element.append(button);
      return element;
    }));
    const materials = Object.values(ITEMS).filter(item =>
      item.resource && (['herb','parts'].includes(item.resource) || resources[item.resource] > 0));
    $('bag-materials').replaceChildren(...materials.map(item => {
      const {element, title} = row(item,item.description,materialArt[item.resource]);
      title.append(' ',text('span','×' + resources[item.resource],'bag-item-count'));
      return element;
    }));
  }

  function showFeedback(message = '') {
    feedback.textContent = message;
    feedback.hidden = !message;
  }

  function selectPage(index, focus = false) {
    page = pages[index];
    tabs.forEach((button, i) => {
      const selected = index === i;
      button.tabIndex = selected ? 0 : -1;
      button.setAttribute('aria-selected',String(selected));
      $(button.getAttribute('aria-controls')).hidden = !selected;
    });
    showFeedback();
    render();
    if (focus) tabs[index].focus({preventScroll:true});
  }

  tabs.forEach((button,index) => {
    button.addEventListener('click',() => selectPage(index));
    button.addEventListener('keydown',event => {
      const next = {ArrowLeft:(index + tabs.length - 1) % tabs.length, ArrowRight:(index + 1) % tabs.length,
        Home:0, End:tabs.length - 1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectPage(next,true);
    });
  });
  $('equipment-slots').addEventListener('click', event => {
    const slot = event.target.closest('[data-filter]')?.dataset.filter;
    if (!slot) return;
    filter = filter === slot ? null : slot;
    render();
    $('equipment-slots').querySelector('[data-filter="' + slot + '"]').focus({preventScroll:true});
  });
  $('bag-show-all').addEventListener('click', () => {
    filter = null;
    render();
    $('equipment-slots').firstElementChild.focus({preventScroll:true});
  });
  $('equipment-list').addEventListener('click', event => {
    const button = event.target.closest('.equip,.unequip');
    if (!button) return;
    const {uid,slot} = button.dataset;
    command(button.classList.contains('equip') ? {type:'equip',uid} : {type:'unequip',slot});
    $('equipment-list').querySelector('[data-uid="' + CSS.escape(uid) + '"]')?.focus({preventScroll:true});
  });
  $('bag-consumables').addEventListener('click', event => {
    const itemId = event.target.closest('[data-use-item]')?.dataset.useItem;
    if (!itemId) return;
    command({type:'potion',itemId});
    const button = $('bag-consumables').querySelector('[data-use-item="' + itemId + '"]');
    (button.disabled ? $('bag-tab-items') : button).focus({preventScroll:true});
  });

  return {
    open() { selectPage(pages.indexOf(page)); },
    reset() { page = 'equipment'; filter = null; },
    render
  };
}
