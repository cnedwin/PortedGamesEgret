// 武将名册：把五卷合成一张表。每位武将有生卒年、籍贯、五项能力（统率、武力、智力、政治、魅力）、特性、阵营，以及
// 中平元年时的去处；成年（十五岁）前不出场，过了卒年会病故（可在设置里改为虚构寿命）。
// The roll of generals: the five parts joined into one table. Each has years of birth and death, a home city, five
// abilities (command, war, intellect, politics, charm), traits, a camp, and where he stands in the first year of
// Zhongping; none appears before fifteen, and each dies in the year of his death (or by a made-up span, in the settings).
import one from './generals-1.mjs';
import two from './generals-2.mjs';
import three from './generals-3.mjs';
import four from './generals-4.mjs';
import five from './generals-5.mjs';

const FEMALE = new Set(['nvjiang', 'cainv', 'qingguo', 'jinguo']);

export const GENERALS = {};
for (const text of [one, two, three, four, five])
  for (const line of text.trim().split('\n')) {
    const [id, zh, en, born, died, home, lead, war, int, pol, cha, traits, camp, start] = line.trim().split(/\s+/);
    if (GENERALS[id]) throw new Error(`generals: ${id} twice`);
    const list = traits.split(',');
    GENERALS[id] = {
      id,
      zh,
      en: en.replace(/_/g, ' '),
      born: +born,
      died: +died,
      home,
      stats: { lead: +lead, war: +war, int: +int, pol: +pol, cha: +cha },
      traits: list,
      camp,
      female: list.some((t) => FEMALE.has(t)),
      // Where he stands in 184: a faction, unattached, a house he joins when of age, or a kinsman he follows.
      start: start === '-' ? null : start.startsWith('>') ? { house: start.slice(1) } : start.startsWith('^') ? { kin: start.slice(1) } : { faction: start }
    };
    // Too young to serve in 184: he joins that power when he comes of age.
    if (GENERALS[id].start?.faction && +born + 15 > 184) GENERALS[id].start = { house: GENERALS[id].start.faction };
  }
