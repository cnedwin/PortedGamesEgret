// 剧情：开场的几张字卡、路上按里程和事件说出的话、到每个驿站时的一段、以及按送到多少茶写的三种结尾。
// 说话的是老马锅头（车队的头人）、押后车的卓玛和开头车的你——阿岩。
//
// The story: the cards of the opening, the lines spoken along the road by distance and by event, a passage at each
// station, and three endings by how much tea arrives. The speakers are the old caravan master, Drolma who drives the
// last truck, and you, Ayan, at the wheel of the first.

export const SPEAKERS = {
  master: { zh: '老马锅头', en: 'Caravan master' },
  drolma: { zh: '卓玛', en: 'Drolma' },
  ayan: { zh: '阿岩', en: 'Ayan' },
  road: { zh: '', en: '' }
};

/** The opening, card by card, over the tea hills at dawn. */
export const OPENING = [
  { zh: '滇南，普洱茶山。', en: 'The south of Yunnan: the tea hills of Pu\'er.' },
  { zh: '一千年来，马帮驮着茶砖，翻过雪山，把茶送到高原上。', en: 'For a thousand years, caravans of horses carried bricks of tea over the snow mountains to the high plateau.' },
  { zh: '今年，马帮换成了三辆越野车。路还是那条路。', en: 'This year the horses are three trucks. The road is the same road.' },
  { zh: '七十二捆茶，三个驿站，一个垭口。雪封山之前，必须赶到。', en: 'Seventy-two bundles of tea, three stations, one high pass. Before the snow closes it, they must arrive.' }
];

/** Lines along the road: said once, when the lead truck passes `s` metres. */
export const ROAD_LINES = [
  { s: 60, who: 'master', zh: '阿岩，头车交给你了。路窄，别跑太快，茶比人金贵。', en: 'The lead truck is yours, Ayan. The road is narrow; tea is worth more than speed.' },
  { s: 420, who: 'drolma', zh: '后车跟上了。前面过河，水不深，慢慢蹚。', en: 'The rear is with you. A ford ahead — shallow, take it slow.' },
  { s: 1080, who: 'master', zh: '这片林子不太平，山匪会拿木头拦路。顶开木头别停车，扒车的就撞开。', en: 'These woods are not safe; bandits block the road with logs. Shove through without stopping, and knock off anyone who grabs on.' },
  { s: 2380, who: 'drolma', zh: '吊桥！一辆一辆过，别在桥上刹车。', en: 'The rope bridge! One truck at a time, and no braking on it.' },
  { s: 2760, who: 'master', zh: '峡口窄，山匪最爱这种地方。按喇叭也吓不走他们，只能冲过去。', en: 'The gorge mouth is narrow — bandits love it. The horn won\'t scare them; drive through.' },
  { s: 3200, who: 'ayan', zh: '开始下雪了。', en: 'It\'s starting to snow.' },
  { s: 3640, who: 'drolma', zh: '听见了吗？垭口上有狼。它们怕喇叭。', en: 'Hear that? Wolves at the pass. They fear the horn.' },
  { s: 4110, who: 'master', zh: '过了垭口，路就往下走了。高原驿站不远了。', en: 'Past the pass the road goes down. The plateau station is close.' }
];

/** What is said when things happen on the road; one of each list, in turn. */
export const EVENT_LINES = {
  ambushBandit: [
    { who: 'drolma', zh: '林子里有人！', en: 'Men in the trees!' },
    { who: 'master', zh: '山匪！别停车！', en: 'Bandits! Don\'t stop!' }
  ],
  ambushWolf: [{ who: 'master', zh: '狼群下来了，按喇叭！', en: 'The pack is coming down — sound the horn!' }],
  grab: [
    { who: 'drolma', zh: '他们扒走了一捆茶！', en: 'They took a bundle!' },
    { who: 'master', zh: '又少了一捆……撞倒他，还能抢回来。', en: 'Another one gone… knock him down and it\'s ours again.' }
  ],
  recovered: [{ who: 'drolma', zh: '茶抢回来了！', en: 'We got the tea back!' }],
  knocked: [
    { who: 'ayan', zh: '让开！', en: 'Out of the way!' },
    { who: 'master', zh: '好！冲过去！', en: 'Good — through!' }
  ],
  bite: [{ who: 'drolma', zh: '狼在扯篷布！', en: 'A wolf is tearing at the tarp!' }],
  scared: [{ who: 'master', zh: '狼散了！', en: 'They\'re scattering!' }],
  upset: [{ who: 'master', zh: '车翻了！按 R（或“扶正”），马帮兄弟帮你扶起来。', en: 'You\'ve rolled! Press R (or “Right it”) and the crew will set you back.' }]
};

/** What the master says on reaching each station. */
export const STATION_LINES = [
  { zh: '普洱茶山 · 出发。', en: 'Pu\'er tea hills — setting out.' },
  { zh: '溪畔驿。人歇车不歇，营地搭好了就上路。', en: 'Creek Post. Rest the crew, not the trucks — make camp, then on.' },
  { zh: '峡口驿。前面就是雪山了，加件衣服。', en: 'Gorge Post. Snow mountains ahead; put on another layer.' },
  { zh: '高原驿站。到了。', en: 'Plateau Station. We\'re here.' }
];

/** The ending, by the share of the tea that arrives. */
export function ending(share) {
  if (share >= 0.9)
    return {
      title: share >= 1
        ? { zh: '茶到了，一捆不少', en: 'The tea arrived, every bundle' }
        : { zh: '茶到了，只少了几捆', en: 'The tea arrived, almost every bundle' },
      lines: [
        { zh: '驿站的人迎出来，接过茶砖，煮了第一壶酥油茶。', en: 'The station\'s people came out, took the bricks, and brewed the first pot of butter tea.' },
        { zh: '老马锅头说：你爷爷那会儿，也是这么走过来的。', en: 'The master said: your grandfather came this way too.' }
      ]
    };
  if (share >= 0.6)
    return {
      title: { zh: '茶到了，路上丢了一些', en: 'The tea arrived, some lost on the way' },
      lines: [
        { zh: '少了几捆，但高原上的人等得够久了。', en: 'A few bundles short, but the plateau has waited long enough.' },
        { zh: '明年春天，再走一趟。', en: 'Next spring, we go again.' }
      ]
    };
  return {
    title: { zh: '车到了，茶剩不多', en: 'The trucks arrived, little tea with them' },
    lines: [
      { zh: '山匪和狼拿走了太多。剩下的茶，驿站分给了每一户。', en: 'Bandits and wolves took too much. What was left, the station shared among every house.' },
      { zh: '老马锅头拍拍你的肩：路认得了，下回会好些。', en: 'The master patted your shoulder: now you know the road. Next time will be better.' }
    ]
  };
}
