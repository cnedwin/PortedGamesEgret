const SCRATCH_LIMIT = 8388608;
/** CPU concat ownership only. The Host retains the original GPU retirement proof. */
export class PreparedBatchScratch2D {
    retained = 0;
    available() { return SCRATCH_LIMIT - this.retained; }
    reserve(plan, bytes) {
        if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > this.available())
            return false;
        this.retained += bytes;
        plan.bytes += bytes;
        return true;
    }
    refund(plan, bytes) { this.retained -= bytes; plan.bytes -= bytes; }
    release(plan) {
        if (plan.released)
            return;
        plan.released = true;
        this.retained -= plan.bytes;
        plan.bytes = 0;
        plan.logicalDraws = undefined;
        plan.draws.length = 0;
        plan.logicalSpans.length = 0;
    }
}
function sameClips(a, b) {
    if (a === undefined || b === undefined || a.length !== b.length)
        return false;
    if (a === b)
        return true;
    for (let i = 0; i < a.length; i++) {
        const left = a[i], right = b[i];
        if (!Object.is(left.matrix.a, right.matrix.a) || !Object.is(left.matrix.b, right.matrix.b)
            || !Object.is(left.matrix.c, right.matrix.c) || !Object.is(left.matrix.d, right.matrix.d)
            || !Object.is(left.matrix.tx, right.matrix.tx) || !Object.is(left.matrix.ty, right.matrix.ty)
            || !Object.is(left.rect.x, right.rect.x) || !Object.is(left.rect.y, right.rect.y)
            || !Object.is(left.rect.width, right.rect.width) || !Object.is(left.rect.height, right.rect.height))
            return false;
    }
    return true;
}
function compatible(a, b) {
    return b.kind === a.kind && b.packed.vertexCount > 0 && b.viewIndex === a.viewIndex
        && a.crop !== undefined && b.crop !== undefined
        && Object.is(a.crop.x, b.crop.x) && Object.is(a.crop.y, b.crop.y)
        && Object.is(a.crop.width, b.crop.width) && Object.is(a.crop.height, b.crop.height)
        && Object.is(b.alpha, a.alpha) && sameClips(a.clips, b.clips);
}
function mergeRectangleRanges(draw) {
    const { ranges } = draw.packed, clips = draw.rangeClips, commands = draw.rangeCommands;
    if (ranges.length < 2 || clips?.length !== ranges.length || commands?.length !== ranges.length)
        return draw;
    const merged = [];
    let previous = -1;
    for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i], last = merged[merged.length - 1];
        if (last && range.firstVertex === last.firstVertex + last.vertexCount && commands[i] === commands[previous] + 1
            && sameClips(clips[previous], clips[i]))
            last.vertexCount += range.vertexCount;
        else
            merged.push({ firstVertex: range.firstVertex, vertexCount: range.vertexCount });
        previous = i;
    }
    return merged.length === ranges.length ? draw : { ...draw, packed: { ...draw.packed, ranges: merged } };
}
/** Logical admission and every original payload allocation must finish before this call. */
export function prepareAdjacentBatches2D(input, maxBufferSize, scratch) {
    const plan = { draws: [], logicalDraws: input, logicalSpans: [], bytes: 0, transferred: false, released: false };
    try {
        for (let start = 0; start < input.length;) {
            const first = input[start];
            if (first.kind === 'rect') {
                plan.draws.push(mergeRectangleRanges(first));
                plan.logicalSpans.push({ first: start, count: 1 });
                start++;
                continue;
            }
            if (first.packed.vertexCount === 0) {
                plan.draws.push(first);
                plan.logicalSpans.push({ first: start, count: 1 });
                start++;
                continue;
            }
            let end = start + 1, bytes = first.packed.data.byteLength;
            const ceiling = Math.min(maxBufferSize, scratch.available());
            while (end < input.length) {
                const next = input[end];
                if (!compatible(first, next) || next.packed.data.byteLength > ceiling - bytes)
                    break;
                bytes += next.packed.data.byteLength;
                end++;
            }
            if (end === start + 1 || !scratch.reserve(plan, bytes)) {
                plan.draws.push(first);
                plan.logicalSpans.push({ first: start, count: 1 });
                start++;
                continue;
            }
            let data;
            // Only optional concat allocation/copy can fall back. Original packing,
            // uniform allocation, native calls and their errors remain outside.
            try {
                data = new Float32Array(bytes / 4);
                let offset = 0;
                for (let i = start; i < end; i++) {
                    const source = input[i].packed.data;
                    data.set(source, offset);
                    offset += source.length;
                }
            }
            catch {
                data = undefined;
            }
            if (data === undefined) {
                scratch.refund(plan, bytes);
                for (let i = start; i < end; i++) {
                    plan.draws.push(input[i]);
                    plan.logicalSpans.push({ first: i, count: 1 });
                }
                start = end;
                continue;
            }
            let vertexCount = 0, maxBackingDisplacement = 0, maxUVDisplacement = 0;
            if (first.kind === 'image') {
                let collapsedTriangles = 0;
                for (let i = start; i < end; i++) {
                    const item = input[i];
                    vertexCount += item.packed.vertexCount;
                    collapsedTriangles += item.packed.collapsedTriangles;
                    maxBackingDisplacement = Math.max(maxBackingDisplacement, item.packed.maxBackingDisplacement);
                    maxUVDisplacement = Math.max(maxUVDisplacement, item.packed.maxUVDisplacement);
                }
                plan.draws.push({ ...first, packed: { data, vertexCount, collapsedTriangles, maxBackingDisplacement, maxUVDisplacement } });
            }
            else {
                let sourceTrianglesCharged = 0, preparedVerticesCharged = 0, maxLightColorDisplacement = 0;
                const counters = { authoredDegenerateTriangles: 0, singularSuppressedTriangles: 0,
                    transformedCollapsedTriangles: 0, clippedCollapsedTriangles: 0, packedCollapsedTriangles: 0 };
                for (let i = start; i < end; i++) {
                    const item = input[i];
                    vertexCount += item.packed.vertexCount;
                    sourceTrianglesCharged += item.packed.sourceTrianglesCharged;
                    preparedVerticesCharged += item.packed.preparedVerticesCharged;
                    maxBackingDisplacement = Math.max(maxBackingDisplacement, item.packed.maxBackingDisplacement);
                    maxUVDisplacement = Math.max(maxUVDisplacement, item.packed.maxUVDisplacement);
                    maxLightColorDisplacement = Math.max(maxLightColorDisplacement, item.packed.maxLightColorDisplacement);
                    counters.authoredDegenerateTriangles += item.packed.counters.authoredDegenerateTriangles;
                    counters.singularSuppressedTriangles += item.packed.counters.singularSuppressedTriangles;
                    counters.transformedCollapsedTriangles += item.packed.counters.transformedCollapsedTriangles;
                    counters.clippedCollapsedTriangles += item.packed.counters.clippedCollapsedTriangles;
                    counters.packedCollapsedTriangles += item.packed.counters.packedCollapsedTriangles;
                }
                plan.draws.push({ ...first, packed: { data, vertexCount, sourceTrianglesCharged, preparedVerticesCharged,
                        counters: Object.freeze(counters), maxBackingDisplacement, maxUVDisplacement, maxLightColorDisplacement } });
            }
            plan.logicalSpans.push({ first: start, count: end - start });
            start = end;
        }
        return plan;
    }
    catch (cause) {
        scratch.release(plan);
        throw cause;
    }
}
//# sourceMappingURL=preparedBatches2D.js.map