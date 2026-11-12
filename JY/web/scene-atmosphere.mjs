import { Bitmap, createAssetRef, createAssetType, createImageData2D, createSharedMaterial2D, createTexture, isTexture } from '@egret/engine';

const gradients = {
  shadow: { width: 26, height: 12, stops: [[0, 'rgba(22,16,12,0.48)'], [0.45, 'rgba(22,16,12,0.28)'], [1, 'rgba(22,16,12,0)']] },
  light: { width: 192, height: 128, stops: [[0, 'rgba(255,196,112,0.14)'], [0.38, 'rgba(255,196,112,0.08)'], [1, 'rgba(255,196,112,0)']] },
};

function gradientTexture({ width, height, stops }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.scale(width / 2, height / 2);
  const fill = context.createRadialGradient(1, 1, 0, 1, 1, 1);
  for (const [offset, color] of stops) fill.addColorStop(offset, color);
  context.fillStyle = fill;
  context.fillRect(0, 0, 2, 2);
  const pixels = new Uint8Array(context.getImageData(0, 0, width, height).data.buffer);
  return createTexture(createImageData2D({ width, height, pixels }));
}

export async function createSceneAtmosphere({ engine, scope, root, project, scale, outputAlpha = 'opaque' }) {
  const type = createAssetType('home-atmosphere', isTexture);
  engine.assets.register(type, {
    async load({ id }) { return gradientTexture(gradients[id]); },
    dispose(texture) { texture.dispose(); },
  });
  const assets = engine.createAssetGroup(scope, ['shadow', 'light'].map(id => createAssetRef(type, id)));
  const [shadowLease, lightLease] = await assets.ready;
  const shadow = scope.use(new Bitmap(shadowLease));
  shadow.scaleX = shadow.scaleY = scale;
  shadow.sharedMaterial = createSharedMaterial2D({ filter: 'linear' });

  const light = root.addChild(scope.use(new Bitmap(lightLease)));
  const [lightX, lightY] = project(18.5, 19.5);
  light.scaleX = light.scaleY = scale;
  light.x = Math.round(lightX - light.naturalWidth * scale / 2);
  light.y = Math.round(lightY - light.naturalHeight * scale / 2);
  light.sharedMaterial = createSharedMaterial2D({ blend: outputAlpha === 'opaque' ? 'add-preserve' : 'add-accumulate', filter: 'linear' });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  return {
    shadow,
    light,
    positionShadow(x, y) {
      shadow.x = Math.round(x - shadow.naturalWidth * scale / 2 + scale);
      shadow.y = Math.round(y - shadow.naturalHeight * scale / 2 + 2 * scale);
    },
    cameraProgress(progress) {
      // Meet the actor at both ends of a step and use the existing movement frames.
      return reducedMotion.matches ? progress : progress - 2.2 * (progress * (1 - progress)) ** 2;
    },
  };
}
