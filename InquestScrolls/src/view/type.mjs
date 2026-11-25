// 文字：字体从资源清单载入（引擎的字体集合加载器），段落交给 CanvasKit 排版（卷宗、证物、序言这些长文都走这里，
// 并用文字几何找出每个词、每个空的位置）；短标签用浏览器画布文字，字体是同一份字体文件注册的网页字体。
// 一个引擎资源管理器只能有一个段落缓存，所以全游戏共用这里这一个。小游戏没有 CanvasKit，段落改由 plainText.mjs 用标签拼成，几何相同。
// Text. Fonts come from a resource manifest through the engine's font-set loader. Paragraphs are laid out by CanvasKit
// (the dossier, the evidence, the prologue: every long text goes here, and its text geometry finds where each word and
// each blank sits). Short labels are drawn as browser canvas text in web fonts made from the same font files. One
// engine asset manager may hold only one paragraph cache, so the whole game shares the one made here.
// A mini game has no CanvasKit: there paragraphs are put together from labels by plainText.mjs, with the same geometry.
import { admitResourceManifest } from '@egret/contracts/resources';
import { createParagraph, createParagraphCache } from '@egret/engine/paragraph';
import { createCanvasKitFontSetProvider } from '@egret/engine/web/paragraph';
import { createManifestFontContentLoader } from '@egret/engine/web/resources';
import { createBrowserEditorFontProvider } from '@egret/engine/web/editing';
import { Sprite } from '@egret/engine';
import { createPlainParagraphs } from './plainText.mjs';

/** The CanvasKit build this game carries in runtime/canvaskit (see its README). */
export const CANVASKIT_BUILD = 'skia-e2def78-sheen-cfe430e-icu78.2-32-64-r0-line-bidi-r1-layout-r1';

export const INK = 0x2a2118;
export const SILK = 0xece0c4;
export const PAPER = 0xf6eedb;
export const VERMILION = 0xa3342a;

const base = new URL('../../assets/fonts/', import.meta.url);

/**
 * Load the fonts and make the paragraph cache. `game` is the running play game. With `plain` (a WeChat mini game, where
 * there is no CanvasKit and no text field), paragraphs are put together from canvas text labels instead. Resolves to
 * the type system the view draws with.
 */
