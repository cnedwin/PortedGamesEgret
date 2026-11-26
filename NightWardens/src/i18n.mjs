// 文字表：界面上每一句话的中文和英文。界面只通过 t(key) 取字，不写死任何一种语言；切换语言时整块画面重画。
// The words: Chinese and English for every line on the screen. The interface takes words only through t(key) and
// writes none in one language; switching the language redraws the screen.

export const WORDS = {
  title: { zh: '镇邪司', en: 'Night Wardens' },
  subtitle: { zh: '一把符弩守城门，三夜镇住百鬼', en: 'One talisman crossbow, one gate, three nights of haunts' },
  stage: { zh: '镇邪司', en: 'Night Wardens' },
  // Glyphs drawn as pictures, the same in both languages: the seal on the title and the thunder seal.
  sealGlyph: { zh: '鎮', en: '鎮' },
  thunderGlyph: { zh: '雷', en: '雷' },
  start: { zh: '守夜', en: 'Stand watch' },
  settings: { zh: '设置', en: 'Settings' },
  language: { zh: 'English', en: '中文' },
  languageName: { zh: '切换到英文', en: 'Switch to Chinese' },
  back: { zh: '返回', en: 'Back' },
  close: { zh: '好', en: 'Done' },
  sound: { zh: '声音', en: 'Sound' },
  reducedMotion: { zh: '减弱动画', en: 'Reduce motion' },
  saveRefused: { zh: '浏览器没有让游戏存档（可能是隐私模式），本次进度不会保留。', en: 'The browser did not let the game save (perhaps a private window); this progress will not be kept.' },
  saveShort: { zh: '本次进度未能保存', en: 'This run could not be saved.' },
  saveReset: { zh: '存档读不懂，已重新开始；旧存档另存了一份。', en: 'The save could not be read and was started again; the old one was kept aside.' },

  // Choosing a night.
  chooseNight: { zh: '选一夜', en: 'Choose a night' },
  nightOrdinal1: { zh: '壹', en: 'I' },
  nightOrdinal2: { zh: '贰', en: 'II' },
  nightOrdinal3: { zh: '叁', en: 'III' },
  night1: { zh: '第一夜 · 城隍庙外', en: 'Night One · The Temple Road' },
  night2: { zh: '第二夜 · 乱葬岗', en: 'Night Two · Graveyard Hill' },
  night3: { zh: '第三夜 · 鬼市', en: 'Night Three · The Ghost Market' },
  nightShort1: { zh: '城隍庙外', en: 'The Temple Road' },
  nightShort2: { zh: '乱葬岗', en: 'Graveyard Hill' },
  nightShort3: { zh: '鬼市', en: 'The Ghost Market' },
  locked: { zh: '守住前一夜才能来', en: 'Hold the night before to open' },
  notHeld: { zh: '还没守住', en: 'Not yet held' },
  heldStars: { zh: '{stars} · 最快 {time}', en: '{stars} · best {time}' },

  // Playing.
  wall: { zh: '城墙', en: 'Wall' },
  levelShort: { zh: '{level} 级', en: 'Lv {level}' },
  midnight: { zh: '子时将至', en: 'Midnight nears' },
  thunder: { zh: '天雷', en: 'Thunder' },
  thunderReady: { zh: '施放天雷', en: 'Strike now' },
  thunderName: { zh: '天雷符：劈遍全场', en: 'Thunder talisman: strike the whole road' },
  pause: { zh: '暂停', en: 'Pause' },
  paused: { zh: '暂停', en: 'Paused' },
  resume: { zh: '继续', en: 'Resume' },
  retreat: { zh: '撤回城里', en: 'Withdraw' },
  keys: { zh: '←→ 或 A D 移动 · 空格 天雷 · Esc 暂停', en: '←→ or A D to move · Space: thunder · Esc: pause' },
  touchHint: { zh: '在路面上拖动，符弩跟着走', en: 'Drag on the road and the crossbow follows' },
  wardsHeld: { zh: '已得符法', en: 'Wards held' },
  noWards: { zh: '还没有', en: 'None yet' },
  chooseWard: { zh: '升到 {level} 级 · 选一道符法', en: 'Level {level} · choose a ward' },
  wardLevel: { zh: '{name} {level}', en: '{name} {level}' },
  newWard: { zh: '新', en: 'new' },
  pickKeys: { zh: '按 1 2 3 选择', en: 'Press 1 2 3 to choose' },
  bossCame: { zh: '子时 · {name} 现身', en: 'Midnight · {name} comes' },
  general: { zh: '纸扎大将', en: 'The Paper General' },
  wuchang: { zh: '白无常', en: 'White Impermanence' },
  hanba: { zh: '旱魃', en: 'The Drought Fiend' },

  // The wards.
  volley: { zh: '连弩', en: 'Volley' },
  volleyText: { zh: '每次多射一支符箭', en: 'One more bolt each shot' },
  haste: { zh: '速射', en: 'Haste' },
  hasteText: { zh: '出手快一成半', en: 'Shots come 14% sooner' },
  cinnabar: { zh: '朱砂', en: 'Cinnabar' },
  cinnabarText: { zh: '符箭伤害提高 25%', en: 'Bolts hit 25% harder' },
  pierce: { zh: '穿心', en: 'Pierce' },
  pierceText: { zh: '符箭多穿透一个', en: 'Bolts pass through one more' },
  fire: { zh: '火符', en: 'Fire talisman' },
  fireText: { zh: '命中点燃邪祟', en: 'Hits set haunts burning' },
  chain: { zh: '雷引', en: 'Thunder chain' },
  chainText: { zh: '每第四箭引雷跳击', en: 'Every fourth shot leaps as lightning' },
  frost: { zh: '寒符', en: 'Frost talisman' },
  frostText: { zh: '命中让邪祟变慢', en: 'Hits slow haunts down' },
  ink: { zh: '墨斗线', en: 'Ink line' },
  inkText: { zh: '不时拦路，灼烧越线的', en: 'A line across the road burns what crosses' },
  mirror: { zh: '八卦镜', en: 'Bagua mirror' },
  mirrorText: { zh: '不时向前放出光柱', en: 'Now and then a beam shoots up the road' },
  wallWard: { zh: '固城', en: 'Bulwark' },
  wallWardText: { zh: '城墙加厚并修补', en: 'The wall grows and mends' },
  crit: { zh: '破邪', en: 'Banishing' },
  critText: { zh: '暴击更多更狠', en: 'More and harder critical hits' },
  thunderWard: { zh: '引雷', en: 'Storm call' },
  thunderWardText: { zh: '天雷符蓄得更快', en: 'The thunder talisman fills faster' },

  // The end of a night.
  held: { zh: '守住了！', en: 'The gate held!' },
  fell: { zh: '城破了……', en: 'The gate fell…' },
  results: { zh: '击杀 {kills} · {level} 级 · {time}', en: '{kills} banished · level {level} · {time}' },
  newBest: { zh: '新纪录', en: 'New best' },
  again: { zh: '再守一次', en: 'Again' },
  nextNight: { zh: '下一夜', en: 'Next night' },
  toNights: { zh: '换一夜', en: 'Other nights' },
  allHeld: { zh: '三夜都守住了，百鬼退散。', en: 'All three nights held; the haunts have scattered.' },
  minutes: { zh: '{m} 分 {s} 秒', en: '{m}:{s}' }
};

/** The words key of each ward's name and line. */
export const WARD_WORDS = {
  volley: ['volley', 'volleyText'],
  haste: ['haste', 'hasteText'],
  cinnabar: ['cinnabar', 'cinnabarText'],
  pierce: ['pierce', 'pierceText'],
  fire: ['fire', 'fireText'],
  chain: ['chain', 'chainText'],
  frost: ['frost', 'frostText'],
  ink: ['ink', 'inkText'],
  mirror: ['mirror', 'mirrorText'],
  wall: ['wallWard', 'wallWardText'],
  crit: ['crit', 'critText'],
  thunder: ['thunderWard', 'thunderWardText']
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

/** Seconds as minutes and seconds, in the current language. */
export const clock = (seconds) => {
  const whole = Math.max(0, Math.round(seconds));
  return t('minutes', { m: Math.floor(whole / 60), s: String(whole % 60).padStart(2, '0') });
};

/** Stars as filled and empty marks. */
export const starMarks = (stars) => '★'.repeat(stars) + '☆'.repeat(3 - stars);
