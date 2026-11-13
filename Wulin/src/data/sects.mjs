// The twelve sects. Each has the same overall strength budget; they differ in
// where it is spent. `temper` steers a sect the game plays: how eager it is
// to expand, to build, and to deal with others (1 to 5 each).

/** Standing: 1 righteous, 0 neutral, -1 unorthodox. */
const ROWS = [
  // id, name, seat, leader, leader age, female, standing, main, second, role, expand build deal, colour
  ['shaolin', '少林寺', 'songshan', '慧灯禅师', 71, false, 1, 'fist', 'staff', '防御与续战，人数多', 2, 4, 4, '#c9a227'],
  ['wudang', '武当派', 'wudang', '松鹤真人', 66, false, 1, 'sword', 'palm', '借力反制，后发先至', 2, 4, 5, '#3f6f8f'],
  ['emei', '峨嵋派', 'emei', '沈清霜', 34, true, 1, 'sword', 'point', '快攻，高命中', 2, 3, 4, '#8fb9a8'],
  ['huashan', '华山派', 'huashan', '陆孤舟', 41, false, 0, 'sword', 'light', '单体爆发，精英少而强', 3, 2, 2, '#5b6c8a'],
  ['gaibang', '丐帮', 'yingtian', '贺九斤', 52, false, 1, 'palm', 'staff', '人海与情报，招人快', 3, 3, 4, '#7a5c3a'],
  ['mingjiao', '明教', 'quanzhou', '厉千秋', 47, false, -1, 'palm', 'saber', '消耗战，削对手内力', 5, 3, 1, '#a8322e'],
  ['kunlun', '昆仑派', 'kunlun', '拓跋烈', 45, false, 0, 'spear', 'leg', '冲阵，破前排', 4, 2, 2, '#9fb7c9'],
  ['caobang', '漕帮', 'yangzhou', '江晚舟', 29, true, 0, 'staff', 'light', '机动与经济，水路称雄', 3, 5, 3, '#2f7f7b'],
  ['yaowang', '药王谷', 'changbai', '白术翁', 68, false, 1, 'saber', 'craft', '恢复与丹药，伤亡低', 1, 5, 5, '#6f9a4a'],
  ['chongsheng', '崇圣寺', 'dali', '昙照上人', 59, false, 1, 'point', 'fist', '控制，封穴打断', 1, 4, 3, '#d08a3c'],
  ['quanzhen', '全真教', 'zhongnan', '归云子', 55, false, 1, 'sword', 'inner', '阵法增益，团队作战', 2, 4, 4, '#4a4a6a'],
  ['tangmen', '唐门', 'yuzhou', '唐挽月', 26, true, -1, 'dart', 'craft', '远程爆发与毒', 4, 3, 1, '#5a2d6e'],
];

export const SECTS = ROWS.map(
  ([id, name, seat, leader, leaderAge, leaderFemale, standing, main, second, role, expand, build, deal, color]) => ({
    id,
    name,
    seat,
    leader: { name: leader, age: leaderAge, female: leaderFemale },
    standing,
    /** The classes its disciples favour; its own arts are in arts.mjs. */
    main,
    second,
    role,
    temper: { expand, build, deal },
    /** Theme colour for robes, banners and the map. */
    color,
  }),
);

export const SECT_BY_ID = Object.fromEntries(SECTS.map((sect) => [sect.id, sect]));

/** A disciple's standing inside a sect. */
export const RANKS = [
  { name: '杂役', pay: 3, slots: 0 },
  { name: '外门', pay: 6, slots: 4 },
  { name: '内门', pay: 12, slots: 6 },
  { name: '亲传', pay: 20, slots: 8 },
  { name: '长老', pay: 40, slots: 8 },
  { name: '掌门', pay: 0, slots: 8 },
];

/** Offices a stronghold or a sect can fill, and what each one speeds up. */
export const OFFICES = {
  warden: { name: '舵主', scope: 'place', boosts: ['train', 'gather', 'craft', 'morale'], amount: 0.1 },
  leftHall: { name: '左堂主', scope: 'place', boosts: ['train'], amount: 0.15 },
  rightHall: { name: '右堂主', scope: 'place', boosts: ['gather'], amount: 0.15 },
  teaching: { name: '传功长老', scope: 'sect', boosts: ['train'], amount: 0.1 },
  discipline: { name: '执法长老', scope: 'sect', boosts: ['morale'], amount: 0.1 },
  envoy: { name: '外务长老', scope: 'sect', boosts: ['deal'], amount: 0.1 },
  alchemy: { name: '丹房长老', scope: 'sect', boosts: ['pill'], amount: 0.2 },
  forge: { name: '器房长老', scope: 'sect', boosts: ['forge'], amount: 0.2 },
};
