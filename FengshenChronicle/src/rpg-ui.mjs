import { CAMPAIGN_CHAPTERS, CHAPTER, ITEMS, MAPS, QUEST, SIDE_QUESTS } from './sim/data.mjs';
import { AFFIX_LABELS, PROFESSIONS, equipmentStats, forgeResult, isForgeIngredient } from './sim/arsenal.mjs';
import { bagSize, sideQuestUnlocked } from './sim/progression.mjs';

export const gearArtFiles = [
  'bronze-sword','iron-sword','linen-armor','scale-armor','jade-seal','potion','gold','ring',
  'bronze-shield','jade-shield','cloth-boots','iron-boots','bronze-ring','ember-ring','wind-banner','red-reed','staff','bow'
];
const gearFiles = new Set(gearArtFiles);
const gearBySlot = {
  weapon:'iron-sword', offhand:'jade-shield', armor:'scale-armor', boots:'iron-boots', ring:'ember-ring', charm:'jade-seal', skill:'ring'
};
export const slotNames = { weapon:'武器', offhand:'副手', armor:'护甲', boots:'战靴', ring:'戒指', skill:'主动法宝' };

export function gearArt(itemId) {
  if (itemId === 'qiankun-ring') return 'ring';
  if (gearFiles.has(itemId)) return itemId;
  const variants = {'vanguard-shield':'jade-shield','march-boots':'cloth-boots','wind-boots':'iron-boots',
    'silver-ring':'bronze-ring','verdant-ring':'ember-ring','storm-ring':'ember-ring','qingxin-herb':'red-reed'};
  if (variants[itemId]) return variants[itemId];
  const item = ITEMS[itemId];
  if (item?.slot === 'offhand' && item.artId === 'ring') return 'jade-seal';
  if (gearFiles.has(item?.artId)) return item.artId;
  return gearBySlot[item?.slot] ?? (itemId?.includes('herb') ? 'red-reed' : 'gold');
}

export const gearUrl = itemId => new URL('../assets/gear/' + gearArt(itemId) + '.webp', import.meta.url).href;
const portraits = new Set(['hero','elder','smith','apothecary','merchant','scout','ritualist','ranger']);
const portraitUrl = id => new URL('../assets/portraits/' + (portraits.has(id) ? id : 'scout') + '.webp', import.meta.url).href;
const $ = id => document.getElementById(id);
export const professionPortrait = id => portraitUrl(id === 'guard' ? 'hero' : id);
const roleLabels = { guard:'持盾近战', ritualist:'远程群攻', ranger:'远程追击' };
export const tierNames = { common:'基础', fine:'精锻', rare:'稀有', epic:'史诗', legendary:'传说' };

export function affixText(instance) {
  if (!instance?.affixes) return '';
  const item = ITEMS[instance.itemId], stats = equipmentStats(item, instance.affixes);
  return Object.entries(AFFIX_LABELS).flatMap(([key,label]) => {
    const bonus = stats[key] - (item?.[key] ?? 0);
    return bonus > 0 ? [label + ' +' + bonus] : [];
  }).join(' · ');
}

function shopStats(item, affixes) {
  return Object.entries(equipmentStats(item, affixes)).filter(([, value]) => value > 0)
    .map(([key, value]) => AFFIX_LABELS[key] + ' +' + value).join(' · ');
}

const replies = {
  elder: '晚辈愿听先生细说。',
  smith: '想请教伯衡，哪里能找着好兵器？',
  apothecary: '近来古道有异。药方可有什么线索？',
  merchant: '这一趟带回了些货物。看看你这里有什么。',
  scout: '把看到的都告诉我，我会走一趟。'
};