export async function openType(game, { plain = false } = {}) {
  const config = await (await fetch(new URL('fonts.json', base))).json();
  const song = config.families.song,
    brush = config.families.brush;
  // Labels: the same font files as page fonts under our own names. A mini game has no page fonts; its labels fall
  // back to the system's own Chinese face.
  if (typeof FontFace === 'function' && typeof document !== 'undefined' && document.fonts?.add)
    await Promise.all(
      Object.entries(config.blobs).map(async ([id, file]) => {
        const face = new FontFace(config.families[id], `url(${new URL(file, base).href})`);
        document.fonts.add(await face.load());
      })
    ).catch(() => {});
  const engine = game.engine;
  let cache = null,
    fonts = null,
    paragraphs = null,
    editorFonts = null,
    transport = null,
    canvasKit = null,
    chars = null;
  if (!plain) {
    const manifestBytes = new Uint8Array(await (await fetch(new URL(config.manifestPath, base))).arrayBuffer());
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', manifestBytes)), (n) => n.toString(16).padStart(2, '0')).join('');
    if (digest !== config.manifestSha256) throw Error('INQUEST_FONT_MANIFEST_CHANGED');
    const admitted = admitResourceManifest(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes)));
    if (!admitted.ok) throw Error('INQUEST_FONT_MANIFEST_REFUSED');
    canvasKit = await globalThis.CanvasKitInit({ locateFile: (file) => new URL('../../runtime/canvaskit/' + file, import.meta.url).href });
    transport = createManifestFontContentLoader(engine, admitted.value, { baseUrl: base.href, deadlineMs: 30000 });
    paragraphs = createCanvasKitFontSetProvider({ canvasKit, buildIdentity: CANVASKIT_BUILD });
    cache = createParagraphCache(engine.assets, { provider: paragraphs, maxImageBytes: 48 * 1024 * 1024 });
    // The editor font provider registers the same bytes as page fonts for the native note editor, and its set is
    // also the paragraph font set, so one load serves both.
    editorFonts = createBrowserEditorFontProvider({ engine, scope: game.scope, paragraphProvider: paragraphs });
    fonts = await editorFonts.load(engine.createScope(), transport.loader, config.roots);
    chars = new Set(await (await fetch(new URL('song-chars.txt', base))).text());
  }

  // Words measured in a label's own font, for laying out boards and plain paragraphs.
  const measurer = document.createElement('canvas').getContext('2d');
  const measure = (text, size, heading = false) => {
    const family = heading && /[\u3400-\u9fff]/.test(text) ? brush : song;
    measurer.font = `normal 400 ${size}px "${family}"`;
    return measurer.measureText(text).width;
  };

  /** Pixels per stage unit, so text is drawn sharp at the canvas's real size. */
  const density = () => {
    const c = game.canvas;
    const d = c && game.width ? c.width / game.width : 1;
    return Math.max(1, Math.min(3, Math.round(d * 4) / 4));
  };

  /**
   * A paragraph in a holder sprite. `opts`: text, width, size, colour, brush (heading face), align, lineHeight,
   * runs (coloured ranges), locale. Returns { holder, node, ready } where ready resolves to the metrics; `set(opts)`
   * lays it out again.
   */
  function richParagraph(scope, opts) {
    const holder = new Sprite();
    const node = createParagraph(engine, scope, cache);
    holder.addChild(node);
    let last;
    const set = (o) => {
      last = { ...last, ...o };
      const families = last.brush ? [brush, song] : [song];
      node.setRequest({
        text: last.text || ' ',
        width: Math.max(8, last.width),
        fontFamilies: families,
        fontSet: fonts.key,
        fontSize: last.size ?? 24,
        ...(last.lineHeight ? { lineHeight: last.lineHeight } : {}),
        locale: last.locale ?? 'zh',
        direction: 'ltr',
        fillColor: last.colour ?? INK,
        density: density(),
        textGeometry: true,
        ...(last.align ? { textAlign: last.align } : {}),
        ...(last.runs?.length ? { runs: last.runs } : {})
      });
      // A newer request replaces an older one still being laid out; the older promise just gives way.
      return node.prepare().catch((cause) => {
        if (cause?.code === 'PARAGRAPH_STALE' || String(cause?.message).includes('PARAGRAPH_STALE')) return null;
        throw cause;
      });
    };
    const ready = set(opts);
    return { holder, node, ready, set, geometry: () => node.getStatus().geometry };
  }

  /**
   * A one-line label in a holder sprite, drawn by the browser in a page font. The holder is placed at once; the words
   * appear when made. `opts`: size, colour, brush, bold, align ('left' | 'center' | 'right'), middle (centre on y).
   */
  function label(parent, text, opts = {}) {
    const holder = new Sprite();
    parent?.addChild(holder);
    const state = { text: String(text) || ' ', size: opts.size ?? 22, colour: opts.colour ?? INK, align: opts.align ?? 'left', made: null, gone: false };
    const settle = () => {
      const d = state.made?.display;
      if (!d || state.gone || d.isDisposed || holder.isDisposed) return;
      d.x = state.align === 'center' ? -d.width / 2 : state.align === 'right' ? -d.width : 0;
      d.y = opts.middle ? -d.height / 2 : 0;
      d.visible = true;
    };
    const making = game.browser
      .createLabel({ text: state.text, fontFamily: opts.brush && /[\u3400-\u9fff]/.test(state.text) ? brush : song, fontSize: state.size, color: state.colour, fontWeight: opts.bold ? 700 : 400, locale: opts.locale ?? 'zh' })
      .then((made) => {
        if (state.gone || holder.isDisposed) return made.dispose();
        state.made = made;
        made.display.visible = false;
        holder.addChild(made.display);
        if (made.text !== state.text) made.text = state.text;
        made.set({ color: state.colour, fontSize: state.size });
        made.ready.then(settle, () => {});
      }, () => {});
    holder.setText = (t) => {
      state.text = String(t) || ' ';
      if (state.made) {
        state.made.text = state.text;
        state.made.ready.then(settle, () => {});
      }
    };
    holder.setColour = (c) => {
      state.colour = c;
      state.made?.set({ color: c });
    };
    holder.dropLabel = () => {
      state.gone = true;
      state.made?.dispose();
    };
    holder.labelReady = () => making.then(() => state.made?.ready).catch(() => {});
    holder.textWidth = () => state.made?.display.width ?? 0;
    holder.text = () => state.text.trim();
    return holder;
  }

  /**
   * Take a subtree off the stage for good. Labels made by `label` hold a raster in the browser's label cache, which
   * removing their sprite alone does not give back, so each is let go first.
   */
  function discard(node) {
    if (!node || node.isDisposed) return;
    const walk = (n) => {
      n.dropLabel?.();
      n.dropSemantic?.();
      for (let i = 0; i < (n.numChildren ?? 0); i++) walk(n.getChildAt(i));
    };
    walk(node);
    game.remove(node);
  }

  /** Characters the body face cannot draw become a square, so notes never hold a glyph the layout refuses. */
  const keepDrawable = (text) => (chars ? [...text].map((ch) => (ch === '\n' || chars.has(ch) ? ch : '□')).join('') : text);

  const paragraph = plain ? createPlainParagraphs({ label, measure, discard, ink: INK }) : richParagraph;
  return { plain, cache, fonts, paragraphs, editorFonts, transport, paragraph, label, discard, measure, density, families: { song, brush }, keepDrawable, canvasKit };
}
