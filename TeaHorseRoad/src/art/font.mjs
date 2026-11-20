// 路牌字体：tools/make-glyphs.py 按笔画画出的字形，交给引擎的 Font3D。字形在第一次用到时才解出，只收路牌用到的字。
// The sign font: glyphs drawn stroke by stroke by tools/make-glyphs.py, handed to the engine's Font3D. Only the
// characters the signs use are drawn.
import { Font3D, createTextGeometry3D } from '@egret/engine/world3d';
import glyphs from './glyphs.json' with { type: 'json' };

const table = new Map(Object.entries(glyphs.glyphs).map(([code, glyph]) => [Number(code), glyph]));

/** The font itself: metrics from the file, glyphs looked up by code point. */
export const SIGN_FONT = new Font3D({
  unitsPerEm: glyphs.unitsPerEm,
  ascender: glyphs.ascender,
  descender: glyphs.descender,
  lineHeight: glyphs.lineHeight,
  familyName: glyphs.familyName,
  glyph: (codePoint) => table.get(codePoint)
});

/** Raised lettering for a sign: `size` is the height of a character in metres, `depth` how far it stands out. */
export function signText(text, { size = 0.5, depth = 0.04, align = 'center' } = {}) {
  return createTextGeometry3D(text, SIGN_FONT, { size, depth, align, curveSegments: 2 });
}
