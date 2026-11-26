// 笔录随案件自动存档。宣纸用引擎段落绘制，编辑时在原处打开浏览器的多行输入框。
// Notes are autosaved per case. An engine paragraph draws the paper, and a native multiline field opens over it.
import { Sprite } from '@egret/engine';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { createBrowserTextInput } from '@egret/engine/web/text-input';
import { KINDS } from '../sim/kinds.mjs';
import { WORDS } from '../words.mjs';
import { buildBoard } from './board.mjs';
import { INK } from './type.mjs';
import { FAINT, hitBox } from './ui.mjs';

export function openNotes(layer, app) {
  const { game, type, kit, st } = app;
  if (app.board || !type.cache) return openBoardNotes(layer, app);
  const portrait = game.height > game.width;
  const touch = globalThis.matchMedia?.('(pointer: coarse)').matches;
  const fontSize = portrait ? 22 : 24;
  const lineHeight = portrait ? 36 : 40;
  const paperColor = 0xfbf6ea;
  const padding = 14;
  let closed = false;

  const input = createBrowserTextInput({
    canvas: game.canvas,
    logicalWidth: game.width,
    logicalHeight: game.height,
    onError: (cause) => console.warn('notes', cause)
  });
  const root = new Sprite();
  layer.addChild(root);
  kit.veil(root, 0.45, close);
  const W = portrait ? game.width - 30 : 760,
    H = portrait ? Math.round(game.height * 0.62) : game.height - 110;
  const X = (game.width - W) / 2,
    Y = portrait ? 40 : 55;
  const panel = kit.panel(root, X, Y, W, H);
  game.onTap(panel, () => {});
  const head = type.label(panel, app.say('notes'), { size: 34, brush: true });
  head.x = 30;
  head.y = 24;

  const buttonHeight = touch ? (portrait ? 84 : 100) : 46;
  const buttonY = touch ? 12 + buttonHeight / 2 : 46;
  const tip = type.label(panel, app.say('notesEmpty'), { size: 18, colour: FAINT });
  tip.x = 30;
  tip.y = touch ? buttonY + buttonHeight / 2 + 8 : 74;
  const editBtn = kit.button(panel, app.say('edit'), { x: W - 210, y: buttonY, w: 120, h: buttonHeight, size: 22 }, edit);
  const closeBtn = kit.button(panel, app.say('close'), { x: W - 78, y: buttonY, w: 120, h: buttonHeight, size: 22, primary: true }, close);

  const doc = game.canvas.ownerDocument;
  const viewport = doc.defaultView.visualViewport;
  let closePress = null;
  // Preserve a tap on Close when native input blurs or moves the viewport before the finger lifts.
  function rememberClose(event) {
    if (event.pointerType !== 'touch' || !event.isPrimary || event.target !== game.canvas || input.getSnapshot().state !== 'open') return;
    const r = game.canvas.getBoundingClientRect();
    const b = semanticBoundsOf(closeBtn);
    const x = (event.clientX - r.left) * game.width / r.width;
    const y = (event.clientY - r.top) * game.height / r.height;
    if (x < b.x || x > b.x + b.width || y < b.y || y > b.y + b.height) return;
    closePress = { id: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.offsetLeft, top: viewport.offsetTop };
  }
  function releaseClose(event) {
    if (event.pointerId !== closePress?.id) return;
    const press = closePress;
    closePress = null;
    const dx = viewport.offsetLeft - press.left, dy = viewport.offsetTop - press.top;
    if (event.type === 'pointerup' && Math.hypot(event.clientX - press.x - dx, event.clientY - press.y - dy) <= 12) {
      queueMicrotask(close);
    }
  }
  if (viewport) {
    doc.addEventListener('pointerdown', rememberClose, true);
    doc.addEventListener('pointerup', releaseClose, true);
    doc.addEventListener('pointercancel', releaseClose, true);
  }

  const x = 28, y = tip.y + 34, width = W - 2 * x, height = H - y - 28;
  const paper = new Sprite();
  paper.x = x;
  paper.y = y;
  paper.graphics.beginFill(paperColor).drawRect(0, 0, width, height).endFill();
  paper.mask = { x: 0, y: 0, width, height };
  panel.addChild(paper);
  const scope = game.engine.createScope();
  const notes = type.paragraph(scope, {
    text: type.keepDrawable(st.notes),
    width: width - padding * 2,
    size: fontSize,
    lineHeight,
    locale: app.lang(),
    colour: INK
  });
  notes.holder.x = padding;
  notes.holder.y = padding;
  paper.addChild(notes.holder);
  game.onTap(paper, edit);
  function reportLayout(cause) {
    if (!closed) console.warn('notes layout', cause);
  }
  void notes.ready.catch(reportLayout);

  function save(value) {
    if (value === st.notes) return;
    st.notes = value;
    app.save();
  }
  function redraw() {
    if (!closed) void notes.set({ text: type.keepDrawable(st.notes) }).catch(reportLayout);
  }
  function edit() {
    if (closed || input.getSnapshot().state === 'open') return;
    input.open({
      x: X + x, y: Y + y, width, height,
      value: st.notes,
      multiline: true,
      maxLength: 2000,
      fontFamily: `${type.families.song}, serif`,
      fontSize,
      lineHeight,
      color: INK,
      backgroundColor: paperColor,
      padding,
      label: app.say('notes'),
      locale: app.lang() === 'zh' ? 'zh-CN' : 'en',
      onChange({ value, composing }) {
        if (!composing) save(value);
      },
      onCommit(value) {
        save(value);
        redraw();
      },
      onCancel: redraw
    });
    app.sound?.play('brush');
  }
  function finish() {
    input.commit();
  }
  function close() {
    if (closed) return;
    closed = true;
    if (viewport) {
      doc.removeEventListener('pointerdown', rememberClose, true);
      doc.removeEventListener('pointerup', releaseClose, true);
      doc.removeEventListener('pointercancel', releaseClose, true);
    }
    finish();
    input.dispose();
    type.discard(root);
    scope.dispose();
    app.onClose?.();
  }
  return { close, edit, finish, value: () => st.notes, focus: [editBtn.focusRecord, closeBtn.focusRecord], root };
}

