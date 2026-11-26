// 词的六类：每一类一种颜色，卷宗里的空位也染成同色，玩家一眼就知道这个空该放哪一类词。颜色取宋画常用的矿物颜料。
// The six kinds of word. Each kind has a colour, and a blank in the dossier takes the colour of the kind it wants,
// so a player sees at once which words can go where. The colours are the mineral pigments of Song painting.

export const KINDS = {
  person: { zh: '人', en: 'Who', name: { zh: '人名', en: 'People' }, colour: 0xa3342a },
  thing: { zh: '物', en: 'What', name: { zh: '器物', en: 'Things' }, colour: 0x2c5a87 },
  mark: { zh: '痕', en: 'Sign', name: { zh: '痕迹', en: 'Signs' }, colour: 0x8a5a2b },
  cause: { zh: '由', en: 'How', name: { zh: '死由', en: 'Causes' }, colour: 0x2f6e4f },
  place: { zh: '处', en: 'Where', name: { zh: '处所', en: 'Places' }, colour: 0x86680f },
  motive: { zh: '情', en: 'Why', name: { zh: '情由', en: 'Motives' }, colour: 0x6a3d6e }
};

/** The kinds in the order the word pouch shows them. */
export const KIND_ORDER = ['person', 'thing', 'mark', 'cause', 'place', 'motive'];
