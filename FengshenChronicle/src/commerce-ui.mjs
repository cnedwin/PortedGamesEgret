import { ITEMS } from './sim/data.mjs';
import { AFFIX_LABELS, equipmentStats, forgeResult, isForgeIngredient } from './sim/arsenal.mjs';
import { bagSize } from './sim/progression.mjs';
import { affixText, gearUrl } from './rpg-ui.mjs';

const gap = 8;

function shopStats(item, affixes) {
  return Object.entries(equipmentStats(item, affixes))
    .filter(([, value]) => value > 0)
    .map(([key, value]) => AFFIX_LABELS[key] + ' +' + value)
    .join(' · ');
}

export function createCommercePanels({ current, command, repaint }) {
  let shopTab = 'buy', tradeNotice = '';
  let recipeId = null, pickingRecipe = false, forgeNotice = '';
  const materials = new Set();

  function setShopTab(tab) {
    if (shopTab === tab) return;
    shopTab = tab;
    repaint({ focus: 'shop-' + tab + '-tab', resetScroll: true });
  }

  function shopPanel({ ui, width, height }) {
    const state = current();
    const buying = shopTab === 'buy';
    const worn = new Set(Object.values(state.equipment));
    const offers = buying ? state.shop.offers : state.inventory.map(instance => ({
      id: instance.uid, itemId: instance.itemId, affixes: instance.affixes, price: ITEMS[instance.itemId]?.sellPrice ?? 0,
      equipped: worn.has(instance.uid)
    }));
    const bagFull = bagSize(state) >= 30;
    const tabs = ui.row([
      ui.button('shop-buy-tab', '货品', () => setShopTab('buy'), { width: 'fill', height: 54, active: buying }),
      ui.button('shop-sell-tab', '出售', () => setShopTab('sell'), { width: 'fill', height: 54, active: !buying })
    ], { width: 'fill', height: 54, gap });
    const status = tradeNotice || (buying ? '基础货品随等级开放' : '已穿戴的装备会保留');
    const rows = offers.filter(offer => ITEMS[offer.itemId]).map(offer => {
      const item = ITEMS[offer.itemId];
      const locked = buying && state.hero.level < offer.unlockLevel;
      const full = buying && item.slot && item.slot !== 'skill' && bagFull;
      const supply = item.id === 'potion' ? state.hero.potions : item.id === 'recovery-pill' ? state.hero.tonics : 0;
      const supplyFull = supply + (offer.quantity ?? 0) > 99;
      const underfunded = buying && state.hero.gold < offer.price;
      const disabled = buying ? locked || full || supplyFull || underfunded || offer.stock === 0 :
        offer.equipped || item.sellable === false || !offer.price;
      const label = buying ? (locked ? 'Lv.' + offer.unlockLevel + ' 解锁' : full ? '行囊已满' :
        supplyFull ? '补给已满' : '买入 · ' + offer.price) :
        offer.equipped ? '已装备' : '出售 · ' + offer.price;
      const action = ui.button('offer-' + offer.id, label, () => command(buying ?
        { type: 'buy', offerId: offer.id } : { type: 'sell', uid: offer.id }),
        { disabled, width: width < 480 ? 104 : 122, height: 52, size: 16 });
      const description = [item.description, shopStats(item, offer.affixes),
        !locked && underfunded ? '铜钱不足' : ''].filter(Boolean).join(' · ');
      return ui.item('trade-row-' + offer.id, {
        name: item.name + (offer.quantity > 1 ? ' ×' + offer.quantity : ''), description,
        art: gearUrl(item.id), tier: item.tier, action
      }, { height: width < 480 ? 96 : 88 });
    });
    if (!rows.length) rows.push(ui.text('shop-empty', '行囊里暂时没有可交易的物品。', { height: 48, lines: 2 }));
    const list = ui.scroll('shop-list', rows, { width: 'fill', height: Math.max(60, height - 112), gap });
    return {
      title: state.shop.name, subtitle: state.hero.gold + ' 文', close: () => command({ type: 'closeShop' }),
      children: [tabs, ui.text('shop-status', status, { height: 40, lines: 2 }), list],
      focus: buying ? 'shop-buy-tab' : 'shop-sell-tab'
    };
  }

  function chooseRecipe(id) {
    if (recipeId !== id) materials.clear();
    recipeId = id;
    pickingRecipe = false;
    repaint({ focus: 'forge-picker', resetScroll: true });
  }

  function toggleRecipeList() {
    pickingRecipe = !pickingRecipe;
    repaint({ focus: pickingRecipe ? 'forge-recipe-' + recipeId : 'forge-picker', resetScroll: true });
  }

  function forgePanel({ ui, width }) {
    const state = current();
    const recipes = state.forge.recipes;
    const recipe = recipes.find(item => item.id === recipeId) ?? recipes[0];
    recipeId = recipe.id;
    const screen = {
      title: '伯衡铁铺', subtitle: state.hero.gold + ' 文 · 甲片 ' + (state.resources?.parts ?? 0),
      close: () => command({ type: 'closeForge' }),
      focus: pickingRecipe ? 'forge-recipe-' + recipeId : 'forge-picker'
    };
    const picker = ui.button('forge-picker', pickingRecipe ? '返回合成' : '合成配方 · ' + recipe.name + ' ▾',
      toggleRecipeList, { width: 'fill', height: 54 });
    if (pickingRecipe) {
      const options = recipes.map(option => ui.button('forge-recipe-' + option.id,
        option.name + ' · Lv.' + option.unlockLevel, () => chooseRecipe(option.id),
        { width: 'fill', height: 54, active: option.id === recipeId }));
      return { ...screen, children: [picker, ui.scroll('forge-recipe-list', options,
        { width: 'fill', height: 'fill', gap })] };
    }

    const output = ITEMS[forgeResult(recipe, state.profession)];
    const worn = new Set(Object.values(state.equipment));
    const candidates = state.inventory.filter(instance =>
      !worn.has(instance.uid) && isForgeIngredient(ITEMS[instance.itemId], recipe, state.profession));
    const candidateIds = new Set(candidates.map(instance => instance.uid));
    for (const uid of materials) if (!candidateIds.has(uid)) materials.delete(uid);
    const locked = state.hero.level < recipe.unlockLevel;
    const paid = state.hero.gold >= recipe.gold && (state.resources?.parts ?? 0) >= recipe.parts;
    const requirements = '可炼成' + output.name + '，附随机词条。需要 ' + recipe.gold + ' 文、' +
      recipe.parts + ' 甲片及 ' + recipe.count + ' 件 Lv.' + recipe.minInputLevel + ' 起的同部位基础装备' +
      '（已选 ' + materials.size + '/' + recipe.count + '）' + (locked ? '。Lv.' + recipe.unlockLevel + ' 开炉。' : '。');
    const reqHeight = width < 480 ? 72 : 58;
    const rows = candidates.map(instance => {
      const item = ITEMS[instance.itemId], uid = instance.uid;
      const id = 'forge-material-' + uid;
      const selected = materials.has(uid);
      const disabled = locked || (!selected && materials.size >= recipe.count);
      const action = ui.toggle(id, selected ? '已选材料' : '用作材料', selected, () => {
        if (materials.has(uid)) materials.delete(uid);
        else if (materials.size < recipe.count) materials.add(uid);
        repaint({ focus: id });
      }, { disabled, width: width < 480 ? 108 : 125, height: 52, size: 16 });
      return ui.item('forge-row-' + uid, { name: item.name, art: gearUrl(item.id), tier: item.tier, action }, { height: 74 });
    });
    if (!rows.length) rows.push(ui.text('forge-empty',
      '行囊里没有可用材料。身上已穿戴的装备会保留。', { height: 56, lines: 2 }));
    const details = [];
    if (forgeNotice) details.push(ui.text('forge-feedback', forgeNotice, { height: 40, size: 16, lines: 2 }));
    details.push(ui.text('forge-requirements', requirements, { height: reqHeight, size: 16, lines: 3 }), ...rows);
    const list = ui.scroll('forge-materials', details, { width: 'fill', height: 'fill', gap });
    const submit = ui.button('forge-submit', '开炉合成',
      () => command({ type: 'forge', recipeId: recipe.id, uids: [...materials] }),
      { width: 'fill', height: 54, disabled: locked || !paid || materials.size !== recipe.count });
    return { ...screen, children: [picker, list, submit] };
  }

  return {
    resetShop() { shopTab = 'buy'; tradeNotice = ''; },
    resetForge() { recipeId = null; pickingRecipe = false; forgeNotice = ''; materials.clear(); },
    notify(events) {
      for (const event of events) {
        if (event.type === 'buy') tradeNotice = '购得' + ITEMS[event.itemId].name + '，支出 ' + event.price + ' 文。';
        if (event.type === 'sell') tradeNotice = '卖出' + ITEMS[event.itemId].name + '，收入 ' + event.gold + ' 文。';
        if (event.type === 'forge') {
          const roll = affixText(event);
          forgeNotice = '炼成' + ITEMS[event.itemId].name + (roll ? ' · ' + roll : '');
          repaint({ focus: 'forge-picker', resetScroll: true });
        }
      }
    },
    build(kind, dimensions) {
      return kind === 'shop' ? shopPanel(dimensions) : forgePanel(dimensions);
    }
  };
}
