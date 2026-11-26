// 图片：美术是 WebP，引擎的宽松图片路线（浏览器自己解码，PNG、JPEG、WebP 都行）把它们变成纹理，注册成引擎资源管理器里的
// 一种资源；同一张图只解码一次，最后一个租约释放时纹理才销毁。超过 2D 图片上限的背景会被等比缩到上限以内。
// Pictures. The art is WebP; the engine's lenient image route (decoded by the browser, so PNG, JPEG and WebP all work)
// turns it into textures, registered as a kind of asset in the engine's asset manager. A picture is decoded once and
// its texture is destroyed when its last lease goes; backgrounds above the 2D image limit are scaled down to it.
import { Bitmap, Sprite, createAssetRef, createAssetType, isTexture } from '@egret/engine';
import { createBrowserImageTextureProvider } from '@egret/engine/web/kit';

export function createPictures(game) {
  const picture = createAssetType('inquest-picture', isTexture);
  game.engine.assets.register(
    picture,
    createBrowserImageTextureProvider({
      readBytes: async (ref) => {
        const r = await fetch(ref.id);
        if (!r.ok) throw Error(`HTTP ${r.status} ${ref.id}`);
        return new Uint8Array(await r.arrayBuffer());
      }
    })
  );
  const failed = { count: 0 };
  /**
   * A picture centred at (x, y) in `layer`, `width` by `height` (one of them may be left out to keep the shape).
   * Resolves to its holder sprite, which is empty when the picture could not be had.
   */
  async function image(url, { layer, x = 0, y = 0, width, height, scope = game.scope }) {
    const holder = new Sprite();
    holder.x = x;
    holder.y = y;
    layer.addChild(holder);
    let lease;
    try {
      lease = await game.engine.assets.acquire(createAssetRef(picture, url));
    } catch (cause) {
      failed.count++;
      console.warn('picture', url, cause?.message ?? cause);
      return holder;
    }
    if (holder.isDisposed) {
      lease.release?.();
      return holder;
    }
    const bmp = scope.use(new Bitmap(lease));
    const own = { w: bmp.width, h: bmp.height };
    const sx = width ? width / own.w : height ? height / own.h : 1;
    const sy = height ? height / own.h : sx;
    bmp.scaleX = sx;
    bmp.scaleY = sy;
    bmp.x = (-own.w * sx) / 2;
    bmp.y = (-own.h * sy) / 2;
    holder.addChild(bmp);
    return holder;
  }
  /**
   * Load pictures together as one engine asset group, four at a time, and hold them while `scope` lives: a case's
   * pictures are fetched and decoded once when it opens, and each `image` of them after that is at hand.
   */
  async function group(urls, scope) {
    const held = game.engine.createAssetGroup(scope, urls.map((url) => createAssetRef(picture, url)), { concurrency: 4 });
    try {
      await held.ready;
      return true;
    } catch (cause) {
      // One picture that cannot be had fails the group; each is then asked for alone, and only that one is missing.
      console.warn('pictures', cause?.message ?? cause);
      return false;
    }
  }
  return { image, group, failed };
}
