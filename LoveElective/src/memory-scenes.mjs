import { deserialize, serialize, bailuZeroStatus } from './sim.mjs';
import { firstEveningStatus } from './first-evening.mjs';

const SCENES_KEY = 'love-elective-memory-scenes-v1';
const READ_KEY = 'love-elective-read-lines-v1';

export const MEMORY_SCENES = [
  { id: 'qingge-review', girl: 'qingge', name: ['蓝笔预算表', 'The budget in blue'],
    open: ['回看蓝笔预算表', 'Replay the budget in blue'], detail: ['星空祭尾声 · 逐项核对预算', 'Star Festival epilogue · Budget review'] },
  { id: 'qingge-rehearsal', girl: 'qingge', name: ['留白的讲稿', 'Room in the speech'],
    open: ['回看留白的讲稿', 'Replay room in the speech'], detail: ['星空祭尾声 · 练习听完意见', 'Star Festival epilogue · Rehearsal'] },
  { id: 'bailu-zero', girl: 'bailu', name: ['第零名社员的回信', 'Letters from Member Zero'],
    open: ['回看白露特别篇', 'Replay Bai Lu’s interlude'], detail: ['特别篇 · 从第一封信开始', 'Full interlude · From the first letter'] },
  { id: 'linxia-first-evening', girl: 'linxia', name: ['樱花道的计时员', 'The timekeeper'],
    open: ['回看林夏首约', 'Replay Lin Xia’s first meeting'], detail: ['初次邀约 · 开学第一晚', 'First meeting · A walk after dark'] },
];

function readJson(value) {
  try { return JSON.parse(value); } catch { return null; }
}

/** Gallery entries keep the cast and wardrobe from the moment each scene was earned. */
export function createMemoryScenes(readStorage, writeStorage) {
  const saved = readJson(readStorage(SCENES_KEY));
  const snapshots = Object.fromEntries(MEMORY_SCENES
    .filter(({ id }) => typeof saved?.[id] === 'string')
    .map(({ id }) => [id, saved[id]]));
  const seen = readJson(readStorage(READ_KEY));
  const lines = new Set(Array.isArray(seen) ? seen.filter(line => typeof line === 'string') : []);

  function unlock(id, state) {
    if (!MEMORY_SCENES.some(scene => scene.id === id) || deserialize(snapshots[id])) return;
    snapshots[id] = serialize(state);
    writeStorage(SCENES_KEY, JSON.stringify(snapshots));
  }

  return {
    unlock,
    read: id => deserialize(snapshots[id]),
    importCompleted(state) {
      if (!state) return;
      if (bailuZeroStatus(state).complete) unlock('bailu-zero', state);
      if (firstEveningStatus(state)?.phase === 'completed') unlock('linxia-first-evening', state);
    },
    track(scope) {
      const entry = (key, text) => JSON.stringify([scope, key, text]);
      return {
        has: (key, text) => lines.has(entry(key, text)),
        mark(key, text) {
          const line = entry(key, text);
          if (lines.has(line)) return;
          lines.add(line);
          writeStorage(READ_KEY, JSON.stringify([...lines]));
        },
      };
    },
  };
}
