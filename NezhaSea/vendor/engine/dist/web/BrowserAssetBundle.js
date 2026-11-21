// SPDX-License-Identifier: Apache-2.0
// Reads an asset bundle over HTTP. Where the host serves byte ranges, only the
// header, the index and the entries asked for are fetched, neighbouring ones in
// one request; where it does not (a static host that ignores Range), the whole
// file is fetched once and kept. Entries are checked against the index.
import { EgretError } from '@egret/runtime';
import { ASSET_BUNDLE_HEADER_BYTES, planAssetBundleRanges, readAssetBundleHeader, readAssetBundleIndex, sliceAssetBundle } from '@egret/engine/kit';
/** Opens the bundle at `url`, reading its index. */
export async function openBrowserAssetBundle(url, options = {}) {
    if (typeof url !== 'string' || url === '')
        throw new EgretError('ASSET_BUNDLE_INVALID');
    const get = options.fetch ?? ((u, init) => fetch(u, init));
    let transferred = 0;
    let whole;
    const signal = options.signal;
    const body = async (response) => {
        const bytes = new Uint8Array(await response.arrayBuffer());
        transferred += bytes.length;
        return bytes;
    };
    const fetchWhole = async () => {
        const response = await get(url, signal ? { signal } : {});
        if (!response.ok)
            throw new EgretError('ASSET_BUNDLE_FETCH_FAILED', { cause: new Error(String(response.status)) });
        return body(response);
    };
    // Asks for bytes [start, end); returns them with where they start, or the whole file when the host ignored Range.
    const fetchRange = async (start, end) => {
        if (whole)
            return { bytes: whole, start: 0 };
        const response = await get(url, { headers: { Range: `bytes=${start}-${end - 1}` }, ...(signal ? { signal } : {}) });
        if (response.status === 206) {
            const bytes = await body(response);
            const range = /^bytes (\d+)-(\d+)\/(\d+|\*)$/.exec(response.headers.get('Content-Range') ?? '');
            const from = range ? Number(range[1]) : start;
            // A file shorter than the range asked for ends the answer early: that is the whole of what was asked.
            const total = range && range[3] !== '*' ? Number(range[3]) : undefined;
            const reachesEnd = total !== undefined && from + bytes.length === total;
            if (from > start || (from + bytes.length < end && !reachesEnd))
                throw new EgretError('ASSET_BUNDLE_RANGE_INVALID', {
                    cause: new Error(`asked ${start}-${end}, got ${from}+${bytes.length}`)
                });
            return { bytes, start: from };
        }
        if (response.ok) {
            whole = await body(response);
            return { bytes: whole, start: 0 };
        }
        throw new EgretError('ASSET_BUNDLE_FETCH_FAILED', { cause: new Error(String(response.status)) });
    };
    const cache = options.cache;
    const indexKey = url + '#index';
    const openIndex = async () => {
        if (options.whole) {
            whole = await fetchWhole();
            return readAssetBundleIndex(whole);
        }
        // The header and a guess at the index in one request; a second when the index is longer.
        const guess = 64 * 1024;
        const first = await fetchRange(0, guess);
        if (first.bytes.length < ASSET_BUNDLE_HEADER_BYTES)
            throw new EgretError('ASSET_BUNDLE_FORMAT_INVALID');
        const { indexBytes } = readAssetBundleHeader(first.bytes);
        let head = first.bytes;
        if (head.length < ASSET_BUNDLE_HEADER_BYTES + indexBytes)
            head = (await fetchRange(0, ASSET_BUNDLE_HEADER_BYTES + indexBytes)).bytes;
        const read = readAssetBundleIndex(head);
        await cache?.put(indexKey, head.slice(0, ASSET_BUNDLE_HEADER_BYTES + indexBytes));
        return read;
    };
    let index;
    let offline = false;
    try {
        index = await openIndex();
    }
    catch (cause) {
        // Without the network a kept index still opens the bundle; entries then come only from the cache.
        const kept = cache && (await cache.match(indexKey));
        if (!kept || (cause instanceof EgretError && cause.code === 'ASSET_BUNDLE_FORMAT_INVALID'))
            throw cause;
        index = readAssetBundleIndex(kept);
        offline = true;
    }
    const entryKey = (name) => {
        const entry = index.entries.find(e => e.name === name);
        return url + '#' + name + '@' + (entry?.check ?? '');
    };
    const read = async (names) => {
        const out = new Map();
        const missing = [];
        for (const name of names) {
            const kept = cache && (await cache.match(entryKey(name)));
            // A kept entry is checked like a fetched one, so a damaged cache is fetched past.
            if (kept) {
                try {
                    out.set(name, sliceAssetBundle(index, name, kept, index.entries.find(e => e.name === name).offset));
                    continue;
                }
                catch {
                    /* fetched again below */
                }
            }
            missing.push(name);
        }
        if (missing.length && offline)
            throw new EgretError('ASSET_BUNDLE_FETCH_FAILED', { cause: new Error('offline') });
        for (const range of planAssetBundleRanges(index, missing)) {
            const got = await fetchRange(range.start, range.end);
            for (const name of range.names) {
                const bytes = sliceAssetBundle(index, name, got.bytes, got.start);
                out.set(name, bytes);
                await cache?.put(entryKey(name), bytes);
            }
        }
        return out;
    };
    return {
        url,
        index,
        get ranged() {
            return whole === undefined;
        },
        get transferred() {
            return transferred;
        },
        get offline() {
            return offline;
        },
        entries: (...tags) => index.entries.filter(entry => tags.every(tag => entry.tags.includes(tag))),
        read,
        async get(name) {
            return (await read([name])).get(name);
        }
    };
}
