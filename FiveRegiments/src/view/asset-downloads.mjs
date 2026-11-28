// Warm only the exact title asset dependencies. The first real reader consumes the
// in-flight buffer; we do not retain a second copy of decoded scene assets.
const records = [];
const profiling = typeof location !== 'undefined' && new URLSearchParams(location.search).has('startup-profile');
export const startupTrace = records;
export async function startupSpan(phase, name, operation) {
  if (!profiling) return operation();
  const start = performance.now();
  try { return await operation(); }
  finally { records.push({ phase, name: String(name), start, end: performance.now() }); }
}
export function createAssetDownloads(fetcher = globalThis.fetch.bind(globalThis)) {
  const warming = new Map();
  const download = url => startupSpan('download', url, async () => {
    const response = await fetcher(url);
    return { ok: response.ok, status: response.status, type: response.headers.get('Content-Type') ?? '',
      bytes: response.ok ? await response.arrayBuffer() : null };
  });
  return {
    warm(urls) {
      for (const url of urls) {
        const key = String(url);
        if (warming.has(key)) continue;
        const promise = download(key);
        warming.set(key, promise);
        // A failed speculative request never blocks a subsequent real read.
        const evict = () => { if (warming.get(key) === promise) warming.delete(key); };
        promise.then(value => { if (!value.ok) evict(); }, evict);
      }
    },
    read(url) {
      const key = String(url), warm = warming.get(key);
      if (!warm) return download(key);
      warming.delete(key);
      return warm;
    },
    get pending() { return warming.size; }
  };
}
export const assetDownloads = createAssetDownloads();
export function titleAssetUrls(base, { look, layout }, order, regiments, quality) {
  const paths = [
    'skies/' + look.sky + '.jpg',
    ...['diff', 'nor', 'arm'].map(map => 'materials/' + look.ground.material + '_' + map + '.jpg'),
    ...order.flatMap(id => ['motion/' + id + '.json', 'motion/' + id + '.bin'])
  ];
  if (['low', 'medium', 'high'].includes(quality)) {
    const props = quality === 'low' ? 'low' : quality === 'medium' ? 'mid' : 'high';
    const characters = quality === 'high' ? 'mid' : 'low';
    for (const id of new Set(layout.map(item => item.prop))) paths.push('props/' + id + '-' + props + '.glb');
    for (const id of order) {
      paths.push('characters/' + id + '-' + characters + '.glb');
      if (regiments[id].horse) paths.push('characters/horse-' + characters + '.glb');
    }
  }
  return [...new Set(paths)].map(path => new URL(path, base));
}
