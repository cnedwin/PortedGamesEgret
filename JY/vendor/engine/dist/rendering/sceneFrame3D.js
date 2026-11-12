import { isImageData2D } from '@egret/contracts';
import { createMatrix4, multiplyMatrix4, Math3DError } from './matrix4.js';
import { createPerspectiveProjection3D, createOrthographicProjection3D } from './projection3D.js';
import { isMeshGeometry3D } from './meshGeometry3D.js';
const cardOwners = new WeakSet();
const noCards = Object.freeze([]);
export class Scene3DError extends Error {
    code;
    constructor(code, cause) {
        super(code, { cause });
        this.code = code;
        this.name = 'Scene3DError';
    }
}
const scenes = new WeakMap();
const origins = new WeakMap();
const missing = Symbol('missing own scene field');
const projectionFields = ['kind', 'left', 'right', 'bottom', 'top', 'near', 'far'];
function fail(code, origin, cause) {
    let error;
    try {
        error = new Scene3DError(code, cause);
        origins.set(error, origin);
    }
    catch (nativeCause) {
        // One-shot construction/registration recovery requires this second
        // path to work. Real OOM and permanent intrinsic poisoning are unproved.
        const nativeError = new Scene3DError('SCENE3D_NATIVE_FAILED', nativeCause);
        origins.set(nativeError, 'native');
        throw nativeError;
    }
    throw error;
}
function source(operation) {
    try {
        return operation();
    }
    catch (cause) {
        return fail('SCENE3D_INPUT_READ_FAILED', 'source', cause);
    }
}
function native(operation) {
    try {
        return operation();
    }
    catch (cause) {
        return fail('SCENE3D_NATIVE_FAILED', 'native', cause);
    }
}
function own(record, key) {
    if (!source(() => Object.hasOwn(record, key)))
        return missing;
    return source(() => record[key]);
}
function record(value) {
    return value !== null && typeof value === 'object' && !source(() => Array.isArray(value));
}
function write(values, index, value) {
    native(() => { values[index] = value; });
}
function trustedMath(operation) {
    // Only these actual B0 invocation boundaries map its closed throw paths.
    // Math3DError has no private authenticity predicate: caller classes/codes
    // outside this boundary never confer origin. Keep both wrapper and cause.
    try {
        return operation();
    }
    catch (cause) {
        if (cause instanceof Math3DError) {
            switch (cause.code) {
                case 'MATH3D_INPUT_INVALID':
                case 'MATH3D_GEOMETRY_INVALID': return fail('SCENE3D_INPUT_INVALID', 'validation', cause);
                case 'MATH3D_INPUT_READ_FAILED': return fail('SCENE3D_INPUT_READ_FAILED', 'source', cause);
                case 'MATH3D_ARITHMETIC_RANGE': return fail('SCENE3D_ARITHMETIC_RANGE', 'validation', cause);
                case 'MATH3D_NATIVE_FAILED': return fail('SCENE3D_NATIVE_FAILED', 'native', cause);
            }
        }
        return fail('SCENE3D_NATIVE_FAILED', 'native', cause);
    }
}
function profile(values) {
    for (let index = 0; index < values.length; index++) {
        const value = values[index];
        const admitted = native(() => value === 0 || (Number.isFinite(value)
            && Math.abs(value) >= 1.1754943508222875e-38
            && Math.abs(value) <= 3.4028234663852886e38 && Math.fround(value) === value));
        if (!admitted)
            fail('SCENE3D_PRECISION_UNSUPPORTED', 'validation');
    }
}
function finite(value) {
    if (!native(() => Number.isFinite(value)))
        fail('SCENE3D_ARITHMETIC_RANGE', 'validation');
    return value;
}
function headroom(positions, mvp) {
    // Fixed binary64 absolute products k0..3, then ((p0+p1)+p2)+p3.
    // This restrictive headroom policy is not an outward-rounded bound, shader
    // precision/visibility result or a reason to divide/discard raw clip w.
    for (let vertex = 0; vertex < positions.length / 3; vertex++) {
        const x = positions[3 * vertex], y = positions[3 * vertex + 1], z = positions[3 * vertex + 2];
        for (let row = 0; row < 4; row++) {
            const p0 = finite(native(() => Math.abs(mvp[row] * x)));
            const p1 = finite(native(() => Math.abs(mvp[4 + row] * y)));
            const p2 = finite(native(() => Math.abs(mvp[8 + row] * z)));
            const p3 = finite(native(() => Math.abs(mvp[12 + row])));
            const s01 = finite(p0 + p1), s012 = finite(s01 + p2), sum = finite(s012 + p3);
            if (sum > 1.329227995784916e36)
                fail('SCENE3D_ARITHMETIC_RANGE', 'validation');
        }
    }
}
function cardNumber(value, fallback) {
    if ((value === missing || value === undefined) && fallback !== undefined)
        return fallback;
    if (typeof value !== 'number' || !Number.isFinite(value))
        fail('SCENE3D_INPUT_INVALID', 'validation');
    return value;
}
function canonicalComponent(value) {
    const rounded = Math.fround(value);
    if (value !== 0 && rounded === 0)
        fail('SCENE3D_PRECISION_UNSUPPORTED', 'validation');
    return rounded === 0 ? 0 : rounded;
}
export function createSceneWorldCard3D(input) {
    if (!record(input))
        fail('SCENE3D_INPUT_INVALID', 'validation');
    const image = own(input, 'source'), rawRegion = own(input, 'region');
    if (!isImageData2D(image))
        fail('SCENE3D_INPUT_INVALID', 'validation');
    let x = 0, y = 0, pixelWidth = image.width, pixelHeight = image.height;
    if (rawRegion !== undefined && rawRegion !== missing) {
        if (!record(rawRegion))
            fail('SCENE3D_INPUT_INVALID', 'validation');
        x = cardNumber(own(rawRegion, 'x'));
        y = cardNumber(own(rawRegion, 'y'));
        pixelWidth = cardNumber(own(rawRegion, 'width'));
        pixelHeight = cardNumber(own(rawRegion, 'height'));
        if (![x, y, pixelWidth, pixelHeight].every(Number.isSafeInteger) || x < 0 || y < 0 || pixelWidth <= 0 || pixelHeight <= 0 ||
            pixelWidth > image.width - x || pixelHeight > image.height - y)
            fail('SCENE3D_INPUT_INVALID', 'validation');
    }
    const width = cardNumber(own(input, 'width')), height = cardNumber(own(input, 'height'));
    const pivotX = cardNumber(own(input, 'pivotX'), pixelWidth / 2), pivotY = cardNumber(own(input, 'pivotY'), pixelHeight);
    const alphaCutoff = cardNumber(own(input, 'alphaCutoff'), 128);
    if (width <= 0 || height <= 0 || !Number.isInteger(alphaCutoff) || alphaCutoff < 1 || alphaCutoff > 255)
        fail('SCENE3D_INPUT_INVALID', 'validation');
    const left = -pivotX / pixelWidth * width, top = pivotY / pixelHeight * height;
    const bounds = [canonicalComponent(left), canonicalComponent(top - height), canonicalComponent(left + width), canonicalComponent(top)];
    profile(bounds);
    if (bounds[0] >= bounds[2] || bounds[1] >= bounds[3])
        fail('SCENE3D_PRECISION_UNSUPPORTED', 'validation');
    const region = [x, y, pixelWidth, pixelHeight];
    const result = native(() => Object.freeze({ source: image, bounds: Object.freeze(bounds), region: Object.freeze(region), alphaCutoff }));
    native(() => cardOwners.add(result));
    return result;
}
export function isSceneWorldCard3D(value) {
    return value !== null && typeof value === 'object' && cardOwners.has(value);
}
function authoredMatrix(exact) {
    // Authored paths round once at the native MVP boundary.
    const rounded = native(() => exact.map(value => Math.fround(value)));
    for (let slot = 0; slot < 16; slot++) {
        if (exact[slot] !== 0 && rounded[slot] === 0)
            fail('SCENE3D_PRECISION_UNSUPPORTED', 'validation');
    }
    profile(rounded);
    return trustedMath(() => createMatrix4(rounded));
}
export function createSceneFrame3D(input) {
    return captureSceneFrame(input, false);
}
export function createAuthoredSceneFrame3D(input, cards = noCards, textures, lambertDraws) {
    return captureSceneFrame(input, true, cards, textures, lambertDraws);
}
function captureSceneFrame(input, authored, cardInputs = noCards, textures, lambertDraws) {
    if (input === null || typeof input !== 'object')
        fail('SCENE3D_INPUT_INVALID', 'validation');
    const projection = own(input, 'projection'), draws = own(input, 'draws');
    if (projection === missing || draws === missing)
        fail('SCENE3D_INPUT_INVALID', 'validation');
    if (!source(() => Array.isArray(draws)))
        fail('SCENE3D_INPUT_INVALID', 'validation');
    const count = own(draws, 'length');
    if (typeof count !== 'number' || !native(() => Number.isSafeInteger(count)) || count < 0) {
        fail('SCENE3D_INPUT_INVALID', 'validation');
    }
    // Fixed length/quota admission precedes any payload scratch or indexed read.
    const cardCount = cardInputs === noCards ? 0 : source(() => Array.isArray(cardInputs) ? cardInputs.length : -1);
    if (!Number.isSafeInteger(cardCount) || cardCount < 0)
        fail('SCENE3D_INPUT_INVALID', 'validation');
    if (count + cardCount > 64)
        fail('SCENE3D_BUDGET', 'budget');
    if (!record(projection))
        fail('SCENE3D_INPUT_INVALID', 'validation');
    const parameters = native(() => new Array(7));
    const records = native(() => new Array(count));
    let absent = false;
    for (let index = 0; index < 7; index++) {
        const value = own(projection, projectionFields[index]);
        if (value === missing)
            absent = true;
        write(parameters, index, value);
    }
    for (let index = 0; index < count; index++) {
        const value = own(draws, String(index));
        if (value === missing)
            absent = true;
        write(records, index, value);
    }
    if (absent)
        fail('SCENE3D_INPUT_INVALID', 'validation');
    const geometries = native(() => new Array(count));
    const modelInputs = native(() => new Array(count));
    for (let index = 0; index < count; index++) {
        const draw = records[index];
        // Shape refusal intentionally prevents subsequent payload access;
        // admitted fields finish before deferred missing/value semantics.
        if (!record(draw))
            fail('SCENE3D_INPUT_INVALID', 'validation');
        const geometry = own(draw, 'geometry'), modelView = own(draw, 'modelView');
        if (geometry === missing || modelView === missing)
            absent = true;
        write(geometries, index, geometry);
        write(modelInputs, index, modelView);
    }
    if (absent)
        fail('SCENE3D_INPUT_INVALID', 'validation');
    for (let index = 0; index < count; index++) {
        if (!native(() => isMeshGeometry3D(geometries[index])))
            fail('SCENE3D_INPUT_INVALID', 'validation');
    }
    const models = native(() => new Array(count));
    for (let index = 0; index < count; index++) {
        // Each B0 capture completes semantics before the next call. Only its
        // immutable result reaches multiplication; no cross-call fault theorem.
        write(models, index, trustedMath(() => createMatrix4(modelInputs[index])));
    }
    const kind = parameters[0];
    if (kind !== 'perspective' && kind !== 'orthographic')
        fail('SCENE3D_INPUT_INVALID', 'validation');
    const projectionInput = native(() => ({ left: parameters[1], right: parameters[2],
        bottom: parameters[3], top: parameters[4], near: parameters[5], far: parameters[6],
        depthRange: 'zeroToOne', depthDirection: 'reverse' }));
    const matrix = trustedMath(() => (kind === 'perspective'
        ? createPerspectiveProjection3D(projectionInput) : createOrthographicProjection3D(projectionInput))).matrix;
    const ownedDraws = native(() => new Array(count));
    const distinct = native(() => new Array());
    let cpuLogicalBytes = 0, sceneBytes = 0;
    const uniformBytes = count * 64 + (lambertDraws?.size ?? 0) * 64 + cardCount * 112;
    if (uniformBytes > 4096)
        fail('SCENE3D_BUDGET', 'budget');
    for (let index = 0; index < count; index++) {
        const geometry = geometries[index];
        const texture = textures?.get(geometry);
        const lambert = lambertDraws?.get(index);
        const exact = trustedMath(() => multiplyMatrix4(matrix, models[index]));
        const mvp = authored ? authoredMatrix(exact) : exact;
        let seen = false;
        for (let item = 0; item < distinct.length; item++)
            if (distinct[item] === geometry)
                seen = true;
        if (!seen) {
            // Charge UVs and normals once per owned geometry. The host charges image residency.
            const components = lambert ? 11 : texture ? 8 : 6;
            const logical = 8 * (components * geometry.vertexCount + geometry.indexCount);
            const packed = 4 * (components * geometry.vertexCount + geometry.indexCount);
            cpuLogicalBytes += logical;
            sceneBytes += packed;
            const admitted = native(() => Number.isSafeInteger(logical) && Number.isSafeInteger(packed)
                && Number.isSafeInteger(cpuLogicalBytes) && Number.isSafeInteger(sceneBytes));
            if (!admitted || cpuLogicalBytes > 8388608 || sceneBytes > 4194304 || distinct.length >= 64) {
                fail('SCENE3D_BUDGET', 'budget');
            }
            // Identity charges precede this identity's payload profile. Counts
            // are logical numeric accounting, not JS heap/physical GPU memory.
            write(distinct, distinct.length, geometry);
        }
        profile(geometry.positions);
        profile(geometry.colors);
        profile(mvp);
        headroom(geometry.positions, mvp);
        write(ownedDraws, index, native(() => Object.freeze(lambert ? { geometry, mvp, texture: texture, lambert }
            : texture ? { geometry, mvp, texture } : { geometry, mvp })));
    }
    native(() => Object.freeze(ownedDraws));
    native(() => Object.freeze(distinct));
    let cards;
    if (cardCount) {
        cards = native(() => new Array(cardCount));
        for (let index = 0; index < cardCount; index++) {
            const drawInput = own(cardInputs, String(index));
            if (!record(drawInput))
                fail('SCENE3D_INPUT_INVALID', 'validation');
            const card = own(drawInput, 'card'), model = own(drawInput, 'modelView');
            if (!isSceneWorldCard3D(card))
                fail('SCENE3D_INPUT_INVALID', 'validation');
            const view = trustedMath(() => createMatrix4(model));
            const mvp = authoredMatrix(trustedMath(() => multiplyMatrix4(matrix, view)));
            const { bounds: [left, bottom, right, top] } = card;
            headroom([left, bottom, 0, right, bottom, 0, left, top, 0, right, top, 0], mvp);
            const { source: image, bounds, region, alphaCutoff } = card;
            write(cards, index, native(() => Object.freeze({ source: image, bounds, region, alphaCutoff, mvp })));
        }
        native(() => Object.freeze(cards));
    }
    const result = native(() => Object.freeze(cards
        ? { draws: ownedDraws, geometries: distinct, cpuLogicalBytes, sceneBytes, uniformBytes, cards }
        : { draws: ownedDraws, geometries: distinct, cpuLogicalBytes, sceneBytes, uniformBytes }));
    // Publication/authentication is last. Failed registration returns no frame.
    native(() => scenes.set(result, true));
    return result;
}
export function isSceneFrame3D(value) {
    return value !== null && typeof value === 'object' && scenes.has(value);
}
export function getScene3DErrorOrigin(value) {
    return value !== null && typeof value === 'object' ? origins.get(value) : undefined;
}
//# sourceMappingURL=sceneFrame3D.js.map