// What is kept from one term to the next: achievements, and the perks they
// unlock for later terms. Text is [中文, English]. The rules that use these
// are in src/sim.mjs (recordTerm, unlockedPerks, newGame).
import { HEROINE_IDS } from './cast.mjs';
import { CLOTHES } from './items.mjs';
import { QUESTS } from './quests.mjs';

const stat = (s, name) => (name === 'charm' ? s.stats.charm + wornCharm(s) : s.stats[name]);
const wornCharm = s => {
  let total = 0;
  for (const slot of ['top', 'bottom', 'dress', 'outer', 'shoes', 'legs']) total += CLOTHES[s.hero.wear[slot]?.id]?.charm ?? 0;
  for (const a of s.hero.wear.acc ?? []) total += CLOTHES[a.id]?.charm ?? 0;
  return total;
};

/**
 * Achievements are checked when a term ends. `test(s, { girl, result, memories })`
 * sees the finished save, whom the hero confessed to, how it went, and the
 * memories so far (including this term's ending and events).
 */
export const ACHIEVEMENTS = [
  {
    id: 'firstterm',
    name: ['修完一学期', 'One Term Done'],
    desc: ['走到星空祭之夜。', 'Reach the night of the Star Festival.'],
    test: () => true,
  },
  {
    id: 'love',
    name: ['心意相通', 'Two Hearts'],
    desc: ['迎来任意一位学姐的恋爱结局。', "Reach any senior's love ending."],
    test: (s, { result }) => result === 'love',
  },
  {
    id: 'solo',
    name: ['独自的星空', "A Sky of One's Own"],
    desc: ['星空祭之夜，谁也不说。', 'Tell no one on the night of the Star Festival.'],
    test: (s, { result }) => result === 'solo',
  },
  {
    id: 'allmet',
    name: ['全员相识', 'Met Them All'],
    desc: ['一个学期内认识七位学姐。', 'Meet all seven seniors in one term.'],
    test: s => HEROINE_IDS.every(id => s.girls[id].met),
  },
  {
    id: 'storyteller',
    name: ['故事收藏家', 'Story Collector'],
    desc: ['一个学期内读完三位学姐的全部故事。', "Read three seniors' whole stories in one term."],
    test: s => HEROINE_IDS.filter(id => s.girls[id].chapter >= 4).length >= 3,
  },
  {
    id: 'torn',
    name: ['左右为难', 'Torn'],
    desc: ['学期结束时，两位学姐的好感都达到 75。', 'End a term with two seniors at 75 affection or more.'],
    test: s => HEROINE_IDS.filter(id => s.girls[id].aff >= 75).length >= 2,
  },
  {
    id: 'intellect80',
    name: ['学霸', 'Top of the Class'],
    desc: ['学识达到 80。', 'Reach 80 Intellect.'],
    test: s => stat(s, 'intellect') >= 80,
  },
  {
    id: 'fitness80',
    name: ['运动健将', 'Athlete'],
    desc: ['体能达到 80。', 'Reach 80 Fitness.'],
    test: s => stat(s, 'fitness') >= 80,
  },
  {
    id: 'art80',
    name: ['艺术家', 'Artist'],
    desc: ['才艺达到 80。', 'Reach 80 Art.'],
    test: s => stat(s, 'art') >= 80,
  },
  {
    id: 'charm90',
    name: ['万人迷', 'Heartthrob'],
    desc: ['魅力（含穿搭）达到 90。', 'Reach 90 Charm, outfit included.'],
    test: s => stat(s, 'charm') >= 90,
  },
  {
    id: 'eq80',
    name: ['知心人', 'Kindred Spirit'],
    desc: ['情商达到 80。', 'Reach 80 Empathy.'],
    test: s => stat(s, 'eq') >= 80,
  },
  {
    id: 'rich',
    name: ['小富翁', 'Well Off'],
    desc: ['学期结束时存下 ¥2000。', 'End a term with ¥2000 saved.'],
    test: s => s.money >= 2000,
  },
  {
    id: 'wardrobe20',
    name: ['衣橱满满', 'Full Wardrobe'],
    desc: ['拥有 20 件服饰。', 'Own twenty pieces of clothing.'],
    test: s => Object.keys(s.hero.owned).length >= 20,
  },
  {
    id: 'wishes10',
    name: ['有求必应', 'Wish Granter'],
    desc: ['一个学期内实现 10 个心愿。', 'Grant ten wishes in one term.'],
    test: s => (s.counters.wish ?? 0) >= 10,
  },
  {
    id: 'focus15',
    name: ['心无旁骛', 'In the Zone'],
    desc: ['一个学期内 15 次专注挑战达到完美。', 'Score Perfect in fifteen focus challenges in one term.'],
    test: s => (s.counters.perfect ?? 0) >= 15,
  },
  {
    id: 'allquests',
    name: ['公告栏常客', 'Notice Board Regular'],
    desc: ['一个学期内完成全部任务。', 'Finish every task in one term.'],
    test: s => QUESTS.every(q => s.quests[q.id]),
  },
  {
    id: 'events12',
    name: ['校园见闻录', 'Campus Chronicle'],
    desc: ['累计经历 12 种校园事件。', 'Come across twelve different campus events.'],
    test: (s, { memories }) => Object.keys(memories.events).length >= 12,
  },
  {
    id: 'rainbow',
    name: ['七色心动', 'All Seven Colours'],
    desc: ['迎来七位学姐各自的恋爱结局。', "Reach every senior's love ending."],
    test: (s, { memories }) => HEROINE_IDS.every(id => memories.endings[`${id}:love`]),
  },
];

