import { copyImageData2DPixels } from '@egret/engine';
import { Mesh3D, Texture3D, createGeometry3D, createUnlitMaterial3D } from '@egret/engine/world3d';

// Keep original KYS atlas pixels and foot anchors in the native scene's depth pass.
export function createNativeSceneSprites(art, units) {
  const pages = new Map(), pieces = new Map();

  function piece(id) {
    if (pieces.has(id)) return pieces.get(id);
    const source = art.get(id);
    if (!source) return;
    const { image, region, dx, dy, scale = 1 } = source;
    if (!pages.has(image)) {
      const pixels = copyImageData2DPixels(image);
      const data = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
      const map = new Texture3D({ width: image.width, height: image.height, data },
        { colorSpace: 'srgb', wrapS: 'clamp', wrapT: 'clamp', flipY: false, mipmaps: false });
      const material = createUnlitMaterial3D({ map, side: 'double', alphaMode: 'mask', alphaCutoff: .28, toneMapped: false });
      pages.set(image, { data, width: image.width, height: image.height, map, material });
    }
    const { x, y, width, height } = region;
    const left = -dx / units, right = (width * scale - dx) / units;
    const top = dy / units, bottom = (dy - height * scale) / units;
    const u0 = (x + .5) / image.width, u1 = (x + width - .5) / image.width;
    const v0 = (y + .5) / image.height, v1 = (y + height - .5) / image.height;
    const geometry = createGeometry3D({ positions: [left, bottom, 0, right, bottom, 0, right, top, 0, left, top, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], uvs: [u0, v1, u1, v1, u1, v0, u0, v0],
      indices: [0, 1, 2, 0, 2, 3] });
    const record = { geometry, ...pages.get(image) };
    pieces.set(id, record);
    return record;
  }

  return {
    create(id) {
      const record = piece(id);
      if (!record) return;
      const mesh = new Mesh3D(record.geometry, record.material);
      mesh.receiveShadow = false;
      return mesh;
    },
    change(mesh, id) {
      const record = piece(id);
      if (!record) return false;
      mesh.geometry = record.geometry;
      mesh.material = record.material;
      return true;
    },
    solid(id, hit) {
      const record = pieces.get(id);
      if (!record || !hit?.uv) return false;
      const { width, height, data } = record;
      const x = Math.min(width - 1, Math.max(0, Math.floor(hit.uv[0] * width)));
      const y = Math.min(height - 1, Math.max(0, Math.floor(hit.uv[1] * height)));
      return data[(y * width + x) * 4 + 3] > 72;
    },
    dispose() {
      for (const { geometry } of pieces.values()) geometry.dispose();
      for (const { map, material } of pages.values()) { map.dispose(); material.dispose(); }
      pieces.clear();
      pages.clear();
    },
  };
}
