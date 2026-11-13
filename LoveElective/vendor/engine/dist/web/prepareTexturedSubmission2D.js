import { IMAGE_LIMITS_2D } from '@egret/contracts';
import { packImageVertices2D } from '../rendering/packImageVertices2D.js';
import { packTexturedMesh2D } from '../rendering/packTexturedMesh2D.js';
import { noteOwnedPreparationFailure } from '../rendering/ownedPreparationFailure2D.js';
import { packWebGPUVertices } from './webgpuPass.js';
import { copyProjectionPixels } from './imageProjections2D.js';
class TexturedSubmissionAdmissionError2D extends Error {
    reason;
    facet;
    constructor(reason, facet) {
        super(`Textured submission ${reason}: ${facet}`);
        this.reason = reason;
        this.facet = facet;
    }
}
const refusals = new WeakSet();
function fail(reason, facet) {
    const failure = noteOwnedPreparationFailure(new TexturedSubmissionAdmissionError2D(reason, facet));
    refusals.add(failure);
    throw failure;
}
/** Module creation alone is insufficient: public mapping also checks the current scope object. */
export function isTexturedSubmissionAdmissionError2D(error) {
    return typeof error === 'object' && error !== null && refusals.has(error);
}
function nonnegative(value) { return Number.isSafeInteger(value) && value >= 0; }
function fan(corners) {
    if (!nonnegative(corners) || corners > Math.floor(Number.MAX_SAFE_INTEGER / 3) + 2)
        fail('budget', 'upload');
    return corners < 3 ? 0 : 3 * (corners - 2);
}
function capacities(storage, owner) {
    const { options, projectionPlan } = storage.request;
    const check = (current, charge, limit, facet) => {
        if (!nonnegative(current) || !nonnegative(charge) || charge > limit - current)
            fail('backpressure', facet);
    };
    check(owner.pendingFrames, 1, options.maxPendingFrames, 'frames');
    check(owner.pendingUploadBytes, storage.upload, options.maxPendingUploadBytes, 'upload');
    check(owner.pendingReadbackBytes, storage.staging + storage.output, options.maxReadbackBytes, 'readback');
    check(owner.pendingTextureBytes, projectionPlan.projectionBytes, IMAGE_LIMITS_2D.maxPendingTextureBytes, 'texture');
    check(owner.pendingGeometryBytes, storage.geometryBytes, options.maxPendingGeometryBytes, 'geometry');
    if (storage.sceneStorage) {
        const limits = storage.request.sceneReservation;
        check(owner.pendingSceneBytes, storage.sceneStorage.sceneBytes, limits.maxPendingSceneBytes, 'scene');
        check(owner.pendingUniformBytes, storage.sceneStorage.uniformBytes, limits.maxPendingUniformBytes, 'uniform');
        check(owner.pendingDepthBytes, storage.sceneStorage.depthBytes, limits.maxPendingDepthBytes, 'depth');
    }
    if (!nonnegative(owner.serial) || owner.serial >= Number.MAX_SAFE_INTEGER)
        fail('serial', 'serial');
}
function readbackStorage(request, width, height) {
    if (!request.readback)
        return { rowPitch: 0, staging: 0, output: 0 };
    if (!nonnegative(width) || width > Math.floor(Number.MAX_SAFE_INTEGER / 4))
        fail('budget', 'readback');
    const rows = Math.ceil(4 * width / 256);
    if (rows > Math.floor(Number.MAX_SAFE_INTEGER / 256))
        fail('budget', 'readback');
    const rowPitch = rows * 256;
    if (!nonnegative(height) || height > Math.floor(Number.MAX_SAFE_INTEGER / rowPitch) ||
        height > Math.floor(Number.MAX_SAFE_INTEGER / (4 * width)))
        fail('budget', 'readback');
    const staging = rowPitch * height, output = 4 * width * height;
    if (staging > request.options.maxReadbackBytes || output > request.options.maxReadbackBytes - staging)
        fail('budget', 'readback');
    return { rowPitch, staging, output };
}
function hardwareStorage(request, width, height, draws) {
    for (const draw of draws) {
        if (draw.vertexBytes > request.hardware.maxBufferSize)
            fail('device', 'buffer');
        if (draw.uniformBytes > request.hardware.maxBufferSize)
            fail('device', 'buffer');
    }
    if (width > request.hardware.maxTextureDimension2D || height > request.hardware.maxTextureDimension2D)
        fail('device', 'texture');
    for (const view of request.projectionPlan.views) {
        if (view.region.width > request.hardware.maxTextureDimension2D || view.region.height > request.hardware.maxTextureDimension2D)
            fail('device', 'texture');
    }
    if (request.sceneReservation && request.sceneReservation.uniformBytes > 0 && 64 > request.hardware.maxBufferSize)
        fail('device', 'buffer');
}
/** Reserve whole upper bounds before packing, copying, uniform creation or owner mutation. */
export function planTexturedSubmissionStorage2D(request) {
    const { admitted, draws, options, hardware, projectionPlan } = request;
    const { frame, width, height } = admitted;
    let upload = 0;
    let sceneStorage;
    const scene = request.sceneReservation;
    if (scene) {
        // Depth and the complete scene reserve precede every payload allocation.
        if (!nonnegative(width) || !nonnegative(height) || width > Math.floor(Number.MAX_SAFE_INTEGER / 4) ||
            height > Math.floor(Number.MAX_SAFE_INTEGER / (4 * width)))
            fail('budget', 'depth');
        const depthBytes = 4 * width * height;
        if (!nonnegative(depthBytes) || depthBytes > scene.maxDepthBytes)
            fail('budget', 'depth');
        if (!nonnegative(scene.sceneBytes) || scene.sceneBytes > scene.maxSceneBytes)
            fail('budget', 'scene');
        if (!nonnegative(scene.uniformBytes) || scene.uniformBytes > scene.maxUniformBytes)
            fail('budget', 'uniform');
        if (scene.sceneBytes > options.maxUploadBytes || scene.uniformBytes > options.maxUploadBytes - scene.sceneBytes)
            fail('budget', 'upload');
        upload = scene.sceneBytes + scene.uniformBytes;
        sceneStorage = { sceneBytes: scene.sceneBytes, uniformBytes: scene.uniformBytes, depthBytes };
    }
    const drawStorage = [];
    for (const draw of draws) {
        let vertices = 0;
        if (draw.kind === 'rect') {
            for (const command of draw.prepared.commands) {
                const count = fan(command.pointIndices.length);
                if (count > Number.MAX_SAFE_INTEGER - vertices)
                    fail('budget', 'upload');
                vertices += count;
            }
        }
        else if (draw.kind === 'image')
            vertices = fan(draw.prepared.pointIndices.length);
        else
            vertices = draw.prepared.preparedVerticesCharged;
        const stride = draw.kind === 'rect' ? 24 : draw.kind === 'image' ? 16 : 32;
        if (!nonnegative(vertices) || vertices > Math.floor(Number.MAX_SAFE_INTEGER / stride))
            fail('budget', 'upload');
        const vertexBytes = vertices * stride, uniformBytes = draw.kind !== 'rect' && vertices > 0 ? 16 : 0;
        if (vertexBytes > options.maxUploadBytes - upload)
            fail('budget', 'upload');
        upload += vertexBytes;
        if (uniformBytes > options.maxUploadBytes - upload)
            fail('budget', 'upload');
        upload += uniformBytes;
        drawStorage.push({ vertexBytes, uniformBytes });
    }
    // Existing textured calls keep hardware-before-readback-configuration order;
    // combined calls qualify all joint configuration before joint hardware.
    if (!scene)
        hardwareStorage(request, width, height, drawStorage);
    const { rowPitch, staging, output } = readbackStorage(request, width, height);
    if (scene)
        hardwareStorage(request, width, height, drawStorage);
    if (request.readback && staging > hardware.maxBufferSize)
        fail('device', 'readback');
    const storage = { request, frame, width, height, upload,
        geometryBytes: admitted.uniqueGeometryBytes, drawStorage, rowPitch, staging, output, ...(sceneStorage ? { sceneStorage } : {}) };
    capacities(storage, request.owner);
    return storage;
}
const FIRST_PARTY_OPERATIONS = Object.freeze({
    pack(draw, width, height, bytes, budget, preparedCommandIndices) {
        if (draw.kind === 'rect')
            return packWebGPUVertices(draw.prepared, width, height, { maxUploadBytes: bytes, maxBufferSize: bytes }, budget, preparedCommandIndices, draw.cacheSlot);
        if (draw.kind === 'image')
            return packImageVertices2D(draw.prepared, width, height, bytes, budget, draw.cacheSlot);
        return packTexturedMesh2D(draw.prepared, width, height, bytes, budget, draw.cacheSlot);
    },
    copy: (view) => copyProjectionPixels(view, 'premultiplied'),
    uniform: (alpha) => new Float32Array([alpha, 0, 0, 0]),
});
/** Packing reveals actual coverage before the Host selects qualified resident views. */
export function packTexturedDrawPayloads2D(storage, budget, operations = FIRST_PARTY_OPERATIONS, checkActive) {
    const request = storage.request;
    const draws = [];
    for (let i = 0; i < request.draws.length; i++) {
        const draw = request.draws[i], bytes = storage.drawStorage[i].vertexBytes;
        const rangeSources = [];
        const packed = operations.pack(draw, storage.width, storage.height, bytes, budget, rangeSources);
        checkActive?.();
        if (draw.kind === 'rect') {
            const rectangles = packed;
            // The real dispatcher and packer supply both filtering levels. A
            // controlled private pack seam without provenance simply cannot merge.
            const rangeCommands = rangeSources.map(index => draw.commandIndices?.[index] ?? -1);
            if (rangeSources.length === rectangles.ranges.length && rangeCommands.every(index => Number.isSafeInteger(index)
                && index >= 0 && request.admitted.frame.commands[index]?.kind === 'rect')) {
                const rangeClips = rangeCommands.map(index => request.admitted.frame.commands[index].clips);
                draws.push({ kind: 'rect', packed: rectangles, rangeCommands, rangeClips });
            }
            else
                draws.push({ kind: 'rect', packed: rectangles });
        }
        else {
            const record = request.admitted.commands[draw.commandIndex], viewIndex = request.projectionPlan.commandViews[draw.commandIndex];
            // Only type erasure joins the three packers; no caller data chooses this dispatch.
            const command = record.command;
            const crop = command.kind === 'rect' ? undefined : command.sourceRect;
            if (draw.kind === 'image')
                draws.push({ kind: 'image', packed: packed, viewIndex, alpha: command.alpha, clips: command.clips, ...(crop ? { crop } : {}), uniform: undefined });
            else
                draws.push({ kind: 'mesh', packed: packed, viewIndex, alpha: command.alpha, clips: command.clips, ...(crop ? { crop } : {}), uniform: undefined });
        }
    }
    return { storage, draws };
}
/** Only the Host's exact current READY hit set authorizes an omitted pixel payload. */
export function materializeTexturedSubmission2D(payload, residentViews, readOwner, operations = FIRST_PARTY_OPERATIONS, checkActive) {
    const { storage, draws } = payload, request = storage.request;
    const projections = [];
    for (let index = 0; index < request.projectionPlan.views.length; index++) {
        const pixels = residentViews.has(index) ? undefined : operations.copy(request.projectionPlan.views[index]);
        checkActive?.();
        projections.push(pixels);
    }
    for (const draw of draws)
        if (draw.kind !== 'rect' && draw.packed.vertexCount > 0) {
            draw.uniform = operations.uniform(draw.alpha);
            checkActive?.();
        }
    // No serial, reservation or ticket changes occur in this helper.
    capacities(storage, readOwner());
    return { frame: storage.frame, width: storage.width, height: storage.height, draws, upload: storage.upload,
        geometryBytes: storage.geometryBytes, projectionPlan: request.projectionPlan, projections,
        rowPitch: storage.rowPitch, staging: storage.staging, output: storage.output, ticket: undefined, scene: undefined };
}
/** The original private facade retains its complete cold operation sequence. */
export function packTexturedSubmission2D(storage, budget, readOwner, operations = FIRST_PARTY_OPERATIONS, checkActive) {
    return materializeTexturedSubmission2D(packTexturedDrawPayloads2D(storage, budget, operations, checkActive), new Set(), readOwner, operations, checkActive);
}
/** Preserve the existing textured-only planner-then-payload sequence. */
export function prepareTexturedSubmission2D(request, budget, readOwner, operations = FIRST_PARTY_OPERATIONS) {
    return packTexturedSubmission2D(planTexturedSubmissionStorage2D(request), budget, readOwner, operations);
}
