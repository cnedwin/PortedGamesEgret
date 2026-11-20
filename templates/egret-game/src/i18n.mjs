// 文字表：界面上每一句话的中文和英文。界面只通过 t(key) 取字，不写死任何一种语言；切换语言时整块画面重画。
// The words: Chinese and English for every line on the screen. The interface takes words only through t(key) and
// writes none in one language; switching the language redraws the screen.

export const WORDS = {
  title: { zh: '提灯人', en: 'The Lantern Bearer' },
  subtitle: { zh: '新白鹭引擎游戏模板', en: 'A game template for the new Egret engine' },
  start: { zh: '开始', en: 'Start' },
  settings: { zh: '设置', en: 'Settings' },
  language: { zh: 'English', en: '中文' },
  languageName: { zh: '切换到英文', en: 'Switch to Chinese' },
  best: { zh: '最快：{time} 秒', en: 'Best: {time} s' },
  noBest: { zh: '还没有成绩', en: 'No time yet' },
  goal: { zh: '收集全部光点', en: 'Gather every light' },
  count: { zh: '光点 {taken}/{total}', en: 'Lights {taken}/{total}' },
  time: { zh: '{time} 秒', en: '{time} s' },
  keys: { zh: '方向键或 WASD 走动 · Esc 返回', en: 'Arrows or WASD to walk · Esc to go back' },
  back: { zh: '返回', en: 'Back' },
  done: { zh: '全部收齐！用时 {time} 秒', en: 'All gathered! {time} s' },
  newBest: { zh: '新纪录', en: 'New best' },
  again: { zh: '再来一次', en: 'Play again' },
  sound: { zh: '声音', en: 'Sound' },
  reducedMotion: { zh: '减弱动画', en: 'Reduce motion' },
  close: { zh: '好', en: 'Done' },
  saveRefused: { zh: '浏览器没有让游戏存档（可能是隐私模式），本次进度不会保留。', en: 'The browser did not let the game save (perhaps a private window); this progress will not be kept.' },
  saveReset: { zh: '存档读不懂，已重新开始；旧存档另存了一份。', en: 'The save could not be read and was started again; the old one was kept aside.' },
  up: { zh: '上', en: 'Up' },
  down: { zh: '下', en: 'Down' },
  left: { zh: '左', en: 'Left' },
  right: { zh: '右', en: 'Right' },
  stage: { zh: '提灯人 · 游戏模板', en: 'The Lantern Bearer · game template' }
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
