// 地块工作线程负责地形数据、碰撞树和植被布置，再把数组交给页面。
// Terrain, the collision tree and plant placement are prepared together on the worker.
import { createHeightField3D } from '../../vendor/engine/dist/rendering/world3d/Terrain3D.js';
import { planFlora } from './floraPlan.mjs';
import { createGeography } from './geography.mjs';

let geography = null;

self.onmessage = (event) => {
  const message = event.data;
  if (message.type === 'init') {
    geography = createGeography(message.samples);
    return;
  }
  if (message.type === 'backdrop') {
    const heights = geography.fillBackdrop(message.cx, message.cz, message.size, message.columns);
    self.postMessage({ type: 'backdrop', id: message.id, heights }, [heights.buffer]);
    return;
  }
  if (message.type === 'tile') {
    const { id, tx, tz, cx, cz, size, columns, weightSize, quality } = message;
    try {
      const { heights, weights } = geography.fillTile(cx, cz, size, columns, weightSize);
      const field = createHeightField3D({ columns, rows: columns, width: size, depth: size, heights });
      const collision = field.createShape().mesh.exportBuffers();
      const flora = planFlora(geography, tx, tz, size, field, quality);
      const batches = flora.batches.map(([, batch]) => batch).concat(flora.tea.flatMap(({ bushes, strips }) => [bushes, strips]));
      const buffers = [heights.buffer, weights.buffer, ...Object.values(collision).map((view) => view.buffer)];
      for (const { matrices, colors } of batches) {
        buffers.push(matrices.buffer);
        if (colors) buffers.push(colors.buffer);
      }
      self.postMessage({ type: 'tile', id, heights, weights, collision, flora }, buffers);
    } catch (cause) {
      self.postMessage({ type: 'error', id, message: String(cause?.message ?? cause) });
    }
  }
};
