// 文字表：界面上每一句话的中文和英文。界面只通过 t(key) 取字，不写死任何一种语言；切换语言时整块画面重画。
// The words: Chinese and English for every line on the screen. The interface takes words only through t(key) and
// writes none in one language; switching the language redraws the screen.

export const WORDS = {
  title: { zh: '沙画江山', en: 'Sand Scroll' },
  subtitle: { zh: '一粒沙，一笔色，拼成一卷青绿山水', en: 'Grain by grain, colour by colour, a landscape scroll' },
  start: { zh: '开卷作画', en: 'Start painting' },
  settings: { zh: '设置', en: 'Settings' },
  language: { zh: 'English', en: '中文' },
  languageName: { zh: '切换到英文', en: 'Switch to Chinese' },
  best: { zh: '最高分 {score}', en: 'Best {score}' },
  noBest: { zh: '还没有成绩', en: 'No score yet' },
  scrollDone: { zh: '《春山图》已画成', en: 'Spring Hills: finished' },
  scrollName: { zh: '第一卷 · 春山图', en: 'Scroll one · Spring Hills' },
  howTo: {
    zh: '拖动下面的积木到沙盘上方松手，积木落下就化成沙。同一种颜色的沙从左边连到右边，整片就会消掉，颜色染进上面的画里。轻点积木可以旋转。别让沙堆过顶上的虚线。',
    en: 'Drag a piece from below over the tray and let go: it falls and breaks into sand. When one colour of sand reaches from the left wall to the right, the whole run clears and its colour goes into the painting above. Tap a piece to turn it. Keep the sand under the dashed line.'
  },
  firstHint: { zh: '按住下面的积木，拖到沙盘上方松手', en: 'Hold a piece below, drag it over the tray and let go' },
  score: { zh: '得分 {score}', en: 'Score {score}' },
  share: { zh: '画成 {percent}%', en: 'Painted {percent}%' },
  chain: { zh: '连消 ×{chain}', en: 'Chain ×{chain}' },
  danger: { zh: '沙快满了！', en: 'The sand is too high!' },
  keys: { zh: '1/2/3 选积木 · ←→ 移动 · ↑ 旋转 · 空格 落下 · Esc 暂停', en: '1/2/3 pick · ←→ move · ↑ turn · Space drop · Esc pause' },
  pause: { zh: '暂停', en: 'Pause' },
  paused: { zh: '暂停中', en: 'Paused' },
  resume: { zh: '继续', en: 'Resume' },
  restart: { zh: '重新开卷', en: 'Start over' },
  toTitle: { zh: '回到卷首', en: 'Back to the title' },
  back: { zh: '返回', en: 'Back' },
  won: { zh: '画成了！', en: 'The scroll is finished!' },
  lost: { zh: '沙漫过了线', en: 'The sand spilled over' },
  lostHint: { zh: '画已染成 {percent}%。把同色的沙往两边铺，连起来才会消。', en: 'Painted {percent}%. Spread each colour toward both walls: only a run from wall to wall clears.' },
  stats: { zh: '用时 {time} · 积木 {pieces} 块 · 最长连消 ×{chain}', en: '{time} · {pieces} pieces · longest chain ×{chain}' },
  finalScore: { zh: '得分 {score}', en: 'Score {score}' },
  newBest: { zh: '新纪录', en: 'New best' },
  again: { zh: '再画一卷', en: 'Paint again' },
  retry: { zh: '再试一次', en: 'Try again' },
  sound: { zh: '声音', en: 'Sound' },
  reducedMotion: { zh: '减弱动画', en: 'Reduce motion' },
  close: { zh: '好', en: 'Done' },
  saveRefused: { zh: '浏览器没有让游戏存档（可能是隐私模式），本次进度不会保留。', en: 'The browser did not let the game save (perhaps a private window); this progress will not be kept.' },
  saveReset: { zh: '存档读不懂，已重新开始；旧存档另存了一份。', en: 'The save could not be read and was started again; the old one was kept aside.' },
  slot: { zh: '第 {n} 块积木', en: 'Piece {n}' },
  stage: { zh: '沙画江山', en: 'Sand Scroll' }
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
