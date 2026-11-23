// 文字表：界面上每一句话的中文和英文。界面只通过 t(key) 取字，不写死任何一种语言。五营、技能和天赋的名字在 sim/regiments.mjs 里，同样中英各一份。
// The words: Chinese and English for every line on the screen. The interface takes words only through t(key). The
// names of the regiments, skills and talents live with their numbers in sim/regiments.mjs, also in both languages.

export const WORDS = {
  title: { zh: '五营争锋', en: 'Five Regiments' },
  tagline: { zh: '选一营上阵，单挑另外四营，最后以一敌二。', en: 'Take one regiment into the field, beat the other four one by one, then two at once.' },
  road: { zh: '征途', en: 'The road' },
  free: { zh: '自由对决', en: 'Free duel' },
  settings: { zh: '设置', en: 'Settings' },
  howto: { zh: '操作', en: 'Controls' },
  language: { zh: 'English', en: '中文' },
  back: { zh: '返回', en: 'Back' },
  next: { zh: '下一步', en: 'Next' },
  begin: { zh: '出阵', en: 'To the field' },
  chooseRegiment: { zh: '选营', en: 'Choose a regiment' },
  chooseHint: { zh: '左右切换 · Enter 选定', en: 'Left and right to look · Enter to choose' },
  loadout: { zh: '配技能', en: 'Skills and talents' },
  loadoutHint: { zh: '上阵两个职业技能（Q、E），四个天赋。', en: 'Take two regiment skills (Q and E) and four talents.' },
  skills: { zh: '职业技能', en: 'Regiment skills' },
  talents: { zh: '天赋', en: 'Talents' },
  picked: { zh: '已选 {n}/{max}', en: '{n} of {max} chosen' },
  cool: { zh: '冷却 {s} 秒', en: '{s} s to recover' },
  health: { zh: '生命', en: 'Health' },
  arms: { zh: '兵器', en: 'Arms' },
  stage: { zh: '第{n}阵', en: 'Fight {n}' },
  finale: { zh: '终阵 · 以一敌二', en: 'The last fight · one against two' },
  versus: { zh: '对', en: 'against' },
  and: { zh: '与', en: 'and' },
  fight: { zh: '战', en: 'Fight' },
  won: { zh: '胜', en: 'Won' },
  lost: { zh: '败', en: 'Fallen' },
  double: { zh: '双杀', en: 'Double kill' },
  oneTwo: { zh: '以一敌二', en: 'One against two' },
  retry: { zh: '再战此阵', en: 'Fight this again' },
  goOn: { zh: '继续征途', en: 'On down the road' },
  toTitle: { zh: '回到卷首', en: 'Back to the title' },
  runDone: { zh: '五营争锋 · 全胜', en: 'Five Regiments · the road won' },
  mark: { zh: '评', en: 'Mark' },
  marks: { zh: '甲乙丙丁', en: 'ABCD' },
  best: { zh: '最好', en: 'Best' },
  time: { zh: '用时', en: 'Time' },
  seconds: { zh: '{s} 秒', en: '{s} s' },
  deflects: { zh: '弹刀', en: 'Deflections' },
  breaks: { zh: '破防', en: 'Guards broken' },
  taken: { zh: '被击中', en: 'Blows taken' },
  score: { zh: '得分', en: 'Score' },
  paused: { zh: '暂停', en: 'Paused' },
  resume: { zh: '继续', en: 'Resume' },
  giveUp: { zh: '离开战场', en: 'Leave the field' },
  clickToFight: { zh: '点一下画面开始（鼠标会被锁定在画面里，Esc 释放）', en: 'Click the picture to begin (the mouse is held in the page; Esc lets it go)' },
  loading: { zh: '整备中', en: 'Making ready' },
  loadingPlace: { zh: '布阵', en: 'Setting the field' },
  loadingMen: { zh: '点将', en: 'Calling the men' },
  quality: { zh: '画质', en: 'Picture' },
  qualityLow: { zh: '低', en: 'Low' },
  qualityMedium: { zh: '中', en: 'Medium' },
  qualityHigh: { zh: '高', en: 'High' },
  control: { zh: '刀路', en: 'Lines of cut' },
  directional: { zh: '鼠标方向', en: 'Mouse direction' },
  classic: { zh: '经典（自动轮换）', en: 'Classic (in turn)' },
  assist: { zh: '辅助格挡', en: 'Guard assist' },
  blood: { zh: '血雾', en: 'Blood' },
  sound: { zh: '声音', en: 'Sound' },
  sensitivity: { zh: '鼠标灵敏度', en: 'Mouse speed' },
  invert: { zh: '上下反转', en: 'Invert up and down' },
  on: { zh: '开', en: 'On' },
  off: { zh: '关', en: 'Off' },
  done: { zh: '好', en: 'Done' },
  lock: { zh: '锁定', en: 'Lock' },
  kick: { zh: '踢', en: 'Kick' },
  step: { zh: '闪步', en: 'Step' },
  guard: { zh: '格挡', en: 'Guard' },
  attack: { zh: '出手', en: 'Strike' },
  swap: { zh: '换刀', en: 'Knife' },
  controlsText: {
    zh: 'W A S D 走 · Shift 冲刺 · 移动鼠标转视角，出手前鼠标最后往哪边动就从哪边砍（右、左、上劈、下刺）· 左键出手，按住蓄力重击 · 右键按住格挡，格挡也看鼠标方向 · 刚举起时接住是弹刀 · F 踢（破防）· 空格 闪步 · Q E 职业技能 · Tab 或中键 锁定 · 武射史：左键拉弓松开放箭，R 换短刀 · Esc 暂停',
    en: 'W A S D to move · Shift to sprint · move the mouse to look; the way it last moved sets the line of the blow (right, left, up for overhead, down for a thrust) · left button strikes, hold it for a heavy blow · hold the right button to guard, on the line the mouse sets · caught at the first instant of the guard, a blow is deflected · F kicks (breaks a guard) · Space steps · Q and E for regiment skills · Tab or the middle button locks on · Archer: hold the left button to draw and let go to loose, R for the knife · Esc pauses'
  },
  touchText: { zh: '左边拖动走路，右边拖动转视角；在「出手」上划动选刀路。', en: 'Drag on the left to walk and on the right to look; swipe on Strike to choose the line.' },
  placeCounty: { zh: '县城校场', en: 'The county drill ground' },
  placePeach: { zh: '桃林溪畔', en: 'The peach grove by the stream' },
  placeBamboo: { zh: '竹林古道', en: 'The old bamboo path' },
  placeSnow: { zh: '雪原关隘', en: 'The snowy pass' },
  placePalace: { zh: '王城宫前', en: 'Before the palace' },
  freeHint: { zh: '选你的营、对手（一人或两人）和场地。', en: 'Choose your regiment, one or two foes, and the place.' },
  foes: { zh: '对手', en: 'Foes' },
  place: { zh: '场地', en: 'Place' },
  you: { zh: '你', en: 'You' },
  deflected: { zh: '弹刀', en: 'Deflected' },
  broken: { zh: '破防', en: 'Guard broken' },
  noGl: { zh: '这个浏览器打不开本游戏需要的 WebGL 2。请换一台较新的电脑或手机再试。', en: 'This browser cannot open the WebGL 2 the game needs. Please try a newer computer or phone.' },
  error: { zh: '出了点问题，画面停了。请重新载入。', en: 'Something went wrong and the picture stopped. Please reload.' },
  saveRefused: { zh: '浏览器没有让游戏存档（可能是隐私模式），本次成绩不会保留。', en: 'The browser did not let the game save (perhaps a private window); results will not be kept.' },
  saveReset: { zh: '存档读不懂，已重新开始；旧存档另存了一份。', en: 'The save could not be read and was started again; the old one was kept aside.' }
};

let language = 'zh';
export const setLanguage = (next) => (language = next === 'en' ? 'en' : 'zh');
export const getLanguage = () => language;

/** The words of `key` in the current language, with `{name}` filled from `values`. */
export function t(key, values = {}) {
  const entry = WORDS[key];
  if (!entry) throw new Error(`no words for ${key}`);
  return entry[language].replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
}

/** A `{ zh, en }` pair from the game's tables in the current language. */
export const say = (pair) => (pair ? pair[language] ?? pair.zh : '');
