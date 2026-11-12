import { noteOwnedPreparationFailure } from '../rendering/ownedPreparationFailure2D.js';
import { readPreparedStage2D, tryReplayPreparedStage2D, acceptPreparedStage2D, publishPreparedStage2D, copyPreparedPacking2D } from '../rendering/preparedFrameCache2D.js';
import { packedPosition2D } from '../rendering/packedPosition2D.js';
import { packedOrientation } from '../rendering/packedOrientation.js';
export class WebGPUPackingError extends Error {
    reason;
    constructor(reason, cause = undefined) {
        super(`WebGPU packing ${reason}`, { cause });
        this.reason = reason;
    }
}
export function packWebGPUVertices(prepared, width, height, limits, budget, preparedCommandIndices, cacheSlot) {
    const cached = readPreparedStage2D(cacheSlot, 'packing');
    if (cached && cached.value.data.byteLength <= limits.maxUploadBytes && cached.value.data.byteLength <= limits.maxBufferSize
        && tryReplayPreparedStage2D(budget, cached.cost)) {
        // The same original packing position still allocates its submission copy.
        const packed = copyPreparedPacking2D(cached.value);
        if (preparedCommandIndices && cached.commandIndices)
            for (const index of cached.commandIndices)
                preparedCommandIndices.push(index);
        acceptPreparedStage2D(cacheSlot);
        return packed;
    }
    let maxBackingDisplacement = 0, collapsedTriangles = 0, vertices = 0, predicates = 0;
    const localCommandIndices = [];
    // Ordinary scratch preserves converted bits; no typed storage exists before both byte checks.
    const points = prepared.points.map(point => {
        const represented = packedPosition2D(point, width, height, maxBackingDisplacement);
        if (!represented)
            throw noteOwnedPreparationFailure(new WebGPUPackingError('precision'));
        const { x, y } = represented;
        maxBackingDisplacement = represented.maxBackingDisplacement;
        return { x, y };
    });
    const ranges = [];
    const groups = [];
    for (let commandIndex = 0; commandIndex < prepared.commands.length; commandIndex++) {
        const command = prepared.commands[commandIndex];
        const indices = [], firstVertex = vertices;
        for (let i = 1; i + 1 < command.pointIndices.length; i++) {
            const a = command.pointIndices[0], b = command.pointIndices[i], c = command.pointIndices[i + 1];
            const p = points[a], q = points[b], r = points[c];
            predicates++;
            const sign = packedOrientation(p.x, p.y, q.x, q.y, r.x, r.y, budget);
            if (!Number.isFinite(sign) || sign > 0)
                throw noteOwnedPreparationFailure(new WebGPUPackingError('precision'));
            if (sign === 0) {
                collapsedTriangles++;
                continue;
            }
            if (vertices > 4294967295 - 3)
                throw noteOwnedPreparationFailure(new WebGPUPackingError('device'));
            vertices += 3;
            indices.push(a, b, c);
        }
        if (vertices !== firstVertex) {
            ranges.push({ firstVertex, vertexCount: vertices - firstVertex });
            groups.push({ indices, color: command.color, alpha: command.alpha });
            localCommandIndices.push(commandIndex);
            preparedCommandIndices?.push(commandIndex);
        }
    }
    if (vertices > Math.floor(Number.MAX_SAFE_INTEGER / 24) || vertices > Math.floor(limits.maxUploadBytes / 24))
        throw noteOwnedPreparationFailure(new WebGPUPackingError('budget'));
    if (vertices > Math.floor(limits.maxBufferSize / 24))
        throw noteOwnedPreparationFailure(new WebGPUPackingError('device'));
    const data = new Float32Array(vertices * 6);
    let offset = 0;
    for (const group of groups) {
        const alpha = group.alpha, red = ((group.color >>> 16) & 255) / 255 * alpha, green = ((group.color >>> 8) & 255) / 255 * alpha, blue = (group.color & 255) / 255 * alpha;
        for (const index of group.indices) {
            const p = points[index];
            data[offset++] = p.x;
            data[offset++] = p.y;
            data[offset++] = red;
            data[offset++] = green;
            data[offset++] = blue;
            data[offset++] = alpha;
        }
    }
    const result = { data, ranges, collapsedTriangles, maxBackingDisplacement };
    publishPreparedStage2D(cacheSlot, 'packing', result, { preparedVertices: 0, predicates, tupleComparisons: 0 }, localCommandIndices);
    return result;
}
const SHADER = `
struct VertexOutput { @builtin(position) position: vec4<f32>, @location(0) @interpolate(flat) color: vec4<f32>, }
@vertex fn vertexMain(@location(0) position: vec2<f32>, @location(1) color: vec4<f32>) -> VertexOutput {
    var out: VertexOutput; out.position = vec4<f32>(position, 0.0, 1.0); out.color = color; return out;
}
@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> { return input.color; }
`;
/** Host supplies captured methods, checks terminal gates, and owns surrounding scopes. */
export function createWebGPURectanglePipeline(shader, pipeline, format) {
    const module = shader({ code: SHADER });
    const blend = { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' };
    return pipeline({ layout: 'auto', vertex: { module, entryPoint: 'vertexMain', buffers: [{ arrayStride: 24, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }, { shaderLocation: 1, offset: 8, format: 'float32x4' }] }] }, fragment: { module, entryPoint: 'fragmentMain', targets: [{ format, blend: { color: blend, alpha: blend }, writeMask: 15 }] }, primitive: { topology: 'triangle-list', cullMode: 'none' }, multisample: { count: 1, alphaToCoverageEnabled: false } });
}
export function encodeWebGPURectangles(pass, pipeline, buffer, ranges, width, height) {
    pass.setPipeline(pipeline);
    pass.setViewport(0, 0, width, height, 0, 1);
    pass.setScissorRect(0, 0, width, height);
    if (buffer) {
        pass.setVertexBuffer(0, buffer);
        for (const range of ranges)
            pass.draw(range.vertexCount, 1, range.firstVertex, 0);
    }
}
//# sourceMappingURL=webgpuPass.js.map