/**
 * The notes where there is no text field (a mini game): the written notes above, a board of the case's collected
 * words and a few marks below. Each tap adds to the notes; they are kept with the save as typed notes are.
 */
function openBoardNotes(layer, app) {
  const { game, type, kit } = app;
  const st = app.st,
    lang = app.lang(),
    c = app.case;
  const portrait = game.height > game.width;
  const root = new Sprite();
  layer.addChild(root);
  kit.veil(root, 0.45, () => close());
  const W = portrait ? game.width - 30 : 900,
    H = portrait ? Math.round(game.height * 0.8) : game.height - 80;
  const X = (game.width - W) / 2,
    Y = portrait ? 40 : 40;
  const panel = kit.panel(root, X, Y, W, H);
  hitBox(panel, 0, 0, W, H);
  game.onTap(panel, () => {});
  const head = type.label(panel, app.say('notes'), { size: 34, brush: true });
  head.x = 30;
  head.y = 24;
  const tip = type.label(panel, app.say('notesBoard'), { size: 18, colour: FAINT });
  tip.x = 30;
  tip.y = 74;
  const closeBtn = kit.button(panel, app.say('close'), { x: W - 78, y: 46, w: 120, h: 46, size: 22, primary: true }, () => close());
  // The written notes, the newest lines kept in view.
  const textArea = { x: 28, y: 108, w: W - 56, h: Math.round((H - 130) * 0.36) };
  const paper = new Sprite();
  paper.x = textArea.x;
  paper.y = textArea.y;
  panel.addChild(paper);
  paper.graphics.beginFill(0xfbf6ea, 1).drawRect(0, 0, textArea.w, textArea.h).endFill();
  paper.graphics.lineStyle(1, 0xb9a57f, 0.8).drawRect(0, 0, textArea.w, textArea.h);
  paper.graphics.lineStyle(0, 0, 0);
  const clip = new Sprite();
  paper.addChild(clip);
  clip.mask = { x: 0, y: 0, width: textArea.w, height: textArea.h };
  const scope = game.engine.createScope();
  const size = portrait ? 21 : 22;
  const para = type.paragraph(scope, { text: st.notes || ' ', width: textArea.w - 28, size, lineHeight: Math.round(size * 1.6), locale: lang, colour: INK });
  para.holder.x = 14;
  para.holder.y = 10;
  clip.addChild(para.holder);
  const show = async () => {
    const m = await para.set({ text: st.notes || ' ' });
    if (m && !para.holder.isDisposed) para.holder.y = Math.min(10, textArea.h - 10 - m.height);
  };
  void para.ready.then((m) => m && (para.holder.y = Math.min(10, textArea.h - 10 - m.height)));
  // The board: a new line, one back, the marks, then the words found in this case in the colours of their kinds.
  const marks = WORDS.notesMarks[lang];
  const tiles = [
    { text: app.say('boardNewline'), strong: true, newline: true },
    { text: app.say('boardClear'), strong: true, back: true },
    ...marks.map((m) => ({ text: m })),
    ...st.found.map((w) => ({ text: c.words[w][lang], colour: KINDS[c.words[w].kind].colour }))
  ];
  const boardArea = { x: 28, y: textArea.y + textArea.h + 16, w: W - 56, h: H - (textArea.y + textArea.h + 16) - 20 };
  const board = buildBoard(app, panel, boardArea, tiles, (t) => {
    let notes = st.notes;
    if (t.back) notes = lang === 'zh' ? [...notes].slice(0, -1).join('') : notes.replace(/\s*\S+\s*$|\n$/, '');
    else if (t.newline) notes += '\n';
    else notes += lang === 'zh' || !notes || notes.endsWith('\n') ? t.text : ' ' + t.text;
    st.notes = notes.slice(-2000);
    app.save();
    void show();
  });
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    type.discard(root);
    scope.dispose();
    app.onClose?.();
  }
  return {
    close,
    edit: () => {},
    finish: () => {},
    value: () => st.notes,
    /** For tests: tap the board's tiles with these words, in order. */
    tap: (...texts) => texts.every((t) => board.tap(t)),
    focus: [...board.focus, closeBtn.focusRecord],
    root
  };
}
