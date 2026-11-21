// 曲目：京剧锣鼓经的常用点子，和用它们拼成的三首曲子。锣鼓经用字记鼓板和锣钹：仓（大锣与铙钹齐响）、才（铙钹）、
// 台（小锣）、令（小锣轻击）、八 / 大（单皮鼓）、嘟（单皮鼓滚奏）、乙（空一下）。这里的谱按常见写法简化改编，
// 不是逐字的传统谱。只有数字和字，不碰页面也不碰引擎。
// The songs: common patterns of the Peking opera percussion score (luogu jing), and three songs made from them. The
// score writes the drum and the gongs as syllables: cang (big gong with cymbals), cai (cymbals), tai (small gong), ling
// (a light small gong), ba / da (the single-skin drum), du (a drum roll) and yi (a rest). The patterns here are
// simplified from their usual written forms, not copied stroke for stroke. Numbers and words only.

/**
 * What each syllable is to the player: `drum` notes are struck in the middle of the drum, `gong` notes on the gongs.
 * Cang is a big note, best struck with both hands; du is a roll, struck as often as one can while it lasts.
 */
export const SYLLABLES = {
  仓: { kind: 'gong', big: true },
  才: { kind: 'gong' },
  台: { kind: 'gong' },
  令: { kind: 'gong' },
  八: { kind: 'drum' },
  大: { kind: 'drum' },
  嘟: { kind: 'drum', roll: true },
  乙: null
};

/** A rest, the drum stroke that fills a rest on hard, and the light small gong that easy leaves out. */
export const REST = '乙',
  FILL = '大',
  LIGHT = '令';

/** How each syllable is read aloud, for the notes when the game is in English. */
export const ROMAN = { 仓: 'cang', 才: 'cai', 台: 'tai', 令: 'ling', 八: 'ba', 大: 'da', 嘟: 'du', 乙: 'yi' };

/**
 * The patterns, each as `syllable:beats` strokes, a bar of four beats at a time. `guomen` is the bridge where the
 * fiddle plays a tune over the drum keeping the beat; `guomenHard` is its busier form.
 */
export const CELLS = {
  sijitou: { zh: '四击头', en: 'Four strikes', text: '八:0.5 大:0.5 仓:1 才:1 仓:1 才:1 乙:0.5 才:0.5 仓:2' },
  jijifeng: { zh: '急急风', en: 'Swift wind', text: '八:0.5 大:0.5 仓:0.5 仓:0.5 仓:0.5 仓:0.5 仓:0.5 仓:0.5' },
  jijifengEnd: { zh: '急急风收头', en: 'Swift wind, the close', text: '仓:0.5 仓:0.5 仓:0.5 仓:0.5 仓:1 才:1 仓:2 乙:2' },
  chongtou: { zh: '冲头', en: 'Rushing head', text: '八:0.5 大:0.5 仓:0.5 才:0.5 仓:0.5 才:0.5 仓:0.5 才:0.5' },
  changchui: { zh: '长锤', en: 'Long hammer', text: '大:0.5 大:0.5 仓:1 仓:1 才:0.5 乙:0.5 仓:1 才:1 仓:2' },
  duotou: { zh: '夺头', en: 'Seizing head', text: '大:0.5 大:0.5 仓:1 才:1 仓:1' },
  saotou: { zh: '扫头', en: 'Sweeping head', text: '八:0.5 大:0.5 台:1 仓:1 才:0.5 台:0.5 仓:2 乙:2' },
  choutou: { zh: '小锣抽头', en: 'Small gong pull', text: '台:1 台:0.5 令:0.5 台:1 台:1 令:0.5 台:0.5 台:1 台:2' },
  sibian: { zh: '撕边', en: 'Torn edge', text: '嘟:3 八:0.5 大:0.5 台:1 乙:1 台:1 乙:1' },
  gudian: { zh: '鼓点子', en: 'Drum figure', text: '八:0.5 大:0.25 大:0.25 八:0.5 大:0.5 仓:2' },
  guomen: { zh: '过门', en: 'Bridge', text: '大:1 乙:1 八:1 乙:1' },
  guomenHard: { zh: '过门', en: 'Bridge', text: '大:0.5 八:0.5 大:1 八:0.5 大:0.5 台:1' }
};

/**
 * The three songs. `sections` are [cell, times]; a `guomen` section has the fiddle's tune over it. `hard` names
 * cells that replace others on the hard chart.
 */
export const SONGS = [
  {
    id: 'qiba',
    zh: '起霸',
    en: 'The General Arms',
    noteZh: '武将披挂上场，一招一式亮相。',
    noteEn: 'A general arms himself on stage, pose by pose.',
    bpm: 92,
    seed: 11,
    sections: [
      ['sibian', 1],
      ['sijitou', 1],
      ['changchui', 2],
      ['guomen', 4],
      ['duotou', 2],
      ['saotou', 1],
      ['guomen', 4],
      ['changchui', 2],
      ['choutou', 1],
      ['guomen', 4],
      ['duotou', 2],
      ['sijitou', 1]
    ]
  },
  {
    id: 'tangma',
    zh: '趟马',
    en: 'Riding Through',
    noteZh: '扬鞭催马，一路疾行。',
    noteEn: 'A rider whips his horse along the road.',
    bpm: 120,
    seed: 23,
    sections: [
      ['chongtou', 2],
      ['sijitou', 1],
      ['guomen', 4],
      ['choutou', 2],
      ['sibian', 1],
      ['chongtou', 4],
      ['guomen', 4],
      ['gudian', 2],
      ['changchui', 2],
      ['guomen', 4],
      ['chongtou', 4],
      ['sijitou', 1]
    ]
  },
  {
    id: 'jijifeng',
    zh: '急急风',
    en: 'Swift Wind',
    noteZh: '开打之前，锣鼓一阵紧似一阵。',
    noteEn: 'Before the fight, the gongs and drum drive faster and faster.',
    bpm: 152,
    seed: 37,
    sections: [
      ['sibian', 1],
      ['jijifeng', 4],
      ['jijifengEnd', 1],
      ['guomen', 4],
      ['chongtou', 4],
      ['gudian', 2],
      ['guomen', 4],
      ['jijifeng', 6],
      ['jijifengEnd', 1],
      ['choutou', 2],
      ['chongtou', 4],
      ['sijitou', 1]
    ]
  }
];

export const DIFFICULTIES = ['easy', 'normal', 'hard'];

/** A cell's strokes: `[{ syllable, beats }]`. */
export function strokesOf(cell) {
  return CELLS[cell].text.split(' ').map((token) => {
    const [syllable, beats] = token.split(':');
    return { syllable, beats: Number(beats) };
  });
}

/** Beats in a cell. */
export const beatsOf = (cell) => strokesOf(cell).reduce((sum, stroke) => sum + stroke.beats, 0);
