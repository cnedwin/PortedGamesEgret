// Scene annotations share Egret's native marker layer and the Play clock.
// In the live game markers never create HTML or intercept a pointer. The
// optional DOM branch supports the standalone realm model inspection tool.
import { Sprite } from '@egret/engine';
import { createBitmapText } from '@egret/engine/bitmapfont';

const PAPER = 0xffefcf, INK = 0x21382e, GOLD = 0xd7b477;
const FAR = [100000, 100000, 100000];
const FLOAT_COLORS = { dealt: 0xffffff, taken: 0xff8d7a, crit: 0xffd84a, heal: 0x8be29a, miss: 0xcfd6de };
const fontWidth = (text, size) => [...text].reduce((w, c) => w + (c.codePointAt(0) > 127 ? size : size * .60), 0);

export function makeSceneMarkers(stage, camera, toolLayer, backend) {
  const game = stage.game;
  if (!game) {
    if (!toolLayer) return null;
    const native = backend.createScreenMarkers3D({ container: toolLayer, camera });
    return {
      add(value, target, options = {}) {
        const element = document.createElement('span');
        element.className = 'realm-tag';
        element.style.translate = '-50% -100%';
        const marker = native.add(element, { target });
        let shown = true;
        return {
          set(text, opts = {}) {
            element.textContent = text + (opts.detail && !opts.compact ? ' · ' + opts.detail : '');
            element.classList.toggle('is-active', !!opts.selected);
            element.classList.toggle('is-small', !!opts.compact);
          },
          // The standalone model tool only has map markers.
          setVisible(yes) { shown = !!yes; element.style.visibility = shown ? '' : 'hidden'; },
          retarget(point) { marker.retarget(point); },
          dispose() { marker.dispose(); },
          setAlpha(alpha) { element.style.opacity = String(alpha); },
          hit() { return false; }
        };
      },
      update() { native.update(); },
      dispose() { native.dispose(); }
    };
  }
  const layer = backend.createOverlayScreenMarkers3D({
    overlay: { game: game.browser, canvas: game.canvas },
    sceneCanvas: stage.canvas, camera
  });
  const entries = new Set();
  let ordered = false;
  const scaleOf = () => {
    const screen = game.browser.screen, box = game.canvas.getBoundingClientRect();
    return box.width > 0 ? screen.width / box.width : 1;
  };
  return {
    add(initial, target = FAR, options = {}) {
      const { kind = 'tag', anchorY = kind === 'float' ? .5 : 1 } = options;
      const art = new Sprite(), plate = art.addChild(new Sprite());
      let glyph, label;
      if (kind === 'float' && stage.markerFont) {
        glyph = createBitmapText({font: stage.markerFont.font, pages: stage.markerFont.pages, text: '0', color: PAPER});
        art.addChild(glyph.display);
      } else {
        label = game.text('', { layer: art, x: 0, y: 0, size: 12, color: PAPER, bold: true, align: 'center', baseline: 'middle' });
      }
      const marker = layer.add(art, { target, area: 'safe', margin: 2, anchor: { x: .5, y: anchorY } });
      if (!ordered) {
        // The engine's marker root is a direct Stage child. Place the entire
        // pointer-free layer below Play's world and UI so cards cover labels.
        const root = art.parent?.parent, displayStage = game.browser.stage;
        if (root?.parent === displayStage) displayStage.setChildIndex(root, 0);
        ordered = true;
      }
      let value = initial, settings = {...options}, signature = '', shown = true, width = 0, height = 0, layoutScale = 0;
      let words = '', textSize = 12;
      const sync = (s) => {
        if (!shown) return;
        const translated = (stage.translate ?? String)(String(value ?? ''));
        const detail = settings.detail && !settings.compact ? (stage.translate ?? String)(String(settings.detail)) : '';
        words = String(translated ?? '') + (detail ? ' · ' + detail : '');
        textSize = kind === 'float' ? (settings.variant === 'crit' ? 21 : settings.variant === 'miss' ? 14 : 17) : kind === 'plot' ? 17 : settings.compact ? 12 : 13;
        const style = [words, textSize, settings.selected, settings.compact, settings.accent, settings.variant].join('|');
        if (signature !== style) {
          signature = style;
          const color = kind === 'float' ? FLOAT_COLORS[settings.variant] ?? PAPER : settings.selected ? 0x322a1c : PAPER;
          if (label) { label.text = words; label.size = textSize; label.color = color; }
          if (glyph) {
            glyph.text = words;
            glyph.color = color;
            const node = glyph.display, ratio = textSize / stage.markerFont.font.size;
            node.scaleX = node.scaleY = ratio;
            const bounds = node.getBounds();
            node.x = -(bounds.x + bounds.width / 2) * ratio;
            node.y = -(bounds.y + bounds.height / 2) * ratio;
          }
          width = Math.max(kind === 'plot' ? 25 : 18, Math.ceil(fontWidth(words, textSize) + (kind === 'float' ? 1 : 14)));
          height = kind === 'float' ? textSize + 4 : kind === 'plot' ? 25 : 23;
          if (kind !== 'float') {
            const background = settings.selected ? 0xe4c789 : settings.variant === 'enemy' ? 0x613b31 : INK;
            const g = plate.graphics;
            g.clear().lineStyle(1, settings.selected ? 0xf7e7b9 : GOLD, .9).beginFill(background, .92).drawRoundRect(-width / 2, -height / 2, width, height, 4, 4).endFill();
            if (settings.accent !== undefined && !settings.selected) g.beginFill(settings.accent).drawRect(-width / 2 + 3, -height / 2 + 4, 3, height - 8).endFill();
          }
        }
        if (s !== layoutScale) { layoutScale = s; art.scaleX = art.scaleY = s; }
      };
      const entry = {
        get visible() { return marker.visible; },
        get point() { return marker.point; },
        set(text, opts = {}) { value = text; Object.assign(settings, opts); },
        setVisible(next) { next = !!next; if (next !== shown) { shown = next; marker.setVisible(next); } },
        retarget(point) { marker.retarget(point); },
        setAlpha(alpha) { if (art.alpha !== alpha) art.alpha = alpha; },
        hit(cssX, cssY) {
          if (!marker.visible || kind === 'float') return false;
          const overlayRect = game.canvas.getBoundingClientRect(), sceneRect = stage.canvas.getBoundingClientRect();
          const css = { x: marker.point.x/layoutScale + overlayRect.left - sceneRect.left,
            y: marker.point.y/layoutScale + overlayRect.top - sceneRect.top };
          // The world is the tap surface. Labels reserve a generous 44px
          // target for selecting a point, and remain entirely pointer-free.
          const w = Math.max(width, 44), h = Math.max(height, 44);
          return Math.abs(cssX-css.x) <= w/2 && cssY >= css.y-h*anchorY && cssY <= css.y+h*(1-anchorY);
        },
        dispose() {
          entries.delete(entry); marker.dispose(); glyph?.dispose(); art.dispose();
        },
        sync
      };
      entries.add(entry);
      sync(scaleOf());
      return entry;
    },
    update() {
      const scale = scaleOf();
      for (const entry of entries) entry.sync(scale);
      layer.update();
    },
    dispose() {
      for (const entry of [...entries]) entry.dispose();
      layer.dispose();
    }
  };
}
