import { CHAPTER, ITEMS, MAPS, QUEST, SIDE_QUESTS } from './sim/data.mjs';

export const gearArtFiles = [
  'bronze-sword','iron-sword','linen-armor','scale-armor','jade-seal','potion','gold','ring',
  'bronze-shield','jade-shield','cloth-boots','iron-boots','bronze-ring','ember-ring','wind-banner','red-reed'
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
  if (gearFiles.has(item?.artId)) return item.artId;
  return gearBySlot[item?.slot] ?? (itemId?.includes('herb') ? 'red-reed' : 'gold');
}

export const gearUrl = itemId => new URL('../assets/gear/' + gearArt(itemId) + '.webp', import.meta.url).href;
const portraits = new Set(['hero','elder','smith','apothecary','merchant','scout']);
const portraitUrl = id => new URL('../assets/portraits/' + (portraits.has(id) ? id : 'scout') + '.webp', import.meta.url).href;
const $ = id => document.getElementById(id);

const replies = {
  elder: '晚辈玄甲，愿听先生细说。',
  smith: '我想看看兵器和护具。',
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

export function createRpgPanels({ command, current, track, tracked }) {
  let speech = null, line = 0, shopTab = 'buy', tradeNotice = '';

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
    const dialogue = current().dialogue;
    if (!dialogue) return;
    if (speech !== dialogue) { speech = dialogue; line = 0; }
    const lines = script(dialogue);
    const turn = lines[line];
    const isHero = ['hero','玄甲'].includes(turn.speaker);
    const npc = dialogue.name ?? '西岐人';
    const opponent = $('dialogue-npc-art');
    opponent.src = portraitUrl(dialogue.portraitId ?? dialogue.npcId);
    opponent.alt = npc;
    opponent.classList.toggle('face-inward',dialogue.npcId === 'elder');
    $('dialogue-panel').dataset.speaker = isHero ? 'hero' : 'npc';
    $('dialogue-name').textContent = isHero ? '玄甲' : npc;
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
    $('shop-status').textContent = tradeNotice || state.notice || '';
    const offers = shopTab === 'buy' ? shop.offers : state.inventory.map(item => ({
      id:item.uid, itemId:item.itemId, price:ITEMS[item.itemId]?.sellPrice ?? 0,
      equipped:Object.values(state.equipment).includes(item.uid)
    }));
    const rows = offers.filter(offer => ITEMS[offer.itemId]).map(offer => {
      const item = ITEMS[offer.itemId];
      const row = document.createElement('li');
      const image = document.createElement('img');
      image.className = 'gear-mark';
      image.src = gearUrl(item.id);
      image.alt = '';
      const summary = document.createElement('div');
      summary.append(textBlock('b',item.name + (offer.quantity > 1 ? ' ×' + offer.quantity : '')),textBlock('small',item.description ?? ''));
      const disabled = shopTab === 'buy' ? state.hero.gold < offer.price || offer.stock === 0 : offer.equipped || item.sellable === false || !offer.price;
      const label = shopTab === 'buy' ? '买入 · ' + offer.price : offer.equipped ? '已装备' : '出售 · ' + offer.price;
      const button = control(label, () => command(shopTab === 'buy' ?
        {type:'buy',offerId:offer.id} : {type:'sell',uid:offer.id}), disabled);
      button.dataset.offer = offer.id;
      row.dataset.tier = item.tier;
      row.append(image,summary,button);
      return row;
    });
    $('shop-list').replaceChildren(...(rows.length ? rows : [textBlock('li','行囊里暂时没有可交易的物品。')]));
  }

  function renderJournal() {
    const state = current();
    const entries = [
      ['main','古道除祟', QUEST.descriptions[state.quest.stage]],
      ['main',CHAPTER.name, CHAPTER.descriptions[state.chapter?.stage ?? 'locked']],
      ['herbs',SIDE_QUESTS.herbs.name, sideText(state.sideQuests?.herbs, SIDE_QUESTS.herbs, '回药铺交付，选药品或戒指。')],
      ['parts',SIDE_QUESTS.parts.name, sideText(state.sideQuests?.parts, SIDE_QUESTS.parts, '回铁匠铺交付，选护盾或战靴。')]
    ];
    $('journal-entries').replaceChildren(...entries.map(([id,title,body],i) => {
      const entry = document.createElement('article');
      entry.append(textBlock('h3',title),textBlock('p',body));
      const available = id === 'main' ? i === Number(state.quest.stage === 'complete') : state.sideQuests?.[id]?.stage !== 'complete';
      if (available) entry.append(control(tracked() === id ? '追踪中' : '追踪', () => track(id), tracked() === id));
      return entry;
    }));
  }

  function sideText(quest, info, ready) {
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

  return {
    renderDialogue, nextLine, renderShop, renderJournal,
    resetShop() { shopTab = 'buy'; tradeNotice = ''; },
    tradeFeedback(text) { tradeNotice = text; }
  };
}

export function destinations(state) {
  const map = MAPS[state.mapId];
  return [...map.npcs,...(map.portals ?? [map.portal]),...(state.gatherables ?? []).filter(node => !node.collected)].filter(Boolean);
}
