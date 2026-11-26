// 界面的颜色和尺寸：木作、朱漆、黄铜。每个画面都是引擎的数据界面（game.show），没有颜色的部件按这里的皮肤画。
// The interface's colours and sizes: carved timber, cinnabar lacquer and brass. Every screen is one of the engine's
// views described as data (`game.show`); parts without colours of their own are drawn in this skin.

export const C = Object.freeze({
  ink: 0x101410,
  night: 0x141612,
  lacquer: 0x201914,
  sheet: 0x231b14,
  well: 0x2a2018,
  cell: 0x261e16,
  paper: 0xf8e7ca,
  cream: 0xfff0d6,
  muted: 0xc6ae90,
  gold: 0xeabc76,
  bright: 0xffdb92,
  edge: 0xa47949,
  wood: 0x795638,
  red: 0x9b352a,
  redDeep: 0x78251d,
  rose: 0xf0c4a3,
  chosen: 0x443221,
  warn: 0x5c2f24,
  drum: 0x7a3328,
  drumLit: 0xb0574a,
  gong: 0xc58e48,
  gongLit: 0xf3cf8a,
  gongReady: 0xffe3a6,
  gongText: 0x21170e
});

/** The skin of every view: words in paper white on dark timber cards, timber buttons and a brass accent. */
export const SKIN = Object.freeze({
  text: C.paper,
  panel: C.sheet,
  panelAlpha: 0.97,
  button: C.well,
  buttonText: C.paper,
  disabled: 0x3a3029,
  accent: C.gold,
  track: 0x433524,
  radius: 5,
  size: 18,
  dim: 0.62
});

/** A timber edge for cards and plain buttons; a bright one for what is primary. */
export const EDGE = Object.freeze({ color: C.wood, width: 1 });
export const BRASS = Object.freeze({ color: C.edge, width: 2 });
export const BRIGHT = Object.freeze({ color: 0xe5a86c, width: 1 });

/** A plain button. */
export const button = (name, text, more = {}) => ({ type: 'button', name, text, border: EDGE, ...more });
/** The button a screen most wants pressed: cinnabar lacquer with cream words. */
export const primary = (name, text, more = {}) => ({ type: 'button', name, text, color: C.red, textColor: C.cream, border: BRIGHT, ...more });