/** The cheapest pieces the hero could wear, for the wardrobe perk. */
const starterClothes = () =>
  Object.keys(CLOTHES)
    .filter(id => CLOTHES[id].price > 0 && CLOTHES[id].only !== 'f')
    .sort((a, b) => CLOTHES[a].price - CLOTHES[b].price)
    .slice(0, 4);

/**
 * Perks: one may be chosen when a new term begins. `needs` names the
 * achievement that unlocks it. `apply(s)` changes the fresh save; perks with
 * an ongoing effect are also checked by id in src/sim.mjs and the screens.
 */
export const PERKS = [
  {
    id: 'notes',
    needs: 'firstterm',
    name: ['学长的笔记', "A Senior's Notes"],
    desc: ['五项属性各 +4。', 'Every stat +4.'],
    apply: s => {
      for (const k of Object.keys(s.stats)) s.stats[k] += 4;
    },
  },
  {
    id: 'mindreader',
    needs: 'love',
    name: ['读心术', 'Mind Reader'],
    desc: ['第一次聊天就能看到她喜欢的距离。', 'See the distance she likes from your first talk.'],
    apply: () => {},
  },
  {
    id: 'earlybird',
    needs: 'focus15',
    name: ['早起的鸟', 'Early Bird'],
    desc: ['每天早上体力额外 +10。', 'Ten more energy every morning.'],
    apply: () => {},
  },
  {
    id: 'savings',
    needs: 'rich',
    name: ['打工积蓄', 'Savings'],
    desc: ['开学时多带 ¥600。', 'Start the term with ¥600 more.'],
    apply: s => {
      s.money += 600;
    },
  },
  {
    id: 'fashion',
    needs: 'wardrobe20',
    name: ['旧衣新穿', 'Hand-me-downs'],
    desc: ['开学时多四件服饰。', 'Start the term with four more pieces of clothing.'],
    apply: s => {
      for (const id of starterClothes()) s.hero.owned[id] = true;
    },
  },
  {
    id: 'scholar',
    needs: 'intellect80',
    name: ['书香少年', 'Bookworm'],
    desc: ['学识 +12。', 'Intellect +12.'],
    apply: s => {
      s.stats.intellect += 12;
    },
  },
  {
    id: 'runner',
    needs: 'fitness80',
    name: ['晨跑习惯', 'Morning Runner'],
    desc: ['体能 +12。', 'Fitness +12.'],
    apply: s => {
      s.stats.fitness += 12;
    },
  },
  {
    id: 'painter',
    needs: 'art80',
    name: ['画室常客', 'Studio Regular'],
    desc: ['才艺 +12。', 'Art +12.'],
    apply: s => {
      s.stats.art += 12;
    },
  },
  {
    id: 'stage',
    needs: 'charm90',
    name: ['舞台经验', 'Stage Presence'],
    desc: ['魅力 +12。', 'Charm +12.'],
    apply: s => {
      s.stats.charm += 12;
    },
  },
  {
    id: 'listener',
    needs: 'eq80',
    name: ['善解人意', 'Good Listener'],
    desc: ['情商 +12。', 'Empathy +12.'],
    apply: s => {
      s.stats.eq += 12;
    },
  },
];
