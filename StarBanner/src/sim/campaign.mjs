// 三幕战役沿用遭遇战的地图和胜负判定，每幕有自己的出场阵容和规则选项。
// The three chapters use the skirmish maps and victory rules, with their own lineups and options.
export const CAMPAIGN = [
  {
    id: 'ford',
    map: 'wheat',
    you: 'seline',
    foe: 'garron',
    level: 'easy',
    fog: false,
    seed: 3101,
    title: { zh: '一 · 渡口的求援信', en: 'I · The Letter at the Ford' },
    brief: {
      zh: '夜鸦夺下渡口的清晨，磨坊主托一名孩子把求援信送出村。赛琳抵达南岸时，格伦的卫队已经在桥头扎营。',
      en: 'At dawn the Nightravens took the crossing. A miller sent a child out with a letter asking for help. By the time Seline reaches the south bank, Garron’s guard is camped at the bridge.'
    },
    objective: {
      zh: '收复渡口。先占近岸村庄筹措军费，再击败格伦或摧毁夜鸦要塞。',
      en: 'Retake the crossing. Secure nearby villages to fund reinforcements, then defeat Garron or destroy the Nightraven stronghold.'
    },
    after: {
      zh: '过桥的商队送来一截烧焦的旗绳。逃往双子海湾的人还没上船，港口的灯却已经熄了。',
      en: 'A caravan crossing the bridge brings a scorched length of flag rope. The evacuees at Twin Coves have yet to board, and the harbour lights are already out.'
    }
  },
  {
    id: 'coves',
    map: 'coves',
    you: 'seline',
    foe: 'vireta',
    level: 'normal',
    fog: true,
    seed: 3102,
    title: { zh: '二 · 双湾熄灯', en: 'II · Lights Out at Twin Coves' },
    brief: {
      zh: '维蕾塔封锁海湾，把最后一艘渡船困在礁石之间。潮雾吞没了另一侧的码头。赛琳跟着灯塔最后一次闪光找到了登岸点。',
      en: 'Vireta blockades the cove and traps the last ferry among the reefs. Sea mist swallows the opposite quay. Seline finds a place to land by the lighthouse’s final flash.'
    },
    objective: {
      zh: '打破封锁。用舰船或飞兵侦察雾中的航道，击败维蕾塔或摧毁夜鸦要塞。',
      en: 'Break the blockade. Scout the fogbound channels with ships or fliers, then defeat Vireta or destroy the Nightraven stronghold.'
    },
    after: {
      zh: '渡船开出港口，磨坊主在船头认出了送信的孩子。灯塔的守望人说，格伦带着残部退往龙脊，正打算切断最后一条山路。',
      en: 'As the ferry clears the harbour, the miller spots the child who carried the letter. The lighthouse keeper says Garron has withdrawn to Dragonspine to cut off the last mountain road.'
    }
  },
  {
    id: 'pass',
    map: 'spine',
    you: 'seline',
    foe: 'garron',
    level: 'hard',
    fog: true,
    seed: 3103,
    title: { zh: '三 · 龙脊升旗', en: 'III · Raise the Banner at Dragonspine' },
    brief: {
      zh: '龙脊的三条山道都没入雾里，只有巡哨的铜铃还听得见。等山路通了，渡口和海湾的粮车就能再会合。赛琳把磨坊主的信绑在旗枪下。',
      en: 'Fog covers all three roads through Dragonspine. Only the watch bells can be heard. If the pass reopens, the supply carts from the ford and the cove can meet again. Seline ties the miller’s letter beneath her banner.'
    },
    objective: {
      zh: '重开山道。侦察侧路，选定攻势，最后击败格伦或摧毁夜鸦要塞。',
      en: 'Reopen the mountain road. Scout the flanks, choose your approach, and defeat Garron or destroy the Nightraven stronghold.'
    },
    after: {
      zh: '星旗升上山脊时，远处的灯塔也重新点亮。第二天的粮车在山路上碰面，磨坊主那封信终于有了回音。',
      en: 'The star banner rises on the ridge and the lighthouse comes back to life below. The next day, two lines of supply carts meet on the mountain road. The miller’s letter has its answer.'
    }
  }
];

export function campaignChapter(id) {
  return CAMPAIGN.find((chapter) => chapter.id === id) ?? null;
}

export function campaignSetup(id) {
  const chapter = campaignChapter(id);
  if (!chapter) return null;
  return {
    map: chapter.map,
    sides: [
      { commander: chapter.you, ai: false },
      { commander: chapter.foe, ai: true, level: chapter.level }
    ],
    human: 0,
    seed: chapter.seed,
    fog: chapter.fog,
    campaign: chapter.id
  };
}
