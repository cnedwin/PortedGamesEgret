// 笔录：玩家自己的推想，随存档留着。用引擎的托管界面和原生文字编辑：平时由 CanvasKit 按段落画出已写下的字，
// 点一下就在原处换成浏览器自己的多行文本框（输入法、选区、撤销都由平台负责），写完再换回段落。
// 字体集合用不了的生僻字换成方框，免得段落排版拒绝整段文字。
// The notes: the player's own thoughts, kept with the save. Built on the engine's managed UI and native text editing:
// at rest the text is drawn as a CanvasKit paragraph; a tap swaps in the browser's own multi-line field in place
// (input methods, selection and undo are the platform's), and finishing swaps the paragraph back. Characters the font
// set cannot draw become squares, so the layout never refuses the whole text.
import { Sprite } from '@egret/engine';
import { createUiRoot } from '@egret/engine/ui';
import { createUiTextEditor } from '@egret/engine/ui/editing';
import { createBrowserTextEditor } from '@egret/engine/web/editing';
import { KINDS } from '../sim/kinds.mjs';
import { WORDS } from '../words.mjs';
import { buildBoard } from './board.mjs';
import { INK } from './type.mjs';
import { FAINT, hitBox } from './ui.mjs';

/**
 * Open the notes of the current case over `layer`. `app` gives game, type, kit, lang(), say(key), st, save(),
 * onClose(). Resolves to { close, edit, finish, value() }.
 */
export async function openNotes(layer, app) {
  if (app.board || !app.type.cache) return openBoardNotes(layer, app);
  const { game, type, kit } = app;
  const st = app.st;
  const portrait = game.height > game.width;
  const root = new Sprite();
  layer.addChild(root);
  kit.veil(root, 0.45, () => close());
  const W = portrait ? game.width - 30 : 760,
    H = portrait ? Math.round(game.height * 0.62) : game.height - 110;
  const X = (game.width - W) / 2,
    Y = portrait ? 40 : 55;
  const panel = kit.panel(root, X, Y, W, H);
  hitBox(panel, 0, 0, W, H);
  game.onTap(panel, () => {});
  const head = type.label(panel, app.say('notes'), { size: 34, brush: true });
  head.x = 30;
  head.y = 24;
  const tip = type.label(panel, app.say('notesEmpty'), { size: 18, colour: FAINT });
  tip.x = 30;
  tip.y = 74;
  const editBtn = kit.button(panel, app.say('edit'), { x: W - 210, y: 46, w: 120, h: 46, size: 22 }, () => edit());
  const closeBtn = kit.button(panel, app.say('close'), { x: W - 78, y: 46, w: 120, h: 46, size: 22, primary: true }, () => close());

  // The editor lives in its own scope and UI root, placed over the panel's writing area in stage units.
  const scope = game.engine.createScope();
  const area = { x: X + 28, y: Y + 108, w: W - 56, h: H - 136 };
  const style = {
    fontSet: app.type.fonts.key,
    fontFamilies: [app.type.families.song],
    fontSize: portrait ? 22 : 24,
    lineHeight: portrait ? 36 : 40,
    locale: app.lang(),
    direction: 'ltr',
    fillColor: INK,
    backgroundColor: 0xfbf6ea
  };
  const editor = createUiTextEditor({
    engine: game.engine,
    scope,
    cache: app.type.cache,
    mode: 'multiline',
    value: st.notes,
    maxLength: 2000,
    style,
    padding: 14,
    minHeight: area.h - 28,
    onChange: (change) => {
      if (change.kind !== 'value') return;
      const kept = app.type.keepDrawable(change.value);
      if (kept !== change.value) editor.setValue(kept);
      st.notes = kept;
      app.save();
      void publish();
    }
  });
  const ui = createUiRoot({
    engine: game.engine,
    scope,
    id: 'notes',
    viewport: { width: area.w, height: area.h },
    origin: { x: area.x, y: area.y },
    density: app.type.density(),
    tree: { kind: 'column', id: 'notes-column', explicitWidth: area.w, children: [{ kind: 'leaf', id: 'notes-text', content: editor.content }] }
  });
  let binding = null,
    busy = Promise.resolve();
  async function publish() {
    busy = busy.then(async () => {
      for (let i = 0; i < 40; i++) {
        const prep = await ui.prepare();
        if (prep.status === 'pending') {
          await new Promise((r) => setTimeout(r, 0));
          continue;
        }
        ui.commit(prep);
        binding?.sync();
        game.invalidate?.();
        return;
      }
    });
    return busy;
  }
  await publish();
  binding = createBrowserTextEditor({
    editor,
    root: ui,
    target: { kind: 'leaf', id: 'notes-text' },
    canvas: game.canvas,
    fonts: app.type.fonts,
    logicalWidth: game.width,
    logicalHeight: game.height,
    label: app.say('notes'),
    onInvalidate() {},
    onError: (cause) => console.warn('notes', cause)
  });
  // A tap on the writing area starts editing where it landed.
  const hit = new Sprite();
  hitBox(hit, area.x, area.y, area.w, area.h);
  root.addChild(hit);
  game.onTap(hit, () => edit({ x: game.pointer.x, y: game.pointer.y }));

  function edit(at) {
    if (closed || !binding) return;
    app.editing = true;
    binding.activate(at ?? { x: area.x + area.w - 20, y: area.y + area.h - 20 });
    app.sound?.play('brush');
  }
  function finish() {
    binding?.finish();
    app.editing = false;
  }
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    finish();
    void busy.then(() => {
      binding?.dispose();
      ui.dispose();
      scope.dispose();
    });
    type.discard(root);
    app.onClose?.();
  }
  return { close, edit, finish, value: () => editor.snapshot().value, focus: [editBtn.focusRecord, closeBtn.focusRecord], root };
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
