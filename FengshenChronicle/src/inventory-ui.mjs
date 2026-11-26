import { AFFIX_LABELS, PROFESSIONS, canEquip, equipmentStats, professionStats } from './sim/arsenal.mjs';
import { EQUIPMENT_SLOTS, ITEMS } from './sim/data.mjs';
import { bagSize } from './sim/progression.mjs';
import { RECOVERY_ITEMS } from './sim/world.mjs';
import { affixText, gearUrl, professionPortrait, slotNames, tierNames } from './rpg-ui.mjs';

const pages = [['equipment', '装备'], ['stats', '属性'], ['items', '道具']];
const emptyArt = {
  offhand: 'bronze-shield', armor: 'linen-armor', boots: 'cloth-boots', ring: 'bronze-ring', skill: 'qiankun-ring'
};
const materialArt = {herb: 'qingxin-herb', parts: 'scale-armor', survivors: 'jade-seal', beacons: 'wind-banner'};
const attributes = Object.entries({...AFFIX_LABELS, maxHp: '气血上限'});
const signed = value => value > 0 ? '+' + value : String(value);
const health = hero => Math.ceil(hero.hp) + ' / ' + hero.maxHp;

export function createInventoryPanel({current, command, repaint, close}) {
  let page = 'equipment';
  let filter = null;
  let feedback = '';

  function select(next) {
    page = next;
    feedback = '';
    repaint({focus: 'bag-tab-' + next, resetScroll: true});
  }

  function filterSlot(slot, focus) {
    filter = filter === slot ? null : slot;
    repaint({focus, resetScroll: true});
  }

  function stepTab(code) {
    const index = pages.findIndex(([id]) => id === page);
    const next = {
      ArrowLeft: (index + pages.length - 1) % pages.length,
      ArrowRight: (index + 1) % pages.length,
      Home: 0,
      End: pages.length - 1
    }[code];
    if (next === undefined) return false;
    select(pages[next][0]);
    return true;
  }

  function gearRows(ui, state, width) {
    const {inventory, equipment, artifact, profession, hero} = state;
    const worn = new Set(Object.values(equipment));
    const gear = inventory.filter(instance => !filter || ITEMS[instance.itemId].slot === filter);
    gear.sort((a, b) => Number(worn.has(b.uid)) - Number(worn.has(a.uid)));
    if (!gear.length) {
      return [ui.text('bag-empty', '行囊中没有' + (filter ? slotNames[filter] : '装备') + '。', {width, height: 44})];
    }
    return gear.map(instance => {
      const item = ITEMS[instance.itemId];
      const equipped = equipment[item.slot] === instance.uid;
      const stats = equipmentStats(item, instance.affixes);
      const bonuses = attributes.filter(([key]) => stats[key] > 0)
        .map(([key, label]) => label + ' +' + stats[key]);
      const affixes = affixText(instance);
      let description = item.slot === 'skill'
        ? item.description
        : [tierNames[item.tier] ?? '装备', ...bonuses, affixes && '词条 ' + affixes].filter(Boolean).join(' · ');
      if (!equipped && item.slot !== 'skill') {
        const previous = inventory.find(entry => entry.uid === equipment[item.slot]);
        const baseline = equipmentStats(ITEMS[previous?.itemId], previous?.affixes);
        const differences = attributes.filter(([key]) => stats[key] !== baseline[key])
          .map(([key, label]) => label + ' ' + signed(stats[key] - baseline[key]));
        description += '\n换装后 ' + (differences.join(' · ') || '属性持平');
      }
      let unavailable = '';
      if (item.slot === 'skill' && artifact.phase !== 'idle') unavailable = '法宝飞行中';
      else if (!equipped && !canEquip(item, profession, hero.level)) {
        unavailable = hero.level < item.requiredLevel ? '需 Lv.' + item.requiredLevel : '职业不符';
      }
      const id = 'bag-gear-' + instance.uid;
      const action = ui.button(id, unavailable || (equipped ? '卸下' : '装备'),
        () => command(equipped ? {type: 'unequip', slot: item.slot} : {type: 'equip', uid: instance.uid}),
        {width: 72, height: 44, size: 14, disabled: Boolean(unavailable), active: equipped});
      return ui.item(id + '-row', {
        name: item.name + (equipped ? ' · 已穿戴' : ''),
        description, art: gearUrl(item.id), tier: item.tier, action
      }, {width, height: width < 440 ? 108 : 92});
    });
  }

  function equipmentBody(ui, state, role, width) {
    const {hero, inventory, equipment} = state;
    const wide = width >= 640;
    const slotsWidth = wide ? 218 : width;
    const slotWidth = wide ? slotsWidth : Math.floor((slotsWidth - 6) / 2);
    const listWidth = wide ? width - slotsWidth - 12 : width;
    const slots = EQUIPMENT_SLOTS.map(slot => {
      const equipped = inventory.find(entry => entry.uid === equipment[slot]);
      const item = ITEMS[equipped?.itemId];
      const id = 'bag-slot-' + slot;
      const name = item?.name ?? '空位';
      return ui.row([
        ui.image(id + '-art', gearUrl(item?.id ?? (slot === 'weapon' ? role.starterWeapon : emptyArt[slot])),
          {width: 38, height: 44, label: slotNames[slot]}),
        ui.button(id, slotNames[slot], () => filterSlot(slot, id),
          {width: 'fill', height: 48, size: 14, active: filter === slot, description: name})
      ], {name: 'bag-slot-row-' + slot, width: slotWidth, height: 48, gap: 4, align: 'center'});
    });
    const slotRows = wide ? slots : [0, 2, 4].map(index =>
      ui.row(slots.slice(index, index + 2), {name: 'bag-slot-pair-' + index, width, height: 48, gap: 6}));
    const listHeader = [
      ui.text('bag-list-title', filter ? '筛选 · ' + slotNames[filter] : '全部装备', {width: 'fill', height: 32, size: 17})
    ];
    if (filter) listHeader.push(ui.button('bag-show-all', '显示全部', () => {
      filterSlot(null, 'bag-slot-' + EQUIPMENT_SLOTS[0]);
    }, {width: 88, height: 44, size: 14}));
    const list = [
      ui.row(listHeader, {name: 'bag-list-header', width: listWidth, height: 44, align: 'center', gap: 6}),
      ...gearRows(ui, state, listWidth)
    ];
    const stats = ui.text('bag-quick-stats', '攻击 ' + hero.attack + '   防御 ' + hero.defense + '   气血 ' + health(hero),
      {width, height: 30, size: 15, color: 0xedd19b});
    const wornHeading = ui.text('bag-equipped-title', '已穿戴', {width: slotsWidth, height: 25, size: 16});
    if (wide) {
      const listHeight = 44 + (list.length - 1) * (listWidth < 440 ? 114 : 98);
      const slotsHeight = 25 + slots.length * 54;
      return [stats, ui.row([
        ui.column([wornHeading, ...slotRows], {name: 'bag-worn-list', width: slotsWidth, height: slotsHeight, gap: 6}),
        ui.collection('bag-gear-list', list, {width: listWidth, height: listHeight, gap: 6})
      ], {name: 'bag-equipment-columns', width, height: Math.max(slotsHeight, listHeight), align: 'start', gap: 12})];
    }
    return [stats, wornHeading, ...slotRows, ...list];
  }

  function statsBody(ui, {hero, equipment, inventory}, role, width) {
    const xp = hero.level >= 20 ? '已满级' : hero.xp + ' / ' + hero.needXp;
    const profileWidth = width - 93;
    const profile = ui.row([
      ui.image('bag-portrait', professionPortrait(role.id), {width: 85, height: 126, label: role.name}),
      ui.column([
        ui.text('bag-profile-name', role.name + ' · Lv.' + hero.level, {width: profileWidth, height: 26, size: 19}),
        ui.text('bag-profile-role', role.description, {width: profileWidth, height: 32, size: 13, lines: 2}),
        ui.text('bag-hp', '气血 ' + health(hero), {width: profileWidth, height: 19, size: 13}),
        ui.bar('bag-hp-meter', hero.hp / hero.maxHp, {height: 5, color: 0xce7b63, label: '气血 ' + health(hero)}),
        ui.text('bag-xp', '经验 ' + xp, {width: profileWidth, height: 19, size: 13}),
        ui.bar('bag-xp-meter', hero.level >= 20 ? 1 : hero.xp / hero.needXp, {height: 5, color: 0xe0ba75, label: '经验 ' + xp})
      ], {width: profileWidth, height: 122, gap: 2})
    ], {name: 'bag-profile', width, height: 126, align: 'center', gap: 8});
    const base = professionStats(role.id, hero.level);
    const stats = attributes.map(([key, label]) => ui.column([
      ui.text('bag-attribute-' + key, label + ' ' + hero[key], {height: 24, size: 16, color: 0xf7da99}),
      ui.text('bag-attribute-detail-' + key, '基础 ' + base[key] + ' · 装备 ' + signed(hero[key] - base[key]),
        {height: 22, size: 13})
    ], {width: 'fill', height: 52, gap: 2}));
    const statRows = [];
    for (let index = 0; index < stats.length; index += 2) {
      statRows.push(ui.row(stats.slice(index, index + 2), {name: 'bag-stat-row-' + index, width, height: 52, gap: 8}));
    }
    const artifact = ITEMS[inventory.find(instance => instance.uid === equipment.skill)?.itemId];
    const abilities = [
      ['basic', '普攻', '攻击距离 ' + role.reach + ' · 间隔 ' + role.attackCooldown + ' 秒'],
      ['active', role.active.name + ' [X]', role.active.description + ' 冷却 ' + role.active.cooldown + ' 秒。'],
      ['rage', role.rage.name + ' [R]', role.rage.description + ' 怒气满后可用。'],
      ['artifact', (artifact?.name ?? '主动法宝') + ' [Q]', artifact?.description ?? '当前法宝栏为空。']
    ];
    return [
      profile,
      ui.text('bag-attributes', '角色属性', {width, height: 26, size: 17}),
      ...statRows,
      ui.text('bag-abilities', '招式与法宝', {width, height: 26, size: 17}),
      ...abilities.map(([id, name, description]) => ui.column([
        ui.text('bag-ability-' + id, name, {height: 20, size: 15, color: 0xe8c58a}),
        ui.text('bag-ability-detail-' + id, description, {height: 41, size: 13, lines: 2})
      ], {name: 'bag-ability-row-' + id, width, height: 64, gap: 3}))
    ];
  }

  function itemsBody(ui, {hero, resources}, width) {
    const missing = Math.max(0, hero.maxHp - hero.hp);
    const recovery = RECOVERY_ITEMS.map(({itemId, key, heal}) => {
      const item = ITEMS[itemId];
      const count = hero[key] ?? 0;
      const label = count < 1 ? '无库存' : missing <= 0 ? '气血已满' : '使用';
      const id = 'bag-use-' + itemId;
      return ui.item(id + '-row', {
        name: item.name + ' ×' + count,
        description: '每份最多恢复 ' + heal + ' 点气血。',
        art: gearUrl(itemId), tier: item.tier,
        action: ui.button(id, label, () => command({type: 'potion', itemId}),
          {width: 84, height: 44, size: 14, disabled: label !== '使用'})
      }, {width, height: 78});
    });
    const materials = Object.values(ITEMS).filter(item =>
      item.resource && (['herb', 'parts'].includes(item.resource) || resources[item.resource] > 0)
    );
    return [
      ui.text('bag-item-balance', '气血 ' + health(hero) + '   铜钱 ' + hero.gold + ' 文',
        {width, height: 28, size: 15, color: 0xedd19b}),
      ui.text('bag-consumables', '常备药品', {width, height: 26, size: 17}),
      ...recovery,
      ui.text('bag-materials', '材料与任务物品', {width, height: 26, size: 17}),
      ...materials.map(item => ui.item('bag-material-' + item.id, {
        name: item.name + ' ×' + resources[item.resource],
        description: item.description, art: gearUrl(materialArt[item.resource]), tier: item.tier
      }, {width, height: 76}))
    ];
  }

  return {
    reset() {
      page = 'equipment';
      filter = null;
      feedback = '';
    },
    stepTab,
    notify(events = []) {
      for (const event of events) {
        if (event.type === 'equip') feedback = '已装备 ' + event.name;
        if (event.type === 'unequip') feedback = '已卸下' + slotNames[event.slot];
        if (event.type === 'heal') feedback = ITEMS[event.itemId].name + '恢复 ' + event.amount + ' 点气血';
      }
    },
    build({ui, width}) {
      const state = current();
      const role = PROFESSIONS[state.profession] ?? PROFESSIONS.guard;
      const tabs = ui.row(pages.map(([id, label]) =>
        ui.button('bag-tab-' + id, label, () => select(id), {width: 'fill', height: 44, active: page === id})
      ), {width, height: 44, gap: 6});
      const body = page === 'equipment' ? equipmentBody(ui, state, role, width)
        : page === 'stats' ? statsBody(ui, state, role, width) : itemsBody(ui, state, width);
      const children = [tabs, ui.scroll('bag-scroll', body, {width, height: 'fill', gap: 6})];
      if (feedback) children.push(ui.text('bag-feedback', feedback, {width, height: 22, size: 14, color: 0xf7d18c}));
      return {
        title: '行囊',
        subtitle: role.name + ' · Lv.' + state.hero.level + '   装备 ' + bagSize(state) + ' / 30',
        close() {
          feedback = '';
          close();
        },
        children,
        focus: 'bag-tab-' + page
      };
    }
  };
}
