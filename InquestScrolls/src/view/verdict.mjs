// 判词：最后一案的四页都核实之后，玩家亲手写下主使、同谋和罪名。点一个框，引擎的画布文字输入就在框上放一个平台
// 文本框（中文输入法照常可用），写完收起，字由游戏自己画。小游戏只有一块画布、没有文本框，改用字盘：点字拼出判词。
// The verdict: once the last case's pages are all sealed, the player writes who was behind it, who helped and what
// they did. Tapping a box makes the engine's canvas text input put a platform text field over it (Chinese input
// methods work as usual); when it is done the field goes and the game draws the words. A mini game has one canvas
// and no text field, so there the player builds the verdict from a board of characters instead.
import { Sprite } from '@egret/engine';
import { createBrowserTextInput } from '@egret/engine/web/text-input';
import { judgeVerdict, submitVerdict } from '../sim/rules.mjs';
import { INK, PAPER, VERMILION } from './type.mjs';
import { buildBoard } from './board.mjs';
import { FAINT, RULE, estimateWidth, hitBox } from './ui.mjs';

/**
 * Open the verdict of case `c` over `layer`. `app` gives game, type, kit, lang(), say(key), st, save(), board (true
 * when there is no text field), onDone(), onClose().
 */
export function openVerdict(layer, c, app) {
  const { game, type, kit } = app;
  const lang = app.lang();
  const v = c.verdict;
  const st = app.st;
  const portrait = game.height > game.width;
  const answers = { chief: '', partner: '', crimes: '', ...(st.verdict?.answers ?? {}) };
  const root = new Sprite();
  layer.addChild(root);
  kit.veil(root, 0.55);
  const W = portrait ? game.width - 24 : 900,
    H = portrait ? game.height - 40 : game.height - 50;
  const X = (game.width - W) / 2,
    Y = (game.height - H) / 2;
  const panel = kit.panel(root, X, Y, W, H);
  hitBox(panel, 0, 0, W, H);
  game.onTap(panel, () => {});
  const head = type.label(panel, v.title[lang], { size: 40, brush: true });
  head.x = 34;
  head.y = 24;
  const scope = game.engine.createScope();
  const prompt = type.paragraph(scope, { text: v.prompt[lang], width: W - 70, size: 22, locale: lang });
  prompt.holder.x = 34;
  prompt.holder.y = 84;
  panel.addChild(prompt.holder);

  const boardH = app.board ? (portrait ? 330 : 210) : 0;
  const fieldTop = 140,
    fieldGap = 16;
  const heights = { chief: 56, partner: 56, crimes: Math.max(80, H - fieldTop - 56 - 56 - fieldGap * 2 - 110 - boardH) };
  const fields = {};
  let y = fieldTop;
  let active = 'chief';
  for (const f of v.fields) {
    const box = { x: 34 + 130, y, w: W - 34 - 130 - 34, h: heights[f.id] };
    const l = type.label(panel, f.label[lang], { size: 26, brush: true, middle: true });
    l.x = 34;
    l.y = y + 28;
    const s = new Sprite();
    s.x = box.x;
    s.y = box.y;
    panel.addChild(s);
    const words = type.label(s, '', { size: 24, colour: INK });
    words.x = 14;
    words.y = 12;
    fields[f.id] = { f, box, s, words };
    hitBox(s, 0, 0, box.w, box.h);
    game.onTap(s, () => focusField(f.id));
    y += box.h + fieldGap;
  }
  const draw = () => {
    for (const [id, fl] of Object.entries(fields)) {
      const g = fl.s.graphics;
      g.clear();
      g.beginFill(0xfbf6ea, 1).drawRect(0, 0, fl.box.w, fl.box.h).endFill();
      g.lineStyle(id === active ? 3 : 1.5, id === active ? VERMILION : RULE, 1).drawRect(0, 0, fl.box.w, fl.box.h);
      g.lineStyle(0, 0, 0);
      hitBox(fl.s, 0, 0, fl.box.w, fl.box.h);
      const text = answers[id];
      fl.words.setText(text ? wrap(text, fl.box.w - 28, 24, fl.f.multiline ? 4 : 1) : '');
      fl.words.setColour(INK);
    }
  };

  // The platform text field, or the board.
  let input = null;
  if (!app.board)
    input = createBrowserTextInput({ canvas: game.canvas, logicalWidth: game.width, logicalHeight: game.height, onError: (e) => console.warn('verdict', e) });
  function focusField(id) {
    active = id;
    draw();
    if (!input) return;
    const fl = fields[id];
    app.editing = true;
    input.open({
      x: X + fl.box.x,
      y: Y + fl.box.y,
      width: fl.box.w,
      height: fl.box.h,
      value: answers[id],
      multiline: !!fl.f.multiline,
      maxLength: fl.f.multiline ? 120 : 20,
      fontFamily: `${app.type.families.song}, serif`,
      fontSize: 24,
      color: INK,
      backgroundColor: 0xfffdf6,
      padding: 12,
      label: fl.f.label[lang],
      locale: lang === 'zh' ? 'zh-CN' : 'en',
      onCommit(value) {
        answers[id] = value.trim();
        app.editing = false;
        st.verdict = { answers: { ...answers }, ok: false };
        app.save();
        draw();
      },
      onCancel() {
        app.editing = false;
        draw();
      }
    });
  }

  let board = null;
  if (app.board) {
    const area = { x: 34, y: H - 110 - boardH, w: W - 68, h: boardH - 10 };
    const tiles = [{ text: app.say('boardClear'), strong: true, back: true }, ...(lang === 'zh' ? [...v.board.zh] : v.board.en).map((t) => ({ text: t }))];
    board = buildBoard(app, panel, area, tiles, (t) => {
      if (t.back) answers[active] = lang === 'zh' ? [...answers[active]].slice(0, -1).join('') : answers[active].replace(/(^|,\s*)[^,]*$/, '');
      else answers[active] = lang === 'zh' ? answers[active] + t.text : answers[active] ? answers[active] + ', ' + t.text : t.text;
      draw();
    });
  }
  const boardTap = board && ((t) => board.tap(t));

  const result = type.label(panel, '', { size: 22, colour: VERMILION, middle: true });
  result.x = 34;
  result.y = H - 48;
  const submit = kit.button(panel, app.say('submit'), { x: W - 120, y: H - 50, w: 170, h: 54, primary: true, size: 26 }, () => send());
  const back = kit.button(panel, app.say('back'), { x: W - 310, y: H - 50, w: 150, h: 54, size: 24 }, () => close());
  function send() {
    input?.commit?.();
    const judged = submitVerdict(st, c, answers);
    app.save();
    if (judged.ok) {
      app.sound?.play('right');
      kit.stamp(panel, W - 110, 64, 96, '定谳');
      submit.setEnabled(false);
      game.after(game.reducedMotion ? 0.3 : 1.6, () => {
        close();
        app.onDone();
      });
    } else {
      app.sound?.play('wrong');
      result.setText(v.wrong[lang]);
    }
  }
  draw();
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    input?.dispose();
    app.editing = false;
    type.discard(root);
    scope.dispose();
    app.onClose?.();
  }
  return {
    close,
    send,
    focusField,
    /** For tests: write the answers directly, as a player would type them. */
    write: (given) => {
      Object.assign(answers, given);
      draw();
    },
    judge: () => judgeVerdict(c, answers),
    /** For tests: build each answer by tapping the board's tiles, as a mini game player would. */
    boardWrite: (given) => {
      if (!boardTap) return false;
      for (const [id, text] of Object.entries(given)) {
        active = id;
        answers[id] = '';
        for (const piece of lang === 'zh' ? [...text] : text.split(/,\s*/)) if (!boardTap(piece)) return false;
      }
      draw();
      return Object.keys(given).every((id) => answers[id] === given[id]);
    },
    focus: [
      ...Object.keys(fields).map((id) => ({ sprite: fields[id].s, ox: 0, oy: 0, w: fields[id].box.w, h: fields[id].box.h, activate: () => focusField(id) })),
      ...(board?.focus ?? []),
      back.focusRecord,
      submit.focusRecord
    ],
    root
  };
}

/** Break written words into at most `lines` lines that fit `width`, for drawing them back in the box. */
function wrap(text, width, size, lines) {
  const out = [];
  let line = '';
  for (const ch of text) {
    if (estimateWidth(line + ch, size) > width) {
      out.push(line);
      line = '';
      if (out.length === lines) break;
    }
    line += ch;
  }
  if (out.length < lines && line) out.push(line);
  return out.join('\n');
}
