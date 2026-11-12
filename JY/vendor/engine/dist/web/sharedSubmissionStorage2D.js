import { copySharedPagePixels } from '../rendering/sharedColor2D.js';
import { noteOwnedPreparationFailure } from '../rendering/ownedPreparationFailure2D.js';
/** Append scene images to the existing page namespace without changing overlay indices. */
export function attachSharedSceneSources2D(prepared, cards, draws) {
    if (cards.length === 0 && !draws.some(draw => draw.texture && draw.geometry.indexCount !== 0))
        return undefined;
    const makeView = (image) => ({
        image, region: { x: 0, y: 0, width: image.width, height: image.height }, byteLength: image.byteLength,
    });
    const views = prepared.frame.pages.map(page => makeView(page.source));
    const ids = new Map(views.map((view, index) => [view.image, index]));
    let extra = 0;
    function append(image) {
        const existing = ids.get(image);
        if (existing !== undefined)
            return existing;
        const index = views.length, view = makeView(image);
        extra += view.byteLength;
        if (!Number.isSafeInteger(extra) || prepared.pageBytes + extra > 33554432)
            fail('budget');
        ids.set(image, index);
        views.push(view);
        return index;
    }
    const cardViews = cards.map(card => append(card.source));
    const textureViews = new Map();
    for (const draw of draws) {
        if (draw.texture && draw.geometry.indexCount !== 0 && !textureViews.has(draw.geometry)) {
            textureViews.set(draw.geometry, append(draw.texture.source));
        }
    }
    const expanded = extra ? { ...prepared, pageBytes: prepared.pageBytes + extra, upload: prepared.upload + extra } : prepared;
    const projectionPlan = { views, commandViews: [], projectionBytes: expanded.pageBytes, scratchBytes: 0 };
    return { prepared: expanded, projectionPlan, cardViews, textureViews };
}
export function packSharedSceneCardUniform3D(card) {
    const data = new Float32Array(28);
    data.set(card.mvp, 0);
    data.set(card.bounds, 16);
    data.set(card.region, 20);
    data[24] = card.alphaCutoff / 255;
    return data;
}
/** Fixed 128-byte uniform ABI for the optional opaque Lambert draw. */
export function packSharedSceneLambertUniform3D(draw) {
    const { normalMatrix, mirrored, lighting } = draw.lambert;
    const data = new Float32Array(32);
    data.set(draw.mvp, 0);
    for (let column = 0; column < 3; column++) {
        for (let row = 0; row < 3; row++)
            data[16 + 4 * column + row] = normalMatrix[3 * column + row];
    }
    data[19] = lighting.ambient;
    data[23] = mirrored ? -1 : 1;
    data.set(lighting.direction, 28);
    data[31] = lighting.intensity;
    return data;
}
export class SharedStorageError2D extends Error {
    reason;
    constructor(reason) {
        super('Shared storage ' + reason);
        this.reason = reason;
    }
}
function fail(reason) { throw noteOwnedPreparationFailure(new SharedStorageError2D(reason)); }
/** Joint logical fees precede readback layout, native limits, pending checks and payloads. */
export function planSharedStorageFees2D(prepared, options, scene) {
    const { width, height } = prepared, colorBytes = 4 * width * height, effectBytes = colorBytes * prepared.effects.targetCount, upload = prepared.upload + (scene ? scene.sceneBytes + scene.uniformBytes : 0);
    if (!Number.isSafeInteger(colorBytes) || colorBytes + effectBytes > 67108864 || !Number.isSafeInteger(upload) || upload > options.maxUploadBytes)
        fail('budget');
    if (scene && (scene.sceneBytes > 4194304 || scene.uniformBytes > 4096 || scene.depthBytes > 16777216))
        fail('budget');
    return { prepared, options, upload, colorBytes, effectBytes, scene };
}
/** No allocator or callback is accepted; the caller supplies its already computed layout. */
export function withSharedReadbackLayout2D(fees, layout) {
    const { rowPitch, staging, output } = layout;
    if (!Number.isSafeInteger(staging) || staging + output > fees.options.maxReadbackBytes)
        fail('budget');
    return { ...fees, rowPitch, staging, output };
}
export function checkSharedCapacity2D(storage, owner, canonicalBytes = 0, sourceCopy = 0) {
    const { options, prepared, scene } = storage;
    const check = (used, amount, limit) => { if (!Number.isSafeInteger(used) || used < 0 || !Number.isSafeInteger(amount) || amount < 0 || amount > limit - used)
        fail('backpressure'); };
    check(owner.pendingFrames, 1, options.maxPendingFrames);
    check(owner.pendingUploadBytes, storage.upload, options.maxPendingUploadBytes);
    check(owner.pendingReadbackBytes, storage.staging + storage.output, options.maxReadbackBytes);
    check(owner.pendingTextureBytes, prepared.pageBytes, 33554432);
    check(owner.pendingGeometryBytes, prepared.geometryBytes, options.maxPendingGeometryBytes);
    check(owner.pendingColorBytes, storage.colorBytes + storage.effectBytes, 134217728);
    if (canonicalBytes + sourceCopy > 33554432)
        fail('budget');
    check(owner.pendingCanonicalBytes, canonicalBytes + sourceCopy, 33554432);
    if (scene) {
        check(owner.pendingSceneBytes, scene.sceneBytes, 8388608);
        check(owner.pendingUniformBytes, scene.uniformBytes, 8192);
        check(owner.pendingDepthBytes, scene.depthBytes, 33554432);
    }
    if (!Number.isSafeInteger(owner.serial) || owner.serial < 0 || owner.serial >= Number.MAX_SAFE_INTEGER)
        fail('serial');
}
/** Only current READY identities authorize omitted whole-page copies. */
export function materializeSharedPages2D(storage, cold, owner, diagnostics) {
    let canonicalBytes = 0, sourceCopy = 0;
    for (const index of cold) {
        const bytes = storage.projectionPlan.views[index].byteLength;
        canonicalBytes += bytes;
        sourceCopy = Math.max(sourceCopy, bytes);
    }
    checkSharedCapacity2D(storage, owner, canonicalBytes, sourceCopy);
    const before = diagnostics?.canonicalBytes;
    try {
        const projections = storage.projectionPlan.views.map((view, index) => cold.has(index) ? copySharedPagePixels(view.image, diagnostics) : undefined);
        return { projections, canonicalBytes };
    }
    catch (cause) {
        // No returned projection array owns the earlier completed copies on this exit.
        if (diagnostics)
            diagnostics.canonicalBytes = before;
        throw cause;
    }
}
//# sourceMappingURL=sharedSubmissionStorage2D.js.map