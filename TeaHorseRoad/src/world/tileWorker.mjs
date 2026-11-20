// 地块工作线程：页面把道路采样发过来一次，之后每次请求算一块地形的高度和地面图层权重，算完把数组转交回去。
// The terrain worker: the page sends the road's samples once; after that each request works out one tile's heights and
// the weights of its ground layers, and hands the arrays back without copying them.
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
    const { id, cx, cz, size, columns, weightSize } = message;
    try {
      const { heights, weights } = geography.fillTile(cx, cz, size, columns, weightSize);
      self.postMessage({ type: 'tile', id, heights, weights }, [heights.buffer, weights.buffer]);
    } catch (cause) {
      self.postMessage({ type: 'error', id, message: String(cause?.message ?? cause) });
    }
  }
};
