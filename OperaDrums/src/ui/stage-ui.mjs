// 演出页：戏台上方的曲名、进度、得分和暂停，戏台下沿的跟练或压轴提示，戏台下面的一行读数，以及四块敲击区。都是
// 引擎的数据界面（game.show）：横屏时戏台 960×540 在上、四块敲击区排成一行在下；竖着拿手机时戏台占满宽度，敲击区
// 两行两列，上面两块锣、下面两块鼓。戏台本身（音符、判定线、乐器）不是界面，由 src/view.mjs 画在名为 stage 的部件
// 的位置上。
//
// 敲击区要的是按下那一刻：界面的点按在抬起时才算，所以每块敲击区还听引擎指针输入的 begin，取事件的时间戳（见
// ENGINE-NOTES.md）；按键和读屏软件激活敲击区时走界面的点按。
//
// The performance page: the song, its progress, the score and Pause over the stage, the lesson's or the encore's coach
// along its foot, a line of readout under it, and the four pads. All are one of the engine's views described as data
// (`game.show`): on a wide screen the 960 × 540 stage is above and the pads in a row below; on a phone held upright
// the stage takes the width and the pads are two by two, gongs above and drums below. The stage itself (notes, the
// timing line, the instruments) is no interface: src/view.mjs draws it where the part named `stage` is.
//
// A pad wants the moment it is pressed: a tap of a view counts when the finger lifts, so each pad also listens to the
// `begin` of the engine's pointer input and takes the event's time stamp (see ENGINE-NOTES.md); keys and assistive
// technology activate a pad through the view's tap.
import { C, EDGE, SKIN, button } from './skin.mjs';
import { fitWords } from './wrap.mjs';

export const PADS = [
  { name: 'pad-d', kind: 'gong', hand: 'd' },
  { name: 'pad-f', kind: 'drum', hand: 'f' },
  { name: 'pad-j', kind: 'drum', hand: 'j' },
  { name: 'pad-k', kind: 'gong', hand: 'k' }
];
const DARK = 0x181611;

function pad({ name, kind, hand }, t, { size, keySize }) {
  return {
    type: 'panel', name, label: t(kind + 'PadName', { key: hand.toUpperCase() }), width: 'fill', height: 'fill',
    color: kind === 'drum' ? C.drum : C.gong, alpha: 1, border: { color: kind === 'drum' ? 0xbb7a63 : 0xf0c482, width: 2 },
    children: [
      { type: 'text', name: 'pad-word-' + hand, text: (kind === 'drum' ? '□ ' : '◇ ') + t(kind + 'Pad'), anchor: 'center', width: 'fill', height: size + 12,
        size, bold: true, align: 'center', color: kind === 'drum' ? 0xffeadb : C.gongText },
      { type: 'text', name: 'key-' + hand, text: hand.toUpperCase(), anchor: 'bottom', y: 6, width: 'fill', height: keySize + 6, size: keySize, align: 'center',
        color: kind === 'drum' ? 0xffeadb : C.gongText }
    ]
  };
}

function hud(t, o) {
  return {
    type: 'panel', anchor: 'top', y: o.top, width: o.width, height: o.height, layout: 'row', gap: 8, align: 'center', children: [
      { type: 'panel', card: true, color: DARK, alpha: 0.88, border: EDGE, width: o.now, height: o.height, padding: 5, layout: 'column', gap: 3, children: [
        { type: 'text', name: 'song-line', text: '', height: 'fill', size: o.words, bold: true },
        { type: 'bar', name: 'progress', label: t('scoreProgress'), height: 4, color: C.gold }
      ] },
      { type: 'space', width: 'fill' },
      { type: 'panel', card: true, color: DARK, alpha: 0.88, border: EDGE, width: o.score, height: o.height - 4, children: [
        { type: 'text', name: 'score', text: '', anchor: 'center', width: 'fill', height: o.height - 8, size: o.words + 2, bold: true, align: 'center' }
      ] },
      ...(o.pause ? [button('pause', t('pause'), { width: o.pause, height: o.height - 4, size: o.words - 1, color: 0x271c15 })] : [])
    ]
  };
}

function coach(t, o) {
  return {
    type: 'panel', name: 'coach', label: t('coachGroup'), anchor: 'bottom', y: o.bottom, width: o.width, height: o.height, card: true, color: 0x201910, alpha: 0.95,
    border: { color: 0xba8554, width: 1 }, padding: 5, layout: 'row', gap: 10, align: 'center', children: [
      { type: 'text', name: 'coach-label', text: '', width: o.label, height: o.height - 10, size: o.words, bold: true, color: C.gold },
      { type: 'text', name: 'coach-hint', text: '', width: 'fill', height: o.height - 10, size: o.words - 1 },
      { type: 'bar', name: 'coach-bar', label: t('encore'), width: o.bar, height: 6, color: C.gold }
    ]
  };
}

