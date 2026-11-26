import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PNG } from '../vendor/egret/third-party/pngjs/lib/png.js';
import { HUD_SKIN, HUD_SKIN_SIZE } from '../src/hud-skin-layout.mjs';

test('shared HUD art cells admit valid, isolated bitmap source rectangles', () => {
  const image = PNG.sync.read(readFileSync(new URL('../assets/ui/hud-skin.png', import.meta.url)));
  assert.deepEqual({ width:image.width, height:image.height }, HUD_SKIN_SIZE);
  const cells = Object.entries(HUD_SKIN);
  const alpha = (x,y) => image.data[(y*image.width+x)*4+3];
  for (const [name, r] of cells) {
    assert(r.x>=2 && r.y>=2 && r.x+r.width<image.width && r.y+r.height<image.height, name);
    assert(alpha(r.x+Math.floor(r.width/2),r.y+Math.floor(r.height/2))>200, name+' centre');
    // Transparent gutters keep adjacent regions from bleeding into a scaled Bitmap.
    assert.equal(alpha(r.x-1,r.y-1),0,name+' gutter');
    for (const [other, s] of cells) if(other!==name)
      assert(r.x+r.width<=s.x || s.x+s.width<=r.x || r.y+r.height<=s.y || s.y+s.height<=r.y,name+' overlaps '+other);
  }
});
