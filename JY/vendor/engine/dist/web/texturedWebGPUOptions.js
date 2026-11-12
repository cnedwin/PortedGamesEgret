const DEFAULTS = Object.freeze({
    pixelRatio: 1, maxBackingPixels: 16777216, maxCommands: 65536, maxClipRectangles: 262144,
    maxPreparedVertices: 1048576, maxClipEdgeTests: 4194304, maxUploadBytes: 33554432,
    maxPendingUploadBytes: 67108864, maxPendingFrames: 2, maxReadbackBytes: 67108864, enableReadback: false,
    maxSourceTriangles: 65536, maxFrameGeometryBytes: 16777216, maxPendingGeometryBytes: 33554432, maxTupleComparisons: 1048576,
});
const KEYS = ['canvas', 'device', 'onDiagnostic', 'pixelRatio', 'maxBackingPixels', 'maxCommands', 'maxClipRectangles',
    'maxPreparedVertices', 'maxClipEdgeTests', 'maxUploadBytes', 'maxPendingUploadBytes', 'maxPendingFrames',
    'maxReadbackBytes', 'enableReadback', 'maxSourceTriangles', 'maxFrameGeometryBytes', 'maxPendingGeometryBytes', 'maxTupleComparisons'];
function object(value) { return typeof value === 'object' && value !== null; }
/** Snapshot every top-level read, then the selected policy reads, before any semantic refusal. */
export function admitTexturedWebGPUOptions(input) {
    if (!object(input))
        throw new TypeError('options');
    const captured = {};
    for (const key of KEYS)
        captured[key] = input[key];
    const policy = captured.device;
    let kind, borrowed;
    if (object(policy)) {
        kind = policy['kind'];
        if (kind === 'borrow')
            borrowed = policy['device'];
    }
    if (!object(captured.canvas))
        throw new TypeError('canvas');
    if (policy !== undefined && (!object(policy) || (kind !== 'acquire' && kind !== 'borrow') || (kind === 'borrow' && !object(borrowed))))
        throw new TypeError('device policy');
    if (captured.onDiagnostic !== undefined && typeof captured.onDiagnostic !== 'function')
        throw new TypeError('diagnostic callback');
    const configuration = {};
    for (const key of Object.keys(DEFAULTS)) {
        const value = captured[key] === undefined ? DEFAULTS[key] : captured[key];
        if (key === 'enableReadback') {
            if (typeof value !== 'boolean')
                throw new TypeError(key);
        }
        else {
            if (typeof value !== 'number' || !Number.isFinite(value) || (key !== 'pixelRatio' && !Number.isSafeInteger(value)))
                throw new TypeError(key);
            if (value <= 0 || (key !== 'pixelRatio' && value > DEFAULTS[key]))
                throw new RangeError(key);
        }
        Object.defineProperty(configuration, key, { value, enumerable: true });
    }
    return { surface: captured.canvas, configuration: Object.freeze(configuration),
        borrowed: kind === 'borrow' ? borrowed : undefined,
        callback: captured.onDiagnostic };
}
//# sourceMappingURL=texturedWebGPUOptions.js.map