/** The performance page: a view whose parts follow `app.hud`. `onBuilt(view)` is told each time its parts are made. */
export function openPlayPage(game, { t, app, act, onBuilt }) {
  // On a phone held upright the line under the stage also holds Pause, where a thumb reaches it at full size.
  const readout = (o) => ({ type: 'panel', name: 'readout-box', label: t('readoutGroup'), card: true, color: 0x261e17, alpha: 1, border: { color: 0x936947, width: 1 }, width: o.width, height: o.height,
    layout: 'row', gap: 8, padding: o.pause ? 2 : 0, align: 'center', children: [
      { type: 'text', name: 'readout', text: '', width: 'fill', height: o.height - 4, size: o.words, bold: true, align: 'center' },
      ...(o.pause ? [button('pause', t('pause'), { width: o.pause, height: o.height - 4, size: o.words, color: 0x271c15 })] : [])
    ] });
  const landscape = {
    type: 'panel', width: 'fill', height: 'fill', layout: 'column', gap: 8, align: 'center', children: [
      { type: 'panel', name: 'stage', label: t('stage'), width: 960, height: 540, children: [
        hud(t, { top: 6, width: 944, height: 46, now: 250, score: 150, pause: 92, words: 16 }),
        coach(t, { bottom: 14, width: 806, height: 38, label: 190, bar: 120, words: 16 })
      ] },
      readout({ width: 960, height: 34, words: 16 }),
      { type: 'panel', layout: 'row', gap: 8, width: 960, height: 'fill', children: PADS.map((p) => pad(p, t, { size: 28, keySize: 12 })) }
    ]
  };
  const portrait = {
    type: 'panel', width: 'fill', height: 'fill', layout: 'column', gap: 8, children: [
      { type: 'panel', name: 'stage', label: t('stage'), width: 'fill', height: 304, children: [
        hud(t, { top: 4, width: 528, height: 40, now: 260, score: 130, words: 16 }),
        coach(t, { bottom: 6, width: 524, height: 38, label: 140, bar: 60, words: 15 })
      ] },
      readout({ width: 'fill', height: 68, words: 15, pause: 110 }),
      { type: 'panel', layout: 'column', gap: 8, height: 'fill', padding: 4, children: [
        { type: 'panel', layout: 'row', gap: 8, height: 'fill', children: [pad(PADS[0], t, { size: 34, keySize: 14 }), pad(PADS[3], t, { size: 34, keySize: 14 })] },
        { type: 'panel', layout: 'row', gap: 8, height: 'fill', children: [pad(PADS[1], t, { size: 34, keySize: 14 }), pad(PADS[2], t, { size: 34, keySize: 14 })] }
      ] }
    ]
  };
  const h = () => app.hud;
  const bind = {
    'song-line': { text: () => h().songLine },
    progress: { value: () => h().progress },
    score: { text: () => h().scoreLine },
    pause: { tap: () => act.pause(), disabled: () => app.screen !== 'play' },
    coach: { visible: () => h().coach.shown, color: () => ({ ready: 0x342916, active: 0x73381d, break: 0x492a24 })[h().coach.phase] ?? 0x201910 },
    'coach-label': { text: () => h().coach.label, color: () => (h().coach.phase === 'active' ? 0xfff4cf : h().coach.phase === 'break' ? 0xffd2b6 : C.gold) },
    'coach-hint': { text: () => h().coach.hint },
    'coach-bar': { value: () => h().coach.bar, visible: () => h().coach.barShown },
    'readout-box': { color: () => (h().readout.warn ? 0x3a2418 : 0x261e17) },
    readout: { text: () => h().readout.text, color: () => (h().readout.warn ? 0xffcf95 : C.cream) }
  };
  for (const p of PADS) {
    bind[p.name] = {
      tap: () => act.padActivated(p),
      color: () => {
        const down = h().padsDown[p.hand] > 0;
        if (p.kind === 'drum') return down ? C.drumLit : C.drum;
        return down ? C.gongLit : h().encorePhase === 'ready' ? C.gongReady : C.gong;
      }
    };
    bind['key-' + p.hand] = { visible: () => game.device !== 'touch' };
  }
  // Words too wide for their part are made smaller before the engine sees them (wrap.mjs).
  return game.show({ label: t('stage'), skin: SKIN, root: fitWords(landscape, 960, SKIN), portrait: fitWords(portrait, 540, SKIN) }, { bind, built: onBuilt });
}

/** A frame round the stage, in its own units. */
export function drawStageFrame(g) {
  g.lineStyle(2, 0x896a46, 1).drawRect(-1, -1, 962, 542).lineStyle(0);
}