function control(label, onClick, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.disabled = disabled;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function textBlock(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

export function createProfessionPicker(onConfirm) {
  const panel = $('profession-panel');
  const choices = $('profession-choices');
  let selected = 'guard';
  function choose(id) {
    selected = id;
    for (const button of choices.children) {
      button.setAttribute('aria-pressed', String(button.dataset.profession === id));
    }
    $('profession-confirm').textContent = '以' + PROFESSIONS[id].name + '启程';
  }
  choices.replaceChildren(...Object.values(PROFESSIONS).map(role => {
    const button = control('', () => choose(role.id));
    const image = document.createElement('img');
    const description = document.createElement('div');
    button.dataset.profession = role.id;
    image.src = professionPortrait(role.id);
    image.alt = '';
    description.append(textBlock('small', roleLabels[role.id]), textBlock('strong', role.name),
      textBlock('span', role.description), textBlock('b', role.active.name + ' · ' + role.rage.name));
    button.append(image, description);
    return button;
  }));
  function close() {
    panel.hidden = true;
    $('title').inert = false;
    $('new-game').focus({preventScroll:true});
  }
  $('profession-confirm').addEventListener('click', () => { close(); onConfirm(selected); });
  $('profession-cancel').addEventListener('click', close);
  return {
    close,
    open() {
      choose('guard');
      $('title').inert = true;
      panel.hidden = false;
      choices.firstElementChild.focus({preventScroll:true});
    }
  };
}

export function campaignObjective(state) {
  if (state.quest.stage !== 'complete') return { data:QUEST, progress:state.quest, mapId:'trail', huntStage:'hunt' };
  if (state.chapter?.stage !== 'complete') return { data:CHAPTER, progress:state.chapter, mapId:'pass', huntStage:'active' };
  for (const mapId of ['ford','siege']) {
    const progress = state.campaign?.[mapId];
    if (progress?.stage !== 'complete' || mapId === 'siege') {
      return { data:CAMPAIGN_CHAPTERS[mapId], progress, mapId, huntStage:'active' };
    }
  }
}

export function createRpgPanels({ command, current, track, tracked }) {
  let speech = null, line = 0, shopTab = 'buy', tradeNotice = '';
  let recipeId = null, forgeNotice = '';
  const materials = new Set();

  function script(dialogue) {
    if (Array.isArray(dialogue.lines) && dialogue.lines.length) return dialogue.lines;
    const state = current();
    const lead = dialogue.npcId === 'elder' ?
      (state.chapter?.stage === 'return' ? '铜关风阵已经破了。这枚雷印就是阵眼留下的。' :
        state.chapter?.stage === 'offer' ? '镇邪印上有铜关的纹样。古道的邪气，难道从那里来？' :
          state.quest?.stage === 'hunt' ? '古道的驿卒一夜没回来。先生知道那里出了什么事吗？' :
            replies.elder) : replies[dialogue.npcId] ?? '请说。';
    return [
      { speaker: 'hero', text: lead },
      { speaker: dialogue.npcId, text: dialogue.text }
    ];
  }

  function renderDialogue() {
    const state = current(), dialogue = state.dialogue;
    if (!dialogue) return;
    if (speech !== dialogue) { speech = dialogue; line = 0; }
    const lines = script(dialogue);
    const turn = lines[line];
    const role = PROFESSIONS[state.profession ?? 'guard'];
    const isHero = ['hero','玄甲',role.name].includes(turn.speaker);
    const npc = dialogue.name ?? '西岐人';
    const opponent = $('dialogue-npc-art');
    const playerArt = $('dialogue-hero-art');
    const playerUrl = professionPortrait(role.id), npcUrl = portraitUrl(dialogue.portraitId ?? dialogue.npcId);
    if (playerArt.src !== playerUrl) playerArt.src = playerUrl;
    if (opponent.src !== npcUrl) opponent.src = npcUrl;
    playerArt.alt = role.name;
    opponent.alt = npc;
    opponent.classList.toggle('face-inward',dialogue.npcId === 'elder');
    $('dialogue-panel').dataset.speaker = isHero ? 'hero' : 'npc';
    $('dialogue-name').textContent = isHero ? role.name : npc;
    $('dialogue-text').textContent = turn.text;
    $('dialogue-next').hidden = line >= lines.length - 1;
    const options = $('dialogue-options');
    options.hidden = !$('dialogue-next').hidden;
    if (!options.hidden) {
      const choices = dialogue.options?.length ? dialogue.options : [{ id:'close', label:'结束交谈', enabled:true, kind:'close' }];
      options.replaceChildren(...choices.map(option => {
        const button = control(option.label, () => command(option.kind === 'close' ?
          { type:'closeDialogue' } : { type:'dialogueAction', id:option.id }), option.enabled === false);
        button.dataset.choice = option.id;
        if (option.enabled !== false && option.kind !== 'close') button.className = 'primary';
        return button;
      }));
    }
  }

  function nextLine() {
    if (!speech || $('dialogue-next').hidden) return;
    line++;
    renderDialogue();
    if ($('dialogue-next').hidden) $('dialogue-options').querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  }

  function renderShop() {
    const state = current(), shop = state.shop;
    if (!shop) return;
    $('shop-title').textContent = shop.name;
    $('shop-coins').textContent = state.hero.gold + ' 文';
    $('shop-buy-tab').setAttribute('aria-pressed',String(shopTab === 'buy'));
    $('shop-sell-tab').setAttribute('aria-pressed',String(shopTab === 'sell'));
    $('shop-status').textContent = tradeNotice || (shopTab === 'buy' ? '基础货品随等级开放' : '已穿戴的装备会保留');
    const offers = shopTab === 'buy' ? shop.offers : state.inventory.map(item => ({
      id:item.uid, itemId:item.itemId, price:ITEMS[item.itemId]?.sellPrice ?? 0,
      equipped:Object.values(state.equipment).includes(item.uid), affixes:item.affixes
    }));
    const bagFull = bagSize(state) >= 30;
    const rows = offers.filter(offer => ITEMS[offer.itemId]).map(offer => {
      const item = ITEMS[offer.itemId];
      const row = document.createElement('li');
      const image = document.createElement('img');
      image.className = 'gear-mark';
      image.src = gearUrl(item.id);
      image.alt = '';
      const summary = document.createElement('div');
      summary.append(textBlock('b',item.name + (offer.quantity > 1 ? ' ×' + offer.quantity : '')),
        textBlock('small', [item.description, shopStats(item, offer.affixes)].filter(Boolean).join(' · ')));
      const locked = shopTab === 'buy' && state.hero.level < offer.unlockLevel;
      const full = shopTab === 'buy' && item.slot && item.slot !== 'skill' && bagFull;
      const supply = item.id === 'potion' ? state.hero.potions : item.id === 'recovery-pill' ? state.hero.tonics : 0;
      const supplyFull = supply + (offer.quantity ?? 0) > 99;
      const disabled = shopTab === 'buy' ? locked || full || supplyFull || state.hero.gold < offer.price || offer.stock === 0 :
        offer.equipped || item.sellable === false || !offer.price;
      const label = shopTab === 'buy' ? (locked ? 'Lv.' + offer.unlockLevel + ' 解锁' : full ? '行囊已满' :
        supplyFull ? '补给已满' : '买入 · ' + offer.price) :
        offer.equipped ? '已装备' : '出售 · ' + offer.price;
      const button = control(label, () => command(shopTab === 'buy' ?
        {type:'buy',offerId:offer.id} : {type:'sell',uid:offer.id}), disabled);
      button.dataset.offer = offer.id;
      if (shopTab === 'buy' && !locked && state.hero.gold < offer.price) button.title = '铜钱不足';
      row.dataset.tier = item.tier;
      if (locked) row.classList.add('locked-offer');
      row.append(image,summary,button);
      return row;
    });
    $('shop-list').replaceChildren(...(rows.length ? rows : [textBlock('li','行囊里暂时没有可交易的物品。')]));
  }

  function renderForge() {
    const state = current(), forge = state.forge;
    if (!forge) return;
    const picker = $('forge-recipe');
    if (!forge.recipes.some(recipe => recipe.id === recipeId)) recipeId = forge.recipes[0].id;
    if (picker.value !== recipeId || !picker.options.length) {
      picker.replaceChildren(...forge.recipes.map(recipe => {
        const option = textBlock('option', recipe.name + ' · Lv.' + recipe.unlockLevel);
        option.value = recipe.id;
        return option;
      }));
      picker.value = recipeId;
    }
    const recipe = forge.recipes.find(item => item.id === recipeId);
    const output = ITEMS[forgeResult(recipe, state.profession)];
    const equipped = new Set(Object.values(state.equipment));
    const candidates = state.inventory.filter(instance =>
      !equipped.has(instance.uid) && isForgeIngredient(ITEMS[instance.itemId], recipe, state.profession));
    const candidateIds = new Set(candidates.map(instance => instance.uid));
    for (const id of materials) if (!candidateIds.has(id)) materials.delete(id);
    const locked = state.hero.level < recipe.unlockLevel;
    const paid = state.hero.gold >= recipe.gold && (state.resources?.parts ?? 0) >= recipe.parts;
    $('forge-wallet').textContent = state.hero.gold + ' 文 · 甲片 ' + (state.resources?.parts ?? 0);
    $('forge-feedback').textContent = forgeNotice;
    const requirements = $('forge-requirements');
    const submit = $('forge-submit');
    function updateSelection() {
      requirements.textContent = '可炼成' + output.name + '，附随机词条。需要 ' + recipe.gold + ' 文、' +
        recipe.parts + ' 甲片及 ' + recipe.count + ' 件 Lv.' + recipe.minInputLevel + ' 起的同部位基础装备' +
        '（已选 ' + materials.size + '/' + recipe.count + '）' + (locked ? '。Lv.' + recipe.unlockLevel + ' 开炉。' : '。');
      submit.disabled = locked || !paid || materials.size !== recipe.count;
      for (const input of $('forge-materials').querySelectorAll('input')) {
        input.disabled = locked || (!input.checked && materials.size >= recipe.count);
      }
    }
    const rows = candidates.map(instance => {
      const item = ITEMS[instance.itemId], row = document.createElement('li');
      const image = document.createElement('img'), label = document.createElement('label'), checkbox = document.createElement('input');
      image.className = 'gear-mark';
      image.src = gearUrl(item.id);
      image.alt = '';
      checkbox.type = 'checkbox';
      checkbox.value = instance.uid;
      checkbox.checked = materials.has(instance.uid);
      checkbox.setAttribute('aria-label', '使用' + item.name + '作为材料');
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) materials.add(instance.uid);
        else materials.delete(instance.uid);
        updateSelection();
      });
      label.append(image,textBlock('b',item.name),checkbox);
      row.append(label);
      return row;
    });
    if (!rows.length) rows.push(textBlock('li','行囊里没有可用材料。身上已穿戴的装备会保留。'));
    $('forge-materials').replaceChildren(...rows);
    updateSelection();
  }

  function renderJournal() {
    const state = current();
    const entries = [
      ['main','古道除祟', QUEST.descriptions[state.quest.stage]],
      ['main',CHAPTER.name, CHAPTER.descriptions[state.chapter?.stage ?? 'locked']],
      ...['ford','siege'].map(id => {
        const data = CAMPAIGN_CHAPTERS[id];
        return ['main', data.name, data.descriptions[state.campaign?.[id]?.stage ?? 'locked']];
      }),
      ...Object.entries(SIDE_QUESTS).map(([id,info]) => [
        id, info.name, sideText(state.sideQuests?.[id], info, ({
          herbs:'回药铺交付，选药品或戒指。', parts:'回铁匠铺交付，选护盾或战靴。',
          ferry:'回西岐向阿槐回报。', beacons:'回西岐向斥候回报。'
        })[id], sideQuestUnlocked(state,id))
      ])
    ];
    const mainIndex = ['trail','pass','ford','siege'].indexOf(campaignObjective(state).mapId);
    $('journal-entries').replaceChildren(...entries.map(([id,title,body],i) => {
      const entry = document.createElement('article');
      entry.append(textBlock('h3',title),textBlock('p',body));
      const available = id === 'main' ? i === mainIndex : sideQuestUnlocked(state,id) && state.sideQuests?.[id]?.stage !== 'complete';
      if (available) entry.append(control(tracked() === id ? '追踪中' : '追踪', () => track(id), tracked() === id));
      return entry;
    }));
  }

  function sideText(quest, info, ready, unlocked) {
    if (!unlocked) return '待主线解锁 · ' + info.description;
    if (!quest || quest.stage === 'available') return '未接 · ' + info.description;
    if (quest.stage === 'complete') {
      const rewards = {'herbs-medicine':'回春散','herbs-ring':'养心环','parts-shield':'铸纹铜盾','parts-boots':'轻行履'};
      return '已交付' + (rewards[quest.choice] ? ' · ' + rewards[quest.choice] : '');
    }
    if (quest.stage === 'ready') return ready;
    return info.description + ' 已收集 ' + (quest.amount ?? current().resources?.[info.resource] ?? 0) + ' / ' + info.required + '。';
  }

  $('dialogue-next').addEventListener('click', nextLine);
  $('dialogue-close').addEventListener('click', () => command({type:'closeDialogue'}));
  $('shop-close').addEventListener('click', () => command({type:'closeShop'}));
  $('shop-buy-tab').addEventListener('click', () => { shopTab = 'buy'; renderShop(); });
  $('shop-sell-tab').addEventListener('click', () => { shopTab = 'sell'; renderShop(); });
  $('forge-close').addEventListener('click', () => command({type:'closeForge'}));
  $('forge-recipe').addEventListener('change', event => {
    recipeId = event.target.value;
    materials.clear();
    renderForge();
  });
  $('forge-submit').addEventListener('click', () => command({type:'forge',recipeId,uids:[...materials]}));

  return {
    renderDialogue, nextLine, renderShop, renderJournal, renderForge,
    resetShop() { shopTab = 'buy'; tradeNotice = ''; },
    tradeFeedback(text) { tradeNotice = text; },
    resetForge() { recipeId = null; forgeNotice = ''; materials.clear(); },
    forgeFeedback(text) { forgeNotice = text; }
  };
}

export function destinations(state) {
  const map = MAPS[state.mapId];
  return [...map.npcs,...(map.portals ?? [map.portal]),...(state.gatherables ?? []).filter(node => !node.collected)].filter(Boolean);
}
