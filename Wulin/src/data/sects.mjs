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

/**
 * The two elders each sect starts with: name, whether a woman, age, and the
 * portrait that goes with them (see art-handoff/manifest.json).
 */
export const ELDERS = {
  shaolin: [{ name: '悟砚', female: false, age: 63, portraitId: 'elder-shaolin-teaching' }, { name: '戒铎', female: false, age: 48, portraitId: 'elder-shaolin-discipline' }],
  wudang: [{ name: '栖微子', female: true, age: 57, portraitId: 'elder-wudang-teaching' }, { name: '崔寒砥', female: false, age: 43, portraitId: 'elder-wudang-discipline' }],
  emei: [{ name: '叶静筠', female: true, age: 61, portraitId: 'elder-emei-teaching' }, { name: '温裁雪', female: true, age: 38, portraitId: 'elder-emei-discipline' }],
  huashan: [{ name: '许砚危', female: false, age: 54, portraitId: 'elder-huashan-teaching' }, { name: '岑迭峰', female: true, age: 40, portraitId: 'elder-huashan-discipline' }],
  gaibang: [{ name: '朱百结', female: true, age: 55, portraitId: 'elder-gaibang-teaching' }, { name: '罗七碗', female: false, age: 47, portraitId: 'elder-gaibang-discipline' }],
  mingjiao: [{ name: '炎绡', female: true, age: 50, portraitId: 'elder-mingjiao-teaching' }, { name: '段晦沙', female: false, age: 42, portraitId: 'elder-mingjiao-discipline' }],
  kunlun: [{ name: '乌兰策', female: true, age: 52, portraitId: 'elder-kunlun-teaching' }, { name: '贺兰锋', female: false, age: 39, portraitId: 'elder-kunlun-discipline' }],
  caobang: [{ name: '邵闻汐', female: false, age: 58, portraitId: 'elder-caobang-teaching' }, { name: '柳绳青', female: true, age: 43, portraitId: 'elder-caobang-discipline' }],
  yaowang: [{ name: '桑知露', female: true, age: 65, portraitId: 'elder-yaowang-teaching' }, { name: '杜照圃', female: false, age: 49, portraitId: 'elder-yaowang-discipline' }],
  chongsheng: [{ name: '澄铜', female: false, age: 67, portraitId: 'elder-chongsheng-teaching' }, { name: '法楹', female: false, age: 44, portraitId: 'elder-chongsheng-discipline' }],
  quanzhen: [{ name: '玄芷姑', female: true, age: 60, portraitId: 'elder-quanzhen-teaching' }, { name: '阮守朴', female: false, age: 46, portraitId: 'elder-quanzhen-discipline' }],
  tangmen: [{ name: '唐蕴棠', female: true, age: 56, portraitId: 'elder-tangmen-teaching' }, { name: '唐逐鸦', female: false, age: 38, portraitId: 'elder-tangmen-discipline' }],
};

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

/** The sects as designed, kept so a world's own names can be put on and taken off again. */
const DESIGNED = Object.fromEntries(SECTS.map((sect) => [sect.id, { name: sect.name, leader: { ...sect.leader } }]));

/**
 * A player may found a sect of their own: it takes over one of the twelve
 * (its seat, arts and colour) under a new name and a new leader. The world
 * records that as `{ sect, name, leader, female }`; this puts those names on,
 * and takes off whatever an earlier world had put on. Call it when a world
 * starts or loads.
 */
export function applyIdentity(custom) {
  for (const sect of SECTS) Object.assign(sect, { name: DESIGNED[sect.id].name, leader: { ...DESIGNED[sect.id].leader } });
  const sect = SECT_BY_ID[custom?.sect];
  if (!sect) return;
  if (custom.name) sect.name = String(custom.name).slice(0, 6);
  if (custom.leader) sect.leader = { ...sect.leader, name: String(custom.leader).slice(0, 6), female: !!custom.female, age: 30 };
}
