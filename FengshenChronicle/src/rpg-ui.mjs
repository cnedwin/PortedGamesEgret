import { CAMPAIGN_CHAPTERS, CHAPTER, ITEMS, MAPS, QUEST, SIDE_QUESTS } from './sim/data.mjs';
import { AFFIX_LABELS, PROFESSIONS, equipmentStats } from './sim/arsenal.mjs';
import { sideQuestUnlocked } from './sim/progression.mjs';

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
  let speech = null, line = 0;

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
  return { renderDialogue, nextLine, renderJournal };
}

export function destinations(state) {
  const map = MAPS[state.mapId];
  return [...map.npcs,...(map.portals ?? [map.portal]),...(state.gatherables ?? []).filter(node => !node.collected)].filter(Boolean);
}
